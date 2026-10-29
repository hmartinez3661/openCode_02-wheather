import type { Weather } from "./api.ts";
import type { City, TemperatureUnit } from "./state.ts";

export function unitSymbol(unit: TemperatureUnit): string {
  return unit === "fahrenheit" ? "°F" : "°C";
}

export function formatTemperature(value: number, unit: TemperatureUnit): string {
  return `${value.toFixed(1)} ${unitSymbol(unit)}`;
}

export function formatCity(city: City): string {
  return [city.name, city.admin1, city.country]
    .filter((part): part is string => typeof part === "string" && part.trim() !== "")
    .join(", ");
}

export function formatWeather(city: City, weather: Weather, unit: TemperatureUnit): string {
  const temperature = formatTemperature(weather.temperature, unit);
  const apparent =
    weather.apparentTemperature === null
      ? "sensación no disponible"
      : `sensación ${formatTemperature(weather.apparentTemperature, unit)}`;

  return `${formatCity(city)} — ${temperature} (${apparent})`;
}
