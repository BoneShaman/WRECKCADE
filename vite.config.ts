import { defineConfig } from 'vite';
import { devvit } from '@devvit/start/vite';

export default defineConfig({
  // RAMAGEDDON is entirely procedural. Do not ship the starter template's
  // unused public assets (including Reddit-owned sample artwork).
  publicDir: false,
  plugins: [
    devvit({
      client: {
        build: {
          chunkSizeWarningLimit: 2000,
        },
      },
    }),
  ],
});
