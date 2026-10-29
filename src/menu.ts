import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";
import { unitSymbol } from "./format.ts";
import type { AppState } from "./state.ts";
import { plainTheme, type Theme } from "./theme.ts";

const LINE = "═".repeat(40);

export interface Prompter {
  ask(question: string): Promise<string>;
  close(): void;
}

export class ConsolePrompter implements Prompter {
  private readonly rl: ReturnType<typeof createInterface>;
  private readonly output: Writable;
  private readonly lines: string[] = [];
  private readonly waiters: Array<{
    resolve: (line: string) => void;
    reject: (error: Error) => void;
  }> = [];
  private closed = false;

  constructor(input: Readable = process.stdin, output: Writable = process.stdout) {
    this.output = output;
    this.rl = createInterface({ input, output });

    this.rl.on("line", (line) => {
      const waiter = this.waiters.shift();
      if (waiter) waiter.resolve(line);
      else this.lines.push(line);
    });

    this.rl.on("close", () => {
      this.closed = true;
      for (const waiter of this.waiters.splice(0)) {
        waiter.reject(new Error("readline was closed"));
      }
    });

    this.rl.on("SIGINT", () => {
      this.rl.close();
      output.write("\n  Hasta luego.\n");
      process.exit(0);
    });
  }

  ask(question: string): Promise<string> {
    this.output.write(question);

    const line = this.lines.shift();
    if (line !== undefined) return Promise.resolve(line);
    if (this.closed) return Promise.reject(new Error("readline was closed"));

    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  close(): void {
    this.closed = true;
    this.rl.close();
  }
}

export function renderMenu(state: AppState, theme: Theme = plainTheme): string {
  const border = theme.menu(LINE);

  return [
    "",
    border,
    theme.title("         WEATHER CLI"),
    border,
    theme.menu("  1. Clima de ciudad default"),
    theme.menu(`  2. Clima de todas las ciudades (${state.cities.length})`),
    theme.menu("  3. Buscar y agregar ciudad"),
    theme.menu("  4. Eliminar ciudad"),
    theme.menu("  5. Establecer ciudad default"),
    theme.menu("  6. Pronóstico de 7 días"),
    theme.menu(`  8. Ajustes (${unitSymbol(state.unit)})`),
    theme.menu("  9. Salir"),
    border,
  ].join("\n");
}

export function parseSelection(input: string, max: number): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;

  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 1 || value > max) return null;
  return value;
}
