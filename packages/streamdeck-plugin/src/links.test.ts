import { describe, expect, it } from 'vitest';
import {
  ConfigNotFoundError,
  ConfigParseError,
  ConfigReadError,
  ConfigValidationError,
  defaultConfigPath,
  loadLinks,
  parseLinks,
  validateLinks,
} from './links.js';

const validLinks = {
  profileName: 'Main Profile',
  buttons: [
    { key: '1', action: 'switch_scene', scene: 'SCN_STARTING' },
    { key: '2', action: 'switch_scene', scene: 'SCN_LIVE' },
  ],
};

describe('validateLinks', () => {
  it('accepts a well-formed config', () => {
    expect(validateLinks(validLinks)).toEqual(validLinks);
  });

  it('accepts an empty buttons array', () => {
    expect(validateLinks({ profileName: 'Empty', buttons: [] })).toEqual({
      profileName: 'Empty',
      buttons: [],
    });
  });

  it.each([
    ['null', null],
    ['array root', [1, 2]],
    ['primitive', 42],
    ['string', 'nope'],
  ])('rejects non-object root (%s)', (_label, value) => {
    expect(() => validateLinks(value)).toThrow(ConfigValidationError);
  });

  it('rejects missing profileName', () => {
    const err = captureValidation({ buttons: [] });
    expect(err.issues).toContain('profileName must be a non-empty string');
  });

  it('rejects empty profileName', () => {
    const err = captureValidation({ profileName: '', buttons: [] });
    expect(err.issues).toContain('profileName must be a non-empty string');
  });

  it('rejects non-string profileName', () => {
    const err = captureValidation({ profileName: 123, buttons: [] });
    expect(err.issues).toContain('profileName must be a non-empty string');
  });

  it('rejects non-array buttons', () => {
    const err = captureValidation({ profileName: 'ok', buttons: 'no' });
    expect(err.issues).toContain('buttons must be an array');
  });

  it('rejects buttons with missing fields', () => {
    const err = captureValidation({
      profileName: 'ok',
      buttons: [{ key: '1', action: 'switch_scene' }],
    });
    expect(err.issues).toEqual(
      expect.arrayContaining(['buttons[0].scene must be a non-empty string']),
    );
  });

  it('rejects buttons with wrong types', () => {
    const err = captureValidation({
      profileName: 'ok',
      buttons: [{ key: 1, action: 'switch_scene', scene: 'A' }],
    });
    expect(err.issues).toEqual(
      expect.arrayContaining(['buttons[0].key must be a non-empty string']),
    );
  });

  it('rejects non-object button entries', () => {
    const err = captureValidation({
      profileName: 'ok',
      buttons: ['nope', null],
    });
    expect(err.issues).toEqual(
      expect.arrayContaining(['buttons[0] must be an object', 'buttons[1] must be an object']),
    );
  });

  it('reports multiple issues at once', () => {
    const err = captureValidation({
      profileName: '',
      buttons: [{ key: '', action: '', scene: '' }],
    });
    expect(err.issues.length).toBeGreaterThan(1);
  });

  it('attaches the config path to the error', () => {
    const err = captureValidation({ profileName: '', buttons: [] }, '/tmp/x.json');
    expect(err.path).toBe('/tmp/x.json');
  });
});

describe('parseLinks', () => {
  it('parses valid JSON and returns links', () => {
    expect(parseLinks(JSON.stringify(validLinks))).toEqual(validLinks);
  });

  it('throws ConfigParseError on malformed JSON', () => {
    expect(() => parseLinks('{not json', '/fake.json')).toThrow(ConfigParseError);
  });

  it('throws ConfigValidationError when JSON shape is wrong', () => {
    expect(() => parseLinks(JSON.stringify({ profileName: 'x' }))).toThrow(ConfigValidationError);
  });
});

describe('loadLinks', () => {
  it('reads, parses, and validates in one call', () => {
    const readFile = () => JSON.stringify(validLinks);
    expect(loadLinks('/fake.json', { readFile })).toEqual(validLinks);
  });

  it('throws ConfigNotFoundError when file is missing (ENOENT)', () => {
    const readFile = () => {
      const err: NodeJS.ErrnoException = Object.assign(new Error('missing'), {
        code: 'ENOENT',
      });
      throw err;
    };
    expect(() => loadLinks('/missing.json', { readFile })).toThrow(ConfigNotFoundError);
  });

  it('throws ConfigReadError for other IO errors (EACCES)', () => {
    const readFile = () => {
      const err: NodeJS.ErrnoException = Object.assign(new Error('denied'), {
        code: 'EACCES',
      });
      throw err;
    };
    expect(() => loadLinks('/denied.json', { readFile })).toThrow(ConfigReadError);
  });

  it('throws ConfigReadError for non-Error throws', () => {
    const readFile = () => {
      throw 'weird';
    };
    expect(() => loadLinks('/w.json', { readFile })).toThrow(ConfigReadError);
  });

  it('propagates ConfigParseError when content is bad JSON', () => {
    const readFile = () => '{{';
    expect(() => loadLinks('/bad.json', { readFile })).toThrow(ConfigParseError);
  });
});

describe('defaultConfigPath', () => {
  it('resolves relative to a module anchor, walking up three levels to config/', () => {
    // e.g. packages/streamdeck-plugin/src/links.ts -> repo root -> config/
    const result = defaultConfigPath('/repo/packages/streamdeck-plugin/src/links.ts');
    expect(result.replace(/\\/g, '/')).toBe('/repo/config/streamdeck-links.example.json');
  });

  it('accepts a file:// URL anchor', () => {
    const result = defaultConfigPath('file:///repo/packages/streamdeck-plugin/dist/index.js');
    expect(result.replace(/\\/g, '/')).toBe('/repo/config/streamdeck-links.example.json');
  });

  it('uses this module as the default anchor', () => {
    const result = defaultConfigPath();
    expect(result).toMatch(/[\\/]config[\\/]streamdeck-links\.example\.json$/);
    // Must resolve to the real repo config, not something under cwd.
    expect(result).not.toMatch(/[\\/]packages[\\/]streamdeck-plugin[\\/]/);
  });
});

function captureValidation(value: unknown, path?: string): ConfigValidationError {
  try {
    validateLinks(value, path);
  } catch (error) {
    if (error instanceof ConfigValidationError) return error;
    throw error;
  }
  throw new Error('expected ConfigValidationError');
}
