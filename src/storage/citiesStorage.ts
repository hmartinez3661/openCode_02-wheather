import type { City } from "../types/City.ts";
import { isFiniteNumber, isRecord } from "../utils/validation.ts";
import { readJsonFile, writeJsonFile } from "./jsonFile.ts";

export interface CitiesData {
  defaultCity: City | null;
  cities: City[];
}

export class CitiesStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CitiesStorageError";
  }
}

export function cityKey(city: City): string {
  const name = city.name.trim().toLocaleLowerCase("es");
  return `${name}|${city.latitude.toFixed(2)}|${city.longitude.toFixed(2)}`;
}

export function sameCity(a: City, b: City): boolean {
  return cityKey(a) === cityKey(b);
}

function parseCity(value: unknown): City | null {
  if (!isRecord(value)) return null;

  const { name, latitude, longitude, country, admin1 } = value;
  if (typeof name !== "string" || name.trim() === "") return null;
  if (!isFiniteNumber(latitude)) return null;
  if (!isFiniteNumber(longitude)) return null;

  const city: City = { name: name.trim(), latitude, longitude };
  if (typeof country === "string" && country.trim() !== "") city.country = country.trim();
  if (typeof admin1 === "string" && admin1.trim() !== "") city.admin1 = admin1.trim();
  return city;
}

export function emptyCitiesData(): CitiesData {
  return { defaultCity: null, cities: [] };
}

export function parseCitiesData(data: unknown): CitiesData {
  if (!isRecord(data)) {
    throw new CitiesStorageError("tiene un formato inesperado");
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

  return { defaultCity, cities };
}

export interface LoadedCities {
  data: CitiesData;
  missing: boolean;
}

export async function loadCities(path: string): Promise<LoadedCities> {
  const raw = await readJsonFile(path);
  if (raw === undefined) {
    return { data: emptyCitiesData(), missing: true };
  }

  return { data: parseCitiesData(raw), missing: false };
}

export async function saveCities(path: string, data: CitiesData): Promise<void> {
  await writeJsonFile(path, { defaultCity: data.defaultCity, cities: data.cities });
}
