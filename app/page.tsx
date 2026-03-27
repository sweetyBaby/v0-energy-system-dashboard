"use client"

import { useState } from "react"
import { useLanguage } from "@/components/language-provider"
import { AlarmLogPanel } from "@/components/dashboard/alarm-log-panel"
import { BCUStatusQuery } from "@/components/dashboard/bcu-status-query"
import { CellVoltageAnalysis } from "@/components/dashboard/cell-voltage-analysis"
import { ChargeDischargeTable } from "@/components/dashboard/charge-discharge-table"
import { CellMatrixPanel } from "@/components/dashboard/cell-matrix-panel"
import { ComprehensiveEfficiencyPanel } from "@/components/dashboard/comprehensive-efficiency-panel"
import { DashboardHeader, ProjectProvider } from "@/components/dashboard/dashboard-header"
import { EnergyCurveQuery } from "@/components/dashboard/energy-curve-query"
import { PowerCurveQuery } from "@/components/dashboard/power-curve-query"
import { ProjectInfo } from "@/components/dashboard/project-info"
import { RealtimeStatusBoard } from "@/components/dashboard/realtime-status-board"
import { ReportCenterPanel } from "@/components/dashboard/report-center-panel"
import { TemperatureDifferenceAnalysis } from "@/components/dashboard/temperature-difference-analysis"
import { VoltageDifferenceAnalysis } from "@/components/dashboard/voltage-difference-analysis"
import { LanguageProvider } from "@/components/language-provider"
import { HistoryDatePicker } from "@/components/dashboard/history-date-picker"

type DashboardTab = "realtime" | "efficiency" | "bms" | "analysis" | "history" | "reports"
type BcuMode = "realtime" | "history"
type AnalysisRange = 7 | 15 | 30

const ANALYSIS_RANGES: { key: AnalysisRange; zh: string; en: string }[] = [
  { key: 7,  zh: "近7日",  en: "Last 7d"  },
  { key: 15, zh: "近15日", en: "Last 15d" },
  { key: 30, zh: "近30日", en: "Last 30d" },
]

const TAB_META: Record<DashboardTab, { zh: string; en: string }> = {
  realtime:  { zh: "总览",   en: "Overview"    },
  efficiency:{ zh: "综合能效", en: "Efficiency"  },
  bms:       { zh: "电芯矩阵", en: "Cell Matrix" },
  analysis:  { zh: "数据分析", en: "Analysis"    },
  history:   { zh: "运行状态", en: "Operations"  },
  reports:   { zh: "报表信息", en: "Reports"     },
}

function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("realtime")
  const [analysisRange, setAnalysisRange] = useState<AnalysisRange>(15)
  const [bcuMode, setBcuMode] = useState<BcuMode>("realtime")
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
  const [historyDate, setHistoryDate] = useState(yesterday)
  const { language } = useLanguage()
  const zh = language === "zh"

return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="relative overflow-hidden rounded-xl border border-[#18305a] bg-[linear-gradient(180deg,rgba(13,18,51,0.95),rgba(9,14,36,0.98))] px-3 py-2 shadow-[0_0_0_1px_rgba(34,211,238,0.03)_inset]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee] to-transparent" />
        <div className="absolute left-0 top-1/2 h-px w-20 -translate-y-1/2 bg-gradient-to-r from-transparent to-[#22d3ee]/45" />
        <div className="absolute right-0 top-1/2 h-px w-20 -translate-y-1/2 bg-gradient-to-l from-transparent to-[#22d3ee]/45" />
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {(Object.keys(TAB_META) as DashboardTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-3 py-1.5 text-xs transition-all ${
                activeTab === tab
                  ? "border border-[#00d4aa]/55 bg-[linear-gradient(180deg,rgba(0,212,170,0.94),rgba(34,211,238,0.8))] font-semibold text-[#041123] shadow-[0_0_18px_rgba(0,212,170,0.18)]"
                  : "border border-[#3b82f6]/20 bg-[#101840]/72 text-[#7b8ab8] hover:border-[#00d4aa]/35 hover:text-[#e8f4fc]"
              }`}
            >
              {zh ? TAB_META[tab].zh : TAB_META[tab].en}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "realtime" && (
          <div className="grid h-full min-h-0 grid-cols-12 grid-rows-[320px_minmax(0,1fr)] gap-4">
            <div className="col-span-12 min-h-0 xl:col-span-3">
              <ProjectInfo />
            </div>
            <div className="col-span-12 min-h-0 xl:col-span-4">
              <RealtimeStatusBoard />
            </div>
            <div className="col-span-12 min-h-0 xl:col-span-5">
              <ChargeDischargeTable />
            </div>
            <div className="col-span-12 min-h-0 xl:col-span-6">
              <EnergyCurveQuery />
            </div>
            <div className="col-span-12 min-h-0 xl:col-span-6">
              <PowerCurveQuery />
            </div>
          </div>
        )}

        {activeTab === "efficiency" && (
          <div className="h-full min-h-0 overflow-hidden">
            <ComprehensiveEfficiencyPanel />
          </div>
        )}

        {activeTab === "bms" && (
          <div className="h-full min-h-0 overflow-hidden">
            <CellMatrixPanel />
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            {/* Shared filter bar */}
            <div className="flex shrink-0 items-center gap-3 rounded-lg border border-[#1a2654] bg-[#0d1233] px-4 py-2">
              <span className="text-xs text-[#7b8ab8]">{zh ? "时间范围" : "Time Range"}</span>
              <div className="flex gap-1 rounded-lg bg-[#1a2654]/50 p-1">
                {ANALYSIS_RANGES.map(r => (
                  <button key={r.key} onClick={() => setAnalysisRange(r.key)}
                    className={`rounded-md px-3 py-1 text-xs transition-all ${analysisRange === r.key ? "bg-[#00d4aa] font-semibold text-[#0a0e27]" : "text-[#7b8ab8] hover:text-[#e8f4fc]"}`}>
                    {zh ? r.zh : r.en}
                  </button>
                ))}
              </div>
            </div>
            {/* Panels */}
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
            {/* 工具栏：模式切换 + 历史日期导航 */}
            <div className="flex shrink-0 items-center gap-3 rounded-lg border border-[#1a2654] bg-[#0d1233] px-3 py-2">
              {/* 实时 / 历史查询 切换 */}
              <div className="flex gap-1 rounded-lg bg-[#1a2654]/60 p-0.5">
                {(["realtime", "history"] as BcuMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setBcuMode(m)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                      bcuMode === m
                        ? "bg-[#00d4aa] text-[#041123] shadow-[0_0_12px_rgba(0,212,170,0.2)]"
                        : "text-[#7b8ab8] hover:text-[#e8f4fc]"
                    }`}
                  >
                    {bcuMode === m && m === "realtime" && (
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#041123]" />
                    )}
                    {m === "realtime" ? (zh ? "实时监控" : "Live") : (zh ? "历史查询" : "History")}
                  </button>
                ))}
              </div>

              {/* 日期选择（仅历史模式） */}
              {bcuMode === "history" && (
                <HistoryDatePicker
                  value={historyDate}
                  onChange={setHistoryDate}
                  max={yesterday}
                />
              )}
            </div>

            {/* 主内容 */}
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
        <div className="flex h-screen flex-col overflow-hidden bg-[#0a0e27] text-[#e8f4fc]">
          <DashboardHeader />
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
            <DashboardTabs />
          </main>
        </div>
      </ProjectProvider>
    </LanguageProvider>
  )
}
