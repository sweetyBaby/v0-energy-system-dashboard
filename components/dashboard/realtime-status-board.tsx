"use client"

import { useEffect, useState } from "react"
import { Activity, ArrowUpDown, ShieldCheck, Zap } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

type PackStatus = "offline" | "precharge" | "standby" | "charge" | "discharge" | "fault"

type LiveSnapshot = {
  soc: number
  packVoltage: number
  busVoltage: number
  cellTotalVoltage: number
  powerKw: number
  stringCurrent: number
  hallCurrent: number
  availableCapacity: number
  soh: number
  packStatus: PackStatus
}

const packStatusCycle: PackStatus[] = ["standby", "charge", "charge", "discharge", "precharge", "charge"]

const packStatusLabels: Record<PackStatus, { zh: string; en: string }> = {
  offline:   { zh: "离线",  en: "Offline" },
  precharge: { zh: "预充",  en: "Precharge" },
  standby:   { zh: "静置",  en: "Standby" },
  charge:    { zh: "充电",  en: "Charging" },
  discharge: { zh: "放电",  en: "Discharging" },
  fault:     { zh: "故障",  en: "Fault" },
}

const createSnapshot = (phase: number): LiveSnapshot => {
  const packStatus = packStatusCycle[phase % packStatusCycle.length]
  return {
    soc:               93 + (phase % 4) * 2,
    packVoltage:       5682.4 + (phase % 4) * 6.2,
    busVoltage:        1320.5 + (phase % 4) * 4.1,
    cellTotalVoltage:  1313.5 + (phase % 4) * 2.3,
    powerKw:           packStatus === "discharge" ? -628.8 : 655.4 + (phase % 3) * 18.6,
    stringCurrent:     packStatus === "discharge" ? -154.8 : 161.3 + (phase % 4) * 2.8,
    hallCurrent:       0.22 + (phase % 3) * 0.04,
    availableCapacity: 832.76 + (phase % 4) * 9.5,
    soh:               99.6 + (phase % 3) * 0.1,
    packStatus,
  }
}

const statusColors: Record<PackStatus, { wave: string; fill: string; glow: string; border: string; text: string; pill: string }> = {
  charge:    { wave: "#00e87a", fill: "linear-gradient(0deg,#054d22,#0c7a38,#00c060)", glow: "rgba(0,232,122,0.55)",  border: "rgba(0,200,100,0.7)",  text: "#00f38d", pill: "rgba(0,200,100,0.25)" },
  discharge: { wave: "#f59e0b", fill: "linear-gradient(0deg,#7c3000,#c05a00,#f59e0b)", glow: "rgba(245,158,11,0.55)", border: "rgba(230,130,0,0.7)",  text: "#ffb14a", pill: "rgba(230,130,0,0.25)" },
  standby:   { wave: "#38bdf8", fill: "linear-gradient(0deg,#0c2a4a,#1a5080,#38bdf8)", glow: "rgba(56,189,248,0.45)", border: "rgba(56,189,248,0.6)", text: "#ffffff", pill: "rgba(56,189,248,0.2)" },
  precharge: { wave: "#59b6ff", fill: "linear-gradient(0deg,#0c2a4a,#1a5080,#59b6ff)", glow: "rgba(89,182,255,0.45)", border: "rgba(89,182,255,0.6)", text: "#59b6ff", pill: "rgba(89,182,255,0.2)" },
  offline:   { wave: "#4a6070", fill: "linear-gradient(0deg,#0a1520,#1a2a38,#2a3a48)", glow: "rgba(74,96,112,0.3)",  border: "rgba(74,96,112,0.5)",  text: "#8ea4be", pill: "rgba(74,96,112,0.2)" },
  fault:     { wave: "#ff6464", fill: "linear-gradient(0deg,#4a0000,#8a0000,#ff3232)", glow: "rgba(255,100,100,0.55)", border: "rgba(255,80,80,0.7)", text: "#ff6464", pill: "rgba(255,80,80,0.25)" },
}

export function RealtimeStatusBoard() {
  const { language } = useLanguage()
  const [snapshot, setSnapshot] = useState<LiveSnapshot>(() => createSnapshot(0))
  const [liveBlink, setLiveBlink] = useState(true)

  useEffect(() => {
    let phase = 0
    const timer = window.setInterval(() => {
      phase += 1
      setSnapshot(createSnapshot(phase))
    }, 4000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const t = window.setInterval(() => setLiveBlink((v) => !v), 1200)
    return () => window.clearInterval(t)
  }, [])

  const colors = statusColors[snapshot.packStatus]
  const packStatusLabel = language === "zh"
    ? packStatusLabels[snapshot.packStatus].zh
    : packStatusLabels[snapshot.packStatus].en

  const metricRows = [
    {
      labelZh: "PACK电压", labelEn: "PACK Voltage",
      value: snapshot.packVoltage.toFixed(1), unit: "V",
      Icon: Activity,
      accent: "#39d0ff", glow: "rgba(57,208,255,0.55)",
    },
    {
      labelZh: "当前功率", labelEn: "Power",
      value: snapshot.powerKw.toFixed(1), unit: "kW",
      Icon: Zap,
      accent: "#00e87a", glow: "rgba(0,232,122,0.55)",
    },
    {
      labelZh: "组串电流", labelEn: "String Current",
      value: snapshot.stringCurrent.toFixed(1), unit: "A",
      Icon: ArrowUpDown,
      accent: "#39d0ff", glow: "rgba(57,208,255,0.55)",
    },
    {
      labelZh: "SOH", labelEn: "SOH",
      value: snapshot.soh.toFixed(1), unit: "%",
      Icon: ShieldCheck,
      accent: "#00e87a", glow: "rgba(0,232,122,0.55)",
    },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-[#22d3ee]/30 bg-[linear-gradient(180deg,rgba(8,20,42,0.82),rgba(4,12,28,0.92))] p-3 backdrop-blur-sm shadow-[0_0_0_1px_rgba(34,211,238,0.06)_inset,0_10px_28px_rgba(0,0,0,0.25)]">
      <style>{`
        @keyframes rsb-wave1  { 0%{transform:translateX(0)}     100%{transform:translateX(-50%)} }
        @keyframes rsb-wave2  { 0%{transform:translateX(-25%)}  100%{transform:translateX(25%)}  }
        @keyframes rsb-scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
        @keyframes rsb-ring1  { 0%,100%{opacity:0.5; transform:scale(1)}    60%{opacity:0; transform:scale(1.7)} }
        @keyframes rsb-ring2  { 0%,100%{opacity:0.3; transform:scale(1)}    60%{opacity:0; transform:scale(2.1)} }
        @keyframes rsb-sonar  { 0%{opacity:0.6; transform:scale(0.85)} 100%{opacity:0; transform:scale(1.55)} }
      `}</style>

      {/* ── Title row ── */}
      <div className="mb-2.5 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3
            className="text-[1.05rem] font-semibold tracking-[0.02em] text-[#00d4aa]"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.95)" }}
          >
            {language === "zh" ? "系统状态" : "System Status"}
          </h3>
        </div>
        {/* Online / Offline badge */}
        <div className="flex items-center gap-1.5">
          <div
            className="h-2 w-2 rounded-full"
            style={{
              background: "#00e87a",
              opacity: liveBlink ? 1 : 0.2,
              transition: "opacity 0.4s ease",
              boxShadow: "0 0 6px rgba(0,232,122,0.8)",
            }}
          />
          <span className="text-[11px] font-bold tracking-[0.06em] text-[#00e87a]" style={{ textShadow: "0 0 8px rgba(0,232,122,0.6)" }}>
            {language === "zh" ? "在线" : "Online"}
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1 flex-row gap-3 overflow-hidden">

        {/* ── Battery column ── */}
        <div className="flex w-[80px] shrink-0 flex-col items-center justify-center gap-2">
          {/* Terminal nub */}
          <div
            className="h-[6px] w-[32px] rounded-t-[4px] transition-all duration-700"
            style={{ background: colors.wave, boxShadow: `0 0 10px ${colors.glow}` }}
          />

          {/* Shell */}
          <div
            className="relative w-full overflow-hidden rounded-[14px] transition-all duration-700"
            style={{
              height: "148px",
              border: `1.5px solid ${colors.border}`,
              background: "#020810",
              boxShadow: `0 0 28px ${colors.glow}, inset 0 0 18px rgba(0,0,0,0.7)`,
            }}
          >
            <div className="pointer-events-none absolute inset-[2px] z-10 rounded-[12px] border border-white/[0.07]" />

            {/* Fill */}
            <div
              className="absolute bottom-0 left-0 right-0 transition-all duration-1000"
              style={{ height: `${snapshot.soc}%`, background: colors.fill }}
            />

            {/* Wave 1 */}
            <div
              className="pointer-events-none absolute left-0 right-0 z-20 overflow-hidden"
              style={{ bottom: `calc(${snapshot.soc}% - 9px)`, height: "18px", transition: "bottom 1s ease" }}
            >
              <svg viewBox="0 0 400 18" preserveAspectRatio="none" style={{ width: "200%", height: "100%", animation: "rsb-wave1 2.4s linear infinite" }}>
                <path d="M0,9 C50,0 100,18 150,9 C200,0 250,18 300,9 C350,0 400,18 400,9 L400,18 L0,18 Z" style={{ fill: colors.wave, opacity: 0.9 }} />
              </svg>
            </div>

            {/* Wave 2 */}
            <div
              className="pointer-events-none absolute left-0 right-0 z-20 overflow-hidden"
              style={{ bottom: `calc(${snapshot.soc}% - 6px)`, height: "14px", transition: "bottom 1s ease" }}
            >
              <svg viewBox="0 0 400 14" preserveAspectRatio="none" style={{ width: "200%", height: "100%", animation: "rsb-wave2 1.6s linear infinite" }}>
                <path d="M0,7 C50,0 100,14 150,7 C200,0 250,14 300,7 C350,0 400,14 400,7 L400,14 L0,14 Z" style={{ fill: colors.wave, opacity: 0.5 }} />
              </svg>
            </div>

            {/* Scan shimmer */}
            <div
              className="pointer-events-none absolute left-0 right-0 z-30 h-[30%]"
              style={{ background: "linear-gradient(180deg,transparent,rgba(255,255,255,0.06),transparent)", animation: "rsb-scanline 3s ease-in-out infinite" }}
            />

            {/* Segment ticks */}
            {[25, 50, 75].map((pct) => (
              <div key={pct} className="pointer-events-none absolute left-3 right-3 z-40 h-px" style={{ bottom: `${pct}%`, background: "rgba(255,255,255,0.12)" }} />
            ))}

            {/* SOC overlay */}
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-0.5">
              <Zap className="h-4 w-4 text-white/80" fill="currentColor" />
              <span
                className="text-[1.2rem] font-extrabold leading-none text-white"
                style={{ textShadow: "0 0 12px rgba(0,0,0,0.95), 0 1px 6px rgba(0,0,0,0.95)" }}
              >
                {Math.round(snapshot.soc)}%
              </span>
            </div>
          </div>

          {/* Status label */}
          <div
            className="shrink-0 rounded-full px-3 py-0.5 text-[11px] font-bold tracking-[0.04em] transition-all duration-700"
            style={{
              color: colors.text,
              background: colors.pill,
              border: `1px solid ${colors.border}`,
              boxShadow: `0 0 8px ${colors.glow}`,
              textShadow: `0 0 6px ${colors.glow}`,
            }}
          >
            {packStatusLabel}
          </div>
        </div>

        {/* ── 2×2 metric grid ── */}
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 overflow-hidden">
          {metricRows.map((item) => {
            const Icon = item.Icon
            return (
              <div
                key={item.labelEn}
                className="relative flex min-h-0 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-[12px] py-2"
                style={{
                  background: "linear-gradient(145deg,rgba(12,28,58,0.7) 0%,rgba(6,16,36,0.85) 100%)",
                  border: "1px solid rgba(34,211,238,0.12)",
                  boxShadow: "inset 0 0 16px rgba(0,0,0,0.35)",
                }}
              >
                {/* Label */}
                <span
                  className="text-[11px] font-semibold tracking-wide"
                  style={{ color: "rgba(255,255,255,0.65)", textShadow: "0 1px 5px rgba(0,0,0,0.9)" }}
                >
                  {language === "zh" ? item.labelZh : item.labelEn}
                </span>

                {/* Circle icon with sonar rings */}
                <div className="relative flex items-center justify-center" style={{ width: 36, height: 36 }}>
                  {/* Sonar ring 1 */}
                  <div
                    className="absolute rounded-full"
                    style={{
                      inset: -3,
                      border: `1px solid ${item.accent}`,
                      animation: "rsb-sonar 2.2s ease-out infinite",
                    }}
                  />
                  {/* Sonar ring 2 */}
                  <div
                    className="absolute rounded-full"
                    style={{
                      inset: -3,
                      border: `1px solid ${item.accent}`,
                      animation: "rsb-sonar 2.2s ease-out infinite",
                      animationDelay: "0.7s",
                    }}
                  />
                  {/* Outer glow ring */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `radial-gradient(circle, ${item.glow} 0%, transparent 70%)`,
                    }}
                  />
                  {/* Icon circle */}
                  <div
                    className="relative flex items-center justify-center rounded-full"
                    style={{
                      width: 34,
                      height: 34,
                      background: `radial-gradient(circle at 35% 35%, ${item.accent}30, ${item.accent}08)`,
                      border: `1.5px solid ${item.accent}80`,
                      boxShadow: `0 0 12px ${item.glow}, inset 0 0 8px ${item.accent}18`,
                    }}
                  >
                    <Icon
                      style={{ width: 15, height: 15, color: item.accent, filter: `drop-shadow(0 0 4px ${item.glow})` }}
                    />
                  </div>
                </div>

                {/* Value */}
                <div className="flex items-end gap-1 leading-none">
                  <span
                    className="text-[1.25rem] font-bold tabular-nums"
                    style={{ color: item.accent, textShadow: `0 0 14px ${item.glow}, 0 1px 8px rgba(0,0,0,0.95)` }}
                  >
                    {item.value}
                  </span>
                  <span
                    className="pb-0.5 text-[11px]"
                    style={{ color: "rgba(255,255,255,0.5)", textShadow: "0 1px 4px rgba(0,0,0,0.95)" }}
                  >
                    {item.unit}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
