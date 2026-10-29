import { dirname, join, resolve } from "node:path";

const BUN_EXECUTABLE = /[\\/]bun(?:\.exe)?$/i;

export interface StatePathContext {
  /** Ruta del ejecutable actual; por defecto process.execPath. */
  execPath?: string;
  /** Directorio raíz del proyecto en modo desarrollo. */
  moduleDir?: string;
  /** Override explícito; por defecto WEATHER_CLI_STATE_PATH. */
  envPath?: string;
}

export function isStandaloneExecutable(execPath: string): boolean {
  return !BUN_EXECUTABLE.test(execPath);
}

/**
 * El estado vive junto al binario compilado. En desarrollo (bun run)
 * process.execPath apunta a Bun, así que se usa la raíz del proyecto.
 */
export function resolveStatePath(context: StatePathContext = {}): string {
  const override = context.envPath ?? process.env.WEATHER_CLI_STATE_PATH;
  if (override && override.trim() !== "") {
    return resolve(override);
  }

  const execPath = context.execPath ?? process.execPath;
  const projectRoot = context.moduleDir ?? resolve(import.meta.dir, "..");
  const baseDir = isStandaloneExecutable(execPath) ? dirname(execPath) : projectRoot;

  return join(baseDir, "weather-cli.json");
}
