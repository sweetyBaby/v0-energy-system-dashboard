"use client"

import { useRef, useState } from "react"
import { BarChart2, Filter, List } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

// ── 等级定义 ──────────────────────────────────────────────────────────────────
const LV_COLOR: Record<number, string> = {
  1: "#85B7EB", 2: "#378ADD", 3: "#EF9F27", 4: "#E24B4A", 5: "#A32D2D",
}
// 高亮色：饱和度高、色相鲜明，用于矩阵数字（绝不趋近于白色）
const LV_BRIGHT: Record<number, string> = {
  1: "#60a8f0", 2: "#3a9cff", 3: "#ffb020", 4: "#ff6040", 5: "#ff3838",
}
const LV_LABEL: Record<number, string> = {
  1: "Lv1 提示", 2: "Lv2 轻警", 3: "Lv3 预警", 4: "Lv4 严重", 5: "Lv5 紧急",
}
const GRP_LABEL: Record<string, string> = {
  pack: "组端", cell: "单体", current: "充放电", temp: "温度", soc: "SOC", comms: "通讯", other: "其他",
}
const ACTION_MAP: Record<number, { text: string; color: string }> = {
  5: { text: "断开+闭死", color: "#E24B4A" },
  4: { text: "断接触器",  color: "#E24B4A" },
  3: { text: "降额运行",  color: "#BA7517" },
  2: { text: "记录上报",  color: "#378ADD" },
  1: { text: "记录日志",  color: "#6b7280" },
}

// duration：告警持续分钟数，同时驱动甘特图条宽
type AlarmEntry = {
  time: string; duration: number
  lv: number; group: string
  nameZh: string; nameEn: string; source: string
  triggerZh: string; triggerEn: string
  ref: string; rref: string; unit: string
  statusZh: "未恢复" | "已确认" | "已恢复"
  statusEn: "Active" | "Acknowledged" | "Recovered"
}

// ── 统一数据源：甘特图与告警表格共用同一份数据 ───────────────────────────────
// 2026-03-25 共 17 条，覆盖全部 8 种告警类型，与甘特纵轴完全对应
const ALL_ALARMS: AlarmEntry[] = [
  // 过压保护 × 2
  { time:"2026-03-25 08:00:00", duration:40, lv:4, group:"cell",    nameZh:"过压保护", nameEn:"Overvolt Protection",  source:"BCU-03", triggerZh:"单体电压超上限",    triggerEn:"Cell above max volt",    ref:"3.75V",  rref:"3.65V",  unit:"V",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-25 15:00:00", duration:25, lv:4, group:"cell",    nameZh:"过压保护", nameEn:"Overvolt Protection",  source:"BCU-01", triggerZh:"单体电压超上限",    triggerEn:"Cell above max volt",    ref:"3.76V",  rref:"3.65V",  unit:"V",   statusZh:"已确认", statusEn:"Acknowledged" },
  // 欠压告警 × 2
  { time:"2026-03-25 08:30:00", duration:40, lv:3, group:"cell",    nameZh:"欠压告警", nameEn:"Undervolt Alarm",      source:"BCU-07", triggerZh:"单体电压低于预警值", triggerEn:"Cell below warn level",  ref:"3.10V",  rref:"3.15V",  unit:"V",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-25 12:30:00", duration:55, lv:3, group:"cell",    nameZh:"欠压告警", nameEn:"Undervolt Alarm",      source:"BCU-05", triggerZh:"单体电压低于预警值", triggerEn:"Cell below warn level",  ref:"3.08V",  rref:"3.15V",  unit:"V",   statusZh:"已恢复", statusEn:"Recovered"    },
  // 过流报警 × 1
  { time:"2026-03-25 10:00:00", duration:40, lv:4, group:"current", nameZh:"过流报警", nameEn:"Overcurrent Alarm",    source:"BCU-04", triggerZh:"放电电流超额定",    triggerEn:"Discharge over rated",   ref:"310A",   rref:"300A",   unit:"A",   statusZh:"已恢复", statusEn:"Recovered"    },
  // 温度异常 × 3
  { time:"2026-03-25 02:10:00", duration:40, lv:3, group:"temp",    nameZh:"温度异常", nameEn:"Temp Anomaly",         source:"BCU-01", triggerZh:"温度梯度超限",      triggerEn:"Temp gradient high",     ref:"10°C",   rref:"8°C",    unit:"°C",  statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-25 11:00:00", duration:65, lv:3, group:"temp",    nameZh:"温度异常", nameEn:"Temp Anomaly",         source:"BCU-02", triggerZh:"温度梯度超限",      triggerEn:"Temp gradient high",     ref:"12°C",   rref:"8°C",    unit:"°C",  statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-25 14:30:00", duration:30, lv:3, group:"temp",    nameZh:"温度异常", nameEn:"Temp Anomaly",         source:"BCU-06", triggerZh:"温度梯度超限",      triggerEn:"Temp gradient high",     ref:"11°C",   rref:"8°C",    unit:"°C",  statusZh:"已恢复", statusEn:"Recovered"    },
  // 通信中断 × 4
  { time:"2026-03-25 08:45:00", duration:30, lv:2, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",     source:"PCS-01", triggerZh:"通讯链路异常",      triggerEn:"Link error",             ref:"—",      rref:"—",      unit:"—",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-25 12:45:00", duration:30, lv:2, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",     source:"BCU-07", triggerZh:"通讯链路异常",      triggerEn:"Link error",             ref:"—",      rref:"—",      unit:"—",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-25 16:15:00", duration:30, lv:2, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",     source:"BCU-03", triggerZh:"通讯链路异常",      triggerEn:"Link error",             ref:"—",      rref:"—",      unit:"—",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-25 22:30:00", duration:40, lv:2, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",     source:"EMS",    triggerZh:"通讯链路异常",      triggerEn:"Link error",             ref:"—",      rref:"—",      unit:"—",   statusZh:"已恢复", statusEn:"Recovered"    },
  // SOC过低 × 2
  { time:"2026-03-25 03:30:00", duration:40, lv:2, group:"soc",     nameZh:"SOC过低",  nameEn:"SOC Low",              source:"BCU-05", triggerZh:"SOC 低于警戒值",    triggerEn:"SOC below warning",      ref:"12%",    rref:"15%",    unit:"%",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-25 11:30:00", duration:40, lv:2, group:"soc",     nameZh:"SOC过低",  nameEn:"SOC Low",              source:"BCU-05", triggerZh:"SOC 低于警戒值",    triggerEn:"SOC below warning",      ref:"11%",    rref:"15%",    unit:"%",   statusZh:"已恢复", statusEn:"Recovered"    },
  // 绝缘故障 × 1
  { time:"2026-03-25 13:00:00", duration:30, lv:4, group:"other",   nameZh:"绝缘故障", nameEn:"Insulation Fault",     source:"BCU-02", triggerZh:"绝缘阻抗骤降",      triggerEn:"Insulation sudden drop", ref:"45kΩ",   rref:"100kΩ",  unit:"kΩ",  statusZh:"已确认", statusEn:"Acknowledged" },
  // 风扇故障 × 2
  { time:"2026-03-25 14:45:00", duration:60, lv:3, group:"temp",    nameZh:"风扇故障", nameEn:"Fan Fault",            source:"BCU-06", triggerZh:"风扇转速异常",      triggerEn:"Fan speed abnormal",     ref:"—",      rref:"—",      unit:"—",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-25 20:15:00", duration:40, lv:3, group:"temp",    nameZh:"风扇故障", nameEn:"Fan Fault",            source:"BCU-04", triggerZh:"风扇转速异常",      triggerEn:"Fan speed abnormal",     ref:"—",      rref:"—",      unit:"—",   statusZh:"已恢复", statusEn:"Recovered"    },
  // ── 2026-03-26（默认历史日期，30 条，8 种类型 × Lv1-5 全覆盖）──
  // 过压保护 × 4  (Lv5, Lv4, Lv3, Lv4)
  { time:"2026-03-26 01:30:00", duration:35, lv:5, group:"cell",    nameZh:"过压保护", nameEn:"Overvolt Protection",  source:"BCU-03", triggerZh:"单体电压严重超上限",    triggerEn:"Cell severely over max",   ref:"3.90V",  rref:"3.65V",  unit:"V",   statusZh:"已确认", statusEn:"Acknowledged" },
  { time:"2026-03-26 07:00:00", duration:40, lv:4, group:"cell",    nameZh:"过压保护", nameEn:"Overvolt Protection",  source:"BCU-01", triggerZh:"单体电压超上限",        triggerEn:"Cell above max volt",      ref:"3.78V",  rref:"3.65V",  unit:"V",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 13:15:00", duration:25, lv:3, group:"cell",    nameZh:"过压保护", nameEn:"Overvolt Protection",  source:"BCU-05", triggerZh:"单体电压超预警线",      triggerEn:"Cell above warn level",    ref:"3.70V",  rref:"3.65V",  unit:"V",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 19:45:00", duration:30, lv:4, group:"cell",    nameZh:"过压保护", nameEn:"Overvolt Protection",  source:"BCU-07", triggerZh:"单体电压超上限",        triggerEn:"Cell above max volt",      ref:"3.77V",  rref:"3.65V",  unit:"V",   statusZh:"已恢复", statusEn:"Recovered"    },
  // 欠压告警 × 4  (Lv1, Lv3, Lv4, Lv2)
  { time:"2026-03-26 02:45:00", duration:30, lv:1, group:"cell",    nameZh:"欠压告警", nameEn:"Undervolt Alarm",      source:"BCU-08", triggerZh:"单体电压低于提示值",    triggerEn:"Cell below notice level",  ref:"3.20V",  rref:"3.15V",  unit:"V",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 09:20:00", duration:45, lv:3, group:"cell",    nameZh:"欠压告警", nameEn:"Undervolt Alarm",      source:"BCU-02", triggerZh:"单体电压低于预警值",    triggerEn:"Cell below warn level",    ref:"3.08V",  rref:"3.15V",  unit:"V",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 15:30:00", duration:55, lv:4, group:"cell",    nameZh:"欠压告警", nameEn:"Undervolt Alarm",      source:"BCU-04", triggerZh:"单体电压低于保护值",    triggerEn:"Cell below protect level", ref:"2.90V",  rref:"3.00V",  unit:"V",   statusZh:"已确认", statusEn:"Acknowledged" },
  { time:"2026-03-26 21:10:00", duration:25, lv:2, group:"cell",    nameZh:"欠压告警", nameEn:"Undervolt Alarm",      source:"BCU-06", triggerZh:"单体电压低于轻警值",    triggerEn:"Cell below light warn",    ref:"3.12V",  rref:"3.15V",  unit:"V",   statusZh:"已恢复", statusEn:"Recovered"    },
  // 过流报警 × 4  (Lv3, Lv5, Lv4, Lv3)
  { time:"2026-03-26 04:15:00", duration:50, lv:3, group:"current", nameZh:"过流报警", nameEn:"Overcurrent Alarm",    source:"BCU-04", triggerZh:"放电电流超额定",        triggerEn:"Discharge over rated",     ref:"305A",   rref:"300A",   unit:"A",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 10:30:00", duration:35, lv:5, group:"current", nameZh:"过流报警", nameEn:"Overcurrent Alarm",    source:"BCU-02", triggerZh:"电流严重超限触发断路",  triggerEn:"Severe overcurrent trip",  ref:"380A",   rref:"300A",   unit:"A",   statusZh:"已确认", statusEn:"Acknowledged" },
  { time:"2026-03-26 16:00:00", duration:40, lv:4, group:"current", nameZh:"过流报警", nameEn:"Overcurrent Alarm",    source:"BCU-06", triggerZh:"充电电流超额定",        triggerEn:"Charge over rated",        ref:"320A",   rref:"300A",   unit:"A",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 22:45:00", duration:30, lv:3, group:"current", nameZh:"过流报警", nameEn:"Overcurrent Alarm",    source:"EMS",    triggerZh:"调度功率超限",          triggerEn:"Dispatch power exceeded",  ref:"55kW",   rref:"50kW",   unit:"kW",  statusZh:"已恢复", statusEn:"Recovered"    },
  // 温度异常 × 5  (Lv1, Lv2, Lv3, Lv4, Lv3)
  { time:"2026-03-26 00:30:00", duration:60, lv:1, group:"temp",    nameZh:"温度异常", nameEn:"Temp Anomaly",         source:"BCU-01", triggerZh:"温度轻微偏高",          triggerEn:"Temp slightly high",       ref:"36°C",   rref:"35°C",   unit:"°C",  statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 05:00:00", duration:45, lv:2, group:"temp",    nameZh:"温度异常", nameEn:"Temp Anomaly",         source:"BCU-03", triggerZh:"温度梯度偏高",          triggerEn:"Temp gradient elevated",   ref:"9°C",    rref:"8°C",    unit:"°C",  statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 11:30:00", duration:70, lv:3, group:"temp",    nameZh:"温度异常", nameEn:"Temp Anomaly",         source:"BCU-05", triggerZh:"温度梯度超限",          triggerEn:"Temp gradient high",       ref:"12°C",   rref:"8°C",    unit:"°C",  statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 17:15:00", duration:35, lv:4, group:"temp",    nameZh:"温度异常", nameEn:"Temp Anomaly",         source:"BCU-07", triggerZh:"单体温度超严重阈值",    triggerEn:"Cell temp over severe",    ref:"52°C",   rref:"48°C",   unit:"°C",  statusZh:"已确认", statusEn:"Acknowledged" },
  { time:"2026-03-26 23:00:00", duration:40, lv:3, group:"temp",    nameZh:"温度异常", nameEn:"Temp Anomaly",         source:"BCU-08", triggerZh:"温度梯度超限",          triggerEn:"Temp gradient high",       ref:"11°C",   rref:"8°C",    unit:"°C",  statusZh:"已恢复", statusEn:"Recovered"    },
  // 通信中断 × 5  (Lv1, Lv2, Lv2, Lv3, Lv1)
  { time:"2026-03-26 03:00:00", duration:20, lv:1, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",     source:"BCU-02", triggerZh:"心跳包短暂丢失",        triggerEn:"Heartbeat briefly lost",   ref:"—",      rref:"—",      unit:"—",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 08:30:00", duration:25, lv:2, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",     source:"PCS-01", triggerZh:"通讯延迟超限",          triggerEn:"Comm delay exceeded",      ref:"200ms",  rref:"180ms",  unit:"ms",  statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 12:00:00", duration:30, lv:2, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",     source:"BCU-04", triggerZh:"通讯链路异常",          triggerEn:"Link error",               ref:"—",      rref:"—",      unit:"—",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 18:45:00", duration:35, lv:3, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",     source:"EMS",    triggerZh:"EMS 通讯超时",          triggerEn:"EMS comm timeout",         ref:"5s",     rref:"3s",     unit:"s",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 23:30:00", duration:25, lv:1, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",     source:"BCU-06", triggerZh:"心跳包短暂丢失",        triggerEn:"Heartbeat briefly lost",   ref:"—",      rref:"—",      unit:"—",   statusZh:"已恢复", statusEn:"Recovered"    },
  // SOC过低 × 3  (Lv2, Lv3, Lv4)
  { time:"2026-03-26 06:30:00", duration:45, lv:2, group:"soc",     nameZh:"SOC过低",  nameEn:"SOC Low",              source:"BCU-05", triggerZh:"SOC 低于警戒值",        triggerEn:"SOC below warning",        ref:"14%",    rref:"15%",    unit:"%",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 14:00:00", duration:50, lv:3, group:"soc",     nameZh:"SOC过低",  nameEn:"SOC Low",              source:"BCU-01", triggerZh:"SOC 低于预警值",        triggerEn:"SOC below alert",          ref:"11%",    rref:"15%",    unit:"%",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 20:30:00", duration:55, lv:4, group:"soc",     nameZh:"SOC过低",  nameEn:"SOC Low",              source:"BCU-03", triggerZh:"SOC 低于保护值",        triggerEn:"SOC below protection",     ref:"8%",     rref:"10%",    unit:"%",   statusZh:"已确认", statusEn:"Acknowledged" },
  // 绝缘故障 × 3  (Lv3, Lv4, Lv5)
  { time:"2026-03-26 03:45:00", duration:30, lv:3, group:"other",   nameZh:"绝缘故障", nameEn:"Insulation Fault",     source:"BCU-01", triggerZh:"绝缘阻抗低于预警值",    triggerEn:"Insulation below warn",    ref:"70kΩ",   rref:"100kΩ",  unit:"kΩ",  statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 12:30:00", duration:40, lv:4, group:"other",   nameZh:"绝缘故障", nameEn:"Insulation Fault",     source:"BCU-07", triggerZh:"绝缘阻抗骤降",          triggerEn:"Insulation sudden drop",   ref:"50kΩ",   rref:"100kΩ",  unit:"kΩ",  statusZh:"已确认", statusEn:"Acknowledged" },
  { time:"2026-03-26 20:00:00", duration:35, lv:5, group:"other",   nameZh:"绝缘故障", nameEn:"Insulation Fault",     source:"BCU-05", triggerZh:"绝缘故障触发断路",      triggerEn:"Insulation fault trip",    ref:"20kΩ",   rref:"100kΩ",  unit:"kΩ",  statusZh:"未恢复", statusEn:"Active"       },
  // 风扇故障 × 2  (Lv2, Lv3)
  { time:"2026-03-26 09:00:00", duration:55, lv:2, group:"temp",    nameZh:"风扇故障", nameEn:"Fan Fault",            source:"BCU-03", triggerZh:"风扇转速偏低",          triggerEn:"Fan speed low",            ref:"—",      rref:"—",      unit:"—",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-26 17:00:00", duration:50, lv:3, group:"temp",    nameZh:"风扇故障", nameEn:"Fan Fault",            source:"BCU-06", triggerZh:"风扇转速异常",          triggerEn:"Fan speed abnormal",       ref:"—",      rref:"—",      unit:"—",   statusZh:"已恢复", statusEn:"Recovered"    },
  // ── 2026-03-24 ──
  { time:"2026-03-24 22:17:00", duration:35, lv:3, group:"current", nameZh:"过流报警", nameEn:"Overcurrent Alarm",    source:"EMS",    triggerZh:"功率偏差超标",      triggerEn:"Power deviation high",   ref:"50kW",   rref:"40kW",   unit:"kW",  statusZh:"已确认", statusEn:"Acknowledged" },
  { time:"2026-03-24 18:33:00", duration:20, lv:1, group:"cell",    nameZh:"欠压告警", nameEn:"Undervolt Alarm",      source:"BCU-06", triggerZh:"内阻超过基准值",    triggerEn:"Resistance exceeded",    ref:"3.5mΩ",  rref:"3.2mΩ",  unit:"mΩ",  statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-24 15:02:00", duration:30, lv:3, group:"cell",    nameZh:"过压保护", nameEn:"Overvolt Protection",  source:"BCU-04", triggerZh:"单体压差超限",      triggerEn:"Cell delta exceeded",    ref:"40mV",   rref:"35mV",   unit:"mV",  statusZh:"已恢复", statusEn:"Recovered"    },
]

const STATUS_COLOR: Record<string, string> = {
  "未恢复": "#ef4444", "已确认": "#f97316", "已恢复": "#00d4aa",
  "Active": "#ef4444", "Acknowledged": "#f97316", "Recovered": "#00d4aa",
}

type LevelFilter = "all" | "lv45" | "lv3" | "lv12"

// ── 从 AlarmEntry[] 派生甘特事件（统一数据源）────────────────────────────────
type TimelineEvent = { type: string; start: number; end: number; lv: number }

function deriveTimelineEvents(alarms: AlarmEntry[]): TimelineEvent[] {
  return alarms.map(a => {
    const [, timePart] = a.time.split(" ")
    const [h, m] = timePart.split(":").map(Number)
    const start = h * 60 + m
    return { type: a.nameZh, start, end: start + a.duration, lv: a.lv }
  })
}

const LEFT_W  = 64
const DAY_MIN = 24 * 60

// ── 甘特时间轴（拖动平移 + 滚轮缩放，始终铺满容器，无横向滚动条） ─────────────
function AlarmTimeline({ events }: { events: TimelineEvent[] }) {
  const [viewStart, setViewStart] = useState(0)
  const [viewEnd,   setViewEnd]   = useState(DAY_MIN)
  const [tooltip, setTooltip]     = useState<{ ev: TimelineEvent; mx: number; my: number } | null>(null)
  const containerRef              = useRef<HTMLDivElement>(null)

  const span   = viewEnd - viewStart
  const zoomed = span < DAY_MIN
  const types  = Array.from(new Set(events.map(e => e.type)))

  const fmt = (min: number) => {
    const h = Math.floor(min / 60) % 24, m = min % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }
  const pct = (min: number) => `${((min - viewStart) / span) * 100}%`

  const tickStep = span <= 120 ? 60 : span <= 240 ? 120 : span <= 480 ? 180 : 360
  const ticks    = Array.from({ length: Math.ceil(DAY_MIN / tickStep) + 1 }, (_, i) => i * tickStep)
    .filter(m => m >= viewStart && m <= viewEnd)

  // 滚轮缩放
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const rect   = e.currentTarget.getBoundingClientRect()
    const ratio  = (e.clientX - rect.left) / rect.width
    const center = viewStart + ratio * span
    const factor  = e.deltaY < 0 ? 0.7 : 1 / 0.7
    const newSpan = Math.max(60, Math.min(DAY_MIN, span * factor))
    const s = Math.max(0, Math.min(DAY_MIN - newSpan, center - ratio * newSpan))
    setViewStart(Math.round(s))
    setViewEnd(Math.round(s + newSpan))
  }

  // 拖动平移（绑定到 window，鼠标离开容器仍追踪）
  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    e.preventDefault()
    const startX   = e.clientX
    const initVs   = viewStart
    const initSpan = span
    const totalW   = containerRef.current.getBoundingClientRect().width
    const onMove = (ev: MouseEvent) => {
      const dx = ((startX - ev.clientX) / totalW) * initSpan
      const s  = Math.max(0, Math.min(DAY_MIN - initSpan, initVs + dx))
      setViewStart(Math.round(s))
      setViewEnd(Math.round(s + initSpan))
    }
    const onUp = () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup",   onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup",   onUp)
  }

  return (
    <div className="select-none flex h-full flex-col rounded-lg border border-[#1a3060] bg-[#080e28]/70 px-3 py-2">
      {/* 图例 + 视窗范围提示 */}
      <div className="mb-2 flex shrink-0 items-center gap-3 px-1">
        {([
          { label: "严重", c: "#E24B4A" },
          { label: "预警", c: "#EF9F27" },
          { label: "提示", c: "#378ADD" },
        ]).map(g => (
          <div key={g.label} className="flex items-center gap-1.5">
            <div className="h-2.5 w-5 rounded-sm" style={{ background: g.c, boxShadow: `0 0 5px ${g.c}66` }} />
            <span className="text-[11px] font-medium text-[#c8deff]">{g.label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-3">
          {zoomed && (
            <span className="text-[11px] font-semibold text-[#7dd3fc]">{fmt(viewStart)} – {fmt(viewEnd)}</span>
          )}
          <span className="rounded-md border border-[#2a4a80]/60 bg-[#0d1a3a]/80 px-2.5 py-0.5 text-[11px] font-medium text-[#60a0ff]"
            style={{ textShadow: "0 0 8px rgba(96,160,255,0.5)" }}>
            ⇕ 滚轮缩放 &nbsp;⇔ 拖动平移
          </span>
        </div>
      </div>

      {/* 标签列 + 时间轴（flex-1 自动撑满剩余高度） */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 左侧类型标签 */}
        <div className="flex shrink-0 flex-col" style={{ width: LEFT_W }}>
          <div className="shrink-0" style={{ height: 18 }} />
          {types.map(type => (
            <div key={type}
              className="flex min-h-[20px] flex-1 items-center justify-end pr-2 text-right text-[11px] font-medium text-[#a8c4f0]"
              style={{ textShadow: "0 0 6px rgba(100,160,255,0.35)" }}>
              {type}
            </div>
          ))}
        </div>

        {/* 右侧时间轴区域 */}
        <div
          ref={containerRef}
          className={`flex min-w-0 flex-1 flex-col overflow-hidden ${zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
          onWheel={handleWheel}
          onMouseDown={startDrag}
        >
          {/* 时间刻度行 */}
          <div className="relative shrink-0" style={{ height: 18 }}>
            {ticks.map(m => (
              <span key={m}
                className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-[#7ab0f0]"
                style={{ left: pct(m) }}>
                {fmt(m)}
              </span>
            ))}
          </div>

          {/* 事件行 */}
          {types.map(type => (
            <div key={type} className="relative min-h-[20px] flex-1">
              {/* 网格竖线 */}
              {ticks.map(m => (
                <div key={m} className="absolute inset-y-0 w-px bg-[#1a2e5a]/50" style={{ left: pct(m) }} />
              ))}
              {/* 行底部分隔线 */}
              <div className="absolute inset-x-0 bottom-0 h-px bg-[#1a2654]/30" />
              {events
                .filter(ev => ev.type === type && ev.end > viewStart && ev.start < viewEnd)
                .map((ev, i) => {
                  const cs = Math.max(ev.start, viewStart)
                  const ce = Math.min(ev.end,   viewEnd)
                  return (
                    <div key={i}
                      className="absolute top-1/2 -translate-y-1/2 cursor-pointer rounded opacity-80 transition-opacity hover:opacity-100"
                      style={{
                        left:   pct(cs),
                        width:  `${((ce - cs) / span) * 100}%`,
                        minWidth: 4,
                        height: 13,
                        backgroundColor: LV_COLOR[ev.lv],
                        boxShadow: `0 0 6px ${LV_COLOR[ev.lv]}70`,
                      }}
                      onMouseMove={e => { e.stopPropagation(); setTooltip({ ev, mx: e.clientX, my: e.clientY }) }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  )
                })}
            </div>
          ))}
        </div>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-[200] rounded-lg border border-[#1e3a70] bg-[#0a1535] px-3 py-2.5 text-[12px] shadow-2xl"
          style={{ left: tooltip.mx + 14, top: tooltip.my - 8, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
        >
          <div className="mb-1.5 font-bold" style={{ color: LV_COLOR[tooltip.ev.lv], textShadow: `0 0 8px ${LV_COLOR[tooltip.ev.lv]}80` }}>
            {tooltip.ev.type} · {LV_LABEL[tooltip.ev.lv]}
          </div>
          <div className="space-y-1 text-[#8a9ec8]">
            <div className="text-[11px]">{fmt(tooltip.ev.start)} — {fmt(tooltip.ev.end)}</div>
            <div className="text-[11px]">持续 <span className="font-semibold text-[#c8deff]">{tooltip.ev.end - tooltip.ev.start} 分钟</span></div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 告警类型 × 等级 二维统计 ─────────────────────────────────────────────────
const LEVELS = [1, 2, 3, 4, 5] as const

function AlarmTypeStats({ alarms }: { alarms: AlarmEntry[] }) {
  const total = alarms.length
  if (total === 0) return null
  const fmtPct = (count: number) => `${((count / total) * 100).toFixed(2)}%`
  // 收集所有出现的类型，按总数降序
  const typeOrder: string[] = []
  const typeTotals = new Map<string, number>()
  alarms.forEach(a => {
    typeTotals.set(a.nameZh, (typeTotals.get(a.nameZh) ?? 0) + 1)
    if (!typeOrder.includes(a.nameZh)) typeOrder.push(a.nameZh)
  })
  typeOrder.sort((a, b) => (typeTotals.get(b) ?? 0) - (typeTotals.get(a) ?? 0))

  // 矩阵：matrix[type][lv] = count
  const matrix = new Map<string, Map<number, number>>()
  typeOrder.forEach(t => matrix.set(t, new Map()))
  alarms.forEach(a => {
    const row = matrix.get(a.nameZh)!
    row.set(a.lv, (row.get(a.lv) ?? 0) + 1)
  })

  // 列合计（每个等级的总数）
  const lvTotals = LEVELS.map(lv => alarms.filter(a => a.lv === lv).length)

  // 每列最大值（用于热力着色基准）
  const lvMax = LEVELS.map(lv => Math.max(...typeOrder.map(t => matrix.get(t)!.get(lv) ?? 0), 1))

  return (
    <div className="shrink-0 rounded-lg border border-[#1a3060] bg-[#070d20]/80 px-3 py-2">

      {/* ── 标题行 ── */}
      <div className="mb-2 flex items-center gap-2">
        <div className="h-3.5 w-[3px] rounded-full bg-[#00d4aa]" style={{ boxShadow: "0 0 6px #00d4aa80" }} />
        <span className="text-[12px] font-bold tracking-wide text-[#cfe3ff] [text-shadow:0_0_10px_rgba(124,170,255,0.15)]">告警分布矩阵</span>
        
      </div>

      {/* ── 类型 × 等级 矩阵 ── */}
      <div className="w-full">
        {/* 表头 */}
        <div className="mb-0.5 flex items-center">
          <div className="w-[66px] shrink-0" />
          {LEVELS.map((lv, i) => (
            <div key={lv} className="flex-1 text-center">
              <span
                className="text-[11px] font-bold tabular-nums tracking-[0.02em]"
                style={{
                  color: lvTotals[i] > 0 ? LV_BRIGHT[lv] : "#2a3a5a",
                  textShadow: lvTotals[i] > 0 ? `0 0 10px ${LV_COLOR[lv]}45` : "none",
                }}
              >
                Lv{lv}
              </span>
            </div>
          ))}
          <div className="w-[52px] shrink-0 pr-1 text-right">
            <span className="text-[11px] font-semibold text-[#a7c7ff] [text-shadow:0_0_10px_rgba(98,154,255,0.15)]">合计</span>
          </div>
        </div>

        {/* 数据行 */}
        {typeOrder.map(typeName => {
          const row = matrix.get(typeName)!
          const rowTotal = typeTotals.get(typeName) ?? 0
          const rowPct = fmtPct(rowTotal)
          const rowMaxLv = Math.max(...Array.from(row.keys()))
          return (
            <div key={typeName} className="mb-[3px] flex items-center">
              {/* 类型名 */}
              <div className="w-[66px] shrink-0 flex items-center gap-1.5 pr-1.5">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: LV_COLOR[rowMaxLv], boxShadow: `0 0 5px ${LV_COLOR[rowMaxLv]}` }}
                />
                <span className="truncate text-[11px] font-medium text-[#d7e6ff]">{typeName}</span>
              </div>

              {/* 各等级单元格 */}
              {LEVELS.map((lv, i) => {
                const cnt = row.get(lv) ?? 0
                const cellPct = fmtPct(cnt)
                const intensity = cnt > 0 ? 0.2 + (cnt / lvMax[i]) * 0.42 : 0
                return (
                  <div key={lv} className="flex-1 flex items-center justify-center" style={{ height: 26 }}>
                    <div
                      className="mx-[1px] flex h-[24px] w-full flex-col items-center justify-center rounded-sm"
                      style={{
                        background: cnt > 0
                          ? `linear-gradient(135deg, rgba(${hexToRgb(LV_COLOR[lv])}, ${0.22 + intensity * 0.45}), rgba(${hexToRgb(LV_COLOR[lv])}, ${0.12 + intensity * 0.2}))`
                          : "linear-gradient(180deg, rgba(10,18,40,0.4), rgba(10,18,40,0.24))",
                        border: cnt > 0 ? `1px solid ${LV_COLOR[lv]}88` : "1px solid #1a2850/30",
                        boxShadow: cnt > 0 ? `inset 0 0 14px rgba(255,255,255,0.03), 0 0 12px ${LV_COLOR[lv]}18` : "none",
                      }}
                    >
                      {cnt > 0 ? (
                        <>
                          <span
                            className="text-[12px] font-bold tabular-nums leading-none"
                            style={{ color: LV_BRIGHT[lv], textShadow: `0 0 10px ${LV_COLOR[lv]}aa` }}
                          >
                            {cnt}
                          </span>
                          <span
                            className="mt-[2px] text-[10px] font-semibold tabular-nums leading-none"
                            style={{ color: LV_BRIGHT[lv], textShadow: `0 0 8px ${LV_COLOR[lv]}35` }}
                          >
                            +{cellPct}
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-[#32456f]">·</span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* 行合计 */}
              <div className="w-[52px] shrink-0 flex flex-col items-end pl-2">
                <span
                  className="text-[13px] font-bold tabular-nums leading-none"
                  style={{ color: LV_BRIGHT[rowMaxLv], textShadow: `0 0 10px ${LV_COLOR[rowMaxLv]}aa` }}
                >
                  {rowTotal}
                </span>
                <span
                  className="mt-[2px] text-[10px] font-semibold tabular-nums leading-none"
                  style={{ color: LV_COLOR[rowMaxLv] }}
                >
                  {rowPct}%
                </span>
              </div>
            </div>
          )
        })}

        {/* 列小计行 */}
        <div className="mt-1 flex items-start border-t border-[#1e3870]/60 pt-1">
          <div className="w-[66px] shrink-0 flex items-center">
            <span className="text-[11px] font-bold text-[#a7c7ff]">小计</span>
          </div>
          {LEVELS.map((lv, i) => (
            <div key={lv} className="flex-1 flex flex-col items-center gap-[4px]">
              {lvTotals[i] > 0 ? (
                <>
                  <span
                    className="text-[13px] font-bold tabular-nums leading-none"
                    style={{ color: LV_BRIGHT[lv], textShadow: `0 0 10px ${LV_COLOR[lv]}aa` }}
                  >
                    {lvTotals[i]}
                  </span>
                  <span
                    className="text-[10px] font-semibold tabular-nums leading-none"
                    style={{ color: LV_COLOR[lv] }}
                  >
                    +{(lvTotals[i] / total * 100).toFixed(0)}%
                  </span>
                </>
              ) : (
                <span className="text-[11px] text-[#32456f]">·</span>
              )}
            </div>
          ))}
          <div className="w-[52px] shrink-0 flex flex-col items-end pl-2">
            <span
              className="text-[15px] font-bold tabular-nums leading-none text-[#45f5ff]"
              style={{ textShadow: "0 0 12px rgba(69,245,255,0.35)" }}
            >
              {total}
            </span>
            <span className="mt-[2px] text-[11px] font-bold tabular-nums leading-none text-[#5effdf]">
              100.00%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// 工具函数：hex → "r, g, b" 字符串（用于 rgba()）
function hexToRgb(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

// ── 5 段严重度条 ──────────────────────────────────────────────────────────────
function SeverityBar({ lv }: { lv: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-2 w-2 rounded-full"
          style={{ backgroundColor: i <= lv ? LV_COLOR[lv] : "#1a2654" }} />
      ))}
    </div>
  )
}

// ── 告警行 ────────────────────────────────────────────────────────────────────
function AlarmRow({ alarm, zh }: { alarm: AlarmEntry; zh: boolean }) {
  const isActive = alarm.statusZh === "未恢复"
  const color    = LV_COLOR[alarm.lv]
  const action   = ACTION_MAP[alarm.lv]

  return (
    <tr className={`border-b border-[#1a2654]/50 transition-colors last:border-0 ${
      alarm.lv >= 5 ? "bg-[#3a0e0e]/30" : "hover:bg-[#1a2654]/20"
    }`}>
      <td className="py-2.5 pl-3 pr-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color, boxShadow: alarm.lv >= 5 ? `0 0 0 2px ${color}44` : undefined }} />
          <span className="whitespace-nowrap text-[11px] font-medium" style={{ color }}>
            {LV_LABEL[alarm.lv]}
          </span>
        </div>
      </td>
      <td className="relative max-w-0 py-2.5 pr-2">
        <span className="block truncate text-xs text-[#dbe8ff]">
          {isActive && <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#ef4444] align-middle" />}
          {zh ? alarm.nameZh : alarm.nameEn}
        </span>
      </td>
      <td className="py-2.5 pr-2 text-[11px] text-[#7b8ab8]">{GRP_LABEL[alarm.group] ?? alarm.group}</td>
      <td className="py-2.5 pr-2"><SeverityBar lv={alarm.lv} /></td>
      <td className="py-2.5 pr-2 text-[11px] text-[#7b8ab8]">
        <span className="text-[#dbe8ff]">{alarm.ref}</span>{" / "}{alarm.rref}
      </td>
      <td className="py-2.5 pr-2">
        <span className="text-[11px] font-medium"
          style={{ color: STATUS_COLOR[zh ? alarm.statusZh : alarm.statusEn] }}>
          {zh ? alarm.statusZh : alarm.statusEn}
        </span>
      </td>
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

  const [viewMode,     setViewMode]     = useState<"gantt" | "table">("gantt")
  const [levelFilter,  setLevelFilter]  = useState<LevelFilter>("all")
  const [sourceFilter, setSourceFilter] = useState("all")

  const filterDate   = mode === "history" ? (date ?? "2026-03-26") : "2026-03-26"
  const dateFiltered = ALL_ALARMS
    .filter(a => a.time.startsWith(filterDate))
    .map(a => mode === "history" && a.statusZh === "未恢复"
      ? { ...a, statusZh: "已确认" as const, statusEn: "Acknowledged" as const }
      : a)

  // 甘特事件与告警表格共用同一份 dateFiltered，确保数据完全一致
  const timelineEvents = deriveTimelineEvents(dateFiltered)

  const sorted = [...dateFiltered].sort((a, b) => {
    if (mode === "realtime") {
      if (a.statusZh === "未恢复" && b.statusZh !== "未恢复") return -1
      if (b.statusZh === "未恢复" && a.statusZh !== "未恢复") return 1
    }
    return b.lv - a.lv || b.time.localeCompare(a.time)
  })

  const REALTIME_LIMIT   = 15
  const sortedForDisplay = mode === "realtime" ? sorted.slice(0, REALTIME_LIMIT) : sorted
  const displayed        = sortedForDisplay.filter(a => {
    const lvOk = levelFilter === "all"
      || (levelFilter === "lv45" && a.lv >= 4)
      || (levelFilter === "lv3"  && a.lv === 3)
      || (levelFilter === "lv12" && a.lv <= 2)
    return lvOk && (sourceFilter === "all" || a.source === sourceFilter)
  })

  const cnt = {
    total:  dateFiltered.length,   // 与甘特事件数一致
    lv45:   dateFiltered.filter(a => a.lv >= 4).length,
    lv3:    dateFiltered.filter(a => a.lv === 3).length,
    lv12:   dateFiltered.filter(a => a.lv <= 2).length,
    active: mode === "realtime" ? dateFiltered.filter(a => a.statusZh === "未恢复").length : 0,
  }

  const sources   = ["all", ...Array.from(new Set(dateFiltered.map(a => a.source)))]
  const showTable = mode === "realtime" || viewMode === "table"

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[#1a2654] bg-[#0d1233] p-3">

      {/* ── Header ── */}
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <div className="h-4 w-1 shrink-0 rounded-full bg-[#f97316]" />
        <span className="text-sm font-semibold text-[#f97316]">{zh ? "告警日志" : "Alarm Log"}</span>
        <span className="text-[12px] font-medium text-[#5f79ad]">
          {mode === "history"
            ? (zh ? `共 ${cnt.total} 条` : `Total ${cnt.total}`)
            : (zh ? `最新 ${Math.min(cnt.total, REALTIME_LIMIT)} 条` : `Latest ${Math.min(cnt.total, REALTIME_LIMIT)}`)}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {cnt.active > 0 && (
            <span className="rounded-full border border-[#ef4444]/30 bg-[#3a0e0e] px-2.5 py-0.5 text-[11px] font-semibold text-[#ef4444]">
              {zh ? `活动 ${cnt.active}` : `Active ${cnt.active}`}
            </span>
          )}
          {cnt.lv45 > 0 && (
            <span className="rounded-full border border-[#E24B4A]/25 bg-[#2a0a0a]/80 px-2.5 py-0.5 text-[11px] font-semibold text-[#E24B4A]">
              {zh ? `严重 ${cnt.lv45}` : `Crit ${cnt.lv45}`}
            </span>
          )}
          {cnt.lv3 > 0 && (
            <span className="rounded-full border border-[#EF9F27]/25 bg-[#2a1a00]/80 px-2.5 py-0.5 text-[11px] font-semibold text-[#EF9F27]">
              {zh ? `预警 ${cnt.lv3}` : `Warn ${cnt.lv3}`}
            </span>
          )}
          {cnt.lv12 > 0 && (
            <span className="rounded-full border border-[#378ADD]/25 bg-[#0a1a30]/80 px-2.5 py-0.5 text-[11px] font-semibold text-[#378ADD]">
              {zh ? `提示 ${cnt.lv12}` : `Info ${cnt.lv12}`}
            </span>
          )}

          {/* 历史模式：甘特 / 列表 切换 */}
          {mode === "history" && (
            <div className="ml-1 flex overflow-hidden rounded-lg border border-[#1e3a70]">
              <button onClick={() => setViewMode("gantt")} title={zh ? "甘特图" : "Gantt"}
                className={`flex h-7 w-8 items-center justify-center transition-all ${
                  viewMode === "gantt"
                    ? "bg-[#0f2a60] text-[#00d4aa] shadow-inner"
                    : "bg-[#070e28] text-[#4a6aaa] hover:bg-[#0d1e48] hover:text-[#7ab4f8]"
                }`}>
                <BarChart2 className="h-4 w-4" />
              </button>
              <button onClick={() => setViewMode("table")} title={zh ? "列表" : "List"}
                className={`flex h-7 w-8 items-center justify-center border-l border-[#1e3a70] transition-all ${
                  viewMode === "table"
                    ? "bg-[#0f2a60] text-[#00d4aa] shadow-inner"
                    : "bg-[#070e28] text-[#4a6aaa] hover:bg-[#0d1e48] hover:text-[#7ab4f8]"
                }`}>
                <List className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 历史甘特视图 + 类型统计 ── */}
      {mode === "history" && viewMode === "gantt" && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <div className="min-h-[140px] flex-1 overflow-hidden">
            <AlarmTimeline events={timelineEvents} />
          </div>
          <AlarmTypeStats alarms={dateFiltered} />
        </div>
      )}

      {/* ── 筛选栏 + 告警表格 ── */}
      {showTable && (
        <>
          <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-[#5f79ad]" />
            <div className="flex gap-1">
              {(["all", "lv45", "lv3", "lv12"] as LevelFilter[]).map(l => (
                <button key={l} onClick={() => setLevelFilter(l)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    levelFilter === l ? "bg-[#00d4aa] text-[#07162b]" : "bg-[#0e1e3a] text-[#5a7aaa] hover:bg-[#142040] hover:text-[#90b8f0]"
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

          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-[#1a2654]/60
            [&::-webkit-scrollbar]:w-[5px]
            [&::-webkit-scrollbar]:h-[5px]
            [&::-webkit-scrollbar-track]:rounded-full
            [&::-webkit-scrollbar-track]:bg-[#060c1f]
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-[#1e3a6e]
            [&::-webkit-scrollbar-thumb:hover]:bg-[#2d5499]
            [&::-webkit-scrollbar-corner]:bg-[#060c1f]">
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
                    zh ? "等级"        : "Level",
                    zh ? "告警名称"    : "Alarm",
                    zh ? "分类"        : "Type",
                    zh ? "严重度"      : "Severity",
                    zh ? "触发 / 恢复" : "Trig / Recv",
                    zh ? "状态"        : "Status",
                    zh ? "处置"        : "Action",
                  ].map(h => (
                    <th key={h} className="border-b border-[#1a2654] px-2 py-2 text-left text-[11px] font-semibold text-[#6a8abf] first:pl-3 last:pr-3">
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
                  <AlarmRow key={`${alarm.time}-${alarm.source}`} alarm={alarm} zh={zh} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
