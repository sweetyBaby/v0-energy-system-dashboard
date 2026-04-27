"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { BarChart2, ChevronDown, Filter, List, Maximize2, Minimize2 } from "lucide-react"
import { useProject } from "@/components/dashboard/dashboard-header"
import { HistoryStyleLoadingIndicator } from "@/components/dashboard/history-style-loading-indicator"
import { useLanguage } from "@/components/language-provider"
import { useDashboardViewport } from "@/hooks/use-dashboard-viewport"
import { DASHBOARD_CONTENT_SCALE, useFluidScale } from "@/hooks/use-fluid-scale"
import { fetchFaultDetailList, fetchFaultList, type FaultDetailItem, type FaultListItem } from "@/lib/api/fault"

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const roundTo = (value: number, digits = 2) => Number(value.toFixed(digits))

function useHistoryTypographyBoost() {
  const { width, height, devicePixelRatio, isCompactViewport } = useDashboardViewport()

  return useMemo(() => {
    if (isCompactViewport) {
      return 1
    }

    const lowDensityBoost = clamp((1.45 - devicePixelRatio) / 0.55, 0, 1)
    const largeScreenProgress = clamp(Math.max((width - 1880) / 780, (height - 1040) / 280), 0, 1)
    const roomyScreenProgress = clamp(Math.max((width - 2360) / 520, (height - 1320) / 180), 0, 1)

    return roundTo(
      1 + largeScreenProgress * (0.08 + lowDensityBoost * 0.06) + roomyScreenProgress * (0.03 + lowDensityBoost * 0.02),
      3
    )
  }, [devicePixelRatio, height, isCompactViewport, width])
}

// ── 等级定义 ──────────────────────────────────────────────────────────────────
const LV_COLOR: Record<number, string> = {
  0: "#7b879d", 1: "#85B7EB", 2: "#378ADD", 3: "#EF9F27", 4: "#E24B4A", 5: "#A32D2D",
}
// 高亮色：饱和度高、色相鲜明，用于矩阵数字（绝不趋近于白色）
const LV_BRIGHT: Record<number, string> = {
  0: "#b6c2d9", 1: "#60a8f0", 2: "#3a9cff", 3: "#ffb020", 4: "#ff6040", 5: "#ff3838",
}
const LV_SURFACE: Record<number, string> = {
  0: "rgba(78, 93, 122, 0.22)",
  1: "rgba(76, 146, 224, 0.18)",
  2: "rgba(42, 128, 224, 0.22)",
  3: "rgba(239, 159, 39, 0.18)",
  4: "rgba(226, 75, 74, 0.20)",
  5: "rgba(163, 45, 45, 0.28)",
}
const LV_LABEL: Record<number, { zh: string; en: string }> = {
  0: { zh: "其他等级", en: "Other Level" },
  1: { zh: "L1", en: "L1" },
  2: { zh: "L2", en: "L2" },
  3: { zh: "L3", en: "L3" },
  4: { zh: "L4", en: "L4" },
  5: { zh: "L5", en: "L5" },
}
const GRP_LABEL: Record<string, { zh: string; en: string }> = {
  pack:    { zh: "组端",  en: "Pack"  },
  cell:    { zh: "单体",  en: "Cell"  },
  current: { zh: "充放电", en: "C/D"  },
  temp:    { zh: "温度",  en: "Temp"  },
  soc:     { zh: "SOC",   en: "SOC"  },
  comms:   { zh: "通信",  en: "Comms" },
  other:   { zh: "其他",  en: "Other" },
}
const ACTION_MAP: Record<number, { zh: string; en: string; color: string }> = {
  0: { zh: "记录日志", en: "Log",        color: "#7b879d" },
  5: { zh: "断开锁死", en: "Trip+Lock",  color: "#E24B4A" },
  4: { zh: "断接触器",  en: "Trip",       color: "#E24B4A" },
  3: { zh: "降额运行",  en: "Derate",     color: "#BA7517" },
  2: { zh: "记录上报",  en: "Log+Report", color: "#378ADD" },
  1: { zh: "记录日志",  en: "Log",        color: "#6b7280" },
}
const SEVERITY_META: Record<number, { zh: string; en: string; badge: string; tone: string }> = {
  0: { zh: "其他", en: "Other", badge: "#7b879d", tone: "rgba(123,135,157,0.16)" },
  1: { zh: "轻微", en: "minor", badge: "#85B7EB", tone: "rgba(133,183,235,0.16)" },
  2: { zh: "轻微", en: "minor", badge: "#378ADD", tone: "rgba(55,138,221,0.18)" },
  3: { zh: "重要", en: "important", badge: "#EF9F27", tone: "rgba(239,159,39,0.18)" },
  4: { zh: "严重", en: "critical", badge: "#E24B4A", tone: "rgba(226,75,74,0.18)" },
  5: { zh: "紧急", en: "emergency", badge: "#A32D2D", tone: "rgba(163,45,45,0.22)" },
}
const ACTION_HINT_MAP: Record<number, { zh: string; en: string }> = {
  0: { zh: "记录告警：建议结合上下文进一步确认", en: "Log only: verify with surrounding context" },
  1: { zh: "轻微报警：提示/允许运行，观察趋势", en: "Minor alarm: operation allowed, observe trend" },
  2: { zh: "轻微报警：提示/允许运行，观察趋势", en: "Minor alarm: operation allowed, observe trend" },
  3: { zh: "重要报警：需要关注，可能触发限功率/保护策略", en: "Important alarm: watch closely, may trigger derating/protection" },
  4: { zh: "严重故障：需要关注，可能触发限功率/保护措施", en: "Severe fault: attention required, may trigger derating/protection" },
  5: { zh: "严重故障：需要关注，可能触发限功率/保护措施", en: "Severe fault: attention required, may trigger derating/protection" },
}
type AlarmMatrixColorStop = {
  t: number
  r: number
  g: number
  b: number
}

const ALARM_MATRIX_TEXT_COLOR = "#11243a"
const ALARM_MATRIX_RATIO_STOPS: AlarmMatrixColorStop[] = [
  { t: 0, r: 255, g: 247, b: 219 },
  { t: 0.48, r: 253, g: 224, b: 71 },
  { t: 0.78, r: 251, g: 191, b: 36 },
  { t: 1, r: 217, g: 119, b: 6 },
]

const interpolateAlarmMatrixColor = (stops: AlarmMatrixColorStop[], value: number) => {
  const safeValue = clamp(value, 0, 1)

  for (let index = 0; index < stops.length - 1; index += 1) {
    if (safeValue <= stops[index + 1].t) {
      const ratio = (safeValue - stops[index].t) / Math.max(stops[index + 1].t - stops[index].t, 0.001)
      return {
        r: Math.round(stops[index].r + ratio * (stops[index + 1].r - stops[index].r)),
        g: Math.round(stops[index].g + ratio * (stops[index + 1].g - stops[index].g)),
        b: Math.round(stops[index].b + ratio * (stops[index + 1].b - stops[index].b)),
      }
    }
  }

  const last = stops[stops.length - 1]
  return { r: last.r, g: last.g, b: last.b }
}

const alarmMatrixRgb = (weight: number) => interpolateAlarmMatrixColor(ALARM_MATRIX_RATIO_STOPS, weight)

const rgbToCss = ({ r, g, b }: { r: number; g: number; b: number }) => `rgb(${r},${g},${b})`
const rgbaToCss = ({ r, g, b }: { r: number; g: number; b: number }, alpha: number) => `rgba(${r},${g},${b},${alpha})`

// duration：告警持续分钟数，同时驱动甘特图条宽
type AlarmEntry = {
  key?: string
  time: string; duration: number
  lv: number; group: string
  nameZh: string; nameEn: string; source: string
  triggerZh: string; triggerEn: string
  ref: string; rref: string; unit: string
  statusZh: "未恢复" | "已确认" | "已恢复"
  statusEn: "Active" | "Acknowledged" | "Recovered"
  timelineStartSeconds?: number
  timelineEndSeconds?: number
  timelineDurationSeconds?: number
  totalDurationSeconds?: number | null
  occurrenceRatio?: number | null
  typeOrder?: number
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
  { time:"2026-03-25 08:45:00", duration:30, lv:2, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",     source:"PCS-01", triggerZh:"通信链路异常",      triggerEn:"Link error",             ref:"—",      rref:"—",      unit:"—",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-25 12:45:00", duration:30, lv:2, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",     source:"BCU-07", triggerZh:"通信链路异常",      triggerEn:"Link error",             ref:"—",      rref:"—",      unit:"—",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-25 16:15:00", duration:30, lv:2, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",     source:"BCU-03", triggerZh:"通信链路异常",      triggerEn:"Link error",             ref:"—",      rref:"—",      unit:"—",   statusZh:"已恢复", statusEn:"Recovered"    },
  { time:"2026-03-25 22:30:00", duration:40, lv:2, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",     source:"EMS",    triggerZh:"通信链路异常",      triggerEn:"Link error",             ref:"—",      rref:"—",      unit:"—",   statusZh:"已恢复", statusEn:"Recovered"    },
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
  { time:"2026-03-26 12:00:00", duration:30, lv:2, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",     source:"BCU-04", triggerZh:"通信链路异常",          triggerEn:"Link error",               ref:"—",      rref:"—",      unit:"—",   statusZh:"已恢复", statusEn:"Recovered"    },
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

// ── 实时告警模拟池 ────────────────────────────────────────────────────────────
const RT_POOL: Omit<AlarmEntry, "time" | "duration" | "statusZh" | "statusEn">[] = [
  { lv:1, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",    source:"BCU-02", triggerZh:"心跳包短暂丢失",    triggerEn:"Heartbeat briefly lost",   ref:"—",     rref:"—",     unit:"—"  },
  { lv:2, group:"soc",     nameZh:"SOC过低",  nameEn:"SOC Low",             source:"BCU-05", triggerZh:"SOC 低于警戒值",    triggerEn:"SOC below warning",        ref:"14%",   rref:"15%",   unit:"%"  },
  { lv:2, group:"temp",    nameZh:"风扇故障", nameEn:"Fan Fault",           source:"BCU-03", triggerZh:"风扇转速偏低",      triggerEn:"Fan speed low",            ref:"—",     rref:"—",     unit:"—"  },
  { lv:3, group:"temp",    nameZh:"温度异常", nameEn:"Temp Anomaly",        source:"BCU-01", triggerZh:"温度梯度超限",      triggerEn:"Temp gradient high",       ref:"11°C",  rref:"8°C",   unit:"°C" },
  { lv:3, group:"cell",    nameZh:"欠压告警", nameEn:"Undervolt Alarm",     source:"BCU-07", triggerZh:"单体电压低于预警值",triggerEn:"Cell below warn level",    ref:"3.08V", rref:"3.15V", unit:"V"  },
  { lv:4, group:"cell",    nameZh:"过压保护", nameEn:"Overvolt Protection", source:"BCU-03", triggerZh:"单体电压超上限",    triggerEn:"Cell above max volt",      ref:"3.78V", rref:"3.65V", unit:"V"  },
  { lv:4, group:"current", nameZh:"过流报警", nameEn:"Overcurrent Alarm",   source:"BCU-04", triggerZh:"放电电流超额定",    triggerEn:"Discharge over rated",     ref:"310A",  rref:"300A",  unit:"A"  },
  { lv:5, group:"other",   nameZh:"绝缘故障", nameEn:"Insulation Fault",    source:"BCU-02", triggerZh:"绝缘阻抗骤降",      triggerEn:"Insulation sudden drop",   ref:"45kΩ",  rref:"100kΩ", unit:"kΩ" },
]

// ── 历史 mock 生成（确定性 PRNG，按日期 seed，保证刷新稳定）─────────────────
const HIST_POOL: Omit<AlarmEntry, "time" | "duration" | "statusZh" | "statusEn">[] = [
  { lv:1, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",    source:"BCU-02", triggerZh:"心跳包短暂丢失",        triggerEn:"Heartbeat briefly lost",   ref:"—",      rref:"—",      unit:"—"   },
  { lv:1, group:"cell",    nameZh:"欠压告警", nameEn:"Undervolt Alarm",     source:"BCU-08", triggerZh:"单体电压低于提示值",    triggerEn:"Cell below notice level",  ref:"3.20V",  rref:"3.15V",  unit:"V"   },
  { lv:1, group:"temp",    nameZh:"温度异常", nameEn:"Temp Anomaly",        source:"BCU-01", triggerZh:"温度轻微偏高",          triggerEn:"Temp slightly high",       ref:"36°C",   rref:"35°C",   unit:"°C"  },
  { lv:2, group:"soc",     nameZh:"SOC过低",  nameEn:"SOC Low",             source:"BCU-05", triggerZh:"SOC 低于警戒值",        triggerEn:"SOC below warning",        ref:"14%",    rref:"15%",    unit:"%"   },
  { lv:2, group:"temp",    nameZh:"风扇故障", nameEn:"Fan Fault",           source:"BCU-03", triggerZh:"风扇转速偏低",          triggerEn:"Fan speed low",            ref:"—",      rref:"—",      unit:"—"   },
  { lv:2, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",    source:"PCS-01", triggerZh:"通信链路异常",          triggerEn:"Link error",               ref:"—",      rref:"—",      unit:"—"   },
  { lv:2, group:"temp",    nameZh:"温度异常", nameEn:"Temp Anomaly",        source:"BCU-03", triggerZh:"温度梯度偏高",          triggerEn:"Temp gradient elevated",   ref:"9°C",    rref:"8°C",    unit:"°C"  },
  { lv:2, group:"cell",    nameZh:"欠压告警", nameEn:"Undervolt Alarm",     source:"BCU-06", triggerZh:"单体电压低于轻警值",    triggerEn:"Cell below light warn",    ref:"3.12V",  rref:"3.15V",  unit:"V"   },
  { lv:3, group:"temp",    nameZh:"温度异常", nameEn:"Temp Anomaly",        source:"BCU-05", triggerZh:"温度梯度超限",          triggerEn:"Temp gradient high",       ref:"12°C",   rref:"8°C",    unit:"°C"  },
  { lv:3, group:"cell",    nameZh:"欠压告警", nameEn:"Undervolt Alarm",     source:"BCU-07", triggerZh:"单体电压低于预警值",    triggerEn:"Cell below warn level",    ref:"3.08V",  rref:"3.15V",  unit:"V"   },
  { lv:3, group:"current", nameZh:"过流报警", nameEn:"Overcurrent Alarm",   source:"BCU-04", triggerZh:"放电电流超额定",        triggerEn:"Discharge over rated",     ref:"305A",   rref:"300A",   unit:"A"   },
  { lv:3, group:"comms",   nameZh:"通信中断", nameEn:"Comm Interrupted",    source:"EMS",    triggerZh:"EMS 通讯超时",          triggerEn:"EMS comm timeout",         ref:"5s",     rref:"3s",     unit:"s"   },
  { lv:3, group:"soc",     nameZh:"SOC过低",  nameEn:"SOC Low",             source:"BCU-01", triggerZh:"SOC 低于预警值",        triggerEn:"SOC below alert",          ref:"11%",    rref:"15%",    unit:"%"   },
  { lv:3, group:"temp",    nameZh:"风扇故障", nameEn:"Fan Fault",           source:"BCU-06", triggerZh:"风扇转速异常",          triggerEn:"Fan speed abnormal",       ref:"—",      rref:"—",      unit:"—"   },
  { lv:3, group:"other",   nameZh:"绝缘故障", nameEn:"Insulation Fault",    source:"BCU-01", triggerZh:"绝缘阻抗低于预警值",    triggerEn:"Insulation below warn",    ref:"70kΩ",   rref:"100kΩ",  unit:"kΩ"  },
  { lv:3, group:"cell",    nameZh:"过压保护", nameEn:"Overvolt Protection", source:"BCU-05", triggerZh:"单体电压超预警线",      triggerEn:"Cell above warn level",    ref:"3.70V",  rref:"3.65V",  unit:"V"   },
  { lv:4, group:"cell",    nameZh:"过压保护", nameEn:"Overvolt Protection", source:"BCU-03", triggerZh:"单体电压超上限",        triggerEn:"Cell above max volt",      ref:"3.78V",  rref:"3.65V",  unit:"V"   },
  { lv:4, group:"current", nameZh:"过流报警", nameEn:"Overcurrent Alarm",   source:"BCU-04", triggerZh:"放电电流超额定",        triggerEn:"Discharge over rated",     ref:"310A",   rref:"300A",   unit:"A"   },
  { lv:4, group:"temp",    nameZh:"温度异常", nameEn:"Temp Anomaly",        source:"BCU-07", triggerZh:"单体温度超严重阈值",    triggerEn:"Cell temp over severe",    ref:"52°C",   rref:"48°C",   unit:"°C"  },
  { lv:4, group:"soc",     nameZh:"SOC过低",  nameEn:"SOC Low",             source:"BCU-03", triggerZh:"SOC 低于保护值",        triggerEn:"SOC below protection",     ref:"8%",     rref:"10%",    unit:"%"   },
  { lv:4, group:"cell",    nameZh:"欠压告警", nameEn:"Undervolt Alarm",     source:"BCU-04", triggerZh:"单体电压低于保护值",    triggerEn:"Cell below protect level", ref:"2.90V",  rref:"3.00V",  unit:"V"   },
  { lv:4, group:"other",   nameZh:"绝缘故障", nameEn:"Insulation Fault",    source:"BCU-07", triggerZh:"绝缘阻抗骤降",          triggerEn:"Insulation sudden drop",   ref:"50kΩ",   rref:"100kΩ",  unit:"kΩ"  },
  { lv:5, group:"cell",    nameZh:"过压保护", nameEn:"Overvolt Protection", source:"BCU-03", triggerZh:"单体电压严重超上限",    triggerEn:"Cell severely over max",   ref:"3.90V",  rref:"3.65V",  unit:"V"   },
  { lv:5, group:"current", nameZh:"过流报警", nameEn:"Overcurrent Alarm",   source:"BCU-02", triggerZh:"电流严重超限触发断路",  triggerEn:"Severe overcurrent trip",  ref:"380A",   rref:"300A",   unit:"A"   },
  { lv:5, group:"other",   nameZh:"绝缘故障", nameEn:"Insulation Fault",    source:"BCU-05", triggerZh:"绝缘故障触发断路",      triggerEn:"Insulation fault trip",    ref:"20kΩ",   rref:"100kΩ",  unit:"kΩ"  },
]

function generateMockAlarms(date: string): AlarmEntry[] {
  // 确定性 PRNG（mulberry32），seed 来自日期字符串 hash
  let s = 0
  for (let i = 0; i < date.length; i++) s = (Math.imul(31, s) + date.charCodeAt(i)) | 0
  s = s >>> 0
  const rng = () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const ri = (n: number) => Math.floor(rng() * n)
  const pad = (n: number) => String(n).padStart(2, "0")
  const count = 16 + ri(12) // 16~27 条
  const statuses: Array<{ zh: AlarmEntry["statusZh"]; en: AlarmEntry["statusEn"] }> = [
    { zh: "已恢复", en: "Recovered" },
    { zh: "已恢复", en: "Recovered" },
    { zh: "已恢复", en: "Recovered" },
    { zh: "已确认", en: "Acknowledged" },
  ]
  return Array.from({ length: count }, () => {
    const tpl = HIST_POOL[ri(HIST_POOL.length)]
    const st  = statuses[ri(statuses.length)]
    return {
      ...tpl,
      time:     `${date} ${pad(ri(24))}:${pad(ri(60))}:00`,
      duration: 15 + ri(56),
      statusZh: st.zh,
      statusEn: st.en,
    }
  }).sort((a, b) => a.time.localeCompare(b.time))
}

function makeRTAlarm(offsetSec = 0): AlarmEntry {
  const t   = new Date(Date.now() - offsetSec * 1000)
  const pad = (n: number) => String(n).padStart(2, "0")
  const time = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`
  const tpl  = RT_POOL[Math.floor(Math.random() * RT_POOL.length)]
  const fresh = offsetSec < 60
  return {
    ...tpl,
    time,
    duration: Math.floor(Math.random() * 40) + 5,
    statusZh: fresh ? "未恢复" : (Math.random() > 0.5 ? "已确认" : "已恢复"),
    statusEn: fresh ? "Active" : (Math.random() > 0.5 ? "Acknowledged" : "Recovered"),
  }
}

const STATUS_COLOR: Record<string, string> = {
  "未恢复": "#ef4444", "已确认": "#f97316", "已恢复": "#00d4aa",
  "Active": "#ef4444", "Acknowledged": "#f97316", "Recovered": "#00d4aa",
}

const normalizeAlarmSource = (value: string) => value.trim().toUpperCase().replace(/[\s_-]/g, "")

const getBcuSequence = (value?: string | null) => {
  if (!value) {
    return null
  }

  const match = normalizeAlarmSource(value).match(/^BCU0*(\d+)$/)
  if (!match) {
    return null
  }

  const sequence = Number(match[1])
  return Number.isFinite(sequence) ? sequence : null
}

const matchesAlarmDevice = (source: string, deviceName?: string | null) => {
  const deviceSequence = getBcuSequence(deviceName)
  if (deviceSequence == null) {
    return true
  }

  return getBcuSequence(source) === deviceSequence
}

const parseClockToSeconds = (value: string) => {
  const [hourPart = "0", minutePart = "0", secondPart = "0"] = value.split(":")
  const hours = Number(hourPart)
  const minutes = Number(minutePart)
  const seconds = Number(secondPart)

  if ([hours, minutes, seconds].some((part) => !Number.isFinite(part))) {
    return 0
  }

  return Math.max(0, Math.min(24 * 60 * 60, hours * 3600 + minutes * 60 + seconds))
}

const formatAlarmDuration = (seconds: number, zh: boolean) => {
  const safeSeconds = Math.max(0, Math.round(seconds))

  if (safeSeconds < 60) {
    return zh ? `${safeSeconds}秒` : `${safeSeconds}s`
  }

  if (safeSeconds < 3600) {
    return zh ? `${Math.floor(safeSeconds / 60)}分钟` : `${Math.floor(safeSeconds / 60)} min`
  }

  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  return zh ? `${hours}小时${minutes}分钟` : `${hours}h ${minutes}m`
}

const formatWindowDuration = (seconds: number, zh: boolean) => {
  const safeSeconds = Math.max(0, Math.round(seconds))
  const days = Math.floor(safeSeconds / 86400)
  const hours = Math.floor((safeSeconds % 86400) / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainSeconds = safeSeconds % 60
  const clock = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainSeconds).padStart(2, "0")}`

  if (days <= 0) {
    return clock
  }

  return zh ? `${days}天 ${clock}` : `${days} days ${clock}`
}

const inferAlarmGroup = (faultName: string): keyof typeof GRP_LABEL => {
  const normalized = faultName.trim().toLowerCase()
  const combined = `${faultName} ${normalized}`

  if (/soc/.test(combined)) return "soc"
  if (/通信|通訊|comm|network|link|heartbeat/.test(combined)) return "comms"
  if (/风扇|溫|温|temp|thermal|fan/.test(combined)) return "temp"
  if (/电流|電流|current|功率|power|charge|discharge/.test(combined)) return "current"
  if (/pack|簇|组端|組端|rack|string/.test(combined)) return "pack"
  if (/电压|電壓|volt|voltage|cell|单体|單體|压|壓/.test(combined)) return "cell"
  return "other"
}

const normalizeHistoryFaultAlarms = (
  rows: FaultDetailItem[],
  deviceNameMap: Map<string, string>
): AlarmEntry[] =>
  rows
    .flatMap((row, rowIndex) =>
      row.timeIntervals.map((interval, intervalIndex) => {
        const startSeconds = parseClockToSeconds(interval.start)
        const endSeconds = Math.max(parseClockToSeconds(interval.end), startSeconds + interval.durationSeconds)
        const source = deviceNameMap.get(row.deviceId) ?? row.deviceId ?? "--"

        return {
          key: `${row.id}-${intervalIndex}`,
          time: `${row.statDate} ${interval.start}`,
          duration: interval.durationSeconds / 60,
          lv: row.levelValue,
          group: inferAlarmGroup(row.faultName),
          nameZh: row.faultName,
          nameEn: row.faultName,
          source,
          triggerZh: interval.start,
          triggerEn: interval.start,
          ref: interval.start,
          rref: interval.end,
          unit: "",
          statusZh: "已确认",
          statusEn: "Acknowledged",
          timelineStartSeconds: startSeconds,
          timelineEndSeconds: endSeconds,
          timelineDurationSeconds: interval.durationSeconds,
          totalDurationSeconds: row.totalDurationSeconds,
          occurrenceRatio: row.occurrenceRatio,
          typeOrder: rowIndex,
        } satisfies AlarmEntry
      })
    )
    .sort((left, right) => left.time.localeCompare(right.time))

type GroupFilter = "all" | keyof typeof GRP_LABEL

const GROUP_FILTERS: GroupFilter[] = ["all", "cell", "temp", "current", "soc", "comms", "pack", "other"]
const LEVEL_DISPLAY_ORDER = [1, 2, 3, 4, 5, 0] as const

type LevelFilter = "all" | `level:${number}`

const getLevelSortWeight = (level: number) => {
  const index = LEVEL_DISPLAY_ORDER.indexOf(level as (typeof LEVEL_DISPLAY_ORDER)[number])
  return index >= 0 ? index : LEVEL_DISPLAY_ORDER.length
}

const getVisibleLevels = (levels: number[]) =>
  Array.from(new Set(levels))
    .sort((left, right) => getLevelSortWeight(left) - getLevelSortWeight(right))

// ── 从 AlarmEntry[] 派生甘特事件（统一数据源）────────────────────────────────
type TimelineEvent = {
  nameZh: string
  nameEn: string
  start: number
  end: number
  lv: number
  durationSeconds: number
  totalDurationSeconds?: number | null
  occurrenceRatio?: number | null
  order: number
}

type PositionedTimelineEvent = TimelineEvent & {
  lane: number
}

type TimelineRow = {
  type: string
  label: string
  height: number
  events: PositionedTimelineEvent[]
}

function deriveTimelineEvents(alarms: AlarmEntry[]): TimelineEvent[] {
  return alarms.map((alarm, index) => {
    const [, timePart = "00:00:00"] = alarm.time.split(" ")
    const start = alarm.timelineStartSeconds ?? parseClockToSeconds(timePart)
    const durationSeconds = Math.max(1, Math.round(alarm.timelineDurationSeconds ?? alarm.duration * 60))
    const end = Math.max(alarm.timelineEndSeconds ?? start + durationSeconds, start + durationSeconds)

    return {
      nameZh: alarm.nameZh,
      nameEn: alarm.nameEn,
      start,
      end,
      lv: alarm.lv,
      durationSeconds,
      totalDurationSeconds: alarm.totalDurationSeconds,
      occurrenceRatio: alarm.occurrenceRatio,
      order: alarm.typeOrder ?? index,
    }
  })
}

const LEFT_W  = 132
const DAY_SECONDS = 24 * 60 * 60
const TIMELINE_TICK_STEPS = [
  10 * 60,
  15 * 60,
  30 * 60,
  60 * 60,
  2 * 60 * 60,
  3 * 60 * 60,
] as const

const resolveTimelineTickStep = (span: number) => {
  if (span <= 90 * 60) return TIMELINE_TICK_STEPS[0]
  if (span <= 3 * 60 * 60) return TIMELINE_TICK_STEPS[1]
  if (span <= 6 * 60 * 60) return TIMELINE_TICK_STEPS[2]
  if (span <= 12 * 60 * 60) return TIMELINE_TICK_STEPS[3]
  if (span <= 18 * 60 * 60) return TIMELINE_TICK_STEPS[4]
  return TIMELINE_TICK_STEPS[5]
}

const resolveTimelineMajorTickStep = (tickStep: number) => {
  if (tickStep <= 15 * 60) return 60 * 60
  if (tickStep <= 30 * 60) return 60 * 60
  if (tickStep <= 60 * 60) return 3 * 60 * 60
  return 6 * 60 * 60
}

// ── 甘特时间轴（拖动平移 + 滚轮缩放，始终铺满容器，无横向滚动条） ─────────────
function AlarmTimeline({ events, zh, visibleLevels }: { events: TimelineEvent[]; zh: boolean; visibleLevels?: number[] }) {
  const scale = useFluidScale<HTMLDivElement>(1180, 2560, { ...DASHBOARD_CONTENT_SCALE, maxRootPx: 27 })
  const historyTypographyBoost = useHistoryTypographyBoost()
  const boostMetric = (value: number) => roundTo(value * historyTypographyBoost)
  const labelSize = boostMetric(scale.fluid(11, 16))
  const tickSize = boostMetric(scale.fluid(10, 15))
  const tooltipSize = boostMetric(scale.fluid(11, 16))
  const laneHeight = Math.round(boostMetric(scale.fluid(14, 18)))
  const laneGap = Math.round(boostMetric(scale.fluid(4, 7)))
  const rowPaddingY = Math.round(boostMetric(scale.fluid(8, 12)))
  const labelLineHeight = boostMetric(scale.fluid(14, 20))
  const minRowHeight = Math.round(boostMetric(scale.fluid(38, 52)))
  const leftLabelWidth = Math.round(LEFT_W * Math.min(historyTypographyBoost, 1.16))
  const tickLabelOffset = Math.round(64 * Math.min(historyTypographyBoost, 1.12))
  const tickHeaderHeight = Math.round(boostMetric(scale.fluid(18, 22)))
  const [viewStart, setViewStart] = useState(0)
  const [viewEnd,   setViewEnd]   = useState(DAY_SECONDS)
  const [tooltip, setTooltip]     = useState<{ ev: TimelineEvent; mx: number; my: number } | null>(null)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const containerRef              = useRef<HTMLDivElement>(null)

  const span   = viewEnd - viewStart
  const zoomed = span < DAY_SECONDS
  const timelineVisibleLevels = visibleLevels?.length ? visibleLevels : getVisibleLevels(events.map((event) => event.lv))
  const timelineRows = useMemo<TimelineRow[]>(() => {
    const grouped = new Map<string, TimelineEvent[]>()

    ;[...events]
      .sort((left, right) => left.order - right.order || left.start - right.start || left.end - right.end)
      .forEach((event) => {
        const rowEvents = grouped.get(event.nameZh)
        if (rowEvents) {
          rowEvents.push(event)
        } else {
          grouped.set(event.nameZh, [event])
        }
      })

    return Array.from(grouped.entries()).map(([type, rowEvents]) => {
      const laneEnds: number[] = []
      const label = zh ? rowEvents[0]?.nameZh ?? type : rowEvents[0]?.nameEn ?? type
      const positionedEvents = rowEvents
        .sort((left, right) => left.start - right.start || left.end - right.end)
        .map((event): PositionedTimelineEvent => {
          let lane = laneEnds.findIndex((laneEnd) => event.start >= laneEnd)
          if (lane === -1) {
            lane = laneEnds.length
            laneEnds.push(event.end)
          } else {
            laneEnds[lane] = event.end
          }

          return {
            ...event,
            lane,
          }
        })

      const laneCount = Math.max(1, laneEnds.length)
      const normalizedLabelLength = Array.from(label).reduce((sum, char) => sum + (/[A-Za-z0-9_-]/.test(char) ? 0.6 : 1), 0)
      const estimatedLabelLines = Math.max(1, Math.ceil(normalizedLabelLength / 10))
      const labelHeight = Math.ceil(estimatedLabelLines * labelLineHeight + rowPaddingY * 2)

      return {
        type,
        label,
        height: Math.max(
          minRowHeight,
          labelHeight,
          laneCount * laneHeight + Math.max(0, laneCount - 1) * laneGap + rowPaddingY * 2
        ),
        events: positionedEvents,
      }
    })
  }, [events, labelLineHeight, laneGap, laneHeight, minRowHeight, rowPaddingY, zh])

  const fmt = (value: number, includeSeconds = false) => {
    const safeValue = Math.max(0, Math.min(DAY_SECONDS, Math.round(value)))
    const h = Math.floor(safeValue / 3600) % 24
    const m = Math.floor((safeValue % 3600) / 60)
    const s = safeValue % 60
    return includeSeconds
      ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }
  const pct = (value: number) => `${((value - viewStart) / span) * 100}%`

  const tickStep = resolveTimelineTickStep(span)
  const majorTickStep = resolveTimelineMajorTickStep(tickStep)
  const ticks    = Array.from({ length: Math.ceil(DAY_SECONDS / tickStep) + 1 }, (_, i) => i * tickStep)
    .filter(value => value >= viewStart && value <= viewEnd)
  const tickLabelPaddingX = Math.round(Math.max(6, tickSize * 0.5))
  const tickLabelHeight = Math.round(Math.max(22, tickSize * 1.85))

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.shiftKey) {
      return
    }

    e.preventDefault()
    const rect   = e.currentTarget.getBoundingClientRect()
    const ratio  = (e.clientX - rect.left) / rect.width
    const center = viewStart + ratio * span
    const factor  = e.deltaY < 0 ? 0.7 : 1 / 0.7
    const newSpan = Math.max(3600, Math.min(DAY_SECONDS, span * factor))
    const s = Math.max(0, Math.min(DAY_SECONDS - newSpan, center - ratio * newSpan))
    setViewStart(Math.round(s))
    setViewEnd(Math.round(s + newSpan))
  }

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    e.preventDefault()
    const startX   = e.clientX
    const initVs   = viewStart
    const initSpan = span
    const totalW   = containerRef.current.getBoundingClientRect().width
    const onMove = (ev: MouseEvent) => {
      const dx = ((startX - ev.clientX) / totalW) * initSpan
      const s  = Math.max(0, Math.min(DAY_SECONDS - initSpan, initVs + dx))
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
    <div ref={scale.ref} className="select-none flex h-full flex-col overflow-hidden rounded-lg border border-[#1a3060] bg-[#080e28]/70 px-3 py-2" style={scale.rootStyle}>
      <div className="mb-2 flex shrink-0 items-center gap-3 px-1">
        {timelineVisibleLevels.map((level) => (
          <div key={level} className="flex items-center gap-1.5">
            <div className="h-2.5 w-5 rounded-sm" style={{ background: LV_COLOR[level], boxShadow: `0 0 5px ${LV_COLOR[level]}66` }} />
            <span className="font-medium text-[#c8deff]" style={{ fontSize: labelSize }}>
              {zh ? LV_LABEL[level].zh : LV_LABEL[level].en}
            </span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-3">
          {zoomed && (
            <span className="font-semibold text-[#7dd3fc]" style={{ fontSize: labelSize }}>{fmt(viewStart)} – {fmt(viewEnd)}</span>
          )}
          <span className="rounded-md border border-[#2a4a80]/60 bg-[#0d1a3a]/80 px-2.5 py-0.5 font-medium text-[#60a0ff]"
            style={{ fontSize: labelSize, textShadow: "0 0 8px rgba(96,160,255,0.5)" }}>
            {zh ? "Shift+滚轮缩放 \u00a0⇔ 拖动平移" : "Shift+Scroll zoom \u00a0⇔ Drag pan"}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="relative shrink-0 overflow-hidden" style={{ marginLeft: tickLabelOffset, height: tickHeaderHeight }}>
          {ticks.map((value, index) => {
            const isFirstTick = index === 0
            const isLastTick = index === ticks.length - 1
            const isMajorTick = value === 0 || value === DAY_SECONDS || value % majorTickStep === 0
            const isAnchorTick = value === 0 || value === 12 * 60 * 60 || value === DAY_SECONDS

            return (
              <span
                key={value}
                className={`absolute whitespace-nowrap tabular-nums ${
                  isFirstTick ? "left-0" : isLastTick ? "right-0" : "-translate-x-1/2"
                }`}
                style={{
                  ...(isFirstTick || isLastTick ? {} : { left: pct(value) }),
                  fontSize: tickSize,
                  lineHeight: `${tickLabelHeight}px`,
                  paddingInline: tickLabelPaddingX,
                  height: tickLabelHeight,
                  fontWeight: isAnchorTick ? 800 : isMajorTick ? 700 : 600,
                  color: isAnchorTick ? "#f4fbff" : isMajorTick ? "#d9ecff" : "#8eb8ea",
                  letterSpacing: isAnchorTick ? "0.06em" : "0.04em",
                  textShadow: isAnchorTick
                    ? "0 0 16px rgba(145,210,255,0.56), 0 0 6px rgba(145,210,255,0.34)"
                    : isMajorTick
                      ? "0 0 14px rgba(120,182,255,0.48), 0 0 6px rgba(120,182,255,0.32)"
                      : "0 0 8px rgba(120,182,255,0.22)",
                  opacity: isAnchorTick ? 1 : isMajorTick ? 1 : 0.92,
                }}
              >
                {fmt(value)}
              </span>
            )
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto
          [&::-webkit-scrollbar]:w-[5px]
          [&::-webkit-scrollbar-track]:rounded-full
          [&::-webkit-scrollbar-track]:bg-[#060c1f]
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-[#1e3a6e]
          [&::-webkit-scrollbar-thumb:hover]:bg-[#2d5499]">
          <div className="flex min-w-0">
            <div className="flex shrink-0 flex-col" style={{ width: leftLabelWidth }}>
              {timelineRows.map((row) => (
                <div key={row.type}
                  className="relative flex items-start justify-end pr-2 pt-1 text-right font-medium text-[#a8c4f0] transition-colors"
                  onMouseEnter={() => setHoveredRow(row.type)}
                  onMouseLeave={() => setHoveredRow((current) => (current === row.type ? null : current))}
                  style={{ height: row.height, fontSize: labelSize, textShadow: "0 0 6px rgba(100,160,255,0.35)" }}>
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 right-1 rounded-l-md transition-opacity"
                    style={{
                      opacity: hoveredRow === row.type ? 1 : 0,
                      background: "linear-gradient(90deg, rgba(38,92,164,0.26), rgba(16,34,70,0.10))",
                      boxShadow: hoveredRow === row.type ? "inset 0 0 0 1px rgba(112,178,255,0.18)" : undefined,
                    }}
                  />
                  <span className="whitespace-normal break-words leading-[1.28]">{row.label}</span>
                </div>
              ))}
            </div>

            <div
              ref={containerRef}
              className={`min-w-0 flex-1 ${zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
              onWheel={handleWheel}
              onMouseDown={startDrag}
            >
              {timelineRows.map((row) => (
                <div
                  key={row.type}
                  className="relative"
                  onMouseEnter={() => setHoveredRow(row.type)}
                  onMouseLeave={() => setHoveredRow((current) => (current === row.type ? null : current))}
                  style={{ height: row.height }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 rounded-md transition-opacity"
                    style={{
                      opacity: hoveredRow === row.type ? 1 : 0,
                      background: "linear-gradient(90deg, rgba(25,57,110,0.34), rgba(11,24,50,0.14))",
                      boxShadow: hoveredRow === row.type ? "inset 0 0 0 1px rgba(122,180,255,0.16)" : undefined,
                    }}
                  />
                  {ticks.map(value => {
                    const isMajorTick = value === 0 || value === DAY_SECONDS || value % majorTickStep === 0
                    const isAnchorTick = value === 0 || value === 12 * 60 * 60 || value === DAY_SECONDS

                    return (
                      <Fragment key={value}>
                        {isMajorTick && (
                          <div
                            className="absolute top-0"
                            style={{
                              left: pct(value),
                              width: isAnchorTick ? 3 : 2,
                              height: isAnchorTick ? 14 : 10,
                              borderRadius: 999,
                              background: isAnchorTick
                                ? "linear-gradient(180deg, rgba(158,220,255,0.95), rgba(95,166,255,0.55))"
                                : "linear-gradient(180deg, rgba(110,176,255,0.72), rgba(72,124,210,0.42))",
                              boxShadow: isAnchorTick
                                ? "0 0 10px rgba(120,192,255,0.28)"
                                : "0 0 6px rgba(84,138,220,0.18)",
                              transform: "translateX(-50%)",
                              opacity: isAnchorTick ? 1 : 0.94,
                            }}
                          />
                        )}
                        <div
                          className="absolute inset-y-0"
                          style={{
                            left: pct(value),
                            width: isAnchorTick ? 2 : isMajorTick ? 2 : 1,
                            background: isAnchorTick
                              ? "linear-gradient(180deg, rgba(124,192,255,0.72), rgba(58,104,176,0.34))"
                              : isMajorTick
                                ? "linear-gradient(180deg, rgba(84,138,220,0.52), rgba(38,72,132,0.3))"
                                : "linear-gradient(180deg, rgba(26,46,90,0.58), rgba(26,46,90,0.22))",
                            boxShadow: isAnchorTick
                              ? "0 0 10px rgba(124,192,255,0.22)"
                              : isMajorTick
                                ? "0 0 8px rgba(84,138,220,0.16)"
                                : undefined,
                            opacity: isAnchorTick ? 1 : isMajorTick ? 1 : 0.78,
                          }}
                        />
                      </Fragment>
                    )
                  })}
                  <div className="absolute inset-x-0 bottom-0 h-px bg-[#1a2654]/30" />
                  {row.events
                    .filter(ev => ev.end > viewStart && ev.start < viewEnd)
                    .map((ev, i) => {
                      const cs = Math.max(ev.start, viewStart)
                      const ce = Math.min(ev.end, viewEnd)
                      return (
                        <div key={i}
                          className="absolute cursor-pointer rounded opacity-85 transition-opacity hover:opacity-100"
                          style={{
                            left: pct(cs),
                            width: `${((ce - cs) / span) * 100}%`,
                            minWidth: 4,
                            top: rowPaddingY + ev.lane * (laneHeight + laneGap),
                            height: laneHeight,
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
        </div>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-[200] rounded-lg border border-[#1e3a70] bg-[#0a1535] px-3 py-2.5 shadow-2xl"
          style={{ left: tooltip.mx + 14, top: tooltip.my - 8, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", fontSize: tooltipSize }}
        >
          <div className="mb-1.5 font-bold" style={{ color: LV_COLOR[tooltip.ev.lv], textShadow: `0 0 8px ${LV_COLOR[tooltip.ev.lv]}80` }}>
            {zh ? tooltip.ev.nameZh : tooltip.ev.nameEn} · {zh ? LV_LABEL[tooltip.ev.lv].zh : LV_LABEL[tooltip.ev.lv].en}
          </div>
          <div className="space-y-1 text-[#8a9ec8]">
            <div style={{ fontSize: labelSize }}>{fmt(tooltip.ev.start, true)} — {fmt(tooltip.ev.end, true)}</div>
            <div style={{ fontSize: labelSize }}>
              {zh ? "持续" : "Duration"}{" "}
              <span className="font-semibold text-[#c8deff]">{formatAlarmDuration(tooltip.ev.durationSeconds, zh)}</span>
            </div>
            {tooltip.ev.totalDurationSeconds != null && tooltip.ev.totalDurationSeconds > 0 && (
              <div style={{ fontSize: labelSize }}>
                {zh ? "总持续" : "Total"}{" "}
                <span className="font-semibold text-[#c8deff]">{formatAlarmDuration(tooltip.ev.totalDurationSeconds, zh)}</span>
              </div>
            )}
            {tooltip.ev.occurrenceRatio != null && (
              <div style={{ fontSize: labelSize }}>
                {zh ? "24h占比" : "24h Ratio"}{" "}
                <span className="font-semibold text-[#c8deff]">{(tooltip.ev.occurrenceRatio * 100).toFixed(2)}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 告警类型 × 等级 占比矩阵 ─────────────────────────────────────────────────
const LEVELS = [1, 2, 3, 4, 5] as const

function AlarmTypeStats({ items, zh }: { items: FaultDetailItem[]; zh: boolean }) {
  const scale = useFluidScale<HTMLDivElement>(1180, 2560, { ...DASHBOARD_CONTENT_SCALE, maxRootPx: 27 })
  const historyTypographyBoost = useHistoryTypographyBoost()
  const boostMetric = (value: number) => roundTo(value * historyTypographyBoost)
  const labelSize = boostMetric(scale.fluid(11, 16))
  const valueSize = boostMetric(scale.fluid(12, 18))
  const legendSize = boostMetric(scale.fluid(10, 12))
  const legendGap = boostMetric(scale.fluid(5, 10))
  const legendBarWidth = Math.round(boostMetric(scale.fluid(10, 14)))
  const legendTextWidth = Math.round(boostMetric(scale.fluid(26, 36)))
  const levelColumnWidth = Math.round(boostMetric(scale.fluid(62, 82)))
  const matrixMinHeight = Math.round(boostMetric(scale.fluid(252, 336)))
  const matrixCellHeight = Math.round(boostMetric(scale.fluid(26, 32)))
  if (items.length === 0) return null

  const fmtRatio = (ratio: number) => `${(ratio * 100).toFixed(2)}%`
  const typeOrder: string[] = []
  items.forEach((item) => {
    if (!typeOrder.includes(item.faultName)) typeOrder.push(item.faultName)
  })

  const matrix = new Map<number, Map<string, number>>()
  LEVEL_DISPLAY_ORDER.forEach((level) => matrix.set(level, new Map()))
  items.forEach((item) => {
    const ratio = Math.max(0, item.occurrenceRatio ?? 0)
    const row = matrix.get(item.levelValue)
    if (!row) return
    row.set(item.faultName, (row.get(item.faultName) ?? 0) + ratio)
  })

  const visibleLevels = getVisibleLevels(items.map((item) => item.levelValue))
  const maxRatio = Math.max(
    0.0001,
    ...visibleLevels.flatMap((level) => typeOrder.map((typeName) => matrix.get(level)?.get(typeName) ?? 0))
  )
  const gridTemplateColumns = `${levelColumnWidth}px repeat(${typeOrder.length}, minmax(0, 1fr))`
  const legendHigh = alarmMatrixRgb(1)
  const legendMid = alarmMatrixRgb(0.55)
  const legendLow = alarmMatrixRgb(0.06)
  const levelAccent = alarmMatrixRgb(0.76)

  return (
    <div
      ref={scale.ref}
      className="shrink-0 flex min-h-0 flex-col rounded-lg border border-[#1a3060] bg-[#070d20]/80 px-3 py-2"
      style={{ ...scale.rootStyle, minHeight: matrixMinHeight }}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="h-3.5 w-[3px] rounded-full bg-[#00d4aa]" style={{ boxShadow: "0 0 6px #00d4aa80" }} />
        <div className="min-w-0 font-bold tracking-wide text-[#cfe3ff] [text-shadow:0_0_10px_rgba(124,170,255,0.15)]" style={{ fontSize: valueSize }}>
          {zh ? "24小时告警持续占比矩阵" : "24h Alarm Duration Ratio Matrix"}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch" style={{ columnGap: legendGap }}>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto
          [&::-webkit-scrollbar]:w-[5px]
          [&::-webkit-scrollbar]:h-[5px]
          [&::-webkit-scrollbar-track]:rounded-full
        [&::-webkit-scrollbar-track]:bg-[#060c1f]
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:bg-[#1e3a6e]
        [&::-webkit-scrollbar-thumb:hover]:bg-[#2d5499]
        [&::-webkit-scrollbar-corner]:bg-[#060c1f]">
          <div className="grid min-w-0 gap-x-1 gap-y-1" style={{ gridTemplateColumns }}>
            <div />
            {typeOrder.map((typeName) => (
              <div key={typeName} className="min-w-0 px-[2px] text-center">
                <span
                  className="block whitespace-normal break-words font-bold leading-tight tracking-[0.02em] text-[#a7c7ff]"
                  style={{
                    fontSize: labelSize,
                    textShadow: "0 0 10px rgba(98,154,255,0.18)",
                  }}
                >
                  {typeName}
                </span>
              </div>
            ))}

            {visibleLevels.map((level) => {
              const row = matrix.get(level) ?? new Map<string, number>()
              return (
                <Fragment key={level}>
                  <div className="flex min-w-0 items-center gap-1.5 pr-1.5">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: rgbToCss(levelAccent), boxShadow: `0 0 6px ${rgbaToCss(levelAccent, 0.42)}` }}
                    />
                    <span className="truncate font-medium text-[#d7e6ff]" style={{ fontSize: labelSize }}>
                      {zh ? LV_LABEL[level].zh : LV_LABEL[level].en}
                    </span>
                  </div>

                  {typeOrder.map((typeName) => {
                    const ratio = row.get(typeName) ?? 0
                    const weight = ratio > 0 ? ratio / maxRatio : 0
                    const startColor = alarmMatrixRgb(0.08 + weight * 0.36)
                    const endColor = alarmMatrixRgb(0.22 + weight * 0.74)
                    const borderColor = alarmMatrixRgb(0.3 + weight * 0.62)
                    const glossAlpha = 0.16 - weight * 0.05
                    const glowAlpha = 0.08 + weight * 0.16
                    return (
                      <div key={`${level}-${typeName}`} className="min-w-0 px-[2px]">
                        {ratio > 0 ? (
                          <div
                            className="flex w-full min-w-0 items-center justify-center rounded-sm border px-1"
                            style={{
                              height: matrixCellHeight,
                              background: `linear-gradient(180deg, rgba(255,255,255,${glossAlpha}), rgba(255,255,255,0.02)), linear-gradient(135deg, ${rgbToCss(startColor)}, ${rgbToCss(endColor)})`,
                              borderColor: rgbaToCss(borderColor, 0.85),
                              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 0 14px ${rgbaToCss(borderColor, glowAlpha)}`,
                            }}
                          >
                            <span
                              className="truncate font-bold tabular-nums leading-none"
                              style={{
                                color: ALARM_MATRIX_TEXT_COLOR,
                                textShadow: "0 1px 0 rgba(255,255,255,0.22), 0 0 6px rgba(17,36,58,0.18)",
                                fontSize: valueSize,
                              }}
                            >
                              {fmtRatio(ratio)}
                            </span>
                          </div>
                        ) : (
                          <div
                            className="flex w-full items-center justify-center rounded-sm border"
                            style={{
                              height: matrixCellHeight,
                              borderColor: "rgba(124, 92, 24, 0.42)",
                              background: "rgba(31, 21, 5, 0.58)",
                            }}
                          >
                            <span className="text-[#6e5a27]" style={{ fontSize: labelSize }}>·</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </Fragment>
              )
            })}
          </div>
        </div>
        <div className="flex h-full shrink-0 items-center py-0.5 pr-0" style={{ columnGap: legendGap }}>
          <div
            className="h-full min-h-[148px] rounded-full border border-white/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"
            style={{
              width: legendBarWidth,
              background: `linear-gradient(to bottom, ${rgbToCss(legendHigh)}, ${rgbToCss(legendMid)}, ${rgbToCss(legendLow)})`,
            }}
          />
          <div
            className="flex h-full min-w-max flex-col items-start justify-between text-left tracking-[0.02em] text-[#b7d3ff]"
            style={{ width: legendTextWidth }}
          >
            <span
              className="block whitespace-nowrap font-extrabold text-[#e6f2ff] [text-shadow:0_0_10px_rgba(251,191,36,0.42)]"
              style={{ fontSize: legendSize }}
            >
              {zh ? "高" : "H"}
            </span>
            <span
              className="block whitespace-nowrap font-semibold text-[#d9b766]"
              style={{ fontSize: legendSize }}
            >
              {zh ? "占比" : "Ratio"}
            </span>
            <span
              className="block whitespace-nowrap font-extrabold text-[#e6f2ff] [text-shadow:0_0_10px_rgba(251,191,36,0.22)]"
              style={{ fontSize: legendSize }}
            >
              {zh ? "低" : "L"}
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

// ── 等级标识 ──────────────────────────────────────────────────────────────────
function LevelIndicator({ lv, zh }: { lv: number; zh: boolean }) {
  if (lv === 0) {
    return (
      <div className="inline-flex items-center rounded-full border border-[#7b879d]/35 bg-[#1a2337] px-2 py-0.5">
        <span className="font-semibold" style={{ color: LV_BRIGHT[0], fontSize: 11 }}>
          {zh ? "其他" : "Other"}
        </span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full border px-2 py-1"
      style={{
        borderColor: `${LV_COLOR[lv]}44`,
        background: `linear-gradient(135deg, ${LV_SURFACE[lv]}, rgba(${hexToRgb(LV_COLOR[lv])}, 0.08))`,
        boxShadow: `inset 0 0 0 1px rgba(${hexToRgb(LV_COLOR[lv])}, 0.08)`,
      }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-2 w-2 rounded-full transition-colors"
          style={{
            backgroundColor: i <= lv ? LV_COLOR[lv] : "#16213f",
            boxShadow: i <= lv ? `0 0 7px ${LV_COLOR[lv]}aa` : "inset 0 0 0 1px rgba(95,121,173,0.18)",
          }} />
      ))}
      <span className="ml-1 font-semibold tracking-[0.04em]" style={{ color: LV_BRIGHT[lv], fontSize: 10 }}>
        {zh ? LV_LABEL[lv].zh : LV_LABEL[lv].en}
      </span>
    </div>
  )
}

// ── 告警行 ────────────────────────────────────────────────────────────────────
function AlarmRow({
  alarm,
  zh,
  tableFontSize,
  headerFontSize,
}: {
  alarm: AlarmEntry
  zh: boolean
  tableFontSize: number
  headerFontSize: number
}) {
  const isActive = alarm.statusZh === "未恢复"
  const color    = LV_COLOR[alarm.lv]
  const action   = ACTION_MAP[alarm.lv]

  const timePart = alarm.time.split(" ")[1]?.slice(0, 5) ?? ""

  return (
    <tr className={`border-b border-[#1a2654]/50 transition-colors last:border-0 ${
      alarm.lv >= 5 ? "bg-[#3a0e0e]/30" : "hover:bg-[#1a2654]/20"
    }`}>
      <td className="py-2 pl-3 pr-2 tabular-nums text-[#7ab0f0]" style={{ fontSize: tableFontSize }}>{timePart}</td>
      <td className="py-2 pr-2">
        <div
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
          style={{
            borderColor: `${color}55`,
            background: `linear-gradient(135deg, ${LV_SURFACE[alarm.lv]}, rgba(${hexToRgb(color)}, 0.08))`,
            boxShadow: `inset 0 0 0 1px rgba(${hexToRgb(color)}, 0.08), 0 0 10px rgba(${hexToRgb(color)}, 0.10)`,
          }}
        >
          <span className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}aa${alarm.lv >= 5 ? `, 0 0 0 2px ${color}33` : ""}` }} />
          <span className="whitespace-nowrap font-semibold tracking-[0.04em]" style={{ color: LV_BRIGHT[alarm.lv], fontSize: tableFontSize }}>
            {zh ? LV_LABEL[alarm.lv].zh : LV_LABEL[alarm.lv].en}
          </span>
        </div>
      </td>
      <td className="relative max-w-0 py-2 pr-2">
        <span className="block whitespace-normal break-words leading-[1.35] text-[#dbe8ff]" style={{ fontSize: headerFontSize }}>
          {isActive && <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#ef4444] align-middle" />}
          {zh ? alarm.nameZh : alarm.nameEn}
        </span>
      </td>
      <td className="py-2 pr-2 text-[#7b8ab8]" style={{ fontSize: tableFontSize }}>{(zh ? GRP_LABEL[alarm.group]?.zh : GRP_LABEL[alarm.group]?.en) ?? alarm.group}</td>
      <td className="py-2 pr-2"><LevelIndicator lv={alarm.lv} zh={zh} /></td>
      <td className="py-2 pr-2 whitespace-normal break-words text-[#7b8ab8]" style={{ fontSize: tableFontSize }}>
        <span className="text-[#dbe8ff]">{alarm.ref}</span>{" / "}{alarm.rref}
      </td>
      <td className="py-2 pr-2">
        <span className="font-medium" style={{ color: STATUS_COLOR[zh ? alarm.statusZh : alarm.statusEn], fontSize: tableFontSize }}>
          {zh ? alarm.statusZh : alarm.statusEn}
        </span>
      </td>
      <td className="py-2 pr-3 font-medium" style={{ color: action.color, fontSize: tableFontSize }}>
        {zh ? action.zh : action.en}
      </td>
    </tr>
  )
}

function HistoryAlarmListRow({
  item,
  zh,
  tableFontSize,
  headerFontSize,
}: {
  item: FaultListItem
  zh: boolean
  tableFontSize: number
  headerFontSize: number
}) {
  const level = item.levelValue
  const color = LV_COLOR[level]
  const severity = SEVERITY_META[level]
  const actionHint = ACTION_HINT_MAP[level]

  return (
    <tr className={`border-b border-[#1a2654]/50 transition-colors last:border-0 ${level >= 5 ? "bg-[#3a0e0e]/26" : "hover:bg-[#1a2654]/20"}`}>
      <td className="py-2 pl-3 pr-2 align-top">
        <div className="font-semibold text-[#dbe8ff]" style={{ fontSize: headerFontSize }}>
          {item.faultName}
        </div>
      </td>
      <td className="py-2 pr-2 align-top">
        <span
          className="inline-flex rounded-full border px-2 py-0.5 font-semibold"
          style={{
            fontSize: tableFontSize,
            color: severity.badge,
            borderColor: `${severity.badge}55`,
            backgroundColor: severity.tone,
            boxShadow: `inset 0 0 0 1px rgba(${hexToRgb(severity.badge)}, 0.08)`,
          }}
        >
          {zh ? severity.zh : severity.en}
        </span>
      </td>
      <td className="py-2 pr-2 align-top">
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5"
          style={{
            borderColor: `${color}55`,
            background: `linear-gradient(135deg, ${LV_SURFACE[level]}, rgba(${hexToRgb(color)}, 0.08))`,
          }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}aa` }} />
          <span className="font-semibold" style={{ color: LV_BRIGHT[level], fontSize: tableFontSize }}>
            {item.level}
          </span>
        </span>
      </td>
      <td className="py-2 pr-2 align-top tabular-nums text-[#dbe8ff]" style={{ fontSize: tableFontSize }}>
        {item.firstOccur || "--"}
      </td>
      <td className="py-2 pr-2 align-top tabular-nums text-[#dbe8ff]" style={{ fontSize: tableFontSize }}>
        {item.lastOccur || "--"}
      </td>
      <td className="py-2 pr-2 align-top tabular-nums text-[#8fdcff]" style={{ fontSize: tableFontSize }}>
        {formatWindowDuration(item.windowDurationSeconds, zh)}
      </td>
      <td className="py-2 pr-2 align-top tabular-nums text-[#dbe8ff]" style={{ fontSize: tableFontSize }}>
        {item.rowCount}
      </td>
      <td className="py-2 pr-3 align-top text-[#9fb7df]" style={{ fontSize: tableFontSize, lineHeight: 1.4 }}>
        {zh ? actionHint.zh : actionHint.en}
      </td>
    </tr>
  )
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export function AlarmLogPanel({
  mode = "realtime",
  date,
  deviceId,
}: {
  mode?: "realtime" | "history"
  date?: string
  deviceId?: string
}) {
  const { language } = useLanguage()
  const { selectedProject } = useProject()
  const zh = language === "zh"
  const scale = useFluidScale<HTMLDivElement>(1180, 2560, { ...DASHBOARD_CONTENT_SCALE, maxRootPx: 27 })
  const historyTypographyBoost = useHistoryTypographyBoost()
  const panelTypographyBoost = mode === "history" ? historyTypographyBoost : 1
  const boostPanelMetric = (value: number) => roundTo(value * panelTypographyBoost)
  const titleSize = mode === "history" ? `${boostPanelMetric(scale.fluid(14.4, 24))}px` : scale.clampText(0.9, 0.98, 1.5)
  const infoSize = boostPanelMetric(scale.fluid(12, 17))
  const badgeSize = boostPanelMetric(scale.fluid(11, 15))
  const tableFontSize = boostPanelMetric(scale.fluid(11, 15))
  const headerFontSize = boostPanelMetric(scale.fluid(12, 16))
  const historyColumnScale = Math.min(panelTypographyBoost, 1.12)
  const historyTableMinWidth = Math.round(1280 * historyColumnScale)

  const REALTIME_LIMIT = 15

  const [viewMode,    setViewMode]    = useState<"gantt" | "table">("gantt")
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all")
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const normalizedDeviceId = deviceId?.trim() || undefined
  const selectedDeviceName = useMemo(
    () => selectedProject.devices.find((device) => device.deviceId === deviceId)?.deviceName ?? null,
    [deviceId, selectedProject.devices]
  )
  const deviceNameMap = useMemo(
    () => new Map(selectedProject.devices.map((device) => [device.deviceId, device.deviceName])),
    [selectedProject.devices]
  )
  const historyRequestKey = useMemo(
    () => `${selectedProject.projectId}::${normalizedDeviceId ?? ""}::${date ?? ""}`,
    [date, normalizedDeviceId, selectedProject.projectId]
  )
  const [historyFaultState, setHistoryFaultState] = useState<{ requestKey: string; items: FaultDetailItem[] } | null>(null)
  const [historyFaultListState, setHistoryFaultListState] = useState<{ requestKey: string; items: FaultListItem[] } | null>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const hasMatchingHistoryFaultState = historyFaultState?.requestKey === historyRequestKey
  const hasMatchingHistoryFaultListState = historyFaultListState?.requestKey === historyRequestKey

  // ── 实时告警状态（动态更新） ────────────────────────────────────────────────
  const [liveAlarms, setLiveAlarms] = useState<AlarmEntry[]>(() =>
    Array.from({ length: 8 }, (_, i) => makeRTAlarm(i * 55 + 15))
      .sort((a, b) => b.time.localeCompare(a.time))
  )

  useEffect(() => {
    if (mode !== "realtime") return
    const id = setInterval(() => {
      setLiveAlarms(prev => {
        // 30% 概率将首条"未恢复"告警变为"已确认"
        if (Math.random() < 0.3) {
          const idx = prev.findIndex(a => a.statusZh === "未恢复")
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = { ...next[idx], statusZh: "已确认", statusEn: "Acknowledged" }
            return next
          }
        }
        // 否则推入一条新告警，保持最多 15 条
        return [makeRTAlarm(0), ...prev].slice(0, REALTIME_LIMIT)
      })
    }, 3500)
    return () => clearInterval(id)
  }, [mode])

  useEffect(() => {
    if (mode !== "history") {
      setIsHistoryLoading(false)
      setHistoryError(null)
      return
    }

    if (!selectedProject.projectId || !date || !normalizedDeviceId) {
      setIsHistoryLoading(false)
      setHistoryError(null)
      return
    }

    if (hasMatchingHistoryFaultState && hasMatchingHistoryFaultListState) {
      setIsHistoryLoading(false)
      setHistoryError(null)
      return
    }

    let cancelled = false
    const abortController = new AbortController()

    const loadHistoryFaults = async () => {
      setIsHistoryLoading(true)
      setHistoryError(null)

      try {
        const [detailItems, listItems] = await Promise.all([
          fetchFaultDetailList(selectedProject.projectId, date, {
            deviceId: normalizedDeviceId,
            signal: abortController.signal,
          }),
          fetchFaultList(selectedProject.projectId, date, {
            deviceId: normalizedDeviceId,
            signal: abortController.signal,
          }),
        ])

        if (cancelled) {
          return
        }

        setHistoryFaultState({
          requestKey: historyRequestKey,
          items: detailItems,
        })
        setHistoryFaultListState({
          requestKey: historyRequestKey,
          items: listItems,
        })
      } catch (error) {
        if (abortController.signal.aborted || cancelled) {
          return
        }

        console.error(`Failed to load fault history for ${selectedProject.projectId} on ${date}`, error)
        setHistoryError(zh ? "历史告警接口加载失败" : "Failed to load alarm history")
      } finally {
        if (!cancelled) {
          setIsHistoryLoading(false)
        }
      }
    }

    void loadHistoryFaults()

    return () => {
      cancelled = true
      abortController.abort()
    }
  }, [date, hasMatchingHistoryFaultListState, hasMatchingHistoryFaultState, historyRequestKey, mode, normalizedDeviceId, selectedProject.projectId, zh])

  const historyFaultItems = hasMatchingHistoryFaultState ? (historyFaultState?.items ?? []) : []
  const historyFaultListItems = hasMatchingHistoryFaultListState ? (historyFaultListState?.items ?? []) : []
  const historyApiAlarms = useMemo(
    () => normalizeHistoryFaultAlarms(historyFaultItems, deviceNameMap),
    [deviceNameMap, historyFaultItems]
  )
  const historyVisibleLevels = useMemo(
    () => getVisibleLevels(historyFaultItems.map((item) => item.levelValue)),
    [historyFaultItems]
  )
  const historyListVisibleLevels = useMemo(
    () => getVisibleLevels(historyFaultListItems.map((item) => item.levelValue)),
    [historyFaultListItems]
  )
  const realtimeFiltered = selectedDeviceName
    ? liveAlarms.filter((alarm) => matchesAlarmDevice(alarm.source, selectedDeviceName))
    : liveAlarms
  const historyFiltered = historyApiAlarms

  const timelineEvents = deriveTimelineEvents(historyFiltered)
  const isHistoryTableView = mode === "history" && viewMode === "table"
  const historyTableDisplayed = historyFaultListItems.filter((item) => levelFilter === "all" || item.levelValue === Number(levelFilter.replace("level:", "")))

  // ── 当前模式数据源 ──────────────────────────────────────────────────────────
  const baseData = mode === "realtime" ? realtimeFiltered : historyFiltered
  const dataVisibleLevels = useMemo(
    () => getVisibleLevels(baseData.map((alarm) => alarm.lv)),
    [baseData]
  )

  const sorted = [...baseData].sort((a, b) => {
    if (mode === "realtime") {
      if (a.statusZh === "未恢复" && b.statusZh !== "未恢复") return -1
      if (b.statusZh === "未恢复" && a.statusZh !== "未恢复") return 1
    }
    return b.time.localeCompare(a.time)
  })

  const visibleLevels = mode === "history"
    ? (isHistoryTableView ? historyListVisibleLevels : historyVisibleLevels)
    : dataVisibleLevels

  useEffect(() => {
    if (levelFilter === "all") {
      return
    }

    const activeLevel = Number(levelFilter.replace("level:", ""))
    if (!visibleLevels.includes(activeLevel)) {
      setLevelFilter("all")
    }
  }, [levelFilter, visibleLevels])

  const displayed = sorted.filter(a => {
    const levelMatched = levelFilter === "all" || a.lv === Number(levelFilter.replace("level:", ""))

    const groupMatched = groupFilter === "all" || a.group === groupFilter

    return levelMatched && groupMatched
  })

  const levelCounts = useMemo(
    () => {
      if (mode === "history" && isHistoryTableView) {
        return visibleLevels.map((level) => ({
          level,
          count: historyFaultListItems.filter((item) => item.levelValue === level).length,
        }))
      }

      return visibleLevels.map((level) => ({
        level,
        count: baseData.filter((alarm) => alarm.lv === level).length,
      }))
    },
    [baseData, historyFaultListItems, isHistoryTableView, mode, visibleLevels]
  )

  const cnt = {
    total:  mode === "history" && isHistoryTableView ? historyFaultListItems.length : baseData.length,
    active: mode === "realtime" ? baseData.filter(a => a.statusZh === "未恢复").length : 0,
  }

  const showTable = mode === "realtime" || viewMode === "table"
  const hideHeaderSummary = mode === "history" && viewMode === "gantt"
  const historyEmptyText = zh ? "该日期无告警记录" : "No alarm records"
  const isHistoryListEmpty = mode === "history" && historyTableDisplayed.length === 0

  useEffect(() => {
    if (!isFullscreen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false)
      }
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isFullscreen])

  return (
    <div className={isFullscreen ? "fixed inset-0 z-[220] bg-[#020614]/88 p-3 backdrop-blur-sm md:p-4" : "h-full"}>
      <div
        ref={scale.ref}
        className={`flex min-h-0 flex-col overflow-hidden rounded-lg border border-[#1a2654] bg-[#0d1233] p-3 ${
          isFullscreen ? "h-full border-[#24508c] shadow-[0_24px_90px_rgba(0,0,0,0.55)]" : "h-full"
        }`}
        style={scale.rootStyle}
      >

      {/* ── Header ── */}
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <div className="h-4 w-1 shrink-0 rounded-full bg-[#f97316]" />
        <span className="font-semibold text-[#f97316]" style={{ fontSize: titleSize }}>{zh ? "告警日志" : "Alarm Log"}</span>
        {!hideHeaderSummary && (
          <span className="font-medium text-[#5f79ad]" style={{ fontSize: infoSize }}>
            {mode === "history"
              ? (zh ? `共 ${cnt.total} 条` : `Total ${cnt.total}`)
              : (zh ? `最新 ${Math.min(cnt.total, REALTIME_LIMIT)} 条` : `Latest ${Math.min(cnt.total, REALTIME_LIMIT)}`)}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {cnt.active > 0 && (
            <span className="rounded-full border border-[#ef4444]/30 bg-[#3a0e0e] px-2.5 py-0.5 font-semibold text-[#ef4444]" style={{ fontSize: badgeSize }}>
              {zh ? `活动 ${cnt.active}` : `Active ${cnt.active}`}
            </span>
          )}
          {!hideHeaderSummary && levelCounts.map(({ level, count }) => (
            <span
              key={`badge-${level}`}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-semibold"
              style={{
                fontSize: badgeSize,
                color: LV_BRIGHT[level],
                border: `1px solid ${LV_COLOR[level]}52`,
                background: `linear-gradient(135deg, ${LV_SURFACE[level]}, rgba(${hexToRgb(LV_COLOR[level])}, 0.08))`,
                boxShadow: `inset 0 0 0 1px rgba(${hexToRgb(LV_COLOR[level])}, 0.08), 0 0 10px rgba(${hexToRgb(LV_COLOR[level])}, 0.10)`,
              }}
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: LV_COLOR[level], boxShadow: `0 0 8px ${LV_COLOR[level]}aa` }}
              />
              <span className="tracking-[0.05em] text-[#b7caf0]/88">
                {zh ? LV_LABEL[level].zh : LV_LABEL[level].en}
              </span>
              <span className="rounded-full px-1.5 py-[1px] font-bold tabular-nums"
                style={{
                  color: LV_BRIGHT[level],
                  backgroundColor: `rgba(${hexToRgb(LV_COLOR[level])}, 0.14)`,
                  boxShadow: `inset 0 0 0 1px rgba(${hexToRgb(LV_COLOR[level])}, 0.10)`,
                }}>
                {zh ? `${count}条` : count}
              </span>
            </span>
          ))}

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
          <button
            type="button"
            onClick={() => setIsFullscreen((current) => !current)}
            title={isFullscreen ? (zh ? "退出全屏" : "Exit fullscreen") : (zh ? "全屏放大" : "Fullscreen")}
            className="flex h-7 items-center gap-1 rounded-lg border border-[#1e3a70] bg-[#070e28] px-2 text-[#7ab4f8] transition-all hover:bg-[#0d1e48] hover:text-[#b7e3ff]"
            style={{ fontSize: badgeSize }}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? (zh ? "缩小" : "Restore") : (zh ? "全屏" : "Fullscreen")}</span>
          </button>
        </div>
      </div>

      {/* ── 历史甘特视图 + 类型统计 ── */}
      {mode === "history" && viewMode === "gantt" && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto pr-1">
          {isHistoryLoading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <HistoryStyleLoadingIndicator text={zh ? "加载历史告警甘特图..." : "Loading alarm gantt..."} />
            </div>
          ) : historyError ? (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-[#1a3060] bg-[#080e28]/70 px-4 text-center text-[#7b8ab8]" style={{ fontSize: infoSize }}>
              {historyError}
            </div>
          ) : historyFiltered.length === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-[#1a3060] bg-[#080e28]/70 px-4 text-center text-[#7b8ab8]" style={{ fontSize: infoSize }}>
              {historyEmptyText}
            </div>
          ) : (
            <>
              <div className="min-h-[260px] flex-1 overflow-hidden">
                <AlarmTimeline events={timelineEvents} zh={zh} visibleLevels={historyVisibleLevels} />
              </div>
              <AlarmTypeStats items={historyFaultItems} zh={zh} />
            </>
          )}
        </div>
      )}

      {/* ── 筛选栏 + 告警表格 ── */}
      {showTable && (
        <>
          <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-[#5f79ad]" />
            <div className="flex gap-1">
              {(["all", ...visibleLevels.map((level) => `level:${level}` as const)] as LevelFilter[]).map((levelKey) => {
                const level = levelKey === "all" ? null : Number(levelKey.replace("level:", ""))
                return (
                <button key={levelKey} onClick={() => setLevelFilter(levelKey)}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                    levelFilter === levelKey ? "bg-[#00d4aa] text-[#07162b]" : "bg-[#0e1e3a] text-[#5a7aaa] hover:bg-[#142040] hover:text-[#90b8f0]"
                  }`}
                  style={{ fontSize: badgeSize }}>
                  {levelKey === "all" ? (zh ? "全部" : "All") : (zh ? LV_LABEL[level ?? 0].zh : LV_LABEL[level ?? 0].en)}
                </button>
              )})}
            </div>
            {mode === "realtime" && (
              <>
                <div className="h-4 w-px bg-[#1a2654]" />
                <div className="relative min-w-[128px]">
                  <select
                    value={groupFilter}
                    onChange={(event) => setGroupFilter(event.target.value as GroupFilter)}
                    className="h-7 w-full appearance-none rounded-md border border-[#1e3a70] bg-[#0e1e3a] pl-2.5 pr-7 font-semibold text-[#8fe7ff] outline-none transition-colors hover:border-[#2a4f92] focus:border-[#3b7bd6]"
                    style={{ fontSize: badgeSize }}
                  >
                    {GROUP_FILTERS.map(group => (
                      <option key={group} value={group}>
                        {group === "all" ? (zh ? "全部分类" : "All Types") : (zh ? GRP_LABEL[group].zh : GRP_LABEL[group].en)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5f79ad]" />
                </div>
              </>
            )}
          </div>

          {mode === "history" && isHistoryLoading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-[#1a2654]/60">
              <HistoryStyleLoadingIndicator text={zh ? "加载历史告警列表..." : "Loading alarm history..."} />
            </div>
          ) : mode === "history" && !historyError && isHistoryListEmpty ? (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-[#1a2654]/60 bg-[#0a1330]/55 px-4 text-center text-[#5f79ad]" style={{ fontSize: infoSize }}>
              {historyEmptyText}
            </div>
          ) : (
            <div className={`min-h-0 flex-1 rounded-lg border border-[#1a2654]/60 ${
              isHistoryListEmpty ? "overflow-hidden" : "overflow-auto"
            }
              [&::-webkit-scrollbar]:w-[5px]
              [&::-webkit-scrollbar]:h-[5px]
              [&::-webkit-scrollbar-track]:rounded-full
              [&::-webkit-scrollbar-track]:bg-[#060c1f]
              [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-thumb]:bg-[#1e3a6e]
              [&::-webkit-scrollbar-thumb:hover]:bg-[#2d5499]
              [&::-webkit-scrollbar-corner]:bg-[#060c1f]`}>
              <table className="w-full border-collapse text-left" style={{ tableLayout: "fixed", minWidth: mode === "history" ? historyTableMinWidth : 760 }}>
                <colgroup>
                  {mode === "history" ? (
                    <>
                      <col style={{ width: `${Math.round(240 * historyColumnScale)}px` }} />
                      <col style={{ width: `${Math.round(100 * historyColumnScale)}px` }} />
                      <col style={{ width: `${Math.round(92 * historyColumnScale)}px` }} />
                      <col style={{ width: `${Math.round(160 * historyColumnScale)}px` }} />
                      <col style={{ width: `${Math.round(160 * historyColumnScale)}px` }} />
                      <col style={{ width: `${Math.round(150 * historyColumnScale)}px` }} />
                      <col style={{ width: `${Math.round(140 * historyColumnScale)}px` }} />
                      <col style={{ width: `${Math.round(280 * historyColumnScale)}px` }} />
                    </>
                  ) : (
                    <>
                      <col style={{ width: "58px" }} />
                      <col style={{ width: "96px" }} />
                      <col style={{ width: "168px" }} />
                      <col style={{ width: "64px" }} />
                      <col style={{ width: "72px" }} />
                      <col style={{ width: "126px" }} />
                      <col style={{ width: "68px" }} />
                      <col style={{ width: "76px" }} />
                    </>
                  )}
                </colgroup>
                <thead>
                  <tr className="sticky top-0 z-10 bg-[#101840]">
                    {[
                      ...(mode === "history"
                        ? [
                            zh ? "故障" : "Fault",
                            zh ? "严重度" : "Severity",
                            zh ? "等级" : "Level",
                            zh ? "首次发生" : "First Occur",
                            zh ? "最后发生" : "Last Occur",
                            zh ? "持续窗口" : "Window Duration",
                            zh ? "当天出现次数" : "Count Today",
                            zh ? "处置建议" : "Action Hint",
                          ]
                        : [
                            zh ? "时间" : "Time",
                            zh ? "等级" : "Level",
                            zh ? "告警名称" : "Alarm",
                            zh ? "分类" : "Type",
                            zh ? "等级标识" : "Level Mark",
                            zh ? "触发 / 恢复" : "Trig / Recv",
                            zh ? "状态" : "Status",
                            zh ? "处置" : "Action",
                          ]),
                    ].map(h => (
                      <th key={h} className="border-b border-[#1a2654] px-2 py-2 text-left font-semibold text-[#6a8abf] first:pl-3 last:pr-3" style={{ fontSize: tableFontSize }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mode === "history" && historyError ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[#7b8ab8]" style={{ fontSize: infoSize }}>
                        {historyError}
                      </td>
                    </tr>
                  ) : mode === "history" ? (
                    historyTableDisplayed.map((item) => (
                      <HistoryAlarmListRow
                        key={item.id}
                        item={item}
                        zh={zh}
                        tableFontSize={tableFontSize}
                        headerFontSize={headerFontSize}
                      />
                    ))
                  ) : displayed.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[#5f79ad]" style={{ fontSize: infoSize }}>
                        {historyEmptyText}
                      </td>
                    </tr>
                  ) : (
                    displayed.map(alarm => (
                      <AlarmRow
                        key={alarm.key ?? `${alarm.time}-${alarm.source}-${alarm.nameZh}`}
                        alarm={alarm}
                        zh={zh}
                        tableFontSize={tableFontSize}
                        headerFontSize={headerFontSize}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  )
}
