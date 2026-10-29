import { describe, expect, test } from "bun:test";
import { WeatherApp } from "../src/actions.ts";
import type { Prompter } from "../src/menu.ts";
import {
  createEmptyState,
  type AppState,
  type City,
} from "../src/state.ts";
import { createTheme, type Theme } from "../src/theme.ts";

const ottawa: City = {
  name: "Ottawa",
  admin1: "Ontario",
  country: "Canadá",
  latitude: 45.41117,
  longitude: -75.69812,
};

const lima: City = {
  name: "Lima",
  country: "Perú",
  latitude: -12.0464,
  longitude: -77.0428,
};

function scriptedPrompter(answers: string[]): Prompter {
  let index = 0;

  return {
    async ask() {
      const answer = answers[index];
      index += 1;
      if (answer === undefined) throw new Error("No hay más respuestas en el test.");
      return answer;
    },
    close() {},
  };
}

interface Harness {
  state: AppState;
  output: string[];
  app: WeatherApp;
}

function createHarness(
  initial: AppState,
  answers: string[],
  options: { theme?: Theme } = {},
): Harness {
  let state = initial;
  const output: string[] = [];
  const cities = new Map<string, City>([
    ["ottawa", ottawa],
    ["lima", lima],
  ]);

  const app = new WeatherApp(scriptedPrompter(answers), "state.json", {
    loadState: async () => ({ state }),
    saveState: async (next) => {
      state = structuredClone(next);
    },
    geocodeCity: async (name) => cities.get(name.trim().toLowerCase()) ?? null,
    getWeather: async () => ({ temperature: 10, apparentTemperature: 9 }),
    theme: options.theme,
    out: (message) => output.push(message),
    error: (message) => output.push(message),
  });

  return {
    get state() {
      return state;
    },
    output,
    app,
  };
}

describe("WeatherApp", () => {
  test("agrega la primera ciudad en el arranque y la deja como default", async () => {
    const harness = createHarness(createEmptyState(), ["Ottawa", "9"]);

    await harness.app.run();

    expect(harness.state.cities).toEqual([ottawa]);
    expect(harness.state.defaultCity).toEqual(ottawa);
    expect(harness.output.join("\n")).toContain("Ciudad agregada: Ottawa, Ontario, Canadá (default)");
  });

  test("agrega otra ciudad y permite establecerla como default", async () => {
    const harness = createHarness(
      { defaultCity: ottawa, cities: [ottawa], unit: "celsius" },
      ["3", "Lima", "5", "2", "9"],
    );

    await harness.app.run();

    expect(harness.state.cities).toEqual([ottawa, lima]);
    expect(harness.state.defaultCity).toEqual(lima);
  });

  test("elimina la ciudad default y reasigna la primera restante", async () => {
    const harness = createHarness(
      { defaultCity: ottawa, cities: [ottawa, lima], unit: "celsius" },
      ["4", "1", "9"],
    );

    await harness.app.run();

    expect(harness.state.cities).toEqual([lima]);
    expect(harness.state.defaultCity).toEqual(lima);
  });

  test("alterna la unidad y la persiste", async () => {
    const harness = createHarness(
      { defaultCity: ottawa, cities: [ottawa], unit: "celsius" },
      ["8", "9"],
    );

    await harness.app.run();

    expect(harness.state.unit).toBe("fahrenheit");
  });

  test("no agrega una ciudad duplicada", async () => {
    const harness = createHarness(
      { defaultCity: ottawa, cities: [ottawa], unit: "celsius" },
      ["3", "Ottawa", "9"],
    );

    await harness.app.run();

    expect(harness.state.cities).toHaveLength(1);
    expect(harness.output.join("\n")).toContain("ya está registrada");
  });

  test("rechaza una opción inválida sin cerrar el menú", async () => {
    const harness = createHarness(
      { defaultCity: ottawa, cities: [ottawa], unit: "celsius" },
      ["7", "9"],
    );

    await harness.app.run();

    expect(harness.output.join("\n")).toContain("Opción inválida");
  });

  test("colorea los mensajes de éxito en verde y los errores en rojo", async () => {
    const harness = createHarness(createEmptyState(), ["Ottawa", "7", "9"], {
      theme: createTheme({ enabled: true }),
    });

    await harness.app.run();

    const output = harness.output.join("\n");
    expect(output).toContain("\x1b[32m");
    expect(output).toContain("\x1b[31m");
  });

  test("muestra el clima de cada ciudad registrada", async () => {
    const harness = createHarness(
      { defaultCity: ottawa, cities: [ottawa, lima], unit: "celsius" },
      ["2", "9"],
    );

    await harness.app.run();

    const output = harness.output.join("\n");
    expect(output).toContain("Ottawa, Ontario, Canadá — 10.0 °C (sensación 9.0 °C)");
    expect(output).toContain("Lima, Perú — 10.0 °C (sensación 9.0 °C)");
  });
});
