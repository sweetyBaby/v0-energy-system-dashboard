"use client"

import { useMemo, useState, type ReactNode } from "react"
import { AlertTriangle, Check, ChevronsUpDown, Thermometer, TrendingDown, TrendingUp, Waves } from "lucide-react"
import { CartesianGrid, Customized, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useLanguage } from "@/components/language-provider"
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
  children,
}: {
  title: string
  subtitle?: string
  badge?: string
  inlineSubtitle?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={`relative flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-[#254873]/80 bg-[radial-gradient(circle_at_top_right,rgba(38,109,178,0.15),transparent_28%),linear-gradient(180deg,rgba(10,19,44,0.97),rgba(6,12,29,0.98))] p-3 ${edgeGlow}`}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[20px] border border-[#8feaff]/[0.05]" />
      <div className="pointer-events-none absolute left-3 top-3 h-5 w-[2px] rounded-full bg-[#3fe7ff]/90 shadow-[0_0_12px_rgba(63,231,255,0.85)]" />
      <div className="pointer-events-none absolute inset-x-4 top-[50px] h-px bg-gradient-to-r from-[#274f78]/70 via-[#78dfff]/45 to-transparent" />
      <div className={`relative flex ${inlineSubtitle ? "items-center" : "items-start"} justify-between gap-3 pl-3 ${inlineSubtitle ? "mb-2" : "mb-3"}`}>
        <div className={inlineSubtitle ? "flex items-center gap-3" : ""}>
          <div className="text-[0.98rem] font-semibold tracking-[0.08em] text-[#8ceeff]">{title}</div>
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
      <div className="relative min-h-0 flex-1 pl-3">{children}</div>
    </section>
  )
}

function InnerFrame({ title, accent = "#74ebff", children }: { title: string; accent?: string; children: ReactNode }) {
  return (
    <div className="rounded-[16px] border border-[#1f4068] bg-[linear-gradient(180deg,rgba(10,20,44,0.9),rgba(8,16,37,0.96))] p-2 shadow-[inset_0_0_16px_rgba(25,92,148,0.08)]">
      <div className="mb-1.5 flex items-center gap-2">
        <div className="h-5 w-[2px] rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 10px ${accent}` }} />
        <div className="text-[0.86rem] font-semibold tracking-[0.06em] text-[#d8f7ff]">{title}</div>
      </div>
      {children}
    </div>
  )
}

function MetricCard({ title, value, tone, icon, compact = false, horizontal = false }: { title: string; value: string; tone: string; icon: ReactNode; compact?: boolean; horizontal?: boolean }) {
  if (horizontal) {
    return (
      <div className={`rounded-[14px] border border-[#25466d] bg-[linear-gradient(180deg,rgba(13,27,58,0.92),rgba(11,20,44,0.98))] shadow-[inset_0_0_18px_rgba(69,155,255,0.06)] ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}>
        <div className="flex items-center justify-between gap-2">
          <div className={`flex min-w-0 items-center gap-1.5 ${compact ? "text-[9px] tracking-[0.04em]" : "text-[10px] tracking-[0.08em]"} ${mutedText}`}>
            {/* {icon} */}
            <span className="min-w-0 truncate leading-tight text-[0.78rem] ">{title}</span>
          </div>
          <div className={`shrink-0 font-mono font-semibold leading-none ${compact ? "text-[1.18rem] tracking-[0.02em]" : "text-[1.35rem] tracking-[0.03em]"} ${tone}`}>{value}</div>
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

function LegendItem({ label, color, dashed = false }: { label: string; color: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-[#96bdd4]">
      <span className={`block h-[2px] w-5 ${dashed ? "border-t-2 border-dashed" : ""}`} style={dashed ? { borderColor: color } : { backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
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

function RankingItem({ title, value, extra, active, onClick }: { title: string; value: string; extra: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[12px] border px-2.5 py-2 text-left transition-all ${
        active
          ? "border-[#39eddc] bg-[linear-gradient(180deg,rgba(14,64,74,0.72),rgba(10,36,45,0.94))] shadow-[0_0_16px_rgba(57,237,220,0.12),inset_0_0_18px_rgba(57,237,220,0.07)]"
          : "border-[#234160] bg-[linear-gradient(180deg,rgba(14,28,58,0.88),rgba(10,19,40,0.96))] hover:border-[#3a78a7]"
      }`}
    >
      {extra ? (
        <div className="grid gap-1">
          <div className="grid grid-cols-[auto_1fr] items-center gap-2">
            <div className="text-[0.95rem] font-semibold text-[#eefbff]">{title}</div>
            <div className="text-right font-mono text-[1.15rem] font-semibold text-[#ffe6a3]">{value}</div>
          </div>
          <div className={`text-left text-[10px] ${mutedText}`}>{extra}</div>
        </div>
      ) : (
        <div className="grid grid-cols-[auto_1fr] items-center gap-2">
          <div className="text-[0.95rem] font-semibold text-[#eefbff]">{title}</div>
          <div className="text-right font-mono text-[1.15rem] font-semibold text-[#ffe6a3]">{value}</div>
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

export function CellHistoryReplayPanel({ date, selectedCell, onSelectedCellChange }: { date: string; selectedCell: number | null; onSelectedCellChange?: (cell: number | null) => void }) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const [temperatureTab, setTemperatureTab] = useState<TemperatureChannelKey>("t1")

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
  const topTempDiffCells = useMemo(() => cellMetrics.slice().sort((a, b) => b.maxIntraTempDiff - a.maxIntraTempDiff).slice(0, 3), [cellMetrics])

  const voltageFleetData = useMemo(
    () =>
      historyData.map((point) => {
        const row = { time: point.time } as FleetCurvePoint
        const values: number[] = []

        for (let cell = 1; cell <= CELL_COUNT; cell += 1) {
          const value = point[`v${cell}`]
          row[`c${cell}`] = value
          values.push(value)
        }

        const avg = average(values)
        const std = Math.sqrt(average(values.map((value) => (value - avg) ** 2)))
        const band = Math.max(std * 1.8, 0.018)

        row.avg = Number(avg.toFixed(3))
        row.upper = Number((avg + band).toFixed(3))
        row.lower = Number((avg - band).toFixed(3))

        return row
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

  const voltageHighlightCells = useMemo(
    () => Array.from(new Set([...topHighVoltage.map((item) => item.cell), ...topLowVoltage.map((item) => item.cell), ...topVoltageDeviationCells.map((item) => item.cell)])),
    [topHighVoltage, topLowVoltage, topVoltageDeviationCells]
  )

  const voltageHighlightSeries = useMemo<VoltageHighlightSeries[]>(
    () => [
      ...topHighVoltage.map((item, index) => ({ cell: item.cell, color: ["#ffb36b", "#7cf5ff", "#9bffb7"][index] ?? "#ffb36b" })),
      ...topLowVoltage
        .filter((item) => !topHighVoltage.some((high) => high.cell === item.cell))
        .map((item, index) => ({ cell: item.cell, color: ["#8fdcff", "#b7a4ff", "#f7a8c0"][index] ?? "#8fdcff" })),
      ...topVoltageDeviationCells
        .filter((item) => !topHighVoltage.some((high) => high.cell === item.cell) && !topLowVoltage.some((low) => low.cell === item.cell))
        .map((item, index) => ({ cell: item.cell, color: ["#8cf7d2", "#ffd56d", "#96ffd6"][index] ?? "#8cf7d2" })),
    ],
    [topHighVoltage, topLowVoltage, topVoltageDeviationCells]
  )

  const temperatureFleetCharts = useMemo<TemperatureFleetChart[]>(
    () =>
      ([
        { key: "t1", title: "T1" },
        { key: "t2", title: "T2" },
        { key: "t3", title: "T3" },
      ] as const).map(({ key, title }) => {
        const highlightedCellSet = new Set<number>()
        const topCellsByPoint = historyData.map((point) =>
          Array.from({ length: CELL_COUNT }, (_, index) => ({
            cell: index + 1,
            value: Number(point[`${key}_${index + 1}`].toFixed(1)),
          }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 3)
        )

        const data = historyData.map((point, pointIndex) => {
          const row = { time: point.time } as FleetCurvePoint
          const values: number[] = []

          for (let cell = 1; cell <= CELL_COUNT; cell += 1) {
            const value = point[`${key}_${cell}`]
            row[`c${cell}`] = Number(value.toFixed(1))
            values.push(value)
          }

          const avg = average(values)
          const std = Math.sqrt(average(values.map((value) => (value - avg) ** 2)))
          const band = Math.max(std * 1.7, 0.8)

          row.avg = Number(avg.toFixed(1))
          row.upper = Number((avg + band).toFixed(1))
          row.lower = Number((avg - band).toFixed(1))

          topCellsByPoint[pointIndex]?.forEach((item) => {
            highlightedCellSet.add(item.cell)
            row[`hot_${item.cell}`] = item.value
          })

          return row
        })

        return { key, title, data, highlightedCells: Array.from(highlightedCellSet) }
      }),
    [historyData]
  )

  const handleSelectCell = (cell: number) => onSelectedCellChange?.(cell)
  const temperatureAlertPalette = ["#ffb36b", "#7cf5ff", "#9bffb7", "#ffd56d", "#f7a8c0", "#9bb8ff"]
  const activeTemperatureChart = temperatureFleetCharts.find((item) => item.key === temperatureTab) ?? temperatureFleetCharts[0]

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-[#1a3556] bg-[linear-gradient(180deg,#071124,#050c1d)] p-3">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_16%,rgba(67,176,255,0.12),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(255,186,97,0.08),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(60,132,255,0.08),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#8feaff]/55 to-transparent" />

      <div className="relative grid h-full min-h-0 grid-cols-1 gap-3 xl:grid-cols-[0.94fr_1.36fr]">
        <div className="grid min-h-0 grid-rows-[auto_minmax(0,0.9fr)_minmax(0,1fr)] gap-3">
          <NeonSection title={zh ? "概览" : "Overview"}  >
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
              <MetricCard compact horizontal title={zh ? "最高电压" : "Max Voltage"} value={`${voltageStats.maxVoltage.toFixed(2)}V`} tone="text-[#aef8ff]" icon={<TrendingUp className="h-3.5 w-3.5 text-[#6ee7ff]" />} />
              <MetricCard compact horizontal title={zh ? "最低电压" : "Min Voltage"} value={`${voltageStats.minVoltage.toFixed(2)}V`} tone="text-[#aef8ff]" icon={<TrendingDown className="h-3.5 w-3.5 text-[#6ee7ff]" />} />
              <MetricCard compact horizontal title={zh ? "平均电压" : "Avg Voltage"} value={`${voltageStats.avgVoltage.toFixed(2)}V`} tone="text-[#dffbff]" icon={<Waves className="h-3.5 w-3.5 text-[#7effe3]" />} />
              <MetricCard compact horizontal title={zh ? "最大压差 ΔV" : "Spread ΔV"} value={`${voltageStats.voltageDelta.toFixed(2)}V`} tone="text-[#ffd892]" icon={<AlertTriangle className="h-3.5 w-3.5 text-[#ffd892]" />} />
              <MetricCard compact horizontal title={zh ? "最高温度" : "Max Temp"} value={`${temperatureStats.maxTemp.toFixed(1)}°C`} tone="text-[#aef8ff]" icon={<Thermometer className="h-3.5 w-3.5 text-[#6ee7ff]" />} />
              <MetricCard compact horizontal title={zh ? "最低温度" : "Min Temp"} value={`${temperatureStats.minTemp.toFixed(1)}°C`} tone="text-[#aef8ff]" icon={<TrendingDown className="h-3.5 w-3.5 text-[#6ee7ff]" />} />
              <MetricCard compact horizontal title={zh ? "平均温度" : "Avg Temp"} value={`${temperatureStats.avgTemp.toFixed(1)}°C`} tone="text-[#dffbff]" icon={<Waves className="h-3.5 w-3.5 text-[#7effe3]" />} />
              <MetricCard compact horizontal title={zh ? "最大温差 ΔT" : "Spread ΔT"} value={`${temperatureStats.tempDelta.toFixed(1)}°C`} tone="text-[#ffd892]" icon={<AlertTriangle className="h-3.5 w-3.5 text-[#ffd892]" />} />
            </div>
          </NeonSection>

          <div className="grid min-h-0 grid-cols-1 gap-3 2xl:grid-cols-2">
            <NeonSection title={zh ? "电压趋势" : "Voltage Trend"} >
              <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2 rounded-[16px] border border-[#1f4068] bg-[linear-gradient(180deg,rgba(10,20,44,0.9),rgba(8,16,37,0.96))] px-2.5 py-2 shadow-[inset_0_0_16px_rgba(25,92,148,0.08)]">
                <div className="min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overviewData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="#173354" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: "#88a8be", fontSize: 10 }} axisLine={false} tickLine={false} interval={11} />
                      <YAxis tick={{ fill: "#88a8be", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Number(value).toFixed(2)}V`} />
                      <Tooltip
                        labelStyle={{ color: "#dffbff" }}
                        contentStyle={{ border: "1px solid #29547f", borderRadius: "12px", background: "rgba(7,17,36,0.96)" }}
                        itemStyle={{ color: "#bfe8ff", paddingTop: 2, paddingBottom: 2 }}
                        formatter={(value: number, name: string) => {
                          const labelMap: Record<string, string> = zh
                            ? { maxVoltage: "最高电压", minVoltage: "最低电压", avgVoltage: "平均电压", voltageDelta: "压差" }
                            : { maxVoltage: "Max Voltage", minVoltage: "Min Voltage", avgVoltage: "Avg Voltage", voltageDelta: "Spread" }
                          return [`${Number(value).toFixed(3)}V`, labelMap[name] ?? name]
                        }}
                      />
                      <Line type="monotone" dataKey="maxVoltage" stroke="#7cf5ff" strokeWidth={2.1} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="minVoltage" stroke="#4f9fff" strokeWidth={1.9} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="avgVoltage" stroke="#f4c95d" strokeWidth={1.9} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="voltageDelta" stroke="#9bf9ff" strokeWidth={1.4} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <LegendItem label="Max" color="#7cf5ff" />
                  <LegendItem label="Min" color="#4f9fff" />
                  <LegendItem label="Avg" color="#f4c95d" />
                  <LegendItem label="ΔV" color="#9bf9ff" dashed />
                </div>
              </div>
            </NeonSection>

            <NeonSection title={zh ? "温度趋势" : "Temperature Trend"} >
              <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2 rounded-[16px] border border-[#1f4068] bg-[linear-gradient(180deg,rgba(10,20,44,0.9),rgba(8,16,37,0.96))] px-2.5 py-2 shadow-[inset_0_0_16px_rgba(25,92,148,0.08)]">
                <div className="min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overviewData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="#173354" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: "#88a8be", fontSize: 10 }} axisLine={false} tickLine={false} interval={11} />
                      <YAxis tick={{ fill: "#88a8be", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Number(value).toFixed(1)}°C`} />
                      <Tooltip
                        labelStyle={{ color: "#dffbff" }}
                        contentStyle={{ border: "1px solid #29547f", borderRadius: "12px", background: "rgba(7,17,36,0.96)" }}
                        itemStyle={{ color: "#bfe8ff", paddingTop: 2, paddingBottom: 2 }}
                        formatter={(value: number, name: string) => {
                          const labelMap: Record<string, string> = zh
                            ? { maxTemp: "最高温度", minTemp: "最低温度", avgTemp: "平均温度", tempDelta: "温差" }
                            : { maxTemp: "Max Temp", minTemp: "Min Temp", avgTemp: "Avg Temp", tempDelta: "Spread" }
                          return [`${Number(value).toFixed(1)}°C`, labelMap[name] ?? name]
                        }}
                      />
                      <Line type="monotone" dataKey="maxTemp" stroke="#f6c35c" strokeWidth={2.1} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="minTemp" stroke="#7cf5ff" strokeWidth={1.9} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="avgTemp" stroke="#ffdca0" strokeWidth={1.9} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="tempDelta" stroke="#8feeff" strokeWidth={1.4} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <LegendItem label="Max" color="#f6c35c" />
                  <LegendItem label="Min" color="#7cf5ff" />
                  <LegendItem label="Avg" color="#ffdca0" />
                  <LegendItem label="ΔT" color="#8feeff" dashed />
                </div>
              </div>
            </NeonSection>
          </div>

          <NeonSection title={zh ? "电压/温差分析" : "Voltage / Temperature Analysis"} >
            <div className="grid h-full min-h-0 grid-cols-1 gap-2 xl:grid-cols-2">
              <div className="grid min-h-0 grid-cols-1 gap-2 2xl:grid-cols-2">
                <InnerFrame title={zh ? "电压最高 TOP3" : "Highest Voltage TOP3"} accent="#ffc970"><div className="space-y-1">{topHighVoltage.map((item) => <RankingItem key={`high-${item.cell}`} title={`#${item.cell}`} value={`${item.voltageMax.toFixed(2)}V`} extra={item.voltageMaxAt} active={selectedCell === item.cell} onClick={() => handleSelectCell(item.cell)} />)}</div></InnerFrame>
                <InnerFrame title={zh ? "电压偏离 TOP3" : "Voltage Offset TOP3"} accent="#8cf7d2"><div className="space-y-1">{topVoltageDeviationCells.map((item) => <RankingItem key={`offset-${item.cell}`} title={`#${item.cell}`} value={`${item.voltageDeviation.toFixed(3)}V`} extra={zh ? `均值 ${item.voltageAvg.toFixed(2)}V` : `Avg ${item.voltageAvg.toFixed(2)}V`} active={selectedCell === item.cell} onClick={() => handleSelectCell(item.cell)} />)}</div></InnerFrame>
              </div>
              <div className="grid min-h-0 grid-cols-1 gap-2 2xl:grid-cols-2">
                <InnerFrame title={zh ? "电压最低 TOP3" : "Lowest Voltage TOP3"} accent="#86e8ff"><div className="space-y-1">{topLowVoltage.map((item) => <RankingItem key={`low-${item.cell}`} title={`#${item.cell}`} value={`${item.voltageMin.toFixed(2)}V`} extra={item.voltageMinAt} active={selectedCell === item.cell} onClick={() => handleSelectCell(item.cell)} />)}</div></InnerFrame>
                <InnerFrame title={zh ? "温差最高 TOP3" : "Highest Temp Diff TOP3"} accent="#ffb676"><div className="space-y-1">{topTempDiffCells.map((item) => <RankingItem key={`tempdiff-${item.cell}`} title={`#${item.cell}`} value={`${item.maxIntraTempDiff.toFixed(1)}°C`} extra={item.maxIntraTempDiffAt} active={selectedCell === item.cell} onClick={() => handleSelectCell(item.cell)} />)}</div></InnerFrame>
              </div>
            </div>
          </NeonSection>
        </div>

        <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          <NeonSection title={zh ? "50电芯电压历史趋势" : "50-Cell Voltage History"} >
            <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2 rounded-[16px] border border-[#1f4068] bg-[linear-gradient(180deg,rgba(10,20,44,0.9),rgba(8,16,37,0.96))] px-3 py-2 shadow-[inset_0_0_16px_rgba(25,92,148,0.08)]">
              <div className="min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={voltageFleetData} margin={{ top: 16, right: 18, left: 6, bottom: 46 }}>
                    <CartesianGrid stroke="#173354" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: "#88a8be", fontSize: 10 }} axisLine={false} tickLine={false} interval={11} />
                    <YAxis tick={{ fill: "#88a8be", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Number(value).toFixed(2)}V`} domain={["dataMin - 0.03", "dataMax + 0.03"]} label={{ value: zh ? "电芯电压 (V)" : "Cell Voltage (V)", angle: -90, position: "insideLeft", offset: 18, style: { fontSize: 9, fill: "#7fa4be" } }} />
                    <Tooltip
                      content={
                        <FleetTooltip
                          unit="V"
                          valueFormatter={(value) => `${value.toFixed(3)}V`}
                          maxRows={4}
                          labelForKey={(key) => {
                            const cell = Number(String(key).replace("c", ""))
                            if (Number.isNaN(cell)) return null
                            if (selectedCell !== null && cell === selectedCell) return zh ? `当前 #${cell}` : `Current #${cell}`
                            if (topHighVoltage.some((item) => item.cell === cell)) return zh ? `高压 #${cell}` : `High #${cell}`
                            if (topLowVoltage.some((item) => item.cell === cell)) return zh ? `低压 #${cell}` : `Low #${cell}`
                            if (topVoltageDeviationCells.some((item) => item.cell === cell)) return zh ? `偏离 #${cell}` : `Offset #${cell}`
                            return null
                          }}
                        />
                      }
                    />
                    {voltagePhaseRegions.map((region, idx) => {
                      const fills = { charge: "#22c87a", discharge: "#ff8c4b", rest: "#5580b0" }
                      const opacities = { charge: 0.09, discharge: 0.09, rest: 0.04 }
                      return <ReferenceArea key={`phase-bg-${idx}`} x1={region.x1} x2={region.x2} fill={fills[region.phase]} fillOpacity={opacities[region.phase]} stroke="none" />
                    })}
                    {Array.from({ length: CELL_COUNT }, (_, index) => {
                      const cell = index + 1
                      return <Line key={`voltage-cluster-${cell}`} type="monotone" dataKey={`c${cell}`} stroke="#7fa4be" strokeWidth={0.95} strokeOpacity={voltageHighlightCells.includes(cell) ? 0.08 : 0.16} dot={false} isAnimationActive={false} />
                    })}
                    {voltageHighlightSeries.map((item) => (
                      <Line key={`voltage-highlight-${item.cell}`} type="monotone" dataKey={`c${item.cell}`} stroke={item.color} strokeWidth={2.2} dot={false} isAnimationActive={false} />
                    ))}
                    {selectedCell !== null && !voltageHighlightCells.includes(selectedCell) ? <Line type="monotone" dataKey={`c${selectedCell}`} stroke="#ffffff" strokeWidth={2.4} dot={false} isAnimationActive={false} /> : null}
                    <Customized component={({ xAxisMap, yAxisMap }: any) => {
                      const xa = Object.values((xAxisMap ?? {}) as Record<string, any>)[0]
                      const ya = Object.values((yAxisMap ?? {}) as Record<string, any>)[0]
                      if (!xa?.scale || !ya?.scale) return null
                      const re: number = (xa.x as number) + (xa.width as number)
                      const sy: number = (xa.y as number) + (xa.height as number) + 2
                      const sh = 18
                      const pf = { charge: "rgba(34,200,122,0.22)", discharge: "rgba(255,140,75,0.22)", rest: "rgba(80,130,190,0.16)" }
                      const pb = { charge: "rgba(34,200,122,0.50)", discharge: "rgba(255,140,75,0.50)", rest: "rgba(80,130,190,0.38)" }
                      const pl = { charge: zh ? "充电" : "Charging", discharge: zh ? "放电" : "Discharge", rest: zh ? "静置" : "Rest" }
                      const ps = { charge: zh ? "充" : "C", discharge: zh ? "放" : "D", rest: zh ? "静" : "R" }
                      const pc = { charge: "#4de89f", discharge: "#ffb07a", rest: "#7fa4be" }
                      return (
                        <g>
                          {voltagePhaseRegions.map((r, i) => {
                            const rx1 = xa.scale(r.x1) as number
                            const last = i === voltagePhaseRegions.length - 1
                            const rx2 = last ? re : (xa.scale(r.x2) as number)
                            const rw = Math.max(rx2 - rx1, 6)
                            return (
                              <g key={`vs${i}`}>
                                <rect x={rx1} y={sy} width={rw} height={sh} fill={pf[r.phase]} />
                                {!last && <line x1={rx2} y1={sy} x2={rx2} y2={sy + sh} stroke={pb[r.phase]} strokeWidth={1} />}
                                {rw >= 24 && <text x={rx1 + rw / 2} y={sy + 12} textAnchor="middle" fill={pc[r.phase]} fontSize={9} fontWeight="500">{pl[r.phase]}</text>}
                                {rw >= 10 && rw < 24 && <text x={rx1 + rw / 2} y={sy + 12} textAnchor="middle" fill={pc[r.phase]} fontSize={8} fontWeight="600">{ps[r.phase]}</text>}
                              </g>
                            )
                          })}
                        </g>
                      )
                    }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <LegendItem label={zh ? "正常曲线虚化" : "Ghosted curves"} color="#7fa4be" />
                <LegendItem label={zh ? "极值曲线高亮" : "Extreme curves"} color="#ffb36b" />
                <div className="flex items-center gap-3 text-[11px] text-[#96bdd4]">
                  <span className="inline-block h-3 w-3 rounded-[3px]" style={{ background: "rgba(34,200,122,0.28)" }} /><span>{zh ? "充电" : "Charging"}</span>
                  <span className="inline-block h-3 w-3 rounded-[3px]" style={{ background: "rgba(255,140,75,0.28)" }} /><span>{zh ? "放电" : "Discharge"}</span>
                  <span className="inline-block h-3 w-3 rounded-[3px]" style={{ background: "rgba(80,130,190,0.20)" }} /><span>{zh ? "静置" : "Rest"}</span>
                </div>
                {selectedCell !== null && !voltageHighlightCells.includes(selectedCell) ? <LegendItem label={zh ? `当前电芯 #${selectedCell}` : `Cell #${selectedCell}`} color="#ffffff" /> : null}
              </div>
            </div>
          </NeonSection>

          <NeonSection title={zh ? "50电芯温度历史趋势" : "50-Cell Temperature History"} >
            <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-2 rounded-[16px] border border-[#1f4068] bg-[linear-gradient(180deg,rgba(10,20,44,0.9),rgba(8,16,37,0.96))] px-3 py-2 shadow-[inset_0_0_16px_rgba(25,92,148,0.08)]">
              <div className="flex flex-wrap gap-2">
                {([
                  { key: "t1", label: zh ? "T1（前端点位）" : "T1" },
                  { key: "t2", label: zh ? "T2（中部点位）" : "T2" },
                  { key: "t3", label: zh ? "T3（后端点位）" : "T3" },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTemperatureTab(tab.key)}
                    className={`rounded-[10px] border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                      temperatureTab === tab.key
                        ? "border-[#53e8ff] bg-[linear-gradient(180deg,rgba(18,86,96,0.72),rgba(10,38,49,0.94))] text-[#efffff] shadow-[0_0_14px_rgba(83,232,255,0.16)]"
                        : "border-[#27476b] bg-[#0a1630]/88 text-[#a9cde2] hover:border-[#3c78a4] hover:text-[#ebfbff]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="min-h-0">
                {activeTemperatureChart ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activeTemperatureChart.data} margin={{ top: 16, right: 18, left: 6, bottom: 46 }}>
                      <CartesianGrid stroke="#173354" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: "#88a8be", fontSize: 10 }} axisLine={false} tickLine={false} interval={11} />
                      <YAxis tick={{ fill: "#88a8be", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Number(value).toFixed(1)}°C`} domain={["dataMin - 1", "dataMax + 1"]} label={{ value: zh ? "温度 (°C)" : "Temp (°C)", angle: -90, position: "insideLeft", offset: 16, style: { fontSize: 9, fill: "#7fa4be" } }} />
                      <Tooltip
                        content={({ active, label }) => {
                          if (!active || !label || !activeTemperatureChart) return null
                          const currentPoint = activeTemperatureChart.data.find((item) => item.time === label)
                          if (!currentPoint) return null

                          const hottestRows = Array.from({ length: CELL_COUNT }, (_, index) => ({
                            cell: index + 1,
                            value: Number(currentPoint[`c${index + 1}`]),
                          }))
                            .sort((a, b) => b.value - a.value)
                            .slice(0, 3)

                          const selectedValue = selectedCell !== null ? Number(currentPoint[`c${selectedCell}`]) : null

                          return (
                            <div className="rounded-[12px] border border-[#29547f] bg-[rgba(7,17,36,0.96)] px-3 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
                              <div className="mb-1 text-[10px] font-semibold text-[#dffbff]">{label}</div>
                              <div className="space-y-1">
                                {hottestRows.map((item, index) => (
                                  <div key={`temp-hot-${item.cell}`} className="flex items-center justify-between gap-3 text-[10px]">
                                    <div className="flex items-center gap-2 text-[#bfe8ff]">
                                      {index === 0 ? (
                                        <span
                                          className="h-2.5 w-2.5 rotate-45 rounded-[1px] border"
                                          style={{ backgroundColor: temperatureAlertPalette[index], borderColor: "#f8fbff" }}
                                        />
                                      ) : (
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: temperatureAlertPalette[index] }} />
                                      )}
                                      <span className={index === 0 ? "font-semibold text-[#f8fbff]" : undefined}>{`${zh ? "高温" : "Hot"} #${item.cell}`}</span>
                                    </div>
                                    <span className="font-mono text-[#fff1b3]">{`${item.value.toFixed(1)}°C`}</span>
                                  </div>
                                ))}
                                {selectedCell !== null && selectedValue !== null && !hottestRows.some((item) => item.cell === selectedCell) ? (
                                  <div className="flex items-center justify-between gap-3 text-[10px]">
                                    <div className="flex items-center gap-2 text-[#bfe8ff]">
                                      <span className="h-2 w-2 rounded-full bg-[#ffffff]" />
                                      <span>{zh ? `当前 #${selectedCell}` : `Current #${selectedCell}`}</span>
                                    </div>
                                    <span className="font-mono text-[#fff1b3]">{`${selectedValue.toFixed(1)}°C`}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          )
                        }}
                      />
                      {voltagePhaseRegions.map((region, idx) => {
                        const fills = { charge: "#22c87a", discharge: "#ff8c4b", rest: "#5580b0" }
                        const opacities = { charge: 0.09, discharge: 0.09, rest: 0.04 }
                        return <ReferenceArea key={`temp-phase-bg-${idx}`} x1={region.x1} x2={region.x2} fill={fills[region.phase]} fillOpacity={opacities[region.phase]} stroke="none" />
                      })}
                      {Array.from({ length: CELL_COUNT }, (_, index) => {
                        const cell = index + 1
                        const isHighlighted = activeTemperatureChart.highlightedCells.includes(cell) || selectedCell === cell
                        return <Line key={`${activeTemperatureChart.key}-cluster-${cell}`} type="stepAfter" dataKey={`c${cell}`} stroke="#7fa4be" strokeWidth={1} strokeOpacity={isHighlighted ? 0.04 : 0.14} dot={false} isAnimationActive={false} />
                      })}
                      {activeTemperatureChart.highlightedCells.map((cell, index) => (
                        <Line
                          key={`${activeTemperatureChart.key}-hot-${cell}`}
                          type="stepAfter"
                          dataKey={`hot_${cell}`}
                          stroke={temperatureAlertPalette[index % temperatureAlertPalette.length]}
                          strokeWidth={2.2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      ))}
                      {selectedCell !== null && !activeTemperatureChart.highlightedCells.includes(selectedCell) ? <Line type="stepAfter" dataKey={`c${selectedCell}`} stroke="#ffffff" strokeWidth={2.2} dot={false} isAnimationActive={false} /> : null}
                      <Line type="stepAfter" dataKey="avg" stroke="#f3fbff" strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Customized component={({ xAxisMap }: any) => {
                        const xa = Object.values((xAxisMap ?? {}) as Record<string, any>)[0]
                        if (!xa?.scale) return null
                        const re: number = (xa.x as number) + (xa.width as number)
                        const sy: number = (xa.y as number) + (xa.height as number) + 2
                        const sh = 18
                        const pf = { charge: "rgba(34,200,122,0.22)", discharge: "rgba(255,140,75,0.22)", rest: "rgba(80,130,190,0.16)" }
                        const pb2 = { charge: "rgba(34,200,122,0.50)", discharge: "rgba(255,140,75,0.50)", rest: "rgba(80,130,190,0.38)" }
                        const pl = { charge: zh ? "充电" : "Charging", discharge: zh ? "放电" : "Discharge", rest: zh ? "静置" : "Rest" }
                        const ps = { charge: zh ? "充" : "C", discharge: zh ? "放" : "D", rest: zh ? "静" : "R" }
                        const pc = { charge: "#4de89f", discharge: "#ffb07a", rest: "#7fa4be" }
                        return (
                          <g>
                            {voltagePhaseRegions.map((r, i) => {
                              const rx1 = xa.scale(r.x1) as number
                              const last = i === voltagePhaseRegions.length - 1
                              const rx2 = last ? re : (xa.scale(r.x2) as number)
                              const rw = Math.max(rx2 - rx1, 6)
                              return (
                                <g key={`ts${i}`}>
                                  <rect x={rx1} y={sy} width={rw} height={sh} fill={pf[r.phase]} />
                                  {!last && <line x1={rx2} y1={sy} x2={rx2} y2={sy + sh} stroke={pb2[r.phase]} strokeWidth={1} />}
                                  {rw >= 24 && <text x={rx1 + rw / 2} y={sy + 12} textAnchor="middle" fill={pc[r.phase]} fontSize={9} fontWeight="500">{pl[r.phase]}</text>}
                                  {rw >= 10 && rw < 24 && <text x={rx1 + rw / 2} y={sy + 12} textAnchor="middle" fill={pc[r.phase]} fontSize={8} fontWeight="600">{ps[r.phase]}</text>}
                                </g>
                              )
                            })}
                          </g>
                        )
                      }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <LegendItem label={zh ? "正常曲线虚化" : "Ghosted curves"} color="#7fa4be" />
                <LegendItem label={zh ? "高温曲线高亮" : "Hot curves"} color="#ffb36b" />
                <div className="flex items-center gap-3 text-[11px] text-[#96bdd4]">
                  <span className="inline-block h-3 w-3 rounded-[3px]" style={{ background: "rgba(34,200,122,0.28)" }} /><span>{zh ? "充电" : "Charging"}</span>
                  <span className="inline-block h-3 w-3 rounded-[3px]" style={{ background: "rgba(255,140,75,0.28)" }} /><span>{zh ? "放电" : "Discharge"}</span>
                  <span className="inline-block h-3 w-3 rounded-[3px]" style={{ background: "rgba(80,130,190,0.20)" }} /><span>{zh ? "静置" : "Rest"}</span>
                </div>
                {selectedCell !== null && !activeTemperatureChart?.highlightedCells.includes(selectedCell) ? <LegendItem label={zh ? `当前电芯 #${selectedCell}` : `Cell #${selectedCell}`} color="#ffffff" /> : null}
              </div>
            </div>
          </NeonSection>
        </div>
      </div>
    </div>
  )
}
