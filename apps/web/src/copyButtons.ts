const DEFAULT_LABEL = 'Copy path';
const COPIED_LABEL = 'Copied!';
const RESET_MS = 1300;

export interface AttachCopyHandlersOptions {
  resetMs?: number;
  /** Pass `null` to simulate an environment with no clipboard API. */
  clipboard?: Pick<Clipboard, 'writeText'> | null;
  logger?: Pick<Console, 'warn'>;
  setTimeoutFn?: typeof window.setTimeout;
  clearTimeoutFn?: typeof window.clearTimeout;
}

export function attachCopyHandlers(
  root: ParentNode,
  options: AttachCopyHandlersOptions = {},
): () => void {
  const resetMs = options.resetMs ?? RESET_MS;
  const clipboard =
    'clipboard' in options
      ? options.clipboard
      : typeof navigator !== 'undefined'
        ? navigator.clipboard
        : null;
  const logger = options.logger ?? console;
  const setTimeoutFn = options.setTimeoutFn ?? window.setTimeout.bind(window);
  const clearTimeoutFn = options.clearTimeoutFn ?? window.clearTimeout.bind(window);

  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('.copy-btn'));
  const timers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>();
  const originalLabels = new WeakMap<HTMLButtonElement, string>();
  const cleanups: Array<() => void> = [];

  for (const button of buttons) {
    originalLabels.set(button, button.textContent ?? DEFAULT_LABEL);

    const onClick = async () => {
      const path = button.dataset.copy;
      if (!path) {
        return;
      }
      if (!clipboard) {
        logger.warn('Clipboard copy failed: no clipboard API available');
        return;
      }

      try {
        await clipboard.writeText(path);
      } catch (error) {
        logger.warn('Clipboard copy failed:', error);
        return;
      }

      const existing = timers.get(button);
      if (existing !== undefined) {
        clearTimeoutFn(existing);
      }

      button.dataset.copied = 'true';
      button.textContent = COPIED_LABEL;

      const timer = setTimeoutFn(() => {
        button.dataset.copied = 'false';
        button.textContent = originalLabels.get(button) ?? DEFAULT_LABEL;
        timers.delete(button);
      }, resetMs);
      timers.set(button, timer);
    };

    button.addEventListener('click', onClick);
    cleanups.push(() => button.removeEventListener('click', onClick));
  }

  return () => {
    for (const cleanup of cleanups) cleanup();
    for (const button of buttons) {
      const timer = timers.get(button);
      if (timer !== undefined) {
        clearTimeoutFn(timer);
        timers.delete(button);
      }
    }
  };
}
