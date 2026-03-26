"use client"

import { useState } from "react"
import { BellRing, ChevronDown, ChevronUp, Filter } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useLanguage } from "@/components/language-provider"

// ── Mock data ──────────────────────────────────────────────────────────────
const ALL_ALARMS = [
  { time: "2026-03-25 14:26:18", level: "critical", source: "BCU-03", msgZh: "3#簇温差预警",        msgEn: "Cluster 3 temperature delta warning",        statusZh: "未恢复",  statusEn: "Active"       },
  { time: "2026-03-25 13:08:44", level: "major",    source: "BCU-07", msgZh: "单体压差越限",        msgEn: "Cell voltage delta exceeded threshold",       statusZh: "已确认",  statusEn: "Acknowledged" },
  { time: "2026-03-25 10:42:06", level: "minor",    source: "PCS-01", msgZh: "PCS 通讯抖动",        msgEn: "PCS communication jitter",                   statusZh: "已恢复",  statusEn: "Recovered"    },
  { time: "2026-03-25 08:17:31", level: "major",    source: "BCU-02", msgZh: "过温告警 T3 > 45°C",  msgEn: "Overtemp: T3 > 45°C",                        statusZh: "已恢复",  statusEn: "Recovered"    },
  { time: "2026-03-25 07:55:12", level: "minor",    source: "EMS",    msgZh: "调度指令超时",        msgEn: "Dispatch command timeout",                   statusZh: "已恢复",  statusEn: "Recovered"    },
  { time: "2026-03-25 03:44:02", level: "critical", source: "BCU-05", msgZh: "SOC 过低保护触发",    msgEn: "Low SOC protection triggered",               statusZh: "已确认",  statusEn: "Acknowledged" },
  { time: "2026-03-25 02:09:58", level: "minor",    source: "BCU-01", msgZh: "均衡超时",            msgEn: "Balancing timeout",                          statusZh: "已恢复",  statusEn: "Recovered"    },
  { time: "2026-03-24 22:17:31", level: "major",    source: "EMS",    msgZh: "调度功率指令偏差",    msgEn: "Dispatch power deviation",                   statusZh: "已确认",  statusEn: "Acknowledged" },
  { time: "2026-03-24 18:33:05", level: "minor",    source: "BCU-06", msgZh: "电池内阻偏高",        msgEn: "Cell resistance high",                       statusZh: "已恢复",  statusEn: "Recovered"    },
  { time: "2026-03-24 15:02:44", level: "major",    source: "BCU-04", msgZh: "压差超过 40 mV",      msgEn: "Voltage delta > 40 mV",                      statusZh: "已恢复",  statusEn: "Recovered"    },
]

// Mock hourly distribution for history mode
const HOURLY_DIST = Array.from({ length: 24 }, (_, h) => ({
  hour: String(h).padStart(2, "0"),
  critical: h === 3 || h === 14 ? 1 : 0,
  major:    h === 13 || h === 8 ? 1 : 0,
  minor:    h === 10 || h === 7 || h === 2 ? 1 : 0,
}))

// Mini ±5 min detail curve for expanded row
const genDetailCurve = () =>
  Array.from({ length: 11 }, (_, i) => ({
    t: `${i - 5}m`,
    voltage: +(3.31 + Math.random() * 0.04).toFixed(3),
    temp:    +(28 + Math.random() * 6).toFixed(1),
  }))

// ── Styles ─────────────────────────────────────────────────────────────────
const LEVEL_STYLE: Record<string, string> = {
  critical: "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30",
  major:    "bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/30",
  minor:    "bg-[#3b82f6]/15 text-[#3b82f6] border border-[#3b82f6]/30",
}
const STATUS_COLOR: Record<string, string> = {
  "未恢复": "#ef4444", "已确认": "#f97316", "已恢复": "#00d4aa",
  "Active": "#ef4444", "Acknowledged": "#f97316", "Recovered": "#00d4aa",
}
const TS = { backgroundColor: "#0d1233", border: "1px solid #1a2654", borderRadius: "8px" }

type LevelFilter = "all" | "critical" | "major" | "minor"

// ── Component ──────────────────────────────────────────────────────────────
export function AlarmLogPanel({
  mode = "realtime",
  date,
}: {
  mode?: "realtime" | "history"
  date?: string
}) {
  const { language } = useLanguage()
  const zh = language === "zh"

  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [detailCurves] = useState<Record<string, ReturnType<typeof genDetailCurve>>>({})

  // Today: 2026-03-25; history date passed from parent
  const filterDate = mode === "history" ? (date ?? "2026-03-25") : "2026-03-25"

  const dateFiltered = ALL_ALARMS.filter(a => a.time.startsWith(filterDate))

  // Realtime: unrecovered first, then by time desc
  const sorted = mode === "realtime"
    ? [...dateFiltered].sort((a, b) => {
        const unrecA = a.statusZh === "未恢复" ? 0 : 1
        const unrecB = b.statusZh === "未恢复" ? 0 : 1
        return unrecA - unrecB || b.time.localeCompare(a.time)
      })
    : dateFiltered

  // History: level + source filter
  const displayed = mode === "history"
    ? sorted.filter(a =>
        (levelFilter === "all" || a.level === levelFilter) &&
        (sourceFilter === "all" || a.source === sourceFilter)
      )
    : sorted

  const activeCount   = dateFiltered.filter(a => a.statusZh === "未恢复").length
  const ackCount      = dateFiltered.filter(a => a.statusZh === "已确认").length
  const recoveredCount= dateFiltered.filter(a => a.statusZh === "已恢复").length
  const recoveryRate  = dateFiltered.length > 0
    ? Math.round(((ackCount + recoveredCount) / dateFiltered.length) * 100)
    : 0

  const sources = ["all", ...Array.from(new Set(dateFiltered.map(a => a.source)))]

  const getDetailCurve = (key: string) => {
    if (!detailCurves[key]) detailCurves[key] = genDetailCurve()
    return detailCurves[key]
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[#1a2654] bg-[#0d1233] p-3">

      {/* ── Header ── */}
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#f97316]" />
          <h3 className="text-sm font-semibold text-[#f97316]">{zh ? "告警日志" : "Alarm Log"}</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#7b8ab8]">
          <BellRing className="h-3.5 w-3.5 text-[#f97316]" />
          <span>{zh ? `${dateFiltered.length} 条` : `${dateFiltered.length} records`}</span>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <div className="mb-2 grid shrink-0 grid-cols-3 gap-2">
        <div className="rounded-lg bg-[#1a2654]/40 p-2 text-center">
          <div className="text-[10px] text-[#7b8ab8]">{zh ? "活动告警" : "Active"}</div>
          <div className="mt-0.5 text-lg font-semibold text-[#ef4444]">{activeCount}</div>
        </div>
        <div className="rounded-lg bg-[#1a2654]/40 p-2 text-center">
          <div className="text-[10px] text-[#7b8ab8]">{zh ? "已确认" : "Acknowledged"}</div>
          <div className="mt-0.5 text-lg font-semibold text-[#f97316]">{ackCount}</div>
        </div>
        <div className="rounded-lg bg-[#1a2654]/40 p-2 text-center">
          <div className="text-[10px] text-[#7b8ab8]">{zh ? "恢复率" : "Recovery"}</div>
          <div className="mt-0.5 text-lg font-semibold text-[#00d4aa]">{recoveryRate}%</div>
        </div>
      </div>

      {/* ── History: hourly distribution bar ── */}
      {mode === "history" && (
        <div className="mb-2 shrink-0">
          <div className="mb-1 flex items-center gap-1">
            <span className="text-[10px] text-[#5f79ad]">{zh ? "按小时分布" : "Hourly distribution"}</span>
          </div>
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={HOURLY_DIST} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barSize={6}>
                <XAxis dataKey="hour" tick={{ fill: "#5f79ad", fontSize: 8 }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={false} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TS} labelStyle={{ color: "#7b8ab8" }} labelFormatter={v => `${v}:00`}
                  formatter={(v: number, n: string) => [v, n]} />
                <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" />
                <Bar dataKey="major"    stackId="a" fill="#f97316" name="Major"    />
                <Bar dataKey="minor"    stackId="a" fill="#3b82f6" name="Minor"    radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── History: filter bar ── */}
      {mode === "history" && (
        <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-[#5f79ad]" />
          <div className="flex gap-1">
            {(["all", "critical", "major", "minor"] as LevelFilter[]).map(l => (
              <button key={l} onClick={() => setLevelFilter(l)}
                className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-all ${
                  levelFilter === l ? "bg-[#00d4aa] text-[#07162b]" : "bg-[#1a2654]/60 text-[#7b8ab8] hover:text-[#e8f4fc]"
                }`}>
                {l === "all" ? (zh ? "全部" : "All") : l.toUpperCase()}
              </button>
            ))}
          </div>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            className="rounded-md border border-[#1a2654] bg-[#101840] px-2 py-0.5 text-[10px] text-[#7b8ab8] focus:outline-none focus:border-[#00d4aa]">
            {sources.map(s => (
              <option key={s} value={s}>{s === "all" ? (zh ? "全部来源" : "All sources") : s}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Alarm list ── */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-[#1a2654]">
        {/* Header */}
        <div className="sticky top-0 z-10 grid grid-cols-[140px_72px_72px_1fr_72px] gap-2 bg-[#101840] px-3 py-2 text-[10px] text-[#7b8ab8]">
          <span>{zh ? "时间" : "Time"}</span>
          <span>{zh ? "等级" : "Level"}</span>
          <span>{zh ? "来源" : "Source"}</span>
          <span>{zh ? "告警内容" : "Message"}</span>
          <span>{zh ? "状态" : "Status"}</span>
        </div>

        <div className="divide-y divide-[#1a2654]/60">
          {displayed.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-[#5f79ad]">
              {zh ? "该日期无告警记录" : "No alarm records for this date"}
            </div>
          ) : displayed.map((log) => {
            const key = `${log.time}-${log.source}`
            const isExpanded = expandedRow === key
            const isUnrecovered = log.statusZh === "未恢复"
            const detailData = isExpanded ? getDetailCurve(key) : []

            return (
              <div key={key}>
                <div
                  onClick={() => mode === "history" ? setExpandedRow(isExpanded ? null : key) : undefined}
                  className={`grid grid-cols-[140px_72px_72px_1fr_72px] gap-2 px-3 py-2 text-sm text-[#e8f4fc] transition-colors ${
                    mode === "history" ? "cursor-pointer hover:bg-[#1a2654]/30" : ""
                  } ${isUnrecovered ? "bg-[#ef4444]/5" : ""}`}
                >
                  <span className="flex items-center gap-1.5 font-mono text-[10px] text-[#7b8ab8]">
                    {isUnrecovered && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#ef4444]" />}
                    {log.time.slice(11)}
                  </span>
                  <span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${LEVEL_STYLE[log.level]}`}>
                      {log.level.toUpperCase()}
                    </span>
                  </span>
                  <span className="text-xs text-[#22d3ee]">{log.source}</span>
                  <span className="text-xs">{zh ? log.msgZh : log.msgEn}</span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px]" style={{ color: STATUS_COLOR[zh ? log.statusZh : log.statusEn] }}>
                      {zh ? log.statusZh : log.statusEn}
                    </span>
                    {mode === "history" && (
                      isExpanded
                        ? <ChevronUp className="h-3 w-3 text-[#5f79ad]" />
                        : <ChevronDown className="h-3 w-3 text-[#5f79ad]" />
                    )}
                  </div>
                </div>

                {/* Expanded: ±5 min detail curves */}
                {isExpanded && (
                  <div className="border-t border-[#1a2654]/40 bg-[#0d1433]/60 px-3 py-2">
                    <div className="mb-1 text-[10px] text-[#5f79ad]">
                      {zh ? `${log.time} 前后 5 分钟 — 电压 & 温度` : `${log.time} ±5 min — Voltage & Temperature`}
                    </div>
                    <div className="h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={detailData} margin={{ top: 0, right: 8, left: -28, bottom: 0 }}>
                          <XAxis dataKey="t" tick={{ fill: "#5f79ad", fontSize: 8 }} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="v" domain={[3.28, 3.38]} tick={{ fill: "#22d3ee", fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={v => (v as number).toFixed(2)} />
                          <YAxis yAxisId="t" orientation="right" domain={[24, 40]} tick={{ fill: "#fbbf24", fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}°`} />
                          <Tooltip contentStyle={TS} labelStyle={{ color: "#7b8ab8" }} />
                          <Bar yAxisId="v" dataKey="voltage" name={zh ? "单体电压" : "Cell V"} fill="#22d3ee" opacity={0.7} radius={[2, 2, 0, 0]} />
                          <Bar yAxisId="t" dataKey="temp"    name={zh ? "温度"     : "Temp"}   fill="#fbbf24" opacity={0.7} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
