"use client"

import { useState, useEffect } from "react"
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts"
import { Calendar, Search } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

// Generate mock efficiency data based on query type
const generateEfficiencyData = (type: string) => {
  const baseEfficiency = 94 + Math.random() * 2
  switch (type) {
    case "yesterday":
      return Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        efficiency: baseEfficiency + Math.random() * 3 - 1.5,
      }))
    case "week":
      return ["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map(day => ({
        time: day,
        efficiency: baseEfficiency + Math.random() * 3 - 1.5,
      }))
    case "month":
      return Array.from({ length: 30 }, (_, i) => ({
        time: `${i + 1}日`,
        efficiency: baseEfficiency + Math.random() * 3 - 1.5,
      }))
    case "year":
      return ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"].map(month => ({
        time: month,
        efficiency: baseEfficiency + Math.random() * 3 - 1.5,
      }))
    default:
      return Array.from({ length: 7 }, (_, i) => ({
        time: `第${i + 1}天`,
        efficiency: baseEfficiency + Math.random() * 3 - 1.5,
      }))
  }
}

// Generate initial static data for SSR
const getInitialData = () => {
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    efficiency: 95,
  }))
}

// Get yesterday's datetime range
const getYesterdayRange = () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  
  const startDate = new Date(yesterday)
  startDate.setHours(0, 0, 0, 0)
  
  const endDate = new Date(yesterday)
  endDate.setHours(23, 59, 59, 0)
  
  const formatDateTime = (date: Date) => {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0")
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    const seconds = date.getSeconds().toString().padStart(2, "0")
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
  }
  
  return { start: formatDateTime(startDate), end: formatDateTime(endDate) }
}

export function EfficiencyChart() {
  const [queryType, setQueryType] = useState<"yesterday" | "week" | "month" | "year" | "custom">("yesterday")
  const [startDateTime, setStartDateTime] = useState("")
  const [endDateTime, setEndDateTime] = useState("")
  const [data, setData] = useState(getInitialData)
  const [mounted, setMounted] = useState(false)
  const { t, language } = useLanguage()

  // Generate random data only on client side
  useEffect(() => {
    setMounted(true)
    setData(generateEfficiencyData("yesterday"))
    const { start, end } = getYesterdayRange()
    setStartDateTime(start)
    setEndDateTime(end)
  }, [])

  const handleQueryTypeChange = (type: "yesterday" | "week" | "month" | "year" | "custom") => {
    setQueryType(type)
    if (type !== "custom") {
      setData(generateEfficiencyData(type))
    }
  }

  const handleCustomQuery = () => {
    if (startDateTime && endDateTime) {
      const start = new Date(startDateTime)
      const end = new Date(endDateTime)
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays > 7) {
        alert("自定义查询最多一周范围")
        return
      }
      setData(generateEfficiencyData("custom"))
    }
  }

  // Calculate average efficiency
  const avgEfficiency = data.length > 0 
    ? data.reduce((sum, item) => sum + item.efficiency, 0) / data.length 
    : 95

  // Summary data for circular indicators (static values)
  const summaryData = [
    { name: language === "zh" ? "昨日" : "Yesterday", value: 95.26, color: "#3b82f6" },
    { name: language === "zh" ? "本周" : "Week", value: 94.56, color: "#22d3ee" },
    { name: language === "zh" ? "本月" : "Month", value: 94.82, color: "#00d4aa" },
    { name: language === "zh" ? "本年" : "Year", value: 95.18, color: "#f97316" },
  ]

  // Show loading state during SSR/hydration
  if (!mounted) {
    return (
      <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
          <h3 className="text-base font-semibold text-[#00d4aa]">{t("chargeDischargeEfficiency")}</h3>
          <span className="text-xs text-[#7b8ab8] ml-2">(%)</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[#7b8ab8] text-sm">{t("loading")}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
        <h3 className="text-base font-semibold text-[#00d4aa]">{t("chargeDischargeEfficiency")}</h3>
        <span className="text-xs text-[#7b8ab8] ml-2">(%)</span>
      </div>

      {/* Query Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1 bg-[#1a2654]/50 rounded-lg p-1">
          {[
            { key: "yesterday", label: t("yesterday") },
            { key: "week", label: t("thisWeek") },
            { key: "month", label: t("thisMonth") },
            { key: "year", label: t("thisYear") },
            { key: "custom", label: t("custom") },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => handleQueryTypeChange(item.key as typeof queryType)}
              className={`px-2 py-1 text-xs rounded-md transition-all ${
                queryType === item.key
                  ? "bg-[#00d4aa] text-[#0a0e27] font-medium"
                  : "text-[#7b8ab8] hover:text-[#e8f4fc]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {queryType === "custom" && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#7b8ab8]" />
            <input
              type="datetime-local"
              step="1"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
              className="pl-7 pr-1 py-1 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-[10px] focus:outline-none focus:border-[#00d4aa]"
            />
          </div>
          <span className="text-[#7b8ab8] text-xs">{t("to")}</span>
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#7b8ab8]" />
            <input
              type="datetime-local"
              step="1"
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
              className="pl-7 pr-1 py-1 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-[10px] focus:outline-none focus:border-[#00d4aa]"
            />
          </div>
          <button 
            onClick={handleCustomQuery}
            className="flex items-center gap-1 px-2 py-1 bg-[#3b82f6] text-white rounded-md text-xs hover:bg-[#3b82f6]/80 transition-colors"
          >
            <Search className="w-3 h-3" />
            {t("search")}
          </button>
          <span className="text-[10px] text-[#f97316]">{language === "zh" ? "*最多一周" : "*Max 1 week"}</span>
        </div>
      )}

      {/* Average Display */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#7b8ab8]">{t("avgEfficiency")}</span>
        <span className="text-lg font-bold text-[#00d4aa] font-mono">{avgEfficiency.toFixed(2)}%</span>
      </div>

      {/* Chart */}
      <div className="h-32 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" vertical={false} />
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7b8ab8", fontSize: 9 }}
              interval={queryType === "yesterday" ? 5 : queryType === "month" ? 4 : 0}
            />
            <YAxis 
              domain={[90, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7b8ab8", fontSize: 9 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0d1233",
                border: "1px solid #1a2654",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#7b8ab8" }}
              formatter={(value: number) => [`${value.toFixed(2)}%`, language === "zh" ? "效率" : "Efficiency"]}
            />
            <Bar 
              dataKey="efficiency" 
              fill="#3b82f6"
              radius={[2, 2, 0, 0]}
              barSize={queryType === "yesterday" ? 6 : queryType === "month" ? 8 : 20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Circular Progress Indicators */}
      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-[#1a2654]">
        {summaryData.map((item, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="relative w-12 h-12">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#1a2654"
                  strokeWidth="3"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="3"
                  strokeDasharray={`${(item.value / 100) * 125.6} 125.6`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold" style={{ color: item.color }}>
                  {item.value}%
                </span>
              </div>
            </div>
            <span className="text-[10px] text-[#7b8ab8] mt-1">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
