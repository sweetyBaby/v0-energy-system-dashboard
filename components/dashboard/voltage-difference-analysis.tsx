"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Calendar, Search, Table, LineChartIcon } from "lucide-react"

// Generate voltage difference data
const generateVoltageData = (days: number) => {
  const data = []
  for (let i = 1; i <= days; i++) {
    data.push({
      day: `${i}日`,
      maxDiff: (20 + Math.random() * 30).toFixed(1),
      avgDiff: (10 + Math.random() * 15).toFixed(1),
      minDiff: (5 + Math.random() * 8).toFixed(1),
    })
  }
  return data
}

// Static initial data for SSR
const getInitialData = () => {
  return Array.from({ length: 15 }, (_, i) => ({
    day: `${i + 1}日`,
    maxDiff: "35.0",
    avgDiff: "18.0",
    minDiff: "8.0",
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

export function VoltageDifferenceAnalysis() {
  const [startDateTime, setStartDateTime] = useState("")
  const [endDateTime, setEndDateTime] = useState("")
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart")
  const [data, setData] = useState(getInitialData)

  useEffect(() => {
    setData(generateVoltageData(15))
    const { start, end } = getYesterdayRange()
    setStartDateTime(start)
    setEndDateTime(end)
  }, [])

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
          <h3 className="text-base font-semibold text-[#00d4aa]">电芯电压压差分析</h3>


        </div>
        <div className="flex gap-1 bg-[#1a2654]/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode("chart")}
            className={`p-1.5 rounded-md transition-all ${viewMode === "chart" ? "bg-[#00d4aa] text-[#0a0e27]" : "text-[#7b8ab8]"
              }`}
          >
            <LineChartIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md transition-all ${viewMode === "table" ? "bg-[#00d4aa] text-[#0a0e27]" : "text-[#7b8ab8]"
              }`}
          >
            <Table className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Range Query with datetime */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7b8ab8]" />
          <input
            type="datetime-local"
            step="1"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
            className="pl-8 pr-2 py-1.5 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-xs focus:outline-none focus:border-[#00d4aa]"
          />
        </div>
        <span className="text-[#7b8ab8] text-sm">至</span>
        <div className="relative">
          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7b8ab8]" />
          <input
            type="datetime-local"
            step="1"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
            className="pl-8 pr-2 py-1.5 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-xs focus:outline-none focus:border-[#00d4aa]"
          />
        </div>
        <button className="flex items-center gap-1 px-3 py-1.5 bg-[#3b82f6] text-white rounded-md text-sm hover:bg-[#3b82f6]/80 transition-colors">
          <Search className="w-4 h-4" />
          查询
        </button>
      </div>

      {viewMode === "chart" ? (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7b8ab8", fontSize: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7b8ab8", fontSize: 10 }}
                unit="mV"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0d1233",
                  border: "1px solid #1a2654",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#7b8ab8" }}
                formatter={(value: string) => [`${value} mV`]}
              />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => <span style={{ color: "#7b8ab8", fontSize: "12px" }}>{value}</span>}
              />
              <Line type="monotone" dataKey="maxDiff" name="最大压差" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="avgDiff" name="平均压差" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="minDiff" name="最小压差" stroke="#22d3ee" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-56 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0d1233]">
              <tr className="text-[#7b8ab8] border-b border-[#1a2654]">
                <th className="py-2 px-2 text-left">日期</th>
                <th className="py-2 px-2 text-right">最大压差(mV)</th>
                <th className="py-2 px-2 text-right">平均压差(mV)</th>
                <th className="py-2 px-2 text-right">最小压差(mV)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index} className="border-b border-[#1a2654]/50 hover:bg-[#1a2654]/30">
                  <td className="py-2 px-2">{item.day}</td>
                  <td className="py-2 px-2 text-right text-[#ef4444] font-mono">{item.maxDiff}</td>
                  <td className="py-2 px-2 text-right text-[#f97316] font-mono">{item.avgDiff}</td>
                  <td className="py-2 px-2 text-right text-[#22d3ee] font-mono">{item.minDiff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
