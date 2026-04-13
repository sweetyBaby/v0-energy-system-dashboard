"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { DateRange } from "react-day-picker"
import { Battery, Calendar, Zap } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { AlarmLogPanel } from "@/components/dashboard/alarm-log-panel"
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
import { LanguageProvider } from "@/components/language-provider"
import { DASHBOARD_CONTENT_SCALE, useFluidScale } from "@/hooks/use-fluid-scale"
import {
  fetchDailyTrendRange,
  formatAnalysisRangeDate,
  getAnalysisRangeDates,
  type DailyTrendRangeResult,
} from "@/lib/api/daily-trend-range"

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
  reports: { zh: "报表信息", en: "Reports" },
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
  const [analysisRange, setAnalysisRange] = useState<AnalysisRange>(15)
  const [bcuMode, setBcuMode] = useState<BcuMode>("realtime")
  const yesterday = formatDateInputValue(addDays(new Date(), -1))
  const [historyDate, setHistoryDate] = useState(yesterday)
  const [cellHistoryDate, setCellHistoryDate] = useState(yesterday)
  const [cellHistoryViewMode, setCellHistoryViewMode] = useState<CellHistoryViewMode>("overview")
  const [selectedHistoryCell, setSelectedHistoryCell] = useState<number | null>(null)
  const [selectedHistoryCells, setSelectedHistoryCells] = useState<number[]>([1])
  const [cellHistoryStats, setCellHistoryStats] = useState<CellHistoryOverviewStats | null>(null)
  const [analysisTrendData, setAnalysisTrendData] = useState<DailyTrendRangeResult | null>(null)
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const { language } = useLanguage()
  const { selectedProject } = useProject()
  const overviewScale = useFluidScale<HTMLDivElement>(1180, 1920, { minRootPx: 14, maxRootPx: 18.5 })
  const contentScale = useFluidScale<HTMLDivElement>(1180, 1920, DASHBOARD_CONTENT_SCALE)
  const zh = language === "zh"
  const pageControlLabelSize = contentScale.fluid(11, 14)
  const pageControlButtonSize = contentScale.fluid(12, 15)
  const pageIconButtonSize = contentScale.fluid(12, 15)
  const pageIconButtonEdge = contentScale.fluid(28, 34)
  const pageControlGroupHeight = contentScale.fluid(32, 40)
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
          { signal: abortController.signal }
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
        setAnalysisError(zh ? "数据分析接口加载失败" : "Failed to load analysis trend")
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
  }, [activeTab, analysisDateRange, selectedProject.projectId, zh])

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
    <div className="grid h-full min-h-0 grid-cols-12 gap-4 overflow-hidden">
      <div className="col-span-12 min-h-0 xl:col-span-6">
        <BCUStatusQuery mode="realtime" />
      </div>
      <div className="col-span-12 min-h-0 xl:col-span-6">
        <CellHeatmapOverviewPanel />
      </div>
    </div>
  )

  const renderAlarmMonitoringPage = () => (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div
        className="relative flex shrink-0 items-center gap-3 overflow-hidden border border-[#22d3ee]/20 bg-[#020810] px-3 py-2"
        style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 100%, 0 100%)" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/50 to-transparent" />
        <div className="flex gap-1">
          {(["realtime", "history"] as BcuMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setBcuMode(mode)}
              className={`flex items-center gap-1.5 rounded px-3 py-1 font-medium tracking-[0.03em] transition-all ${
                bcuMode === mode
                  ? "border border-[#00d4aa]/55 bg-[linear-gradient(180deg,rgba(0,212,170,0.90),rgba(0,195,160,0.82))] font-semibold text-[#021a12] shadow-[0_0_12px_rgba(0,212,170,0.25)]"
                  : "text-[#5a8aaa] hover:text-[#c0dff5]"
              }`}
              style={{ fontSize: pageControlButtonSize }}
            >
              {bcuMode === mode && mode === "realtime" && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#021a12]" />
              )}
              {mode === "realtime" ? (zh ? "实时监控" : "Live") : (zh ? "历史查询" : "History")}
            </button>
          ))}
        </div>
        {bcuMode === "history" && (
          <HistoryDatePicker value={historyDate} onChange={setHistoryDate} max={yesterday} />
        )}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
        <div className="col-span-12 min-h-0 xl:col-span-6">
          <BCUStatusQuery mode={bcuMode} date={bcuMode === "history" ? historyDate : undefined} />
        </div>
        <div className="col-span-12 min-h-0 xl:col-span-6">
          <AlarmLogPanel mode={bcuMode} date={bcuMode === "history" ? historyDate : undefined} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={activeTab === "realtime" ? undefined : contentScale.ref}
        className={activeTab === "realtime" ? "min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-0" : "min-h-0 flex-1 overflow-hidden p-3"}
        style={activeTab === "realtime" ? undefined : contentScale.rootStyle}
      >
        {activeTab === "realtime" && (
          <div
            ref={overviewScale.ref}
            className="grid h-full grid-cols-12 grid-rows-[minmax(240px,1fr)_minmax(0,1fr)] gap-3"
            style={overviewScale.rootStyle}
          >
            <OverviewDataLoader />
            <div className="relative col-span-12 min-h-0 overflow-hidden rounded-b-xl border border-[#22d3ee]/30 border-t-0">
              <img
                src={selectedProject.image}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[1] brightness-[1.35] saturate-[1.12]"
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,20,40,0.02)_0%,rgba(8,20,40,0.00)_32%,rgba(5,12,28,0.12)_72%,rgba(3,8,20,0.24)_100%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00d4aa]/50 to-transparent" />

              <div className="relative grid h-full grid-cols-12 items-stretch gap-3 px-3 pb-3 pt-6">
                <div className="col-span-3 min-h-0 h-full">
                  <RealtimeStatusBoard />
                </div>

                <div className="col-span-6 flex min-h-0 items-end justify-center">
                  <div className="w-full max-w-[660px] px-5 pb-1 pt-3">
                    <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)_minmax(0,1.05fr)]">
                      {projectStats.map((stat, index) => (
                        <div key={index} className="relative flex min-h-[122px] min-w-0 flex-col items-center justify-end gap-2 px-3 py-1">
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

            <div className="col-span-12 min-h-0 xl:col-span-6">
              <ComprehensiveEfficiencyPanel />
            </div>
            <div className="col-span-12 min-h-0 xl:col-span-6">
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
            <div className="flex shrink-0 items-center gap-1.5 overflow-hidden px-1 py-0.5">
              <div className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                {cellHistoryViewMode === "detail" && (
                  <CellHistoryMultiPicker value={selectedHistoryCells} onChange={setSelectedHistoryCells} />
                )}
                <HistoryDatePicker value={cellHistoryDate} onChange={setCellHistoryDate} max={yesterday} compact />
                <div
                  className="flex shrink-0 items-center gap-1 rounded-[12px] border border-[#1f5872] bg-[linear-gradient(180deg,rgba(8,23,41,0.98),rgba(6,17,31,0.99))] p-[2px] shadow-[0_0_0_1px_rgba(34,211,238,0.05)_inset,0_8px_18px_rgba(0,0,0,0.18)]"
                  style={{ height: pageControlGroupHeight }}
                >
                  {([
                    {
                      key: "overview",
                      labelZh: "总览",
                      labelEn: "Overview",
                      icon: (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="4" y="4" width="6" height="6" rx="1.2" />
                          <rect x="14" y="4" width="6" height="6" rx="1.2" />
                          <rect x="4" y="14" width="6" height="6" rx="1.2" />
                          <rect x="14" y="14" width="6" height="6" rx="1.2" />
                        </svg>
                      ),
                    },
                    {
                      key: "detail",
                      labelZh: "明细",
                      labelEn: "Detail",
                      icon: (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 18V9" />
                          <path d="M10 18V6" />
                          <path d="M15 18v-4" />
                          <path d="M20 18V11" />
                          <path d="M4 18h17" />
                        </svg>
                      ),
                    },
                  ] as { key: CellHistoryViewMode; labelZh: string; labelEn: string; icon: ReactNode }[]).map((item) => {
                    const active = cellHistoryViewMode === item.key

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
                        className={`flex items-center justify-center rounded-[8px] font-medium transition-all ${
                          active
                            ? "border border-[#45f1d0]/45 bg-[linear-gradient(180deg,rgba(20,221,190,0.94),rgba(7,193,164,0.88))] text-[#04241c] shadow-[0_0_10px_rgba(34,211,238,0.18)]"
                            : "border border-transparent bg-transparent text-[#6d90ad] hover:border-[#22d3ee]/22 hover:text-[#d5efff]"
                        }`}
                        style={{ width: pageIconButtonEdge, height: pageIconButtonEdge, fontSize: pageIconButtonSize }}
                      >
                        <span className={active ? "scale-100" : "scale-[0.95]"}>{item.icon}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <CellHistoryReplayPanel
                date={cellHistoryDate}
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
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <div className="flex shrink-0 flex-wrap items-center gap-3 overflow-visible">
              <div className="flex flex-wrap items-center gap-1 rounded-[14px] border border-[#1d4c69] bg-[linear-gradient(180deg,rgba(9,25,48,0.92),rgba(8,20,38,0.96))] p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
                {ANALYSIS_RANGES.map((range) => (
                  <button
                    key={range.key}
                    onClick={() => setAnalysisRange(range.key)}
                    className={`rounded-[10px] px-3.5 py-1.5 tracking-[0.03em] transition-all ${
                      analysisRange === range.key
                        ? "border border-[#00d4aa]/60 bg-[linear-gradient(180deg,rgba(27,220,191,0.96),rgba(7,193,164,0.88))] font-semibold text-[#041c16] shadow-[0_0_16px_rgba(0,212,170,0.22)]"
                        : "border border-transparent text-[#8aaed2] hover:border-[#22d3ee]/20 hover:bg-[#112347] hover:text-[#e3f4ff]"
                    }`}
                    style={{ fontSize: pageControlButtonSize }}
                  >
                    {zh ? range.zh : range.en}
                  </button>
                ))}
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
                  />
                </div>
              )}
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
              <div className="col-span-12 min-h-0 xl:col-span-4">
                <VoltageDifferenceAnalysis
                  range={analysisRangeDays}
                  summary={analysisTrendData?.summary ?? null}
                  trendData={analysisTrendData?.dailyTrend ?? []}
                  loading={isAnalysisLoading}
                  error={analysisError}
                />
              </div>
              <div className="col-span-12 min-h-0 xl:col-span-4">
                <TemperatureDifferenceAnalysis
                  range={analysisRangeDays}
                  summary={analysisTrendData?.summary ?? null}
                  trendData={analysisTrendData?.dailyTrend ?? []}
                  loading={isAnalysisLoading}
                  error={analysisError}
                />
              </div>
              <div className="col-span-12 min-h-0 xl:col-span-4">
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

        {activeTab === "alarm-monitoring" && renderAlarmMonitoringPage()}

        {activeTab === "reports" && (
          <div className="h-full min-h-0 overflow-hidden">
            <ReportCenterPanel />
          </div>
        )}
      </div>
    </div>
  )
}

export default function EnergyStorageDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("realtime")
  const tabs = (Object.keys(TAB_META) as DashboardTab[])
    .filter((key) => key !== "bms")
    .map((key) => ({
      key,
      label: TAB_META[key],
    }))

  return (
    <LanguageProvider>
      <ProjectProvider>
        <div className="relative flex h-screen flex-col overflow-hidden bg-[#060b16] text-[#e8f4fc]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_24%),radial-gradient(circle_at_24%_32%,rgba(59,130,246,0.08),transparent_26%),radial-gradient(circle_at_80%_18%,rgba(34,211,238,0.06),transparent_22%)]" />
          <div className="relative z-10 flex h-full flex-col overflow-hidden">
            <DashboardHeader activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as DashboardTab)} tabs={tabs} />
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <DashboardTabs activeTab={activeTab} />
            </main>
          </div>
        </div>
      </ProjectProvider>
    </LanguageProvider>
  )
}
