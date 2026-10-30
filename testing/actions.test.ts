import { describe, expect, test } from "bun:test";
import { addCity } from "../src/actions/addCity.ts";
import { showAllWeather } from "../src/actions/getAllWeather.ts";
import { showForecast } from "../src/actions/getForecast.ts";
import { showDefaultWeather } from "../src/actions/getWeather.ts";
import { removeCity } from "../src/actions/removeCity.ts";
import { setDefaultCity } from "../src/actions/setDefaultCity.ts";
import { toggleUnit } from "../src/actions/toggleUnit.ts";
import type { Prompter } from "../src/presentation/input.ts";
import { createEmptyState } from "../src/storage/stateStore.ts";
import type { ActionContext } from "../src/types/ActionContext.ts";
import type { AppState } from "../src/types/AppState.ts";
import type { City } from "../src/types/City.ts";
import type { Forecast } from "../src/types/Weather.ts";
import { createTheme, plainTheme, type Theme } from "../src/utils/colors.ts";

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

const defaultForecast: Forecast = {
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
      precipitationProbability: 80,
    },
  ],
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
  context: ActionContext;
  output: string[];
  counters: { persist: number };
}

function createHarness(
  initial: AppState,
  answers: string[],
  options: {
    theme?: Theme;
    getWeather?: ActionContext["getWeather"];
    getForecast?: ActionContext["getForecast"];
  } = {},
): Harness {
  const output: string[] = [];
  const counters = { persist: 0 };
  const state = structuredClone(initial);
  const cities = new Map<string, City>([
    ["ottawa", ottawa],
    ["lima", lima],
  ]);

  const context: ActionContext = {
    state,
    out: {
      line: (message) => output.push(message),
      error: (message) => output.push(message),
    },
    theme: options.theme ?? plainTheme,
    prompt: scriptedPrompter(answers),
    geocodeCity: async (name) => cities.get(name.trim().toLowerCase()) ?? null,
    getWeather: options.getWeather ?? (async () => ({ temperature: 10, apparentTemperature: 9 })),
    getForecast: options.getForecast ?? (async () => defaultForecast),
    persist: async () => {
      counters.persist += 1;
    },
  };

  return { context, output, counters };
}

describe("addCity", () => {
  test("agrega la primera ciudad y la deja como default", async () => {
    const harness = createHarness(createEmptyState(), ["Ottawa"]);

    await addCity(harness.context);

    expect(harness.context.state.cities).toEqual([ottawa]);
    expect(harness.context.state.defaultCity).toEqual(ottawa);
    expect(harness.output.join("\n")).toContain(
      "Ciudad agregada: Ottawa, Ontario, Canadá (default)",
    );
    expect(harness.counters.persist).toBe(1);
  });

  test("no agrega una ciudad duplicada", async () => {
    const harness = createHarness(
      { defaultCity: ottawa, cities: [ottawa], unit: "celsius" },
      ["Ottawa"],
    );

    await addCity(harness.context);

    expect(harness.context.state.cities).toHaveLength(1);
    expect(harness.output.join("\n")).toContain("ya está registrada");
  });

  test("avisa cuando la ciudad no existe", async () => {
    const harness = createHarness(createEmptyState(), ["Ciudad Inexistente"]);

    await addCity(harness.context);

    expect(harness.context.state.cities).toEqual([]);
    expect(harness.output.join("\n")).toContain("No se encontró la ciudad");
  });
});

describe("removeCity", () => {
  test("elimina la ciudad default y reasigna la primera restante", async () => {
    const harness = createHarness(
      { defaultCity: ottawa, cities: [ottawa, lima], unit: "celsius" },
      ["1"],
    );

    await removeCity(harness.context);

    expect(harness.context.state.cities).toEqual([lima]);
    expect(harness.context.state.defaultCity).toEqual(lima);
    expect(harness.counters.persist).toBe(1);
  });

  test("rechaza una selección inválida", async () => {
    const harness = createHarness(
      { defaultCity: ottawa, cities: [ottawa], unit: "celsius" },
      ["99"],
    );

    await removeCity(harness.context);

    expect(harness.context.state.cities).toEqual([ottawa]);
    expect(harness.output.join("\n")).toContain("Selección inválida");
  });

  test("avisa cuando no hay ciudades registradas", async () => {
    const harness = createHarness(createEmptyState(), []);

    await removeCity(harness.context);

    expect(harness.output.join("\n")).toContain("No hay ciudades registradas");
  });
});

describe("setDefaultCity", () => {
  test("establece la ciudad elegida como default", async () => {
    const harness = createHarness(
      { defaultCity: ottawa, cities: [ottawa, lima], unit: "celsius" },
      ["2"],
    );

    await setDefaultCity(harness.context);

    expect(harness.context.state.defaultCity).toEqual(lima);
    expect(harness.counters.persist).toBe(1);
  });
});

describe("toggleUnit", () => {
  test("alterna la unidad y la persiste", async () => {
    const harness = createHarness(
      { defaultCity: ottawa, cities: [ottawa], unit: "celsius" },
      [],
    );

    await toggleUnit(harness.context);

    expect(harness.context.state.unit).toBe("fahrenheit");
    expect(harness.counters.persist).toBe(1);
    expect(harness.output.join("\n")).toContain("Unidad ajustada a °F");
  });
});

describe("showDefaultWeather", () => {
  test("muestra el clima de la ciudad default", async () => {
    const harness = createHarness(
      { defaultCity: ottawa, cities: [ottawa], unit: "celsius" },
      [],
    );

    await showDefaultWeather(harness.context);

    expect(harness.output.join("\n")).toContain(
      "Ottawa, Ontario, Canadá — 10.0 °C (sensación 9.0 °C)",
    );
  });

  test("pide agregar una ciudad cuando no hay default", async () => {
    const harness = createHarness(createEmptyState(), ["Ottawa"]);

    await showDefaultWeather(harness.context);

    expect(harness.context.state.defaultCity).toEqual(ottawa);
    expect(harness.output.join("\n")).toContain("No hay una ciudad default configurada");
  });

  test("informa un error del clima sin interrumpir", async () => {
    const harness = createHarness(
      { defaultCity: ottawa, cities: [ottawa], unit: "celsius" },
      [],
      {
        getWeather: async () => {
          throw new Error("sin clima");
        },
      },
    );

    await showDefaultWeather(harness.context);

    expect(harness.output.join("\n")).toContain("Ottawa, Ontario, Canadá: sin clima");
  });
});

describe("showAllWeather", () => {
  test("muestra el clima de cada ciudad registrada", async () => {
    const harness = createHarness(
      { defaultCity: ottawa, cities: [ottawa, lima], unit: "celsius" },
      [],
    );

    await showAllWeather(harness.context);

    const output = harness.output.join("\n");
    expect(output).toContain("Ottawa, Ontario, Canadá — 10.0 °C (sensación 9.0 °C)");
    expect(output).toContain("Lima, Perú — 10.0 °C (sensación 9.0 °C)");
  });
});

describe("showForecast", () => {
  test("muestra el pronóstico de 7 días de la ciudad elegida", async () => {
    const harness = createHarness(
      { defaultCity: ottawa, cities: [ottawa, lima], unit: "celsius" },
      ["1"],
    );

    await showForecast(harness.context);

    const output = harness.output.join("\n");
    expect(output).toContain("Ottawa, Ontario, Canadá — pronóstico 7 días (máx / mín)");
    expect(output).toContain("Jue 29 oct");
    expect(output).toContain("12.3 °C / 3.1 °C");
    expect(output).toContain("lluvia 40%");
  });

  test("informa un error del pronóstico sin interrumpir", async () => {
    const harness = createHarness(
      { defaultCity: ottawa, cities: [ottawa], unit: "celsius" },
      ["1"],
      {
        getForecast: async () => {
          throw new Error("sin pronóstico");
        },
      },
    );

    await showForecast(harness.context);

    expect(harness.output.join("\n")).toContain("Ottawa, Ontario, Canadá: sin pronóstico");
  });
});

describe("colores", () => {
  test("usa verde para los mensajes de éxito", async () => {
    const harness = createHarness(createEmptyState(), ["Ottawa"], {
      theme: createTheme({ enabled: true }),
    });

    await addCity(harness.context);

    expect(harness.output.join("\n")).toContain("\x1b[32m");
  });
});
