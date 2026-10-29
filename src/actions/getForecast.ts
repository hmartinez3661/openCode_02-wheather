import type { ActionContext } from "../types/ActionContext.ts";
import { errorMessage } from "../utils/errors.ts";
import { formatCity, formatForecast } from "../utils/format.ts";
import { pickCity } from "./listCities.ts";

export async function showForecast(context: ActionContext): Promise<void> {
  const selected = await pickCity(context, "  Número de la ciudad para el pronóstico: ");
  if (!selected) return;

  try {
    const forecast = await context.getForecast(selected.city, context.state.unit);
    context.out.line(
      `  ${formatForecast(selected.city, forecast, context.state.unit, context.theme)}`,
    );
  } catch (error) {
    context.out.error(
      context.theme.error(`  ${formatCity(selected.city)}: ${errorMessage(error)}`),
    );
  }
}
