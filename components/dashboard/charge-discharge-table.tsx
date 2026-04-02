"use client"

import { useLanguage } from "@/components/language-provider"

const energyStats = [
  {
    key: "today-charge",
    labelZh: "今日充电量",
    labelEn: "Today Charge",
    value: "3,256.8",
    unit: "kWh",
    isIn: true,
    accent: "#39d0ff",
    glow: "rgba(57,208,255,0.45)",
    live: true,
    animDelay: "0s",
  },
  {
    key: "today-discharge",
    labelZh: "今日放电量",
    labelEn: "Today Discharge",
    value: "3,102.4",
    unit: "kWh",
    isIn: false,
    accent: "#ff9a4c",
    glow: "rgba(255,154,76,0.45)",
    live: true,
    animDelay: "0.6s",
  },
  {
    key: "total-charge",
    labelZh: "累计充电量",
    labelEn: "Total Charge",
    value: "286,540.2",
    unit: "kWh",
    isIn: true,
    accent: "#22e6b8",
    glow: "rgba(34,230,184,0.45)",
    live: false,
    animDelay: "1.1s",
  },
  {
    key: "total-discharge",
    labelZh: "累计放电量",
    labelEn: "Total Discharge",
    value: "271,908.7",
    unit: "kWh",
    isIn: false,
    accent: "#7dd3fc",
    glow: "rgba(125,211,252,0.45)",
    live: false,
    animDelay: "1.7s",
  },
] as const

export function ChargeDischargeTable() {
  const { language } = useLanguage()
  const zh = language === "zh"

  return (
    <div className="flex h-full max-h-full w-full flex-col gap-1.5 overflow-hidden rounded-[22px] border border-[#22d3ee]/22 bg-[linear-gradient(180deg,rgba(10,24,46,0.28),rgba(5,14,30,0.42))] p-2.5 backdrop-blur-[4px] shadow-[0_0_0_1px_rgba(34,211,238,0.06)_inset,0_10px_24px_rgba(0,0,0,0.1)]">
      <style>{`
        @keyframes cdt-blink   { 0%,100%{opacity:1}      50%{opacity:0.12} }
        @keyframes cdt-arrow-in  { 0%,100%{opacity:0.5; transform:translateY(0)}   50%{opacity:1; transform:translateY(2px)} }
        @keyframes cdt-arrow-out { 0%,100%{opacity:0.5; transform:translateY(0)}   50%{opacity:1; transform:translateY(-2px)} }
        @keyframes cdt-ring    { 0%,100%{opacity:0.18; transform:scale(1)}  60%{opacity:0.05; transform:scale(1.55)} }
        @keyframes cdt-scanline{ 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
      `}</style>

      {/* Header */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
        <h3
          className="text-[1.05rem] font-semibold tracking-[0.02em] text-[#00d4aa]"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.95)" }}
        >
          {zh ? "充放电统计" : "Charge / Discharge"}
        </h3>
        <div className="ml-auto flex items-center gap-1">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[#00e87a]"
            style={{ animation: "cdt-blink 1.8s ease-in-out infinite" }}
          />
          <span className="text-[10px] font-semibold tracking-[0.1em] text-[#00e87a]/65">LIVE</span>
        </div>
      </div>

      {/* 2×2 Grid */}
      <div className="grid min-h-0 flex-1 grid-cols-2 auto-rows-fr gap-1.5">
        {energyStats.map((item) => {
          const dotIdx = item.value.lastIndexOf(".")
          const integer = dotIdx >= 0 ? item.value.slice(0, dotIdx) : item.value
          const decimal = dotIdx >= 0 ? item.value.slice(dotIdx) : ""
          const flowFrom = item.isIn ? "-4" : "104"
          const flowTo   = item.isIn ? "104" : "-4"
          const arrowAnim = item.isIn ? "cdt-arrow-in" : "cdt-arrow-out"

          return (
            <div
              key={item.key}
              className="relative flex min-h-0 flex-col justify-between overflow-hidden px-2.5 pb-1.5 pt-2"
              style={{
                background: "linear-gradient(145deg,rgba(14,34,62,0.55) 0%,rgba(8,18,38,0.72) 100%)",
                clipPath: "polygon(7px 0%,100% 0%,100% calc(100% - 7px),calc(100% - 7px) 100%,0% 100%,0% 7px)",
              }}
            >
              {/* Scanline shimmer */}
              <div
                className="pointer-events-none absolute inset-x-0 z-10 h-[35%] opacity-[0.04]"
                style={{
                  background: "linear-gradient(180deg,transparent,rgba(255,255,255,1),transparent)",
                  animation: "cdt-scanline 4s ease-in-out infinite",
                  animationDelay: item.animDelay,
                }}
              />

              {/* Corner brackets */}
              <div className="pointer-events-none absolute inset-0 z-20">
                <div className="absolute left-0 top-0 h-3 w-3" style={{ borderLeft: `1.5px solid ${item.accent}`, borderTop: `1.5px solid ${item.accent}`, opacity: 0.75 }} />
                <div className="absolute right-0 top-0 h-3 w-3" style={{ borderRight: `1.5px solid ${item.accent}`, borderTop: `1.5px solid ${item.accent}`, opacity: 0.75 }} />
                <div className="absolute bottom-0 left-0 h-3 w-3" style={{ borderLeft: `1.5px solid ${item.accent}`, borderBottom: `1.5px solid ${item.accent}`, opacity: 0.75 }} />
                <div className="absolute bottom-0 right-0 h-3 w-3" style={{ borderRight: `1.5px solid ${item.accent}`, borderBottom: `1.5px solid ${item.accent}`, opacity: 0.75 }} />
              </div>

              {/* Top glow line */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{ background: `linear-gradient(90deg,transparent,${item.accent}66,transparent)` }}
              />

              {/* Label + direction icon */}
              <div className="flex items-center justify-between gap-1">
                <span
                  className="text-[10.5px] font-medium leading-tight text-white/52"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.95)" }}
                >
                  {zh ? item.labelZh : item.labelEn}
                </span>

                {/* Animated direction icon */}
                <svg width="20" height="20" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
                  {/* Pulsing ring */}
                  <circle
                    cx="10" cy="10" r="9"
                    fill="none"
                    stroke={item.accent}
                    strokeWidth="0.7"
                    style={{ animation: `cdt-ring 2s ease-out infinite`, animationDelay: item.animDelay, transformOrigin: "10px 10px" }}
                  />
                  {/* Solid inner circle */}
                  <circle cx="10" cy="10" r="7" fill={`${item.accent}18`} stroke={item.accent} strokeWidth="0.8" opacity="0.7" />
                  {/* Arrow */}
                  {item.isIn ? (
                    <path
                      d="M10 5.5v9M7 11l3 3.5 3-3.5"
                      stroke={item.accent}
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      style={{ animation: `${arrowAnim} 1.8s ease-in-out infinite`, transformOrigin: "10px 10px", animationDelay: item.animDelay }}
                    />
                  ) : (
                    <path
                      d="M10 14.5v-9M7 9l3-3.5 3 3.5"
                      stroke={item.accent}
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      style={{ animation: `${arrowAnim} 2.1s ease-in-out infinite`, transformOrigin: "10px 10px", animationDelay: item.animDelay }}
                    />
                  )}
                </svg>
              </div>

              {/* Value — integer bold + decimal muted */}
              <div className="flex items-end gap-0.5">
                <span
                  className="font-bold leading-none tabular-nums"
                  style={{
                    fontSize: "1.18rem",
                    color: item.accent,
                    textShadow: `0 0 14px ${item.glow}, 0 1px 6px rgba(0,0,0,0.95)`,
                  }}
                >
                  {integer}
                </span>
                {decimal && (
                  <span
                    className="pb-[1px] font-semibold tabular-nums"
                    style={{ fontSize: "0.85rem", color: item.accent, opacity: 0.6 }}
                  >
                    {decimal}
                  </span>
                )}
                <span className="pb-[1px] pl-0.5 text-[10px] text-white/38">
                  {item.unit}
                </span>
              </div>

              {/* Energy flow line (animated dot) */}
              <svg
                width="100%"
                height="5"
                viewBox="0 0 100 5"
                preserveAspectRatio="none"
                style={{ display: "block", overflow: "visible" }}
              >
                {/* Track */}
                <line x1="0" y1="2.5" x2="100" y2="2.5" stroke={item.accent} strokeWidth="0.4" opacity="0.2" />
                {/* Tick marks */}
                {[20, 40, 60, 80].map((x) => (
                  <line key={x} x1={x} y1="1" x2={x} y2="4" stroke={item.accent} strokeWidth="0.5" opacity="0.18" />
                ))}
                {/* Moving glow dot */}
                <circle cy="2.5" r="2.4" fill={item.accent}>
                  <animate attributeName="cx" from={flowFrom} to={flowTo} dur="2.5s" begin={item.animDelay} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.08;0.9;1" dur="2.5s" begin={item.animDelay} repeatCount="indefinite" />
                </circle>
              </svg>

              {/* Live pulse dot */}
              {item.live && (
                <div
                  className="pointer-events-none absolute right-2 bottom-1.5 h-[5px] w-[5px] rounded-full"
                  style={{
                    background: item.accent,
                    boxShadow: `0 0 5px ${item.accent}`,
                    animation: "cdt-blink 1.5s ease-in-out infinite",
                    animationDelay: item.animDelay,
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
