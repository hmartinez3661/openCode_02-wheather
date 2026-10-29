import { describe, expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { ConsolePrompter, parseSelection, renderMenu } from "../src/menu.ts";
import { createEmptyState, type City } from "../src/state.ts";
import { createTheme } from "../src/theme.ts";

const ottawa: City = {
  name: "Ottawa",
  admin1: "Ontario",
  country: "Canadá",
  latitude: 45.41117,
  longitude: -75.69812,
};

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
