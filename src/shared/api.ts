export const CREW_IDS = ['iron', 'neon', 'rust'] as const;

export type CrewId = (typeof CREW_IDS)[number];

export const BLUEPRINT_IDS = ['magnet', 'armor', 'nitro'] as const;

export type BlueprintId = (typeof BLUEPRINT_IDS)[number];

export type DailyRuleCard = {
  id: string;
  name: string;
  description: string;
};

export type BlueprintCard = DailyRuleCard & {
  id: BlueprintId;
};

export type DailyChallenge = {
  date: string;
  seed: number;
  arena: DailyRuleCard;
  modifier: DailyRuleCard;
  communityUpgrade: BlueprintCard;
};

export type PlayerProfile = {
  isAuthenticated: boolean;
  username: string;
  crew: CrewId;
  bestScore: number;
  bestCombo: number;
  totalScrap: number;
  careerWrecks: number;
  streak: number;
  longestStreak: number;
  dailyBest: number;
  dailyRuns: number;
  dailyRank: number | null;
  runs: number;
  lastPlayedDate: string | null;
};

export type LeaderboardEntry = {
  rank: number;
  username: string;
  crew: CrewId;
  score: number;
  isCurrentUser: boolean;
};

export type CrewStanding = {
  rank: number;
  id: CrewId;
  name: string;
  motto: string;
  score: number;
  isPlayerCrew: boolean;
};

export type WreckpileTier = {
  level: number;
  name: string;
  minimumScrap: number;
  nextTarget: number | null;
  progress: number;
};

export type CommunityState = {
  scrap: number;
  target: number;
  tier: number;
  wrecks: number;
  contributors: number;
  tierState: WreckpileTier;
  crewScores: Record<CrewId, number>;
  votes: Record<BlueprintId, number>;
};

export type BlueprintVoteOption = BlueprintCard & {
  votes: number;
};

export type BlueprintVoteState = {
  date: string;
  options: BlueprintVoteOption[];
  selectedId: BlueprintId | null;
  totalVotes: number;
  canVote: boolean;
};

export type InitResponse = {
  type: 'init';
  postId: string;
  serverTime: string;
  username: string;
  day: string;
  seed: number;
  modifier: DailyRuleCard;
  communityUpgrade: BlueprintId;
  challenge: DailyChallenge;
  profile: PlayerProfile;
  leaderboard: LeaderboardEntry[];
  crewStandings: CrewStanding[];
  community: CommunityState;
  blueprintVote: BlueprintVoteState;
};

export type RunSessionRequest = {
  day: string;
  seed: number;
  runId: string;
};

export type RunSessionResponse = {
  type: 'run-session';
  runId: string;
  sessionNonce: string;
  startedAt: string;
  expiresAt: string;
};

export type RunSubmissionRequest = {
  day: string;
  seed: number;
  runId: string;
  sessionNonce: string;
  score: number;
  scrap: number;
  kills: number;
  bestCombo: number;
  level: number;
  survivedSeconds: number;
  crew: CrewId;
  victory: boolean;
};

export type SubmittedRun = {
  score: number;
  scrap: number;
  kills: number;
  bestCombo: number;
  level: number;
  survivedSeconds: number;
  crew: CrewId;
  victory: boolean;
  isDailyBest: boolean;
  isPersonalBest: boolean;
};

export type RunSubmissionResponse = {
  type: 'run-submitted';
  accepted: true;
  run: SubmittedRun;
  profile: PlayerProfile;
  leaderboard: LeaderboardEntry[];
  crewStandings: CrewStanding[];
  community: CommunityState;
};

export type BlueprintVoteRequest = {
  blueprint: BlueprintId;
};

export type BlueprintVoteResponse = {
  type: 'blueprint-vote';
  accepted: true;
  vote: BlueprintVoteState;
};

export type ApiErrorCode =
  | 'bad-request'
  | 'challenge-expired'
  | 'run-session-invalid'
  | 'not-authenticated'
  | 'already-voted'
  | 'submission-limit'
  | 'context-missing'
  | 'storage-unavailable'
  | 'internal-error';

export type ApiErrorResponse = {
  type: 'error';
  code: ApiErrorCode;
  message: string;
};
