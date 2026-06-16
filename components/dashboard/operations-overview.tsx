"use client"

import { useMemo } from "react"
import { FlaskConical } from "lucide-react"
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
import { useLanguage } from "@/components/language-provider"
import type { MonitorDeviceKind } from "@/lib/api/trend-analysis"

/**
 * Curated, scenario-specific *overview* (总览维度) for one monitored device,
 * rebuilt to mirror the user's reference boards:
 *  - rack → BCU running status + per-cell heatmap (real data).
 *  - pcs  → breaker single-line diagram + SOC/efficiency gauges + 3-phase
 *           output-voltage gauges + status cards + AC-current chart + fault grid.
 *  - ems  → station single-line diagram (grid / meters / load / cabinets via the
 *           public/icons assets) + stack KPIs + SOC & power charts.
 *
 * PCS/EMS render from a deterministic local mock (seeded by deviceId — stable per
 * device). Layout is final; only the data source needs swapping when the backend
 * lands (hence the "示例数据" badge).
 */

const ICONS = "/icons"

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
  "relative flex min-h-0 flex-col rounded-[10px] border border-[#1f4a6b] bg-[linear-gradient(180deg,rgba(10,24,42,0.96),rgba(6,15,28,0.98))] shadow-[inset_0_1px_0_rgba(120,200,255,0.05)]"

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

function SampleBadge() {
  const { language } = useLanguage()
  const zh = language === "zh"
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-lg border border-[#22d3ee]/25 bg-[rgba(8,22,40,0.7)] px-3 py-1.5">
      <FlaskConical className="h-3.5 w-3.5 text-[#7ff0ff]" />
      <span className="text-[11px] tracking-[0.04em] text-[#8fc6dd]">
        {zh
          ? "示例数据：布局已就绪，接入后端后替换数据源即可"
          : "Sample data — layout ready; swap the data source once the backend lands"}
      </span>
    </div>
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

function StatTile({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-[3px]">
      <span className="truncate text-[11px] text-[#8fb6cf]">{label}</span>
      <span className={`shrink-0 text-[12px] font-semibold ${accent ? "text-[#ffb455]" : "text-[#dffefe]"}`}>
        {value}
        {unit ? <span className="ml-0.5 text-[9px] font-normal text-[#6f93ab]">{unit}</span> : null}
      </span>
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

function StatusTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-[#1f4a6b] bg-[rgba(8,20,34,0.6)] px-2 pb-6 pt-5">
      <div
        className="ops-pedestal pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 opacity-80"
        aria-hidden
      />
      <span className="z-10 text-[11px] tracking-[0.04em] text-[#8fb6cf]">{label}</span>
      <span className="z-10 text-[16px] font-bold" style={{ color: tone }}>
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
    <Panel title={title} className="min-h-0">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 xl:grid-cols-3 2xl:grid-cols-4">
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

// ─────────────────────────── SLD primitives ───────────────────────────
/** A vertical wire segment; `flow` animates the energy moving along it. */
function Wire({ color = "#3da9e0", height = 16, flow = false }: { color?: string; height?: number; flow?: boolean }) {
  if (flow) {
    return <span className="ops-wire-flow block w-[2px]" style={{ height, color }} />
  }
  return <span className="block w-px" style={{ height, background: color }} />
}

/** A closed-breaker symbol (red by default) sized for an inline wire. */
function Breaker({ color = "#ff3b30" }: { color?: string }) {
  return (
    <svg width={18} height={22} viewBox="0 0 18 22" className="block">
      <line x1="9" y1="0" x2="9" y2="5" stroke={color} strokeWidth="1.5" />
      <line x1="9" y1="17" x2="9" y2="22" stroke={color} strokeWidth="1.5" />
      <line x1="9" y1="17" x2="15" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="17" r="1.6" fill={color} />
      <circle cx="9" cy="5" r="1.6" fill={color} />
    </svg>
  )
}

/** The PCS inverter symbol: a green box, AC sine on one side / DC on the other. */
function InverterSymbol({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 46 46" className="block">
      <rect x="3" y="3" width="40" height="40" rx="5" fill="rgba(10,40,30,0.6)" stroke="#3ae29a" strokeWidth="1.6" />
      <line x1="43" y1="3" x2="3" y2="43" stroke="#3ae29a" strokeWidth="1.2" opacity="0.8" />
      <path d="M8 16 q3 -6 6 0 t6 0" fill="none" stroke="#3ae29a" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="26" y1="32" x2="38" y2="32" stroke="#3ae29a" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="28" y1="36" x2="36" y2="36" stroke="#3ae29a" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3 2" />
    </svg>
  )
}

// eslint-disable-next-line @next/next/no-img-element
const IconImg = ({ src, alt, height }: { src: string; alt: string; height: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={alt} style={{ height, width: "auto" }} className="block select-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]" draggable={false} />
)

// ─────────────────────────── PCS overview ───────────────────────────
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

function ChipLabel({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-[#2f6f96] bg-[rgba(13,46,70,0.7)] px-2 py-0.5 text-[10.5px] font-semibold tracking-[0.03em] text-[#9fdcf2]">
      {text}
    </span>
  )
}

export function PcsOverview({ deviceId, deviceName }: { deviceId?: string; deviceName: string; projectId: string }) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const seed = deviceId || deviceName || "pcs"

  const soc = pick(`${seed}:soc`, 35, 75)
  const efficiency = pick(`${seed}:eff`, 92, 98)
  const vab = pick(`${seed}:vab`, 375, 388)
  const vbc = pick(`${seed}:vbc`, 372, 386)
  const vca = pick(`${seed}:vca`, 376, 390)
  const ia = pick(`${seed}:ia`, 150, 220)
  const ib = pick(`${seed}:ib`, 150, 220)
  const ic = pick(`${seed}:ic`, 150, 220)
  const acPower = pick(`${seed}:acp`, 30, 60)
  const dcPower = pick(`${seed}:dcp`, 30, 60)
  const dcCurrent = pick(`${seed}:dci`, 40, 90)
  const dcVoltage = pick(`${seed}:dcv`, 720, 800)
  const outputVoltage = (vab + vbc + vca) / 3
  const chargePower = pick(`${seed}:cdp`, 35, 50)

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
    <div className="custom-scrollbar flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
      <SampleBadge />

      {/* Row 1 — SLD · SOC/efficiency gauges · 3-phase output voltage */}
      <div className="grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-3">
        {/* SLD */}
        <Panel>
          <div className="flex h-full min-h-[260px] gap-2">
            {/* measurement strips */}
            <div className="flex flex-1 flex-col justify-between py-1">
              <div>
                <ChipLabel text={zh ? "交流断路器" : "AC Breaker"} />
                <div className="mt-2 grid grid-cols-2 gap-x-3">
                  <StatTile label={zh ? "A相电流" : "Ia"} value={ia.toFixed(1)} unit="A" />
                  <StatTile label={zh ? "交流有功" : "AC P"} value={acPower.toFixed(1)} unit="kW" />
                  <StatTile label={zh ? "B相电流" : "Ib"} value={ib.toFixed(1)} unit="A" />
                  <StatTile label={zh ? "输出电压" : "Vout"} value={outputVoltage.toFixed(1)} unit="V" />
                  <StatTile label={zh ? "C相电流" : "Ic"} value={ic.toFixed(1)} unit="A" />
                </div>
              </div>
              <div>
                <ChipLabel text={zh ? "直流断路器" : "DC Breaker"} />
                <div className="mt-2">
                  <StatTile label={zh ? "直流功率" : "DC P"} value={dcPower.toFixed(1)} unit="kW" />
                  <StatTile label={zh ? "直流电流" : "DC I"} value={dcCurrent.toFixed(1)} unit="A" />
                  <StatTile label={zh ? "直流电压" : "DC V"} value={dcVoltage.toFixed(1)} unit="V" />
                </div>
              </div>
            </div>

            {/* schematic */}
            <div className="flex w-[112px] shrink-0 flex-col items-center justify-center">
              {/* AC busbar */}
              <div className="ops-busbar h-[5px] w-[78px]" />
              <Wire color="#4dd0ff" height={12} flow />
              <Breaker color="#ff3b30" />
              <Wire color="#4dd0ff" height={8} flow />
              <InverterSymbol />
              <Wire color="#4dd0ff" height={8} flow />
              <IconImg src={`${ICONS}/pcs.png`} alt="PCS" height={62} />
              <Wire color="#4dd0ff" height={10} flow />
              {/* DC busbar */}
              <div className="ops-busbar h-[5px] w-[78px]" />
            </div>
          </div>
        </Panel>

        <Panel title={zh ? "运行指标" : "Indicators"}>
          <div className="flex h-full items-center justify-around">
            <GaugeArc value={soc} max={100} color="#22d3ee" valueText={`${soc.toFixed(2)}%`} caption="SOC" showRange  />
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

      {/* Row 2 — status cards · AC current trend */}
      <div className="grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel title={zh ? "运行状态" : "Status"}>
          <div className="flex h-full gap-2">
            <StatusTile label={zh ? "PCS在线状态" : "PCS Online"} value={zh ? "在线" : "Online"} tone="#4ade80" />
            <StatusTile label={zh ? "工作状态" : "Work Mode"} value={zh ? "并网运行" : "On-grid"} tone="#22d3ee" />
            <StatusTile label={zh ? "充放电功率" : "C/D Power"} value={`${chargePower.toFixed(1)} kW`} tone="#facc15" />
          </div>
        </Panel>

        <Panel title={zh ? "交流电流" : "AC Current"} className="lg:col-span-2">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={acCurrentData} margin={{ top: 6, right: 10, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id="pcs-ia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(45,74,126,0.5)" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="t" tick={{ fill: "#7fa6c0", fontSize: 10 }} interval={3} axisLine={{ stroke: "#1f4366" }} tickLine={false} />
                <YAxis tick={{ fill: "#7fa6c0", fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#9fd6e8" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="A" name={zh ? "A相电流" : "Ia"} stroke="#a78bfa" fill="url(#pcs-ia)" strokeWidth={1.6} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="B" name={zh ? "B相电流" : "Ib"} stroke="#22d3ee" strokeWidth={1.6} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="C" name={zh ? "C相电流" : "Ic"} stroke="#facc15" strokeWidth={1.6} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Row 3 — fault matrix */}
      <FaultMatrix title={zh ? "故障状态" : "Fault Status"} items={PCS_FAULTS} />
    </div>
  )
}

// ─────────────────────────── EMS overview ───────────────────────────
function CabinetColumn({ name, seed }: { name: string; seed: string }) {
  const { language } = useLanguage()
  const zh = language === "zh"
  return (
    <div className="flex flex-col items-center">
      {/* drop line + breaker from busbar */}
      <Wire color="#4dd0ff" height={10} flow />
      <Breaker color="#ff3b30" />
      <Wire color="#4dd0ff" height={6} flow />
      <IconImg src={`${ICONS}/pcs.png`} alt={name} height={52} />
      <span className="mt-0.5 text-[11px] font-semibold text-[#ff8a8a]">{name}</span>
      <div className={`${PANEL_CLASS} mt-1.5 w-full px-2.5 py-1.5`}>
        <StatTile label={zh ? "平均温度" : "Avg Temp"} value={pick(`${seed}:t`, 26, 31).toFixed(1)} unit="℃" />
        <StatTile label={zh ? "簇电压" : "Cluster V"} value={pick(`${seed}:v`, 760, 790).toFixed(1)} unit="V" />
        <StatTile label={zh ? "簇电流" : "Cluster A"} value={pick(`${seed}:a`, 30, 60).toFixed(2)} unit="A" />
        <StatTile label={zh ? "直流功率" : "DC Power"} value={pick(`${seed}:p`, 30, 50).toFixed(2)} unit="kW" />
        <StatTile label="SOC" value={pick(`${seed}:s`, 45, 60).toFixed(2)} unit="%" />
        <StatTile label={zh ? "工作状态" : "Status"} value={zh ? "并网运行" : "On-grid"} accent />
      </div>
    </div>
  )
}

function MeterRow({ icon, label, value, wireColor }: { icon: string; label: string; value: string; wireColor: string }) {
  return (
    <div className="flex items-center gap-2">
      <IconImg src={icon} alt={label} height={34} />
      <div className="flex items-center" style={{ color: wireColor }}>
        <span className="ops-wire-flow-x block h-[2px] w-5" />
        <Breaker color={wireColor} />
        <span className="ops-wire-flow-x block h-[2px] w-4" />
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] text-[#9fd6e8]">{label}</span>
        <span className="text-[12.5px] font-semibold text-[#dffefe]">{value}</span>
      </div>
    </div>
  )
}

export function EmsOverview({ deviceId, deviceName }: { deviceId?: string; deviceName: string; projectId: string }) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const seed = deviceId || deviceName || "ems"

  const stackVoltage = pick(`${seed}:sv`, 760, 790)
  const stackCurrent = pick(`${seed}:sc`, 150, 230)
  const storagePower = pick(`${seed}:sp`, 120, 180)
  const stackSoc = pick(`${seed}:ss`, 40, 70)
  const dayCharge = pick(`${seed}:dc`, 800, 1000)
  const dayDischarge = pick(`${seed}:dd`, 600, 800)
  const totalCharge = pick(`${seed}:tc`, 140000, 150000)
  const totalDischarge = pick(`${seed}:td`, 135000, 145000)
  const gatewayPower = pick(`${seed}:gw`, 8, 18)
  const gridPower = pick(`${seed}:gp`, 30, 45)

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

  const cabinets = useMemo(
    () => [1, 2, 3, 4].map((n) => ({ name: `${n}#${zh ? "柜" : ""}`, seed: `${seed}:cab${n}` })),
    [seed, zh]
  )

  return (
    <div className="custom-scrollbar flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
      <SampleBadge />

      <div className="grid min-h-0 grid-cols-1 gap-3 xl:grid-cols-12">
        {/* Left — station single-line diagram */}
        <Panel title={zh ? "系统拓扑" : "System Topology"} className="xl:col-span-7">
          <div className="flex flex-col gap-2">
            {/* grid tower */}
            <div className="flex flex-col items-center">
              <IconImg src="/topo/grid.png" alt="Grid" height={108} />
              <span className="-mt-2 text-[11px] text-[#9fd6e8]">{zh ? "电网" : "Grid"}</span>
              <Wire color="#4dd0ff" height={10} flow />
            </div>

            {/* meters · load · summary */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#16344f]/70 py-2">
              <div className="flex flex-col gap-2">
                <MeterRow icon="/topo/meter.svg" label={zh ? "关口表" : "Gateway"} value={`${gatewayPower.toFixed(0)} kW`} wireColor="#3ae29a" />
                <MeterRow icon="/topo/meter.svg" label={zh ? "并网表" : "Grid Meter"} value={`${gridPower.toFixed(2)} kW`} wireColor="#ff6b6b" />
              </div>
              <div className="flex flex-col items-center">
                <IconImg src="/topo/load.png" alt="Load" height={92} />
                <span className="-mt-2 text-[11px] text-[#9fd6e8]">{zh ? "用户负载" : "Load"}</span>
              </div>
              <div className="rounded-lg border border-[#1f4a6b] bg-[rgba(8,20,34,0.5)] px-3 py-1.5">
                <div className="grid grid-cols-2 gap-x-5">
                  <StatTile label={zh ? "堆电压" : "Stack V"} value={stackVoltage.toFixed(1)} unit="V" />
                  <StatTile label={zh ? "储能功率" : "Power"} value={storagePower.toFixed(0)} unit="kW" />
                  <StatTile label={zh ? "堆电流" : "Stack A"} value={stackCurrent.toFixed(1)} unit="A" />
                  <StatTile label={zh ? "堆SOC" : "Stack SOC"} value={stackSoc.toFixed(2)} unit="%" />
                  <StatTile label={zh ? "累计充电量" : "Total Chg"} value={totalCharge.toFixed(0)} unit="kWh" accent />
                  <StatTile label={zh ? "累计放电量" : "Total Dis"} value={totalDischarge.toFixed(0)} unit="kWh" accent />
                </div>
              </div>
            </div>

            {/* main busbar */}
            <div className="ops-busbar mt-1 h-[6px] w-full" />

            {/* cabinets */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {cabinets.map((cab) => (
                <CabinetColumn key={cab.name} name={cab.name} seed={cab.seed} />
              ))}
            </div>
          </div>
        </Panel>

        {/* Right — KPIs + charts */}
        <div className="flex min-h-0 flex-col gap-3 xl:col-span-5">
          <div className="grid grid-cols-2 gap-2">
            <KpiCard label={zh ? "堆SOC" : "Stack SOC"} value={stackSoc.toFixed(2)} unit="%" />
            <KpiCard label={zh ? "储能功率" : "Power"} value={storagePower.toFixed(0)} unit="kW" />
            <KpiCard label={zh ? "BMS日充电量" : "Day Charge"} value={dayCharge.toFixed(2)} unit="kWh" />
            <KpiCard label={zh ? "BMS日放电量" : "Day Discharge"} value={dayDischarge.toFixed(2)} unit="kWh" />
          </div>

          <Panel title="SOC">
            <div className="h-[140px] w-full">
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

          <Panel title={zh ? "功率" : "Power"}>
            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={powerData} margin={{ top: 6, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke="rgba(45,74,126,0.5)" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="t" tick={{ fill: "#7fa6c0", fontSize: 10 }} interval={3} axisLine={{ stroke: "#1f4366" }} tickLine={false} />
                  <YAxis tick={{ fill: "#7fa6c0", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#9fd6e8" }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="grid" name={zh ? "市电总功率" : "Grid"} stroke="#a78bfa" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="load" name={zh ? "负载功率" : "Load"} stroke="#60a5fa" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="charge" name={zh ? "充电设定" : "Charge"} stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="discharge" name={zh ? "放电设定" : "Discharge"} stroke="#34d399" strokeWidth={1.5} dot={false} isAnimationActive={false} />
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
