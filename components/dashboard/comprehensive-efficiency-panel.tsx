"use client"

import { useEffect, useId, useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  LegendProps,
  Line,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts"
import { LineChartIcon, Table } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { CustomRangePicker } from "@/components/dashboard/custom-range-picker"
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"

type RangeKey = "week" | "month" | "year" | "custom"
type ViewMode = "chart" | "table"
type SeriesKey =
  | "chargeCapacity"
  | "dischargeCapacity"
  | "chargeEnergy"
  | "dischargeEnergy"
  | "capacityEfficiency"
  | "energyEfficiency"

type EfficiencyPoint = {
  label: string
  chargeCapacity: number
  dischargeCapacity: number
  chargeEnergy: number
  dischargeEnergy: number
  capacityEfficiency: number
  energyEfficiency: number
}

type ComprehensiveEfficiencyPanelProps = {
  compact?: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000
const TOOLTIP_SURFACE = {
  background: "linear-gradient(180deg, rgba(8,18,42,0.98), rgba(9,20,46,0.94))",
  border: "1px solid rgba(67, 115, 184, 0.42)",
  borderRadius: "14px",
  boxShadow: "0 14px 30px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04)",
}

const toDayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return toDayStart(next)
}

const getDayDiff = (from: Date, to: Date) =>
  Math.round((toDayStart(to).getTime() - toDayStart(from).getTime()) / DAY_MS)

const getRangeLength = (from: Date, to: Date) => getDayDiff(from, to) + 1

function ViewIconChart({ active }: { active: boolean }) {
  return <LineChartIcon className="h-[16px] w-[16px]" style={{ color: active ? "#07162b" : "#6f86b7" }} />
}

function ViewIconTable({ active }: { active: boolean }) {
  return <Table className="h-[16px] w-[16px]" style={{ color: active ? "#07162b" : "#6f86b7" }} />
}

const yearMonthLabels = {
  zh: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
} as const

const buildLastWeekData = (): EfficiencyPoint[] => {
  const today = new Date()

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - 6 + index)

    const chargeCapacity = 86 + index * 1.5 + (index % 3) * 2.5
    const dischargeCapacity = chargeCapacity * 0.845 + (index % 2) * 1.8
    const chargeEnergy = 112 + index * 2 + (index % 4) * 3
    const dischargeEnergy = chargeEnergy * 0.842 + (index % 3) * 1.5

    return {
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      chargeCapacity: Number(chargeCapacity.toFixed(1)),
      dischargeCapacity: Number(dischargeCapacity.toFixed(1)),
      chargeEnergy: Number(chargeEnergy.toFixed(1)),
      dischargeEnergy: Number(dischargeEnergy.toFixed(1)),
      capacityEfficiency: Number(((dischargeCapacity / chargeCapacity) * 100).toFixed(1)),
      energyEfficiency: Number(((dischargeEnergy / chargeEnergy) * 100).toFixed(1)),
    }
  })
}

const buildMonthData = (): EfficiencyPoint[] => {
  const today = new Date()
  const month = today.getMonth() + 1

  return Array.from({ length: today.getDate() }, (_, index) => {
    const chargeCapacity = 84 + (index % 7) * 2.2 + Math.floor(index / 6) * 0.8
    const dischargeCapacity = chargeCapacity * 0.846 + (index % 3) * 1.5
    const chargeEnergy = 110 + (index % 6) * 4 + Math.floor(index / 5) * 1.5
    const dischargeEnergy = chargeEnergy * 0.84 + (index % 4) * 2

    return {
      label: `${month}/${index + 1}`,
      chargeCapacity: Number(chargeCapacity.toFixed(1)),
      dischargeCapacity: Number(dischargeCapacity.toFixed(1)),
      chargeEnergy: Number(chargeEnergy.toFixed(1)),
      dischargeEnergy: Number(dischargeEnergy.toFixed(1)),
      capacityEfficiency: Number(((dischargeCapacity / chargeCapacity) * 100).toFixed(1)),
      energyEfficiency: Number(((dischargeEnergy / chargeEnergy) * 100).toFixed(1)),
    }
  })
}

const buildYearData = (language: "zh" | "en"): EfficiencyPoint[] => {
  const currentMonth = new Date().getMonth()
  const labels = language === "zh" ? yearMonthLabels.zh : yearMonthLabels.en

  return labels.slice(0, currentMonth + 1).map((label, index) => {
    const chargeCapacity = 2580 + index * 45 + (index % 2) * 80
    const dischargeCapacity = chargeCapacity * 0.845 + (index % 3) * 28
    const chargeEnergy = 3240 + index * 55 + (index % 4) * 70
    const dischargeEnergy = chargeEnergy * 0.841 + (index % 3) * 35

    return {
      label,
      chargeCapacity: Number(chargeCapacity.toFixed(1)),
      dischargeCapacity: Number(dischargeCapacity.toFixed(1)),
      chargeEnergy: Number(chargeEnergy.toFixed(1)),
      dischargeEnergy: Number(dischargeEnergy.toFixed(1)),
      capacityEfficiency: Number(((dischargeCapacity / chargeCapacity) * 100).toFixed(1)),
      energyEfficiency: Number(((dischargeEnergy / chargeEnergy) * 100).toFixed(1)),
    }
  })
}

const buildCustomData = (range: DateRange | undefined): EfficiencyPoint[] => {
  if (!range?.from || !range.to) return []

  return Array.from({ length: getRangeLength(range.from, range.to) }, (_, index) => {
    const date = addDays(range.from!, index)
    const chargeCapacity = 84 + (index % 7) * 2.2 + Math.floor(index / 6) * 0.8
    const dischargeCapacity = chargeCapacity * 0.846 + (index % 3) * 1.5
    const chargeEnergy = 110 + (index % 6) * 4 + Math.floor(index / 5) * 1.5
    const dischargeEnergy = chargeEnergy * 0.84 + (index % 4) * 2

    return {
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      chargeCapacity: Number(chargeCapacity.toFixed(1)),
      dischargeCapacity: Number(dischargeCapacity.toFixed(1)),
      chargeEnergy: Number(chargeEnergy.toFixed(1)),
      dischargeEnergy: Number(dischargeEnergy.toFixed(1)),
      capacityEfficiency: Number(((dischargeCapacity / chargeCapacity) * 100).toFixed(1)),
      energyEfficiency: Number(((dischargeEnergy / chargeEnergy) * 100).toFixed(1)),
    }
  })
}

export function ComprehensiveEfficiencyPanel({
  compact = false,
}: ComprehensiveEfficiencyPanelProps) {
  const { language } = useLanguage()
  const chartId = useId().replace(/:/g, "")
  const today = useMemo(() => toDayStart(new Date()), [])
  const defaultCustomRange = useMemo<DateRange>(
    () => ({
      from: addDays(today, -30),
      to: today,
    }),
    [today],
  )
  const [range, setRange] = useState<RangeKey>("week")
  const [viewMode, setViewMode] = useState<ViewMode>("chart")
  const [hiddenSeries, setHiddenSeries] = useState<SeriesKey[]>([
    "chargeCapacity",
    "dischargeCapacity",
    "capacityEfficiency",
  ])
  const [customRange, setCustomRange] = useState<DateRange | undefined>(defaultCustomRange)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const weekData = useMemo(() => (mounted ? buildLastWeekData() : []), [mounted])
  const monthData = useMemo(() => (mounted ? buildMonthData() : []), [mounted])
  const yearData = useMemo(() => (mounted ? buildYearData(language) : []), [language, mounted])
  const customData = useMemo(() => (mounted ? buildCustomData(customRange) : []), [customRange, mounted])

  const activeData = useMemo(() => {
    if (range === "week") return weekData
    if (range === "year") return yearData
    if (range === "custom") return customData
    return monthData
  }, [customData, monthData, range, weekData, yearData])

  const rangeOptions = [
    { key: "week" as const, label: language === "zh" ? "近7日" : "7 Days" },
    { key: "month" as const, label: language === "zh" ? "本月" : "This Month" },
    { key: "year" as const, label: language === "zh" ? "本年" : "This Year" },
    { key: "custom" as const, label: language === "zh" ? "自定义" : "Custom" },
  ]

  const legendText = {
    chargeCapacity: language === "zh" ? "充电容量 (Ah)" : "Charge Capacity (Ah)",
    dischargeCapacity: language === "zh" ? "放电容量 (Ah)" : "Discharge Capacity (Ah)",
    chargeEnergy: language === "zh" ? "充电电量 (kWh)" : "Charge Energy (kWh)",
    dischargeEnergy: language === "zh" ? "放电电量 (kWh)" : "Discharge Energy (kWh)",
    capacityEfficiency: language === "zh" ? "容量效率 (%)" : "Capacity Efficiency (%)",
    energyEfficiency: language === "zh" ? "能量效率 (%)" : "Energy Efficiency (%)",
  }

  const seriesConfig: Array<{ key: SeriesKey; name: string; color: string }> = [
    { key: "chargeCapacity", name: legendText.chargeCapacity, color: "#7dd3fc" },
    { key: "dischargeCapacity", name: legendText.dischargeCapacity, color: "#fda4af" },
    { key: "chargeEnergy", name: legendText.chargeEnergy, color: "#99f6e4" },
    { key: "dischargeEnergy", name: legendText.dischargeEnergy, color: "#c4b5fd" },
    { key: "capacityEfficiency", name: legendText.capacityEfficiency, color: "#ffd60a" },
    { key: "energyEfficiency", name: legendText.energyEfficiency, color: "#4ade80" },
  ]

  const seriesMap = useMemo(
    () =>
      Object.fromEntries(
        seriesConfig.map((series) => [
          series.key,
          {
            ...series,
            unit:
              series.key === "capacityEfficiency" || series.key === "energyEfficiency"
                ? "%"
                : series.key === "chargeCapacity" || series.key === "dischargeCapacity"
                  ? "Ah"
                  : "kWh",
          },
        ]),
      ) as Record<SeriesKey, { key: SeriesKey; name: string; color: string; unit: string }>,
    [seriesConfig],
  )

  const tableHeaders = {
    period: language === "zh" ? "时间" : "Period",
    chargeCapacity: language === "zh" ? "充电容量 (Ah)" : "Charge Capacity (Ah)",
    dischargeCapacity: language === "zh" ? "放电容量 (Ah)" : "Discharge Capacity (Ah)",
    capacityEfficiency: language === "zh" ? "容量效率 (%)" : "Capacity Efficiency (%)",
    chargeEnergy: language === "zh" ? "充电电量 (kWh)" : "Charge Energy (kWh)",
    dischargeEnergy: language === "zh" ? "放电电量 (kWh)" : "Discharge Energy (kWh)",
    energyEfficiency: language === "zh" ? "能量效率 (%)" : "Energy Efficiency (%)",
  }

  const customHint = language === "zh" ? "最多选择 31 天" : "Select up to 31 days"
  const maxRangeError = language === "zh" ? "自定义日期范围最多 31 天" : "Custom date range cannot exceed 31 days"
  const selectRangeLabel = language === "zh" ? "选择日期范围" : "Select range"

  const formatRangeLabel = (rangeValue: DateRange | undefined) => {
    if (!rangeValue?.from) return selectRangeLabel
    const formatDate = (date: Date) => `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
    if (!rangeValue.to) return formatDate(rangeValue.from)
    return `${formatDate(rangeValue.from)} - ${formatDate(rangeValue.to)}`
  }

  const toggleSeries = (seriesKey: SeriesKey) => {
    setHiddenSeries((prev) => {
      if (prev.includes(seriesKey)) {
        return prev.filter((key) => key !== seriesKey)
      }
      if (prev.length >= seriesConfig.length - 1) {
        return prev
      }
      return [...prev, seriesKey]
    })
  }

  const renderTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (!active || !payload?.length) return null

    return (
      <div className="min-w-[220px] overflow-hidden" style={TOOLTIP_SURFACE}>
        <div className="border-b border-white/8 bg-[linear-gradient(90deg,rgba(17,216,191,0.14),transparent)] px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7da0d8]">
            {language === "zh" ? "统计时段" : "Period"}
          </div>
          <div className="mt-1 text-sm font-semibold text-[#e9f4ff]">{label}</div>
        </div>

        <div className="grid gap-2 px-3 py-3">
          {payload.map((entry) => {
            const key = entry.dataKey as SeriesKey
            const meta = seriesMap[key]
            const value = Number(entry.value ?? 0)

            return (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.03] px-2.5 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: meta.color, boxShadow: `0 0 12px ${meta.color}99` }}
                  />
                  <span className="text-[12px] text-[#bed3f6]">{meta.name}</span>
                </div>
                <span className="font-mono text-[12px] font-semibold text-[#f2f8ff]">
                  {value.toFixed(1)}
                  <span className="ml-1 text-[#86a7d4]">{meta.unit}</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderLegend = (_props: LegendProps) => (
    <div className="flex flex-wrap items-center justify-center gap-2 px-2 pt-3">
      {seriesConfig.map((series) => {
        const hidden = hiddenSeries.includes(series.key)

        return (
          <button
            key={series.key}
            type="button"
            onClick={() => toggleSeries(series.key)}
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] transition-all ${
              hidden
                ? "border-white/8 bg-white/[0.02] text-[#6f86b7]"
                : "border-white/10 bg-[linear-gradient(180deg,rgba(18,34,72,0.92),rgba(11,24,53,0.92))] text-[#dce9ff]"
            }`}
            style={{
              boxShadow: hidden ? "none" : `inset 0 0 0 1px ${series.color}1f, 0 0 14px ${series.color}22`,
            }}
          >
            <span
              className="block h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: series.color,
                boxShadow: hidden ? "none" : `0 0 12px ${series.color}88`,
              }}
            />
            <span
              style={{
                textDecoration: hidden ? "line-through" : "none",
                textDecorationThickness: "1.5px",
              }}
            >
              {series.name}
            </span>
          </button>
        )
      })}
    </div>
  )

  const wrapperClassName = compact
    ? "flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#22d3ee]/25 bg-[rgba(5,12,26,0.62)] p-3 backdrop-blur-[3px] shadow-[0_0_0_1px_rgba(34,211,238,0.08)_inset]"
    : "flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[#1a2654] bg-[#0d1233] p-3"

  if (!mounted) {
    return (
      <div className={wrapperClassName}>
        <div className="flex h-full items-center justify-center text-sm text-[#7b8ab8]">
          {language === "zh" ? "加载综合能效数据..." : "Loading efficiency data..."}
        </div>
      </div>
    )
  }

  return (
    <div className={wrapperClassName}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3 className={compact ? "text-sm font-semibold text-[#00d4aa]" : "text-base font-semibold text-[#00d4aa]"}>
            {language === "zh" ? "综合能效统计" : "Efficiency Analytics"}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-[#16204b]/90 p-1">
            {rangeOptions.map((item) => (
              <button
                key={item.key}
                onClick={() => setRange(item.key)}
                className={`rounded-lg px-3 py-1.5 text-[12px] transition-all ${
                  range === item.key
                    ? "bg-[#11d8bf] font-medium text-[#07162b] shadow-[0_0_18px_rgba(17,216,191,0.2)]"
                    : "text-[#7b8ab8] hover:text-[#e8f4fc]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex gap-0.5 rounded-lg border border-[#1a2654] bg-[#0a1225] p-0.5">
            <button
              onClick={() => setViewMode("chart")}
              className={`flex items-center justify-center rounded-md p-1.5 transition-all ${
                viewMode === "chart"
                  ? "bg-[#11d8bf] shadow-[0_0_10px_rgba(17,216,191,0.25)]"
                  : "hover:bg-[#1a2654]/60"
              }`}
              aria-label={language === "zh" ? "图表" : "Chart"}
              title={language === "zh" ? "图表" : "Chart"}
            >
              <ViewIconChart active={viewMode === "chart"} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center justify-center rounded-md p-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-[#11d8bf] shadow-[0_0_10px_rgba(17,216,191,0.25)]"
                  : "hover:bg-[#1a2654]/60"
              }`}
              aria-label={language === "zh" ? "表格" : "Table"}
              title={language === "zh" ? "表格" : "Table"}
            >
              <ViewIconTable active={viewMode === "table"} />
            </button>
          </div>

          {range === "custom" && (
            <CustomRangePicker
              value={customRange}
              onChange={setCustomRange}
              maxDate={today}
              maxDays={31}
              buttonLabel={formatRangeLabel(customRange)}
              hint={customHint}
              maxRangeError={maxRangeError}
            />
          )}
        </div>
      </div>

      {viewMode === "chart" ? (
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[20px] border border-[#1e2e63]/75 bg-[linear-gradient(180deg,rgba(8,18,42,0.92),rgba(10,20,47,0.78))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(0,212,170,0.08),transparent_28%),radial-gradient(circle_at_84%_10%,rgba(86,130,255,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={activeData} margin={{ top: 18, right: 12, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id={`${chartId}-charge-capacity`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8ee7ff" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#3f8bff" stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id={`${chartId}-discharge-capacity`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffb3c7" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#ff6f91" stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id={`${chartId}-charge-energy`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a8fff0" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#42d9b8" stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id={`${chartId}-discharge-energy`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d9c8ff" stopOpacity={0.96} />
                  <stop offset="100%" stopColor="#8f7cff" stopOpacity={0.58} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(45,74,126,0.72)" strokeDasharray="3 5" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#88a4d7", fontSize: 10 }}
                tickMargin={10}
                interval={range === "month" && activeData.length > 16 ? 1 : 0}
              />
              <YAxis
                yAxisId="quantity"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#88a4d7", fontSize: 10 }}
                tickMargin={8}
              />
              <YAxis
                yAxisId="efficiency"
                orientation="right"
                domain={[89, 98]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#88a4d7", fontSize: 10 }}
                tickMargin={8}
                tickFormatter={(value: number) => `${value}%`}
              />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} content={renderTooltip} />
              <Legend wrapperStyle={{ paddingTop: "4px" }} content={renderLegend} />
              {!hiddenSeries.includes("chargeCapacity") && (
                <Bar
                  yAxisId="quantity"
                  dataKey="chargeCapacity"
                  name={legendText.chargeCapacity}
                  fill={`url(#${chartId}-charge-capacity)`}
                  radius={[0, 0, 0, 0]}
                  barSize={10}
                  fillOpacity={0.95}
                />
              )}
              {!hiddenSeries.includes("dischargeCapacity") && (
                <Bar
                  yAxisId="quantity"
                  dataKey="dischargeCapacity"
                  name={legendText.dischargeCapacity}
                  fill={`url(#${chartId}-discharge-capacity)`}
                  radius={[0, 0, 0, 0]}
                  barSize={10}
                  fillOpacity={0.95}
                />
              )}
              {!hiddenSeries.includes("chargeEnergy") && (
                <Bar
                  yAxisId="quantity"
                  dataKey="chargeEnergy"
                  name={legendText.chargeEnergy}
                  fill={`url(#${chartId}-charge-energy)`}
                  radius={[0, 0, 0, 0]}
                  barSize={10}
                  fillOpacity={0.95}
                />
              )}
              {!hiddenSeries.includes("dischargeEnergy") && (
                <Bar
                  yAxisId="quantity"
                  dataKey="dischargeEnergy"
                  name={legendText.dischargeEnergy}
                  fill={`url(#${chartId}-discharge-energy)`}
                  radius={[0, 0, 0, 0]}
                  barSize={10}
                  fillOpacity={0.95}
                />
              )}
              {!hiddenSeries.includes("capacityEfficiency") && (
                <Line
                  yAxisId="efficiency"
                  type="monotone"
                  dataKey="capacityEfficiency"
                  name={legendText.capacityEfficiency}
                  stroke="#ffd60a"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#08122a", stroke: "#ffd60a", strokeWidth: 3 }}
                  activeDot={{ r: 5, fill: "#08122a", stroke: "#ffd60a", strokeWidth: 3 }}
                />
              )}
              {!hiddenSeries.includes("energyEfficiency") && (
                <Line
                  yAxisId="efficiency"
                  type="monotone"
                  dataKey="energyEfficiency"
                  name={legendText.energyEfficiency}
                  stroke="#4ade80"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#08122a", stroke: "#4ade80", strokeWidth: 3 }}
                  activeDot={{ r: 5, fill: "#08122a", stroke: "#4ade80", strokeWidth: 3 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-[#1a2654]/80 bg-[linear-gradient(180deg,rgba(13,20,51,0.95),rgba(11,18,44,0.92))] p-2 [scrollbar-color:rgba(34,211,238,0.38)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#1f4f78] [&::-webkit-scrollbar-thumb:hover]:bg-[#2aa7b3]">
          <table className="w-full table-fixed border-separate border-spacing-y-1.5 text-[13px]">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="text-[#7b8ab8]">
                <th className="rounded-l-lg bg-[#121a40] px-2 py-3 text-left text-[12px] font-medium leading-tight">{tableHeaders.period}</th>
                <th className="bg-[#121a40] px-2 py-3 text-right text-[12px] font-medium leading-tight">{tableHeaders.chargeCapacity}</th>
                <th className="bg-[#121a40] px-2 py-3 text-right text-[12px] font-medium leading-tight">{tableHeaders.dischargeCapacity}</th>
                <th className="bg-[#121a40] px-2 py-3 text-right text-[12px] font-medium leading-tight">{tableHeaders.capacityEfficiency}</th>
                <th className="bg-[#121a40] px-2 py-3 text-right text-[12px] font-medium leading-tight">{tableHeaders.chargeEnergy}</th>
                <th className="bg-[#121a40] px-2 py-3 text-right text-[12px] font-medium leading-tight">{tableHeaders.dischargeEnergy}</th>
                <th className="rounded-r-lg bg-[#121a40] px-2 py-3 text-right text-[12px] font-medium leading-tight">{tableHeaders.energyEfficiency}</th>
              </tr>
            </thead>
            <tbody>
              {activeData.map((item) => (
                <tr key={item.label} className="group">
                  <td className="truncate rounded-l-lg border-y border-l border-[#1a2654]/70 bg-[#10183b]/78 px-2 py-3 text-[13px] text-[#dce7ff] transition-colors group-hover:bg-[#162252]">
                    {item.label}
                  </td>
                  <td className="border-y border-[#1a2654]/70 bg-[#10183b]/78 px-2 py-3 text-right font-mono text-[12px] text-[#8ee7ff] transition-colors group-hover:bg-[#162252]">
                    {item.chargeCapacity.toFixed(1)}
                  </td>
                  <td className="border-y border-[#1a2654]/70 bg-[#10183b]/78 px-2 py-3 text-right font-mono text-[12px] text-[#ffb7c2] transition-colors group-hover:bg-[#162252]">
                    {item.dischargeCapacity.toFixed(1)}
                  </td>
                  <td className="border-y border-[#1a2654]/70 bg-[#10183b]/78 px-2 py-3 text-right font-mono text-[12px] text-[#ffd36b] transition-colors group-hover:bg-[#162252]">
                    {item.capacityEfficiency.toFixed(1)}%
                  </td>
                  <td className="border-y border-[#1a2654]/70 bg-[#10183b]/78 px-2 py-3 text-right font-mono text-[12px] text-[#9af7df] transition-colors group-hover:bg-[#162252]">
                    {item.chargeEnergy.toFixed(1)}
                  </td>
                  <td className="border-y border-[#1a2654]/70 bg-[#10183b]/78 px-2 py-3 text-right font-mono text-[12px] text-[#d6c2ff] transition-colors group-hover:bg-[#162252]">
                    {item.dischargeEnergy.toFixed(1)}
                  </td>
                  <td className="rounded-r-lg border-y border-r border-[#1a2654]/70 bg-[#10183b]/78 px-2 py-3 text-right font-mono text-[12px] text-[#4ade80] transition-colors group-hover:bg-[#162252]">
                    {item.energyEfficiency.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
