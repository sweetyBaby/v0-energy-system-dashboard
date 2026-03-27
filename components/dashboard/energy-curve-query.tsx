"use client"

import { useEffect, useState } from "react"
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { useLanguage } from "@/components/language-provider"

type TimeRange = "week" | "month" | "year"
type ViewMode = "chart" | "table"

type DataPoint = {
  label: string
  charge: number
  discharge: number
}

const monthNamesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const randomValue = (min: number, max: number) => Math.round(min + Math.random() * (max - min))

const generateWeekData = (): DataPoint[] => {
  const today = new Date()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - 6 + index)
    return {
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      charge: randomValue(1500, 2500),
      discharge: randomValue(1400, 2350),
    }
  })
}

const generateMonthData = (language: "zh" | "en"): DataPoint[] => {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const data: DataPoint[] = []
  for (let date = new Date(firstDay); date <= today; date.setDate(date.getDate() + 1)) {
    data.push({
      label: language === "zh" ? `${date.getDate()}日` : `${date.getDate()}`,
      charge: randomValue(1500, 2500),
      discharge: randomValue(1400, 2350),
    })
  }
  return data
}

const generateYearData = (language: "zh" | "en"): DataPoint[] => {
  const today = new Date()
  const data: DataPoint[] = []
  for (let month = 0; month <= today.getMonth(); month += 1) {
    data.push({
      label: language === "zh" ? `${month + 1}月` : monthNamesEn[month],
      charge: randomValue(40000, 65000),
      discharge: randomValue(38000, 62000),
    })
  }
  return data
}

const formatAxisValue = (value: number) => {
  if (value >= 1000) {
    const scaled = value / 1000
    return Number.isInteger(scaled) ? `${scaled}k` : `${scaled.toFixed(1)}k`
  }
  return value.toString()
}

function IconChart({ active }: { active: boolean }) {
  const c = active ? "#07162b" : "#5a7aaa"
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="9" width="3" height="6" rx="0.6" fill={c} />
      <rect x="6" y="5" width="3" height="10" rx="0.6" fill={c} />
      <rect x="11" y="2" width="3" height="13" rx="0.6" fill={c} />
      <line x1="1" y1="15.5" x2="15" y2="15.5" stroke={c} strokeWidth="1" />
    </svg>
  )
}

function IconTable({ active }: { active: boolean }) {
  const c = active ? "#07162b" : "#5a7aaa"
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="1.5" stroke={c} strokeWidth="1.2" fill="none" />
      <line x1="1" y1="5.5" x2="15" y2="5.5" stroke={c} strokeWidth="1" />
      <line x1="1" y1="9.5" x2="15" y2="9.5" stroke={c} strokeWidth="1" />
      <line x1="6" y1="5.5" x2="6" y2="15" stroke={c} strokeWidth="1" />
    </svg>
  )
}

export function EnergyCurveQuery() {
  const { t, language } = useLanguage()
  const [timeRange, setTimeRange] = useState<TimeRange>("week")
  const [viewMode, setViewMode] = useState<ViewMode>("chart")
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<DataPoint[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (timeRange === "week") {
      setData(generateWeekData())
      return
    }
    if (timeRange === "month") {
      setData(generateMonthData(language))
      return
    }
    setData(generateYearData(language))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, mounted, timeRange])

  const xInterval = data.length > 15 ? Math.floor(data.length / 10) : 0
  const barSize = data.length > 20 ? 8 : 14

  if (!mounted) {
    return (
      <div className="flex h-full w-full flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3 className="text-base font-semibold text-[#00d4aa]">{t("chargeDischargeStats")}</h3>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <span className="text-sm text-[#7b8ab8]">{t("loading")}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3 className="text-base font-semibold text-[#00d4aa]">{t("chargeDischargeStats")}</h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-xl bg-[#16204b]/90 p-1">
            {(["week", "month", "year"] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`rounded-lg px-3 py-1.5 text-[13px] transition-all ${
                  timeRange === r
                    ? "bg-[#11d8bf] font-medium text-[#07162b] shadow-[0_0_18px_rgba(17,216,191,0.2)]"
                    : "text-[#7b8ab8] hover:text-[#e8f4fc]"
                }`}
              >
                {r === "week" ? t("thisWeek") : r === "month" ? t("thisMonth") : t("thisYear")}
              </button>
            ))}
          </div>

          <div className="flex gap-0.5 rounded-lg border border-[#1a2654] bg-[#0a1225] p-0.5">
            <button
              onClick={() => setViewMode("chart")}
              title="图表视图"
              className={`flex items-center justify-center rounded-md p-1.5 transition-all ${
                viewMode === "chart"
                  ? "bg-[#11d8bf] shadow-[0_0_10px_rgba(17,216,191,0.25)]"
                  : "hover:bg-[#1a2654]/60"
              }`}
            >
              <IconChart active={viewMode === "chart"} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              title="表格视图"
              className={`flex items-center justify-center rounded-md p-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-[#11d8bf] shadow-[0_0_10px_rgba(17,216,191,0.25)]"
                  : "hover:bg-[#1a2654]/60"
              }`}
            >
              <IconTable active={viewMode === "table"} />
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {viewMode === "chart" ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1a2654" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7b8ab8", fontSize: 10 }}
                interval={xInterval}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7b8ab8", fontSize: 10 }}
                tickFormatter={formatAxisValue}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#0d1233", border: "1px solid #1a2654", borderRadius: "8px" }}
                labelStyle={{ color: "#7b8ab8" }}
                formatter={(value: number, name: string) => [`${value.toLocaleString()} kWh`, name]}
              />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => <span style={{ color: "#7b8ab8", fontSize: "12px" }}>{value}</span>}
              />
              <Bar dataKey="charge" name={t("chargeBar")} fill="#3b82f6" fillOpacity={0.75} radius={[3, 3, 0, 0]} barSize={barSize} />
              <Bar dataKey="discharge" name={t("dischargeBar")} fill="#f97316" fillOpacity={0.75} radius={[3, 3, 0, 0]} barSize={barSize} />
              <Line type="monotone" dataKey="charge" name={t("chargeLine")} stroke="#60a5fa" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="discharge" name={t("dischargeLine")} stroke="#fb923c" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full overflow-auto
            [&::-webkit-scrollbar]:w-[4px]
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-[#1e3a6e]
            [&::-webkit-scrollbar-thumb:hover]:bg-[#2d5499]">
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 z-10 bg-[#0d1233]">
                <tr className="border-b border-[#1a2654]">
                  <th className="py-2 pl-3 pr-2 text-left font-medium text-[#5a7aaa]">日期</th>
                  <th className="py-2 px-2 text-right font-medium text-[#3b82f6]">充电量(kWh)</th>
                  <th className="py-2 px-2 text-right font-medium text-[#f97316]">放电量(kWh)</th>
                  <th className="py-2 pl-2 pr-3 text-right font-medium text-[#00d4aa]">效率</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => {
                  const eff = row.charge > 0 ? ((row.discharge / row.charge) * 100).toFixed(1) : "—"
                  return (
                    <tr
                      key={i}
                      className="border-b border-[#1a2654]/40 transition-colors hover:bg-[#1a2654]/25"
                    >
                      <td className="py-1.5 pl-3 pr-2 tabular-nums text-[#7ab0f0]">{row.label}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-[#60a5fa]">{row.charge.toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-[#fb923c]">{row.discharge.toLocaleString()}</td>
                      <td className="py-1.5 pl-2 pr-3 text-right tabular-nums text-[#00d4aa]">{eff === "—" ? eff : `${eff}%`}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="sticky bottom-0 bg-[#0d1233]">
                <tr className="border-t border-[#1a2654]">
                  <td className="py-1.5 pl-3 pr-2 font-semibold text-[#5a7aaa]">合计</td>
                  <td className="py-1.5 px-2 text-right font-semibold tabular-nums text-[#3b82f6]">
                    {data.reduce((s, r) => s + r.charge, 0).toLocaleString()}
                  </td>
                  <td className="py-1.5 px-2 text-right font-semibold tabular-nums text-[#f97316]">
                    {data.reduce((s, r) => s + r.discharge, 0).toLocaleString()}
                  </td>
                  <td className="py-1.5 pl-2 pr-3 text-right font-semibold tabular-nums text-[#00d4aa]">
                    {(() => {
                      const tc = data.reduce((s, r) => s + r.charge, 0)
                      const td = data.reduce((s, r) => s + r.discharge, 0)
                      return tc > 0 ? ((td / tc) * 100).toFixed(1) + "%" : "—"
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
