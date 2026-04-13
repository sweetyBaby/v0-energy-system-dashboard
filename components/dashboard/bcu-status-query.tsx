"use client"

import { AlertCircle, DatabaseZap, WifiOff } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useLanguage } from "@/components/language-provider"
import { useProject } from "@/components/dashboard/dashboard-header"
import { HistoryStyleLoadingIndicator } from "@/components/dashboard/history-style-loading-indicator"
import { useFluidScale } from "@/hooks/use-fluid-scale"
import {
  fetchOperationsIncrementalBundle,
  fetchOperationsRecentBundle,
  getOperationsCursorFromBundle,
  mergeOperationTrendData,
  type OperationTrendPoint,
  type OperationsCursor,
} from "@/lib/api/operations"

type BCUStatusMode = "realtime" | "history"

type SectionSingle = {
  kind: "single"
  dataKey: keyof OperationTrendPoint
  labelZh: string
  labelEn: string
  tooltipLabelZh: string
  tooltipLabelEn: string
  color: string
  domain: [number, number]
  ticks?: number[]
  unit: string
  zeroLine?: boolean
  formatter?: (value: number) => string
}

type SectionPair = {
  kind: "pair"
  labelZh: string
  labelEn: string
  color: string
  domain: [number, number]
  unit: string
  formatter?: (value: number) => string
  lines: Array<{
    key: keyof OperationTrendPoint
    nameZh: string
    nameEn: string
    color: string
  }>
}

type ChartSection = SectionSingle | SectionPair

const REALTIME_POLL_MS = 10_000
const TOOLTIP_STYLE = {
  backgroundColor: "#0d1233",
  border: "1px solid #1a2654",
  borderRadius: "8px",
  padding: "8px 12px",
}
const TOOLTIP_WRAPPER_STYLE = { zIndex: 100 }

const formatClock = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(
    date.getSeconds(),
  ).padStart(2, "0")}`

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

const toDayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const hashSeed = (value?: string) => {
  const input = value || "default"
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const seededSigned = (seed: number, index: number) => {
  const value = Math.sin((seed + index * 101.17) * 12.9898) * 43758.5453
  return (value - Math.floor(value)) * 2 - 1
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const round = (value: number, digits = 1) => Number(value.toFixed(digits))

const formatFiveMin = (slot: number) => {
  const totalMinutes = slot * 5
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

const buildDynamicTimeTicks = (times: string[], visibleTickCount: number) => {
  if (times.length <= 2) {
    return Array.from(new Set(times))
  }

  if (times.length <= visibleTickCount) {
    return Array.from(new Set(times))
  }

  const step = Math.max(1, Math.ceil((times.length - 1) / Math.max(visibleTickCount - 1, 1)))
  return Array.from(
    new Set(times.filter((time, index) => index === 0 || index === times.length - 1 || index % step === 0)),
  )
}

const getDailyLoadFactor = (hour: number) => {
  if (hour < 5.5) return 0.12 + hour * 0.018
  if (hour < 8.5) return 0.21 + ((hour - 5.5) / 3) * 0.42
  if (hour < 17.5) return 0.65 + Math.sin(((hour - 8.5) / 9) * Math.PI) * 0.2
  if (hour < 21.5) return 0.52 - ((hour - 17.5) / 4) * 0.24
  return 0.2 - ((hour - 21.5) / 2.5) * 0.06
}

const getDailySoc = (hour: number) => {
  if (hour < 6) return 42 + hour * 0.5
  if (hour < 8.5) return 45 + ((hour - 6) / 2.5) * 25
  if (hour < 18.5) return 70 - ((hour - 8.5) / 10) * 26
  return 44 - ((hour - 18.5) / 5.5) * 3
}

const createHistorySeries = (date?: string): OperationTrendPoint[] => {
  const targetDate = date ? new Date(`${date}T00:00:00`) : toDayStart(addDays(new Date(), -1))
  const safeDate = Number.isNaN(targetDate.getTime()) ? toDayStart(addDays(new Date(), -1)) : targetDate
  const seed = hashSeed(date || formatDateKey(safeDate))
  const points: OperationTrendPoint[] = []

  for (let slot = 0; slot < 288; slot += 1) {
    const hour = slot / 12
    const load = getDailyLoadFactor(hour)
    const soc = getDailySoc(hour)
    const noise = seededSigned(seed, slot)

    const ambient = 24.5 + Math.sin(((hour - 6) / 24) * Math.PI * 2) * 3 + noise * 0.15
    const maxTemp = ambient + 4 + load * 3.8 + Math.abs(seededSigned(seed, slot + 80)) * 0.6
    const minTemp = ambient + 1.6 + load * 1.8 + Math.abs(seededSigned(seed, slot + 81)) * 0.2

    let current: number
    if (hour < 5.5) current = -3 + Math.sin(hour * 1.4) * 2 + noise * 1.5
    else if (hour < 8.5) current = 35 + ((hour - 5.5) / 3) * 40 + Math.sin(hour * 2.1) * 4 + noise * 3
    else if (hour < 18.5) current = -(55 + load * 60 + Math.sin(((hour - 8.5) / 10) * Math.PI * 2) * 8 + noise * 4)
    else if (hour < 21.5) current = -(20 + ((21.5 - hour) / 3) * 22 + noise * 2.5)
    else current = -5 + Math.sin(hour * 1.2) * 2 + noise * 1.5

    current = clamp(current, -148, 148)

    const cellBase = 25.8 + soc * 0.028
    const chargeBoost = hour >= 6 && hour < 8.5 ? 0.75 : 0
    const dischargeSag = hour >= 8.5 && hour < 18.5 ? load * 1.85 : load * 0.65
    const cellCenter = cellBase + chargeBoost - dischargeSag + seededSigned(seed, slot + 160) * 0.18
    const cellSpread = 0.42 + load * 0.48
    const packVoltage = cellCenter * 50 + (current >= 0 ? current * 0.3 : current * 0.45)
    const pointDate = new Date(safeDate)
    pointDate.setHours(0, slot * 5, 0, 0)

    points.push({
      timestamp: pointDate.getTime(),
      isoTime: pointDate.toISOString(),
      time: formatFiveMin(slot),
      voltage: round(clamp(packVoltage, 1100, 1450), 1),
      current: round(current, 1),
      soc: round(clamp(soc + noise * 0.15, 0, 100), 1),
      power: round((packVoltage * current) / 1000, 1),
      maxTemp: round(maxTemp, 1),
      minTemp: round(minTemp, 1),
      maxCell: round(clamp(cellCenter + cellSpread / 2, 21, 29), 2),
      minCell: round(clamp(cellCenter - cellSpread / 2, 21, 29), 2),
    })
  }

  return points
}

const mergeCursor = (current: OperationsCursor, next: OperationsCursor): OperationsCursor => ({
  auxSince: next.auxSince ?? current.auxSince,
  cellVoltageSince: next.cellVoltageSince ?? current.cellVoltageSince,
  cellTemperatureSeconds: next.cellTemperatureSeconds ?? current.cellTemperatureSeconds,
  cellTemperatureNanos: next.cellTemperatureNanos ?? current.cellTemperatureNanos,
})

const createSections = (zh: boolean): ChartSection[] => [
  {
    kind: "single",
    dataKey: "current",
    labelZh: "电流(A)",
    labelEn: "Current(A)",
    tooltipLabelZh: "电流",
    tooltipLabelEn: "Current",
    color: "#f472b6",
    domain: [-150, 150],
    ticks: [-150, 0, 150],
    unit: "A",
    zeroLine: true,
    formatter: (value) => `${value.toFixed(1)}`,
  },
  {
    kind: "single",
    dataKey: "power",
    labelZh: "功率(kW)",
    labelEn: "Power(kW)",
    tooltipLabelZh: "功率",
    tooltipLabelEn: "Power",
    color: "#4ade80",
    domain: [-160, 160],
    ticks: [-160, 0, 160],
    unit: "kW",
    zeroLine: true,
    formatter: (value) => `${value.toFixed(1)}`,
  },
  {
    kind: "single",
    dataKey: "soc",
    labelZh: "SOC(%)",
    labelEn: "SOC(%)",
    tooltipLabelZh: "SOC",
    tooltipLabelEn: "SOC",
    color: "#22d3ee",
    domain: [0, 100],
    unit: "%",
    formatter: (value) => `${value.toFixed(1)}`,
  },
  {
    kind: "single",
    dataKey: "voltage",
    labelZh: "Pack电压(V)",
    labelEn: "Pack(V)",
    tooltipLabelZh: "Pack电压",
    tooltipLabelEn: "Pack Voltage",
    color: "#fb923c",
    domain: [1100, 1450],
    unit: "V",
    formatter: (value) => `${Math.round(value)}`,
  },
  {
    kind: "pair",
    labelZh: "单体温度(°C)",
    labelEn: "Cell Temp(°C)",
    color: "#fbbf24",
    domain: [15, 45],
    unit: "°C",
    formatter: (value) => `${value.toFixed(1)}`,
    lines: [
      { key: "maxTemp", nameZh: "最高温", nameEn: "Max", color: "#f87171" },
      { key: "minTemp", nameZh: "最低温", nameEn: "Min", color: "#7dd3fc" },
    ],
  },
  {
    kind: "pair",
    labelZh: "单体电压(V)",
    labelEn: "Cell Volt(V)",
    color: "#22d3ee",
    domain: [21, 29],
    unit: "V",
    formatter: (value) => `${value.toFixed(2)}`,
    lines: [
      { key: "maxCell", nameZh: "最高单体", nameEn: "Max", color: "#f87171" },
      { key: "minCell", nameZh: "最低单体", nameEn: "Min", color: "#7dd3fc" },
    ],
  },
]

function TrendStackedChart({
  data,
  zh,
  history,
  hideCellSeries = false,
  axisFontSize,
  yAxisFontSize,
  tooltipFontSize,
  sectionLabelSize,
  legendFontSize,
}: {
  data: OperationTrendPoint[]
  zh: boolean
  history: boolean
  hideCellSeries?: boolean
  axisFontSize: number
  yAxisFontSize: number
  tooltipFontSize: number
  sectionLabelSize: number
  legendFontSize: number
}) {
  const sections = createSections(zh)
  const visibleSections = hideCellSeries ? sections.filter((section) => section.kind !== "pair") : sections
  const syncId = history ? "history-bcu" : "realtime-bcu"
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [chartWidth, setChartWidth] = useState(0)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const updateWidth = (width: number) => {
      setChartWidth(Math.max(width, 320))
    }

    updateWidth(node.clientWidth)

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      updateWidth(entry.contentRect.width)
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const timeAxisLabelWidth = history ? (chartWidth < 980 ? 76 : 88) : chartWidth < 980 ? 64 : 76
  const timeAxisReservedWidth = hideCellSeries ? 92 : 108
  const timeAxisUsableWidth = Math.max(chartWidth - timeAxisReservedWidth, 320)
  const visibleTickCount = Math.max(2, Math.floor(timeAxisUsableWidth / timeAxisLabelWidth))
  const xAxisTicks = useMemo(
    () => buildDynamicTimeTicks(data.map((item) => item.time), visibleTickCount),
    [data, visibleTickCount],
  )

  return (
    <div ref={containerRef} className="flex h-full min-h-0 flex-col">
      {visibleSections.map((section, index) => {
        const isLast = index === visibleSections.length - 1
        const chartTop = section.kind === "pair" ? 24 : 8

        return (
          <div key={zh ? section.labelZh : section.labelEn} className={`relative min-h-0 flex-1 ${!isLast ? "border-b border-[#1a2654]/40" : ""}`}>
            {section.kind === "pair" && (
              <div className="absolute right-2 top-1 z-10 flex items-center gap-3">
                {section.lines.map((line) => (
                  <div key={String(line.key)} className="flex items-center gap-1">
                    <svg width="18" height="10" style={{ display: "block" }}>
                      <line x1="0" y1="5" x2="18" y2="5" stroke={line.color} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span style={{ color: "#9ca3af", fontSize: legendFontSize, lineHeight: 1 }}>
                      {zh ? line.nameZh : line.nameEn}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} syncId={syncId} syncMethod="value" margin={{ top: chartTop, right: 10, left: 0, bottom: isLast ? 2 : 0 }}>
                <CartesianGrid stroke="#1a2654" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={!isLast ? false : { fill: "#7b8ab8", fontSize: axisFontSize }}
                  axisLine={isLast ? { stroke: "#1a2654", strokeOpacity: 0.4 } : false}
                  tickLine={false}
                  height={isLast ? 18 : 0}
                  ticks={isLast ? xAxisTicks : undefined}
                  interval={isLast ? 0 : Math.max(xAxisTicks.length - 1, 0)}
                  minTickGap={6}
                />
                <YAxis
                  domain={section.domain}
                  width={44}
                  tick={{ fill: section.color, fontSize: yAxisFontSize }}
                  axisLine={{ stroke: section.color, strokeOpacity: 0.25 }}
                  tickLine={false}
                  ticks={section.kind === "single" ? section.ticks : undefined}
                  tickCount={3}
                  tickMargin={3}
                  tickFormatter={(value) => (section.formatter ? section.formatter(value as number) : `${value}`)}
                />
                {section.kind === "single" && section.zeroLine ? (
                  <ReferenceLine y={0} stroke="#9fb9d6" strokeDasharray="4 3" strokeOpacity={0.72} ifOverflow="extendDomain" />
                ) : null}
                <Tooltip
                  wrapperStyle={TOOLTIP_WRAPPER_STYLE}
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ stroke: "#93c5fd", strokeWidth: 1, strokeOpacity: 0.65 }}
                  position={{ y: 4 }}
                  labelStyle={{ color: "#7b8ab8", fontSize: tooltipFontSize }}
                  itemStyle={{ fontSize: tooltipFontSize, padding: "2px 0" }}
                  formatter={(value, name) => {
                    const numericValue = typeof value === "number" ? value : Number(value ?? 0)

                    if (section.kind === "single") {
                      const label = zh ? section.tooltipLabelZh : section.tooltipLabelEn
                      const formatted = section.formatter ? section.formatter(numericValue) : `${numericValue}`
                      return [`${formatted} ${section.unit}`, label]
                    }

                    const formatted = section.formatter ? section.formatter(numericValue) : `${numericValue}`
                    return [`${formatted} ${section.unit}`, name as string]
                  }}
                />
                <text
                  x={section.kind === "single" ? "100%" : 46}
                  y={15}
                  textAnchor={section.kind === "single" ? "end" : "start"}
                  dx={section.kind === "single" ? -10 : 0}
                  fill={section.color}
                  fontSize={sectionLabelSize}
                  fontWeight={600}
                >
                  {zh ? section.labelZh : section.labelEn}
                </text>
                {section.kind === "single" ? (
                  <Line type="monotone" dataKey={section.dataKey} stroke={section.color} strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
                ) : (
                  section.lines.map((line) => (
                    <Line
                      key={String(line.key)}
                      type="monotone"
                      dataKey={line.key}
                      name={zh ? line.nameZh : line.nameEn}
                      stroke={line.color}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                      connectNulls
                    />
                  ))
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      })}
    </div>
  )
}

export function BCUStatusQuery({
  mode = "realtime",
  date,
  hideCellSeries = false,
  panelVariant = "default",
  historyData,
}: {
  mode?: BCUStatusMode
  date?: string
  hideCellSeries?: boolean
  panelVariant?: "default" | "overview"
  historyData?: OperationTrendPoint[]
}) {
  const { language } = useLanguage()
  const { selectedProject } = useProject()
  const scale = useFluidScale<HTMLDivElement>(1180, 1920, { minRootPx: 14, maxRootPx: 18 })
  const zh = language === "zh"
  const [rtOverview, setRtOverview] = useState<OperationTrendPoint[]>([])
  const [isRealtimeLoading, setIsRealtimeLoading] = useState(mode === "realtime")
  const [realtimeError, setRealtimeError] = useState<string | null>(null)
  const cursorRef = useRef<OperationsCursor>({})
  const histData = useMemo(() => createHistorySeries(date), [date])
  const effectiveHistoryData = historyData ?? histData
  const liveTimeLabel = rtOverview[rtOverview.length - 1]?.time.slice(0, 5) ?? "--:--"
  const isOverviewVariant = panelVariant === "overview"
  const titleSize = scale.clampText(0.9, 0.98, 1.16)
  const pillFontSize = scale.fluid(11, 13.5)
  const axisFontSize = scale.chart(9, 12)
  const yAxisFontSize = scale.chart(8, 11)
  const tooltipFontSize = scale.chart(13, 15)
  const sectionLabelSize = scale.chart(11, 13)
  const legendFontSize = scale.chart(11, 12.5)

  type StatusToast = { type: "info" | "error"; text: string } | null
  const [toast, setToast] = useState<StatusToast>(null)
  const [toastVisible, setToastVisible] = useState(false)

  useEffect(() => {
    if (mode !== "realtime") return
    let fadeTimer: ReturnType<typeof setTimeout>
    let hideTimer: ReturnType<typeof setTimeout>

    if (!isRealtimeLoading && realtimeError && rtOverview.length === 0) {
      setToast({ type: "error", text: realtimeError })
      setToastVisible(true)
      fadeTimer = setTimeout(() => setToastVisible(false), 3800)
      hideTimer = setTimeout(() => setToast(null), 4300)
    } else if (!isRealtimeLoading && !realtimeError && rtOverview.length === 0) {
      setToast({ type: "info", text: zh ? "暂无实时运行数据" : "No realtime data" })
      setToastVisible(true)
      fadeTimer = setTimeout(() => setToastVisible(false), 2800)
      hideTimer = setTimeout(() => setToast(null), 3300)
    } else {
      setToastVisible(false)
      hideTimer = setTimeout(() => setToast(null), 500)
    }

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [isRealtimeLoading, realtimeError, rtOverview.length, zh, mode])

  useEffect(() => {
    if (mode !== "realtime") {
      setIsRealtimeLoading(false)
      return
    }

    let cancelled = false
    const abortController = new AbortController()
    let timer: ReturnType<typeof setInterval> | null = null

    const loadRecent = async () => {
      const bundle = await fetchOperationsRecentBundle(selectedProject.projectId, {
        signal: abortController.signal,
      })

      if (cancelled) {
        return
      }

      cursorRef.current = getOperationsCursorFromBundle(bundle)
      setRtOverview(mergeOperationTrendData([], bundle))
      setRealtimeError(null)
    }

    const pollIncremental = async () => {
      try {
        const bundle = await fetchOperationsIncrementalBundle(selectedProject.projectId, cursorRef.current, {
          signal: abortController.signal,
        })

        if (cancelled) {
          return
        }

        cursorRef.current = mergeCursor(cursorRef.current, getOperationsCursorFromBundle(bundle))
        setRtOverview((current) => mergeOperationTrendData(current, bundle))
      } catch (error) {
        if (abortController.signal.aborted) {
          return
        }

        console.error(`Failed to poll running status for ${selectedProject.projectId}`, error)
      }
    }

    const startRealtime = async () => {
      setIsRealtimeLoading(true)

      try {
        await loadRecent()
      } catch (error) {
        if (!abortController.signal.aborted && !cancelled) {
          setRtOverview([])
          setRealtimeError(zh ? "运行状态实时接口加载失败" : "Failed to load running status")
          console.error(`Failed to load running status for ${selectedProject.projectId}`, error)
        }
      } finally {
        if (!cancelled) {
          setIsRealtimeLoading(false)
        }
      }

      timer = setInterval(() => {
        void pollIncremental()
      }, REALTIME_POLL_MS)
    }

    void startRealtime()

    return () => {
      cancelled = true
      abortController.abort()
      cursorRef.current = {}

      if (timer) {
        clearInterval(timer)
      }
    }
  }, [mode, selectedProject.projectId, zh])

  return (
    <div
      ref={scale.ref}
      className={`flex h-full min-h-0 flex-col overflow-hidden ${
        isOverviewVariant
          ? "relative rounded-[20px] border border-[#254873]/80 bg-[radial-gradient(circle_at_top_right,rgba(38,109,178,0.15),transparent_28%),linear-gradient(180deg,rgba(10,19,44,0.97),rgba(6,12,29,0.98))] p-3 shadow-[0_0_0_1px_rgba(88,181,255,0.08),0_18px_42px_rgba(1,7,19,0.42),inset_0_0_28px_rgba(44,126,198,0.06)]"
          : "rounded-lg border border-[#1a2654] bg-[#0d1233] p-3"
      }`}
      style={scale.rootStyle}
    >
      {isOverviewVariant ? <div className="pointer-events-none absolute inset-0 rounded-[20px] border border-[#8feaff]/[0.05]" /> : null}
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <span className="text-sm font-semibold text-[#00d4aa]">{zh ? "BCU 运行状态" : "BCU Status"}</span>
          {mode === "realtime" ? (
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[#1f5f92] bg-[linear-gradient(180deg,rgba(14,44,78,0.96),rgba(9,26,50,0.96))] px-2.5 text-[11px] font-semibold text-[#bfe7ff] shadow-[inset_0_0_0_1px_rgba(110,196,255,0.08)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#20d4ff] shadow-[0_0_8px_rgba(32,212,255,0.9)]" />
              <span>{zh ? "实时" : "Live"}</span>
              <span className="tabular-nums text-[#f2fbff]">{liveTimeLabel}</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* Status toast overlay */}
        {toast && (
          <div
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-500"
            style={{ opacity: toastVisible ? 1 : 0 }}
          >
            <div
              className="flex flex-col items-center gap-3 rounded-2xl px-8 py-6"
              style={{
                background: toast.type === "error"
                  ? "linear-gradient(135deg, rgba(30,10,10,0.97) 0%, rgba(40,14,14,0.94) 100%)"
                  : "linear-gradient(135deg, rgba(10,20,50,0.97) 0%, rgba(13,26,60,0.94) 100%)",
                border: toast.type === "error" ? "1px solid rgba(220,53,34,0.35)" : "1px solid rgba(59,130,246,0.25)",
                boxShadow: toast.type === "error"
                  ? "0 0 32px rgba(220,53,34,0.18), 0 8px 32px rgba(0,0,0,0.5)"
                  : "0 0 32px rgba(59,130,246,0.12), 0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{
                  background: toast.type === "error"
                    ? "radial-gradient(circle, rgba(220,53,34,0.22) 0%, rgba(220,53,34,0.06) 100%)"
                    : "radial-gradient(circle, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0.06) 100%)",
                  border: toast.type === "error" ? "1px solid rgba(220,53,34,0.3)" : "1px solid rgba(59,130,246,0.25)",
                }}
              >
                {toast.type === "error"
                  ? <WifiOff className="h-6 w-6" style={{ color: "rgb(248,113,113)" }} />
                  : <DatabaseZap className="h-6 w-6" style={{ color: "rgb(99,179,237)" }} />}
              </div>
              <span
                className="text-base font-bold tracking-wide"
                style={{ color: toast.type === "error" ? "rgb(252,165,165)" : "rgb(186,230,253)" }}
              >
                {toast.type === "error"
                  ? (zh ? "运行状态加载失败" : "Load failed")
                  : (zh ? "暂无实时运行数据" : "No realtime data")}
              </span>
              {toast.type === "error" && (
                <div className="flex items-center gap-1.5 text-[#4a5f8a]" style={{ fontSize: pillFontSize }}>
                  <AlertCircle className="h-3 w-3" />
                  <span>{zh ? "将在下次轮询时自动重试" : "Will retry on next poll"}</span>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Loading spinner */}
        {isRealtimeLoading && mode === "realtime" && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[rgba(5,12,29,0.24)] backdrop-blur-[1px]">
            <HistoryStyleLoadingIndicator text={zh ? "加载运行状态数据..." : "Loading running status..."} variant="overlay" />
          </div>
        )}
        {/* Always render chart skeleton */}
        <TrendStackedChart
          data={mode === "realtime" ? rtOverview : effectiveHistoryData}
          zh={zh}
          history={mode !== "realtime"}
          hideCellSeries={hideCellSeries}
          axisFontSize={axisFontSize}
          yAxisFontSize={yAxisFontSize}
          tooltipFontSize={tooltipFontSize}
          sectionLabelSize={sectionLabelSize}
          legendFontSize={legendFontSize}
        />
      </div>
    </div>
  )
}
