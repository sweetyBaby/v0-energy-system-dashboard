"use client"

import { useState } from "react"
import { Filter } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useLanguage } from "@/components/language-provider"

// ── 等级定义 ──────────────────────────────────────────────────────────────────
const LV_COLOR: Record<number, string> = {
  1: "#85B7EB", 2: "#378ADD", 3: "#EF9F27", 4: "#E24B4A", 5: "#A32D2D",
}
const LV_LABEL: Record<number, string> = {
  1: "Lv1 提示", 2: "Lv2 轻警", 3: "Lv3 预警", 4: "Lv4 严重", 5: "Lv5 紧急",
}
const GRP_LABEL: Record<string, string> = {
  pack: "组端", cell: "单体", current: "充放电", temp: "温度", soc: "SOC", comms: "通讯", other: "其他",
}
const ACTION_MAP: Record<number, { text: string; color: string }> = {
  5: { text: "断开+闭死",  color: "#E24B4A" },
  4: { text: "断接触器",  color: "#E24B4A" },
  3: { text: "降额运行",  color: "#BA7517" },
  2: { text: "记录上报",  color: "#378ADD" },
  1: { text: "记录日志",  color: "#6b7280" },
}

type AlarmEntry = {
  time: string
  lv: number
  group: string
  nameZh: string
  nameEn: string
  source: string
  triggerZh: string
  triggerEn: string
  ref: string
  rref: string
  unit: string
  statusZh: "未恢复" | "已确认" | "已恢复"
  statusEn: "Active" | "Acknowledged" | "Recovered"
}

const ALL_ALARMS: AlarmEntry[] = [
  { time:"2026-03-25 14:26:18", lv:5, group:"temp",    nameZh:"单体过温",         nameEn:"Cell Overtemp",         source:"BCU-03", triggerZh:"T3 温度过高",       triggerEn:"T3 temp too high",      ref:"54.0°C",  rref:"52.0°C",  unit:"°C",   statusZh:"未恢复",  statusEn:"Active"        },
  { time:"2026-03-25 13:08:44", lv:4, group:"cell",    nameZh:"压差越限",         nameEn:"Voltage Delta High",    source:"BCU-07", triggerZh:"压差超过阈值",      triggerEn:"Delta exceeded",        ref:"1100mV", rref:"1000mV", unit:"mV",   statusZh:"已确认",  statusEn:"Acknowledged"  },
  { time:"2026-03-25 10:42:06", lv:2, group:"comms",   nameZh:"PCS 通讯抖动",     nameEn:"PCS Comm Jitter",       source:"PCS-01", triggerZh:"通讯延迟超限",      triggerEn:"Comm delay exceeded",   ref:"200ms",  rref:"180ms",  unit:"ms",   statusZh:"已恢复",  statusEn:"Recovered"     },
  { time:"2026-03-25 08:17:31", lv:3, group:"temp",    nameZh:"温差不均衡",       nameEn:"Temp Imbalance",        source:"BCU-02", triggerZh:"T3 > 45°C",        triggerEn:"T3 > 45°C",             ref:"100℃",  rref:"95℃",   unit:"℃",   statusZh:"已恢复",  statusEn:"Recovered"     },
  { time:"2026-03-25 07:55:12", lv:2, group:"other",   nameZh:"调度指令超时",     nameEn:"Dispatch Timeout",      source:"EMS",    triggerZh:"指令超时未响应",    triggerEn:"Command no response",   ref:"5000ms", rref:"4500ms", unit:"ms",   statusZh:"已恢复",  statusEn:"Recovered"     },
  { time:"2026-03-25 03:44:02", lv:4, group:"soc",     nameZh:"SOC 过低保护",     nameEn:"Low SOC Protection",    source:"BCU-05", triggerZh:"SOC 低于保护值",   triggerEn:"SOC below protection",  ref:"10%",    rref:"15%",    unit:"%",    statusZh:"已确认",  statusEn:"Acknowledged"  },
  { time:"2026-03-25 02:09:58", lv:1, group:"cell",    nameZh:"均衡超时",         nameEn:"Balancing Timeout",     source:"BCU-01", triggerZh:"均衡未完成",        triggerEn:"Balancing incomplete",  ref:"120min", rref:"—",      unit:"min",  statusZh:"已恢复",  statusEn:"Recovered"     },
  { time:"2026-03-24 22:17:31", lv:3, group:"current", nameZh:"调度功率偏差",     nameEn:"Power Deviation",       source:"EMS",    triggerZh:"功率偏差超标",      triggerEn:"Power deviation high",  ref:"50kW",   rref:"40kW",   unit:"kW",   statusZh:"已确认",  statusEn:"Acknowledged"  },
  { time:"2026-03-24 18:33:05", lv:1, group:"cell",    nameZh:"电芯内阻偏高",     nameEn:"Cell Resistance High",  source:"BCU-06", triggerZh:"内阻超过基准值",    triggerEn:"Resistance exceeded",   ref:"3.5mΩ",  rref:"3.2mΩ",  unit:"mΩ",   statusZh:"已恢复",  statusEn:"Recovered"     },
  { time:"2026-03-24 15:02:44", lv:3, group:"cell",    nameZh:"单体压差 >40mV",   nameEn:"Cell Delta >40mV",      source:"BCU-04", triggerZh:"单体压差超限",      triggerEn:"Cell delta exceeded",   ref:"40mV",   rref:"35mV",   unit:"mV",   statusZh:"已恢复",  statusEn:"Recovered"     },
]

const HOURLY_DIST = Array.from({ length: 24 }, (_, h) => ({
  hour: String(h).padStart(2, "0"),
  lv45: [3, 14].includes(h) ? 1 : 0,
  lv3:  [8, 13, 22, 15].includes(h) ? 1 : 0,
  lv12: [10, 7, 2, 18].includes(h) ? 1 : 0,
}))

const TS = { backgroundColor: "#0d1233", border: "1px solid #1a2654", borderRadius: "8px" }

const STATUS_COLOR: Record<string, string> = {
  "未恢复": "#ef4444", "已确认": "#f97316", "已恢复": "#00d4aa",
  "Active": "#ef4444", "Acknowledged": "#f97316", "Recovered": "#00d4aa",
}

type LevelFilter = "all" | "lv45" | "lv3" | "lv12"

// ── 5 段严重度条 ──────────────────────────────────────────────────────────────
function SeverityBar({ lv }: { lv: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: i <= lv ? LV_COLOR[lv] : "#1a2654" }}
        />
      ))}
    </div>
  )
}

// ── 行 hover tooltip ───────────────────────────────────────────────────────────
function AlarmRow({ alarm, zh }: { alarm: AlarmEntry; zh: boolean }) {
  const [hovered, setHovered] = useState(false)
  const isActive = alarm.statusZh === "未恢复"
  const color = LV_COLOR[alarm.lv]
  const action = ACTION_MAP[alarm.lv]

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative border-b border-[#1a2654]/50 transition-colors last:border-0 ${
        alarm.lv >= 5 ? "bg-[#3a0e0e]/30" : "hover:bg-[#1a2654]/20"
      }`}
    >
      {/* 等级 */}
      <td className="py-2.5 pl-3 pr-2">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: alarm.lv >= 5 ? `0 0 0 2px ${color}44` : undefined,
            }}
          />
          <span className="whitespace-nowrap text-[11px] font-medium" style={{ color }}>
            {LV_LABEL[alarm.lv]}
          </span>
        </div>
      </td>

      {/* 告警名称 + tooltip */}
      <td className="relative max-w-0 py-2.5 pr-2">
        <span className="block truncate text-xs text-[#dbe8ff]">
          {isActive && (
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#ef4444] align-middle" />
          )}
          {zh ? alarm.nameZh : alarm.nameEn}
        </span>
        {/* Tooltip */}
        {hovered && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-[#1a2654] bg-[#0d1233] p-3 shadow-xl">
            <div className="mb-2 border-b border-[#1a2654] pb-2 text-xs font-semibold text-[#dbe8ff]">
              {zh ? alarm.nameZh : alarm.nameEn}
            </div>
            {[
              [zh ? "当前等级" : "Level",    <span style={{ color }}>{LV_LABEL[alarm.lv]}</span>],
              [zh ? "来源"     : "Source",   alarm.source],
              [zh ? "触发条件" : "Trigger",  zh ? alarm.triggerZh : alarm.triggerEn],
              [zh ? "触发阈值" : "Threshold",alarm.ref],
              [zh ? "恢复阈值" : "Recovery", alarm.rref],
              [zh ? "时间"     : "Time",     alarm.time],
            ].map(([label, val], i) => (
              <div key={i} className="flex justify-between gap-4 py-0.5 text-[11px]">
                <span className="text-[#7b8ab8]">{label as string}</span>
                <span className="font-medium text-[#dbe8ff]">{val as React.ReactNode}</span>
              </div>
            ))}
          </div>
        )}
      </td>

      {/* 分类 */}
      <td className="py-2.5 pr-2 text-[11px] text-[#7b8ab8]">
        {GRP_LABEL[alarm.group] ?? alarm.group}
      </td>

      {/* 严重度条 */}
      <td className="py-2.5 pr-2">
        <SeverityBar lv={alarm.lv} />
      </td>

      {/* 触发 / 恢复 */}
      <td className="py-2.5 pr-2 text-[11px] text-[#7b8ab8]">
        <span className="text-[#dbe8ff]">{alarm.ref}</span>
        {" / "}
        {alarm.rref}
      </td>

      {/* 状态 */}
      <td className="py-2.5 pr-2">
        <span className="text-[11px] font-medium" style={{ color: STATUS_COLOR[zh ? alarm.statusZh : alarm.statusEn] }}>
          {zh ? alarm.statusZh : alarm.statusEn}
        </span>
      </td>

      {/* 处置 */}
      <td className="py-2.5 pr-3 text-[11px] font-medium" style={{ color: action.color }}>
        {action.text}
      </td>
    </tr>
  )
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
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

  const filterDate = mode === "history" ? (date ?? "2026-03-25") : "2026-03-25"
  const dateFiltered = ALL_ALARMS.filter(a => a.time.startsWith(filterDate))

  const sorted = [...dateFiltered].sort((a, b) => {
    if (a.statusZh === "未恢复" && b.statusZh !== "未恢复") return -1
    if (b.statusZh === "未恢复" && a.statusZh !== "未恢复") return 1
    return b.lv - a.lv || b.time.localeCompare(a.time)
  })

  const displayed = sorted.filter(a => {
    const lvOk = levelFilter === "all"
      || (levelFilter === "lv45" && a.lv >= 4)
      || (levelFilter === "lv3"  && a.lv === 3)
      || (levelFilter === "lv12" && a.lv <= 2)
    const srcOk = sourceFilter === "all" || a.source === sourceFilter
    return lvOk && srcOk
  })

  const cnt = {
    total: dateFiltered.length,
    lv45:  dateFiltered.filter(a => a.lv >= 4).length,
    lv3:   dateFiltered.filter(a => a.lv === 3).length,
    lv12:  dateFiltered.filter(a => a.lv <= 2).length,
    active: dateFiltered.filter(a => a.statusZh === "未恢复").length,
  }

  const sources = ["all", ...Array.from(new Set(dateFiltered.map(a => a.source)))]

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[#1a2654] bg-[#0d1233] p-3">

      {/* ── Header + pills ── */}
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <div className="h-4 w-1 shrink-0 rounded-full bg-[#f97316]" />
        <span className="text-sm font-semibold text-[#f97316]">{zh ? "告警日志" : "Alarm Log"}</span>
        <span className="text-[11px] text-[#5f79ad]">{zh ? `最新 ${cnt.total} 条` : `Latest ${cnt.total}`}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {cnt.active > 0 && (
            <span className="rounded-full bg-[#3a0e0e] px-2 py-0.5 text-[10px] font-medium text-[#ef4444]">
              {zh ? `活动 ${cnt.active}` : `Active ${cnt.active}`}
            </span>
          )}
          {cnt.lv45 > 0 && (
            <span className="rounded-full bg-[#3a0e0e]/60 px-2 py-0.5 text-[10px] font-medium text-[#E24B4A]">
              {zh ? `严重 ${cnt.lv45}` : `Crit ${cnt.lv45}`}
            </span>
          )}
          {cnt.lv3 > 0 && (
            <span className="rounded-full bg-[#2a1a00]/80 px-2 py-0.5 text-[10px] font-medium text-[#EF9F27]">
              {zh ? `预警 ${cnt.lv3}` : `Warn ${cnt.lv3}`}
            </span>
          )}
          {cnt.lv12 > 0 && (
            <span className="rounded-full bg-[#0c1e35]/80 px-2 py-0.5 text-[10px] font-medium text-[#378ADD]">
              {zh ? `提示 ${cnt.lv12}` : `Info ${cnt.lv12}`}
            </span>
          )}
        </div>
      </div>

      {/* ── History only: hourly bar ── */}
      {mode === "history" && (
        <div className="mb-2 h-14 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={HOURLY_DIST} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barSize={5}>
              <XAxis dataKey="hour" tick={{ fill: "#5f79ad", fontSize: 8 }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TS} labelStyle={{ color: "#7b8ab8" }} labelFormatter={v => `${v}:00`}
                formatter={(v: number, n: string) => [v, n]} />
              <Bar dataKey="lv45" stackId="a" fill="#E24B4A" name="Lv4/5" />
              <Bar dataKey="lv3"  stackId="a" fill="#EF9F27" name="Lv3"   />
              <Bar dataKey="lv12" stackId="a" fill="#378ADD" name="Lv1/2" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Filter bar（实时 + 历史 均显示） ── */}
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-[#5f79ad]" />
        <div className="flex gap-1">
          {(["all", "lv45", "lv3", "lv12"] as LevelFilter[]).map(l => (
            <button key={l} onClick={() => setLevelFilter(l)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-all ${
                levelFilter === l ? "bg-[#00d4aa] text-[#07162b]" : "bg-[#1a2654]/60 text-[#7b8ab8] hover:text-[#e8f4fc]"
              }`}>
              {l === "all" ? (zh ? "全部" : "All") : l === "lv45" ? "严重" : l === "lv3" ? "预警" : "提示"}
            </button>
          ))}
        </div>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          style={{ colorScheme: "dark" }}
          className="rounded-md border border-[#1a2654] bg-[#101840] px-2 py-0.5 text-[10px] text-[#7b8ab8] focus:border-[#00d4aa] focus:outline-none">
          {sources.map(s => (
            <option key={s} value={s}>{s === "all" ? (zh ? "全部来源" : "All sources") : s}</option>
          ))}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-[#1a2654]/60">
        <table className="w-full border-collapse text-left" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "108px" }} />
            <col />
            <col style={{ width: "56px" }} />
            <col style={{ width: "72px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "60px" }} />
            <col style={{ width: "70px" }} />
          </colgroup>
          <thead>
            <tr className="sticky top-0 z-10 bg-[#101840]">
              {[
                zh ? "等级"     : "Level",
                zh ? "告警名称" : "Alarm",
                zh ? "分类"     : "Type",
                zh ? "严重度"   : "Severity",
                zh ? "触发 / 恢复" : "Trig / Recv",
                zh ? "状态"     : "Status",
                zh ? "处置"     : "Action",
              ].map(h => (
                <th key={h} className="border-b border-[#1a2654] px-2 py-2 text-left text-[10px] font-medium text-[#7b8ab8] first:pl-3 last:pr-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-[#5f79ad]">
                  {zh ? "该日期无告警记录" : "No alarm records"}
                </td>
              </tr>
            ) : displayed.map(alarm => (
              <AlarmRow
                key={`${alarm.time}-${alarm.source}`}
                alarm={alarm}
                zh={zh}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
