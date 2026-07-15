import { context, requestExpandedMode } from '@devvit/web/client';

type UnknownRecord = Record<string, unknown>;

type Leader = {
  name: string;
  score: number | null;
};

type LaunchData = {
  arena: string;
  modifier: string;
  communityScrap: number;
  communityGoal: number;
  leaders: Leader[];
  username: string;
};

const FALLBACK: LaunchData = {
  arena: 'BONEYARD BOWL',
  modifier: 'MAGNET STORM',
  communityScrap: 0,
  communityGoal: 3_000,
  leaders: [],
  username: context?.username ?? 'DRIVER',
};

const launchCard = requireElement<HTMLElement>('launch-card');
const startButton = requireElement<HTMLButtonElement>('start-button');
const buttonLabel = requireElement<HTMLSpanElement>('button-label');
const launchTransition = requireElement<HTMLDivElement>('launch-transition');
const launchRecovery = requireElement<HTMLParagraphElement>('launch-recovery');
const pilotName = requireElement<HTMLSpanElement>('pilot-name');
const arenaName = requireElement<HTMLParagraphElement>('arena-name');
const arenaModifier = requireElement<HTMLParagraphElement>('arena-mod');
const communityScrap = requireElement<HTMLParagraphElement>('community-scrap');
const communityGoal = requireElement<HTMLParagraphElement>('community-goal');
const goalFill = requireElement<HTMLSpanElement>('goal-fill');
const leaderList = requireElement<HTMLOListElement>('leader-list');
const dataSignal = requireElement<HTMLSpanElement>('data-signal');

const LAUNCH_WATCHDOG_MS = 10_000;
let launchWatchdog: number | undefined;
let launchInFlight = false;
let launchLeftInlineView = false;

startButton.addEventListener('click', (event) => {
  if (launchInFlight) return;

  setLaunching();

  try {
    // This must remain inside the trusted click handler for Reddit to accept
    // the expanded-mode request. The visual state above paints immediately
    // while the new webview and game assets are being prepared.
    requestExpandedMode(event, 'game');
  } catch (error) {
    console.info(
      'Crew Garage could not open; the launch remains retryable.',
      error
    );
    recoverLaunch('GARAGE LINK MISFIRED — TAP TO RETRY');
  }
});

document.addEventListener('visibilitychange', () => {
  if (!launchInFlight) return;

  if (document.hidden) {
    launchLeftInlineView = true;
  } else if (launchLeftInlineView) {
    recoverLaunch();
  }
});

window.addEventListener('pageshow', () => {
  if (launchInFlight && launchLeftInlineView) recoverLaunch();
});

function setLaunching(): void {
  launchInFlight = true;
  launchLeftInlineView = false;
  launchCard.classList.remove('launch-failed');
  launchCard.classList.add('is-launching');
  startButton.disabled = true;
  startButton.setAttribute('aria-busy', 'true');
  buttonLabel.textContent = 'OPENING GARAGE…';
  launchRecovery.textContent = '';
  launchTransition.setAttribute('aria-hidden', 'false');

  if (launchWatchdog !== undefined) window.clearTimeout(launchWatchdog);
  launchWatchdog = window.setTimeout(() => {
    recoverLaunch('GARAGE LINK STALLED — TAP TO RETRY');
  }, LAUNCH_WATCHDOG_MS);
}

function recoverLaunch(message = ''): void {
  launchInFlight = false;
  launchLeftInlineView = false;
  launchCard.classList.remove('is-launching');
  launchCard.classList.toggle('launch-failed', Boolean(message));
  startButton.disabled = false;
  startButton.removeAttribute('aria-busy');
  buttonLabel.textContent = message ? 'RETRY GARAGE' : 'WRECK THE HORDE';
  launchRecovery.textContent = message;
  launchTransition.setAttribute('aria-hidden', 'true');

  if (launchWatchdog !== undefined) {
    window.clearTimeout(launchWatchdog);
    launchWatchdog = undefined;
  }
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required launch-screen element: #${id}`);
  }
  return element as T;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPath(source: UnknownRecord, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    return isRecord(value) ? value[key] : undefined;
  }, source);
}

function firstValue(source: UnknownRecord, paths: string[]): unknown {
  for (const path of paths) {
    const value = readPath(source, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function safeText(value: unknown, fallback: string, maxLength = 32): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = [...value]
    .filter(
      (character) =>
        character !== '<' && character !== '>' && character.charCodeAt(0) >= 32
    )
    .join('')
    .trim();
  return cleaned ? cleaned.slice(0, maxLength) : fallback;
}

function safeNumber(value: unknown, fallback: number): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function parseLeader(value: unknown): Leader | null {
  if (!isRecord(value)) return null;

  const name = safeText(
    firstValue(value, [
      'username',
      'name',
      'driver',
      'player',
      'user.displayName',
    ]),
    '',
    22
  );
  if (!name) return null;

  const rawScore = firstValue(value, [
    'score',
    'wrecks',
    'totalWrecks',
    'xp',
    'points',
    'value',
  ]);
  const score =
    rawScore === undefined || rawScore === null
      ? null
      : safeNumber(rawScore, 0);
  return { name, score };
}

function parseLaunchData(payload: unknown): LaunchData {
  if (!isRecord(payload)) return FALLBACK;

  const rawLeaders = firstValue(payload, [
    'leaderboard',
    'leaders',
    'topRuns',
    'daily.leaderboard',
    'community.leaderboard',
  ]);

  const leaders = Array.isArray(rawLeaders)
    ? rawLeaders
        .map(parseLeader)
        .filter((leader): leader is Leader => leader !== null)
        .slice(0, 3)
    : [];

  const username = safeText(
    firstValue(payload, [
      'username',
      'profile.username',
      'user.username',
      'player.username',
    ]),
    FALLBACK.username,
    22
  );

  return {
    arena: safeText(
      firstValue(payload, [
        'todayArena',
        'arenaName',
        'challenge.arena.name',
        'arena.name',
        'daily.arena',
        'daily.name',
      ]),
      FALLBACK.arena,
      28
    ),
    modifier: safeText(
      firstValue(payload, [
        'todayModifier',
        'modifier.name',
        'challenge.modifier.name',
        'daily.modifier.name',
        'arena.modifier',
        'modifier',
        'daily.modifier',
        'daily.rule',
      ]),
      FALLBACK.modifier,
      36
    ),
    communityScrap: safeNumber(
      firstValue(payload, [
        'communityScrap',
        'community.scrap',
        'daily.communityScrap',
        'totalWrecks',
        'wrecks',
        'community.wrecks',
        'count',
      ]),
      FALLBACK.communityScrap
    ),
    communityGoal: Math.max(
      1,
      safeNumber(
        firstValue(payload, [
          'communityGoal',
          'wreckGoal',
          'community.target',
          'community.tierState.nextTarget',
          'community.tier.nextTarget',
          'community.goal',
          'daily.communityGoal',
        ]),
        FALLBACK.communityGoal
      )
    ),
    leaders,
    username,
  };
}

function render(data: LaunchData): void {
  pilotName.textContent = data.username.toLocaleUpperCase();
  arenaName.textContent = data.arena.toLocaleUpperCase();
  arenaModifier.textContent = data.modifier.toLocaleUpperCase();
  communityScrap.textContent = data.communityScrap.toLocaleString();

  const progress = Math.min(
    100,
    Math.round((data.communityScrap / data.communityGoal) * 100)
  );
  goalFill.style.width = `${progress}%`;
  communityGoal.textContent = `${progress}% OF ${compactNumber(data.communityGoal)} TARGET`;

  const displayedLeaders = data.leaders.length
    ? data.leaders.slice(0, 3)
    : [{ name: 'NO RUNS YET — CLAIM #1', score: null }];

  leaderList.replaceChildren(
    ...displayedLeaders.map((leader, index) => {
      const row = document.createElement('li');
      const rank = document.createElement('span');
      const driver = document.createElement('span');
      const score = document.createElement('strong');

      rank.className = 'rank';
      driver.className = 'driver';
      rank.textContent = String(index + 1);
      driver.textContent = leader.name.toLocaleUpperCase();
      score.textContent =
        leader.score === null ? '—' : leader.score.toLocaleString();
      row.append(rank, driver, score);
      return row;
    })
  );
}

function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return value.toLocaleString();
}

async function loadCommunityData(): Promise<void> {
  render(FALLBACK);

  if (
    window.location.hostname === '127.0.0.1' &&
    window.location.port === '5173'
  ) {
    dataSignal.textContent = 'PIT RADIO QUIET';
    dataSignal.classList.add('offline');
    return;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3_000);

  try {
    const response = await fetch('/api/init', {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(`Community radio returned ${response.status}`);

    const payload: unknown = await response.json();
    render(parseLaunchData(payload));
    dataSignal.textContent = 'LIVE RADIO';
    dataSignal.classList.remove('offline');
  } catch (error) {
    dataSignal.textContent = 'PIT RADIO QUIET';
    dataSignal.classList.add('offline');
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      console.info(
        'Community preview unavailable; using resilient launch data.',
        error
      );
    }
  } finally {
    window.clearTimeout(timeout);
  }
}

void loadCommunityData();
