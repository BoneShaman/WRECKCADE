import type {
  BlueprintId,
  BlueprintVoteResponse,
  CrewId,
  DailyRuleCard,
  InitResponse,
  RunSessionRequest,
  RunSessionResponse,
  RunSubmissionRequest,
  RunSubmissionResponse,
} from '../../shared/api';

export type { BlueprintId, CrewId };
export type CommunityState = InitResponse & {
  runtimeMode: 'live' | 'practice';
};

const timedFetch = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMilliseconds = 6_000
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    timeoutMilliseconds
  );
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
};

const dayString = (): string => new Date().toISOString().slice(0, 10);

const hash = (value: string): number => {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
};

export const offlineCommunityState = (): CommunityState => {
  const day = dayString();
  const seed = hash(day);
  const arenas: DailyRuleCard[] = [
    {
      id: 'boneyard-bowl',
      name: 'Boneyard Bowl',
      description: 'A tight scrapyard ring built for violent rebounds.',
    },
    {
      id: 'neon-spillway',
      name: 'Neon Spillway',
      description: 'Long lanes turn every charge into a wager.',
    },
    {
      id: 'furnace-eight',
      name: 'Furnace Eight',
      description: 'Crossing lanes feed a central killbox.',
    },
    {
      id: 'dead-mall',
      name: 'The Dead Mall',
      description: 'Pillars and shortcuts reward surgical drifting.',
    },
    {
      id: 'thunder-dome',
      name: 'Thunder Dome',
      description: 'Wide arcs make room for catastrophic impacts.',
    },
  ];
  const modifiers: DailyRuleCard[] = [
    {
      id: 'oil-rain',
      name: 'Oil Rain',
      description: 'Grip drops, but drift impacts score harder.',
    },
    {
      id: 'volatile-cargo',
      name: 'Volatile Cargo',
      description: 'Elite wrecks erupt through packed enemies.',
    },
    {
      id: 'redline',
      name: 'Permanent Redline',
      description: 'Acceleration surges and braking weakens.',
    },
    {
      id: 'magnet-storm',
      name: 'Magnet Storm',
      description: 'Scrap pulls farther and formations tighten.',
    },
    {
      id: 'crusher-shift',
      name: 'Crusher Shift',
      description: 'Arena hazards cycle faster and pay bonus scrap.',
    },
    {
      id: 'thin-metal',
      name: 'Thin Metal Tuesday',
      description: 'Everyone hits harder. Momentum decides everything.',
    },
  ];
  const arena = arenas[(seed >>> 3) % arenas.length] ?? arenas[0]!;
  const modifier = modifiers[seed % modifiers.length] ?? modifiers[0]!;
  const magnetBlueprint = {
    id: 'magnet' as const,
    name: 'Magnet Coil',
    description: 'The community begins with increased scrap pickup range.',
  };
  return {
    type: 'init',
    runtimeMode: 'practice',
    postId: 'local-preview',
    serverTime: new Date().toISOString(),
    username: 'local-driver',
    day,
    seed,
    modifier,
    communityUpgrade: 'magnet',
    challenge: {
      date: day,
      seed,
      arena,
      modifier,
      communityUpgrade: magnetBlueprint,
    },
    community: {
      scrap: 0,
      target: 3_000,
      tier: 0,
      wrecks: 0,
      contributors: 0,
      tierState: {
        level: 0,
        name: 'Loose Hubcaps',
        minimumScrap: 0,
        nextTarget: 3_000,
        progress: 0,
      },
      crewScores: { iron: 0, neon: 0, rust: 0 },
      votes: { magnet: 0, armor: 0, nitro: 0 },
    },
    profile: {
      isAuthenticated: false,
      username: 'local-driver',
      crew: 'iron',
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
    },
    leaderboard: [],
    crewStandings: [
      {
        rank: 1,
        id: 'iron',
        name: 'Iron Howlers',
        motto: 'Heavy metal. Zero mercy.',
        score: 0,
        isPlayerCrew: true,
      },
      {
        rank: 2,
        id: 'neon',
        name: 'Neon Jackals',
        motto: 'Fast, loud, first into the pile.',
        score: 0,
        isPlayerCrew: false,
      },
      {
        rank: 3,
        id: 'rust',
        name: 'Rust Reapers',
        motto: 'Every dent is a promise.',
        score: 0,
        isPlayerCrew: false,
      },
    ],
    blueprintVote: {
      date: day,
      options: [
        { ...magnetBlueprint, votes: 0 },
        {
          id: 'armor',
          name: 'Wreckplate Armor',
          description: 'The community begins with +15 starting body.',
          votes: 0,
        },
        {
          id: 'nitro',
          name: 'Overdrive Injector',
          description: 'The community begins with +35 top speed.',
          votes: 0,
        },
      ],
      selectedId: null,
      totalVotes: 0,
      canVote: false,
    },
  };
};

const isInitResponse = (value: unknown): value is InitResponse => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record.type === 'init' &&
    typeof record.username === 'string' &&
    typeof record.day === 'string' &&
    typeof record.seed === 'number' &&
    typeof record.challenge === 'object' &&
    record.challenge !== null &&
    typeof record.modifier === 'object' &&
    record.modifier !== null &&
    typeof record.community === 'object' &&
    record.community !== null &&
    typeof record.profile === 'object' &&
    record.profile !== null &&
    typeof record.blueprintVote === 'object' &&
    record.blueprintVote !== null &&
    Array.isArray(record.leaderboard) &&
    Array.isArray(record.crewStandings)
  );
};

export const loadCommunityState = async (): Promise<CommunityState> => {
  if (
    window.location.hostname === '127.0.0.1' &&
    window.location.port === '5173'
  ) {
    return offlineCommunityState();
  }
  try {
    const response = await timedFetch('/api/init', {}, 4_000);
    if (!response.ok) throw new Error(`Init failed: ${response.status}`);
    const payload: unknown = await response.json();
    if (!isInitResponse(payload))
      throw new Error('Init returned an unexpected shape');
    return { ...payload, runtimeMode: 'live' };
  } catch (error) {
    console.info('Using local community fallback:', error);
    return offlineCommunityState();
  }
};

export type RunResult = RunSubmissionRequest;
export type PendingRunResult = Omit<RunSubmissionRequest, 'sessionNonce'>;

const isRunSessionResponse = (value: unknown): value is RunSessionResponse => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record.type === 'run-session' &&
    typeof record.runId === 'string' &&
    typeof record.sessionNonce === 'string' &&
    typeof record.startedAt === 'string' &&
    typeof record.expiresAt === 'string'
  );
};

export const startRunSession = async (
  request: RunSessionRequest
): Promise<RunSessionResponse | null> => {
  if (
    window.location.hostname === '127.0.0.1' &&
    window.location.port === '5173'
  ) {
    return null;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await timedFetch(
        '/api/run/start',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
        },
        4_000
      );
      if (response.ok) {
        const payload: unknown = await response.json();
        return isRunSessionResponse(payload) ? payload : null;
      }
      if (response.status !== 409 && response.status < 500) return null;
    } catch (error) {
      if (attempt === 1) console.info('Run session unavailable:', error);
    }

    if (attempt === 0) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 250));
    }
  }

  return null;
};

const isRunSubmissionResponse = (
  value: unknown
): value is RunSubmissionResponse => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record.type === 'run-submitted' &&
    record.accepted === true &&
    typeof record.profile === 'object' &&
    record.profile !== null &&
    typeof record.community === 'object' &&
    record.community !== null &&
    Array.isArray(record.leaderboard) &&
    Array.isArray(record.crewStandings)
  );
};

export const submitRun = async (
  result: RunResult
): Promise<RunSubmissionResponse | null> => {
  if (
    window.location.hostname === '127.0.0.1' &&
    window.location.port === '5173'
  )
    return null;
  try {
    const response = await timedFetch('/api/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(result),
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    return isRunSubmissionResponse(payload) ? payload : null;
  } catch (error) {
    console.info('Run submission unavailable:', error);
    return null;
  }
};

const isVoteResponse = (value: unknown): value is BlueprintVoteResponse => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record.type === 'blueprint-vote' &&
    record.accepted === true &&
    !!record.vote
  );
};

export const submitVote = async (
  blueprint: BlueprintId
): Promise<BlueprintVoteResponse | null> => {
  if (
    window.location.hostname === '127.0.0.1' &&
    window.location.port === '5173'
  )
    return null;
  try {
    const response = await timedFetch('/api/vote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ blueprint }),
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    return isVoteResponse(payload) ? payload : null;
  } catch (error) {
    console.info('Blueprint vote unavailable:', error);
    return null;
  }
};

export const deletePlayerData = async (): Promise<boolean> => {
  if (
    window.location.hostname === '127.0.0.1' &&
    window.location.port === '5173'
  )
    return true;
  try {
    const response = await timedFetch('/api/profile', { method: 'DELETE' });
    return response.ok;
  } catch (error) {
    console.info('Player data deletion unavailable:', error);
    return false;
  }
};
