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
import type { ProjectWeatherView } from "@/lib/api/project"
import {
  fetchWeather,
  getWeatherKindFromCode,
  getWeatherLabel,
  resolveWeatherText,
  type WeatherData,
  type WeatherKind,
} from "@/lib/weather"

type HeaderInfoBarProps = {
  compact?: boolean
  projectWeather?: ProjectWeatherView | null
  latitude?: number | null
  longitude?: number | null
}

const pad = (n: number) => String(n).padStart(2, "0")

function useSystemClock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const updateClock = () => setNow(new Date())

    updateClock()
    const id = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(id)
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
        // Weather is non-critical, so fallback failure stays silent.
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

function getWeatherIcon(kind: WeatherKind): LucideIcon {
  if (kind === "clear") return Sun
  if (kind === "partly-cloudy") return CloudSun
  if (kind === "cloudy") return Cloud
  if (kind === "fog") return CloudFog
  if (kind === "drizzle") return CloudDrizzle
  if (kind === "rain") return CloudRain
  if (kind === "snow") return CloudSnow
  return CloudLightning
}

const CHIP_BASE =
  "relative flex items-center gap-2 overflow-hidden rounded-[14px] border border-[#22465c]/84 bg-[linear-gradient(180deg,rgba(8,19,32,0.92),rgba(5,11,21,0.98))] px-3 shadow-[0_0_0_1px_rgba(132,220,255,0.05)_inset,0_8px_18px_rgba(0,0,0,0.16)]"

export function HeaderInfoBar({
  compact = false,
  projectWeather = null,
  latitude,
  longitude,
}: HeaderInfoBarProps) {
  const now = useSystemClock()
  const { language } = useLanguage()
  const zh = language === "zh"
  const hasLocation = latitude != null && longitude != null
  const fallbackWeather = useWeatherData(hasLocation ? latitude : null, hasLocation ? longitude : null)

  const h = compact ? "h-[30px]" : "h-[34px]"
  const timeStr = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` : ""
  const dateStr = now ? `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` : ""

  const projectWeatherSummary = resolveWeatherText(projectWeather?.condition)
  const weatherKind =
    projectWeatherSummary?.kind ?? (fallbackWeather ? getWeatherKindFromCode(fallbackWeather.weatherCode) : null)
  const WeatherIcon = weatherKind ? getWeatherIcon(weatherKind) : null
  const weatherLabel = projectWeatherSummary
    ? (zh ? projectWeatherSummary.labelZh : projectWeatherSummary.labelEn)
    : fallbackWeather
      ? getWeatherLabel(fallbackWeather.weatherCode, zh)
      : null
  const weatherTemperature = projectWeather?.temperatureText ?? (fallbackWeather ? `${fallbackWeather.temperature}` : null)
  const shouldShowWeather = Boolean(WeatherIcon && weatherLabel && weatherTemperature)

  return (
    <div className="flex items-center gap-2">
      <div className={`${CHIP_BASE} ${h}`}>
        <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#8aefff]/42 to-transparent" />
        <span className="inline-block min-w-[10ch] font-mono text-[12px] font-semibold tabular-nums tracking-[0.08em] text-[#7de8ff]">
          {dateStr}
        </span>
        <span className="h-3 w-px shrink-0 bg-[#223b50]" />
        <span className="inline-block min-w-[8ch] font-mono text-[12px] font-semibold tabular-nums tracking-[0.08em] text-[#7de8ff]">
          {timeStr}
        </span>
      </div>

      {shouldShowWeather ? (
        <div className={`${CHIP_BASE} ${h}`}>
          <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#8aefff]/42 to-transparent" />
          {WeatherIcon ? <WeatherIcon className="h-3.5 w-3.5 shrink-0 text-[#5dd8ff]" /> : null}
          <span className="text-[13px] font-semibold text-[#dff4ff]">{weatherTemperature}°C</span>
          <span className="hidden text-[11px] font-medium leading-none text-[#9edcff] drop-shadow-[0_0_6px_rgba(52,169,255,0.16)] sm:inline">
            {weatherLabel}
          </span>
        </div>
      ) : null}
    </div>
  )
}
