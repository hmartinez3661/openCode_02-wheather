import type { TemperatureUnit } from "../types/AppState.ts";
import type { City } from "../types/City.ts";
import type { Forecast, ForecastDay, Weather } from "../types/Weather.ts";
import { FORECAST_DAYS, FORECAST_URL } from "../utils/constants.ts";
import { isFiniteNumber, isRecord } from "../utils/validation.ts";
import { requestJson, WeatherApiError } from "./client.ts";

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
  if (!isFiniteNumber(temperature)) {
    throw new WeatherApiError("OpenMeteo no devolvió la temperatura actual.");
  }

  return {
    temperature,
    apparentTemperature: isFiniteNumber(apparentTemperature) ? apparentTemperature : null,
  };
}

function optionalNumber(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null;
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
    if (!isFiniteNumber(temperatureMax)) continue;
    if (!isFiniteNumber(temperatureMin)) continue;

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
