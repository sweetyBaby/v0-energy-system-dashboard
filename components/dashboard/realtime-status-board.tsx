"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Activity, ArrowUpDown, ShieldCheck, Zap } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useProject } from "@/components/dashboard/dashboard-header"

type RealtimePackStatus = "offline" | "standby" | "charge" | "discharge"

const PLACEHOLDER = "--"

const formatRealtimeClock = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

const displayPackStatusLabels: Record<RealtimePackStatus, { zh: string; en: string }> = {
  offline: { zh: "离线", en: "Offline" },
  standby: { zh: "待机", en: "Standby" },
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

function useContainerBase(ref: React.RefObject<HTMLDivElement | null>) {
  const [base, setBase] = useState(12)

  useLayoutEffect(() => {
    if (!ref.current) return

    const element = ref.current
    const calc = (width: number, height: number) => {
      const metricAreaWidth = width * 0.74
      const metricCardWidth = metricAreaWidth / 2
      const metricCardHeight = height / 2
      const nextBase = Math.min(metricCardWidth, metricCardHeight) * 0.09
      setBase(Math.max(9, Math.min(nextBase, 18)))
    }
    const measure = () => calc(element.offsetWidth, element.offsetHeight)

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      calc(entry.contentRect.width || element.offsetWidth, entry.contentRect.height || element.offsetHeight)
    })

    observer.observe(element)
    measure()

    const rafId = window.requestAnimationFrame(measure)
    const rafId2 = window.requestAnimationFrame(() => window.requestAnimationFrame(measure))
    window.addEventListener("resize", measure)

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(rafId)
      window.cancelAnimationFrame(rafId2)
      window.removeEventListener("resize", measure)
    }
  }, [ref])

  return base
}

export function RealtimeStatusBoard() {
  const { language } = useLanguage()
  const { selectedProject } = useProject()
  const [liveBlink, setLiveBlink] = useState(true)
  const [liveTime, setLiveTime] = useState("--:--")
  const { realtimeSnapshot } = selectedProject
  const containerRef = useRef<HTMLDivElement>(null)
  const base = useContainerBase(containerRef)
  const clampText = (minRem: number, multiple: number, maxRem: number) =>
    `clamp(${minRem}rem, calc(var(--overview-root-size, 15px) * ${multiple}), ${maxRem}rem)`
  const fitText = (minRem: number, pixelSize: number, maxRem: number) =>
    `clamp(${minRem}rem, ${pixelSize}px, ${maxRem}rem)`

  useEffect(() => {
    const timer = window.setInterval(() => setLiveBlink((value) => !value), 1200)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const updateClock = () => setLiveTime(formatRealtimeClock(new Date()))
    updateClock()

    const timer = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(timer)
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

  const socBarWidth = base * 7
  const socBarHeight = base * 14
  const circleOuter = base * 6
  const circleInner = base * 4.6
  const iconSize = base * 2
  const gap = `${base * 0.38}px`

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#22d3ee]/26 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_16px_32px_rgba(0,0,0,0.16)]"
      style={{
        padding: `${base * 0.5}px`,
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

      <div
        className="absolute inset-x-0 top-0 z-20 flex items-center justify-between"
        style={{ paddingLeft: `${base * 0.8}px`, paddingRight: `${base * 0.8}px`, paddingTop: `${base * 0.18}px` }}
      >
        <div className="flex items-center" style={{ gap: `${base * 0.3}px` }}>
          <div
            className={`rounded-full ${realtimeSnapshot.isOnline ? "bg-[#00e87a]" : "bg-[#94a3b8]"}`}
            style={{
              width: `${base * 0.55}px`,
              height: `${base * 0.55}px`,
              opacity: liveBlink ? 1 : 0.18,
              transition: "opacity 0.4s ease",
              boxShadow: realtimeSnapshot.isOnline ? "0 0 5px rgba(0,232,122,0.8)" : "0 0 5px rgba(148,163,184,0.55)",
            }}
          />
          <span
            className={`font-bold tracking-[0.04em] ${realtimeSnapshot.isOnline ? "text-[#00e87a]" : "text-[#cbd5e1]"}`}
            style={{
              fontSize: clampText(0.72, 0.84, 1.18),
              textShadow: realtimeSnapshot.isOnline ? "0 0 6px rgba(0,232,122,0.6)" : "0 0 6px rgba(148,163,184,0.45)",
            }}
          >
            {realtimeSnapshot.isOnline ? (language === "zh" ? "在线" : "Online") : (language === "zh" ? "离线" : "Offline")}
          </span>
        </div>

        <div
          className="flex items-center rounded-full border border-[#1c74d9]/65 bg-[linear-gradient(180deg,rgba(5,16,48,0.96),rgba(7,24,66,0.92))]"
          style={{
            gap: `${base * 0.28}px`,
            padding: `${base * 0.12}px ${base * 0.58}px`,
            boxShadow: "0 0 12px rgba(37,153,255,0.22), inset 0 0 0 1px rgba(125,211,252,0.08)",
            whiteSpace: "nowrap",
          }}
        >
          <div
            className="rounded-full bg-[#28d7ff]"
            style={{
              width: `${base * 0.48}px`,
              height: `${base * 0.48}px`,
              opacity: liveBlink ? 1 : 0.35,
              transition: "opacity 0.4s ease",
              boxShadow: "0 0 8px rgba(40,215,255,0.78)",
            }}
          />
          <span
            className="font-semibold tracking-[0.03em] text-[#55d9ff]"
            style={{
              fontSize: clampText(0.68, 0.8, 1.02),
              textShadow: "0 0 8px rgba(34,211,238,0.22)",
            }}
          >
            {language === "zh" ? "实时" : "Live Time"}
          </span>
          <span
            className="font-semibold tabular-nums tracking-[0.03em] text-[#d8f2ff]"
            style={{
              fontSize: clampText(0.7, 0.84, 1.08),
              textShadow: "0 0 10px rgba(125,211,252,0.16)",
            }}
          >
            {liveTime}
          </span>
        </div>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-row overflow-hidden"
        style={{ gap, paddingTop: `max(${base * 0.8}px, calc(var(--overview-root-size, 15px) * 1.65))` }}
      >
        <div className="flex shrink-0 flex-col items-center justify-center" style={{ width: `${socBarWidth}px`, gap: `${base * 0.5}px` }}>
          <div
            className="rounded-t-[3px] transition-all duration-700"
            style={{
              width: `${socBarWidth * 0.45}px`,
              height: `${base * 0.4}px`,
              background: colors.wave,
              boxShadow: `0 0 8px ${colors.glow}`,
            }}
          />

          <div
            className="relative overflow-hidden rounded-[12px] transition-all duration-700"
            style={{
              width: `${socBarWidth}px`,
              height: `${socBarHeight}px`,
              border: `1.5px solid ${colors.border}`,
              background: "#020810",
              boxShadow: `0 0 22px ${colors.glow}, inset 0 0 14px rgba(0,0,0,0.7)`,
            }}
          >
            <div className="pointer-events-none absolute inset-[2px] z-10 rounded-[10px] border border-white/[0.07]" />
            <div
              className="absolute bottom-0 left-0 right-0 transition-all duration-1000"
              style={{ height: `${realtimeSnapshot.socPercent ?? 0}%`, background: colors.fill }}
            />
            <div
              className="pointer-events-none absolute left-0 right-0 z-20 overflow-hidden"
              style={{ bottom: `calc(${realtimeSnapshot.socPercent ?? 0}% - 9px)`, height: "18px", transition: "bottom 1s ease" }}
            >
              <svg viewBox="0 0 400 18" preserveAspectRatio="none" style={{ width: "200%", height: "100%", animation: "rsb-wave1 2.4s linear infinite" }}>
                <path d="M0,9 C50,0 100,18 150,9 C200,0 250,18 300,9 C350,0 400,18 400,9 L400,18 L0,18 Z" style={{ fill: colors.wave, opacity: 0.9 }} />
              </svg>
            </div>
            <div
              className="pointer-events-none absolute left-0 right-0 z-20 overflow-hidden"
              style={{ bottom: `calc(${realtimeSnapshot.socPercent ?? 0}% - 6px)`, height: "14px", transition: "bottom 1s ease" }}
            >
              <svg viewBox="0 0 400 14" preserveAspectRatio="none" style={{ width: "200%", height: "100%", animation: "rsb-wave2 1.6s linear infinite" }}>
                <path d="M0,7 C50,0 100,14 150,7 C200,0 250,14 300,7 C350,0 400,14 400,7 L400,14 L0,14 Z" style={{ fill: colors.wave, opacity: 0.5 }} />
              </svg>
            </div>
            <div className="pointer-events-none absolute left-0 right-0 z-30 h-[30%]" style={{ background: "linear-gradient(180deg,transparent,rgba(255,255,255,0.06),transparent)", animation: "rsb-scanline 3s ease-in-out infinite" }} />
            {[25, 50, 75].map((pct) => (
              <div key={pct} className="pointer-events-none absolute left-2 right-2 z-40 h-px" style={{ bottom: `${pct}%`, background: "rgba(255,255,255,0.12)" }} />
            ))}
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center" style={{ gap: `${base * 0.3}px` }}>
              <Zap style={{ width: `${base * 1.2}px`, height: `${base * 1.2}px`, color: "rgba(255,255,255,0.9)" }} fill="currentColor" />
              <span
                className="font-extrabold leading-none text-white"
                style={{
                  fontSize: clampText(1.45, 1.75, 2.45),
                  textShadow: "0 0 14px rgba(0,0,0,0.95)",
                }}
              >
                {displaySocText(realtimeSnapshot.soc, realtimeSnapshot.socPercent)}
              </span>
            </div>
          </div>

          <div
            className="shrink-0 rounded-full font-bold tracking-[0.03em] transition-all duration-700"
            style={{
              fontSize: clampText(0.72, 0.84, 1.05),
              padding: `${base * 0.2}px ${base * 0.7}px`,
              color: colors.text,
              background: colors.pill,
              border: `1px solid ${colors.border}`,
              boxShadow: `0 0 7px ${colors.glow}`,
              textShadow: `0 0 5px ${colors.glow}`,
            }}
          >
            {packStatusLabel}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 overflow-hidden" style={{ gap }}>
          {metricRows.map((item) => {
            const Icon = item.Icon

            return (
              <div
                key={item.labelEn}
                className="relative flex min-h-0 min-w-0 flex-col items-center justify-between overflow-hidden rounded-[14px] border border-dashed border-white/40"
                style={{
                  gap: `${base * 0.12}px`,
                  padding: `${base * 0.34}px ${base * 0.42}px ${base * 0.24}px`,
                  background: "linear-gradient(160deg,rgba(16,42,92,0.94),rgba(8,22,54,0.98))",
                  boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 40px ${item.glow.replace(/[\d.]+\)$/, "0.12)")}, 0 0 16px rgba(0,0,0,0.2)`,
                }}
              >
                <div
                  className="pointer-events-none absolute bottom-0 left-4 right-4 rounded-full"
                  style={{ height: `${base * 0.22}px`, background: `linear-gradient(90deg,transparent,${item.accent},transparent)`, boxShadow: `0 0 12px ${item.accent}` }}
                />
                <div
                  className="pointer-events-none absolute left-0 top-0 h-full w-full rounded-[14px]"
                  style={{ background: `radial-gradient(ellipse at 50% 0%, ${item.glow.replace(/[\d.]+\)$/, "0.15)")}, transparent 60%)` }}
                />

                <span
                  className="z-10 text-center font-semibold leading-tight tracking-[0.02em] text-[#f5f8ff] [text-shadow:0_2px_8px_rgba(0,0,0,0.55)]"
                  style={{ fontSize: fitText(0.76, base * 0.92, 1.1) }}
                >
                  {language === "zh" ? item.labelZh : item.labelEn}
                </span>

                <div className="relative flex shrink-0 items-center justify-center" style={{ width: `${circleOuter * 0.82}px`, height: `${circleOuter * 0.82}px`, marginTop: `${base * 0.02}px` }}>
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={{ border: `1px solid ${item.accent}60`, animation: "rsb-sonar 2.6s ease-out infinite" }} />
                  <div className="pointer-events-none absolute inset-0 rounded-full" style={{ border: `1px solid ${item.accent}40`, animation: "rsb-sonar 2.6s ease-out infinite", animationDelay: "1s" }} />
                  <div className="pointer-events-none absolute rounded-full" style={{ inset: `${base * 0.6}px`, background: `radial-gradient(circle, ${item.glow.replace(/[\d.]+\)$/, "0.25)")}, transparent 70%)` }} />
                  <div
                    className="relative flex items-center justify-center rounded-full"
                    style={{
                      width: `${circleInner * 0.82}px`,
                      height: `${circleInner * 0.82}px`,
                      background: `radial-gradient(circle at 30% 30%, ${item.accent}30, ${item.accent}08)`,
                      border: `1.5px solid ${item.accent}90`,
                      boxShadow: `0 0 20px ${item.glow}, 0 0 8px ${item.glow}, inset 0 0 16px ${item.accent}18`,
                    }}
                  >
                    <Icon style={{ width: `${iconSize * 0.78}px`, height: `${iconSize * 0.78}px`, color: item.accent, filter: `drop-shadow(0 0 6px ${item.glow})` }} />
                  </div>
                </div>

                <div className="z-10 flex shrink-0 items-end justify-center whitespace-nowrap leading-none" style={{ gap: `${base * 0.2}px` }}>
                  <span
                    className="font-extrabold tabular-nums"
                    style={{
                      fontSize: fitText(1.02, base * 1.54, 1.86),
                      color: item.accent,
                      textShadow: `0 0 18px ${item.glow}, 0 1px 6px rgba(0,0,0,0.9)`,
                    }}
                  >
                    {item.value}
                  </span>
                  <span
                    className="font-semibold text-white/60"
                    style={{
                      fontSize: fitText(0.68, base * 0.76, 0.92),
                      paddingBottom: `${base * 0.08}px`,
                      textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                    }}
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
