"use client"

import { useState, type ReactNode } from "react"
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
import { DashboardHeader, ProjectProvider, useProject } from "@/components/dashboard/dashboard-header"
import { HistoryDatePicker } from "@/components/dashboard/history-date-picker"
import { PowerCurveQuery } from "@/components/dashboard/power-curve-query"
import { RealtimeStatusBoard } from "@/components/dashboard/realtime-status-board"
import { ReportCenterPanel } from "@/components/dashboard/report-center-panel"
import { TemperatureDifferenceAnalysis } from "@/components/dashboard/temperature-difference-analysis"
import { VoltageDifferenceAnalysis } from "@/components/dashboard/voltage-difference-analysis"
import { LanguageProvider } from "@/components/language-provider"

type DashboardTab =
  | "realtime"
  | "bms"
  | "cell-history"
  | "analysis"
  | "history"
  | "alarm-monitoring"
  | "reports"

type BcuMode = "realtime" | "history"
type AnalysisRange = 7 | 15 | 30
type CellHistoryViewMode = "overview" | "detail"

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const ANALYSIS_RANGES: { key: AnalysisRange; zh: string; en: string }[] = [
  { key: 7, zh: "近7天", en: "Last 7d" },
  { key: 15, zh: "近15天", en: "Last 15d" },
  { key: 30, zh: "近30天", en: "Last 30d" },
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

function DashboardTabs({ activeTab }: { activeTab: DashboardTab }) {
  const [analysisRange, setAnalysisRange] = useState<AnalysisRange>(15)
  const [bcuMode, setBcuMode] = useState<BcuMode>("realtime")
  const today = formatDateInputValue(new Date())
  const [historyDate, setHistoryDate] = useState(today)
  const [cellHistoryDate, setCellHistoryDate] = useState(today)
  const [cellHistoryViewMode, setCellHistoryViewMode] = useState<CellHistoryViewMode>("overview")
  const [selectedHistoryCell, setSelectedHistoryCell] = useState<number | null>(null)
  const [selectedHistoryCells, setSelectedHistoryCells] = useState<number[]>([1])
  const [cellHistoryStats, setCellHistoryStats] = useState<CellHistoryOverviewStats | null>(null)
  const { language } = useLanguage()
  const { selectedProject } = useProject()
  const zh = language === "zh"

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

  const projectStats = [
    {
      icon: <Zap className="h-6 w-6 text-[#25efff]" fill="currentColor" />,
      iconBg: "bg-[#25efff]/12 border border-[#25efff]/45",
      labelZh: "额定功率",
      labelEn: "Rated Power",
      value: selectedProject.ratedPower,
    },
    {
      icon: <Battery className="h-6 w-6 text-[#25efff]" />,
      iconBg: "bg-[#25efff]/12 border border-[#25efff]/45",
      labelZh: "额定容量",
      labelEn: "Rated Capacity",
      value: selectedProject.ratedCapacity,
    },
    {
      icon: <Calendar className="h-6 w-6 text-[#25efff]" />,
      iconBg: "bg-[#25efff]/12 border border-[#25efff]/45",
      labelZh: "投运日期",
      labelEn: "Commission",
      value: selectedProject.commissioningDate,
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
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-[12px] font-medium tracking-[0.03em] transition-all ${
                bcuMode === mode
                  ? "border border-[#00d4aa]/55 bg-[linear-gradient(180deg,rgba(0,212,170,0.90),rgba(0,195,160,0.82))] font-semibold text-[#021a12] shadow-[0_0_12px_rgba(0,212,170,0.25)]"
                  : "text-[#5a8aaa] hover:text-[#c0dff5]"
              }`}
            >
              {bcuMode === mode && mode === "realtime" && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#021a12]" />
              )}
              {mode === "realtime" ? (zh ? "瀹炴椂鐩戞帶" : "Live") : (zh ? "鍘嗗彶鏌ヨ" : "History")}
            </button>
          ))}
        </div>
        {bcuMode === "history" && (
          <HistoryDatePicker value={historyDate} onChange={setHistoryDate} max={today} />
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
      <div className={activeTab === "realtime" ? "min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-0" : "min-h-0 flex-1 overflow-hidden p-3"}>
        {activeTab === "realtime" && (
          <div className="grid h-full grid-cols-12 grid-rows-[minmax(240px,1fr)_minmax(0,1fr)] gap-3">
            <div className="relative col-span-12 min-h-0 overflow-hidden rounded-b-xl border border-[#22d3ee]/30 border-t-0">
              <img
                src={selectedProject.image}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[1] brightness-[1.16] saturate-[1.08]"
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,20,40,0.02)_0%,rgba(8,20,40,0.00)_32%,rgba(5,12,28,0.12)_72%,rgba(3,8,20,0.24)_100%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00d4aa]/50 to-transparent" />

              <div className="relative grid h-full grid-cols-12 items-stretch gap-3 px-3 pb-3 pt-6">
                <div className="col-span-3 min-h-0 h-full">
                  <RealtimeStatusBoard />
                </div>

                <div className="col-span-6 flex min-h-0 items-end justify-center">
                  <div className="w-full max-w-[560px] px-5 pb-1 pt-3">
                    <div className="grid grid-cols-3">
                      {projectStats.map((stat, index) => (
                        <div key={index} className="relative flex min-h-[122px] flex-col items-center justify-end gap-2 px-4 py-1">
                          {index < projectStats.length - 1 && (
                            <div className="pointer-events-none absolute inset-y-3 right-0 w-px bg-gradient-to-b from-transparent via-[#b8d8f0]/35 to-transparent" />
                          )}
                          <div className={`flex h-11 w-11 items-center justify-center rounded-full ${stat.iconBg}`}>
                            {stat.icon}
                          </div>
                          <span
                            className="text-[11.5px] font-medium text-[#b8d8f0]"
                            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.95)" }}
                          >
                            {zh ? stat.labelZh : stat.labelEn}
                          </span>
                          <span
                            className="text-[1.05rem] font-bold tabular-nums tracking-[0.04em] text-[#e8f8ff]"
                            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.95), 0 0 14px rgba(34,211,238,0.45)" }}
                          >
                            {stat.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="col-span-3 flex min-h-0 h-full items-stretch justify-end">
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
              {/* Overview stat chips */}
              {cellHistoryViewMode === "overview" && cellHistoryStats && (
                <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {[
                    { labelZh: "最高电压", labelEn: "Max V", value: `${cellHistoryStats.maxVoltage.toFixed(2)}V`, cell: cellHistoryStats.maxVoltageCell, color: "text-[#aef8ff]" },
                    { labelZh: "最低电压", labelEn: "Min V", value: `${cellHistoryStats.minVoltage.toFixed(2)}V`, cell: cellHistoryStats.minVoltageCell, color: "text-[#aef8ff]" },
                    { labelZh: "最大ΔV", labelEn: "Spread ΔV", value: `${cellHistoryStats.voltageDelta.toFixed(2)}V`, cell: null, color: "text-[#ffd892]" },
                    { labelZh: "最高温度", labelEn: "Max T", value: `${cellHistoryStats.maxTemp.toFixed(1)}°C`, cell: cellHistoryStats.maxTempCell, color: "text-[#aef8ff]" },
                    { labelZh: "最低温度", labelEn: "Min T", value: `${cellHistoryStats.minTemp.toFixed(1)}°C`, cell: cellHistoryStats.minTempCell, color: "text-[#aef8ff]" },
                    { labelZh: "最大ΔT", labelEn: "Spread ΔT", value: `${cellHistoryStats.tempDelta.toFixed(1)}°C`, cell: null, color: "text-[#ffd892]" },
                    { labelZh: "日充电量", labelEn: "Daily Charge", value: `${cellHistoryStats.chargeEnergy.toFixed(1)}kWh`, cell: null, color: "text-[#8ee7ff]" },
                    { labelZh: "日放电量", labelEn: "Daily Discharge", value: `${cellHistoryStats.dischargeEnergy.toFixed(1)}kWh`, cell: null, color: "text-[#ffc98b]" },
                    { labelZh: "综合效率", labelEn: "Efficiency", value: `${cellHistoryStats.roundTripEfficiency.toFixed(1)}%`, cell: null, color: "text-[#8cf5c6]" },
                  ].map((item) => (
                    <div key={item.labelEn} className="flex shrink-0 items-center gap-1 rounded-[8px] border border-[#2da7d8]/28 bg-[rgba(13,31,58,0.62)] px-2 py-0.5">
                      <span className="text-[11px] font-medium text-[#91bdd8]">{zh ? item.labelZh : item.labelEn}</span>
                      <span className={`text-[12px] font-bold tabular-nums ${item.color}`}>
                        {item.value}{item.cell != null ? ` (#${item.cell})` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {/* Date picker right-aligned */}
              <div className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                {cellHistoryViewMode === "detail" && (
                  <CellHistoryMultiPicker value={selectedHistoryCells} onChange={setSelectedHistoryCells} />
                )}
                <HistoryDatePicker value={cellHistoryDate} onChange={setCellHistoryDate} max={today} compact />
                <div className="flex h-8 shrink-0 items-center gap-1 rounded-[12px] border border-[#1f5872] bg-[linear-gradient(180deg,rgba(8,23,41,0.98),rgba(6,17,31,0.99))] p-[2px] shadow-[0_0_0_1px_rgba(34,211,238,0.05)_inset,0_8px_18px_rgba(0,0,0,0.18)]">
                  {([
                    {
                      key: "overview",
                      labelZh: "鎬昏",
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
                      labelZh: "鏄庣粏",
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
                        className={`flex h-[28px] w-[28px] items-center justify-center rounded-[8px] text-[12px] font-medium transition-all ${
                          active
                            ? "border border-[#45f1d0]/45 bg-[linear-gradient(180deg,rgba(20,221,190,0.94),rgba(7,193,164,0.88))] text-[#04241c] shadow-[0_0_10px_rgba(34,211,238,0.18)]"
                            : "border border-transparent bg-transparent text-[#6d90ad] hover:border-[#22d3ee]/22 hover:text-[#d5efff]"
                        }`}
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
            <div
              className="relative flex shrink-0 items-center gap-3 overflow-hidden border border-[#22d3ee]/20 bg-[#020810] px-4 py-2"
              style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 100%, 0 100%)" }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/50 to-transparent" />
              <span className="text-[11px] font-medium tracking-[0.06em] text-[#4a7090]">
                {zh ? "鏃堕棿鑼冨洿" : "TIME RANGE"}
              </span>
              <div className="h-3 w-px bg-[#22d3ee]/25" />
              <div className="flex gap-1">
                {ANALYSIS_RANGES.map((range) => (
                  <button
                    key={range.key}
                    onClick={() => setAnalysisRange(range.key)}
                    className={`rounded px-3 py-1 text-[12px] tracking-[0.03em] transition-all ${
                      analysisRange === range.key
                        ? "border border-[#00d4aa]/55 bg-[linear-gradient(180deg,rgba(0,212,170,0.90),rgba(0,195,160,0.82))] font-semibold text-[#021a12] shadow-[0_0_12px_rgba(0,212,170,0.25)]"
                        : "text-[#5a8aaa] hover:text-[#c0dff5]"
                    }`}
                  >
                    {zh ? range.zh : range.en}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
              <div className="col-span-12 min-h-0 xl:col-span-4">
                <VoltageDifferenceAnalysis range={analysisRange} />
              </div>
              <div className="col-span-12 min-h-0 xl:col-span-4">
                <TemperatureDifferenceAnalysis range={analysisRange} />
              </div>
              <div className="col-span-12 min-h-0 xl:col-span-4">
                <CellVoltageAnalysis range={analysisRange} />
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
