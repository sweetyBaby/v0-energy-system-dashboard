"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
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
type DetailMetricKey = "voltage" | "t1" | "t2" | "t3"
type DetailReplayPoint = { time: string } & Record<string, string | number>

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
const DAY_END_TIME_LABEL = "23:59:59"
const mutedText = "text-[#7fa4be]"
const edgeGlow = "shadow-[0_0_0_1px_rgba(88,181,255,0.08),0_18px_42px_rgba(1,7,19,0.42),inset_0_0_28px_rgba(44,126,198,0.06)]"
const pickerScrollbarClass =
  "[scrollbar-width:thin] [scrollbar-color:rgba(137,170,230,0.85)_rgba(8,18,42,0.96)] [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[#0b1431] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[2px] [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-[#0b1431] [&::-webkit-scrollbar-thumb]:bg-[#809dd6] hover:[&::-webkit-scrollbar-thumb]:bg-[#a9c4ff]"

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)

const formatTimeLabel = (index: number) =>
  `${String(Math.floor((index * STEP_MINUTES) / 60)).padStart(2, "0")}:${String((index * STEP_MINUTES) % 60).padStart(2, "0")}`

const toTrendTimeLabel = (time: string) => `${time}:00`

const extendTrendToDayEnd = <T extends { time: string }>(rows: T[], resetFields: Partial<T> = {}): T[] => {
  if (!rows.length || rows[rows.length - 1]?.time === DAY_END_TIME_LABEL) return rows
  return [...rows, { ...rows[rows.length - 1], ...resetFields, time: DAY_END_TIME_LABEL }]
}

const getCellTemps = (point: HistoryPoint, cell: number) => [point[`t1_${cell}`], point[`t2_${cell}`], point[`t3_${cell}`]]

const createHistoryData = (date: string): HistoryPoint[] => {
  const daySeed = date.split("-").map(Number).reduce((acc, value, index) => acc + value * (index + 3), 0)

  return Array.from({ length: TOTAL_POINTS }, (_, index) => {
    const point: HistoryPoint = { time: formatTimeLabel(index) } as HistoryPoint
    const dayPhase = (index / TOTAL_POINTS) * Math.PI * 4
    const isCharge = (index >= 8 && index <= 26) || (index >= 48 && index <= 64)
    const isDischarge = (index >= 30 && index <= 39) || (index >= 65 && index <= 76)

    for (let cell = 1; cell <= CELL_COUNT; cell += 1) {
      const cellOffset = (cell - 25.5) * 0.028
      const wave = Math.sin(dayPhase + cell * 0.09) * 0.56 + Math.cos(dayPhase * 0.45 + cell * 0.12) * 0.24
      const ripple = Math.sin(index * 0.32 + cell * 0.17 + daySeed * 0.02) * 0.08

      let voltage = 25.9 + cellOffset + wave + ripple
      if (isCharge) voltage += 0.45 + Math.max(0, index < 27 ? (index - 8) / 18 : (index - 48) / 16) * 2.35
      if (isDischarge) voltage -= 0.55 + Math.max(0, index < 40 ? (index - 30) / 9 : (index - 65) / 11) * 2.7
      if (!isCharge && !isDischarge) voltage += Math.sin(index * 0.08 + cell * 0.07) * 0.12
      voltage = Math.max(21.7, Math.min(29.4, voltage))

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
  headerExtra,
  showHeaderRule = true,
  bare = false,
  inlineSubtitle = false,
  compact = false,
  className = "",
  children,
}: {
  title: string
  subtitle?: string
  badge?: string
  headerExtra?: ReactNode
  showHeaderRule?: boolean
  bare?: boolean
  inlineSubtitle?: boolean
  compact?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={`relative flex min-h-0 flex-col overflow-hidden rounded-[20px] ${bare ? "" : "border border-[#254873]/80 bg-[radial-gradient(circle_at_top_right,rgba(38,109,178,0.15),transparent_28%),linear-gradient(180deg,rgba(10,19,44,0.97),rgba(6,12,29,0.98))]"} ${compact ? "p-2.5" : "p-3"} ${bare ? "" : edgeGlow} ${className}`}
    >
      {!bare ? <div className="pointer-events-none absolute inset-0 rounded-[20px] border border-[#8feaff]/[0.05]" /> : null}
      <div className="pointer-events-none absolute left-3 top-3 h-5 w-[2px] rounded-full bg-[#3fe7ff]/90 shadow-[0_0_12px_rgba(63,231,255,0.85)]" />
      {showHeaderRule ? (
        <div className="pointer-events-none absolute inset-x-4 top-[50px] h-px bg-gradient-to-r from-[#274f78]/70 via-[#78dfff]/45 to-transparent" />
      ) : null}
      <div className={`relative flex ${inlineSubtitle ? "items-center" : "items-start"} justify-between gap-3 ${compact ? "pl-2.5" : "pl-3"} ${inlineSubtitle ? (compact ? "mb-1.5" : "mb-2") : (compact ? "mb-2" : "mb-3")}`}>
        <div className={inlineSubtitle ? "flex items-center gap-3" : ""}>
          <div className={`${compact ? "text-[0.9rem]" : "text-[0.98rem]"} font-semibold tracking-[0.08em] text-[#8ceeff]`}>{title}</div>
          {subtitle ? (
            <div className={inlineSubtitle ? `text-[10px] leading-none ${mutedText}` : `mt-1 text-[10px] leading-4 ${mutedText}`}>{subtitle}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {headerExtra}
          {badge ? (
            <div className="rounded-[10px] border border-[#29547f] bg-[linear-gradient(180deg,rgba(12,28,60,0.95),rgba(8,19,42,0.96))] px-2.5 py-1 text-[10px] text-[#c0eeff] shadow-[inset_0_0_12px_rgba(63,231,255,0.06)]">
              {badge}
            </div>
          ) : null}
        </div>
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

function ExtremeTrendTooltip({
  active,
  label,
  payload,
  unit,
  digits,
  zh,
}: {
  active?: boolean
  label?: string
  payload?: Array<{ dataKey?: string; value?: number | string; color?: string; name?: string; payload?: Record<string, number | string> }>
  unit: string
  digits: number
  zh: boolean
}) {
  if (!active || !payload?.length) return null

  const rows = payload
    .filter((item) => item.dataKey === "max" || item.dataKey === "min")
    .sort((a, b) => (a.dataKey === "max" ? -1 : 1))

  return (
    <div className="rounded-[12px] border border-[#29547f] bg-[rgba(7,17,36,0.96)] px-3 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
      <div className="mb-1 text-[10px] font-semibold text-[#dffbff]">{label}</div>
      <div className="space-y-1">
        {rows.map((item) => {
          const cellKey = item.dataKey === "max" ? "maxCell" : "minCell"
          const cell = Number(item.payload?.[cellKey] ?? 0)
          const numericValue = Number(item.value ?? 0)
          return (
            <div key={String(item.dataKey)} className="flex items-center gap-2 text-[10px] text-[#bfe8ff]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color ?? "#bfe8ff" }} />
                <span className="font-mono text-[#fff1b3]">
                  {zh
                    ? `${item.name}：${numericValue.toFixed(digits)}${unit}(#${cell})`
                    : `${item.name}: ${numericValue.toFixed(digits)}${unit} (#${cell})`}
                </span>
            </div>
          )
        })}
      </div>
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
          <CommandList className={pickerScrollbarClass}>
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

export function CellHistoryMultiPicker({
  value,
  onChange,
  maxSelection = 3,
}: {
  value: number[]
  onChange: (value: number[]) => void
  maxSelection?: number
}) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const [open, setOpen] = useState(false)
  const limitReached = value.length >= maxSelection
  const label =
    value.length > 0
      ? `${zh ? "电芯" : "Cells"} ${value.join(", ")}`
      : zh
        ? "选择电芯"
        : "Select Cells"

  const handleToggleCell = (cell: number) => {
    if (value.includes(cell)) {
      onChange(value.filter((item) => item !== cell))
      return
    }

    if (!limitReached) {
      onChange([...value, cell].sort((a, b) => a - b))
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex h-9 min-w-[220px] items-center justify-between gap-2 rounded-xl border border-[#26456e] bg-[#101840] px-3 text-xs text-[#e8f4fc] transition-all hover:border-[#22d3ee]/60">
          <div className="flex min-w-0 items-center gap-2">
            <span className="font-medium">{label}</span>
            <span className="rounded-full border border-[#2f568a] bg-[#0b1735] px-1.5 py-0.5 text-[10px] text-[#8feaff]">
              {value.length}/{maxSelection}
            </span>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[#7b8ab8]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-50 w-[260px] rounded-2xl border border-[#26456e] bg-[#0d1233] p-0 text-[#e8f4fc]">
        <Command className="bg-[#0d1233] text-[#e8f4fc]">
          <CommandInput placeholder={zh ? "搜索电芯..." : "Search cells..."} className="text-[#e8f4fc] placeholder:text-[#5f79ad]" />
          <CommandList className={pickerScrollbarClass}>
            <CommandEmpty>{zh ? "未找到电芯" : "No cell found"}</CommandEmpty>
            <CommandGroup>
              {Array.from({ length: CELL_COUNT }, (_, index) => {
                const cell = index + 1
                const selected = value.includes(cell)
                const disabled = !selected && limitReached

                return (
                  <CommandItem
                    key={cell}
                    value={`cell ${cell}`}
                    onSelect={() => handleToggleCell(cell)}
                    className={`text-[#dcefff] ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
                  >
                    <Check className={`h-4 w-4 ${selected ? "opacity-100 text-[#1bd9c5]" : "opacity-0"}`} />
                    <span className="flex-1">{zh ? `电芯 ${cell}` : `Cell ${cell}`}</span>
                   
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
          <div className="border-t border-[#1a2654] px-3 py-2 text-[10px] text-[#6f8cb1]">
            {zh ? `最多选择 ${maxSelection} 个电芯` : `Up to ${maxSelection} cells`}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function DetailReplayTooltip({
  active,
  label,
  payload,
  zh,
}: {
  active?: boolean
  label?: string
  payload?: Array<{ dataKey?: string; value?: number | string; color?: string }>
  zh: boolean
}) {
  if (!active || !payload?.length) return null

  type DetailTooltipMetric = {
    label: string
    unit: string
    digits: number
    order: number
  }

  type DetailTooltipRow = {
    key: string
    value: number
    color: string
    metric: DetailTooltipMetric
  }

  const metricMeta: Record<"v" | "t1" | "t2" | "t3", DetailTooltipMetric> = {
    v: { label: zh ? "电压" : "Voltage", unit: "V", digits: 3, order: 0 },
    t1: { label: "T1", unit: "°C", digits: 1, order: 1 },
    t2: { label: "T2", unit: "°C", digits: 1, order: 2 },
    t3: { label: "T3", unit: "°C", digits: 1, order: 3 },
  }

  const rows: DetailTooltipRow[] = []
  const seenMetrics = new Set<number>()

  payload.forEach((item) => {
    const key = String(item.dataKey ?? "")
    const value = typeof item.value === "number" ? item.value : Number(item.value)
    let metricKey: "v" | "t1" | "t2" | "t3" | null = null

    if (key.startsWith("v")) metricKey = "v"
    else if (key.startsWith("t1_")) metricKey = "t1"
    else if (key.startsWith("t2_")) metricKey = "t2"
    else if (key.startsWith("t3_")) metricKey = "t3"

    if (!metricKey || Number.isNaN(value)) return

    const metric = metricMeta[metricKey]
    if (seenMetrics.has(metric.order)) return

    seenMetrics.add(metric.order)
    rows.push({
      key,
      value,
      color: item.color ?? "#bfe8ff",
      metric,
    })
  })

  rows.sort((a, b) => a.metric.order - b.metric.order)

  if (!rows.length) return null

  return (
    <div className="rounded-[12px] border border-[#29547f] bg-[rgba(7,17,36,0.96)] px-3 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
      <div className="mb-1 text-[10px] font-semibold text-[#dffbff]">{label}</div>
      <div className="space-y-1">
        {rows.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3 text-[10px]">
            <div className="flex items-center gap-2 text-[#bfe8ff]">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.metric.label}</span>
            </div>
            <span className="font-mono text-[#fff1b3]">{`${item.value.toFixed(item.metric.digits)}${item.metric.unit}`}</span>
          </div>
        ))}
      </div>
    </div>
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

export function CellHistoryReplayPanel({
  date,
  selectedCell,
  detailCells = [],
  viewMode = "overview",
  onSelectedCellChange,
  onOverviewStats,
}: {
  date: string
  selectedCell: number | null
  detailCells?: number[]
  viewMode?: "overview" | "detail"
  onSelectedCellChange?: (cell: number | null) => void
  onOverviewStats?: (stats: CellHistoryOverviewStats) => void
}) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [availableSize, setAvailableSize] = useState({ width: 0, height: 0 })
  const [detailVisibleMetrics, setDetailVisibleMetrics] = useState<Record<DetailMetricKey, boolean>>({
    voltage: true,
    t1: true,
    t2: true,
    t3: true,
  })

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
    () => {
      const baseData = historyData.map((point) => {
        const values = Array.from({ length: CELL_COUNT }, (_, index) => ({ cell: index + 1, value: point[`v${index + 1}`] }))
        const maxEntry = values.reduce((best, current) => (current.value > best.value ? current : best), values[0])
        const minEntry = values.reduce((best, current) => (current.value < best.value ? current : best), values[0])
      return {
          time: toTrendTimeLabel(point.time),
          max: Number(maxEntry.value.toFixed(3)),
          min: Number(minEntry.value.toFixed(3)),
          maxCell: maxEntry.cell,
          minCell: minEntry.cell,
        }
      })

      const maxIndex = baseData.reduce((best, current, index, rows) => (current.max > rows[best].max ? index : best), 0)
      const minIndex = baseData.reduce((best, current, index, rows) => (current.min < rows[best].min ? index : best), 0)

      return extendTrendToDayEnd(
        baseData.map((item, index) => ({
          ...item,
          isMaxHighlight: index === maxIndex,
          isMinHighlight: index === minIndex,
        })),
        {
          isMaxHighlight: false,
          isMinHighlight: false,
        }
      )
    },
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
        const baseData = historyData.map((point) => {
          const values = Array.from({ length: CELL_COUNT }, (_, index) => ({ cell: index + 1, value: point[`${key}_${index + 1}` as const] }))
          const maxEntry = values.reduce((best, current) => (current.value > best.value ? current : best), values[0])
          const minEntry = values.reduce((best, current) => (current.value < best.value ? current : best), values[0])
          return {
            time: toTrendTimeLabel(point.time),
            max: Number(maxEntry.value.toFixed(1)),
            min: Number(minEntry.value.toFixed(1)),
            maxCell: maxEntry.cell,
            minCell: minEntry.cell,
          }
        })

        const maxIndex = baseData.reduce((best, current, index, rows) => (current.max > rows[best].max ? index : best), 0)
        const minIndex = baseData.reduce((best, current, index, rows) => (current.min < rows[best].min ? index : best), 0)
        const data = extendTrendToDayEnd(
          baseData.map((item, index) => ({
            ...item,
            isMaxHighlight: index === maxIndex,
            isMinHighlight: index === minIndex,
          })),
          {
            isMaxHighlight: false,
            isMinHighlight: false,
          }
        )

        return { key, title, label, data }
      }),
    [historyData, zh]
  )

  const handleSelectCell = (cell: number) => onSelectedCellChange?.(cell)
  const isCompactCanvas = availableSize.width > 0 && (availableSize.width < 1280 || availableSize.height < 760)
  const isTightCanvas = availableSize.width > 0 && (availableSize.width < 1120 || availableSize.height < 700)
  const trendXAxisInterval = isTightCanvas ? 11 : isCompactCanvas ? 7 : 5
  const trendTickStep = isTightCanvas ? 24 : isCompactCanvas ? 16 : 12
  const trendSyncId = "cell-history-extreme-trend"
  const trendXAxisTicks = useMemo(
    () =>
      Array.from(
        new Set(
          voltageTrendData
            .map((item, index) => ({ time: item.time, index }))
            .filter(({ index }) => index === 0 || index === voltageTrendData.length - 1 || index % trendTickStep === 0)
            .map(({ time }) => time)
        )
      ),
    [voltageTrendData, trendTickStep]
  )
  const voltageTrendSummary = useMemo(() => {
    const highest = voltageTrendData.reduce((best, current) => (current.max > best.max ? current : best), voltageTrendData[0])
    const lowest = voltageTrendData.reduce((best, current) => (current.min < best.min ? current : best), voltageTrendData[0])
    return {
      title: zh ? "电压趋势" : "Voltage",
      subtitle: zh ? "电芯极值" : "Cell Extremes",
      header: zh ? "电压趋势（电芯极值）" : "Voltage (Cell Extremes)",
      maxText: zh ? `最高电压：${highest.max.toFixed(3)}V(#${highest.maxCell})` : `Max Voltage: ${highest.max.toFixed(3)}V (#${highest.maxCell})`,
      minText: zh ? `最低电压：${lowest.min.toFixed(3)}V(#${lowest.minCell})` : `Min Voltage: ${lowest.min.toFixed(3)}V (#${lowest.minCell})`,
    }
  }, [voltageTrendData, zh])
  const temperatureTrendSummaries = useMemo(
    () =>
      temperatureTrendCharts.map((chart) => {
        const highest = chart.data.reduce((best, current) => (current.max > best.max ? current : best), chart.data[0])
        const lowest = chart.data.reduce((best, current) => (current.min < best.min ? current : best), chart.data[0])
        return {
          key: chart.key,
          title: chart.title,
          subtitle: chart.label,
          header: zh ? `${chart.title}（${chart.label}）` : `${chart.title} (${chart.label})`,
          maxText: zh ? `最高温度：${highest.max.toFixed(1)}°C(#${highest.maxCell})` : `Max Temp: ${highest.max.toFixed(1)}°C (#${highest.maxCell})`,
          minText: zh ? `最低温度：${lowest.min.toFixed(1)}°C(#${lowest.minCell})` : `Min Temp: ${lowest.min.toFixed(1)}°C (#${lowest.minCell})`,
        }
      }),
    [temperatureTrendCharts, zh]
  )

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

  const effectiveDetailCells = useMemo(() => {
    const limitedCells = detailCells.slice(0, 3)
    if (limitedCells.length > 0) return limitedCells
    if (selectedCell != null) return [selectedCell]
    return [1]
  }, [detailCells, selectedCell])

  const detailSeries = useMemo(
    () =>
      effectiveDetailCells.map((cell, index) => ({
        cell,
        color: ["#49e6ff", "#ffd36b", "#9bffb0"][index % 3],
        voltageKey: `v${cell}`,
        temp1Key: `t1_${cell}`,
        temp2Key: `t2_${cell}`,
        temp3Key: `t3_${cell}`,
      })),
    [effectiveDetailCells]
  )

  const detailReplayData = useMemo(
    () =>
      extendTrendToDayEnd(
        historyData.map((point) => {
          const row: DetailReplayPoint = { time: toTrendTimeLabel(point.time) }
          detailSeries.forEach((series) => {
            row[series.voltageKey] = point[series.voltageKey as keyof HistoryPoint] as number
            row[series.temp1Key] = point[series.temp1Key as keyof HistoryPoint] as number
            row[series.temp2Key] = point[series.temp2Key as keyof HistoryPoint] as number
            row[series.temp3Key] = point[series.temp3Key as keyof HistoryPoint] as number
          })
          return row
        })
      ),
    [historyData, detailSeries]
  )

  const detailCellSummaries = useMemo(() => {
    return detailSeries.map((series) => {
      const metrics = cellMetrics.find((item) => item.cell === series.cell)
      return {
        cell: series.cell,
        color: series.color,
        voltageMax: metrics?.voltageMax ?? 0,
        voltageMin: metrics?.voltageMin ?? 0,
        voltageSpread: metrics?.voltageSpread ?? 0,
        tempMax: metrics?.tempMax ?? 0,
        tempMin: metrics?.tempMin ?? 0,
        tempSpread: metrics?.tempSpread ?? 0,
      }
    })
  }, [cellMetrics, detailSeries])

  const detailTickStep = 4
  const detailXAxisTicks = useMemo(
    () =>
      Array.from(
        new Set(
          detailReplayData
            .map((item, index) => ({ time: String(item.time), index }))
            .filter(({ index }) => index === 0 || index === detailReplayData.length - 1 || index % detailTickStep === 0)
            .map(({ time }) => time)
        )
      ),
    [detailReplayData, detailTickStep]
  )

  if (viewMode === "detail") {
    const detailMetricLegend = [
      { key: "voltage", label: zh ? "电压" : "Voltage", color: "#49e6ff" },
      { key: "t1", label: "T1", color: "#ffd36b" },
      { key: "t2", label: "T2", color: "#ff9f5f" },
      { key: "t3", label: "T3", color: "#ff6b88" },
    ] as const satisfies Array<{ key: DetailMetricKey; label: string; color: string }>

    const handleToggleDetailMetric = (metricKey: DetailMetricKey) => {
      const visibleCount = Object.values(detailVisibleMetrics).filter(Boolean).length
      if (detailVisibleMetrics[metricKey] && visibleCount <= 1) return

      setDetailVisibleMetrics((current) => ({
        ...current,
        [metricKey]: !current[metricKey],
      }))
    }

    return (
      <div ref={containerRef} className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-[#1a3556] bg-[linear-gradient(180deg,#071124,#050c1d)] p-2">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_16%,rgba(67,176,255,0.12),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(255,186,97,0.08),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(60,132,255,0.08),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#8feaff]/55 to-transparent" />
        <NeonSection
          title={zh ? "电芯明细" : "Cell Detail"}
          className="h-full px-1.5 py-1"
          bare
          showHeaderRule={false}
          headerExtra={
            <div className="flex items-center gap-3">
              {detailMetricLegend.map((item) => (
                <button
                  key={`detail-legend-${item.key}`}
                  type="button"
                  onClick={() => handleToggleDetailMetric(item.key)}
                  className={`flex items-center gap-1 text-[10px] transition-all ${
                    detailVisibleMetrics[item.key] ? "text-[#96bdd4]" : "text-[#547084]"
                  }`}
                >
                  <span className="block h-[2px] w-4" style={{ backgroundColor: item.color, boxShadow: detailVisibleMetrics[item.key] ? `0 0 8px ${item.color}` : "none", opacity: detailVisibleMetrics[item.key] ? 1 : 0.4 }} />
                  <span className={detailVisibleMetrics[item.key] ? "" : "line-through"}>{item.label}</span>
                </button>
              ))}
            </div>
          }
        >
          <div
            className="grid h-full min-h-0 gap-1"
            style={{ gridTemplateRows: `repeat(${detailCellSummaries.length}, minmax(0, 1fr))` }}
          >
            {detailCellSummaries.map((cell, index) => {
              const isLast = index === detailCellSummaries.length - 1
              const series = detailSeries.find((item) => item.cell === cell.cell)
              if (!series) return null

              return (
                <div
                  key={`detail-chart-${cell.cell}`}
                  className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-[#214260] bg-[linear-gradient(180deg,rgba(11,24,48,0.9),rgba(8,16,34,0.96))] px-0.5 pb-0.5"
                >
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-1.5 border-b border-[#214260]/90 px-3 py-1.5">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                          {[
                            { label: zh ? "最高电压" : "Max V", value: `${cell.voltageMax.toFixed(2)}V`, color: "text-[#aef8ff]" },
                            { label: zh ? "最低电压" : "Min V", value: `${cell.voltageMin.toFixed(2)}V`, color: "text-[#aef8ff]" },
                            { label: zh ? "最大ΔV" : "Max ΔV", value: `${cell.voltageSpread.toFixed(2)}V`, color: "text-[#ffd892]" },
                            { label: zh ? "最高温度" : "Max T", value: `${cell.tempMax.toFixed(1)}°C`, color: "text-[#aef8ff]" },
                            { label: zh ? "最低温度" : "Min T", value: `${cell.tempMin.toFixed(1)}°C`, color: "text-[#aef8ff]" },
                            { label: zh ? "最大ΔT" : "Max ΔT", value: `${cell.tempSpread.toFixed(1)}°C`, color: "text-[#ffd892]" },
                          ].map((item) => (
                            <div
                              key={`${cell.cell}-${item.label}`}
                              className="flex items-center gap-1.5 rounded-[8px] border border-[#22d3ee]/18 bg-[rgba(13,31,58,0.5)] px-2.5 py-1"
                            >
                              <span className="text-[11px] font-medium text-[#4a7090]">{item.label}</span>
                              <span className={`text-[12px] font-bold tabular-nums ${item.color}`}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex shrink-0 items-center gap-2 px-1 py-1">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cell.color, boxShadow: `0 0 10px ${cell.color}` }} />
                          <div className="text-[0.95rem] font-semibold tracking-[0.05em] text-[#eefbff]">{zh ? `电芯 #${cell.cell}` : `Cell #${cell.cell}`}</div>
                        </div>
                  </div>
                  <div className="min-h-0 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={detailReplayData} syncId="cell-history-detail-replay" syncMethod="value" margin={{ top: 12, right: 14, left: 0, bottom: isLast ? 6 : 0 }}>
                            <CartesianGrid stroke="#173354" strokeDasharray="3 3" vertical={false} />
                            <XAxis
                              dataKey="time"
                              tick={isLast ? { fill: "#88a8be", fontSize: 9 } : false}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(value) => String(value).slice(0, 5)}
                              ticks={isLast ? detailXAxisTicks : undefined}
                              interval={isLast ? 0 : trendXAxisInterval}
                              height={isLast ? 22 : 0}
                            />
                            <YAxis
                              yAxisId="voltage"
                              tick={{ fill: "#88a8be", fontSize: 9 }}
                              axisLine={{ stroke: "#355978", strokeOpacity: 0.35 }}
                              tickLine={false}
                              tickFormatter={(value) => `${Number(value).toFixed(2)}V`}
                              domain={["dataMin - 0.2", "dataMax + 0.2"]}
                              width={54}
                            />
                            <YAxis
                              yAxisId="temp"
                              orientation="right"
                              tick={{ fill: "#88a8be", fontSize: 9 }}
                              axisLine={{ stroke: "#355978", strokeOpacity: 0.35 }}
                              tickLine={false}
                              tickFormatter={(value) => `${Number(value).toFixed(0)}°C`}
                              domain={["dataMin - 1", "dataMax + 1"]}
                              width={54}
                            />
                            <Tooltip content={<DetailReplayTooltip zh={zh} />} />
                            {detailVisibleMetrics.voltage && (
                              <Line
                                yAxisId="voltage"
                                type="monotone"
                                dataKey={series.voltageKey}
                                stroke="#49e6ff"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: "#49e6ff", stroke: "#f8fbff", strokeWidth: 1.2 }}
                                isAnimationActive={false}
                              />
                            )}
                            {detailVisibleMetrics.t1 && (
                              <Line
                                yAxisId="temp"
                                type="monotone"
                                dataKey={series.temp1Key}
                                stroke="#ffd36b"
                                strokeWidth={1.9}
                                dot={false}
                                activeDot={{ r: 4, fill: "#ffd36b", stroke: "#f8fbff", strokeWidth: 1.2 }}
                                isAnimationActive={false}
                              />
                            )}
                            {detailVisibleMetrics.t2 && (
                              <Line
                                yAxisId="temp"
                                type="monotone"
                                dataKey={series.temp2Key}
                                stroke="#ff9f5f"
                                strokeWidth={1.9}
                                dot={false}
                                activeDot={{ r: 4, fill: "#ff9f5f", stroke: "#f8fbff", strokeWidth: 1.2 }}
                                isAnimationActive={false}
                              />
                            )}
                            {detailVisibleMetrics.t3 && (
                              <Line
                                yAxisId="temp"
                                type="monotone"
                                dataKey={series.temp3Key}
                                stroke="#ff6b88"
                                strokeWidth={1.9}
                                dot={false}
                                activeDot={{ r: 4, fill: "#ff6b88", stroke: "#f8fbff", strokeWidth: 1.2 }}
                                isAnimationActive={false}
                              />
                            )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            })}
          </div>
        </NeonSection>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-[#1a3556] bg-[linear-gradient(180deg,#071124,#050c1d)] p-2">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_16%,rgba(67,176,255,0.12),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(255,186,97,0.08),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(60,132,255,0.08),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#8feaff]/55 to-transparent" />

      <div className={`relative grid h-full min-h-0 ${isCompactCanvas ? "grid-cols-[1.04fr_1.26fr] gap-2" : "grid-cols-[0.94fr_1.36fr] gap-2.5"}`}>
        <div className={`grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1.4fr)] ${isCompactCanvas ? "gap-1.5" : "gap-2"}`}>
          <NeonSection title={zh ? "电压/温差分析" : "Voltage / Temperature Analysis"} compact={isCompactCanvas} bare className="px-1.5 py-1">
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

        <div className="h-full min-h-0">
          <NeonSection title={zh ? "电压/温度趋势" : "Voltage / Temperature Trend"} className="h-full px-1.5 py-1" bare>
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="mb-1 flex shrink-0 items-center justify-end gap-4 pr-1">
                <div className="text-[10px] text-[#7fa4be]">{zh ? "" : "Legend"}</div>
                <div className="flex items-center gap-4">
                  <LegendItem label={zh ? "最大值" : "Max"} color="#ffd36b" />
                  <LegendItem label={zh ? "最小值" : "Min"} color="#6ee7ff" />
                </div>
              </div>
              <div className="flex min-h-0 flex-1 gap-2">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="relative min-h-0 flex-[1.28] border-b border-[#214260]/90">
                    <div className="h-full min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={voltageTrendData} syncId={trendSyncId} syncMethod="value" margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke="#173354" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="time" tick={false} axisLine={false} tickLine={false} interval={trendXAxisInterval} height={0} />
                          <YAxis
                            tick={{ fill: "#88a8be", fontSize: 9 }}
                            axisLine={{ stroke: "#355978", strokeOpacity: 0.35 }}
                            tickLine={false}
                            width={52}
                            tickFormatter={(value) => `${Number(value).toFixed(2)}V`}
                            domain={["dataMin - 0.4", "dataMax + 0.4"]}
                          />
                          <Tooltip content={<ExtremeTrendTooltip unit="V" digits={3} zh={zh} />} />
                          <Line
                            type="monotone"
                            dataKey="max"
                            name={zh ? "最大值" : "Max"}
                            stroke="#ffd36b"
                            strokeWidth={2.2}
                            dot={(props: any) =>
                              props?.payload?.isMaxHighlight ? (
                                <circle cx={props.cx} cy={props.cy} r={4.5} fill="#ffd36b" stroke="#fff4cf" strokeWidth={1.5} />
                              ) : (
                                <></>
                              )
                            }
                            isAnimationActive={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="min"
                            name={zh ? "最小值" : "Min"}
                            stroke="#6ee7ff"
                            strokeWidth={2.2}
                            dot={(props: any) =>
                              props?.payload?.isMinHighlight ? (
                                <circle cx={props.cx} cy={props.cy} r={4.5} fill="#6ee7ff" stroke="#d6fbff" strokeWidth={1.5} />
                              ) : (
                                <></>
                              )
                            }
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {temperatureTrendCharts.map((chart, index) => {
                    const isLast = index === temperatureTrendCharts.length - 1
                    return (
                      <div key={chart.key} className={`relative min-h-0 flex-1 ${!isLast ? "border-b border-[#214260]/90" : ""}`}>
                        <div className="h-full min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chart.data} syncId={trendSyncId} syncMethod="value" margin={{ top: 8, right: 18, left: 0, bottom: isLast ? 6 : 0 }}>
                              <CartesianGrid stroke="#173354" strokeDasharray="3 3" vertical={false} />
                              <XAxis
                                dataKey="time"
                                tick={isLast ? { fill: "#88a8be", fontSize: 9 } : false}
                                axisLine={false}
                                tickLine={false}
                                ticks={isLast ? trendXAxisTicks : undefined}
                                interval={isLast ? 0 : trendXAxisInterval}
                                height={isLast ? 22 : 0}
                              />
                              <YAxis
                                tick={{ fill: "#88a8be", fontSize: 9 }}
                                axisLine={{ stroke: "#355978", strokeOpacity: 0.35 }}
                                tickLine={false}
                                tickFormatter={(value) => `${Number(value).toFixed(0)}°C`}
                                domain={["dataMin - 1", "dataMax + 1"]}
                                width={52}
                              />
                              <Tooltip content={<ExtremeTrendTooltip unit="°C" digits={1} zh={zh} />} />
                              <Line
                                type="monotone"
                                dataKey="max"
                                name={zh ? "最大值" : "Max"}
                                stroke="#ffd36b"
                                strokeWidth={1.9}
                                dot={(props: any) =>
                                  props?.payload?.isMaxHighlight ? (
                                    <circle cx={props.cx} cy={props.cy} r={4} fill="#ffd36b" stroke="#fff4cf" strokeWidth={1.4} />
                                  ) : (
                                    <></>
                                  )
                                }
                                isAnimationActive={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="min"
                                name={zh ? "最小值" : "Min"}
                                stroke="#6ee7ff"
                                strokeWidth={1.9}
                                dot={(props: any) =>
                                  props?.payload?.isMinHighlight ? (
                                    <circle cx={props.cx} cy={props.cy} r={4} fill="#6ee7ff" stroke="#d6fbff" strokeWidth={1.4} />
                                  ) : (
                                    <></>
                                  )
                                }
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex w-[172px] shrink-0 flex-col overflow-hidden rounded-[12px] border border-[#214260] bg-[linear-gradient(180deg,rgba(11,24,48,0.9),rgba(8,16,34,0.96))]">
                  <div className="flex min-h-0 flex-[1.28] items-center border-b border-[#214260]/90 px-3 py-2">
                    <div className="w-full">
                      <div className="text-[14px] font-semibold leading-5 tracking-[0.04em] text-[#dff7ff]">{voltageTrendSummary.header}</div>
                      <div className="mt-3 space-y-2 text-[11px] leading-5 text-[#dff7ff]">
                        <div>{voltageTrendSummary.maxText}</div>
                        <div className="text-[#bfe8ff]">{voltageTrendSummary.minText}</div>
                      </div>
                    </div>
                  </div>
                  {temperatureTrendSummaries.map((chart, index) => {
                    const isLast = index === temperatureTrendSummaries.length - 1
                    return (
                      <div key={`${chart.key}-summary`} className={`flex min-h-0 flex-1 items-center px-3 py-2 ${!isLast ? "border-b border-[#214260]/90" : ""}`}>
                        <div className="w-full">
                          <div className="text-[14px] font-semibold leading-5 tracking-[0.04em] text-[#dff7ff]">{chart.header}</div>
                          <div className="mt-3 space-y-2 text-[11px] leading-5 text-[#dff7ff]">
                            <div>{chart.maxText}</div>
                            <div className="text-[#bfe8ff]">{chart.minText}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </NeonSection>
        </div>
        </div>
    </div>
  )
}


