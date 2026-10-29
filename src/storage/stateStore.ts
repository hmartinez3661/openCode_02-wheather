import type { AppState } from "../types/AppState.ts";
import { errorMessage } from "../utils/errors.ts";
import {
  emptyCitiesData,
  loadCities,
  parseCitiesData,
  saveCities,
  type CitiesData,
} from "./citiesStorage.ts";
import { readJsonFile } from "./jsonFile.ts";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  parseSettingsData,
  saveSettings,
  type LoadedSettings,
} from "./settingsStorage.ts";
import type { StatePaths } from "./statePath.ts";

export interface LoadedAppState {
  state: AppState;
  warnings: string[];
}

export function createEmptyState(): AppState {
  return { defaultCity: null, cities: [], unit: DEFAULT_SETTINGS.unit };
}

async function loadCitiesSafely(
  path: string,
  warnings: string[],
): Promise<{ data: CitiesData; missing: boolean }> {
  try {
    return await loadCities(path);
  } catch (error) {
    warnings.push(
      `La configuración de ciudades (${path}) está dañada y se ignoró: ${errorMessage(error)}`,
    );
    return { data: emptyCitiesData(), missing: false };
  }
}

async function loadSettingsSafely(path: string, warnings: string[]): Promise<LoadedSettings> {
  try {
    return await loadSettings(path);
  } catch (error) {
    warnings.push(
      `La configuración de ajustes (${path}) está dañada y se ignoró: ${errorMessage(error)}`,
    );
    return { settings: { ...DEFAULT_SETTINGS }, missing: false };
  }
}

async function migrateLegacyState(
  paths: StatePaths,
  warnings: string[],
): Promise<AppState | null> {
  let raw: unknown;
  try {
    raw = await readJsonFile(paths.legacy);
  } catch (error) {
    warnings.push(
      `La configuración anterior (${paths.legacy}) está dañada y se ignoró: ${errorMessage(error)}`,
    );
    return null;
  }

  if (raw === undefined) return null;

  let state: AppState;
  try {
    const cities = parseCitiesData(raw);
    const settings = parseSettingsData(raw);
    state = { ...cities, unit: settings.unit };
  } catch (error) {
    warnings.push(
      `La configuración anterior (${paths.legacy}) está dañada y se ignoró: ${errorMessage(error)}`,
    );
    return null;
  }

  try {
    await saveAppState(state, paths);
  } catch (error) {
    warnings.push(`No se pudo migrar la configuración anterior: ${errorMessage(error)}`);
  }

  return state;
}

export async function loadAppState(paths: StatePaths): Promise<LoadedAppState> {
  const warnings: string[] = [];
  const cities = await loadCitiesSafely(paths.cities, warnings);
  const settings = await loadSettingsSafely(paths.settings, warnings);

  if (cities.missing && settings.missing) {
    const migrated = await migrateLegacyState(paths, warnings);
    if (migrated) return { state: migrated, warnings };
  }

  return {
    state: {
      defaultCity: cities.data.defaultCity,
      cities: cities.data.cities,
      unit: settings.settings.unit,
    },
    warnings,
  };
}

export async function saveAppState(state: AppState, paths: StatePaths): Promise<void> {
  await saveCities(paths.cities, { defaultCity: state.defaultCity, cities: state.cities });
  await saveSettings(paths.settings, { unit: state.unit });
}
