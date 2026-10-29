import type { Forecast, Weather } from "./api.ts";
import type { City, TemperatureUnit } from "./state.ts";
import { plainTheme, type Theme } from "./theme.ts";

const WEATHER_CODE_LABELS: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna moderada",
  55: "Llovizna densa",
  56: "Llovizna helada ligera",
  57: "Llovizna helada densa",
  61: "Lluvia ligera",
  63: "Lluvia moderada",
  65: "Lluvia fuerte",
  66: "Lluvia helada ligera",
  67: "Lluvia helada fuerte",
  71: "Nieve ligera",
  73: "Nieve moderada",
  75: "Nieve fuerte",
  77: "Granos de nieve",
  80: "Chubascos ligeros",
  81: "Chubascos moderados",
  82: "Chubascos fuertes",
  85: "Chubascos de nieve ligeros",
  86: "Chubascos de nieve fuertes",
  95: "Tormenta",
  96: "Tormenta con granizo ligero",
  99: "Tormenta con granizo fuerte",
};

const FORECAST_DATE_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

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

export function weatherCodeLabel(code: number | null): string {
  if (code === null) return "Condición desconocida";
  return WEATHER_CODE_LABELS[code] ?? "Condición desconocida";
}

export function formatForecastDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;

  const label = FORECAST_DATE_FORMATTER.format(date).replace(/,/g, "").trim();
  return label.charAt(0).toLocaleUpperCase("es") + label.slice(1);
}

export function formatWeather(
  city: City,
  weather: Weather,
  unit: TemperatureUnit,
  theme: Pick<Theme, "temperature" | "secondary"> = plainTheme,
): string {
  const temperature = theme.temperature(formatTemperature(weather.temperature, unit));
  const apparent =
    weather.apparentTemperature === null
      ? theme.secondary("sensación no disponible")
      : `${theme.secondary("sensación")} ${theme.temperature(
          formatTemperature(weather.apparentTemperature, unit),
        )}`;

  return `${formatCity(city)} — ${temperature} (${apparent})`;
}

export function formatForecast(
  city: City,
  forecast: Forecast,
  unit: TemperatureUnit,
  theme: Pick<Theme, "temperature" | "secondary"> = plainTheme,
): string {
  const rows = forecast.days.map((day) => ({
    date: formatForecastDate(day.date),
    temperatures: `${formatTemperature(day.temperatureMax, unit)} / ${formatTemperature(
      day.temperatureMin,
      unit,
    )}`,
    condition: weatherCodeLabel(day.weatherCode),
    precipitation:
      day.precipitationProbability === null
        ? "—"
        : `${Math.round(day.precipitationProbability)}%`,
  }));

  const dateWidth = Math.max(...rows.map((row) => row.date.length), 0);
  const temperaturesWidth = Math.max(...rows.map((row) => row.temperatures.length), 0);
  const conditionWidth = Math.max(...rows.map((row) => row.condition.length), 0);

  const lines = [`${formatCity(city)} — pronóstico 7 días (máx / mín)`];
  for (const row of rows) {
    const precipitationLabel = theme.secondary("lluvia");
    lines.push(
      `  ${theme.secondary(row.date.padEnd(dateWidth))}   ${theme.temperature(
        row.temperatures.padEnd(temperaturesWidth),
      )}   ${row.condition.padEnd(conditionWidth)}   ${precipitationLabel} ${row.precipitation}`,
    );
  }

  return lines.join("\n");
}
