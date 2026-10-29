import { describe, expect, test } from "bun:test";
import { createTheme, plainTheme, supportsColor } from "../src/theme.ts";

describe("createTheme", () => {
  test("deshabilitado devuelve el texto sin cambios", () => {
    expect(plainTheme.enabled).toBe(false);
    expect(plainTheme.menu("hola")).toBe("hola");
    expect(createTheme({ enabled: false }).success("ok")).toBe("ok");
  });

  test("habilitado usa los códigos ANSI esperados", () => {
    const theme = createTheme({ enabled: true });

    expect(theme.enabled).toBe(true);
    expect(theme.menu("x")).toBe("\x1b[36mx\x1b[0m");
    expect(theme.title("x")).toBe("\x1b[1;36mx\x1b[0m");
    expect(theme.temperature("x")).toBe("\x1b[33mx\x1b[0m");
    expect(theme.success("x")).toBe("\x1b[32mx\x1b[0m");
    expect(theme.error("x")).toBe("\x1b[31mx\x1b[0m");
    expect(theme.warning("x")).toBe("\x1b[33mx\x1b[0m");
    expect(theme.secondary("x")).toBe("\x1b[2mx\x1b[0m");
    expect(theme.prompt("x")).toBe("\x1b[36mx\x1b[0m");
  });
});

describe("supportsColor", () => {
  test("un TTY sin overrides habilita el color", () => {
    expect(supportsColor({}, true)).toBe(true);
  });

  test("una salida que no es TTY lo desactiva", () => {
    expect(supportsColor({}, false)).toBe(false);
  });

  test("NO_COLOR lo desactiva", () => {
    expect(supportsColor({ NO_COLOR: "1" }, true)).toBe(false);
  });

  test("TERM=dumb lo desactiva", () => {
    expect(supportsColor({ TERM: "dumb" }, true)).toBe(false);
  });

  test("FORCE_COLOR lo habilita incluso sin TTY", () => {
    expect(supportsColor({ FORCE_COLOR: "1" }, false)).toBe(true);
  });

  test("FORCE_COLOR=0 lo desactiva incluso con TTY", () => {
    expect(supportsColor({ FORCE_COLOR: "0" }, true)).toBe(false);
    expect(supportsColor({ FORCE_COLOR: "false" }, true)).toBe(false);
  });
});
