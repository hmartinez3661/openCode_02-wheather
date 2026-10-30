import { describe, expect, test } from "bun:test";
import { isFiniteNumber, isRecord } from "../src/utils/validation.ts";

describe("isRecord", () => {
  test("acepta objetos literales", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ name: "Ottawa" })).toBe(true);
  });

  test("rechaza null, arreglos y valores no objeto", () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord([1, 2])).toBe(false);
    expect(isRecord("hola")).toBe(false);
    expect(isRecord(5)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
  });
});

describe("isFiniteNumber", () => {
  test("acepta números finitos", () => {
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(-12.5)).toBe(true);
  });

  test("rechaza NaN, Infinity y otros tipos", () => {
    expect(isFiniteNumber(Number.NaN)).toBe(false);
    expect(isFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isFiniteNumber("12")).toBe(false);
    expect(isFiniteNumber(null)).toBe(false);
  });
});
