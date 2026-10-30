import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const lima = {
  name: "Lima",
  latitude: -12.046374,
  longitude: -77.042793,
};

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "weather-cli-e2e-"));
  await writeFile(path("cities.json"), JSON.stringify({ cities: [lima] }), "utf8");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function path(name: string): string {
  return join(dir, name);
}

interface RunCliResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runCli(input: string): Promise<RunCliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["run", "src/index.ts"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NO_COLOR: "1",
        WEATHER_CLI_DATA_DIR: dir,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));

    child.stdin?.end(input);
  });
}

describe("CLI end-to-end (subproceso real)", () => {
  test(
    "muestra el menú, rechaza opciones inválidas y sale con código 0",
    async () => {
      const result = await runCli("7\n9\n");

      expect(result.code).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("WEATHER CLI");
      expect(result.stdout).toContain("1. Clima de ciudad default");
      expect(result.stdout).toContain("Selecciona una opción");
      expect(result.stdout).toContain("Opción inválida");
      expect(result.stdout).toContain("Hasta luego");
    },
    60_000,
  );

  test(
    "alterna la unidad desde el menú y la persiste en settings.json",
    async () => {
      const result = await runCli("8\n9\n");

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Unidad ajustada a °F");

      const settings = JSON.parse(await readFile(path("settings.json"), "utf8")) as {
        unit: string;
      };
      expect(settings.unit).toBe("fahrenheit");

      const cities = JSON.parse(await readFile(path("cities.json"), "utf8")) as {
        cities: unknown[];
      };
      expect(cities.cities).toEqual([lima]);
    },
    60_000,
  );
});
