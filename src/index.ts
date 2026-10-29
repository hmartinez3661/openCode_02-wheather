import { addCity } from "./actions/addCity.ts";
import { showAllWeather } from "./actions/getAllWeather.ts";
import { showForecast } from "./actions/getForecast.ts";
import { showDefaultWeather } from "./actions/getWeather.ts";
import { removeCity } from "./actions/removeCity.ts";
import { setDefaultCity } from "./actions/setDefaultCity.ts";
import { toggleUnit } from "./actions/toggleUnit.ts";
import { geocodeCity } from "./api/geocoding.ts";
import { getForecast, getWeather } from "./api/weather.ts";
import { ConsolePrompter } from "./presentation/input.ts";
import { MENU_OPTIONS, runMenu } from "./presentation/menu.ts";
import { createConsoleOutput } from "./presentation/output.ts";
import { resolveStatePaths } from "./storage/statePath.ts";
import { loadAppState, saveAppState } from "./storage/stateStore.ts";
import type { ActionContext } from "./types/ActionContext.ts";
import { createTheme, supportsColor } from "./utils/colors.ts";
import { errorMessage } from "./utils/errors.ts";

const theme = createTheme({ enabled: supportsColor() });
const prompter = new ConsolePrompter();
const output = createConsoleOutput();

try {
  const paths = resolveStatePaths();
  const loaded = await loadAppState(paths);
  for (const warning of loaded.warnings) {
    output.error(theme.warning(`  ${warning}`));
  }

  const state = loaded.state;
  const context: ActionContext = {
    state,
    out: output,
    theme,
    prompt: prompter,
    geocodeCity,
    getWeather,
    getForecast,
    persist: async () => {
      try {
        await saveAppState(state, paths);
      } catch (error) {
        output.error(theme.error(`  No se pudo guardar la configuración: ${errorMessage(error)}`));
      }
    },
  };

  if (state.cities.length === 0) {
    output.line(theme.menu("\n  ¡Bienvenido! Agrega tu primera ciudad para comenzar."));
    await addCity(context);
  }

  await runMenu({
    state,
    theme,
    prompt: prompter,
    out: output,
    options: MENU_OPTIONS,
    dispatch: (id) => dispatch(id, context),
  });

  console.log(theme.menu("\n  Hasta luego.\n"));
} catch (error) {
  if (error instanceof Error && error.message === "readline was closed") {
    console.log(theme.menu("\n  Hasta luego.\n"));
  } else {
    console.error(theme.error(`\n  Error inesperado: ${errorMessage(error)}\n`));
    process.exitCode = 1;
  }
} finally {
  prompter.close();
}

async function dispatch(id: string, context: ActionContext): Promise<boolean> {
  switch (id) {
    case "1":
      await showDefaultWeather(context);
      break;
    case "2":
      await showAllWeather(context);
      break;
    case "3":
      await addCity(context);
      break;
    case "4":
      await removeCity(context);
      break;
    case "5":
      await setDefaultCity(context);
      break;
    case "6":
      await showForecast(context);
      break;
    case "8":
      await toggleUnit(context);
      break;
    case "9":
      return false;
    default:
      break;
  }

  return true;
}
