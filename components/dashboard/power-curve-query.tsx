"use client"

import { useState, useEffect, useRef } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useLanguage } from "@/components/language-provider"

type QueryType = "today" | "yesterday" | "week" | "month"

type DataPoint = {
  time: string
  chargePower: number
  dischargePower: number
}

// Generate minute-level data up to a specific hour:minute
const generateMinuteDataUntil = (untilHour: number, untilMinute: number): DataPoint[] => {
  const data: DataPoint[] = []
  const limit = untilHour * 60 + untilMinute
  for (let i = 0; i <= limit; i += 5) {
    const hour = Math.floor(i / 60)
    const minute = i % 60
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    let chargePower = 0
    let dischargePower = 0
    if (hour >= 0 && hour < 6) {
      chargePower = 1500 + Math.random() * 400
    } else if (hour >= 12 && hour < 14) {
      chargePower = 1200 + Math.random() * 300
    } else if ((hour >= 8 && hour < 12) || (hour >= 18 && hour < 22)) {
      dischargePower = 1600 + Math.random() * 400
    }
    data.push({
      time,
      chargePower: Math.round(chargePower),
      dischargePower: -Math.round(dischargePower),
    })
  }
  return data
}

// Today: generate data up to current time, then incrementally append new points
const generateTodayData = (): DataPoint[] => {
  const now = new Date()
  return generateMinuteDataUntil(now.getHours(), now.getMinutes())
}

// Yesterday: full 24h
const generateYesterdayData = (): DataPoint[] => generateMinuteDataUntil(23, 55)

// Daily data for last 7 days
const generateWeekDailyData = (): DataPoint[] => {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 6 + i)
    return {
      time: `${d.getMonth() + 1}/${d.getDate()}`,
      chargePower: Math.round(800 + Math.random() * 600),
      dischargePower: -Math.round(700 + Math.random() * 500),
    }
  })
}

// Daily data for current month
const generateMonthDailyData = (): DataPoint[] => {
  const today = new Date()
  return Array.from({ length: today.getDate() }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), i + 1)
    return {
      time: `${date.getMonth() + 1}/${date.getDate()}`,
      chargePower: Math.round(800 + Math.random() * 600),
      dischargePower: -Math.round(700 + Math.random() * 500),
    }
  })
}

const getInitialData = (): DataPoint[] =>
  Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, "0")}:00`,
    chargePower: 0,
    dischargePower: 0,
  }))

export function PowerCurveQuery() {
  const [queryType, setQueryType] = useState<QueryType>("today")
  const [data, setData] = useState<DataPoint[]>(getInitialData)
  const [mounted, setMounted] = useState(false)
  const [nowLabel, setNowLabel] = useState("")
  const { t, language } = useLanguage()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initial mount
  useEffect(() => {
    setMounted(true)
    setData(generateTodayData())
    const now = new Date()
    setNowLabel(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`)
  }, [])

  // Real-time refresh for "today" — tick every minute to append new point
  useEffect(() => {
    if (!mounted) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (queryType !== "today") return

    intervalRef.current = setInterval(() => {
      const now = new Date()
      const h = now.getHours()
      const m = Math.floor(now.getMinutes() / 5) * 5 // snap to 5-min bucket
      const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      let chargePower = 0
      let dischargePower = 0
      if (h >= 0 && h < 6) {
        chargePower = 1500 + Math.random() * 400
      } else if (h >= 12 && h < 14) {
        chargePower = 1200 + Math.random() * 300
      } else if ((h >= 8 && h < 12) || (h >= 18 && h < 22)) {
        dischargePower = 1600 + Math.random() * 400
      }
      const newPoint: DataPoint = {
        time,
        chargePower: Math.round(chargePower),
        dischargePower: -Math.round(dischargePower),
      }
      setData(prev => {
        // Replace last point if same time bucket, otherwise append
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
    } else if (type === "yesterday") {
      setData(generateYesterdayData())
    } else if (type === "week") {
      setData(generateWeekDailyData())
    } else {
      setData(generateMonthDailyData())
    }
  }

  const queryTypes = [
    { key: "today",     label: t("today") },
    { key: "yesterday", label: t("yesterday") },
    { key: "week",      label: t("thisWeek") },
    { key: "month",     label: t("thisMonth") },
  ]

  // X-axis tick interval: for minute-level data show ~8 labels
  const xInterval = (queryType === "today" || queryType === "yesterday")
    ? Math.max(1, Math.floor(data.length / 8))
    : 0

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4 flex flex-col w-full h-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
          <h3 className="text-base font-semibold text-[#00d4aa]">{t("powerCurveQuery")}</h3>
          {queryType === "today" && mounted && (
            <span className="flex items-center gap-1 rounded-md border border-[#1a3a6e] bg-[#0a1940] px-2 py-0.5 text-[11px] text-[#7ab0f0]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00d4aa]" />
              实时 {nowLabel}
            </span>
          )}
        </div>

        <div className="flex gap-1 rounded-xl bg-[#16204b]/90 p-1">
          {queryTypes.map((type) => (
            <button
              key={type.key}
              onClick={() => handleQueryTypeChange(type.key as QueryType)}
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
            <Tooltip
              contentStyle={{
                backgroundColor: "#0d1233",
                border: "1px solid #1a2654",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#7b8ab8" }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "10px" }}
              formatter={(value) => <span style={{ color: "#7b8ab8", fontSize: "12px" }}>{value}</span>}
            />
            <Line
              type="monotone"
              dataKey="chargePower"
              name={language === "zh" ? "充电功率(kW)" : "Charge Power (kW)"}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="dischargePower"
              name={language === "zh" ? "放电功率(kW)" : "Discharge Power (kW)"}
              stroke="#f97316"
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
