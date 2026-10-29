import type { AppState } from "./AppState.ts";

export interface MenuOption {
  id: string;
  label: (state: AppState) => string;
}
