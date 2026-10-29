import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cityKey,
  loadCities,
  parseCitiesData,
  sameCity,
} from "../src/storage/citiesStorage.ts";
import { loadSettings, parseSettingsData } from "../src/storage/settingsStorage.ts";
import { createEmptyState, loadAppState, saveAppState } from "../src/storage/stateStore.ts";
import type { StatePaths } from "../src/storage/statePath.ts";
import type { AppState } from "../src/types/AppState.ts";
import type { City } from "../src/types/City.ts";

const ottawa: City = {
  name: "Ottawa",
  admin1: "Ontario",
  country: "Canadá",
  latitude: 45.41117,
  longitude: -75.69812,
};

let dir: string;
let paths: StatePaths;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "weather-cli-test-"));
  paths = {
    cities: join(dir, "cities.json"),
    settings: join(dir, "settings.json"),
    legacy: join(dir, "weather-cli.json"),
  };
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("cityKey y sameCity", () => {
  test("comparan nombre y coordenadas con dos decimales", () => {
    expect(sameCity(ottawa, { ...ottawa, latitude: 45.4112 })).toBe(true);
    expect(sameCity(ottawa, { ...ottawa, name: "Toronto" })).toBe(false);
    expect(cityKey(ottawa)).toBe("ottawa|45.41|-75.70");
  });
});

describe("parseCitiesData", () => {
  test("descarta ciudades inválidas y duplicadas", () => {
    const data = parseCitiesData({
      cities: [ottawa, { ...ottawa }, { name: "Sin coordenadas" }, null],
      defaultCity: ottawa,
    });

    expect(data.cities).toHaveLength(1);
    expect(data.defaultCity).toEqual(ottawa);
  });

  test("rechaza un documento que no es un objeto", () => {
    expect(() => parseCitiesData([])).toThrow("formato inesperado");
  });
});

describe("parseSettingsData", () => {
  test("normaliza la unidad", () => {
    expect(parseSettingsData({ unit: "fahrenheit" }).unit).toBe("fahrenheit");
    expect(parseSettingsData({ unit: "kelvin" }).unit).toBe("celsius");
    expect(parseSettingsData({}).unit).toBe("celsius");
  });
});

describe("loadCities y loadSettings", () => {
  test("indican cuándo el archivo no existe", async () => {
    const cities = await loadCities(paths.cities);
    const settings = await loadSettings(paths.settings);

    expect(cities.missing).toBe(true);
    expect(cities.data).toEqual({ defaultCity: null, cities: [] });
    expect(settings.missing).toBe(true);
    expect(settings.settings.unit).toBe("celsius");
  });

  test("propagan un error cuando el JSON es inválido", async () => {
    await writeFile(paths.cities, "{ no es json", "utf8");

    await expect(loadCities(paths.cities)).rejects.toThrow("JSON válido");
  });
});

describe("loadAppState", () => {
  test("devuelve estado vacío si no hay archivos", async () => {
    const result = await loadAppState(paths);

    expect(result.state).toEqual(createEmptyState());
    expect(result.warnings).toEqual([]);
  });

  test("advierte si cities.json está dañado y sigue con el resto", async () => {
    await writeFile(paths.cities, "{ no es json", "utf8");
    await writeFile(paths.settings, JSON.stringify({ unit: "fahrenheit" }), "utf8");

    const result = await loadAppState(paths);

    expect(result.state.cities).toEqual([]);
    expect(result.state.unit).toBe("fahrenheit");
    expect(result.warnings.join("\n")).toContain("dañada");
  });

  test("advierte si settings.json está dañado y usa Celsius", async () => {
    await writeFile(paths.cities, JSON.stringify({ cities: [ottawa] }), "utf8");
    await writeFile(paths.settings, "{ no es json", "utf8");

    const result = await loadAppState(paths);

    expect(result.state.cities).toHaveLength(1);
    expect(result.state.unit).toBe("celsius");
    expect(result.warnings.join("\n")).toContain("dañada");
  });

  test("tolera el BOM que agregan algunos editores de Windows", async () => {
    await writeFile(paths.cities, `\uFEFF${JSON.stringify({ cities: [ottawa] })}`, "utf8");

    const result = await loadAppState(paths);

    expect(result.warnings).toEqual([]);
    expect(result.state.cities).toHaveLength(1);
  });

  test("descarta un default que no está en la lista", async () => {
    await writeFile(
      paths.cities,
      JSON.stringify({
        cities: [ottawa],
        defaultCity: { ...ottawa, name: "Toronto", latitude: 43.65, longitude: -79.38 },
      }),
      "utf8",
    );

    const result = await loadAppState(paths);

    expect(result.state.defaultCity).toBeNull();
  });
});

describe("migración de weather-cli.json", () => {
  const legacyState: AppState = {
    defaultCity: ottawa,
    cities: [ottawa],
    unit: "fahrenheit",
  };

  test("divide el archivo anterior en cities.json y settings.json", async () => {
    await writeFile(paths.legacy, JSON.stringify(legacyState), "utf8");

    const result = await loadAppState(paths);

    expect(result.warnings).toEqual([]);
    expect(result.state).toEqual(legacyState);
    expect(JSON.parse(await readFile(paths.cities, "utf8"))).toEqual({
      defaultCity: ottawa,
      cities: [ottawa],
    });
    expect(JSON.parse(await readFile(paths.settings, "utf8"))).toEqual({ unit: "fahrenheit" });
  });

  test("conserva el archivo anterior como respaldo", async () => {
    await writeFile(paths.legacy, JSON.stringify(legacyState), "utf8");

    await loadAppState(paths);

    expect(JSON.parse(await readFile(paths.legacy, "utf8"))).toEqual(legacyState);
  });

  test("advierte si el archivo anterior está dañado", async () => {
    await writeFile(paths.legacy, "{ no es json", "utf8");

    const result = await loadAppState(paths);

    expect(result.state).toEqual(createEmptyState());
    expect(result.warnings.join("\n")).toContain("anterior");
  });

  test("ignora el archivo anterior cuando ya existen los nuevos", async () => {
    await writeFile(paths.cities, JSON.stringify({ cities: [] }), "utf8");
    await writeFile(paths.settings, JSON.stringify({ unit: "celsius" }), "utf8");
    await writeFile(paths.legacy, JSON.stringify(legacyState), "utf8");

    const result = await loadAppState(paths);

    expect(result.state).toEqual(createEmptyState());
  });
});

describe("saveAppState", () => {
  test("guarda y recupera el estado completo", async () => {
    const state: AppState = { defaultCity: ottawa, cities: [ottawa], unit: "fahrenheit" };

    await saveAppState(state, paths);

    expect((await loadAppState(paths)).state).toEqual(state);
  });

  test("crea el directorio de destino si no existe", async () => {
    const nestedPaths: StatePaths = {
      cities: join(dir, "nested", "cities.json"),
      settings: join(dir, "nested", "settings.json"),
      legacy: join(dir, "nested", "weather-cli.json"),
    };

    await saveAppState(createEmptyState(), nestedPaths);

    expect((await loadAppState(nestedPaths)).state).toEqual(createEmptyState());
  });
});
