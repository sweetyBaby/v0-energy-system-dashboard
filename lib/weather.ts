export type WeatherData = {
  temperature: number
  weatherCode: number
  windSpeed: number
}

const WMO_LABEL_ZH: Record<number, string> = {
  0: "晴", 1: "晴间多云", 2: "多云", 3: "阴",
  45: "雾", 48: "冻雾",
  51: "小毛雨", 53: "毛毛雨", 55: "大毛雨",
  61: "小雨", 63: "中雨", 65: "大雨",
  71: "小雪", 73: "中雪", 75: "大雪", 77: "雪粒",
  80: "阵雨", 81: "中阵雨", 82: "强阵雨",
  85: "小阵雪", 86: "大阵雪",
  95: "雷暴", 96: "雷暴冰雹", 99: "强雷暴",
}

const WMO_LABEL_EN: Record<number, string> = {
  0: "Clear", 1: "Mostly Clear", 2: "Partly Cloudy", 3: "Overcast",
  45: "Foggy", 48: "Rime Fog",
  51: "Light Drizzle", 53: "Drizzle", 55: "Heavy Drizzle",
  61: "Light Rain", 63: "Rain", 65: "Heavy Rain",
  71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 77: "Snow Grains",
  80: "Showers", 81: "Rain Showers", 82: "Heavy Showers",
  85: "Light Snow Showers", 86: "Heavy Snow Showers",
  95: "Thunderstorm", 96: "T-Storm + Hail", 99: "Heavy T-Storm",
}

export function getWeatherLabel(code: number, zh: boolean): string {
  const map = zh ? WMO_LABEL_ZH : WMO_LABEL_EN
  return map[code] ?? (zh ? "未知" : "Unknown")
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Weather API ${res.status}`)
  const data = await res.json() as {
    current: { temperature_2m: number; weather_code: number; wind_speed_10m: number }
  }
  return {
    temperature: Math.round(data.current.temperature_2m),
    weatherCode: data.current.weather_code,
    windSpeed: Math.round(data.current.wind_speed_10m),
  }
}
