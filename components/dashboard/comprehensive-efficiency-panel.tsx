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
import { LineChartIcon, Table } from "lucide-react"
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

const yearMonthLabels = {
  zh: ["1\u6708", "2\u6708", "3\u6708", "4\u6708", "5\u6708", "6\u6708", "7\u6708", "8\u6708", "9\u6708", "10\u6708", "11\u6708", "12\u6708"],
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
    return [70, 100] as const
  }

  const values = points.flatMap((point) => [point.capacityEfficiency, point.energyEfficiency])
  const min = Math.floor(Math.min(...values) - 2)
  const max = Math.ceil(Math.max(...values) + 2)

  return [Math.max(70, min), Math.min(100, max)] as const
}

export function ComprehensiveEfficiencyPanel() {
  const { language } = useLanguage()
  const [range, setRange] = useState<RangeKey>("month")
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
    { key: "week" as const, label: language === "zh" ? "\u8fd17\u65e5" : "7 Days" },
    { key: "month" as const, label: language === "zh" ? "\u672c\u6708" : "This Month" },
    { key: "year" as const, label: language === "zh" ? "\u672c\u5e74" : "This Year" },
  ]

  const summaryColumns = [
    { key: "yesterday" as const, label: language === "zh" ? "\u6628\u65e5" : "Yesterday" },
    { key: "week" as const, label: language === "zh" ? "\u8fd17\u65e5" : "Last 7 Days" },
    { key: "month" as const, label: language === "zh" ? "\u672c\u6708" : "This Month" },
    { key: "year" as const, label: language === "zh" ? "\u672c\u5e74" : "This Year" },
  ]

  const efficiencySummaryRows = [
    {
      key: "systemEfficiency",
      label: language === "zh" ? "\u7cfb\u7edf\u6548\u7387" : "System Efficiency",
      emphasis: true,
      formatter: (metrics: SummaryMetrics) => `${metrics.systemEfficiency.toFixed(1)}%`,
    },
    {
      key: "avgCapacityEfficiency",
      label: language === "zh" ? "\u5e73\u5747\u5bb9\u91cf\u6548\u7387" : "Avg Capacity Efficiency",
      emphasis: true,
      formatter: (metrics: SummaryMetrics) => `${metrics.avgCapacityEfficiency.toFixed(1)}%`,
    },
    {
      key: "avgEnergyEfficiency",
      label: language === "zh" ? "\u5e73\u5747\u80fd\u91cf\u6548\u7387" : "Avg Energy Efficiency",
      emphasis: true,
      formatter: (metrics: SummaryMetrics) => `${metrics.avgEnergyEfficiency.toFixed(1)}%`,
    },
  ]

  const aggregateSummaryRows = [
    {
      key: "chargeEnergy",
      label: language === "zh" ? "\u7d2f\u8ba1\u5145\u7535\u91cf" : "Charge Energy",
      formatter: (metrics: SummaryMetrics) => `${(metrics.chargeEnergy / 1000).toFixed(2)} MWh`,
    },
    {
      key: "dischargeEnergy",
      label: language === "zh" ? "\u7d2f\u8ba1\u653e\u7535\u91cf" : "Discharge Energy",
      formatter: (metrics: SummaryMetrics) => `${(metrics.dischargeEnergy / 1000).toFixed(2)} MWh`,
    },
    {
      key: "chargeCapacity",
      label: language === "zh" ? "\u7d2f\u8ba1\u5145\u7535\u5bb9\u91cf" : "Charge Capacity",
      formatter: (metrics: SummaryMetrics) => `${metrics.chargeCapacity.toFixed(metrics.chargeCapacity >= 1000 ? 0 : 1)} Ah`,
    },
    {
      key: "dischargeCapacity",
      label: language === "zh" ? "\u7d2f\u8ba1\u653e\u7535\u5bb9\u91cf" : "Discharge Capacity",
      formatter: (metrics: SummaryMetrics) => `${metrics.dischargeCapacity.toFixed(metrics.dischargeCapacity >= 1000 ? 0 : 1)} Ah`,
    },
  ]

  const summaryRowGroups = [
    { key: "efficiency", rows: efficiencySummaryRows },
    { key: "aggregate", rows: aggregateSummaryRows },
  ]

  const legendText = {
    chargeCapacity: language === "zh" ? "\u5145\u7535\u5bb9\u91cf (Ah)" : "Charge Capacity (Ah)",
    dischargeCapacity: language === "zh" ? "\u653e\u7535\u5bb9\u91cf (Ah)" : "Discharge Capacity (Ah)",
    chargeEnergy: language === "zh" ? "\u5145\u7535\u7535\u91cf (kWh)" : "Charge Energy (kWh)",
    dischargeEnergy: language === "zh" ? "\u653e\u7535\u7535\u91cf (kWh)" : "Discharge Energy (kWh)",
    capacityEfficiency: language === "zh" ? "\u5bb9\u91cf\u6548\u7387 (%)" : "Capacity Efficiency (%)",
    energyEfficiency: language === "zh" ? "\u80fd\u91cf\u6548\u7387 (%)" : "Energy Efficiency (%)",
  }

  if (!mounted) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] p-4">
        <div className="flex h-full items-center justify-center text-sm text-[#7b8ab8]">
          {language === "zh" ? "\u52a0\u8f7d\u7efc\u5408\u80fd\u6548\u6570\u636e..." : "Loading efficiency data..."}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] p-4">
      <div className="mb-4 rounded-xl border border-[#1a2654] bg-[linear-gradient(180deg,rgba(16,24,64,0.9),rgba(10,18,48,0.94))] p-3">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {summaryRowGroups.map((group) => (
            <div
              key={group.key}
              className="overflow-hidden rounded-lg border border-[#1a2654]/80 bg-[#0d1433]/90"
            >
              <table className="w-full table-fixed text-[12px]">
                <thead className="bg-[#121a40]">
                  <tr className="border-b border-[#1a2654] text-[#7b8ab8]">
                    <th className="px-3 py-2.5 text-left font-medium">
                      {language === "zh" ? "\u6307\u6807" : "Metric"}
                    </th>
                    {summaryColumns.map((column) => (
                      <th key={column.key} className="px-2 py-2.5 text-right font-medium">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={row.key} className="border-b border-[#1a2654]/60 last:border-b-0 hover:bg-[#1a2654]/20">
                      <td className="px-3 py-2.5">
                        <span className={`font-medium ${row.emphasis ? "text-[#bfeadf]" : "text-[#cdd9f7]"}`}>{row.label}</span>
                      </td>
                      {summaryColumns.map((column) => (
                        <td
                          key={`${row.key}-${column.key}`}
                          className={`px-2 py-2.5 text-right font-mono ${row.emphasis ? "text-[#00d4aa]" : "text-[#eef4ff]"}`}
                        >
                          {row.formatter(summaryData[column.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[#1a2654] bg-[linear-gradient(180deg,rgba(16,24,64,0.9),rgba(10,18,48,0.94))] p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-[#1a2654]/50 p-1">
              {rangeOptions.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setRange(item.key)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-all ${
                    range === item.key
                      ? "bg-[#00d4aa] font-medium text-[#0a0e27]"
                      : "text-[#7b8ab8] hover:text-[#e8f4fc]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1 rounded-lg bg-[#1a2654]/50 p-1">
              <button
                onClick={() => setViewMode("chart")}
                className={`rounded-md p-1.5 transition-all ${
                  viewMode === "chart"
                    ? "bg-[#3b82f6] text-white"
                    : "text-[#7b8ab8] hover:text-[#e8f4fc]"
                }`}
                aria-label={language === "zh" ? "\u56fe\u8868" : "Chart"}
                title={language === "zh" ? "\u56fe\u8868" : "Chart"}
              >
                <LineChartIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`rounded-md p-1.5 transition-all ${
                  viewMode === "table"
                    ? "bg-[#3b82f6] text-white"
                    : "text-[#7b8ab8] hover:text-[#e8f4fc]"
                }`}
                aria-label={language === "zh" ? "\u8868\u683c" : "Table"}
                title={language === "zh" ? "\u8868\u683c" : "Table"}
              >
                <Table className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {viewMode === "chart" ? (
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={activeData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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

                    const unit = name.includes("Capacity") || name.includes("\u5bb9\u91cf") ? "Ah" : "kWh"
                    return [`${value.toFixed(1)} ${unit}`, name]
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "12px" }}
                  formatter={(value) => <span style={{ color: "#7b8ab8", fontSize: "12px" }}>{value}</span>}
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
          <div className="h-[330px] overflow-auto rounded-lg border border-[#1a2654]/80 bg-[#0d1433]/90">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="sticky top-0 z-10 bg-[#121a40]">
                <tr className="border-b border-[#1a2654] text-[#7b8ab8]">
                  <th className="px-3 py-3 text-left font-medium">
                    {language === "zh" ? "\u65f6\u95f4" : "Period"}
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
