"use client"

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react"
import type { DateRange } from "react-day-picker"
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts"
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"
import { CustomRangePicker } from "@/components/dashboard/custom-range-picker"
import { HistoryStyleLoadingIndicator } from "@/components/dashboard/history-style-loading-indicator"
import { useProject } from "@/components/dashboard/dashboard-header"
import { useLanguage } from "@/components/language-provider"
import { useDashboardViewport } from "@/hooks/use-dashboard-viewport"
import { useFluidScale } from "@/hooks/use-fluid-scale"
import {
  fetchPowerRange,
  fetchTodayPowerDaily,
  fetchTodayPowerIncremental,
  mergePowerPoints,
  type PowerPoint,
} from "@/lib/api/power"

type QueryType = "today" | "yesterday" | "week" | "custom"

type ChartPoint = {
  key: string
  label: string
  timestamp: number
  power: number | null
  tooltipLabel: string
}

type ViewportRange = {
  startIndex: number
  endIndex: number
}

type DragState = {
  pointerId: number
  startX: number
  startRange: ViewportRange
}

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const SINGLE_DAY_MIN_WINDOW_MS = {
  compact: 6 * HOUR_MS,
  regular: 4 * HOUR_MS,
}
const TODAY_POLL_MS = 6_000
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

const formatDateOnly = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

const formatTimeLabel = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`

const formatHourTick = (timestamp: number, dayStart: number, dayEnd: number) => {
  if (timestamp === dayEnd) {
    return "24:00"
  }

  const hour = Math.round((timestamp - dayStart) / HOUR_MS)
  return `${String(hour).padStart(2, "0")}:00`
}

const formatSingleDayHourLabel = (
  timestamp: number,
  dayStart: number,
  dayEnd: number,
  compact: boolean,
) => {
  const hour = Math.round((timestamp - dayStart) / (60 * 60 * 1000))

  if (!compact || timestamp === dayStart || timestamp === dayEnd || hour % 2 === 0) {
    return formatHourTick(timestamp, dayStart, dayEnd)
  }

  return ""
}

const formatSingleDayAxisLabel = (
  timestamp: number,
  axisStart: number,
  axisEnd: number,
  dayStart: number,
  dayEnd: number,
  compact: boolean,
) => {
  const isBoundary = timestamp === axisStart || timestamp === axisEnd
  const isAlignedHour = timestamp % HOUR_MS === 0

  if (isBoundary && !isAlignedHour) {
    return formatTimeLabel(new Date(timestamp))
  }

  return formatSingleDayHourLabel(timestamp, dayStart, dayEnd, compact)
}

const formatDateTimeLabel = (date: Date) =>
  `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`

const formatDayLabel = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`

const formatRangeLabel = (range: DateRange | undefined, language: "zh" | "en") => {
  if (!range?.from) {
    return language === "zh" ? "选择日期范围" : "Select range"
  }

  const formatDate = (date: Date) => `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`

  if (!range.to) {
    return formatDate(range.from)
  }

  return `${formatDate(range.from)} - ${formatDate(range.to)}`
}

const toSeconds = (timestamp: number) => Math.floor(timestamp / 1000)
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const findRangeIndicesByTime = (points: ChartPoint[], startTime: number, endTime: number) => {
  if (points.length === 0) {
    return { startIndex: 0, endIndex: 0 }
  }

  let startIndex = points.findIndex((point) => point.timestamp >= startTime)
  if (startIndex === -1) {
    startIndex = points.length - 1
  } else if (startIndex > 0 && points[startIndex].timestamp > startTime) {
    startIndex -= 1
  }

  let endIndex = points.length - 1
  while (endIndex > startIndex && points[endIndex].timestamp > endTime) {
    endIndex -= 1
  }

  if (endIndex < startIndex) {
    endIndex = startIndex
  }

  return { startIndex, endIndex }
}

const dedupeSingleDayTicks = (ticks: number[], stepMs: number, axisStart: number, axisEnd: number) => {
  if (ticks.length <= 2) {
    return ticks
  }

  const minGap = Math.max(Math.floor(stepMs * 0.6), 20 * 60 * 1000)
  const filtered = [...ticks]

  if (axisStart !== filtered[0] || axisEnd !== filtered[filtered.length - 1]) {
    return filtered
  }

  if (filtered.length > 2 && filtered[1] - filtered[0] < minGap) {
    filtered.splice(1, 1)
  }

  if (filtered.length > 2 && filtered[filtered.length - 1] - filtered[filtered.length - 2] < minGap) {
    filtered.splice(filtered.length - 2, 1)
  }

  return filtered
}

const toChartPoints = (points: PowerPoint[], queryType: QueryType): ChartPoint[] => {
  const multiDay = queryType === "week" || queryType === "custom"

  return points.map((point) => {
    const date = new Date(point.timestamp)

    return {
      key: point.isoTime,
      label: multiDay ? `${formatDayLabel(date)} ${formatTimeLabel(date)}` : formatTimeLabel(date),
      timestamp: point.timestamp,
      power: point.power,
      tooltipLabel: formatDateTimeLabel(date),
    }
  })
}

export function PowerCurveQuery() {
  const chartId = useId().replace(/:/g, "")
  const { language } = useLanguage()
  const { selectedProject } = useProject()
  const { isCompactViewport } = useDashboardViewport()
  const currentDay = useMemo(() => toDayStart(new Date()), [])
  const yesterday = useMemo(() => addDays(currentDay, -1), [currentDay])
  const defaultCustomRange = useMemo<DateRange>(
    () => ({
      from: addDays(yesterday, -6),
      to: yesterday,
    }),
    [yesterday],
  )

  const [queryType, setQueryType] = useState<QueryType>("today")
  const [customRange, setCustomRange] = useState<DateRange | undefined>(defaultCustomRange)
  const [points, setPoints] = useState<PowerPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [latestTimeLabel, setLatestTimeLabel] = useState("--")
  const [viewportRange, setViewportRange] = useState<ViewportRange | null>(null)
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const latestTimestampRef = useRef<number | undefined>(undefined)
  const chartShellRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const previousChartLengthRef = useRef(0)
  const panelScale = useFluidScale<HTMLDivElement>(620, 1120, { minRootPx: 13.5, maxRootPx: 17.5 })

  const customHint =
    language === "zh" ? "最多选择 31 天，结束日期不能超过昨天" : "Select up to 31 days, ending no later than yesterday"
  const maxRangeError =
    language === "zh" ? "自定义日期范围最多 31 天，且结束日期不能超过昨天" : "Custom date range cannot exceed 31 days or go beyond yesterday"
  const emptyStateText = language === "zh" ? "当前时间范围暂无功率数据" : "No power data for the selected range"
  const powerSeriesLabel = language === "zh" ? "功率(kW)" : "Power (kW)"
  const title = language === "zh" ? "功率曲线" : "Power Curve Query"
  const customLabel = language === "zh" ? "自定义" : "Custom"
  const liveLabel = language === "zh" ? "实时" : "Live Time"

  const queryTypes = [
    { key: "today" as const, label: language === "zh" ? "今日" : "Today" },
    { key: "yesterday" as const, label: language === "zh" ? "昨日" : "Yesterday" },
    { key: "week" as const, label: language === "zh" ? "近7日" : "Last 7 Days" },
    { key: "custom" as const, label: customLabel },
  ]

  const titleFontSize = panelScale.fluid(16, 22)
  const controlFontSize = panelScale.fluid(13, 15)
  const badgeFontSize = panelScale.fluid(11, 13)
  const axisFontSize = panelScale.chart(10, 12.5)
  const emptyFontSize = panelScale.fluid(14, 17)
  const chartData = useMemo(() => toChartPoints(points, queryType), [points, queryType])
  const isSingleDayQuery = queryType === "today" || queryType === "yesterday"
  const singleDayStart = useMemo(
    () => (queryType === "today" ? currentDay.getTime() : yesterday.getTime()),
    [currentDay, queryType, yesterday],
  )
  const singleDayEnd = useMemo(() => singleDayStart + DAY_MS, [singleDayStart])
  const visibleChartData = useMemo(() => {
    if (!viewportRange) {
      return chartData
    }

    return chartData.slice(viewportRange.startIndex, viewportRange.endIndex + 1)
  }, [chartData, viewportRange])
  const visiblePointCount = visibleChartData.length
  const singleDayTickStep = isCompactViewport ? HOUR_MS * 2 : HOUR_MS
  const singleDayAxis = useMemo(() => {
    let domainStart = singleDayStart
    let domainEnd = singleDayEnd

    if (isSingleDayQuery && chartData.length > 0 && viewportRange) {
      const firstPoint = chartData[viewportRange.startIndex]
      const lastPoint = chartData[viewportRange.endIndex]

      if (firstPoint && lastPoint) {
        const isFullRange = viewportRange.startIndex === 0 && viewportRange.endIndex === chartData.length - 1

        if (!isFullRange) {
          domainStart = Math.max(singleDayStart, firstPoint.timestamp)
          domainEnd = Math.min(singleDayEnd, Math.max(domainStart + singleDayTickStep, lastPoint.timestamp))
        }
      }
    }

    const ticks: number[] = []
    const firstTick =
      domainStart === singleDayStart
        ? domainStart
        : Math.ceil(domainStart / singleDayTickStep) * singleDayTickStep

    if (domainStart !== singleDayStart) {
      ticks.push(domainStart)
    }

    for (let tick = firstTick; tick <= domainEnd; tick += singleDayTickStep) {
      if (ticks[ticks.length - 1] !== tick) {
        ticks.push(tick)
      }
    }

    if (domainStart === singleDayStart && ticks[0] !== singleDayStart) {
      ticks.unshift(singleDayStart)
    }

    if (ticks.length === 0) {
      ticks.push(domainEnd)
    } else if (ticks[ticks.length - 1] !== domainEnd) {
      ticks.push(domainEnd)
    }

    const resolvedTicks = dedupeSingleDayTicks(ticks, singleDayTickStep, domainStart, domainEnd)

    return {
      start: domainStart,
      end: domainEnd,
      ticks: resolvedTicks,
    }
  }, [chartData, isSingleDayQuery, singleDayEnd, singleDayStart, singleDayTickStep, viewportRange])
  const xInterval =
    isSingleDayQuery
      ? Math.max(1, Math.floor(visiblePointCount / 8))
      : Math.max(1, Math.floor(visiblePointCount / 10))
  const canZoom = chartData.length > 24
  const canPan = Boolean(viewportRange && visiblePointCount < chartData.length)

  useEffect(() => {
    setViewportRange(null)
    previousChartLengthRef.current = 0
    dragStateRef.current = null
    setIsDraggingTimeline(false)
  }, [customRange?.from?.getTime(), customRange?.to?.getTime(), queryType, selectedProject.projectId])

  useEffect(() => {
    if (chartData.length === 0) {
      previousChartLengthRef.current = 0
      setViewportRange(null)
      return
    }

    setViewportRange((currentRange) => {
      if (!currentRange) {
        return {
          startIndex: 0,
          endIndex: chartData.length - 1,
        }
      }

      const previousLength = previousChartLengthRef.current
      const visibleSize = Math.min(chartData.length, currentRange.endIndex - currentRange.startIndex + 1)
      const wasPinnedToEnd = previousLength > 0 && currentRange.endIndex >= previousLength - 1
      const nextEnd = wasPinnedToEnd
        ? chartData.length - 1
        : clamp(currentRange.endIndex, visibleSize - 1, chartData.length - 1)
      const nextStart = wasPinnedToEnd
        ? Math.max(0, nextEnd - visibleSize + 1)
        : clamp(currentRange.startIndex, 0, chartData.length - visibleSize)

      if (nextStart === currentRange.startIndex && nextEnd === currentRange.endIndex) {
        return currentRange
      }

      return {
        startIndex: nextStart,
        endIndex: nextEnd,
      }
    })

    previousChartLengthRef.current = chartData.length
  }, [chartData.length])

  useEffect(() => {
    if (points.length === 0) {
      setLatestTimeLabel("--")
      latestTimestampRef.current = undefined
      return
    }

    const latest = points[points.length - 1]
    latestTimestampRef.current = latest.timestamp
    setLatestTimeLabel(formatTimeLabel(new Date(latest.timestamp)))
  }, [points])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    let cancelled = false
    const abortController = new AbortController()

    const loadHistorical = async (start: string, end: string) => {
      const data = await fetchPowerRange({
        projectId: selectedProject.projectId,
        start,
        end,
      }, {
        signal: abortController.signal,
      })

      if (!cancelled) {
        setPoints(data)
      }
    }

    const loadToday = async () => {
      const initialData = await fetchTodayPowerDaily(selectedProject.projectId, {
        signal: abortController.signal,
      })

      if (cancelled) {
        return
      }

      setPoints(initialData)
      latestTimestampRef.current = initialData[initialData.length - 1]?.timestamp

      intervalRef.current = setInterval(async () => {
        try {
          const incremental = await fetchTodayPowerIncremental(
            selectedProject.projectId,
            latestTimestampRef.current ? toSeconds(latestTimestampRef.current) : undefined,
            {
              signal: abortController.signal,
            },
          )

          if (cancelled || incremental.length === 0) {
            return
          }

          setPoints((prev) => {
            const merged = mergePowerPoints(prev, incremental)
            latestTimestampRef.current = merged[merged.length - 1]?.timestamp
            return merged
          })
        } catch (error) {
          if (abortController.signal.aborted) {
            return
          }

          console.error(`Failed to poll incremental power for ${selectedProject.projectId}`, error)
        }
      }, TODAY_POLL_MS)
    }

    const load = async () => {
      setLoading(true)

      try {
        if (queryType === "today") {
          await loadToday()
        } else if (queryType === "yesterday") {
          const day = formatDateOnly(yesterday)
          await loadHistorical(day, day)
        } else if (queryType === "week") {
          await loadHistorical(formatDateOnly(addDays(yesterday, -6)), formatDateOnly(yesterday))
        } else if (customRange?.from && customRange.to) {
          await loadHistorical(formatDateOnly(customRange.from), formatDateOnly(customRange.to))
        } else {
          setPoints([])
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        if (!cancelled) {
          setPoints([])
        }

        console.error(`Failed to load power curve for ${selectedProject.projectId}`, error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
      abortController.abort()

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [customRange, queryType, selectedProject.projectId, yesterday])

  const renderTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
    if (!active || !payload?.length) return null

    const power = typeof payload[0]?.value === "number" ? payload[0].value : Number(payload[0]?.value ?? 0)
    const currentPoint = payload[0]?.payload as ChartPoint | undefined
    const modeLabel =
      power > 0
        ? language === "zh"
          ? "充电功率"
          : "Charge Power"
        : power < 0
          ? language === "zh"
            ? "放电功率"
            : "Discharge Power"
          : language === "zh"
            ? "静置功率"
            : "Idle Power"

    return (
      <div className="min-w-[220px] overflow-hidden" style={TOOLTIP_SURFACE}>
        <div className="border-b border-white/8 bg-[linear-gradient(90deg,rgba(17,216,191,0.14),transparent)] px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7da0d8]">
            {language === "zh" ? "时间点" : "Timestamp"}
          </div>
          <div className="mt-1 text-sm font-semibold text-[#e9f4ff]">{currentPoint?.tooltipLabel ?? "--"}</div>
        </div>

        <div className="grid gap-2 px-3 py-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.03] px-2.5 py-2">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: power >= 0 ? "#22d3ee" : "#ffd60a",
                  boxShadow: `0 0 12px ${power >= 0 ? "#22d3ee99" : "#ffd60a88"}`,
                }}
              />
              <span className="text-[12px] text-[#bed3f6]">{modeLabel}</span>
            </div>
            <span className="font-mono text-[12px] font-semibold text-[#f2f8ff]">
              {power > 0 ? "+" : ""}
              {power.toFixed(2)}
              <span className="ml-1 text-[#86a7d4]">kW</span>
            </span>
          </div>
        </div>
      </div>
    )
  }

  const handleAxisWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!canZoom || chartData.length <= 1 || !chartShellRef.current) {
      return
    }

    event.preventDefault()
    const rect = chartShellRef.current.getBoundingClientRect()

    const currentRange =
      viewportRange ?? {
        startIndex: 0,
        endIndex: chartData.length - 1,
      }

    if (isSingleDayQuery) {
      const fullWindowMs = singleDayEnd - singleDayStart
      const minWindowMs = isCompactViewport ? SINGLE_DAY_MIN_WINDOW_MS.compact : SINGLE_DAY_MIN_WINDOW_MS.regular
      const rangeStartTime = chartData[currentRange.startIndex]?.timestamp ?? singleDayStart
      const rangeEndTime = chartData[currentRange.endIndex]?.timestamp ?? singleDayEnd
      const currentWindowMs = Math.max(HOUR_MS, rangeEndTime - rangeStartTime)
      const nextWindowMs = clamp(
        Math.round(currentWindowMs * (event.deltaY > 0 ? 1.25 : 0.8)),
        minWindowMs,
        fullWindowMs,
      )

      if (nextWindowMs === currentWindowMs && viewportRange) {
        return
      }

      const relativeX = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1)
      const anchorIndex = clamp(
        currentRange.startIndex + Math.round((currentRange.endIndex - currentRange.startIndex) * relativeX),
        0,
        chartData.length - 1,
      )
      const anchorTime = chartData[anchorIndex]?.timestamp ?? singleDayStart

      let targetStart = Math.round(anchorTime - relativeX * nextWindowMs)
      let targetEnd = targetStart + nextWindowMs

      if (targetStart < singleDayStart) {
        targetStart = singleDayStart
        targetEnd = targetStart + nextWindowMs
      }

      if (targetEnd > singleDayEnd) {
        targetEnd = singleDayEnd
        targetStart = targetEnd - nextWindowMs
      }

      if (nextWindowMs >= fullWindowMs) {
        setViewportRange({
          startIndex: 0,
          endIndex: chartData.length - 1,
        })
        return
      }

      const nextRange = findRangeIndicesByTime(chartData, targetStart, targetEnd)

      if (
        nextRange.startIndex === currentRange.startIndex &&
        nextRange.endIndex === currentRange.endIndex
      ) {
        return
      }

      setViewportRange(nextRange)
      return
    }

    const currentSize = currentRange.endIndex - currentRange.startIndex + 1
    const nextSize = clamp(
      currentSize + (event.deltaY > 0 ? Math.max(2, Math.ceil(currentSize * 0.2)) : -Math.max(2, Math.ceil(currentSize * 0.2))),
      Math.min(12, chartData.length),
      chartData.length,
    )

    if (nextSize === currentSize) {
      return
    }

    const relativeX = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1)
    const anchorIndex = clamp(
      currentRange.startIndex + Math.round((currentSize - 1) * relativeX),
      0,
      chartData.length - 1,
    )
    let nextStart = Math.round(anchorIndex - relativeX * (nextSize - 1))
    let nextEnd = nextStart + nextSize - 1

    if (nextStart < 0) {
      nextStart = 0
      nextEnd = nextSize - 1
    }

    if (nextEnd > chartData.length - 1) {
      nextEnd = chartData.length - 1
      nextStart = nextEnd - nextSize + 1
    }

    setViewportRange({
      startIndex: nextStart,
      endIndex: nextEnd,
    })
  }

  const stopTimelineDrag = (pointerId?: number) => {
    if (!chartShellRef.current) {
      dragStateRef.current = null
      setIsDraggingTimeline(false)
      return
    }

    const activeDrag = dragStateRef.current
    if (pointerId != null && activeDrag?.pointerId !== pointerId) {
      return
    }

    if (activeDrag && chartShellRef.current.hasPointerCapture(activeDrag.pointerId)) {
      chartShellRef.current.releasePointerCapture(activeDrag.pointerId)
    }

    dragStateRef.current = null
    setIsDraggingTimeline(false)
  }

  const handleTimelinePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canPan || !chartShellRef.current || !viewportRange) {
      return
    }

    event.preventDefault()
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startRange: viewportRange,
    }
    chartShellRef.current.setPointerCapture(event.pointerId)
    setIsDraggingTimeline(true)
  }

  const handleTimelinePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!chartShellRef.current || dragStateRef.current?.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()

    const rect = chartShellRef.current.getBoundingClientRect()
    const visibleSize = dragStateRef.current.startRange.endIndex - dragStateRef.current.startRange.startIndex + 1
    const maxStart = chartData.length - visibleSize
    if (maxStart <= 0) {
      return
    }

    const deltaX = dragStateRef.current.startX - event.clientX
    const pointDelta = Math.round((deltaX / Math.max(rect.width, 1)) * visibleSize)
    const nextStart = clamp(dragStateRef.current.startRange.startIndex + pointDelta, 0, maxStart)
    const nextEnd = nextStart + visibleSize - 1

    setViewportRange((currentRange) => {
      if (currentRange && currentRange.startIndex === nextStart && currentRange.endIndex === nextEnd) {
        return currentRange
      }

      return {
        startIndex: nextStart,
        endIndex: nextEnd,
      }
    })
  }

  return (
    <div
      ref={panelScale.ref}
      className={`flex h-full w-full flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] ${
        isCompactViewport ? "p-3" : "p-4"
      }`}
    >
      <div className={`flex flex-wrap items-start justify-between ${isCompactViewport ? "mb-3 gap-2" : "mb-4 gap-3"}`}>
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3 className="font-semibold text-[#00d4aa]" style={{ fontSize: `${titleFontSize}px` }}>{title}</h3>
          {queryType === "today" && !loading && (
            <span className="flex items-center gap-1 rounded-full border border-[#1c4273] bg-[linear-gradient(180deg,rgba(8,24,55,0.96),rgba(10,28,62,0.9))] px-2.5 py-1 text-[#9bc6ff] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]" style={{ fontSize: `${badgeFontSize}px` }}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00d4aa]" />
              {liveLabel} {latestTimeLabel}
            </span>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex gap-1 rounded-xl bg-[#16204b]/90 p-1">
              {queryTypes.map((type) => (
                <button
                  key={type.key}
                  onClick={() => setQueryType(type.key)}
                  className={`rounded-lg transition-all ${isCompactViewport ? "px-2.5 py-[5px]" : "px-3 py-1.5"} ${
                    queryType === type.key
                      ? "bg-[#11d8bf] font-medium text-[#07162b] shadow-[0_0_18px_rgba(17,216,191,0.2)]"
                      : "text-[#7b8ab8] hover:text-[#e8f4fc]"
                  }`}
                  style={{ fontSize: `${controlFontSize}px` }}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {queryType === "custom" && (
              <CustomRangePicker
                value={customRange}
                onChange={setCustomRange}
                maxDate={yesterday}
                maxDays={31}
                buttonLabel={formatRangeLabel(customRange, language)}
                hint={customHint}
                maxRangeError={maxRangeError}
                quickSelectLabel={language === "zh" ? "昨天" : "Yesterday"}
              />
            )}
          </div>
        </div>
      </div>

      <div
        ref={chartShellRef}
        onWheel={handleAxisWheel}
        onPointerDown={handleTimelinePointerDown}
        onPointerMove={handleTimelinePointerMove}
        onPointerUp={(event) => stopTimelineDrag(event.pointerId)}
        onPointerCancel={(event) => stopTimelineDrag(event.pointerId)}
        onLostPointerCapture={(event) => stopTimelineDrag(event.pointerId)}
        className={`relative flex-1 select-none overflow-hidden rounded-[20px] border border-[#1e2e63]/75 bg-[linear-gradient(180deg,rgba(8,18,42,0.92),rgba(10,20,47,0.78))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
          isCompactViewport ? "min-h-[220px]" : "min-h-[288px]"
        } ${
          canPan ? (isDraggingTimeline ? "cursor-grabbing" : "cursor-grab") : ""
        }`}
        style={{
          touchAction: canPan ? "none" : "auto",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(0,212,170,0.08),transparent_28%),radial-gradient(circle_at_84%_10%,rgba(86,130,255,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <HistoryStyleLoadingIndicator text={language === "zh" ? "加载功率曲线数据..." : "Loading power data..."} />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[#7b8ab8]" style={{ fontSize: `${emptyFontSize}px` }}>{emptyStateText}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visibleChartData} margin={{ top: 10, right: 14, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id={`${chartId}-power-fill`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.34} />
                  <stop offset="55%" stopColor="#22d3ee" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 5" stroke="rgba(45,74,126,0.72)" vertical={false} />
              <XAxis
                {...(isSingleDayQuery
                  ? {
                      type: "number" as const,
                      dataKey: "timestamp",
                      domain: [singleDayAxis.start, singleDayAxis.end] as [number, number],
                      ticks: singleDayAxis.ticks,
                      tickFormatter: (value: number) =>
                        formatSingleDayAxisLabel(
                          value,
                          singleDayAxis.start,
                          singleDayAxis.end,
                          singleDayStart,
                          singleDayEnd,
                          isCompactViewport,
                        ),
                      interval: 0 as const,
                      padding: { left: 8, right: 12 },
                    }
                  : {
                      dataKey: "label",
                      interval: xInterval,
                    })}
                axisLine={false}
                tickLine={false}
                tick={
                  isSingleDayQuery
                    ? (tickProps: { x?: number; y?: number; payload?: { value?: number } }) => {
                        const value =
                          typeof tickProps.payload?.value === "number"
                            ? tickProps.payload.value
                            : Number(tickProps.payload?.value ?? Number.NaN)

                        if (!Number.isFinite(value)) {
                          return null
                        }

                        const label = formatSingleDayAxisLabel(
                          value,
                          singleDayAxis.start,
                          singleDayAxis.end,
                          singleDayStart,
                          singleDayEnd,
                          isCompactViewport,
                        )

                        if (!label) {
                          return null
                        }

                        const textAnchor =
                          value === singleDayAxis.start ? "start" : value === singleDayAxis.end ? "end" : "middle"

                        return (
                          <text
                            x={tickProps.x}
                            y={tickProps.y}
                            dy={12}
                            textAnchor={textAnchor}
                            fill="#88a4d7"
                            fontSize={axisFontSize}
                          >
                            {label}
                          </text>
                        )
                      }
                    : { fill: "#88a4d7", fontSize: axisFontSize }
                }
                tickMargin={10}
                minTickGap={isSingleDayQuery ? 8 : 28}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#88a4d7", fontSize: axisFontSize }}
                tickMargin={8}
                width={56}
                label={{
                  value: powerSeriesLabel,
                  angle: -90,
                  position: "insideLeft",
                  offset: 4,
                  style: {
                    fill: "#88a4d7",
                    fontSize: axisFontSize,
                  },
                }}
              />
              <ReferenceLine y={0} stroke="#3f6490" strokeDasharray="4 4" strokeOpacity={0.72} />
              <Tooltip cursor={{ stroke: "#2b4f7d", strokeDasharray: "4 4" }} content={renderTooltip} />
              <Area type="monotone" dataKey="power" stroke="none" fill={`url(#${chartId}-power-fill)`} isAnimationActive={false} />
              <Line
                type="monotone"
                dataKey="power"
                stroke="#22d3ee"
                strokeOpacity={0.18}
                strokeWidth={8}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="power"
                name={powerSeriesLabel}
                stroke="#22d3ee"
                strokeWidth={2.4}
                dot={false}
                activeDot={{ r: 5, fill: "#08122a", stroke: "#22d3ee", strokeWidth: 2.5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
