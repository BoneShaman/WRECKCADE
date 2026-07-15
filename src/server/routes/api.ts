import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import { BLUEPRINT_IDS, CREW_IDS } from '../../shared/api';
import type {
  ApiErrorResponse,
  BlueprintId,
  BlueprintVoteRequest,
  BlueprintVoteResponse,
  CrewId,
  InitResponse,
  RunSessionRequest,
  RunSessionResponse,
  RunSubmissionRequest,
  RunSubmissionResponse,
} from '../../shared/api';
import {
  castBlueprintVote,
  deletePlayerData,
  GameApiError,
  getInitState,
  getPlayerIdentity,
  RUN_LIMITS,
  startRunSession,
  submitRun,
} from '../core/game-state';
import { isUtcDateKey } from '../core/daily';

const MAX_BODY_CHARACTERS = 4_096;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RUN_SESSION_FIELDS = new Set<keyof RunSessionRequest>([
  'day',
  'seed',
  'runId',
]);
const RUN_FIELDS = new Set<keyof RunSubmissionRequest>([
  'day',
  'seed',
  'runId',
  'sessionNonce',
  'score',
  'scrap',
  'kills',
  'bestCombo',
  'level',
  'survivedSeconds',
  'crew',
  'victory',
]);

type ApiStatus = 400 | 401 | 409 | 429 | 500 | 503;

type ErrorResult = {
  body: ApiErrorResponse;
  status: ApiStatus;
};

export const api = new Hono();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readJsonBody = async (request: Request): Promise<unknown> => {
  const contentLength = Number.parseInt(
    request.headers.get('content-length') ?? '0',
    10
  );
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_CHARACTERS) {
    throw new GameApiError('bad-request', 'Request body is too large.', 400);
  }

  const text = await request.text();
  if (text.length === 0 || text.length > MAX_BODY_CHARACTERS) {
    throw new GameApiError(
      'bad-request',
      'Request body is missing or too large.',
      400
    );
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new GameApiError(
      'bad-request',
      'Request body must be valid JSON.',
      400
    );
  }
};

const readInteger = (
  record: Record<string, unknown>,
  key: keyof typeof RUN_LIMITS
): number => {
  const value = record[key];
  const limits = RUN_LIMITS[key];
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < limits.min ||
    value > limits.max
  ) {
    throw new GameApiError(
      'bad-request',
      `${key} must be an integer from ${limits.min} to ${limits.max}.`,
      400
    );
  }
  return value;
};

const readDurationSeconds = (record: Record<string, unknown>): number => {
  const value = record.survivedSeconds;
  const limits = RUN_LIMITS.survivedSeconds;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < limits.min ||
    value > limits.max
  ) {
    throw new GameApiError(
      'bad-request',
      `survivedSeconds must be from ${limits.min} to ${limits.max}.`,
      400
    );
  }
  return Math.round(value * 1_000) / 1_000;
};

const isCrewId = (value: unknown): value is CrewId =>
  typeof value === 'string' && CREW_IDS.includes(value as CrewId);

const isBlueprintId = (value: unknown): value is BlueprintId =>
  typeof value === 'string' && BLUEPRINT_IDS.includes(value as BlueprintId);

const readUuid = (value: unknown, field: 'runId' | 'sessionNonce'): string => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new GameApiError('bad-request', `${field} must be a UUID.`, 400);
  }
  return value;
};

const readChallengeCoordinates = (
  value: Record<string, unknown>
): Pick<RunSessionRequest, 'day' | 'seed'> => {
  if (typeof value.day !== 'string' || !isUtcDateKey(value.day)) {
    throw new GameApiError('bad-request', 'day must be a UTC date key.', 400);
  }
  if (
    typeof value.seed !== 'number' ||
    !Number.isInteger(value.seed) ||
    value.seed < 0 ||
    value.seed > 0xffff_ffff
  ) {
    throw new GameApiError(
      'bad-request',
      'seed must be an unsigned 32-bit integer.',
      400
    );
  }
  return { day: value.day, seed: value.seed };
};

const minimumScrapForLevel = (level: number): number => {
  let requiredScrap = 0;
  let nextLevelCost = 10;
  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    requiredScrap += nextLevelCost;
    const reachedLevel = currentLevel + 1;
    nextLevelCost = Math.floor(
      10 + reachedLevel * 7.5 + reachedLevel ** 1.34 * 2.2
    );
  }
  return requiredScrap;
};

const maximumPlausibleScore = (run: RunSubmissionRequest): number => {
  const kills = run.kills;
  const scoreMultiplier = 4.2 * 1.6;
  const summedChainFactors = kills + 0.11 * kills * Math.max(0, kills - 1);
  const maximumChainFactor = 1 + 0.22 * Math.max(0, kills - 1);
  const normalEnemyScore = 340 * scoreMultiplier * summedChainFactors;
  const premiumEnemyBase =
    (kills > 0 ? 8_500 - 340 : 0) +
    (kills > 1 ? 1_250 - 340 : 0) +
    (kills > 2 ? 1_250 - 340 : 0);
  const premiumEnemyScore =
    premiumEnemyBase * scoreMultiplier * maximumChainFactor;

  return Math.ceil(
    25_000 + normalEnemyScore + premiumEnemyScore + run.scrap * 12 + kills * 240
  );
};

const validateRunSession = (value: unknown): RunSessionRequest => {
  if (!isRecord(value)) {
    throw new GameApiError(
      'bad-request',
      'Run session request must be an object.',
      400
    );
  }
  const fields = Object.keys(value);
  if (
    fields.length !== RUN_SESSION_FIELDS.size ||
    fields.some(
      (field) => !RUN_SESSION_FIELDS.has(field as keyof RunSessionRequest)
    )
  ) {
    throw new GameApiError(
      'bad-request',
      'Run session request has unexpected fields.',
      400
    );
  }

  return {
    ...readChallengeCoordinates(value),
    runId: readUuid(value.runId, 'runId'),
  };
};

const validateRun = (value: unknown): RunSubmissionRequest => {
  if (!isRecord(value)) {
    throw new GameApiError('bad-request', 'Run result must be an object.', 400);
  }

  const fields = Object.keys(value);
  if (
    fields.length !== RUN_FIELDS.size ||
    fields.some((field) => !RUN_FIELDS.has(field as keyof RunSubmissionRequest))
  ) {
    throw new GameApiError(
      'bad-request',
      'Run result has unexpected fields.',
      400
    );
  }
  if (!isCrewId(value.crew)) {
    throw new GameApiError('bad-request', 'Unknown crew.', 400);
  }
  if (typeof value.victory !== 'boolean') {
    throw new GameApiError('bad-request', 'victory must be a boolean.', 400);
  }
  const challenge = readChallengeCoordinates(value);

  const run: RunSubmissionRequest = {
    ...challenge,
    runId: readUuid(value.runId, 'runId'),
    sessionNonce: readUuid(value.sessionNonce, 'sessionNonce'),
    score: readInteger(value, 'score'),
    scrap: readInteger(value, 'scrap'),
    kills: readInteger(value, 'kills'),
    bestCombo: readInteger(value, 'bestCombo'),
    level: readInteger(value, 'level'),
    survivedSeconds: readDurationSeconds(value),
    crew: value.crew,
    victory: value.victory,
  };
  if (run.bestCombo > run.kills) {
    throw new GameApiError(
      'bad-request',
      'bestCombo cannot exceed wrecks.',
      400
    );
  }
  if (run.kills > 32 + Math.ceil(run.survivedSeconds * 12)) {
    throw new GameApiError(
      'bad-request',
      'wreck count is not plausible for the run duration.',
      400
    );
  }
  const maximumScrap = run.kills === 0 ? 0 : run.kills * 12 + 128;
  if (run.scrap > maximumScrap) {
    throw new GameApiError(
      'bad-request',
      'scrap is not plausible for the wreck count.',
      400
    );
  }
  if (run.scrap < minimumScrapForLevel(run.level)) {
    throw new GameApiError(
      'bad-request',
      'level is not plausible for the collected scrap.',
      400
    );
  }
  if (run.score < run.scrap * 12 || run.score > maximumPlausibleScore(run)) {
    throw new GameApiError(
      'bad-request',
      'score is not plausible for this run.',
      400
    );
  }
  if (run.victory && run.survivedSeconds < 180) {
    throw new GameApiError(
      'bad-request',
      'victory requires reaching the Road King.',
      400
    );
  }
  return run;
};

const validateVote = (value: unknown): BlueprintVoteRequest => {
  if (!isRecord(value) || Object.keys(value).length !== 1) {
    throw new GameApiError(
      'bad-request',
      'Vote body must contain only a blueprint field.',
      400
    );
  }
  if (!isBlueprintId(value.blueprint)) {
    throw new GameApiError('bad-request', 'Unknown blueprint.', 400);
  }
  return { blueprint: value.blueprint };
};

const getScope = (): string => context.subredditName ?? 'ramageddon';

const requirePostId = (): string => {
  if (!context.postId) {
    throw new GameApiError(
      'context-missing',
      'This endpoint must be opened from a RAMAGEDDON post.',
      400
    );
  }
  return context.postId;
};

const normalizeError = (error: unknown, operation: string): ErrorResult => {
  if (error instanceof GameApiError) {
    return {
      status: error.status,
      body: { type: 'error', code: error.code, message: error.message },
    };
  }

  console.error(`RAMAGEDDON ${operation} failed:`, error);
  return {
    status: 500,
    body: {
      type: 'error',
      code: 'internal-error',
      message: `${operation} failed. Please try again.`,
    },
  };
};

api.get('/init', async (c) => {
  try {
    const postId = requirePostId();
    const identity = await getPlayerIdentity();
    const state = await getInitState(getScope(), identity);

    return c.json<InitResponse>(
      {
        type: 'init',
        postId,
        serverTime: new Date().toISOString(),
        ...state,
      },
      200
    );
  } catch (error) {
    const normalized = normalizeError(error, 'initialization');
    return c.json<ApiErrorResponse>(normalized.body, normalized.status);
  }
});

api.post('/run/start', async (c) => {
  try {
    requirePostId();
    const request = validateRunSession(await readJsonBody(c.req.raw));
    const identity = await getPlayerIdentity();
    const response = await startRunSession(getScope(), identity, request);
    return c.json<RunSessionResponse>(response, 200);
  } catch (error) {
    const normalized = normalizeError(error, 'run session');
    return c.json<ApiErrorResponse>(normalized.body, normalized.status);
  }
});

api.post('/run', async (c) => {
  try {
    requirePostId();
    const request = validateRun(await readJsonBody(c.req.raw));
    const identity = await getPlayerIdentity();
    const response = await submitRun(getScope(), identity, request);
    return c.json<RunSubmissionResponse>(response, 200);
  } catch (error) {
    const normalized = normalizeError(error, 'run submission');
    return c.json<ApiErrorResponse>(normalized.body, normalized.status);
  }
});

api.post('/vote', async (c) => {
  try {
    requirePostId();
    const request = validateVote(await readJsonBody(c.req.raw));
    const identity = await getPlayerIdentity();
    const vote = await castBlueprintVote(
      getScope(),
      identity,
      request.blueprint
    );

    return c.json<BlueprintVoteResponse>(
      { type: 'blueprint-vote', accepted: true, vote },
      200
    );
  } catch (error) {
    const normalized = normalizeError(error, 'blueprint vote');
    return c.json<ApiErrorResponse>(normalized.body, normalized.status);
  }
});

api.delete('/profile', async (c) => {
  try {
    requirePostId();
    const identity = await getPlayerIdentity();
    await deletePlayerData(identity);
    return c.json({ type: 'player-data-deleted', deleted: true as const }, 200);
  } catch (error) {
    const normalized = normalizeError(error, 'player data deletion');
    return c.json<ApiErrorResponse>(normalized.body, normalized.status);
  }
});
