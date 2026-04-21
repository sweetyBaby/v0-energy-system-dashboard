"use client"

import { useMemo, useState } from "react"
import { LineChart as LineChartIcon, Table } from "lucide-react"
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { HistoryStyleLoadingIndicator } from "@/components/dashboard/history-style-loading-indicator"
import { useLanguage } from "@/components/language-provider"
import { useDashboardViewport } from "@/hooks/use-dashboard-viewport"
import { DASHBOARD_DENSE_PANEL_SCALE, useFluidScale } from "@/hooks/use-fluid-scale"
import type { DailyTrendRangePoint, DailyTrendRangeSummary } from "@/lib/api/daily-trend-range"

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

function AnalysisPlaceholder({ text, fontSize }: { text: string; fontSize: number }) {
  return (
    <div
      className="flex h-full items-center justify-center rounded-xl border border-[#1a2654]/80 bg-[linear-gradient(180deg,rgba(13,20,51,0.72),rgba(11,18,44,0.78))] px-4 text-center text-[#7b8ab8]"
      style={{ fontSize }}
    >
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
  const { isCompactViewport } = useDashboardViewport()
  const zh = language === "zh"
  const scale = useFluidScale<HTMLDivElement>(1180, 2560, { ...DASHBOARD_DENSE_PANEL_SCALE, maxRootPx: 25 })
  const titleSize = scale.clampText(0.9, 0.98, 1.5)
  const cardLabelSize = scale.fluid(12, 17)
  const cardValueSize = scale.clampText(0.95, 1.08, 1.72)
  const tableSize = scale.fluid(12, 16)
  const chartFontSize = scale.chart(10, 15)
  const tooltipFontSize = scale.chart(11, 16)
  const iconEdge = scale.fluid(26, 37)
  const iconSize = scale.fluid(14, 20)

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

  const tooltipStyle = useMemo(
    () => ({
      backgroundColor: "#0d1233",
      border: "1px solid #1a2654",
      borderRadius: "8px",
      fontSize: tooltipFontSize,
    }),
    [tooltipFontSize]
  )

  const loadingText = zh ? "加载压差分析..." : "Loading voltage diff analysis..."
  const placeholderText = error ? error : zh ? "暂无压差分析数据" : "No voltage diff analysis data"

  return (
    <div
      ref={scale.ref}
      className={`flex h-full flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] ${isCompactViewport ? "p-3" : "p-4"}`}
      style={scale.rootStyle}
    >
      <div className={`flex items-center justify-between ${isCompactViewport ? "mb-2" : "mb-3"}`}>
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3 className="font-semibold text-[#00d4aa]" style={{ fontSize: titleSize }}>
            {t("voltageDiffAnalysis")}
          </h3>
        </div>
        <div className="flex gap-1 rounded-lg bg-[#1a2654]/50 p-1">
          <button
            onClick={() => setViewMode("chart")}
            className={`rounded-md transition-all ${viewMode === "chart" ? "bg-[#00d4aa] text-[#0a0e27]" : "text-[#7b8ab8]"}`}
            style={{ width: iconEdge, height: iconEdge }}
          >
            <LineChartIcon style={{ width: iconSize, height: iconSize, margin: "0 auto" }} />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`rounded-md transition-all ${viewMode === "table" ? "bg-[#00d4aa] text-[#0a0e27]" : "text-[#7b8ab8]"}`}
            style={{ width: iconEdge, height: iconEdge }}
          >
            <Table style={{ width: iconSize, height: iconSize, margin: "0 auto" }} />
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-2 ${isCompactViewport ? "mb-2" : "mb-3"}`}>
        {[
          { label: zh ? "最大压差" : "Max Diff", value: formatMetric(stats.maxVoltageDiff, 3, " V"), color: "#ef4444" },
          { label: zh ? "最小压差" : "Min Diff", value: formatMetric(stats.minVoltageDiff, 3, " V"), color: "#22d3ee" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-[#1a2654]/60 bg-[#101840]/80 px-2 py-2 text-center">
            <div className="font-medium text-[#7b8ab8]" style={{ fontSize: cardLabelSize }}>
              {item.label}
            </div>
            <div className="mt-0.5 font-mono font-bold" style={{ color: item.color, fontSize: cardValueSize }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full min-h-0 items-center justify-center px-4">
            <HistoryStyleLoadingIndicator text={loadingText} />
          </div>
        ) : viewMode === "chart" ? (
          data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#7b8ab8", fontSize: chartFontSize }}
                  interval={range > 15 ? 4 : range > 7 ? 1 : 0}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#7b8ab8", fontSize: chartFontSize }} unit="V" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#7b8ab8", fontSize: tooltipFontSize }}
                  formatter={(value: number | null, name: string) => [formatMetric(value, 3, " V"), name]}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "6px" }}
                  formatter={(value) => <span style={{ color: "#7b8ab8", fontSize: chartFontSize }}>{value}</span>}
                />
                <Line type="monotone" connectNulls={false} dataKey="maxDiff" name={zh ? "最大压差" : "Max Diff"} stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                <Line type="monotone" connectNulls={false} dataKey="minDiff" name={zh ? "最小压差" : "Min Diff"} stroke="#22d3ee" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <AnalysisPlaceholder text={placeholderText} fontSize={tableSize} />
          )
        ) : data.length > 0 ? (
          <div className={TABLE_SCROLLBAR}>
            <table className="w-full" style={{ fontSize: tableSize }}>
              <thead className="sticky top-0 bg-[#0d1233]">
                <tr className="border-b border-[#1a2654] text-[#7b8ab8]">
                  <th className="px-2 py-2 text-left">{t("date")}</th>
                  <th className="px-2 py-2 text-right">{zh ? "最大(V)" : "Max (V)"}</th>
                  <th className="px-2 py-2 text-right">{zh ? "最小(V)" : "Min (V)"}</th>
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
          <AnalysisPlaceholder text={placeholderText} fontSize={tableSize} />
        )}
      </div>
    </div>
  )
}
