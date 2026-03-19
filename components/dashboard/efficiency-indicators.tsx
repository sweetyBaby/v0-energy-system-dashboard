"use client"

interface CircularProgressProps {
  value: number
  label: string
  color: string
  size?: number
}

function CircularProgress({ value, label, color, size = 80 }: CircularProgressProps) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1a2654"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-foreground">{value}%</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground mt-2 text-center">{label}</span>
    </div>
  )
}

const efficiencyData = [
  { value: 77.67, label: "综合效率", color: "#00d4aa" },
  { value: 50, label: "系统效率", color: "#22d3ee" },
  { value: 17.67, label: "站用电占比", color: "#f97316" },
  { value: 25, label: "充放电比", color: "#a855f7" },
]

export function EfficiencyIndicators() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-chart-4 rounded-full" />
        <h3 className="text-sm font-medium text-muted-foreground">能效指标</h3>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {efficiencyData.map((item) => (
          <CircularProgress
            key={item.label}
            value={item.value}
            label={item.label}
            color={item.color}
            size={70}
          />
        ))}
      </div>
    </div>
  )
}
