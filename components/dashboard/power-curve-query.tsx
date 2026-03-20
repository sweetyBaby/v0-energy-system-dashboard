"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Calendar, Search } from "lucide-react"

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
      dischargePower: Math.round(dischargePower),
    })
  }
  return data
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
  const [queryType, setQueryType] = useState<"yesterday" | "week" | "custom">("yesterday")
  const [startDateTime, setStartDateTime] = useState("")
  const [endDateTime, setEndDateTime] = useState("")
  const [data, setData] = useState(getInitialData)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    setData(generateMinuteData(24))
  }, [])

  const queryTypes = [
    { key: "yesterday", label: "昨天" },
    { key: "week", label: "本周" },
    { key: "custom", label: "自定义" },
  ]

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
          <h3 className="text-base font-semibold text-[#00d4aa]">充放电功率曲线</h3>
          <span className="text-xs text-[#7b8ab8] ml-2">(分钟级数据)</span>
        </div>
      </div>

      {/* Query Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-[#1a2654]/50 rounded-lg p-1">
          {queryTypes.map((type) => (
            <button
              key={type.key}
              onClick={() => setQueryType(type.key as typeof queryType)}
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

        {queryType === "custom" && (
          <div className="flex flex-wrap items-center gap-2">
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
            <span className="text-xs text-[#7b8ab8]">(不超过一周)</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" />
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7b8ab8", fontSize: 10 }}
              interval={23}
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
              name="充电功率(kW)"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="dischargePower"
              name="放电功率(kW)"
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
