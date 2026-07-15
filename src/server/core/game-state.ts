import { randomUUID } from 'node:crypto';
import { context, redis, reddit } from '@devvit/web/server';
import { BLUEPRINT_IDS, CREW_IDS } from '../../shared/api';
import type {
  ApiErrorCode,
  BlueprintId,
  BlueprintVoteState,
  CommunityState,
  CrewId,
  CrewStanding,
  InitResponse,
  LeaderboardEntry,
  PlayerProfile,
  RunSessionRequest,
  RunSessionResponse,
  RunSubmissionRequest,
  RunSubmissionResponse,
} from '../../shared/api';
import {
  buildDailyChallenge,
  CREW_DEFINITIONS,
  crewForUsername,
  getBlueprint,
  getDailyBlueprintOptions,
  getWreckpileTier,
  isUtcDateKey,
  offsetUtcDateKey,
  utcDateKey,
} from './daily';

const KEY_PREFIX = 'ramageddon:v1';
const DAILY_KEY_TTL_SECONDS = 60 * 60 * 24 * 16;
const PROFILE_TTL_SECONDS = 60 * 60 * 24 * 30;
const LOCK_TTL_MILLISECONDS = 20_000;
const DELETE_LOCK_TTL_MILLISECONDS = 60_000;
const RUN_SESSION_TTL_SECONDS = 60 * 30;
const RUN_START_GRACE_SECONDS = 12;
const MAX_ACTIVE_RUN_SESSIONS = 32;
const MAX_DAILY_SUBMISSIONS = 100;
const MAX_SAFE_COUNTER = Number.MAX_SAFE_INTEGER;

export const RUN_LIMITS = {
  score: { min: 0, max: 50_000_000 },
  scrap: { min: 0, max: 1_000_000 },
  kills: { min: 0, max: 100_000 },
  bestCombo: { min: 0, max: 100_000 },
  level: { min: 1, max: 999 },
  survivedSeconds: { min: 0, max: 300 },
} as const;

type ErrorStatus = 400 | 401 | 409 | 429 | 500 | 503;

export class GameApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: ErrorStatus;

  constructor(code: ApiErrorCode, message: string, status: ErrorStatus) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export type PlayerIdentity = {
  username: string;
  userId: string;
};

type StoredProfile = {
  username: string;
  crew: CrewId;
  bestScore: number;
  bestCombo: number;
  totalScrap: number;
  careerWrecks: number;
  streak: number;
  longestStreak: number;
  runs: number;
  lastPlayedDate: string | null;
};

type StoredDailyPlayer = {
  bestScore: number;
  bestScrap: number;
  bestWrecks: number;
  submissions: number;
  crew: CrewId | null;
};

type StoredRunSession = {
  runId: string;
  nonce: string;
  day: string;
  seed: number;
  startedAtMilliseconds: number;
  expiresAtMilliseconds: number;
};

type StoredRunReceipt = {
  fingerprint: string;
  isDailyBest: boolean;
  isPersonalBest: boolean;
};

type RunCommit = {
  profile: StoredProfile;
  daily: StoredDailyPlayer;
  isDailyBest: boolean;
  isPersonalBest: boolean;
};

export type InitState = Omit<InitResponse, 'type' | 'postId' | 'serverTime'>;

const profileKey = (userId: string): string => `${KEY_PREFIX}:player:${userId}`;
const dailyPlayerKey = (dateKey: string, userId: string): string =>
  `${KEY_PREFIX}:day:${dateKey}:player:${userId}`;
const leaderboardKey = (dateKey: string): string =>
  `${KEY_PREFIX}:day:${dateKey}:leaderboard`;
const crewStandingsKey = (dateKey: string): string =>
  `${KEY_PREFIX}:day:${dateKey}:crews`;
const communityKey = (dateKey: string): string =>
  `${KEY_PREFIX}:day:${dateKey}:community`;
const blueprintVotesKey = (dateKey: string): string =>
  `${KEY_PREFIX}:day:${dateKey}:blueprints`;
const blueprintVoterKey = (dateKey: string, userId: string): string =>
  `${KEY_PREFIX}:day:${dateKey}:blueprint-voter:${userId}`;
const runSessionsKey = (dateKey: string, userId: string): string =>
  `${KEY_PREFIX}:day:${dateKey}:run-sessions:${userId}`;
const runReceiptsKey = (dateKey: string, userId: string): string =>
  `${KEY_PREFIX}:day:${dateKey}:run-receipts:${userId}`;
const activityLockKey = (
  activity: 'run' | 'vote',
  dateKey: string,
  userId: string
): string => `${KEY_PREFIX}:lock:${activity}:${dateKey}:${userId}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCrewId = (value: unknown): value is CrewId =>
  typeof value === 'string' && CREW_IDS.includes(value as CrewId);

const isBlueprintId = (value: unknown): value is BlueprintId =>
  typeof value === 'string' && BLUEPRINT_IDS.includes(value as BlueprintId);

const safeInteger = (value: unknown, fallback = 0): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    return fallback;
  }
  return Math.min(value, MAX_SAFE_COUNTER);
};

const parseStoredInteger = (value: string | undefined): number => {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0
    ? Math.min(parsed, MAX_SAFE_COUNTER)
    : 0;
};

const parseJsonRecord = (
  raw: string | null | undefined
): Record<string, unknown> | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const makeStoredProfile = (identity: PlayerIdentity): StoredProfile => ({
  username: identity.username,
  crew: crewForUsername(identity.username),
  bestScore: 0,
  bestCombo: 0,
  totalScrap: 0,
  careerWrecks: 0,
  streak: 0,
  longestStreak: 0,
  runs: 0,
  lastPlayedDate: null,
});

const parseStoredProfile = (
  raw: string | null | undefined,
  fallbackUsername: string
): StoredProfile => {
  const record = parseJsonRecord(raw);
  const fallbackCrew = crewForUsername(fallbackUsername);
  if (!record) {
    return {
      username: fallbackUsername,
      crew: fallbackCrew,
      bestScore: 0,
      bestCombo: 0,
      totalScrap: 0,
      careerWrecks: 0,
      streak: 0,
      longestStreak: 0,
      runs: 0,
      lastPlayedDate: null,
    };
  }

  const username =
    typeof record.username === 'string' && record.username.length <= 32
      ? record.username
      : fallbackUsername;
  const lastPlayedDate =
    typeof record.lastPlayedDate === 'string' &&
    isUtcDateKey(record.lastPlayedDate)
      ? record.lastPlayedDate
      : null;

  return {
    username,
    crew: isCrewId(record.crew) ? record.crew : fallbackCrew,
    bestScore: safeInteger(record.bestScore),
    bestCombo: safeInteger(record.bestCombo),
    totalScrap: safeInteger(record.totalScrap),
    careerWrecks: safeInteger(record.careerWrecks),
    streak: safeInteger(record.streak),
    longestStreak: safeInteger(record.longestStreak),
    runs: safeInteger(record.runs),
    lastPlayedDate,
  };
};

const parseStoredDailyPlayer = (
  raw: string | null | undefined
): StoredDailyPlayer => {
  const record = parseJsonRecord(raw);
  if (!record) {
    return {
      bestScore: 0,
      bestScrap: 0,
      bestWrecks: 0,
      submissions: 0,
      crew: null,
    };
  }

  return {
    bestScore: safeInteger(record.bestScore),
    bestScrap: safeInteger(record.bestScrap),
    bestWrecks: safeInteger(record.bestWrecks),
    submissions: safeInteger(record.submissions),
    crew: isCrewId(record.crew) ? record.crew : null,
  };
};

const parseStoredRunSession = (
  raw: string | null | undefined
): StoredRunSession | null => {
  const record = parseJsonRecord(raw);
  if (
    !record ||
    typeof record.runId !== 'string' ||
    typeof record.nonce !== 'string' ||
    typeof record.day !== 'string' ||
    !isUtcDateKey(record.day) ||
    typeof record.seed !== 'number' ||
    !Number.isSafeInteger(record.seed) ||
    typeof record.startedAtMilliseconds !== 'number' ||
    !Number.isSafeInteger(record.startedAtMilliseconds) ||
    typeof record.expiresAtMilliseconds !== 'number' ||
    !Number.isSafeInteger(record.expiresAtMilliseconds)
  ) {
    return null;
  }

  return {
    runId: record.runId,
    nonce: record.nonce,
    day: record.day,
    seed: record.seed,
    startedAtMilliseconds: record.startedAtMilliseconds,
    expiresAtMilliseconds: record.expiresAtMilliseconds,
  };
};

const parseStoredRunReceipt = (
  raw: string | null | undefined
): StoredRunReceipt | null => {
  const record = parseJsonRecord(raw);
  if (
    !record ||
    typeof record.fingerprint !== 'string' ||
    typeof record.isDailyBest !== 'boolean' ||
    typeof record.isPersonalBest !== 'boolean'
  ) {
    return null;
  }
  return {
    fingerprint: record.fingerprint,
    isDailyBest: record.isDailyBest,
    isPersonalBest: record.isPersonalBest,
  };
};

const fingerprintRun = (request: RunSubmissionRequest): string =>
  JSON.stringify([
    request.day,
    request.seed,
    request.runId,
    request.sessionNonce,
    request.score,
    request.scrap,
    request.kills,
    request.bestCombo,
    request.level,
    request.survivedSeconds,
    request.crew,
    request.victory,
  ]);

const expireDailyKeys = async (...keys: string[]): Promise<void> => {
  await Promise.all(
    keys.map((key) => redis.expire(key, DAILY_KEY_TTL_SECONDS))
  );
};

const acquireLock = async (
  key: string,
  ttlMilliseconds = LOCK_TTL_MILLISECONDS
): Promise<string> => {
  const token = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const result = await redis.set(key, token, {
    nx: true,
    expiration: new Date(Date.now() + ttlMilliseconds),
  });
  if (!result) {
    throw new GameApiError(
      'storage-unavailable',
      'A previous request is still being saved. Please try again.',
      409
    );
  }
  return token;
};

const releaseLock = async (key: string, token: string): Promise<void> => {
  try {
    if ((await redis.get(key)) === token) await redis.del(key);
  } catch (error) {
    console.warn(`Unable to release Redis lock ${key}:`, error);
  }
};

export const getPlayerIdentity = async (): Promise<PlayerIdentity | null> => {
  const username = await reddit.getCurrentUsername();
  const userId = context.userId;
  if (!username || !userId) return null;

  return {
    username,
    userId,
  };
};

const requireIdentity = (identity: PlayerIdentity | null): PlayerIdentity => {
  if (!identity) {
    throw new GameApiError(
      'not-authenticated',
      'Sign in to Reddit to submit runs and vote.',
      401
    );
  }
  return identity;
};

const getStoredProfile = async (
  identity: PlayerIdentity
): Promise<StoredProfile> => {
  const raw = await redis.get(profileKey(identity.userId));
  const profile = raw
    ? parseStoredProfile(raw, identity.username)
    : makeStoredProfile(identity);

  return {
    ...profile,
    username: identity.username,
  };
};

const getPlayerProfile = async (
  dateKey: string,
  identity: PlayerIdentity | null,
  knownProfile?: StoredProfile,
  knownDaily?: StoredDailyPlayer
): Promise<PlayerProfile> => {
  if (!identity) {
    return {
      isAuthenticated: false,
      username: 'anonymous',
      crew: crewForUsername('anonymous'),
      bestScore: 0,
      bestCombo: 0,
      totalScrap: 0,
      careerWrecks: 0,
      streak: 0,
      longestStreak: 0,
      dailyBest: 0,
      dailyRuns: 0,
      dailyRank: null,
      runs: 0,
      lastPlayedDate: null,
    };
  }

  const profile = knownProfile ?? (await getStoredProfile(identity));
  const daily =
    knownDaily ??
    parseStoredDailyPlayer(
      await redis.get(dailyPlayerKey(dateKey, identity.userId))
    );
  const rank = await redis.zRank(leaderboardKey(dateKey), identity.userId);

  return {
    isAuthenticated: true,
    username: profile.username,
    crew: profile.crew,
    bestScore: profile.bestScore,
    bestCombo: profile.bestCombo,
    totalScrap: profile.totalScrap,
    careerWrecks: profile.careerWrecks,
    streak: profile.streak,
    longestStreak: profile.longestStreak,
    dailyBest: daily.bestScore,
    dailyRuns: daily.submissions,
    dailyRank: rank === undefined || rank === null ? null : rank + 1,
    runs: profile.runs,
    lastPlayedDate: profile.lastPlayedDate,
  };
};

const getLeaderboard = async (
  dateKey: string,
  identity: PlayerIdentity | null
): Promise<LeaderboardEntry[]> => {
  const rows = await redis.zRange(leaderboardKey(dateKey), 0, 9, {
    by: 'rank',
  });
  if (rows.length === 0) return [];

  const storedProfiles = await redis.mGet(
    rows.map((row) => profileKey(row.member))
  );

  return rows.map((row, index) => {
    const profile = parseStoredProfile(storedProfiles[index], row.member);
    return {
      rank: index + 1,
      username: profile.username,
      crew: profile.crew,
      score: Math.max(0, Math.round(-row.score)),
      isCurrentUser: identity?.userId === row.member,
    };
  });
};

const getCrewStandings = async (
  dateKey: string,
  playerCrew: CrewId | null
): Promise<CrewStanding[]> => {
  const key = crewStandingsKey(dateKey);
  const scores = await Promise.all(
    CREW_DEFINITIONS.map(async (crew, order) => ({
      crew,
      order,
      score: Math.max(
        0,
        Math.round(-((await redis.zScore(key, crew.id)) ?? 0))
      ),
    }))
  );

  scores.sort(
    (left, right) => right.score - left.score || left.order - right.order
  );

  return scores.map(({ crew, score }, index) => ({
    rank: index + 1,
    id: crew.id,
    name: crew.name,
    motto: crew.motto,
    score,
    isPlayerCrew: crew.id === playerCrew,
  }));
};

const getCommunityState = async (
  dateKey: string,
  scope: string
): Promise<CommunityState> => {
  const [stored, crewResults, voteResults] = await Promise.all([
    redis.hGetAll(communityKey(dateKey)),
    Promise.all(
      CREW_DEFINITIONS.map(async (crew) => ({
        id: crew.id,
        score: Math.max(
          0,
          Math.round(
            -((await redis.zScore(crewStandingsKey(dateKey), crew.id)) ?? 0)
          )
        ),
      }))
    ),
    readBlueprintVoteCounts(dateKey, scope),
  ]);
  const scrap = parseStoredInteger(stored?.scrap);
  const tierState = getWreckpileTier(scrap);
  const crewScores: Record<CrewId, number> = { iron: 0, neon: 0, rust: 0 };
  const votes: Record<BlueprintId, number> = { magnet: 0, armor: 0, nitro: 0 };

  for (const result of crewResults) crewScores[result.id] = result.score;
  for (const result of voteResults) votes[result.id] = result.votes;

  return {
    scrap,
    target: tierState.nextTarget ?? tierState.minimumScrap,
    tier: tierState.level,
    wrecks: parseStoredInteger(stored?.wrecks),
    contributors: parseStoredInteger(stored?.contributors),
    tierState,
    crewScores,
    votes,
  };
};

const readBlueprintVoteCounts = async (
  dateKey: string,
  scope: string
): Promise<Array<{ id: BlueprintId; votes: number; order: number }>> => {
  const options = getDailyBlueprintOptions(dateKey, scope);
  const key = blueprintVotesKey(dateKey);

  return await Promise.all(
    options.map(async (option, order) => ({
      id: option.id,
      votes: Math.max(
        0,
        Math.round(-((await redis.zScore(key, option.id)) ?? 0))
      ),
      order,
    }))
  );
};

const getPreviousBlueprintWinner = async (dateKey: string, scope: string) => {
  const previousDate = offsetUtcDateKey(dateKey, -1);
  const counts = await readBlueprintVoteCounts(previousDate, scope);
  counts.sort(
    (left, right) => right.votes - left.votes || left.order - right.order
  );
  const winner = counts[0];

  if (!winner) {
    const fallback = getDailyBlueprintOptions(previousDate, scope)[0];
    if (!fallback) throw new Error('Blueprint catalogue is empty');
    return fallback;
  }

  return getBlueprint(winner.id);
};

const getBlueprintVoteState = async (
  dateKey: string,
  scope: string,
  identity: PlayerIdentity | null
): Promise<BlueprintVoteState> => {
  const options = getDailyBlueprintOptions(dateKey, scope);
  const key = blueprintVotesKey(dateKey);
  const scores = await Promise.all(
    options.map(async (option) => ({
      ...option,
      votes: Math.max(
        0,
        Math.round(-((await redis.zScore(key, option.id)) ?? 0))
      ),
    }))
  );
  const storedSelection = identity
    ? await redis.get(blueprintVoterKey(dateKey, identity.userId))
    : null;
  const selectedId =
    isBlueprintId(storedSelection) &&
    options.some((option) => option.id === storedSelection)
      ? storedSelection
      : null;

  return {
    date: dateKey,
    options: scores,
    selectedId,
    totalVotes: scores.reduce((total, option) => total + option.votes, 0),
    canVote: identity !== null,
  };
};

export const getInitState = async (
  scope: string,
  identity: PlayerIdentity | null
): Promise<InitState> => {
  const dateKey = utcDateKey();
  const [communityUpgrade, storedProfile] = await Promise.all([
    getPreviousBlueprintWinner(dateKey, scope),
    identity ? getStoredProfile(identity) : Promise.resolve(null),
  ]);
  const playerCrew = storedProfile?.crew ?? null;
  const challenge = buildDailyChallenge(dateKey, scope, communityUpgrade);
  const [profile, leaderboard, crewStandings, community, blueprintVote] =
    await Promise.all([
      getPlayerProfile(dateKey, identity, storedProfile ?? undefined),
      getLeaderboard(dateKey, identity),
      getCrewStandings(dateKey, playerCrew),
      getCommunityState(dateKey, scope),
      getBlueprintVoteState(dateKey, scope, identity),
    ]);

  return {
    username: identity?.username ?? 'anonymous',
    day: dateKey,
    seed: challenge.seed,
    modifier: challenge.modifier,
    communityUpgrade: communityUpgrade.id,
    challenge,
    profile,
    leaderboard,
    crewStandings,
    community,
    blueprintVote,
  };
};

const requireCurrentChallenge = async (
  scope: string,
  day: string,
  seed: number
): Promise<string> => {
  const dateKey = utcDateKey();
  const communityUpgrade = await getPreviousBlueprintWinner(dateKey, scope);
  const challenge = buildDailyChallenge(dateKey, scope, communityUpgrade);
  if (day !== dateKey || seed !== challenge.seed) {
    throw new GameApiError(
      'challenge-expired',
      'The daily arena changed while this run was active. Reload for today’s challenge.',
      409
    );
  }
  return dateKey;
};

const toRunSessionResponse = (
  session: StoredRunSession
): RunSessionResponse => ({
  type: 'run-session',
  runId: session.runId,
  sessionNonce: session.nonce,
  startedAt: new Date(session.startedAtMilliseconds).toISOString(),
  expiresAt: new Date(session.expiresAtMilliseconds).toISOString(),
});

export const startRunSession = async (
  scope: string,
  identityOrNull: PlayerIdentity | null,
  request: RunSessionRequest
): Promise<RunSessionResponse> => {
  const identity = requireIdentity(identityOrNull);
  const dateKey = await requireCurrentChallenge(
    scope,
    request.day,
    request.seed
  );
  const sessionsKey = runSessionsKey(dateKey, identity.userId);
  const receiptsKey = runReceiptsKey(dateKey, identity.userId);
  const lockKey = activityLockKey('run', dateKey, identity.userId);
  const lockToken = await acquireLock(lockKey);
  let transaction: Awaited<ReturnType<typeof redis.watch>> | null = null;
  let inMulti = false;

  try {
    const now = Date.now();
    const [storedSessions, existingReceipt] = await Promise.all([
      redis.hGetAll(sessionsKey),
      redis.hGet(receiptsKey, request.runId),
    ]);
    if (existingReceipt !== undefined) {
      throw new GameApiError(
        'bad-request',
        'runId was already used for a completed run.',
        409
      );
    }
    const expiredSessionIds: string[] = [];
    let activeSessionCount = 0;
    let existingSession: StoredRunSession | null = null;

    for (const [runId, raw] of Object.entries(storedSessions)) {
      const session = parseStoredRunSession(raw);
      if (
        !session ||
        session.runId !== runId ||
        session.day !== dateKey ||
        session.expiresAtMilliseconds <= now
      ) {
        expiredSessionIds.push(runId);
        continue;
      }
      activeSessionCount += 1;
      if (runId === request.runId && session.seed === request.seed) {
        existingSession = session;
      }
    }

    if (existingSession) {
      if (expiredSessionIds.length > 0) {
        await redis.hDel(sessionsKey, expiredSessionIds);
      }
      await redis.expire(sessionsKey, RUN_SESSION_TTL_SECONDS);
      return toRunSessionResponse(existingSession);
    }
    if (activeSessionCount >= MAX_ACTIVE_RUN_SESSIONS) {
      throw new GameApiError(
        'submission-limit',
        'Too many active runs. Finish a run or wait before starting another.',
        429
      );
    }

    const session: StoredRunSession = {
      runId: request.runId,
      nonce: randomUUID().toLowerCase(),
      day: dateKey,
      seed: request.seed,
      startedAtMilliseconds: now,
      expiresAtMilliseconds: now + RUN_SESSION_TTL_SECONDS * 1_000,
    };

    transaction = await redis.watch(lockKey);
    await transaction.multi();
    inMulti = true;
    if (expiredSessionIds.length > 0) {
      await transaction.hDel(sessionsKey, expiredSessionIds);
    }
    await transaction.hSet(sessionsKey, {
      [request.runId]: JSON.stringify(session),
    });
    await transaction.expire(sessionsKey, RUN_SESSION_TTL_SECONDS);
    const result = await transaction.exec();
    inMulti = false;
    if (result.length === 0) {
      throw new GameApiError(
        'storage-unavailable',
        'The run session conflicted. Please start the run again.',
        503
      );
    }

    return toRunSessionResponse(session);
  } catch (error) {
    if (inMulti && transaction) {
      try {
        await transaction.discard();
      } catch {
        // The transaction may already be closed.
      }
    }
    throw error;
  } finally {
    await releaseLock(lockKey, lockToken);
  }
};

const requireValidRunSession = (
  raw: string | null | undefined,
  request: RunSubmissionRequest
): void => {
  const session = parseStoredRunSession(raw);
  const now = Date.now();
  if (
    !session ||
    session.runId !== request.runId ||
    session.nonce !== request.sessionNonce ||
    session.day !== request.day ||
    session.seed !== request.seed ||
    session.startedAtMilliseconds > now ||
    session.expiresAtMilliseconds <= now
  ) {
    throw new GameApiError(
      'run-session-invalid',
      'This run session is missing or expired. Start a fresh run.',
      409
    );
  }

  const serverElapsedSeconds = (now - session.startedAtMilliseconds) / 1_000;
  if (
    request.survivedSeconds >
    serverElapsedSeconds + RUN_START_GRACE_SECONDS
  ) {
    throw new GameApiError(
      'run-session-invalid',
      'The reported run duration is ahead of the server clock.',
      409
    );
  }
};

const commitRun = async (
  dateKey: string,
  identity: PlayerIdentity,
  request: RunSubmissionRequest
): Promise<RunCommit> => {
  const userProfileKey = profileKey(identity.userId);
  const userDailyKey = dailyPlayerKey(dateKey, identity.userId);
  const dailyLeaderboardKey = leaderboardKey(dateKey);
  const dailyCrewKey = crewStandingsKey(dateKey);
  const dailyCommunityKey = communityKey(dateKey);
  const sessionsKey = runSessionsKey(dateKey, identity.userId);
  const receiptsKey = runReceiptsKey(dateKey, identity.userId);
  const lockKey = activityLockKey('run', dateKey, identity.userId);
  const lockToken = await acquireLock(lockKey);
  let transaction: Awaited<ReturnType<typeof redis.watch>> | null = null;
  let inMulti = false;

  try {
    const [profileRaw, dailyRaw, receiptRaw, sessionRaw] = await Promise.all([
      redis.get(userProfileKey),
      redis.get(userDailyKey),
      redis.hGet(receiptsKey, request.runId),
      redis.hGet(sessionsKey, request.runId),
    ]);
    const previousProfile = parseStoredProfile(profileRaw, identity.username);
    const previousDaily = parseStoredDailyPlayer(dailyRaw);
    const requestFingerprint = fingerprintRun(request);
    const existingReceipt = parseStoredRunReceipt(receiptRaw);

    if (existingReceipt) {
      if (existingReceipt.fingerprint !== requestFingerprint) {
        throw new GameApiError(
          'bad-request',
          'runId was already used for a different run result.',
          409
        );
      }
      return {
        profile: previousProfile,
        daily: previousDaily,
        isDailyBest: existingReceipt.isDailyBest,
        isPersonalBest: existingReceipt.isPersonalBest,
      };
    }

    requireValidRunSession(sessionRaw, request);

    if (previousDaily.submissions >= MAX_DAILY_SUBMISSIONS) {
      throw new GameApiError(
        'submission-limit',
        'Daily run submission limit reached. Your best score remains on the board.',
        429
      );
    }

    const firstRunToday = previousDaily.submissions === 0;
    const creditedCrew = previousDaily.crew ?? request.crew;
    const isDailyBest =
      firstRunToday || request.score > previousDaily.bestScore;
    const isPersonalBest = request.score > previousProfile.bestScore;
    const daily: StoredDailyPlayer = {
      bestScore: Math.max(previousDaily.bestScore, request.score),
      bestScrap: Math.max(previousDaily.bestScrap, request.scrap),
      bestWrecks: Math.max(previousDaily.bestWrecks, request.kills),
      submissions: previousDaily.submissions + 1,
      crew: creditedCrew,
    };
    const previousDate = offsetUtcDateKey(dateKey, -1);
    const streak = firstRunToday
      ? previousProfile.lastPlayedDate === previousDate
        ? previousProfile.streak + 1
        : previousProfile.lastPlayedDate === dateKey
          ? previousProfile.streak
          : 1
      : previousProfile.streak;
    const profile: StoredProfile = {
      ...previousProfile,
      username: identity.username,
      crew: creditedCrew,
      bestScore: Math.max(previousProfile.bestScore, request.score),
      bestCombo: Math.max(previousProfile.bestCombo, request.bestCombo),
      totalScrap: Math.min(
        MAX_SAFE_COUNTER,
        previousProfile.totalScrap + request.scrap
      ),
      careerWrecks: Math.min(
        MAX_SAFE_COUNTER,
        previousProfile.careerWrecks + request.kills
      ),
      streak,
      longestStreak: Math.max(previousProfile.longestStreak, streak),
      runs: Math.min(MAX_SAFE_COUNTER, previousProfile.runs + 1),
      lastPlayedDate: firstRunToday ? dateKey : previousProfile.lastPlayedDate,
    };
    const scoreDelta = daily.bestScore - previousDaily.bestScore;
    const scrapDelta = daily.bestScrap - previousDaily.bestScrap;
    const wreckDelta = daily.bestWrecks - previousDaily.bestWrecks;
    const receipt: StoredRunReceipt = {
      fingerprint: requestFingerprint,
      isDailyBest,
      isPersonalBest,
    };

    transaction = await redis.watch(lockKey);
    await transaction.multi();
    inMulti = true;
    await transaction.set(userProfileKey, JSON.stringify(profile));
    await transaction.expire(userProfileKey, PROFILE_TTL_SECONDS);
    await transaction.set(userDailyKey, JSON.stringify(daily));
    await transaction.expire(userDailyKey, DAILY_KEY_TTL_SECONDS);
    await transaction.zAdd(dailyLeaderboardKey, {
      member: identity.userId,
      score: -daily.bestScore,
    });
    if (scoreDelta > 0) {
      await transaction.zIncrBy(dailyCrewKey, creditedCrew, -scoreDelta);
    }
    if (scrapDelta > 0) {
      await transaction.hIncrBy(dailyCommunityKey, 'scrap', scrapDelta);
    }
    if (wreckDelta > 0) {
      await transaction.hIncrBy(dailyCommunityKey, 'wrecks', wreckDelta);
    }
    if (firstRunToday) {
      await transaction.hIncrBy(dailyCommunityKey, 'contributors', 1);
    }
    await transaction.hSet(receiptsKey, {
      [request.runId]: JSON.stringify(receipt),
    });
    await transaction.expire(receiptsKey, DAILY_KEY_TTL_SECONDS);
    await transaction.hDel(sessionsKey, [request.runId]);
    await transaction.expire(dailyLeaderboardKey, DAILY_KEY_TTL_SECONDS);
    await transaction.expire(dailyCrewKey, DAILY_KEY_TTL_SECONDS);
    await transaction.expire(dailyCommunityKey, DAILY_KEY_TTL_SECONDS);

    const result = await transaction.exec();
    inMulti = false;
    if (result.length === 0) {
      throw new GameApiError(
        'storage-unavailable',
        'The run save conflicted. Please submit it again.',
        503
      );
    }

    return { profile, daily, isDailyBest, isPersonalBest };
  } catch (error) {
    if (inMulti && transaction) {
      try {
        await transaction.discard();
      } catch {
        // The transaction may already be closed.
      }
    }
    throw error;
  } finally {
    await releaseLock(lockKey, lockToken);
  }
};

const hasExactRunReceipt = async (
  dateKey: string,
  identity: PlayerIdentity,
  request: RunSubmissionRequest
): Promise<boolean> => {
  const receipt = parseStoredRunReceipt(
    await redis.hGet(runReceiptsKey(dateKey, identity.userId), request.runId)
  );
  return receipt?.fingerprint === fingerprintRun(request);
};

export const submitRun = async (
  scope: string,
  identityOrNull: PlayerIdentity | null,
  request: RunSubmissionRequest
): Promise<RunSubmissionResponse> => {
  const identity = requireIdentity(identityOrNull);
  const currentDateKey = utcDateKey();
  let dateKey: string;
  if (request.day === currentDateKey) {
    dateKey = await requireCurrentChallenge(scope, request.day, request.seed);
  } else if (await hasExactRunReceipt(request.day, identity, request)) {
    // A successful pre-rollover save may be retried after its response is lost.
    dateKey = request.day;
  } else {
    throw new GameApiError(
      'challenge-expired',
      'The daily arena changed while this run was active. Reload for today’s challenge.',
      409
    );
  }
  const committed = await commitRun(dateKey, identity, request);
  const [profile, leaderboard, crewStandings, community] = await Promise.all([
    getPlayerProfile(dateKey, identity, committed.profile, committed.daily),
    getLeaderboard(dateKey, identity),
    getCrewStandings(dateKey, committed.profile.crew),
    getCommunityState(dateKey, scope),
  ]);

  return {
    type: 'run-submitted',
    accepted: true,
    run: {
      score: request.score,
      scrap: request.scrap,
      kills: request.kills,
      bestCombo: request.bestCombo,
      level: request.level,
      survivedSeconds: request.survivedSeconds,
      crew: committed.daily.crew ?? request.crew,
      victory: request.victory,
      isDailyBest: committed.isDailyBest,
      isPersonalBest: committed.isPersonalBest,
    },
    profile,
    leaderboard,
    crewStandings,
    community,
  };
};

export const castBlueprintVote = async (
  scope: string,
  identityOrNull: PlayerIdentity | null,
  blueprintId: BlueprintId
): Promise<BlueprintVoteState> => {
  const identity = requireIdentity(identityOrNull);
  const dateKey = utcDateKey();
  const validOptions = getDailyBlueprintOptions(dateKey, scope);
  if (!validOptions.some((option) => option.id === blueprintId)) {
    throw new GameApiError(
      'bad-request',
      'That blueprint is not on today’s ballot.',
      400
    );
  }

  const markerKey = blueprintVoterKey(dateKey, identity.userId);
  const votesKey = blueprintVotesKey(dateKey);
  const lockKey = activityLockKey('vote', dateKey, identity.userId);
  const lockToken = await acquireLock(lockKey);
  let transaction: Awaited<ReturnType<typeof redis.watch>> | null = null;
  let inMulti = false;

  try {
    const storedVote = await redis.get(markerKey);
    const previousVote =
      isBlueprintId(storedVote) &&
      validOptions.some((option) => option.id === storedVote)
        ? storedVote
        : null;

    if (previousVote === blueprintId) {
      await expireDailyKeys(markerKey, votesKey);
      return await getBlueprintVoteState(dateKey, scope, identity);
    }

    transaction = await redis.watch(lockKey);
    await transaction.multi();
    inMulti = true;
    await transaction.set(markerKey, blueprintId);
    await transaction.expire(markerKey, DAILY_KEY_TTL_SECONDS);
    if (previousVote) {
      await transaction.zIncrBy(votesKey, previousVote, 1);
    }
    await transaction.zIncrBy(votesKey, blueprintId, -1);
    await transaction.expire(votesKey, DAILY_KEY_TTL_SECONDS);

    const result = await transaction.exec();
    inMulti = false;
    if (result.length === 0) {
      throw new GameApiError(
        'storage-unavailable',
        'The ballot changed while saving. Please vote again.',
        503
      );
    }

    return await getBlueprintVoteState(dateKey, scope, identity);
  } catch (error) {
    if (inMulti && transaction) {
      try {
        await transaction.discard();
      } catch {
        // The transaction may already be closed.
      }
    }
    throw error;
  } finally {
    await releaseLock(lockKey, lockToken);
  }
};

const deletePlayerDay = async (
  dateKey: string,
  identity: PlayerIdentity,
  deleteProfile: boolean
): Promise<void> => {
  const runLockKey = activityLockKey('run', dateKey, identity.userId);
  const voteLockKey = activityLockKey('vote', dateKey, identity.userId);
  let runLockToken: string | null = null;
  let voteLockToken: string | null = null;
  let transaction: Awaited<ReturnType<typeof redis.watch>> | null = null;
  let inMulti = false;

  try {
    runLockToken = await acquireLock(runLockKey, DELETE_LOCK_TTL_MILLISECONDS);
    voteLockToken = await acquireLock(
      voteLockKey,
      DELETE_LOCK_TTL_MILLISECONDS
    );
    const [dailyRaw, previousVote] = await redis.mGet([
      dailyPlayerKey(dateKey, identity.userId),
      blueprintVoterKey(dateKey, identity.userId),
    ]);
    const daily = parseStoredDailyPlayer(dailyRaw);
    const dailyLeaderboardKey = leaderboardKey(dateKey);
    const dailyCrewKey = crewStandingsKey(dateKey);
    const dailyCommunityKey = communityKey(dateKey);

    transaction = await redis.watch(runLockKey, voteLockKey);
    await transaction.multi();
    inMulti = true;

    await transaction.zRem(dailyLeaderboardKey, [identity.userId]);
    if (daily.submissions > 0) {
      if (daily.crew && daily.bestScore > 0) {
        await transaction.zIncrBy(dailyCrewKey, daily.crew, daily.bestScore);
      }
      if (daily.bestScrap > 0) {
        await transaction.hIncrBy(dailyCommunityKey, 'scrap', -daily.bestScrap);
      }
      if (daily.bestWrecks > 0) {
        await transaction.hIncrBy(
          dailyCommunityKey,
          'wrecks',
          -daily.bestWrecks
        );
      }
      await transaction.hIncrBy(dailyCommunityKey, 'contributors', -1);
    }
    if (isBlueprintId(previousVote)) {
      await transaction.zIncrBy(blueprintVotesKey(dateKey), previousVote, 1);
    }
    await transaction.del(
      dailyPlayerKey(dateKey, identity.userId),
      blueprintVoterKey(dateKey, identity.userId),
      runSessionsKey(dateKey, identity.userId),
      runReceiptsKey(dateKey, identity.userId)
    );
    if (deleteProfile) {
      await transaction.del(profileKey(identity.userId));
    }
    const result = await transaction.exec();
    inMulti = false;
    if (result.length === 0) {
      throw new GameApiError(
        'storage-unavailable',
        'Player data changed during deletion. Please try again.',
        503
      );
    }
  } catch (error) {
    if (transaction) {
      try {
        if (inMulti) await transaction.discard();
        else await transaction.unwatch();
      } catch {
        // The transaction may already be closed.
      }
    }
    throw error;
  } finally {
    const releases: Promise<void>[] = [];
    if (voteLockToken) {
      releases.push(releaseLock(voteLockKey, voteLockToken));
    }
    if (runLockToken) {
      releases.push(releaseLock(runLockKey, runLockToken));
    }
    await Promise.all(releases);
  }
};

export const deletePlayerData = async (
  identityOrNull: PlayerIdentity | null
): Promise<void> => {
  const identity = requireIdentity(identityOrNull);
  const today = utcDateKey();

  // Oldest-first makes partial failures safely retryable; today's transaction
  // removes the profile only after every still-live daily contribution is gone.
  for (let offset = 16; offset >= 0; offset -= 1) {
    await deletePlayerDay(
      offsetUtcDateKey(today, -offset),
      identity,
      offset === 0
    );
  }
};
