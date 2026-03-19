"use client"

import { Activity } from "lucide-react"

export function GridConnectionData() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-chart-4 rounded-full" />
        <h3 className="text-sm font-medium text-muted-foreground">并网点数据</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-chart-4" />
            <span className="text-xs text-muted-foreground">正向有功电能 (kWh)</span>
          </div>
          <p className="text-lg font-bold text-foreground">112,419.00</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">反向有功电能 (kWh)</span>
          </div>
          <p className="text-lg font-bold text-foreground">112,419.00</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded bg-secondary/50">
          <p className="text-xs text-muted-foreground">P(kW)</p>
          <p className="text-sm font-semibold text-foreground">0.00</p>
        </div>
        <div className="p-2 rounded bg-secondary/50">
          <p className="text-xs text-muted-foreground">Q(kVar)</p>
          <p className="text-sm font-semibold text-foreground">0.00</p>
        </div>
        <div className="p-2 rounded bg-secondary/50">
          <p className="text-xs text-muted-foreground">Cos</p>
          <p className="text-sm font-semibold text-foreground">0.00</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Ia(A)</p>
          <p className="text-sm font-semibold text-foreground">12.00</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Ib(A)</p>
          <p className="text-sm font-semibold text-foreground">12.00</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Ic(A)</p>
          <p className="text-sm font-semibold text-foreground">12.00</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Ua(V)</p>
          <p className="text-sm font-semibold text-foreground">12.00</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Ub(V)</p>
          <p className="text-sm font-semibold text-foreground">12.00</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Uc(V)</p>
          <p className="text-sm font-semibold text-foreground">12.00</p>
        </div>
      </div>
    </div>
  )
}
