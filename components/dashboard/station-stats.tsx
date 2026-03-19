"use client"

import { Building2, Battery, Gauge, Clock } from "lucide-react"

const stats = [
  { label: "储能电站", value: "11", unit: "座", icon: Building2 },
  { label: "储能容量", value: "90.2", unit: "MWh", icon: Battery },
  { label: "系统效率", value: "90", unit: "%", icon: Gauge },
  { label: "综合利用时间", value: "2160", unit: "H", icon: Clock },
]

const dailyStats = [
  { label: "累计当日充电量", value: "130", unit: "kWh", color: "text-chart-4" },
  { label: "累计当日放电量", value: "115", unit: "kWh", color: "text-primary" },
  { label: "累计昨日充电量", value: "245", unit: "kWh", color: "text-chart-4" },
  { label: "累计昨日放电量", value: "180", unit: "kWh", color: "text-primary" },
]

export function StationStats() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      {/* Main Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center p-3 rounded-lg bg-secondary/30 border border-border/50">
            <div className="flex justify-center mb-2">
              <stat.icon className="w-5 h-5 text-chart-4" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stat.value}
              <span className="text-xs font-normal text-muted-foreground ml-1">{stat.unit}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Daily Stats */}
      <div className="grid grid-cols-4 gap-4">
        {dailyStats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className={`text-lg font-bold ${stat.color}`}>
              {stat.value}
              <span className="text-xs font-normal text-muted-foreground ml-1">{stat.unit}</span>
            </p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
