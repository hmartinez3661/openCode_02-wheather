import { REQUEST_TIMEOUT_MS } from "../utils/constants.ts";

export class WeatherApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherApiError";
  }
}

export async function requestJson(url: URL, fetchImpl: typeof fetch): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new WeatherApiError("No se pudo conectar con OpenMeteo. Revisa tu conexión a internet.");
  }

  if (!response.ok) {
    throw new WeatherApiError(`OpenMeteo respondió con error HTTP ${response.status}.`);
  }

  try {
    return await response.json();
  } catch {
    throw new WeatherApiError("OpenMeteo devolvió una respuesta no válida.");
  }
}
