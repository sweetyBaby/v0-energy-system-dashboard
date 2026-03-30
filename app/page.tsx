"use client"

import { useState } from "react"
import { Battery, Calendar, Zap } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { AlarmLogPanel } from "@/components/dashboard/alarm-log-panel"
import { BCUStatusQuery } from "@/components/dashboard/bcu-status-query"
import { CellVoltageAnalysis } from "@/components/dashboard/cell-voltage-analysis"
import { ChargeDischargeTable } from "@/components/dashboard/charge-discharge-table"
import { CellMatrixPanel } from "@/components/dashboard/cell-matrix-panel"
import { ComprehensiveEfficiencyPanel } from "@/components/dashboard/comprehensive-efficiency-panel"
import { DashboardHeader, ProjectProvider, useProject } from "@/components/dashboard/dashboard-header"
import { EnergyCurveQuery } from "@/components/dashboard/energy-curve-query"
import { PowerCurveQuery } from "@/components/dashboard/power-curve-query"
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
  { key: 7,  zh: "近7天",  en: "Last 7d"  },
  { key: 15, zh: "近15天", en: "Last 15d" },
  { key: 30, zh: "近30天", en: "Last 30d" },
]

const TAB_META: Record<DashboardTab, { zh: string; en: string }> = {
  realtime:   { zh: "总览",    en: "Overview"    },
  efficiency: { zh: "综合能效", en: "Efficiency"  },
  bms:        { zh: "电芯矩阵", en: "Cell Matrix" },
  analysis:   { zh: "数据分析", en: "Analysis"    },
  history:    { zh: "运行状态", en: "Operations"  },
  reports:    { zh: "报表信息", en: "Reports"     },
}

function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("realtime")
  const [analysisRange, setAnalysisRange] = useState<AnalysisRange>(15)
  const [bcuMode, setBcuMode] = useState<BcuMode>("realtime")
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
  const [historyDate, setHistoryDate] = useState(yesterday)
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

  // ── 发光导轨式 Tab ────────────────────────────────────────────────────────
  const tabRail = (
    <div className="relative shrink-0 overflow-hidden bg-[#020810]" style={{ height: "42px" }}>
      {/* 扫描线 */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(34,211,238,0.010)_3px,rgba(34,211,238,0.010)_4px)]" />
      {/* 中心向上晕光 */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[560px]"
        style={{ height: "42px", background: "radial-gradient(ellipse 55% 100% at 50% 100%, rgba(34,211,238,0.12), transparent)" }}
      />
      {/* 底部导轨线 */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/70 to-transparent"
        style={{ boxShadow: "0 0 8px rgba(34,211,238,0.40)" }}
      />
      {/* 导轨节点：左右对称，贴在底部线上 */}
      <div className="pointer-events-none absolute bottom-0 rounded-full bg-[#22d3ee]/80" style={{ left: "12%", width: 4, height: 4, transform: "translate(-50%,50%)", boxShadow: "0 0 6px rgba(34,211,238,0.7)" }} />
      <div className="pointer-events-none absolute bottom-0 rounded-full bg-[#22d3ee]/80" style={{ left: "88%", width: 4, height: 4, transform: "translate(-50%,50%)", boxShadow: "0 0 6px rgba(34,211,238,0.7)" }} />
      <div className="pointer-events-none absolute bottom-0 bg-[#22d3ee]/70" style={{ left: "28%", width: 5, height: 5, transform: "translate(-50%,50%) rotate(45deg)", boxShadow: "0 0 5px rgba(34,211,238,0.6)" }} />
      <div className="pointer-events-none absolute bottom-0 bg-[#22d3ee]/70" style={{ left: "72%", width: 5, height: 5, transform: "translate(-50%,50%) rotate(45deg)", boxShadow: "0 0 5px rgba(34,211,238,0.6)" }} />

      {/* Tab 列表 */}
      <div className="flex h-full items-center justify-center gap-1.5 px-4">
        {(Object.keys(TAB_META) as DashboardTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative rounded-sm border px-4 py-[5px] text-[13px] tracking-[0.04em] transition-all ${
              activeTab === tab
                ? "border-[#00d4aa]/55 bg-[rgba(0,212,170,0.10)] font-semibold text-[#00e8cc]"
                : "border-[#1a3650]/80 bg-[rgba(4,14,28,0.60)] font-medium text-[#3e6880] hover:border-[#22d3ee]/30 hover:bg-[rgba(34,211,238,0.04)] hover:text-[#7abcd8]"
            }`}
            style={activeTab === tab ? {
              boxShadow: "0 0 12px rgba(0,212,170,0.18), inset 0 0 8px rgba(0,212,170,0.06)",
              textShadow: "0 0 10px rgba(0,232,204,0.55)",
            } : undefined}
          >
            {/* 激活状态：底部指示条连接导轨 */}
            {activeTab === tab && (
              <span
                className="pointer-events-none absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-[#00d4aa]"
                style={{ boxShadow: "0 0 6px rgba(0,212,170,0.8)" }}
              />
            )}
            {zh ? TAB_META[tab].zh : TAB_META[tab].en}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

      {/* ── Tab rail: flush against header, full-width ── */}
      {tabRail}

      {/* ── Content area: padded ── */}
      <div className="min-h-0 flex-1 overflow-hidden p-3">

        {/* ══ Overview (总览) ══════════════════════════════════════════════════ */}
        {activeTab === "realtime" && (
          <div className="grid h-full grid-cols-12 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3">

            {/* ── Top row: single full-width container; image is the shared background ── */}
            <div className="relative col-span-12 min-h-0 overflow-hidden rounded-xl border border-[#22d3ee]/30">
              {/* Background image — bright, vivid */}
              <img
                src={selectedProject.image}
                alt="" aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[1]"
              />
              {/* Minimal overlay — only dims bottom for card legibility */}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,6,18,0.04)_0%,rgba(3,6,18,0.00)_35%,rgba(3,6,18,0.22)_72%,rgba(3,6,18,0.42)_100%)]" />
              {/* Top glow line */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00d4aa]/50 to-transparent" />

              {/* Three floating panels on top of the image */}
              <div className="relative grid h-full grid-cols-12 gap-3 p-3">

                {/* Left: 系统状态 — floats on image */}
                <div className="col-span-3 min-h-0">
                  <RealtimeStatusBoard />
                </div>

                {/* Center: project stats card — pinned to bottom */}
                <div className="col-span-6 flex min-h-0 items-end justify-center pb-3">
                  <div className="relative w-full max-w-[500px] overflow-hidden rounded-xl border border-[#22d3ee]/30 bg-transparent px-6 py-3.5 backdrop-blur-[3px] shadow-[0_0_0_1px_rgba(34,211,238,0.06)_inset,0_8px_32px_rgba(0,0,0,0.4)]">
                    {/* corner brackets */}
                    <div className="pointer-events-none absolute left-1 top-1 h-3 w-3 border-l-[2px] border-t-[2px] border-[#22d3ee]/70" />
                    <div className="pointer-events-none absolute right-1 top-1 h-3 w-3 border-r-[2px] border-t-[2px] border-[#22d3ee]/70" />
                    <div className="pointer-events-none absolute bottom-1 left-1 h-3 w-3 border-b-[2px] border-l-[2px] border-[#22d3ee]/35" />
                    <div className="pointer-events-none absolute bottom-1 right-1 h-3 w-3 border-b-[2px] border-r-[2px] border-[#22d3ee]/35" />
                    {/* top cyan seam */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/60 to-transparent" />
                    <div className="grid grid-cols-3">
                      {projectStats.map((s, i) => (
                        <div key={i} className="relative flex flex-col items-center gap-2 px-3 py-1">
                          {i < projectStats.length - 1 && (
                            <div className="pointer-events-none absolute inset-y-2 right-0 w-px bg-gradient-to-b from-transparent via-[#22d3ee]/30 to-transparent" />
                          )}
                          <div className={`flex h-11 w-11 items-center justify-center rounded-full ${s.iconBg}`}>
                            {s.icon}
                          </div>
                          <span className="text-[11.5px] font-medium text-[#b8d8f0]" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.95)" }}>{zh ? s.labelZh : s.labelEn}</span>
                          <span className="text-[1.05rem] font-bold tabular-nums tracking-[0.04em] text-[#e8f8ff]" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.95), 0 0 14px rgba(34,211,238,0.45)" }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: 充放电统计 — floats on image */}
                <div className="col-span-3 min-h-0">
                  <ChargeDischargeTable />
                </div>
              </div>
            </div>

            {/* Row 2: energy curves */}
            <div className="col-span-12 min-h-0 xl:col-span-6">
              <EnergyCurveQuery />
            </div>
            <div className="col-span-12 min-h-0 xl:col-span-6">
              <PowerCurveQuery />
            </div>
          </div>
        )}

        {/* ══ Other tabs ══════════════════════════════════════════════════════ */}
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
            <div className="relative flex shrink-0 items-center gap-3 overflow-hidden border border-[#22d3ee]/20 bg-[#020810] px-4 py-2" style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 100%, 0 100%)" }}>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/50 to-transparent" />
              <span className="text-[11px] font-medium tracking-[0.06em] text-[#4a7090]">{zh ? "时间范围" : "TIME RANGE"}</span>
              <div className="h-3 w-px bg-[#22d3ee]/25" />
              <div className="flex gap-1">
                {ANALYSIS_RANGES.map(r => (
                  <button key={r.key} onClick={() => setAnalysisRange(r.key)}
                    className={`rounded px-3 py-1 text-[12px] tracking-[0.03em] transition-all ${analysisRange === r.key ? "border border-[#00d4aa]/55 bg-[linear-gradient(180deg,rgba(0,212,170,0.90),rgba(0,195,160,0.82))] font-semibold text-[#021a12] shadow-[0_0_12px_rgba(0,212,170,0.25)]" : "text-[#5a8aaa] hover:text-[#c0dff5]"}`}>
                    {zh ? r.zh : r.en}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
              <div className="col-span-12 min-h-0 xl:col-span-4"><VoltageDifferenceAnalysis range={analysisRange} /></div>
              <div className="col-span-12 min-h-0 xl:col-span-4"><TemperatureDifferenceAnalysis range={analysisRange} /></div>
              <div className="col-span-12 min-h-0 xl:col-span-4"><CellVoltageAnalysis range={analysisRange} /></div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <div className="relative flex shrink-0 items-center gap-3 overflow-hidden border border-[#22d3ee]/20 bg-[#020810] px-3 py-2" style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 100%, 0 100%)" }}>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/50 to-transparent" />
              <div className="flex gap-1">
                {(["realtime", "history"] as BcuMode[]).map((m) => (
                  <button key={m} onClick={() => setBcuMode(m)}
                    className={`flex items-center gap-1.5 rounded px-3 py-1 text-[12px] tracking-[0.03em] font-medium transition-all ${bcuMode === m ? "border border-[#00d4aa]/55 bg-[linear-gradient(180deg,rgba(0,212,170,0.90),rgba(0,195,160,0.82))] font-semibold text-[#021a12] shadow-[0_0_12px_rgba(0,212,170,0.25)]" : "text-[#5a8aaa] hover:text-[#c0dff5]"}`}>
                    {bcuMode === m && m === "realtime" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#021a12]" />}
                    {m === "realtime" ? (zh ? "实时监控" : "Live") : (zh ? "历史查询" : "History")}
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
