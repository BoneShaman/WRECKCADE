import * as Phaser from 'phaser';
import { CANVAS, Game as PhaserGame } from 'phaser';
import { MainMenu } from './scenes/MainMenu';
import { Game } from './scenes/Game';

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (milliseconds: number) => void;
    __ramageddonState?: () => Record<string, unknown>;
    __ramageddonAdvance?: (milliseconds: number) => void;
    __ramageddonQA?: {
      jumpToBoss: () => void;
      showBossCharge: () => void;
      defeatBoss: () => void;
      totalPlayer: () => void;
    };
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: CANVAS,
  parent: 'game-container',
  backgroundColor: '#080b12',
  antialias: true,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  input: {
    activePointers: 3,
  },
  scene: [MainMenu, Game],
};

window.render_game_to_text = () =>
  JSON.stringify(
    window.__ramageddonState?.() ?? {
      mode: 'loading',
      coordinateSystem: 'screen origin top-left; +x right; +y down',
    }
  );

window.advanceTime = (milliseconds: number) => {
  window.__ramageddonAdvance?.(Math.max(0, Math.min(30_000, milliseconds)));
};

document.addEventListener('DOMContentLoaded', () => {
  new PhaserGame(config);
});
