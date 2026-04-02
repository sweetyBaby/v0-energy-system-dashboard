"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays, ChevronDown } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { useLanguage } from "@/components/language-provider"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type QueryType = "today" | "yesterday" | "week" | "custom"

type DataPoint = {
  time: string
  power: number
}

const DAY_MS = 24 * 60 * 60 * 1000

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

// 75kW 系统：充电正值，放电负值，最大±75kW
const getRealtimePower = (hour: number) => {
  if (hour >= 0 && hour < 6) {
    return Math.round(62 + Math.random() * 12)   // 深夜低谷充电 62~74kW
  }

  if (hour >= 12 && hour < 14) {
    return Math.round(55 + Math.random() * 18)   // 午间低谷充电 55~73kW
  }

  if ((hour >= 8 && hour < 12) || (hour >= 18 && hour < 22)) {
    return -Math.round(58 + Math.random() * 16)  // 早晚高峰放电 -58~-74kW
  }

  return 0
}

const getAggregatePower = () => {
  // 日净充放，单位 kWh，日充~115kWh，日放~96kWh
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
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(defaultCustomRange.from ?? today)
  const [customRange, setCustomRange] = useState<DateRange | undefined>(defaultCustomRange)
  const [rangeError, setRangeError] = useState("")
  const { t, language } = useLanguage()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const customHint = language === "zh" ? "最多选择 7 天" : "Select up to 7 days"
  const customLabel = language === "zh" ? "自定义" : "Custom"
  const selectRangeLabel = language === "zh" ? "选择日期范围" : "Select range"
  const maxRangeError =
    language === "zh" ? "自定义日期范围最多 7 天" : "Custom date range cannot exceed 7 days"
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
    setRangeError("")

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

  const handleRangeSelect = (nextRange: DateRange | undefined) => {
    if (!nextRange?.from) {
      setCustomRange(undefined)
      setRangeError("")
      return
    }

    if (!nextRange.to) {
      setCustomRange({ from: toDayStart(nextRange.from), to: undefined })
      setRangeError("")
      return
    }

    const from = toDayStart(nextRange.from)
    const to = toDayStart(nextRange.to)

    if (getRangeLength(from, to) > 7) {
      setCustomRange({ from, to: undefined })
      setRangeError(maxRangeError)
      setPickerMonth(from)
      return
    }

    setCustomRange({ from, to })
    setRangeError("")
    setPickerMonth(from)
    setPickerOpen(false)
  }

  const queryTypes = [
    { key: "today", label: t("today") },
    { key: "yesterday", label: t("yesterday") },
    { key: "week", label: t("thisWeek") },
    { key: "custom", label: customLabel },
  ] satisfies Array<{ key: QueryType; label: string }>

  const xInterval =
    queryType === "today" || queryType === "yesterday" ? Math.max(1, Math.floor(data.length / 8)) : 0

  return (
    <div className="flex h-full w-full flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3 className="text-base font-semibold text-[#00d4aa]">{t("powerCurveQuery")}</h3>
          {queryType === "today" && mounted && (
            <span className="flex items-center gap-1 rounded-md border border-[#1a3a6e] bg-[#0a1940] px-2 py-0.5 text-[11px] text-[#7ab0f0]">
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
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl border border-[#26456e] bg-[#101840] px-3 py-1.5 text-xs text-[#e8f4fc] transition-all hover:border-[#22d3ee]/60">
                    <CalendarDays className="h-3.5 w-3.5 text-[#8db7ff]" />
                    <span className="font-medium">{customRange?.from ? formatRangeLabel(customRange) : selectRangeLabel}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-[#7b8ab8]" />
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  align="end"
                  className="z-50 w-[320px] rounded-2xl border border-[#26456e] bg-[#0d1233] p-0 text-[#e8f4fc]"
                >
                  <div className="border-b border-[#1a2654] px-4 py-3">
                    <div className="text-sm font-semibold text-[#e8f4fc]">{selectRangeLabel}</div>
                    <div className="mt-1 text-[11px] text-[#7b8ab8]">{customHint}</div>
                  </div>

                  <Calendar
                    mode="range"
                    selected={customRange}
                    month={pickerMonth}
                    onMonthChange={(month) => setPickerMonth(toDayStart(month))}
                    onSelect={handleRangeSelect}
                    numberOfMonths={1}
                    disabled={(date) => {
                      const day = toDayStart(date)
                      if (day > today) return true
                      if (customRange?.from && !customRange.to) {
                        return Math.abs(getDayDiff(customRange.from, day)) > 6
                      }
                      return false
                    }}
                    hideNavigation={false}
                    showOutsideDays={false}
                    className="bg-[#0d1233] p-3"
                    classNames={{
                      weekday: "flex-1 rounded-md text-xs text-[#7b8ab8]",
                      day: "relative aspect-square w-full p-0 text-center",
                      selected: "rounded-md bg-[#00d4aa] text-[#041123] font-semibold",
                      today: "rounded-md bg-[#1c315f] text-[#e8f4fc]",
                      outside: "text-[#42557f]",
                      disabled: "text-[#42557f] opacity-40",
                      range_middle: "bg-[#15406d] text-[#dff8ff]",
                      range_start: "rounded-l-md bg-[#00d4aa] text-[#041123]",
                      range_end: "rounded-r-md bg-[#00d4aa] text-[#041123]",
                    }}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {queryType === "custom" && (
            <div className={`text-right text-[11px] ${rangeError ? "text-[#fda4af]" : "text-[#7b8ab8]"}`}>
              {rangeError || customHint}
            </div>
          )}
        </div>
      </div>

      <div className="h-72 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7b8ab8", fontSize: 10 }}
              interval={xInterval}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7b8ab8", fontSize: 10 }}
            />
            <ReferenceLine y={0} stroke="#3a5d83" strokeDasharray="4 4" strokeOpacity={0.65} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0d1233",
                border: "1px solid #1a2654",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#7b8ab8" }}
              formatter={(value: number) => [`${value} kW`, powerSeriesLabel]}
            />
            <Line
              type="monotone"
              dataKey="power"
              name={powerSeriesLabel}
              stroke="#22d3ee"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
