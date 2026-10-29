import { describe, expect, test } from "bun:test";
import { dirname, join, resolve } from "node:path";
import { isStandaloneExecutable, resolveStatePaths } from "../src/storage/statePath.ts";

describe("isStandaloneExecutable", () => {
  test("detecta el binario de Bun en desarrollo", () => {
    expect(isStandaloneExecutable(join("C:", "tools", "bun.exe"))).toBe(false);
    expect(isStandaloneExecutable(join("usr", "local", "bin", "bun"))).toBe(false);
  });

  test("detecta un binario compilado", () => {
    expect(isStandaloneExecutable(join("C:", "apps", "weather.exe"))).toBe(true);
  });
});

describe("resolveStatePaths", () => {
  test("en desarrollo usa la raíz del proyecto", () => {
    const moduleDir = join(process.cwd(), "project");
    const paths = resolveStatePaths({
      envDataDir: "",
      envLegacyPath: "",
      execPath: join("C:", "tools", "bun.exe"),
      moduleDir,
    });

    expect(paths.cities).toBe(join(moduleDir, "cities.json"));
    expect(paths.settings).toBe(join(moduleDir, "settings.json"));
    expect(paths.legacy).toBe(join(moduleDir, "weather-cli.json"));
  });

  test("con un binario usa el directorio del ejecutable", () => {
    const execPath = join(process.cwd(), "dist", "weather.exe");
    const paths = resolveStatePaths({
      envDataDir: "",
      envLegacyPath: "",
      execPath,
      moduleDir: join(process.cwd(), "project"),
    });

    expect(paths.cities).toBe(join(dirname(execPath), "cities.json"));
    expect(paths.settings).toBe(join(dirname(execPath), "settings.json"));
  });

  test("WEATHER_CLI_DATA_DIR mueve los archivos nuevos", () => {
    const dataDir = join(process.cwd(), "data");
    const paths = resolveStatePaths({
      envDataDir: dataDir,
      envLegacyPath: "",
      execPath: join("C:", "tools", "bun.exe"),
      moduleDir: join(process.cwd(), "project"),
    });

    expect(paths.cities).toBe(join(resolve(dataDir), "cities.json"));
    expect(paths.settings).toBe(join(resolve(dataDir), "settings.json"));
    expect(paths.legacy).toBe(join(resolve(dataDir), "weather-cli.json"));
  });

  test("WEATHER_CLI_STATE_PATH mantiene el archivo anterior y su directorio", () => {
    const legacy = join(process.cwd(), "custom", "state.json");
    const paths = resolveStatePaths({
      envDataDir: "",
      envLegacyPath: legacy,
      execPath: join("C:", "tools", "bun.exe"),
      moduleDir: join(process.cwd(), "project"),
    });

    expect(paths.legacy).toBe(resolve(legacy));
    expect(paths.cities).toBe(join(dirname(resolve(legacy)), "cities.json"));
    expect(paths.settings).toBe(join(dirname(resolve(legacy)), "settings.json"));
  });
});
