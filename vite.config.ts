import { defineConfig } from 'vite';
import { devvit } from '@devvit/start/vite';

export default defineConfig({
  // WRECKCADE imports only its documented original environment/audio assets.
  // Do not ship the starter template's unused public assets (including
  // Reddit-owned sample artwork).
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
