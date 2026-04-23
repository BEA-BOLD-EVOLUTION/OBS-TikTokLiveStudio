import { describe, expect, it } from 'vitest';
import { buildSetupCards, escapeHtml, setupSteps, type SetupStep } from './setupSteps.js';

describe('escapeHtml', () => {
  it.each([
    ['<', '&lt;'],
    ['>', '&gt;'],
    ['&', '&amp;'],
    ['"', '&quot;'],
    ["'", '&#39;'],
  ])('escapes %s', (input, expected) => {
    expect(escapeHtml(input)).toBe(expected);
  });

  it('escapes all dangerous characters in one pass', () => {
    expect(escapeHtml('<img src="x" onerror=\'alert(1)\'>&')).toBe(
      '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;',
    );
  });

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('escapes & first to avoid double-escaping', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });
});

describe('buildSetupCards', () => {
  it('returns empty string for empty steps', () => {
    expect(buildSetupCards([])).toBe('');
  });

  it('numbers cards starting from 1', () => {
    const html = buildSetupCards(setupSteps);
    expect(html).toContain('1. Build your show flow');
    expect(html).toContain('2. Program your Stream Deck moves');
    expect(html).toContain('3. Lock in your go-live routine');
  });

  it('includes a copy button with the file path for each step', () => {
    const html = buildSetupCards(setupSteps);
    for (const step of setupSteps) {
      expect(html).toContain(`data-copy="${step.file}"`);
    }
  });

  it('escapes titles to prevent XSS', () => {
    const malicious: SetupStep = {
      title: '<script>alert(1)</script>',
      subtitle: 'x',
      description: 'y',
      file: 'z',
    };
    const html = buildSetupCards([malicious]);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes file paths used in the data attribute', () => {
    const step: SetupStep = {
      title: 't',
      subtitle: 's',
      description: 'd',
      file: '"><img src=x>',
    };
    const html = buildSetupCards([step]);
    expect(html).not.toContain('"><img src=x>');
    expect(html).toContain('&quot;&gt;&lt;img src=x&gt;');
  });
});

describe('setupSteps data', () => {
  it('has three canonical steps', () => {
    expect(setupSteps).toHaveLength(3);
  });

  it('references the expected config and docs paths', () => {
    const files = setupSteps.map((s) => s.file);
    expect(files).toEqual([
      'config/scenes.example.json',
      'config/streamdeck-links.example.json',
      'docs/obs-tiktok-streamdeck-workflow.md',
    ]);
  });

  it('every step has all required fields populated', () => {
    for (const step of setupSteps) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.subtitle.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
      expect(step.file.length).toBeGreaterThan(0);
    }
  });
});
