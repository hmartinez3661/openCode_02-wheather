import { dirname, join, resolve } from "node:path";
import { CITIES_FILE, LEGACY_STATE_FILE, SETTINGS_FILE } from "../utils/constants.ts";

const BUN_EXECUTABLE = /[\\/]bun(?:\.exe)?$/i;

export interface StatePathContext {
  /** Ruta del ejecutable actual; por defecto process.execPath. */
  execPath?: string;
  /** Directorio raíz del proyecto en modo desarrollo. */
  moduleDir?: string;
  /** Override del directorio de datos; por defecto WEATHER_CLI_DATA_DIR. */
  envDataDir?: string;
  /** Ruta del archivo anterior; por defecto WEATHER_CLI_STATE_PATH. */
  envLegacyPath?: string;
}

export interface StatePaths {
  cities: string;
  settings: string;
  legacy: string;
}

export function isStandaloneExecutable(execPath: string): boolean {
  return !BUN_EXECUTABLE.test(execPath);
}

/**
 * Los datos viven junto al binario compilado. En desarrollo (bun run)
 * process.execPath apunta a Bun, así que se usa la raíz del proyecto.
 * WEATHER_CLI_DATA_DIR permite mover cities.json y settings.json;
 * WEATHER_CLI_STATE_PATH se conserva para ubicar el weather-cli.json anterior.
 */
export function resolveStatePaths(context: StatePathContext = {}): StatePaths {
  const execPath = context.execPath ?? process.execPath;
  const projectRoot = context.moduleDir ?? resolve(import.meta.dir, "..", "..");
  const defaultDir = isStandaloneExecutable(execPath) ? dirname(execPath) : projectRoot;

  const dataDirOverride = context.envDataDir ?? process.env.WEATHER_CLI_DATA_DIR;
  const legacyOverride = context.envLegacyPath ?? process.env.WEATHER_CLI_STATE_PATH;

  const baseDir = dataDirOverride && dataDirOverride.trim() !== ""
    ? resolve(dataDirOverride)
    : legacyOverride && legacyOverride.trim() !== ""
      ? dirname(resolve(legacyOverride))
      : defaultDir;

  const legacy = legacyOverride && legacyOverride.trim() !== ""
    ? resolve(legacyOverride)
    : join(baseDir, LEGACY_STATE_FILE);

  return {
    cities: join(baseDir, CITIES_FILE),
    settings: join(baseDir, SETTINGS_FILE),
    legacy,
  };
}
