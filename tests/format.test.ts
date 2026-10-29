import { describe, expect, test } from "bun:test";
import {
  formatCity,
  formatForecast,
  formatForecastDate,
  formatTemperature,
  formatWeather,
  weatherCodeLabel,
} from "../src/format.ts";
import type { Forecast } from "../src/api.ts";
import type { City } from "../src/state.ts";
import { createTheme } from "../src/theme.ts";

const ottawa: City = {
  name: "Ottawa",
  admin1: "Ontario",
  country: "Canadá",
  latitude: 45.41117,
  longitude: -75.69812,
};

describe("formatTemperature", () => {
  test("usa el símbolo y redondeo correctos", () => {
    expect(formatTemperature(12.34, "celsius")).toBe("12.3 °C");
    expect(formatTemperature(54.32, "fahrenheit")).toBe("54.3 °F");
  });
});

describe("formatCity", () => {
  test("incluye los datos disponibles y omite los opcionales vacíos", () => {
    expect(formatCity(ottawa)).toBe("Ottawa, Ontario, Canadá");
    expect(formatCity({ name: "Lima", latitude: -12, longitude: -77 })).toBe("Lima");
  });
});

describe("formatWeather", () => {
  test("incluye la sensación térmica", () => {
    expect(
      formatWeather(ottawa, { temperature: 12.3, apparentTemperature: 10.1 }, "celsius"),
    ).toBe("Ottawa, Ontario, Canadá — 12.3 °C (sensación 10.1 °C)");
  });

  test("informa cuando no hay sensación térmica", () => {
    expect(
      formatWeather(ottawa, { temperature: 12.3, apparentTemperature: null }, "celsius"),
    ).toContain("sensación no disponible");
  });

  test("colorea temperaturas en amarillo y etiquetas en dim", () => {
    const colored = formatWeather(
      ottawa,
      { temperature: 12.3, apparentTemperature: 10.1 },
      "celsius",
      createTheme({ enabled: true }),
    );

    expect(colored).toContain("\x1b[33m12.3 °C\x1b[0m");
    expect(colored).toContain("\x1b[2msensación\x1b[0m");
    expect(colored).toContain("\x1b[33m10.1 °C\x1b[0m");
  });
});

describe("weatherCodeLabel", () => {
  test("traduce los códigos WMO conocidos", () => {
    expect(weatherCodeLabel(0)).toBe("Despejado");
    expect(weatherCodeLabel(3)).toBe("Nublado");
    expect(weatherCodeLabel(61)).toBe("Lluvia ligera");
    expect(weatherCodeLabel(95)).toBe("Tormenta");
  });

  test("informa cuando el código falta o es desconocido", () => {
    expect(weatherCodeLabel(null)).toBe("Condición desconocida");
    expect(weatherCodeLabel(123)).toBe("Condición desconocida");
  });
});

describe("formatForecastDate", () => {
  test("formatea la fecha en español con día y mes cortos", () => {
    expect(formatForecastDate("2026-10-29")).toBe("Jue 29 oct");
  });

  test("devuelve el texto original si la fecha no es válida", () => {
    expect(formatForecastDate("no-es-fecha")).toBe("no-es-fecha");
  });
});

describe("formatForecast", () => {
  const forecast: Forecast = {
    days: [
      {
        date: "2026-10-29",
        temperatureMax: 12.3,
        temperatureMin: 3.1,
        weatherCode: 2,
        precipitationProbability: 40,
      },
      {
        date: "2026-10-30",
        temperatureMax: 9.8,
        temperatureMin: 1.2,
        weatherCode: 61,
        precipitationProbability: null,
      },
    ],
  };

  test("muestra encabezado, temperaturas, condición y probabilidad de lluvia", () => {
    const formatted = formatForecast(ottawa, forecast, "celsius");

    expect(formatted).toContain("Ottawa, Ontario, Canadá — pronóstico 7 días (máx / mín)");
    expect(formatted).toContain("Jue 29 oct");
    expect(formatted).toContain("12.3 °C / 3.1 °C");
    expect(formatted).toContain("Parcialmente nublado");
    expect(formatted).toContain("lluvia 40%");
    expect(formatted).toContain("Vie 30 oct");
    expect(formatted).toContain("9.8 °C / 1.2 °C");
    expect(formatted).toContain("Lluvia ligera");
    expect(formatted).toContain("lluvia —");
  });

  test("colorea temperaturas en amarillo y etiquetas en dim", () => {
    const colored = formatForecast(ottawa, forecast, "celsius", createTheme({ enabled: true }));

    expect(colored).toContain("\x1b[33m12.3 °C / 3.1 °C");
    expect(colored).toContain("\x1b[2mlluvia\x1b[0m");
  });
});
