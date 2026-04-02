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

type ComprehensiveEfficiencyPanelProps = {
  compact?: boolean
}

const yearMonthLabels = {
  zh: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
} as const

// 75kW/150kWh 系统，V≈1300V → 额定容量≈115Ah
// 日充约115kWh / 88Ah，日放约96kWh / 74Ah，效率≈83-85%
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
    const dischargeEnergy = chargeEnergy * 0.840 + (index % 4) * 2

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

export function ComprehensiveEfficiencyPanel({
  compact = false,
}: ComprehensiveEfficiencyPanelProps) {
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

  const activeData = useMemo(() => {
    if (range === "week") return weekData
    if (range === "year") return yearData
    return monthData
  }, [monthData, range, weekData, yearData])

  const rangeOptions = [
    { key: "week" as const, label: language === "zh" ? "近7日" : "7 Days" },
    { key: "month" as const, label: language === "zh" ? "本月" : "This Month" },
    { key: "year" as const, label: language === "zh" ? "本年" : "This Year" },
  ]

  const legendText = {
    chargeCapacity: language === "zh" ? "充电容量 (Ah)" : "Charge Capacity (Ah)",
    dischargeCapacity: language === "zh" ? "放电容量 (Ah)" : "Discharge Capacity (Ah)",
    chargeEnergy: language === "zh" ? "充电电量 (kWh)" : "Charge Energy (kWh)",
    dischargeEnergy: language === "zh" ? "放电电量 (kWh)" : "Discharge Energy (kWh)",
    capacityEfficiency: language === "zh" ? "容量效率 (%)" : "Capacity Efficiency (%)",
    energyEfficiency: language === "zh" ? "能量效率 (%)" : "Energy Efficiency (%)",
  }

  const tableHeaders = {
    period: language === "zh" ? "时间" : "Period",
    chargeCapacity: language === "zh" ? "充电容量 (Ah)" : "Charge Capacity (Ah)",
    dischargeCapacity: language === "zh" ? "放电容量 (Ah)" : "Discharge Capacity (Ah)",
    capacityEfficiency: language === "zh" ? "容量效率 (%)" : "Capacity Efficiency (%)",
    chargeEnergy: language === "zh" ? "充电电量 (kWh)" : "Charge Energy (kWh)",
    dischargeEnergy: language === "zh" ? "放电电量 (kWh)" : "Discharge Energy (kWh)",
    energyEfficiency: language === "zh" ? "能量效率 (%)" : "Energy Efficiency (%)",
  }

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

          <div className="flex gap-1 rounded-xl bg-[#1a2654]/50 p-1">
            <button
              onClick={() => setViewMode("chart")}
              className={`rounded-md p-1.5 transition-all ${
                viewMode === "chart" ? "bg-[#3b82f6] text-white" : "text-[#7b8ab8] hover:text-[#e8f4fc]"
              }`}
              aria-label={language === "zh" ? "图表" : "Chart"}
              title={language === "zh" ? "图表" : "Chart"}
            >
              <LineChartIcon className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`rounded-md p-1.5 transition-all ${
                viewMode === "table" ? "bg-[#3b82f6] text-white" : "text-[#7b8ab8] hover:text-[#e8f4fc]"
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
            <ComposedChart data={activeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                domain={[89, 98]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7b8ab8", fontSize: 10 }}
                tickFormatter={(value: number) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0d1233",
                  border: "1px solid #1a2654",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#7b8ab8" }}
                formatter={(value: number, name: string) => {
                  const unit = name.includes("Efficiency")
                    ? "%"
                    : name.includes("Capacity")
                      ? "Ah"
                      : "kWh"
                  return [`${value.toFixed(1)} ${unit}`, name]
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "4px" }}
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
                stroke="#ffd60a"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#0d1233", stroke: "#ffd60a", strokeWidth: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="efficiency"
                type="monotone"
                dataKey="energyEfficiency"
                name={legendText.energyEfficiency}
                stroke="#4ade80"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#0d1233", stroke: "#4ade80", strokeWidth: 3 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-lg border border-[#1a2654]/80 bg-[#0d1433]/90 [scrollbar-color:rgba(34,211,238,0.38)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#1f4f78] [&::-webkit-scrollbar-thumb:hover]:bg-[#2aa7b3]">
          <table className="w-full table-fixed text-[12px]">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-[#121a40]">
              <tr className="border-b border-[#1a2654] text-[#7b8ab8]">
                <th className="px-2 py-3 text-left text-[11px] font-medium leading-tight">{tableHeaders.period}</th>
                <th className="px-2 py-3 text-right text-[11px] font-medium leading-tight">{tableHeaders.chargeCapacity}</th>
                <th className="px-2 py-3 text-right text-[11px] font-medium leading-tight">{tableHeaders.dischargeCapacity}</th>
                <th className="px-2 py-3 text-right text-[11px] font-medium leading-tight">{tableHeaders.capacityEfficiency}</th>
                <th className="px-2 py-3 text-right text-[11px] font-medium leading-tight">{tableHeaders.chargeEnergy}</th>
                <th className="px-2 py-3 text-right text-[11px] font-medium leading-tight">{tableHeaders.dischargeEnergy}</th>
                <th className="px-2 py-3 text-right text-[11px] font-medium leading-tight">{tableHeaders.energyEfficiency}</th>
              </tr>
            </thead>
            <tbody>
              {activeData.map((item) => (
                <tr key={item.label} className="border-b border-[#1a2654]/60 last:border-b-0 hover:bg-[#1a2654]/20">
                  <td className="truncate px-2 py-3 text-[#dce7ff]">{item.label}</td>
                  <td className="px-2 py-3 text-right font-mono text-[11px] text-[#eef4ff]">{item.chargeCapacity.toFixed(1)}</td>
                  <td className="px-2 py-3 text-right font-mono text-[11px] text-[#eef4ff]">{item.dischargeCapacity.toFixed(1)}</td>
                  <td className="px-2 py-3 text-right font-mono text-[11px] text-[#eef4ff]">{item.capacityEfficiency.toFixed(1)}%</td>
                  <td className="px-2 py-3 text-right font-mono text-[11px] text-[#eef4ff]">{item.chargeEnergy.toFixed(1)}</td>
                  <td className="px-2 py-3 text-right font-mono text-[11px] text-[#eef4ff]">{item.dischargeEnergy.toFixed(1)}</td>
                  <td className="px-2 py-3 text-right font-mono text-[11px] text-[#4ade80]">{item.energyEfficiency.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
