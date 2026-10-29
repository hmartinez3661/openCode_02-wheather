import type { AppState } from "../types/AppState.ts";
import type { MenuOption } from "../types/MenuOption.ts";
import { plainTheme, type Theme } from "../utils/colors.ts";
import { MENU_LINE } from "../utils/constants.ts";
import { unitSymbol } from "../utils/format.ts";
import type { Prompter } from "./input.ts";
import type { Output } from "./output.ts";

export const MENU_OPTIONS: readonly MenuOption[] = [
  { id: "1", label: () => "Clima de ciudad default" },
  { id: "2", label: (state) => `Clima de todas las ciudades (${state.cities.length})` },
  { id: "3", label: () => "Buscar y agregar ciudad" },
  { id: "4", label: () => "Eliminar ciudad" },
  { id: "5", label: () => "Establecer ciudad default" },
  { id: "6", label: () => "Pronóstico de 7 días" },
  { id: "8", label: (state) => `Ajustes (${unitSymbol(state.unit)})` },
  { id: "9", label: () => "Salir" },
];

export function renderMenu(
  state: AppState,
  theme: Theme = plainTheme,
  options: readonly MenuOption[] = MENU_OPTIONS,
): string {
  const border = theme.menu(MENU_LINE);

  return [
    "",
    border,
    theme.title("         WEATHER CLI"),
    border,
    ...options.map((option) => theme.menu(`  ${option.id}. ${option.label(state)}`)),
    border,
  ].join("\n");
}

export interface MenuRunnerOptions {
  state: AppState;
  theme: Theme;
  prompt: Prompter;
  out: Output;
  options?: readonly MenuOption[];
  /** Devuelve false para terminar el menú. */
  dispatch: (id: string) => Promise<boolean>;
}

export async function runMenu(options: MenuRunnerOptions): Promise<void> {
  const { state, theme, prompt, out, dispatch } = options;
  const menuOptions = options.options ?? MENU_OPTIONS;
  let running = true;

  while (running) {
    out.line(renderMenu(state, theme, menuOptions));
    const answer = await prompt.ask(theme.prompt("  Selecciona una opción: "));
    const id = answer.trim();

    if (!menuOptions.some((option) => option.id === id)) {
      out.line(theme.error("  Opción inválida. Elige una opción del menú."));
      continue;
    }

    running = await dispatch(id);
  }
}
