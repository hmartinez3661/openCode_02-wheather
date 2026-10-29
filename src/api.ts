import type { City, TemperatureUnit } from "./state.ts";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const REQUEST_TIMEOUT_MS = 10_000;

export interface Weather {
  temperature: number;
  apparentTemperature: number | null;
}

export interface ForecastDay {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number | null;
  precipitationProbability: number | null;
}

export interface Forecast {
  days: ForecastDay[];
}

const FORECAST_DAYS = 7;

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

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function getForecast(
  city: Pick<City, "latitude" | "longitude">,
  unit: TemperatureUnit,
  fetchImpl: typeof fetch = fetch,
): Promise<Forecast> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(city.latitude));
  url.searchParams.set("longitude", String(city.longitude));
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
  );
  url.searchParams.set("forecast_days", String(FORECAST_DAYS));
  url.searchParams.set("timezone", "auto");
  if (unit === "fahrenheit") {
    url.searchParams.set("temperature_unit", "fahrenheit");
  }

  const data = await requestJson(url, fetchImpl);
  if (!isRecord(data) || !isRecord(data.daily)) {
    throw new WeatherApiError("OpenMeteo devolvió una respuesta inesperada.");
  }

  const { daily } = data;
  const times = daily.time;
  const maximums = daily.temperature_2m_max;
  const minimums = daily.temperature_2m_min;
  if (!Array.isArray(times) || !Array.isArray(maximums) || !Array.isArray(minimums)) {
    throw new WeatherApiError("OpenMeteo no devolvió el pronóstico diario.");
  }

  const codes = Array.isArray(daily.weather_code) ? daily.weather_code : [];
  const probabilities = Array.isArray(daily.precipitation_probability_max)
    ? daily.precipitation_probability_max
    : [];

  const count = Math.min(times.length, maximums.length, minimums.length, FORECAST_DAYS);
  const days: ForecastDay[] = [];

  for (let index = 0; index < count; index += 1) {
    const date = times[index];
    const temperatureMax = maximums[index];
    const temperatureMin = minimums[index];

    if (typeof date !== "string" || date.trim() === "") continue;
    if (typeof temperatureMax !== "number" || !Number.isFinite(temperatureMax)) continue;
    if (typeof temperatureMin !== "number" || !Number.isFinite(temperatureMin)) continue;

    days.push({
      date: date.trim(),
      temperatureMax,
      temperatureMin,
      weatherCode: optionalNumber(codes[index]),
      precipitationProbability: optionalNumber(probabilities[index]),
    });
  }

  if (days.length === 0) {
    throw new WeatherApiError("OpenMeteo no devolvió el pronóstico diario.");
  }

  return { days };
}
