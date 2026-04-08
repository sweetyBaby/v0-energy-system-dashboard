"use client"

import { useEffect, useId, useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  type LegendProps,
  Line,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts"
import { LineChartIcon, Table } from "lucide-react"
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"
import { useProject } from "@/components/dashboard/dashboard-header"
import { CustomRangePicker } from "@/components/dashboard/custom-range-picker"
import { useLanguage } from "@/components/language-provider"
import {
  fetchOverviewDailyList,
  formatNullableMetric,
  normalizeOverviewDailyRows,
  type EfficiencyPoint,
} from "@/lib/api/overview"

type RangeKey = "week" | "month" | "year" | "custom"
type ViewMode = "chart" | "table"
type SeriesKey =
  | "chargeCapacity"
  | "dischargeCapacity"
  | "chargeEnergy"
  | "dischargeEnergy"
  | "capacityEfficiency"
  | "energyEfficiency"

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
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1)

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return toDayStart(next)
}

const formatRequestDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

function ViewIconChart({ active }: { active: boolean }) {
  return <LineChartIcon className="h-[16px] w-[16px]" style={{ color: active ? "#07162b" : "#6f86b7" }} />
}

function ViewIconTable({ active }: { active: boolean }) {
  return <Table className="h-[16px] w-[16px]" style={{ color: active ? "#07162b" : "#6f86b7" }} />
}

export function ComprehensiveEfficiencyPanel({
  compact = false,
}: ComprehensiveEfficiencyPanelProps) {
  const { language } = useLanguage()
  const { selectedProject } = useProject()
  const chartId = useId().replace(/:/g, "")
  const currentDay = useMemo(() => toDayStart(new Date()), [])
  const maxAvailableDate = useMemo(() => addDays(currentDay, -1), [currentDay])
  const defaultCustomRange = useMemo<DateRange>(
    () => ({
      from: addDays(maxAvailableDate, -30),
      to: maxAvailableDate,
    }),
    [maxAvailableDate],
  )

  const [range, setRange] = useState<RangeKey>("week")
  const [viewMode, setViewMode] = useState<ViewMode>("chart")
  const [hiddenSeries, setHiddenSeries] = useState<SeriesKey[]>([
    "chargeCapacity",
    "dischargeCapacity",
    "capacityEfficiency",
  ])
  const [customRange, setCustomRange] = useState<DateRange | undefined>(defaultCustomRange)
  const [activeData, setActiveData] = useState<EfficiencyPoint[]>([])
  const [loading, setLoading] = useState(true)

  const activeRequestRange = useMemo(() => {
    if (range === "week") {
      return {
        beginTime: formatRequestDate(addDays(maxAvailableDate, -6)),
        endTime: formatRequestDate(maxAvailableDate),
      }
    }

    if (range === "month") {
      const monthStart = startOfMonth(currentDay)
      if (monthStart > maxAvailableDate) {
        return null
      }

      return {
        beginTime: formatRequestDate(monthStart),
        endTime: formatRequestDate(maxAvailableDate),
      }
    }

    if (range === "year") {
      const yearStart = startOfYear(currentDay)
      if (yearStart > maxAvailableDate) {
        return null
      }

      return {
        beginTime: formatRequestDate(yearStart),
        endTime: formatRequestDate(maxAvailableDate),
      }
    }

    if (customRange?.from && customRange.to) {
      return {
        beginTime: formatRequestDate(customRange.from),
        endTime: formatRequestDate(customRange.to),
      }
    }

    return null
  }, [currentDay, customRange, maxAvailableDate, range])

  useEffect(() => {
    let cancelled = false

    const loadDailyList = async () => {
      if (!activeRequestRange) {
        setActiveData([])
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const response = await fetchOverviewDailyList({
          projectId: selectedProject.projectId,
          params: activeRequestRange,
        })

        if (!cancelled) {
          setActiveData(normalizeOverviewDailyRows(response.rows ?? []))
        }
      } catch (error) {
        if (!cancelled) {
          setActiveData([])
        }

        console.error(`Failed to load overview daily list for ${selectedProject.projectId}`, error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadDailyList()

    return () => {
      cancelled = true
    }
  }, [activeRequestRange, selectedProject.projectId])

  const rangeOptions = [
    { key: "week" as const, label: language === "zh" ? "近7天" : "7 Days" },
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

  const customHint =
    language === "zh" ? "最多选择 31 天，结束日期不能超过昨天" : "Select up to 31 days, ending no later than yesterday"
  const maxRangeError =
    language === "zh" ? "自定义日期范围最多 31 天，且结束日期不能超过昨天" : "Custom date range cannot exceed 31 days or go beyond yesterday"
  const selectRangeLabel = language === "zh" ? "选择日期范围" : "Select range"
  const emptyStateText = language === "zh" ? "当前时间范围暂无数据" : "No data for the selected range"

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
            const numericValue = typeof entry.value === "number" ? entry.value : Number(entry.value ?? 0)
            const displayValue =
              Number.isNaN(numericValue) || entry.value == null
                ? "--"
                : numericValue.toFixed(key === "capacityEfficiency" || key === "energyEfficiency" ? 2 : 1)

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
                  {displayValue}
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

  if (loading) {
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
              maxDate={maxAvailableDate}
              maxDays={31}
              buttonLabel={formatRangeLabel(customRange)}
              hint={customHint}
              maxRangeError={maxRangeError}
              quickSelectLabel={language === "zh" ? "昨天" : "Yesterday"}
            />
          )}
        </div>
      </div>

      {viewMode === "chart" ? (
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[20px] border border-[#1e2e63]/75 bg-[linear-gradient(180deg,rgba(8,18,42,0.92),rgba(10,20,47,0.78))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(0,212,170,0.08),transparent_28%),radial-gradient(circle_at_84%_10%,rgba(86,130,255,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
          {activeData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[#7b8ab8]">{emptyStateText}</div>
          ) : (
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
                    connectNulls
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
                    connectNulls
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-[#1a2654]/80 bg-[linear-gradient(180deg,rgba(13,20,51,0.95),rgba(11,18,44,0.92))] p-2 [scrollbar-color:rgba(34,211,238,0.38)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#1f4f78] [&::-webkit-scrollbar-thumb:hover]:bg-[#2aa7b3]">
          {activeData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[#7b8ab8]">{emptyStateText}</div>
          ) : (
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
                      {formatNullableMetric(item.chargeCapacity)}
                    </td>
                    <td className="border-y border-[#1a2654]/70 bg-[#10183b]/78 px-2 py-3 text-right font-mono text-[12px] text-[#ffb7c2] transition-colors group-hover:bg-[#162252]">
                      {formatNullableMetric(item.dischargeCapacity)}
                    </td>
                    <td className="border-y border-[#1a2654]/70 bg-[#10183b]/78 px-2 py-3 text-right font-mono text-[12px] text-[#ffd36b] transition-colors group-hover:bg-[#162252]">
                      {formatNullableMetric(item.capacityEfficiency, 2, "%")}
                    </td>
                    <td className="border-y border-[#1a2654]/70 bg-[#10183b]/78 px-2 py-3 text-right font-mono text-[12px] text-[#9af7df] transition-colors group-hover:bg-[#162252]">
                      {formatNullableMetric(item.chargeEnergy)}
                    </td>
                    <td className="border-y border-[#1a2654]/70 bg-[#10183b]/78 px-2 py-3 text-right font-mono text-[12px] text-[#d6c2ff] transition-colors group-hover:bg-[#162252]">
                      {formatNullableMetric(item.dischargeEnergy)}
                    </td>
                    <td className="rounded-r-lg border-y border-r border-[#1a2654]/70 bg-[#10183b]/78 px-2 py-3 text-right font-mono text-[12px] text-[#4ade80] transition-colors group-hover:bg-[#162252]">
                      {formatNullableMetric(item.energyEfficiency, 2, "%")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
