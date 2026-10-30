import { describe, expect, test } from "bun:test";
import { errorMessage, isErrnoException } from "../src/utils/errors.ts";

describe("errorMessage", () => {
  test("extrae el mensaje de un Error", () => {
    expect(errorMessage(new Error("algo falló"))).toBe("algo falló");
  });

  test("convierte valores que no son Error en texto", () => {
    expect(errorMessage("fallo directo")).toBe("fallo directo");
    expect(errorMessage(42)).toBe("42");
    expect(errorMessage(null)).toBe("null");
    expect(errorMessage(undefined)).toBe("undefined");
  });
});

describe("isErrnoException", () => {
  test("reconoce errores con code", () => {
    const error = Object.assign(new Error("ENOENT"), { code: "ENOENT" });

    expect(isErrnoException(error)).toBe(true);
  });

  test("rechaza errores sin code", () => {
    expect(isErrnoException(new Error("sin código"))).toBe(false);
    expect(isErrnoException("ENOENT")).toBe(false);
    expect(isErrnoException(null)).toBe(false);
  });
});
