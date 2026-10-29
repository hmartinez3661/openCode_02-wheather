import type { City, TemperatureUnit } from "./state.ts";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const REQUEST_TIMEOUT_MS = 10_000;

export interface Weather {
  temperature: number;
  apparentTemperature: number | null;
}

export class WeatherApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function requestJson(url: URL, fetchImpl: typeof fetch): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new WeatherApiError("No se pudo conectar con OpenMeteo. Revisa tu conexión a internet.");
  }

  if (!response.ok) {
    throw new WeatherApiError(`OpenMeteo respondió con error HTTP ${response.status}.`);
  }

  try {
    return await response.json();
  } catch {
    throw new WeatherApiError("OpenMeteo devolvió una respuesta no válida.");
  }
}

export async function geocodeCity(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<City | null> {
  const name = query.trim();
  if (name === "") return null;

  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");

  const data = await requestJson(url, fetchImpl);
  if (!isRecord(data) || !Array.isArray(data.results)) return null;

  const result = data.results[0];
  if (!isRecord(result)) return null;

  const { name: cityName, latitude, longitude, country, admin1 } = result;
  if (typeof cityName !== "string" || cityName.trim() === "") return null;
  if (typeof latitude !== "number" || !Number.isFinite(latitude)) return null;
  if (typeof longitude !== "number" || !Number.isFinite(longitude)) return null;

  const city: City = { name: cityName.trim(), latitude, longitude };
  if (typeof country === "string" && country.trim() !== "") city.country = country.trim();
  if (typeof admin1 === "string" && admin1.trim() !== "") city.admin1 = admin1.trim();
  return city;
}

export async function getWeather(
  city: Pick<City, "latitude" | "longitude">,
  unit: TemperatureUnit,
  fetchImpl: typeof fetch = fetch,
): Promise<Weather> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(city.latitude));
  url.searchParams.set("longitude", String(city.longitude));
  url.searchParams.set("current", "temperature_2m,apparent_temperature");
  if (unit === "fahrenheit") {
    url.searchParams.set("temperature_unit", "fahrenheit");
  }

  const data = await requestJson(url, fetchImpl);
  if (!isRecord(data) || !isRecord(data.current)) {
    throw new WeatherApiError("OpenMeteo devolvió una respuesta inesperada.");
  }

  const { temperature_2m: temperature, apparent_temperature: apparentTemperature } = data.current;
  if (typeof temperature !== "number" || !Number.isFinite(temperature)) {
    throw new WeatherApiError("OpenMeteo no devolvió la temperatura actual.");
  }

  return {
    temperature,
    apparentTemperature:
      typeof apparentTemperature === "number" && Number.isFinite(apparentTemperature)
        ? apparentTemperature
        : null,
  };
}
