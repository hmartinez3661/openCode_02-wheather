import { describe, expect, test } from "bun:test";
import { parseSelection, renderMenu } from "../src/menu.ts";
import { createEmptyState, type City } from "../src/state.ts";

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
    expect(menu).toContain("Ajustes (°F)");
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
