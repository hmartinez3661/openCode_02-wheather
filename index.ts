import { WeatherApp } from "./src/actions.ts";
import { resolveStatePath } from "./src/config.ts";
import { ConsolePrompter } from "./src/menu.ts";

const prompter = new ConsolePrompter();

try {
  const app = new WeatherApp(prompter, resolveStatePath());
  await app.run();
  console.log("\n  Hasta luego.\n");
} catch (error) {
  if (error instanceof Error && error.message === "readline was closed") {
    console.log("\n  Hasta luego.\n");
  } else {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n  Error inesperado: ${message}\n`);
    process.exitCode = 1;
  }
} finally {
  prompter.close();
}
