"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

const dischargeData = [
  { date: "11月1", value: 52 },
  { date: "11月4", value: 78 },
  { date: "11月7", value: 65 },
  { date: "11月10", value: 88 },
  { date: "11月13", value: 72 },
]

export function ElectricityIndicators() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-chart-3 rounded-full" />
        <h3 className="text-sm font-medium text-muted-foreground">电量指标</h3>
      </div>

      {/* Discharge Rate Chart */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-chart-1" />
          <span className="text-xs text-muted-foreground">放电量达成率/%</span>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dischargeData}>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: "#7b8ab8" }}
                axisLine={{ stroke: "#1a2654" }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: "#7b8ab8" }}
                axisLine={{ stroke: "#1a2654" }}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0d1233",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: "8px",
                  color: "#e8f4fc",
                }}
                formatter={(value: number) => [`${value}%`, "达成率"]}
              />
              <Bar 
                dataKey="value" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
