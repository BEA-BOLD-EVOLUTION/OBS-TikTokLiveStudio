import { describe, expect, it } from 'vitest';
import { renderShell } from './template.js';
import { setupSteps } from './setupSteps.js';

describe('renderShell', () => {
  it('renders hero, setup grid, help, and next sections', () => {
    const host = document.createElement('div');
    host.innerHTML = renderShell();

    expect(host.querySelector('section.hero')).not.toBeNull();
    expect(host.querySelector('section.grid')).not.toBeNull();
    expect(host.querySelector('section.help')).not.toBeNull();
    expect(host.querySelector('section.next')).not.toBeNull();
  });

  it('renders one card per step by default', () => {
    const host = document.createElement('div');
    host.innerHTML = renderShell();
    expect(host.querySelectorAll('.card').length).toBe(setupSteps.length);
  });

  it('includes inline styles', () => {
    expect(renderShell()).toContain('<style>');
  });

  it('renders the expected grid when passed custom steps', () => {
    const host = document.createElement('div');
    host.innerHTML = renderShell([
      { title: 'X', subtitle: 'S', description: 'D', file: 'f' },
      { title: 'Y', subtitle: 'S2', description: 'D2', file: 'f2' },
    ]);
    expect(host.querySelectorAll('.card').length).toBe(2);
  });
});
