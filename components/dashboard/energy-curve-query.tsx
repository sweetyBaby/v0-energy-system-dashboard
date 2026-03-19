"use client"

import { useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Calendar, Search } from "lucide-react"

// Generate daily mock data for a month
const generateDailyData = (days: number) => {
  const data = []
  for (let i = 1; i <= days; i++) {
    data.push({
      day: `${i}日`,
      chargeAh: Math.round(800 + Math.random() * 400),
      dischargeAh: Math.round(750 + Math.random() * 380),
      chargeWh: Math.round(3200 + Math.random() * 800),
      dischargeWh: Math.round(3000 + Math.random() * 760),
    })
  }
  return data
}

export function EnergyCurveQuery() {
  const [queryType, setQueryType] = useState<"month" | "custom">("month")
  const [unitType, setUnitType] = useState<"Ah" | "Wh">("Wh")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [data] = useState(() => generateDailyData(30))

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
          <h3 className="text-base font-semibold text-[#00d4aa]">充放电电量曲线</h3>
          <span className="text-xs text-[#7b8ab8] ml-2">(日报数据)</span>
        </div>
      </div>

      {/* Query Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-[#1a2654]/50 rounded-lg p-1">
          <button
            onClick={() => setQueryType("month")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              queryType === "month"
                ? "bg-[#00d4aa] text-[#0a0e27] font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
            }`}
          >
            本月
          </button>
          <button
            onClick={() => setQueryType("custom")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              queryType === "custom"
                ? "bg-[#00d4aa] text-[#0a0e27] font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
            }`}
          >
            自定义
          </button>
        </div>

        {/* Unit Type Toggle */}
        <div className="flex gap-1 bg-[#1a2654]/50 rounded-lg p-1">
          <button
            onClick={() => setUnitType("Ah")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              unitType === "Ah"
                ? "bg-[#3b82f6] text-white font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
            }`}
          >
            Ah
          </button>
          <button
            onClick={() => setUnitType("Wh")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              unitType === "Wh"
                ? "bg-[#3b82f6] text-white font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
            }`}
          >
            Wh
          </button>
        </div>

        {queryType === "custom" && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7b8ab8]" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-sm focus:outline-none focus:border-[#00d4aa]"
              />
            </div>
            <span className="text-[#7b8ab8]">至</span>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7b8ab8]" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-sm focus:outline-none focus:border-[#00d4aa]"
              />
            </div>
            <button className="flex items-center gap-1 px-3 py-1.5 bg-[#3b82f6] text-white rounded-md text-sm hover:bg-[#3b82f6]/80 transition-colors">
              <Search className="w-4 h-4" />
              查询
            </button>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" />
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7b8ab8", fontSize: 10 }}
              interval={4}
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
              dataKey={unitType === "Ah" ? "chargeAh" : "chargeWh"}
              name={`充电量(${unitType})`}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: "#3b82f6" }}
            />
            <Line
              type="monotone"
              dataKey={unitType === "Ah" ? "dischargeAh" : "dischargeWh"}
              name={`放电量(${unitType})`}
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 3, fill: "#f97316" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
