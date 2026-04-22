import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface StreamdeckButton {
  key: string;
  action: string;
  scene: string;
}

export interface StreamdeckLinks {
  profileName: string;
  buttons: StreamdeckButton[];
}

export class ConfigNotFoundError extends Error {
  readonly code = 'CONFIG_NOT_FOUND';
  constructor(public readonly path: string, cause?: unknown) {
    super(`Streamdeck config not found at ${path}`);
    this.name = 'ConfigNotFoundError';
    if (cause !== undefined) this.cause = cause;
  }
}

export class ConfigReadError extends Error {
  readonly code = 'CONFIG_READ_ERROR';
  constructor(public readonly path: string, cause: unknown) {
    super(`Failed to read streamdeck config at ${path}`);
    this.name = 'ConfigReadError';
    this.cause = cause;
  }
}

export class ConfigParseError extends Error {
  readonly code = 'CONFIG_PARSE_ERROR';
  constructor(public readonly path: string, cause: unknown) {
    super(`Streamdeck config at ${path} is not valid JSON`);
    this.name = 'ConfigParseError';
    this.cause = cause;
  }
}

export class ConfigValidationError extends Error {
  readonly code = 'CONFIG_VALIDATION_ERROR';
  constructor(
    public readonly path: string,
    public readonly issues: string[],
  ) {
    super(`Streamdeck config at ${path} failed validation: ${issues.join('; ')}`);
    this.name = 'ConfigValidationError';
  }
}

export function defaultConfigPath(cwd: string = process.cwd()): string {
  return join(cwd, '..', '..', 'config', 'streamdeck-links.example.json');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateLinks(input: unknown, path = '<unknown>'): StreamdeckLinks {
  const issues: string[] = [];

  if (!isPlainObject(input)) {
    throw new ConfigValidationError(path, ['root must be an object']);
  }

  if (typeof input.profileName !== 'string' || input.profileName.length === 0) {
    issues.push('profileName must be a non-empty string');
  }

  if (!Array.isArray(input.buttons)) {
    issues.push('buttons must be an array');
  } else {
    input.buttons.forEach((button, index) => {
      if (!isPlainObject(button)) {
        issues.push(`buttons[${index}] must be an object`);
        return;
      }
      for (const field of ['key', 'action', 'scene'] as const) {
        if (typeof button[field] !== 'string' || (button[field] as string).length === 0) {
          issues.push(`buttons[${index}].${field} must be a non-empty string`);
        }
      }
    });
  }

  if (issues.length > 0) {
    throw new ConfigValidationError(path, issues);
  }

  return input as unknown as StreamdeckLinks;
}

export function parseLinks(content: string, path = '<unknown>'): StreamdeckLinks {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (error) {
    throw new ConfigParseError(path, error);
  }
  return validateLinks(raw, path);
}

export interface LoadLinksDeps {
  readFile?: (path: string) => string;
}

export function loadLinks(path: string, deps: LoadLinksDeps = {}): StreamdeckLinks {
  const read = deps.readFile ?? ((p: string) => readFileSync(p, 'utf-8'));
  let content: string;
  try {
    content = read(path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      throw new ConfigNotFoundError(path, error);
    }
    throw new ConfigReadError(path, error);
  }
  return parseLinks(content, path);
}
