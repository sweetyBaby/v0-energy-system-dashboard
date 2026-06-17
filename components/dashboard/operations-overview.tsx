"use client"

import { useMemo, useState } from "react"
import { type LucideIcon, Activity, Network, Wifi } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { BCUStatusQuery } from "@/components/dashboard/bcu-status-query"
import { CellHeatmapOverviewPanel } from "@/components/dashboard/cell-heatmap-overview-panel"
import { TopoCanvas, TopoFullscreenButton } from "@/components/dashboard/topology/topo-canvas"
import { useLanguage } from "@/components/language-provider"
import type { MonitorDeviceKind } from "@/lib/api/trend-analysis"

/**
 * Curated, scenario-specific *overview* (总览维度) for one monitored device,
 * rebuilt to mirror the user's reference boards:
 *  - rack → BCU running status + per-cell heatmap (real data).
 *  - pcs  → topology (public/topo-pcs.json via the shared TopoCanvas) + SOC/efficiency
 *           gauges + 3-phase output-voltage gauges + status cards + AC-current chart + fault grid.
 *  - ems  → topology (public/topo-ems.json via the shared TopoCanvas) + stack KPIs
 *           + SOC & power charts.
 *
 * PCS/EMS render from a deterministic local mock (seeded by deviceId — stable per
 * device). Layout is final; only the data source needs swapping when the backend
 * lands (hence the "示例数据" badge).
 */

// ─────────────────────────── mock helpers ───────────────────────────
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const pad = (value: number) => String(value).padStart(2, "0")

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

const buildCurve = (seed: string, points: number, min: number, max: number, phase = 0) => {
  const rng = mulberry32(hashSeed(seed))
  const span = max - min
  const mid = min + span / 2
  const amp = span * 0.34
  let walk = 0
  const result: number[] = []
  for (let i = 0; i < points; i += 1) {
    const cyclic = Math.sin((i / points) * Math.PI * 2 + phase) * amp
    walk = clamp(walk + (rng() - 0.5) * span * 0.07, -span * 0.2, span * 0.2)
    result.push(clamp(mid + cyclic + walk, min, max))
  }
  return result
}

const HOURS = 24

// ─────────────────────────── shared UI ───────────────────────────
const PANEL_CLASS =
  "relative flex min-h-0 flex-col overflow-hidden rounded-[10px] border border-[#1f4a6b] bg-[linear-gradient(180deg,rgba(10,24,42,0.96),rgba(6,15,28,0.98))] shadow-[inset_0_1px_0_rgba(120,200,255,0.05)]"

const TOOLTIP_STYLE = {
  backgroundColor: "#0d1233",
  border: "1px solid #1a2654",
  borderRadius: "8px",
  padding: "6px 10px",
  fontSize: "11px",
}

/** Panel frame with the reference's bottom corner brackets. */
function Panel({
  title,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={`${PANEL_CLASS} ${className}`}>
      <span className="pointer-events-none absolute bottom-1 left-1 h-2.5 w-2.5 border-b border-l border-[#2aa7d6]/70" />
      <span className="pointer-events-none absolute bottom-1 right-1 h-2.5 w-2.5 border-b border-r border-[#2aa7d6]/70" />
      {title && (
        <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2 pb-1">
          <div className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-[#26f0dc]" />
            <span className="text-[12.5px] font-semibold tracking-[0.04em] text-[#d9f6ff]">{title}</span>
          </div>
          {action}
        </div>
      )}
      <div className={`min-h-0 flex-1 px-3 pb-3 ${title ? "" : "pt-3"} ${bodyClassName}`}>{children}</div>
    </section>
  )
}

const GAUGE_BG_HALO = "/topo/bg1-Beu90V8t.svg"
const GAUGE_BG_TICKS = "/topo/bg2-C3TJ0OBn.svg"

/**
 * Gauge using the project's bg1 (glow halo) + bg2 (tick ring) artwork as the
 * backplate, with a colored 270° progress arc + leading knob drawn on top.
 */
function GaugeArc({
  value,
  max,
  color,
  valueText,
  caption,
  size = 128,
  showRange = false,
}: {
  value: number
  max: number
  color: string
  valueText: string
  caption: string
  size?: number
  showRange?: boolean
}) {
  const cx = size / 2
  const cy = size / 2
  const rArc = size * 0.34
  const stroke = Math.max(6, size * 0.055)
  const circumference = 2 * Math.PI * rArc
  const sweep = 0.75
  const frac = clamp(value / max, 0, 1)
  const valueLen = circumference * sweep * frac

  // Leading knob dot at the end of the progress arc.
  const endAngle = (-135 + frac * sweep * 360) * (Math.PI / 180)
  const knobX = cx + Math.sin(endAngle) * rArc
  const knobY = cy - Math.cos(endAngle) * rArc

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative" style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={GAUGE_BG_HALO} alt="" aria-hidden className="ops-gauge-halo pointer-events-none absolute inset-0 h-full w-full select-none" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={GAUGE_BG_TICKS} alt="" aria-hidden className="ops-gauge-ticks pointer-events-none absolute inset-0 h-full w-full select-none" draggable={false} />
        <svg width={size} height={size} className="relative block">
          <g transform={`rotate(135 ${cx} ${cy})`}>
            <circle
              cx={cx}
              cy={cy}
              r={rArc}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeDasharray={`${valueLen} ${circumference}`}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 5px ${color})` }}
            />
          </g>
          {frac > 0.01 && (
            <>
              {/* pulsing ping ring */}
              <circle cx={knobX} cy={knobY} fill="none" stroke={color} strokeWidth={1.4}>
                <animate
                  attributeName="r"
                  values={`${stroke * 0.62};${stroke * 1.7}`}
                  dur="1.6s"
                  repeatCount="indefinite"
                />
                <animate attributeName="opacity" values="0.75;0" dur="1.6s" repeatCount="indefinite" />
              </circle>
              {/* knob */}
              <circle
                cx={knobX}
                cy={knobY}
                r={stroke * 0.62}
                fill="#eafcff"
                stroke={color}
                strokeWidth={1.6}
                style={{ filter: `drop-shadow(0 0 5px ${color})` }}
              />
            </>
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[19px] font-bold leading-none tracking-[0.01em] text-[#eafcff]">{valueText}</span>
          <span className="mt-1 text-[10.5px] tracking-[0.04em] text-[#8fb6cf]">{caption}</span>
        </div>
        {showRange && (
          <>
            <span className="absolute bottom-4 left-3 text-[9px] text-[#6f93ab]">0</span>
            <span className="absolute bottom-4 right-3 text-[9px] text-[#6f93ab]">{max}</span>
          </>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="relative flex min-h-[108px] flex-col items-center gap-2.5 overflow-hidden rounded-[10px] border border-[#1f4a6b] bg-[linear-gradient(180deg,rgba(10,24,42,0.96),rgba(6,15,28,0.98))] px-3 pt-3.5 shadow-[inset_0_1px_0_rgba(120,200,255,0.05)]">
      {/* top corner brackets (reference look) */}
      <span className="pointer-events-none absolute left-1 top-1 h-2.5 w-2.5 border-l border-t border-[#2aa7d6]/70" />
      <span className="pointer-events-none absolute right-1 top-1 h-2.5 w-2.5 border-r border-t border-[#2aa7d6]/70" />
      {/* animated glowing pedestal behind the value */}
      <div
        className="ops-pedestal pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 opacity-90"
        aria-hidden
      />
      <span className="z-10 text-[12px] tracking-[0.04em] text-[#8fb6cf]">{label}</span>
      <span className="z-10 text-[22px] font-bold leading-none text-[#eafcff]">
        {value}
        <span className="ml-1 text-[12px] font-normal text-[#7fb0c8]">{unit}</span>
      </span>
    </div>
  )
}

function StatusTile({ label, value, tone, icon: Icon }: { label: string; value: string; tone: string; icon: LucideIcon }) {
  return (
    <div
      className="relative flex min-h-0 flex-1 items-center gap-3 overflow-hidden rounded-lg border bg-[rgba(8,20,34,0.6)] px-4"
      style={{ borderColor: `${tone}55` }}
    >
      {/* tone-tinted glow rising from the left */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(130% 130% at 0% 50%, ${tone}1f, transparent 62%)` }}
        aria-hidden
      />
      {/* left accent bar */}
      <span
        className="absolute left-0 top-1/2 h-3/5 w-[3px] -translate-y-1/2 rounded-full"
        style={{ background: tone, boxShadow: `0 0 10px ${tone}` }}
        aria-hidden
      />
      {/* icon badge with a gentle live pulse */}
      <span
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: `${tone}1f`, boxShadow: `inset 0 0 0 1px ${tone}66` }}
      >
        <span className="absolute inset-0 animate-ping rounded-full opacity-20" style={{ background: tone }} aria-hidden />
        <Icon className="relative h-4 w-4" style={{ color: tone }} />
      </span>
      {/* label + value on a single line */}
      <span className="relative shrink-0 text-[12px] tracking-[0.04em] text-[#8fb6cf]">{label}</span>
      <span
        className="relative ml-auto truncate pl-2 text-[18px] font-bold leading-none"
        style={{ color: tone, textShadow: `0 0 12px ${tone}55` }}
      >
        {value}
      </span>
    </div>
  )
}

type FaultItem = { zh: string; en: string }

function FaultMatrix({ items, title }: { items: FaultItem[]; title: string }) {
  const { language } = useLanguage()
  const zh = language === "zh"
  return (
    <Panel title={title} className="shrink-0">
      <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 xl:grid-cols-4 2xl:grid-cols-6">
        {items.map((item) => (
          <div
            key={item.en}
            className="flex items-center justify-between gap-2 rounded-md border border-[#16344f]/80 bg-[rgba(8,20,34,0.5)] px-2.5 py-1.5"
          >
            <span className="truncate text-[11px] text-[#9cc6d8]">{zh ? item.zh : item.en}</span>
            <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#4ade80]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.7)]" />
              {zh ? "正常" : "OK"}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ─────────────────────────── chart legend toggle (shared) ───────────────────────────
type ChartSeries = { key: string; color: string; zh: string; en: string }

/** 图例显隐切换：点击淡化/恢复对应系列，强制至少保留一个可见（不可全部隐藏）。 */
function useSeriesToggle(series: readonly ChartSeries[]) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const toggle = (key: string) =>
    setHidden((prev) => {
      const willHide = !prev[key]
      // 至少保留一个可见：当前仅剩一个可见时，禁止再隐藏
      if (willHide && series.filter((s) => !prev[s.key]).length <= 1) return prev
      return { ...prev, [key]: willHide }
    })
  return { hidden, toggle }
}

/** 可点击图例：隐藏项以可读的灰色 + 空心圆点表示（非删除线、非过度淡化）。PCS/EMS 图表共用。 */
function ToggleLegend({
  series,
  hidden,
  onToggle,
  zh,
}: {
  series: readonly ChartSeries[]
  hidden: Record<string, boolean>
  onToggle: (key: string) => void
  zh: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-0.5 pt-1">
      {series.map((s) => {
        const off = !!hidden[s.key]
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onToggle(s.key)}
            title={zh ? (off ? "点击显示" : "点击隐藏") : off ? "Show" : "Hide"}
            className="flex cursor-pointer items-center gap-1.5 bg-transparent text-[11px] font-medium leading-none transition-colors"
            style={{ color: off ? "#90a7bd" : s.color, textDecoration: "none" }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full transition-all"
              style={
                off
                  ? { background: "transparent", boxShadow: "inset 0 0 0 1.5px #6b8299" }
                  : { background: s.color, boxShadow: `0 0 6px ${s.color}` }
              }
            />
            {zh ? s.zh : s.en}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────── PCS overview ───────────────────────────
// 交流三相电流系列（图例点击切换显隐，受控 hide 而非 recharts 默认行为）
const AC_SERIES: readonly ChartSeries[] = [
  { key: "A", color: "#a78bfa", zh: "A相电流", en: "Ia" },
  { key: "B", color: "#22d3ee", zh: "B相电流", en: "Ib" },
  { key: "C", color: "#facc15", zh: "C相电流", en: "Ic" },
]

const PCS_FAULTS: FaultItem[] = [
  { zh: "电网过频", en: "Grid Overfreq" },
  { zh: "电网欠频", en: "Grid Underfreq" },
  { zh: "24V电源故障", en: "24V Power Fault" },
  { zh: "电网缺相", en: "Grid Phase Loss" },
  { zh: "防雷器故障", en: "SPD Fault" },
  { zh: "风扇故障", en: "Fan Fault" },
  { zh: "电网电压不平衡", en: "Grid Volt Imbalance" },
  { zh: "电网电流不平衡", en: "Grid Curr Imbalance" },
  { zh: "电池欠压", en: "Battery Undervolt" },
  { zh: "电池过压", en: "Battery Overvolt" },
  { zh: "电池反接", en: "Battery Reverse" },
  { zh: "直流过流", en: "DC Overcurrent" },
  { zh: "运行母线过压", en: "Run Bus Overvolt" },
  { zh: "运行母线欠压", en: "Run Bus Undervolt" },
  { zh: "预充母线过压", en: "Precharge Overvolt" },
  { zh: "预充母线欠压", en: "Precharge Undervolt" },
  { zh: "EMS通信故障", en: "EMS Comm Fault" },
  { zh: "BMS通讯故障", en: "BMS Comm Fault" },
  { zh: "EPO故障", en: "EPO Fault" },
  { zh: "离网短路故障", en: "Off-grid Short" },
  { zh: "高电压穿越超时", en: "HVRT Timeout" },
  { zh: "绝缘检测故障", en: "Insulation Fault" },
  { zh: "直流继电器开路", en: "DC Relay Open" },
  { zh: "交流继电器开路", en: "AC Relay Open" },
]

export function PcsOverview({ deviceId, deviceName }: { deviceId?: string; deviceName: string; projectId: string }) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const seed = deviceId || deviceName || "pcs"

  const soc = pick(`${seed}:soc`, 35, 75)
  const efficiency = pick(`${seed}:eff`, 92, 98)
  const vab = pick(`${seed}:vab`, 375, 388)
  const vbc = pick(`${seed}:vbc`, 372, 386)
  const vca = pick(`${seed}:vca`, 376, 390)
  const chargePower = pick(`${seed}:cdp`, 35, 50)

  // 交流电流图例显隐（点击切换，至少保留一相）
  const acToggle = useSeriesToggle(AC_SERIES)
  const [topoFullscreen, setTopoFullscreen] = useState(false)

  const acCurrentData = useMemo(() => {
    const a = buildCurve(`${seed}:cur-a`, HOURS, 120, 260, 0)
    const b = buildCurve(`${seed}:cur-b`, HOURS, 120, 260, 0.4)
    const c = buildCurve(`${seed}:cur-c`, HOURS, 120, 260, 0.8)
    return a.map((_, i) => ({
      t: `${pad(i)}:00`,
      A: Math.round(a[i] * 10) / 10,
      B: Math.round(b[i] * 10) / 10,
      C: Math.round(c[i] * 10) / 10,
    }))
  }, [seed])

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      {/* ── Top: topology (left) + right column (gauges row · status/current row) ── */}
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-2">
        {/* Left — PCS topology, rendered from public/topo-pcs.json (shared canvas: zoom/drag/auto-fit) */}
        <Panel
          title={zh ? "系统拓扑" : "System Topology"}
          className="col-span-5"
          action={<TopoFullscreenButton onClick={() => setTopoFullscreen(true)} />}
        >
          <TopoCanvas url="/topo-pcs.json" fullscreen={topoFullscreen} onExitFullscreen={() => setTopoFullscreen(false)} />
        </Panel>

        {/* Right — two stacked rows */}
        <div className="col-span-7 flex min-h-0 flex-col gap-2">
          {/* Right row 1 — 运行指标 · 输出线电压 (unchanged) */}
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
            <Panel title={zh ? "运行指标" : "Indicators"}>
              <div className="flex h-full items-center justify-around">
                <GaugeArc value={soc} max={100} color="#22d3ee" valueText={`${soc.toFixed(2)}%`} caption="SOC" showRange />
                <GaugeArc
                  value={efficiency}
                  max={100}
                  color="#34d399"
                  valueText={`${efficiency.toFixed(2)}%`}
                  caption={zh ? "综合效率" : "Efficiency"}
                  showRange
                />
              </div>
            </Panel>

            <Panel title={zh ? "输出线电压" : "Output Line Voltage"}>
              <div className="flex h-full items-center justify-around">
                <GaugeArc value={vab} max={450} color="#60a5fa" valueText={`${vab.toFixed(0)}V`} caption={zh ? "AB线电压" : "Vab"} size={108} />
                <GaugeArc value={vbc} max={450} color="#38bdf8" valueText={`${vbc.toFixed(0)}V`} caption={zh ? "BC线电压" : "Vbc"} size={108} />
                <GaugeArc value={vca} max={450} color="#22d3ee" valueText={`${vca.toFixed(0)}V`} caption={zh ? "CA线电压" : "Vca"} size={108} />
              </div>
            </Panel>
          </div>

          {/* Right row 2 — 运行状态 · 交流电流 */}
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
            <Panel title={zh ? "运行状态" : "Status"}>
              <div className="flex h-full min-h-0 flex-col gap-2">
                <StatusTile label={zh ? "PCS在线状态" : "PCS Online"} value={zh ? "在线" : "Online"} tone="#4ade80" icon={Wifi} />
                <StatusTile label={zh ? "工作状态" : "Work Mode"} value={zh ? "并网运行" : "On-grid"} tone="#22d3ee" icon={Network} />
                <StatusTile label={zh ? "充放电功率" : "C/D Power"} value={`${chargePower.toFixed(1)} kW`} tone="#facc15" icon={Activity} />
              </div>
            </Panel>

            <Panel title={zh ? "交流电流（ABC三相）" : "AC Current (A/B/C)"}>
              <div className="h-full min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={acCurrentData} margin={{ top: 6, right: 10, bottom: 0, left: -8 }}>
                    <CartesianGrid stroke="rgba(45,74,126,0.5)" strokeDasharray="3 5" vertical={false} />
                    <XAxis dataKey="t" tick={{ fill: "#7fa6c0", fontSize: 10 }} interval={3} axisLine={{ stroke: "#1f4366" }} tickLine={false} />
                    <YAxis tick={{ fill: "#7fa6c0", fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#9fd6e8" }} />
                    <Legend
                      verticalAlign="bottom"
                      height={24}
                      content={() => <ToggleLegend series={AC_SERIES} hidden={acToggle.hidden} onToggle={acToggle.toggle} zh={zh} />}
                    />
                    {AC_SERIES.map((s) => (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={zh ? s.zh : s.en}
                        stroke={s.color}
                        strokeWidth={1.6}
                        dot={false}
                        isAnimationActive={false}
                        hide={!!acToggle.hidden[s.key]}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </div>
      </div>

      {/* Bottom — fault matrix */}
      <FaultMatrix title={zh ? "故障状态" : "Fault Status"} items={PCS_FAULTS} />
    </div>
  )
}

// ─────────────────────────── EMS overview ───────────────────────────
// 功率曲线系列（图例点击切换显隐，风格同 PCS 交流电流）
const POWER_SERIES: readonly ChartSeries[] = [
  { key: "grid", color: "#a78bfa", zh: "市电总功率", en: "Grid" },
  { key: "load", color: "#60a5fa", zh: "负载功率", en: "Load" },
  { key: "charge", color: "#f59e0b", zh: "充电设定", en: "Charge" },
  { key: "discharge", color: "#34d399", zh: "放电设定", en: "Discharge" },
]

export function EmsOverview({ deviceId, deviceName }: { deviceId?: string; deviceName: string; projectId: string }) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const seed = deviceId || deviceName || "ems"

  const storagePower = pick(`${seed}:sp`, 120, 180)
  const stackSoc = pick(`${seed}:ss`, 40, 70)
  const dayCharge = pick(`${seed}:dc`, 800, 1000)
  const dayDischarge = pick(`${seed}:dd`, 600, 800)

  // 功率图例显隐（点击切换，至少保留一条）
  const powerToggle = useSeriesToggle(POWER_SERIES)
  const [topoFullscreen, setTopoFullscreen] = useState(false)

  const socData = useMemo(() => {
    const series = buildCurve(`${seed}:soc`, HOURS, 35, 92, 0.6)
    return series.map((v, i) => ({ t: `${pad(i)}:00`, SOC: Math.round(v * 100) / 100 }))
  }, [seed])

  const powerData = useMemo(() => {
    const grid = buildCurve(`${seed}:pg`, HOURS, -60, 420, 0.2)
    const load = buildCurve(`${seed}:pl`, HOURS, 40, 240, 0.5)
    const charge = buildCurve(`${seed}:pc`, HOURS, 0, 300, 0.9)
    const discharge = buildCurve(`${seed}:pd`, HOURS, 0, 280, 1.3)
    return grid.map((_, i) => ({
      t: `${pad(i)}:00`,
      grid: Math.round(grid[i]),
      load: Math.round(load[i]),
      charge: Math.round(charge[i]),
      discharge: Math.round(discharge[i]),
    }))
  }, [seed])

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 xl:grid-cols-12">
        {/* Left — EMS topology, rendered from public/topo-ems.json (shared canvas: zoom/drag/auto-fit) */}
        <Panel
          title={zh ? "系统拓扑" : "System Topology"}
          className="xl:col-span-7"
          action={<TopoFullscreenButton onClick={() => setTopoFullscreen(true)} />}
        >
          <TopoCanvas url="/topo-ems.json" fullscreen={topoFullscreen} onExitFullscreen={() => setTopoFullscreen(false)} />
        </Panel>

        {/* Right — KPIs + charts */}
        <div className="flex min-h-0 flex-col gap-2 xl:col-span-5">
          <div className="grid grid-cols-2 gap-2">
            <KpiCard label={zh ? "堆SOC" : "Stack SOC"} value={stackSoc.toFixed(2)} unit="%" />
            <KpiCard label={zh ? "储能功率" : "Power"} value={storagePower.toFixed(0)} unit="kW" />
            <KpiCard label={zh ? "BMS日充电量" : "Day Charge"} value={dayCharge.toFixed(2)} unit="kWh" />
            <KpiCard label={zh ? "BMS日放电量" : "Day Discharge"} value={dayDischarge.toFixed(2)} unit="kWh" />
          </div>

          <Panel title="SOC" className="flex-1">
            <div className="h-full min-h-[90px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={socData} margin={{ top: 6, right: 10, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="ems-soc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(45,74,126,0.5)" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="t" tick={{ fill: "#7fa6c0", fontSize: 10 }} interval={3} axisLine={{ stroke: "#1f4366" }} tickLine={false} />
                  <YAxis tick={{ fill: "#7fa6c0", fontSize: 10 }} axisLine={false} tickLine={false} width={36} domain={[0, 100]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#9fd6e8" }} />
                  <Area type="monotone" dataKey="SOC" name="SOC" stroke="#a78bfa" fill="url(#ems-soc)" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title={zh ? "功率" : "Power"} className="flex-1">
            <div className="h-full min-h-[90px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={powerData} margin={{ top: 6, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke="rgba(45,74,126,0.5)" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="t" tick={{ fill: "#7fa6c0", fontSize: 10 }} interval={3} axisLine={{ stroke: "#1f4366" }} tickLine={false} />
                  <YAxis tick={{ fill: "#7fa6c0", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#9fd6e8" }} />
                  <Legend
                    verticalAlign="bottom"
                    height={22}
                    content={() => <ToggleLegend series={POWER_SERIES} hidden={powerToggle.hidden} onToggle={powerToggle.toggle} zh={zh} />}
                  />
                  {POWER_SERIES.map((s) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={zh ? s.zh : s.en}
                      stroke={s.color}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                      hide={!!powerToggle.hidden[s.key]}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────── switch ───────────────────────────
type OperationsOverviewProps = {
  deviceId?: string
  deviceKind: MonitorDeviceKind
  deviceName: string
  projectId: string
}

export function OperationsOverview({ deviceId, deviceKind, deviceName, projectId }: OperationsOverviewProps) {
  if (deviceKind === "pcs") {
    return <PcsOverview deviceId={deviceId} deviceName={deviceName} projectId={projectId} />
  }
  if (deviceKind === "ems") {
    return <EmsOverview deviceId={deviceId} deviceName={deviceName} projectId={projectId} />
  }

  // rack / other → battery cluster overview (real data).
  return (
    <div className="grid h-full min-h-0 grid-cols-12 gap-4 overflow-hidden">
      <div className="col-span-12 min-h-0 lg:col-span-6">
        <BCUStatusQuery mode="realtime" deviceId={deviceId || undefined} enableFullscreen />
      </div>
      <div className="col-span-12 min-h-0 lg:col-span-6">
        <CellHeatmapOverviewPanel deviceId={deviceId || undefined} />
      </div>
    </div>
  )
}
