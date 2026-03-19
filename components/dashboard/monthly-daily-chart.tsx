"use client"

import { useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

// Generate daily data for current month
const generateDailyData = () => {
  const data = []
  for (let i = 1; i <= 30; i++) {
    data.push({
      day: `${i}`,
      charge: Math.round(1500 + Math.random() * 1000),
      discharge: Math.round(1400 + Math.random() * 950),
    })
  }
  return data
}

export function MonthlyDailyChart() {
  const [month, setMonth] = useState("2025-03")
  const [data] = useState(() => generateDailyData())

  const totalCharge = data.reduce((sum, item) => sum + item.charge, 0)
  const totalDischarge = data.reduce((sum, item) => sum + item.discharge, 0)

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
          <h3 className="text-base font-semibold text-[#00d4aa]">本月充放电量统计</h3>
          <span className="text-xs text-[#7b8ab8] ml-2">(按日显示)</span>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-1.5 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-sm focus:outline-none focus:border-[#00d4aa]"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#1a2654]/30 rounded-lg p-2 text-center">
          <div className="text-xs text-[#7b8ab8]">月充电量</div>
          <div className="text-base font-bold text-[#3b82f6] font-mono">
            {(totalCharge / 1000).toFixed(1)} MWh
          </div>
        </div>
        <div className="bg-[#1a2654]/30 rounded-lg p-2 text-center">
          <div className="text-xs text-[#7b8ab8]">月放电量</div>
          <div className="text-base font-bold text-[#f97316] font-mono">
            {(totalDischarge / 1000).toFixed(1)} MWh
          </div>
        </div>
        <div className="bg-[#1a2654]/30 rounded-lg p-2 text-center">
          <div className="text-xs text-[#7b8ab8]">月效率</div>
          <div className="text-base font-bold text-[#00d4aa] font-mono">
            {((totalDischarge / totalCharge) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
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
              labelFormatter={(label) => `${label}日`}
              formatter={(value: number) => [`${value.toLocaleString()} kWh`]}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "10px" }}
              formatter={(value) => <span style={{ color: "#7b8ab8", fontSize: "12px" }}>{value}</span>}
            />
            <Bar dataKey="charge" name="充电量" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={8} />
            <Bar dataKey="discharge" name="放电量" fill="#f97316" radius={[2, 2, 0, 0]} barSize={8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
