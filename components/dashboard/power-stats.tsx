"use client"

import { Battery, BatteryCharging } from "lucide-react"

export function PowerStats() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-primary rounded-full" />
        <h3 className="text-sm font-medium text-muted-foreground">总量统计</h3>
      </div>

      {/* Charge Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">总充电量</p>
            <p className="text-2xl font-bold text-primary">
              999,998.<span className="text-lg">1003485</span>{" "}
              <span className="text-sm font-normal text-muted-foreground">MW</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-chart-4/20 to-chart-4/5 flex items-center justify-center border border-chart-4/30">
            <BatteryCharging className="w-6 h-6 text-chart-4" />
          </div>
        </div>

        {/* Discharge Stats */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">总放电量</p>
            <p className="text-2xl font-bold text-accent">
              999,100.<span className="text-lg">0999485</span>{" "}
              <span className="text-sm font-normal text-muted-foreground">MW</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/30">
            <Battery className="w-6 h-6 text-accent" />
          </div>
        </div>
      </div>

      {/* Battery Progress */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground">储能容量</span>
          <span className="text-foreground">200 / 1200 kW/kWh</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-chart-4 to-primary" 
            style={{ width: "16.7%" }}
          />
        </div>
      </div>
    </div>
  )
}
