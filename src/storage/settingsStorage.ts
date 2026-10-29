import type { Settings, TemperatureUnit } from "../types/AppState.ts";
import { isRecord } from "../utils/validation.ts";
import { readJsonFile, writeJsonFile } from "./jsonFile.ts";

export class SettingsStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsStorageError";
  }
}

export const DEFAULT_SETTINGS: Settings = { unit: "celsius" };

export function parseUnit(value: unknown): TemperatureUnit {
  return value === "fahrenheit" ? "fahrenheit" : "celsius";
}

export function parseSettingsData(data: unknown): Settings {
  if (!isRecord(data)) {
    throw new SettingsStorageError("tiene un formato inesperado");
  }

  return { unit: parseUnit(data.unit) };
}

export interface LoadedSettings {
  settings: Settings;
  missing: boolean;
}

export async function loadSettings(path: string): Promise<LoadedSettings> {
  const raw = await readJsonFile(path);
  if (raw === undefined) {
    return { settings: { ...DEFAULT_SETTINGS }, missing: true };
  }

  return { settings: parseSettingsData(raw), missing: false };
}

export async function saveSettings(path: string, settings: Settings): Promise<void> {
  await writeJsonFile(path, { unit: settings.unit });
}
