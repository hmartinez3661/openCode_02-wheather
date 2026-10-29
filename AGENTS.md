# AGENTS.md

## Overview
- Bun + TypeScript weather CLI using OpenMeteo. User-facing text and menu labels are in Spanish.
- Entry point `src/index.ts`; implementation in `src/`: `actions/` (menu actions), `api/` (OpenMeteo), `storage/` (persistence), `presentation/` (menu, input, output), `types/` (shared contracts), `utils/` (format, colors, constants).
- No runtime dependencies or third-party CLI libraries; use Bun/Node built-ins (`node:readline/promises`, `node:fs/promises`) and Bun's `fetch`.

## Commands
- `bun run start` — run the CLI.
- `bun test` — run `tests/*.test.ts`; tests mock `fetch` and never hit the network.
- `bun run typecheck` (runs `bun check`) — type-check after edits.
- `bun run build` — compile `dist/weather` (`dist/weather.exe` on Windows) with `bun build --compile`.

## TypeScript conventions (differ from defaults)
- ESM with `module: Preserve` and `allowImportingTsExtensions`: import local files with their explicit `.ts` extension.
- `verbatimModuleSyntax` is on: use `import type` for type-only imports.
- `noUncheckedIndexedAccess` is on: indexed/array access is `T | undefined`, so handle the undefined case.
- `strict` is on and `noEmit` is set; Bun executes `.ts` directly.

## State and persistence
- State is split into `cities.json` (cities + default city) and `settings.json` (temperature unit). Both live next to the compiled executable; in dev (when `process.execPath` is Bun) they resolve to the project root; see `src/storage/statePath.ts`.
- `WEATHER_CLI_DATA_DIR` overrides the data directory. `WEATHER_CLI_STATE_PATH` locates the legacy `weather-cli.json`; its directory is used as the base when `WEATHER_CLI_DATA_DIR` is not set.
- On first load, if both new files are missing and `weather-cli.json` exists, `src/storage/stateStore.ts` migrates it and keeps the legacy file as a backup.
- `defaultCity` must be one of `cities` or `null`; preserve that invariant when adding/removing cities.
- Writes are atomic per file (temp file + rename). A corrupt file warns and only that slice starts empty; save failures warn but never crash the menu loop.
- Actions mutate `ActionContext.state` and call `ActionContext.persist()`; `src/index.ts` builds the context and wires the dependencies.

## OpenMeteo integration
Two endpoints, no API key:
1. Geocode: `https://geocoding-api.open-meteo.com/v1/search?name=<city>&count=1&language=es&format=json`
2. Forecast: `https://api.open-meteo.com/v1/forecast?latitude=<lat>&longitude=<lon>&current=temperature_2m,apparent_temperature[&temperature_unit=fahrenheit]`
   - 7-day forecast uses the same endpoint with `daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&forecast_days=7&timezone=auto` (plus `temperature_unit=fahrenheit` when needed).

Validate response payloads before use (see `src/api/weather.ts` and `src/api/geocoding.ts`); map network/HTTP failures to `WeatherApiError` (defined in `src/api/client.ts`).

## Colors
- `src/utils/colors.ts` defines semantic ANSI painters (menu, temperature, success, error, warning, secondary, prompt) and `supportsColor`, which honors `NO_COLOR`, `FORCE_COLOR`, TTY detection, and `TERM=dumb`.
- `src/index.ts` injects the auto-detected theme; actions default to plain text via the injected context, so unit tests assert unstyled text. Do not store ANSI codes in state or emit them from pure formatters unless a theme is passed explicitly.
