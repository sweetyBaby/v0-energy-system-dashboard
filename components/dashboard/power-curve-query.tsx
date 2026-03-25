"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useLanguage } from "@/components/language-provider"

type QueryType = "today" | "yesterday" | "week" | "month"

// Generate minute-level mock data
const generateMinuteData = (hours: number) => {
  const data = []
  for (let i = 0; i < hours * 60; i += 5) {
    const hour = Math.floor(i / 60)
    const minute = i % 60
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    
    // Simulate charge during low price hours (0-6, 12-14), discharge during peak hours
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
      dischargePower: -Math.round(dischargePower), // Negative for discharge
    })
  }
  return data
}

// Generate daily data for current month (1st to today)
const generateMonthDailyData = () => {
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

// Generate daily data for last 7 days
const generateWeekDailyData = () => {
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

// Static initial data for SSR
const getInitialData = () => {
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, "0")}:00`,
    chargePower: 0,
    dischargePower: 0,
  }))
}


export function PowerCurveQuery() {
  const [queryType, setQueryType] = useState<QueryType>("today")
  const [data, setData] = useState(getInitialData)
  const [mounted, setMounted] = useState(false)
  const { t, language } = useLanguage()

  useEffect(() => {
    setMounted(true)
    setData(generateMinuteData(24))
  }, [])

  const queryTypes = [
    { key: "today", label: t("today") },
    { key: "yesterday", label: t("yesterday") },
    { key: "week", label: t("thisWeek") },
    { key: "month", label: t("thisMonth") },
  ]

  const handleQueryTypeChange = (type: QueryType) => {
    setQueryType(type)
    if (type === "week") {
      setData(generateWeekDailyData())
    } else if (type === "month") {
      setData(generateMonthDailyData())
    } else {
      setData(generateMinuteData(24))
    }
  }

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4 flex flex-col w-full h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
          <h3 className="text-base font-semibold text-[#00d4aa]">{t("powerCurveQuery")}</h3>
        </div>
      </div>

      {/* Query Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-[#1a2654]/50 rounded-lg p-1">
          {queryTypes.map((type) => (
            <button
              key={type.key}
              onClick={() => handleQueryTypeChange(type.key as QueryType)}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                queryType === type.key
                  ? "bg-[#00d4aa] text-[#0a0e27] font-medium"
                  : "text-[#7b8ab8] hover:text-[#e8f4fc]"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

      </div>

      {/* Chart */}
      <div className="h-72 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7b8ab8", fontSize: 10 }}
              interval={queryType === "today" || queryType === "yesterday" ? 23 : 0}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7b8ab8", fontSize: 10 }}
              tickFormatter={(value) => `${value}`}
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
            />
            <Line
              type="monotone"
              dataKey="dischargePower"
              name={language === "zh" ? "放电功率(kW)" : "Discharge Power (kW)"}
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
