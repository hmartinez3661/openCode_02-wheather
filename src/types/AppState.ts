import type { City } from "./City.ts";

export type TemperatureUnit = "celsius" | "fahrenheit";

export interface Settings {
  unit: TemperatureUnit;
}

export interface AppState {
  defaultCity: City | null;
  cities: City[];
  unit: TemperatureUnit;
}
