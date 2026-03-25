"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Activity,
  Battery,
  BatteryCharging,
  Gauge,
  LineChartIcon,
  Table,
  TrendingUp,
  Zap,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"

type RangeKey = "week" | "month" | "year"
type SummaryRangeKey = "yesterday" | RangeKey
type ViewMode = "chart" | "table"

type EfficiencyPoint = {
  label: string
  chargeCapacity: number
  dischargeCapacity: number
  chargeEnergy: number
  dischargeEnergy: number
  capacityEfficiency: number
  energyEfficiency: number
}

type SummaryMetrics = {
  systemEfficiency: number
  chargeEnergy: number
  dischargeEnergy: number
  chargeCapacity: number
  dischargeCapacity: number
  avgCapacityEfficiency: number
  avgEnergyEfficiency: number
}

type SummaryColumn = {
  key: SummaryRangeKey
  label: string
  tag: string
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

    const chargeCapacity = 218 + index * 4 + (index % 3) * 7
    const dischargeCapacity = chargeCapacity - 16 + (index % 2) * 5
    const chargeEnergy = 252 + index * 6 + (index % 4) * 8
    const dischargeEnergy = chargeEnergy - 22 + (index % 3) * 4

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
    const chargeCapacity = 210 + (index % 7) * 6 + Math.floor(index / 6) * 2
    const dischargeCapacity = chargeCapacity - 20 + (index % 3) * 5
    const chargeEnergy = 242 + (index % 6) * 11 + Math.floor(index / 5) * 4
    const dischargeEnergy = chargeEnergy - 24 + (index % 4) * 6

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
    const chargeCapacity = 6900 + index * 280 + (index % 2) * 320
    const dischargeCapacity = chargeCapacity - 520 + (index % 3) * 90
    const chargeEnergy = 7800 + index * 340 + (index % 4) * 260
    const dischargeEnergy = chargeEnergy - 650 + (index % 3) * 120

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

const aggregateMetrics = (points: EfficiencyPoint[]): SummaryMetrics => {
  const chargeCapacity = points.reduce((sum, point) => sum + point.chargeCapacity, 0)
  const dischargeCapacity = points.reduce((sum, point) => sum + point.dischargeCapacity, 0)
  const chargeEnergy = points.reduce((sum, point) => sum + point.chargeEnergy, 0)
  const dischargeEnergy = points.reduce((sum, point) => sum + point.dischargeEnergy, 0)
  const avgCapacityEfficiency =
    points.length > 0 ? points.reduce((sum, point) => sum + point.capacityEfficiency, 0) / points.length : 0
  const avgEnergyEfficiency =
    points.length > 0 ? points.reduce((sum, point) => sum + point.energyEfficiency, 0) / points.length : 0

  return {
    systemEfficiency: chargeEnergy > 0 ? (dischargeEnergy / chargeEnergy) * 100 : 0,
    chargeEnergy,
    dischargeEnergy,
    chargeCapacity,
    dischargeCapacity,
    avgCapacityEfficiency,
    avgEnergyEfficiency,
  }
}

const clampEfficiencyDomain = (points: EfficiencyPoint[]) => {
  if (points.length === 0) {
    return [70, 100] as [number, number]
  }

  const values = points.flatMap((point) => [point.capacityEfficiency, point.energyEfficiency])
  const min = Math.floor(Math.min(...values) - 2)
  const max = Math.ceil(Math.max(...values) + 2)

  return [Math.max(70, min), Math.min(100, max)] as [number, number]
}

const efficiencyCellAlpha = (value: number) => {
  const ratio = Math.max(0, Math.min(1, (value - 84) / 14))
  return 0.08 + ratio * 0.47
}

const efficiencySignalWidth = (value: number) => {
  const ratio = Math.max(0, Math.min(1, (value - 84) / 14))
  return 28 + ratio * 72
}

const metricShare = (value: number, max: number) => {
  if (max <= 0) return 0
  return (value / max) * 100
}

export function ComprehensiveEfficiencyPanel() {
  const { language } = useLanguage()
  const [range, setRange] = useState<RangeKey>("week")
  const [viewMode, setViewMode] = useState<ViewMode>("chart")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const weekData = useMemo(() => (mounted ? buildLastWeekData() : []), [mounted])
  const monthData = useMemo(() => (mounted ? buildMonthData() : []), [mounted])
  const yearData = useMemo(() => (mounted ? buildYearData(language) : []), [language, mounted])

  const summaryData = useMemo<Record<SummaryRangeKey, SummaryMetrics>>(() => {
    if (!mounted || weekData.length === 0) {
      return {
        yesterday: aggregateMetrics([]),
        week: aggregateMetrics([]),
        month: aggregateMetrics([]),
        year: aggregateMetrics([]),
      }
    }

    const yesterdayPoint = weekData[weekData.length - 1]

    return {
      yesterday: aggregateMetrics([yesterdayPoint]),
      week: aggregateMetrics(weekData),
      month: aggregateMetrics(monthData),
      year: aggregateMetrics(yearData),
    }
  }, [mounted, monthData, weekData, yearData])

  const activeData = useMemo(() => {
    if (range === "week") return weekData
    if (range === "year") return yearData
    return monthData
  }, [monthData, range, weekData, yearData])

  const efficiencyDomain = useMemo(() => clampEfficiencyDomain(activeData), [activeData])

  const rangeOptions = [
    { key: "week" as const, label: language === "zh" ? "近7日" : "7 Days" },
    { key: "month" as const, label: language === "zh" ? "本月" : "This Month" },
    { key: "year" as const, label: language === "zh" ? "本年" : "This Year" },
  ]

  const summaryColumns: SummaryColumn[] = [
    { key: "yesterday", label: language === "zh" ? "昨日" : "Yesterday", tag: "24H" },
    { key: "week", label: language === "zh" ? "近7日" : "Last 7D", tag: "7D" },
    { key: "month", label: language === "zh" ? "本月" : "This Month", tag: "MTD" },
    { key: "year", label: language === "zh" ? "本年" : "This Year", tag: "YTD" },
  ]

  const matrixMetrics = [
    {
      key: "systemEfficiency",
      label: language === "zh" ? "系统效率" : "System Eff.",
      kind: "efficiency" as const,
      accentFrom: "#00d4aa",
      accentTo: "#7cf7df",
      icon: Gauge,
      getValue: (m: SummaryMetrics) => m.systemEfficiency,
      format: (m: SummaryMetrics) => `${m.systemEfficiency.toFixed(1)}%`,
    },
    {
      key: "avgCapacityEfficiency",
      label: language === "zh" ? "平均容量效率" : "Avg Cap. Eff.",
      kind: "efficiency" as const,
      accentFrom: "#39d0ff",
      accentTo: "#7dd3fc",
      icon: BatteryCharging,
      getValue: (m: SummaryMetrics) => m.avgCapacityEfficiency,
      format: (m: SummaryMetrics) => `${m.avgCapacityEfficiency.toFixed(1)}%`,
    },
    {
      key: "avgEnergyEfficiency",
      label: language === "zh" ? "平均能量效率" : "Avg Enrg. Eff.",
      kind: "efficiency" as const,
      accentFrom: "#7dd3fc",
      accentTo: "#22d3ee",
      icon: TrendingUp,
      getValue: (m: SummaryMetrics) => m.avgEnergyEfficiency,
      format: (m: SummaryMetrics) => `${m.avgEnergyEfficiency.toFixed(1)}%`,
    },
    {
      key: "chargeEnergy",
      label: language === "zh" ? "充电量" : "Chg. Energy",
      kind: "quantity" as const,
      accentFrom: "#39d0ff",
      accentTo: "#22d3ee",
      icon: Zap,
      getValue: (m: SummaryMetrics) => m.chargeEnergy,
      format: (m: SummaryMetrics) =>
        m.chargeEnergy >= 1000 ? `${(m.chargeEnergy / 1000).toFixed(2)} MWh` : `${m.chargeEnergy.toFixed(1)} kWh`,
    },
    {
      key: "dischargeEnergy",
      label: language === "zh" ? "放电量" : "Dis. Energy",
      kind: "quantity" as const,
      accentFrom: "#4f8cff",
      accentTo: "#7ea8ff",
      icon: Activity,
      getValue: (m: SummaryMetrics) => m.dischargeEnergy,
      format: (m: SummaryMetrics) =>
        m.dischargeEnergy >= 1000
          ? `${(m.dischargeEnergy / 1000).toFixed(2)} MWh`
          : `${m.dischargeEnergy.toFixed(1)} kWh`,
    },
    {
      key: "chargeCapacity",
      label: language === "zh" ? "充电容量" : "Chg. Cap.",
      kind: "quantity" as const,
      accentFrom: "#00d4aa",
      accentTo: "#34d399",
      icon: BatteryCharging,
      getValue: (m: SummaryMetrics) => m.chargeCapacity,
      format: (m: SummaryMetrics) =>
        `${m.chargeCapacity.toFixed(m.chargeCapacity >= 1000 ? 0 : 1)} Ah`,
    },
    {
      key: "dischargeCapacity",
      label: language === "zh" ? "放电容量" : "Dis. Cap.",
      kind: "quantity" as const,
      accentFrom: "#7dd3fc",
      accentTo: "#38bdf8",
      icon: Battery,
      getValue: (m: SummaryMetrics) => m.dischargeCapacity,
      format: (m: SummaryMetrics) =>
        `${m.dischargeCapacity.toFixed(m.dischargeCapacity >= 1000 ? 0 : 1)} Ah`,
    },
  ]

  const matrixMetricStats = matrixMetrics.map((metric) => {
    const values = summaryColumns.map((col) => metric.getValue(summaryData[col.key]))
    return {
      ...metric,
      values,
      maxValue: Math.max(...values),
    }
  })

  const legendText = {
    chargeCapacity: language === "zh" ? "充电容量 (Ah)" : "Charge Capacity (Ah)",
    dischargeCapacity: language === "zh" ? "放电容量 (Ah)" : "Discharge Capacity (Ah)",
    chargeEnergy: language === "zh" ? "充电电量 (kWh)" : "Charge Energy (kWh)",
    dischargeEnergy: language === "zh" ? "放电电量 (kWh)" : "Discharge Energy (kWh)",
    capacityEfficiency: language === "zh" ? "容量效率 (%)" : "Capacity Efficiency (%)",
    energyEfficiency: language === "zh" ? "能量效率 (%)" : "Energy Efficiency (%)",
  }

  if (!mounted) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] p-4">
        <div className="flex h-full items-center justify-center text-sm text-[#7b8ab8]">
          {language === "zh" ? "加载综合能效数据..." : "Loading efficiency data..."}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[#1a2654] bg-[#0d1233] p-4">
      <div className="relative mb-3 shrink-0 overflow-hidden rounded-2xl border border-[#21406b] bg-[linear-gradient(180deg,rgba(13,20,52,0.98),rgba(8,14,36,0.98))] p-3 shadow-[0_0_0_1px_rgba(34,211,238,0.03)_inset]">
        <div className="absolute -left-10 top-8 h-28 w-28 rounded-full bg-[#22d3ee]/10 blur-3xl" />
        <div className="absolute right-[-20px] top-[-10px] h-24 w-24 rounded-full bg-[#00d4aa]/10 blur-3xl" />
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/70 to-transparent" />

        <div className="relative mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 rounded-full bg-[#00d4aa]" />
            <div>
              <div className="mt-1 text-sm font-semibold text-[#e8f4fc]">
                {language === "zh" ? "综合能效多时域对比" : "Multi-window Efficiency Overview"}
              </div>
            </div>
          </div>
         
        </div>

        <div className="relative max-h-[340px] overflow-auto">
          <div className="min-w-[1120px]">
            <div className="grid grid-cols-[140px_repeat(7,minmax(128px,1fr))] gap-2">
              <div className="flex items-center rounded-xl border border-[#26456e] bg-[linear-gradient(180deg,rgba(16,30,66,0.96),rgba(10,19,45,0.96))] px-3 py-2 text-[10px] uppercase tracking-[0.28em] text-[#5f79ad] shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
                {language === "zh" ? "时间窗" : "Window"}
              </div>
              {matrixMetricStats.map((metric) => {
                const Icon = metric.icon

                return (
                  <div
                    key={metric.key}
                    className="rounded-xl border border-[#26456e] bg-[linear-gradient(180deg,rgba(15,28,60,0.96),rgba(9,18,42,0.96))] px-3 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/5 bg-[#0e1b40]/90"
                        style={{ boxShadow: `0 0 14px ${metric.accentFrom}22` }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: metric.accentFrom }} />
                      </div>
                      <div className="min-w-0 truncate text-[12px] font-medium text-[#e8f4fc]">{metric.label}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-2 space-y-2">
              {summaryColumns.map((col, rowIndex) => (
                <div key={col.key} className="grid grid-cols-[140px_repeat(7,minmax(128px,1fr))] gap-2">
                  <div className="rounded-xl border border-[#26456e] bg-[linear-gradient(180deg,rgba(16,30,66,0.96),rgba(10,19,45,0.96))] px-3 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
                    <div className="text-[10px] uppercase tracking-[0.28em] text-[#5f79ad]">{col.tag}</div>
                    <div className="mt-1 text-[13px] font-semibold text-[#e8f4fc]">{col.label}</div>
                  </div>

                  {matrixMetricStats.map((metric) => {
                    const rawValue = metric.values[rowIndex]
                    const currentMetrics = summaryData[col.key]
                    const isMax = rawValue === metric.maxValue

                    if (metric.kind === "efficiency") {
                      const alpha = efficiencyCellAlpha(rawValue)
                      const textColor = rawValue >= 91 ? "#00d4aa" : rawValue >= 88 ? "#34d399" : "#6ee7b7"
                      const signalWidth = efficiencySignalWidth(rawValue)

                      return (
                        <div
                          key={`${col.key}-${metric.key}`}
                          className="relative overflow-hidden rounded-xl border border-[#214066] bg-[linear-gradient(180deg,rgba(14,30,57,0.97),rgba(9,20,44,0.96))] px-3 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]"
                          style={
                            isMax
                              ? { boxShadow: "0 0 18px rgba(0,212,170,0.12), inset 0 0 0 1px rgba(255,255,255,0.02)" }
                              : undefined
                          }
                        >
                          <div
                            className="absolute inset-0"
                            style={{ background: `radial-gradient(circle at top right, rgba(0,212,170,${alpha * 0.34}), transparent 62%)` }}
                          />
                          <div
                            className="absolute left-0 top-0 h-[2px]"
                            style={{ width: `${signalWidth}%`, background: `linear-gradient(90deg, ${textColor}, transparent)` }}
                          />
                          <div className="relative flex items-center justify-between gap-2">
                            <span className="font-mono text-[15px] font-semibold" style={{ color: textColor }}>
                              {metric.format(currentMetrics)}
                            </span>
                            {isMax ? (
                              <span className="rounded-full border border-[#00d4aa]/30 bg-[#07172d]/80 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-[#4de9cf]">
                                {language === "zh" ? "高值" : "Top"}
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase tracking-[0.24em] text-[#6f89bf]">{col.tag}</span>
                            )}
                          </div>
                          <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-[#172653]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(14, signalWidth)}%`,
                                background: `linear-gradient(90deg, ${textColor}, ${metric.accentTo})`,
                                boxShadow: `0 0 16px ${textColor}33`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    }

                    const share = metricShare(rawValue, metric.maxValue)

                    return (
                      <div
                        key={`${col.key}-${metric.key}`}
                        className="relative overflow-hidden rounded-xl border border-[#214066] bg-[linear-gradient(180deg,rgba(14,27,56,0.97),rgba(9,18,42,0.96))] px-3 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]"
                        style={
                          isMax
                            ? { boxShadow: `0 0 18px ${metric.accentFrom}22, inset 0 0 0 1px rgba(255,255,255,0.02)` }
                            : undefined
                        }
                      >
                        <div
                          className="absolute inset-0"
                          style={{ background: `radial-gradient(circle at bottom left, ${metric.accentFrom}18, transparent 62%)` }}
                        />
                        <div className="relative flex items-center justify-between gap-2">
                          <span className="font-mono text-[14px] font-semibold text-[#eef4ff]">
                            {metric.format(currentMetrics)}
                          </span>
                          <span className="text-[10px]" style={{ color: isMax ? metric.accentTo : "#8db7ff" }}>
                            {`${Math.round(share)}%`}
                          </span>
                        </div>
                        <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-[#16244d]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${share > 0 ? Math.max(12, share) : 0}%`,
                              background: `linear-gradient(90deg, ${metric.accentFrom}, ${metric.accentTo})`,
                              boxShadow: `0 0 16px ${metric.accentFrom}33`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[#1a2654] bg-[linear-gradient(180deg,rgba(16,24,64,0.9),rgba(10,18,48,0.94))] p-3">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
            <h3 className="text-base font-semibold text-[#00d4aa]">
              {language === "zh" ? "综合能效统计" : "Efficiency Analytics"}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl bg-[#16204b]/90 p-1">
              {rangeOptions.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setRange(item.key)}
                  className={`rounded-lg px-3 py-1.5 text-[13px] transition-all ${
                    range === item.key
                      ? "bg-[#11d8bf] font-medium text-[#07162b] shadow-[0_0_18px_rgba(17,216,191,0.2)]"
                      : "text-[#7b8ab8] hover:text-[#e8f4fc]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1 rounded-xl bg-[#1a2654]/50 p-1">
              <button
                onClick={() => setViewMode("chart")}
                className={`rounded-md p-1.5 transition-all ${
                  viewMode === "chart"
                    ? "bg-[#3b82f6] text-white"
                    : "text-[#7b8ab8] hover:text-[#e8f4fc]"
                }`}
                aria-label={language === "zh" ? "图表" : "Chart"}
                title={language === "zh" ? "图表" : "Chart"}
              >
                <LineChartIcon className="h-[18px] w-[18px]" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`rounded-md p-1.5 transition-all ${
                  viewMode === "table"
                    ? "bg-[#3b82f6] text-white"
                    : "text-[#7b8ab8] hover:text-[#e8f4fc]"
                }`}
                aria-label={language === "zh" ? "表格" : "Table"}
                title={language === "zh" ? "表格" : "Table"}
              >
                <Table className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </div>

        {viewMode === "chart" ? (
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={activeData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#1a2654" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#7b8ab8", fontSize: 10 }}
                  interval={range === "month" && activeData.length > 16 ? 1 : 0}
                />
                <YAxis
                  yAxisId="quantity"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#7b8ab8", fontSize: 10 }}
                />
                <YAxis
                  yAxisId="efficiency"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#7b8ab8", fontSize: 10 }}
                  domain={efficiencyDomain}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0d1233",
                    border: "1px solid #1a2654",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#7b8ab8" }}
                  formatter={(value: number, name: string) => {
                    if (name === legendText.capacityEfficiency || name === legendText.energyEfficiency) {
                      return [`${value.toFixed(1)}%`, name]
                    }

                    const unit = name.includes("Capacity") || name.includes("容量") ? "Ah" : "kWh"
                    return [`${value.toFixed(1)} ${unit}`, name]
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "8px" }}
                  formatter={(value) => <span style={{ color: "#7b8ab8", fontSize: "11px" }}>{value}</span>}
                />
                <Bar
                  yAxisId="quantity"
                  dataKey="chargeCapacity"
                  name={legendText.chargeCapacity}
                  fill="#7dd3fc"
                  radius={[4, 4, 0, 0]}
                  barSize={10}
                />
                <Bar
                  yAxisId="quantity"
                  dataKey="dischargeCapacity"
                  name={legendText.dischargeCapacity}
                  fill="#fda4af"
                  radius={[4, 4, 0, 0]}
                  barSize={10}
                />
                <Bar
                  yAxisId="quantity"
                  dataKey="chargeEnergy"
                  name={legendText.chargeEnergy}
                  fill="#99f6e4"
                  radius={[4, 4, 0, 0]}
                  barSize={10}
                />
                <Bar
                  yAxisId="quantity"
                  dataKey="dischargeEnergy"
                  name={legendText.dischargeEnergy}
                  fill="#c4b5fd"
                  radius={[4, 4, 0, 0]}
                  barSize={10}
                />
                <Line
                  yAxisId="efficiency"
                  type="monotone"
                  dataKey="capacityEfficiency"
                  name={legendText.capacityEfficiency}
                  stroke="#facc15"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="efficiency"
                  type="monotone"
                  dataKey="energyEfficiency"
                  name={legendText.energyEfficiency}
                  stroke="#4ade80"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-[#1a2654]/80 bg-[#0d1433]/90">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="sticky top-0 z-10 bg-[#121a40]">
                <tr className="border-b border-[#1a2654] text-[#7b8ab8]">
                  <th className="px-3 py-3 text-left font-medium">
                    {language === "zh" ? "时间" : "Period"}
                  </th>
                  <th className="px-3 py-3 text-right font-medium">{legendText.chargeCapacity}</th>
                  <th className="px-3 py-3 text-right font-medium">{legendText.dischargeCapacity}</th>
                  <th className="px-3 py-3 text-right font-medium">{legendText.chargeEnergy}</th>
                  <th className="px-3 py-3 text-right font-medium">{legendText.dischargeEnergy}</th>
                  <th className="px-3 py-3 text-right font-medium">{legendText.capacityEfficiency}</th>
                  <th className="px-3 py-3 text-right font-medium">{legendText.energyEfficiency}</th>
                </tr>
              </thead>
              <tbody>
                {activeData.map((item) => (
                  <tr key={item.label} className="border-b border-[#1a2654]/60 last:border-b-0 hover:bg-[#1a2654]/20">
                    <td className="px-3 py-3 text-[#dce7ff]">{item.label}</td>
                    <td className="px-3 py-3 text-right font-mono text-[#eef4ff]">{item.chargeCapacity.toFixed(1)}</td>
                    <td className="px-3 py-3 text-right font-mono text-[#eef4ff]">{item.dischargeCapacity.toFixed(1)}</td>
                    <td className="px-3 py-3 text-right font-mono text-[#eef4ff]">{item.chargeEnergy.toFixed(1)}</td>
                    <td className="px-3 py-3 text-right font-mono text-[#eef4ff]">{item.dischargeEnergy.toFixed(1)}</td>
                    <td className="px-3 py-3 text-right font-mono text-[#00d4aa]">{item.capacityEfficiency.toFixed(1)}%</td>
                    <td className="px-3 py-3 text-right font-mono text-[#00d4aa]">{item.energyEfficiency.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
