"use client"

import { useEffect, useState } from "react"
import { Activity, ArrowUpDown, ShieldCheck, Zap } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

type PackStatus = "offline" | "precharge" | "standby" | "charge" | "discharge" | "fault"

type LiveSnapshot = {
  soc: number
  packVoltage: number
  powerKw: number
  stringCurrent: number
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
    soc:           93 + (phase % 4) * 2,
    packVoltage:   5682.4 + (phase % 4) * 6.2,
    powerKw:       packStatus === "discharge" ? -628.8 : 655.4 + (phase % 3) * 18.6,
    stringCurrent: packStatus === "discharge" ? -154.8 : 161.3 + (phase % 4) * 2.8,
    soh:           99.6 + (phase % 3) * 0.1,
    packStatus,
  }
}

const statusColors: Record<PackStatus, { wave: string; fill: string; glow: string; border: string; text: string; pill: string }> = {
  charge:    { wave: "#00e87a", fill: "linear-gradient(0deg,#054d22,#0c7a38,#00c060)", glow: "rgba(0,232,122,0.55)",   border: "rgba(0,200,100,0.7)",   text: "#00f38d", pill: "rgba(0,180,90,0.22)" },
  discharge: { wave: "#f59e0b", fill: "linear-gradient(0deg,#7c3000,#c05a00,#f59e0b)", glow: "rgba(245,158,11,0.55)",  border: "rgba(230,130,0,0.7)",   text: "#ffb14a", pill: "rgba(220,120,0,0.22)" },
  standby:   { wave: "#38bdf8", fill: "linear-gradient(0deg,#0c2a4a,#1a5080,#38bdf8)", glow: "rgba(56,189,248,0.45)",  border: "rgba(56,189,248,0.6)",  text: "#7dd3fc", pill: "rgba(56,189,248,0.18)" },
  precharge: { wave: "#59b6ff", fill: "linear-gradient(0deg,#0c2a4a,#1a5080,#59b6ff)", glow: "rgba(89,182,255,0.45)",  border: "rgba(89,182,255,0.6)",  text: "#59b6ff", pill: "rgba(89,182,255,0.18)" },
  offline:   { wave: "#4a6070", fill: "linear-gradient(0deg,#0a1520,#1a2a38,#2a3a48)", glow: "rgba(74,96,112,0.3)",   border: "rgba(74,96,112,0.5)",   text: "#8ea4be", pill: "rgba(74,96,112,0.18)" },
  fault:     { wave: "#ff6464", fill: "linear-gradient(0deg,#4a0000,#8a0000,#ff3232)", glow: "rgba(255,100,100,0.55)", border: "rgba(255,80,80,0.7)",   text: "#ff6464", pill: "rgba(255,60,60,0.22)" },
}

export function RealtimeStatusBoard() {
  const { language } = useLanguage()
  const [snapshot, setSnapshot] = useState<LiveSnapshot>(() => createSnapshot(0))
  const [liveBlink, setLiveBlink] = useState(true)

  useEffect(() => {
    const t = window.setInterval(() => setLiveBlink((v) => !v), 1200)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    let phase = 0
    const timer = window.setInterval(() => { phase += 1; setSnapshot(createSnapshot(phase)) }, 4000)
    return () => window.clearInterval(timer)
  }, [])

  const colors = statusColors[snapshot.packStatus]
  const packStatusLabel = language === "zh"
    ? packStatusLabels[snapshot.packStatus].zh
    : packStatusLabels[snapshot.packStatus].en

  const metricRows = [
    { labelZh: "PACK电压",  labelEn: "PACK Voltage",    value: snapshot.packVoltage.toFixed(1),   unit: "V",  Icon: Activity,   accent: "#57a8ff", glow: "rgba(87,168,255,0.55)"  },
    { labelZh: "当前功率",  labelEn: "Power",            value: snapshot.powerKw.toFixed(1),       unit: "kW", Icon: Zap,        accent: "#8ef14d", glow: "rgba(142,241,77,0.5)"   },
    { labelZh: "组串电流",  labelEn: "String Current",   value: snapshot.stringCurrent.toFixed(1), unit: "A",  Icon: ArrowUpDown,accent: "#57a8ff", glow: "rgba(87,168,255,0.55)"  },
    { labelZh: "SOH",       labelEn: "SOH",              value: snapshot.soh.toFixed(1),           unit: "%",  Icon: ShieldCheck,accent: "#8af7bc", glow: "rgba(138,247,188,0.5)"  },
  ]

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#22d3ee]/26 p-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_16px_32px_rgba(0,0,0,0.16)]"
      style={{
        background: "radial-gradient(circle at 18% 16%,rgba(64,124,255,0.18),transparent 30%),radial-gradient(circle at 80% 10%,rgba(0,212,170,0.12),transparent 24%),linear-gradient(180deg,rgba(11,31,67,0.72),rgba(6,20,47,0.82))",
      }}
    >
      <style>{`
        @keyframes rsb-wave1    { 0%{transform:translateX(0)}     100%{transform:translateX(-50%)} }
        @keyframes rsb-wave2    { 0%{transform:translateX(-25%)}  100%{transform:translateX(25%)}  }
        @keyframes rsb-scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
        @keyframes rsb-sonar    { 0%{opacity:0.55;transform:scale(0.82)} 100%{opacity:0;transform:scale(1.5)} }
      `}</style>

      {/* ── Online / Offline — top left ── */}
      <div className="absolute left-2.5 top-2.5 flex items-center gap-1">
        <div
          className="h-1.5 w-1.5 rounded-full bg-[#00e87a]"
          style={{ opacity: liveBlink ? 1 : 0.18, transition: "opacity 0.4s ease", boxShadow: "0 0 5px rgba(0,232,122,0.8)" }}
        />
        <span className="text-[10px] font-bold tracking-[0.04em] text-[#00e87a]" style={{ textShadow: "0 0 6px rgba(0,232,122,0.6)" }}>
          {language === "zh" ? "在线" : "Online"}
        </span>
      </div>

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1 flex-row gap-1.5 overflow-hidden">

        {/* ── Battery column ── */}
        <div className="flex w-[72px] shrink-0 flex-col items-center justify-center gap-1.5">
          {/* Terminal nub */}
          <div
            className="h-[5px] w-[28px] rounded-t-[3px] transition-all duration-700"
            style={{ background: colors.wave, boxShadow: `0 0 8px ${colors.glow}` }}
          />

          {/* Shell */}
          <div
            className="relative w-full overflow-hidden rounded-[12px] transition-all duration-700"
            style={{
              height: "148px",
              border: `1.5px solid ${colors.border}`,
              background: "#020810",
              boxShadow: `0 0 22px ${colors.glow}, inset 0 0 14px rgba(0,0,0,0.7)`,
            }}
          >
            <div className="pointer-events-none absolute inset-[2px] z-10 rounded-[10px] border border-white/[0.07]" />
            {/* Fill */}
            <div className="absolute bottom-0 left-0 right-0 transition-all duration-1000" style={{ height: `${snapshot.soc}%`, background: colors.fill }} />
            {/* Wave 1 */}
            <div className="pointer-events-none absolute left-0 right-0 z-20 overflow-hidden" style={{ bottom: `calc(${snapshot.soc}% - 9px)`, height: "18px", transition: "bottom 1s ease" }}>
              <svg viewBox="0 0 400 18" preserveAspectRatio="none" style={{ width: "200%", height: "100%", animation: "rsb-wave1 2.4s linear infinite" }}>
                <path d="M0,9 C50,0 100,18 150,9 C200,0 250,18 300,9 C350,0 400,18 400,9 L400,18 L0,18 Z" style={{ fill: colors.wave, opacity: 0.9 }} />
              </svg>
            </div>
            {/* Wave 2 */}
            <div className="pointer-events-none absolute left-0 right-0 z-20 overflow-hidden" style={{ bottom: `calc(${snapshot.soc}% - 6px)`, height: "14px", transition: "bottom 1s ease" }}>
              <svg viewBox="0 0 400 14" preserveAspectRatio="none" style={{ width: "200%", height: "100%", animation: "rsb-wave2 1.6s linear infinite" }}>
                <path d="M0,7 C50,0 100,14 150,7 C200,0 250,14 300,7 C350,0 400,14 400,7 L400,14 L0,14 Z" style={{ fill: colors.wave, opacity: 0.5 }} />
              </svg>
            </div>
            {/* Scan shimmer */}
            <div className="pointer-events-none absolute left-0 right-0 z-30 h-[30%]" style={{ background: "linear-gradient(180deg,transparent,rgba(255,255,255,0.06),transparent)", animation: "rsb-scanline 3s ease-in-out infinite" }} />
            {/* Ticks */}
            {[25, 50, 75].map((pct) => (
              <div key={pct} className="pointer-events-none absolute left-2 right-2 z-40 h-px" style={{ bottom: `${pct}%`, background: "rgba(255,255,255,0.12)" }} />
            ))}
            {/* SOC */}
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-0.5">
              <Zap className="h-3.5 w-3.5 text-white/80" fill="currentColor" />
              <span className="text-[1.1rem] font-extrabold leading-none text-white" style={{ textShadow: "0 0 12px rgba(0,0,0,0.95)" }}>
                {Math.round(snapshot.soc)}%
              </span>
            </div>
          </div>

          {/* Status pill */}
          <div
            className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.03em] transition-all duration-700"
            style={{ color: colors.text, background: colors.pill, border: `1px solid ${colors.border}`, boxShadow: `0 0 7px ${colors.glow}`, textShadow: `0 0 5px ${colors.glow}` }}
          >
            {packStatusLabel}
          </div>

        </div>

        {/* ── 2×2 metric grid ── */}
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-1.5 overflow-hidden">
          {metricRows.map((item) => {
            const Icon = item.Icon
            return (
              <div
                key={item.labelEn}
                className="relative flex min-h-0 min-w-0 flex-col items-center justify-between overflow-hidden rounded-[14px] border border-dashed border-white/40 px-1.5 py-1.5"
                style={{
                  background: "linear-gradient(180deg,rgba(13,36,78,0.88),rgba(10,26,58,0.94))",
                  boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 -16px 28px ${item.glow.replace("0.5", "0.18")}, 0 0 12px rgba(0,0,0,0.15)`,
                }}
              >
                {/* Bottom accent line */}
                <div className="pointer-events-none absolute bottom-0 left-4 right-4 h-[2px] rounded-full" style={{ background: `linear-gradient(90deg,transparent,${item.accent},transparent)`, boxShadow: `0 0 6px ${item.accent}` }} />
                {/* Radial highlight */}
                <div className="pointer-events-none absolute inset-0 rounded-[14px] bg-[radial-gradient(circle_at_18%_22%,rgba(130,193,255,0.10),transparent_30%)]" />

                {/* Label */}
                <span className="z-10 shrink-0 text-[0.7rem] font-semibold leading-tight tracking-[0.02em] text-[#f5f8ff]" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.55)" }}>
                  {language === "zh" ? item.labelZh : item.labelEn}
                </span>

                {/* Icon zone — overflow hidden to clip sonar rings */}
                <div className="relative flex shrink-0 items-center justify-center overflow-hidden" style={{ width: 44, height: 44 }}>
                  {/* Sonar ring 1 */}
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={{ border: `1px solid ${item.accent}`, animation: "rsb-sonar 2.4s ease-out infinite" }} />
                  {/* Sonar ring 2 */}
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={{ border: `1px solid ${item.accent}`, animation: "rsb-sonar 2.4s ease-out infinite", animationDelay: "0.8s" }} />
                  {/* Glow bg */}
                  <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${item.glow} 0%, transparent 70%)` }} />
                  {/* Icon circle */}
                  <div
                    className="relative flex items-center justify-center rounded-full"
                    style={{
                      width: 36, height: 36,
                      background: `radial-gradient(circle at 35% 35%, ${item.accent}28, ${item.accent}08)`,
                      border: `1.5px solid ${item.accent}70`,
                      boxShadow: `0 0 10px ${item.glow}, inset 0 0 8px ${item.accent}14`,
                    }}
                  >
                    <Icon style={{ width: 14, height: 14, color: item.accent, filter: `drop-shadow(0 0 4px ${item.glow})` }} />
                  </div>
                </div>

                {/* Value */}
                <div className="z-10 flex shrink-0 items-end gap-1 leading-none">
                  <span
                    className="font-bold tabular-nums"
                    style={{ fontSize: "clamp(1.15rem, 1.5vw, 1.5rem)", color: item.accent, textShadow: `0 0 14px ${item.glow}, 0 1px 6px rgba(0,0,0,0.9)` }}
                  >
                    {item.value}
                  </span>
                  <span className="pb-0.5 text-[11px] font-medium text-white/55" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
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
