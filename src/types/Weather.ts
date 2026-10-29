export interface Weather {
  temperature: number;
  apparentTemperature: number | null;
}

export interface ForecastDay {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number | null;
  precipitationProbability: number | null;
}

export interface Forecast {
  days: ForecastDay[];
}
