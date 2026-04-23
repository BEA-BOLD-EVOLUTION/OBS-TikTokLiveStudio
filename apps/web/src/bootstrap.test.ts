import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrap, MountNodeMissingError } from './bootstrap.js';

describe('bootstrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('throws MountNodeMissingError if the mount selector is missing', () => {
    expect(() => bootstrap({ selector: '#missing' })).toThrow(MountNodeMissingError);
  });

  it('includes the selector in the error message', () => {
    try {
      bootstrap({ selector: '#nope' });
      expect.fail('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(MountNodeMissingError);
      expect((error as Error).message).toContain('#nope');
    }
  });

  it('renders the shell into the mount node', () => {
    const root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);

    bootstrap({
      copyOptions: { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } },
    });

    expect(root.querySelector('.hero h1')?.textContent).toContain('Set up your live show controls');
    expect(root.querySelectorAll('.card').length).toBe(3);
  });

  it('wires copy buttons on the rendered output', async () => {
    const root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);
    const writeText = vi.fn().mockResolvedValue(undefined);

    bootstrap({ copyOptions: { clipboard: { writeText } } });

    const firstButton = root.querySelector<HTMLButtonElement>('.copy-btn')!;
    firstButton.click();

    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('config/scenes.example.json');
    });
  });

  it('returns a dispose function', () => {
    const root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);

    const dispose = bootstrap({
      copyOptions: { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } },
    });
    expect(typeof dispose).toBe('function');
  });

  it('accepts a custom selector and step list', () => {
    const root = document.createElement('div');
    root.id = 'custom';
    document.body.appendChild(root);

    bootstrap({
      selector: '#custom',
      steps: [{ title: 'Only step', subtitle: 'Solo', description: 'desc', file: 'f.json' }],
      copyOptions: { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } },
    });

    expect(root.querySelectorAll('.card').length).toBe(1);
    expect(root.textContent).toContain('Only step');
  });
});
