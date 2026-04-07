"use client"

import { useEffect, useState } from "react"
import { Activity, ArrowUpDown, ShieldCheck, Zap } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useProject } from "@/components/dashboard/dashboard-header"

type RealtimePackStatus = "offline" | "standby" | "charge" | "discharge"

const PLACEHOLDER = "--"

const displayPackStatusLabels: Record<RealtimePackStatus, { zh: string; en: string }> = {
  offline: { zh: "离线", en: "Offline" },
  standby: { zh: "静置", en: "Standby" },
  charge: { zh: "充电", en: "Charging" },
  discharge: { zh: "放电", en: "Discharging" },
}

const statusColors: Record<
  RealtimePackStatus,
  { wave: string; fill: string; glow: string; border: string; text: string; pill: string }
> = {
  charge: {
    wave: "#00e87a",
    fill: "linear-gradient(0deg,#054d22,#0c7a38,#00c060)",
    glow: "rgba(0,232,122,0.55)",
    border: "rgba(0,200,100,0.7)",
    text: "#00f38d",
    pill: "rgba(0,180,90,0.22)",
  },
  discharge: {
    wave: "#f59e0b",
    fill: "linear-gradient(0deg,#7c3000,#c05a00,#f59e0b)",
    glow: "rgba(245,158,11,0.55)",
    border: "rgba(230,130,0,0.7)",
    text: "#ffb14a",
    pill: "rgba(220,120,0,0.22)",
  },
  standby: {
    wave: "#38bdf8",
    fill: "linear-gradient(0deg,#0c2a4a,#1a5080,#38bdf8)",
    glow: "rgba(56,189,248,0.45)",
    border: "rgba(56,189,248,0.6)",
    text: "#7dd3fc",
    pill: "rgba(56,189,248,0.18)",
  },
  offline: {
    wave: "#7c8a9f",
    fill: "linear-gradient(0deg,#1c2430,#334155,#64748b)",
    glow: "rgba(148,163,184,0.35)",
    border: "rgba(148,163,184,0.45)",
    text: "#cbd5e1",
    pill: "rgba(100,116,139,0.2)",
  },
}

const isPlaceholder = (value: string) => value.trim() === PLACEHOLDER
const displaySocText = (soc: string, socPercent: number | null) =>
  isPlaceholder(soc) ? `${PLACEHOLDER}%` : `${Math.round(socPercent ?? 0)}%`

export function RealtimeStatusBoard() {
  const { language } = useLanguage()
  const { selectedProject } = useProject()
  const [liveBlink, setLiveBlink] = useState(true)
  const { realtimeSnapshot } = selectedProject

  useEffect(() => {
    const t = window.setInterval(() => setLiveBlink((v) => !v), 1200)
    return () => window.clearInterval(t)
  }, [])

  const colors = statusColors[realtimeSnapshot.packStatus]
  const packStatusLabel =
    language === "zh"
      ? displayPackStatusLabels[realtimeSnapshot.packStatus].zh
      : displayPackStatusLabels[realtimeSnapshot.packStatus].en

  const metricRows = [
    { labelZh: "PACK电压", labelEn: "PACK Voltage", value: realtimeSnapshot.packVoltage, unit: "V", Icon: Activity, accent: "#57a8ff", glow: "rgba(87,168,255,0.55)" },
    { labelZh: "当前功率", labelEn: "Power", value: realtimeSnapshot.powerKw, unit: "kW", Icon: Zap, accent: "#8ef14d", glow: "rgba(142,241,77,0.5)" },
    { labelZh: "组串电流", labelEn: "String Current", value: realtimeSnapshot.stringCurrent, unit: "A", Icon: ArrowUpDown, accent: "#57a8ff", glow: "rgba(87,168,255,0.55)" },
    { labelZh: "SOH", labelEn: "SOH", value: realtimeSnapshot.soh, unit: "%", Icon: ShieldCheck, accent: "#8af7bc", glow: "rgba(138,247,188,0.5)" },
  ]

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#22d3ee]/26 p-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_16px_32px_rgba(0,0,0,0.16)]"
      style={{
        background:
          "radial-gradient(circle at 18% 16%,rgba(64,124,255,0.18),transparent 30%),radial-gradient(circle at 80% 10%,rgba(0,212,170,0.12),transparent 24%),linear-gradient(180deg,rgba(11,31,67,0.72),rgba(6,20,47,0.82))",
      }}
    >
      <style>{`
        @keyframes rsb-wave1 { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        @keyframes rsb-wave2 { 0% { transform: translateX(-25%) } 100% { transform: translateX(25%) } }
        @keyframes rsb-scanline { 0% { transform: translateY(-100%) } 100% { transform: translateY(100%) } }
        @keyframes rsb-sonar { 0% { opacity: 0.55; transform: scale(0.82) } 100% { opacity: 0; transform: scale(1.5) } }
      `}</style>

      <div className="absolute left-2.5 top-2.5 flex items-center gap-1">
        <div
          className={`h-1.5 w-1.5 rounded-full ${realtimeSnapshot.isOnline ? "bg-[#00e87a]" : "bg-[#94a3b8]"}`}
          style={{
            opacity: liveBlink ? 1 : 0.18,
            transition: "opacity 0.4s ease",
            boxShadow: realtimeSnapshot.isOnline ? "0 0 5px rgba(0,232,122,0.8)" : "0 0 5px rgba(148,163,184,0.55)",
          }}
        />
        <span
          className={`text-[10px] font-bold tracking-[0.04em] ${realtimeSnapshot.isOnline ? "text-[#00e87a]" : "text-[#cbd5e1]"}`}
          style={{ textShadow: realtimeSnapshot.isOnline ? "0 0 6px rgba(0,232,122,0.6)" : "0 0 6px rgba(148,163,184,0.45)" }}
        >
          {realtimeSnapshot.isOnline ? (language === "zh" ? "在线" : "Online") : (language === "zh" ? "离线" : "Offline")}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-row gap-1.5 overflow-hidden">
        <div className="flex w-[78px] shrink-0 flex-col items-center justify-center gap-1.5">
          <div
            className="h-[5px] w-[28px] rounded-t-[3px] transition-all duration-700"
            style={{ background: colors.wave, boxShadow: `0 0 8px ${colors.glow}` }}
          />

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
            <div
              className="absolute bottom-0 left-0 right-0 transition-all duration-1000"
              style={{
                height: `${realtimeSnapshot.socPercent ?? 0}%`,
                background: colors.fill,
              }}
            />
            <div className="pointer-events-none absolute left-0 right-0 z-20 overflow-hidden" style={{ bottom: `calc(${realtimeSnapshot.socPercent ?? 0}% - 9px)`, height: "18px", transition: "bottom 1s ease" }}>
              <svg viewBox="0 0 400 18" preserveAspectRatio="none" style={{ width: "200%", height: "100%", animation: "rsb-wave1 2.4s linear infinite" }}>
                <path d="M0,9 C50,0 100,18 150,9 C200,0 250,18 300,9 C350,0 400,18 400,9 L400,18 L0,18 Z" style={{ fill: colors.wave, opacity: 0.9 }} />
              </svg>
            </div>
            <div className="pointer-events-none absolute left-0 right-0 z-20 overflow-hidden" style={{ bottom: `calc(${realtimeSnapshot.socPercent ?? 0}% - 6px)`, height: "14px", transition: "bottom 1s ease" }}>
              <svg viewBox="0 0 400 14" preserveAspectRatio="none" style={{ width: "200%", height: "100%", animation: "rsb-wave2 1.6s linear infinite" }}>
                <path d="M0,7 C50,0 100,14 150,7 C200,0 250,14 300,7 C350,0 400,14 400,7 L400,14 L0,14 Z" style={{ fill: colors.wave, opacity: 0.5 }} />
              </svg>
            </div>
            <div className="pointer-events-none absolute left-0 right-0 z-30 h-[30%]" style={{ background: "linear-gradient(180deg,transparent,rgba(255,255,255,0.06),transparent)", animation: "rsb-scanline 3s ease-in-out infinite" }} />
            {[25, 50, 75].map((pct) => (
              <div key={pct} className="pointer-events-none absolute left-2 right-2 z-40 h-px" style={{ bottom: `${pct}%`, background: "rgba(255,255,255,0.12)" }} />
            ))}
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-1">
              <Zap className="h-4 w-4 text-white/90" fill="currentColor" />
              <span className="text-[1.3rem] font-extrabold leading-none text-white" style={{ textShadow: "0 0 14px rgba(0,0,0,0.95)" }}>
                {displaySocText(realtimeSnapshot.soc, realtimeSnapshot.socPercent)}
              </span>
            </div>
          </div>

          <div
            className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-[0.03em] transition-all duration-700"
            style={{ color: colors.text, background: colors.pill, border: `1px solid ${colors.border}`, boxShadow: `0 0 7px ${colors.glow}`, textShadow: `0 0 5px ${colors.glow}` }}
          >
            {packStatusLabel}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-1.5 overflow-hidden">
          {metricRows.map((item) => {
            const Icon = item.Icon
            return (
              <div
                key={item.labelEn}
                className="relative flex min-h-0 min-w-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-[14px] border border-dashed border-white/40 px-3 py-3"
                style={{
                  background: `linear-gradient(160deg,rgba(16,42,92,0.94),rgba(8,22,54,0.98))`,
                  boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 40px ${item.glow.replace(/[\d.]+\)$/, "0.12)")}, 0 0 16px rgba(0,0,0,0.2)`,
                }}
              >
                <div className="pointer-events-none absolute bottom-0 left-4 right-4 h-[3px] rounded-full" style={{ background: `linear-gradient(90deg,transparent,${item.accent},transparent)`, boxShadow: `0 0 12px ${item.accent}` }} />
                <div className="pointer-events-none absolute left-0 top-0 h-full w-full rounded-[14px]" style={{ background: `radial-gradient(ellipse at 50% 0%, ${item.glow.replace(/[\d.]+\)$/, "0.15)")}, transparent 60%)` }} />

                <span className="z-10 text-center text-[0.72rem] font-semibold leading-tight tracking-[0.02em] text-[#f5f8ff] [text-shadow:0_2px_8px_rgba(0,0,0,0.55)]">
                  {language === "zh" ? item.labelZh : item.labelEn}
                </span>

                <div className="relative flex shrink-0 items-center justify-center" style={{ width: 80, height: 80 }}>
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={{ border: `1px solid ${item.accent}60`, animation: "rsb-sonar 2.6s ease-out infinite" }} />
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={{ border: `1px solid ${item.accent}40`, animation: "rsb-sonar 2.6s ease-out infinite", animationDelay: "1s" }} />
                  <div className="pointer-events-none absolute rounded-full" style={{ inset: 8, background: `radial-gradient(circle, ${item.glow.replace(/[\d.]+\)$/, "0.25)")}, transparent 70%)` }} />
                  <div
                    className="relative flex items-center justify-center rounded-full"
                    style={{
                      width: 62,
                      height: 62,
                      background: `radial-gradient(circle at 30% 30%, ${item.accent}30, ${item.accent}08)`,
                      border: `1.5px solid ${item.accent}90`,
                      boxShadow: `0 0 20px ${item.glow}, 0 0 8px ${item.glow}, inset 0 0 16px ${item.accent}18`,
                    }}
                  >
                    <Icon style={{ width: 26, height: 26, color: item.accent, filter: `drop-shadow(0 0 6px ${item.glow})` }} />
                  </div>
                </div>

                <div className="z-10 flex shrink-0 items-end justify-center gap-1 whitespace-nowrap leading-none">
                  <span
                    className="font-extrabold tabular-nums"
                    style={{ fontSize: "clamp(0.95rem, 3vw, 1.5rem)", color: item.accent, textShadow: `0 0 18px ${item.glow}, 0 1px 6px rgba(0,0,0,0.9)` }}
                  >
                    {item.value}
                  </span>
                  <span className="pb-0.5 text-[11px] font-semibold text-white/60" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
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
