"use client"

import { useMemo } from "react"
import {
  AlertTriangle,
  BadgeCheck,
  BellRing,
  CircuitBoard,
  Cpu,
  Gauge,
  RadioTower,
  ShieldAlert,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { AlarmLogPanel, type AlarmHistoryOverride } from "@/components/dashboard/alarm-log-panel"
import { useLanguage } from "@/components/language-provider"
import type { FaultDetailItem, FaultListItem } from "@/lib/api/fault"
import type { MonitorDeviceKind } from "@/lib/api/trend-analysis"

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const hashSeed = (input: string) => {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const mulberry32 = (seed: number) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const pick = (seed: string, min: number, max: number) => min + mulberry32(hashSeed(seed))() * (max - min)
const pickInt = (seed: string, min: number, max: number) => Math.round(pick(seed, min, max))

// 告警等级配色（与 alarm-log-panel 的 LV_COLOR 保持一致）
const LV_COLOR: Record<number, string> = { 1: "#85B7EB", 2: "#378ADD", 3: "#EF9F27", 4: "#E24B4A", 5: "#A32D2D" }
const LV_LABEL: Record<number, { zh: string; en: string }> = {
  1: { zh: "L1 轻微", en: "L1 Minor" },
  2: { zh: "L2 轻微", en: "L2 Minor" },
  3: { zh: "L3 重要", en: "L3 Major" },
  4: { zh: "L4 严重", en: "L4 Critical" },
  5: { zh: "L5 紧急", en: "L5 Urgent" },
}

type AlarmMode = "realtime" | "history"

type AlarmDeviceWorkspaceProps = {
  mode: AlarmMode
  date?: string
  deviceId?: string
  deviceKind: MonitorDeviceKind
  deviceName: string
  projectId: string
}

// ─────────────────────────── shared UI ───────────────────────────
type AlarmPanelProps = {
  title: string
  icon?: LucideIcon
  accent: string
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  action?: React.ReactNode
}

function AlarmPanel({ title, icon: Icon, accent, children, className = "", bodyClassName = "", action }: AlarmPanelProps) {
  return (
    <section
      className={`relative flex min-h-0 flex-col overflow-hidden rounded-[10px] border bg-[linear-gradient(180deg,rgba(9,21,36,0.96),rgba(5,12,24,0.98))] shadow-[inset_0_1px_0_rgba(130,210,255,0.06)] ${className}`}
      style={{ borderColor: `${accent}44` }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}bb, transparent)` }}
      />
      <span className="pointer-events-none absolute bottom-1 left-1 h-2.5 w-2.5 border-b border-l" style={{ borderColor: `${accent}99` }} />
      <span className="pointer-events-none absolute bottom-1 right-1 h-2.5 w-2.5 border-b border-r" style={{ borderColor: `${accent}99` }} />
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2.5 pb-1.5">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} /> : <span className="h-3 w-1 rounded-full" style={{ background: accent }} />}
          <span className="truncate text-[12.5px] font-semibold tracking-[0.04em] text-[#e7f7ff]">{title}</span>
        </div>
        {action}
      </div>
      <div className={`min-h-0 flex-1 px-3 pb-3 ${bodyClassName}`}>{children}</div>
    </section>
  )
}

function MetricTile({
  label,
  value,
  unit,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  unit?: string
  icon: LucideIcon
  accent: string
}) {
  return (
    <div
      className="relative flex min-h-[82px] min-w-0 flex-col justify-between overflow-hidden rounded-[9px] border bg-[rgba(7,18,32,0.72)] px-3 py-2.5"
      style={{ borderColor: `${accent}40` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: `radial-gradient(90% 120% at 0% 0%, ${accent}22, transparent 64%)` }}
      />
      <div className="relative flex items-center justify-between gap-2">
        <span className="truncate text-[11px] tracking-[0.04em] text-[#8fb6cf]">{label}</span>
        <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} />
      </div>
      <div className="relative flex items-end gap-1">
        <span className="truncate text-[24px] font-bold leading-none text-[#f2fbff]">{value}</span>
        {unit && <span className="pb-0.5 text-[11px] text-[#7ea7bd]">{unit}</span>}
      </div>
    </div>
  )
}

type LevelDatum = { lv: number; count: number }

/** 告警等级分布环形图：按 L1–L5 占比绘制环段，中心显示总数。纯告警分析维度（非实时拓扑）。 */
function SeverityDonut({ levels, zh }: { levels: LevelDatum[]; zh: boolean }) {
  const total = levels.reduce((sum, item) => sum + item.count, 0)
  const size = 150
  const stroke = 16
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r

  let cumulative = 0
  const segments = levels
    .filter((item) => item.count > 0)
    .map((item) => {
      const fraction = total > 0 ? item.count / total : 0
      const segment = {
        lv: item.lv,
        dash: fraction * circumference,
        offset: -cumulative * circumference,
      }
      cumulative += fraction
      return segment
    })

  return (
    <div className="flex h-full min-h-0 items-center gap-3">
      {/* 环形图按面板可用高度自适应（封顶 150px），避免在较矮的面板里溢出遮挡标题 */}
      <div className="relative h-full max-h-[150px] min-h-0 shrink-0" style={{ aspectRatio: "1 / 1" }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="block h-full w-full -rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
          {segments.map((segment) => (
            <circle
              key={segment.lv}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={LV_COLOR[segment.lv]}
              strokeWidth={stroke}
              strokeDasharray={`${segment.dash} ${circumference}`}
              strokeDashoffset={segment.offset}
              strokeLinecap="butt"
              style={{ filter: `drop-shadow(0 0 4px ${LV_COLOR[segment.lv]}88)` }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[24px] font-bold leading-none text-[#f2fbff]">{total}</span>
          <span className="mt-1 text-[10px] tracking-[0.04em] text-[#8fb6cf]">{zh ? "告警总数" : "Total"}</span>
        </div>
      </div>
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5">
        {levels.map((item) => (
          <div key={item.lv} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: LV_COLOR[item.lv], boxShadow: `0 0 5px ${LV_COLOR[item.lv]}66` }} />
            <span className="min-w-0 flex-1 truncate text-[11px] text-[#9cc0d8]">{zh ? LV_LABEL[item.lv].zh : LV_LABEL[item.lv].en}</span>
            <span className="text-[12px] font-semibold tabular-nums text-[#e7f7ff]">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

type BarDatum = { label: string; count: number; accent: string }

/** 水平条形分布：故障域 / 设备排行 / 处置动作通用。条宽相对最大值归一化。 */
function DistributionBars({ items }: { items: BarDatum[] }) {
  const max = Math.max(1, ...items.map((item) => item.count))
  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5">
          <span className="w-[88px] shrink-0 truncate text-[11px] text-[#9cc0d8]">{item.label}</span>
          <div className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${(item.count / max) * 100}%`,
                background: `linear-gradient(90deg, ${item.accent}aa, ${item.accent})`,
                boxShadow: `0 0 8px ${item.accent}66`,
              }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-[12px] font-semibold tabular-nums text-[#e7f7ff]">{item.count}</span>
        </div>
      ))}
    </div>
  )
}

const highestLevel = (levels: LevelDatum[]) => {
  for (let lv = 5; lv >= 1; lv -= 1) {
    if (levels.find((item) => item.lv === lv && item.count > 0)) return lv
  }
  return 0
}

// 注意：以下数字仍来自确定性种子（pick/pickInt），布局/主题已切换为纯告警分析；
// 待后端故障聚合就绪后，替换为与 AlarmLogPanel 同源的 fetchFaultList/FaultDetail 派生值。
const buildLevels = (seed: string): LevelDatum[] => [
  { lv: 1, count: pickInt(`${seed}:l1`, 2, 6) },
  { lv: 2, count: pickInt(`${seed}:l2`, 3, 8) },
  { lv: 3, count: pickInt(`${seed}:l3`, 2, 6) },
  { lv: 4, count: pickInt(`${seed}:l4`, 1, 4) },
  { lv: 5, count: pickInt(`${seed}:l5`, 0, 2) },
]

// ─────────────────────────── 主题化告警目录（种子 mock）───────────────────────────
// PCS / EMS 现场多为占位设备，无真实故障接口；按主题注入故障目录，让底部甘特图/表格
// 呈现本主题（电气保护 / 站级）的故障名，而非回退到 BCU 的电池故障。待后端按设备出
// 故障接口后，移除 historyOverride 即可自动切回真实数据。
type FaultCatalogEntry = { zh: string; en: string; level: number }

const PCS_FAULT_CATALOG: FaultCatalogEntry[] = [
  { zh: "绝缘检测故障", en: "Insulation Fault", level: 5 },
  { zh: "EPO 急停故障", en: "EPO Fault", level: 5 },
  { zh: "直流过流", en: "DC Overcurrent", level: 4 },
  { zh: "IGBT 过温", en: "IGBT Overtemp", level: 4 },
  { zh: "电网缺相", en: "Grid Phase Loss", level: 4 },
  { zh: "直流继电器开路", en: "DC Relay Open", level: 4 },
  { zh: "交流继电器开路", en: "AC Relay Open", level: 4 },
  { zh: "电网过频", en: "Grid Overfreq", level: 3 },
  { zh: "电网欠频", en: "Grid Underfreq", level: 3 },
  { zh: "运行母线过压", en: "Run Bus Overvolt", level: 3 },
  { zh: "预充母线欠压", en: "Precharge Undervolt", level: 2 },
  { zh: "EMS 通信故障", en: "EMS Comm Fault", level: 2 },
  { zh: "BMS 通讯故障", en: "BMS Comm Fault", level: 2 },
  { zh: "风扇故障", en: "Fan Fault", level: 2 },
]

const EMS_FAULT_CATALOG: FaultCatalogEntry[] = [
  { zh: "消防联动触发", en: "Fire Linkage Triggered", level: 5 },
  { zh: "急停触发", en: "E-stop Triggered", level: 5 },
  { zh: "调度指令越限", en: "Dispatch Limit Exceeded", level: 3 },
  { zh: "策略下发失败", en: "Strategy Push Failed", level: 3 },
  { zh: "PCS 通讯中断", en: "PCS Comm Interrupted", level: 3 },
  { zh: "BMS 通讯中断", en: "BMS Comm Interrupted", level: 3 },
  { zh: "功率偏差超标", en: "Power Deviation High", level: 3 },
  { zh: "网关心跳丢失", en: "Gateway Heartbeat Lost", level: 2 },
  { zh: "采集延迟超限", en: "Acquisition Latency High", level: 2 },
  { zh: "空调故障", en: "HVAC Fault", level: 2 },
  { zh: "门禁告警", en: "Access Alarm", level: 1 },
  { zh: "时钟同步异常", en: "Clock Sync Error", level: 1 },
]

const pad2 = (value: number) => String(value).padStart(2, "0")
const secondsToClock = (value: number) => `${pad2(Math.floor(value / 3600))}:${pad2(Math.floor((value % 3600) / 60))}:${pad2(value % 60)}`

/** 由主题故障目录确定性生成历史告警数据（甘特用 detail + 表格用 list），按 seed+date 稳定。 */
const buildThemedAlarmHistory = (
  seed: string,
  statDate: string,
  catalog: FaultCatalogEntry[],
  zh: boolean,
): AlarmHistoryOverride => {
  const detailItems: FaultDetailItem[] = []
  const listItems: FaultListItem[] = []

  catalog.forEach((entry, idx) => {
    const rng = mulberry32(hashSeed(`${seed}:${statDate}:${entry.en}`))
    const ri = (n: number) => Math.floor(rng() * n)
    // 前 6 类保证至少出现 1 次，避免全空；其余按概率出现 0~3 次
    const occurrences = idx < 6 ? 1 + ri(3) : ri(4)
    if (occurrences === 0) return

    const intervals = Array.from({ length: occurrences }, () => {
      const startSec = ri(24 * 3600 - 4500)
      const durationSec = (5 + ri(66)) * 60
      return { startSec, durationSec }
    }).sort((left, right) => left.startSec - right.startSec)

    const timeIntervals = intervals.map(({ startSec, durationSec }) => ({
      start: secondsToClock(startSec),
      end: secondsToClock(startSec + durationSec),
      durationSeconds: durationSec,
    }))
    const totalDurationSeconds = intervals.reduce((sum, item) => sum + item.durationSec, 0)
    const firstStart = intervals[0].startSec
    const last = intervals[intervals.length - 1]
    const lastEnd = last.startSec + last.durationSec
    const name = zh ? entry.zh : entry.en
    const id = `${seed}-themed-${idx}`

    detailItems.push({
      id,
      projectId: "",
      deviceId: seed,
      statDate,
      faultName: name,
      level: `L${entry.level}`,
      levelValue: entry.level,
      totalDurationSeconds,
      occurrenceRatio: totalDurationSeconds / (24 * 3600),
      timeIntervals,
    })
    listItems.push({
      id,
      projectId: "",
      deviceId: seed,
      statDate,
      faultCode: `F${1000 + idx}`,
      faultName: name,
      level: `L${entry.level}`,
      levelValue: entry.level,
      firstOccur: secondsToClock(firstStart),
      lastOccur: secondsToClock(lastEnd),
      windowDurationSeconds: lastEnd - firstStart,
      rowCount: occurrences,
    })
  })

  return { detailItems, listItems }
}

// ─────────────────────────── PCS：电气保护主题 ───────────────────────────
function PcsAlarmWorkspace({ mode, date, deviceId, deviceName }: Omit<AlarmDeviceWorkspaceProps, "deviceKind" | "projectId">) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const seed = deviceId || deviceName || "pcs-alarm"

  const levels = useMemo(() => buildLevels(seed), [seed])
  const total = levels.reduce((sum, item) => sum + item.count, 0)
  const topLv = highestLevel(levels)
  const unresolved = clamp(pickInt(`${seed}:unres`, 1, levels[3].count + levels[4].count + 1), 0, total)
  const avgDuration = pick(`${seed}:dur`, 18, 64)
  const alarmHistory = useMemo(
    () => buildThemedAlarmHistory(seed, date ?? "", PCS_FAULT_CATALOG, zh),
    [seed, date, zh],
  )

  const domains: BarDatum[] = useMemo(
    () => [
      { label: zh ? "直流侧" : "DC Side", count: pickInt(`${seed}:dc`, 1, 6), accent: "#22d3ee" },
      { label: zh ? "交流并网" : "Grid", count: pickInt(`${seed}:grid`, 0, 5), accent: "#facc15" },
      { label: zh ? "热管理" : "Thermal", count: pickInt(`${seed}:thermal`, 0, 4), accent: "#34d399" },
      { label: zh ? "联锁通讯" : "Interlock", count: pickInt(`${seed}:comms`, 1, 5), accent: "#fb7185" },
    ],
    [seed, zh],
  )

  const actions: BarDatum[] = useMemo(
    () => [
      { label: zh ? "记录上报" : "Log+Report", count: pickInt(`${seed}:a-log`, 3, 9), accent: "#378ADD" },
      { label: zh ? "降额运行" : "Derate", count: pickInt(`${seed}:a-derate`, 1, 5), accent: "#EF9F27" },
      { label: zh ? "断接触器" : "Trip", count: pickInt(`${seed}:a-trip`, 0, 4), accent: "#E24B4A" },
      { label: zh ? "断开锁死" : "Trip+Lock", count: pickInt(`${seed}:a-lock`, 0, 2), accent: "#A32D2D" },
    ],
    [seed, zh],
  )

  return (
    <div className="grid h-full min-h-0 min-w-0 grid-cols-12 gap-3 overflow-hidden">
      {/* 左栏：告警分析 */}
      <div className="col-span-12 flex min-h-0 min-w-0 flex-col gap-3 lg:col-span-6">
        <div className="grid shrink-0 grid-cols-2 gap-2">
          <MetricTile label={zh ? "未恢复" : "Unresolved"} value={String(unresolved)} unit={zh ? "条" : ""} icon={BellRing} accent="#fb7185" />
          <MetricTile label={zh ? "最高等级" : "Top Level"} value={topLv ? `L${topLv}` : "—"} icon={ShieldAlert} accent={LV_COLOR[topLv] ?? "#7b879d"} />
          <MetricTile label={zh ? "告警总数" : "Total"} value={String(total)} unit={zh ? "条" : ""} icon={AlertTriangle} accent="#facc15" />
          <MetricTile label={zh ? "平均持续" : "Avg Duration"} value={avgDuration.toFixed(0)} unit={zh ? "分钟" : "min"} icon={Timer} accent="#22d3ee" />
        </div>

        <div className="grid min-h-0 flex-1 grid-rows-3 gap-3">
          <AlarmPanel title={zh ? "告警等级分布" : "Severity Distribution"} icon={Gauge} accent="#22d3ee">
            <SeverityDonut levels={levels} zh={zh} />
          </AlarmPanel>

          <AlarmPanel title={zh ? "故障域分布" : "Fault Domains"} icon={CircuitBoard} accent="#facc15">
            <DistributionBars items={domains} />
          </AlarmPanel>

          <AlarmPanel title={zh ? "保护动作分布" : "Protection Actions"} icon={Zap} accent="#fb7185">
            <DistributionBars items={actions} />
          </AlarmPanel>
        </div>
      </div>

      {/* 右栏：告警日志（与电池堆一致放在右侧） */}
      <div className="col-span-12 min-h-0 min-w-0 lg:col-span-6">
        <AlarmLogPanel
          mode={mode}
          date={mode === "history" ? date : undefined}
          deviceId={deviceId}
          historyOverride={alarmHistory}
          showMatrix={false}
        />
      </div>
    </div>
  )
}

// ─────────────────────────── iMEMS：站级影响面主题 ───────────────────────────
function EmsAlarmWorkspace({ mode, date, deviceId, deviceName }: Omit<AlarmDeviceWorkspaceProps, "deviceKind" | "projectId">) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const seed = deviceId || deviceName || "ems-alarm"

  const levels = useMemo(() => buildLevels(seed), [seed])
  const total = levels.reduce((sum, item) => sum + item.count, 0)
  const topLv = highestLevel(levels)
  const affectedDevices = pickInt(`${seed}:affected`, 2, 7)
  const closedLoop = clamp(pick(`${seed}:closed`, 84, 96), 0, 100)
  const alarmHistory = useMemo(
    () => buildThemedAlarmHistory(seed, date ?? "", EMS_FAULT_CATALOG, zh),
    [seed, date, zh],
  )

  const deviceRanking: BarDatum[] = useMemo(() => {
    const sources = ["PCS-01", "BCU-03", "BCU-07", "EMS", "BCU-05"]
    return sources
      .map((label) => ({ label, count: pickInt(`${seed}:src:${label}`, 0, 6), accent: "#38bdf8" }))
      .sort((a, b) => b.count - a.count)
  }, [seed])

  return (
    <div className="grid h-full min-h-0 min-w-0 grid-cols-12 gap-3 overflow-hidden">
      {/* 左栏：告警分析 */}
      <div className="col-span-12 flex min-h-0 min-w-0 flex-col gap-3 lg:col-span-6">
        <div className="grid shrink-0 grid-cols-2 gap-2">
          <MetricTile label={zh ? "站级告警" : "Station Alarms"} value={String(total)} unit={zh ? "条" : ""} icon={AlertTriangle} accent="#fb7185" />
          <MetricTile label={zh ? "最高等级" : "Top Level"} value={topLv ? `L${topLv}` : "—"} icon={ShieldAlert} accent={LV_COLOR[topLv] ?? "#7b879d"} />
          <MetricTile label={zh ? "影响设备" : "Affected"} value={String(affectedDevices)} unit={zh ? "台" : ""} icon={RadioTower} accent="#38bdf8" />
          <MetricTile label={zh ? "闭环率" : "Closure"} value={closedLoop.toFixed(1)} unit="%" icon={BadgeCheck} accent="#a3e635" />
        </div>

        <div className="grid min-h-0 flex-1 grid-rows-2 gap-3">
          <AlarmPanel title={zh ? "告警等级分布" : "Severity Distribution"} icon={Cpu} accent="#a3e635">
            <SeverityDonut levels={levels} zh={zh} />
          </AlarmPanel>

          <AlarmPanel title={zh ? "设备告警排行" : "Alarms by Device"} icon={RadioTower} accent="#38bdf8">
            <DistributionBars items={deviceRanking} />
          </AlarmPanel>
        </div>
      </div>

      {/* 右栏：告警日志（与电池堆一致放在右侧） */}
      <div className="col-span-12 min-h-0 min-w-0 lg:col-span-6">
        <AlarmLogPanel
          mode={mode}
          date={mode === "history" ? date : undefined}
          deviceId={deviceId}
          historyOverride={alarmHistory}
          showMatrix={false}
        />
      </div>
    </div>
  )
}

export function AlarmDeviceWorkspace(props: AlarmDeviceWorkspaceProps) {
  if (props.deviceKind === "pcs") {
    return <PcsAlarmWorkspace {...props} />
  }

  return <EmsAlarmWorkspace {...props} />
}
