import { afterEach, describe, expect, test } from "bun:test";
import { geocodeCity, getForecast, getWeather, WeatherApiError } from "../src/api.ts";

type FetchInput = Parameters<typeof fetch>[0];

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(handler: (input: FetchInput) => Promise<Response>): () => URL | null {
  let requested: URL | null = null;

  globalThis.fetch = (async (input: FetchInput) => {
    requested = new URL(String(input));
    return handler(input);
  }) as typeof fetch;

  return () => requested;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("geocodeCity", () => {
  test("devuelve la primera coincidencia y usa los parámetros esperados", async () => {
    const getRequested = mockFetch(async () =>
      jsonResponse({
        results: [
          {
            name: "Ottawa",
            latitude: 45.41117,
            longitude: -75.69812,
            country: "Canadá",
            admin1: "Ontario",
          },
        ],
      }),
    );

    const city = await geocodeCity(" Ottawa ");

    expect(city).toEqual({
      name: "Ottawa",
      latitude: 45.41117,
      longitude: -75.69812,
      country: "Canadá",
      admin1: "Ontario",
    });

    const url = getRequested();
    expect(url?.origin).toBe("https://geocoding-api.open-meteo.com");
    expect(url?.pathname).toBe("/v1/search");
    expect(url?.searchParams.get("name")).toBe("Ottawa");
    expect(url?.searchParams.get("count")).toBe("1");
    expect(url?.searchParams.get("language")).toBe("es");
    expect(url?.searchParams.get("format")).toBe("json");
  });

  test("devuelve null cuando no hay resultados", async () => {
    mockFetch(async () => jsonResponse({ results: [] }));

    expect(await geocodeCity("Ciudad Inexistente")).toBeNull();
  });
});

describe("getWeather", () => {
  test("solicita temperatura y sensación térmica en Fahrenheit", async () => {
    const getRequested = mockFetch(async () =>
      jsonResponse({ current: { temperature_2m: 52.3, apparent_temperature: 50.1 } }),
    );

    const weather = await getWeather({ latitude: 45, longitude: -75 }, "fahrenheit");

    expect(weather).toEqual({ temperature: 52.3, apparentTemperature: 50.1 });

    const url = getRequested();
    expect(url?.searchParams.get("latitude")).toBe("45");
    expect(url?.searchParams.get("longitude")).toBe("-75");
    expect(url?.searchParams.get("current")).toBe("temperature_2m,apparent_temperature");
    expect(url?.searchParams.get("temperature_unit")).toBe("fahrenheit");
  });

  test("omite temperature_unit para Celsius", async () => {
    const getRequested = mockFetch(async () =>
      jsonResponse({ current: { temperature_2m: 11.2, apparent_temperature: 10 } }),
    );

    await getWeather({ latitude: 45, longitude: -75 }, "celsius");

    expect(getRequested()?.searchParams.has("temperature_unit")).toBe(false);
  });

  test("convierte un error HTTP en WeatherApiError", async () => {
    mockFetch(async () => jsonResponse({}, 500));

    await expect(getWeather({ latitude: 45, longitude: -75 }, "celsius")).rejects.toThrow(
      "HTTP 500",
    );
  });

  test("convierte un fallo de red en WeatherApiError", async () => {
    mockFetch(async () => {
      throw new Error("offline");
    });

    await expect(
      getWeather({ latitude: 45, longitude: -75 }, "celsius"),
    ).rejects.toBeInstanceOf(WeatherApiError);
  });
});

describe("getForecast", () => {
  test("solicita el pronóstico diario en Fahrenheit con los parámetros esperados", async () => {
    const getRequested = mockFetch(async () =>
      jsonResponse({
        daily: {
          time: ["2026-10-29", "2026-10-30"],
          temperature_2m_max: [12.3, 9.8],
          temperature_2m_min: [3.1, 1.2],
          weather_code: [2, 61],
          precipitation_probability_max: [40, null],
        },
      }),
    );

    const forecast = await getForecast({ latitude: 45, longitude: -75 }, "fahrenheit");

    expect(forecast.days).toEqual([
      {
        date: "2026-10-29",
        temperatureMax: 12.3,
        temperatureMin: 3.1,
        weatherCode: 2,
        precipitationProbability: 40,
      },
      {
        date: "2026-10-30",
        temperatureMax: 9.8,
        temperatureMin: 1.2,
        weatherCode: 61,
        precipitationProbability: null,
      },
    ]);

    const url = getRequested();
    expect(url?.searchParams.get("daily")).toBe(
      "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
    );
    expect(url?.searchParams.get("forecast_days")).toBe("7");
    expect(url?.searchParams.get("timezone")).toBe("auto");
    expect(url?.searchParams.get("temperature_unit")).toBe("fahrenheit");
  });

  test("omite temperature_unit para Celsius y tolera datos opcionales ausentes", async () => {
    const getRequested = mockFetch(async () =>
      jsonResponse({
        daily: {
          time: ["2026-10-29"],
          temperature_2m_max: [12],
          temperature_2m_min: [3],
        },
      }),
    );

    const forecast = await getForecast({ latitude: 45, longitude: -75 }, "celsius");

    expect(forecast.days).toEqual([
      {
        date: "2026-10-29",
        temperatureMax: 12,
        temperatureMin: 3,
        weatherCode: null,
        precipitationProbability: null,
      },
    ]);
    expect(getRequested()?.searchParams.has("temperature_unit")).toBe(false);
  });

  test("limita el pronóstico a 7 días", async () => {
    mockFetch(async () =>
      jsonResponse({
        daily: {
          time: Array.from({ length: 10 }, (_, index) => `2026-11-${String(index + 1).padStart(2, "0")}`),
          temperature_2m_max: Array.from({ length: 10 }, () => 12),
          temperature_2m_min: Array.from({ length: 10 }, () => 3),
        },
      }),
    );

    const forecast = await getForecast({ latitude: 45, longitude: -75 }, "celsius");

    expect(forecast.days).toHaveLength(7);
  });

  test("lanza WeatherApiError cuando falta la sección diaria", async () => {
    mockFetch(async () => jsonResponse({ current: { temperature_2m: 10 } }));

    await expect(
      getForecast({ latitude: 45, longitude: -75 }, "celsius"),
    ).rejects.toBeInstanceOf(WeatherApiError);
  });

  test("lanza WeatherApiError cuando no hay días válidos", async () => {
    mockFetch(async () =>
      jsonResponse({
        daily: { time: [], temperature_2m_max: [], temperature_2m_min: [] },
      }),
    );

    await expect(getForecast({ latitude: 45, longitude: -75 }, "celsius")).rejects.toThrow(
      "pronóstico diario",
    );
  });
});
