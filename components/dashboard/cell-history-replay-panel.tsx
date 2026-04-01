"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { AlertTriangle, Check, ChevronsUpDown, Thermometer, TrendingDown, TrendingUp } from "lucide-react"
import { CartesianGrid, Customized, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useLanguage } from "@/components/language-provider"
import { BCUStatusQuery } from "@/components/dashboard/bcu-status-query"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type HistoryPoint = {
  time: string
} & Record<`v${number}`, number> &
  Record<`t1_${number}`, number> &
  Record<`t2_${number}`, number> &
  Record<`t3_${number}`, number>

type OverviewPoint = {
  time: string
  maxVoltage: number
  minVoltage: number
  avgVoltage: number
  voltageDelta: number
  maxTemp: number
  minTemp: number
  avgTemp: number
  tempDelta: number
  interCellTempDiff: number
  intraCellTempDiff: number
}

type CellMetric = {
  cell: number
  voltageMax: number
  voltageMaxAt: string
  voltageMin: number
  voltageMinAt: string
  voltageAvg: number
  voltageSpread: number
  voltageDeviation: number
  tempMax: number
  tempMaxAt: string
  tempMin: number
  tempAvg: number
  tempSpread: number
  maxIntraTempDiff: number
  maxIntraTempDiffAt: string
  riskScore: number
}

type FleetCurvePoint = {
  time: string
  avg: number
  upper: number
  lower: number
} & Record<string, string | number | null>

type TemperatureChannelKey = "t1" | "t2" | "t3"

type ChannelAlert = {
  cell: number
  peak: number
  time: string
  dataKey: string
}

type TemperatureFleetChart = {
  key: TemperatureChannelKey
  title: string
  data: FleetCurvePoint[]
  highlightedCells: number[]
}

type VoltageHighlightSeries = {
  cell: number
  color: string
}


const CELL_COUNT = 50
const STEP_MINUTES = 15
const TOTAL_POINTS = (24 * 60) / STEP_MINUTES
const mutedText = "text-[#7fa4be]"
const edgeGlow = "shadow-[0_0_0_1px_rgba(88,181,255,0.08),0_18px_42px_rgba(1,7,19,0.42),inset_0_0_28px_rgba(44,126,198,0.06)]"

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)

const formatTimeLabel = (index: number) =>
  `${String(Math.floor((index * STEP_MINUTES) / 60)).padStart(2, "0")}:${String((index * STEP_MINUTES) % 60).padStart(2, "0")}`


const getCellTemps = (point: HistoryPoint, cell: number) => [point[`t1_${cell}`], point[`t2_${cell}`], point[`t3_${cell}`]]

const createHistoryData = (date: string): HistoryPoint[] => {
  const daySeed = date.split("-").map(Number).reduce((acc, value, index) => acc + value * (index + 3), 0)

  return Array.from({ length: TOTAL_POINTS }, (_, index) => {
    const point: HistoryPoint = { time: formatTimeLabel(index) } as HistoryPoint
    const dayPhase = (index / TOTAL_POINTS) * Math.PI * 4
    const isCharge = (index >= 8 && index <= 26) || (index >= 48 && index <= 64)
    const isDischarge = (index >= 30 && index <= 39) || (index >= 65 && index <= 76)

    for (let cell = 1; cell <= CELL_COUNT; cell += 1) {
      const cellOffset = (cell - 25.5) * 0.0016
      const wave = Math.sin(dayPhase + cell * 0.09) * 0.014 + Math.cos(dayPhase * 0.45 + cell * 0.12) * 0.006
      const ripple = Math.sin(index * 0.32 + cell * 0.17 + daySeed * 0.02) * 0.003

      let voltage = 3.22 + cellOffset + wave + ripple
      if (isCharge) voltage += 0.08 + Math.max(0, index < 27 ? (index - 8) / 18 : (index - 48) / 16) * 0.36
      if (isDischarge) voltage -= 0.08 + Math.max(0, index < 40 ? (index - 30) / 9 : (index - 65) / 11) * 0.28
      if (!isCharge && !isDischarge) voltage += Math.sin(index * 0.08 + cell * 0.07) * 0.005

      const baseTemp = 27.5 + Math.sin(dayPhase * 0.6 + cell * 0.05) * 2.2 + (cell % 9) * 0.08
      const thermalLoad = isCharge ? 2.2 : isDischarge ? 1.3 : 0.3
      const tempDrift = Math.sin(index * 0.18 + cell * 0.22 + daySeed * 0.01) * 0.5

      point[`v${cell}`] = Number(voltage.toFixed(3))
      point[`t1_${cell}`] = Number((baseTemp + thermalLoad + tempDrift).toFixed(1))
      point[`t2_${cell}`] = Number((baseTemp + thermalLoad + 0.7 + Math.cos(index * 0.15 + cell * 0.19) * 0.45).toFixed(1))
      point[`t3_${cell}`] = Number((baseTemp + thermalLoad - 0.5 + Math.sin(index * 0.2 + cell * 0.14) * 0.55).toFixed(1))
    }

    return point
  })
}

const buildOverview = (historyData: HistoryPoint[]): OverviewPoint[] =>
  historyData.map((point) => {
    const voltages = Array.from({ length: CELL_COUNT }, (_, index) => point[`v${index + 1}`])
    const cellAvgTemps = Array.from({ length: CELL_COUNT }, (_, index) => average(getCellTemps(point, index + 1)))
    const intraDiffs = Array.from({ length: CELL_COUNT }, (_, index) => {
      const temps = getCellTemps(point, index + 1)
      return Math.max(...temps) - Math.min(...temps)
    })
    const allTemps = Array.from({ length: CELL_COUNT }, (_, index) => getCellTemps(point, index + 1)).flat()

    const maxVoltage = Math.max(...voltages)
    const minVoltage = Math.min(...voltages)
    const maxTemp = Math.max(...allTemps)
    const minTemp = Math.min(...allTemps)

    return {
      time: point.time,
      maxVoltage: Number(maxVoltage.toFixed(3)),
      minVoltage: Number(minVoltage.toFixed(3)),
      avgVoltage: Number(average(voltages).toFixed(3)),
      voltageDelta: Number((maxVoltage - minVoltage).toFixed(3)),
      maxTemp: Number(maxTemp.toFixed(1)),
      minTemp: Number(minTemp.toFixed(1)),
      avgTemp: Number(average(allTemps).toFixed(1)),
      tempDelta: Number((maxTemp - minTemp).toFixed(1)),
      interCellTempDiff: Number((Math.max(...cellAvgTemps) - Math.min(...cellAvgTemps)).toFixed(1)),
      intraCellTempDiff: Number(Math.max(...intraDiffs).toFixed(1)),
    }
  })

const buildCellMetrics = (historyData: HistoryPoint[]): CellMetric[] =>
  Array.from({ length: CELL_COUNT }, (_, index) => {
    const cell = index + 1
    const voltageValues = historyData.map((point) => point[`v${cell}`])
    const tempValues = historyData.flatMap((point) => getCellTemps(point, cell))
    const intraDiffSeries = historyData.map((point) => {
      const temps = getCellTemps(point, cell)
      return { time: point.time, value: Math.max(...temps) - Math.min(...temps) }
    })

    const maxVoltageValue = Math.max(...voltageValues)
    const minVoltageValue = Math.min(...voltageValues)
    const maxTempValue = Math.max(...tempValues)
    const minTempValue = Math.min(...tempValues)
    const maxIntraDiff = intraDiffSeries.reduce((best, current) => (current.value > best.value ? current : best), intraDiffSeries[0])
    const voltageDeviation =
      historyData.reduce((sum, point) => {
        const fleetMean =
          Array.from({ length: CELL_COUNT }, (_, fleetIndex) => point[`v${fleetIndex + 1}`]).reduce((acc, value) => acc + value, 0) /
          CELL_COUNT
        return sum + Math.abs(point[`v${cell}`] - fleetMean)
      }, 0) / historyData.length

    const voltageMaxAt = historyData.find((point) => point[`v${cell}`] === maxVoltageValue)?.time ?? historyData[0]?.time ?? "--"
    const voltageMinAt = historyData.find((point) => point[`v${cell}`] === minVoltageValue)?.time ?? historyData[0]?.time ?? "--"
    const tempMaxAt =
      historyData.find((point) => {
        const temps = getCellTemps(point, cell)
        return Math.max(...temps) === maxTempValue
      })?.time ?? historyData[0]?.time ?? "--"

    const riskScore =
      (maxVoltageValue - minVoltageValue) * 1000 * 0.4 +
      voltageDeviation * 1000 * 0.25 +
      maxTempValue * 0.15 +
      maxIntraDiff.value * 5 +
      (maxTempValue - minTempValue) * 0.2

    return {
      cell,
      voltageMax: Number(maxVoltageValue.toFixed(3)),
      voltageMaxAt,
      voltageMin: Number(minVoltageValue.toFixed(3)),
      voltageMinAt,
      voltageAvg: Number(average(voltageValues).toFixed(3)),
      voltageSpread: Number((maxVoltageValue - minVoltageValue).toFixed(3)),
      voltageDeviation: Number(voltageDeviation.toFixed(3)),
      tempMax: Number(maxTempValue.toFixed(1)),
      tempMaxAt,
      tempMin: Number(minTempValue.toFixed(1)),
      tempAvg: Number(average(tempValues).toFixed(1)),
      tempSpread: Number((maxTempValue - minTempValue).toFixed(1)),
      maxIntraTempDiff: Number(maxIntraDiff.value.toFixed(1)),
      maxIntraTempDiffAt: maxIntraDiff.time,
      riskScore: Number(riskScore.toFixed(1)),
    }
  })

function NeonSection({
  title,
  subtitle,
  badge,
  inlineSubtitle = false,
  compact = false,
  children,
}: {
  title: string
  subtitle?: string
  badge?: string
  inlineSubtitle?: boolean
  compact?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={`relative flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-[#254873]/80 bg-[radial-gradient(circle_at_top_right,rgba(38,109,178,0.15),transparent_28%),linear-gradient(180deg,rgba(10,19,44,0.97),rgba(6,12,29,0.98))] ${compact ? "p-2.5" : "p-3"} ${edgeGlow}`}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[20px] border border-[#8feaff]/[0.05]" />
      <div className="pointer-events-none absolute left-3 top-3 h-5 w-[2px] rounded-full bg-[#3fe7ff]/90 shadow-[0_0_12px_rgba(63,231,255,0.85)]" />
      <div className="pointer-events-none absolute inset-x-4 top-[50px] h-px bg-gradient-to-r from-[#274f78]/70 via-[#78dfff]/45 to-transparent" />
      <div className={`relative flex ${inlineSubtitle ? "items-center" : "items-start"} justify-between gap-3 ${compact ? "pl-2.5" : "pl-3"} ${inlineSubtitle ? (compact ? "mb-1.5" : "mb-2") : (compact ? "mb-2" : "mb-3")}`}>
        <div className={inlineSubtitle ? "flex items-center gap-3" : ""}>
          <div className={`${compact ? "text-[0.9rem]" : "text-[0.98rem]"} font-semibold tracking-[0.08em] text-[#8ceeff]`}>{title}</div>
          {subtitle ? (
            <div className={inlineSubtitle ? `text-[10px] leading-none ${mutedText}` : `mt-1 text-[10px] leading-4 ${mutedText}`}>{subtitle}</div>
          ) : null}
        </div>
        {badge ? (
          <div className="rounded-[10px] border border-[#29547f] bg-[linear-gradient(180deg,rgba(12,28,60,0.95),rgba(8,19,42,0.96))] px-2.5 py-1 text-[10px] text-[#c0eeff] shadow-[inset_0_0_12px_rgba(63,231,255,0.06)]">
            {badge}
          </div>
        ) : null}
      </div>
      <div className={`relative min-h-0 flex-1 ${compact ? "pl-2.5" : "pl-3"}`}>{children}</div>
    </section>
  )
}

function InnerFrame({ title, accent = "#74ebff", compact = false, children }: { title: string; accent?: string; compact?: boolean; children: ReactNode }) {
  return (
    <div className={`flex h-full min-h-0 flex-col rounded-[16px] border border-[#1f4068] bg-[linear-gradient(180deg,rgba(10,20,44,0.9),rgba(8,16,37,0.96))] shadow-[inset_0_0_16px_rgba(25,92,148,0.08)] ${compact ? "p-1.5" : "p-2"}`}>
      <div className={`${compact ? "mb-1" : "mb-1.5"} flex items-center gap-2`}>
        <div className="h-5 w-[2px] rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 10px ${accent}` }} />
        <div className={`${compact ? "text-[0.78rem]" : "text-[0.86rem]"} font-semibold tracking-[0.06em] text-[#d8f7ff]`}>{title}</div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}

function MetricCard({ title, value, tone, icon, compact = false, horizontal = false, tight = false }: { title: string; value: string; tone: string; icon: ReactNode; compact?: boolean; horizontal?: boolean; tight?: boolean }) {
  if (horizontal) {
    return (
      <div className={`rounded-[14px] border border-[#25466d] bg-[linear-gradient(180deg,rgba(13,27,58,0.92),rgba(11,20,44,0.98))] shadow-[inset_0_0_18px_rgba(69,155,255,0.06)] ${tight ? "px-2 py-1.5" : compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}>
        <div className="flex items-center justify-between gap-2">
          <div className={`flex min-w-0 items-center gap-1.5 ${tight ? "text-[8px] tracking-[0.02em]" : compact ? "text-[9px] tracking-[0.04em]" : "text-[10px] tracking-[0.08em]"} ${mutedText}`}>
            {/* {icon} */}
            <span className={`min-w-0 leading-tight ${tight ? "text-[0.7rem]" : "text-[0.78rem]"} whitespace-nowrap`}>{title}</span>
          </div>
          <div className={`shrink-0 font-mono font-semibold leading-none ${tight ? "text-[1.02rem] tracking-[0.01em]" : compact ? "text-[1.18rem] tracking-[0.02em]" : "text-[1.35rem] tracking-[0.03em]"} ${tone}`}>{value}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-[14px] border border-[#25466d] bg-[linear-gradient(180deg,rgba(13,27,58,0.92),rgba(11,20,44,0.98))] shadow-[inset_0_0_18px_rgba(69,155,255,0.06)] ${compact ? "px-2.5 py-2" : "px-3 py-2.5"}`}>
      <div className={`flex min-w-0 items-center gap-1.5 ${compact ? "text-[9px] tracking-[0.05em]" : "text-[10px] tracking-[0.08em]"} ${mutedText}`}>
        {icon}
        <span className="min-w-0 truncate leading-tight">{title}</span>
      </div>
      <div className={`font-mono font-semibold leading-none ${compact ? "mt-1 text-[1.28rem] tracking-[0.02em]" : "mt-1.5 text-[1.55rem] tracking-[0.04em]"} ${tone}`}>{value}</div>
    </div>
  )
}

function LegendItem({ label, color, dashed = false, compact = false }: { label: string; color: string; dashed?: boolean; compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? "gap-1.5 text-[10px]" : "gap-2 text-[11px]"} text-[#96bdd4]`}>
      <span className={`block h-[2px] ${compact ? "w-4" : "w-5"} ${dashed ? "border-t-2 border-dashed" : ""}`} style={dashed ? { borderColor: color } : { backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
      <span>{label}</span>
    </div>
  )
}

function FleetTooltip({
  active,
  label,
  payload,
  unit,
  labelForKey,
  markerVariantForKey,
  valueFormatter,
  maxRows,
}: {
  active?: boolean
  label?: string
  payload?: Array<{ dataKey?: string; value?: number | string; color?: string }>
  unit: string
  labelForKey: (key: string) => string | null
  markerVariantForKey?: (key: string) => "dot" | "diamond"
  valueFormatter?: (value: number) => string
  maxRows?: number
}) {
  if (!active || !payload?.length) return null

  const rows = payload
    .map((item) => {
      const key = String(item.dataKey ?? "")
      const name = labelForKey(key)
      const numericValue = typeof item.value === "number" ? item.value : Number(item.value)
      if (!name || Number.isNaN(numericValue)) return null
      return { key, name, value: numericValue, color: item.color ?? "#bfe8ff" }
    })
    .filter((item): item is { key: string; name: string; value: number; color: string } => item !== null)
    .reduce((deduped, item) => deduped.some((row) => row.key === item.key) ? deduped : [...deduped, item], [] as Array<{ key: string; name: string; value: number; color: string }>)
    .slice(0, maxRows ?? Number.POSITIVE_INFINITY)

  if (!rows.length) return null

  return (
    <div className="rounded-[12px] border border-[#29547f] bg-[rgba(7,17,36,0.96)] px-3 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
      <div className="mb-1 text-[10px] font-semibold text-[#dffbff]">{label}</div>
      <div className="space-y-1">
        {rows.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3 text-[10px]">
            <div className="flex items-center gap-2 text-[#bfe8ff]">
              {markerVariantForKey?.(item.key) === "diamond" ? (
                <span
                  className="h-2.5 w-2.5 rotate-45 rounded-[1px] border"
                  style={{ backgroundColor: item.color, borderColor: "#f8fbff" }}
                />
              ) : (
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              )}
              <span className={markerVariantForKey?.(item.key) === "diamond" ? "font-semibold text-[#f8fbff]" : undefined}>{item.name}</span>
            </div>
            <span className="font-mono text-[#fff1b3]">{valueFormatter ? valueFormatter(item.value) : `${item.value}${unit}`}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RankingItem({ title, value, extra, active, compact = false, tight = false, onClick }: { title: string; value: string; extra: string; active: boolean; compact?: boolean; tight?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-full w-full rounded-[12px] border text-left transition-all ${tight ? "px-1.5 py-1" : compact ? "px-2 py-1.5" : "px-2.5 py-2"} ${
        active
          ? "border-[#39eddc] bg-[linear-gradient(180deg,rgba(14,64,74,0.72),rgba(10,36,45,0.94))] shadow-[0_0_16px_rgba(57,237,220,0.12),inset_0_0_18px_rgba(57,237,220,0.07)]"
          : "border-[#234160] bg-[linear-gradient(180deg,rgba(14,28,58,0.88),rgba(10,19,40,0.96))] hover:border-[#3a78a7]"
      }`}
    >
      {extra ? (
        <div className={`grid h-full ${tight ? "content-center gap-0.5" : "gap-1"}`}>
          <div className={`grid grid-cols-[auto_1fr] items-center ${tight ? "gap-1.5" : "gap-2"}`}>
            <div className={`${tight ? "text-[0.76rem]" : compact ? "text-[0.82rem]" : "text-[0.95rem]"} font-semibold text-[#eefbff]`}>{title}</div>
            <div className={`text-right font-mono ${tight ? "text-[0.9rem]" : compact ? "text-[1rem]" : "text-[1.15rem]"} font-semibold text-[#ffe6a3]`}>{value}</div>
          </div>
          <div className={`text-left leading-none ${tight ? "text-[8px]" : compact ? "text-[9px]" : "text-[10px]"} ${mutedText}`}>{extra}</div>
        </div>
      ) : (
        <div className={`grid h-full grid-cols-[auto_1fr] items-center ${tight ? "gap-1.5" : "gap-2"}`}>
          <div className={`${tight ? "text-[0.76rem]" : compact ? "text-[0.82rem]" : "text-[0.95rem]"} font-semibold text-[#eefbff]`}>{title}</div>
          <div className={`text-right font-mono ${tight ? "text-[0.9rem]" : compact ? "text-[1rem]" : "text-[1.15rem]"} font-semibold text-[#ffe6a3]`}>{value}</div>
        </div>
      )}
    </button>
  )
}

function CellChip({ label, active, warning, onClick }: { label: string; active: boolean; warning: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[10px] border px-2 py-1.5 text-[10px] font-medium leading-none transition-all ${
        active
          ? "border-[#3de7d9] bg-[linear-gradient(180deg,rgba(20,91,96,0.72),rgba(13,45,51,0.94))] text-[#efffff] shadow-[0_0_12px_rgba(61,231,217,0.12)]"
          : warning
            ? "border-[#6a4c31] bg-[linear-gradient(180deg,rgba(56,36,25,0.62),rgba(31,22,19,0.9))] text-[#ffd7a6] hover:border-[#a37649]"
            : "border-[#214260] bg-[linear-gradient(180deg,rgba(11,24,48,0.92),rgba(8,17,35,0.96))] text-[#a7cae2] hover:border-[#3d709f] hover:text-[#e3f8ff]"
      }`}
    >
      {label}
    </button>
  )
}

export function CellHistoryCellPicker({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const [open, setOpen] = useState(false)
  const label = value === null ? (zh ? "全部电芯" : "All Cells") : `${zh ? "电芯" : "Cell"} ${value}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex min-w-[150px] items-center justify-between gap-2 rounded-xl border border-[#26456e] bg-[#101840] px-3 py-1.5 text-xs text-[#e8f4fc] transition-all hover:border-[#22d3ee]/60">
          <span className="font-medium">{label}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-[#7b8ab8]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-50 w-[240px] rounded-2xl border border-[#26456e] bg-[#0d1233] p-0 text-[#e8f4fc]">
        <Command className="bg-[#0d1233] text-[#e8f4fc]">
          <CommandInput placeholder={zh ? "搜索电芯..." : "Search cells..."} className="text-[#e8f4fc] placeholder:text-[#5f79ad]" />
          <CommandList>
            <CommandEmpty>{zh ? "未找到电芯" : "No cell found"}</CommandEmpty>
            <CommandGroup>
              <CommandItem value="all cells" onSelect={() => { onChange(null); setOpen(false) }} className="text-[#dcefff]">
                <Check className={`h-4 w-4 ${value === null ? "opacity-100 text-[#1bd9c5]" : "opacity-0"}`} />
                {zh ? "全部电芯" : "All Cells"}
              </CommandItem>
              {Array.from({ length: CELL_COUNT }, (_, index) => {
                const cell = index + 1
                return (
                  <CommandItem key={cell} value={`cell ${cell}`} onSelect={() => { onChange(cell); setOpen(false) }} className="text-[#dcefff]">
                    <Check className={`h-4 w-4 ${value === cell ? "opacity-100 text-[#1bd9c5]" : "opacity-0"}`} />
                    {zh ? `电芯 ${cell}` : `Cell ${cell}`}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export type CellHistoryOverviewStats = {
  maxVoltage: number
  maxVoltageCell: number | null
  minVoltage: number
  minVoltageCell: number | null
  voltageDelta: number
  maxTemp: number
  maxTempCell: number | null
  minTemp: number
  minTempCell: number | null
  tempDelta: number
}

export function CellHistoryReplayPanel({ date, selectedCell, onSelectedCellChange, onOverviewStats }: { date: string; selectedCell: number | null; onSelectedCellChange?: (cell: number | null) => void; onOverviewStats?: (stats: CellHistoryOverviewStats) => void }) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [availableSize, setAvailableSize] = useState({ width: 0, height: 0 })

  const historyData = useMemo(() => createHistoryData(date), [date])
  const overviewData = useMemo(() => buildOverview(historyData), [historyData])
  const cellMetrics = useMemo(() => buildCellMetrics(historyData), [historyData])

  const voltageStats = useMemo(() => {
    const maxVoltage = Math.max(...overviewData.map((item) => item.maxVoltage))
    const minVoltage = Math.min(...overviewData.map((item) => item.minVoltage))
    const avgVoltage = average(overviewData.map((item) => item.avgVoltage))
    return { maxVoltage, minVoltage, avgVoltage, voltageDelta: maxVoltage - minVoltage }
  }, [overviewData])

  const temperatureStats = useMemo(() => {
    const maxTemp = Math.max(...overviewData.map((item) => item.maxTemp))
    const minTemp = Math.min(...overviewData.map((item) => item.minTemp))
    const avgTemp = average(overviewData.map((item) => item.avgTemp))
    return { maxTemp, minTemp, avgTemp, tempDelta: maxTemp - minTemp }
  }, [overviewData])

  const topHighVoltage = useMemo(() => cellMetrics.slice().sort((a, b) => b.voltageMax - a.voltageMax).slice(0, 3), [cellMetrics])
  const topLowVoltage = useMemo(() => cellMetrics.slice().sort((a, b) => a.voltageMin - b.voltageMin).slice(0, 3), [cellMetrics])
  const topVoltageDeviationCells = useMemo(() => cellMetrics.slice().sort((a, b) => b.voltageDeviation - a.voltageDeviation).slice(0, 3), [cellMetrics])
  const topHotCells = useMemo(() => cellMetrics.slice().sort((a, b) => b.tempMax - a.tempMax).slice(0, 3), [cellMetrics])
  const topColdCells = useMemo(() => cellMetrics.slice().sort((a, b) => a.tempMin - b.tempMin).slice(0, 1), [cellMetrics])
  const topTempDiffCells = useMemo(() => cellMetrics.slice().sort((a, b) => b.maxIntraTempDiff - a.maxIntraTempDiff).slice(0, 3), [cellMetrics])

  useEffect(() => {
    onOverviewStats?.({
      maxVoltage: voltageStats.maxVoltage,
      maxVoltageCell: topHighVoltage[0]?.cell ?? null,
      minVoltage: voltageStats.minVoltage,
      minVoltageCell: topLowVoltage[0]?.cell ?? null,
      voltageDelta: voltageStats.voltageDelta,
      maxTemp: temperatureStats.maxTemp,
      maxTempCell: topHotCells[0]?.cell ?? null,
      minTemp: temperatureStats.minTemp,
      minTempCell: topColdCells[0]?.cell ?? null,
      tempDelta: temperatureStats.tempDelta,
    })
  }, [voltageStats, temperatureStats, topHighVoltage, topLowVoltage, topHotCells, topColdCells, onOverviewStats])

  const voltageTrendData = useMemo(
    () =>
      historyData.map((point) => {
        const values = Array.from({ length: CELL_COUNT }, (_, index) => point[`v${index + 1}`])
        return {
          time: point.time,
          max: Number(Math.max(...values).toFixed(3)),
          min: Number(Math.min(...values).toFixed(3)),
        }
      }),
    [historyData]
  )

  const voltagePhaseRegions = useMemo(
    () => [
      { x1: formatTimeLabel(0),  x2: formatTimeLabel(8),               phase: "rest" as const,      span: 8,  label: zh ? "静置" : "Rest" },
      { x1: formatTimeLabel(8),  x2: formatTimeLabel(26),              phase: "charge" as const,    span: 18, label: zh ? "充电" : "Charging" },
      { x1: formatTimeLabel(26), x2: formatTimeLabel(30),              phase: "rest" as const,      span: 4,  label: zh ? "静置" : "Rest" },
      { x1: formatTimeLabel(30), x2: formatTimeLabel(39),              phase: "discharge" as const, span: 9,  label: zh ? "放电" : "Discharge" },
      { x1: formatTimeLabel(39), x2: formatTimeLabel(48),              phase: "rest" as const,      span: 9,  label: zh ? "静置" : "Rest" },
      { x1: formatTimeLabel(48), x2: formatTimeLabel(64),              phase: "charge" as const,    span: 16, label: zh ? "充电" : "Charging" },
      { x1: formatTimeLabel(64), x2: formatTimeLabel(65),              phase: "rest" as const,      span: 1,  label: zh ? "静" : "R" },
      { x1: formatTimeLabel(65), x2: formatTimeLabel(76),              phase: "discharge" as const, span: 11, label: zh ? "放电" : "Discharge" },
      { x1: formatTimeLabel(76), x2: formatTimeLabel(TOTAL_POINTS - 1), phase: "rest" as const,     span: 20, label: zh ? "静置" : "Rest" },
    ],
    [zh]
  )

  const temperatureTrendCharts = useMemo(
    () =>
      ([
        { key: "t1", title: "T1", label: zh ? "前端探头" : "Front Probe" },
        { key: "t2", title: "T2", label: zh ? "中部探头" : "Middle Probe" },
        { key: "t3", title: "T3", label: zh ? "后端探头" : "Rear Probe" },
      ] as const).map(({ key, title, label }) => {
        const data = historyData.map((point) => {
          const values = Array.from({ length: CELL_COUNT }, (_, index) => point[`${key}_${index + 1}` as const])
          return {
            time: point.time,
            max: Number(Math.max(...values).toFixed(1)),
            min: Number(Math.min(...values).toFixed(1)),
          }
        })

        return { key, title, label, data }
      }),
    [historyData, zh]
  )

  const handleSelectCell = (cell: number) => onSelectedCellChange?.(cell)
  const isCompactCanvas = availableSize.width > 0 && (availableSize.width < 1280 || availableSize.height < 760)
  const isTightCanvas = availableSize.width > 0 && (availableSize.width < 1120 || availableSize.height < 700)
  const trendSyncId = "cell-history-extreme-trend"

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const updateSize = (width: number, height: number) => {
      setAvailableSize({
        width: Math.max(width, 320),
        height: Math.max(height, 320),
      })
    }

    updateSize(node.clientWidth, node.clientHeight)

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      updateSize(entry.contentRect.width, entry.contentRect.height)
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-[#1a3556] bg-[linear-gradient(180deg,#071124,#050c1d)] p-3">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_16%,rgba(67,176,255,0.12),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(255,186,97,0.08),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(60,132,255,0.08),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#8feaff]/55 to-transparent" />

      <div className={`relative grid h-full min-h-0 ${isCompactCanvas ? "grid-cols-[1.04fr_1.26fr] gap-2.5" : "grid-cols-[0.94fr_1.36fr] gap-3"}`}>
        <div className={`grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1.4fr)] ${isCompactCanvas ? "gap-2" : "gap-3"}`}>
          <NeonSection title={zh ? "电压/温差分析" : "Voltage / Temperature Analysis"} compact={isCompactCanvas} >
            <div className={`grid h-full min-h-0 grid-cols-3 ${isCompactCanvas ? "gap-1" : "gap-1.5"}`}>
              <InnerFrame title={zh ? "电压最高 TOP3" : "Highest Voltage TOP3"} accent="#ffc970" compact={isCompactCanvas}><div className="grid h-full min-h-0 grid-rows-3 gap-0.5">{topHighVoltage.map((item) => <RankingItem key={`high-${item.cell}`} title={`#${item.cell}`} value={`${item.voltageMax.toFixed(2)}V`} extra={item.voltageMaxAt} compact={isCompactCanvas} tight={isTightCanvas} active={selectedCell === item.cell} onClick={() => handleSelectCell(item.cell)} />)}</div></InnerFrame>
              <InnerFrame title={zh ? "电压最低 TOP3" : "Lowest Voltage TOP3"} accent="#86e8ff" compact={isCompactCanvas}><div className="grid h-full min-h-0 grid-rows-3 gap-0.5">{topLowVoltage.map((item) => <RankingItem key={`low-${item.cell}`} title={`#${item.cell}`} value={`${item.voltageMin.toFixed(2)}V`} extra={item.voltageMinAt} compact={isCompactCanvas} tight={isTightCanvas} active={selectedCell === item.cell} onClick={() => handleSelectCell(item.cell)} />)}</div></InnerFrame>
              <InnerFrame title={zh ? "温差最高 TOP3" : "Highest Temp Diff TOP3"} accent="#ffb676" compact={isCompactCanvas}><div className="grid h-full min-h-0 grid-rows-3 gap-0.5">{topTempDiffCells.map((item) => <RankingItem key={`tempdiff-${item.cell}`} title={`#${item.cell}`} value={`${item.maxIntraTempDiff.toFixed(1)}°C`} extra={item.maxIntraTempDiffAt} compact={isCompactCanvas} tight={isTightCanvas} active={selectedCell === item.cell} onClick={() => handleSelectCell(item.cell)} />)}</div></InnerFrame>
            </div>
          </NeonSection>

          <div className="min-h-0 overflow-hidden">
            <BCUStatusQuery mode="history" date={date} hideCellSeries />
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          <NeonSection title={zh ? "电压趋势" : "Voltage Trend"} subtitle={zh ? "电芯极值联动趋势" : "Linked Cell Extremes"}>
            <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2 rounded-[16px] border border-[#1f4068] bg-[linear-gradient(180deg,rgba(10,20,44,0.9),rgba(8,16,37,0.96))] px-3 py-2 shadow-[inset_0_0_16px_rgba(25,92,148,0.08)]">
              <div className="flex items-center justify-end gap-4">
                <LegendItem label={zh ? "最大值" : "Max"} color="#ffd36b" />
                <LegendItem label={zh ? "最小值" : "Min"} color="#6ee7ff" />
              </div>
              <div className="min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={voltageTrendData} syncId={trendSyncId} margin={{ top: 12, right: 12, left: -8, bottom: 6 }}>
                    <CartesianGrid stroke="#173354" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: "#88a8be", fontSize: 10 }} axisLine={false} tickLine={false} interval={5} />
                    <YAxis
                      tick={{ fill: "#88a8be", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${Number(value).toFixed(2)}V`}
                      domain={["dataMin - 0.03", "dataMax + 0.03"]}
                    />
                    <Tooltip
                      contentStyle={{ border: "1px solid #29547f", background: "rgba(7,17,36,0.96)", borderRadius: 12 }}
                      labelStyle={{ color: "#dffbff", fontSize: 11, fontWeight: 600 }}
                      itemStyle={{ color: "#bfe8ff", fontSize: 11, padding: 0 }}
                      formatter={(value: number, name: string) => [`${value.toFixed(3)}V`, name]}
                    />
                    <Line type="monotone" dataKey="max" name={zh ? "最大值" : "Max"} stroke="#ffd36b" strokeWidth={2.2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="min" name={zh ? "最小值" : "Min"} stroke="#6ee7ff" strokeWidth={2.2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </NeonSection>

          <NeonSection title={zh ? "温度趋势" : "Temperature Trend"} subtitle={zh ? "T1 / T2 / T3 分通道联动" : "Linked T1 / T2 / T3 Channels"}>
            <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 rounded-[16px] border border-[#1f4068] bg-[linear-gradient(180deg,rgba(10,20,44,0.9),rgba(8,16,37,0.96))] px-3 py-2 shadow-[inset_0_0_16px_rgba(25,92,148,0.08)]">
              <div className="flex items-center justify-end gap-4">
                <LegendItem label={zh ? "最大值" : "Max"} color="#ffd36b" />
                <LegendItem label={zh ? "最小值" : "Min"} color="#6ee7ff" />
              </div>
              {temperatureTrendCharts.map((chart, index) => {
                const isLast = index === temperatureTrendCharts.length - 1
                return (
                  <div key={chart.key} className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-1 rounded-[12px] border border-[#214260] bg-[linear-gradient(180deg,rgba(9,19,40,0.86),rgba(7,15,32,0.94))] px-2 py-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="text-[11px] font-semibold tracking-[0.08em] text-[#dff7ff]">{chart.title}</div>
                      <div className="text-[10px] text-[#7fa4be]">{chart.label}</div>
                    </div>
                    <div className="min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chart.data} syncId={trendSyncId} margin={{ top: 4, right: 10, left: -8, bottom: isLast ? 6 : 0 }}>
                          <CartesianGrid stroke="#173354" strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="time"
                            tick={isLast ? { fill: "#88a8be", fontSize: 10 } : false}
                            axisLine={false}
                            tickLine={false}
                            interval={5}
                            height={isLast ? 22 : 0}
                          />
                          <YAxis
                            tick={{ fill: "#88a8be", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `${Number(value).toFixed(0)}°C`}
                            domain={["dataMin - 1", "dataMax + 1"]}
                            width={42}
                          />
                          <Tooltip
                            contentStyle={{ border: "1px solid #29547f", background: "rgba(7,17,36,0.96)", borderRadius: 12 }}
                            labelStyle={{ color: "#dffbff", fontSize: 11, fontWeight: 600 }}
                            itemStyle={{ color: "#bfe8ff", fontSize: 11, padding: 0 }}
                            formatter={(value: number, name: string) => [`${value.toFixed(1)}°C`, name]}
                          />
                          <Line type="monotone" dataKey="max" name={zh ? "最大值" : "Max"} stroke="#ffd36b" strokeWidth={1.9} dot={false} isAnimationActive={false} />
                          <Line type="monotone" dataKey="min" name={zh ? "最小值" : "Min"} stroke="#6ee7ff" strokeWidth={1.9} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )
              })}
            </div>
          </NeonSection>
        </div>
        </div>
    </div>
  )
}
