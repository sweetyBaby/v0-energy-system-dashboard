"use client"

import { useEffect, useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import { Battery, Calendar, Wrench, Zap } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { AlarmLogPanel } from "@/components/dashboard/alarm-log-panel"
import { BcuSelector } from "@/components/dashboard/bcu-selector"
import { BCUStatusQuery } from "@/components/dashboard/bcu-status-query"
import { CellHeatmapOverviewPanel } from "@/components/dashboard/cell-heatmap-overview-panel"
import { CellHistoryMultiPicker, CellHistoryReplayPanel, type CellHistoryOverviewStats } from "@/components/dashboard/cell-history-replay-panel"
import { CellVoltageAnalysis } from "@/components/dashboard/cell-voltage-analysis"
import { ChargeDischargeTable } from "@/components/dashboard/charge-discharge-table"
import { CellMatrixPanel } from "@/components/dashboard/cell-matrix-panel"
import { ComprehensiveEfficiencyPanel } from "@/components/dashboard/comprehensive-efficiency-panel"
import { CustomRangePicker } from "@/components/dashboard/custom-range-picker"
import { DashboardHeader, ProjectProvider, useProject } from "@/components/dashboard/dashboard-header"
import { HistoryDatePicker } from "@/components/dashboard/history-date-picker"
import { PowerCurveQuery } from "@/components/dashboard/power-curve-query"
import { RealtimeStatusBoard } from "@/components/dashboard/realtime-status-board"
import { ReportCenterPanel } from "@/components/dashboard/report-center-panel"
import { TemperatureDifferenceAnalysis } from "@/components/dashboard/temperature-difference-analysis"
import { VoltageDifferenceAnalysis } from "@/components/dashboard/voltage-difference-analysis"
import { useDashboardViewport } from "@/hooks/use-dashboard-viewport"
import { DASHBOARD_CONTENT_SCALE, useFluidScale } from "@/hooks/use-fluid-scale"
import {
  fetchDailyTrendRange,
  formatAnalysisRangeDate,
  getAnalysisRangeDates,
  type DailyTrendRangeResult,
} from "@/lib/api/daily-trend-range"
import { DEFAULT_PROJECT_IMAGE } from "@/lib/api/project"

type DashboardTab =
  | "realtime"
  | "bms"
  | "cell-history"
  | "analysis"
  | "history"
  | "alarm-monitoring"
  | "reports"

type BcuMode = "realtime" | "history"
type AnalysisPresetRange = 7 | 15 | 30
type AnalysisRange = AnalysisPresetRange | "custom"
type CellHistoryViewMode = "overview" | "detail"

const DAY_MS = 24 * 60 * 60 * 1000

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const toDayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return toDayStart(next)
}

const getRangeLength = (range: DateRange | undefined) => {
  if (!range?.from || !range.to) return null
  return Math.round((toDayStart(range.to).getTime() - toDayStart(range.from).getTime()) / DAY_MS) + 1
}

const ANALYSIS_RANGES: { key: AnalysisRange; zh: string; en: string }[] = [
  { key: 7, zh: "近7天", en: "Last 7d" },
  { key: 15, zh: "近15天", en: "Last 15d" },
  { key: 30, zh: "近30天", en: "Last 30d" },
  { key: "custom", zh: "自定义", en: "Custom" },
]

const TAB_META: Record<DashboardTab, { zh: string; en: string }> = {
  realtime: { zh: "总览", en: "Overview" },
  history: { zh: "运行状态", en: "Operations" },
  "alarm-monitoring": { zh: "告警监测", en: "Alarm" },
  bms: { zh: "电芯矩阵", en: "Cell Matrix" },
  "cell-history": { zh: "电芯历史", en: "Cell History" },
  analysis: { zh: "数据分析", en: "Analysis" },
  reports: { zh: "报表中心", en: "Reports" },
}

function OverviewDataLoader() {
  const {
    selectedProject,
    loadCurrentProjectDetail,
    loadCurrentProjectRealtime,
    clearCurrentProjectOverviewData,
  } = useProject()

  useEffect(() => {
    let cancelled = false

    const loadOverview = async () => {
      try {
        await loadCurrentProjectDetail()
        await loadCurrentProjectRealtime()
      } catch (error) {
        if (!cancelled) {
          console.error(`Failed to initialize overview data for ${selectedProject.projectId}`, error)
        }
      }
    }

    void loadOverview()

    const timer = window.setInterval(() => {
      void loadCurrentProjectRealtime()
    }, 10000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      clearCurrentProjectOverviewData()
    }
  }, [
    clearCurrentProjectOverviewData,
    loadCurrentProjectDetail,
    loadCurrentProjectRealtime,
    selectedProject.id,
    selectedProject.projectId,
  ])

  return null
}

function DashboardTabs({ activeTab }: { activeTab: DashboardTab }) {
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
  const lerp = (min: number, max: number, progress: number) => min + (max - min) * progress
  const [analysisRange, setAnalysisRange] = useState<AnalysisRange>(15)
  const [bcuMode, setBcuMode] = useState<BcuMode>("history")
  const yesterday = formatDateInputValue(addDays(new Date(), -1))
  const [historyDate, setHistoryDate] = useState(yesterday)
  const [cellHistoryDate, setCellHistoryDate] = useState(yesterday)
  const [cellHistoryViewMode, setCellHistoryViewMode] = useState<CellHistoryViewMode>("overview")
  const [selectedHistoryCell, setSelectedHistoryCell] = useState<number | null>(null)
  const [selectedHistoryCells, setSelectedHistoryCells] = useState<number[]>([])
  const [cellHistoryStats, setCellHistoryStats] = useState<CellHistoryOverviewStats | null>(null)
  const [analysisTrendData, setAnalysisTrendData] = useState<DailyTrendRangeResult | null>(null)
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const { language } = useLanguage()
  const { selectedProject } = useProject()
  const { width: viewportWidth, height: viewportHeight, devicePixelRatio, isCompactViewport } = useDashboardViewport()
  const overviewScale = useFluidScale<HTMLDivElement>(isCompactViewport ? 760 : 1180, isCompactViewport ? 1440 : 1920, {
    axis: isCompactViewport ? "min" : "width",
    minRootPx: isCompactViewport ? 13 : 14,
    maxRootPx: 18.5,
  })
  const contentScale = useFluidScale<HTMLDivElement>(isCompactViewport ? 760 : 1180, isCompactViewport ? 1440 : 2560, {
    ...DASHBOARD_CONTENT_SCALE,
    axis: isCompactViewport ? "min" : "width",
    minRootPx: isCompactViewport ? 13.5 : DASHBOARD_CONTENT_SCALE.minRootPx,
    maxRootPx: isCompactViewport ? DASHBOARD_CONTENT_SCALE.maxRootPx : 27,
  })
  const zh = language === "zh"
  const lowDensityBoost = clamp((1.45 - devicePixelRatio) / 0.55, 0, 1)
  const baseControlProgress = isCompactViewport
    ? clamp(Math.max((viewportWidth - 760) / 680, (viewportHeight - 620) / 240), 0, 1)
    : clamp(Math.max((viewportWidth - 1280) / 720, (viewportHeight - 800) / 280), 0, 1)
  const standardLargeScreenProgress = isCompactViewport
    ? 0
    : clamp(
        Math.max((viewportWidth - 1880) / 780, (viewportHeight - 1040) / 280) * (0.42 + lowDensityBoost * 0.24),
        0,
        1,
      )
  const ultraLargeScreenProgress = isCompactViewport
    ? 0
    : clamp(
        Math.max((viewportWidth - 3000) / 900, (viewportHeight - 1620) / 260) * (0.3 + lowDensityBoost * 0.15),
        0,
        1,
      )
  const resolveControlMetric = (
    compactMin: number,
    compactMax: number,
    baseMin: number,
    baseMax: number,
    standardMin: number,
    standardMax: number,
    ultraMin: number,
    ultraMax: number,
  ) => {
    if (isCompactViewport) {
      return Number(lerp(compactMin, compactMax, baseControlProgress).toFixed(2))
    }

    const baseValue = lerp(baseMin, baseMax, baseControlProgress)
    const standardValue = lerp(standardMin, standardMax, standardLargeScreenProgress)
    const ultraValue = lerp(ultraMin, ultraMax, ultraLargeScreenProgress)
    return Number(Math.max(baseValue, standardValue, ultraValue).toFixed(2))
  }
  const pageControlLabelSize = resolveControlMetric(11, 13.2, 11.2, 14.1, 12.1, 14.8, 12.8, 15.4)
  const pageControlButtonSize = resolveControlMetric(10.5, 13.6, 11, 13.6, 12.1, 14.6, 12.8, 15.2)
  const pageControlGroupHeight = resolveControlMetric(30, 38, 32, 40, 36, 43, 39, 46)
  const pageControlInputHeight = resolveControlMetric(34, 38, 34, 39, 36, 42, 38, 44)
  const pageControlPillPadding = resolveControlMetric(11, 13, 11.2, 13.4, 12, 14.6, 12.8, 15.4)
  const pageControlDateMinWidth = resolveControlMetric(126, 142, 132, 154, 160, 186, 172, 198)
  const pageControlDeviceMinWidth = resolveControlMetric(112, 128, 118, 138, 132, 156, 142, 168)
  const pageControlCellMinWidth = resolveControlMetric(200, 220, 206, 232, 220, 248, 232, 264)
  const pageBcuOptions = useMemo(
    () =>
      selectedProject.devices.map((device, index) => ({
        value: device.deviceId || `device-${index + 1}`,
        label: device.deviceName || `BCU ${index + 1}`,
      })),
    [selectedProject.devices]
  )
  const firstPageBcuId = pageBcuOptions[0]?.value ?? ""
  const [runningStatusDeviceId, setRunningStatusDeviceId] = useState(firstPageBcuId)
  const [alarmDeviceId, setAlarmDeviceId] = useState(firstPageBcuId)
  const [cellHistoryDeviceId, setCellHistoryDeviceId] = useState(firstPageBcuId)
  const [analysisDeviceId, setAnalysisDeviceId] = useState(firstPageBcuId)
  const analysisCurrentDay = useMemo(() => toDayStart(new Date()), [])
  const analysisMaxDate = useMemo(() => addDays(analysisCurrentDay, -1), [analysisCurrentDay])
  const defaultAnalysisCustomRange = useMemo<DateRange>(
    () => ({
      from: addDays(analysisMaxDate, -30),
      to: analysisMaxDate,
    }),
    [analysisMaxDate]
  )
  const [analysisCustomRange, setAnalysisCustomRange] = useState<DateRange | undefined>(defaultAnalysisCustomRange)
  const analysisDateRange = useMemo(() => {
    if (analysisRange === "custom") {
      if (!analysisCustomRange?.from || !analysisCustomRange.to) {
        return null
      }

      return {
        startDate: formatAnalysisRangeDate(analysisCustomRange.from),
        endDate: formatAnalysisRangeDate(analysisCustomRange.to),
      }
    }

    return getAnalysisRangeDates(analysisRange, analysisMaxDate)
  }, [analysisCustomRange, analysisMaxDate, analysisRange])
  const analysisRangeDays = useMemo(
    () => (analysisRange === "custom" ? getRangeLength(analysisCustomRange) ?? 0 : analysisRange),
    [analysisCustomRange, analysisRange]
  )
  const displayAllBcuLabel = zh ? "全部BCU" : "All BCUs"
  const projectBackgroundImage = useMemo(() => {
    const candidate = selectedProject.image?.trim()
    return candidate && candidate !== DEFAULT_PROJECT_IMAGE ? candidate : null
  }, [selectedProject.image])
  const [resolvedProjectBackgroundImage, setResolvedProjectBackgroundImage] = useState<string | null>(null)

  useEffect(() => {
    const validDeviceIds = new Set(pageBcuOptions.map((option) => option.value))
    const resolveDeviceId = (currentValue: string) =>
      currentValue && validDeviceIds.has(currentValue) ? currentValue : firstPageBcuId

    setRunningStatusDeviceId((currentValue) => resolveDeviceId(currentValue))
    setAlarmDeviceId((currentValue) => resolveDeviceId(currentValue))
    setCellHistoryDeviceId((currentValue) => resolveDeviceId(currentValue))
    setAnalysisDeviceId((currentValue) => resolveDeviceId(currentValue))
  }, [firstPageBcuId, pageBcuOptions])

  useEffect(() => {
    if (!projectBackgroundImage) {
      setResolvedProjectBackgroundImage(null)
      return
    }

    let cancelled = false
    setResolvedProjectBackgroundImage(null)

    const image = new window.Image()
    image.src = projectBackgroundImage
    image.onload = () => {
      if (!cancelled) {
        setResolvedProjectBackgroundImage(projectBackgroundImage)
      }
    }
    image.onerror = () => {
      if (!cancelled) {
        setResolvedProjectBackgroundImage(null)
      }
    }

    return () => {
      cancelled = true
    }
  }, [projectBackgroundImage])

  const formatAnalysisRangeLabel = (range: DateRange | undefined) => {
    if (!range?.from) {
      return zh ? "选择日期范围" : "Select range"
    }

    const formatDate = (date: Date) => `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
    if (!range.to) {
      return formatDate(range.from)
    }

    return `${formatDate(range.from)} - ${formatDate(range.to)}`
  }

  const getDefaultDetailCells = () => {
    const prioritizedCells = [
      cellHistoryStats?.maxVoltageCell,
      cellHistoryStats?.minVoltageCell,
      cellHistoryStats?.maxTempCell,
    ].filter((cell): cell is number => cell != null)

    const uniqueCells = prioritizedCells.filter((cell, index) => prioritizedCells.indexOf(cell) === index)

    if (uniqueCells.length > 0) return uniqueCells.slice(0, 3)
    if (selectedHistoryCell != null) return [selectedHistoryCell]
    return [1]
  }

  useEffect(() => {
    if (activeTab !== "analysis") {
      return
    }

    if (!analysisDateRange) {
      setIsAnalysisLoading(false)
      setAnalysisTrendData(null)
      setAnalysisError(zh ? "请选择完整的日期范围" : "Please select complete date range")
      return
    }

    let cancelled = false
    const abortController = new AbortController()

    const loadAnalysisTrend = async () => {
      setIsAnalysisLoading(true)
      setAnalysisError(null)
      setAnalysisTrendData(null)

      try {
        const nextData = await fetchDailyTrendRange(
          selectedProject.projectId,
          analysisDateRange.startDate,
          analysisDateRange.endDate,
          {
            deviceId: analysisDeviceId || undefined,
            signal: abortController.signal,
          }
        )

        if (cancelled) {
          return
        }

        setAnalysisTrendData(nextData)
      } catch (error) {
        if (cancelled || abortController.signal.aborted) {
          return
        }

        console.error(
          `Failed to load analysis trend for ${selectedProject.projectId} from ${analysisDateRange.startDate} to ${analysisDateRange.endDate}`,
          error
        )
        setAnalysisError(zh ? "数据加载失败，请稍后重试" : "Failed to load analysis data")
        setAnalysisTrendData(null)
      } finally {
        if (!cancelled) {
          setIsAnalysisLoading(false)
        }
      }
    }

    void loadAnalysisTrend()

    return () => {
      cancelled = true
      abortController.abort()
    }
  }, [activeTab, analysisDateRange, analysisDeviceId, selectedProject.projectId, zh])

  const renderPageBcuSelector = (value: string, onChange: (value: string) => void) => (
    <BcuSelector
      value={value}
      onChange={onChange}
      options={pageBcuOptions}
      allLabel={displayAllBcuLabel}
      includeAllOption={false}
      hideWhenSingleOption
      label="BCU"
      compact
      fontSize={pageControlButtonSize}
      height={pageControlInputHeight}
      minWidth={pageControlDeviceMinWidth}
      className="shrink-0"
    />
  )

  const projectStats = [
    {
      icon: <Zap className="h-6 w-6 text-[#25efff]" fill="currentColor" />,
      iconBg: "bg-[#25efff]/12 border border-[#25efff]/45",
      labelZh: "额定功率",
      labelEn: "Rated Power",
      value: selectedProject.ratedPower,
      valueSize: "regular" as const,
    },
    {
      icon: <Battery className="h-6 w-6 text-[#25efff]" />,
      iconBg: "bg-[#25efff]/12 border border-[#25efff]/45",
      labelZh: "额定容量",
      labelEn: "Rated Capacity",
      value: selectedProject.ratedCapacity,
      valueSize: "dense" as const,
    },
    {
      icon: <Calendar className="h-6 w-6 text-[#25efff]" />,
      iconBg: "bg-[#25efff]/12 border border-[#25efff]/45",
      labelZh: "投运日期",
      labelEn: "Commission",
      value: selectedProject.commissioningDate,
      valueSize: "dense" as const,
    },
  ]

  const renderRunningStatusPage = () => (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4 overflow-hidden">
        <div className="col-span-12 min-h-0 lg:col-span-6">
          <BCUStatusQuery
            mode="realtime"
            deviceId={runningStatusDeviceId || undefined}
            headerExtra={
              pageBcuOptions.length > 1
                ? renderPageBcuSelector(runningStatusDeviceId, setRunningStatusDeviceId)
                : undefined
            }
          />
        </div>
        <div className="col-span-12 min-h-0 lg:col-span-6">
          <CellHeatmapOverviewPanel deviceId={runningStatusDeviceId || undefined} />
        </div>
      </div>
    </div>
  )

  const pageToggleGroupClass =
    "flex shrink-0 items-center gap-1 overflow-hidden rounded-[12px] border border-[#27496f] bg-[linear-gradient(180deg,rgba(17,27,60,0.96),rgba(10,18,45,0.98))] p-[2px] shadow-[0_0_0_1px_rgba(115,198,255,0.05)_inset,0_10px_22px_rgba(0,0,0,0.22)]"

  const getPageToggleButtonClass = (active: boolean, edge: "start" | "middle" | "end" | "solo") =>
    `relative flex items-center justify-center gap-1.5 rounded-[8px] font-semibold tracking-[0.01em] transition-all ${
      active
        ? `z-[1] bg-[linear-gradient(180deg,rgba(28,219,190,0.96),rgba(10,193,165,0.9))] text-[#04241c] shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset,0_0_12px_rgba(34,211,238,0.12)] ${
            edge === "start"
              ? "rounded-l-[10px]"
              : edge === "end"
                ? "rounded-r-[10px]"
                : edge === "solo"
                  ? "rounded-[10px]"
                  : ""
          }`
        : "bg-transparent text-[#85a9cb] hover:bg-transparent hover:text-[#e6f4ff]"
    }`
  const getPageToggleButtonStyle = (active: boolean, edge: "start" | "middle" | "end" | "solo") => ({
    height: active ? pageControlGroupHeight : pageControlGroupHeight - 4,
    paddingInline: pageControlPillPadding,
    fontSize: pageControlButtonSize,
    marginTop: active ? -2 : 0,
    marginBottom: active ? -2 : 0,
    marginLeft: active && (edge === "start" || edge === "solo") ? -2 : 0,
    marginRight: active && (edge === "end" || edge === "solo") ? -2 : 0,
  })

  const renderAlarmMonitoringPage = () => {
    return (
      <div className="no-scrollbar flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
      <div
        className="relative flex min-w-0 shrink-0 items-center gap-3 overflow-hidden border border-[#22d3ee]/20 bg-[#020810] px-3 py-2"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/50 to-transparent" />
          <div className="flex items-center gap-3">
            <div
              className={pageToggleGroupClass}
              style={{ height: pageControlGroupHeight }}
          >
            {(["realtime", "history"] as BcuMode[]).map((mode) => {
              const active = bcuMode === mode
              const edge = mode === "realtime" ? "start" : "end"
              return (
                <button
                  key={mode}
                  onClick={() => setBcuMode(mode)}
                  className={getPageToggleButtonClass(active, edge)}
                  style={getPageToggleButtonStyle(active, edge)}
                >
                  {active && mode === "realtime" && (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#04241c]" />
                  )}
                  {mode === "realtime" ? (zh ? "实时监测" : "Live") : (zh ? "历史查询" : "History")}
                </button>
              )
            })}
          </div>
          {bcuMode === "history" && (
            <HistoryDatePicker
              value={historyDate}
              onChange={setHistoryDate}
              max={yesterday}
              fontSize={pageControlButtonSize}
              height={pageControlInputHeight}
              minWidth={pageControlDateMinWidth}
            />
          )}
          {renderPageBcuSelector(alarmDeviceId, setAlarmDeviceId)}
        </div>
      </div>
      <div className="no-scrollbar grid min-h-0 flex-1 min-w-0 grid-cols-12 gap-4 overflow-hidden">
        <div className="col-span-12 min-h-0 min-w-0 lg:col-span-6">
          <BCUStatusQuery
            mode={bcuMode}
            date={bcuMode === "history" ? historyDate : undefined}
            deviceId={alarmDeviceId || undefined}
          />
        </div>
        <div className="col-span-12 min-h-0 min-w-0 lg:col-span-6">
          <AlarmLogPanel
            mode={bcuMode}
            date={bcuMode === "history" ? historyDate : undefined}
            deviceId={alarmDeviceId || undefined}
          />
        </div>
      </div>
      </div>
    )
  }

  const renderComingSoonBanner = () => {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-3">
        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#f59e0b]/35 bg-[linear-gradient(180deg,rgba(36,24,10,0.7),rgba(18,14,8,0.6))] px-3 py-1.5 text-[#ffd089] shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_10px_24px_rgba(0,0,0,0.2)] backdrop-blur-[4px]">
          <Wrench className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold tracking-[0.04em]" style={{ fontSize: pageControlLabelSize }}>
            {zh ? "功能开发中，敬请期待" : "Full version coming soon"}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={activeTab === "realtime" ? undefined : contentScale.ref}
        className={
          activeTab === "realtime"
            ? `min-h-0 flex-1 overflow-hidden pt-0 ${isCompactViewport ? "px-2 pb-2" : "px-3 pb-3"}`
            : `min-h-0 flex-1 overflow-hidden ${isCompactViewport ? "p-2" : "p-3"}`
        }
        style={activeTab === "realtime" ? undefined : contentScale.rootStyle}
      >
        {activeTab === "realtime" && (
          <div
            ref={overviewScale.ref}
            className={`grid h-full grid-cols-12 ${
              isCompactViewport
                ? "grid-rows-[minmax(208px,0.82fr)_minmax(0,1fr)] gap-2.5"
                : "grid-rows-[minmax(240px,1fr)_minmax(0,1fr)] gap-3"
            }`}
            style={overviewScale.rootStyle}
          >
            <OverviewDataLoader />
            <div className="relative col-span-12 min-h-0 overflow-hidden rounded-b-xl border border-[#22d3ee]/30 border-t-0">
              <img
                src={DEFAULT_PROJECT_IMAGE}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[1] brightness-[1.35] saturate-[1.12]"
              />
              {resolvedProjectBackgroundImage ? (
                <img
                  key={resolvedProjectBackgroundImage}
                  src={resolvedProjectBackgroundImage}
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[1] brightness-[1.35] saturate-[1.12]"
                  onError={() => setResolvedProjectBackgroundImage(null)}
                />
              ) : null}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,20,40,0.02)_0%,rgba(8,20,40,0.00)_32%,rgba(5,12,28,0.12)_72%,rgba(3,8,20,0.24)_100%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00d4aa]/50 to-transparent" />

              <div className={`relative grid h-full grid-cols-12 items-stretch ${isCompactViewport ? "gap-2.5 px-2.5 pb-2.5 pt-4" : "gap-3 px-3 pb-3 pt-6"}`}>
                <div className="col-span-3 min-h-0 h-full">
                  <RealtimeStatusBoard />
                </div>

                <div className="col-span-6 flex min-h-0 items-end justify-center">
                  <div className={`w-full ${isCompactViewport ? "max-w-[620px] px-3 pb-0.5 pt-2" : "max-w-[660px] px-5 pb-1 pt-3"}`}>
                    <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)_minmax(0,1.05fr)]">
                      {projectStats.map((stat, index) => (
                        <div key={index} className={`relative flex min-w-0 flex-col items-center justify-end px-3 py-1 ${isCompactViewport ? "min-h-[100px] gap-1.5" : "min-h-[122px] gap-2"}`}>
                          {index < projectStats.length - 1 && (
                            <div className="pointer-events-none absolute inset-y-3 right-0 w-px bg-gradient-to-b from-transparent via-[#b8d8f0]/35 to-transparent" />
                          )}
                          <div className={`flex h-11 w-11 items-center justify-center rounded-full ${stat.iconBg}`}>
                            {stat.icon}
                          </div>
                          <span
                            className="font-semibold tracking-[0.08em] text-[#d9f6ff]"
                            style={{
                              fontSize: "clamp(0.8rem, calc(var(--overview-root-size, 15px) * 0.82), 1.08rem)",
                              textShadow: "0 1px 8px rgba(0,0,0,0.95), 0 0 10px rgba(34,211,238,0.28)",
                            }}
                          >
                            {zh ? stat.labelZh : stat.labelEn}
                          </span>
                          <span
                            className={`max-w-full whitespace-nowrap text-center font-bold leading-none tabular-nums text-[#e8f8ff] ${
                              stat.valueSize === "dense" ? "tracking-[0.015em]" : "tracking-[0.04em]"
                            }`}
                            style={{
                              fontSize:
                                stat.valueSize === "dense"
                                  ? "clamp(0.98rem, calc(var(--overview-root-size, 15px) * 1.04), 1.42rem)"
                                  : "clamp(1.1rem, calc(var(--overview-root-size, 15px) * 1.22), 1.75rem)",
                              textShadow: "0 1px 8px rgba(0,0,0,0.95), 0 0 14px rgba(34,211,238,0.45)",
                            }}
                          >
                            {stat.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="col-span-3 min-h-0 h-full w-full" style={{ containerType: "inline-size" }}>
                  <ChargeDischargeTable />
                </div>
              </div>
            </div>

            <div className="col-span-12 min-h-0 lg:col-span-6">
              <ComprehensiveEfficiencyPanel />
            </div>
            <div className="col-span-12 min-h-0 lg:col-span-6">
              <PowerCurveQuery />
            </div>
          </div>
        )}

        {activeTab === "bms" && (
          <div className="h-full min-h-0 overflow-hidden">
            <CellMatrixPanel />
          </div>
        )}

        {activeTab === "cell-history" && (
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <div className="flex shrink-0 items-center gap-1.5 overflow-visible px-1 py-0.5">
              <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                <div
                  className={pageToggleGroupClass}
                  style={{ height: pageControlGroupHeight }}
                >
                  {([
                    {
                      key: "overview",
                      labelZh: "历史总览",
                      labelEn: "History Overview",
                    },
                    {
                      key: "detail",
                      labelZh: "历史明细",
                      labelEn: "History Detail",
                    },
                  ] as { key: CellHistoryViewMode; labelZh: string; labelEn: string }[]).map((item) => {
                    const active = cellHistoryViewMode === item.key
                    const edge = item.key === "overview" ? "start" : "end"

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setCellHistoryViewMode(item.key)
                          if (item.key === "detail") {
                            setSelectedHistoryCells(getDefaultDetailCells())
                          }
                        }}
                        aria-label={zh ? item.labelZh : item.labelEn}
                        title={zh ? item.labelZh : item.labelEn}
                        className={getPageToggleButtonClass(active, edge)}
                        style={getPageToggleButtonStyle(active, edge)}
                      >
                        <span>{zh ? item.labelZh : item.labelEn}</span>
                      </button>
                    )
                  })}
                </div>
                <HistoryDatePicker
                  value={cellHistoryDate}
                  onChange={setCellHistoryDate}
                  max={yesterday}
                  compact
                  fontSize={pageControlButtonSize}
                  height={pageControlInputHeight}
                  minWidth={pageControlDateMinWidth}
                />
                {renderPageBcuSelector(cellHistoryDeviceId, setCellHistoryDeviceId)}
                {cellHistoryViewMode === "detail" && (
                  <CellHistoryMultiPicker
                    value={selectedHistoryCells}
                    onChange={setSelectedHistoryCells}
                    onClear={() => setSelectedHistoryCells([])}
                    compact
                    fontSize={pageControlButtonSize}
                    height={pageControlInputHeight}
                    minWidth={pageControlCellMinWidth}
                  />
                )}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <CellHistoryReplayPanel
                date={cellHistoryDate}
                deviceId={cellHistoryDeviceId || undefined}
                selectedCell={selectedHistoryCell}
                detailCells={selectedHistoryCells}
                viewMode={cellHistoryViewMode}
                onSelectedCellChange={setSelectedHistoryCell}
                onOverviewStats={setCellHistoryStats}
              />
            </div>
          </div>
        )}

        {activeTab === "analysis" && (
          <div className={`flex h-full min-h-0 flex-col overflow-hidden ${isCompactViewport ? "gap-2" : "gap-3"}`}>
            <div className={`flex shrink-0 flex-wrap items-center overflow-visible ${isCompactViewport ? "gap-2" : "gap-3"}`}>
              <div className={pageToggleGroupClass} style={{ height: pageControlGroupHeight }}>
                {ANALYSIS_RANGES.map((range, index) => {
                  const edge =
                    ANALYSIS_RANGES.length === 1
                      ? "solo"
                      : index === 0
                        ? "start"
                        : index === ANALYSIS_RANGES.length - 1
                          ? "end"
                          : "middle"

                  return (
                    <button
                      key={range.key}
                      onClick={() => setAnalysisRange(range.key)}
                      className={getPageToggleButtonClass(analysisRange === range.key, edge)}
                      style={getPageToggleButtonStyle(analysisRange === range.key, edge)}
                    >
                      {zh ? range.zh : range.en}
                    </button>
                  )
                })}
              </div>
              {analysisRange === "custom" && (
                <div className="min-w-0 flex-1 sm:flex-none">
                  <CustomRangePicker
                    value={analysisCustomRange}
                    onChange={setAnalysisCustomRange}
                    maxDate={analysisMaxDate}
                    maxDays={31}
                    buttonLabel={formatAnalysisRangeLabel(analysisCustomRange)}
                    hint={zh ? "最多选择 31 天，结束日期不能超过昨天" : "Select up to 31 days, ending no later than yesterday"}
                    maxRangeError={
                      zh
                        ? "自定义日期范围最多 31 天，且结束日期不能超过昨天"
                        : "Custom date range cannot exceed 31 days or go beyond yesterday"
                    }
                    quickSelectLabel={zh ? "昨天" : "Yesterday"}
                    compact={isCompactViewport}
                    fontSize={pageControlButtonSize}
                    height={pageControlInputHeight}
                    minWidth={pageControlDateMinWidth + 14}
                  />
                </div>
              )}
              {renderPageBcuSelector(analysisDeviceId, setAnalysisDeviceId)}
            </div>
            <div className={`grid min-h-0 flex-1 grid-cols-12 ${isCompactViewport ? "gap-3" : "gap-4"}`}>
              <div className={isCompactViewport ? "col-span-4 min-h-0" : "col-span-12 min-h-0 xl:col-span-6 2xl:col-span-4"}>
                <VoltageDifferenceAnalysis
                  range={analysisRangeDays}
                  summary={analysisTrendData?.summary ?? null}
                  trendData={analysisTrendData?.dailyTrend ?? []}
                  loading={isAnalysisLoading}
                  error={analysisError}
                />
              </div>
              <div className={isCompactViewport ? "col-span-4 min-h-0" : "col-span-12 min-h-0 xl:col-span-6 2xl:col-span-4"}>
                <TemperatureDifferenceAnalysis
                  range={analysisRangeDays}
                  summary={analysisTrendData?.summary ?? null}
                  trendData={analysisTrendData?.dailyTrend ?? []}
                  loading={isAnalysisLoading}
                  error={analysisError}
                />
              </div>
              <div className={isCompactViewport ? "col-span-4 min-h-0" : "col-span-12 min-h-0 xl:col-span-6 2xl:col-span-4"}>
                <CellVoltageAnalysis
                  range={analysisRangeDays}
                  summary={analysisTrendData?.summary ?? null}
                  trendData={analysisTrendData?.dailyTrend ?? []}
                  loading={isAnalysisLoading}
                  error={analysisError}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && renderRunningStatusPage()}

        {activeTab === "alarm-monitoring" && (
          <div className="relative h-full min-h-0 overflow-hidden">
            {renderAlarmMonitoringPage()}
            {bcuMode === "realtime" && renderComingSoonBanner()}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="relative h-full min-h-0 overflow-hidden">
            <ReportCenterPanel />
            {renderComingSoonBanner()}
          </div>
        )}
      </div>
    </div>
  )
}

function DashboardMain({ activeTab }: { activeTab: DashboardTab }) {
  const { projectOptions, isProjectOptionsLoading, projectOptionsError } = useProject()
  const { language } = useLanguage()
  const zh = language === "zh"

  if (projectOptions.length === 0) {
    const title = isProjectOptionsLoading
      ? zh
        ? "项目列表加载中"
        : "Loading projects"
      : projectOptionsError
        ? zh
          ? "项目列表加载失败"
          : "Failed to load projects"
        : zh
          ? "暂无项目数据"
          : "No projects available"
    const description = isProjectOptionsLoading
      ? zh
        ? "正在请求 /ems/project/listByDevice"
        : "Requesting /ems/project/listByDevice"
      : projectOptionsError
        ? zh
          ? "请检查 /ems/project/listByDevice 接口和 API_BASE_URL 配置"
          : "Check /ems/project/listByDevice and API_BASE_URL"
        : zh
          ? "/ems/project/listByDevice 未返回可用项目"
          : "/ems/project/listByDevice returned no usable projects"

    return (
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 items-center justify-center px-6">
          <div className="max-w-md border border-[#1f5872] bg-[linear-gradient(180deg,rgba(8,23,41,0.98),rgba(6,17,31,0.99))] px-6 py-5 text-center shadow-[0_0_0_1px_rgba(34,211,238,0.05)_inset,0_8px_18px_rgba(0,0,0,0.18)]">
            <div className="text-base font-semibold tracking-[0.08em] text-[#d9f6ff]">{title}</div>
            <div className="mt-2 text-sm text-[#7ea4bb]">{description}</div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <DashboardTabs activeTab={activeTab} />
    </main>
  )
}

export default function EnergyStorageDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("realtime")
  const { isCompactViewport } = useDashboardViewport()
  const tabs = (Object.keys(TAB_META) as DashboardTab[])
    .filter((key) => key !== "bms")
    .map((key) => ({
      key,
      label: TAB_META[key],
    }))

  return (
    <ProjectProvider>
      <div className="relative flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#060b16] text-[#e8f4fc]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_24%),radial-gradient(circle_at_24%_32%,rgba(59,130,246,0.08),transparent_26%),radial-gradient(circle_at_80%_18%,rgba(34,211,238,0.06),transparent_22%)]" />
        <div className="relative z-10 flex h-full flex-col overflow-hidden">
          <DashboardHeader
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as DashboardTab)}
            tabs={tabs}
            compact={isCompactViewport}
          />
          <DashboardMain activeTab={activeTab} />
        </div>
      </div>
    </ProjectProvider>
  )
}
