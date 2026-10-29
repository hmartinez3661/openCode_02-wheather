import { parseSelection } from "../presentation/input.ts";
import { sameCity } from "../storage/citiesStorage.ts";
import type { ActionContext } from "../types/ActionContext.ts";
import type { City } from "../types/City.ts";
import { formatCity } from "../utils/format.ts";

export function listCities(context: ActionContext): void {
  context.state.cities.forEach((city, index) => {
    const suffix =
      context.state.defaultCity && sameCity(city, context.state.defaultCity) ? " (default)" : "";
    context.out.line(`  ${index + 1}. ${formatCity(city)}${suffix}`);
  });
}

export async function pickCity(
  context: ActionContext,
  promptText: string,
): Promise<{ city: City; index: number } | null> {
  if (context.state.cities.length === 0) {
    context.out.line(
      context.theme.warning("  No hay ciudades registradas. Usa la opción 3 para agregar una."),
    );
    return null;
  }

  listCities(context);

  const answer = await context.prompt.ask(context.theme.prompt(promptText));
  const selection = parseSelection(answer, context.state.cities.length);
  if (selection === null) {
    context.out.line(context.theme.error("  Selección inválida."));
    return null;
  }

  const city = context.state.cities[selection - 1];
  return city ? { city, index: selection - 1 } : null;
}
