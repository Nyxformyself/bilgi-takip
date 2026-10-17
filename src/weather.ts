import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@bilgi-takip:weather:v1';
const CACHE_TTL_MS = 30 * 60 * 1000;

export const FALLBACK_LOCATION = {
  latitude: 41.6168,
  longitude: 41.6367,
  city: 'Batum',
};

export type WeatherData = {
  temperature: number;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  city: string;
  fetchedAt: number;
};

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

export async function fetchWeather(
  latitude: number,
  longitude: number,
  city: string
): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Hava durumu alınamadı (${res.status})`);
  const json = (await res.json()) as OpenMeteoResponse;
  const temperature = json.current?.temperature_2m;
  const code = json.current?.weather_code;
  if (typeof temperature !== 'number' || typeof code !== 'number') {
    throw new Error('Hava durumu verisi eksik');
  }
  const data: WeatherData = {
    temperature,
    weatherCode: code,
    tempMax: json.daily?.temperature_2m_max?.[0] ?? temperature,
    tempMin: json.daily?.temperature_2m_min?.[0] ?? temperature,
    city,
    fetchedAt: Date.now(),
  };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => {});
  return data;
}

export async function loadCachedWeather(): Promise<WeatherData | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherData;
    if (typeof parsed.temperature !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isFresh(data: WeatherData): boolean {
  return Date.now() - data.fetchedAt < CACHE_TTL_MS;
}

type WeatherInfo = {
  label: string;
  icon: string;
};

export function weatherInfo(code: number): WeatherInfo {
  if (code === 0) return { label: 'Açık', icon: 'sunny' };
  if (code === 1) return { label: 'Az bulutlu', icon: 'partly-sunny' };
  if (code === 2) return { label: 'Parçalı bulutlu', icon: 'partly-sunny' };
  if (code === 3) return { label: 'Kapalı', icon: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Sisli', icon: 'cloud-outline' };
  if (code >= 51 && code <= 57) return { label: 'Çisenti', icon: 'rainy-outline' };
  if (code >= 61 && code <= 67) return { label: 'Yağmurlu', icon: 'rainy' };
  if (code >= 71 && code <= 77) return { label: 'Karlı', icon: 'snow' };
  if (code >= 80 && code <= 82) return { label: 'Sağanak', icon: 'rainy' };
  if (code === 85 || code === 86) return { label: 'Kar sağanağı', icon: 'snow' };
  if (code >= 95) return { label: 'Gök gürültülü', icon: 'thunderstorm' };
  return { label: 'Bilinmiyor', icon: 'partly-sunny' };
}
