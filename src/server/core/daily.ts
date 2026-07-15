import type {
  BlueprintCard,
  BlueprintId,
  CrewId,
  DailyChallenge,
  DailyRuleCard,
  WreckpileTier,
} from '../../shared/api';

type CrewDefinition = {
  id: CrewId;
  name: string;
  motto: string;
};

export const CREW_DEFINITIONS: readonly CrewDefinition[] = [
  {
    id: 'iron',
    name: 'Iron Howlers',
    motto: 'Heavy metal. Zero mercy.',
  },
  {
    id: 'neon',
    name: 'Neon Jackals',
    motto: 'Fast, loud, first into the pile.',
  },
  {
    id: 'rust',
    name: 'Rust Reapers',
    motto: 'Every dent is a promise.',
  },
];

const ARENAS: readonly DailyRuleCard[] = [
  {
    id: 'boneyard-bowl',
    name: 'Boneyard Bowl',
    description:
      'A tight scrapyard ring with crushing walls and nowhere to coast.',
  },
  {
    id: 'neon-spillway',
    name: 'Neon Spillway',
    description:
      'Long drainage lanes turn every charge into a high-speed wager.',
  },
  {
    id: 'furnace-eight',
    name: 'Furnace Eight',
    description:
      'Crossing lanes funnel the horde through a glowing central killbox.',
  },
  {
    id: 'dead-mall',
    name: 'The Dead Mall',
    description:
      'Pillars, kiosks, and glassy shortcuts reward surgical drifting.',
  },
  {
    id: 'thunder-dome',
    name: 'Thunder Dome',
    description:
      'A wide arena built for huge trains, wide arcs, and catastrophic impacts.',
  },
];

const MODIFIERS: readonly DailyRuleCard[] = [
  {
    id: 'oil-rain',
    name: 'Oil Rain',
    description:
      'Grip is reduced, but drift impacts earn a larger score multiplier.',
  },
  {
    id: 'volatile-cargo',
    name: 'Volatile Cargo',
    description: 'Elite wrecks erupt, chaining damage through packed enemies.',
  },
  {
    id: 'redline',
    name: 'Permanent Redline',
    description:
      'Acceleration is fierce and braking is weak. Commit to every line.',
  },
  {
    id: 'magnet-storm',
    name: 'Magnet Storm',
    description:
      'Scrap is pulled farther, while enemy formations tighten around the car.',
  },
  {
    id: 'crusher-shift',
    name: 'Crusher Shift',
    description:
      'Arena hazards cycle faster and award bonus scrap for environmental kills.',
  },
  {
    id: 'thin-metal',
    name: 'Thin Metal Tuesday',
    description:
      'Everyone hits harder, including the horde. Momentum decides everything.',
  },
];

const BLUEPRINTS: readonly BlueprintCard[] = [
  {
    id: 'magnet',
    name: 'Magnet Coil',
    description:
      'The whole community begins with increased scrap pickup range.',
  },
  {
    id: 'armor',
    name: 'Wreckplate Armor',
    description: 'The whole community starts each run with +15 body.',
  },
  {
    id: 'nitro',
    name: 'Overdrive Injector',
    description: 'The whole community starts each run with +35 top speed.',
  },
];

const WRECKPILE_TIERS = [
  { name: 'Loose Hubcaps', minimumScrap: 0 },
  { name: 'Scrap Heap', minimumScrap: 3_000 },
  { name: 'Junkyard Crown', minimumScrap: 12_000 },
  { name: 'Chrome Mountain', minimumScrap: 30_000 },
  { name: 'Apocalypse Monument', minimumScrap: 75_000 },
] as const;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const utcDateKey = (date: Date = new Date()): string =>
  date.toISOString().slice(0, 10);

export const isUtcDateKey = (value: string): boolean => {
  if (!DATE_KEY_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && utcDateKey(parsed) === value;
};

export const offsetUtcDateKey = (dateKey: string, days: number): string => {
  if (!isUtcDateKey(dateKey)) {
    throw new Error(`Invalid UTC date key: ${dateKey}`);
  }

  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateKey(date);
};

export const hash32 = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

export const dailySeed = (dateKey: string, scope: string): number =>
  hash32(`ramageddon:v1:${scope}:${dateKey}`);

export const crewForUsername = (username: string): CrewId => {
  const definition =
    CREW_DEFINITIONS[hash32(username.toLowerCase()) % CREW_DEFINITIONS.length];
  if (!definition) throw new Error('Crew catalogue is empty');
  return definition.id;
};

export const getBlueprint = (id: BlueprintId): BlueprintCard => {
  const blueprint = BLUEPRINTS.find((candidate) => candidate.id === id);
  if (!blueprint) throw new Error(`Unknown blueprint: ${id}`);
  return blueprint;
};

export const getDailyBlueprintOptions = (
  dateKey: string,
  scope: string
): BlueprintCard[] => {
  const pool = [...BLUEPRINTS];
  let state = dailySeed(dateKey, `${scope}:blueprints`);

  for (let index = pool.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    const swapIndex = state % (index + 1);
    const current = pool[index];
    const replacement = pool[swapIndex];
    if (!current || !replacement) continue;
    pool[index] = replacement;
    pool[swapIndex] = current;
  }

  return pool.slice(0, 3);
};

export const buildDailyChallenge = (
  dateKey: string,
  scope: string,
  communityUpgrade: BlueprintCard
): DailyChallenge => {
  const seed = dailySeed(dateKey, scope);
  const arena = ARENAS[seed % ARENAS.length];
  const modifier = MODIFIERS[(seed >>> 8) % MODIFIERS.length];

  if (!arena || !modifier) throw new Error('Daily rule catalogue is empty');

  return {
    date: dateKey,
    seed,
    arena,
    modifier,
    communityUpgrade,
  };
};

export const getWreckpileTier = (scrap: number): WreckpileTier => {
  const safeScrap = Math.max(0, Math.floor(scrap));
  let level = 0;

  for (let index = 1; index < WRECKPILE_TIERS.length; index += 1) {
    const candidate = WRECKPILE_TIERS[index];
    if (candidate && safeScrap >= candidate.minimumScrap) level = index;
  }

  const current = WRECKPILE_TIERS[level];
  const next = WRECKPILE_TIERS[level + 1];
  if (!current) throw new Error('Wreckpile tier catalogue is empty');

  const progress = next
    ? Math.min(
        1,
        Math.max(
          0,
          (safeScrap - current.minimumScrap) /
            (next.minimumScrap - current.minimumScrap)
        )
      )
    : 1;

  return {
    level,
    name: current.name,
    minimumScrap: current.minimumScrap,
    nextTarget: next?.minimumScrap ?? null,
    progress,
  };
};
