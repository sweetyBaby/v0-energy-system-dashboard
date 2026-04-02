"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useLanguage } from "@/components/language-provider"

type RtPoint = {
  time: string
  voltage: number
  current: number
  soc: number
  power: number
  maxTemp: number
  avgTemp: number
  minTemp: number
  maxCell: number
  avgCell: number
  minCell: number
}
type MergedHistPoint = {
  time: string
  voltage: number   // pack voltage
  current: number
  soc: number
  power: number
  maxTemp: number
  avgTemp: number
  minTemp: number
  maxCell: number
  avgCell: number
  minCell: number
}

const RT_WINDOW_SECONDS = 60
const PACK_SERIES_COUNT = 50
const PACK_VOLTAGE_MIN = 1050
const PACK_VOLTAGE_MAX = 1450
const TS  = { backgroundColor: "#0d1233", border: "1px solid #1a2654", borderRadius: "8px", padding: "8px 12px" }
const TWS = { zIndex: 100 }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const round = (value: number, digits = 1) => +value.toFixed(digits)
const formatClock = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
const formatDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const formatFiveMin = (slot: number) => {
  const totalMin = slot * 5
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

const hashSeed = (value?: string) => {
  const input = value || "default"
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}
const seededSigned = (seed: number, index: number) => {
  const x = Math.sin((seed + index * 101.17) * 12.9898) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

// 实时数据生成
const getRealtimeTargets = (at: Date) => {
  const daySeed = hashSeed(formatDateKey(at))
  const seconds = at.getHours() * 3600 + at.getMinutes() * 60 + at.getSeconds()
  const hour = seconds / 3600
  const secondInMinute = seconds % 60
  const load = getDailyLoadFactor(hour)
  const baseSoc = getDailySoc(hour)
  const waveSlow = Math.sin(seconds / 48)
  const waveFast = Math.sin(seconds / 13 + 1.2)
  const waveMicro = Math.sin(seconds / 5.5 + 0.3)
  const wavePulse = Math.sin(seconds / 2.8 + 1.1)
  const seeded = seededSigned(daySeed, Math.floor(seconds / 15))
  const rampUp = secondInMinute < 18 ? secondInMinute / 18 : secondInMinute < 34 ? (34 - secondInMinute) / 16 : 0
  const rampDown = secondInMinute > 36 ? Math.max(0, 1 - (secondInMinute - 36) / 18) : 0
  const microLoad = rampUp * 7.5 - rampDown * 6.2 + waveMicro * 3.2 + wavePulse * 1.4 + seeded * 0.9
  const ripple = waveSlow * 0.55 + waveFast * 0.18 + microLoad * 0.22

  let current: number
  if (hour < 5.5) {
    current = -3 + Math.sin(hour * 1.4) * 2 + ripple * 1.8
  } else if (hour < 8.5) {
    current = 35 + ((hour - 5.5) / 3) * 40 + Math.sin(hour * 2.1) * 4 + ripple * 3.6
  } else if (hour < 18.5) {
    current = -(55 + load * 60 + Math.sin(((hour - 8.5) / 10) * Math.PI * 2) * 8 + ripple * 4.4)
  } else if (hour < 21.5) {
    current = -(20 + ((21.5 - hour) / 3) * 22 + ripple * 2.8)
  } else {
    current = -5 + Math.sin(hour * 1.2) * 2 + ripple * 1.6
  }

  current = clamp(current, -148, 148)

  const soc = clamp(baseSoc + waveSlow * 0.25 + waveMicro * 0.08 + seeded * 0.08, 0, 100)
  const ambient = 24.5 + Math.sin(((hour - 6) / 24) * Math.PI * 2) * 3 + seeded * 0.12
  const avgTemp = ambient + 2.2 + load * 5.2 + Math.sin((hour / 24) * Math.PI * 3) * 0.3 + waveFast * 0.12 + Math.abs(microLoad) * 0.06
  const tempSpread = 1.8 + load * 2 + Math.abs(waveSlow) * 0.35 + Math.abs(wavePulse) * 0.15
  const baseCell = 25.8 + soc * 0.028
  const chargeBoost = hour >= 6 && hour < 8.5 ? 0.75 : 0
  const dischSag = hour >= 8.5 && hour < 18.5 ? load * 1.85 : load * 0.65
  const avgCell = baseCell + chargeBoost - dischSag + seededSigned(daySeed, Math.floor(seconds / 30) + 160) * 0.18 + waveFast * 0.08 - current * 0.0035
  const cellSpread = 0.42 + load * 0.52 + Math.abs(waveFast) * 0.08 + Math.abs(wavePulse) * 0.06
  const voltage = avgCell * PACK_SERIES_COUNT + (current >= 0 ? current * 0.3 : current * 0.45)

  return {
    current,
    voltage,
    soc,
    avgTemp,
    tempSpread,
    avgCell,
    cellSpread,
  }
}

const nextRtPoint = (prev?: RtPoint, at = new Date()): RtPoint => {
  const target = getRealtimeTargets(at)
  // 降低平滑系数，让实时曲线在60s窗口内有明显波动
  const current = prev ? clamp(prev.current * 0.45 + target.current * 0.55, -148, 148) : round(target.current, 1)
  const soc = prev ? clamp(prev.soc * 0.97 + target.soc * 0.03, 0, 100) : target.soc
  const avgCell = prev ? clamp(prev.avgCell * 0.5 + target.avgCell * 0.5, 21, 29) : clamp(target.avgCell, 21, 29)
  const voltage = prev
    ? clamp(prev.voltage * 0.48 + target.voltage * 0.52, PACK_VOLTAGE_MIN, PACK_VOLTAGE_MAX)
    : clamp(target.voltage, PACK_VOLTAGE_MIN, PACK_VOLTAGE_MAX)
  const avgTemp = prev ? clamp(prev.avgTemp * 0.72 + target.avgTemp * 0.28, 24, 40) : round(target.avgTemp, 1)
  const tempSpread = prev
    ? clamp((prev.maxTemp - prev.avgTemp) * 0.68 + target.tempSpread * 0.32, 1.6, 4.5)
    : target.tempSpread
  const cellSpread = prev
    ? clamp((prev.maxCell - prev.avgCell) * 2 * 0.55 + target.cellSpread * 0.45, 0.25, 1.2)
    : target.cellSpread
  return {
    time: formatClock(at),
    voltage: round(voltage, 1),
    current: round(current, 1),
    soc: round(soc, 1),
    power: round(voltage * current / 1000, 1),
    maxTemp: round(avgTemp + tempSpread, 1),
    avgTemp: round(avgTemp, 1),
    minTemp: round(avgTemp - (tempSpread - 0.7), 1),
    maxCell: round(clamp(avgCell + cellSpread / 2, 21, 29), 2),
    avgCell: round(avgCell, 2),
    minCell: round(clamp(avgCell - cellSpread / 2, 21, 29), 2),
  }
}

const initRtOverview = (): RtPoint[] => {
  const pts: RtPoint[] = []
  for (let i = RT_WINDOW_SECONDS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 1000)
    pts.push(nextRtPoint(pts[pts.length - 1], d))
  }
  return pts
}

// 历史数据生成，5分钟间隔，288个点（1天）
const getDailyLoadFactor = (hour: number) => {
  if (hour < 5.5)  return 0.12 + hour * 0.018
  if (hour < 8.5)  return 0.21 + ((hour - 5.5) / 3) * 0.42
  if (hour < 17.5) return 0.65 + Math.sin(((hour - 8.5) / 9) * Math.PI) * 0.2
  if (hour < 21.5) return 0.52 - ((hour - 17.5) / 4) * 0.24
  return 0.2 - ((hour - 21.5) / 2.5) * 0.06
}
const getDailySoc = (hour: number) => {
  if (hour < 6)    return 42 + hour * 0.5
  if (hour < 8.5)  return 45 + ((hour - 6) / 2.5) * 25
  if (hour < 18.5) return 70 - ((hour - 8.5) / 10) * 26
  return 44 - ((hour - 18.5) / 5.5) * 3
}

const createHistorySeries = (date?: string): MergedHistPoint[] => {
  const seed = hashSeed(date)
  const merged: MergedHistPoint[] = []

  for (let slot = 0; slot < 288; slot++) {
    const hour = slot / 12
    const load  = getDailyLoadFactor(hour)
    const soc   = getDailySoc(hour)
    const ns    = seededSigned(seed, slot)

    // 娓╁害
    const ambient  = 24.5 + Math.sin(((hour - 6) / 24) * Math.PI * 2) * 3 + ns * 0.15
    const avgTemp  = ambient + 2.2 + load * 5.2 + Math.sin((hour / 24) * Math.PI * 3) * 0.3
    const spread   = 1.8 + load * 2 + Math.abs(seededSigned(seed, slot + 80)) * 0.4

    // 单体电压
    const baseCell    = 25.8 + soc * 0.028
    const chargeBoost = (hour >= 6 && hour < 8.5) ? 0.75 : 0
    const dischSag    = (hour >= 8.5 && hour < 18.5) ? load * 1.85 : load * 0.65
    const avgCell     = baseCell + chargeBoost - dischSag + seededSigned(seed, slot + 160) * 0.18
    const cellSpread  = 0.42 + load * 0.48

    // 电流，正值为充电，负值为放电
    let current: number
    if (hour < 5.5)       current = -3  + Math.sin(hour * 1.4) * 2 + ns * 1.5
    else if (hour < 8.5)  current =  35 + ((hour - 5.5) / 3) * 40 + Math.sin(hour * 2.1) * 4 + seededSigned(seed, slot + 320) * 3
    else if (hour < 18.5) current = -(55 + load * 60 + Math.sin(((hour - 8.5) / 10) * Math.PI * 2) * 8 + seededSigned(seed, slot + 320) * 4)
    else if (hour < 21.5) current = -(20 + ((21.5 - hour) / 3) * 22 + seededSigned(seed, slot + 320) * 2.5)
    else                  current = -5  + Math.sin(hour * 1.2) * 2 + ns * 1.5

    current = clamp(current, -148, 148)
    const packV = avgCell * PACK_SERIES_COUNT + (current >= 0 ? current * 0.3 : current * 0.45)

    merged.push({
      time:    formatFiveMin(slot),
      voltage: round(clamp(packV, PACK_VOLTAGE_MIN, PACK_VOLTAGE_MAX), 1),
      current: round(current, 1),
      soc:     round(clamp(soc + ns * 0.15, 0, 100), 1),
      power:   round(packV * current / 1000, 1),
      maxTemp: round(avgTemp + spread, 1),
      avgTemp: round(avgTemp, 1),
      minTemp: round(avgTemp - (spread - 0.8), 1),
      maxCell: round(clamp(avgCell + cellSpread / 2, 21, 29), 2),
      avgCell: round(clamp(avgCell, 21, 29), 2),
      minCell: round(clamp(avgCell - cellSpread / 2, 21, 29), 2),
    })
  }

  return merged
}

// 历史共享时间轴堆叠图（4行）
const HIST_X_TICK = (props: { x: number; y: number; payload: { value: string } }) => {
  const mn = parseInt((props.payload.value).split(":")[1] ?? "1")
  if (mn !== 0) return <g />
  return (
    <g transform={`translate(${props.x},${props.y})`}>
      <text x={0} y={0} dy={4} textAnchor="end"
        fill="#7b8ab8" fontSize={9} transform="rotate(-45)">
        {props.payload.value}
      </text>
    </g>
  )
}

function TrendStackedChart({ data, zh, history, hideCellSeries = false }: { data: Array<RtPoint | MergedHistPoint>; zh: boolean; history: boolean; hideCellSeries?: boolean }) {
  const syncId = history ? "hist" : "rt"
  const sections = [
    {
      kind: "single" as const,
      dataKey: "current" as const,
      label: zh ? "电流(A)" : "Current(A)",
      tooltipLabel: zh ? "电流" : "Current",
      color: "#f472b6",
      domain: [-100, 100] as [number, number],
      ticks: [-100, 0, 100],
      zeroLine: true,
      unit: "A",
      tickFormatter: (v: number) => `${v}`,
    },
    {
      kind: "single" as const,
      dataKey: "power" as const,
      label: zh ? "功率(kW)" : "Power(kW)",
      tooltipLabel: zh ? "功率" : "Power",
      color: "#4ade80",
      domain: [-150, 150] as [number, number],
      ticks: [-150, 0, 150],
      zeroLine: true,
      unit: "kW",
      tickFormatter: (v: number) => `${v}`,
    },
    {
      kind: "single" as const,
      dataKey: "soc" as const,
      label: "SOC(%)",
      tooltipLabel: "SOC",
      color: "#22d3ee",
      domain: [0, 100] as [number, number],
      unit: "%",
      tickFormatter: (v: number) => `${v}`,
    },
    {
      kind: "single" as const,
      dataKey: "voltage" as const,
      label: zh ? "Pack电压(V)" : "Pack(V)",
      tooltipLabel: zh ? "Pack电压" : "Pack V",
      color: "#fb923c",
      domain: [1100, 1450] as [number, number],
      unit: "V",
      tickFormatter: (v: number) => `${Math.round(v)}`,
    },
    {
      kind: "triple" as const,
      label: zh ? "单体温度(°C)" : "Cell Temp(°C)",
      color: "#fbbf24",
      domain: [20, 42] as [number, number],
      unit: "°C",
      tickFormatter: (v: number) => `${v}°`,
      tooltipFormatter: (v: number) => `${v.toFixed(1)} °C`,
      lines: [
        { key: "maxTemp" as const, name: zh ? "最高温" : "Max", color: "#f87171" },
        { key: "minTemp" as const, name: zh ? "最低温" : "Min", color: "#7dd3fc" },
      ],
    },
    {
      kind: "triple" as const,
      label: zh ? "单体电压(V)" : "Cell Volt(V)",
      color: "#22d3ee",
      domain: [21, 29] as [number, number],
      unit: "V",
      tickFormatter: (v: number) => (v as number).toFixed(1),
      tooltipFormatter: (v: number) => `${(v as number).toFixed(2)} V`,
      lines: [
        { key: "maxCell" as const, name: zh ? "最高单体" : "Max", color: "#f87171" },
        { key: "minCell" as const, name: zh ? "最低单体" : "Min", color: "#7dd3fc" },
      ],
    },
  ]

  const visibleSections = hideCellSeries ? sections.filter((s) => s.kind !== "triple") : sections

  return (
    <div className="flex h-full min-h-0 flex-col">
      {visibleSections.map((section, idx) => {
        const isLast = idx === visibleSections.length - 1
        const chartTop = section.kind === "triple" ? 24 : 8
        return (
          <div key={section.label} className={`relative min-h-0 flex-1 ${!isLast ? "border-b border-[#1a2654]/40" : ""}`}>
            {/* 三线图例：悬浮在右上角，不占 chart 高度 */}
            {section.kind === "triple" && (
              <div className="absolute right-2 top-1 z-10 flex items-center gap-3">
                {"lines" in section && section.lines.map(line => (
                  <div key={line.key} className="flex items-center gap-1">
                    <svg width="18" height="10" style={{ display: "block" }}>
                      <line x1="0" y1="5" x2="18" y2="5" stroke={line.color} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span style={{ color: "#9ca3af", fontSize: "11px", lineHeight: 1 }}>{line.name}</span>
                  </div>
                ))}
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data as object[]} syncId={syncId} syncMethod="value" margin={{ top: chartTop, right: 10, left: 0, bottom: isLast ? 2 : 0 }}>
                <CartesianGrid stroke="#1a2654" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={!isLast ? false : history ? HIST_X_TICK : { fill: "#7b8ab8", fontSize: 9 }}
                  axisLine={isLast ? { stroke: "#1a2654", strokeOpacity: 0.4 } : false}
                  tickLine={false}
                  height={isLast ? (history ? 38 : 18) : 0}
                  interval={history ? 0 : 9}
                  minTickGap={history ? 1 : undefined}
                />
                <YAxis
                  domain={section.domain}
                  width={44}
                  tick={{ fill: section.color, fontSize: 8 }}
                  axisLine={{ stroke: section.color, strokeOpacity: 0.25 }}
                  tickLine={false}
                  ticks={"ticks" in section ? section.ticks : undefined}
                  tickCount={3}
                  tickMargin={3}
                  tickFormatter={section.tickFormatter}
                />
                {"zeroLine" in section && section.zeroLine && (
                  <ReferenceLine y={0} stroke="#9fb9d6" strokeDasharray="4 3" strokeOpacity={0.72} ifOverflow="extendDomain" />
                )}
                <Tooltip
                  wrapperStyle={TWS}
                  contentStyle={TS}
                  cursor={{ stroke: "#93c5fd", strokeWidth: 1, strokeOpacity: 0.65 }}
                  position={{ y: 4 }}
                  labelStyle={{ color: "#7b8ab8", fontSize: 13 }}
                  itemStyle={{ fontSize: 13, padding: "2px 0" }}
                  formatter={section.kind === "single"
                    ? (v) => [`${section.tickFormatter(v as number)} ${section.unit}`, section.tooltipLabel]
                    : (v, n) => [section.tooltipFormatter(v as number), n as string]
                  }
                />
                <text
                  x={section.kind === "single" ? "100%" : 46}
                  y={15}
                  textAnchor={section.kind === "single" ? "end" : "start"}
                  dx={section.kind === "single" ? -10 : 0}
                  fill={section.color} fontSize={11} fontWeight={600}>
                  {section.label}
                </text>
                {section.kind === "single" ? (
                  <Line type="monotone" dataKey={section.dataKey} stroke={section.color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                ) : (
                  section.lines.map(line => (
                    <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  ))
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      })}
    </div>
  )
}

export function BCUStatusQuery({
  mode = "realtime",
  date,
  hideCellSeries = false,
  panelVariant = "default",
}: {
  mode?: "realtime" | "history"
  date?: string
  hideCellSeries?: boolean
  panelVariant?: "default" | "overview"
}) {
  const { language } = useLanguage()
  const zh = language === "zh"

  const [rtOverview, setRtOverview] = useState<RtPoint[]>(initRtOverview)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (mode !== "realtime") return
    timerRef.current = setInterval(() => {
      setRtOverview(prev => [...prev.slice(-(RT_WINDOW_SECONDS - 1)), nextRtPoint(prev[prev.length - 1])])
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [mode])

  const histData = useMemo(() => createHistorySeries(date), [date])
  const liveTimeLabel = rtOverview[rtOverview.length - 1]?.time.slice(0, 5) ?? "--:--"
  const isOverviewVariant = panelVariant === "overview"

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden ${
        isOverviewVariant
          ? "relative rounded-[20px] border border-[#254873]/80 bg-[radial-gradient(circle_at_top_right,rgba(38,109,178,0.15),transparent_28%),linear-gradient(180deg,rgba(10,19,44,0.97),rgba(6,12,29,0.98))] p-3 shadow-[0_0_0_1px_rgba(88,181,255,0.08),0_18px_42px_rgba(1,7,19,0.42),inset_0_0_28px_rgba(44,126,198,0.06)]"
          : "rounded-lg border border-[#1a2654] bg-[#0d1233] p-3"
      }`}
    >
      {isOverviewVariant ? <div className="pointer-events-none absolute inset-0 rounded-[20px] border border-[#8feaff]/[0.05]" /> : null}
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <span className="text-sm font-semibold text-[#00d4aa]">
            {zh ? "BCU 运行状态" : "BCU Status"}
          </span>
          {mode === "realtime" && (
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[#1f5f92] bg-[linear-gradient(180deg,rgba(14,44,78,0.96),rgba(9,26,50,0.96))] px-2.5 text-[11px] font-semibold text-[#bfe7ff] shadow-[inset_0_0_0_1px_rgba(110,196,255,0.08)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#20d4ff] shadow-[0_0_8px_rgba(32,212,255,0.9)]" />
              <span>{zh ? "实时" : "Live"}</span>
              <span className="tabular-nums text-[#f2fbff]">{liveTimeLabel}</span>
            </span>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {mode === "realtime" && <TrendStackedChart data={rtOverview} zh={zh} history={false} hideCellSeries={hideCellSeries} />}
        {mode === "history" && <TrendStackedChart data={histData} zh={zh} history hideCellSeries={hideCellSeries} />}
      </div>
    </div>
  )
}
