import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['apps/web/**', 'happy-dom'],
    ],
    include: [
      'apps/web/src/**/*.test.ts',
      'packages/streamdeck-plugin/src/**/*.test.ts',
      'config/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'apps/web/src/**/*.ts',
        'packages/streamdeck-plugin/src/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        'apps/web/src/main.ts',
        'packages/streamdeck-plugin/src/index.ts',
      ],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
});
