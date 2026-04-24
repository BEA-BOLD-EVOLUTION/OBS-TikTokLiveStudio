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
        // Only measure coverage for packages with comprehensive tests
        'packages/streamdeck-plugin/src/**/*.ts',
        'packages/obs-controller/src/**/*.ts',
        // apps/web/src will be added once more UI components have tests
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/index.ts',
        '**/main.ts',
        '**/cli.ts',
        '**/types.ts',
        '**/*.config.ts',
        '**/generated/**',
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
