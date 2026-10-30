import { describe, expect, test } from "bun:test";
import { createConsoleOutput } from "../src/presentation/output.ts";

describe("createConsoleOutput", () => {
  test("dirige line() al logging normal", () => {
    const lines: string[] = [];
    const output = createConsoleOutput((message) => lines.push(message));

    output.line("Hola");

    expect(lines).toEqual(["Hola"]);
  });

  test("dirige error() al logging de errores", () => {
    const lines: string[] = [];
    const errors: string[] = [];
    const output = createConsoleOutput(
      (message) => lines.push(message),
      (message) => errors.push(message),
    );

    output.error("Ups");
    output.line("Ok");

    expect(lines).toEqual(["Ok"]);
    expect(errors).toEqual(["Ups"]);
  });

  test("usa console.log y console.error por defecto", () => {
    const logged: string[] = [];
    const errored: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (message: string) => logged.push(message);
    console.error = (message: string) => errored.push(message);

    try {
      const output = createConsoleOutput();
      output.line("línea");
      output.error("error");
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }

    expect(logged).toEqual(["línea"]);
    expect(errored).toEqual(["error"]);
  });
});
