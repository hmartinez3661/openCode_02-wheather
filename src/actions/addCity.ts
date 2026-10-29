import type { ActionContext } from "../types/ActionContext.ts";
import { errorMessage } from "../utils/errors.ts";
import { formatCity } from "../utils/format.ts";
import { sameCity } from "../storage/citiesStorage.ts";

export async function addCity(context: ActionContext): Promise<void> {
  const name = (await context.prompt.ask(context.theme.prompt("  Nombre de la ciudad: "))).trim();
  if (name === "") {
    context.out.line(context.theme.error("  Debes ingresar un nombre de ciudad."));
    return;
  }

  context.out.line(context.theme.secondary(`  Buscando "${name}"...`));
  try {
    const city = await context.geocodeCity(name);
    if (!city) {
      context.out.line(context.theme.error(`  No se encontró la ciudad "${name}".`));
      return;
    }

    if (context.state.cities.some((existing) => sameCity(existing, city))) {
      context.out.line(context.theme.warning(`  ${formatCity(city)} ya está registrada.`));
      return;
    }

    const isFirstCity = context.state.defaultCity === null;
    context.state.cities.push(city);
    if (isFirstCity) context.state.defaultCity = city;
    await context.persist();
    context.out.line(
      context.theme.success(
        `  Ciudad agregada: ${formatCity(city)}${isFirstCity ? " (default)" : ""}.`,
      ),
    );
  } catch (error) {
    context.out.error(context.theme.error(`  ${errorMessage(error)}`));
  }
}
