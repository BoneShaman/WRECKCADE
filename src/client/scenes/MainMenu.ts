import * as Phaser from 'phaser';
import { GameObjects, Scene } from 'phaser';
import { audio } from '../systems/AudioDirector';
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
  private graphics: GameObjects.Graphics;
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

  create(): void {
    this.alive = true;
    this.metaReady = false;
    this.cameras.main.setBackgroundColor(0x080b12);
    this.graphics = this.add.graphics();
    this.title = this.add
      .text(0, 0, 'RAMAGEDDON', textStyle(84, '#f7f3df'))
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

    for (const crew of CREWS) {
      this.crewTexts.push(
        this.add
          .text(0, 0, `${crew.name}\n${crew.perk}`, {
            ...textStyle(18, crew.colorCss, 'center'),
            fontFamily: 'Impact, Haettenschweiler, sans-serif',
            lineSpacing: 8,
          })
          .setOrigin(0.5)
      );
    }

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
    this.scale.on('resize', () => this.layout());
    this.events.once('shutdown', () => {
      this.alive = false;
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
    this.draw();
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
        .setPosition(textX, panelY + 244)
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
        ? shortScale * (index === this.selectedCrew ? 0.95 : 0.84)
        : portrait
          ? portraitScale * (index === this.selectedCrew ? 0.72 : 0.64)
          : scale * (index === this.selectedCrew ? 1.04 : 0.9);
      label
        .setPosition(rect.centerX, rect.centerY)
        .setScale(labelScale)
        .setWordWrapWidth(Math.max(80, rect.width / labelScale - 16), true);
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
    this.draw();
  }

  private draw(): void {
    const graphics = this.graphics;
    const width = this.scale.width;
    const height = this.scale.height;
    graphics.clear();
    graphics.fillStyle(0x080b12, 1).fillRect(0, 0, width, height);

    graphics.lineStyle(1, 0x26303b, 0.45);
    const offset = (this.elapsed * 26) % 64;
    for (let x = -height + offset; x < width + height; x += 64) {
      graphics.lineBetween(x, 0, x - height, height);
    }
    graphics
      .fillStyle(0xff6b35, 0.08)
      .fillCircle(width * 0.12, height * 0.15, Math.min(width, height) * 0.28);
    graphics
      .fillStyle(0x2ef2e2, 0.06)
      .fillCircle(width * 0.88, height * 0.75, Math.min(width, height) * 0.34);

    const skidY = Math.min(height * 0.7, 430);
    graphics.lineStyle(9, 0x010204, 0.72);
    graphics.beginPath();
    this.traceSkidCurve(graphics, width, skidY + 36, -40, 70, -24);
    graphics.strokePath();
    graphics.lineStyle(2, 0xffc928, 0.22);
    graphics.beginPath();
    this.traceSkidCurve(graphics, width, skidY + 20, -58, 54, -42);
    graphics.strokePath();

    for (let index = 0; index < this.cardRects.length; index += 1) {
      const rect = this.cardRects[index]!;
      const crew = CREWS[index]!;
      const selected = index === this.selectedCrew;
      graphics
        .fillStyle(selected ? crew.color : 0x111722, selected ? 0.18 : 0.92)
        .fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 8);
      graphics
        .lineStyle(
          selected ? 4 : 2,
          selected ? crew.color : 0x3b4653,
          selected ? 1 : 0.65
        )
        .strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 8);
      if (selected) {
        graphics
          .fillStyle(crew.color, 1)
          .fillRect(rect.x, rect.y, Math.min(92, rect.width * 0.32), 5);
      }
    }

    graphics
      .fillStyle(0x111722, 0.88)
      .fillRoundedRect(
        this.dataRect.x,
        this.dataRect.y,
        this.dataRect.width,
        this.dataRect.height,
        5
      );
    graphics
      .lineStyle(
        1,
        this.deleteConfirmUntil > this.elapsed ? 0xff365e : 0x3b4653,
        0.8
      )
      .strokeRoundedRect(
        this.dataRect.x,
        this.dataRect.y,
        this.dataRect.width,
        this.dataRect.height,
        5
      );

    const action = this.actionRect;
    const pulse = 0.88 + Math.sin(this.elapsed * 4.5) * 0.12;
    graphics
      .fillStyle(
        this.metaReady ? 0xffc928 : 0x5b6470,
        this.metaReady ? pulse : 0.76
      )
      .fillRoundedRect(action.x, action.y, action.width, action.height, 7);
    graphics
      .lineStyle(3, 0xf7f3df, 0.9)
      .strokeRoundedRect(action.x, action.y, action.width, action.height, 7);
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
