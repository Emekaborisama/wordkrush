import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { devvit } from '@devvit/start/vite';

/**
 * The `devvit` plugin reads `devvit.json` and builds both halves: the entry
 * HTML files under `post.entrypoints` become `dist/client`, and the Hono server
 * becomes `dist/server/index.cjs`.
 *
 * No alias config is needed for the shared engine. `src/shared/` imports it by
 * relative path out of this project and into the Expo tree, which Rollup
 * follows on its own; `additionalSourceRoots` in `devvit.json` is what makes
 * those files travel with the app when it is packaged for review.
 */
export default defineConfig({
  plugins: [react(), devvit()],
});
