"use client"

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react"
import type { DateRange } from "react-day-picker"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Customized,
  Legend,
  type LegendProps,
  Line,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts"
import { LineChartIcon, Table } from "lucide-react"
import { BcuSelector, BCU_SELECTOR_ALL_VALUE } from "@/components/dashboard/bcu-selector"
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"
import { useProject } from "@/components/dashboard/dashboard-header"
import { CustomRangePicker } from "@/components/dashboard/custom-range-picker"
import { HistoryStyleLoadingIndicator } from "@/components/dashboard/history-style-loading-indicator"
import { useLanguage } from "@/components/language-provider"
import { useDashboardViewport } from "@/hooks/use-dashboard-viewport"
import { useFluidScale } from "@/hooks/use-fluid-scale"
import {
  fetchOverviewDailyList,
  formatNullableMetric,
  normalizeOverviewDailyRows,
  type EfficiencyPoint,
  type EfficiencyPointChild,
} from "@/lib/api/overview"

type RangeKey = "week" | "month" | "year" | "custom"
type ViewMode = "chart" | "table"
type SeriesKey =
  | "chargeCapacity"
  | "dischargeCapacity"
  | "chargeEnergy"
  | "dischargeEnergy"
  | "capacityEfficiency"
  | "energyEfficiency"
type TableColumnKey = "period" | SeriesKey
type BarMetricKey = "chargeCapacity" | "dischargeCapacity" | "chargeEnergy" | "dischargeEnergy"
type StackDeviceMeta = {
  deviceId: string
  label: string
}

type TableBreakdownEntry = {
  label: string
  value: string
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

type ComprehensiveEfficiencyPanelProps = {
  compact?: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000
const TOOLTIP_SURFACE = {
  background: "linear-gradient(180deg, rgba(8,18,42,0.98), rgba(9,20,46,0.94))",
  border: "1px solid rgba(67, 115, 184, 0.42)",
  borderRadius: "14px",
  boxShadow: "0 14px 30px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04)",
}

const toDayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1)

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return toDayStart(next)
}

const formatRequestDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const STACK_BAR_OPACITY = [0.96, 0.84, 0.72, 0.6, 0.5]
const BAR_METRIC_KEYS: BarMetricKey[] = ["chargeCapacity", "dischargeCapacity", "chargeEnergy", "dischargeEnergy"]

const buildStackDataKey = (seriesKey: BarMetricKey, deviceId: string) =>
  `${seriesKey}__${deviceId.replace(/[^a-zA-Z0-9_-]/g, "_")}`

const TABLE_BREAKDOWN_KEYS: BarMetricKey[] = ["chargeCapacity", "dischargeCapacity", "chargeEnergy", "dischargeEnergy"]

type ActiveTooltipBandProps = {
  isTooltipActive?: boolean
  activeCoordinate?: {
    x?: number
  }
  offset?: {
    left?: number
    top?: number
    width?: number
    height?: number
  }
  tooltipAxisBandSize?: number
  fillId: string
}

function ActiveTooltipBand({
  isTooltipActive,
  activeCoordinate,
  offset,
  tooltipAxisBandSize,
  fillId,
}: ActiveTooltipBandProps) {
  if (
    !isTooltipActive ||
    typeof activeCoordinate?.x !== "number" ||
    typeof offset?.left !== "number" ||
    typeof offset?.top !== "number" ||
    typeof offset?.width !== "number" ||
    typeof offset?.height !== "number"
  ) {
    return null
  }

  const rawBandWidth = typeof tooltipAxisBandSize === "number" ? tooltipAxisBandSize : 0
  const bandWidth = Math.max(rawBandWidth, 18)
  const chartLeft = offset.left
  const chartRight = offset.left + offset.width
  const bandLeft = Math.max(activeCoordinate.x - bandWidth / 2, chartLeft)
  const bandRight = Math.min(activeCoordinate.x + bandWidth / 2, chartRight)
  const width = bandRight - bandLeft

  if (width <= 0) {
    return null
  }

  return (
    <g pointerEvents="none">
      <rect
        x={bandLeft}
        y={offset.top}
        width={width}
        height={offset.height}
        fill={`url(#${fillId})`}
        stroke="rgba(238,245,255,0.14)"
        strokeWidth={1}
        rx={4}
      />
    </g>
  )
}

function ViewIconChart({ active }: { active: boolean }) {
  return <LineChartIcon className="h-[16px] w-[16px]" style={{ color: active ? "#07162b" : "#6f86b7" }} />
}

function ViewIconTable({ active }: { active: boolean }) {
  return <Table className="h-[16px] w-[16px]" style={{ color: active ? "#07162b" : "#6f86b7" }} />
}

export function ComprehensiveEfficiencyPanel({
  compact = false,
}: ComprehensiveEfficiencyPanelProps) {
  const { language } = useLanguage()
  const { selectedProject } = useProject()
  const { isCompactViewport } = useDashboardViewport()
  const chartId = useId().replace(/:/g, "")
  const currentDay = useMemo(() => toDayStart(new Date()), [])
  const maxAvailableDate = useMemo(() => addDays(currentDay, -1), [currentDay])
  const defaultCustomRange = useMemo<DateRange>(
    () => ({
      from: addDays(maxAvailableDate, -30),
      to: maxAvailableDate,
    }),
    [maxAvailableDate],
  )

  const [range, setRange] = useState<RangeKey>("week")
  const [viewMode, setViewMode] = useState<ViewMode>("chart")
  const [selectedDeviceId, setSelectedDeviceId] = useState(BCU_SELECTOR_ALL_VALUE)
  const [hiddenSeries, setHiddenSeries] = useState<SeriesKey[]>([
    "chargeCapacity",
    "dischargeCapacity",
    "capacityEfficiency",
  ])
  const [customRange, setCustomRange] = useState<DateRange | undefined>(defaultCustomRange)
  const [activeData, setActiveData] = useState<EfficiencyPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [viewportRange, setViewportRange] = useState<ViewportRange | null>(null)
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false)
  const [dragPreviewOffset, setDragPreviewOffset] = useState(0)
  const chartShellRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const panelScale = useFluidScale<HTMLDivElement>(620, 1120, { minRootPx: 13.5, maxRootPx: 17.5 })

  const activeRequestRange = useMemo(() => {
    if (range === "week") {
      return {
        beginTime: formatRequestDate(addDays(maxAvailableDate, -6)),
        endTime: formatRequestDate(maxAvailableDate),
      }
    }

    if (range === "month") {
      const monthStart = startOfMonth(currentDay)
      if (monthStart > maxAvailableDate) {
        return null
      }

      return {
        beginTime: formatRequestDate(monthStart),
        endTime: formatRequestDate(maxAvailableDate),
      }
    }

    if (range === "year") {
      const yearStart = startOfYear(currentDay)
      if (yearStart > maxAvailableDate) {
        return null
      }

      return {
        beginTime: formatRequestDate(yearStart),
        endTime: formatRequestDate(maxAvailableDate),
      }
    }

    if (customRange?.from && customRange.to) {
      return {
        beginTime: formatRequestDate(customRange.from),
        endTime: formatRequestDate(customRange.to),
      }
    }

    return null
  }, [currentDay, customRange, maxAvailableDate, range])

  const deviceOptions = useMemo(
    () =>
      selectedProject.devices.map((device, index) => ({
        value: device.deviceId || `device-${index + 1}`,
        label: device.deviceName || `BCU ${index + 1}`,
      })),
    [selectedProject.devices],
  )

  useEffect(() => {
    if (deviceOptions.length <= 1 && selectedDeviceId !== BCU_SELECTOR_ALL_VALUE) {
      setSelectedDeviceId(BCU_SELECTOR_ALL_VALUE)
      return
    }

    if (selectedDeviceId === BCU_SELECTOR_ALL_VALUE) {
      return
    }

    const hasSelectedDevice = deviceOptions.some((device) => device.value === selectedDeviceId)
    if (!hasSelectedDevice) {
      setSelectedDeviceId(BCU_SELECTOR_ALL_VALUE)
    }
  }, [deviceOptions, selectedDeviceId])

  useEffect(() => {
    let cancelled = false

    const loadDailyList = async () => {
      if (!activeRequestRange) {
        setActiveData([])
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const deviceParams =
          selectedDeviceId === BCU_SELECTOR_ALL_VALUE
            ? {}
            : {
                deviceId: selectedDeviceId,
              }
        const requestParams =
          range === "year"
            ? {
                ...activeRequestRange,
                ...deviceParams,
                type: "year" as const,
                year: String(currentDay.getFullYear()),
              }
            : {
                ...activeRequestRange,
                ...deviceParams,
              }
        const normalizeOptions = {
          groupBy: range === "year" ? ("month" as const) : ("day" as const),
          language,
        }

        const response = await fetchOverviewDailyList({
          projectId: selectedProject.projectId,
          deviceId: selectedDeviceId === BCU_SELECTOR_ALL_VALUE ? undefined : selectedDeviceId,
          params: requestParams,
        })

        if (!cancelled) {
          setActiveData(normalizeOverviewDailyRows(response.rows ?? [], normalizeOptions))
        }
      } catch (error) {
        if (!cancelled) {
          setActiveData([])
        }

        console.error(`Failed to load overview daily list for ${selectedProject.projectId}`, error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadDailyList()

    return () => {
      cancelled = true
    }
  }, [activeRequestRange, currentDay, deviceOptions, language, range, selectedDeviceId, selectedProject.projectId])

  const legendText = {
    chargeCapacity: language === "zh" ? "充电容量 (Ah)" : "Charge Capacity (Ah)",
    dischargeCapacity: language === "zh" ? "放电容量 (Ah)" : "Discharge Capacity (Ah)",
    chargeEnergy: language === "zh" ? "充电电量 (kWh)" : "Charge Energy (kWh)",
    dischargeEnergy: language === "zh" ? "放电电量 (kWh)" : "Discharge Energy (kWh)",
    capacityEfficiency: language === "zh" ? "容量效率 (%)" : "Capacity Efficiency (%)",
    energyEfficiency: language === "zh" ? "能量效率 (%)" : "Energy Efficiency (%)",
  }

  const seriesConfig: Array<{ key: SeriesKey; name: string; color: string }> = [
    { key: "chargeCapacity", name: legendText.chargeCapacity, color: "#7dd3fc" },
    { key: "dischargeCapacity", name: legendText.dischargeCapacity, color: "#fda4af" },
    { key: "capacityEfficiency", name: legendText.capacityEfficiency, color: "#ffd60a" },
    { key: "chargeEnergy", name: legendText.chargeEnergy, color: "#99f6e4" },
    { key: "dischargeEnergy", name: legendText.dischargeEnergy, color: "#c4b5fd" },
    { key: "energyEfficiency", name: legendText.energyEfficiency, color: "#4ade80" },
  ]

  const seriesMap = useMemo(
    () =>
      Object.fromEntries(
        seriesConfig.map((series) => [
          series.key,
          {
            ...series,
            unit:
              series.key === "capacityEfficiency" || series.key === "energyEfficiency"
                ? "%"
                : series.key === "chargeCapacity" || series.key === "dischargeCapacity"
                  ? "Ah"
                  : "kWh",
          },
        ]),
      ) as Record<SeriesKey, { key: SeriesKey; name: string; color: string; unit: string }>,
    [seriesConfig],
  )

  const formatRangeLabel = (rangeValue: DateRange | undefined) => {
    if (!rangeValue?.from) return displaySelectRangeLabel

    const formatDate = (date: Date) => `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
    if (!rangeValue.to) return formatDate(rangeValue.from)
    return `${formatDate(rangeValue.from)} - ${formatDate(rangeValue.to)}`
  }

  const renderTableMetric = (value: number | null | undefined, digits = 1) => formatNullableMetric(value, digits)

  const displayRangeOptions = [
    { key: "week" as const, label: language === "zh" ? "近7天" : "7 Days" },
    { key: "month" as const, label: language === "zh" ? "本月" : "This Month" },
    { key: "year" as const, label: language === "zh" ? "本年" : "This Year" },
    { key: "custom" as const, label: language === "zh" ? "自定义" : "Custom" },
  ]
  const displayLegendText: Record<SeriesKey, string> = {
    chargeCapacity: language === "zh" ? "充电容量 (Ah)" : "Charge Capacity (Ah)",
    dischargeCapacity: language === "zh" ? "放电容量 (Ah)" : "Discharge Capacity (Ah)",
    chargeEnergy: language === "zh" ? "充电电量 (kWh)" : "Charge Energy (kWh)",
    dischargeEnergy: language === "zh" ? "放电电量 (kWh)" : "Discharge Energy (kWh)",
    capacityEfficiency: language === "zh" ? "容量效率 (%)" : "Capacity Efficiency (%)",
    energyEfficiency: language === "zh" ? "能量效率 (%)" : "Energy Efficiency (%)",
  }
  const displayTableColumns: Array<{
    key: TableColumnKey
    label: string
    unit: string
    align: "left" | "right"
    tone: string
  }> = [
    { key: "period", label: language === "zh" ? "时间" : "Period", unit: "", align: "left", tone: "text-[#dce7ff]" },
    { key: "chargeCapacity", label: language === "zh" ? "充电容量" : "Charge Capacity", unit: "Ah", align: "right", tone: "text-[#eef4ff]" },
    { key: "dischargeCapacity", label: language === "zh" ? "放电容量" : "Discharge Capacity", unit: "Ah", align: "right", tone: "text-[#eef4ff]" },
    { key: "capacityEfficiency", label: language === "zh" ? "容量效率" : "Capacity Efficiency", unit: "%", align: "right", tone: "text-[#90f0c1]" },
    { key: "chargeEnergy", label: language === "zh" ? "充电电量" : "Charge Energy", unit: "kWh", align: "right", tone: "text-[#eef4ff]" },
    { key: "dischargeEnergy", label: language === "zh" ? "放电电量" : "Discharge Energy", unit: "kWh", align: "right", tone: "text-[#eef4ff]" },
    { key: "energyEfficiency", label: language === "zh" ? "能量效率" : "Energy Efficiency", unit: "%", align: "right", tone: "text-[#90f0c1]" },
  ]
  const displayCustomHint =
    language === "zh" ? "最多选择 31 天，结束日期不能超过昨天" : "Select up to 31 days, ending no later than yesterday"
  const displayMaxRangeError =
    language === "zh" ? "自定义日期范围最多 31 天，且结束日期不能超过昨天" : "Custom date range cannot exceed 31 days or go beyond yesterday"
  const displaySelectRangeLabel = language === "zh" ? "选择日期范围" : "Select range"
  const displayEmptyStateText = language === "zh" ? "当前时间范围暂无数据" : "No data for the selected range"
  const displayLoadingText = language === "zh" ? "加载综合能效数据..." : "Loading efficiency data..."
  const displayTitle = language === "zh" ? "综合能效统计" : "Efficiency Analytics"
  const displayChartLabel = language === "zh" ? "图表" : "Chart"
  const displayTableLabel = language === "zh" ? "表格" : "Table"
  const displayQuickSelectLabel = language === "zh" ? "昨天" : "Yesterday"
  const displayBcuLabel = "BCU"
  const displayAllBcuLabel = language === "zh" ? "全部BCU" : "All BCUs"

  const isAllBcuSelected = selectedDeviceId === BCU_SELECTOR_ALL_VALUE
  const stackedBreakdownDeviceIds = useMemo(
    () =>
      Array.from(
        new Set(
          activeData.flatMap((point) => point.children.map((child) => child.deviceId)).filter((deviceId) => deviceId.length > 0),
        ),
      ),
    [activeData],
  )
  const stackedBarDevices = useMemo<StackDeviceMeta[]>(() => {
    const deviceMap = new Map(selectedProject.devices.map((device, index) => [device.deviceId, device.deviceName || `BCU ${index + 1}`]))
    const orderedDeviceIds = selectedProject.devices.map((device) => device.deviceId).filter(Boolean)
    const responseDeviceIds = stackedBreakdownDeviceIds
    const mergedDeviceIds = [...orderedDeviceIds, ...responseDeviceIds.filter((deviceId) => !orderedDeviceIds.includes(deviceId))]

    return mergedDeviceIds.map((deviceId, index) => ({
      deviceId,
      label: deviceMap.get(deviceId) ?? `BCU ${index + 1}`,
    }))
  }, [selectedProject.devices, stackedBreakdownDeviceIds])
  const useStackedBars = isAllBcuSelected && stackedBreakdownDeviceIds.length > 0
  const stackedBarDeviceMap = useMemo(
    () => new Map(stackedBarDevices.map((device) => [device.deviceId, device.label])),
    [stackedBarDevices],
  )
  const showTableBreakdown = useStackedBars

  const getTableMetricValue = (item: EfficiencyPoint, key: SeriesKey) => {
    if (key === "chargeCapacity") return renderTableMetric(item.chargeCapacity)
    if (key === "dischargeCapacity") return renderTableMetric(item.dischargeCapacity)
    if (key === "capacityEfficiency") return renderTableMetric(item.capacityEfficiency, 2)
    if (key === "chargeEnergy") return renderTableMetric(item.chargeEnergy)
    if (key === "dischargeEnergy") return renderTableMetric(item.dischargeEnergy)
    return renderTableMetric(item.energyEfficiency, 2)
  }

  const getTableMetricBreakdown = (item: EfficiencyPoint, key: SeriesKey): TableBreakdownEntry[] => {
    if (!showTableBreakdown || !TABLE_BREAKDOWN_KEYS.includes(key as BarMetricKey)) {
      return []
    }

    return item.children
      .map((child) => {
        const childValue = child[key as BarMetricKey]

        return {
          label: stackedBarDeviceMap.get(child.deviceId) ?? child.deviceId,
          value: renderTableMetric(childValue),
        }
      })
      .filter((entry) => entry.value !== "--")
  }

  const chartData = useMemo(
    () =>
      activeData.map((point) => {
        if (!useStackedBars) {
          return point
        }

        const childMetricMap = new Map(point.children.map((child) => [child.deviceId, child]))
        const stackedPoint: EfficiencyPoint = { ...point }

        stackedBarDevices.forEach((device) => {
          const child = childMetricMap.get(device.deviceId)
          BAR_METRIC_KEYS.forEach((metricKey) => {
            stackedPoint[buildStackDataKey(metricKey, device.deviceId)] = child?.[metricKey] ?? null
          })
        })

        return stackedPoint
      }),
    [activeData, stackedBarDevices, useStackedBars],
  )
  const visibleChartData = useMemo(() => {
    if (!viewportRange) {
      return chartData
    }

    return chartData.slice(viewportRange.startIndex, viewportRange.endIndex + 1)
  }, [chartData, viewportRange])

  const visiblePointCount = visibleChartData.length
  const xInterval =
    range === "year"
      ? Math.max(0, Math.floor(visiblePointCount / 12) - 1)
      : range === "month"
        ? Math.max(0, Math.floor(visiblePointCount / 10) - 1)
        : Math.max(0, Math.floor(visiblePointCount / 8) - 1)
  const canZoom = activeData.length > 8
  const canPan = Boolean(viewportRange && visiblePointCount < activeData.length)
  useEffect(() => {
    setViewportRange(null)
    dragStateRef.current = null
    setIsDraggingTimeline(false)
    setDragPreviewOffset(0)
  }, [customRange?.from?.getTime(), customRange?.to?.getTime(), range, selectedDeviceId, selectedProject.projectId])

  useEffect(() => {
    if (activeData.length === 0) {
      setViewportRange(null)
      setDragPreviewOffset(0)
      return
    }

    setViewportRange((currentRange) => {
      if (!currentRange) {
        return {
          startIndex: 0,
          endIndex: activeData.length - 1,
        }
      }

      const visibleSize = Math.min(activeData.length, currentRange.endIndex - currentRange.startIndex + 1)
      const nextStart = clamp(currentRange.startIndex, 0, activeData.length - visibleSize)
      const nextEnd = nextStart + visibleSize - 1

      if (currentRange.startIndex === nextStart && currentRange.endIndex === nextEnd) {
        return currentRange
      }

      return {
        startIndex: nextStart,
        endIndex: nextEnd,
      }
    })
  }, [activeData.length])

  const toggleSeries = (seriesKey: SeriesKey) => {
    setHiddenSeries((prev) => {
      if (prev.includes(seriesKey)) {
        return prev.filter((key) => key !== seriesKey)
      }

      if (prev.length >= seriesConfig.length - 1) {
        return prev
      }

      return [...prev, seriesKey]
    })
  }

  const renderTooltip = ({ active, payload, label, coordinate, viewBox }: TooltipProps<ValueType, NameType>) => {
    if (!active || !payload?.length) return null

    const tooltipPoint = payload[0]?.payload as EfficiencyPoint | undefined
    if (!tooltipPoint) return null

    const visibleSeries = seriesConfig.filter((series) => !hiddenSeries.includes(series.key))
    const tooltipDeviceMap = new Map(stackedBarDevices.map((device) => [device.deviceId, device.label]))
    const showTooltipBreakdown = useStackedBars
    const tooltipHasDenseBreakdown = showTooltipBreakdown && tooltipPoint.children.length >= 7
    const chartLeftEdge =
      viewBox && typeof viewBox.x === "number"
        ? viewBox.x
        : null
    const chartRightEdge =
      viewBox && typeof viewBox.x === "number" && typeof viewBox.width === "number"
        ? viewBox.x + viewBox.width
        : null
    const chartWidth = typeof viewBox?.width === "number" ? viewBox.width : null
    const tooltipWidthLimit = tooltipHasDenseBreakdown ? 288 : 264
    const tooltipViewportMarginPx = 18
    const tooltipWidthPx = Math.min(tooltipWidthLimit, chartWidth != null ? Math.max(chartWidth - 24, 228) : tooltipWidthLimit)
    const tooltipAnchorX =
      typeof coordinate?.x === "number"
        ? coordinate.x
        : chartLeftEdge ?? 0
    let tooltipShiftX = 0

    if (chartRightEdge != null) {
      const projectedRight = tooltipAnchorX + tooltipWidthPx + tooltipViewportMarginPx
      if (projectedRight > chartRightEdge) {
        tooltipShiftX -= projectedRight - chartRightEdge
      }
    }

    if (chartLeftEdge != null) {
      const projectedLeft = tooltipAnchorX + tooltipShiftX
      if (projectedLeft < chartLeftEdge + 8) {
        tooltipShiftX += chartLeftEdge + 8 - projectedLeft
      }
    }

    return (
      <div
        className="min-w-[220px] overflow-hidden"
        style={{
          ...TOOLTIP_SURFACE,
          width: `${tooltipWidthPx}px`,
          maxWidth: `${tooltipWidthPx}px`,
          transform: tooltipShiftX === 0 ? undefined : `translateX(${tooltipShiftX}px)`,
        }}
        >
        <div className="border-b border-white/8 bg-[linear-gradient(90deg,rgba(17,216,191,0.12),transparent)] px-2.5 py-1.5">
          <div className="text-[13px] font-semibold leading-tight text-[#e9f4ff]">{label}</div>
        </div>

        <div
          className="grid grid-cols-1 gap-1.5 px-2.5 py-2"
        >
          {visibleSeries.map((series) => {
            const key = series.key
            const meta = seriesMap[key]
            const rawValue = tooltipPoint[key]
            const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0)
            const displayValue =
              Number.isNaN(numericValue) || rawValue == null
                ? "--"
                : numericValue.toFixed(key === "capacityEfficiency" || key === "energyEfficiency" ? 2 : 1)
            const childBreakdown: Array<{ deviceId: string; label: string; value: string }> =
              showTooltipBreakdown && BAR_METRIC_KEYS.includes(key as BarMetricKey)
                ? tooltipPoint.children
                    .map((child) => {
                      const childValue = child[key as BarMetricKey]

                      return {
                        deviceId: child.deviceId,
                        label: tooltipDeviceMap.get(child.deviceId) ?? child.deviceId,
                        value:
                          childValue == null || Number.isNaN(childValue)
                            ? "--"
                            : childValue.toFixed(key === "chargeEnergy" || key === "dischargeEnergy" ? 1 : 1),
                      }
                    })
                    .filter((child) => child.value !== "--")
                : []

            return (
              <div
                key={key}
                className="rounded-xl border border-white/6 bg-white/[0.03] px-2 py-1.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: meta.color, boxShadow: `0 0 12px ${meta.color}99` }}
                    />
                    <span className="text-[11px] leading-tight text-[#bed3f6]">
                      {displayLegendText[key]}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-semibold leading-tight text-[#f2f8ff]">
                    {displayValue}
                    <span className="ml-1 text-[#86a7d4]">{meta.unit}</span>
                  </span>
                </div>

                {childBreakdown.length > 0 ? (
                  <div className="mt-1.5 border-t border-white/6 pt-1.5">
                    <div className="grid grid-cols-1 gap-1">
                      {childBreakdown.map((child) => (
                        <div
                          key={`${key}-${child.deviceId}`}
                          className="flex items-start justify-between gap-2 text-[10.5px]"
                        >
                          <span className="min-w-0 flex-1 break-words leading-tight text-[#7da0d8]">{child.label}</span>
                          <span className="shrink-0 whitespace-nowrap font-mono leading-tight text-[#dce9ff]">
                            {child.value}
                            <span className="ml-1 text-[#6f86b7]">{meta.unit}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const handleAxisWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!canZoom || activeData.length <= 1 || !chartShellRef.current) {
      return
    }

    if (event.target instanceof Element && event.target.closest("[data-efficiency-legend='true']")) {
      return
    }

    event.preventDefault()
    const rect = chartShellRef.current.getBoundingClientRect()

    const currentRange =
      viewportRange ?? {
        startIndex: 0,
        endIndex: activeData.length - 1,
      }
    const currentSize = currentRange.endIndex - currentRange.startIndex + 1
    const nextSize = clamp(
      currentSize + (event.deltaY > 0 ? Math.max(1, Math.ceil(currentSize * 0.2)) : -Math.max(1, Math.ceil(currentSize * 0.2))),
      Math.min(4, activeData.length),
      activeData.length,
    )

    if (nextSize === currentSize) {
      return
    }

    const relativeX = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1)
    const anchorIndex = clamp(
      currentRange.startIndex + Math.round((currentSize - 1) * relativeX),
      0,
      activeData.length - 1,
    )
    let nextStart = Math.round(anchorIndex - relativeX * (nextSize - 1))
    let nextEnd = nextStart + nextSize - 1

    if (nextStart < 0) {
      nextStart = 0
      nextEnd = nextSize - 1
    }

    if (nextEnd > activeData.length - 1) {
      nextEnd = activeData.length - 1
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
      setDragPreviewOffset(0)
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
    setDragPreviewOffset(0)
  }

  const handleTimelinePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canPan || !chartShellRef.current || !viewportRange) {
      return
    }

    if (event.target instanceof Element && event.target.closest("[data-efficiency-legend='true']")) {
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
    const maxStart = activeData.length - visibleSize
    if (maxStart <= 0) {
      setDragPreviewOffset(0)
      return
    }

    const deltaX = dragStateRef.current.startX - event.clientX
    const pointSpacing = rect.width / Math.max(visibleSize, 1)
    const pointDelta = Math.round(deltaX / Math.max(pointSpacing, 1))
    const nextStart = clamp(dragStateRef.current.startRange.startIndex + pointDelta, 0, maxStart)
    const nextEnd = nextStart + visibleSize - 1
    const effectiveDelta = nextStart - dragStateRef.current.startRange.startIndex
    const nextPreviewOffset =
      effectiveDelta !== pointDelta
        ? 0
        : clamp(-(deltaX - effectiveDelta * pointSpacing), -pointSpacing / 2, pointSpacing / 2)

    setViewportRange((currentRange) => {
      if (currentRange && currentRange.startIndex === nextStart && currentRange.endIndex === nextEnd) {
        return currentRange
      }

      return {
        startIndex: nextStart,
        endIndex: nextEnd,
      }
    })
    setDragPreviewOffset(nextPreviewOffset)
  }

  const renderLegend = () => (
    <div data-efficiency-legend="true" className="flex flex-wrap items-center justify-center gap-2 px-2 pt-3">
      {seriesConfig.map((series) => {
        const hidden = hiddenSeries.includes(series.key)

        return (
          <button
            key={series.key}
            type="button"
            onClick={() => toggleSeries(series.key)}
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 transition-all ${
              hidden
                ? "border-white/8 bg-white/[0.02] text-[#6f86b7]"
                : "border-white/10 bg-[linear-gradient(180deg,rgba(18,34,72,0.92),rgba(11,24,53,0.92))] text-[#dce9ff]"
            }`}
            style={{
              fontSize: `${controlFontSize}px`,
              boxShadow: hidden ? "none" : `inset 0 0 0 1px ${series.color}1f, 0 0 14px ${series.color}22`,
            }}
          >
            <span
              className="block h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: series.color,
                boxShadow: hidden ? "none" : `0 0 12px ${series.color}88`,
              }}
            />
            <span>{displayLegendText[series.key]}</span>
          </button>
        )
      })}
    </div>
  )

  const wrapperClassName = compact
    ? `flex h-full min-h-0 flex-col overflow-visible rounded-[22px] border border-[#22d3ee]/25 bg-[rgba(5,12,26,0.62)] backdrop-blur-[3px] shadow-[0_0_0_1px_rgba(34,211,238,0.08)_inset] ${
        isCompactViewport ? "p-2.5" : "p-3"
      }`
    : `flex h-full min-h-0 flex-col overflow-visible rounded-lg border border-[#1a2654] bg-[#0d1233] ${
        isCompactViewport ? "p-2.5" : "p-3"
      }`
  const titleFontSize = panelScale.fluid(compact ? 14 : 16, compact ? 18 : 22)
  const controlFontSize = panelScale.fluid(12, 14.5)
  const axisFontSize = panelScale.chart(10, 12.5)
  const emptyFontSize = panelScale.fluid(14, 17)
  const tableHeadFontSize = panelScale.fluid(11.5, 13.2)
  const tableCellFontSize = panelScale.fluid(12.5, 14.2)
  const tableValueFontSize = panelScale.fluid(12, 13.8)

  if (loading && activeData.length < 0) {
    return (
      <div ref={panelScale.ref} className={wrapperClassName}>
        <div className="flex h-full items-center justify-center">
          <HistoryStyleLoadingIndicator text={displayLoadingText} />
        </div>
      </div>
    )
  }

  return (
    <div ref={panelScale.ref} className={wrapperClassName}>
      <div className={`flex flex-wrap items-center justify-between gap-2 ${isCompactViewport ? "mb-1.5" : "mb-2"}`}>
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3 className="font-semibold text-[#00d4aa]" style={{ fontSize: `${titleFontSize}px` }}>
            {displayTitle}
          </h3>
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <BcuSelector
            value={selectedDeviceId}
            onChange={setSelectedDeviceId}
            options={deviceOptions}
            allLabel={displayAllBcuLabel}
            hideWhenSingleOption
            label={displayBcuLabel}
            compact={isCompactViewport}
            fontSize={controlFontSize}
          />

          <div className={`flex items-center gap-1 overflow-hidden rounded-xl border border-[#203166] bg-[#16204b]/90 p-0.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] ${isCompactViewport ? "h-[34px]" : "h-[36px]"}`}>
            {displayRangeOptions.map((item, index) => {
              const edge =
                displayRangeOptions.length === 1
                  ? "solo"
                  : index === 0
                    ? "start"
                    : index === displayRangeOptions.length - 1
                      ? "end"
                      : "middle"

              const active = range === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setRange(item.key)}
                  className={`relative h-full rounded-lg transition-all ${isCompactViewport ? "px-2.5" : "px-3"} ${
                    active
                      ? `z-[1] bg-[#11d8bf] font-medium text-[#07162b] shadow-[0_0_18px_rgba(17,216,191,0.2)] ${
                          edge === "start" ? "rounded-l-[10px]" : edge === "end" ? "rounded-r-[10px]" : edge === "solo" ? "rounded-[10px]" : ""
                        }`
                      : "text-[#7b8ab8] hover:bg-transparent hover:text-[#e8f4fc]"
                  }`}
                  style={{
                    fontSize: `${controlFontSize}px`,
                    height: active ? "calc(100% + 4px)" : "100%",
                    marginTop: active ? "-2px" : 0,
                    marginBottom: active ? "-2px" : 0,
                    marginLeft: active && (edge === "start" || edge === "solo") ? "-2px" : 0,
                    marginRight: active && (edge === "end" || edge === "solo") ? "-2px" : 0,
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {range === "custom" && (
              <CustomRangePicker
                value={customRange}
                onChange={setCustomRange}
                maxDate={maxAvailableDate}
                maxDays={31}
                buttonLabel={formatRangeLabel(customRange)}
                hint={displayCustomHint}
                maxRangeError={displayMaxRangeError}
                quickSelectLabel={displayQuickSelectLabel}
                compact={isCompactViewport}
              />
            )}

            <div className="flex gap-0.5 rounded-lg border border-[#1a2654] bg-[#0a1225] p-0.5">
              <button
                onClick={() => setViewMode("chart")}
                className={`flex items-center justify-center rounded-md p-1.5 transition-all ${
                  viewMode === "chart"
                    ? "bg-[#11d8bf] shadow-[0_0_10px_rgba(17,216,191,0.25)]"
                    : "hover:bg-[#1a2654]/60"
                }`}
                aria-label={displayChartLabel}
                title={displayChartLabel}
              >
                <ViewIconChart active={viewMode === "chart"} />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center justify-center rounded-md p-1.5 transition-all ${
                  viewMode === "table"
                    ? "bg-[#11d8bf] shadow-[0_0_10px_rgba(17,216,191,0.25)]"
                    : "hover:bg-[#1a2654]/60"
                }`}
                aria-label={displayTableLabel}
                title={displayTableLabel}
              >
                <ViewIconTable active={viewMode === "table"} />
              </button>
            </div>
          </div>
          </div>
        </div>

      {viewMode === "chart" ? (
        <div
          ref={chartShellRef}
          onWheel={handleAxisWheel}
          onPointerDown={handleTimelinePointerDown}
          onPointerMove={handleTimelinePointerMove}
          onPointerUp={(event) => stopTimelineDrag(event.pointerId)}
          onPointerCancel={(event) => stopTimelineDrag(event.pointerId)}
          onLostPointerCapture={(event) => stopTimelineDrag(event.pointerId)}
          className={`relative z-10 min-h-0 flex-1 select-none overflow-visible rounded-[20px] border border-[#1e2e63]/75 bg-[linear-gradient(180deg,rgba(8,18,42,0.92),rgba(10,20,47,0.78))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
            canPan ? (isDraggingTimeline ? "cursor-grabbing" : "cursor-grab") : ""
          }`}
          style={{ touchAction: canPan ? "none" : "auto", userSelect: "none" }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(0,212,170,0.08),transparent_28%),radial-gradient(circle_at_84%_10%,rgba(86,130,255,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <HistoryStyleLoadingIndicator text={displayLoadingText} />
            </div>
          ) : activeData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[#7b8ab8]" style={{ fontSize: `${emptyFontSize}px` }}>{displayEmptyStateText}</div>
          ) : (
            <div
              className="h-full w-full"
              style={{
                transform: dragPreviewOffset === 0 ? "translate3d(0,0,0)" : `translate3d(${dragPreviewOffset}px,0,0)`,
                transition: isDraggingTimeline ? "none" : "transform 140ms ease-out",
                willChange: "transform",
                userSelect: "none",
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={visibleChartData}
                  margin={{ top: 18, right: 12, left: 0, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id={`${chartId}-charge-capacity`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8ee7ff" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#3f8bff" stopOpacity={0.55} />
                    </linearGradient>
                    <linearGradient id={`${chartId}-discharge-capacity`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffb3c7" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#ff6f91" stopOpacity={0.55} />
                    </linearGradient>
                    <linearGradient id={`${chartId}-charge-energy`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a8fff0" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#42d9b8" stopOpacity={0.55} />
                    </linearGradient>
                    <linearGradient id={`${chartId}-discharge-energy`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d9c8ff" stopOpacity={0.96} />
                      <stop offset="100%" stopColor="#8f7cff" stopOpacity={0.58} />
                    </linearGradient>
                    <linearGradient id={`${chartId}-tooltip-band`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#eef5ff" stopOpacity={0.05} />
                      <stop offset="50%" stopColor="#eef5ff" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#eef5ff" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Customized component={<ActiveTooltipBand fillId={`${chartId}-tooltip-band`} />} />
                  <CartesianGrid stroke="rgba(45,74,126,0.72)" strokeDasharray="3 5" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#88a4d7", fontSize: axisFontSize }}
                    tickMargin={10}
                    interval={xInterval}
                    minTickGap={range === "year" ? 28 : 20}
                  />
                  <YAxis
                    yAxisId="quantity"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#88a4d7", fontSize: axisFontSize }}
                    tickMargin={8}
                  />
                  <YAxis
                    yAxisId="efficiency"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#88a4d7", fontSize: axisFontSize }}
                    tickMargin={8}
                    tickFormatter={(value: number) => `${value}%`}
                  />
                  <Tooltip
                    cursor={false}
                    allowEscapeViewBox={{ x: true, y: true }}
                    wrapperStyle={{ zIndex: 60, pointerEvents: "none" }}
                    content={renderTooltip}
                  />
                  <Legend wrapperStyle={{ paddingTop: "4px" }} content={renderLegend} />
                  {seriesConfig.map((series) => {
                    if (hiddenSeries.includes(series.key)) {
                      return null
                    }

                    if (series.key === "capacityEfficiency") {
                      return (
                        <Line
                          key={series.key}
                          yAxisId="efficiency"
                          type="monotone"
                          dataKey={series.key}
                          name={displayLegendText[series.key]}
                          stroke="#ffd60a"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: "#08122a", stroke: "#ffd60a", strokeWidth: 3 }}
                          activeDot={{ r: 5, fill: "#08122a", stroke: "#ffd60a", strokeWidth: 3 }}
                          connectNulls
                        />
                      )
                    }

                    if (series.key === "energyEfficiency") {
                      return (
                        <Line
                          key={series.key}
                          yAxisId="efficiency"
                          type="monotone"
                          dataKey={series.key}
                          name={displayLegendText[series.key]}
                          stroke="#4ade80"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: "#08122a", stroke: "#4ade80", strokeWidth: 3 }}
                          activeDot={{ r: 5, fill: "#08122a", stroke: "#4ade80", strokeWidth: 3 }}
                          connectNulls
                        />
                      )
                    }

                    const fillId =
                      series.key === "chargeCapacity"
                        ? `${chartId}-charge-capacity`
                        : series.key === "dischargeCapacity"
                          ? `${chartId}-discharge-capacity`
                          : series.key === "chargeEnergy"
                            ? `${chartId}-charge-energy`
                            : `${chartId}-discharge-energy`

                    if (useStackedBars) {
                      return stackedBarDevices.map((device, index) => (
                        <Bar
                          key={`${series.key}-${device.deviceId}`}
                          yAxisId="quantity"
                          dataKey={buildStackDataKey(series.key as BarMetricKey, device.deviceId)}
                          stackId={series.key}
                          name={displayLegendText[series.key]}
                          fill={`url(#${fillId})`}
                          radius={[0, 0, 0, 0]}
                          barSize={10}
                          fillOpacity={STACK_BAR_OPACITY[index] ?? 0.42}
                          stroke="rgba(8,18,42,0.62)"
                          strokeWidth={1}
                          legendType="none"
                        />
                      ))
                    }

                    return (
                      <Bar
                        key={series.key}
                        yAxisId="quantity"
                        dataKey={series.key}
                        name={displayLegendText[series.key]}
                        fill={`url(#${fillId})`}
                        radius={[0, 0, 0, 0]}
                        barSize={10}
                        fillOpacity={0.95}
                      />
                    )
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-[#1a2654]/80 bg-[linear-gradient(180deg,rgba(13,20,51,0.95),rgba(11,18,44,0.92))] p-2 [scrollbar-color:rgba(34,211,238,0.38)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#1f4f78] [&::-webkit-scrollbar-thumb:hover]:bg-[#2aa7b3]">
          {loading ? (
            <div className={`flex h-full items-center justify-center ${isCompactViewport ? "min-h-[200px]" : "min-h-[240px]"}`}>
              <HistoryStyleLoadingIndicator text={displayLoadingText} />
            </div>
          ) : activeData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[#7b8ab8]" style={{ fontSize: `${emptyFontSize}px` }}>{displayEmptyStateText}</div>
          ) : (
            <table className="w-full table-fixed border-separate border-spacing-y-1.5" style={{ fontSize: `${tableCellFontSize}px` }}>
              <colgroup>
                <col className={showTableBreakdown ? "w-[10%]" : "w-[12%]"} />
                <col className={showTableBreakdown ? "w-[18%]" : "w-[16%]"} />
                <col className={showTableBreakdown ? "w-[18%]" : "w-[16%]"} />
                <col className={showTableBreakdown ? "w-[12%]" : "w-[16%]"} />
                <col className={showTableBreakdown ? "w-[18%]" : "w-[16%]"} />
                <col className={showTableBreakdown ? "w-[18%]" : "w-[12%]"} />
                <col className={showTableBreakdown ? "w-[12%]" : "w-[12%]"} />
              </colgroup>
              <thead>
                <tr className="text-[#7b8ab8]">
                  {displayTableColumns.map((column, index) => (
                    <th
                      key={column.key}
                      className={`${index === 0 ? "rounded-l-lg" : ""} ${index === displayTableColumns.length - 1 ? "rounded-r-lg" : ""} bg-[#121a40] px-2 py-3 font-medium leading-tight ${column.align === "left" ? "text-left" : "text-right"}`}
                      style={{ fontSize: `${tableHeadFontSize}px` }}
                    >
                      <div className={`flex flex-col ${column.align === "left" ? "items-start" : "items-end"} gap-0.5`}>
                        <span className="whitespace-nowrap text-[#a7b8df]">{column.label}</span>
                        {column.unit ? <span className="text-[0.84em] font-semibold text-[#6f86b7]">{column.unit}</span> : <span className="text-[0.84em] text-transparent">.</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeData.map((item) => (
                  <tr key={item.label} className="group">
                    <td className="truncate rounded-l-lg border-y border-l border-[#1a2654]/70 bg-[#10183b]/78 px-2 py-3 text-[#dce7ff] transition-colors group-hover:bg-[#162252]" style={{ fontSize: `${tableCellFontSize}px` }}>
                      {item.label}
                    </td>
                    {displayTableColumns.slice(1).map((column, index) => {
                      const metricKey = column.key as SeriesKey
                      const value = getTableMetricValue(item, metricKey)
                      const breakdown = getTableMetricBreakdown(item, metricKey)

                      return (
                        <td
                          key={column.key}
                          className={`${index === displayTableColumns.length - 2 ? "rounded-r-lg border-r" : ""} border-y border-[#1a2654]/70 bg-[#10183b]/78 px-2 py-3 text-right font-mono transition-colors group-hover:bg-[#162252] ${column.tone}`}
                          style={{ fontSize: `${tableValueFontSize}px` }}
                        >
                          <div className="flex flex-col items-end gap-1">
                            <div className="font-semibold">{value}</div>
                            {breakdown.length > 0 ? (
                              <div className="w-full border-t border-white/8 pt-1.5 text-[0.82em]">
                                {breakdown.map((entry) => (
                                  <div key={`${item.label}-${column.key}-${entry.label}`} className="flex items-start justify-between gap-2 py-[1px]">
                                    <span className="min-w-0 flex-1 truncate pr-2 text-left font-medium text-[#7da0d8]">{entry.label}</span>
                                    <span className="shrink-0 text-[#dce9ff]">{entry.value}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
