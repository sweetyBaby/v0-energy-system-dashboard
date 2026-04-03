"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import type { DateRange } from "react-day-picker"
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts"
import { useLanguage } from "@/components/language-provider"
import { CustomRangePicker } from "@/components/dashboard/custom-range-picker"
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"

type QueryType = "today" | "yesterday" | "week" | "custom"

type DataPoint = {
  time: string
  power: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const TOOLTIP_SURFACE = {
  background: "linear-gradient(180deg, rgba(8,18,42,0.98), rgba(9,20,46,0.94))",
  border: "1px solid rgba(67, 115, 184, 0.42)",
  borderRadius: "14px",
  boxShadow: "0 14px 30px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04)",
}

const toDayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return toDayStart(next)
}

const getDayDiff = (from: Date, to: Date) =>
  Math.round((toDayStart(to).getTime() - toDayStart(from).getTime()) / DAY_MS)

const getRangeLength = (from: Date, to: Date) => getDayDiff(from, to) + 1

const formatRangeLabel = (range: DateRange | undefined) => {
  if (!range?.from) return "Select Range"

  const formatDate = (date: Date) => `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`

  if (!range.to) return formatDate(range.from)
  return `${formatDate(range.from)} - ${formatDate(range.to)}`
}

const formatDayLabel = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`

const getRealtimePower = (hour: number) => {
  if (hour >= 0 && hour < 6) {
    return Math.round(62 + Math.random() * 12)
  }

  if (hour >= 12 && hour < 14) {
    return Math.round(55 + Math.random() * 18)
  }

  if ((hour >= 8 && hour < 12) || (hour >= 18 && hour < 22)) {
    return -Math.round(58 + Math.random() * 16)
  }

  return 0
}

const getAggregatePower = () => {
  const charge = 105 + Math.random() * 20
  const discharge = 88 + Math.random() * 18
  return Math.round(charge - discharge)
}

const generateMinuteDataUntil = (untilHour: number, untilMinute: number): DataPoint[] => {
  const data: DataPoint[] = []
  const limit = untilHour * 60 + untilMinute

  for (let i = 0; i <= limit; i += 5) {
    const hour = Math.floor(i / 60)
    const minute = i % 60
    data.push({
      time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      power: getRealtimePower(hour),
    })
  }

  return data
}

const generateTodayData = (): DataPoint[] => {
  const now = new Date()
  return generateMinuteDataUntil(now.getHours(), now.getMinutes())
}

const generateYesterdayData = (): DataPoint[] => generateMinuteDataUntil(23, 55)

const generateWeekDailyData = (): DataPoint[] => {
  const today = new Date()

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, -6 + index)
    return {
      time: formatDayLabel(date),
      power: getAggregatePower(),
    }
  })
}

const generateCustomRangeData = (range: DateRange | undefined): DataPoint[] => {
  if (!range?.from || !range.to) return []

  const data: DataPoint[] = []

  for (let offset = 0; offset < getRangeLength(range.from, range.to); offset += 1) {
    const date = addDays(range.from, offset)
    data.push({
      time: formatDayLabel(date),
      power: getAggregatePower(),
    })
  }

  return data
}

const getInitialData = (): DataPoint[] =>
  Array.from({ length: 24 }, (_, index) => ({
    time: `${String(index).padStart(2, "0")}:00`,
    power: 0,
  }))

export function PowerCurveQuery() {
  const chartId = useId().replace(/:/g, "")
  const today = useMemo(() => toDayStart(new Date()), [])
  const defaultCustomRange = useMemo<DateRange>(
    () => ({
      from: addDays(today, -6),
      to: today,
    }),
    [today],
  )

  const [queryType, setQueryType] = useState<QueryType>("today")
  const [data, setData] = useState<DataPoint[]>(getInitialData)
  const [mounted, setMounted] = useState(false)
  const [nowLabel, setNowLabel] = useState("")
  const [customRange, setCustomRange] = useState<DateRange | undefined>(defaultCustomRange)
  const { t, language } = useLanguage()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const customHint = language === "zh" ? "最多选择 7 天" : "Select up to 7 days"
  const customLabel = language === "zh" ? "自定义" : "Custom"
  const selectRangeLabel = language === "zh" ? "选择日期范围" : "Select range"
  const maxRangeError = language === "zh" ? "自定义日期范围最多 7 天" : "Custom date range cannot exceed 7 days"
  const powerSeriesLabel = language === "zh" ? "功率(kW)" : "Power (kW)"

  useEffect(() => {
    setMounted(true)
    setData(generateTodayData())
    const now = new Date()
    setNowLabel(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`)
  }, [])

  useEffect(() => {
    if (!mounted || queryType !== "custom") return
    setData(generateCustomRangeData(customRange))
  }, [customRange, mounted, queryType])

  useEffect(() => {
    if (!mounted) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (queryType !== "today") return

    intervalRef.current = setInterval(() => {
      const now = new Date()
      const hour = now.getHours()
      const minute = Math.floor(now.getMinutes() / 5) * 5
      const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      const newPoint: DataPoint = {
        time,
        power: getRealtimePower(hour),
      }

      setData((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].time === time) {
          return [...prev.slice(0, -1), newPoint]
        }

        return [...prev, newPoint]
      })
      setNowLabel(time)
    }, 60_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [mounted, queryType])

  const handleQueryTypeChange = (type: QueryType) => {
    setQueryType(type)
    if (type === "today") {
      setData(generateTodayData())
      const now = new Date()
      setNowLabel(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`)
      return
    }

    if (type === "yesterday") {
      setData(generateYesterdayData())
      return
    }

    if (type === "week") {
      setData(generateWeekDailyData())
      return
    }

    setData(generateCustomRangeData(customRange))
  }

  const queryTypes = [
    { key: "today", label: t("today") },
    { key: "yesterday", label: t("yesterday") },
    { key: "week", label: t("thisWeek") },
    { key: "custom", label: customLabel },
  ] satisfies Array<{ key: QueryType; label: string }>

  const xInterval =
    queryType === "today" || queryType === "yesterday" ? Math.max(1, Math.floor(data.length / 8)) : 0

  const renderTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (!active || !payload?.length) return null

    const point = Number(payload[0]?.value ?? 0)
    const modeLabel =
      point > 0
        ? language === "zh"
          ? "充电功率"
          : "Charge Power"
        : point < 0
          ? language === "zh"
            ? "放电功率"
            : "Discharge Power"
          : language === "zh"
            ? "待机功率"
            : "Idle Power"

    return (
      <div className="min-w-[220px] overflow-hidden" style={TOOLTIP_SURFACE}>
        <div className="border-b border-white/8 bg-[linear-gradient(90deg,rgba(17,216,191,0.14),transparent)] px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7da0d8]">
            {queryType === "today" || queryType === "yesterday"
              ? language === "zh"
                ? "时刻"
                : "Time"
              : language === "zh"
                ? "日期"
                : "Date"}
          </div>
          <div className="mt-1 text-sm font-semibold text-[#e9f4ff]">{label}</div>
        </div>

        <div className="grid gap-2 px-3 py-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.03] px-2.5 py-2">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: point >= 0 ? "#22d3ee" : "#ffd60a",
                  boxShadow: `0 0 12px ${point >= 0 ? "#22d3ee99" : "#ffd60a88"}`,
                }}
              />
              <span className="text-[12px] text-[#bed3f6]">{modeLabel}</span>
            </div>
            <span className="font-mono text-[12px] font-semibold text-[#f2f8ff]">
              {point > 0 ? "+" : ""}
              {point}
              <span className="ml-1 text-[#86a7d4]">kW</span>
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3 className="text-base font-semibold text-[#00d4aa]">{t("powerCurveQuery")}</h3>
          {queryType === "today" && mounted && (
            <span className="flex items-center gap-1 rounded-full border border-[#1c4273] bg-[linear-gradient(180deg,rgba(8,24,55,0.96),rgba(10,28,62,0.9))] px-2.5 py-1 text-[11px] text-[#9bc6ff] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00d4aa]" />
              {language === "zh" ? "实时" : "Live"} {nowLabel}
            </span>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex gap-1 rounded-xl bg-[#16204b]/90 p-1">
              {queryTypes.map((type) => (
                <button
                  key={type.key}
                  onClick={() => handleQueryTypeChange(type.key)}
                  className={`rounded-lg px-3 py-1.5 text-[13px] transition-all ${
                    queryType === type.key
                      ? "bg-[#11d8bf] font-medium text-[#07162b] shadow-[0_0_18px_rgba(17,216,191,0.2)]"
                      : "text-[#7b8ab8] hover:text-[#e8f4fc]"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {queryType === "custom" && (
              <CustomRangePicker
                value={customRange}
                onChange={setCustomRange}
                maxDate={today}
                maxDays={7}
                buttonLabel={customRange?.from ? formatRangeLabel(customRange) : selectRangeLabel}
                hint={customHint}
                maxRangeError={maxRangeError}
              />
            )}
          </div>
        </div>
      </div>

      <div className="relative h-72 flex-1 overflow-hidden rounded-[20px] border border-[#1e2e63]/75 bg-[linear-gradient(180deg,rgba(8,18,42,0.92),rgba(10,20,47,0.78))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(0,212,170,0.08),transparent_28%),radial-gradient(circle_at_84%_10%,rgba(86,130,255,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`${chartId}-power-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.34} />
                <stop offset="55%" stopColor="#22d3ee" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 5" stroke="rgba(45,74,126,0.72)" vertical={false} />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#88a4d7", fontSize: 10 }}
              tickMargin={10}
              interval={xInterval}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#88a4d7", fontSize: 10 }} tickMargin={8} />
            <ReferenceLine
              y={0}
              stroke="#3f6490"
              strokeDasharray="4 4"
              strokeOpacity={0.72}
            />
            <Tooltip cursor={{ stroke: "#2b4f7d", strokeDasharray: "4 4" }} content={renderTooltip} />
            <Area type="monotone" dataKey="power" stroke="none" fill={`url(#${chartId}-power-fill)`} isAnimationActive={false} />
            <Line
              type="monotone"
              dataKey="power"
              stroke="#22d3ee"
              strokeOpacity={0.18}
              strokeWidth={8}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="power"
              name={powerSeriesLabel}
              stroke="#22d3ee"
              strokeWidth={2.4}
              dot={false}
              activeDot={{ r: 5, fill: "#08122a", stroke: "#22d3ee", strokeWidth: 2.5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
