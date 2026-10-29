import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createEmptyState,
  loadState,
  saveState,
  type AppState,
  type City,
} from "../src/state.ts";

const ottawa: City = {
  name: "Ottawa",
  admin1: "Ontario",
  country: "Canadá",
  latitude: 45.41117,
  longitude: -75.69812,
};

let dir: string;
let statePath: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "weather-cli-test-"));
  statePath = join(dir, "weather-cli.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("loadState", () => {
  test("devuelve estado vacío si el archivo no existe", async () => {
    const result = await loadState(statePath);

    expect(result.state).toEqual(createEmptyState());
    expect(result.warning).toBeUndefined();
  });

  test("devuelve estado vacío con advertencia si el JSON es inválido", async () => {
    await writeFile(statePath, "{ no es json", "utf8");

    const result = await loadState(statePath);

    expect(result.state).toEqual(createEmptyState());
    expect(result.warning).toContain("dañada");
  });

  test("tolera el BOM que agregan algunos editores de Windows", async () => {
    await writeFile(statePath, `\uFEFF${JSON.stringify({ cities: [ottawa], unit: "celsius" })}`, "utf8");

    const result = await loadState(statePath);

    expect(result.warning).toBeUndefined();
    expect(result.state.cities).toHaveLength(1);
  });

  test("normaliza la unidad y descarta un default que no está en la lista", async () => {
    await writeFile(
      statePath,
      JSON.stringify({
        unit: "kelvin",
        cities: [ottawa],
        defaultCity: { ...ottawa, name: "Toronto", latitude: 43.65, longitude: -79.38 },
      }),
      "utf8",
    );

    const result = await loadState(statePath);

    expect(result.state.unit).toBe("celsius");
    expect(result.state.defaultCity).toBeNull();
    expect(result.state.cities).toHaveLength(1);
  });
});

describe("saveState", () => {
  test("guarda y recupera el estado completo", async () => {
    const state: AppState = { defaultCity: ottawa, cities: [ottawa], unit: "fahrenheit" };

    await saveState(state, statePath);
    const raw = await readFile(statePath, "utf8");

    expect(JSON.parse(raw).unit).toBe("fahrenheit");
    expect((await loadState(statePath)).state).toEqual(state);
  });

  test("crea el directorio de destino si no existe", async () => {
    const nestedPath = join(dir, "nested", "weather-cli.json");

    await saveState(createEmptyState(), nestedPath);

    expect((await loadState(nestedPath)).state).toEqual(createEmptyState());
  });
});
