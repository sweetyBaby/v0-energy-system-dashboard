"use client"

import { useState } from "react"
import { Battery, Calendar, Zap } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { AlarmLogPanel } from "@/components/dashboard/alarm-log-panel"
import { BCUStatusQuery } from "@/components/dashboard/bcu-status-query"
import { CellHistoryCellPicker, CellHistoryReplayPanel } from "@/components/dashboard/cell-history-replay-panel"
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

type DashboardTab = "realtime" | "bms" | "cell-history" | "analysis" | "history" | "reports"
type BcuMode = "realtime" | "history"
type AnalysisRange = 7 | 15 | 30

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
  bms: { zh: "电芯矩阵", en: "Cell Matrix" },
  "cell-history": { zh: "电芯历史", en: "Cell History" },
  analysis: { zh: "数据分析", en: "Analysis" },
  reports: { zh: "报表信息", en: "Reports" },
}

function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("realtime")
  const [analysisRange, setAnalysisRange] = useState<AnalysisRange>(15)
  const [bcuMode, setBcuMode] = useState<BcuMode>("realtime")
  const today = formatDateInputValue(new Date())
  const [historyDate, setHistoryDate] = useState(today)
  const [cellHistoryDate, setCellHistoryDate] = useState(today)
  const [selectedHistoryCell, setSelectedHistoryCell] = useState<number | null>(null)
  const { language } = useLanguage()
  const { selectedProject } = useProject()
  const zh = language === "zh"

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

  const renderTabRail = (floating = false) => (
    <div
      className={
        floating
          ? "pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center"
          : "relative z-10 flex shrink-0 justify-center px-3 pb-2 pt-3"
      }
    >
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
        {(Object.keys(TAB_META) as DashboardTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative min-w-[98px] overflow-hidden rounded-[10px] border px-5 py-[7px] text-[13px] tracking-[0.12em] transition-all duration-200 ${
              activeTab === tab
                ? "border-[#39f5d8]/90 bg-[linear-gradient(180deg,rgba(16,119,112,0.34),rgba(3,43,55,0.90))] font-semibold text-[#e9fffb]"
                : "border-[#315878]/90 bg-[linear-gradient(180deg,rgba(16,37,63,0.88),rgba(8,21,39,0.92))] font-medium text-[#9cc7e6] hover:border-[#56c8ff]/70 hover:text-[#d8f3ff]"
            }`}
            style={
              activeTab === tab
                ? {
                    boxShadow: "0 0 24px rgba(0,255,209,0.18), inset 0 0 18px rgba(45,255,220,0.10), inset 0 0 0 1px rgba(160,255,242,0.16)",
                    textShadow: "0 0 10px rgba(120,255,235,0.42)",
                  }
                : {
                    boxShadow: "inset 0 1px 0 rgba(146,206,255,0.08), 0 8px 16px rgba(0,0,0,0.14)",
                    textShadow: "0 0 8px rgba(18,42,68,0.35)",
                  }
            }
          >
            <span
              className={`pointer-events-none absolute inset-0 ${
                activeTab === tab
                  ? "bg-[linear-gradient(135deg,rgba(120,255,240,0.14),transparent_42%,rgba(0,255,187,0.10))]"
                  : "bg-[linear-gradient(135deg,rgba(120,190,255,0.08),transparent_45%,rgba(0,0,0,0.05))]"
              }`}
            />
            <span
              className={`pointer-events-none absolute inset-x-3 top-0 h-px ${
                activeTab === tab ? "bg-[#8fffee]/70" : "bg-[#7dc7ff]/24"
              }`}
            />
            {activeTab === tab && (
              <span
                className="pointer-events-none absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[#52ffe0]"
                style={{ boxShadow: "0 0 10px rgba(82,255,224,0.9)" }}
              />
            )}
            <span className="relative z-10">{zh ? TAB_META[tab].zh : TAB_META[tab].en}</span>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {activeTab !== "realtime" && renderTabRail()}

      <div className="min-h-0 flex-1 overflow-hidden p-3">
        {activeTab === "realtime" && (
          <div className="grid h-full grid-cols-12 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <div className="relative col-span-12 min-h-0 overflow-hidden rounded-xl border border-[#22d3ee]/30">
              {renderTabRail(true)}
              <img
                src={selectedProject.image}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[1] brightness-[1.16] saturate-[1.08]"
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,20,40,0.02)_0%,rgba(8,20,40,0.00)_32%,rgba(5,12,28,0.12)_72%,rgba(3,8,20,0.24)_100%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00d4aa]/50 to-transparent" />

              <div className="relative grid h-full grid-cols-12 gap-3 px-3 pb-3 pt-16">
                <div className="col-span-3 min-h-0">
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

                <div className="col-span-3 min-h-0">
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
            <div
              className="relative flex shrink-0 items-center gap-3 overflow-hidden border border-[#22d3ee]/20 bg-[#020810] px-3 py-2"
              style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 100%, 0 100%)" }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/50 to-transparent" />
              <HistoryDatePicker value={cellHistoryDate} onChange={setCellHistoryDate} max={today} />
              <CellHistoryCellPicker value={selectedHistoryCell} onChange={setSelectedHistoryCell} />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <CellHistoryReplayPanel date={cellHistoryDate} selectedCell={selectedHistoryCell} onSelectedCellChange={setSelectedHistoryCell} />
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
                {zh ? "时间范围" : "TIME RANGE"}
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

        {activeTab === "history" && (
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
                    {mode === "realtime" ? (zh ? "实时监控" : "Live") : (zh ? "历史查询" : "History")}
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
        )}

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
  return (
    <LanguageProvider>
      <ProjectProvider>
        <div className="relative flex h-screen flex-col overflow-hidden bg-[#060b16] text-[#e8f4fc]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_24%),radial-gradient(circle_at_24%_32%,rgba(59,130,246,0.08),transparent_26%),radial-gradient(circle_at_80%_18%,rgba(34,211,238,0.06),transparent_22%)]" />
          <div className="relative z-10 flex h-full flex-col overflow-hidden">
            <DashboardHeader />
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <DashboardTabs />
            </main>
          </div>
        </div>
      </ProjectProvider>
    </LanguageProvider>
  )
}
