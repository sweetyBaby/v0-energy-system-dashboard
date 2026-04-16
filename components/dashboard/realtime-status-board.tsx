"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Activity, ArrowUpDown, ChevronLeft, ChevronRight, ShieldCheck, Zap } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useProject } from "@/components/dashboard/dashboard-header"

type RealtimePackStatus = "offline" | "standby" | "charge" | "discharge"

const PLACEHOLDER = "--"
const AUTOPLAY_MS = 3200

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
      const contentWidth = width * 0.7
      const contentHeight = height * 0.4
      const nextBase = Math.min(contentWidth / 2, contentHeight) * 0.096
      setBase(Math.max(8.5, Math.min(nextBase, 15.5)))
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
  const [activeIndex, setActiveIndex] = useState(0)
  const [isSliding, setIsSliding] = useState(false)
  const [slideDirection, setSlideDirection] = useState<"next" | "prev">("next")
  const [isHovered, setIsHovered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentViewportRef = useRef<HTMLDivElement>(null)
  const previousIndexRef = useRef(0)
  const base = useContainerBase(containerRef)
  const [slideWidth, setSlideWidth] = useState(0)
  const snapshots = selectedProject.deviceRealtimeSnapshots
  const totalSlides = snapshots.length
  const activeSnapshot = snapshots[activeIndex] ?? snapshots[0] ?? null
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

  useEffect(() => {
    previousIndexRef.current = 0
    setIsSliding(false)
    setActiveIndex(0)
  }, [selectedProject.id])

  useEffect(() => {
    if (activeIndex < totalSlides) return
    setActiveIndex(0)
  }, [activeIndex, totalSlides])

  useEffect(() => {
    if (totalSlides <= 1) {
      previousIndexRef.current = activeIndex
      setIsSliding(false)
      return
    }

    const previousIndex = previousIndexRef.current
    if (previousIndex === activeIndex) return

    const movedNext = (previousIndex + 1) % totalSlides === activeIndex
    const movedPrev = (activeIndex + 1) % totalSlides === previousIndex

    setSlideDirection(movedPrev && !movedNext ? "prev" : "next")
    setIsSliding(true)
    previousIndexRef.current = activeIndex

    const timer = window.setTimeout(() => setIsSliding(false), 680)
    return () => window.clearTimeout(timer)
  }, [activeIndex, totalSlides])

  useEffect(() => {
    if (isHovered || totalSlides <= 1) return

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % totalSlides)
    }, AUTOPLAY_MS)

    return () => window.clearInterval(timer)
  }, [isHovered, totalSlides])

  useLayoutEffect(() => {
    if (!contentViewportRef.current) return

    const element = contentViewportRef.current
    const measure = () => setSlideWidth(element.clientWidth)
    const observer = new ResizeObserver(() => measure())

    observer.observe(element)
    measure()

    return () => {
      observer.disconnect()
    }
  }, [])

  if (!activeSnapshot) {
    return null
  }

  const goPrev = () => {
    if (totalSlides <= 1) return
    setActiveIndex((current) => (current - 1 + totalSlides) % totalSlides)
  }

  const goNext = () => {
    if (totalSlides <= 1) return
    setActiveIndex((current) => (current + 1) % totalSlides)
  }

  const colors = statusColors[activeSnapshot.packStatus]
  const packStatusLabel =
    language === "zh"
      ? displayPackStatusLabels[activeSnapshot.packStatus].zh
      : displayPackStatusLabels[activeSnapshot.packStatus].en

  const metricRows = [
    {
      labelZh: "PACK电压",
      labelEn: "PACK Voltage",
      value: activeSnapshot.packVoltage,
      unit: "V",
      Icon: Activity,
      accent: "#57a8ff",
      glow: "rgba(87,168,255,0.55)",
    },
    {
      labelZh: "当前功率",
      labelEn: "Power",
      value: activeSnapshot.powerKw,
      unit: "kW",
      Icon: Zap,
      accent: "#8ef14d",
      glow: "rgba(142,241,77,0.5)",
    },
    {
      labelZh: "组串电流",
      labelEn: "String Current",
      value: activeSnapshot.stringCurrent,
      unit: "A",
      Icon: ArrowUpDown,
      accent: "#57a8ff",
      glow: "rgba(87,168,255,0.55)",
    },
    {
      labelZh: "SOH",
      labelEn: "SOH",
      value: activeSnapshot.soh,
      unit: "%",
      Icon: ShieldCheck,
      accent: "#8af7bc",
      glow: "rgba(138,247,188,0.5)",
    },
  ]

  const socBarWidth = base * 7
  const socBarHeight = base * 13.2
  const circleOuter = base * 5.2
  const circleInner = base * 4
  const iconSize = base * 1.7
  const gap = `${base * 0.38}px`

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#22d3ee]/22 shadow-[0_16px_32px_rgba(0,0,0,0.16)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: `${base * 0.4}px`,
        background:
          "radial-gradient(circle at 18% 16%,rgba(64,124,255,0.18),transparent 30%),radial-gradient(circle at 80% 10%,rgba(0,212,170,0.12),transparent 24%),linear-gradient(180deg,rgba(11,31,67,0.72),rgba(6,20,47,0.82))",
      }}
    >
      <style>{`
        @keyframes rsb-wave1 { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        @keyframes rsb-wave2 { 0% { transform: translateX(-25%) } 100% { transform: translateX(25%) } }
        @keyframes rsb-scanline { 0% { transform: translateY(-100%) } 100% { transform: translateY(100%) } }
        @keyframes rsb-sonar { 0% { opacity: 0.55; transform: scale(0.82) } 100% { opacity: 0; transform: scale(1.5) } }
        @keyframes rsb-swipe-next { 0% { opacity: 0; transform: translateX(28%) } 22% { opacity: 0.88 } 100% { opacity: 0; transform: translateX(-118%) } }
        @keyframes rsb-swipe-prev { 0% { opacity: 0; transform: translateX(-28%) } 22% { opacity: 0.88 } 100% { opacity: 0; transform: translateX(118%) } }
        @keyframes rsb-viewport-pulse { 0% { opacity: 0 } 18% { opacity: 1 } 100% { opacity: 0 } }
      `}</style>
      <div
        className="absolute inset-x-0 top-0 z-20 grid items-center"
        style={{
          gridTemplateColumns: "1fr auto 1fr",
          paddingLeft: `${base * 0.8}px`,
          paddingRight: `${base * 0.8}px`,
          paddingTop: `${base * 0.18}px`,
          gap: `${base * 0.35}px`,
        }}
      >
        <div className="flex items-center justify-self-start" style={{ gap: `${base * 0.3}px` }}>
          <div
            className={`rounded-full ${activeSnapshot.isOnline ? "bg-[#00e87a]" : "bg-[#94a3b8]"}`}
            style={{
              width: `${base * 0.55}px`,
              height: `${base * 0.55}px`,
              opacity: liveBlink ? 1 : 0.18,
              transition: "opacity 0.4s ease",
              boxShadow: activeSnapshot.isOnline ? "0 0 5px rgba(0,232,122,0.8)" : "0 0 5px rgba(148,163,184,0.55)",
            }}
          />
          <span
            className={`font-bold tracking-[0.04em] ${activeSnapshot.isOnline ? "text-[#00e87a]" : "text-[#cbd5e1]"}`}
            style={{
              fontSize: clampText(0.72, 0.84, 1.18),
              textShadow: activeSnapshot.isOnline ? "0 0 6px rgba(0,232,122,0.6)" : "0 0 6px rgba(148,163,184,0.45)",
            }}
          >
            {activeSnapshot.isOnline ? (language === "zh" ? "在线" : "Online") : (language === "zh" ? "离线" : "Offline")}
          </span>
        </div>

        <div
          className="relative isolate justify-self-center text-center"
          style={{
            minWidth: `${base * 10.2}px`,
            maxWidth: `${base * 14.8}px`,
            paddingInline: `${base * 1.55}px`,
          }}
        >
          <span
            className="pointer-events-none absolute left-0 top-1/2 -z-10"
            style={{
              width: `${base * 2.9}px`,
              height: `${base * 0.18}px`,
              transform: "translate(-84%, -50%)",
              background: "linear-gradient(90deg,rgba(125,240,255,0),rgba(125,240,255,0.98),rgba(125,240,255,0.18))",
              boxShadow: "0 0 12px rgba(117,232,255,0.75)",
            }}
          />
          <span
            className="pointer-events-none absolute right-0 top-1/2 -z-10"
            style={{
              width: `${base * 2.9}px`,
              height: `${base * 0.18}px`,
              transform: "translate(84%, -50%)",
              background: "linear-gradient(270deg,rgba(125,240,255,0),rgba(125,240,255,0.98),rgba(125,240,255,0.18))",
              boxShadow: "0 0 12px rgba(117,232,255,0.75)",
            }}
          />
          <span
            className="pointer-events-none absolute left-0 top-1/2 -z-10"
            style={{
              width: `${base * 1.15}px`,
              height: `${base * 1.15}px`,
              transform: "translate(-22%, -50%) rotate(45deg)",
              borderTop: "1px solid rgba(133,241,255,0.82)",
              borderLeft: "1px solid rgba(133,241,255,0.82)",
              boxShadow: "0 0 10px rgba(113,234,255,0.28)",
            }}
          />
          <span
            className="pointer-events-none absolute right-0 top-1/2 -z-10"
            style={{
              width: `${base * 1.15}px`,
              height: `${base * 1.15}px`,
              transform: "translate(22%, -50%) rotate(45deg)",
              borderRight: "1px solid rgba(133,241,255,0.82)",
              borderBottom: "1px solid rgba(133,241,255,0.82)",
              boxShadow: "0 0 10px rgba(113,234,255,0.28)",
            }}
          />
          <div
            className="relative overflow-hidden border border-[#7cecff]/60 bg-[linear-gradient(180deg,rgba(15,39,89,0.96),rgba(8,23,53,0.92))]"
            style={{
              padding: `${base * 0.16}px ${base * 1.25}px`,
              clipPath: "polygon(9% 0%,91% 0%,100% 50%,91% 100%,9% 100%,0% 50%)",
              boxShadow: "0 0 22px rgba(92,214,255,0.34), inset 0 0 0 1px rgba(155,235,255,0.08)",
            }}
          >
            <span className="pointer-events-none absolute inset-x-[12%] top-0 h-px bg-gradient-to-r from-transparent via-[#95f4ff] to-transparent" />
            <span className="pointer-events-none absolute inset-x-[18%] bottom-0 h-px bg-gradient-to-r from-transparent via-[#46dfff] to-transparent" />
            <span className="pointer-events-none absolute left-[10%] top-1/2 h-[150%] w-[22%] -translate-y-1/2 bg-[radial-gradient(circle,rgba(107,234,255,0.16),transparent_70%)]" />
            <span className="pointer-events-none absolute right-[10%] top-1/2 h-[150%] w-[22%] -translate-y-1/2 bg-[radial-gradient(circle,rgba(107,234,255,0.16),transparent_70%)]" />
            <span
              className="relative block truncate font-black tracking-[0.05em] text-[#f7fcff]"
              style={{
                fontSize: clampText(0.96, 1.18, 1.74),
                textShadow: "0 0 18px rgba(111,236,255,0.34), 0 1px 8px rgba(0,0,0,0.45)",
              }}
            >
              {activeSnapshot.deviceName}
            </span>
          </div>
        </div>

        <div
          className="flex items-center justify-self-end rounded-full border border-[#1c74d9]/65 bg-[linear-gradient(180deg,rgba(5,16,48,0.96),rgba(7,24,66,0.92))]"
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
            {language === "zh" ? "实时" : "Live"}
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
        className="relative flex min-h-0 flex-1 flex-col"
        style={{
          paddingTop: `max(${base * 0.82}px, calc(var(--overview-root-size, 15px) * 1.82))`,
          paddingBottom: `${base * 0.22}px`,
          gap,
        }}
      >
        {false ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label={language === "zh" ? "上一张BCU卡片" : "Previous BCU card"}
              className="absolute left-0 top-1/2 z-30 -translate-y-1/2 transition-transform duration-200 hover:scale-[1.08]"
              style={{ marginLeft: `${base * -0.52}px` }}
            >
              <span
                className="relative flex items-center justify-center text-[#dffeff]"
                style={{
                  width: `${base * 2.9}px`,
                  height: `${base * 2.9}px`,
                }}
              >
                <ChevronLeft
                  className="absolute"
                  strokeWidth={2.4}
                  style={{
                    width: `${base * 1.72}px`,
                    height: `${base * 1.72}px`,
                    left: `${base * 0.2}px`,
                    opacity: 0.24,
                    color: "#73f3ff",
                    filter: "drop-shadow(0 0 12px rgba(115,243,255,0.42))",
                  }}
                />
                <ChevronLeft
                  className="absolute"
                  strokeWidth={2.5}
                  style={{
                    width: `${base * 1.28}px`,
                    height: `${base * 1.28}px`,
                    left: `${base * 0.58}px`,
                    opacity: 0.6,
                    color: "#8cf8ff",
                    filter: "drop-shadow(0 0 8px rgba(140,248,255,0.88))",
                  }}
                />
                <ChevronLeft
                  className="absolute"
                  strokeWidth={2.7}
                  style={{
                    width: `${base * 1.72}px`,
                    height: `${base * 1.72}px`,
                    left: `${base * 1.02}px`,
                    color: "#d7ffff",
                    filter: "drop-shadow(0 0 12px rgba(134,243,255,1))",
                  }}
                />
              </span>
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label={language === "zh" ? "下一张BCU卡片" : "Next BCU card"}
              className="absolute right-0 top-1/2 z-30 -translate-y-1/2 transition-transform duration-200 hover:scale-[1.08]"
              style={{ marginRight: `${base * -0.52}px` }}
            >
              <span
                className="relative flex items-center justify-center text-[#dffeff]"
                style={{
                  width: `${base * 2.9}px`,
                  height: `${base * 2.9}px`,
                }}
              >
                <ChevronRight
                  className="absolute"
                  strokeWidth={2.4}
                  style={{
                    width: `${base * 1.72}px`,
                    height: `${base * 1.72}px`,
                    right: `${base * 0.2}px`,
                    opacity: 0.24,
                    color: "#73f3ff",
                    filter: "drop-shadow(0 0 12px rgba(115,243,255,0.42))",
                  }}
                />
                <ChevronRight
                  className="absolute"
                  strokeWidth={2.5}
                  style={{
                    width: `${base * 1.28}px`,
                    height: `${base * 1.28}px`,
                    right: `${base * 0.58}px`,
                    opacity: 0.6,
                    color: "#8cf8ff",
                    filter: "drop-shadow(0 0 8px rgba(140,248,255,0.88))",
                  }}
                />
                <ChevronRight
                  className="absolute"
                  strokeWidth={2.7}
                  style={{
                    width: `${base * 1.72}px`,
                    height: `${base * 1.72}px`,
                    right: `${base * 1.02}px`,
                    color: "#d7ffff",
                    filter: "drop-shadow(0 0 12px rgba(134,243,255,1))",
                  }}
                />
              </span>
            </button>
          </>
        ) : null}

        <div ref={contentViewportRef} className="relative min-h-0 flex-1 overflow-hidden rounded-[16px]">
          {isSliding ? (
            <>
              <span
                className="pointer-events-none absolute inset-0 z-20 rounded-[16px]"
                style={{
                  animation: "rsb-viewport-pulse 680ms ease-out",
                  boxShadow: "inset 0 0 0 1px rgba(121,240,255,0.32), 0 0 22px rgba(102,226,255,0.16)",
                }}
              />
              <span
                className="pointer-events-none absolute inset-y-[9%] z-20 w-[30%] rounded-[999px]"
                style={{
                  [slideDirection === "next" ? "right" : "left"]: "-6%",
                  background:
                    "linear-gradient(90deg,rgba(100,235,255,0),rgba(145,245,255,0.28),rgba(255,255,255,0.45),rgba(100,235,255,0))",
                  filter: "blur(8px)",
                  animation: slideDirection === "next" ? "rsb-swipe-next 680ms ease-out" : "rsb-swipe-prev 680ms ease-out",
                }}
              />
            </>
          ) : null}
          <div
            className="flex h-full transition-transform duration-700 ease-out"
            style={{
              transform: `translateX(-${activeIndex * slideWidth}px)`,
              transitionTimingFunction: "cubic-bezier(0.22, 0.88, 0.2, 1)",
              willChange: "transform",
            }}
          >
              {snapshots.map((snapshot) => {
              const slideColors = statusColors[snapshot.packStatus]
              const slidePackStatusLabel =
                language === "zh"
                  ? displayPackStatusLabels[snapshot.packStatus].zh
                  : displayPackStatusLabels[snapshot.packStatus].en

              const slideMetricRows = [
                {
                  labelZh: "PACK电压",
                  labelEn: "PACK Voltage",
                  value: snapshot.packVoltage,
                  unit: "V",
                  Icon: Activity,
                  accent: "#57a8ff",
                  glow: "rgba(87,168,255,0.55)",
                },
                {
                  labelZh: "当前功率",
                  labelEn: "Power",
                  value: snapshot.powerKw,
                  unit: "kW",
                  Icon: Zap,
                  accent: "#8ef14d",
                  glow: "rgba(142,241,77,0.5)",
                },
                {
                  labelZh: "组串电流",
                  labelEn: "String Current",
                  value: snapshot.stringCurrent,
                  unit: "A",
                  Icon: ArrowUpDown,
                  accent: "#57a8ff",
                  glow: "rgba(87,168,255,0.55)",
                },
                {
                  labelZh: "SOH",
                  labelEn: "SOH",
                  value: snapshot.soh,
                  unit: "%",
                  Icon: ShieldCheck,
                  accent: "#8af7bc",
                  glow: "rgba(138,247,188,0.5)",
                },
              ]

                return (
                  <div
                    key={snapshot.deviceId}
                    className="h-full shrink-0 overflow-hidden"
                    style={{ width: slideWidth > 0 ? `${slideWidth}px` : "100%" }}
                  >
                    <div className="flex h-full min-h-0 flex-row overflow-hidden" style={{ gap: `${base * 0.34}px` }}>
                    <div className="flex shrink-0 flex-col items-center justify-center" style={{ width: `${socBarWidth}px`, gap: `${base * 0.5}px` }}>
                      <div
                        className="rounded-t-[3px] transition-all duration-700"
                        style={{
                          width: `${socBarWidth * 0.45}px`,
                          height: `${base * 0.4}px`,
                          background: slideColors.wave,
                          boxShadow: `0 0 8px ${slideColors.glow}`,
                        }}
                      />

                      <div
                        className="relative overflow-hidden rounded-[12px] transition-all duration-700"
                        style={{
                          width: `${socBarWidth}px`,
                          height: `${socBarHeight}px`,
                          border: `1.5px solid ${slideColors.border}`,
                          background: "#020810",
                          boxShadow: `0 0 22px ${slideColors.glow}, inset 0 0 14px rgba(0,0,0,0.7)`,
                        }}
                      >
                        <div className="pointer-events-none absolute inset-[2px] z-10 rounded-[10px] border border-white/[0.07]" />
                        <div
                          className="absolute bottom-0 left-0 right-0 transition-all duration-1000"
                          style={{ height: `${snapshot.socPercent ?? 0}%`, background: slideColors.fill }}
                        />
                        <div
                          className="pointer-events-none absolute left-0 right-0 z-20 overflow-hidden"
                          style={{ bottom: `calc(${snapshot.socPercent ?? 0}% - 9px)`, height: "18px", transition: "bottom 1s ease" }}
                        >
                          <svg
                            viewBox="0 0 400 18"
                            preserveAspectRatio="none"
                            style={{ width: "200%", height: "100%", animation: "rsb-wave1 2.4s linear infinite" }}
                          >
                            <path
                              d="M0,9 C50,0 100,18 150,9 C200,0 250,18 300,9 C350,0 400,18 400,9 L400,18 L0,18 Z"
                              style={{ fill: slideColors.wave, opacity: 0.9 }}
                            />
                          </svg>
                        </div>
                        <div
                          className="pointer-events-none absolute left-0 right-0 z-20 overflow-hidden"
                          style={{ bottom: `calc(${snapshot.socPercent ?? 0}% - 6px)`, height: "14px", transition: "bottom 1s ease" }}
                        >
                          <svg
                            viewBox="0 0 400 14"
                            preserveAspectRatio="none"
                            style={{ width: "200%", height: "100%", animation: "rsb-wave2 1.6s linear infinite" }}
                          >
                            <path
                              d="M0,7 C50,0 100,14 150,7 C200,0 250,14 300,7 C350,0 400,14 400,7 L400,14 L0,14 Z"
                              style={{ fill: slideColors.wave, opacity: 0.5 }}
                            />
                          </svg>
                        </div>
                        <div
                          className="pointer-events-none absolute left-0 right-0 z-30 h-[30%]"
                          style={{
                            background: "linear-gradient(180deg,transparent,rgba(255,255,255,0.06),transparent)",
                            animation: "rsb-scanline 3s ease-in-out infinite",
                          }}
                        />
                        {[25, 50, 75].map((pct) => (
                          <div
                            key={pct}
                            className="pointer-events-none absolute left-2 right-2 z-40 h-px"
                            style={{ bottom: `${pct}%`, background: "rgba(255,255,255,0.12)" }}
                          />
                        ))}
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center" style={{ gap: `${base * 0.3}px` }}>
                          <Zap
                            style={{ width: `${base * 1.2}px`, height: `${base * 1.2}px`, color: "rgba(255,255,255,0.9)" }}
                            fill="currentColor"
                          />
                          <span
                            className="font-extrabold leading-none text-white"
                            style={{
                              fontSize: clampText(1.45, 1.75, 2.45),
                              textShadow: "0 0 14px rgba(0,0,0,0.95)",
                            }}
                          >
                            {displaySocText(snapshot.soc, snapshot.socPercent)}
                          </span>
                        </div>
                      </div>

                      <div
                        className="shrink-0 rounded-full font-bold tracking-[0.03em] transition-all duration-700"
                        style={{
                          fontSize: clampText(0.72, 0.84, 1.05),
                          padding: `${base * 0.2}px ${base * 0.7}px`,
                          color: slideColors.text,
                          background: slideColors.pill,
                          border: `1px solid ${slideColors.border}`,
                          boxShadow: `0 0 7px ${slideColors.glow}`,
                          textShadow: `0 0 5px ${slideColors.glow}`,
                        }}
                      >
                        {slidePackStatusLabel}
                      </div>
                    </div>

                    <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 overflow-hidden" style={{ gap: `${base * 0.3}px` }}>
                      {slideMetricRows.map((item) => {
                        const Icon = item.Icon

                        return (
                          <div
                            key={`${snapshot.deviceId}-${item.labelEn}`}
                            className="relative flex min-h-0 min-w-0 flex-col items-center rounded-[14px] border border-dashed border-white/40"
                            style={{
                              gap: `${base * 0.08}px`,
                              padding: `${base * 0.28}px ${base * 0.34}px ${base * 0.3}px`,
                              background: "linear-gradient(160deg,rgba(16,42,92,0.94),rgba(8,22,54,0.98))",
                              boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 40px ${item.glow.replace(/[\d.]+\)$/, "0.12)")}, 0 0 16px rgba(0,0,0,0.2)`,
                            }}
                          >
                            <div
                              className="pointer-events-none absolute bottom-0 left-4 right-4 rounded-full"
                              style={{
                                height: `${base * 0.22}px`,
                                background: `linear-gradient(90deg,transparent,${item.accent},transparent)`,
                                boxShadow: `0 0 12px ${item.accent}`,
                              }}
                            />
                            <div
                              className="pointer-events-none absolute left-0 top-0 h-full w-full rounded-[14px]"
                              style={{ background: `radial-gradient(ellipse at 50% 0%, ${item.glow.replace(/[\d.]+\)$/, "0.15)")}, transparent 60%)` }}
                            />

                            <span
                              className="z-10 shrink-0 text-center font-semibold leading-tight tracking-[0.02em] text-[#f5f8ff] [text-shadow:0_2px_8px_rgba(0,0,0,0.55)]"
                              style={{ fontSize: fitText(0.72, base * 0.84, 1.02) }}
                            >
                              {language === "zh" ? item.labelZh : item.labelEn}
                            </span>

                            <div
                              className="relative flex min-h-0 flex-1 items-center justify-center self-stretch"
                              style={{ minHeight: `${base * 3.25}px`, marginTop: `${base * 0.01}px` }}
                            >
                              <div className="pointer-events-none absolute inset-0 rounded-full" style={{ border: `1px solid ${item.accent}60`, animation: "rsb-sonar 2.6s ease-out infinite" }} />
                              <div className="pointer-events-none absolute inset-0 rounded-full" style={{ border: `1px solid ${item.accent}40`, animation: "rsb-sonar 2.6s ease-out infinite", animationDelay: "1s" }} />
                              <div className="pointer-events-none absolute rounded-full" style={{ inset: `${base * 0.6}px`, background: `radial-gradient(circle, ${item.glow.replace(/[\d.]+\)$/, "0.25)")}, transparent 70%)` }} />
                              <div
                                className="relative flex items-center justify-center rounded-full"
                                style={{
                                  width: `${circleInner * 0.76}px`,
                                  height: `${circleInner * 0.76}px`,
                                  background: `radial-gradient(circle at 30% 30%, ${item.accent}30, ${item.accent}08)`,
                                  border: `1.5px solid ${item.accent}90`,
                                  boxShadow: `0 0 20px ${item.glow}, 0 0 8px ${item.glow}, inset 0 0 16px ${item.accent}18`,
                                }}
                              >
                                <Icon style={{ width: `${iconSize * 0.78}px`, height: `${iconSize * 0.78}px`, color: item.accent, filter: `drop-shadow(0 0 6px ${item.glow})` }} />
                              </div>
                            </div>

                            <div className="z-10 mt-auto flex shrink-0 items-end justify-center whitespace-nowrap leading-none" style={{ gap: `${base * 0.16}px` }}>
                              <span
                                className="font-extrabold tabular-nums"
                                style={{
                                  fontSize: fitText(0.94, base * 1.2, 1.56),
                                  color: item.accent,
                                  textShadow: `0 0 18px ${item.glow}, 0 1px 6px rgba(0,0,0,0.9)`,
                                }}
                              >
                                {item.value}
                              </span>
                              <span
                                className="font-semibold text-white/60"
                                style={{
                                  fontSize: fitText(0.62, base * 0.62, 0.82),
                                  paddingBottom: `${base * 0.06}px`,
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
              })}
          </div>
        </div>

        {totalSlides > 1 ? (
          <div className="flex shrink-0 items-center justify-center" style={{ gap: `${base * 1.1}px`, paddingTop: `${base * 0.08}px` }}>
            <button
              type="button"
              onClick={goPrev}
              aria-label={language === "zh" ? "上一个BCU" : "Previous BCU"}
              className="relative shrink-0 transition-transform duration-200 hover:scale-[1.06]"
              style={{ width: `${base * 2.6}px`, height: `${base * 2.1}px` }}
            >
              <ChevronLeft
                className="absolute left-[8%] top-1/2 -translate-y-1/2"
                strokeWidth={2.2}
                style={{
                  width: `${base * 1.54}px`,
                  height: `${base * 1.54}px`,
                  color: "#67eefe",
                  opacity: 0.42,
                  filter: "drop-shadow(0 0 8px rgba(103,238,254,0.55))",
                }}
              />
              <ChevronLeft
                className="absolute left-[24%] top-1/2 -translate-y-1/2"
                strokeWidth={2.6}
                style={{
                  width: `${base * 1.74}px`,
                  height: `${base * 1.74}px`,
                  color: "#c5ffff",
                  filter: "drop-shadow(0 0 12px rgba(103,238,254,0.95))",
                }}
              />
            </button>

            <div
              className="relative flex min-w-0 max-w-full items-center rounded-full border border-[#5db8ff]/34 bg-[linear-gradient(180deg,rgba(9,22,56,0.82),rgba(7,18,42,0.78))]"
              style={{
                padding: `${base * 0.14}px`,
                gap: `${base * 0.14}px`,
                boxShadow: "0 0 16px rgba(60,148,255,0.12), inset 0 0 0 1px rgba(125,211,252,0.04)",
              }}
            >
              <span className="pointer-events-none absolute inset-x-[8%] top-0 h-px bg-gradient-to-r from-transparent via-[#7eeeff]/42 to-transparent" />
              <span className="pointer-events-none absolute inset-x-[10%] bottom-0 h-px bg-gradient-to-r from-transparent via-[#47dcff]/32 to-transparent" />
              {snapshots.map((snapshot, index) => {
                const active = index === activeIndex

                return (
                  <button
                    key={`${snapshot.deviceId}-selector`}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className="truncate rounded-full px-3 font-semibold transition-all"
                    style={{
                      minWidth: `${base * 5.6}px`,
                      maxWidth: `${base * 8.1}px`,
                      height: `${base * 1.92}px`,
                      fontSize: fitText(0.72, base * 0.92, 1.08),
                      color: active ? "#aefcff" : "rgba(220,232,255,0.64)",
                      background: active
                        ? "linear-gradient(180deg,rgba(17,54,112,0.94),rgba(8,25,62,0.98))"
                        : "linear-gradient(180deg,rgba(11,28,67,0.2),rgba(7,19,44,0.14))",
                      border: active ? "1px solid rgba(108,232,255,0.58)" : "1px solid transparent",
                      boxShadow: active ? "0 0 14px rgba(88,234,255,0.2), inset 0 0 0 1px rgba(160,245,255,0.06)" : "none",
                      textShadow: active ? "0 0 10px rgba(139,245,255,0.28)" : "none",
                    }}
                  >
                    {snapshot.deviceName}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={goNext}
              aria-label={language === "zh" ? "下一张BCU" : "Next BCU"}
              className="relative shrink-0 transition-transform duration-200 hover:scale-[1.06]"
              style={{ width: `${base * 2.6}px`, height: `${base * 2.1}px` }}
            >
              <ChevronRight
                className="absolute right-[8%] top-1/2 -translate-y-1/2"
                strokeWidth={2.2}
                style={{
                  width: `${base * 1.54}px`,
                  height: `${base * 1.54}px`,
                  color: "#67eefe",
                  opacity: 0.42,
                  filter: "drop-shadow(0 0 8px rgba(103,238,254,0.55))",
                }}
              />
              <ChevronRight
                className="absolute right-[24%] top-1/2 -translate-y-1/2"
                strokeWidth={2.6}
                style={{
                  width: `${base * 1.74}px`,
                  height: `${base * 1.74}px`,
                  color: "#c5ffff",
                  filter: "drop-shadow(0 0 12px rgba(103,238,254,0.95))",
                }}
              />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
