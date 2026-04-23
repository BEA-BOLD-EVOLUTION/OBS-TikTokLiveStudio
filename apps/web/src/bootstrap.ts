import { attachCopyHandlers, type AttachCopyHandlersOptions } from './copyButtons.js';
import { renderShell } from './template.js';
import { setupSteps, type SetupStep } from './setupSteps.js';

export class MountNodeMissingError extends Error {
  constructor(selector: string) {
    super(`App mount node "${selector}" was not found.`);
    this.name = 'MountNodeMissingError';
  }
}

export interface BootstrapOptions {
  doc?: Document;
  selector?: string;
  steps?: readonly SetupStep[];
  copyOptions?: AttachCopyHandlersOptions;
}

export function bootstrap(options: BootstrapOptions = {}): () => void {
  const doc = options.doc ?? document;
  const selector = options.selector ?? '#app';
  const steps = options.steps ?? setupSteps;

  const app = doc.querySelector<HTMLElement>(selector);
  if (!app) {
    throw new MountNodeMissingError(selector);
  }

  app.innerHTML = renderShell(steps);
  return attachCopyHandlers(app, options.copyOptions);
}
