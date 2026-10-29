import type { City } from "../types/City.ts";
import { GEOCODING_URL } from "../utils/constants.ts";
import { isFiniteNumber, isRecord } from "../utils/validation.ts";
import { requestJson } from "./client.ts";

export async function geocodeCity(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<City | null> {
  const name = query.trim();
  if (name === "") return null;

  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");

  const data = await requestJson(url, fetchImpl);
  if (!isRecord(data) || !Array.isArray(data.results)) return null;

  const result = data.results[0];
  if (!isRecord(result)) return null;

  const { name: cityName, latitude, longitude, country, admin1 } = result;
  if (typeof cityName !== "string" || cityName.trim() === "") return null;
  if (!isFiniteNumber(latitude)) return null;
  if (!isFiniteNumber(longitude)) return null;

  const city: City = { name: cityName.trim(), latitude, longitude };
  if (typeof country === "string" && country.trim() !== "") city.country = country.trim();
  if (typeof admin1 === "string" && admin1.trim() !== "") city.admin1 = admin1.trim();
  return city;
}
