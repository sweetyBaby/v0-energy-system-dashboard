"use client"

import { useEffect, useState } from "react"
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { fetchWeather, getWeatherLabel, type WeatherData } from "@/lib/weather"

type HeaderInfoBarProps = {
  compact?: boolean
  latitude?: number | null
  longitude?: number | null
}

const pad = (n: number) => String(n).padStart(2, "0")

function useSystemClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function useWeatherData(lat: number | null | undefined, lng: number | null | undefined) {
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useEffect(() => {
    if (lat == null || lng == null) return
    let cancelled = false

    const load = async () => {
      try {
        const data = await fetchWeather(lat, lng)
        if (!cancelled) setWeather(data)
      } catch {
        // silently ignore — weather is non-critical
      }
    }

    void load()
    const id = setInterval(() => void load(), 10 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [lat, lng])

  return weather
}

function getWeatherIcon(code: number): LucideIcon {
  if (code === 0) return Sun
  if (code <= 2) return CloudSun
  if (code === 3) return Cloud
  if (code <= 48) return CloudFog
  if (code <= 57) return CloudDrizzle
  if (code <= 82) return CloudRain
  if (code <= 86) return CloudSnow
  return CloudLightning
}

const CHIP_BASE =
  "relative flex items-center gap-2 overflow-hidden rounded-[12px] border border-[#28475d] bg-[linear-gradient(180deg,rgba(9,21,35,0.94),rgba(6,14,25,0.98))] px-3 shadow-[0_0_0_1px_rgba(117,198,234,0.05)_inset,0_8px_20px_rgba(0,0,0,0.14)]"

export function HeaderInfoBar({ compact = false, latitude, longitude }: HeaderInfoBarProps) {
  const now = useSystemClock()
  const { language } = useLanguage()
  const zh = language === "zh"

  const hasLocation = latitude != null && longitude != null
  const weather = useWeatherData(hasLocation ? latitude : null, hasLocation ? longitude : null)

  const h = compact ? "h-[30px]" : "h-[34px]"
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  const WeatherIcon = weather ? getWeatherIcon(weather.weatherCode) : null
  const weatherLabel = weather ? getWeatherLabel(weather.weatherCode, zh) : null

  return (
    <div className="flex items-center gap-2">
      {/* System clock */}
      <div className={`${CHIP_BASE} ${h}`}>
        <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#8aefff]/35 to-transparent" />
        <span className="font-mono text-[12px] font-semibold tabular-nums tracking-[0.08em] text-[#7de8ff]">{dateStr}</span>
        <span className="h-3 w-px shrink-0 bg-[#223b50]" />
        <span className="font-mono text-[12px] font-semibold tabular-nums tracking-[0.08em] text-[#7de8ff]">
          {timeStr}
        </span>
      </div>

      {/* Weather — only shown when project has coordinates */}
      {hasLocation && weather && WeatherIcon && weatherLabel ? (
        <div className={`${CHIP_BASE} ${h}`}>
          <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#8aefff]/35 to-transparent" />
          <WeatherIcon className="h-3.5 w-3.5 shrink-0 text-[#5dd8ff]" />
          <span className="text-[13px] font-semibold text-[#dff4ff]">{weather.temperature}°C</span>
          <span className="hidden text-[10px] leading-none text-[#4e7a92] sm:inline">{weatherLabel}</span>
        </div>
      ) : null}
    </div>
  )
}
