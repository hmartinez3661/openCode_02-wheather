import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveStatePath } from "./config.ts";

export type TemperatureUnit = "celsius" | "fahrenheit";

export interface City {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

export interface AppState {
  defaultCity: City | null;
  cities: City[];
  unit: TemperatureUnit;
}

export interface LoadStateResult {
  state: AppState;
  warning?: string;
}

export class StateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StateError";
  }
}

export function createEmptyState(): AppState {
  return { defaultCity: null, cities: [], unit: "celsius" };
}

export function cityKey(city: City): string {
  const name = city.name.trim().toLocaleLowerCase("es");
  return `${name}|${city.latitude.toFixed(2)}|${city.longitude.toFixed(2)}`;
}

export function sameCity(a: City, b: City): boolean {
  return cityKey(a) === cityKey(b);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCity(value: unknown): City | null {
  if (!isRecord(value)) return null;

  const { name, latitude, longitude, country, admin1 } = value;
  if (typeof name !== "string" || name.trim() === "") return null;
  if (typeof latitude !== "number" || !Number.isFinite(latitude)) return null;
  if (typeof longitude !== "number" || !Number.isFinite(longitude)) return null;

  const city: City = { name: name.trim(), latitude, longitude };
  if (typeof country === "string" && country.trim() !== "") city.country = country.trim();
  if (typeof admin1 === "string" && admin1.trim() !== "") city.admin1 = admin1.trim();
  return city;
}

export function parseState(raw: string): AppState {
  let data: unknown;
  try {
    data = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    throw new StateError("El archivo de configuración no contiene JSON válido.");
  }

  if (!isRecord(data)) {
    throw new StateError("El archivo de configuración tiene un formato inesperado.");
  }

  const cities: City[] = [];
  const seen = new Set<string>();
  if (Array.isArray(data.cities)) {
    for (const candidate of data.cities) {
      const city = parseCity(candidate);
      if (!city) continue;

      const key = cityKey(city);
      if (seen.has(key)) continue;
      seen.add(key);
      cities.push(city);
    }
  }

  const storedDefault = parseCity(data.defaultCity);
  const defaultCity = storedDefault
    ? cities.find((city) => sameCity(city, storedDefault)) ?? null
    : null;

  return {
    defaultCity,
    cities,
    unit: data.unit === "fahrenheit" ? "fahrenheit" : "celsius",
  };
}

export async function loadState(path: string = resolveStatePath()): Promise<LoadStateResult> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return { state: createEmptyState() };
    }
    return {
      state: createEmptyState(),
      warning: `No se pudo leer la configuración (${path}): ${errorMessage(error)}`,
    };
  }

  try {
    return { state: parseState(raw) };
  } catch (error) {
    return {
      state: createEmptyState(),
      warning: `La configuración (${path}) está dañada y se ignoró: ${errorMessage(error)}`,
    };
  }
}

export async function saveState(state: AppState, path: string = resolveStatePath()): Promise<void> {
  await mkdir(dirname(path), { recursive: true });

  const temporaryPath = `${path}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(temporaryPath, path);
}

function isErrnoException(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
