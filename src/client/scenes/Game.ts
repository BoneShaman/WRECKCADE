import * as Phaser from 'phaser';
import { GameObjects, Scene } from 'phaser';
import { audio } from '../systems/AudioDirector';
import {
  offlineCommunityState,
  startRunSession,
  submitRun,
  submitVote,
  type BlueprintId,
  type CommunityState,
  type CrewId,
  type PendingRunResult,
} from '../systems/community';

type GameMode = 'playing' | 'levelup' | 'paused' | 'ended';
type SyncState = 'idle' | 'pending' | 'saved' | 'failed' | 'practice';
type EnemyKind = 'buggy' | 'striker' | 'bruiser' | 'elite' | 'boss';
type UpgradeId =
  | 'ram'
  | 'saws'
  | 'nailgun'
  | 'exhaust'
  | 'engine'
  | 'magnet'
  | 'armor'
  | 'chain'
  | 'overdrive'
  | 'repair';

type UpgradeDefinition = {
  id: UpgradeId;
  title: string;
  promise: string;
  color: number;
  colorCss: string;
  max: number;
};

type ModalPoint = { x: number; y: number };

const CREW_NAMES: Record<CrewId, string> = {
  iron: 'IRON HOWLERS',
  neon: 'NEON JACKALS',
  rust: 'RUST REAPERS',
};

type PlayerState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  invulnerable: number;
  level: number;
  xp: number;
  nextXp: number;
  score: number;
  scrap: number;
  kills: number;
  combo: number;
  bestCombo: number;
  bestWreckChain: number;
  comboTimer: number;
  heat: number;
  overdriveTimer: number;
  forwardSpeed: number;
  drifting: boolean;
  driftIntensity: number;
};

type Enemy = {
  id: number;
  kind: EnemyKind;
  visualRow: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  acceleration: number;
  mass: number;
  score: number;
  scrap: number;
  contactCooldown: number;
  sawCooldown: number;
  fireCooldown: number;
  flash: number;
  phase: number;
  chargeCooldown: number;
  chargeTelegraph: number;
  chargeAngle: number;
  alive: boolean;
};

type Wreck = {
  id: number;
  visualRow: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  radius: number;
  life: number;
  maxLife: number;
  hot: boolean;
  chain: number;
  power: number;
  color: number;
  trailTimer: number;
  hitIds: Set<number>;
};

type Pickup = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  kind: 'scrap' | 'repair';
  age: number;
  persistent: boolean;
  visualFrame: number;
};

type Projectile = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
};

type FirePool = {
  x: number;
  y: number;
  life: number;
  radius: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  drag: number;
  gravity: number;
  kind?: 'spark' | 'chunk' | 'smoke' | 'tyre';
  rotation?: number;
  spin?: number;
};

type ImpactRing = {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  startRadius: number;
  endRadius: number;
  color: number;
};

type SkidMark = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
};

type Decoration = {
  id: number;
  x: number;
  y: number;
  kind: 'stain' | 'crack' | 'cone' | 'barrel' | 'tyre' | 'pillar';
  rotation: number;
  size: number;
  alive: boolean;
  hp: number;
  maxHp: number;
  fuse: number;
  visualFrame: number;
};

type BlastVisual = {
  id: number;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
};

type ExplosionOptions = {
  environmental?: boolean;
  hurtsPlayer?: boolean;
  chainsBarrels?: boolean;
};

type LandmarkEdge = 'top' | 'right' | 'bottom' | 'left';

type LandmarkDefinition = {
  frame: number;
  edge: LandmarkEdge;
  along: number;
  size: number;
  rotation: number;
};

type ArenaLandmark = {
  object: GameObjects.Image;
  worldX: number;
  worldY: number;
  cullRadius: number;
};

type DecalDefinition = {
  x: number;
  y: number;
  size: number;
  rotation: number;
};

type ArenaDecal = {
  object: GameObjects.Image;
  worldX: number;
  worldY: number;
  cullRadius: number;
};

type FloatingText = {
  object: GameObjects.Text;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
};

type ControlKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  upAlt: Phaser.Input.Keyboard.Key;
  downAlt: Phaser.Input.Keyboard.Key;
  leftAlt: Phaser.Input.Keyboard.Key;
  rightAlt: Phaser.Input.Keyboard.Key;
  drift: Phaser.Input.Keyboard.Key;
  driftAlt: Phaser.Input.Keyboard.Key;
};

type ControlState = {
  throttle: number;
  steer: number;
  drift: boolean;
};

type GameInitData = {
  crew?: CrewId;
  meta?: CommunityState;
};

const WORLD_WIDTH = 3400;
const WORLD_HEIGHT = 2500;
const FIXED_STEP = 1 / 60;
const RUN_SECONDS = 180;
const GRID_SIZE = 96;
const VEHICLE_ATLAS_KEY = 'vehicle-atlas-v1';
const HAZARDS_ATLAS_KEY = 'hazards-fx-v1';
const VEHICLE_FRAME_SIZE = 128;
const VEHICLE_ART_LENGTH = 112;
const VEHICLE_DAMAGE_COLUMNS = 4;
const BARREL_HP = 24;
const BARREL_RADIUS = 19;
const REPAIR_FRAME_START = 12;

const LANDMARK_DEFINITIONS: LandmarkDefinition[] = [
  { frame: 0, edge: 'top', along: 520, size: 288, rotation: -0.08 },
  { frame: 2, edge: 'top', along: 1700, size: 310, rotation: 0 },
  { frame: 1, edge: 'top', along: 2860, size: 300, rotation: 0.06 },
  { frame: 1, edge: 'left', along: 1300, size: 288, rotation: Math.PI / 2 },
  {
    frame: 3,
    edge: 'right',
    along: 1150,
    size: 310,
    rotation: -Math.PI / 2,
  },
  { frame: 2, edge: 'bottom', along: 720, size: 300, rotation: Math.PI },
  { frame: 3, edge: 'bottom', along: 1900, size: 316, rotation: Math.PI },
  {
    frame: 0,
    edge: 'bottom',
    along: 2860,
    size: 292,
    rotation: Math.PI + 0.08,
  },
];

const DECAL_DEFINITIONS: DecalDefinition[] = [
  { x: 1700, y: 1250, size: 184, rotation: -0.04 },
  { x: 1580, y: 1090, size: 132, rotation: 0.16 },
  { x: 1820, y: 1420, size: 144, rotation: -0.21 },
  { x: 820, y: 620, size: 168, rotation: 0.12 },
  { x: 2580, y: 640, size: 152, rotation: -0.17 },
  { x: 720, y: 1760, size: 142, rotation: 0.24 },
  { x: 2690, y: 1780, size: 176, rotation: -0.08 },
  { x: 1210, y: 2050, size: 154, rotation: 0.19 },
  { x: 2220, y: 360, size: 138, rotation: -0.14 },
  { x: 2340, y: 2140, size: 166, rotation: 0.09 },
];

const ARENA_DECAL_FRAMES: Record<string, readonly number[]> = {
  'boneyard-bowl': [0, 2, 0, 1, 2, 0, 3, 2, 1, 0],
  'neon-spillway': [3, 1, 3, 2, 1, 3, 0, 1, 2, 3],
  'furnace-eight': [0, 1, 0, 2, 1, 0, 3, 1, 2, 0],
  'dead-mall': [1, 3, 1, 0, 3, 1, 2, 3, 0, 1],
  'thunder-dome': [0, 2, 3, 0, 2, 0, 1, 2, 3, 0],
};

const DECORATION_CLUSTERS: ReadonlyArray<readonly [number, number]> = [
  [520, 430],
  [1700, 410],
  [2860, 500],
  [560, 1260],
  [2820, 1250],
  [620, 2020],
  [1700, 2070],
  [2780, 1980],
];

const CREW_COLORS: Record<CrewId, number> = {
  iron: 0xffc928,
  neon: 0x2ef2e2,
  rust: 0xff6b35,
};

const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    id: 'ram',
    title: 'BULL BAR',
    promise: '+42% RAM FORCE',
    color: 0xffc928,
    colorCss: '#ffc928',
    max: 5,
  },
  {
    id: 'saws',
    title: 'SAW HUBS',
    promise: '+2 ORBITING BLADES',
    color: 0xf15bb5,
    colorCss: '#f15bb5',
    max: 4,
  },
  {
    id: 'nailgun',
    title: 'ROOF RIPPER',
    promise: 'AUTO-FIRES NAILS',
    color: 0x2ef2e2,
    colorCss: '#2ef2e2',
    max: 5,
  },
  {
    id: 'exhaust',
    title: 'HELL EXHAUST',
    promise: 'DRIFT LEAVES FIRE',
    color: 0xff6b35,
    colorCss: '#ff6b35',
    max: 4,
  },
  {
    id: 'engine',
    title: 'V8 HEART',
    promise: '+18% SPEED + PULL',
    color: 0xf7f3df,
    colorCss: '#f7f3df',
    max: 5,
  },
  {
    id: 'magnet',
    title: 'MAG-CRANE',
    promise: '+70 SCRAP REACH',
    color: 0x2ef2e2,
    colorCss: '#2ef2e2',
    max: 5,
  },
  {
    id: 'armor',
    title: 'ROLL CAGE',
    promise: '+25 BODY + REPAIR',
    color: 0x8fa3b8,
    colorCss: '#8fa3b8',
    max: 4,
  },
  {
    id: 'chain',
    title: 'CHAIN REACTION',
    promise: 'WRECKS FLY HARDER',
    color: 0xf15bb5,
    colorCss: '#f15bb5',
    max: 5,
  },
  {
    id: 'overdrive',
    title: 'REDLINE',
    promise: 'LONGER COMBOS + HEAT',
    color: 0xff365e,
    colorCss: '#ff365e',
    max: 4,
  },
  {
    id: 'repair',
    title: 'DUCT TAPE',
    promise: 'RESTORE 45 BODY',
    color: 0x6ee7a8,
    colorCss: '#6ee7a8',
    max: 99,
  },
];

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, value));

const lerp = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount;

const angleDifference = (target: number, current: number): number =>
  Math.atan2(Math.sin(target - current), Math.cos(target - current));

const distanceSquared = (
  ax: number,
  ay: number,
  bx: number,
  by: number
): number => {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
};

const css = (value: number): string =>
  `#${value.toString(16).padStart(6, '0')}`;

export class Game extends Scene {
  private arenaFloor: GameObjects.TileSprite;
  private arenaDecals: ArenaDecal[] = [];
  private arenaLandmarks: ArenaLandmark[] = [];
  private worldGraphics: GameObjects.Graphics;
  private worldOverlayGraphics: GameObjects.Graphics;
  private uiGraphics: GameObjects.Graphics;
  private modalGraphics: GameObjects.Graphics;
  private timerText: GameObjects.Text;
  private waveText: GameObjects.Text;
  private hpText: GameObjects.Text;
  private scoreText: GameObjects.Text;
  private levelText: GameObjects.Text;
  private comboText: GameObjects.Text;
  private crewText: GameObjects.Text;
  private hintText: GameObjects.Text;
  private announcementText: GameObjects.Text;
  private touchPauseText: GameObjects.Text;
  private touchMuteText: GameObjects.Text;
  private touchDriveText: GameObjects.Text;
  private touchDriftText: GameObjects.Text;
  private modalTexts: GameObjects.Text[] = [];
  private floatTexts: FloatingText[] = [];
  private keys: ControlKeys;
  private player: PlayerState;
  private crew: CrewId = 'iron';
  private meta: CommunityState = offlineCommunityState();
  private mode: GameMode = 'playing';
  private enemies: Enemy[] = [];
  private wrecks: Wreck[] = [];
  private pickups: Pickup[] = [];
  private projectiles: Projectile[] = [];
  private fires: FirePool[] = [];
  private particles: Particle[] = [];
  private impactRings: ImpactRing[] = [];
  private skidMarks: SkidMark[] = [];
  private decorations: Decoration[] = [];
  private blastVisuals: BlastVisual[] = [];
  private enemyGrid = new Map<string, Enemy[]>();
  private playerVehicleImage: GameObjects.Image | null = null;
  private enemyVehicleImages = new Map<number, GameObjects.Image>();
  private wreckVehicleImages = new Map<number, GameObjects.Image>();
  private barrelImages = new Map<number, GameObjects.Image>();
  private repairImages = new Map<number, GameObjects.Image>();
  private blastImages = new Map<number, GameObjects.Image>();
  private upgradeLevels: Record<UpgradeId, number> = {
    ram: 0,
    saws: 0,
    nailgun: 0,
    exhaust: 0,
    engine: 0,
    magnet: 0,
    armor: 0,
    chain: 0,
    overdrive: 0,
    repair: 0,
  };
  private upgradeChoices: UpgradeDefinition[] = [];
  private upgradeRects: Phaser.Geom.Rectangle[] = [];
  private voteRects: Phaser.Geom.Rectangle[] = [];
  private replayRect = new Phaser.Geom.Rectangle();
  private menuRect = new Phaser.Geom.Rectangle();
  private syncRect = new Phaser.Geom.Rectangle();
  private resultTicketRect = new Phaser.Geom.Rectangle();
  private voteChoice: BlueprintId | null = null;
  private runSubmitted = false;
  private runSyncState: SyncState = 'idle';
  private voteSyncState: SyncState = 'idle';
  private pendingRun: PendingRunResult | null = null;
  private runId = '';
  private runSessionPromise: ReturnType<typeof startRunSession> | null = null;
  private runToken = 0;
  private baselineCommunityScrap = 0;
  private baselineCrewScore = 0;
  private communityScrapDelta = 0;
  private crewScoreDelta = 0;
  private victory = false;
  private elapsed = 0;
  private accumulator = 0;
  private spawnTimer = 0;
  private nextEnemyId = 1;
  private nextWreckId = 1;
  private nextDecorationId = 1;
  private nextPickupId = 1;
  private nextBlastId = 1;
  private randomState = 1;
  private cameraX = 0;
  private cameraY = 0;
  private cameraKickX = 0;
  private cameraKickY = 0;
  private trauma = 0;
  private hitStop = 0;
  private announcementTimer = 0;
  private lastWaveIndex = -1;
  private bossSpawned = false;
  private bossDefeated = false;
  private nailgunCooldown = 0;
  private exhaustCooldown = 0;
  private skidCooldown = 0;
  private pickupSoundStep = 0;
  private manualStepping = false;
  private touchSteerPointerId = -1;
  private touchShifterPointerId = -1;
  private touchSteer = 0;
  private touchThrottle = false;
  private touchDrift = false;
  private touchWheelCenterX = 0;
  private touchWheelCenterY = 0;
  private touchShifterCenterX = 0;
  private touchShifterCenterY = 0;
  private touchWheelRect = new Phaser.Geom.Rectangle();
  private touchShifterRect = new Phaser.Geom.Rectangle();
  private previousDrift = false;
  private showTouchControls = false;
  private touchPauseRect = new Phaser.Geom.Rectangle();
  private touchMuteRect = new Phaser.Geom.Rectangle();
  private hazardTimer = 0;
  private environmentalBlast = false;
  private qaGodMode = false;

  constructor() {
    super('Game');
  }

  init(data: GameInitData): void {
    this.crew = data.crew ?? 'iron';
    this.meta = data.meta ?? offlineCommunityState();
  }

  preload(): void {
    this.load.image(
      'arena-floor-v1',
      new URL('../../../assets/visuals/arena-floor-v1.webp', import.meta.url)
        .href
    );
    this.load.spritesheet(
      'scrapyard-landmarks-v1',
      new URL(
        '../../../assets/visuals/scrapyard-landmarks-v1.webp',
        import.meta.url
      ).href,
      { frameWidth: 512, frameHeight: 512 }
    );
    this.load.spritesheet(
      'arena-decals-v1',
      new URL('../../../assets/visuals/arena-decals-v1.webp', import.meta.url)
        .href,
      { frameWidth: 512, frameHeight: 512 }
    );
    this.load.spritesheet(
      VEHICLE_ATLAS_KEY,
      new URL('../../../assets/visuals/vehicle-atlas-v1.webp', import.meta.url)
        .href,
      { frameWidth: VEHICLE_FRAME_SIZE, frameHeight: VEHICLE_FRAME_SIZE }
    );
    this.load.spritesheet(
      HAZARDS_ATLAS_KEY,
      new URL('../../../assets/visuals/hazards-fx-v1.webp', import.meta.url)
        .href,
      { frameWidth: 128, frameHeight: 128 }
    );
  }

  create(): void {
    this.resetRuntime();
    this.cameras.main.setBackgroundColor(0x080b12);
    this.arenaFloor = this.add
      .tileSprite(0, 0, this.scale.width, this.scale.height, 'arena-floor-v1')
      .setOrigin(0)
      .setDepth(-20)
      .setAlpha(0.72);
    this.createArenaDecals();
    this.createArenaLandmarks();
    this.worldGraphics = this.add.graphics().setDepth(0);
    this.worldOverlayGraphics = this.add.graphics().setDepth(40);
    this.uiGraphics = this.add.graphics().setDepth(100);
    this.modalGraphics = this.add.graphics().setDepth(200);

    const impactFont = 'Impact, Haettenschweiler, sans-serif';
    const monoFont = 'ui-monospace, Menlo, monospace';
    this.timerText = this.add
      .text(0, 0, '03:00', {
        fontFamily: impactFont,
        fontSize: '34px',
        color: '#f7f3df',
        stroke: '#080b12',
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0)
      .setDepth(120);
    this.waveText = this.add
      .text(0, 0, 'OPENING SCRAP', {
        fontFamily: monoFont,
        fontSize: '13px',
        color: '#ffc928',
        letterSpacing: 2,
      })
      .setOrigin(0.5, 0)
      .setDepth(120);
    this.hpText = this.add
      .text(0, 0, 'BODY 100 / 100', {
        fontFamily: monoFont,
        fontSize: '15px',
        color: '#f7f3df',
      })
      .setDepth(120);
    this.scoreText = this.add
      .text(0, 0, '0', {
        fontFamily: impactFont,
        fontSize: '30px',
        color: '#ffc928',
        stroke: '#080b12',
        strokeThickness: 5,
      })
      .setOrigin(1, 0)
      .setDepth(120);
    this.levelText = this.add
      .text(0, 0, 'LV 1', {
        fontFamily: monoFont,
        fontSize: '14px',
        color: '#2ef2e2',
      })
      .setDepth(120);
    this.comboText = this.add
      .text(0, 0, '', {
        fontFamily: impactFont,
        fontSize: '42px',
        color: '#f7f3df',
        stroke: '#080b12',
        strokeThickness: 7,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(120);
    this.crewText = this.add
      .text(0, 0, `${this.crew.toUpperCase()} CREW`, {
        fontFamily: monoFont,
        fontSize: '13px',
        color: css(CREW_COLORS[this.crew]),
        letterSpacing: 2,
      })
      .setDepth(120);
    this.hintText = this.add
      .text(
        0,
        0,
        'WASD / ARROWS DRIVE  •  SPACE / L-SHIFT DRIFT  •  P PAUSE  •  M SOUND',
        {
          fontFamily: monoFont,
          fontSize: '12px',
          color: '#8fa3b8',
        }
      )
      .setOrigin(0.5, 1)
      .setDepth(120);
    this.touchPauseText = this.add
      .text(0, 0, 'PAUSE', {
        fontFamily: monoFont,
        fontSize: '10px',
        color: '#f7f3df',
      })
      .setOrigin(0.5)
      .setDepth(125)
      .setVisible(false);
    this.touchMuteText = this.add
      .text(0, 0, 'SOUND', {
        fontFamily: monoFont,
        fontSize: '10px',
        color: '#f7f3df',
      })
      .setOrigin(0.5)
      .setDepth(125)
      .setVisible(false);
    this.touchDriveText = this.add
      .text(0, 0, 'STEER', {
        fontFamily: monoFont,
        fontSize: '10px',
        color: '#2ef2e2',
      })
      .setOrigin(0.5)
      .setDepth(125)
      .setVisible(false);
    this.touchDriftText = this.add
      .text(0, 0, 'THROTTLE', {
        fontFamily: monoFont,
        fontSize: '10px',
        color: '#ffc928',
      })
      .setOrigin(0.5)
      .setDepth(125)
      .setVisible(false);
    this.announcementText = this.add
      .text(0, 0, '', {
        fontFamily: impactFont,
        fontSize: '54px',
        color: '#ffc928',
        stroke: '#080b12',
        strokeThickness: 9,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(130)
      .setVisible(false);

    this.keys = this.input.keyboard?.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
      upAlt: 'UP',
      downAlt: 'DOWN',
      leftAlt: 'LEFT',
      rightAlt: 'RIGHT',
      drift: 'SPACE',
      driftAlt: 'SHIFT',
    }) as ControlKeys;

    const hotkeyHandler = (event: KeyboardEvent): void => {
      if (event.repeat) return;
      if (event.code === 'KeyP') {
        this.togglePause();
      } else if (event.code === 'KeyM') {
        const muted = audio.toggleMute();
        this.popScreenText(muted ? 'SOUND OFF' : 'SOUND ON', '#8fa3b8');
      } else if (event.code === 'KeyF') {
        this.toggleFullscreen();
      } else if (event.code === 'Digit1' || event.code === 'Numpad1') {
        this.handleNumberChoice(0);
      } else if (event.code === 'Digit2' || event.code === 'Numpad2') {
        this.handleNumberChoice(1);
      } else if (event.code === 'Digit3' || event.code === 'Numpad3') {
        this.handleNumberChoice(2);
      } else if (event.code === 'KeyR' && this.mode === 'ended') {
        this.restartRun();
      } else if (
        event.code === 'KeyS' &&
        this.mode === 'ended' &&
        this.runSyncState === 'failed'
      ) {
        this.submitPendingRun();
      } else if (event.code === 'Enter' && this.mode === 'ended') {
        this.restartRun();
      }
    };
    window.addEventListener('keydown', hotkeyHandler);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) =>
      this.pointerDown(pointer)
    );
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) =>
      this.pointerMove(pointer)
    );
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) =>
      this.pointerUp(pointer)
    );
    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) =>
      this.pointerUp(pointer)
    );
    const resetTouchHandler = (): void => this.resetTouchInput();
    const resizeHandler = (): void => {
      this.resetTouchInput();
      this.layoutUi();
    };
    const visibilityHandler = (): void => {
      if (document.hidden) this.resetTouchInput();
    };
    this.input.on('gameout', resetTouchHandler);
    this.scale.on('resize', resizeHandler);
    window.addEventListener('blur', resetTouchHandler);
    window.addEventListener('resize', resetTouchHandler);
    window.addEventListener('orientationchange', resetTouchHandler);
    window.addEventListener('pointercancel', resetTouchHandler, {
      passive: true,
    });
    window.addEventListener('touchcancel', resetTouchHandler, {
      passive: true,
    });
    document.addEventListener('visibilitychange', visibilityHandler);
    this.events.once('shutdown', () => {
      this.runToken += 1;
      this.resetTouchInput();
      this.destroyVisualPools();
      window.removeEventListener('keydown', hotkeyHandler);
      window.removeEventListener('blur', resetTouchHandler);
      window.removeEventListener('resize', resetTouchHandler);
      window.removeEventListener('orientationchange', resetTouchHandler);
      window.removeEventListener('pointercancel', resetTouchHandler);
      window.removeEventListener('touchcancel', resetTouchHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
      this.scale.off('resize', resizeHandler);
      delete window.__ramageddonState;
      delete window.__ramageddonAdvance;
      delete window.__ramageddonQA;
      audio.stopEngine();
    });

    this.layoutUi();
    this.announce('LIGHTS OUT!\nWRECKS BECOME WEAPONS', 0.72);
    this.spawnOpeningPack();
    audio.ensure();

    window.__ramageddonState = () => this.textState();
    window.__ramageddonAdvance = (milliseconds: number) =>
      this.debugAdvance(milliseconds);
    if (
      ['127.0.0.1', 'localhost'].includes(window.location.hostname) &&
      new URLSearchParams(window.location.search).get('qa') === '1'
    ) {
      window.__ramageddonQA = {
        jumpToBoss: () => {
          this.qaGodMode = true;
          this.elapsed = 149.8;
          this.spawnTimer = 99;
        },
        showBossCharge: () => {
          for (const floating of this.floatTexts) floating.object.destroy();
          this.floatTexts = [];
          this.player.comboTimer = 0;
          let boss = this.enemies.find(
            (enemy) => enemy.kind === 'boss' && enemy.alive
          );
          if (!boss) {
            this.spawnEnemy('boss', 260);
            boss = this.enemies.find(
              (enemy) => enemy.kind === 'boss' && enemy.alive
            );
          }
          if (boss) {
            this.enemies = [boss];
            boss.x = clamp(
              this.player.x - 300,
              this.arenaInset() + boss.radius,
              WORLD_WIDTH - this.arenaInset() - boss.radius
            );
            boss.y = clamp(
              this.player.y + 36,
              this.arenaInset() + boss.radius,
              WORLD_HEIGHT - this.arenaInset() - boss.radius
            );
            boss.angle = Math.atan2(
              this.player.y - boss.y,
              this.player.x - boss.x
            );
            boss.chargeAngle = boss.angle;
            boss.vx = 0;
            boss.vy = 0;
            boss.chargeCooldown = 0.02;
            boss.chargeTelegraph = 0;
          }
          this.announcementTimer = 0;
          this.announcementText?.setText('').setVisible(false);
        },
        defeatBoss: () => {
          let boss = this.enemies.find(
            (enemy) => enemy.kind === 'boss' && enemy.alive
          );
          if (!boss) {
            this.spawnEnemy('boss', 260);
            boss = this.enemies.find(
              (enemy) => enemy.kind === 'boss' && enemy.alive
            );
          }
          for (const floating of this.floatTexts) floating.object.destroy();
          this.floatTexts = [];
          if (boss) {
            boss.hp = 1;
            this.damageEnemy(boss, 1, 'nail', this.player.angle, 520, 0);
          }
          this.elapsed = RUN_SECONDS;
        },
        totalPlayer: () => {
          this.qaGodMode = false;
          this.player.invulnerable = 0;
          this.damagePlayer(99_999, 1);
        },
      };
      Object.assign(window.__ramageddonQA, {
        showVehicleDamage: (tier = 1) => this.qaShowVehicleDamage(tier),
        primeBarrelChain: () => this.qaPrimeBarrelChain(),
        collectPersistentRepair: () => this.qaCollectPersistentRepair(),
      });
    }
  }

  private qaShowVehicleDamage(tier: number): void {
    const clampedTier = clamp(Math.round(tier), 0, 2);
    const ratio = clampedTier === 0 ? 0.9 : clampedTier === 1 ? 0.5 : 0.2;
    const gallery: ReadonlyArray<readonly [EnemyKind, number]> = [
      ['buggy', 3],
      ['buggy', 4],
      ['striker', 5],
      ['bruiser', 6],
      ['elite', 7],
      ['boss', 8],
    ];
    const offsets: ReadonlyArray<readonly [number, number]> = [
      [-250, -125],
      [-70, -125],
      [120, -125],
      [-235, 105],
      [-25, 105],
      [225, 105],
    ];
    this.mode = 'playing';
    this.qaGodMode = true;
    this.spawnTimer = 99;
    this.bossSpawned = true;
    this.enemies = [];
    this.wrecks = [];
    this.player.x = WORLD_WIDTH / 2;
    this.player.y = WORLD_HEIGHT / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.angle = 0;
    this.player.hp = this.player.maxHp * ratio;
    this.cameraX = this.player.x - this.scale.width / 2;
    this.cameraY = this.player.y - this.scale.height / 2;
    for (let index = 0; index < gallery.length; index += 1) {
      const [kind, visualRow] = gallery[index]!;
      this.spawnEnemy(kind, 320);
      const enemy = this.enemies[this.enemies.length - 1]!;
      const offset = offsets[index]!;
      enemy.visualRow = visualRow;
      enemy.x = this.player.x + offset[0];
      enemy.y = this.player.y + offset[1];
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.speed = 0;
      enemy.acceleration = 0;
      enemy.angle = 0;
      enemy.chargeCooldown = 99;
      enemy.hp = enemy.maxHp * ratio;
    }
    this.announcementTimer = 0;
    this.announcementText?.setVisible(false);
  }

  private qaPrimeBarrelChain(): void {
    this.mode = 'playing';
    this.qaGodMode = false;
    this.spawnTimer = 99;
    this.enemies = [];
    this.wrecks = [];
    this.blastVisuals = [];
    this.decorations = this.decorations.filter(
      (decoration) => decoration.kind !== 'barrel'
    );
    this.player.x = WORLD_WIDTH / 2;
    this.player.y = WORLD_HEIGHT / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.hp = this.player.maxHp;
    this.player.invulnerable = 0;
    this.hitStop = 0;
    this.cameraX = this.player.x - this.scale.width / 2;
    this.cameraY = this.player.y - this.scale.height / 2;
    const barrels = [70, 158, 246].map((offset) =>
      this.makeDecoration('barrel', this.player.x + offset, this.player.y, 0, 1)
    );
    this.decorations.push(...barrels);
    this.primeBarrel(barrels[0]!, 0);
    this.announcementTimer = 0;
    this.announcementText?.setVisible(false);
  }

  private qaCollectPersistentRepair(): void {
    const repair = this.pickups.find(
      (pickup) => pickup.kind === 'repair' && pickup.persistent
    );
    if (!repair) return;
    this.mode = 'playing';
    this.player.hp = Math.min(this.player.hp, this.player.maxHp - 20);
    this.player.x = repair.x;
    this.player.y = repair.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.cameraX = this.player.x - this.scale.width / 2;
    this.cameraY = this.player.y - this.scale.height / 2;
  }

  override update(_time: number, deltaMilliseconds: number): void {
    if (!this.manualStepping) {
      this.accumulator += Math.min(50, deltaMilliseconds) / 1000;
      while (this.accumulator >= FIXED_STEP) {
        this.step(FIXED_STEP);
        this.accumulator -= FIXED_STEP;
      }
    }
    this.renderFrame();
  }

  private resetRuntime(): void {
    this.destroyVisualPools();
    this.runToken += 1;
    const token = this.runToken;
    const runId = globalThis.crypto.randomUUID();
    this.runId = runId;
    this.runSessionPromise =
      this.meta.runtimeMode === 'practice'
        ? null
        : startRunSession({
            day: this.meta.day,
            seed: this.meta.seed,
            runId,
          }).then((session) => {
            if (token !== this.runToken || session?.runId === runId)
              return session;

            this.meta = { ...this.meta, runtimeMode: 'practice' };
            this.runSyncState = 'practice';
            if (this.mode === 'playing') {
              this.announce('PIT RADIO LOST\nPRACTICE — NO SYNC', 2.8);
            } else if (this.mode === 'ended') {
              this.buildResultsModal();
            }
            return null;
          });
    this.mode = 'playing';
    this.enemies = [];
    this.wrecks = [];
    this.pickups = [];
    this.projectiles = [];
    this.fires = [];
    this.particles = [];
    this.impactRings = [];
    this.skidMarks = [];
    this.decorations = [];
    this.blastVisuals = [];
    this.enemyGrid.clear();
    this.upgradeLevels = {
      ram: 0,
      saws: 0,
      nailgun: 0,
      exhaust: 0,
      engine: 0,
      magnet: 0,
      armor: 0,
      chain: 0,
      overdrive: 0,
      repair: 0,
    };
    const tierBonus = clamp(this.meta.community.tier, 0, 6);
    const crewHp = this.crew === 'iron' ? 20 : 0;
    const blueprintHp = this.meta.communityUpgrade === 'armor' ? 15 : 0;
    const maxHp = 100 + crewHp + blueprintHp + tierBonus * 2;
    this.player = {
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      hp: maxHp,
      maxHp,
      invulnerable: 0,
      level: 1,
      xp: 0,
      nextXp: 10,
      score: 0,
      scrap: 0,
      kills: 0,
      combo: 0,
      bestCombo: 0,
      bestWreckChain: 0,
      comboTimer: 0,
      heat: 0,
      overdriveTimer: 0,
      forwardSpeed: 0,
      drifting: false,
      driftIntensity: 0,
    };
    this.elapsed = 0;
    this.accumulator = 0;
    this.spawnTimer = 0.3;
    this.nextEnemyId = 1;
    this.nextWreckId = 1;
    this.nextDecorationId = 1;
    this.nextPickupId = 1;
    this.nextBlastId = 1;
    this.randomState = (this.meta.seed ^ 0x9e3779b9) >>> 0;
    this.cameraX = this.player.x - this.scale.width / 2;
    this.cameraY = this.player.y - this.scale.height / 2;
    this.cameraKickX = 0;
    this.cameraKickY = 0;
    this.trauma = 0;
    this.hitStop = 0;
    this.announcementTimer = 0;
    this.lastWaveIndex = -1;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.nailgunCooldown = 0;
    this.exhaustCooldown = 0;
    this.skidCooldown = 0;
    this.pickupSoundStep = 0;
    this.manualStepping = false;
    this.touchSteerPointerId = -1;
    this.touchShifterPointerId = -1;
    this.touchSteer = 0;
    this.touchThrottle = false;
    this.touchDrift = false;
    this.previousDrift = false;
    this.voteChoice = null;
    this.runSubmitted = false;
    this.runSyncState =
      this.meta.runtimeMode === 'practice' ? 'practice' : 'idle';
    this.voteSyncState = 'idle';
    this.pendingRun = null;
    this.baselineCommunityScrap = this.meta.community.scrap;
    this.baselineCrewScore = this.meta.community.crewScores[this.crew] ?? 0;
    this.communityScrapDelta = 0;
    this.crewScoreDelta = 0;
    this.hazardTimer = 5;
    this.environmentalBlast = false;
    this.qaGodMode = false;
    this.victory = false;
    this.upgradeChoices = [];
    this.modalTexts.forEach((text) => text.destroy());
    this.modalTexts = [];
    this.randomizeDecorations();
    this.createPersistentRepairCases();
  }

  private randomizeDecorations(): void {
    // Consume the original 150-sample budget so combat RNG remains bit-for-bit
    // aligned, while only retaining a clearer seventy arena details.
    for (let i = 0; i < 150; i += 1) {
      const roll = this.random();
      const xRoll = this.random();
      const yRoll = this.random();
      const rotation = this.random() * Math.PI * 2;
      const baseSize = 0.65 + this.random() * 0.9;
      const kind: Decoration['kind'] =
        roll < 0.38
          ? 'stain'
          : roll < 0.64
            ? 'crack'
            : roll < 0.78
              ? 'cone'
              : roll < 0.9
                ? 'tyre'
                : 'barrel';
      if (i >= 70) continue;

      const isFloorDetail = kind === 'stain' || kind === 'crack';
      const cluster = DECORATION_CLUSTERS[i % DECORATION_CLUSTERS.length]!;
      const clusterAngle = xRoll * Math.PI * 2;
      const clusterRadius = 36 + yRoll * 190;
      this.decorations.push(
        this.makeDecoration(
          kind,
          isFloorDetail
            ? clamp(
                cluster[0] + Math.cos(clusterAngle) * clusterRadius,
                90,
                WORLD_WIDTH - 90
              )
            : 90 + xRoll * (WORLD_WIDTH - 180),
          isFloorDetail
            ? clamp(
                cluster[1] + Math.sin(clusterAngle) * clusterRadius * 0.72,
                90,
                WORLD_HEIGHT - 90
              )
            : 90 + yRoll * (WORLD_HEIGHT - 180),
          rotation,
          isFloorDetail ? baseSize * 1.24 : baseSize
        )
      );
    }
    if (this.meta.challenge.arena.id === 'dead-mall') {
      const centerX = WORLD_WIDTH / 2;
      const centerY = WORLD_HEIGHT / 2;
      for (const offsetX of [-720, -360, 360, 720]) {
        for (const offsetY of [-420, 420]) {
          this.decorations.push(
            this.makeDecoration(
              'pillar',
              centerX + offsetX,
              centerY + offsetY,
              0,
              1
            )
          );
        }
      }
    }
  }

  private makeDecoration(
    kind: Decoration['kind'],
    x: number,
    y: number,
    rotation: number,
    size: number
  ): Decoration {
    const id = this.nextDecorationId++;
    const maxHp = kind === 'barrel' ? BARREL_HP : 0;
    return {
      id,
      x,
      y,
      kind,
      rotation,
      size,
      alive: true,
      hp: maxHp,
      maxHp,
      fuse: -1,
      visualFrame:
        kind === 'barrel' ? this.cosmeticHash(id, 0x4b1d5a77) % 4 : 0,
    };
  }

  private makePickup(
    kind: Pickup['kind'],
    x: number,
    y: number,
    vx: number,
    vy: number,
    value: number,
    persistent = false
  ): Pickup {
    const id = this.nextPickupId++;
    const positionHash =
      id ^ Math.imul(Math.round(x), 31) ^ Math.imul(Math.round(y), 131);
    return {
      id,
      x,
      y,
      vx,
      vy,
      value,
      kind,
      age: 0,
      persistent,
      visualFrame:
        kind === 'repair'
          ? REPAIR_FRAME_START +
            (this.cosmeticHash(positionHash, 0x63a9f12d) % 4)
          : 0,
    };
  }

  private createPersistentRepairCases(): void {
    const anchors: ReadonlyArray<readonly [number, number]> = [
      [0.18, 0.22],
      [0.82, 0.24],
      [0.22, 0.78],
      [0.78, 0.76],
      [0.5, 0.14],
      [0.5, 0.86],
    ];
    const start =
      this.cosmeticHash(this.meta.seed, 0x2fe86ca1) % anchors.length;
    for (let index = 0; index < 3; index += 1) {
      const anchor = anchors[(start + index * 2) % anchors.length]!;
      const value = 10 + (this.cosmeticHash(index + 1, 0x7d44a93b) % 3);
      this.pickups.push(
        this.makePickup(
          'repair',
          WORLD_WIDTH * anchor[0],
          WORLD_HEIGHT * anchor[1],
          0,
          0,
          value,
          true
        )
      );
    }
  }

  private cosmeticHash(value: number, salt: number): number {
    let hash = (value ^ this.meta.seed ^ salt) >>> 0;
    hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
    hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
    return (hash ^ (hash >>> 16)) >>> 0;
  }

  private destroyVisualPools(): void {
    this.playerVehicleImage?.destroy();
    this.playerVehicleImage = null;
    for (const pool of [
      this.enemyVehicleImages,
      this.wreckVehicleImages,
      this.barrelImages,
      this.repairImages,
      this.blastImages,
    ]) {
      for (const image of pool.values()) image.destroy();
      pool.clear();
    }
  }

  private createArenaLandmarks(): void {
    const fenceInset = this.arenaInset();
    this.arenaLandmarks = LANDMARK_DEFINITIONS.map((definition) => {
      const outsideFence = definition.size * 0.27;
      let worldX = definition.along;
      let worldY = definition.along;
      if (definition.edge === 'top') {
        worldY = fenceInset - outsideFence;
      } else if (definition.edge === 'right') {
        worldX = WORLD_WIDTH - fenceInset + outsideFence;
      } else if (definition.edge === 'bottom') {
        worldY = WORLD_HEIGHT - fenceInset + outsideFence;
      } else {
        worldX = fenceInset - outsideFence;
      }

      const object = this.add
        .image(0, 0, 'scrapyard-landmarks-v1', definition.frame)
        .setDisplaySize(definition.size, definition.size)
        .setRotation(definition.rotation)
        .setDepth(-10)
        .setAlpha(0.94);
      return {
        object,
        worldX,
        worldY,
        cullRadius: definition.size * 0.72,
      };
    });
  }

  private createArenaDecals(): void {
    const frames =
      ARENA_DECAL_FRAMES[this.meta.challenge.arena.id] ??
      ARENA_DECAL_FRAMES['thunder-dome']!;
    this.arenaDecals = DECAL_DEFINITIONS.map((definition, index) => {
      const frame = frames[index] ?? index % 4;
      const object = this.add
        .image(0, 0, 'arena-decals-v1', frame)
        .setDisplaySize(definition.size, definition.size)
        .setRotation(definition.rotation)
        .setDepth(-15)
        .setAlpha(0.82);
      return {
        object,
        worldX: definition.x,
        worldY: definition.y,
        cullRadius: definition.size * 0.72,
      };
    });
  }

  private renderArenaEnvironment(cameraX: number, cameraY: number): void {
    this.arenaFloor.tilePositionX = cameraX;
    this.arenaFloor.tilePositionY = cameraY;
    const width = this.scale.width;
    const height = this.scale.height;
    for (const decal of this.arenaDecals) {
      const x = decal.worldX - cameraX;
      const y = decal.worldY - cameraY;
      const margin = decal.cullRadius;
      decal.object
        .setPosition(x, y)
        .setVisible(
          x >= -margin &&
            x <= width + margin &&
            y >= -margin &&
            y <= height + margin
        );
    }
    for (const landmark of this.arenaLandmarks) {
      const x = landmark.worldX - cameraX;
      const y = landmark.worldY - cameraY;
      const margin = landmark.cullRadius;
      landmark.object
        .setPosition(x, y)
        .setVisible(
          x >= -margin &&
            x <= width + margin &&
            y >= -margin &&
            y <= height + margin
        );
    }
  }

  private random(): number {
    let value = (this.randomState += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }

  private step(dt: number): void {
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.updateParticles(dt * 0.25);
      this.updateBlastVisuals(dt * 0.25);
      return;
    }
    if (this.mode !== 'playing') return;

    this.elapsed += dt;
    this.announcementTimer = Math.max(0, this.announcementTimer - dt);
    this.updateWaveDirector(dt);
    const controls = this.readControls();
    this.updatePlayer(dt, controls);
    this.updateEnemies(dt);
    this.buildEnemyGrid();
    this.updateWeapons(dt);
    this.updateProjectiles(dt);
    this.updateWrecks(dt);
    this.updateFire(dt);
    this.resolveEnemySeparation();
    this.resolvePlayerCollisions();
    this.resolvePropCollisions();
    this.updateBarrels(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.updateBlastVisuals(dt);
    this.updateSkidMarks(dt);
    this.updateFloatTexts(dt);
    this.updateComboAndOverdrive(dt);
    this.updateCamera(dt);
    this.checkProgression();
    this.checkRunEnd();

    if (this.mode === 'playing') {
      const speedRatio =
        Math.hypot(this.player.vx, this.player.vy) / this.maxSpeed();
      audio.engine(
        speedRatio,
        controls.throttle,
        this.player.overdriveTimer > 0
      );
      audio.drift(this.player.driftIntensity, speedRatio);
    } else {
      audio.stopEngine();
    }
  }

  private readControls(): ControlState {
    const keyboardThrottle =
      (this.keys.up.isDown || this.keys.upAlt.isDown ? 1 : 0) -
      (this.keys.down.isDown || this.keys.downAlt.isDown ? 1 : 0);
    const keyboardSteer =
      (this.keys.right.isDown || this.keys.rightAlt.isDown ? 1 : 0) -
      (this.keys.left.isDown || this.keys.leftAlt.isDown ? 1 : 0);
    return {
      throttle: this.touchThrottle ? 1 : keyboardThrottle,
      steer: this.touchSteerPointerId >= 0 ? this.touchSteer : keyboardSteer,
      drift:
        this.touchDrift || this.keys.drift.isDown || this.keys.driftAlt.isDown,
    };
  }

  private maxSpeed(): number {
    const engine = this.upgradeLevels.engine;
    const blueprint = this.meta.communityUpgrade === 'nitro' ? 35 : 0;
    const overdrive = this.player.overdriveTimer > 0 ? 85 : 0;
    const redline = this.meta.modifier.id === 'redline' ? 65 : 0;
    const spillway = this.meta.challenge.arena.id === 'neon-spillway' ? 55 : 0;
    return (
      420 * (1 + engine * 0.13) + blueprint + overdrive + redline + spillway
    );
  }

  private arenaInset(): number {
    return this.meta.challenge.arena.id === 'boneyard-bowl' ? 170 : 42;
  }

  private dangerLevel(): number {
    const rawTime = clamp((this.elapsed - 18) / 132, 0, 1);
    const timeDanger = rawTime * rawTime * (3 - 2 * rawTime);
    const expectedKills = Math.max(1, this.elapsed * 0.27);
    const killPace = clamp(
      (this.player.kills - expectedKills) / (16 + this.elapsed * 0.09),
      0,
      1
    );
    const buildPace = clamp((this.player.level - 4) / 9, 0, 1);
    const performanceGate = clamp((this.elapsed - 18) / 42, 0, 1);
    return clamp(
      timeDanger * 0.78 +
        Math.max(killPace, buildPace) * performanceGate * 0.22,
      0,
      1
    );
  }

  private updatePlayer(dt: number, controls: ControlState): void {
    const player = this.player;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.overdriveTimer = Math.max(0, player.overdriveTimer - dt);
    const forwardX = Math.cos(player.angle);
    const forwardY = Math.sin(player.angle);
    const rightX = -forwardY;
    const rightY = forwardX;
    let forwardSpeed = player.vx * forwardX + player.vy * forwardY;
    let lateralSpeed = player.vx * rightX + player.vy * rightY;
    const engineLevel = this.upgradeLevels.engine;
    const crewPull =
      this.crew === 'neon' ? 1.03 : this.crew === 'iron' ? 0.97 : 1;
    const redlinePull = this.meta.modifier.id === 'redline' ? 1.28 : 1;
    const acceleration =
      660 * (1 + engineLevel * 0.11) * crewPull * redlinePull;

    if (controls.throttle > 0) {
      forwardSpeed += acceleration * controls.throttle * dt;
    } else if (controls.throttle < 0) {
      const brakeForce = this.meta.modifier.id === 'redline' ? 1.04 : 1.55;
      if (forwardSpeed > 35)
        forwardSpeed += acceleration * controls.throttle * brakeForce * dt;
      else forwardSpeed += acceleration * controls.throttle * 0.58 * dt;
    }

    const maximum = this.maxSpeed();
    forwardSpeed = clamp(forwardSpeed, -maximum * 0.34, maximum);
    const oilRain = this.meta.modifier.id === 'oil-rain';
    const grip = controls.drift
      ? oilRain
        ? 0.988
        : 0.974
      : oilRain
        ? 0.91
        : 0.82;
    lateralSpeed *= Math.pow(grip, dt * 60);
    const coast = this.meta.modifier.id === 'redline' ? 0.997 : 0.992;
    forwardSpeed *= Math.pow(controls.throttle === 0 ? coast : 0.998, dt * 60);
    const speedRatio = clamp(Math.abs(forwardSpeed) / 240, 0.18, 1.25);
    const highSpeed = clamp(
      (Math.abs(forwardSpeed) / Math.max(1, maximum) - 0.48) / 0.52,
      0,
      1
    );
    const reverseSign = forwardSpeed < -8 ? -1 : 1;
    const crewTurn = this.crew === 'neon' ? 1.18 : 1;
    const steeringTaper = controls.drift
      ? 1 + highSpeed * 0.08
      : lerp(1, 0.56, highSpeed);
    const turnRate =
      (controls.drift ? 3.55 : 2.72) * speedRatio * crewTurn * steeringTaper;
    player.angle += controls.steer * turnRate * reverseSign * dt;

    if (
      this.previousDrift &&
      !controls.drift &&
      Math.abs(lateralSpeed) > 70 &&
      Math.abs(forwardSpeed) > 170
    ) {
      const driftKick = clamp(Math.abs(lateralSpeed) * 0.34, 18, 70);
      forwardSpeed += driftKick;
      this.spawnBurst(
        player.x - forwardX * 24,
        player.y - forwardY * 24,
        0x2ef2e2,
        8,
        130
      );
      this.trauma = Math.max(this.trauma, 0.08);
    }
    this.previousDrift = controls.drift;
    player.drifting =
      controls.drift &&
      Math.abs(lateralSpeed) > 38 &&
      Math.abs(forwardSpeed) > 110;
    player.driftIntensity = player.drifting
      ? clamp((Math.abs(lateralSpeed) - 38) / 170, 0, 1)
      : 0;
    player.forwardSpeed = forwardSpeed;
    player.vx = forwardX * forwardSpeed + rightX * lateralSpeed;
    player.vy = forwardY * forwardSpeed + rightY * lateralSpeed;
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    const margin = this.arenaInset();
    if (player.x < margin || player.x > WORLD_WIDTH - margin) {
      player.x = clamp(player.x, margin, WORLD_WIDTH - margin);
      player.vx *= -0.46;
      this.damagePlayer(5, 0.25);
    }
    if (player.y < margin || player.y > WORLD_HEIGHT - margin) {
      player.y = clamp(player.y, margin, WORLD_HEIGHT - margin);
      player.vy *= -0.46;
      this.damagePlayer(5, 0.25);
    }

    this.skidCooldown -= dt;
    if (
      (player.drifting || Math.abs(controls.throttle) > 0.3) &&
      Math.abs(forwardSpeed) > 120 &&
      this.skidCooldown <= 0
    ) {
      this.addSkidMarks();
      this.skidCooldown = player.drifting ? 0.045 : 0.11;
    }
  }

  private updateWaveDirector(dt: number): void {
    const waveIndex = Math.min(5, Math.floor(this.elapsed / 30));
    if (waveIndex !== this.lastWaveIndex) {
      this.lastWaveIndex = waveIndex;
      const names = [
        'OPENING SCRAP',
        'HOT PURSUIT',
        'HEAVY METAL',
        'NO BRAKES',
        'THE CRUSH',
        'ROAD KING',
      ];
      if (waveIndex > 0) this.announce(names[waveIndex] ?? 'OVERTIME', 2.1);
    }
    if (!this.bossSpawned && this.elapsed >= 150) {
      this.bossSpawned = true;
      this.spawnEnemy('boss');
      this.announce('THE ROAD KING\nHAS ENTERED', 3);
    }
    this.spawnTimer -= dt;
    this.hazardTimer -= dt;
    if (this.meta.modifier.id === 'crusher-shift' && this.hazardTimer <= 0) {
      this.hazardTimer = 7.5;
      for (let index = 0; index < 3; index += 1) {
        const angle = this.random() * Math.PI * 2;
        const distance = 280 + this.random() * 260;
        this.decorations.push(
          this.makeDecoration(
            'barrel',
            clamp(
              this.player.x + Math.cos(angle) * distance,
              80,
              WORLD_WIDTH - 80
            ),
            clamp(
              this.player.y + Math.sin(angle) * distance,
              80,
              WORLD_HEIGHT - 80
            ),
            angle,
            1
          )
        );
      }
      this.popScreenText('CRUSHER SHIFT // HAZARDS RELOADED', '#ff6b35');
    }
    const density =
      (this.meta.modifier.id === 'magnet-storm' ? 1.12 : 1) *
      (this.meta.challenge.arena.id === 'thunder-dome' ? 1.08 : 1) *
      (this.meta.challenge.arena.id === 'furnace-eight' ? 1.05 : 1);
    const danger = this.dangerLevel();
    const interval =
      clamp((0.66 - this.elapsed * 0.0025) / (1 + danger * 0.48), 0.105, 0.66) /
      density;
    if (this.spawnTimer <= 0 && this.enemies.length < 165) {
      this.spawnTimer += interval;
      this.spawnEnemy();
      if (this.elapsed > 72 && this.random() < 0.12 + danger * 0.18)
        this.spawnEnemy(this.random() < danger * 0.32 ? 'striker' : 'buggy');
    }
    for (const eliteTime of [45, 82, 112, 137]) {
      if (Math.abs(this.elapsed - eliteTime) < dt * 0.6) {
        this.spawnEnemy('elite');
        if (eliteTime >= 112) this.spawnEnemy('striker');
        this.announce('CRUSHER INBOUND', 1.35);
      }
    }
  }

  private spawnOpeningPack(): void {
    for (let i = 0; i < 7; i += 1) this.spawnEnemy('buggy', 300 + i * 22);
  }

  private spawnEnemy(forcedKind?: EnemyKind, forcedDistance?: number): void {
    const roll = this.random();
    const progress = this.elapsed / RUN_SECONDS;
    const danger = this.dangerLevel();
    let kind: EnemyKind = forcedKind ?? 'buggy';
    if (!forcedKind) {
      const eliteChance = progress > 0.58 ? 0.014 + danger * 0.034 : 0;
      const bruiserChance = progress > 0.38 ? 0.07 + danger * 0.15 : 0;
      const strikerChance = progress > 0.16 ? 0.2 + danger * 0.2 : 0;
      if (roll < eliteChance) kind = 'elite';
      else if (roll < eliteChance + bruiserChance) kind = 'bruiser';
      else if (roll < eliteChance + bruiserChance + strikerChance)
        kind = 'striker';
      else kind = 'buggy';
    }
    const arenaId = this.meta.challenge.arena.id;
    const baseDistance =
      arenaId === 'boneyard-bowl'
        ? 430
        : arenaId === 'thunder-dome'
          ? 690
          : 590;
    const distance =
      forcedDistance ??
      Math.max(330, baseDistance - danger * 155 + this.random() * 150);
    let angle = this.random() * Math.PI * 2;
    if (arenaId === 'neon-spillway') {
      angle =
        (this.random() < 0.5 ? 0 : Math.PI) + (this.random() - 0.5) * 0.32;
    } else if (arenaId === 'furnace-eight') {
      angle =
        Math.floor(this.random() * 4) * (Math.PI / 2) +
        (this.random() - 0.5) * 0.22;
    }
    const inset = this.arenaInset() + 13;
    const x = clamp(
      this.player.x + Math.cos(angle) * distance,
      inset,
      WORLD_WIDTH - inset
    );
    const y = clamp(
      this.player.y + Math.sin(angle) * distance,
      inset,
      WORLD_HEIGHT - inset
    );
    const stats = this.enemyStats(kind);
    const enemyId = this.nextEnemyId++;
    this.enemies.push({
      id: enemyId,
      kind,
      visualRow: this.enemyVisualRow(kind, enemyId),
      x,
      y,
      vx: Math.cos(angle + Math.PI) * stats.speed * 0.4,
      vy: Math.sin(angle + Math.PI) * stats.speed * 0.4,
      angle: angle + Math.PI,
      radius: stats.radius,
      hp: stats.hp,
      maxHp: stats.hp,
      speed: stats.speed,
      acceleration: stats.acceleration,
      mass: stats.mass,
      score: stats.score,
      scrap: stats.scrap,
      contactCooldown: 0,
      sawCooldown: 0,
      fireCooldown: 0,
      flash: 0,
      phase: this.random() * Math.PI * 2,
      chargeCooldown: kind === 'boss' ? 2.2 : 0,
      chargeTelegraph: 0,
      chargeAngle: angle + Math.PI,
      alive: true,
    });
  }

  private enemyVisualRow(kind: EnemyKind, enemyId: number): number {
    if (kind === 'buggy')
      return 3 + (this.cosmeticHash(enemyId, 0xb8f34129) % 2);
    if (kind === 'striker') return 5;
    if (kind === 'bruiser') return 6;
    if (kind === 'elite') return 7;
    return 8;
  }

  private enemyStats(kind: EnemyKind): {
    radius: number;
    hp: number;
    speed: number;
    acceleration: number;
    mass: number;
    score: number;
    scrap: number;
  } {
    const danger = this.dangerLevel();
    const toughness =
      (1 + Math.min(0.75, this.elapsed / 260)) * (1 + danger * 0.12);
    const pursuitSpeed = 1 + danger * 0.31;
    const pursuitAcceleration = 1 + danger * 0.43;
    if (kind === 'striker')
      return {
        radius: 18,
        hp: 30 * toughness,
        speed: 205 * pursuitSpeed,
        acceleration: 270 * pursuitAcceleration,
        mass: 0.82,
        score: 115,
        scrap: 3,
      };
    if (kind === 'bruiser')
      return {
        radius: 29,
        hp: 126 * toughness,
        speed: 105 * pursuitSpeed,
        acceleration: 165 * pursuitAcceleration,
        mass: 1.85,
        score: 340,
        scrap: 7,
      };
    if (kind === 'elite')
      return {
        radius: 34,
        hp: 420 * toughness,
        speed: 128 * pursuitSpeed,
        acceleration: 190 * pursuitAcceleration,
        mass: 2.35,
        score: 1250,
        scrap: 18,
      };
    if (kind === 'boss')
      return {
        radius: 52,
        hp: 2600 * (1 + danger * 0.08),
        speed: 118 * (1 + danger * 0.16),
        acceleration: 170 * (1 + danger * 0.24),
        mass: 4.5,
        score: 8500,
        scrap: 70,
      };
    return {
      radius: 20,
      hp: 36 * toughness,
      speed: 142 * pursuitSpeed,
      acceleration: 225 * pursuitAcceleration,
      mass: 1,
      score: 90,
      scrap: 2,
    };
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.contactCooldown = Math.max(0, enemy.contactCooldown - dt);
      enemy.sawCooldown = Math.max(0, enemy.sawCooldown - dt);
      enemy.fireCooldown = Math.max(0, enemy.fireCooldown - dt);
      enemy.flash = Math.max(0, enemy.flash - dt);
      enemy.chargeCooldown -= dt;
      const telegraphBefore = enemy.chargeTelegraph;
      enemy.chargeTelegraph = Math.max(0, enemy.chargeTelegraph - dt);
      const targetX =
        this.player.x +
        this.player.vx * (enemy.kind === 'striker' ? 0.34 : 0.12);
      const targetY =
        this.player.y +
        this.player.vy * (enemy.kind === 'striker' ? 0.34 : 0.12);
      let targetAngle = Math.atan2(targetY - enemy.y, targetX - enemy.x);
      if (enemy.kind === 'striker')
        targetAngle += Math.sin(this.elapsed * 1.7 + enemy.phase) * 0.46;
      if (enemy.kind === 'buggy')
        targetAngle += Math.sin(this.elapsed * 0.9 + enemy.phase) * 0.12;
      const charging = enemy.kind === 'boss' && enemy.chargeCooldown > 3;
      const steeringLocked =
        enemy.kind === 'boss' && (telegraphBefore > 0 || charging);
      if (steeringLocked) targetAngle = enemy.chargeAngle;
      const turn =
        enemy.kind === 'boss'
          ? steeringLocked
            ? 0
            : 1.05
          : enemy.kind === 'bruiser'
            ? 1.38
            : 2.35;
      enemy.angle += clamp(
        angleDifference(targetAngle, enemy.angle),
        -turn * dt,
        turn * dt
      );

      if (
        enemy.kind === 'boss' &&
        telegraphBefore > 0 &&
        enemy.chargeTelegraph <= 0
      ) {
        enemy.angle = enemy.chargeAngle;
        enemy.vx = Math.cos(enemy.chargeAngle) * 650;
        enemy.vy = Math.sin(enemy.chargeAngle) * 650;
        enemy.chargeCooldown = 3.8;
        this.spawnBurst(enemy.x, enemy.y, 0xf15bb5, 30, 310);
        this.kickCamera(enemy.chargeAngle, 0.48);
        this.heavyFeedback(0.48);
      } else if (
        enemy.kind === 'boss' &&
        enemy.chargeCooldown <= 0 &&
        enemy.chargeTelegraph <= 0
      ) {
        enemy.chargeAngle = Math.atan2(
          this.player.y - enemy.y,
          this.player.x - enemy.x
        );
        enemy.angle = enemy.chargeAngle;
        enemy.chargeTelegraph = 0.72;
        enemy.vx *= 0.56;
        enemy.vy *= 0.56;
        this.spawnBurst(enemy.x, enemy.y, 0xffc928, 10, 90);
        this.popWorldText(
          "KING'S CHARGE!",
          enemy.x,
          enemy.y - enemy.radius - 28,
          '#ffc928',
          27
        );
      }

      const throttle =
        enemy.kind === 'boss' && enemy.chargeTelegraph > 0 ? 0.08 : 1;
      enemy.vx += Math.cos(enemy.angle) * enemy.acceleration * throttle * dt;
      enemy.vy += Math.sin(enemy.angle) * enemy.acceleration * throttle * dt;
      const speed = Math.hypot(enemy.vx, enemy.vy);
      const maximum =
        enemy.speed *
        (enemy.kind === 'boss' && enemy.chargeCooldown > 3 ? 5.2 : 1);
      if (speed > maximum) {
        enemy.vx = (enemy.vx / speed) * maximum;
        enemy.vy = (enemy.vy / speed) * maximum;
      }
      enemy.vx *= Math.pow(0.996, dt * 60);
      enemy.vy *= Math.pow(0.996, dt * 60);
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      const inset = this.arenaInset() + enemy.radius;
      if (enemy.x < inset || enemy.x > WORLD_WIDTH - inset) enemy.vx *= -0.65;
      if (enemy.y < inset || enemy.y > WORLD_HEIGHT - inset) enemy.vy *= -0.65;
      enemy.x = clamp(enemy.x, inset, WORLD_WIDTH - inset);
      enemy.y = clamp(enemy.y, inset, WORLD_HEIGHT - inset);
    }
  }

  private buildEnemyGrid(): void {
    this.enemyGrid.clear();
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const key = this.gridKey(enemy.x, enemy.y);
      const bucket = this.enemyGrid.get(key);
      if (bucket) bucket.push(enemy);
      else this.enemyGrid.set(key, [enemy]);
    }
  }

  private gridKey(x: number, y: number): string {
    return `${Math.floor(x / GRID_SIZE)},${Math.floor(y / GRID_SIZE)}`;
  }

  private nearbyEnemies(x: number, y: number, radius = GRID_SIZE): Enemy[] {
    const result: Enemy[] = [];
    const cellRadius = Math.max(1, Math.ceil(radius / GRID_SIZE));
    const centerX = Math.floor(x / GRID_SIZE);
    const centerY = Math.floor(y / GRID_SIZE);
    for (let offsetY = -cellRadius; offsetY <= cellRadius; offsetY += 1) {
      for (let offsetX = -cellRadius; offsetX <= cellRadius; offsetX += 1) {
        const bucket = this.enemyGrid.get(
          `${centerX + offsetX},${centerY + offsetY}`
        );
        if (bucket) result.push(...bucket);
      }
    }
    return result;
  }

  private resolveEnemySeparation(): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      for (const other of this.nearbyEnemies(enemy.x, enemy.y)) {
        if (!other.alive || other.id <= enemy.id) continue;
        const dx = other.x - enemy.x;
        const dy = other.y - enemy.y;
        const minimum = (enemy.radius + other.radius) * 0.78;
        const distSq = dx * dx + dy * dy;
        if (distSq <= 0.01 || distSq >= minimum * minimum) continue;
        const distance = Math.sqrt(distSq);
        const overlap = (minimum - distance) * 0.46;
        const nx = dx / distance;
        const ny = dy / distance;
        enemy.x -= nx * overlap;
        enemy.y -= ny * overlap;
        other.x += nx * overlap;
        other.y += ny * overlap;
      }
    }
  }

  private updateWeapons(dt: number): void {
    const nailgun = this.upgradeLevels.nailgun;
    this.nailgunCooldown -= dt;
    if (nailgun > 0 && this.nailgunCooldown <= 0) {
      let target: Enemy | null = null;
      let bestDistance = 560 * 560;
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const distSq = distanceSquared(
          this.player.x,
          this.player.y,
          enemy.x,
          enemy.y
        );
        if (distSq < bestDistance) {
          target = enemy;
          bestDistance = distSq;
        }
      }
      if (target) {
        const angle = Math.atan2(
          target.y - this.player.y,
          target.x - this.player.x
        );
        const spread = (this.random() - 0.5) * 0.05;
        this.projectiles.push({
          x: this.player.x + Math.cos(angle) * 25,
          y: this.player.y + Math.sin(angle) * 25,
          vx: Math.cos(angle + spread) * 760 + this.player.vx * 0.3,
          vy: Math.sin(angle + spread) * 760 + this.player.vy * 0.3,
          life: 0.85,
          damage: 13 + nailgun * 7,
        });
        this.nailgunCooldown = Math.max(0.16, 0.54 - nailgun * 0.075);
        audio.shot();
      }
    }

    const sawLevel = this.upgradeLevels.saws;
    if (sawLevel > 0) {
      const count = 2 + sawLevel;
      const orbit = 46 + sawLevel * 4;
      for (let index = 0; index < count; index += 1) {
        const angle =
          this.elapsed * (2.35 + sawLevel * 0.1) +
          (index / count) * Math.PI * 2;
        const sawX = this.player.x + Math.cos(angle) * orbit;
        const sawY = this.player.y + Math.sin(angle) * orbit;
        for (const enemy of this.nearbyEnemies(sawX, sawY)) {
          if (!enemy.alive || enemy.sawCooldown > 0) continue;
          const radius = enemy.radius + 13;
          if (distanceSquared(sawX, sawY, enemy.x, enemy.y) < radius * radius) {
            enemy.sawCooldown = 0.24;
            this.damageEnemy(enemy, 14 + sawLevel * 8, 'saw', angle, 60, 0);
            this.spawnBurst(sawX, sawY, 0xf7f3df, 4, 95);
          }
        }
      }
    }

    const exhaust = this.upgradeLevels.exhaust;
    this.exhaustCooldown -= dt;
    if (
      (exhaust > 0 && this.player.drifting && this.exhaustCooldown <= 0) ||
      (this.player.overdriveTimer > 0 && this.exhaustCooldown <= 0)
    ) {
      const backX = this.player.x - Math.cos(this.player.angle) * 28;
      const backY = this.player.y - Math.sin(this.player.angle) * 28;
      this.fires.push({
        x: backX,
        y: backY,
        life: 1.6 + exhaust * 0.28,
        radius: 18 + exhaust * 3,
      });
      this.exhaustCooldown = 0.12;
    }
  }

  private updateProjectiles(dt: number): void {
    for (const projectile of this.projectiles) {
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.life -= dt;
      for (const enemy of this.nearbyEnemies(projectile.x, projectile.y)) {
        if (!enemy.alive) continue;
        const radius = enemy.radius + 4;
        if (
          distanceSquared(projectile.x, projectile.y, enemy.x, enemy.y) <
          radius * radius
        ) {
          const angle = Math.atan2(projectile.vy, projectile.vx);
          this.damageEnemy(enemy, projectile.damage, 'nail', angle, 75, 0);
          this.spawnBurst(projectile.x, projectile.y, 0x2ef2e2, 3, 80);
          projectile.life = 0;
          break;
        }
      }
      if (projectile.life <= 0) continue;
      for (const prop of this.decorations) {
        if (!prop.alive || prop.kind !== 'barrel' || prop.fuse >= 0) continue;
        if (
          distanceSquared(projectile.x, projectile.y, prop.x, prop.y) >=
          (BARREL_RADIUS + 4) ** 2
        )
          continue;
        this.damageBarrel(prop, projectile.damage, 0.02);
        this.spawnBurst(projectile.x, projectile.y, 0x2ef2e2, 3, 80);
        projectile.life = 0;
        break;
      }
    }
    this.projectiles = this.projectiles.filter(
      (projectile) =>
        projectile.life > 0 &&
        projectile.x > 0 &&
        projectile.x < WORLD_WIDTH &&
        projectile.y > 0 &&
        projectile.y < WORLD_HEIGHT
    );
  }

  private updateWrecks(dt: number): void {
    for (const wreck of this.wrecks) {
      wreck.life -= dt;
      wreck.x += wreck.vx * dt;
      wreck.y += wreck.vy * dt;
      wreck.angle += wreck.spin * dt;
      wreck.vx *= Math.pow(wreck.hot ? 0.985 : 0.94, dt * 60);
      wreck.vy *= Math.pow(wreck.hot ? 0.985 : 0.94, dt * 60);
      wreck.spin *= Math.pow(0.992, dt * 60);
      wreck.trailTimer -= dt;
      const inset = this.arenaInset() + wreck.radius;
      if (wreck.x < inset || wreck.x > WORLD_WIDTH - inset) wreck.vx *= -0.52;
      if (wreck.y < inset || wreck.y > WORLD_HEIGHT - inset) wreck.vy *= -0.52;
      wreck.x = clamp(wreck.x, inset, WORLD_WIDTH - inset);
      wreck.y = clamp(wreck.y, inset, WORLD_HEIGHT - inset);
      const speed = Math.hypot(wreck.vx, wreck.vy);
      if (wreck.hot && speed > 105 && wreck.trailTimer <= 0) {
        const travelAngle = Math.atan2(wreck.vy, wreck.vx);
        const smokeLife = 0.48 + this.random() * 0.36;
        this.particles.push({
          x: wreck.x - Math.cos(travelAngle) * wreck.radius * 0.65,
          y: wreck.y - Math.sin(travelAngle) * wreck.radius * 0.65,
          vx: -wreck.vx * 0.07 + (this.random() - 0.5) * 28,
          vy: -wreck.vy * 0.07 + (this.random() - 0.5) * 28,
          life: smokeLife,
          maxLife: smokeLife,
          color: wreck.chain > 0 ? 0x6a3557 : 0x424954,
          size: 7 + this.random() * 7,
          drag: 0.972,
          gravity: -18,
          kind: 'smoke',
        });
        if (this.random() < 0.56) {
          const sparkLife = 0.15 + this.random() * 0.18;
          this.particles.push({
            x: wreck.x,
            y: wreck.y,
            vx:
              -Math.cos(travelAngle) * (40 + this.random() * 90) +
              (this.random() - 0.5) * 45,
            vy:
              -Math.sin(travelAngle) * (40 + this.random() * 90) +
              (this.random() - 0.5) * 45,
            life: sparkLife,
            maxLife: sparkLife,
            color: 0xffc928,
            size: 2 + this.random() * 2,
            drag: 0.95,
            gravity: 35,
            kind: 'spark',
          });
        }
        wreck.trailTimer = 0.055 + this.random() * 0.045;
      }
      if (!wreck.hot || speed < 95) continue;
      for (const enemy of this.nearbyEnemies(
        wreck.x,
        wreck.y,
        wreck.radius + 42
      )) {
        if (!enemy.alive || wreck.hitIds.has(enemy.id)) continue;
        const radius = wreck.radius + enemy.radius;
        if (
          distanceSquared(wreck.x, wreck.y, enemy.x, enemy.y) >=
          radius * radius
        )
          continue;
        wreck.hitIds.add(enemy.id);
        const impactAngle = Math.atan2(wreck.vy, wreck.vx);
        const damage = (28 + speed * 0.18) * wreck.power;
        this.damageEnemy(
          enemy,
          damage,
          'wreck',
          impactAngle,
          speed * 0.76,
          wreck.chain + 1
        );
        enemy.vx += (Math.cos(impactAngle) * speed * 0.42) / enemy.mass;
        enemy.vy += (Math.sin(impactAngle) * speed * 0.42) / enemy.mass;
        wreck.vx *= 0.72;
        wreck.vy *= 0.72;
        this.heavyFeedback(clamp(speed / 620, 0.25, 0.82));
        if (this.meta.modifier.id.includes('volatile') && wreck.chain >= 2) {
          this.explode(wreck.x, wreck.y, 115, 34 + wreck.chain * 7);
          wreck.life = Math.min(wreck.life, 0.08);
        }
      }
      for (const prop of this.decorations) {
        if (!prop.alive || prop.kind !== 'barrel' || prop.fuse >= 0) continue;
        const radius = wreck.radius + BARREL_RADIUS;
        if (
          distanceSquared(wreck.x, wreck.y, prop.x, prop.y) >=
          radius * radius
        )
          continue;
        this.damageBarrel(prop, 18 + speed * 0.07, 0.025);
        wreck.vx *= 0.82;
        wreck.vy *= 0.82;
      }
    }
    this.wrecks = this.wrecks.filter((wreck) => wreck.life > 0).slice(-140);
  }

  private updateFire(dt: number): void {
    for (const fire of this.fires) {
      fire.life -= dt;
      for (const enemy of this.nearbyEnemies(
        fire.x,
        fire.y,
        fire.radius + 35
      )) {
        if (!enemy.alive || enemy.fireCooldown > 0) continue;
        const radius = fire.radius + enemy.radius;
        if (
          distanceSquared(fire.x, fire.y, enemy.x, enemy.y) <
          radius * radius
        ) {
          enemy.fireCooldown = 0.28;
          this.damageEnemy(
            enemy,
            7 + this.upgradeLevels.exhaust * 5,
            'fire',
            0,
            15,
            0
          );
        }
      }
      for (const prop of this.decorations) {
        if (!prop.alive || prop.kind !== 'barrel' || prop.fuse >= 0) continue;
        const radius = fire.radius + BARREL_RADIUS;
        if (distanceSquared(fire.x, fire.y, prop.x, prop.y) >= radius * radius)
          continue;
        this.damageBarrel(prop, BARREL_HP, 0.12);
      }
    }
    this.fires = this.fires.filter((fire) => fire.life > 0);
  }

  private resolvePlayerCollisions(): void {
    const player = this.player;
    const forwardX = Math.cos(player.angle);
    const forwardY = Math.sin(player.angle);
    for (const enemy of this.nearbyEnemies(player.x, player.y, 80)) {
      if (!enemy.alive) continue;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const minimum = 23 + enemy.radius;
      const distSq = dx * dx + dy * dy;
      if (distSq <= 0.001 || distSq >= minimum * minimum) continue;
      const distance = Math.sqrt(distSq);
      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = minimum - distance;
      player.x -= nx * overlap * 0.34;
      player.y -= ny * overlap * 0.34;
      enemy.x += nx * overlap * 0.66;
      enemy.y += ny * overlap * 0.66;
      if (enemy.contactCooldown > 0) continue;

      const relativeX = player.vx - enemy.vx;
      const relativeY = player.vy - enemy.vy;
      const closing = Math.max(0, relativeX * nx + relativeY * ny);
      const playerAttack = player.vx * nx + player.vy * ny;
      const enemyAttack = -(enemy.vx * nx + enemy.vy * ny);
      const frontal = Math.max(0, forwardX * nx + forwardY * ny);
      const ramLevel = this.upgradeLevels.ram;
      const forwardContact = dx * forwardX + dy * forwardY;
      const lateralContact = Math.abs(dx * -forwardY + dy * forwardX);
      const noseHit =
        frontal > 0.72 &&
        forwardContact > distance * 0.7 &&
        lateralContact < 14 + enemy.radius * 0.58 + ramLevel * 1.5;
      const attacking =
        noseHit &&
        playerAttack > Math.max(74, enemyAttack * 0.82) &&
        closing > 64;
      const danger = this.dangerLevel();
      enemy.contactCooldown = lerp(0.18, 0.135, danger);

      if (attacking) {
        const crewRam = this.crew === 'iron' ? 1.15 : 1;
        const overdrive = player.overdriveTimer > 0 ? 1.65 : 1;
        const damage =
          Math.max(
            5,
            closing * (0.18 + ramLevel * 0.071) * (0.52 + frontal * 0.72)
          ) *
          crewRam *
          overdrive;
        const launch = closing * (0.88 + ramLevel * 0.08);
        this.damageEnemy(enemy, damage, 'ram', Math.atan2(ny, nx), launch, 0);
        enemy.vx += (nx * launch) / enemy.mass;
        enemy.vy += (ny * launch) / enemy.mass;
        player.vx -= nx * closing * 0.13 * enemy.mass;
        player.vy -= ny * closing * 0.13 * enemy.mass;
        this.spawnCrashFx(
          player.x + forwardX * 24,
          player.y + forwardY * 24,
          Math.atan2(ny, nx),
          clamp(closing / 520, 0.22, 0.92),
          enemy.kind === 'elite' || enemy.kind === 'boss' ? 0xf15bb5 : 0xffc928
        );
        this.heavyFeedback(clamp(closing / 500, 0.12, 1));
        audio.impact(clamp(closing / 500, 0.15, 1));
      } else if (closing > 28 || enemyAttack > 55) {
        const armorReduction = 1 - this.upgradeLevels.armor * 0.09;
        const contactMass = enemy.mass * (enemy.kind === 'boss' ? 0.68 : 1);
        const damage =
          Math.max(
            2,
            (closing * 0.032 + enemyAttack * 0.022) *
              contactMass *
              armorReduction
          ) *
          (1 + danger * 0.3);
        const impactStrength = clamp((closing + enemyAttack) / 620, 0.18, 0.78);
        this.spawnCrashFx(
          player.x + nx * 20,
          player.y + ny * 20,
          Math.atan2(-ny, -nx),
          impactStrength,
          0xff365e
        );
        this.damagePlayer(
          damage,
          clamp((closing + enemyAttack) / 520, 0.16, 0.75)
        );
        player.vx -= nx * (closing + enemyAttack) * 0.2;
        player.vy -= ny * (closing + enemyAttack) * 0.2;
        enemy.vx += nx * closing * 0.18;
        enemy.vy += ny * closing * 0.18;
      }
    }
  }

  private resolvePropCollisions(): void {
    const speed = Math.hypot(this.player.vx, this.player.vy);
    if (speed < 70) return;
    for (const prop of this.decorations) {
      if (
        !prop.alive ||
        (prop.kind !== 'barrel' &&
          prop.kind !== 'cone' &&
          prop.kind !== 'tyre' &&
          prop.kind !== 'pillar')
      )
        continue;
      const radius =
        prop.kind === 'pillar' ? 34 : prop.kind === 'barrel' ? 19 : 13;
      if (
        distanceSquared(this.player.x, this.player.y, prop.x, prop.y) >
        (radius + 22) ** 2
      )
        continue;
      if (prop.kind === 'pillar') {
        const dx = this.player.x - prop.x;
        const dy = this.player.y - prop.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const nx = dx / distance;
        const ny = dy / distance;
        this.player.x = prop.x + nx * (radius + 24);
        this.player.y = prop.y + ny * (radius + 24);
        const closing = this.player.vx * nx + this.player.vy * ny;
        this.player.vx -= nx * closing * 1.55;
        this.player.vy -= ny * closing * 1.55;
        this.damagePlayer(4, 0.25);
        continue;
      }
      if (prop.kind === 'barrel') {
        this.damageBarrel(prop, BARREL_HP, 0);
      } else {
        prop.alive = false;
        this.spawnBurst(
          prop.x,
          prop.y,
          prop.kind === 'cone' ? 0xff8a3d : 0x333943,
          6,
          145
        );
        this.player.score += 10;
      }
    }
  }

  private damageBarrel(
    barrel: Decoration,
    amount: number,
    fuseDelay: number
  ): void {
    if (!barrel.alive || barrel.kind !== 'barrel' || barrel.fuse >= 0) return;
    barrel.hp = Math.max(0, barrel.hp - Math.max(0, amount));
    if (barrel.hp <= 0) this.primeBarrel(barrel, fuseDelay);
  }

  private primeBarrel(barrel: Decoration, fuseDelay: number): void {
    if (!barrel.alive || barrel.kind !== 'barrel' || barrel.fuse >= 0) return;
    barrel.fuse = Math.max(0, fuseDelay);
  }

  private updateBarrels(dt: number): void {
    const due: Decoration[] = [];
    for (const prop of this.decorations) {
      if (!prop.alive || prop.kind !== 'barrel' || prop.fuse < 0) continue;
      prop.fuse -= dt;
      if (prop.fuse <= 0) due.push(prop);
    }
    for (const barrel of due) this.detonateBarrel(barrel);
  }

  private detonateBarrel(barrel: Decoration): void {
    if (!barrel.alive || barrel.kind !== 'barrel') return;
    barrel.alive = false;
    barrel.fuse = -1;
    this.player.score += 80;
    this.explode(barrel.x, barrel.y, 125, 48, {
      environmental: true,
      hurtsPlayer: true,
      chainsBarrels: true,
    });
  }

  private explode(
    x: number,
    y: number,
    radius: number,
    damage: number,
    options: ExplosionOptions = {}
  ): void {
    this.blastVisuals.push({
      id: this.nextBlastId++,
      x,
      y,
      radius,
      life: 0.44,
      maxLife: 0.44,
    });
    this.spawnBurst(x, y, 0xff6b35, 24, 260);
    this.spawnBurst(x, y, 0xffc928, 14, 190);
    this.spawnCrashFx(x, y, this.random() * Math.PI * 2, 0.9, 0xff6b35, true);
    const previousEnvironmental = this.environmentalBlast;
    this.environmentalBlast = options.environmental ?? false;
    try {
      for (const enemy of this.nearbyEnemies(x, y, radius)) {
        if (!enemy.alive) continue;
        const distSq = distanceSquared(x, y, enemy.x, enemy.y);
        if (distSq > radius * radius) continue;
        const angle = Math.atan2(enemy.y - y, enemy.x - x);
        this.damageEnemy(
          enemy,
          damage * (1 - (Math.sqrt(distSq) / radius) * 0.45),
          'explosion',
          angle,
          170,
          0
        );
        enemy.vx += (Math.cos(angle) * 150) / enemy.mass;
        enemy.vy += (Math.sin(angle) * 150) / enemy.mass;
      }
    } finally {
      this.environmentalBlast = previousEnvironmental;
    }

    if (options.chainsBarrels ?? true) {
      for (const prop of this.decorations) {
        if (!prop.alive || prop.kind !== 'barrel' || prop.fuse >= 0) continue;
        const distance = Math.sqrt(distanceSquared(x, y, prop.x, prop.y));
        if (distance > radius + BARREL_RADIUS) continue;
        const falloff = 1 - clamp(distance / radius, 0, 1) * 0.45;
        const delay =
          0.045 + (this.cosmeticHash(prop.id, 0x521c7ab3) % 4) * 0.028;
        this.damageBarrel(prop, damage * falloff, delay);
      }
    }

    if (options.hurtsPlayer) {
      const dx = this.player.x - x;
      const dy = this.player.y - y;
      const distance = Math.hypot(dx, dy);
      if (distance < radius + 22) {
        const falloff = 1 - clamp(distance / radius, 0, 1) * 0.72;
        const playerDamageMultiplier =
          this.meta.modifier.id === 'thin-metal' ? 1.35 : 1;
        this.damagePlayer(
          (damage * 0.22 * falloff) / playerDamageMultiplier,
          0.48
        );
        const angle = distance > 0.1 ? Math.atan2(dy, dx) : this.player.angle;
        const knockback = 180 * falloff;
        this.player.vx += Math.cos(angle) * knockback;
        this.player.vy += Math.sin(angle) * knockback;
      }
    }
    this.heavyFeedback(0.7);
    audio.impact(0.9);
  }

  private updateBlastVisuals(dt: number): void {
    for (const blast of this.blastVisuals) blast.life -= dt;
    this.blastVisuals = this.blastVisuals
      .filter((blast) => blast.life > 0)
      .slice(-48);
  }

  private damageEnemy(
    enemy: Enemy,
    amount: number,
    source: 'ram' | 'wreck' | 'saw' | 'nail' | 'fire' | 'explosion',
    impactAngle: number,
    launchSpeed: number,
    chain: number
  ): void {
    if (!enemy.alive) return;
    const thinMetal = this.meta.modifier.id === 'thin-metal' ? 1.28 : 1;
    const furnaceKillbox =
      this.meta.challenge.arena.id === 'furnace-eight' &&
      Math.hypot(enemy.x - WORLD_WIDTH / 2, enemy.y - WORLD_HEIGHT / 2) < 430
        ? 1.22
        : 1;
    const actualDamage = amount * thinMetal * furnaceKillbox;
    enemy.hp -= actualDamage;
    enemy.flash = 0.075;
    const shouldShowDamage =
      source === 'wreck'
        ? chain <= 1 || chain % 6 === 0
        : amount >= 28 || source === 'ram';
    if (shouldShowDamage) {
      this.popWorldText(
        `${Math.round(actualDamage)}`,
        enemy.x,
        enemy.y - enemy.radius,
        source === 'wreck' ? '#f15bb5' : '#f7f3df',
        19
      );
    }
    if (enemy.hp <= 0)
      this.wreckEnemy(enemy, impactAngle, launchSpeed, chain, source);
  }

  private wreckEnemy(
    enemy: Enemy,
    impactAngle: number,
    launchSpeed: number,
    chain: number,
    source: 'ram' | 'wreck' | 'saw' | 'nail' | 'fire' | 'explosion'
  ): void {
    if (!enemy.alive) return;
    enemy.alive = false;
    const player = this.player;
    player.kills += 1;
    player.combo = player.comboTimer > 0 ? player.combo + 1 : 1;
    player.bestCombo = Math.max(player.bestCombo, player.combo);
    if (source === 'wreck' && chain > 0) {
      player.bestWreckChain = Math.max(player.bestWreckChain, chain + 1);
    }
    player.comboTimer =
      2.25 +
      this.upgradeLevels.overdrive * 0.34 +
      (this.crew === 'neon' ? 0.55 : 0);
    const comboMultiplier =
      1 + Math.min(3.2, Math.max(0, player.combo - 1) * 0.11);
    const oilDriftBonus =
      this.meta.modifier.id === 'oil-rain' &&
      source === 'ram' &&
      player.drifting
        ? 1.6
        : 1;
    player.score += Math.round(
      enemy.score *
        comboMultiplier *
        (chain > 0 ? 1 + chain * 0.22 : 1) *
        oilDriftBonus
    );
    player.heat = Math.min(
      100,
      player.heat + 9 + chain * 5 + this.upgradeLevels.overdrive * 1.5
    );

    const crewWreck = this.crew === 'rust' ? 1.28 : 1;
    const dailyWreck =
      this.meta.challenge.arena.id === 'thunder-dome' ? 1.22 : 1;
    const chainPower =
      (1 + this.upgradeLevels.chain * 0.24) * crewWreck * dailyWreck;
    const isHot =
      source === 'ram' || source === 'wreck' || source === 'explosion';
    const actualLaunch = isHot
      ? Math.max(150, launchSpeed * chainPower)
      : Math.max(45, launchSpeed * 0.45);
    const color =
      enemy.kind === 'boss' || enemy.kind === 'elite'
        ? 0xf15bb5
        : enemy.kind === 'bruiser'
          ? 0x8f3f32
          : 0x6d302b;
    const wreckLife =
      1.15 +
      this.upgradeLevels.chain * 0.17 +
      (enemy.kind === 'boss' ? 1.6 : 0) +
      (enemy.kind === 'elite' ? 0.3 : 0) +
      (this.meta.challenge.arena.id === 'thunder-dome' ? 0.32 : 0);
    this.wrecks.push({
      id: this.nextWreckId++,
      visualRow: enemy.visualRow,
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(impactAngle) * actualLaunch + enemy.vx * 0.3,
      vy: Math.sin(impactAngle) * actualLaunch + enemy.vy * 0.3,
      angle: enemy.angle,
      spin: (this.random() < 0.5 ? -1 : 1) * (4.5 + this.random() * 7),
      radius: enemy.radius * 0.86,
      life: wreckLife,
      maxLife: wreckLife,
      hot: isHot,
      chain,
      power: 1 + this.upgradeLevels.chain * 0.18,
      color,
      trailTimer: 0,
      hitIds: new Set<number>(),
    });
    this.spawnCrashFx(
      enemy.x,
      enemy.y,
      impactAngle,
      clamp(
        actualLaunch / 720 + enemy.mass * 0.055 + Math.min(0.2, chain * 0.025),
        0.38,
        1
      ),
      enemy.kind === 'elite' || enemy.kind === 'boss' ? 0xf15bb5 : 0xffc928,
      true
    );

    const pickupCount =
      enemy.kind === 'boss'
        ? 12
        : enemy.kind === 'elite'
          ? 5
          : enemy.kind === 'bruiser'
            ? 3
            : 1;
    for (let index = 0; index < pickupCount; index += 1) {
      const angle = this.random() * Math.PI * 2;
      const value = Math.max(1, Math.ceil(enemy.scrap / pickupCount));
      this.pickups.push(
        this.makePickup(
          'scrap',
          enemy.x,
          enemy.y,
          Math.cos(angle) * (45 + this.random() * 90),
          Math.sin(angle) * (45 + this.random() * 90),
          value
        )
      );
    }
    const repairNeeded = player.hp <= player.maxHp * 0.58;
    const repairChance =
      enemy.kind === 'boss'
        ? 1
        : enemy.kind === 'elite'
          ? 0.24
          : enemy.kind === 'bruiser'
            ? 0.012
            : 0.003;
    if (repairNeeded && this.random() < repairChance) {
      this.pickups.push(
        this.makePickup(
          'repair',
          enemy.x,
          enemy.y,
          0,
          -80,
          enemy.kind === 'boss' ? 16 : enemy.kind === 'elite' ? 10 : 6
        )
      );
    }
    if (this.environmentalBlast && this.meta.modifier.id === 'crusher-shift') {
      player.scrap += 2;
      player.xp += 2;
      player.score += 240;
      this.popWorldText(
        'CRUSHER BONUS +2 SCRAP',
        enemy.x,
        enemy.y - 54,
        '#ff6b35',
        21
      );
    }
    if (this.meta.modifier.id === 'volatile-cargo' && enemy.kind === 'elite') {
      this.explode(enemy.x, enemy.y, 145, 58);
    }
    this.spawnBurst(
      enemy.x,
      enemy.y,
      0xffc928,
      enemy.kind === 'boss' ? 36 : 14,
      enemy.kind === 'boss' ? 340 : 210
    );
    this.spawnBurst(
      enemy.x,
      enemy.y,
      0xf7f3df,
      enemy.kind === 'boss' ? 24 : 7,
      170
    );
    let callout: string | null = null;
    if ([2, 5, 11, 19, 29].includes(chain))
      callout = `CHAIN WRECK x${chain + 1}`;
    else if ([5, 10, 15, 20, 30].includes(player.combo))
      callout = `${player.combo >= 15 ? 'RAMPAGE' : 'WRECK COMBO'} x${player.combo}`;
    else if (source === 'ram' && player.combo <= 2) callout = 'WRECKED';
    if (callout) {
      this.popWorldText(
        callout,
        enemy.x,
        enemy.y - enemy.radius - 18,
        chain > 0 ? '#f15bb5' : '#ffc928',
        chain >= 3 ? 28 : 23
      );
    }
    if (player.combo > 0 && player.combo % 10 === 0) {
      this.popWorldText(
        `MAYHEM MILESTONE x${player.combo}`,
        player.x,
        player.y - 46,
        '#2ef2e2',
        23
      );
      this.spawnBurst(player.x, player.y, 0x2ef2e2, 12, 180);
    }
    audio.wreck(chain);
    this.trauma = Math.max(
      this.trauma,
      enemy.kind === 'boss' ? 1 : clamp(0.24 + chain * 0.09, 0.24, 0.82)
    );
    this.hitStop = Math.max(
      this.hitStop,
      enemy.kind === 'boss' ? 0.11 : 0.035 + Math.min(0.045, chain * 0.009)
    );
    const defeatedBoss = enemy.kind === 'boss';
    if (defeatedBoss) {
      this.bossDefeated = true;
      this.announce('ROAD KING SCRAPPED!', 3);
    }
    this.enemies = this.enemies.filter((candidate) => candidate.alive);
    if (defeatedBoss) this.finishRun(true);
  }

  private damagePlayer(amount: number, trauma: number): void {
    if (
      this.qaGodMode ||
      this.player.invulnerable > 0 ||
      this.mode !== 'playing'
    )
      return;
    const actualDamage =
      amount * (this.meta.modifier.id === 'thin-metal' ? 1.35 : 1);
    this.player.hp = Math.max(0, this.player.hp - actualDamage);
    this.player.invulnerable = lerp(0.56, 0.31, this.dangerLevel());
    this.player.combo = 0;
    this.player.comboTimer = 0;
    this.trauma = Math.max(this.trauma, trauma);
    this.hitStop = Math.max(this.hitStop, trauma > 0.5 ? 0.045 : 0.018);
    this.spawnBurst(this.player.x, this.player.y, 0xff365e, 9, 150);
    this.popWorldText(
      `-${Math.ceil(actualDamage)} BODY`,
      this.player.x,
      this.player.y - 38,
      '#ff365e',
      22
    );
    audio.impact(clamp(trauma, 0.2, 0.8));
    if (this.player.hp <= 0) this.finishRun(false);
  }

  private heavyFeedback(amount: number): void {
    this.trauma = Math.max(this.trauma, amount * 0.65);
    if (amount > 0.5)
      this.hitStop = Math.max(this.hitStop, 0.025 + amount * 0.025);
  }

  private kickCamera(angle: number, strength: number): void {
    const shapedStrength = clamp(strength, 0, 1);
    if (shapedStrength <= 0.02) return;
    const magnitude = 4 + shapedStrength * 16;
    this.cameraKickX = this.cameraKickX * 0.56 + Math.cos(angle) * magnitude;
    this.cameraKickY = this.cameraKickY * 0.56 + Math.sin(angle) * magnitude;
    const accumulated = Math.hypot(this.cameraKickX, this.cameraKickY);
    if (accumulated > 32) {
      this.cameraKickX = (this.cameraKickX / accumulated) * 32;
      this.cameraKickY = (this.cameraKickY / accumulated) * 32;
    }
  }

  private updatePickups(dt: number): void {
    const blueprint = this.meta.communityUpgrade === 'magnet' ? 50 : 0;
    const storm = this.meta.modifier.id === 'magnet-storm' ? 120 : 0;
    const radius =
      138 +
      this.upgradeLevels.magnet * 70 +
      blueprint +
      storm +
      (this.player.overdriveTimer > 0 ? 90 : 0);
    for (const pickup of this.pickups) {
      pickup.age += dt;
      const dx = this.player.x - pickup.x;
      const dy = this.player.y - pickup.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      if (!pickup.persistent) {
        pickup.vx *= Math.pow(0.93, dt * 60);
        pickup.vy *= Math.pow(0.93, dt * 60);
        if (distance < radius) {
          const pull = 380 + (1 - distance / radius) * 920;
          pickup.vx += (dx / distance) * pull * dt;
          pickup.vy += (dy / distance) * pull * dt;
        }
        pickup.x += pickup.vx * dt;
        pickup.y += pickup.vy * dt;
      }
      if (distance < 25) {
        if (pickup.kind === 'repair' && this.player.hp >= this.player.maxHp)
          continue;
        pickup.age = -999;
        if (pickup.kind === 'repair') {
          this.player.hp = Math.min(
            this.player.maxHp,
            this.player.hp + pickup.value
          );
          this.popWorldText(
            `+${pickup.value} BODY`,
            this.player.x,
            this.player.y - 42,
            '#6ee7a8',
            22
          );
          audio.heal();
        } else {
          const crewBonus = this.crew === 'rust' ? 1.15 : 1;
          const gained = Math.max(1, Math.round(pickup.value * crewBonus));
          this.player.scrap += gained;
          this.player.xp += gained;
          this.player.score += gained * 12;
          this.pickupSoundStep = (this.pickupSoundStep + 1) % 7;
          audio.pickup(this.pickupSoundStep);
        }
      }
    }
    this.pickups = this.pickups.filter(
      (pickup) => pickup.age > -100 && (pickup.persistent || pickup.age < 26)
    );
  }

  private updateParticles(dt: number): void {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.vx *= Math.pow(particle.drag, dt * 60);
      particle.vy =
        particle.vy * Math.pow(particle.drag, dt * 60) + particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.rotation !== undefined)
        particle.rotation += (particle.spin ?? 0) * dt;
    }
    this.particles = this.particles
      .filter((particle) => particle.life > 0)
      .slice(-650);
    for (const ring of this.impactRings) ring.life -= dt;
    this.impactRings = this.impactRings
      .filter((ring) => ring.life > 0)
      .slice(-28);
  }

  private updateSkidMarks(dt: number): void {
    for (const mark of this.skidMarks) mark.life -= dt;
    this.skidMarks = this.skidMarks.filter((mark) => mark.life > 0).slice(-360);
  }

  private updateFloatTexts(dt: number): void {
    for (const floating of this.floatTexts) {
      floating.life -= dt;
      floating.y += floating.vy * dt;
      floating.object.setAlpha(
        clamp(floating.life / Math.min(0.35, floating.maxLife), 0, 1)
      );
    }
    const alive: FloatingText[] = [];
    for (const floating of this.floatTexts) {
      if (floating.life > 0) alive.push(floating);
      else floating.object.destroy();
    }
    this.floatTexts = alive;
  }

  private updateComboAndOverdrive(dt: number): void {
    const player = this.player;
    player.comboTimer = Math.max(0, player.comboTimer - dt);
    if (player.comboTimer <= 0) player.combo = 0;
    if (player.overdriveTimer <= 0)
      player.heat = Math.max(0, player.heat - dt * 2.8);
    if (player.heat >= 100 && player.overdriveTimer <= 0) {
      player.heat = 0;
      player.overdriveTimer = 6.2 + this.upgradeLevels.overdrive * 1.1;
      this.announce('OVERDRIVE!', 1.8);
      this.spawnBurst(player.x, player.y, 0x2ef2e2, 28, 320);
      audio.overdrive();
    }
  }

  private updateCamera(dt: number): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const lookAhead = 0.23;
    const targetX = clamp(
      this.player.x - width / 2 + this.player.vx * lookAhead,
      0,
      Math.max(0, WORLD_WIDTH - width)
    );
    const targetY = clamp(
      this.player.y - height / 2 + this.player.vy * lookAhead,
      0,
      Math.max(0, WORLD_HEIGHT - height)
    );
    const smoothing = 1 - Math.pow(0.0006, dt);
    this.cameraX = lerp(this.cameraX, targetX, smoothing);
    this.cameraY = lerp(this.cameraY, targetY, smoothing);
    const kickDecay = Math.pow(0.00002, dt);
    this.cameraKickX *= kickDecay;
    this.cameraKickY *= kickDecay;
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
  }

  private checkProgression(): void {
    if (this.player.xp < this.player.nextXp || this.mode !== 'playing') return;
    this.player.xp -= this.player.nextXp;
    this.player.level += 1;
    this.player.nextXp = Math.floor(
      10 + this.player.level * 7.5 + this.player.level ** 1.34 * 2.2
    );
    this.rollUpgradeChoices();
    this.resetTouchInput();
    this.mode = 'levelup';
    audio.stopEngine();
    this.buildLevelUpModal();
    audio.levelUp();
  }

  private rollUpgradeChoices(): void {
    const pool = UPGRADE_DEFINITIONS.filter((definition) => {
      if (definition.id === 'repair')
        return this.player.hp < this.player.maxHp * 0.86;
      return this.upgradeLevels[definition.id] < definition.max;
    });
    this.upgradeChoices = [];
    while (pool.length > 0 && this.upgradeChoices.length < 3) {
      const index = Math.floor(this.random() * pool.length);
      const [choice] = pool.splice(index, 1);
      if (choice) this.upgradeChoices.push(choice);
    }
    while (this.upgradeChoices.length < 3) {
      const fallback = UPGRADE_DEFINITIONS.find(
        (definition) => definition.id === 'repair'
      );
      if (fallback) this.upgradeChoices.push(fallback);
    }
  }

  private applyUpgrade(choice: UpgradeDefinition): void {
    if (choice.id === 'repair') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 45);
      audio.heal();
    } else {
      this.upgradeLevels[choice.id] += 1;
      if (choice.id === 'armor') {
        this.player.maxHp += 25;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 32);
      }
    }
    this.popScreenText(`${choice.title} INSTALLED`, choice.colorCss);
    this.clearModal();
    this.mode = 'playing';
  }

  private checkRunEnd(): void {
    if (this.mode !== 'playing') return;
    if (this.elapsed >= RUN_SECONDS && this.bossDefeated) this.finishRun(true);
    else if (
      this.elapsed >= RUN_SECONDS &&
      !this.bossDefeated &&
      this.announcementTimer <= 0
    ) {
      this.announce('OVERTIME\nSCRAP THE ROAD KING', 2);
    }
  }

  private finishRun(victory: boolean): void {
    if (this.mode === 'ended') return;
    this.resetTouchInput();
    this.mode = 'ended';
    this.victory = victory;
    this.announcementTimer = 0;
    this.announcementText.setVisible(false);
    this.player.vx = 0;
    this.player.vy = 0;
    audio.stopEngine();
    if (!this.runSubmitted) {
      this.runSubmitted = true;
      this.pendingRun = {
        day: this.meta.day,
        seed: this.meta.seed,
        runId: this.runId,
        score: Math.max(0, Math.round(this.player.score)),
        scrap: Math.max(0, Math.round(this.player.scrap)),
        kills: this.player.kills,
        bestCombo: this.player.bestCombo,
        level: this.player.level,
        survivedSeconds: Math.min(RUN_SECONDS + 120, Math.round(this.elapsed)),
        crew: this.crew,
        victory,
      };
      this.baselineCommunityScrap = this.meta.community.scrap;
      this.baselineCrewScore = this.meta.community.crewScores[this.crew] ?? 0;
    }
    if (this.meta.runtimeMode === 'practice') {
      this.runSyncState = 'practice';
    }
    this.buildResultsModal();
    if (this.meta.runtimeMode === 'live') this.submitPendingRun();
  }

  private submitPendingRun(): void {
    if (
      this.meta.runtimeMode === 'practice' ||
      !this.pendingRun ||
      this.runSyncState === 'pending' ||
      this.runSyncState === 'saved'
    )
      return;
    this.runSyncState = 'pending';
    if (this.mode === 'ended') this.buildResultsModal();
    const token = this.runToken;
    const pendingRun = this.pendingRun;
    const sessionPromise = this.runSessionPromise;
    const isCurrentRun = () =>
      token === this.runToken &&
      this.mode === 'ended' &&
      pendingRun.runId === this.runId;
    void (async () => {
      let session = await sessionPromise;
      if (!isCurrentRun() || this.meta.runtimeMode === 'practice') return null;
      if (!session || session.runId !== pendingRun.runId) {
        const retryPromise = startRunSession({
          day: pendingRun.day,
          seed: pendingRun.seed,
          runId: pendingRun.runId,
        });
        this.runSessionPromise = retryPromise;
        session = await retryPromise;
      }
      if (!isCurrentRun() || !session || session.runId !== pendingRun.runId)
        return null;
      return await submitRun({
        ...pendingRun,
        sessionNonce: session.sessionNonce,
      });
    })().then((response) => {
      if (token !== this.runToken || this.mode !== 'ended') return;
      if (this.meta.runtimeMode === 'practice') {
        this.runSyncState = 'practice';
        this.buildResultsModal();
        return;
      }
      if (response) {
        this.communityScrapDelta = Math.max(
          0,
          response.community.scrap - this.baselineCommunityScrap
        );
        const crewStanding = response.crewStandings.find(
          (standing) => standing.id === this.crew
        );
        this.crewScoreDelta = Math.max(
          0,
          (crewStanding?.score ?? this.baselineCrewScore) -
            this.baselineCrewScore
        );
        this.meta = {
          ...this.meta,
          profile: response.profile,
          leaderboard: response.leaderboard,
          crewStandings: response.crewStandings,
          community: response.community,
        };
        this.runSyncState = 'saved';
      } else {
        this.runSyncState = 'failed';
      }
      this.buildResultsModal();
    });
  }

  private debugAdvance(milliseconds: number): void {
    this.manualStepping = true;
    const steps = Math.max(1, Math.round(milliseconds / (FIXED_STEP * 1000)));
    for (let index = 0; index < steps; index += 1) this.step(FIXED_STEP);
    this.renderFrame();
  }

  private addSkidMarks(): void {
    const angle = this.player.angle;
    const forwardX = Math.cos(angle);
    const forwardY = Math.sin(angle);
    const rightX = -forwardY;
    const rightY = forwardX;
    for (const side of [-1, 1]) {
      const x = this.player.x - forwardX * 17 + rightX * side * 13;
      const y = this.player.y - forwardY * 17 + rightY * side * 13;
      this.skidMarks.push({
        x1: x,
        y1: y,
        x2: x - this.player.vx * 0.045,
        y2: y - this.player.vy * 0.045,
        life: 8,
      });
    }
    if (this.player.drifting && this.random() < 0.55) {
      this.particles.push({
        x: this.player.x - forwardX * 22 + rightX * (this.random() - 0.5) * 24,
        y: this.player.y - forwardY * 22 + rightY * (this.random() - 0.5) * 24,
        vx: -this.player.vx * 0.12 + (this.random() - 0.5) * 35,
        vy: -this.player.vy * 0.12 + (this.random() - 0.5) * 35,
        life: 0.6,
        maxLife: 0.6,
        color: 0x9aa2a6,
        size: 5 + this.random() * 5,
        drag: 0.96,
        gravity: -4,
      });
    }
  }

  private spawnBurst(
    x: number,
    y: number,
    color: number,
    count: number,
    speed: number
  ): void {
    for (let index = 0; index < count; index += 1) {
      const angle = this.random() * Math.PI * 2;
      const velocity = speed * (0.28 + this.random() * 0.72);
      const life = 0.2 + this.random() * 0.46;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life,
        maxLife: life,
        color,
        size: 2 + this.random() * 4.8,
        drag: 0.94 + this.random() * 0.025,
        gravity: 28 + this.random() * 80,
      });
    }
  }

  private spawnCrashFx(
    x: number,
    y: number,
    impactAngle: number,
    strength: number,
    color: number,
    destroyed = false
  ): void {
    const impact = clamp(strength, 0.12, 1);
    const sparkCount = Math.round(5 + impact * 12 + (destroyed ? 5 : 0));
    for (let index = 0; index < sparkCount; index += 1) {
      const angle =
        impactAngle + (this.random() - 0.5) * (destroyed ? 2.25 : 1.35);
      const speed = (170 + this.random() * 330) * (0.46 + impact * 0.72);
      const life = 0.12 + this.random() * (0.2 + impact * 0.16);
      this.particles.push({
        x: x + (this.random() - 0.5) * 8,
        y: y + (this.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        color: this.random() < 0.28 ? 0xf7f3df : 0xffc928,
        size: 1.8 + this.random() * (2.2 + impact * 2.2),
        drag: 0.94 + this.random() * 0.025,
        gravity: 48 + this.random() * 85,
        kind: 'spark',
      });
    }

    const chunkCount = Math.round(1 + impact * 4 + (destroyed ? 4 : 0));
    for (let index = 0; index < chunkCount; index += 1) {
      const angle = impactAngle + (this.random() - 0.5) * 2.8;
      const speed = (65 + this.random() * 190) * (0.55 + impact * 0.65);
      const life = 0.5 + this.random() * 0.65;
      const tyre = destroyed && this.random() < 0.2;
      this.particles.push({
        x: x + (this.random() - 0.5) * 15,
        y: y + (this.random() - 0.5) * 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        color: tyre ? 0x111722 : this.random() < 0.32 ? 0x8fa3b8 : color,
        size: tyre ? 5 + this.random() * 3 : 4 + this.random() * 6,
        drag: 0.965,
        gravity: 135 + this.random() * 95,
        kind: tyre ? 'tyre' : 'chunk',
        rotation: this.random() * Math.PI * 2,
        spin: (this.random() - 0.5) * 18,
      });
    }

    const smokeCount = Math.round(2 + impact * 4 + (destroyed ? 3 : 0));
    for (let index = 0; index < smokeCount; index += 1) {
      const angle = this.random() * Math.PI * 2;
      const life = 0.48 + this.random() * 0.72;
      const speed = 18 + this.random() * (45 + impact * 50);
      this.particles.push({
        x: x + (this.random() - 0.5) * 18,
        y: y + (this.random() - 0.5) * 18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        color: destroyed && this.random() < 0.25 ? 0x6a3557 : 0x59616b,
        size: 7 + this.random() * (8 + impact * 7),
        drag: 0.975,
        gravity: -18 - this.random() * 18,
        kind: 'smoke',
      });
    }

    const ringLife = 0.2 + impact * 0.13;
    this.impactRings.push({
      x,
      y,
      life: ringLife,
      maxLife: ringLife,
      startRadius: 8 + impact * 8,
      endRadius: 42 + impact * (destroyed ? 82 : 48),
      color,
    });
    if (destroyed && impact > 0.58) {
      this.impactRings.push({
        x,
        y,
        life: ringLife * 0.72,
        maxLife: ringLife * 0.72,
        startRadius: 4,
        endRadius: 24 + impact * 48,
        color: 0xf7f3df,
      });
    }
    const crashDistance = Math.hypot(x - this.player.x, y - this.player.y);
    const kickFalloff = clamp(1 - Math.max(0, crashDistance - 96) / 720, 0, 1);
    this.kickCamera(impactAngle, impact * (destroyed ? 1 : 0.72) * kickFalloff);
  }

  private popWorldText(
    label: string,
    x: number,
    y: number,
    color: string,
    size: number
  ): void {
    if (this.floatTexts.length > 24) return;
    const object = this.add
      .text(0, 0, label, {
        fontFamily: 'Impact, Haettenschweiler, sans-serif',
        fontSize: `${size}px`,
        color,
        stroke: '#080b12',
        strokeThickness: Math.max(3, Math.round(size * 0.16)),
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(70);
    this.floatTexts.push({
      object,
      x,
      y,
      vy: -42 - size * 0.35,
      life: 0.72,
      maxLife: 0.72,
    });
  }

  private popScreenText(label: string, color: string): void {
    const object = this.add
      .text(this.scale.width / 2, this.scale.height * 0.22, label, {
        fontFamily: 'Impact, Haettenschweiler, sans-serif',
        fontSize: `${Math.max(26, Math.min(44, this.scale.width * 0.04))}px`,
        color,
        stroke: '#080b12',
        strokeThickness: 7,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(this.mode === 'ended' ? 310 : 190);
    this.tweens.add({
      targets: object,
      y: object.y - 44,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => object.destroy(),
    });
  }

  private announce(message: string, duration: number): void {
    this.announcementText?.setText(message).setVisible(true).setAlpha(1);
    this.announcementTimer = duration;
  }

  private currentWaveName(): string {
    if (this.elapsed >= RUN_SECONDS && !this.bossDefeated) return 'OVERTIME';
    const names = [
      'OPENING SCRAP',
      'HOT PURSUIT',
      'HEAVY METAL',
      'NO BRAKES',
      'THE CRUSH',
      'ROAD KING',
    ];
    return (
      names[Math.min(names.length - 1, Math.floor(this.elapsed / 30))] ??
      'SCRAPSTORM'
    );
  }

  private layoutUi(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const compact = width < 720;
    this.arenaFloor?.setSize(width, height);
    this.timerText?.setPosition(width / 2, 13).setScale(compact ? 0.76 : 1);
    this.waveText
      ?.setPosition(width / 2, compact ? 43 : 51)
      .setScale(compact ? 0.82 : 1);
    this.hpText
      ?.setPosition(20, compact ? 34 : 40)
      .setScale(compact ? 0.84 : 1);
    this.levelText?.setPosition(20, 10).setScale(compact ? 0.85 : 1);
    this.crewText
      ?.setPosition(20, compact ? 58 : 67)
      .setScale(compact ? 0.78 : 1);
    this.scoreText?.setPosition(width - 20, 10).setScale(compact ? 0.76 : 1);
    this.comboText
      ?.setPosition(width / 2, height * 0.22)
      .setScale(compact ? 0.76 : 1);
    this.hintText?.setPosition(width / 2, height - 24);
    this.announcementText
      ?.setPosition(width / 2, height * 0.3)
      .setScale(Math.min(1, width / 900, compact ? 0.72 : 1));
    this.showTouchControls = navigator.maxTouchPoints > 0 || width < 760;
    const touchControlY = height - (height < 560 ? 96 : 112);
    this.touchWheelCenterX = Math.min(104, width * 0.24);
    this.touchWheelCenterY = touchControlY;
    this.touchShifterCenterX = width - Math.min(86, width * 0.22);
    this.touchShifterCenterY = touchControlY;
    this.touchWheelRect.setTo(
      this.touchWheelCenterX - 70,
      this.touchWheelCenterY - 72,
      140,
      148
    );
    this.touchShifterRect.setTo(
      this.touchShifterCenterX - 70,
      this.touchShifterCenterY - 72,
      140,
      148
    );
    this.touchPauseRect.setTo(width - 134, 52, 58, 48);
    this.touchMuteRect.setTo(width - 68, 52, 58, 48);
    this.touchPauseText?.setPosition(
      this.touchPauseRect.centerX,
      this.touchPauseRect.centerY
    );
    this.touchMuteText?.setPosition(
      this.touchMuteRect.centerX,
      this.touchMuteRect.centerY
    );
    if (this.mode === 'levelup') this.buildLevelUpModal();
    else if (this.mode === 'ended') this.buildResultsModal();
    else if (this.mode === 'paused') this.buildPauseModal();
  }

  private renderFrame(): void {
    if (
      !this.worldGraphics ||
      !this.worldOverlayGraphics ||
      !this.uiGraphics ||
      !this.modalGraphics
    )
      return;
    const shakeAmount = this.trauma * this.trauma * 12;
    const shakeX = Math.sin(this.elapsed * 127.31) * shakeAmount;
    const shakeY = Math.cos(this.elapsed * 93.17) * shakeAmount * 0.72;
    const cameraX = this.cameraX + shakeX + this.cameraKickX;
    const cameraY = this.cameraY + shakeY + this.cameraKickY;
    this.renderArenaEnvironment(cameraX, cameraY);
    this.renderWorld(cameraX, cameraY);
    this.renderHud();
    this.renderModal();
    for (const floating of this.floatTexts) {
      floating.object.setPosition(floating.x - cameraX, floating.y - cameraY);
    }

    const remaining = Math.max(0, RUN_SECONDS - this.elapsed);
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    const overtime = this.elapsed >= RUN_SECONDS && !this.bossDefeated;
    this.timerText.setText(
      overtime
        ? `+${Math.floor(this.elapsed - RUN_SECONDS)}s`
        : `${minutes}:${seconds.toString().padStart(2, '0')}`
    );
    this.timerText.setColor(overtime ? '#f15bb5' : '#f7f3df');
    this.waveText.setText(this.currentWaveName());
    this.hpText.setText(
      `BODY ${Math.ceil(this.player.hp)} / ${this.player.maxHp}`
    );
    this.scoreText.setText(this.player.score.toLocaleString());
    this.levelText.setText(
      `LV ${this.player.level}  //  ${this.player.scrap} SCRAP`
    );
    const showCombo = this.player.combo >= 2 && this.player.comboTimer > 0;
    this.comboText
      .setVisible(showCombo)
      .setText(
        showCombo
          ? `x${this.player.combo}  ${this.player.combo >= 15 ? 'RAMPAGE' : 'WRECK COMBO'}`
          : ''
      )
      .setColor(
        this.player.combo >= 15
          ? '#f15bb5'
          : this.player.combo >= 7
            ? '#ffc928'
            : '#f7f3df'
      )
      .setScale(
        (this.scale.width < 720 ? 0.76 : 1) *
          (1 + Math.min(0.18, this.player.combo * 0.006))
      );

    if (this.announcementTimer > 0) {
      this.announcementText
        .setVisible(true)
        .setAlpha(clamp(this.announcementTimer / 0.35, 0, 1));
    } else {
      this.announcementText.setVisible(false);
    }
  }

  private damageTier(hp: number, maxHp: number): number {
    const ratio = maxHp > 0 ? hp / maxHp : 0;
    if (ratio > 0.66) return 0;
    if (ratio > 0.33) return 1;
    return 2;
  }

  private clearImagePool(pool: Map<number, GameObjects.Image>): void {
    for (const image of pool.values()) image.destroy();
    pool.clear();
  }

  private pruneImagePool(
    pool: Map<number, GameObjects.Image>,
    activeIds: Set<number>
  ): void {
    for (const [id, image] of pool) {
      if (activeIds.has(id)) continue;
      image.destroy();
      pool.delete(id);
    }
  }

  private syncWorldImages(cameraX: number, cameraY: number): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const vehicleAtlasReady = this.textures.exists(VEHICLE_ATLAS_KEY);
    if (vehicleAtlasReady) {
      const playerRow = this.crew === 'iron' ? 0 : this.crew === 'neon' ? 1 : 2;
      const playerFrame =
        playerRow * VEHICLE_DAMAGE_COLUMNS +
        this.damageTier(this.player.hp, this.player.maxHp);
      if (!this.playerVehicleImage) {
        this.playerVehicleImage = this.add
          .image(0, 0, VEHICLE_ATLAS_KEY, playerFrame)
          .setOrigin(0.5)
          .setDepth(30);
      }
      const playerX = this.player.x - cameraX;
      const playerY = this.player.y - cameraY;
      const playerLength = 52 + this.upgradeLevels.ram * 3;
      this.playerVehicleImage
        .setFrame(playerFrame)
        .setPosition(playerX, playerY)
        .setRotation(this.player.angle)
        .setScale(playerLength / VEHICLE_ART_LENGTH)
        .setAlpha(
          this.player.invulnerable > 0 &&
            Math.floor(this.elapsed * 24) % 2 === 0
            ? 0.34
            : 1
        )
        .setVisible(
          playerX >= -90 &&
            playerX <= width + 90 &&
            playerY >= -90 &&
            playerY <= height + 90
        );

      const enemyIds = new Set<number>();
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        enemyIds.add(enemy.id);
        const frame =
          enemy.visualRow * VEHICLE_DAMAGE_COLUMNS +
          this.damageTier(enemy.hp, enemy.maxHp);
        let image = this.enemyVehicleImages.get(enemy.id);
        if (!image) {
          image = this.add
            .image(0, 0, VEHICLE_ATLAS_KEY, frame)
            .setOrigin(0.5)
            .setDepth(20);
          this.enemyVehicleImages.set(enemy.id, image);
        }
        const x = enemy.x - cameraX;
        const y = enemy.y - cameraY;
        const length = enemy.radius * (enemy.kind === 'boss' ? 2.25 : 2.05);
        image
          .setFrame(frame)
          .setPosition(x, y)
          .setRotation(enemy.angle)
          .setScale(length / VEHICLE_ART_LENGTH)
          .setAlpha(enemy.flash > 0 ? 0.58 : 1)
          .setVisible(
            x >= -110 && x <= width + 110 && y >= -110 && y <= height + 110
          );
      }
      this.pruneImagePool(this.enemyVehicleImages, enemyIds);

      const wreckIds = new Set<number>();
      for (const wreck of this.wrecks) {
        wreckIds.add(wreck.id);
        const frame = wreck.visualRow * VEHICLE_DAMAGE_COLUMNS + 3;
        let image = this.wreckVehicleImages.get(wreck.id);
        if (!image) {
          image = this.add
            .image(0, 0, VEHICLE_ATLAS_KEY, frame)
            .setOrigin(0.5)
            .setDepth(10);
          this.wreckVehicleImages.set(wreck.id, image);
        }
        const x = wreck.x - cameraX;
        const y = wreck.y - cameraY;
        image
          .setFrame(frame)
          .setPosition(x, y)
          .setRotation(wreck.angle)
          .setScale((wreck.radius * 2.05) / VEHICLE_ART_LENGTH)
          .setAlpha(clamp(wreck.life / 0.18, 0.18, 1))
          .setVisible(
            x >= -100 && x <= width + 100 && y >= -100 && y <= height + 100
          );
      }
      this.pruneImagePool(this.wreckVehicleImages, wreckIds);
    } else {
      this.playerVehicleImage?.destroy();
      this.playerVehicleImage = null;
      this.clearImagePool(this.enemyVehicleImages);
      this.clearImagePool(this.wreckVehicleImages);
    }

    const hazardsAtlasReady = this.textures.exists(HAZARDS_ATLAS_KEY);
    if (!hazardsAtlasReady) {
      this.clearImagePool(this.barrelImages);
      this.clearImagePool(this.repairImages);
      this.clearImagePool(this.blastImages);
      return;
    }

    const barrelIds = new Set<number>();
    for (const barrel of this.decorations) {
      if (!barrel.alive || barrel.kind !== 'barrel') continue;
      barrelIds.add(barrel.id);
      let image = this.barrelImages.get(barrel.id);
      if (!image) {
        image = this.add
          .image(0, 0, HAZARDS_ATLAS_KEY, barrel.visualFrame)
          .setOrigin(0.5)
          .setDepth(5);
        this.barrelImages.set(barrel.id, image);
      }
      const x = barrel.x - cameraX;
      const y = barrel.y - cameraY;
      const primedPulse =
        barrel.fuse >= 0 ? 0.66 + Math.sin(this.elapsed * 70) * 0.24 : 1;
      image
        .setFrame(barrel.visualFrame)
        .setPosition(x, y)
        .setScale(0.48 * barrel.size)
        .setAlpha(primedPulse * (barrel.hp < barrel.maxHp ? 0.88 : 1))
        .setVisible(
          x >= -70 && x <= width + 70 && y >= -70 && y <= height + 70
        );
    }
    this.pruneImagePool(this.barrelImages, barrelIds);

    const repairIds = new Set<number>();
    for (const pickup of this.pickups) {
      if (pickup.kind !== 'repair' || pickup.age <= -100) continue;
      repairIds.add(pickup.id);
      let image = this.repairImages.get(pickup.id);
      if (!image) {
        image = this.add
          .image(0, 0, HAZARDS_ATLAS_KEY, pickup.visualFrame)
          .setOrigin(0.5)
          .setDepth(6);
        this.repairImages.set(pickup.id, image);
      }
      const x = pickup.x - cameraX;
      const y = pickup.y - cameraY;
      const pulse = 0.94 + Math.sin(this.elapsed * 6 + pickup.id) * 0.055;
      image
        .setFrame(pickup.visualFrame)
        .setPosition(x, y)
        .setScale(0.46 * pulse)
        .setAlpha(this.player.hp >= this.player.maxHp ? 0.72 : 1)
        .setVisible(
          x >= -80 && x <= width + 80 && y >= -80 && y <= height + 80
        );
    }
    this.pruneImagePool(this.repairImages, repairIds);

    const blastIds = new Set<number>();
    for (const blast of this.blastVisuals) {
      blastIds.add(blast.id);
      const progress = clamp(1 - blast.life / blast.maxLife, 0, 0.999);
      const frame = 4 + Math.floor(progress * 8);
      let image = this.blastImages.get(blast.id);
      if (!image) {
        image = this.add
          .image(0, 0, HAZARDS_ATLAS_KEY, frame)
          .setOrigin(0.5)
          .setDepth(35);
        this.blastImages.set(blast.id, image);
      }
      const x = blast.x - cameraX;
      const y = blast.y - cameraY;
      const displaySize = blast.radius * 1.72;
      image
        .setFrame(frame)
        .setPosition(x, y)
        .setDisplaySize(displaySize, displaySize)
        .setVisible(
          x >= -displaySize &&
            x <= width + displaySize &&
            y >= -displaySize &&
            y <= height + displaySize
        );
    }
    this.pruneImagePool(this.blastImages, blastIds);
  }

  private renderWorld(cameraX: number, cameraY: number): void {
    const graphics = this.worldGraphics;
    const overlay = this.worldOverlayGraphics;
    const width = this.scale.width;
    const height = this.scale.height;
    graphics.clear();
    overlay.clear();
    this.syncWorldImages(cameraX, cameraY);
    const vehicleAtlasReady = this.textures.exists(VEHICLE_ATLAS_KEY);
    const hazardsAtlasReady = this.textures.exists(HAZARDS_ATLAS_KEY);
    graphics.fillStyle(0x050a12, 0.28).fillRect(0, 0, width, height);

    const arenaId = this.meta.challenge.arena.id;
    const centerX = WORLD_WIDTH / 2 - cameraX;
    const centerY = WORLD_HEIGHT / 2 - cameraY;
    if (arenaId === 'neon-spillway') {
      graphics.lineStyle(5, 0x2ef2e2, 0.12);
      for (const offset of [-420, -140, 140, 420]) {
        graphics.lineBetween(
          -cameraX,
          WORLD_HEIGHT / 2 + offset - cameraY,
          WORLD_WIDTH - cameraX,
          WORLD_HEIGHT / 2 + offset - cameraY
        );
      }
      graphics.lineStyle(2, 0xf7f3df, 0.1);
      for (let x = -cameraX; x < WORLD_WIDTH - cameraX; x += 180) {
        graphics.lineBetween(x, centerY - 18, x + 90, centerY - 18);
        graphics.lineBetween(x, centerY + 18, x + 90, centerY + 18);
      }
    } else if (arenaId === 'furnace-eight') {
      graphics.fillStyle(0xff6b35, 0.04).fillCircle(centerX, centerY, 430);
      graphics
        .lineStyle(12, 0xff6b35, 0.09)
        .strokeCircle(centerX - 220, centerY, 260);
      graphics.strokeCircle(centerX + 220, centerY, 260);
      graphics
        .lineStyle(3, 0xffc928, 0.14)
        .lineBetween(centerX - 520, centerY, centerX + 520, centerY);
      graphics.lineBetween(centerX, centerY - 520, centerX, centerY + 520);
    } else if (arenaId === 'thunder-dome') {
      graphics.lineStyle(4, 0xf15bb5, 0.07);
      for (const radius of [360, 700, 1040])
        graphics.strokeCircle(centerX, centerY, radius);
    } else if (arenaId === 'dead-mall') {
      graphics.lineStyle(3, 0x8fa3b8, 0.07);
      graphics.strokeRect(centerX - 900, centerY - 600, 1800, 1200);
      graphics.lineBetween(centerX - 900, centerY, centerX + 900, centerY);
      graphics.lineBetween(centerX, centerY - 600, centerX, centerY + 600);
    }

    const fenceInset = this.arenaInset();
    const fenceX = fenceInset - cameraX;
    const fenceY = fenceInset - cameraY;
    const fenceWidth = WORLD_WIDTH - fenceInset * 2;
    const fenceHeight = WORLD_HEIGHT - fenceInset * 2;
    graphics
      .lineStyle(10, 0x080b12, 1)
      .strokeRect(fenceX, fenceY, fenceWidth, fenceHeight);
    graphics
      .lineStyle(3, arenaId === 'boneyard-bowl' ? 0xff6b35 : 0xffc928, 0.72)
      .strokeRect(fenceX + 7, fenceY + 7, fenceWidth - 14, fenceHeight - 14);

    for (const decoration of this.decorations) {
      if (!decoration.alive) continue;
      const x = decoration.x - cameraX;
      const y = decoration.y - cameraY;
      if (x < -60 || x > width + 60 || y < -60 || y > height + 60) continue;
      if (decoration.kind !== 'barrel' || !hazardsAtlasReady)
        this.drawDecoration(graphics, x, y, decoration);
      if (decoration.kind === 'barrel' && decoration.fuse >= 0) {
        const pulse = 23 + Math.sin(this.elapsed * 70) * 4;
        overlay
          .lineStyle(3, 0xffc928, 0.8)
          .strokeCircle(x, y, pulse * decoration.size);
      }
    }

    graphics.lineStyle(4, 0x020305, 0.52);
    for (const mark of this.skidMarks) {
      const alpha = clamp(mark.life / 2, 0.08, 0.55);
      graphics.lineStyle(4, 0x020305, alpha);
      graphics.lineBetween(
        mark.x1 - cameraX,
        mark.y1 - cameraY,
        mark.x2 - cameraX,
        mark.y2 - cameraY
      );
    }

    for (const fire of this.fires) {
      const x = fire.x - cameraX;
      const y = fire.y - cameraY;
      const flicker = 0.75 + Math.sin(this.elapsed * 22 + fire.x) * 0.2;
      graphics
        .fillStyle(0xff365e, 0.17 * flicker)
        .fillCircle(x, y, fire.radius * 1.45);
      graphics.fillStyle(0xff6b35, 0.5 * flicker).fillCircle(x, y, fire.radius);
      graphics
        .fillStyle(0xffc928, 0.68 * flicker)
        .fillCircle(x, y, fire.radius * 0.46);
    }

    for (const ring of this.impactRings) {
      const x = ring.x - cameraX;
      const y = ring.y - cameraY;
      const remaining = clamp(ring.life / ring.maxLife, 0, 1);
      const progress = 1 - remaining;
      const radius = lerp(ring.startRadius, ring.endRadius, progress);
      graphics
        .fillStyle(ring.color, remaining * remaining * 0.07)
        .fillCircle(x, y, radius * 0.72);
      graphics
        .lineStyle(2 + remaining * 5, ring.color, remaining * 0.8)
        .strokeCircle(x, y, radius);
    }

    for (const pickup of this.pickups) {
      const x = pickup.x - cameraX;
      const y = pickup.y - cameraY;
      if (x < -30 || x > width + 30 || y < -30 || y > height + 30) continue;
      const pulse = 0.86 + Math.sin(this.elapsed * 8 + pickup.x * 0.03) * 0.14;
      if (pickup.kind === 'repair') {
        graphics.fillStyle(0x6ee7a8, 0.18).fillCircle(x, y, 17 * pulse);
        if (!hazardsAtlasReady) {
          graphics.fillStyle(0x6ee7a8, 1).fillRect(x - 4, y - 11, 8, 22);
          graphics.fillRect(x - 11, y - 4, 22, 8);
        }
      } else {
        graphics.fillStyle(0x2ef2e2, 0.16).fillCircle(x, y, 13 * pulse);
        this.drawPolygon(
          graphics,
          x,
          y,
          this.elapsed + pickup.x,
          [-7, 0, 0, -9, 7, 0, 0, 9],
          0x2ef2e2,
          0x080b12,
          2
        );
      }
    }

    for (const wreck of this.wrecks) {
      const x = wreck.x - cameraX;
      const y = wreck.y - cameraY;
      if (x < -90 || x > width + 90 || y < -90 || y > height + 90) continue;
      if (wreck.hot) {
        const pulse = 1 + Math.sin(this.elapsed * 17 + wreck.angle) * 0.12;
        graphics
          .fillStyle(wreck.chain > 0 ? 0xf15bb5 : 0xffc928, 0.14)
          .fillCircle(x, y, wreck.radius * 1.85 * pulse);
      }
      graphics
        .fillStyle(0x020305, 0.52)
        .fillEllipse(x + 4, y + 7, wreck.radius * 2.08, wreck.radius * 1.2);
      if (!vehicleAtlasReady) {
        this.drawCar(
          graphics,
          x,
          y,
          wreck.angle,
          wreck.radius * 2.05,
          wreck.radius * 1.2,
          wreck.color,
          0x2b2020,
          false,
          'wreck'
        );
        this.drawPolygon(
          graphics,
          x,
          y,
          wreck.angle,
          [
            wreck.radius * 0.05,
            -wreck.radius * 0.46,
            wreck.radius * 0.86,
            -wreck.radius * 0.24,
            wreck.radius * 0.58,
            wreck.radius * 0.08,
            wreck.radius * 0.92,
            wreck.radius * 0.34,
            wreck.radius * 0.04,
            wreck.radius * 0.42,
          ],
          0x191d22,
          wreck.chain > 0 ? 0xf15bb5 : 0x080b12,
          2
        );
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const x = enemy.x - cameraX;
      const y = enemy.y - cameraY;
      if (x < -100 || x > width + 100 || y < -100 || y > height + 100) continue;
      const bodyColor =
        enemy.flash > 0 ? 0xf7f3df : this.enemyColor(enemy.kind);
      const accent =
        enemy.kind === 'elite' || enemy.kind === 'boss' ? 0xf15bb5 : 0xffc928;
      graphics
        .fillStyle(0x020305, 0.5)
        .fillEllipse(
          x + 4,
          y + 7,
          enemy.radius * (enemy.kind === 'boss' ? 2.28 : 2.08),
          enemy.radius * 1.24
        );
      if (enemy.kind === 'boss' && enemy.chargeTelegraph > 0) {
        const windup = clamp(1 - enemy.chargeTelegraph / 0.72, 0, 1);
        const pulse = 0.45 + Math.sin(this.elapsed * 42) * 0.2;
        const warningLength = 560;
        graphics.lineStyle(8 + windup * 8, 0xff365e, 0.12 + windup * 0.18);
        graphics.lineBetween(
          x,
          y,
          x + Math.cos(enemy.chargeAngle) * warningLength,
          y + Math.sin(enemy.chargeAngle) * warningLength
        );
        graphics.lineStyle(3, 0xffc928, 0.55 + pulse);
        graphics.strokeCircle(x, y, enemy.radius * (1.45 + windup * 0.38));
        graphics
          .fillStyle(0xff365e, 0.08 + windup * 0.12)
          .fillCircle(x, y, enemy.radius * 1.65);
      }
      if (!vehicleAtlasReady)
        this.drawCar(
          graphics,
          x,
          y,
          enemy.angle,
          enemy.radius * (enemy.kind === 'boss' ? 2.25 : 2.05),
          enemy.radius * 1.25,
          bodyColor,
          accent,
          false,
          enemy.kind
        );
      if (
        enemy.kind === 'elite' ||
        enemy.kind === 'boss' ||
        enemy.hp < enemy.maxHp
      ) {
        const barWidth = enemy.radius * 2.2;
        overlay
          .fillStyle(0x080b12, 0.9)
          .fillRect(x - barWidth / 2, y - enemy.radius - 16, barWidth, 5);
        overlay
          .fillStyle(enemy.kind === 'boss' ? 0xf15bb5 : 0xff365e, 1)
          .fillRect(
            x - barWidth / 2,
            y - enemy.radius - 16,
            barWidth * clamp(enemy.hp / enemy.maxHp, 0, 1),
            5
          );
      }
    }

    for (const projectile of this.projectiles) {
      const x = projectile.x - cameraX;
      const y = projectile.y - cameraY;
      overlay.fillStyle(0x2ef2e2, 0.22).fillCircle(x, y, 7);
      overlay.fillStyle(0xf7f3df, 1).fillCircle(x, y, 2.5);
      overlay
        .lineStyle(2, 0x2ef2e2, 0.7)
        .lineBetween(
          x,
          y,
          x - projectile.vx * 0.018,
          y - projectile.vy * 0.018
        );
    }

    const playerX = this.player.x - cameraX;
    const playerY = this.player.y - cameraY;
    if (this.player.overdriveTimer > 0) {
      const pulse = 38 + Math.sin(this.elapsed * 12) * 5;
      graphics
        .lineStyle(4, 0x2ef2e2, 0.5)
        .strokeCircle(playerX, playerY, pulse);
      graphics
        .fillStyle(0x2ef2e2, 0.08)
        .fillCircle(playerX, playerY, pulse * 1.3);
    }
    graphics
      .fillStyle(0x020305, 0.54)
      .fillEllipse(
        playerX + 4,
        playerY + 7,
        54 + this.upgradeLevels.ram * 3,
        31 + this.upgradeLevels.armor * 1.5
      );
    if (!vehicleAtlasReady)
      this.drawCar(
        graphics,
        playerX,
        playerY,
        this.player.angle,
        52 + this.upgradeLevels.ram * 3,
        30 + this.upgradeLevels.armor * 1.5,
        this.player.invulnerable > 0 && Math.floor(this.elapsed * 24) % 2 === 0
          ? 0xf7f3df
          : CREW_COLORS[this.crew],
        this.player.overdriveTimer > 0 ? 0x2ef2e2 : 0xf7f3df,
        true,
        'player'
      );
    this.drawPlayerAttachments(overlay, playerX, playerY);

    for (const particle of this.particles) {
      const x = particle.x - cameraX;
      const y = particle.y - cameraY;
      if (x < -20 || x > width + 20 || y < -20 || y > height + 20) continue;
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      if (particle.kind === 'spark') {
        const velocity = Math.max(1, Math.hypot(particle.vx, particle.vy));
        const streak = 6 + particle.size * 2.4;
        overlay
          .lineStyle(Math.max(1, particle.size * 0.52), particle.color, alpha)
          .lineBetween(
            x,
            y,
            x - (particle.vx / velocity) * streak,
            y - (particle.vy / velocity) * streak
          );
      } else if (particle.kind === 'smoke') {
        const bloom = 1 + (1 - alpha) * 1.15;
        overlay
          .fillStyle(particle.color, alpha * 0.24)
          .fillCircle(x, y, Math.max(1, particle.size * bloom));
      } else if (particle.kind === 'chunk') {
        const size = particle.size * (0.62 + alpha * 0.38);
        this.drawPolygon(
          overlay,
          x,
          y,
          particle.rotation ?? 0,
          [
            -size,
            -size * 0.42,
            size * 0.9,
            -size * 0.7,
            size,
            size * 0.38,
            -size * 0.7,
            size * 0.65,
          ],
          particle.color,
          0x080b12,
          1.5
        );
      } else if (particle.kind === 'tyre') {
        overlay
          .lineStyle(Math.max(2, particle.size * 0.42), particle.color, alpha)
          .strokeCircle(x, y, Math.max(2, particle.size * alpha));
      } else {
        overlay
          .fillStyle(particle.color, alpha)
          .fillCircle(x, y, Math.max(0.7, particle.size * alpha));
      }
    }
  }

  private enemyColor(kind: EnemyKind): number {
    if (kind === 'striker') return 0xff6b35;
    if (kind === 'bruiser') return 0x9b3d35;
    if (kind === 'elite') return 0xc0266d;
    if (kind === 'boss') return 0x641d44;
    return 0xc7443b;
  }

  private drawDecoration(
    graphics: GameObjects.Graphics,
    x: number,
    y: number,
    decoration: Decoration
  ): void {
    const size = decoration.size;
    if (decoration.kind === 'stain') {
      graphics
        .fillStyle(0x05070b, 0.32)
        .fillEllipse(x, y, 34 * size, 17 * size);
      graphics
        .fillStyle(0x26303b, 0.2)
        .fillCircle(x + 7 * size, y - 2 * size, 6 * size);
    } else if (decoration.kind === 'crack') {
      graphics.lineStyle(2, 0x080b12, 0.55);
      graphics.lineBetween(
        x - 11 * size,
        y - 4 * size,
        x + 2 * size,
        y + 2 * size
      );
      graphics.lineBetween(
        x + 2 * size,
        y + 2 * size,
        x + 13 * size,
        y - 7 * size
      );
      graphics.lineBetween(
        x + 2 * size,
        y + 2 * size,
        x + 7 * size,
        y + 11 * size
      );
    } else if (decoration.kind === 'cone') {
      this.drawPolygon(
        graphics,
        x,
        y,
        decoration.rotation,
        [-7, 7, 0, -9, 7, 7],
        0xff6b35,
        0x080b12,
        2
      );
      graphics.fillStyle(0xf7f3df, 0.8).fillRect(x - 5, y, 10, 3);
    } else if (decoration.kind === 'barrel') {
      graphics
        .fillStyle(0x080b12, 0.5)
        .fillEllipse(x + 3, y + 7, 25 * size, 11 * size);
      graphics
        .fillStyle(0x8f302d, 1)
        .fillRoundedRect(x - 9 * size, y - 13 * size, 18 * size, 26 * size, 3);
      graphics
        .fillStyle(0xffc928, 0.9)
        .fillRect(x - 9 * size, y - 2, 18 * size, 4);
    } else if (decoration.kind === 'pillar') {
      graphics
        .fillStyle(0x080b12, 0.65)
        .fillEllipse(x + 5, y + 10, 74 * size, 34 * size);
      graphics
        .fillStyle(0x3b4653, 1)
        .fillRoundedRect(x - 25 * size, y - 30 * size, 50 * size, 60 * size, 7);
      graphics
        .lineStyle(4, 0x8fa3b8, 0.65)
        .strokeRoundedRect(
          x - 25 * size,
          y - 30 * size,
          50 * size,
          60 * size,
          7
        );
      graphics
        .fillStyle(0xffc928, 0.85)
        .fillRect(x - 25 * size, y - 3, 50 * size, 6);
    } else {
      graphics.lineStyle(6 * size, 0x080b12, 0.85).strokeCircle(x, y, 9 * size);
      graphics.lineStyle(2, 0x444c55, 0.7).strokeCircle(x, y, 9 * size);
    }
  }

  private drawCar(
    graphics: GameObjects.Graphics,
    x: number,
    y: number,
    angle: number,
    length: number,
    width: number,
    body: number,
    accent: number,
    playerCar: boolean,
    kind: EnemyKind | 'player' | 'wreck'
  ): void {
    graphics
      .fillStyle(0x020305, 0.58)
      .fillEllipse(x + 5, y + 7, length * 1.04, width * 1.18);
    const wheelLength = length * 0.23;
    const wheelWidth = Math.max(5, width * 0.22);
    for (const wheelX of [-length * 0.28, length * 0.27]) {
      for (const wheelY of [-width * 0.55, width * 0.55]) {
        this.drawPolygon(
          graphics,
          x,
          y,
          angle,
          [
            wheelX - wheelLength / 2,
            wheelY - wheelWidth / 2,
            wheelX + wheelLength / 2,
            wheelY - wheelWidth / 2,
            wheelX + wheelLength / 2,
            wheelY + wheelWidth / 2,
            wheelX - wheelLength / 2,
            wheelY + wheelWidth / 2,
          ],
          0x05070b,
          0x38414b,
          1.5
        );
      }
    }
    const nose = length * 0.5;
    const tail = -length * 0.5;
    this.drawPolygon(
      graphics,
      x,
      y,
      angle,
      [
        tail,
        -width * 0.37,
        tail + length * 0.13,
        -width * 0.5,
        nose - length * 0.09,
        -width * 0.46,
        nose,
        -width * 0.25,
        nose,
        width * 0.25,
        nose - length * 0.09,
        width * 0.46,
        tail + length * 0.13,
        width * 0.5,
        tail,
        width * 0.37,
      ],
      body,
      0x080b12,
      playerCar ? 3.5 : 2.5
    );
    this.drawPolygon(
      graphics,
      x,
      y,
      angle,
      [
        -length * 0.08,
        -width * 0.34,
        length * 0.25,
        -width * 0.29,
        length * 0.25,
        width * 0.29,
        -length * 0.08,
        width * 0.34,
      ],
      kind === 'wreck' ? 0x1b2026 : 0x172b3a,
      0x080b12,
      2
    );
    this.drawPolygon(
      graphics,
      x,
      y,
      angle,
      [
        -length * 0.2,
        -width * 0.08,
        length * 0.42,
        -width * 0.08,
        length * 0.42,
        width * 0.08,
        -length * 0.2,
        width * 0.08,
      ],
      accent,
      accent,
      0
    );
    if (kind === 'boss') {
      this.drawPolygon(
        graphics,
        x,
        y,
        angle,
        [
          nose - 6,
          -width * 0.6,
          nose + 16,
          -width * 0.36,
          nose + 12,
          -width * 0.18,
        ],
        0xf15bb5,
        0x080b12,
        2
      );
      this.drawPolygon(
        graphics,
        x,
        y,
        angle,
        [
          nose - 6,
          width * 0.6,
          nose + 16,
          width * 0.36,
          nose + 12,
          width * 0.18,
        ],
        0xf15bb5,
        0x080b12,
        2
      );
    }
  }

  private drawPlayerAttachments(
    graphics: GameObjects.Graphics,
    x: number,
    y: number
  ): void {
    const angle = this.player.angle;
    const forwardX = Math.cos(angle);
    const forwardY = Math.sin(angle);
    const rightX = -forwardY;
    const rightY = forwardX;
    const ram = this.upgradeLevels.ram;
    if (ram > 0) {
      const noseX = x + forwardX * (31 + ram * 2);
      const noseY = y + forwardY * (31 + ram * 2);
      graphics
        .lineStyle(4 + ram, 0xffc928, 1)
        .lineBetween(
          noseX - rightX * (15 + ram),
          noseY - rightY * (15 + ram),
          noseX + rightX * (15 + ram),
          noseY + rightY * (15 + ram)
        );
      graphics
        .lineStyle(2, 0x080b12, 1)
        .lineBetween(
          noseX - rightX * (15 + ram),
          noseY - rightY * (15 + ram),
          noseX + rightX * (15 + ram),
          noseY + rightY * (15 + ram)
        );
    }
    const armor = this.upgradeLevels.armor;
    if (armor > 0) {
      for (const side of [-1, 1]) {
        const sideX = x + rightX * side * 18;
        const sideY = y + rightY * side * 18;
        graphics
          .lineStyle(3 + armor, 0x8fa3b8, 0.92)
          .lineBetween(
            sideX - forwardX * 14,
            sideY - forwardY * 14,
            sideX + forwardX * 11,
            sideY + forwardY * 11
          );
      }
    }
    const nailgun = this.upgradeLevels.nailgun;
    if (nailgun > 0) {
      graphics.fillStyle(0x2ef2e2, 1).fillCircle(x, y, 5 + nailgun * 0.5);
      graphics.lineStyle(3, 0x080b12, 1).strokeCircle(x, y, 5 + nailgun * 0.5);
      graphics
        .lineStyle(3, 0x2ef2e2, 1)
        .lineBetween(
          x,
          y,
          x + forwardX * (17 + nailgun * 2),
          y + forwardY * (17 + nailgun * 2)
        );
    }
    const sawLevel = this.upgradeLevels.saws;
    if (sawLevel > 0) {
      const count = 2 + sawLevel;
      const orbit = 46 + sawLevel * 4;
      for (let index = 0; index < count; index += 1) {
        const sawAngle =
          this.elapsed * (2.35 + sawLevel * 0.1) +
          (index / count) * Math.PI * 2;
        const sawX = x + Math.cos(sawAngle) * orbit;
        const sawY = y + Math.sin(sawAngle) * orbit;
        graphics.fillStyle(0xf7f3df, 0.16).fillCircle(sawX, sawY, 16);
        this.drawStar(graphics, sawX, sawY, 8, 13, 7, sawAngle * 2, 0xf7f3df);
        graphics.fillStyle(0x080b12, 1).fillCircle(sawX, sawY, 4);
      }
    }
    if (
      this.player.overdriveTimer > 0 ||
      (this.upgradeLevels.exhaust > 0 &&
        Math.abs(this.player.forwardSpeed) > 80)
    ) {
      const backX = x - forwardX * 31;
      const backY = y - forwardY * 31;
      const flame =
        13 + Math.sin(this.elapsed * 30) * 4 + this.upgradeLevels.exhaust * 2;
      this.drawPolygon(
        graphics,
        backX,
        backY,
        angle,
        [0, -7, -flame, 0, 0, 7],
        this.player.overdriveTimer > 0 ? 0x2ef2e2 : 0xff6b35,
        0x080b12,
        2
      );
    }
  }

  private drawPolygon(
    graphics: GameObjects.Graphics,
    centerX: number,
    centerY: number,
    angle: number,
    coordinates: number[],
    fill: number,
    stroke: number,
    strokeWidth: number
  ): void {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const points: Phaser.Math.Vector2[] = [];
    for (let index = 0; index < coordinates.length - 1; index += 2) {
      const localX = coordinates[index] ?? 0;
      const localY = coordinates[index + 1] ?? 0;
      points.push(
        new Phaser.Math.Vector2(
          centerX + localX * cosine - localY * sine,
          centerY + localX * sine + localY * cosine
        )
      );
    }
    graphics.fillStyle(fill, 1).fillPoints(points, true);
    if (strokeWidth > 0)
      graphics.lineStyle(strokeWidth, stroke, 1).strokePoints(points, true);
  }

  private drawStar(
    graphics: GameObjects.Graphics,
    x: number,
    y: number,
    points: number,
    outer: number,
    inner: number,
    rotation: number,
    color: number
  ): void {
    const coordinates: number[] = [];
    for (let index = 0; index < points * 2; index += 1) {
      const angle = rotation + (index / (points * 2)) * Math.PI * 2;
      const radius = index % 2 === 0 ? outer : inner;
      coordinates.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    this.drawPolygon(graphics, x, y, 0, coordinates, color, 0x080b12, 1.5);
  }

  private renderHud(): void {
    const graphics = this.uiGraphics;
    const width = this.scale.width;
    const height = this.scale.height;
    graphics.clear();
    graphics.fillStyle(0x080b12, 0.82).fillRect(0, 0, width, 8);
    graphics
      .fillStyle(0x2ef2e2, 1)
      .fillRect(
        0,
        0,
        width * clamp(this.player.xp / this.player.nextXp, 0, 1),
        6
      );

    const hpWidth = Math.min(250, width * 0.28);
    graphics
      .fillStyle(0x080b12, 0.84)
      .fillRoundedRect(14, 31, hpWidth + 12, 49, 5);
    graphics.fillStyle(0x31131b, 1).fillRect(20, 61, hpWidth, 8);
    const healthRatio = clamp(this.player.hp / this.player.maxHp, 0, 1);
    graphics
      .fillStyle(healthRatio < 0.3 ? 0xff365e : 0xff6b35, 1)
      .fillRect(20, 61, hpWidth * healthRatio, 8);

    const heatWidth = Math.min(390, width * 0.46);
    const heatX = (width - heatWidth) / 2;
    const heatY = height - (this.showTouchControls ? 32 : 12);
    graphics
      .fillStyle(0x080b12, 0.84)
      .fillRoundedRect(heatX - 6, heatY - 6, heatWidth + 12, 18, 5);
    const heatRatio =
      this.player.overdriveTimer > 0 ? 1 : this.player.heat / 100;
    graphics
      .fillStyle(this.player.overdriveTimer > 0 ? 0x2ef2e2 : 0xffc928, 1)
      .fillRect(heatX, heatY, heatWidth * heatRatio, 6);
    graphics
      .lineStyle(1, 0xf7f3df, 0.35)
      .strokeRect(heatX, heatY, heatWidth, 6);

    if (healthRatio < 0.28) {
      const pulse = 0.12 + (Math.sin(this.elapsed * 7) + 1) * 0.055;
      graphics
        .lineStyle(18, 0xff365e, pulse)
        .strokeRect(5, 5, width - 10, height - 10);
    }
    if (this.showTouchControls && this.mode === 'playing') {
      this.hintText
        .setText('LEFT WHEEL STEERS\nHOLD SHIFTER • TICK LEFT TO DRIFT')
        .setPosition(width / 2, height - (height < 560 ? 174 : 190))
        .setScale(width < 400 ? 0.7 : 0.86)
        .setVisible(this.elapsed < 7);
      this.touchPauseText.setVisible(true);
      this.touchMuteText.setVisible(true);
      this.touchDriveText.setVisible(true);
      this.touchDriftText.setVisible(true);
      this.drawTouchControls(graphics);
    } else {
      this.hintText
        .setText(
          'WASD / ARROWS DRIVE  •  SPACE / L-SHIFT DRIFT  •  P PAUSE  •  M SOUND'
        )
        .setPosition(width / 2, height - 24)
        .setScale(1)
        .setVisible(this.mode === 'playing' && height > 500 && width > 700);
      this.touchPauseText.setVisible(false);
      this.touchMuteText.setVisible(false);
      this.touchDriveText.setVisible(false);
      this.touchDriftText.setVisible(false);
    }
  }

  private drawTouchControls(graphics: GameObjects.Graphics): void {
    const wheelX = this.touchWheelCenterX;
    const wheelY = this.touchWheelCenterY;
    const shifterX = this.touchShifterCenterX;
    const shifterY = this.touchShifterCenterY;
    const wheelHeld = this.touchSteerPointerId >= 0;
    const shifterHeld = this.touchShifterPointerId >= 0;
    this.drawScrapPlate(
      graphics,
      new Phaser.Geom.Rectangle(wheelX - 68, wheelY - 66, 136, 136),
      0x07090a,
      0x2ef2e2,
      0,
      wheelHeld ? 0.94 : 0.84
    );
    this.drawScrapPlate(
      graphics,
      new Phaser.Geom.Rectangle(shifterX - 68, shifterY - 66, 136, 136),
      0x07090a,
      this.touchDrift ? 0xf15bb5 : 0xffc928,
      1,
      shifterHeld ? 0.96 : 0.86
    );

    graphics.fillStyle(0x050608, 0.78).fillCircle(wheelX, wheelY - 4, 51);
    graphics.lineStyle(7, 0x141c22, 0.95).strokeCircle(wheelX, wheelY - 4, 44);
    graphics
      .lineStyle(3, 0x2ef2e2, wheelHeld ? 0.95 : 0.52)
      .strokeCircle(wheelX, wheelY - 4, 47);
    const wheelRotation = this.touchSteer * Math.PI * 0.48;
    graphics.lineStyle(7, 0x8fa3b8, wheelHeld ? 0.9 : 0.66);
    for (let index = 0; index < 3; index += 1) {
      const angle = wheelRotation - Math.PI / 2 + (index * Math.PI * 2) / 3;
      graphics.beginPath();
      graphics.moveTo(
        wheelX + Math.cos(angle) * 11,
        wheelY - 4 + Math.sin(angle) * 11
      );
      graphics.lineTo(
        wheelX + Math.cos(angle) * 39,
        wheelY - 4 + Math.sin(angle) * 39
      );
      graphics.strokePath();
    }
    graphics
      .fillStyle(wheelHeld ? 0x2ef2e2 : 0x26343d, 1)
      .fillCircle(wheelX, wheelY - 4, 13);
    graphics.lineStyle(2, 0xf7f3df, 0.65).strokeCircle(wheelX, wheelY - 4, 13);
    const steerIndicatorX = wheelX + this.touchSteer * 35;
    graphics
      .fillStyle(0x2ef2e2, wheelHeld ? 1 : 0.42)
      .fillTriangle(
        steerIndicatorX - 6,
        wheelY - 58,
        steerIndicatorX + 6,
        wheelY - 58,
        steerIndicatorX,
        wheelY - 50
      );

    const mainGateX = shifterX + 20;
    const driftGateX = shifterX - 31;
    const throttleY = shifterY - 25;
    const idleY = shifterY + 28;
    graphics.lineStyle(16, 0x020304, 0.96).beginPath();
    graphics.moveTo(mainGateX, idleY);
    graphics.lineTo(mainGateX, throttleY);
    graphics.lineTo(driftGateX, throttleY);
    graphics.strokePath();
    graphics
      .lineStyle(4, this.touchDrift ? 0xf15bb5 : 0xffc928, 0.76)
      .beginPath();
    graphics.moveTo(mainGateX, idleY);
    graphics.lineTo(mainGateX, throttleY);
    graphics.lineTo(driftGateX, throttleY);
    graphics.strokePath();
    graphics
      .fillStyle(0xf15bb5, this.touchDrift ? 1 : 0.4)
      .fillCircle(driftGateX, throttleY, 8);
    const shifterKnobX = this.touchDrift ? driftGateX : mainGateX;
    const shifterKnobY = shifterHeld ? throttleY : idleY;
    graphics
      .fillStyle(
        this.touchDrift ? 0xf15bb5 : shifterHeld ? 0xffc928 : 0x26343d,
        1
      )
      .fillCircle(shifterKnobX, shifterKnobY, 20);
    graphics
      .lineStyle(3, 0xf7f3df, shifterHeld ? 0.92 : 0.55)
      .strokeCircle(shifterKnobX, shifterKnobY, 20);
    graphics
      .lineStyle(3, 0x080b12, 0.72)
      .strokeCircle(shifterKnobX, shifterKnobY, 8);
    this.touchDriveText.setText('STEER').setPosition(wheelX, wheelY + 54);
    this.touchDriftText
      .setText(
        this.touchDrift ? 'DRIFT LOCK' : shifterHeld ? 'THROTTLE' : 'HOLD TO GO'
      )
      .setColor(this.touchDrift ? '#f15bb5' : '#ffc928')
      .setPosition(shifterX, shifterY + 54);
    for (const [index, rect] of [
      this.touchPauseRect,
      this.touchMuteRect,
    ].entries()) {
      this.drawScrapPlate(
        graphics,
        rect,
        0x080b12,
        index === 0 ? 0xffc928 : 0x8fa3b8,
        index,
        0.9
      );
    }
  }

  private renderModal(): void {
    const graphics = this.modalGraphics;
    graphics.clear();
    if (this.mode === 'playing') return;
    const width = this.scale.width;
    const height = this.scale.height;
    graphics
      .fillStyle(0x05070b, this.mode === 'paused' ? 0.68 : 0.82)
      .fillRect(0, 0, width, height);
    this.drawModalWorkbench(graphics, width, height);

    if (this.mode === 'levelup') {
      for (let index = 0; index < this.upgradeRects.length; index += 1) {
        const rect = this.upgradeRects[index];
        const choice = this.upgradeChoices[index];
        if (!rect || !choice) continue;
        this.drawPartTag(graphics, rect, choice, index, width < 720);
      }
    } else if (this.mode === 'ended') {
      this.drawResultTicket(graphics);
      for (let index = 0; index < this.voteRects.length; index += 1) {
        const rect = this.voteRects[index];
        if (!rect) continue;
        const ids: BlueprintId[] = ['magnet', 'armor', 'nitro'];
        const colors = [0x2ef2e2, 0x8fa3b8, 0xffc928];
        const selected = this.voteChoice === ids[index];
        this.drawBlueprintSlip(
          graphics,
          rect,
          ids[index] ?? 'magnet',
          colors[index] ?? 0xf7f3df,
          index,
          selected
        );
      }
      this.drawIgnitionButton(graphics, this.replayRect, 0xffc928);
      this.drawScrapPlate(graphics, this.menuRect, 0x101315, 0x8fa3b8, 1, 1);
      if (this.syncRect.width > 0) {
        this.drawScrapPlate(
          graphics,
          this.syncRect,
          0x102126,
          0x2ef2e2,
          2,
          0.98
        );
      }
    }
  }

  private drawModalWorkbench(
    graphics: GameObjects.Graphics,
    width: number,
    height: number
  ): void {
    let board: Phaser.Geom.Rectangle;
    let accent = 0xffc928;
    if (this.mode === 'paused') {
      const boardWidth = Math.min(width - 28, 570);
      const boardHeight = Math.min(height - 32, 230);
      board = new Phaser.Geom.Rectangle(
        (width - boardWidth) / 2,
        (height - boardHeight) / 2,
        boardWidth,
        boardHeight
      );
    } else if (this.mode === 'levelup') {
      const lastRect = this.upgradeRects[this.upgradeRects.length - 1];
      const firstRect = this.upgradeRects[0];
      const boardX = width < 720 ? 6 : Math.max(22, (width - 1140) / 2);
      const boardY = Math.max(
        8,
        (firstRect?.y ?? 90) - (width < 720 ? 70 : 118)
      );
      const boardBottom = Math.min(
        height - 8,
        (lastRect?.bottom ?? height - 30) + 18
      );
      board = new Phaser.Geom.Rectangle(
        boardX,
        boardY,
        width - boardX * 2,
        boardBottom - boardY
      );
      accent = 0xff6b35;
    } else {
      const inset = width < 720 ? 7 : 25;
      board = new Phaser.Geom.Rectangle(
        inset,
        Math.max(7, inset * 0.7),
        width - inset * 2,
        height - Math.max(14, inset * 1.4)
      );
      accent = this.victory ? 0xffc928 : 0xff365e;
    }

    this.drawScrapPlate(graphics, board, 0x17191a, accent, 2, 0.96);
    graphics.lineStyle(5, 0x070809, 0.42);
    graphics.lineBetween(
      board.x + 18,
      board.y + board.height * 0.68,
      board.right - 24,
      board.y + board.height * 0.64
    );
    graphics.lineStyle(1, 0xd7c8a7, 0.12);
    graphics.lineBetween(
      board.x + board.width * 0.14,
      board.y + 18,
      board.x + board.width * 0.72,
      board.bottom - 14
    );
    graphics.lineBetween(
      board.x + board.width * 0.31,
      board.y + 14,
      board.x + board.width * 0.84,
      board.bottom - 20
    );
    const seamWidth = Math.min(110, board.width * 0.28);
    graphics
      .fillStyle(accent, 0.9)
      .fillRect(board.x + 18, board.y + 7, seamWidth, 4);
    for (let index = 0; index < 5; index += 1) {
      const x = board.right - 18 - index * 13;
      graphics.lineStyle(4, index % 2 === 0 ? accent : 0x08090a, 0.76);
      graphics.lineBetween(x - 8, board.y + 7, x, board.y + 15);
    }
  }

  private drawPartTag(
    graphics: GameObjects.Graphics,
    rect: Phaser.Geom.Rectangle,
    choice: UpgradeDefinition,
    index: number,
    compactRow: boolean
  ): void {
    this.drawScrapPlate(graphics, rect, 0x111416, choice.color, index, 0.98);
    graphics
      .fillStyle(choice.color, 0.94)
      .fillRect(rect.x + 12, rect.y + 5, Math.min(68, rect.width * 0.26), 4);

    if (!compactRow) {
      this.drawScrapPlate(
        graphics,
        new Phaser.Geom.Rectangle(rect.x + 14, rect.y + 14, 48, 38),
        0x07090a,
        choice.color,
        index + 1,
        1
      );
    }

    const iconWell = compactRow
      ? new Phaser.Geom.Rectangle(
          rect.x + 8,
          rect.y + 9,
          Math.min(rect.height - 18, this.scale.width < 400 ? 64 : 78),
          rect.height - 18
        )
      : new Phaser.Geom.Rectangle(rect.centerX - 48, rect.y + 20, 96, 92);
    this.drawScrapPlate(
      graphics,
      iconWell,
      0x080a0b,
      choice.color,
      index + 1,
      1
    );
    const iconSize = compactRow
      ? Math.min(iconWell.width, iconWell.height) * 0.66
      : 62;
    this.drawUpgradeIcon(
      graphics,
      choice.id,
      iconWell.centerX,
      iconWell.centerY,
      iconSize,
      choice.color
    );

    const stampWidth = compactRow
      ? Math.min(108, Math.max(80, rect.width * 0.25))
      : 122;
    const stampX = compactRow
      ? iconWell.right + 11
      : rect.centerX - stampWidth / 2;
    const stampY = compactRow ? rect.bottom - 26 : rect.bottom - 35;
    graphics
      .fillStyle(choice.color, 0.11)
      .fillRect(stampX, stampY, stampWidth, compactRow ? 17 : 21);
    graphics
      .lineStyle(1, choice.color, 0.5)
      .strokeRect(stampX, stampY, stampWidth, compactRow ? 17 : 21);
  }

  private drawResultTicket(graphics: GameObjects.Graphics): void {
    if (this.resultTicketRect.width <= 0) return;
    const accent = this.victory ? 0xffc928 : 0xff365e;
    this.drawScrapPlate(
      graphics,
      this.resultTicketRect,
      0x24211b,
      accent,
      0,
      0.98
    );
    const rect = this.resultTicketRect;
    graphics.lineStyle(1, 0xd9c9a4, 0.25);
    graphics.lineBetween(
      rect.x + 15,
      rect.y + rect.height * 0.34,
      rect.right - 15,
      rect.y + rect.height * 0.34
    );
    for (let index = 0; index < 7; index += 1) {
      const y = rect.y + 10 + index * Math.max(7, (rect.height - 20) / 6);
      graphics.fillStyle(0x070809, 0.92).fillRect(rect.x - 1, y, 7, 3);
      graphics.fillStyle(0x070809, 0.92).fillRect(rect.right - 6, y, 7, 3);
    }
  }

  private drawBlueprintSlip(
    graphics: GameObjects.Graphics,
    rect: Phaser.Geom.Rectangle,
    id: BlueprintId,
    color: number,
    index: number,
    selected: boolean
  ): void {
    const fills = [0x102327, 0x202429, 0x282313];
    this.drawScrapPlate(
      graphics,
      rect,
      fills[index] ?? 0x151719,
      color,
      index + 1,
      selected ? 1 : 0.95
    );
    if (selected) {
      graphics.lineStyle(7, color, 0.15);
      this.strokeModalPolygon(graphics, this.scrapPlatePoints(rect, index + 1));
    }
    graphics
      .fillStyle(color, selected ? 1 : 0.7)
      .fillRect(rect.x + 9, rect.y + 5, Math.min(52, rect.width * 0.2), 3);
    const portrait = this.scale.width < 660;
    const iconSize = portrait ? Math.min(38, rect.height * 0.56) : 52;
    this.drawBlueprintIcon(
      graphics,
      id,
      rect.x + (portrait ? 32 : 46),
      rect.centerY,
      iconSize,
      color
    );
  }

  private drawIgnitionButton(
    graphics: GameObjects.Graphics,
    rect: Phaser.Geom.Rectangle,
    color: number
  ): void {
    const points: ModalPoint[] = [
      { x: rect.x + 11, y: rect.y },
      { x: rect.right - 11, y: rect.y },
      { x: rect.right, y: rect.centerY },
      { x: rect.right - 11, y: rect.bottom },
      { x: rect.x + 11, y: rect.bottom },
      { x: rect.x, y: rect.centerY },
    ];
    graphics.fillStyle(0x000000, 0.62);
    this.fillModalPolygon(
      graphics,
      points.map((point) => ({ x: point.x + 4, y: point.y + 5 }))
    );
    graphics.fillStyle(color, 1);
    this.fillModalPolygon(graphics, points);
    graphics.lineStyle(3, 0xf7f3df, 0.88);
    this.strokeModalPolygon(graphics, points);
    graphics.lineStyle(2, 0x080b12, 0.82);
    graphics.strokeRect(
      rect.x + 13,
      rect.y + 6,
      rect.width - 26,
      rect.height - 12
    );
  }

  private drawScrapPlate(
    graphics: GameObjects.Graphics,
    rect: Phaser.Geom.Rectangle,
    fill: number,
    border: number,
    variant = 0,
    alpha = 1
  ): void {
    const points = this.scrapPlatePoints(rect, variant);
    graphics.fillStyle(0x000000, Math.min(0.68, alpha * 0.65));
    this.fillModalPolygon(
      graphics,
      points.map((point) => ({ x: point.x + 4, y: point.y + 5 }))
    );
    graphics.fillStyle(fill, alpha);
    this.fillModalPolygon(graphics, points);
    graphics.lineStyle(rect.height > 80 ? 2 : 1, border, 0.78);
    this.strokeModalPolygon(graphics, points);
    if (rect.height > 32) {
      graphics.lineStyle(1, 0xf7f3df, 0.1);
      graphics.lineBetween(
        rect.x + 10,
        rect.bottom - Math.min(10, rect.height * 0.12),
        rect.right - 12,
        rect.bottom - Math.min(12, rect.height * 0.14)
      );
    }
    const boltRadius = clamp(
      Math.min(rect.width, rect.height) * 0.035,
      1.3,
      2.8
    );
    this.drawPanelBolt(graphics, rect.x + 8, rect.y + 8, boltRadius);
    this.drawPanelBolt(graphics, rect.right - 8, rect.y + 8, boltRadius);
    this.drawPanelBolt(graphics, rect.x + 8, rect.bottom - 8, boltRadius);
    this.drawPanelBolt(graphics, rect.right - 8, rect.bottom - 8, boltRadius);
  }

  private scrapPlatePoints(
    rect: Phaser.Geom.Rectangle,
    variant: number
  ): ModalPoint[] {
    const cut = clamp(Math.min(rect.width, rect.height) * 0.12, 4, 13);
    if (variant % 3 === 1) {
      return [
        { x: rect.x, y: rect.y + cut },
        { x: rect.x + cut, y: rect.y },
        { x: rect.right - 3, y: rect.y + 2 },
        { x: rect.right, y: rect.bottom - cut },
        { x: rect.right - cut, y: rect.bottom },
        { x: rect.x + 3, y: rect.bottom - 2 },
      ];
    }
    if (variant % 3 === 2) {
      return [
        { x: rect.x + cut, y: rect.y },
        { x: rect.right - cut * 0.5, y: rect.y + 2 },
        { x: rect.right, y: rect.y + cut },
        { x: rect.right - 3, y: rect.bottom - 3 },
        { x: rect.x + cut * 0.7, y: rect.bottom },
        { x: rect.x, y: rect.bottom - cut },
        { x: rect.x + 2, y: rect.y + 4 },
      ];
    }
    return [
      { x: rect.x + cut, y: rect.y },
      { x: rect.right - 2, y: rect.y + 2 },
      { x: rect.right, y: rect.y + cut },
      { x: rect.right - cut, y: rect.bottom },
      { x: rect.x + 2, y: rect.bottom - 2 },
      { x: rect.x, y: rect.y + cut },
    ];
  }

  private drawPanelBolt(
    graphics: GameObjects.Graphics,
    x: number,
    y: number,
    radius: number
  ): void {
    graphics.fillStyle(0x050607, 1).fillCircle(x, y, radius + 1);
    graphics.fillStyle(0xa49374, 0.92).fillCircle(x, y, radius);
    graphics.lineStyle(1, 0x332d23, 0.9);
    graphics.lineBetween(x - radius * 0.65, y, x + radius * 0.65, y);
  }

  private fillModalPolygon(
    graphics: GameObjects.Graphics,
    points: ModalPoint[]
  ): void {
    if (points.length < 3) return;
    graphics.beginPath();
    graphics.moveTo(points[0]!.x, points[0]!.y);
    for (let index = 1; index < points.length; index += 1) {
      graphics.lineTo(points[index]!.x, points[index]!.y);
    }
    graphics.closePath();
    graphics.fillPath();
  }

  private strokeModalPolygon(
    graphics: GameObjects.Graphics,
    points: ModalPoint[]
  ): void {
    if (points.length < 2) return;
    graphics.beginPath();
    graphics.moveTo(points[0]!.x, points[0]!.y);
    for (let index = 1; index < points.length; index += 1) {
      graphics.lineTo(points[index]!.x, points[index]!.y);
    }
    graphics.closePath();
    graphics.strokePath();
  }

  private drawUpgradeIcon(
    graphics: GameObjects.Graphics,
    id: UpgradeId,
    x: number,
    y: number,
    size: number,
    color: number
  ): void {
    const half = size / 2;
    const stroke = Math.max(2, size * 0.075);
    graphics.lineStyle(stroke, color, 0.96);
    if (id === 'ram') {
      graphics.lineBetween(
        x - half * 0.72,
        y - half * 0.45,
        x - half * 0.72,
        y + half * 0.42
      );
      graphics.lineBetween(
        x + half * 0.72,
        y - half * 0.45,
        x + half * 0.72,
        y + half * 0.42
      );
      graphics.lineBetween(
        x - half * 0.74,
        y - half * 0.12,
        x + half * 0.74,
        y - half * 0.12
      );
      graphics.lineBetween(x - half * 0.5, y + half * 0.42, x, y + half * 0.05);
      graphics.lineBetween(x + half * 0.5, y + half * 0.42, x, y + half * 0.05);
    } else if (id === 'saws') {
      graphics.strokeCircle(x, y, half * 0.52);
      for (let index = 0; index < 10; index += 1) {
        const angle = (index / 10) * Math.PI * 2;
        graphics.lineBetween(
          x + Math.cos(angle) * half * 0.48,
          y + Math.sin(angle) * half * 0.48,
          x + Math.cos(angle) * half * 0.76,
          y + Math.sin(angle) * half * 0.76
        );
      }
      graphics.fillStyle(0x080a0b, 1).fillCircle(x, y, half * 0.16);
    } else if (id === 'nailgun') {
      graphics.fillStyle(color, 0.9);
      this.fillModalPolygon(graphics, [
        { x: x - half * 0.72, y: y - half * 0.4 },
        { x: x + half * 0.62, y: y - half * 0.28 },
        { x: x + half * 0.72, y: y + half * 0.04 },
        { x: x - half * 0.52, y: y + half * 0.08 },
      ]);
      this.fillModalPolygon(graphics, [
        { x: x - half * 0.3, y: y },
        { x: x + half * 0.05, y: y },
        { x: x - half * 0.02, y: y + half * 0.68 },
        { x: x - half * 0.42, y: y + half * 0.62 },
      ]);
      graphics.lineStyle(Math.max(1, stroke * 0.45), 0xf7f3df, 0.8);
      for (let index = 0; index < 3; index += 1) {
        graphics.lineBetween(
          x + half * (0.55 + index * 0.12),
          y - half * 0.1,
          x + half * (0.88 + index * 0.12),
          y - half * 0.1
        );
      }
    } else if (id === 'exhaust') {
      graphics.lineBetween(
        x - half * 0.5,
        y + half * 0.55,
        x - half * 0.22,
        y - half * 0.42
      );
      graphics.lineBetween(
        x + half * 0.12,
        y + half * 0.55,
        x + half * 0.4,
        y - half * 0.42
      );
      graphics.strokeCircle(x - half * 0.22, y - half * 0.52, half * 0.18);
      graphics.strokeCircle(x + half * 0.4, y - half * 0.52, half * 0.18);
      graphics.fillStyle(0xffc928, 0.92);
      graphics.fillTriangle(
        x - half * 0.64,
        y + half * 0.5,
        x - half * 0.28,
        y + half * 0.18,
        x - half * 0.08,
        y + half * 0.67
      );
    } else if (id === 'engine') {
      graphics
        .fillStyle(color, 0.22)
        .fillRect(x - half * 0.62, y - half * 0.2, half * 1.24, half * 0.75);
      graphics.strokeRect(
        x - half * 0.62,
        y - half * 0.2,
        half * 1.24,
        half * 0.75
      );
      graphics.lineBetween(x - half * 0.66, y - half * 0.65, x, y - half * 0.1);
      graphics.lineBetween(x + half * 0.66, y - half * 0.65, x, y - half * 0.1);
      graphics
        .fillStyle(0x080a0b, 1)
        .fillCircle(x, y + half * 0.3, half * 0.18);
    } else if (id === 'magnet') {
      graphics.lineStyle(stroke * 1.35, color, 0.96).beginPath();
      graphics
        .arc(x, y + half * 0.04, half * 0.52, 0, Math.PI, false)
        .strokePath();
      graphics
        .fillStyle(0xf7f3df, 0.92)
        .fillRect(x - half * 0.64, y - half * 0.6, stroke * 1.25, half * 0.62);
      graphics
        .fillStyle(0xf7f3df, 0.92)
        .fillRect(x + half * 0.43, y - half * 0.6, stroke * 1.25, half * 0.62);
    } else if (id === 'armor') {
      graphics.beginPath();
      graphics.moveTo(x - half * 0.68, y + half * 0.62);
      graphics.lineTo(x - half * 0.52, y - half * 0.52);
      graphics.lineTo(x + half * 0.52, y - half * 0.52);
      graphics.lineTo(x + half * 0.68, y + half * 0.62);
      graphics.strokePath();
      graphics.lineBetween(
        x - half * 0.52,
        y - half * 0.08,
        x + half * 0.58,
        y - half * 0.08
      );
      graphics.lineBetween(
        x - half * 0.5,
        y - half * 0.5,
        x + half * 0.55,
        y + half * 0.58
      );
      graphics.lineBetween(
        x + half * 0.5,
        y - half * 0.5,
        x - half * 0.55,
        y + half * 0.58
      );
    } else if (id === 'chain') {
      graphics.strokeEllipse(
        x - half * 0.25,
        y - half * 0.12,
        half * 0.96,
        half * 0.5
      );
      graphics.strokeEllipse(
        x + half * 0.25,
        y + half * 0.12,
        half * 0.96,
        half * 0.5
      );
      graphics.lineBetween(
        x - half * 0.15,
        y - half * 0.1,
        x + half * 0.15,
        y + half * 0.1
      );
    } else if (id === 'overdrive') {
      graphics.beginPath();
      graphics
        .arc(x, y + half * 0.2, half * 0.66, Math.PI, Math.PI * 2, false)
        .strokePath();
      graphics.lineBetween(x, y + half * 0.2, x + half * 0.48, y - half * 0.28);
      graphics.fillStyle(color, 1).fillCircle(x, y + half * 0.2, half * 0.12);
      for (let index = 0; index < 5; index += 1) {
        const angle = Math.PI + (index / 4) * Math.PI;
        graphics.lineBetween(
          x + Math.cos(angle) * half * 0.5,
          y + half * 0.2 + Math.sin(angle) * half * 0.5,
          x + Math.cos(angle) * half * 0.68,
          y + half * 0.2 + Math.sin(angle) * half * 0.68
        );
      }
    } else {
      graphics.strokeCircle(x - half * 0.12, y - half * 0.08, half * 0.48);
      graphics
        .fillStyle(0x080a0b, 1)
        .fillCircle(x - half * 0.12, y - half * 0.08, half * 0.2);
      graphics.fillStyle(color, 0.9);
      this.fillModalPolygon(graphics, [
        { x: x + half * 0.05, y: y + half * 0.18 },
        { x: x + half * 0.72, y: y + half * 0.02 },
        { x: x + half * 0.56, y: y + half * 0.52 },
        { x: x + half * 0.14, y: y + half * 0.68 },
      ]);
    }
  }

  private drawBlueprintIcon(
    graphics: GameObjects.Graphics,
    id: BlueprintId,
    x: number,
    y: number,
    size: number,
    color: number
  ): void {
    if (id === 'magnet' || id === 'armor') {
      this.drawUpgradeIcon(graphics, id, x, y, size, color);
      return;
    }
    const half = size / 2;
    graphics
      .fillStyle(color, 0.9)
      .fillRect(x - half * 0.28, y - half * 0.42, half * 0.56, half * 0.9);
    graphics
      .fillStyle(0xf7f3df, 0.9)
      .fillRect(x - half * 0.15, y - half * 0.68, half * 0.3, half * 0.28);
    graphics.lineStyle(Math.max(2, size * 0.06), 0x080b12, 0.9);
    graphics.lineBetween(x - half * 0.22, y, x + half * 0.22, y);
    graphics.fillStyle(0xff6b35, 0.95);
    graphics.fillTriangle(
      x - half * 0.3,
      y + half * 0.48,
      x,
      y + half * 0.82,
      x + half * 0.3,
      y + half * 0.48
    );
  }

  private buildLevelUpModal(): void {
    this.clearModal();
    const width = this.scale.width;
    const height = this.scale.height;
    const shortNarrow = width < 360 && height < 650;
    const compactRows = width < 720;
    const titleSize = shortNarrow ? 24 : compactRows ? 32 : 48;
    const titleY = shortNarrow
      ? 33
      : compactRows
        ? height < 600
          ? 38
          : 48
        : height * 0.12;
    this.modalTexts.push(
      this.add
        .text(width / 2, titleY, 'BOLT SOMETHING STUPID ON', {
          fontFamily: 'Impact, Haettenschweiler, sans-serif',
          fontSize: `${titleSize}px`,
          color: '#f7f3df',
          stroke: '#080b12',
          strokeThickness: 8,
          align: 'center',
          ...(shortNarrow
            ? { wordWrap: { width: width - 20, useAdvancedWrap: true } }
            : {}),
        })
        .setOrigin(0.5)
        .setDepth(220)
    );
    const gap = compactRows ? (shortNarrow ? 6 : 8) : 18;
    if (compactRows) {
      const sideInset = width < 400 ? 11 : 16;
      const startY = shortNarrow ? 78 : height < 600 ? 86 : 128;
      const bottomInset = height < 600 ? 18 : 48;
      const maxHeight = shortNarrow ? 104 : height < 600 ? 112 : 118;
      const cardHeight = clamp(
        (height - startY - bottomInset - gap * 2) / 3,
        82,
        maxHeight
      );
      this.upgradeRects = this.upgradeChoices.map(
        (_choice, index) =>
          new Phaser.Geom.Rectangle(
            sideInset,
            startY + index * (cardHeight + gap),
            width - sideInset * 2,
            cardHeight
          )
      );
    } else {
      const totalWidth = Math.min(width - 60, 1030);
      const cardWidth = (totalWidth - gap * 2) / 3;
      const cardHeight = Math.min(270, height * 0.4);
      const startX = (width - totalWidth) / 2;
      const y = height * 0.28;
      this.upgradeRects = this.upgradeChoices.map(
        (_choice, index) =>
          new Phaser.Geom.Rectangle(
            startX + index * (cardWidth + gap),
            y,
            cardWidth,
            cardHeight
          )
      );
    }

    this.upgradeChoices.forEach((choice, index) => {
      const rect = this.upgradeRects[index];
      if (!rect) return;
      const current = this.upgradeLevels[choice.id];
      const mark =
        choice.id === 'repair'
          ? 'FIELD REPAIR'
          : `MARK ${current + 1} / ${choice.max}`;
      if (compactRows) {
        const iconWellWidth = Math.min(rect.height - 18, width < 400 ? 64 : 78);
        const contentX = rect.x + 8 + iconWellWidth + 12;
        const narrow = width < 400;
        const titleFont = narrow ? 16 : 21;
        const copyWidth = Math.max(80, rect.right - contentX - 10);
        this.modalTexts.push(
          this.add
            .text(
              contentX,
              rect.y + rect.height * 0.27,
              `${index + 1} · ${choice.title}`,
              {
                fontFamily: 'Impact, Haettenschweiler, sans-serif',
                fontSize: `${titleFont}px`,
                color: choice.colorCss,
                stroke: '#080b12',
                strokeThickness: narrow ? 3 : 4,
                wordWrap: { width: copyWidth, useAdvancedWrap: true },
              }
            )
            .setOrigin(0, 0.5)
            .setDepth(220),
          this.add
            .text(contentX, rect.y + rect.height * 0.52, choice.promise, {
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: `${narrow ? 10 : 12}px`,
              color: '#f7f3df',
              wordWrap: { width: copyWidth, useAdvancedWrap: true },
            })
            .setOrigin(0, 0.5)
            .setDepth(220),
          this.add
            .text(contentX + 4, rect.bottom - 17.5, mark, {
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: `${narrow ? 9 : 10}px`,
              color: choice.colorCss,
            })
            .setOrigin(0, 0.5)
            .setDepth(220)
        );
      } else {
        this.modalTexts.push(
          this.add
            .text(rect.x + 38, rect.y + 33, `[${index + 1}]`, {
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: '18px',
              fontStyle: 'bold',
              color: '#f7f3df',
              stroke: '#080b12',
              strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(220),
          this.add
            .text(rect.centerX, rect.y + 138, choice.title, {
              fontFamily: 'Impact, Haettenschweiler, sans-serif',
              fontSize: '25px',
              color: choice.colorCss,
              stroke: '#080b12',
              strokeThickness: 5,
              align: 'center',
              wordWrap: { width: rect.width - 24, useAdvancedWrap: true },
            })
            .setOrigin(0.5)
            .setDepth(220),
          this.add
            .text(rect.centerX, rect.y + 178, choice.promise, {
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: '14px',
              color: '#f7f3df',
              align: 'center',
              wordWrap: { width: rect.width - 30, useAdvancedWrap: true },
            })
            .setOrigin(0.5)
            .setDepth(220),
          this.add
            .text(rect.centerX, rect.bottom - 24.5, mark, {
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: '11px',
              color: choice.colorCss,
            })
            .setOrigin(0.5)
            .setDepth(220)
        );
      }
    });
  }

  private buildPauseModal(): void {
    this.clearModal();
    const width = this.scale.width;
    const height = this.scale.height;
    const compact = width < 500;
    this.modalTexts.push(
      this.add
        .text(width / 2, height / 2 - 30, 'ENGINE STALLED', {
          fontFamily: 'Impact, Haettenschweiler, sans-serif',
          fontSize: `${Math.min(62, width * (compact ? 0.12 : 0.1))}px`,
          color: '#ffc928',
          stroke: '#080b12',
          strokeThickness: 8,
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(220),
      this.add
        .text(width / 2, height / 2 + 45, 'PRESS P OR TAP TO GET BACK IN IT', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: `${compact ? 11 : 16}px`,
          color: '#f7f3df',
          align: 'center',
          wordWrap: { width: Math.max(180, width - 56), useAdvancedWrap: true },
        })
        .setOrigin(0.5)
        .setDepth(220)
    );
  }

  private buildResultsModal(): void {
    this.clearModal();
    const width = this.scale.width;
    const height = this.scale.height;
    const portrait = width < 660;
    const shortNarrow = width < 360 && height < 650;
    const titleY = portrait ? 36 : height * 0.078;
    const title = this.victory
      ? 'ROAD KING DETHRONED'
      : 'TOTALLED — BUT NOT FORGOTTEN';
    const titleColor = this.victory ? '#ffc928' : '#ff365e';
    this.modalTexts.push(
      this.add
        .text(width / 2, titleY, title, {
          fontFamily: 'Impact, Haettenschweiler, sans-serif',
          fontSize: `${shortNarrow ? 22 : portrait ? 28 : 48}px`,
          color: titleColor,
          stroke: '#080b12',
          strokeThickness: 8,
          align: 'center',
          ...(shortNarrow
            ? { wordWrap: { width: width - 20, useAdvancedWrap: true } }
            : {}),
        })
        .setOrigin(0.5)
        .setDepth(220)
    );
    const statsY = portrait ? 70 : height * 0.145;
    const syncLine =
      this.runSyncState === 'practice'
        ? 'PRACTICE RUN — RESULTS STAY ON THIS DEVICE'
        : this.runSyncState === 'saved'
          ? 'RESULTS SYNCED TO THE COMMUNITY WRECKPILE'
          : this.runSyncState === 'pending'
            ? 'RADIOING RESULTS TO THE PIT...'
            : this.runSyncState === 'failed'
              ? 'PIT RADIO MISSED IT — RETRY BELOW'
              : 'PACKING THE SCRAP...';
    const standing = this.meta.crewStandings.find(
      (entry) => entry.id === this.crew
    );
    const crewScore =
      standing?.score ?? this.meta.community.crewScores[this.crew] ?? 0;
    const crewRank = standing?.rank ?? 3;
    const delta = (value: number): string =>
      value > 0 ? ` (+${value.toLocaleString()})` : '';
    const pitReport = `${CREW_NAMES[this.crew]} #${crewRank}  ${crewScore.toLocaleString()} PTS${delta(this.crewScoreDelta)}  •  WRECKPILE ${this.meta.community.scrap.toLocaleString()} / ${this.meta.community.target.toLocaleString()}${delta(this.communityScrapDelta)}`;
    const profileReport = `STREAK ${this.meta.profile.streak}D  •  PB ${this.meta.profile.bestScore.toLocaleString()}  •  CAREER ${this.meta.profile.careerWrecks.toLocaleString()} WRECKS`;
    const compactSyncLine =
      this.runSyncState === 'practice'
        ? 'PRACTICE · NO SYNC'
        : this.runSyncState === 'saved'
          ? 'SYNCED'
          : this.runSyncState === 'pending'
            ? 'SYNCING...'
            : this.runSyncState === 'failed'
              ? 'SYNC FAILED — RETRY'
              : 'PACKING...';
    const compactPitReport = `${CREW_NAMES[this.crew].split(' ')[0]} #${crewRank} ${crewScore.toLocaleString()} · PILE ${this.meta.community.scrap.toLocaleString()}/${this.meta.community.target.toLocaleString()}`;
    const resultReport = shortNarrow
      ? `${this.player.score.toLocaleString()} SCORE · ${this.player.kills} WRECKS · x${this.player.bestCombo}\n${this.player.scrap} SCRAP · ${compactSyncLine}\n${compactPitReport}`
      : `${this.player.score.toLocaleString()} SCORE  •  ${this.player.kills} WRECKS  •  x${this.player.bestCombo} BEST COMBO  •  ${this.player.scrap} SCRAP\n${syncLine}\n${pitReport}\n${profileReport}`;
    this.modalTexts.push(
      this.add
        .text(width / 2, statsY, resultReport, {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: `${portrait ? 10 : 13}px`,
          color: '#f7f3df',
          align: 'center',
          lineSpacing: portrait ? 4 : 6,
          wordWrap: { width: width - 34 },
        })
        .setOrigin(0.5, 0)
        .setDepth(220)
    );
    const voteHeadingY = portrait ? 158 : height * 0.37;
    const ticketInset = portrait ? 12 : Math.max(46, width * 0.08);
    this.resultTicketRect.setTo(
      ticketInset,
      statsY - 10,
      width - ticketInset * 2,
      Math.max(58, voteHeadingY - statsY - (portrait ? 14 : 16))
    );
    this.modalTexts.push(
      this.add
        .text(
          width / 2,
          voteHeadingY,
          this.meta.runtimeMode === 'practice'
            ? 'PRACTICE — RELOAD REDDIT TO VOTE'
            : "VOTE: WHAT SHOULD TOMORROW'S GARAGE BUILD?",
          {
            fontFamily: 'Impact, Haettenschweiler, sans-serif',
            fontSize: `${shortNarrow ? 14 : portrait ? 17 : 24}px`,
            color: '#2ef2e2',
            stroke: '#080b12',
            strokeThickness: 5,
            align: 'center',
            ...(shortNarrow
              ? { wordWrap: { width: width - 20, useAdvancedWrap: true } }
              : {}),
          }
        )
        .setOrigin(0.5)
        .setDepth(220)
    );
    const ids: BlueprintId[] = ['magnet', 'armor', 'nitro'];
    const names = ['MAG-CRANE', 'ROLL CAGE', 'NITRO KIT'];
    const promises = ['MORE SCRAP REACH', '+15 STARTING BODY', '+35 TOP SPEED'];
    const colors = ['#2ef2e2', '#8fa3b8', '#ffc928'];
    const tightSyncRetry =
      this.runSyncState === 'failed' && portrait && height < 620;
    const gap = tightSyncRetry ? 6 : shortNarrow ? 6 : portrait ? 8 : 14;
    if (portrait) {
      const cardWidth = width - 34;
      const cardHeight = tightSyncRetry
        ? 58
        : shortNarrow
          ? 60
          : Math.min(86, (height - 300) / 3);
      const voteTop = voteHeadingY + (tightSyncRetry ? 24 : 28);
      this.voteRects = ids.map(
        (_id, index) =>
          new Phaser.Geom.Rectangle(
            17,
            voteTop + index * (cardHeight + gap),
            cardWidth,
            cardHeight
          )
      );
    } else {
      const totalWidth = Math.min(width - 80, 900);
      const cardWidth = (totalWidth - gap * 2) / 3;
      const startX = (width - totalWidth) / 2;
      this.voteRects = ids.map(
        (_id, index) =>
          new Phaser.Geom.Rectangle(
            startX + index * (cardWidth + gap),
            voteHeadingY + 34,
            cardWidth,
            118
          )
      );
    }
    ids.forEach((id, index) => {
      const rect = this.voteRects[index];
      if (!rect) return;
      const selected = this.voteChoice === id;
      const voteStatus = !selected
        ? ''
        : this.voteSyncState === 'saved'
          ? '\nCOUNTED — TAP TO CHANGE'
          : this.voteSyncState === 'pending'
            ? '\nRADIOING...'
            : this.voteSyncState === 'failed'
              ? '\nMISSED — TAP TO RETRY'
              : '';
      const labelX = rect.x + (portrait ? 60 : 82);
      this.modalTexts.push(
        this.add
          .text(
            labelX,
            rect.centerY,
            `${index + 1}  ${names[index]}\n${promises[index]}${voteStatus}`,
            {
              fontFamily: 'Impact, Haettenschweiler, sans-serif',
              fontSize: `${shortNarrow ? 14 : portrait ? 16 : 20}px`,
              color: colors[index] ?? '#f7f3df',
              stroke: '#080b12',
              strokeThickness: 4,
              align: 'left',
              lineSpacing: shortNarrow ? 2 : 5,
              wordWrap: {
                width: Math.max(80, rect.right - labelX - 8),
                useAdvancedWrap: true,
              },
            }
          )
          .setOrigin(0, 0.5)
          .setDepth(220)
      );
    });
    const bottomY = height - (shortNarrow ? 62 : portrait ? 90 : 72);
    const buttonWidth = Math.min(310, width * 0.42);
    this.replayRect.setTo(
      width / 2 - buttonWidth - 7,
      bottomY,
      buttonWidth,
      48
    );
    this.menuRect.setTo(width / 2 + 7, bottomY, buttonWidth, 48);
    if (this.runSyncState === 'failed') {
      const syncWidth = Math.min(width - 44, 420);
      const syncHeight = tightSyncRetry ? 36 : 42;
      this.syncRect.setTo(
        (width - syncWidth) / 2,
        bottomY - (tightSyncRetry ? 48 : 58),
        syncWidth,
        syncHeight
      );
      this.modalTexts.push(
        this.add
          .text(
            this.syncRect.centerX,
            this.syncRect.centerY,
            'RETRY PIT RADIO  [S]',
            {
              fontFamily: 'Impact, Haettenschweiler, sans-serif',
              fontSize: `${tightSyncRetry ? 14 : portrait ? 16 : 20}px`,
              color: '#2ef2e2',
            }
          )
          .setOrigin(0.5)
          .setDepth(220)
      );
    } else {
      this.syncRect.setTo(0, 0, 0, 0);
    }
    this.modalTexts.push(
      this.add
        .text(
          this.replayRect.centerX,
          this.replayRect.centerY,
          'RUN IT BACK  [R]',
          {
            fontFamily: 'Impact, Haettenschweiler, sans-serif',
            fontSize: `${portrait ? 17 : 23}px`,
            color: '#080b12',
          }
        )
        .setOrigin(0.5)
        .setDepth(220),
      this.add
        .text(this.menuRect.centerX, this.menuRect.centerY, 'CREW GARAGE', {
          fontFamily: 'Impact, Haettenschweiler, sans-serif',
          fontSize: `${portrait ? 17 : 23}px`,
          color: '#c7d0d9',
        })
        .setOrigin(0.5)
        .setDepth(220)
    );
  }

  private clearModal(): void {
    for (const text of this.modalTexts) text.destroy();
    this.modalTexts = [];
    this.upgradeRects = [];
    this.voteRects = [];
    this.syncRect.setTo(0, 0, 0, 0);
    this.resultTicketRect.setTo(0, 0, 0, 0);
    this.modalGraphics?.clear();
  }

  private handleNumberChoice(index: number): void {
    if (this.mode === 'levelup') {
      const choice = this.upgradeChoices[index];
      if (choice) this.applyUpgrade(choice);
    } else if (this.mode === 'ended') {
      const blueprints: BlueprintId[] = ['magnet', 'armor', 'nitro'];
      const choice = blueprints[index];
      if (choice) this.castVote(choice);
    }
  }

  private castVote(blueprint: BlueprintId): void {
    if (this.meta.runtimeMode === 'practice') {
      this.popScreenText('PRACTICE — RELOAD REDDIT TO VOTE', '#ff6b35');
      return;
    }
    if (this.voteSyncState === 'pending') return;
    this.voteChoice = blueprint;
    this.voteSyncState = 'pending';
    this.buildResultsModal();
    const token = this.runToken;
    void submitVote(blueprint).then((response) => {
      if (token !== this.runToken || this.mode !== 'ended') return;
      if (response) {
        this.meta = { ...this.meta, blueprintVote: response.vote };
        this.voteSyncState = 'saved';
        this.popScreenText('VOTE COUNTED — CHANGE IT ANY TIME', '#2ef2e2');
      } else {
        this.voteSyncState = 'failed';
        this.popScreenText('VOTE MISSED — TAP CHOICE TO RETRY', '#ff6b35');
      }
      this.buildResultsModal();
    });
  }

  private pointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.mode === 'levelup') {
      const index = this.upgradeRects.findIndex((rect) =>
        rect.contains(pointer.x, pointer.y)
      );
      if (index >= 0) this.handleNumberChoice(index);
      return;
    }
    if (this.mode === 'ended') {
      if (this.syncRect.contains(pointer.x, pointer.y)) {
        this.submitPendingRun();
        return;
      }
      const vote = this.voteRects.findIndex((rect) =>
        rect.contains(pointer.x, pointer.y)
      );
      if (vote >= 0) {
        this.handleNumberChoice(vote);
        return;
      }
      if (this.replayRect.contains(pointer.x, pointer.y)) this.restartRun();
      else if (this.menuRect.contains(pointer.x, pointer.y))
        this.returnToMenu();
      return;
    }
    if (this.mode === 'paused') {
      this.togglePause();
      return;
    }
    if (!this.showTouchControls && !pointer.wasTouch) return;
    this.showTouchControls = true;
    if (this.touchPauseRect.contains(pointer.x, pointer.y)) {
      this.togglePause();
      return;
    }
    if (this.touchMuteRect.contains(pointer.x, pointer.y)) {
      const muted = audio.toggleMute();
      this.popScreenText(muted ? 'SOUND OFF' : 'SOUND ON', '#8fa3b8');
      return;
    }
    if (this.touchWheelRect.contains(pointer.x, pointer.y)) {
      if (
        this.touchSteerPointerId < 0 ||
        this.touchSteerPointerId === pointer.id
      ) {
        this.touchSteerPointerId = pointer.id;
        this.updateTouchSteering(pointer.x);
      }
      return;
    }
    if (this.touchShifterRect.contains(pointer.x, pointer.y)) {
      if (
        this.touchShifterPointerId < 0 ||
        this.touchShifterPointerId === pointer.id
      ) {
        this.touchShifterPointerId = pointer.id;
        this.touchThrottle = true;
        this.updateTouchShifter(pointer.x);
      }
    }
  }

  private pointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.touchSteerPointerId)
      this.updateTouchSteering(pointer.x);
    if (pointer.id === this.touchShifterPointerId)
      this.updateTouchShifter(pointer.x);
  }

  private pointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.touchSteerPointerId) {
      this.touchSteerPointerId = -1;
      this.touchSteer = 0;
    }
    if (pointer.id === this.touchShifterPointerId) {
      this.touchShifterPointerId = -1;
      this.touchThrottle = false;
      this.touchDrift = false;
    }
  }

  private updateTouchSteering(pointerX: number): void {
    const raw = clamp((pointerX - this.touchWheelCenterX) / 52, -1, 1);
    const deadzone = 0.08;
    this.touchSteer =
      Math.abs(raw) <= deadzone
        ? 0
        : Math.sign(raw) * ((Math.abs(raw) - deadzone) / (1 - deadzone));
  }

  private updateTouchShifter(pointerX: number): void {
    this.touchThrottle = true;
    if (this.touchDrift) {
      if (pointerX >= this.touchShifterCenterX + 2) this.touchDrift = false;
    } else if (pointerX <= this.touchShifterCenterX - 14) {
      this.touchDrift = true;
    }
  }

  private resetTouchInput(): void {
    this.touchSteerPointerId = -1;
    this.touchShifterPointerId = -1;
    this.touchSteer = 0;
    this.touchThrottle = false;
    this.touchDrift = false;
  }

  private togglePause(): void {
    if (this.mode === 'playing') {
      this.resetTouchInput();
      this.mode = 'paused';
      audio.stopEngine();
      this.buildPauseModal();
    } else if (this.mode === 'paused') {
      this.clearModal();
      this.mode = 'playing';
    }
  }

  private toggleFullscreen(): void {
    if (this.scale.isFullscreen) this.scale.stopFullscreen();
    else this.scale.startFullscreen();
  }

  private restartRun(): void {
    this.clearModal();
    this.scene.restart({ crew: this.crew, meta: this.meta });
  }

  private returnToMenu(): void {
    this.clearModal();
    this.scene.start('MainMenu');
  }

  private textState(): Record<string, unknown> {
    const nearestEnemies = this.enemies
      .filter((enemy) => enemy.alive)
      .map((enemy) => ({
        enemy,
        distance: Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 18)
      .map(({ enemy, distance }) => ({
        id: enemy.id,
        kind: enemy.kind,
        visualRow: enemy.visualRow,
        damageTier: this.damageTier(enemy.hp, enemy.maxHp),
        x: Math.round(enemy.x),
        y: Math.round(enemy.y),
        relativeX: Math.round(enemy.x - this.player.x),
        relativeY: Math.round(enemy.y - this.player.y),
        distance: Math.round(distance),
        hp: Math.max(0, Math.round(enemy.hp)),
        chargeTelegraphSeconds: Number(enemy.chargeTelegraph.toFixed(2)),
        chargeAngleRadians:
          enemy.kind === 'boss' ? Number(enemy.chargeAngle.toFixed(3)) : null,
      }));
    return {
      mode: this.mode,
      coordinateSystem: `world origin top-left; +x right; +y down; arena ${WORLD_WIDTH}x${WORLD_HEIGHT}`,
      elapsedSeconds: Number(this.elapsed.toFixed(2)),
      remainingSeconds: Math.max(0, Math.ceil(RUN_SECONDS - this.elapsed)),
      wave: this.currentWaveName(),
      crew: this.crew,
      dailyModifier: this.meta.modifier.name,
      dailyModifierId: this.meta.modifier.id,
      arena: {
        id: this.meta.challenge.arena.id,
        name: this.meta.challenge.arena.name,
        inset: this.arenaInset(),
        activeBarrels: this.decorations.filter(
          (decoration) => decoration.alive && decoration.kind === 'barrel'
        ).length,
        primedBarrels: this.decorations.filter(
          (decoration) =>
            decoration.alive &&
            decoration.kind === 'barrel' &&
            decoration.fuse >= 0
        ).length,
        damagedBarrels: this.decorations.filter(
          (decoration) =>
            decoration.alive &&
            decoration.kind === 'barrel' &&
            decoration.hp < decoration.maxHp
        ).length,
        pillars: this.decorations.filter(
          (decoration) => decoration.alive && decoration.kind === 'pillar'
        ).length,
      },
      maxSpeed: Math.round(this.maxSpeed()),
      soundMuted: audio.isMuted(),
      dailyTuning: {
        dangerLevel: Number(this.dangerLevel().toFixed(3)),
        accelerationMultiplier: this.meta.modifier.id === 'redline' ? 1.28 : 1,
        normalGrip: this.meta.modifier.id === 'oil-rain' ? 0.91 : 0.82,
        pickupRadiusBonus: this.meta.modifier.id === 'magnet-storm' ? 120 : 0,
        playerDamageMultiplier:
          this.meta.modifier.id === 'thin-metal' ? 1.35 : 1,
        enemyDamageMultiplier:
          this.meta.modifier.id === 'thin-metal' ? 1.28 : 1,
        eliteExplosions: this.meta.modifier.id === 'volatile-cargo',
        cyclingHazards: this.meta.modifier.id === 'crusher-shift',
      },
      runSyncState: this.runSyncState,
      voteSyncState: this.voteSyncState,
      player: {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        vx: Math.round(this.player.vx),
        vy: Math.round(this.player.vy),
        angleRadians: Number(this.player.angle.toFixed(2)),
        speed: Math.round(Math.hypot(this.player.vx, this.player.vy)),
        hp: Math.ceil(this.player.hp),
        maxHp: this.player.maxHp,
        visualRow: this.crew === 'iron' ? 0 : this.crew === 'neon' ? 1 : 2,
        damageTier: this.damageTier(this.player.hp, this.player.maxHp),
        level: this.player.level,
        xp: this.player.xp,
        nextXp: this.player.nextXp,
        score: this.player.score,
        scrap: this.player.scrap,
        kills: this.player.kills,
        combo: this.player.combo,
        bestCombo: this.player.bestCombo,
        bestWreckChain: this.player.bestWreckChain,
        heat: Math.round(this.player.heat),
        overdriveSeconds: Number(this.player.overdriveTimer.toFixed(2)),
        drifting: this.player.drifting,
        driftIntensity: Number(this.player.driftIntensity.toFixed(2)),
      },
      visibleEnemies: nearestEnemies,
      activeWreckProjectiles: this.wrecks.filter((wreck) => wreck.hot).length,
      nearbyPickups: this.pickups.filter(
        (pickup) =>
          distanceSquared(this.player.x, this.player.y, pickup.x, pickup.y) <
          500 * 500
      ).length,
      repairs: {
        active: this.pickups.filter((pickup) => pickup.kind === 'repair')
          .length,
        persistent: this.pickups.filter(
          (pickup) => pickup.kind === 'repair' && pickup.persistent
        ).length,
        collectible: this.player.hp < this.player.maxHp,
        cases: this.pickups
          .filter((pickup) => pickup.kind === 'repair')
          .slice(0, 6)
          .map((pickup) => ({
            id: pickup.id,
            x: Math.round(pickup.x),
            y: Math.round(pickup.y),
            value: pickup.value,
            persistent: pickup.persistent,
            visualFrame: pickup.visualFrame,
          })),
      },
      visuals: {
        vehicleAtlasLoaded: this.textures.exists(VEHICLE_ATLAS_KEY),
        hazardsAtlasLoaded: this.textures.exists(HAZARDS_ATLAS_KEY),
        playerImages: this.playerVehicleImage ? 1 : 0,
        enemyImages: this.enemyVehicleImages.size,
        wreckImages: this.wreckVehicleImages.size,
        barrelImages: this.barrelImages.size,
        repairImages: this.repairImages.size,
        blastImages: this.blastImages.size,
        activeBlastAnimations: this.blastVisuals.length,
      },
      upgrades: this.upgradeLevels,
      upgradeChoices:
        this.mode === 'levelup'
          ? this.upgradeChoices.map((choice, index) => ({
              number: index + 1,
              id: choice.id,
              title: choice.title,
            }))
          : [],
      controls: {
        drive: 'WASD or arrow keys',
        drift: 'Space or Left Shift',
        pause: 'P',
        sound: 'M',
        fullscreen: 'F',
        choose: '1, 2, 3 or pointer',
        touchControlsVisible: this.showTouchControls,
        touch: this.showTouchControls
          ? 'fixed left steering wheel, hold right shifter for throttle, slide it left for drift'
          : null,
        touchState: this.showTouchControls
          ? {
              wheelHeld: this.touchSteerPointerId >= 0,
              shifterHeld: this.touchShifterPointerId >= 0,
              steer: Number(this.touchSteer.toFixed(3)),
              throttle: this.touchThrottle ? 1 : 0,
              drift: this.touchDrift,
            }
          : null,
      },
    };
  }
}
