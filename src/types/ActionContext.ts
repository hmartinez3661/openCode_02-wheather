import type { geocodeCity } from "../api/geocoding.ts";
import type { getForecast, getWeather } from "../api/weather.ts";
import type { Prompter } from "../presentation/input.ts";
import type { Output } from "../presentation/output.ts";
import type { Theme } from "../utils/colors.ts";
import type { AppState } from "./AppState.ts";

export interface ActionContext {
  state: AppState;
  out: Output;
  theme: Theme;
  prompt: Prompter;
  geocodeCity: typeof geocodeCity;
  getWeather: typeof getWeather;
  getForecast: typeof getForecast;
  persist: () => Promise<void>;
}
