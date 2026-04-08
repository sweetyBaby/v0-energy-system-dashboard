"use client"

import { useProject } from "@/components/dashboard/dashboard-header"
import { useLanguage } from "@/components/language-provider"
import {
  createEmptyHeatmapCells,
  fetchLatestHeatmap,
  hasAnyHeatmapValue,
  type HeatmapCellMetrics,
} from "@/lib/api/heatmap"
import { AlertCircle, DatabaseZap, WifiOff } from "lucide-react"
import { type ReactNode, useEffect, useMemo, useState } from "react"

type TempSensorKey = "temp1" | "temp2" | "temp3"
type HeatmapMode = "voltage" | "temperature"
type HeatmapStat = {
  min: number | null
  max: number | null
  avg: number | null
}

const REALTIME_POLL_MS = 10_000
const EMPTY_CELL_COLOR = "rgba(23, 34, 72, 0.92)"

const RACK_LAYOUT: (number | null)[][] = [
  [50, 49, 18, 17, 16, 15],
  [48, 47, 20, 19, 14, 13],
  [46, 45, 22, 21, 12, 11],
  [44, 43, 24, 23, 10, 9],
  [42, 41, 26, 25, 8, 7],
  [40, 39, 28, 27, 6, 5],
  [38, 37, 30, 29, 4, 3],
  [36, 35, 32, 31, 2, 1],
  [null, null, 34, 33, null, null],
]

const TEMP_CARD_META: Record<TempSensorKey, { zh: string; en: string; color: string }> = {
  temp1: { zh: "T1 温度热力图", en: "T1 Temp Heatmap", color: "#fbbf24" },
  temp2: { zh: "T2 温度热力图", en: "T2 Temp Heatmap", color: "#fb923c" },
  temp3: { zh: "T3 温度热力图", en: "T3 Temp Heatmap", color: "#f87171" },
}

const VOLTAGE_GRADIENT =
  "linear-gradient(to bottom,rgb(220,53,34),rgb(251,191,36),rgb(74,222,128),rgb(59,130,246))"
const TEMPERATURE_GRADIENT =
  "linear-gradient(to bottom,rgb(136,19,19),rgb(220,53,34),rgb(249,115,22),rgb(250,204,21),rgb(167,224,50),rgb(101,205,90))"

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const toCellMap = (cells: HeatmapCellMetrics[]) => {
  const map: Record<number, HeatmapCellMetrics> = {}
  cells.forEach((cell) => {
    map[cell.id] = cell
  })
  return map
}

const buildStat = (values: Array<number | null>): HeatmapStat => {
  const numericValues = values.filter((value): value is number => value != null && Number.isFinite(value))

  if (numericValues.length === 0) {
    return {
      min: null,
      max: null,
      avg: null,
    }
  }

  const min = Math.min(...numericValues)
  const max = Math.max(...numericValues)
  const avg = numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length

  return { min, max, avg }
}

const formatLegendValue = (value: number | null, digits: number, suffix: string) =>
  value == null ? `--${suffix}` : `${value.toFixed(digits)}${suffix}`

const formatCellValue = (value: number | null, digits: number, suffix = "") =>
  value == null ? "--" : `${value.toFixed(digits)}${suffix}`

function tempColor(temperature: number | null): string {
  if (temperature == null) {
    return EMPTY_CELL_COLOR
  }

  const stops = [
    { t: 22, r: 101, g: 205, b: 90 },
    { t: 26, r: 167, g: 224, b: 50 },
    { t: 28, r: 250, g: 204, b: 21 },
    { t: 30, r: 249, g: 115, b: 22 },
    { t: 32, r: 220, g: 53, b: 34 },
    { t: 34, r: 136, g: 19, b: 19 },
  ]
  const value = clamp(temperature, 22, 34)

  for (let index = 0; index < stops.length - 1; index += 1) {
    if (value <= stops[index + 1].t) {
      const ratio = (value - stops[index].t) / (stops[index + 1].t - stops[index].t)
      return `rgb(${Math.round(stops[index].r + ratio * (stops[index + 1].r - stops[index].r))},${Math.round(
        stops[index].g + ratio * (stops[index + 1].g - stops[index].g),
      )},${Math.round(stops[index].b + ratio * (stops[index + 1].b - stops[index].b))})`
    }
  }

  const last = stops[stops.length - 1]
  return `rgb(${last.r},${last.g},${last.b})`
}

function voltColor(voltage: number | null, stat: HeatmapStat): string {
  if (voltage == null || stat.min == null || stat.max == null || stat.avg == null) {
    return EMPTY_CELL_COLOR
  }

  const delta = voltage - stat.avg
  const maxDelta = Math.max(stat.max - stat.avg, stat.avg - stat.min, 0.001)
  const ratio = Math.max(-1, Math.min(1, delta / maxDelta))

  if (ratio < 0) {
    const scale = -ratio
    return `rgb(${Math.round(74 - scale * 15)},${Math.round(222 - scale * 92)},${Math.round(128 + scale * 118)})`
  }
  if (ratio < 0.5) {
    const scale = ratio * 2
    return `rgb(${Math.round(74 + scale * 177)},${Math.round(222 - scale * 31)},${Math.round(128 - scale * 92)})`
  }

  const scale = (ratio - 0.5) * 2
  return `rgb(${Math.round(251 - scale * 31)},${Math.round(191 - scale * 138)},${Math.round(36 - scale * 2)})`
}

function foregroundColor(background: string) {
  const match = background.match(/\d+/g)
  if (!match) return "#f5fbff"

  const [r, g, b] = match.map(Number)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.48 ? "rgba(0,0,0,0.82)" : "rgba(255,255,255,0.94)"
}

function HeatmapCard({
  title,
  accentColor,
  children,
}: {
  title: string
  accentColor: string
  children: ReactNode
}) {
  return (
    <section className="min-h-0 overflow-hidden rounded-lg border border-[#1a2654] bg-[#0d1433]/90">
      <div className="flex h-full min-h-0 items-stretch gap-1.5 p-1.5">
        <div className="relative flex w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/5 bg-[linear-gradient(180deg,rgba(11,20,48,0.96),rgba(8,17,39,0.72))]">
          <div
            className="pointer-events-none absolute inset-y-1 left-0 w-px"
            style={{ background: `linear-gradient(to bottom, transparent, ${accentColor}, transparent)` }}
          />
          <h3
            className="whitespace-nowrap text-[10.5px] font-semibold tracking-[0.08em]"
            style={{ color: accentColor, transform: "rotate(-90deg)" }}
          >
            {title}
          </h3>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </section>
  )
}

function HeatmapGrid({
  cellMap,
  getColor,
  getValue,
}: {
  cellMap: Record<number, HeatmapCellMetrics>
  getColor: (cell: HeatmapCellMetrics) => string
  getValue: (cell: HeatmapCellMetrics) => string
}) {
  const idFontSize = 10.4
  const valueFontSize = 13.8

  return (
    <div
      className="grid h-full min-h-0 min-w-0 flex-1 grid-cols-6 gap-1"
      style={{ gridTemplateRows: `repeat(${RACK_LAYOUT.length}, minmax(0, 1fr))` }}
    >
      {RACK_LAYOUT.flatMap((row, rowIndex) =>
        row.map((cellId, cellIndex) => {
          if (cellId == null) {
            return <div key={`empty-${rowIndex}-${cellIndex}`} className="h-full w-full" />
          }

          const cell = cellMap[cellId]
          const backgroundColor = getColor(cell)
          const color = foregroundColor(backgroundColor)

          return (
            <div
              key={cellId}
              className="flex h-full w-full min-h-0 min-w-0 flex-col items-center justify-center rounded-[10px]"
              style={{ backgroundColor }}
            >
              <div className="leading-none" style={{ color, opacity: 0.72, fontSize: idFontSize }}>
                #{cellId}
              </div>
              <div className="mt-1 font-semibold leading-none" style={{ color, fontSize: valueFontSize }}>
                {getValue(cell)}
              </div>
            </div>
          )
        }),
      )}
    </div>
  )
}

function HeatmapLegend({
  mode,
  maxLabel,
  minLabel,
  zh,
}: {
  mode: HeatmapMode
  maxLabel: string
  minLabel: string
  zh: boolean
}) {
  const gradient = mode === "voltage" ? VOLTAGE_GRADIENT : TEMPERATURE_GRADIENT

  return (
    <div className="flex h-full shrink-0 items-center gap-1 py-0.5 pr-0">
      <div
        className="h-full w-2.5 rounded-full border border-white/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"
        style={{ background: gradient }}
      />
      <div className="flex h-full flex-col justify-between text-right tracking-[0.02em]">
        <div className="flex items-center justify-end gap-1 whitespace-nowrap text-[8.5px] leading-none">
          <span className="font-semibold text-[#8ca4cd]">{zh ? "高" : "H"}</span>
          <span className="tabular-nums text-[#6f89b8]">{maxLabel}</span>
        </div>
        <div className="flex items-center justify-end gap-1 whitespace-nowrap text-[8.5px] leading-none">
          <span className="font-semibold text-[#8ca4cd]">{zh ? "低" : "L"}</span>
          <span className="tabular-nums text-[#6f89b8]">{minLabel}</span>
        </div>
      </div>
    </div>
  )
}

export function CellHeatmapOverviewPanel() {
  const { language } = useLanguage()
  const { selectedProject } = useProject()
  const zh = language === "zh"

  const [cells, setCells] = useState<HeatmapCellMetrics[]>(() => createEmptyHeatmapCells())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let currentController: AbortController | null = null
    let timer: ReturnType<typeof setInterval> | null = null

    const loadHeatmap = async (initialLoad: boolean) => {
      if (initialLoad) {
        setIsLoading(true)
      }

      currentController?.abort()
      currentController = new AbortController()

      try {
        const nextCells = await fetchLatestHeatmap(selectedProject.projectId, {
          signal: currentController.signal,
        })

        if (cancelled || currentController.signal.aborted) {
          return
        }

        setCells(nextCells)
        setError(null)
      } catch (loadError) {
        if (cancelled || currentController.signal.aborted) {
          return
        }

        console.error(`Failed to load heatmap for ${selectedProject.projectId}`, loadError)
        setError(zh ? "热力图实时接口加载失败" : "Failed to load heatmap")

        if (initialLoad) {
          setCells(createEmptyHeatmapCells())
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadHeatmap(true)

    timer = setInterval(() => {
      void loadHeatmap(false)
    }, REALTIME_POLL_MS)

    return () => {
      cancelled = true
      currentController?.abort()

      if (timer) {
        clearInterval(timer)
      }
    }
  }, [selectedProject.projectId, zh])

  const hasData = useMemo(() => hasAnyHeatmapValue(cells), [cells])
  const cellMap = useMemo(() => toCellMap(cells), [cells])
  const voltageStats = useMemo(() => buildStat(cells.map((cell) => cell.voltage)), [cells])
  const temperatureStats = useMemo(
    () => ({
      temp1: buildStat(cells.map((cell) => cell.temp1)),
      temp2: buildStat(cells.map((cell) => cell.temp2)),
      temp3: buildStat(cells.map((cell) => cell.temp3)),
    }),
    [cells],
  )

  type StatusToast = { type: "info" | "error"; text: string } | null
  const [toast, setToast] = useState<StatusToast>(null)
  const [toastVisible, setToastVisible] = useState(false)

  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout>
    let hideTimer: ReturnType<typeof setTimeout>

    if (!isLoading && !error && !hasData) {
      const msg = { type: "info" as const, text: zh ? "暂无热力图数据" : "No heatmap data" }
      setToast(msg)
      setToastVisible(true)
      fadeTimer = setTimeout(() => setToastVisible(false), 2800)
      hideTimer = setTimeout(() => setToast(null), 3300)
    } else if (!isLoading && error) {
      const msg = { type: "error" as const, text: error }
      setToast(msg)
      setToastVisible(true)
      fadeTimer = setTimeout(() => setToastVisible(false), 3800)
      hideTimer = setTimeout(() => setToast(null), 4300)
    } else {
      setToastVisible(false)
      hideTimer = setTimeout(() => setToast(null), 500)
    }

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [isLoading, error, hasData, zh])

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[#1a2654] bg-[#0d1233] p-1.5">
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
                ? (zh ? "热力图数据加载失败" : "Heatmap load failed")
                : (zh ? "暂无热力图数据" : "No heatmap data")}
            </span>
            {toast.type === "error" && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#4a5f8a]">
                <AlertCircle className="h-3 w-3" />
                <span>{zh ? "将在下次轮询时自动重试" : "Will retry on next poll"}</span>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Loading indicator */}
      {isLoading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1a2654] border-t-[#3b82f6]" />
            <span className="text-xs text-[#4a5f8a]">{zh ? "热力图数据加载中..." : "Loading heatmap..."}</span>
          </div>
        </div>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-1 md:grid-cols-2 md:grid-rows-2">
        <HeatmapCard title={zh ? "电压热力图" : "Voltage Heatmap"} accentColor="#7dd3fc">
          <div className="flex h-full min-h-0 items-stretch gap-1.5 overflow-hidden">
            <HeatmapGrid
              cellMap={cellMap}
              getColor={(cell) => voltColor(cell.voltage, voltageStats)}
              getValue={(cell) => formatCellValue(cell.voltage, 2)}
            />
            <HeatmapLegend
              mode="voltage"
              maxLabel={formatLegendValue(voltageStats.max, 2, "V")}
              minLabel={formatLegendValue(voltageStats.min, 2, "V")}
              zh={zh}
            />
          </div>
        </HeatmapCard>

        {(["temp1", "temp2", "temp3"] as TempSensorKey[]).map((sensorKey) => {
          const sensorMeta = TEMP_CARD_META[sensorKey]
          const stats = temperatureStats[sensorKey]

          return (
            <HeatmapCard key={sensorKey} title={zh ? sensorMeta.zh : sensorMeta.en} accentColor={sensorMeta.color}>
              <div className="flex h-full min-h-0 items-stretch gap-1.5 overflow-hidden">
                <HeatmapGrid
                  cellMap={cellMap}
                  getColor={(cell) => tempColor(cell[sensorKey])}
                  getValue={(cell) => formatCellValue(cell[sensorKey], 1, "°")}
                />
                <HeatmapLegend
                  mode="temperature"
                  maxLabel={formatLegendValue(stats.max, 1, "°C")}
                  minLabel={formatLegendValue(stats.min, 1, "°C")}
                  zh={zh}
                />
              </div>
            </HeatmapCard>
          )
        })}
      </div>
    </div>
  )
}
