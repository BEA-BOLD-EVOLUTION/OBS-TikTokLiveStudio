import { pathToFileURL } from 'node:url';
import {
  ConfigNotFoundError,
  ConfigParseError,
  ConfigReadError,
  ConfigValidationError,
  defaultConfigPath,
  loadLinks,
  type LoadLinksDeps,
} from './links.js';

export interface RunPluginScaffoldOptions {
  configPath?: string;
  logger?: Pick<Console, 'log' | 'warn'>;
  deps?: LoadLinksDeps;
}

export function runPluginScaffold(options: RunPluginScaffoldOptions = {}): void {
  const configPath = options.configPath ?? defaultConfigPath();
  const logger = options.logger ?? console;

  logger.log('Stream Deck plugin scaffold is running.');
  try {
    const links = loadLinks(configPath, options.deps);
    logger.log(`Profile: ${links.profileName}`);
    logger.log(`Mapped buttons: ${links.buttons.length}`);
  } catch (error) {
    if (error instanceof ConfigNotFoundError) {
      logger.log(`Config not found yet. Create ${configPath} at repo root.`);
      return;
    }
    if (error instanceof ConfigParseError) {
      logger.warn(`Config at ${configPath} is not valid JSON. Fix the file and retry.`);
      return;
    }
    if (error instanceof ConfigValidationError) {
      logger.warn(`Config at ${configPath} is invalid:`);
      for (const issue of error.issues) {
        logger.warn(`  - ${issue}`);
      }
      return;
    }
    if (error instanceof ConfigReadError) {
      logger.warn(
        `Could not read ${configPath}: ${(error.cause as Error)?.message ?? 'unknown error'}`,
      );
      return;
    }
    throw error;
  }
}

export function isMainModule(moduleUrl: string, argv1: string | undefined): boolean {
  if (!argv1) return false;
  return moduleUrl === pathToFileURL(argv1).href;
}

if (isMainModule(import.meta.url, process.argv[1])) {
  runPluginScaffold();
}
