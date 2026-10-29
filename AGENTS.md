# AGENTS.md

## Overview
- Bun + TypeScript weather CLI using OpenMeteo. User-facing text and menu labels are in Spanish.
- Entry point `index.ts`; implementation in `src/`: `actions.ts` (menu flow), `api.ts` (OpenMeteo), `state.ts`, `config.ts`, `menu.ts`, `format.ts`.
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
- State lives in `weather-cli.json` next to the compiled executable. In dev (when `process.execPath` is Bun) it resolves to the project root; see `src/config.ts`.
- `WEATHER_CLI_STATE_PATH` overrides the path. Tests pass explicit paths instead of touching the real state file.
- `defaultCity` must be one of `cities` or `null`; preserve that invariant when adding/removing cities.
- Saves are atomic (temp file + rename). A corrupt state file warns and starts empty; save failures warn but never crash the menu loop.

## OpenMeteo integration
Two calls, no API key:
1. Geocode: `https://geocoding-api.open-meteo.com/v1/search?name=<city>&count=1&language=es&format=json`
2. Forecast: `https://api.open-meteo.com/v1/forecast?latitude=<lat>&longitude=<lon>&current=temperature_2m,apparent_temperature[&temperature_unit=fahrenheit]`

Validate response payloads before use (see `src/api.ts`); map network/HTTP failures to `WeatherApiError`.
