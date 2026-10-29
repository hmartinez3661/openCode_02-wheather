import { describe, expect, test } from "bun:test";
import { dirname, join, resolve } from "node:path";
import { isStandaloneExecutable, resolveStatePath } from "../src/config.ts";

describe("isStandaloneExecutable", () => {
  test("detecta el binario de Bun en desarrollo", () => {
    expect(isStandaloneExecutable(join("C:", "tools", "bun.exe"))).toBe(false);
    expect(isStandaloneExecutable(join("usr", "local", "bin", "bun"))).toBe(false);
  });

  test("detecta un binario compilado", () => {
    expect(isStandaloneExecutable(join("C:", "apps", "weather.exe"))).toBe(true);
  });
});

describe("resolveStatePath", () => {
  test("usa WEATHER_CLI_STATE_PATH cuando se define", () => {
    const custom = join(process.cwd(), "custom", "state.json");
    expect(resolveStatePath({ envPath: custom })).toBe(resolve(custom));
  });

  test("en desarrollo guarda en la raíz del proyecto", () => {
    const moduleDir = join(process.cwd(), "project");
    const path = resolveStatePath({
      envPath: "",
      execPath: join("C:", "tools", "bun.exe"),
      moduleDir,
    });

    expect(path).toBe(join(moduleDir, "weather-cli.json"));
  });

  test("con un binario guarda junto al ejecutable", () => {
    const execPath = join(process.cwd(), "dist", "weather.exe");
    const path = resolveStatePath({
      envPath: "",
      execPath,
      moduleDir: join(process.cwd(), "project"),
    });

    expect(path).toBe(join(dirname(execPath), "weather-cli.json"));
  });
});
