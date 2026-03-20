"use client"

import { useState } from "react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Calendar, Search } from "lucide-react"

// Generate daily mock data
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

export function EnergyStatsCombined() {
  const [viewType, setViewType] = useState<"curve" | "bar">("curve")
  const [queryType, setQueryType] = useState<"month" | "custom">("month")
  const [unitType, setUnitType] = useState<"Ah" | "Wh">("Wh")
  const [selectedMonth, setSelectedMonth] = useState("2025-03")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [data] = useState(() => generateDailyData(30))

  const totalCharge = data.reduce((sum, item) => sum + (unitType === "Wh" ? item.chargeWh : item.chargeAh), 0)
  const totalDischarge = data.reduce((sum, item) => sum + (unitType === "Wh" ? item.dischargeWh : item.dischargeAh), 0)

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
          <h3 className="text-base font-semibold text-[#00d4aa]">充放电电量统计</h3>

        </div>
      </div>

      {/* Query Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* View Type Toggle */}
        <div className="flex gap-1 bg-[#1a2654]/50 rounded-lg p-1">
          <button
            onClick={() => setViewType("curve")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${viewType === "curve"
                ? "bg-[#00d4aa] text-[#0a0e27] font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
              }`}
          >
            曲线图
          </button>
          <button
            onClick={() => setViewType("bar")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${viewType === "bar"
                ? "bg-[#00d4aa] text-[#0a0e27] font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
              }`}
          >
            柱状图
          </button>
        </div>

        {/* Query Type Toggle */}
        <div className="flex gap-1 bg-[#1a2654]/50 rounded-lg p-1">
          <button
            onClick={() => setQueryType("month")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${queryType === "month"
                ? "bg-[#3b82f6] text-white font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
              }`}
          >
            本月
          </button>
          <button
            onClick={() => setQueryType("custom")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${queryType === "custom"
                ? "bg-[#3b82f6] text-white font-medium"
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
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${unitType === "Ah"
                ? "bg-[#f97316] text-white font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
              }`}
          >
            Ah
          </button>
          <button
            onClick={() => setUnitType("Wh")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${unitType === "Wh"
                ? "bg-[#f97316] text-white font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
              }`}
          >
            Wh
          </button>
        </div>

        {queryType === "month" && (
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-sm focus:outline-none focus:border-[#00d4aa]"
          />
        )}

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

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#1a2654]/30 rounded-lg p-3 text-center">
          <div className="text-xs text-[#7b8ab8]">月充电量</div>
          <div className="text-lg font-bold text-[#3b82f6] font-mono">
            {unitType === "Wh"
              ? `${(totalCharge / 1000).toFixed(1)} MWh`
              : `${(totalCharge / 1000).toFixed(1)} kAh`
            }
          </div>
        </div>
        <div className="bg-[#1a2654]/30 rounded-lg p-3 text-center">
          <div className="text-xs text-[#7b8ab8]">月放电量</div>
          <div className="text-lg font-bold text-[#f97316] font-mono">
            {unitType === "Wh"
              ? `${(totalDischarge / 1000).toFixed(1)} MWh`
              : `${(totalDischarge / 1000).toFixed(1)} kAh`
            }
          </div>
        </div>
        <div className="bg-[#1a2654]/30 rounded-lg p-3 text-center">
          <div className="text-xs text-[#7b8ab8]">月效率</div>
          <div className="text-lg font-bold text-[#00d4aa] font-mono">
            {((totalDischarge / totalCharge) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {viewType === "curve" ? (
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
                formatter={(value: number) => [`${value.toLocaleString()} ${unitType}`]}
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
                dot={{ r: 2, fill: "#3b82f6" }}
              />
              <Line
                type="monotone"
                dataKey={unitType === "Ah" ? "dischargeAh" : "dischargeWh"}
                name={`放电量(${unitType})`}
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 2, fill: "#f97316" }}
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" vertical={false} />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7b8ab8", fontSize: 9 }}
                interval={2}
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
                formatter={(value: number) => [`${value.toLocaleString()} ${unitType}`]}
              />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => <span style={{ color: "#7b8ab8", fontSize: "12px" }}>{value}</span>}
              />
              <Bar
                dataKey={unitType === "Ah" ? "chargeAh" : "chargeWh"}
                name={`充电量(${unitType})`}
                fill="#3b82f6"
                radius={[2, 2, 0, 0]}
                barSize={8}
              />
              <Bar
                dataKey={unitType === "Ah" ? "dischargeAh" : "dischargeWh"}
                name={`放电量(${unitType})`}
                fill="#f97316"
                radius={[2, 2, 0, 0]}
                barSize={8}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
