import { describe, expect, it, vi } from 'vitest';
import { runPluginScaffold } from './index.js';
import {
  ConfigNotFoundError,
  ConfigParseError,
  ConfigReadError,
  ConfigValidationError,
} from './links.js';

type LogSpy = { log: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };

function makeLogger(): LogSpy {
  return { log: vi.fn(), warn: vi.fn() };
}

const validJson = JSON.stringify({
  profileName: 'Main Profile',
  buttons: [
    { key: '1', action: 'switch_scene', scene: 'SCN_STARTING' },
    { key: '2', action: 'switch_scene', scene: 'SCN_LIVE' },
  ],
});

describe('runPluginScaffold', () => {
  it('logs profile and button count on valid config', () => {
    const logger = makeLogger();

    runPluginScaffold({
      configPath: '/fake.json',
      logger,
      deps: { readFile: () => validJson },
    });

    expect(logger.log).toHaveBeenCalledWith('Stream Deck plugin scaffold is running.');
    expect(logger.log).toHaveBeenCalledWith('Profile: Main Profile');
    expect(logger.log).toHaveBeenCalledWith('Mapped buttons: 2');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs a helpful message when the config file is missing', () => {
    const logger = makeLogger();
    const err: NodeJS.ErrnoException = Object.assign(new Error('missing'), {
      code: 'ENOENT',
    });

    runPluginScaffold({
      configPath: '/nope.json',
      logger,
      deps: {
        readFile: () => {
          throw err;
        },
      },
    });

    expect(logger.log).toHaveBeenCalledWith(
      'Config not found yet. Create /nope.json at repo root.',
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns on malformed JSON', () => {
    const logger = makeLogger();

    runPluginScaffold({
      configPath: '/bad.json',
      logger,
      deps: { readFile: () => '{not json' },
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('/bad.json is not valid JSON'),
    );
  });

  it('warns with each issue on schema validation failure', () => {
    const logger = makeLogger();

    runPluginScaffold({
      configPath: '/wrong.json',
      logger,
      deps: {
        readFile: () => JSON.stringify({ profileName: '', buttons: 'no' }),
      },
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('/wrong.json is invalid'),
    );
    const issueLines = logger.warn.mock.calls
      .map((c) => c[0] as unknown)
      .filter((line) => typeof line === 'string' && line.startsWith('  - '));
    expect(issueLines.length).toBeGreaterThanOrEqual(2);
  });

  it('warns on other IO errors (EACCES) without crashing', () => {
    const logger = makeLogger();
    const err: NodeJS.ErrnoException = Object.assign(new Error('denied'), {
      code: 'EACCES',
    });

    runPluginScaffold({
      configPath: '/locked.json',
      logger,
      deps: {
        readFile: () => {
          throw err;
        },
      },
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not read /locked.json'),
    );
  });

  it('falls back to console when no logger is passed', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      runPluginScaffold({
        configPath: '/ok.json',
        deps: { readFile: () => validJson },
      });
      expect(spy).toHaveBeenCalledWith('Profile: Main Profile');
    } finally {
      spy.mockRestore();
    }
  });

  it('uses defaultConfigPath when none is provided', () => {
    const logger = makeLogger();
    let seenPath = '';

    runPluginScaffold({
      logger,
      deps: {
        readFile: (p) => {
          seenPath = p;
          return validJson;
        },
      },
    });

    expect(seenPath).toMatch(/streamdeck-links\.example\.json$/);
  });

  it('exposes distinct error classes for consumers', () => {
    const cases = [
      new ConfigNotFoundError('/a'),
      new ConfigReadError('/b', new Error('x')),
      new ConfigParseError('/c', new Error('x')),
      new ConfigValidationError('/d', ['bad']),
    ];
    const codes = new Set(cases.map((e) => e.code));
    expect(codes.size).toBe(4);
    for (const err of cases) {
      expect(err).toBeInstanceOf(Error);
    }
  });
});
