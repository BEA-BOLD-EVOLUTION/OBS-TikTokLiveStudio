import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachCopyHandlers } from './copyButtons.js';

function mountButtons(paths: Array<string | null>): HTMLElement {
  const root = document.createElement('div');
  for (const path of paths) {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy path';
    if (path !== null) btn.dataset.copy = path;
    root.appendChild(btn);
  }
  document.body.appendChild(root);
  return root;
}

describe('attachCopyHandlers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('copies the button path and flips the copied state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const root = mountButtons(['config/a.json']);

    attachCopyHandlers(root, { clipboard: { writeText } });
    const button = root.querySelector<HTMLButtonElement>('.copy-btn')!;

    button.click();
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('config/a.json');
    });
    expect(button.dataset.copied).toBe('true');
    expect(button.textContent).toBe('Copied!');
  });

  it('restores original label after the reset window', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const root = mountButtons(['config/a.json']);

    attachCopyHandlers(root, { clipboard: { writeText }, resetMs: 1300 });
    const button = root.querySelector<HTMLButtonElement>('.copy-btn')!;

    button.click();
    await vi.waitFor(() => expect(button.textContent).toBe('Copied!'));

    vi.advanceTimersByTime(1300);
    expect(button.dataset.copied).toBe('false');
    expect(button.textContent).toBe('Copy path');
  });

  it('handles rapid repeat clicks without leaving the button stuck', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const root = mountButtons(['config/a.json']);

    attachCopyHandlers(root, { clipboard: { writeText }, resetMs: 1000 });
    const button = root.querySelector<HTMLButtonElement>('.copy-btn')!;

    button.click();
    await vi.waitFor(() => expect(button.textContent).toBe('Copied!'));

    // Second click mid-window should reset the timer, not capture "Copied!" as the original label.
    vi.advanceTimersByTime(500);
    button.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));

    vi.advanceTimersByTime(1000);
    expect(button.textContent).toBe('Copy path');
    expect(button.dataset.copied).toBe('false');
  });

  it('swallows clipboard failures and logs a warning', async () => {
    const error = new Error('denied');
    const writeText = vi.fn().mockRejectedValue(error);
    const logger = { warn: vi.fn() };
    const root = mountButtons(['config/a.json']);

    attachCopyHandlers(root, { clipboard: { writeText }, logger });
    const button = root.querySelector<HTMLButtonElement>('.copy-btn')!;

    button.click();
    await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());

    expect(button.dataset.copied).not.toBe('true');
    expect(button.textContent).toBe('Copy path');
  });

  it('warns when no clipboard API is available', () => {
    const logger = { warn: vi.fn() };
    const root = mountButtons(['config/a.json']);

    attachCopyHandlers(root, { clipboard: null, logger });
    const button = root.querySelector<HTMLButtonElement>('.copy-btn')!;

    button.click();
    expect(logger.warn).toHaveBeenCalledWith('Clipboard copy failed: no clipboard API available');
  });

  it('ignores buttons that have no data-copy attribute', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const root = mountButtons([null]);

    attachCopyHandlers(root, { clipboard: { writeText } });
    const button = root.querySelector<HTMLButtonElement>('.copy-btn')!;

    button.click();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('attaches to multiple buttons independently', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const root = mountButtons(['a.json', 'b.json']);

    attachCopyHandlers(root, { clipboard: { writeText } });
    const [first, second] = root.querySelectorAll<HTMLButtonElement>('.copy-btn');

    first.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenLastCalledWith('a.json'));
    second.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenLastCalledWith('b.json'));
  });

  it('returns a cleanup function that removes listeners and pending timers', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const root = mountButtons(['a.json']);

    const dispose = attachCopyHandlers(root, { clipboard: { writeText } });
    const button = root.querySelector<HTMLButtonElement>('.copy-btn')!;

    dispose();
    button.click();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('does nothing when no copy buttons are present', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    expect(() => attachCopyHandlers(root)).not.toThrow();
  });
});
