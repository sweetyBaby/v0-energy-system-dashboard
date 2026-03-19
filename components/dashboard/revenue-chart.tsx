"use client"

import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ComposedChart,
} from "recharts"

const revenueData = [
  { date: "11月7", revenue: 2.5, rate: 30 },
  { date: "11月8", revenue: 4.2, rate: 50 },
  { date: "11月9", revenue: 5.8, rate: 65 },
  { date: "11月10", revenue: 6.5, rate: 75 },
  { date: "11月11", revenue: 5.2, rate: 60 },
  { date: "11月12", revenue: 7.0, rate: 80 },
  { date: "11月13", revenue: 6.8, rate: 78 },
]

export function RevenueChart() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-accent rounded-full" />
          <h3 className="text-sm font-medium text-muted-foreground">收益指标</h3>
        </div>
      </div>

      {/* Total Revenue */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">累计收益：(万元)</span>
        <span className="text-2xl font-bold text-primary">73,278.79</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-chart-1" />
          <span className="text-muted-foreground">收益(万元)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-accent" />
          <span className="text-muted-foreground">计划达成率(%)</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={revenueData}>
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: "#7b8ab8" }}
              axisLine={{ stroke: "#1a2654" }}
              tickLine={false}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 10, fill: "#7b8ab8" }}
              axisLine={{ stroke: "#1a2654" }}
              tickLine={false}
              tickFormatter={(value) => `${value}万`}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: "#7b8ab8" }}
              axisLine={{ stroke: "#1a2654" }}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0d1233",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "8px",
                color: "#e8f4fc",
              }}
            />
            <Bar 
              yAxisId="left"
              dataKey="revenue" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
              maxBarSize={25}
              name="收益(万元)"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="rate" 
              stroke="#f97316" 
              strokeWidth={2}
              dot={{ fill: "#f97316", strokeWidth: 0, r: 3 }}
              name="达成率(%)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
