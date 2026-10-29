import type { ActionContext } from "../types/ActionContext.ts";
import type { City } from "../types/City.ts";
import { errorMessage } from "../utils/errors.ts";
import { formatCity, formatWeather } from "../utils/format.ts";
import { addCity } from "./addCity.ts";

export async function printWeather(context: ActionContext, city: City): Promise<void> {
  try {
    const weather = await context.getWeather(city, context.state.unit);
    context.out.line(`  ${formatWeather(city, weather, context.state.unit, context.theme)}`);
  } catch (error) {
    context.out.error(context.theme.error(`  ${formatCity(city)}: ${errorMessage(error)}`));
  }
}

export async function showDefaultWeather(context: ActionContext): Promise<void> {
  const city = context.state.defaultCity;
  if (!city) {
    context.out.line(context.theme.warning("  No hay una ciudad default configurada."));
    await addCity(context);
    return;
  }

  await printWeather(context, city);
}
