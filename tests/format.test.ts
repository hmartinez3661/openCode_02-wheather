import { describe, expect, test } from "bun:test";
import { formatCity, formatTemperature, formatWeather } from "../src/format.ts";
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
