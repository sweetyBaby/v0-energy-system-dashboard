"use client"

import { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { HistoryStyleLoadingIndicator } from "@/components/dashboard/history-style-loading-indicator"
import { useLanguage } from "@/components/language-provider"
import {
  buildCellNodeId,
  CELL_VARIABLES,
  fetchTrendSeries,
  startOfToday,
  type TrendFetchResult,
  type TrendSelection,
} from "@/lib/api/trend-analysis"

const POLL_MS = 10_000
const VOLTAGE_COLOR = "#22d3ee"
const TEMP_COLOR: Record<string, string> = { temp1: "#fbbf24", temp2: "#fb923c", temp3: "#f87171" }

const pad = (value: number) => String(value).padStart(2, "0")
const formatTick = (time: number) => {
  const date = new Date(time)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const formatFull = (time: number) => {
  const date = new Date(time)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const colorOf = (seriesId: string) => {
  if (seriesId.endsWith("::voltage")) return VOLTAGE_COLOR
  if (seriesId.endsWith("::temp1")) return TEMP_COLOR.temp1
  if (seriesId.endsWith("::temp2")) return TEMP_COLOR.temp2
  if (seriesId.endsWith("::temp3")) return TEMP_COLOR.temp3
  return VOLTAGE_COLOR
}

/**
 * Modal that shows one cell's real-time intraday trends — voltage + the 3
 * temperatures — opened from the rack voltage/temperature heatmap. Polls every
 * 10s like the rest of the realtime views. Data comes from `fetchTrendSeries`
 * (still mock; swap its body for a real API without touching this dialog).
 */
export function CellTrendDialog({
  projectId,
  deviceId,
  deviceName,
  cell,
  onClose,
}: {
  projectId: string
  deviceId: string
  deviceName: string
  cell: number
  onClose: () => void
}) {
  const { language } = useLanguage()
  const zh = language === "zh"

  const [result, setResult] = useState<TrendFetchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const selections = useMemo<TrendSelection[]>(
    () =>
      CELL_VARIABLES.map((variable) => ({
        nodeId: buildCellNodeId(deviceId, cell, variable.key),
        deviceId,
        deviceName,
        node: { kind: "cell" as const, deviceId, cell, cellVar: variable.key },
      })),
    [cell, deviceId, deviceName]
  )

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null
    const controller = new AbortController()

    const run = async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true)
      try {
        const end = Date.now()
        const data = await fetchTrendSeries({
          projectId,
          selections,
          startTime: startOfToday(end),
          endTime: end,
          intervalSeconds: 0,
          signal: controller.signal,
        })
        if (cancelled) return
        setResult(data)
        setLastUpdated(end)
        setError(null)
      } catch (err) {
        if (cancelled || controller.signal.aborted) return
        console.error("Failed to load cell trend", err)
        setError(zh ? "数据加载失败，请稍后重试" : "Failed to load data")
      } finally {
        if (!cancelled && showSpinner) setLoading(false)
      }
    }

    void run(true)
    timer = setInterval(() => void run(false), POLL_MS)

    return () => {
      cancelled = true
      controller.abort()
      if (timer) clearInterval(timer)
    }
  }, [projectId, selections, zh])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const seriesById = useMemo(() => {
    const map = new Map<string, TrendFetchResult["series"][number]>()
    result?.series.forEach((series) => map.set(series.id, series))
    return map
  }, [result])

  const chartData = useMemo(() => {
    if (!result) return []
    return result.timestamps.map((time, index) => {
      const row: Record<string, number | null> = { t: time }
      result.series.forEach((series) => {
        row[series.id] = series.values[index] ?? null
      })
      return row
    })
  }, [result])

  const voltageSeries = useMemo(() => result?.series.filter((s) => s.id.endsWith("::voltage")) ?? [], [result])
  const tempSeries = useMemo(() => result?.series.filter((s) => !s.id.endsWith("::voltage")) ?? [], [result])
  const [hiddenTempSeries, setHiddenTempSeries] = useState<Record<string, boolean>>({})

  const toggleTempSeries = (seriesId: string) => {
    setHiddenTempSeries((current) => {
      const willHide = !current[seriesId]
      if (willHide && tempSeries.filter((series) => !current[series.id]).length <= 1) return current

      if (!willHide) {
        const next = { ...current }
        delete next[seriesId]
        return next
      }

      return { ...current, [seriesId]: true }
    })
  }

  const renderChart = (title: string, unit: string, series: TrendFetchResult["series"], showLegend: boolean) => (
    <div className="rounded-xl border border-[#1a2654] bg-[#0d1233] p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#cfe4ff]">{title}</span>
        <span className="text-[11px] text-[#5d7299]">{unit}</span>
      </div>
      {showLegend && (
        <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {series.map((s) => {
            const hidden = !!hiddenTempSeries[s.id]
            const isLastVisible = !hidden && series.filter((item) => !hiddenTempSeries[item.id]).length <= 1
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleTempSeries(s.id)}
                aria-pressed={!hidden}
                aria-disabled={isLastVisible}
                title={zh ? (hidden ? "点击显示" : "点击隐藏") : hidden ? "Show" : "Hide"}
                className="flex cursor-pointer items-center gap-1.5 bg-transparent p-0 text-[11px] font-medium leading-none transition-colors"
                style={{ color: hidden ? "#90a7bd" : "#c9dcf6", textDecoration: "none" }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full transition-all"
                  style={
                    hidden
                      ? { background: "transparent", boxShadow: "inset 0 0 0 1.5px #7f96ad" }
                      : { background: colorOf(s.id), boxShadow: `0 0 7px ${colorOf(s.id)}` }
                  }
                />
                <span>{zh ? s.nameZh : s.nameEn}</span>
              </button>
            )
          })}
        </div>
      )}
      <div className="h-[190px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 2 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7b8ab8", fontSize: 11 }}
              tickFormatter={formatTick}
              minTickGap={48}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={44}
              domain={["auto", "auto"]}
              tick={{ fill: "#7b8ab8", fontSize: 11 }}
            />
            <Tooltip
              isAnimationActive={false}
              contentStyle={{ backgroundColor: "#0d1233", border: "1px solid #1a2654", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#7b8ab8", fontSize: 11 }}
              labelFormatter={(value: number) => formatFull(value)}
              formatter={(value: number | string, _name, item) => {
                const meta = seriesById.get(String(item?.dataKey ?? ""))
                if (!meta) return [value, _name]
                const numeric = typeof value === "number" ? value : Number(value)
                const display = Number.isFinite(numeric) ? numeric.toFixed(meta.digits) : "--"
                return [`${display} ${meta.unit}`, zh ? meta.nameZh : meta.nameEn]
              }}
            />
            {series.map((s) => (
              <Line
                key={s.id}
                type="monotone"
                dataKey={s.id}
                name={zh ? s.nameZh : s.nameEn}
                stroke={colorOf(s.id)}
                strokeWidth={1.6}
                dot={false}
                activeDot={{ r: 3 }}
                connectNulls
                isAnimationActive={false}
                hide={showLegend && !!hiddenTempSeries[s.id]}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-[#1f4f78] bg-[#0b1430] shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#1a2654] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="h-4 w-1 shrink-0 rounded-full bg-[#26f0dc] shadow-[0_0_8px_rgba(38,240,220,0.7)]" />
            <h3 className="truncate font-semibold tracking-[0.02em] text-[#dffefe]">
              {zh ? `电芯 #${cell} 实时趋势` : `Cell #${cell} Realtime Trend`}
            </h3>
            <span className="shrink-0 rounded bg-[#1a2654] px-2 py-0.5 font-mono text-[11px] text-[#7fdfff]">{deviceName}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={zh ? "关闭" : "Close"}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#9cc6d8] transition-colors hover:bg-[rgba(99,253,241,0.08)] hover:text-[#7ff8f0]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 px-4 pt-2 text-[11px] text-[#7b8ab8]">
          {zh ? "今日" : "Today"} 00:00 - {lastUpdated ? formatFull(lastUpdated) : "--:--:--"}
          <span className="mx-1.5 text-[#3a4a6a]">·</span>
          {zh ? "每 10 秒自动刷新" : "Auto-refresh every 10s"}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {loading && !result ? (
            <div className="flex h-[300px] items-center justify-center">
              <HistoryStyleLoadingIndicator text={zh ? "加载趋势数据..." : "Loading trend..."} />
            </div>
          ) : error && !result ? (
            <div className="flex h-[300px] items-center justify-center rounded-xl border border-[#1a2654]/80 bg-[#101840]/40 text-sm text-[#ff8da3]">
              {error}
            </div>
          ) : (
            <>
              {renderChart(zh ? "单体电压" : "Cell Voltage", "V", voltageSeries, false)}
              {renderChart(zh ? "温度 (T1 / T2 / T3)" : "Temperature (T1 / T2 / T3)", "℃", tempSeries, true)}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
