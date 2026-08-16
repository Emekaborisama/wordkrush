import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Node-environment suites only — no DOM rendering. UI files are included
    // for their pure helpers (easing, formatting); component rendering is
    // covered by the browser, not here.
    include: [
      'src/game/**/*.test.ts',
      'src/data/**/*.test.ts',
      'src/ui/**/*.test.ts',
      'src/scores/**/*.test.ts',
      'pipeline/**/*.test.ts',
    ],
  },
});
