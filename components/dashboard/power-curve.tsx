"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"

const powerData = [
  { time: "11月1", charge: 120, discharge: 180 },
  { time: "11月4", charge: 280, discharge: 220 },
  { time: "11月7", charge: 350, discharge: 280 },
  { time: "11月10", charge: 200, discharge: 350 },
  { time: "11月13", charge: 320, discharge: 250 },
]

export function PowerCurve() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-primary rounded-full" />
        <h3 className="text-sm font-medium text-muted-foreground">充放电量/MWh</h3>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-primary" />
          <span className="text-muted-foreground">充电量</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-accent" />
          <span className="text-muted-foreground">放电量</span>
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={powerData}>
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10, fill: "#7b8ab8" }}
              axisLine={{ stroke: "#1a2654" }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: "#7b8ab8" }}
              axisLine={{ stroke: "#1a2654" }}
              tickLine={false}
              tickFormatter={(value) => `${value}MWh`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0d1233",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "8px",
                color: "#e8f4fc",
              }}
            />
            <Line 
              type="monotone" 
              dataKey="charge" 
              stroke="#00d4aa" 
              strokeWidth={2}
              dot={{ fill: "#00d4aa", strokeWidth: 0, r: 3 }}
              name="充电量"
            />
            <Line 
              type="monotone" 
              dataKey="discharge" 
              stroke="#f97316" 
              strokeWidth={2}
              dot={{ fill: "#f97316", strokeWidth: 0, r: 3 }}
              name="放电量"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
