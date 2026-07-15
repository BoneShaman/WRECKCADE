import * as Phaser from 'phaser';
import { GameObjects, Scene } from 'phaser';
import { audio } from '../systems/AudioDirector';
import {
  bindBootOverlayToLoader,
  hideBootOverlayAfterPaint,
  showBootOverlay,
} from '../systems/bootOverlay';
import {
  deletePlayerData,
  loadCommunityState,
  offlineCommunityState,
  type CommunityState,
  type CrewId,
} from '../systems/community';

type CrewDefinition = {
  id: CrewId;
  name: string;
  motto: string;
  perk: string;
  color: number;
  colorCss: string;
};

type PlatePoint = { x: number; y: number };

const CREWS: CrewDefinition[] = [
  {
    id: 'iron',
    name: 'IRON HOWLERS',
    motto: 'HIT FIRST',
    perk: '+20 BODY · HEAVY RAM',
    color: 0xffc928,
    colorCss: '#ffc928',
  },
  {
    id: 'neon',
    name: 'NEON JACKALS',
    motto: 'DRIFT FOREVER',
    perk: '+GRIP · HOTTER COMBOS',
    color: 0x2ef2e2,
    colorCss: '#2ef2e2',
  },
  {
    id: 'rust',
    name: 'RUST REAPERS',
    motto: 'WRECKS FLY',
    perk: '+LAUNCH · +SCRAP',
    color: 0xff6b35,
    colorCss: '#ff6b35',
  },
];

const GARAGE_BACKDROP_KEY = 'garage-backdrop-v1';
const GARAGE_BACKDROP_URL = new URL(
  '../../../assets/visuals/garage-backdrop-v1.webp',
  import.meta.url
).href;
const GARAGE_BACKDROP_WIDTH = 1536;
const GARAGE_BACKDROP_HEIGHT = 1024;
const GARAGE_BAY_CENTERS = [260, 768, 1276] as const;
const VEHICLE_ATLAS_KEY = 'vehicle-atlas-v1';
const VEHICLE_ATLAS_URL = new URL(
  '../../../assets/visuals/vehicle-atlas-v1.webp',
  import.meta.url
).href;

const textStyle = (
  size: number,
  color: string,
  align: 'left' | 'center' | 'right' = 'left'
): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: 'Impact, Haettenschweiler, sans-serif',
  fontSize: `${size}px`,
  color,
  align,
  stroke: '#080b12',
  strokeThickness: Math.max(2, Math.round(size * 0.11)),
});

export class MainMenu extends Scene {
  private backdrop: GameObjects.Image;
  private graphics: GameObjects.Graphics;
  private crewCarImages: GameObjects.Image[] = [];
  private title: GameObjects.Text;
  private subtitle: GameObjects.Text;
  private dailyTitle: GameObjects.Text;
  private dailyBody: GameObjects.Text;
  private communityText: GameObjects.Text;
  private leaderboardText: GameObjects.Text;
  private profileText: GameObjects.Text;
  private crewTexts: GameObjects.Text[] = [];
  private actionText: GameObjects.Text;
  private dataText: GameObjects.Text;
  private selectedCrew = 0;
  private elapsed = 0;
  private meta: CommunityState = offlineCommunityState();
  private metaReady = false;
  private alive = false;
  private cardRects: Phaser.Geom.Rectangle[] = [];
  private actionRect = new Phaser.Geom.Rectangle();
  private dataRect = new Phaser.Geom.Rectangle();
  private deleteConfirmUntil = 0;
  private deletingData = false;

  constructor() {
    super('MainMenu');
  }

  preload(): void {
    bindBootOverlayToLoader(this.load, 'OPENING CREW GARAGE');
    this.load.image(GARAGE_BACKDROP_KEY, GARAGE_BACKDROP_URL);
    this.load.spritesheet(VEHICLE_ATLAS_KEY, VEHICLE_ATLAS_URL, {
      frameWidth: 128,
      frameHeight: 128,
    });
  }

  create(): void {
    this.alive = true;
    this.metaReady = false;
    this.deleteConfirmUntil = 0;
    this.deletingData = false;
    this.cardRects = [];
    this.cameras.main.setBackgroundColor(0x080b12);
    this.backdrop = this.add
      .image(0, 0, GARAGE_BACKDROP_KEY)
      .setOrigin(0.5)
      .setDepth(-10);
    this.graphics = this.add.graphics();
    this.crewCarImages = CREWS.map((_crew, index) =>
      this.add
        .image(0, 0, VEHICLE_ATLAS_KEY, index * 4)
        .setDepth(2)
        .setVisible(false)
    );
    this.title = this.add
      .text(0, 0, 'WRECKCADE', textStyle(84, '#f7f3df'))
      .setOrigin(0.5);
    this.subtitle = this.add
      .text(0, 0, 'WRECKS BECOME WEAPONS', textStyle(26, '#ffc928', 'center'))
      .setOrigin(0.5);
    this.dailyTitle = this.add.text(
      0,
      0,
      'TODAY // CONNECTING',
      textStyle(22, '#2ef2e2')
    );
    this.dailyBody = this.add.text(0, 0, '', {
      ...textStyle(17, '#f7f3df'),
      fontFamily: 'ui-monospace, Menlo, monospace',
      wordWrap: { width: 380 },
    });
    this.communityText = this.add.text(0, 0, '', {
      ...textStyle(17, '#ffc928'),
      fontFamily: 'ui-monospace, Menlo, monospace',
    });
    this.leaderboardText = this.add.text(0, 0, '', {
      ...textStyle(15, '#c7d0d9'),
      fontFamily: 'ui-monospace, Menlo, monospace',
      lineSpacing: 7,
    });
    this.profileText = this.add.text(0, 0, '', {
      ...textStyle(14, '#f7f3df'),
      fontFamily: 'ui-monospace, Menlo, monospace',
      lineSpacing: 5,
    });
    this.actionText = this.add
      .text(0, 0, 'ENTER THE SCRAPSTORM', textStyle(28, '#080b12', 'center'))
      .setOrigin(0.5)
      .setStroke('#080b12', 0);
    this.dataText = this.add
      .text(0, 0, 'PRIVACY: DELETE MY DATA', {
        ...textStyle(13, '#8fa3b8', 'center'),
        fontFamily: 'ui-monospace, Menlo, monospace',
      })
      .setOrigin(0.5);

    this.crewTexts = CREWS.map((crew) =>
      this.add
        .text(0, 0, `${crew.name}\n${crew.perk}`, {
          ...textStyle(18, crew.colorCss, 'center'),
          fontFamily: 'Impact, Haettenschweiler, sans-serif',
          lineSpacing: 8,
        })
        .setOrigin(0.5)
        .setDepth(3)
    );

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) =>
      this.handlePointer(pointer)
    );
    this.input.keyboard?.on('keydown-ONE', () => this.selectCrew(0));
    this.input.keyboard?.on('keydown-TWO', () => this.selectCrew(1));
    this.input.keyboard?.on('keydown-THREE', () => this.selectCrew(2));
    this.input.keyboard?.on('keydown-LEFT', () =>
      this.selectCrew(this.selectedCrew - 1)
    );
    this.input.keyboard?.on('keydown-RIGHT', () =>
      this.selectCrew(this.selectedCrew + 1)
    );
    this.input.keyboard?.on('keydown-ENTER', () => this.startRun());
    this.input.keyboard?.on('keydown-SPACE', () => this.startRun());
    this.input.keyboard?.on('keydown-D', () => this.handleDataDelete());
    const resizeHandler = (): void => this.layout();
    this.scale.on('resize', resizeHandler);
    this.events.once('shutdown', () => {
      this.alive = false;
      this.scale.off('resize', resizeHandler);
      delete window.__ramageddonState;
      delete window.__ramageddonAdvance;
    });

    this.layout();
    this.refreshMetaText();
    void loadCommunityState().then((meta) => {
      if (!this.alive) return;
      this.meta = meta;
      if (meta.profile.dailyRuns > 0) {
        const lockedCrew = CREWS.findIndex(
          (crew) => crew.id === meta.profile.crew
        );
        if (lockedCrew >= 0) this.selectedCrew = lockedCrew;
      }
      this.metaReady = true;
      this.refreshMetaText();
      this.layout();
    });

    window.__ramageddonState = () => ({
      mode: 'menu',
      coordinateSystem: 'screen origin top-left; +x right; +y down',
      selectedCrew: CREWS[this.selectedCrew]?.id ?? 'iron',
      metaReady: this.metaReady,
      dailyModifier: this.meta.modifier.name,
      communityScrap: this.meta.community.scrap,
      communityTarget: this.meta.community.target,
      profile: {
        bestScore: this.meta.profile.bestScore,
        streak: this.meta.profile.streak,
        careerWrecks: this.meta.profile.careerWrecks,
      },
      crewStandings: this.meta.crewStandings.map((crew) => ({
        id: crew.id,
        rank: crew.rank,
        score: crew.score,
      })),
      controls:
        'Select crew with 1/2/3 or arrows. Enter/Space or tap to start.',
    });
    window.__ramageddonAdvance = (milliseconds: number) => {
      this.elapsed += milliseconds / 1000;
      this.draw();
    };
    hideBootOverlayAfterPaint();
  }

  override update(_time: number, delta: number): void {
    this.elapsed += Math.min(50, delta) / 1000;
    if (
      this.deleteConfirmUntil > 0 &&
      this.elapsed > this.deleteConfirmUntil &&
      !this.deletingData
    ) {
      this.deleteConfirmUntil = 0;
      this.dataText.setText('PRIVACY: DELETE MY DATA');
    }
    this.draw();
  }

  private selectCrew(index: number): void {
    if (!this.metaReady || this.meta.profile.dailyRuns > 0) return;
    this.selectedCrew = (index + CREWS.length) % CREWS.length;
    this.layout();
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (this.dataRect.contains(pointer.x, pointer.y)) {
      this.handleDataDelete();
      return;
    }
    const card = this.cardRects.findIndex((rect) =>
      rect.contains(pointer.x, pointer.y)
    );
    if (card >= 0) {
      if (card === this.selectedCrew) this.startRun();
      else this.selectCrew(card);
      return;
    }
    if (this.actionRect.contains(pointer.x, pointer.y)) this.startRun();
  }

  private startRun(): void {
    if (!this.metaReady) return;
    showBootOverlay('UNLOCKING THE SCRAPSTORM');
    audio.ensure();
    this.scene.start('Game', {
      crew: CREWS[this.selectedCrew]?.id ?? 'iron',
      meta: this.meta,
    });
  }

  private handleDataDelete(): void {
    if (!this.metaReady || this.deletingData) return;
    if (this.deleteConfirmUntil < this.elapsed) {
      this.deleteConfirmUntil = this.elapsed + 5;
      this.dataText.setText('PRESS AGAIN: DELETE PROFILE + DAILY ENTRIES');
      this.draw();
      return;
    }
    this.deletingData = true;
    this.dataText.setText('DELETING REDDIT GAME DATA...');
    void deletePlayerData().then(async (deleted) => {
      if (!this.alive) return;
      this.deletingData = false;
      this.deleteConfirmUntil = 0;
      if (deleted) {
        this.meta = await loadCommunityState();
        if (!this.alive) return;
        this.dataText.setText('DATA DELETED — FRESH GARAGE');
        this.refreshMetaText();
        this.layout();
      } else {
        this.dataText.setText('DELETE FAILED — TAP TO RETRY');
      }
    });
  }

  private refreshMetaText(): void {
    const shortNarrow = this.scale.width < 660 && this.scale.height < 650;
    const practice = this.metaReady && this.meta.runtimeMode === 'practice';
    const remaining = Math.max(
      0,
      this.meta.community.target - this.meta.community.scrap
    );
    this.dailyTitle.setText(
      practice
        ? 'PRACTICE // PIT RADIO OFFLINE'
        : `TODAY // ${this.metaReady ? this.meta.modifier.name : 'TUNING PIT RADIO'}`
    );
    this.dailyBody.setText(
      practice
        ? 'SCORES AND VOTES WILL NOT SYNC.\nRELOAD REDDIT TO RECONNECT.'
        : shortNarrow
          ? `${this.meta.modifier.description}\nYESTERDAY: ${this.meta.communityUpgrade.toUpperCase()} RIG`
          : `${this.meta.modifier.description}\n\nYESTERDAY BUILT: ${this.meta.communityUpgrade.toUpperCase()} RIG`
    );
    this.communityText.setText(
      practice
        ? 'OFFLINE PRACTICE · NO LEADERBOARD'
        : shortNarrow
          ? `WRECKPILE ${this.meta.community.scrap.toLocaleString()} / ${this.meta.community.target.toLocaleString()} · ${remaining.toLocaleString()} TO TIER ${this.meta.community.tier + 1}`
          : `COMMUNITY WRECKPILE  ${this.meta.community.scrap.toLocaleString()} / ${this.meta.community.target.toLocaleString()}\n${remaining.toLocaleString()} SCRAP UNTIL GARAGE TIER ${this.meta.community.tier + 1}`
    );
    const leaders = this.meta.leaderboard.slice(0, 5);
    this.leaderboardText
      .setText(
        practice
          ? 'PRACTICE MODE\nNO LIVE BOARD WHILE PIT RADIO IS OFFLINE.'
          : leaders.length
            ? `TODAY'S ROAD ROYALTY\n${leaders
                .map(
                  (row, index) =>
                    `${index + 1}. ${row.username.slice(0, 16).padEnd(16)} ${row.score.toLocaleString()}`
                )
                .join('\n')}`
            : `TODAY'S ROAD ROYALTY\nTHE ASPHALT IS WAITING.\nBE THE FIRST NAME ON IT.`
      )
      .setVisible(!shortNarrow);
    const profile = this.meta.profile;
    const crewLines = [...this.meta.crewStandings]
      .sort((left, right) => left.rank - right.rank)
      .map((standing) => {
        const marker =
          standing.id === profile.crew && profile.dailyRuns > 0 ? ' ◀ YOU' : '';
        return `${standing.rank}. ${standing.name.toUpperCase().slice(0, 14).padEnd(14)} ${standing.score.toLocaleString()}${marker}`;
      })
      .join('\n');
    this.profileText.setText(
      shortNarrow
        ? `PIT // u/${profile.username} · PB ${profile.bestScore.toLocaleString()} · STREAK ${profile.streak}D\nCAREER ${profile.careerWrecks.toLocaleString()} WRECKS · ${profile.totalScrap.toLocaleString()} SCRAP`
        : `PIT REPORT // u/${profile.username}\nSTREAK ${profile.streak}D  ·  PB ${profile.bestScore.toLocaleString()}  ·  x${profile.bestCombo} COMBO\nCAREER ${profile.careerWrecks.toLocaleString()} WRECKS  ·  ${profile.totalScrap.toLocaleString()} SCRAP\n\nCREW SHOWDOWN\n${crewLines}${profile.dailyRuns > 0 ? '\nDAILY ALLEGIANCE LOCKED' : ''}`
    );
    this.actionText.setText(
      !this.metaReady
        ? 'TUNING PIT RADIO...'
        : practice
          ? 'ENTER PRACTICE — NO SYNC'
          : 'ENTER THE SCRAPSTORM'
    );
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const compact = width < 820 || height < 620;
    const portrait = width < 660 && height >= 650;
    const shortNarrow = width < 660 && height < 650;
    const scale = Math.max(0.7, Math.min(1, width / 1280, height / 720));
    const portraitScale = portrait
      ? Math.max(0.62, Math.min(0.74, width / 560))
      : scale;
    const shortScale = Math.max(0.52, Math.min(0.58, width / 580));
    this.refreshMetaText();
    this.title
      .setPosition(
        width * 0.5,
        shortNarrow ? 43 : portrait ? 58 : compact ? 68 : 82
      )
      .setScale(shortNarrow ? shortScale : portraitScale);
    this.subtitle
      .setPosition(
        width * 0.5,
        shortNarrow ? 82 : portrait ? 112 : compact ? 122 : 148
      )
      .setScale(shortNarrow ? shortScale : portraitScale);

    const panelY = shortNarrow ? 104 : portrait ? 142 : compact ? 158 : 190;
    if (shortNarrow) {
      const textX = 16;
      this.dailyTitle.setPosition(textX, panelY).setScale(shortScale);
      this.dailyBody
        .setPosition(textX, panelY + 22)
        .setScale(shortScale)
        .setWordWrapWidth((width - 32) / shortScale);
      this.communityText.setPosition(textX, panelY + 65).setScale(shortScale);
      this.profileText
        .setPosition(textX, panelY + 88)
        .setScale(shortScale * 0.88);
    } else if (portrait) {
      const textX = 22;
      this.dailyTitle.setPosition(textX, panelY).setScale(portraitScale);
      this.dailyBody
        .setPosition(textX, panelY + 30)
        .setScale(portraitScale)
        .setWordWrapWidth((width - 44) / portraitScale);
      this.communityText
        .setPosition(textX, panelY + 104)
        .setScale(portraitScale);
      this.leaderboardText
        .setPosition(textX, panelY + 160)
        .setScale(portraitScale);
      this.profileText
        .setPosition(textX, panelY + 282)
        .setScale(portraitScale * 0.88);
    } else {
      this.dailyTitle.setPosition(36, panelY).setScale(scale);
      this.dailyBody
        .setPosition(36, panelY + 38)
        .setScale(scale)
        .setWordWrapWidth(380);
      this.communityText
        .setPosition(36, panelY + (compact ? 116 : 150))
        .setScale(scale);
      this.leaderboardText
        .setPosition(
          compact ? width - 300 * scale : width - 430 * scale,
          panelY
        )
        .setScale(scale);
      this.profileText
        .setPosition(
          compact ? width - 300 * scale : width - 430 * scale,
          panelY + (compact ? 108 : 170)
        )
        .setScale(scale);
    }

    const cardY =
      height - (shortNarrow ? 166 : portrait ? 160 : compact ? 160 : 172);
    const dataWidth = Math.min(
      width - (shortNarrow ? 30 : 44),
      360 * (portrait ? 1 : scale)
    );
    this.dataRect.setTo((width - dataWidth) / 2, cardY - 43, dataWidth, 28);
    this.dataText
      .setPosition(this.dataRect.centerX, this.dataRect.centerY)
      .setScale(
        shortNarrow
          ? shortScale * 0.95
          : portrait
            ? 0.68
            : Math.max(0.72, scale)
      );
    const totalWidth = Math.min(width - (shortNarrow ? 30 : 48), 960 * scale);
    const gap = shortNarrow ? 6 : 14 * scale;
    const cardWidth = (totalWidth - gap * 2) / 3;
    const cardHeight = shortNarrow ? 74 : compact ? 78 : 94;
    const startX = (width - totalWidth) / 2;
    this.cardRects = CREWS.map(
      (_crew, index) =>
        new Phaser.Geom.Rectangle(
          startX + index * (cardWidth + gap),
          cardY,
          cardWidth,
          cardHeight
        )
    );
    this.crewTexts.forEach((label, index) => {
      const rect = this.cardRects[index]!;
      const labelScale = shortNarrow
        ? shortScale *
          (width < 360 ? 0.82 : index === this.selectedCrew ? 0.95 : 0.84)
        : portrait
          ? portraitScale * (index === this.selectedCrew ? 0.72 : 0.64)
          : scale * (index === this.selectedCrew ? 1.04 : 0.9);
      label
        .setPosition(rect.centerX, rect.y + rect.height * 0.73)
        .setScale(labelScale)
        .setWordWrapWidth(Math.max(80, rect.width / labelScale - 16), true);
      const selected = index === this.selectedCrew;
      const shortNarrowCarScale = Phaser.Math.Clamp(
        cardWidth / 220,
        0.52,
        0.78
      );
      const carScale =
        (shortNarrow
          ? shortNarrowCarScale
          : portrait
            ? 0.6
            : compact
              ? 0.65
              : 0.82) * (selected ? 1.08 : 0.92);
      this.crewCarImages[index]
        ?.setPosition(rect.centerX, rect.y + rect.height * 0.29)
        .setScale(carScale)
        .setAlpha(selected ? 1 : 0.68)
        .setRotation(index === 0 ? -0.035 : index === 2 ? 0.035 : 0)
        .setVisible(true);
    });

    const actionWidth = Math.min(430, width - (shortNarrow ? 36 : 60));
    this.actionRect.setTo(
      (width - actionWidth) / 2,
      height - 58,
      actionWidth,
      42
    );
    this.actionText
      .setPosition(width / 2, height - 37)
      .setScale(shortNarrow ? 0.62 : portrait ? 0.72 : Math.max(0.75, scale));
    this.layoutBackdrop(width, height);
    this.draw();
  }

  private draw(): void {
    const graphics = this.graphics;
    const width = this.scale.width;
    const height = this.scale.height;
    graphics.clear();
    this.layoutBackdrop(width, height);

    // Let the garage remain a place rather than a wallpaper. These restrained
    // masks reserve contrast for live text while leaving the three crew bays
    // and their practical lighting legible.
    graphics.fillStyle(0x050608, 0.28).fillRect(0, 0, width, height);
    graphics
      .fillStyle(0x050608, 0.34)
      .fillRect(0, 0, width, Math.min(172, height * 0.27));
    graphics
      .fillStyle(0x050608, 0.2)
      .fillRect(
        0,
        Math.max(0, this.cardRects[0]?.y ?? height * 0.68),
        width,
        height
      );

    const skidY = Math.min(height * 0.7, 430);
    graphics.lineStyle(10, 0x010204, 0.58);
    graphics.beginPath();
    this.traceSkidCurve(graphics, width, skidY + 36, -40, 70, -24);
    graphics.strokePath();
    graphics.lineStyle(3, 0x2a2116, 0.5);
    graphics.beginPath();
    this.traceSkidCurve(graphics, width, skidY + 20, -58, 54, -42);
    graphics.strokePath();

    this.drawInformationPanels(graphics, width, height);

    for (let index = 0; index < this.cardRects.length; index += 1) {
      const rect = this.cardRects[index]!;
      const crew = CREWS[index]!;
      const selected = index === this.selectedCrew;
      this.drawCrewPlate(graphics, rect, crew, index, selected, height);
    }

    const dataAlert = this.deleteConfirmUntil > this.elapsed;
    graphics
      .fillStyle(0x050608, 0.78)
      .fillRect(
        this.dataRect.x,
        this.dataRect.y,
        this.dataRect.width,
        this.dataRect.height
      );
    graphics
      .lineStyle(1, dataAlert ? 0xff365e : 0x6b6253, dataAlert ? 1 : 0.8)
      .strokeRect(
        this.dataRect.x,
        this.dataRect.y,
        this.dataRect.width,
        this.dataRect.height
      );
    graphics
      .fillStyle(dataAlert ? 0xff365e : 0x8f7d5d, 0.95)
      .fillRect(this.dataRect.x, this.dataRect.y, 4, this.dataRect.height);
    this.drawBolt(graphics, this.dataRect.x + 8, this.dataRect.centerY, 1.7);
    this.drawBolt(
      graphics,
      this.dataRect.right - 8,
      this.dataRect.centerY,
      1.7
    );

    const action = this.actionRect;
    const pulse = 0.88 + Math.sin(this.elapsed * 4.5) * 0.12;
    const ignitionColor = this.metaReady ? 0xffc928 : 0x5b6470;
    const ignitionPoints = this.ignitionPlatePoints(action);
    graphics.fillStyle(0x000000, 0.52);
    this.fillPolygon(
      graphics,
      ignitionPoints.map((point) => ({ x: point.x + 5, y: point.y + 6 }))
    );
    graphics.fillStyle(ignitionColor, this.metaReady ? pulse : 0.76);
    this.fillPolygon(graphics, ignitionPoints);
    graphics.lineStyle(3, 0xf7f3df, 0.9);
    this.strokePolygon(graphics, ignitionPoints);
    graphics.lineStyle(2, 0x080b12, 0.84);
    graphics.strokeRect(
      action.x + 13,
      action.y + 6,
      action.width - 26,
      action.height - 12
    );
    this.drawIgnitionEnd(graphics, action.x + 9, action.centerY, -1);
    this.drawIgnitionEnd(graphics, action.right - 9, action.centerY, 1);
  }

  private layoutBackdrop(width: number, height: number): void {
    const coverScale = Math.max(
      width / GARAGE_BACKDROP_WIDTH,
      height / GARAGE_BACKDROP_HEIGHT
    );
    const halfWidth = (GARAGE_BACKDROP_WIDTH * coverScale) / 2;
    let x = width / 2;

    // A true cover crop can only show one bay on a phone. Make that crop
    // intentional: the chosen crew's workshop owns the frame.
    if (width / Math.max(1, height) < 0.82) {
      const sourceX = GARAGE_BAY_CENTERS[this.selectedCrew] ?? 768;
      x = width / 2 - (sourceX - GARAGE_BACKDROP_WIDTH / 2) * coverScale;
      x = Phaser.Math.Clamp(x, width - halfWidth, halfWidth);
    }

    this.backdrop.setPosition(x, height / 2).setScale(coverScale);
  }

  private drawInformationPanels(
    graphics: GameObjects.Graphics,
    width: number,
    height: number
  ): void {
    const portrait = width < 660 && height >= 650;
    const shortNarrow = width < 660 && height < 650;
    if (shortNarrow) {
      const panel = this.textPanelBounds(
        [this.dailyTitle, this.dailyBody, this.communityText, this.profileText],
        width,
        height,
        10,
        8
      );
      if (panel) this.drawRivetedPanel(graphics, panel, 0x2ef2e2, 0);
      return;
    }

    if (portrait) {
      const radioPanel = this.textPanelBounds(
        [
          this.dailyTitle,
          this.dailyBody,
          this.communityText,
          this.leaderboardText,
        ],
        width,
        height,
        12,
        10
      );
      const reportPanel = this.textPanelBounds(
        [this.profileText],
        width,
        height,
        12,
        10
      );
      if (radioPanel) this.drawRivetedPanel(graphics, radioPanel, 0x2ef2e2, 0);
      if (reportPanel)
        this.drawRivetedPanel(graphics, reportPanel, 0xffc928, 1);
      return;
    }

    const dailyPanel = this.textPanelBounds(
      [this.dailyTitle, this.dailyBody, this.communityText],
      width,
      height,
      14,
      12
    );
    const pitPanel = this.textPanelBounds(
      [this.leaderboardText, this.profileText],
      width,
      height,
      14,
      12
    );
    if (dailyPanel) this.drawRivetedPanel(graphics, dailyPanel, 0x2ef2e2, 0);
    if (pitPanel) this.drawRivetedPanel(graphics, pitPanel, 0xffc928, 1);
  }

  private textPanelBounds(
    texts: GameObjects.Text[],
    width: number,
    height: number,
    padX: number,
    padY: number
  ): Phaser.Geom.Rectangle | null {
    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    for (const label of texts) {
      if (!label.visible || label.text.length === 0) continue;
      const bounds = label.getBounds();
      left = Math.min(left, bounds.left);
      top = Math.min(top, bounds.top);
      right = Math.max(right, bounds.right);
      bottom = Math.max(bottom, bounds.bottom);
    }
    if (!Number.isFinite(left)) return null;

    const x = Math.max(5, left - padX);
    const y = Math.max(5, top - padY);
    return new Phaser.Geom.Rectangle(
      x,
      y,
      Math.max(40, Math.min(width - 5, right + padX) - x),
      Math.max(28, Math.min(height - 5, bottom + padY) - y)
    );
  }

  private drawRivetedPanel(
    graphics: GameObjects.Graphics,
    rect: Phaser.Geom.Rectangle,
    accent: number,
    variant: number
  ): void {
    const points = this.rivetedPanelPoints(rect, variant);
    graphics.fillStyle(0x000000, 0.58);
    this.fillPolygon(
      graphics,
      points.map((point) => ({ x: point.x + 6, y: point.y + 7 }))
    );
    graphics.fillStyle(0x151719, 0.9);
    this.fillPolygon(graphics, points);
    graphics.lineStyle(2, 0x7b6e5c, 0.9);
    this.strokePolygon(graphics, points);
    graphics.lineStyle(1, 0xd9c9a4, 0.16);
    graphics.lineBetween(
      rect.x + 10,
      rect.y + rect.height * 0.58,
      rect.right - 12,
      rect.y + rect.height * 0.55
    );
    graphics
      .fillStyle(accent, 0.95)
      .fillRect(rect.x + 13, rect.y + 5, Math.min(86, rect.width * 0.3), 4);

    const stripeWidth = Math.min(11, Math.max(6, rect.width * 0.035));
    for (let index = 0; index < 4; index += 1) {
      const stripeX = rect.right - 12 - stripeWidth * (index + 1);
      const stripe = [
        { x: stripeX, y: rect.y + 5 },
        { x: stripeX + stripeWidth * 0.56, y: rect.y + 5 },
        { x: stripeX + stripeWidth, y: rect.y + 9 },
        { x: stripeX + stripeWidth * 0.44, y: rect.y + 9 },
      ];
      graphics.fillStyle(index % 2 === 0 ? accent : 0x090a0b, 0.78);
      this.fillPolygon(graphics, stripe);
    }

    this.drawBolt(graphics, rect.x + 8, rect.y + 9, 2.4);
    this.drawBolt(graphics, rect.right - 8, rect.y + 9, 2.4);
    this.drawBolt(graphics, rect.x + 8, rect.bottom - 8, 2.4);
    this.drawBolt(graphics, rect.right - 8, rect.bottom - 8, 2.4);
  }

  private drawCrewPlate(
    graphics: GameObjects.Graphics,
    rect: Phaser.Geom.Rectangle,
    crew: CrewDefinition,
    index: number,
    selected: boolean,
    height: number
  ): void {
    const platePoints = this.crewPlatePoints(rect, index);
    if (selected) {
      const beamTop = Math.max(height * 0.34, rect.y - 190);
      graphics.fillStyle(crew.color, 0.055);
      this.fillPolygon(graphics, [
        { x: rect.centerX - rect.width * 0.16, y: beamTop },
        { x: rect.centerX + rect.width * 0.16, y: beamTop },
        { x: rect.right + 10, y: rect.bottom + 4 },
        { x: rect.x - 10, y: rect.bottom + 4 },
      ]);
      graphics.lineStyle(10, crew.color, 0.12);
      this.strokePolygon(graphics, platePoints);
    }

    graphics.fillStyle(0x000000, 0.65);
    this.fillPolygon(
      graphics,
      platePoints.map((point) => ({ x: point.x + 4, y: point.y + 5 }))
    );
    graphics.fillStyle(selected ? crew.color : 0x121518, selected ? 0.2 : 0.92);
    this.fillPolygon(graphics, platePoints);
    graphics.lineStyle(selected ? 4 : 2, crew.color, selected ? 1 : 0.52);
    this.strokePolygon(graphics, platePoints);

    graphics
      .fillStyle(crew.color, selected ? 1 : 0.7)
      .fillRect(rect.x + 12, rect.y + 5, Math.min(64, rect.width * 0.32), 4);
    graphics.lineStyle(1, 0xf7f3df, selected ? 0.28 : 0.1);
    graphics.lineBetween(
      rect.x + 12,
      rect.bottom - 8,
      rect.right - 12,
      rect.bottom - 10
    );
    this.drawBolt(graphics, rect.x + 9, rect.y + 10, 2.3);
    this.drawBolt(graphics, rect.right - 10, rect.y + 10, 2.3);
    this.drawBolt(graphics, rect.right - 10, rect.bottom - 10, 2.3);

    if (!selected) return;
    const flicker = 0.55 + Math.sin(this.elapsed * 11 + index * 2.1) * 0.28;
    graphics
      .fillStyle(0x050608, 0.94)
      .fillRect(rect.centerX - 16, rect.y - 10, 32, 6);
    graphics
      .fillStyle(crew.color, 0.72 + flicker * 0.25)
      .fillRect(rect.centerX - 10, rect.y - 8, 20, 2.5);
    graphics.lineStyle(2, crew.color, flicker);
    graphics.lineBetween(
      rect.centerX,
      rect.y - 3,
      rect.centerX - 8 - flicker * 5,
      rect.y - 12 - flicker * 5
    );
    graphics.lineBetween(
      rect.centerX + 2,
      rect.y - 3,
      rect.centerX + 9 + flicker * 4,
      rect.y - 9 - flicker * 7
    );
  }

  private crewPlatePoints(
    rect: Phaser.Geom.Rectangle,
    index: number
  ): PlatePoint[] {
    if (index === 0) {
      return [
        { x: rect.x + 9, y: rect.y },
        { x: rect.right, y: rect.y + 3 },
        { x: rect.right - 7, y: rect.bottom },
        { x: rect.x, y: rect.bottom - 5 },
      ];
    }
    if (index === 1) {
      return [
        { x: rect.x, y: rect.y + 4 },
        { x: rect.right - 7, y: rect.y },
        { x: rect.right, y: rect.bottom - 5 },
        { x: rect.x + 8, y: rect.bottom },
      ];
    }
    return [
      { x: rect.x + 6, y: rect.y },
      { x: rect.right, y: rect.y + 5 },
      { x: rect.right - 3, y: rect.bottom },
      { x: rect.x, y: rect.bottom - 2 },
    ];
  }

  private rivetedPanelPoints(
    rect: Phaser.Geom.Rectangle,
    variant: number
  ): PlatePoint[] {
    const cut = Math.min(12, Math.max(6, rect.height * 0.12));
    return variant === 0
      ? [
          { x: rect.x + cut, y: rect.y },
          { x: rect.right - 4, y: rect.y + 2 },
          { x: rect.right, y: rect.y + cut },
          { x: rect.right - 3, y: rect.bottom - cut },
          { x: rect.right - cut, y: rect.bottom },
          { x: rect.x + 3, y: rect.bottom - 2 },
          { x: rect.x, y: rect.y + cut },
        ]
      : [
          { x: rect.x + 3, y: rect.y + cut },
          { x: rect.x + cut, y: rect.y },
          { x: rect.right - 2, y: rect.y + 3 },
          { x: rect.right, y: rect.bottom - cut },
          { x: rect.right - cut, y: rect.bottom },
          { x: rect.x, y: rect.bottom - 4 },
        ];
  }

  private ignitionPlatePoints(rect: Phaser.Geom.Rectangle): PlatePoint[] {
    const cut = Math.min(12, rect.height * 0.28);
    return [
      { x: rect.x + cut, y: rect.y },
      { x: rect.right - cut, y: rect.y },
      { x: rect.right, y: rect.centerY },
      { x: rect.right - cut, y: rect.bottom },
      { x: rect.x + cut, y: rect.bottom },
      { x: rect.x, y: rect.centerY },
    ];
  }

  private drawIgnitionEnd(
    graphics: GameObjects.Graphics,
    x: number,
    y: number,
    direction: -1 | 1
  ): void {
    graphics.fillStyle(0x080b12, 0.88).fillRect(x - 4, y - 10, 8, 20);
    graphics.lineStyle(2, 0xf7f3df, 0.62);
    graphics.lineBetween(x, y - 7, x + direction * 3, y - 3);
    graphics.lineBetween(x, y, x + direction * 3, y + 4);
  }

  private drawBolt(
    graphics: GameObjects.Graphics,
    x: number,
    y: number,
    radius: number
  ): void {
    graphics.fillStyle(0x08090a, 1).fillCircle(x, y, radius + 1);
    graphics.fillStyle(0xa89779, 0.9).fillCircle(x, y, radius);
    graphics.lineStyle(1, 0x302a21, 0.9);
    graphics.lineBetween(x - radius * 0.65, y, x + radius * 0.65, y);
  }

  private fillPolygon(
    graphics: GameObjects.Graphics,
    points: PlatePoint[]
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

  private strokePolygon(
    graphics: GameObjects.Graphics,
    points: PlatePoint[]
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

  private traceSkidCurve(
    graphics: GameObjects.Graphics,
    width: number,
    startY: number,
    controlY1: number,
    controlY2: number,
    endOffsetY: number
  ): void {
    const startX = -40;
    const endX = width + 50;
    graphics.moveTo(startX, startY);
    for (let step = 1; step <= 30; step += 1) {
      const t = step / 30;
      const inverse = 1 - t;
      const x =
        inverse ** 3 * startX +
        3 * inverse ** 2 * t * width * 0.24 +
        3 * inverse * t ** 2 * width * 0.52 +
        t ** 3 * endX;
      const y =
        inverse ** 3 * startY +
        3 * inverse ** 2 * t * (startY + controlY1) +
        3 * inverse * t ** 2 * (startY + controlY2) +
        t ** 3 * (startY + endOffsetY);
      graphics.lineTo(x, y);
    }
  }
}
