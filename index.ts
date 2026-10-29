import { WeatherApp } from "./src/actions.ts";
import { resolveStatePath } from "./src/config.ts";
import { ConsolePrompter } from "./src/menu.ts";
import { createTheme, supportsColor } from "./src/theme.ts";

const theme = createTheme({ enabled: supportsColor() });
const prompter = new ConsolePrompter();

try {
  const app = new WeatherApp(prompter, resolveStatePath(), { theme });
  await app.run();
  console.log(theme.menu("\n  Hasta luego.\n"));
} catch (error) {
  if (error instanceof Error && error.message === "readline was closed") {
    console.log(theme.menu("\n  Hasta luego.\n"));
  } else {
    const message = error instanceof Error ? error.message : String(error);
    console.error(theme.error(`\n  Error inesperado: ${message}\n`));
    process.exitCode = 1;
  }
} finally {
  prompter.close();
}
