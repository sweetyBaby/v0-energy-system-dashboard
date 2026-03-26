"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useLanguage } from "@/components/language-provider"

// 类型
type WorkMode = "idle" | "charge" | "discharge" | "precharge"
type AxisLabelPlacement = "leftOuter" | "leftInner" | "rightInner" | "rightOuter"
type AxisLabelProps = {
  viewBox?: { x?: number; y?: number; width?: number; height?: number }
  text?: string
  color?: string
  placement?: AxisLabelPlacement
}
type HistTempPoint = { time: string; maxTemp: number; avgTemp: number; minTemp: number }
type HistVoltagePoint = { time: string; maxCell: number; avgCell: number; minCell: number }
type LiveStatus = {
  soc: number
  packVoltage: number
  packCurrent: number
  dischargePower: number
  chargePower: number
  maxCellV: number
  maxCellId: number
  minCellV: number
  minCellId: number
  voltageDelta: number
  maxTemp: number
  maxTempId: number
  minTemp: number
  minTempId: number
  tempDelta: number
  workMode: WorkMode
}

// 实时趋势模拟
type RtPoint = { time: string; voltage: number; current: number; soc: number; power: number }

const RT_WINDOW_SECONDS = 60
const DEFAULT_LIVE_STATUS: LiveStatus = {
  soc: 67.3,
  packVoltage: 798.4,
  packCurrent: -85.2,
  dischargePower: 68,
  chargePower: 0,
  maxCellV: 3.342,
  maxCellId: 22,
  minCellV: 3.318,
  minCellId: 12,
  voltageDelta: 24,
  maxTemp: 31.4,
  maxTempId: 2,
  minTemp: 27.8,
  minTempId: 12,
  tempDelta: 3.6,
  workMode: "discharge",
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const round = (value: number, digits = 1) => +value.toFixed(digits)
const formatClock = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
const formatHalfHour = (slot: number) =>
  `${String(Math.floor(slot / 2)).padStart(2, "0")}:${slot % 2 === 0 ? "00" : "30"}`

const hashSeed = (value?: string) => {
  const input = value || "default"
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const seededSigned = (seed: number, index: number) => {
  const x = Math.sin((seed + index * 101.17) * 12.9898) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

const getRealtimeTargets = (timestamp: number) => {
  const slow = Math.sin(timestamp / 18000)
  const medium = Math.sin(timestamp / 7600 + 0.85)
  const fast = Math.sin(timestamp / 2400 + 1.6)

  const current = -82 + slow * 4.4 + medium * 2.1 + fast * 0.8
  const voltage = 799.5 + slow * 1.8 - medium * 1.2 + (current + 82) * 0.22

  return { current, voltage, socStep: 0.00018 }
}

const nextRtPoint = (prev?: RtPoint, at = new Date()): RtPoint => {
  const { current: targetCurrent, voltage: targetVoltage, socStep } = getRealtimeTargets(at.getTime())
  const current = prev
    ? clamp(prev.current * 0.74 + targetCurrent * 0.26, -96, -55)
    : targetCurrent
  const voltage = prev
    ? clamp(prev.voltage * 0.8 + targetVoltage * 0.2, 786, 812)
    : targetVoltage
  const soc = prev
    ? clamp(prev.soc - socStep * (Math.abs(current) / 80), 0, 100)
    : DEFAULT_LIVE_STATUS.soc

  return {
    time: formatClock(at),
    voltage: round(voltage, 1),
    current: round(current, 1),
    soc: round(soc, 1),
    power: round(voltage * current / 1000, 1),
  }
}

const initRtOverview = (): RtPoint[] => {
  const pts: RtPoint[] = []
  for (let i = RT_WINDOW_SECONDS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 1000)
    const prev = pts[pts.length - 1]
    pts.push(nextRtPoint(prev, d))
  }
  return pts
}

// 历史趋势模拟
const getDailyLoadFactor = (hour: number) => {
  if (hour < 5.5) return 0.16 + hour * 0.02
  if (hour < 8.5) return 0.28 + ((hour - 5.5) / 3) * 0.34
  if (hour < 17.5) return 0.66 + Math.sin(((hour - 8.5) / 9) * Math.PI) * 0.18
  if (hour < 21.5) return 0.56 - ((hour - 17.5) / 4) * 0.22
  return 0.24 - ((hour - 21.5) / 2.5) * 0.06
}

const getDailySoc = (hour: number) => {
  if (hour < 6) return 44 + hour * 0.45
  if (hour < 8.5) return 46.7 + ((hour - 6) / 2.5) * 24
  if (hour < 18.5) return 70.7 - ((hour - 8.5) / 10) * 23.5
  return 47.2 - ((hour - 18.5) / 5.5) * 2.4
}

const createHistorySeries = (date?: string): { temp: HistTempPoint[]; voltage: HistVoltagePoint[] } => {
  const seed = hashSeed(date)
  const temp: HistTempPoint[] = []
  const voltage: HistVoltagePoint[] = []

  for (let slot = 0; slot < 48; slot++) {
    const hour = slot / 2
    const load = getDailyLoadFactor(hour)
    const soc = getDailySoc(hour)
    const ambient = 24.8 + Math.sin(((hour - 6) / 24) * Math.PI * 2) * 2.6 + seededSigned(seed, slot) * 0.18
    const thermalBias = Math.sin((hour / 24) * Math.PI * 3) * 0.28
    const avgTemp = ambient + 2.1 + load * 4.9 + thermalBias
    const tempSpread = 1.7 + load * 1.9 + Math.abs(seededSigned(seed, slot + 80)) * 0.45

    const baseCellV = 3.18 + soc * 0.00225
    const chargeBoost = hour >= 6 && hour < 8.5 ? 0.007 : 0
    const dischargeSag = hour >= 8.5 && hour < 18.5 ? load * 0.01 : load * 0.0035
    const avgCell = baseCellV + chargeBoost - dischargeSag + seededSigned(seed, slot + 160) * 0.0009
    const cellSpread = 0.01 + load * 0.007 + Math.abs(seededSigned(seed, slot + 240)) * 0.002

    temp.push({
      time: formatHalfHour(slot),
      maxTemp: round(avgTemp + tempSpread, 1),
      avgTemp: round(avgTemp, 1),
      minTemp: round(avgTemp - (tempSpread - 0.8), 1),
    })

    voltage.push({
      time: formatHalfHour(slot),
      maxCell: round(avgCell + cellSpread / 2, 3),
      avgCell: round(avgCell, 3),
      minCell: round(avgCell - cellSpread / 2, 3),
    })
  }

  return { temp, voltage }
}

const TS = { backgroundColor: "#0d1233", border: "1px solid #1a2654", borderRadius: "8px" }

function AxisLabel({ viewBox, text = "", color = "#e8f4fc", placement = "leftOuter" }: AxisLabelProps) {
  if (!viewBox) return null

  const x = viewBox.x ?? 0
  const y = viewBox.y ?? 0
  const width = viewBox.width ?? 0

  const placements: Record<AxisLabelPlacement, { x: number; y: number; anchor: "start" | "end" }> = {
    leftOuter: { x: x + width - 6, y: y + 14, anchor: "end" },
    leftInner: { x: x + width - 6, y: y + 30, anchor: "end" },
    rightInner: { x: x + 6, y: y + 14, anchor: "start" },
    rightOuter: { x: x + 6, y: y + 30, anchor: "start" },
  }

  const point = placements[placement]

  return (
    <text
      x={point.x}
      y={point.y}
      fill={color}
      fontSize={11}
      fontWeight={700}
      textAnchor={point.anchor}
    >
      {text}
    </text>
  )
}

// 组件
export function BCUStatusQuery({
  mode = "realtime",
  date,
}: {
  mode?: "realtime" | "history"
  date?: string
}) {
  const { language } = useLanguage()
  const zh = language === "zh"

  // 实时滚动窗口：60 条数据，每秒追加 1 条，并移除最旧 1 条
  const [rtOverview, setRtOverview] = useState<RtPoint[]>(initRtOverview)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (mode !== "realtime") return
    timerRef.current = setInterval(() => {
      setRtOverview(prev => [...prev.slice(-(RT_WINDOW_SECONDS - 1)), nextRtPoint(prev[prev.length - 1])])
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [mode])

  const { temp: histTemp, voltage: histVoltage } = useMemo(() => createHistorySeries(date), [date])
  const liveStatus = useMemo<LiveStatus>(() => {
    const latest = rtOverview[rtOverview.length - 1]
    if (!latest) return DEFAULT_LIVE_STATUS

    const loadFactor = clamp(Math.abs(latest.current) / 95, 0, 1)
    const thermalWave = Math.sin(latest.current / 14)
    const voltageWave = Math.sin(latest.voltage / 12)
    const maxCellV = 3.331 + loadFactor * 0.012 + voltageWave * 0.0015
    const minCellV = maxCellV - (0.016 + loadFactor * 0.01 + Math.abs(voltageWave) * 0.002)
    const maxTemp = 28.9 + loadFactor * 4 + thermalWave * 0.5
    const minTemp = maxTemp - (2.4 + loadFactor * 1.2)

    return {
      soc: latest.soc,
      packVoltage: latest.voltage,
      packCurrent: latest.current,
      dischargePower: latest.power < 0 ? round(Math.abs(latest.power), 1) : 0,
      chargePower: latest.power > 0 ? round(latest.power, 1) : 0,
      maxCellV: round(maxCellV, 3),
      maxCellId: 22,
      minCellV: round(minCellV, 3),
      minCellId: 12,
      voltageDelta: Math.round((maxCellV - minCellV) * 1000),
      maxTemp: round(maxTemp, 1),
      maxTempId: 2,
      minTemp: round(minTemp, 1),
      minTempId: 12,
      tempDelta: round(maxTemp - minTemp, 1),
      workMode: latest.current <= -5 ? "discharge" : latest.current >= 5 ? "charge" : "idle",
    }
  }, [rtOverview])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[#1a2654] bg-[#0d1233] p-3">
      {/* 标题 */}
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <span className="text-sm font-semibold text-[#00d4aa]">
            {zh ? "BCU 运行状态" : "BCU Status"}
          </span>
        
        </div>
      </div>

      {/* 图表区域 */}
      <div className="min-h-0 flex-1 rounded-lg border border-[#1a2654]/60 bg-[#0d1433]/80 p-2">
        {/* 实时趋势：电流(A) / 功率(kW) / SOC(%) / Pack电压(V) */}
        {mode === "realtime" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rtOverview as object[]} margin={{ top: 16, right: 86, left: 126, bottom: 0 }}>
              <CartesianGrid stroke="#1a2654" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "#7b8ab8", fontSize: 9 }} axisLine={false} tickLine={false} interval={9} />

              {/* 左外轴：电流(A) */}
              <YAxis
                yAxisId="a"
                orientation="left"
                domain={[-100, 100]}
                width={62}
                tick={{ fill: "#f472b6", fontSize: 9 }}
                axisLine={{ stroke: "#f472b6", strokeOpacity: 0.3 }}
                tickLine={false}
                tickMargin={8}
                label={<AxisLabel text={zh ? "电流(A)" : "Current(A)"} color="#f472b6" placement="leftOuter" />}
              />
              {/* 左内轴：功率(kW)，正值充电，负值放电 */}
              <YAxis
                yAxisId="p"
                orientation="left"
                domain={[-150, 150]}
                width={56}
                tick={{ fill: "#4ade80", fontSize: 9 }}
                axisLine={{ stroke: "#4ade80", strokeOpacity: 0.3 }}
                tickLine={false}
                tickMargin={8}
                label={<AxisLabel text={zh ? "功率(kW)" : "Power(kW)"} color="#4ade80" placement="leftInner" />}
              />
              {/* 右内轴：SOC(%) */}
              <YAxis
                yAxisId="soc"
                orientation="right"
                domain={[0, 100]}
                width={56}
                tick={{ fill: "#22d3ee", fontSize: 9 }}
                axisLine={{ stroke: "#22d3ee", strokeOpacity: 0.3 }}
                tickLine={false}
                tickMargin={8}
                label={<AxisLabel text="SOC(%)" color="#22d3ee" placement="rightInner" />}
              />
              {/* 右外轴：Pack电压(V) 0~1500 */}
              <YAxis
                yAxisId="v"
                orientation="right"
                domain={[0, 1500]}
                width={56}
                tick={{ fill: "#fb923c", fontSize: 9 }}
                axisLine={{ stroke: "#fb923c", strokeOpacity: 0.3 }}
                tickLine={false}
                tickMargin={8}
                label={<AxisLabel text={zh ? "Pack电压(V)" : "Pack(V)"} color="#fb923c" placement="rightOuter" />}
              />

              <Tooltip
                contentStyle={TS}
                labelStyle={{ color: "#7b8ab8" }}
                formatter={(v, name) => (v == null ? ["—", name] : [`${v}`, name])}
              />
              <Legend
                verticalAlign="top"
                wrapperStyle={{ paddingBottom: "4px" }}
                formatter={v => <span style={{ color: "#7b8ab8", fontSize: "10px" }}>{v}</span>}
              />
              <Line yAxisId="a" type="monotone" dataKey="current" name={zh ? "电流(A)" : "Current(A)"} stroke="#f472b6" strokeWidth={1.5} dot={false} />
              <Line yAxisId="p" type="monotone" dataKey="power" name={zh ? "功率(kW)" : "Power(kW)"} stroke="#4ade80" strokeWidth={1.5} dot={false} />
              <Line yAxisId="soc" type="monotone" dataKey="soc" name="SOC(%)" stroke="#22d3ee" strokeWidth={1.5} dot={false} />
              <Line yAxisId="v" type="monotone" dataKey="voltage" name={zh ? "Pack电压(V)" : "Pack V"} stroke="#fb923c" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {mode === "history" && (
          <div className="grid h-full min-h-0 grid-cols-2 gap-3">
            <div className="flex min-h-0 flex-col rounded-lg border border-[#1a2654]/60 bg-[#0d1233]/55 p-2">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3.5 w-0.5 rounded-full bg-[#fbbf24]" />
                <span className="text-xs font-semibold text-[#dbe8ff]">{zh ? "电芯温度" : "Cell Temperature"}</span>
              </div>
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={histTemp} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="#1a2654" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "#7b8ab8", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      minTickGap={18}
                      tickFormatter={(value, index) => index % 4 === 0 ? value : ""}
                    />
                    <YAxis domain={[20, 42]} tick={{ fill: "#7b8ab8", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}°`} />
                    <Tooltip contentStyle={TS} labelStyle={{ color: "#7b8ab8" }} formatter={(v: number, n: string) => [`${(v as number).toFixed(1)} °C`, n]} />
                    <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: "4px" }} formatter={v => <span style={{ color: "#7b8ab8", fontSize: "10px" }}>{v}</span>} />
                    <Line type="monotone" dataKey="maxTemp" name={zh ? "最高温" : "Max"} stroke="#f87171" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="avgTemp" name={zh ? "平均温" : "Avg"} stroke="#fbbf24" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="minTemp" name={zh ? "最低温" : "Min"} stroke="#7dd3fc" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex min-h-0 flex-col rounded-lg border border-[#1a2654]/60 bg-[#0d1233]/55 p-2">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3.5 w-0.5 rounded-full bg-[#22d3ee]" />
                <span className="text-xs font-semibold text-[#dbe8ff]">{zh ? "电芯电压" : "Cell Voltage"}</span>
              </div>
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={histVoltage} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="#1a2654" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "#7b8ab8", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      minTickGap={18}
                      tickFormatter={(value, index) => index % 4 === 0 ? value : ""}
                    />
                    <YAxis domain={[3.28, 3.38]} tick={{ fill: "#7b8ab8", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => (v as number).toFixed(2)} />
                    <Tooltip contentStyle={TS} labelStyle={{ color: "#7b8ab8" }} formatter={(v: number, n: string) => [`${(v as number).toFixed(3)} V`, n]} />
                    <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: "4px" }} formatter={v => <span style={{ color: "#7b8ab8", fontSize: "10px" }}>{v}</span>} />
                    <Line type="monotone" dataKey="maxCell" name={zh ? "最高单体" : "Max Cell"} stroke="#f87171" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="avgCell" name={zh ? "平均单体" : "Avg Cell"} stroke="#22d3ee" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="minCell" name={zh ? "最低单体" : "Min Cell"} stroke="#7dd3fc" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 实时极值统计 */}
      {mode === "realtime" && (
        <div className="mt-2 shrink-0 rounded-lg border border-[#1a2654]/60 bg-[#101840]/40 px-3 py-3">
          <div className="grid grid-cols-3 gap-2.5">
            {([
              { label: zh ? "最高单体电压" : "Max Cell V", value: liveStatus.maxCellV, unit: "V", id: liveStatus.maxCellId, color: "#f87171" },
              { label: zh ? "最低单体电压" : "Min Cell V", value: liveStatus.minCellV, unit: "V", id: liveStatus.minCellId, color: "#7dd3fc" },
              { label: zh ? "单体最大压差" : "V-Delta", value: liveStatus.voltageDelta, unit: "mV", id: null, color: liveStatus.voltageDelta > 30 ? "#f87171" : "#fbbf24" },
              { label: zh ? "最高温度" : "Max Temp", value: liveStatus.maxTemp, unit: "°C", id: liveStatus.maxTempId, color: "#fb923c" },
              { label: zh ? "最低温度" : "Min Temp", value: liveStatus.minTemp, unit: "°C", id: liveStatus.minTempId, color: "#7dd3fc" },
              { label: zh ? "最大温差" : "T-Delta", value: liveStatus.tempDelta, unit: "°C", id: null, color: liveStatus.tempDelta > 8 ? "#f87171" : "#fbbf24" },
            ]).map(({ label, value, unit, id, color }) => (
              <div key={label} className="flex flex-col rounded-md border border-[#22306b] bg-[#0d1233]/75 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.04)]">
                <span className="mb-1.5 text-[11px] font-semibold tracking-[0.02em] text-[#dbe8ff]">{label}</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-lg font-extrabold leading-none" style={{ color }}>{value}</span>
                  <span className="text-[11px] font-semibold" style={{ color }}>{unit}</span>
                  {id !== null && (
                    <span className="ml-auto text-[11px] font-medium text-[#8ea5d6]">#{id}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
