import { sameCity } from "../storage/citiesStorage.ts";
import type { ActionContext } from "../types/ActionContext.ts";
import { formatCity } from "../utils/format.ts";
import { pickCity } from "./listCities.ts";

export async function removeCity(context: ActionContext): Promise<void> {
  const selected = await pickCity(context, "  Número de la ciudad a eliminar: ");
  if (!selected) return;

  context.state.cities.splice(selected.index, 1);
  if (context.state.defaultCity && sameCity(context.state.defaultCity, selected.city)) {
    context.state.defaultCity = context.state.cities[0] ?? null;
  }

  await context.persist();
  context.out.line(context.theme.success(`  Ciudad eliminada: ${formatCity(selected.city)}.`));
  if (context.state.defaultCity) {
    context.out.line(
      context.theme.secondary(`  Ciudad default actual: ${formatCity(context.state.defaultCity)}.`),
    );
  } else {
    context.out.line(context.theme.warning("  Ya no hay una ciudad default configurada."));
  }
}
