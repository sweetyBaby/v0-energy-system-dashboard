"use client"

import { useMemo, useState } from "react"
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { LineChart as LineChartIcon, Table } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import type { DailyTrendRangePoint, DailyTrendRangeSummary } from "@/lib/api/daily-trend-range"

const TS = { backgroundColor: "#0d1233", border: "1px solid #1a2654", borderRadius: "8px", fontSize: 11 }
const TABLE_SCROLLBAR =
  "h-full overflow-auto rounded-xl border border-[#1a2654]/80 bg-[linear-gradient(180deg,rgba(13,20,51,0.95),rgba(11,18,44,0.92))] [scrollbar-color:rgba(34,211,238,0.38)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#1f4f78] [&::-webkit-scrollbar-thumb:hover]:bg-[#2aa7b3]"

const formatMetric = (value: number | null | undefined, digits = 3, suffix = "") => {
  if (value == null || Number.isNaN(value)) return "--"
  return `${value.toFixed(digits)}${suffix}`
}

const formatTableMetric = (value: number | null | undefined, digits = 3) => {
  if (value == null || Number.isNaN(value)) return "--"
  return value.toFixed(digits)
}

function AnalysisPlaceholder({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-[#1a2654]/80 bg-[linear-gradient(180deg,rgba(13,20,51,0.72),rgba(11,18,44,0.78))] px-4 text-center text-sm text-[#7b8ab8]">
      {text}
    </div>
  )
}

export function VoltageDifferenceAnalysis({
  range,
  summary,
  trendData,
  loading,
  error,
}: {
  range: number
  summary: DailyTrendRangeSummary | null
  trendData: DailyTrendRangePoint[]
  loading: boolean
  error: string | null
}) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart")
  const { t, language } = useLanguage()
  const zh = language === "zh"

  const data = useMemo(
    () =>
      trendData.map((item) => ({
        day: item.label,
        maxDiff: item.maxVoltageDiff,
        minDiff: item.minVoltageDiff,
      })),
    [trendData]
  )

  const stats = summary ?? {
    maxVoltageDiff: null,
    minVoltageDiff: null,
  }

  const placeholderText = loading
    ? (zh ? "加载压差分析..." : "Loading voltage diff analysis...")
    : error
      ? error
      : (zh ? "暂无压差分析数据" : "No voltage diff analysis data")

  return (
    <div className="flex h-full flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3 className="text-sm font-semibold text-[#00d4aa]">{t("voltageDiffAnalysis")}</h3>
        </div>
        <div className="flex gap-1 rounded-lg bg-[#1a2654]/50 p-1">
          <button
            onClick={() => setViewMode("chart")}
            className={`rounded-md p-1.5 transition-all ${viewMode === "chart" ? "bg-[#00d4aa] text-[#0a0e27]" : "text-[#7b8ab8]"}`}
          >
            <LineChartIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`rounded-md p-1.5 transition-all ${viewMode === "table" ? "bg-[#00d4aa] text-[#0a0e27]" : "text-[#7b8ab8]"}`}
          >
            <Table className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {[
          { label: zh ? "最大压差" : "Max Diff", value: formatMetric(stats.maxVoltageDiff, 3, " V"), color: "#ef4444" },
          { label: zh ? "最小压差" : "Min Diff", value: formatMetric(stats.minVoltageDiff, 3, " V"), color: "#22d3ee" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-[#1a2654]/60 bg-[#101840]/80 px-2 py-2 text-center">
            <div className="text-xs font-medium text-[#7b8ab8]">{item.label}</div>
            <div className="mt-0.5 font-mono text-[0.95rem] font-bold" style={{ color: item.color }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {viewMode === "chart" ? (
          data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#7b8ab8", fontSize: 10 }}
                  interval={range > 15 ? 4 : range > 7 ? 1 : 0}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#7b8ab8", fontSize: 10 }} unit="V" />
                <Tooltip
                  contentStyle={TS}
                  labelStyle={{ color: "#7b8ab8" }}
                  formatter={(value: number | null, name: string) => [formatMetric(value, 3, " V"), name]}
                />
                <Legend wrapperStyle={{ paddingTop: "6px" }} formatter={(value) => <span style={{ color: "#7b8ab8", fontSize: "11px" }}>{value}</span>} />
                <Line type="monotone" connectNulls={false} dataKey="maxDiff" name={zh ? "最大压差" : "Max Diff"} stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                <Line type="monotone" connectNulls={false} dataKey="minDiff" name={zh ? "最小压差" : "Min Diff"} stroke="#22d3ee" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <AnalysisPlaceholder text={placeholderText} />
          )
        ) : data.length > 0 ? (
          <div className={TABLE_SCROLLBAR}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0d1233]">
                <tr className="border-b border-[#1a2654] text-[#7b8ab8]">
                  <th className="px-2 py-2 text-left">{t("date")}</th>
                  <th className="px-2 py-2 text-right">{zh ? "最大压差(V)" : "Max (V)"}</th>
                  <th className="px-2 py-2 text-right">{zh ? "最小压差(V)" : "Min (V)"}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={`${item.day}-${index}`} className="border-b border-[#1a2654]/50 hover:bg-[#1a2654]/30">
                    <td className="px-2 py-1.5">{item.day}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[#ef4444]">{formatTableMetric(item.maxDiff, 3)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[#22d3ee]">{formatTableMetric(item.minDiff, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AnalysisPlaceholder text={placeholderText} />
        )}
      </div>
    </div>
  )
}
