"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { CartesianGrid, Customized, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useLanguage } from "@/components/language-provider"
import { BCUStatusQuery } from "@/components/dashboard/bcu-status-query"
import { useProject } from "@/components/dashboard/dashboard-header"
import { useFluidScale } from "@/hooks/use-fluid-scale"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  fetchDailyCellHistory,
  fetchDailyCellHistoryBcu,
  fetchDailyCellHistoryEnergySummary,
  fetchDailyCellHistoryTrendBundle,
  type DailyCellHistoryBundle,
  type DailyCellHistoryTrendBundle,
  type DailyEnergySummary,
} from "@/lib/api/cell-history"
import type { OperationTrendPoint } from "@/lib/api/operations"

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

type CachedHistoryBundle = {
  requestKey: string
  bundle: DailyCellHistoryBundle
}


const CELL_COUNT = 50
const STEP_MINUTES = 15
const TOTAL_POINTS = (24 * 60) / STEP_MINUTES
const DAY_END_TIME_LABEL = "23:59:59"
const EMPTY_HISTORY_DATA: HistoryPoint[] = []
const EMPTY_OVERVIEW_DATA: OverviewPoint[] = []
const EMPTY_CELL_METRICS: CellMetric[] = []
const EMPTY_EXTREME_CURVE_TREND: Array<{
  time: string
  max: number
  min: number
  maxCell: number
  minCell: number
}> = []
const EMPTY_TEMPERATURE_EXTREME_TRENDS: Record<TemperatureChannelKey, Array<{
  time: string
  max: number
  min: number
  maxCell: number
  minCell: number
}>> = {
  t1: [],
  t2: [],
  t3: [],
}
const mutedText = "text-[#94bbd6]"
const edgeGlow = "shadow-[0_0_0_1px_rgba(88,181,255,0.08),0_18px_42px_rgba(1,7,19,0.42),inset_0_0_28px_rgba(44,126,198,0.06)]"
const pickerScrollbarClass =
  "[scrollbar-width:thin] [scrollbar-color:rgba(137,170,230,0.85)_rgba(8,18,42,0.96)] [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[#0b1431] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[2px] [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-[#0b1431] [&::-webkit-scrollbar-thumb]:bg-[#809dd6] hover:[&::-webkit-scrollbar-thumb]:bg-[#a9c4ff]"

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)

const getCellExtremes = (values: Array<{ cell: number; value: number | null | undefined }>) => {
  const validValues = values.filter((item): item is { cell: number; value: number } => isFiniteNumber(item.value))
  if (validValues.length === 0) {
    return null
  }

  return {
    maxEntry: validValues.reduce((best, current) => (current.value > best.value ? current : best), validValues[0]),
    minEntry: validValues.reduce((best, current) => (current.value < best.value ? current : best), validValues[0]),
  }
}

const formatTimeLabel = (index: number) =>
  `${String(Math.floor((index * STEP_MINUTES) / 60)).padStart(2, "0")}:${String((index * STEP_MINUTES) % 60).padStart(2, "0")}`

const toTrendTimeLabel = (time: string) => `${time}:00`
const formatAxisTimeLabel = (time: string) => {
  const trimmed = time.trim()
  const timeMatch = trimmed.match(/^(\d{2}:\d{2})(?::\d{2})?$/)
  if (timeMatch) {
    return timeMatch[1]
  }

  const dateValue = new Date(trimmed)
  if (!Number.isNaN(dateValue.getTime())) {
    return `${String(dateValue.getHours()).padStart(2, "0")}:${String(dateValue.getMinutes()).padStart(2, "0")}`
  }

  return trimmed
}

const buildDynamicTimeTicks = (times: string[], visibleTickCount: number) => {
  if (times.length <= 2) {
    return Array.from(new Set(times))
  }

  if (times.length <= visibleTickCount) {
    return Array.from(new Set(times))
  }

  const step = Math.max(1, Math.ceil((times.length - 1) / Math.max(visibleTickCount - 1, 1)))
  return Array.from(
    new Set(times.filter((time, index) => index === 0 || index === times.length - 1 || index % step === 0)),
  )
}

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
  headerVariant = "default",
  titleClassName = "",
  accentBarClassName = "",
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
  headerVariant?: "default" | "bcu"
  titleClassName?: string
  accentBarClassName?: string
  className?: string
  children: ReactNode
}) {
  const scale = useFluidScale<HTMLElement>(1180, 1920, { minRootPx: 14, maxRootPx: 18 })
  const isBcuHeader = headerVariant === "bcu"
  const defaultAccentBarClass = isBcuHeader
    ? "bg-[#00d4aa]"
    : "bg-[#3fe7ff]/90 shadow-[0_0_12px_rgba(63,231,255,0.85)]"
  const headerSpacingClass = inlineSubtitle
    ? (compact ? "mb-1.5" : "mb-2")
    : (compact ? "mb-2" : "mb-3")
  const headerPaddingLeftClass = isBcuHeader ? "pl-4.5" : (compact ? "pl-2.5" : "pl-3")
  const titleStyle = isBcuHeader
    ? { fontSize: scale.clampText(0.9, 0.98, 1.15) }
    : { fontSize: compact ? scale.clampText(0.82, 0.9, 1.02) : scale.clampText(0.88, 0.98, 1.12) }
  const subtitleSize = scale.fluid(10, 12.5)
  const badgeSize = scale.fluid(10, 12.5)

  return (
    <section
      ref={scale.ref}
      className={`relative flex min-h-0 flex-col overflow-hidden rounded-[20px] ${bare ? "" : "border border-[#254873]/80 bg-[radial-gradient(circle_at_top_right,rgba(38,109,178,0.15),transparent_28%),linear-gradient(180deg,rgba(10,19,44,0.97),rgba(6,12,29,0.98))]"} ${compact ? "p-2.5" : "p-3"} ${bare ? "" : edgeGlow} ${className}`}
      style={scale.rootStyle}
    >
      {!bare ? <div className="pointer-events-none absolute inset-0 rounded-[20px] border border-[#8feaff]/[0.05]" /> : null}
      <div className={`pointer-events-none absolute left-3 ${isBcuHeader ? "top-[13px] h-4 w-1" : "top-3 h-5 w-[2px]"} rounded-full ${accentBarClassName || defaultAccentBarClass}`} />
      {showHeaderRule ? (
        <div className="pointer-events-none absolute inset-x-4 top-[50px] h-px bg-gradient-to-r from-[#274f78]/70 via-[#78dfff]/45 to-transparent" />
      ) : null}
      <div className={`relative flex ${inlineSubtitle || isBcuHeader ? "items-center" : "items-start"} justify-between gap-3 ${headerPaddingLeftClass} ${headerSpacingClass}`}>
        <div className={inlineSubtitle ? "flex items-center gap-3" : ""}>
          <div
            className={titleClassName || `${isBcuHeader ? "font-semibold text-[#00d4aa]" : "font-semibold tracking-[0.08em] text-[#8ceeff]"}`}
            style={titleStyle}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              className={inlineSubtitle ? `leading-none ${mutedText}` : `mt-1 leading-4 ${mutedText}`}
              style={{ fontSize: subtitleSize }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {headerExtra}
          {badge ? (
            <div
              className="rounded-[10px] border border-[#29547f] bg-[linear-gradient(180deg,rgba(12,28,60,0.95),rgba(8,19,42,0.96))] px-2.5 py-1 text-[#c0eeff] shadow-[inset_0_0_12px_rgba(63,231,255,0.06)]"
              style={{ fontSize: badgeSize }}
            >
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
  const scale = useFluidScale<HTMLDivElement>(1180, 1920, { minRootPx: 14, maxRootPx: 18 })
  return (
    <div ref={scale.ref} className={`flex h-full min-h-0 flex-col rounded-[16px] border border-[#1f4068] bg-[linear-gradient(180deg,rgba(10,20,44,0.9),rgba(8,16,37,0.96))] shadow-[inset_0_0_16px_rgba(25,92,148,0.08)] ${compact ? "p-1.5" : "p-2"}`} style={scale.rootStyle}>
      <div className={`${compact ? "mb-1" : "mb-1.5"} flex items-center gap-2`}>
        <div className="h-5 w-[2px] rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 10px ${accent}` }} />
        <div className="font-semibold tracking-[0.06em] text-[#d8f7ff]" style={{ fontSize: compact ? scale.clampText(0.72, 0.78, 0.92) : scale.clampText(0.78, 0.86, 1.02) }}>{title}</div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}


function LegendItem({ label, color, dashed = false, compact = false }: { label: string; color: string; dashed?: boolean; compact?: boolean }) {
  const scale = useFluidScale<HTMLDivElement>(1180, 1920, { minRootPx: 14, maxRootPx: 18 })
  return (
    <div ref={scale.ref} className={`flex items-center ${compact ? "gap-1.5" : "gap-2"} text-[#96bdd4]`} style={{ fontSize: compact ? scale.fluid(10, 12) : scale.fluid(11, 13) }}>
      <span className={`block h-[2px] ${compact ? "w-4" : "w-5"} ${dashed ? "border-t-2 border-dashed" : ""}`} style={dashed ? { borderColor: color } : { backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
      <span>{label}</span>
    </div>
  )
}

function ChartPlaceholder({ text }: { text: string }) {
  const scale = useFluidScale<HTMLDivElement>(1180, 1920, { minRootPx: 14, maxRootPx: 18 })
  return (
    <div ref={scale.ref} className="flex h-full min-h-0 items-center justify-center px-4" style={scale.rootStyle}>
      <div className="rounded-[12px] border border-[#214260]/70 bg-[rgba(8,18,40,0.52)] px-4 py-2.5 text-center text-[#7b8ab8] shadow-[inset_0_0_18px_rgba(63,231,255,0.03)]" style={{ fontSize: scale.fluid(12, 14) }}>
        {text}
      </div>
    </div>
  )
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[12px] border border-[#214260]/80 bg-[linear-gradient(180deg,rgba(17,35,68,0.92),rgba(11,24,49,0.98))] shadow-[inset_0_0_18px_rgba(63,231,255,0.04)] ${className}`}
    />
  )
}

function SkeletonPanel({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`overflow-hidden rounded-[20px] border border-[#254873]/80 bg-[radial-gradient(circle_at_top_right,rgba(38,109,178,0.12),transparent_28%),linear-gradient(180deg,rgba(10,19,44,0.97),rgba(6,12,29,0.98))] p-3 shadow-[0_0_0_1px_rgba(88,181,255,0.08),0_18px_42px_rgba(1,7,19,0.32),inset_0_0_28px_rgba(44,126,198,0.05)] ${className}`}
    >
      {children}
    </div>
  )
}

function HistoryLoadingIndicator({
  text,
  variant = "skeleton",
}: {
  text: string
  variant?: "skeleton" | "overlay"
}) {
  const isOverlay = variant === "overlay"

  return (
    <div
      className={`relative overflow-hidden rounded-[20px] border border-[#29547f]/80 bg-[linear-gradient(180deg,rgba(12,27,58,0.9),rgba(8,18,40,0.96))] shadow-[0_18px_40px_rgba(0,0,0,0.24),inset_0_0_24px_rgba(63,231,255,0.05)] ${
        isOverlay ? "min-w-[240px] px-6 py-5" : "min-w-[220px] px-5 py-4"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(110,231,255,0.14),transparent_42%),linear-gradient(90deg,transparent,rgba(255,211,107,0.05),transparent)]" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#4ba7d7]/45 bg-[radial-gradient(circle,rgba(110,231,255,0.18),rgba(17,35,68,0.1)_65%,transparent)]">
          <span className="absolute h-11 w-11 animate-ping rounded-full border border-[#6ee7ff]/30" />
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#6ee7ff] shadow-[0_0_14px_rgba(110,231,255,0.95)]" />
        </div>
        <div className="text-[12px] font-semibold tracking-[0.08em] text-[#dffbff]">{text}</div>
        <div className="w-full max-w-[188px] space-y-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#102346]">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-[linear-gradient(90deg,rgba(63,231,255,0.42),rgba(255,211,107,0.78),rgba(63,231,255,0.42))]" />
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6ee7ff]/90" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffd36b]/80 [animation-delay:160ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6ee7ff]/70 [animation-delay:320ms]" />
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricTileSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex h-full min-h-0 flex-col justify-between rounded-[12px] border border-[#1e3d60] bg-[linear-gradient(180deg,rgba(14,30,62,0.95),rgba(10,20,46,0.98))] ${
        compact ? "px-1.5 py-1" : "px-2 py-1.5"
      }`}
    >
      <div className="flex items-end gap-1">
        <SkeletonBlock className={`${compact ? "h-5 w-14" : "h-6 w-16"} rounded-[10px]`} />
        <SkeletonBlock className={`${compact ? "mb-0.5 h-3 w-7" : "mb-1 h-3.5 w-8"} rounded-full`} />
      </div>
      <SkeletonBlock className={`${compact ? "h-3 w-12" : "h-3.5 w-14"} rounded-full`} />
    </div>
  )
}

function ChartSkeleton({
  lineColors,
  withXAxis = false,
  withRightAxis = false,
}: {
  lineColors: string[]
  withXAxis?: boolean
  withRightAxis?: boolean
}) {
  const lines = [
    "M 0 72 C 34 52, 64 80, 96 60 S 158 28, 206 46 S 278 70, 336 34",
    "M 0 94 C 28 86, 62 52, 108 72 S 186 104, 236 76 S 298 40, 336 56",
    "M 0 118 C 42 88, 84 112, 124 84 S 200 52, 256 78 S 308 118, 336 96",
  ]

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-[12px] border border-[#1c3b62]/85 bg-[linear-gradient(180deg,rgba(12,25,50,0.88),rgba(8,17,36,0.96))]">
      <div className="absolute inset-x-0 top-0 h-10 bg-[linear-gradient(180deg,rgba(110,231,255,0.05),transparent)]" />
      <div className="pointer-events-none absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_50%_22%,rgba(110,231,255,0.04),transparent_34%),linear-gradient(180deg,rgba(255,211,107,0.02),transparent_44%,rgba(110,231,255,0.03)_100%)]" />
      <div className="absolute left-0 top-0 flex h-full w-11 flex-col justify-between px-2 py-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={`chart-left-axis-${index}`} className="h-2.5 w-6 rounded-full border-0" />
        ))}
      </div>
      {withRightAxis ? (
        <div className="absolute right-0 top-0 flex h-full w-11 flex-col justify-between px-2 py-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={`chart-right-axis-${index}`} className="ml-auto h-2.5 w-6 rounded-full border-0" />
          ))}
        </div>
      ) : null}
      <div className={`absolute inset-y-0 ${withRightAxis ? "right-11" : "right-0"} left-11 ${withXAxis ? "bottom-6" : "bottom-0"} top-0`}>
        <div className="absolute inset-0">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`chart-grid-row-${index}`}
              className="absolute inset-x-0 border-t border-dashed border-[#274a72]/60"
              style={{ top: `${18 + index * 22}%` }}
            />
          ))}
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`chart-grid-col-${index}`}
              className="absolute inset-y-0 border-l border-dashed border-[#1f3b5e]/55"
              style={{ left: `${14 + index * 16}%` }}
            />
          ))}
        </div>
        <svg viewBox="0 0 336 140" preserveAspectRatio="none" className="absolute inset-0 h-full w-full animate-pulse opacity-60 [animation-duration:2.6s]">
          <defs>
            <linearGradient id={`chart-skeleton-gradient-${lineColors.length}-${withXAxis ? "x" : "n"}-${withRightAxis ? "r" : "l"}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(148,187,214,0.18)" />
              <stop offset="45%" stopColor="rgba(255,211,107,0.42)" />
              <stop offset="100%" stopColor="rgba(110,231,255,0.24)" />
            </linearGradient>
          </defs>
          {lineColors.map((color, index) => (
            <path
              key={`chart-line-${color}-${index}`}
              d={lines[index % lines.length]}
              fill="none"
              stroke={`url(#chart-skeleton-gradient-${lineColors.length}-${withXAxis ? "x" : "n"}-${withRightAxis ? "r" : "l"})`}
              strokeWidth={index === 0 ? 2.2 : 1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.42 - index * 0.08}
            />
          ))}
          {lineColors.slice(0, 2).map((color, index) => (
            <circle
              key={`chart-dot-${color}-${index}`}
              cx={index === 0 ? 244 : 292}
              cy={index === 0 ? 42 : 54}
              r="3"
              fill={color}
              stroke="#f8fbff"
              strokeWidth="0.8"
              opacity="0.5"
            />
          ))}
        </svg>
      </div>
      {withXAxis ? (
        <div className={`absolute inset-x-0 bottom-0 ${withRightAxis ? "right-11" : ""} left-11 flex h-6 items-center justify-between px-2`}>
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={`chart-x-axis-${index}`} className="h-2.5 w-8 rounded-full border-0" />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function TrendSummarySkeleton({ tight = false }: { tight?: boolean }) {
  return (
    <div className="h-full p-3">
      <SkeletonBlock className="mb-3 h-4 w-24 rounded-full" />
      <div className={`grid ${tight ? "gap-2" : "gap-2.5"}`}>
        <SkeletonBlock className="h-4 w-full rounded-full" />
        <SkeletonBlock className="h-4 w-4/5 rounded-full" />
        <SkeletonBlock className="h-4 w-3/4 rounded-full" />
      </div>
    </div>
  )
}

function OverviewHistorySkeleton({
  compact,
  tight,
  loadingText,
}: {
  compact: boolean
  tight: boolean
  loadingText: string
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 rounded-[24px] bg-[rgba(5,12,29,0.64)] p-2 backdrop-blur-[3px]">
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <HistoryLoadingIndicator text={loadingText} />
      </div>
      <div className={`grid h-full min-h-0 ${compact ? "grid-cols-[1.04fr_1.26fr] gap-2" : "grid-cols-[0.94fr_1.36fr] gap-2.5"}`}>
        <div className={`grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1.4fr)] ${compact ? "gap-1.5" : "gap-2"}`}>
          <SkeletonPanel className="px-1.5 pt-2.5 pb-1">
            <div className={`grid h-full min-h-0 grid-cols-3 ${compact ? "gap-1" : "gap-1.5"}`}>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`overview-skeleton-card-${index}`}
                  className={`flex h-full min-h-0 flex-col rounded-[16px] border border-[#1f4068] bg-[linear-gradient(180deg,rgba(10,20,44,0.9),rgba(8,16,37,0.96))] ${compact ? "p-1.5" : "p-2"}`}
                >
                  <SkeletonBlock className={`${compact ? "mb-1 h-3.5 w-14" : "mb-1.5 h-4 w-16"} rounded-full`} />
                  <div className="grid h-full min-h-0 grid-rows-3 gap-1">
                    {Array.from({ length: 3 }).map((__, innerIndex) => (
                      <MetricTileSkeleton key={`overview-skeleton-item-${index}-${innerIndex}`} compact={compact} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SkeletonPanel>

          <SkeletonPanel className="p-3">
            <ChartSkeleton lineColors={["#f472b6", "#4ade80", "#22d3ee"]} withXAxis />
          </SkeletonPanel>
        </div>

        <SkeletonPanel className="h-full px-1.5 pt-2.5 pb-1">
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#1f4068] bg-[linear-gradient(180deg,rgba(10,20,44,0.9),rgba(8,16,37,0.96))] p-2">
              <div className="flex min-h-0 flex-1 items-stretch gap-2">
                <div className="grid min-h-0 flex-1 grid-rows-[1.28fr_repeat(3,minmax(0,1fr))] overflow-hidden">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={`trend-skeleton-chart-${index}`} className={`min-h-0 ${index < 3 ? "border-b border-[#214260]/90" : ""}`}>
                      <ChartSkeleton
                        lineColors={index === 0 ? ["#ffd36b", "#6ee7ff"] : ["#ffd36b", "#6ee7ff"]}
                        withXAxis={index === 3}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid w-[172px] shrink-0 grid-rows-[1.28fr_repeat(3,minmax(0,1fr))] overflow-hidden rounded-[12px] border border-[#214260] bg-[linear-gradient(180deg,rgba(11,24,48,0.9),rgba(8,16,34,0.96))]">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={`trend-skeleton-summary-${index}`} className={`p-3 ${index < 3 ? "border-b border-[#214260]/90" : ""}`}>
                      <TrendSummarySkeleton tight={tight} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SkeletonPanel>
      </div>
    </div>
  )
}

function HistoryLoadingOverlay({
  text,
  dimmed = false,
  backdrop = true,
}: {
  text: string
  dimmed?: boolean
  backdrop?: boolean
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[24px] ${
        backdrop
          ? `border border-[#8feaff]/10 ${
              dimmed
                ? "bg-[rgba(6,13,31,0.56)] backdrop-blur-[2px]"
                : "bg-[linear-gradient(180deg,rgba(5,12,29,0.92),rgba(7,17,36,0.95))] backdrop-blur-sm"
            }`
          : ""
      }`}
    >
      <HistoryLoadingIndicator text={text} variant="overlay" />
    </div>
  )
}

const renderTrendHighlightDot = (
  props: any,
  activeFlag: "isMaxHighlight" | "isMinHighlight",
  fill: string,
  stroke: string,
  radius: number,
  strokeWidth: number,
) => {
  if (!props?.payload?.[activeFlag]) {
    return null
  }

  const key = `${String(props.dataKey ?? activeFlag)}-${String(props.payload?.time ?? props.index ?? "dot")}`
  return <circle key={key} cx={props.cx} cy={props.cy} r={radius} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
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


function CellChip({ label, active, warning, onClick }: { label: string; active: boolean; warning: boolean; onClick: () => void }) {
  const scale = useFluidScale<HTMLButtonElement>(1180, 1920, { minRootPx: 14, maxRootPx: 18 })
  return (
    <button
      ref={scale.ref}
      type="button"
      onClick={onClick}
      className={`rounded-[10px] border px-2 py-1.5 font-medium leading-none transition-all ${
        active
          ? "border-[#3de7d9] bg-[linear-gradient(180deg,rgba(20,91,96,0.72),rgba(13,45,51,0.94))] text-[#efffff] shadow-[0_0_12px_rgba(61,231,217,0.12)]"
          : warning
            ? "border-[#6a4c31] bg-[linear-gradient(180deg,rgba(56,36,25,0.62),rgba(31,22,19,0.9))] text-[#ffd7a6] hover:border-[#a37649]"
            : "border-[#214260] bg-[linear-gradient(180deg,rgba(11,24,48,0.92),rgba(8,17,35,0.96))] text-[#a7cae2] hover:border-[#3d709f] hover:text-[#e3f8ff]"
      }`}
      style={{ fontSize: scale.fluid(10, 12) }}
    >
      {label}
    </button>
  )
}

export function CellHistoryCellPicker({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const scale = useFluidScale<HTMLDivElement>(1180, 1920, { minRootPx: 14, maxRootPx: 18 })
  const controlSize = scale.fluid(12, 14.5)
  const triggerHeight = scale.fluid(34, 40)
  const iconSize = scale.fluid(14, 17)
  const [open, setOpen] = useState(false)
  const label = value === null ? (zh ? "全部电芯" : "All Cells") : `${zh ? "电芯" : "Cell"} ${value}`

  return (
    <div ref={scale.ref} style={scale.rootStyle}>
      <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex min-w-[150px] items-center justify-between gap-2 rounded-xl border border-[#26456e] bg-[#101840] px-3 py-1.5 text-[#e8f4fc] transition-all hover:border-[#22d3ee]/60" style={{ height: triggerHeight, fontSize: controlSize }}>
          <span className="font-medium">{label}</span>
          <ChevronsUpDown className="text-[#7b8ab8]" style={{ width: iconSize, height: iconSize }} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-50 w-[240px] rounded-2xl border border-[#26456e] bg-[#0d1233] p-0 text-[#e8f4fc]" style={{ fontSize: controlSize }}>
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
    </div>
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
  const scale = useFluidScale<HTMLDivElement>(1180, 1920, { minRootPx: 14, maxRootPx: 18 })
  const controlSize = scale.fluid(12, 14.5)
  const hintSize = scale.fluid(10, 12)
  const triggerHeight = scale.fluid(36, 42)
  const iconSize = scale.fluid(14, 17)
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
    <div ref={scale.ref} style={scale.rootStyle}>
      <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex min-w-[220px] items-center justify-between gap-2 rounded-xl border border-[#26456e] bg-[#101840] px-3 text-[#e8f4fc] transition-all hover:border-[#22d3ee]/60" style={{ height: triggerHeight, fontSize: controlSize }}>
          <div className="flex min-w-0 items-center gap-2">
            <span className="font-medium">{label}</span>
            <span className="rounded-full border border-[#2f568a] bg-[#0b1735] px-1.5 py-0.5 text-[#8feaff]" style={{ fontSize: hintSize }}>
              {value.length}/{maxSelection}
            </span>
          </div>
          <ChevronsUpDown className="shrink-0 text-[#7b8ab8]" style={{ width: iconSize, height: iconSize }} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-50 w-[260px] rounded-2xl border border-[#26456e] bg-[#0d1233] p-0 text-[#e8f4fc]" style={{ fontSize: controlSize }}>
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
          <div className="border-t border-[#1a2654] px-3 py-2 text-[#6f8cb1]" style={{ fontSize: hintSize }}>
            {zh ? `最多选择 ${maxSelection} 个电芯` : `Up to ${maxSelection} cells`}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
    </div>
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
  chargeWh: number | null
  dischargeWh: number | null
  roundTripEfficiency: number | null
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
  const { selectedProject } = useProject()
  const scale = useFluidScale<HTMLDivElement>(1180, 1920, { minRootPx: 14, maxRootPx: 18 })
  const zh = language === "zh"
  const chartFontSize = scale.chart(9, 12)
  const summaryTitleSize = scale.fluid(14, 17)
  const summaryTextSize = scale.fluid(11, 13.5)
  const detailMetricLabelSize = scale.fluid(11, 13)
  const detailMetricValueSize = scale.fluid(12, 14.5)
  const detailCellTitleSize = scale.clampText(0.9, 0.98, 1.14)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [availableSize, setAvailableSize] = useState({ width: 0, height: 0 })
  const [historyBundle, setHistoryBundle] = useState<CachedHistoryBundle | null>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [overviewTrendBundle, setOverviewTrendBundle] = useState<DailyCellHistoryTrendBundle | null>(null)
  const [overviewDailyEnergySummary, setOverviewDailyEnergySummary] = useState<DailyEnergySummary | null>(null)
  const [overviewBcuHistory, setOverviewBcuHistory] = useState<OperationTrendPoint[]>([])
  const [isOverviewTrendLoading, setIsOverviewTrendLoading] = useState(true)
  const [isOverviewEnergyLoading, setIsOverviewEnergyLoading] = useState(true)
  const [isOverviewBcuLoading, setIsOverviewBcuLoading] = useState(true)
  const [overviewTrendError, setOverviewTrendError] = useState<string | null>(null)
  const [overviewEnergyError, setOverviewEnergyError] = useState<string | null>(null)
  const [overviewBcuError, setOverviewBcuError] = useState<string | null>(null)
  const [detailVisibleMetrics, setDetailVisibleMetrics] = useState<Record<DetailMetricKey, boolean>>({
    voltage: true,
    t1: true,
    t2: true,
    t3: true,
  })
  const effectiveDetailCells = useMemo(() => {
    const limitedCells = detailCells.slice(0, 3)
    if (limitedCells.length > 0) return limitedCells
    if (selectedCell != null) return [selectedCell]
    return [1]
  }, [detailCells, selectedCell])
  const detailRequestKey = useMemo(
    () => `${selectedProject.projectId}::${date}::${effectiveDetailCells.join(",")}`,
    [date, effectiveDetailCells, selectedProject.projectId]
  )
  const hasMatchingHistoryBundle = historyBundle !== null && historyBundle.requestKey === detailRequestKey

  useEffect(() => {
    if (viewMode !== "detail") {
      return
    }

    if (hasMatchingHistoryBundle) {
      setIsHistoryLoading(false)
      setHistoryError(null)
      return
    }

    let cancelled = false
    const abortController = new AbortController()

    const loadHistory = async () => {
      setIsHistoryLoading(true)
      setHistoryError(null)

      try {
        const nextBundle = await fetchDailyCellHistory(selectedProject.projectId, date, {
          includeBcuHistory: viewMode !== "detail",
          ...(viewMode === "detail" ? { detailCellIndexes: effectiveDetailCells } : {}),
          signal: abortController.signal,
        })

        if (cancelled) {
          return
        }

        setHistoryBundle({
          requestKey: detailRequestKey,
          bundle: nextBundle,
        })
      } catch (error) {
        if (abortController.signal.aborted || cancelled) {
          return
        }

        console.error(`Failed to load cell history for ${selectedProject.projectId} on ${date}`, error)
        setHistoryError(zh ? "电芯历史接口加载失败" : "Failed to load cell history")
      } finally {
        if (!cancelled) {
          setIsHistoryLoading(false)
        }
      }
    }

    void loadHistory()

    return () => {
      cancelled = true
      abortController.abort()
    }
  }, [detailRequestKey, effectiveDetailCells, hasMatchingHistoryBundle, selectedProject.projectId, date, viewMode, zh])

  useEffect(() => {
    if (viewMode !== "overview") {
      setIsOverviewTrendLoading(false)
      return
    }

    let cancelled = false
    const abortController = new AbortController()

    const loadOverviewTrend = async () => {
      setIsOverviewTrendLoading(true)
      setOverviewTrendError(null)

      try {
        const nextTrendBundle = await fetchDailyCellHistoryTrendBundle(selectedProject.projectId, date, {
          signal: abortController.signal,
        })

        if (cancelled) {
          return
        }

        setOverviewTrendBundle(nextTrendBundle)
      } catch (error) {
        if (abortController.signal.aborted || cancelled) {
          return
        }

        console.error(`Failed to load cell history trend bundle for ${selectedProject.projectId} on ${date}`, error)
        setOverviewTrendError(zh ? "电压/温度趋势接口加载失败" : "Failed to load voltage/temperature trends")
      } finally {
        if (!cancelled) {
          setIsOverviewTrendLoading(false)
        }
      }
    }

    void loadOverviewTrend()

    return () => {
      cancelled = true
      abortController.abort()
    }
  }, [date, selectedProject.projectId, viewMode, zh])

  useEffect(() => {
    if (viewMode !== "overview") {
      setIsOverviewEnergyLoading(false)
      return
    }

    let cancelled = false
    const abortController = new AbortController()

    const loadOverviewEnergy = async () => {
      setIsOverviewEnergyLoading(true)
      setOverviewEnergyError(null)

      try {
        const nextDailyEnergySummary = await fetchDailyCellHistoryEnergySummary(selectedProject.projectId, date, {
          signal: abortController.signal,
        })

        if (cancelled) {
          return
        }

        setOverviewDailyEnergySummary(nextDailyEnergySummary)
      } catch (error) {
        if (abortController.signal.aborted || cancelled) {
          return
        }

        console.error(`Failed to load cell history energy summary for ${selectedProject.projectId} on ${date}`, error)
        setOverviewEnergyError(zh ? "日电量接口加载失败" : "Failed to load daily energy summary")
      } finally {
        if (!cancelled) {
          setIsOverviewEnergyLoading(false)
        }
      }
    }

    void loadOverviewEnergy()

    return () => {
      cancelled = true
      abortController.abort()
    }
  }, [date, selectedProject.projectId, viewMode, zh])

  useEffect(() => {
    if (viewMode !== "overview") {
      setIsOverviewBcuLoading(false)
      return
    }

    let cancelled = false
    const abortController = new AbortController()

    const loadOverviewBcu = async () => {
      setIsOverviewBcuLoading(true)
      setOverviewBcuError(null)

      try {
        const nextBcuHistory = await fetchDailyCellHistoryBcu(selectedProject.projectId, date, {
          signal: abortController.signal,
        })

        if (cancelled) {
          return
        }

        setOverviewBcuHistory(nextBcuHistory)
      } catch (error) {
        if (abortController.signal.aborted || cancelled) {
          return
        }

        console.error(`Failed to load BCU history for ${selectedProject.projectId} on ${date}`, error)
        setOverviewBcuError(zh ? "BCU运行状态接口加载失败" : "Failed to load BCU history")
      } finally {
        if (!cancelled) {
          setIsOverviewBcuLoading(false)
        }
      }
    }

    void loadOverviewBcu()

    return () => {
      cancelled = true
      abortController.abort()
    }
  }, [date, selectedProject.projectId, viewMode, zh])

  const activeHistoryBundle = hasMatchingHistoryBundle ? historyBundle.bundle : null
  const historyData = activeHistoryBundle?.historyData ?? EMPTY_HISTORY_DATA
  const overviewData = activeHistoryBundle?.overviewData ?? EMPTY_OVERVIEW_DATA
  const cellMetrics = activeHistoryBundle?.cellMetrics ?? EMPTY_CELL_METRICS
  const bcuHistoryData = viewMode === "overview" ? overviewBcuHistory : activeHistoryBundle?.bcuHistory ?? []
  const voltageExtremeTrend =
    viewMode === "overview" ? overviewTrendBundle?.voltageExtremeTrend ?? EMPTY_EXTREME_CURVE_TREND : activeHistoryBundle?.voltageExtremeTrend ?? EMPTY_EXTREME_CURVE_TREND
  const temperatureExtremeTrends =
    viewMode === "overview"
      ? overviewTrendBundle?.temperatureExtremeTrends ?? EMPTY_TEMPERATURE_EXTREME_TRENDS
      : activeHistoryBundle?.temperatureExtremeTrends ?? EMPTY_TEMPERATURE_EXTREME_TRENDS
  const dailyEnergySummary = viewMode === "overview" ? overviewDailyEnergySummary : activeHistoryBundle?.dailyEnergySummary ?? null

  const voltageTrendFallback = useMemo(() => {
    const safeVoltageTrend = voltageExtremeTrend.filter((item) => isFiniteNumber(item.max) && isFiniteNumber(item.min))
    if (safeVoltageTrend.length === 0) {
      return null
    }

    const highest = safeVoltageTrend.reduce((best, current) => (current.max > best.max ? current : best), safeVoltageTrend[0])
    const lowest = safeVoltageTrend.reduce((best, current) => (current.min < best.min ? current : best), safeVoltageTrend[0])

    return {
      maxVoltage: highest.max,
      maxVoltageCell: highest.maxCell,
      minVoltage: lowest.min,
      minVoltageCell: lowest.minCell,
      avgVoltage: average(safeVoltageTrend.map((item) => (item.max + item.min) / 2)),
      voltageDelta: highest.max - lowest.min,
    }
  }, [voltageExtremeTrend])

  const temperatureTrendFallback = useMemo(() => {
    const safeTemperatureTrend = Object.values(temperatureExtremeTrends)
      .flat()
      .filter((item) => isFiniteNumber(item.max) && isFiniteNumber(item.min))

    if (safeTemperatureTrend.length === 0) {
      return null
    }

    const highest = safeTemperatureTrend.reduce((best, current) => (current.max > best.max ? current : best), safeTemperatureTrend[0])
    const lowest = safeTemperatureTrend.reduce((best, current) => (current.min < best.min ? current : best), safeTemperatureTrend[0])

    return {
      maxTemp: highest.max,
      maxTempCell: highest.maxCell,
      minTemp: lowest.min,
      minTempCell: lowest.minCell,
      avgTemp: average(safeTemperatureTrend.map((item) => (item.max + item.min) / 2)),
      tempDelta: highest.max - lowest.min,
    }
  }, [temperatureExtremeTrends])

  const voltageStats = useMemo(
    () => voltageTrendFallback ?? { maxVoltage: 0, minVoltage: 0, avgVoltage: 0, voltageDelta: 0 },
    [voltageTrendFallback]
  )

  const temperatureStats = useMemo(
    () => temperatureTrendFallback ?? { maxTemp: 0, minTemp: 0, avgTemp: 0, tempDelta: 0 },
    [temperatureTrendFallback]
  )

  const dailyEnergyStats = useMemo(() => {
    return {
      chargeWh: dailyEnergySummary?.chargeWh ?? null,
      dischargeWh: dailyEnergySummary?.dischargeWh ?? null,
      roundTripEfficiency: dailyEnergySummary?.chargeEfficiencyCe ?? null,
    }
  }, [dailyEnergySummary])

  const topHighVoltage = useMemo(
    () => (voltageTrendFallback ? [{ cell: voltageTrendFallback.maxVoltageCell, voltageMax: voltageTrendFallback.maxVoltage }] : []),
    [voltageTrendFallback]
  )
  const topLowVoltage = useMemo(
    () => (voltageTrendFallback ? [{ cell: voltageTrendFallback.minVoltageCell, voltageMin: voltageTrendFallback.minVoltage }] : []),
    [voltageTrendFallback]
  )
  const topVoltageDeviationCells = useMemo(() => cellMetrics.slice().sort((a, b) => b.voltageDeviation - a.voltageDeviation).slice(0, 3), [cellMetrics])
  const topHotCells = useMemo(
    () => (temperatureTrendFallback ? [{ cell: temperatureTrendFallback.maxTempCell, tempMax: temperatureTrendFallback.maxTemp }] : []),
    [temperatureTrendFallback]
  )
  const topColdCells = useMemo(
    () => (temperatureTrendFallback ? [{ cell: temperatureTrendFallback.minTempCell, tempMin: temperatureTrendFallback.minTemp }] : []),
    [temperatureTrendFallback]
  )
  const overviewStatsPayload = useMemo(
    () => ({
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
      chargeWh: dailyEnergyStats.chargeWh,
      dischargeWh: dailyEnergyStats.dischargeWh,
      roundTripEfficiency: dailyEnergyStats.roundTripEfficiency,
    }),
    [voltageStats, temperatureStats, dailyEnergyStats, topHighVoltage, topLowVoltage, topHotCells, topColdCells],
  )

  useEffect(() => {
    if (viewMode !== "overview") {
      return
    }

    if (!voltageTrendFallback && !temperatureTrendFallback) {
      return
    }

    onOverviewStats?.(overviewStatsPayload)
  }, [onOverviewStats, overviewStatsPayload, temperatureTrendFallback, viewMode, voltageTrendFallback])

  const voltageTrendData = useMemo(
    () => {
      const safeVoltageExtremeTrend = voltageExtremeTrend.filter(
        (item) => isFiniteNumber(item.max) && isFiniteNumber(item.min)
      )

      if (safeVoltageExtremeTrend.length > 0) {
        const maxIndex = safeVoltageExtremeTrend.reduce((best, current, index, rows) => (current.max > rows[best].max ? index : best), 0)
        const minIndex = safeVoltageExtremeTrend.reduce((best, current, index, rows) => (current.min < rows[best].min ? index : best), 0)

        return extendTrendToDayEnd(
          safeVoltageExtremeTrend.map((item, index) => ({
            time: toTrendTimeLabel(item.time),
            max: Number(item.max.toFixed(3)),
            min: Number(item.min.toFixed(3)),
            maxCell: item.maxCell,
            minCell: item.minCell,
            isMaxHighlight: index === maxIndex,
            isMinHighlight: index === minIndex,
          })),
          {
            isMaxHighlight: false,
            isMinHighlight: false,
          }
        )
      }

      if (viewMode === "overview" || historyData.length === 0) {
        return []
      }

      const baseData = historyData.flatMap((point) => {
        const values = Array.from({ length: CELL_COUNT }, (_, index) => ({ cell: index + 1, value: point[`v${index + 1}`] }))
        const extremes = getCellExtremes(values)
        if (!extremes) {
          return []
        }

        return [{
          time: toTrendTimeLabel(point.time),
          max: Number(extremes.maxEntry.value.toFixed(3)),
          min: Number(extremes.minEntry.value.toFixed(3)),
          maxCell: extremes.maxEntry.cell,
          minCell: extremes.minEntry.cell,
        }]
      })

      if (baseData.length === 0) {
        return []
      }

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
    [historyData, viewMode, voltageExtremeTrend]
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
        const extremeTrend = temperatureExtremeTrends?.[key] ?? []
        const safeExtremeTrend = extremeTrend.filter((item) => isFiniteNumber(item.max) && isFiniteNumber(item.min))
        if (safeExtremeTrend.length > 0) {
          const maxIndex = safeExtremeTrend.reduce((best, current, index, rows) => (current.max > rows[best].max ? index : best), 0)
          const minIndex = safeExtremeTrend.reduce((best, current, index, rows) => (current.min < rows[best].min ? index : best), 0)
          const data = extendTrendToDayEnd(
            safeExtremeTrend.map((item, index) => ({
              time: toTrendTimeLabel(item.time),
              max: Number(item.max.toFixed(1)),
              min: Number(item.min.toFixed(1)),
              maxCell: item.maxCell,
              minCell: item.minCell,
              isMaxHighlight: index === maxIndex,
              isMinHighlight: index === minIndex,
            })),
            {
              isMaxHighlight: false,
              isMinHighlight: false,
            }
          )

          return { key, title, label, data }
        }

        if (viewMode === "overview" || historyData.length === 0) {
          return { key, title, label, data: [] }
        }

        const baseData = historyData.flatMap((point) => {
          const values = Array.from({ length: CELL_COUNT }, (_, index) => ({ cell: index + 1, value: point[`${key}_${index + 1}` as const] }))
          const extremes = getCellExtremes(values)
          if (!extremes) {
            return []
          }

          return [{
            time: toTrendTimeLabel(point.time),
            max: Number(extremes.maxEntry.value.toFixed(1)),
            min: Number(extremes.minEntry.value.toFixed(1)),
            maxCell: extremes.maxEntry.cell,
            minCell: extremes.minEntry.cell,
          }]
        })

        if (baseData.length === 0) {
          return { key, title, label, data: [] }
        }

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
    [historyData, temperatureExtremeTrends, viewMode, zh]
  )

  const isCompactCanvas = availableSize.width > 0 && (availableSize.width < 1280 || availableSize.height < 760)
  const isTightCanvas = availableSize.width > 0 && (availableSize.width < 1120 || availableSize.height < 700)
  const trendPaneFraction = isCompactCanvas ? 1.26 / (1.04 + 1.26) : 1.36 / (0.94 + 1.36)
  const trendAxisLabelWidth = isTightCanvas ? 72 : isCompactCanvas ? 82 : 92
  const trendAxisReservedWidth = isTightCanvas ? 320 : isCompactCanvas ? 346 : 370
  const trendChartUsableWidth = Math.max(availableSize.width * trendPaneFraction - trendAxisReservedWidth, 320)
  const trendVisibleTickCount = Math.max(2, Math.floor(trendChartUsableWidth / trendAxisLabelWidth))
  const trendSyncId = "cell-history-extreme-trend"
  const trendXAxisTicks = useMemo(
    () => buildDynamicTimeTicks(voltageTrendData.map((item) => item.time), trendVisibleTickCount),
    [voltageTrendData, trendVisibleTickCount]
  )
  const trendXAxisInterval = Math.max(trendXAxisTicks.length - 1, 0)
  const voltageTrendSummary = useMemo(() => {
    if (voltageTrendData.length === 0) {
      return {
        title: zh ? "电压趋势" : "Voltage",
        subtitle: zh ? "电芯极值" : "Cell Extremes",
        header: zh ? "电压趋势（电芯极值）" : "Voltage (Cell Extremes)",
        maxText: "--",
        minText: "--",
      }
    }

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
        if (chart.data.length === 0) {
          return {
            key: chart.key,
            title: chart.title,
            subtitle: chart.label,
            header: zh ? `${chart.title}（${chart.label}）` : `${chart.title} (${chart.label})`,
            maxText: "--",
            minText: "--",
          }
        }

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
          const row: DetailReplayPoint = { time: formatAxisTimeLabel(point.time) }
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
        voltageMax: metrics?.voltageMax ?? null,
        voltageMin: metrics?.voltageMin ?? null,
        voltageSpread: metrics?.voltageSpread ?? null,
        tempMax: metrics?.tempMax ?? null,
        tempMin: metrics?.tempMin ?? null,
        tempSpread: metrics?.tempSpread ?? null,
      }
    })
  }, [cellMetrics, detailSeries])

  const detailAxisLabelWidth = isTightCanvas ? 72 : isCompactCanvas ? 82 : 94
  const detailAxisReservedWidth = isTightCanvas ? 220 : isCompactCanvas ? 248 : 276
  const detailChartUsableWidth = Math.max(availableSize.width - detailAxisReservedWidth, 320)
  const detailVisibleTickCount = Math.max(2, Math.floor(detailChartUsableWidth / detailAxisLabelWidth))
  const detailTickStep = useMemo(() => {
    if (detailReplayData.length <= 2 || detailReplayData.length <= detailVisibleTickCount) {
      return 1
    }

    return Math.max(1, Math.ceil((detailReplayData.length - 1) / Math.max(detailVisibleTickCount - 1, 1)))
  }, [detailReplayData.length, detailVisibleTickCount])
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

  const hasHistoryData = historyData.length > 0 && overviewData.length > 0 && cellMetrics.length > 0
  const hasVoltageOverviewData = voltageTrendFallback != null
  const hasTemperatureOverviewData = temperatureTrendFallback != null
  const hasOverviewData = hasVoltageOverviewData || hasTemperatureOverviewData
  const hasDailyEnergyStats =
    dailyEnergyStats.chargeWh != null || dailyEnergyStats.dischargeWh != null || dailyEnergyStats.roundTripEfficiency != null
  const hasVoltageTrendData = voltageTrendData.length > 0
  const hasTemperatureTrendData = temperatureTrendCharts.some((chart) => chart.data.length > 0)
  const isOverviewCardLoading = isOverviewTrendLoading || isOverviewEnergyLoading
  const overviewCardLoadingText = zh ? "概览数据加载中..." : "Loading overview..."
  const bcuLoadingText = zh ? "BCU运行状态加载中..." : "Loading BCU history..."
  const trendLoadingText = zh ? "电压/温度趋势加载中..." : "Loading voltage/temperature trends..."
  const trendPlaceholderText = overviewTrendError ? overviewTrendError : zh ? "暂无趋势数据" : "No trend data"
  const detailHistoryPlaceholderText = isHistoryLoading
    ? zh
      ? "加载电芯历史数据..."
      : "Loading cell history..."
    : historyError
      ? historyError
      : zh
        ? "暂无电芯历史数据"
        : "No cell history data"
  const formatDisplayValue = (value: number | null | undefined, digits: number, suffix = "") =>
    value == null ? "--" : `${value.toFixed(digits)}${suffix}`
  const detailHistoryLoadingText = zh ? "电芯历史明细加载中..." : "Loading cell detail history..."
  const showHistoryRefreshOverlay = isHistoryLoading && hasMatchingHistoryBundle
  const detailChartPlaceholderText = isHistoryLoading
    ? detailHistoryLoadingText
    : historyError
      ? historyError
      : zh
        ? "该电芯暂无趋势数据"
        : "No trend data for this cell"

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
          className="h-full px-1.5 pt-2.5 pb-1"
          bare
          headerVariant="bcu"
          showHeaderRule={false}
          headerExtra={
            <div className="flex items-center gap-3">
              {detailMetricLegend.map((item) => (
                <button
                  key={`detail-legend-${item.key}`}
                  type="button"
                  onClick={() => handleToggleDetailMetric(item.key)}
                  className={`flex items-center gap-1 transition-all ${
                    detailVisibleMetrics[item.key] ? "text-[#96bdd4]" : "text-[#547084]"
                  }`}
                  style={{ fontSize: scale.fluid(10, 12) }}
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
              const hasCellTrendData = detailReplayData.some(
                (point) =>
                  isFiniteNumber(point[series.voltageKey]) ||
                  isFiniteNumber(point[series.temp1Key]) ||
                  isFiniteNumber(point[series.temp2Key]) ||
                  isFiniteNumber(point[series.temp3Key])
              )

              return (
                <div
                  key={`detail-chart-${cell.cell}`}
                  className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-[#214260] bg-[linear-gradient(180deg,rgba(11,24,48,0.9),rgba(8,16,34,0.96))] px-0.5 pb-0.5"
                >
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-1.5 border-b border-[#214260]/90 px-3 py-1.5">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                          {[
                            { label: zh ? "最高电压" : "Max V", value: formatDisplayValue(cell.voltageMax, 2, "V"), color: "text-[#aef8ff]" },
                            { label: zh ? "最低电压" : "Min V", value: formatDisplayValue(cell.voltageMin, 2, "V"), color: "text-[#aef8ff]" },
                            { label: zh ? "最大ΔV" : "Max ΔV", value: formatDisplayValue(cell.voltageSpread, 2, "V"), color: "text-[#ffd892]" },
                            { label: zh ? "最高温度" : "Max T", value: formatDisplayValue(cell.tempMax, 1, "°C"), color: "text-[#aef8ff]" },
                            { label: zh ? "最低温度" : "Min T", value: formatDisplayValue(cell.tempMin, 1, "°C"), color: "text-[#aef8ff]" },
                            { label: zh ? "最大ΔT" : "Max ΔT", value: formatDisplayValue(cell.tempSpread, 1, "°C"), color: "text-[#ffd892]" },
                          ].map((item) => (
                            <div
                              key={`${cell.cell}-${item.label}`}
                              className="flex items-center gap-1.5 rounded-[8px] border border-[#22d3ee]/18 bg-[rgba(13,31,58,0.5)] px-2.5 py-1"
                            >
                              <span className="font-medium text-[#4a7090]" style={{ fontSize: detailMetricLabelSize }}>{item.label}</span>
                              <span className={`font-bold tabular-nums ${item.color}`} style={{ fontSize: detailMetricValueSize }}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex shrink-0 items-center gap-2 px-1 py-1">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cell.color, boxShadow: `0 0 10px ${cell.color}` }} />
                          <div className="font-semibold tracking-[0.05em] text-[#eefbff]" style={{ fontSize: detailCellTitleSize }}>{zh ? `电芯 #${cell.cell}` : `Cell #${cell.cell}`}</div>
                        </div>
                  </div>
                  <div className="min-h-0 flex-1">
                    {hasCellTrendData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={detailReplayData} syncId="cell-history-detail-replay" syncMethod="index" margin={{ top: 12, right: 14, left: 0, bottom: isLast ? 6 : 0 }}>
                              <CartesianGrid stroke="#173354" strokeDasharray="3 3" vertical={false} />
                              <XAxis
                                dataKey="time"
                                tick={isLast ? { fill: "#88a8be", fontSize: chartFontSize } : false}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => formatAxisTimeLabel(String(value))}
                                ticks={isLast ? detailXAxisTicks : undefined}
                                interval={isLast ? 0 : trendXAxisInterval}
                                height={isLast ? 22 : 0}
                              />
                              <YAxis
                                yAxisId="voltage"
                                tick={{ fill: "#88a8be", fontSize: chartFontSize }}
                                axisLine={{ stroke: "#355978", strokeOpacity: 0.35 }}
                                tickLine={false}
                                tickFormatter={(value) => `${Number(value).toFixed(2)}V`}
                                domain={["dataMin - 0.2", "dataMax + 0.2"]}
                                width={54}
                              />
                              <YAxis
                                yAxisId="temp"
                                orientation="right"
                                tick={{ fill: "#88a8be", fontSize: chartFontSize }}
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
                    ) : isHistoryLoading ? (
                      <div className="flex h-full min-h-0 items-center justify-center px-4">
                        <HistoryLoadingIndicator text={detailHistoryLoadingText} />
                      </div>
                    ) : (
                      <ChartPlaceholder text={detailChartPlaceholderText} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </NeonSection>
        {showHistoryRefreshOverlay ? <HistoryLoadingOverlay text={detailHistoryLoadingText} dimmed /> : null}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-[#1a3556] bg-[linear-gradient(180deg,#071124,#050c1d)] p-2">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_16%,rgba(67,176,255,0.12),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(255,186,97,0.08),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(60,132,255,0.08),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#8feaff]/55 to-transparent" />

      <div className={`relative grid h-full min-h-0 ${isCompactCanvas ? "grid-cols-[1.04fr_1.26fr] gap-2" : "grid-cols-[0.94fr_1.36fr] gap-2.5"}`}>
        <div className={`grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1.4fr)] ${isCompactCanvas ? "gap-1.5" : "gap-2"}`}>
          <NeonSection
            title={zh ? "概览" : "Overview"}
            compact={isCompactCanvas}
            className="px-1.5 pt-2.5 pb-1"
            headerVariant="bcu"
          >
            <div className="relative h-full min-h-0">
              <div className={`grid h-full min-h-0 grid-cols-3 ${isCompactCanvas ? "gap-1" : "gap-1.5"}`}>
                {[
                  {
                    title: zh ? "电压" : "Voltage",
                    accent: "#6ee7ff",
                    items: [
                      { label: zh ? "最高电压" : "Max V", value: hasVoltageOverviewData ? formatDisplayValue(voltageStats.maxVoltage, 2, "V") : "--", sub: hasVoltageOverviewData ? `#${topHighVoltage[0]?.cell ?? "-"}` : "--", subColor: "#ffd36b", tone: "text-[#ffd36b]" },
                      { label: zh ? "最低电压" : "Min V", value: hasVoltageOverviewData ? formatDisplayValue(voltageStats.minVoltage, 2, "V") : "--", sub: hasVoltageOverviewData ? `#${topLowVoltage[0]?.cell ?? "-"}` : "--", subColor: "#6ee7ff", tone: "text-[#6ee7ff]" },
                      { label: zh ? "最大ΔV" : "Max ΔV", value: hasVoltageOverviewData ? formatDisplayValue(voltageStats.voltageDelta, 2, "V") : "--", sub: "", subColor: "", tone: "text-[#a8f0ff]" },
                    ],
                  },
                  {
                    title: zh ? "温度" : "Temperature",
                    accent: "#ffb676",
                    items: [
                      { label: zh ? "最高温度" : "Max T", value: hasTemperatureOverviewData ? formatDisplayValue(temperatureStats.maxTemp, 1, "°C") : "--", sub: hasTemperatureOverviewData ? `#${topHotCells[0]?.cell ?? "-"}` : "--", subColor: "#ffb47a", tone: "text-[#ff9f6b]" },
                      { label: zh ? "最低温度" : "Min T", value: hasTemperatureOverviewData ? formatDisplayValue(temperatureStats.minTemp, 1, "°C") : "--", sub: hasTemperatureOverviewData ? `#${topColdCells[0]?.cell ?? "-"}` : "--", subColor: "#86d8ff", tone: "text-[#86d8ff]" },
                      { label: zh ? "最大ΔT" : "Max ΔT", value: hasTemperatureOverviewData ? formatDisplayValue(temperatureStats.tempDelta, 1, "°C") : "--", sub: "", subColor: "", tone: "text-[#ffd6a5]" },
                    ],
                  },
                  {
                    title: zh ? "电量" : "Energy",
                    accent: "#8ef14d",
                    items: [
                      { label: zh ? "日充电量" : "Charge", value: hasDailyEnergyStats ? formatDisplayValue(dailyEnergyStats.chargeWh, 2) : "--", sub: dailyEnergyStats.chargeWh != null ? "kWh" : "", subColor: "#b0d8a0", tone: "text-[#8ef14d]" },
                      { label: zh ? "日放电量" : "Discharge", value: hasDailyEnergyStats ? formatDisplayValue(dailyEnergyStats.dischargeWh, 2) : "--", sub: dailyEnergyStats.dischargeWh != null ? "kWh" : "", subColor: "#8ec8ff", tone: "text-[#57a8ff]" },
                      { label: zh ? "容量效率" : "Capacity Efficiency", value: hasDailyEnergyStats ? formatDisplayValue(dailyEnergyStats.roundTripEfficiency, 1, "%") : "--", sub: "", subColor: "", tone: "text-[#8af7bc]" },
                    ],
                  },
                ].map((group) => (
                  <InnerFrame key={group.title} title={group.title} accent={group.accent} compact={isCompactCanvas}>
                    <div className="grid h-full min-h-0 grid-rows-3 gap-0.5">
                      {group.items.map((item) => (
                        <div
                          key={item.label}
                          className={`flex h-full flex-col items-center justify-center rounded-[12px] border border-[#1e3d60] bg-[linear-gradient(180deg,rgba(14,30,62,0.95),rgba(10,20,46,0.98))] ${isTightCanvas ? "gap-1 px-1 py-0.5" : isCompactCanvas ? "gap-1.5 px-1.5 py-1" : "gap-2 px-2 py-1.5"}`}
                          style={{ boxShadow: "inset 0 0 12px rgba(25,80,148,0.12)" }}
                        >
                          <div className={`flex items-baseline gap-0.5 font-mono font-bold leading-none tracking-wide ${isTightCanvas ? "text-[0.96rem]" : isCompactCanvas ? "text-[1.08rem]" : "text-[1.22rem]"} ${item.tone}`}>
                            {item.value}
                            {item.sub ? (
                              <span
                                className={`font-sans font-semibold ${isTightCanvas ? "text-[0.68rem]" : isCompactCanvas ? "text-[0.74rem]" : "text-[0.78rem]"}`}
                                style={{ color: item.subColor }}
                              >
                                {item.sub}
                              </span>
                            ) : null}
                          </div>
                          <div className={`w-full truncate text-center font-medium leading-tight tracking-wide text-[#c2dcf2] ${isTightCanvas ? "text-[0.68rem]" : isCompactCanvas ? "text-[0.72rem]" : "text-[0.76rem]"}`}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </InnerFrame>
                ))}
              </div>
              {isOverviewCardLoading && !hasOverviewData && !hasDailyEnergyStats ? (
                <HistoryLoadingOverlay text={overviewCardLoadingText} backdrop={false} />
              ) : null}
            </div>
          </NeonSection>

          <div className="relative min-h-0 overflow-hidden">
            <BCUStatusQuery mode="history" date={date} hideCellSeries panelVariant="overview" historyData={bcuHistoryData} />
            {isOverviewBcuLoading && bcuHistoryData.length === 0 ? (
              <HistoryLoadingOverlay text={bcuLoadingText} backdrop={false} />
            ) : null}
          </div>
        </div>

        <div className="h-full min-h-0">
          <NeonSection
            title={zh ? "电压/温度趋势" : "Voltage / Temperature Trend"}
            className="h-full px-1.5 pt-2.5 pb-1"
            inlineSubtitle
            headerVariant="bcu"
            headerExtra={
              <div className="ml-auto flex items-center justify-end gap-4 self-center pr-1">
                <LegendItem label={zh ? "最大值" : "Max"} color="#ffd36b" />
                <LegendItem label={zh ? "最小值" : "Min"} color="#6ee7ff" />
              </div>
            }
          >
            <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
              <div className="flex min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#1f4068] bg-[linear-gradient(180deg,rgba(10,20,44,0.9),rgba(8,16,37,0.96))] p-2 shadow-[inset_0_0_16px_rgba(25,92,148,0.08)]">
                <div className="flex min-h-0 flex-1 items-stretch gap-2">
                  <div className="grid min-h-0 flex-1 grid-rows-[1.28fr_repeat(3,minmax(0,1fr))] overflow-hidden">
                  <div className="relative min-h-0 flex-[1.28] border-b border-[#214260]/90">
                    <div className="h-full min-h-0">
                      {hasVoltageTrendData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={voltageTrendData} syncId={trendSyncId} syncMethod="index" margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="#173354" strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="time" tick={false} axisLine={false} tickLine={false} interval={trendXAxisInterval} height={0} />
                            <YAxis
                              tick={{ fill: "#88a8be", fontSize: chartFontSize }}
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
                              dot={(props: any) => renderTrendHighlightDot(props, "isMaxHighlight", "#ffd36b", "#fff4cf", 4.5, 1.5)}
                              isAnimationActive={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="min"
                              name={zh ? "最小值" : "Min"}
                              stroke="#6ee7ff"
                              strokeWidth={2.2}
                              dot={(props: any) => renderTrendHighlightDot(props, "isMinHighlight", "#6ee7ff", "#d6fbff", 4.5, 1.5)}
                              isAnimationActive={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <ChartPlaceholder text={trendPlaceholderText} />
                      )}
                    </div>
                  </div>

                  {temperatureTrendCharts.map((chart, index) => {
                    const isLast = index === temperatureTrendCharts.length - 1
                    return (
                      <div key={chart.key} className={`relative min-h-0 flex-1 ${!isLast ? "border-b border-[#214260]/90" : ""}`}>
                        <div className="h-full min-h-0">
                          {chart.data.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chart.data} syncId={trendSyncId} syncMethod="index" margin={{ top: 8, right: 18, left: 0, bottom: isLast ? 6 : 0 }}>
                                <CartesianGrid stroke="#173354" strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                  dataKey="time"
                                  tick={isLast ? { fill: "#88a8be", fontSize: chartFontSize } : false}
                                  axisLine={false}
                                  tickLine={false}
                                  ticks={isLast ? trendXAxisTicks : undefined}
                                  interval={isLast ? 0 : trendXAxisInterval}
                                  height={isLast ? 22 : 0}
                                />
                                <YAxis
                                  tick={{ fill: "#88a8be", fontSize: chartFontSize }}
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
                                  dot={(props: any) => renderTrendHighlightDot(props, "isMaxHighlight", "#ffd36b", "#fff4cf", 4, 1.4)}
                                  isAnimationActive={false}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="min"
                                  name={zh ? "最小值" : "Min"}
                                  stroke="#6ee7ff"
                                  strokeWidth={1.9}
                                  dot={(props: any) => renderTrendHighlightDot(props, "isMinHighlight", "#6ee7ff", "#d6fbff", 4, 1.4)}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <ChartPlaceholder text={trendPlaceholderText} />
                          )}
                        </div>
                      </div>
                    )
                  })}
                  </div>

                  <div className="grid w-[172px] shrink-0 grid-rows-[1.28fr_repeat(3,minmax(0,1fr))] overflow-hidden rounded-[12px] border border-[#214260] bg-[linear-gradient(180deg,rgba(11,24,48,0.9),rgba(8,16,34,0.96))] self-stretch">
                  <div className="flex min-h-0 flex-[1.28] items-start border-b border-[#214260]/90 px-3 py-2">
                    <div className="w-full">
                      <div className="font-semibold leading-5 tracking-[0.04em] text-[#dff7ff]" style={{ fontSize: summaryTitleSize }}>{voltageTrendSummary.header}</div>
                      <div className="mt-3 space-y-2 leading-5 text-[#dff7ff]" style={{ fontSize: summaryTextSize }}>
                        <div>{voltageTrendSummary.maxText}</div>
                        <div className="text-[#bfe8ff]">{voltageTrendSummary.minText}</div>
                      </div>
                    </div>
                  </div>
                  {temperatureTrendSummaries.map((chart, index) => {
                    const isLast = index === temperatureTrendSummaries.length - 1
                    return (
                      <div key={`${chart.key}-summary`} className={`flex min-h-0 flex-1 items-start px-3 py-2 ${!isLast ? "border-b border-[#214260]/90" : ""}`}>
                        <div className="w-full">
                          <div className="font-semibold leading-5 tracking-[0.04em] text-[#dff7ff]" style={{ fontSize: summaryTitleSize }}>{chart.header}</div>
                          <div className="mt-3 space-y-2 leading-5 text-[#dff7ff]" style={{ fontSize: summaryTextSize }}>
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
              {isOverviewTrendLoading && !hasVoltageTrendData && !hasTemperatureTrendData ? (
                <HistoryLoadingOverlay text={trendLoadingText} backdrop={false} />
              ) : null}
            </div>
          </NeonSection>
        </div>
      </div>
    </div>
  )
}


