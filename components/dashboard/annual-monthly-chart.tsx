"use client"

import { useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

const monthlyData = [
  { month: "1月", charge: 45000, discharge: 42750 },
  { month: "2月", charge: 42000, discharge: 39900 },
  { month: "3月", charge: 48000, discharge: 45600 },
  { month: "4月", charge: 52000, discharge: 49400 },
  { month: "5月", charge: 55000, discharge: 52250 },
  { month: "6月", charge: 58000, discharge: 55100 },
  { month: "7月", charge: 62000, discharge: 58900 },
  { month: "8月", charge: 65000, discharge: 61750 },
  { month: "9月", charge: 56000, discharge: 53200 },
  { month: "10月", charge: 50000, discharge: 47500 },
  { month: "11月", charge: 47000, discharge: 44650 },
  { month: "12月", charge: 44000, discharge: 41800 },
]

export function AnnualMonthlyChart() {
  const [year, setYear] = useState("2025")

  const totalCharge = monthlyData.reduce((sum, item) => sum + item.charge, 0)
  const totalDischarge = monthlyData.reduce((sum, item) => sum + item.discharge, 0)

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
          <h3 className="text-base font-semibold text-[#00d4aa]">全年充放电量统计</h3>
          <span className="text-xs text-[#7b8ab8] ml-2">(月报数据)</span>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="px-3 py-1.5 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-sm focus:outline-none focus:border-[#00d4aa]"
        >
          <option value="2025">2025年</option>
          <option value="2024">2024年</option>
          <option value="2023">2023年</option>
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-[#1a2654]/30 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-[#7b8ab8]">年充电量</span>
          <span className="text-lg font-bold text-[#3b82f6] font-mono">
            {(totalCharge / 1000).toFixed(1)} MWh
          </span>
        </div>
        <div className="bg-[#1a2654]/30 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-[#7b8ab8]">年放电量</span>
          <span className="text-lg font-bold text-[#f97316] font-mono">
            {(totalDischarge / 1000).toFixed(1)} MWh
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" vertical={false} />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7b8ab8", fontSize: 10 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7b8ab8", fontSize: 10 }}
              tickFormatter={(value) => `${value / 1000}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0d1233",
                border: "1px solid #1a2654",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#7b8ab8" }}
              formatter={(value: number) => [`${value.toLocaleString()} kWh`]}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "10px" }}
              formatter={(value) => <span style={{ color: "#7b8ab8", fontSize: "12px" }}>{value}</span>}
            />
            <Bar dataKey="charge" name="充电量" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="discharge" name="放电量" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
