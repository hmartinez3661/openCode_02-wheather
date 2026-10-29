import { geocodeCity, getForecast, getWeather } from "./api.ts";
import { formatCity, formatForecast, formatWeather, unitSymbol } from "./format.ts";
import { parseSelection, renderMenu, type Prompter } from "./menu.ts";
import {
  createEmptyState,
  loadState,
  sameCity,
  saveState,
  type AppState,
  type City,
} from "./state.ts";
import { plainTheme, type Theme } from "./theme.ts";

export interface WeatherAppOptions {
  out?: (message: string) => void;
  error?: (message: string) => void;
  theme?: Theme;
  loadState?: typeof loadState;
  saveState?: typeof saveState;
  geocodeCity?: typeof geocodeCity;
  getWeather?: typeof getWeather;
  getForecast?: typeof getForecast;
}

export class WeatherApp {
  private state: AppState = createEmptyState();
  private readonly out: (message: string) => void;
  private readonly error: (message: string) => void;
  private readonly theme: Theme;
  private readonly load: typeof loadState;
  private readonly save: typeof saveState;
  private readonly geocode: typeof geocodeCity;
  private readonly fetchWeather: typeof getWeather;
  private readonly fetchForecast: typeof getForecast;

  constructor(
    private readonly prompt: Prompter,
    private readonly statePath: string,
    options: WeatherAppOptions = {},
  ) {
    this.out = options.out ?? console.log;
    this.error = options.error ?? console.error;
    this.theme = options.theme ?? plainTheme;
    this.load = options.loadState ?? loadState;
    this.save = options.saveState ?? saveState;
    this.geocode = options.geocodeCity ?? geocodeCity;
    this.fetchWeather = options.getWeather ?? getWeather;
    this.fetchForecast = options.getForecast ?? getForecast;
  }

  async run(): Promise<void> {
    const loaded = await this.load(this.statePath);
    this.state = loaded.state;
    if (loaded.warning) this.error(this.theme.warning(`  ${loaded.warning}`));

    if (this.state.cities.length === 0) {
      this.out(this.theme.menu("\n  ¡Bienvenido! Agrega tu primera ciudad para comenzar."));
      await this.addCity();
    }

    let running = true;
    while (running) {
      this.out(renderMenu(this.state, this.theme));
      const answer = await this.prompt.ask(this.theme.prompt("  Selecciona una opción: "));
      running = await this.handle(answer.trim());
    }
  }

  private async handle(option: string): Promise<boolean> {
    switch (option) {
      case "1":
        await this.showDefaultCity();
        break;
      case "2":
        await this.showAllCities();
        break;
      case "3":
        await this.addCity();
        break;
      case "4":
        await this.removeCity();
        break;
      case "5":
        await this.setDefaultCity();
        break;
      case "6":
        await this.showForecast();
        break;
      case "8":
        await this.toggleUnit();
        break;
      case "9":
        return false;
      default:
        this.out(this.theme.error("  Opción inválida. Elige una opción del menú."));
    }

    return true;
  }

  private async showDefaultCity(): Promise<void> {
    const city = this.state.defaultCity;
    if (!city) {
      this.out(this.theme.warning("  No hay una ciudad default configurada."));
      await this.addCity();
      return;
    }

    await this.showWeather(city);
  }

  private async showAllCities(): Promise<void> {
    if (this.state.cities.length === 0) {
      this.out(this.theme.warning("  No hay ciudades registradas. Usa la opción 3 para agregar una."));
      return;
    }

    for (const city of this.state.cities) {
      await this.showWeather(city);
    }
  }

  private async showWeather(city: City): Promise<void> {
    try {
      const weather = await this.fetchWeather(city, this.state.unit);
      this.out(`  ${formatWeather(city, weather, this.state.unit, this.theme)}`);
    } catch (error) {
      this.error(this.theme.error(`  ${formatCity(city)}: ${errorMessage(error)}`));
    }
  }

  private async showForecast(): Promise<void> {
    const selected = await this.pickCity("  Número de la ciudad para el pronóstico: ");
    if (!selected) return;

    try {
      const forecast = await this.fetchForecast(selected.city, this.state.unit);
      this.out(`  ${formatForecast(selected.city, forecast, this.state.unit, this.theme)}`);
    } catch (error) {
      this.error(this.theme.error(`  ${formatCity(selected.city)}: ${errorMessage(error)}`));
    }
  }

  private async addCity(): Promise<void> {
    const name = (await this.prompt.ask(this.theme.prompt("  Nombre de la ciudad: "))).trim();
    if (name === "") {
      this.out(this.theme.error("  Debes ingresar un nombre de ciudad."));
      return;
    }

    this.out(this.theme.secondary(`  Buscando "${name}"...`));
    try {
      const city = await this.geocode(name);
      if (!city) {
        this.out(this.theme.error(`  No se encontró la ciudad "${name}".`));
        return;
      }

      if (this.state.cities.some((existing) => sameCity(existing, city))) {
        this.out(this.theme.warning(`  ${formatCity(city)} ya está registrada.`));
        return;
      }

      const isFirstCity = this.state.defaultCity === null;
      this.state.cities.push(city);
      if (isFirstCity) this.state.defaultCity = city;
      await this.persist();
      this.out(
        this.theme.success(
          `  Ciudad agregada: ${formatCity(city)}${isFirstCity ? " (default)" : ""}.`,
        ),
      );
    } catch (error) {
      this.error(this.theme.error(`  ${errorMessage(error)}`));
    }
  }

  private async removeCity(): Promise<void> {
    const selected = await this.pickCity("  Número de la ciudad a eliminar: ");
    if (!selected) return;

    this.state.cities.splice(selected.index, 1);
    if (this.state.defaultCity && sameCity(this.state.defaultCity, selected.city)) {
      this.state.defaultCity = this.state.cities[0] ?? null;
    }

    await this.persist();
    this.out(this.theme.success(`  Ciudad eliminada: ${formatCity(selected.city)}.`));
    if (this.state.defaultCity) {
      this.out(this.theme.secondary(`  Ciudad default actual: ${formatCity(this.state.defaultCity)}.`));
    } else {
      this.out(this.theme.warning("  Ya no hay una ciudad default configurada."));
    }
  }

  private async setDefaultCity(): Promise<void> {
    const selected = await this.pickCity("  Número de la nueva ciudad default: ");
    if (!selected) return;

    this.state.defaultCity = selected.city;
    await this.persist();
    this.out(this.theme.success(`  Ciudad default: ${formatCity(selected.city)}.`));
  }

  private async toggleUnit(): Promise<void> {
    this.state.unit = this.state.unit === "celsius" ? "fahrenheit" : "celsius";
    await this.persist();
    this.out(this.theme.success(`  Unidad ajustada a ${unitSymbol(this.state.unit)}.`));
  }

  private async pickCity(promptText: string): Promise<{ city: City; index: number } | null> {
    if (this.state.cities.length === 0) {
      this.out(this.theme.warning("  No hay ciudades registradas. Usa la opción 3 para agregar una."));
      return null;
    }

    this.state.cities.forEach((city, index) => {
      const suffix =
        this.state.defaultCity && sameCity(city, this.state.defaultCity) ? " (default)" : "";
      this.out(`  ${index + 1}. ${formatCity(city)}${suffix}`);
    });

    const answer = await this.prompt.ask(this.theme.prompt(promptText));
    const selection = parseSelection(answer, this.state.cities.length);
    if (selection === null) {
      this.out(this.theme.error("  Selección inválida."));
      return null;
    }

    const city = this.state.cities[selection - 1];
    return city ? { city, index: selection - 1 } : null;
  }

  private async persist(): Promise<void> {
    try {
      await this.save(this.state, this.statePath);
    } catch (error) {
      this.error(this.theme.error(`  No se pudo guardar la configuración: ${errorMessage(error)}`));
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
