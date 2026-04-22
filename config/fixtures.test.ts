import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateLinks } from '../packages/streamdeck-plugin/src/links.js';

const here = dirname(fileURLToPath(import.meta.url));

function loadJson(filename: string): unknown {
  return JSON.parse(readFileSync(join(here, filename), 'utf-8'));
}

describe('example config fixtures', () => {
  it('streamdeck-links.example.json parses and passes schema validation', () => {
    const raw = loadJson('streamdeck-links.example.json');
    expect(() => validateLinks(raw)).not.toThrow();
  });

  it('streamdeck-links.example.json lists unique button keys', () => {
    const raw = loadJson('streamdeck-links.example.json') as {
      buttons: Array<{ key: string }>;
    };
    const keys = raw.buttons.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('scenes.example.json has a namingConvention and scenes array', () => {
    const raw = loadJson('scenes.example.json') as {
      namingConvention?: { scenePrefix?: string; sourcePrefix?: string };
      scenes?: Array<{ id: string; label: string; sources: string[] }>;
    };
    expect(raw.namingConvention?.scenePrefix).toBeTruthy();
    expect(raw.namingConvention?.sourcePrefix).toBeTruthy();
    expect(Array.isArray(raw.scenes)).toBe(true);
    expect(raw.scenes!.length).toBeGreaterThan(0);
  });

  it('scenes.example.json scene ids match the configured scenePrefix', () => {
    const raw = loadJson('scenes.example.json') as {
      namingConvention: { scenePrefix: string; sourcePrefix: string };
      scenes: Array<{ id: string; sources: string[] }>;
    };
    const { scenePrefix, sourcePrefix } = raw.namingConvention;
    for (const scene of raw.scenes) {
      expect(scene.id.startsWith(scenePrefix)).toBe(true);
      for (const source of scene.sources) {
        expect(source.startsWith(sourcePrefix)).toBe(true);
      }
    }
  });

  it('streamdeck-links buttons reference scenes that exist in scenes.example.json', () => {
    const links = loadJson('streamdeck-links.example.json') as {
      buttons: Array<{ scene: string }>;
    };
    const scenes = loadJson('scenes.example.json') as {
      scenes: Array<{ id: string }>;
    };
    const sceneIds = new Set(scenes.scenes.map((s) => s.id));
    for (const button of links.buttons) {
      expect(sceneIds.has(button.scene)).toBe(true);
    }
  });
});
