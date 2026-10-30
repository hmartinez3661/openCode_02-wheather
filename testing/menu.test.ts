import { describe, expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import {
  ConsolePrompter,
  parseSelection,
  type Prompter,
} from "../src/presentation/input.ts";
import { renderMenu, runMenu } from "../src/presentation/menu.ts";
import type { Output } from "../src/presentation/output.ts";
import { createEmptyState } from "../src/storage/stateStore.ts";
import type { City } from "../src/types/City.ts";
import { createTheme, plainTheme } from "../src/utils/colors.ts";

const ottawa: City = {
  name: "Ottawa",
  admin1: "Ontario",
  country: "Canadá",
  latitude: 45.41117,
  longitude: -75.69812,
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

function collectOutput(): { output: string[]; out: Output } {
  const output: string[] = [];
  return {
    output,
    out: {
      line: (message) => output.push(message),
      error: (message) => output.push(message),
    },
  };
}

describe("renderMenu", () => {
  test("muestra el contador de ciudades y la unidad actual", () => {
    const menu = renderMenu({
      ...createEmptyState(),
      cities: [ottawa],
      unit: "fahrenheit",
    });

    expect(menu).toContain("WEATHER CLI");
    expect(menu).toContain("Clima de todas las ciudades (1)");
    expect(menu).toContain("6. Pronóstico de 7 días");
    expect(menu).toContain("Ajustes (°F)");
  });

  test("colorea el menú en cyan y el título en negrita", () => {
    const menu = renderMenu(createEmptyState(), createTheme({ enabled: true }));

    expect(menu).toContain("\x1b[36m");
    expect(menu).toContain("\x1b[1;36m         WEATHER CLI\x1b[0m");
  });
});

describe("runMenu", () => {
  test("rechaza una opción inválida sin salir", async () => {
    const { output, out } = collectOutput();
    const dispatched: string[] = [];

    await runMenu({
      state: createEmptyState(),
      theme: plainTheme,
      prompt: scriptedPrompter(["7", "9"]),
      out,
      dispatch: async (id) => {
        dispatched.push(id);
        return id !== "9";
      },
    });

    expect(output.join("\n")).toContain("Opción inválida");
    expect(dispatched).toEqual(["9"]);
  });

  test("se detiene cuando dispatch devuelve false", async () => {
    const { out } = collectOutput();
    let calls = 0;

    await runMenu({
      state: createEmptyState(),
      theme: plainTheme,
      prompt: scriptedPrompter(["9"]),
      out,
      dispatch: async () => {
        calls += 1;
        return false;
      },
    });

    expect(calls).toBe(1);
  });
});

describe("parseSelection", () => {
  test("acepta índices dentro del rango", () => {
    expect(parseSelection("2", 3)).toBe(2);
    expect(parseSelection(" 3 ", 3)).toBe(3);
  });

  test("rechaza entradas inválidas", () => {
    expect(parseSelection("0", 3)).toBeNull();
    expect(parseSelection("4", 3)).toBeNull();
    expect(parseSelection("dos", 3)).toBeNull();
    expect(parseSelection("2abc", 3)).toBeNull();
  });
});

describe("ConsolePrompter", () => {
  test("procesa varias líneas de una entrada no interactiva", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const prompter = new ConsolePrompter(input, output);

    const first = prompter.ask("A: ");
    const second = prompter.ask("B: ");
    input.write("7\n9\n");
    input.end();

    await expect(first).resolves.toBe("7");
    await expect(second).resolves.toBe("9");
    prompter.close();
  });

  test("rechaza una pregunta pendiente cuando la entrada termina", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const prompter = new ConsolePrompter(input, output);

    const pending = prompter.ask("A: ");
    input.end();

    await expect(pending).rejects.toThrow("readline was closed");
    prompter.close();
  });
});
