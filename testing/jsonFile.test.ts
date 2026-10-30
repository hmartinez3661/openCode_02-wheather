import { beforeEach, afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonFileError, readJsonFile, writeJsonFile } from "../src/storage/jsonFile.ts";

let dir: string;
let path: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "weather-cli-json-"));
  path = join(dir, "cities.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("readJsonFile", () => {
  test("devuelve undefined cuando el archivo no existe", async () => {
    expect(await readJsonFile(path)).toBeUndefined();
  });

  test("lee JSON válido", async () => {
    await writeFile(path, JSON.stringify({ cities: [] }), "utf8");

    expect(await readJsonFile(path)).toEqual({ cities: [] });
  });

  test("tolera el BOM al inicio del archivo", async () => {
    await writeFile(path, `\uFEFF${JSON.stringify({ unit: "celsius" })}`, "utf8");

    expect(await readJsonFile(path)).toEqual({ unit: "celsius" });
  });

  test("lanza JsonFileError cuando el contenido no es JSON", async () => {
    await writeFile(path, "{ no es json", "utf8");

    await expect(readJsonFile(path)).rejects.toBeInstanceOf(JsonFileError);
  });
});

describe("writeJsonFile", () => {
  test("escribe JSON formateado y no deja archivos temporales", async () => {
    const data = { cities: [{ name: "Lima", latitude: -12, longitude: -77 }] };

    await writeJsonFile(path, data);

    expect(await readJsonFile(path)).toEqual(data);
    expect((await readdir(dir)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  test("crea el directorio de destino si no existe", async () => {
    const nestedPath = join(dir, "nested", "settings.json");

    await writeJsonFile(nestedPath, { unit: "fahrenheit" });

    expect(await readJsonFile(nestedPath)).toEqual({ unit: "fahrenheit" });
  });
});
