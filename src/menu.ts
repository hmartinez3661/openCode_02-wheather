import { createInterface } from "node:readline/promises";
import { unitSymbol } from "./format.ts";
import type { AppState } from "./state.ts";

const LINE = "═".repeat(40);

export interface Prompter {
  ask(question: string): Promise<string>;
  close(): void;
}

export class ConsolePrompter implements Prompter {
  private readonly rl: ReturnType<typeof createInterface>;

  constructor() {
    this.rl = createInterface({ input: process.stdin, output: process.stdout });
    this.rl.on("SIGINT", () => {
      this.rl.close();
      process.stdout.write("\n  Hasta luego.\n");
      process.exit(0);
    });
  }

  ask(question: string): Promise<string> {
    return this.rl.question(question);
  }

  close(): void {
    this.rl.close();
  }
}

export function renderMenu(state: AppState): string {
  return [
    "",
    LINE,
    "         WEATHER CLI",
    LINE,
    "  1. Clima de ciudad default",
    `  2. Clima de todas las ciudades (${state.cities.length})`,
    "  3. Buscar y agregar ciudad",
    "  4. Eliminar ciudad",
    "  5. Establecer ciudad default",
    `  8. Ajustes (${unitSymbol(state.unit)})`,
    "  9. Salir",
    LINE,
  ].join("\n");
}

export function parseSelection(input: string, max: number): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;

  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 1 || value > max) return null;
  return value;
}
