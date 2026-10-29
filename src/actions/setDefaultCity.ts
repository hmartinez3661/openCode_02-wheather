import type { ActionContext } from "../types/ActionContext.ts";
import { formatCity } from "../utils/format.ts";
import { pickCity } from "./listCities.ts";

export async function setDefaultCity(context: ActionContext): Promise<void> {
  const selected = await pickCity(context, "  Número de la nueva ciudad default: ");
  if (!selected) return;

  context.state.defaultCity = selected.city;
  await context.persist();
  context.out.line(context.theme.success(`  Ciudad default: ${formatCity(selected.city)}.`));
}
