import type { ActionContext } from "../types/ActionContext.ts";
import { printWeather } from "./getWeather.ts";

export async function showAllWeather(context: ActionContext): Promise<void> {
  if (context.state.cities.length === 0) {
    context.out.line(
      context.theme.warning("  No hay ciudades registradas. Usa la opción 3 para agregar una."),
    );
    return;
  }

  for (const city of context.state.cities) {
    await printWeather(context, city);
  }
}
