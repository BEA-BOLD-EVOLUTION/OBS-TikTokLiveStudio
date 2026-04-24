import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'web',
          include: ['apps/web/src/**/*.test.ts'],
          environment: 'happy-dom',
        },
      },
      {
        test: {
          name: 'streamdeck-plugin',
          include: ['packages/streamdeck-plugin/src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'obs-controller',
          include: ['packages/obs-controller/src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'config',
          include: ['config/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'apps/web/src/**/*.ts',
        'packages/streamdeck-plugin/src/**/*.ts',
        'packages/obs-controller/src/**/*.ts',
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
