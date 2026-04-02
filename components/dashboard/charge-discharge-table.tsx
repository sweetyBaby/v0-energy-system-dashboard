"use client"

import { useLanguage } from "@/components/language-provider"

const cards = [
  {
    key: "efficiency",
    labelZh: "昨日效率",
    labelEn: "Yesterday Eff.",
    value: "81.62",
    unit: "%",
    isIn: true,
    accent: "#22e6b8",
    glow: "rgba(34,230,184,0.45)",
    animDelay: "0s",
    subs: [
      { labelZh: "本月", labelEn: "Month", value: "67.27", unit: "%" },
      { labelZh: "本年", labelEn: "Year",  value: "79.31", unit: "%" },
      { labelZh: "累计", labelEn: "Total", value: "79.31", unit: "%" },
    ],
  },
  {
    key: "charge",
    labelZh: "今日充电量",
    labelEn: "Today Charge",
    value: "365.6",
    unit: "kWh",
    isIn: true,
    accent: "#39d0ff",
    glow: "rgba(57,208,255,0.45)",
    animDelay: "0.6s",
    subs: [
      { labelZh: "昨日", labelEn: "Yesterday", value: "690.4", unit: "kWh" },
      { labelZh: "本月", labelEn: "Month",     value: "690.4", unit: "kWh" },
      { labelZh: "本年", labelEn: "Year",      value: "29.5",  unit: "MWh" },
      { labelZh: "累计", labelEn: "Total",     value: "29.5",  unit: "MWh" },
    ],
  },
  {
    key: "discharge",
    labelZh: "今日放电量",
    labelEn: "Today Discharge",
    value: "267.2",
    unit: "kWh",
    isIn: false,
    accent: "#ff9a4c",
    glow: "rgba(255,154,76,0.45)",
    animDelay: "1.1s",
    subs: [
      { labelZh: "昨日", labelEn: "Yesterday", value: "532.8", unit: "kWh" },
      { labelZh: "本月", labelEn: "Month",     value: "516",   unit: "kWh" },
      { labelZh: "本年", labelEn: "Year",      value: "23.46", unit: "MWh" },
      { labelZh: "累计", labelEn: "Total",     value: "23.46", unit: "MWh" },
    ],
  },
] as const

export function ChargeDischargeTable() {
  const { language } = useLanguage()
  const zh = language === "zh"

  return (
    <div className="flex h-full max-h-full w-full flex-col gap-1.5 overflow-hidden rounded-[22px] border border-[#22d3ee]/35 bg-[linear-gradient(180deg,rgba(10,24,46,0.06),rgba(5,14,30,0.14))] p-2.5 backdrop-blur-[1px] shadow-[0_0_0_1px_rgba(34,211,238,0.06)_inset,0_10px_24px_rgba(0,0,0,0.1)]">
      <style>{`
        @keyframes cdt-blink    { 0%,100%{opacity:1} 50%{opacity:0.12} }
        @keyframes cdt-arrow-in { 0%,100%{opacity:0.5;transform:translateY(0)} 50%{opacity:1;transform:translateY(2px)} }
        @keyframes cdt-arrow-out{ 0%,100%{opacity:0.5;transform:translateY(0)} 50%{opacity:1;transform:translateY(-2px)} }
        @keyframes cdt-ring     { 0%,100%{opacity:0.18;transform:scale(1)} 60%{opacity:0.05;transform:scale(1.55)} }
        @keyframes cdt-scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
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
          <span className="h-1.5 w-1.5 rounded-full bg-[#00e87a]" style={{ animation: "cdt-blink 1.8s ease-in-out infinite" }} />
          <span className="text-[10px] font-semibold tracking-[0.1em] text-[#00e87a]/65">LIVE</span>
        </div>
      </div>

      {/* 3-row stack */}
      <div className="grid min-h-0 flex-1 grid-rows-3 gap-1.5">
        {cards.map((item) => {
          const dotIdx    = item.value.lastIndexOf(".")
          const integer   = dotIdx >= 0 ? item.value.slice(0, dotIdx) : item.value
          const decimal   = dotIdx >= 0 ? item.value.slice(dotIdx)    : ""
          const flowFrom  = item.isIn ? "-4" : "104"
          const flowTo    = item.isIn ? "104" : "-4"
          const arrowAnim = item.isIn ? "cdt-arrow-in" : "cdt-arrow-out"

          return (
            <div
              key={item.key}
              className="relative flex min-h-0 overflow-hidden"
              style={{
                background: `linear-gradient(135deg,rgba(14,34,62,0.22) 0%,rgba(8,18,38,0.34) 100%)`,
                clipPath: "polygon(7px 0%,100% 0%,100% calc(100% - 7px),calc(100% - 7px) 100%,0% 100%,0% 7px)",
              }}
            >
              {/* Scanline */}
              <div
                className="pointer-events-none absolute inset-x-0 z-10 h-[40%] opacity-[0.035]"
                style={{
                  background: "linear-gradient(180deg,transparent,rgba(255,255,255,1),transparent)",
                  animation: "cdt-scanline 5s ease-in-out infinite",
                  animationDelay: item.animDelay,
                }}
              />

              {/* Corner brackets */}
              <div className="pointer-events-none absolute inset-0 z-20">
                {[["left","top"],["right","top"],["left","bottom"],["right","bottom"]].map(([h,v]) => (
                  <div
                    key={h+v}
                    className="absolute h-2.5 w-2.5"
                    style={{
                      [h]: 0, [v]: 0,
                      borderLeft:   h === "left"  ? `1.5px solid ${item.accent}` : undefined,
                      borderRight:  h === "right" ? `1.5px solid ${item.accent}` : undefined,
                      borderTop:    v === "top"    ? `1.5px solid ${item.accent}` : undefined,
                      borderBottom: v === "bottom" ? `1.5px solid ${item.accent}` : undefined,
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>

              {/* Top accent line */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{ background: `linear-gradient(90deg,transparent,${item.accent}55,transparent)` }}
              />

              {/* ── LEFT: label · value · flow ── */}
              <div className="flex min-w-0 flex-[5] flex-col justify-between px-3 pb-1 pt-1.5">
                {/* label row */}
                <div className="flex items-center gap-2">
                  <span
                    className="text-[13px] font-semibold tracking-wide text-white/85"
                    style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
                  >
                    {zh ? item.labelZh : item.labelEn}
                  </span>
                  {/* direction icon */}
                  <svg width="16" height="16" viewBox="0 0 20 20" className="shrink-0 opacity-85">
                    <circle
                      cx="10" cy="10" r="9" fill="none" stroke={item.accent} strokeWidth="0.8"
                      style={{ animation: `cdt-ring 2.2s ease-out infinite`, animationDelay: item.animDelay, transformOrigin: "10px 10px" }}
                    />
                    <circle cx="10" cy="10" r="6.5" fill={`${item.accent}15`} stroke={item.accent} strokeWidth="0.9" opacity="0.65" />
                    {item.isIn ? (
                      <path d="M10 5.5v9M7 11.5l3 3 3-3" stroke={item.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
                        style={{ animation: `${arrowAnim} 1.8s ease-in-out infinite`, transformOrigin: "10px 10px", animationDelay: item.animDelay }} />
                    ) : (
                      <path d="M10 14.5v-9M7 8.5l3-3 3 3" stroke={item.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
                        style={{ animation: `${arrowAnim} 2.1s ease-in-out infinite`, transformOrigin: "10px 10px", animationDelay: item.animDelay }} />
                    )}
                  </svg>
                </div>

                {/* main value */}
                <div className="flex items-baseline gap-[3px]">
                  <span
                    className="font-bold tabular-nums leading-none"
                    style={{
                      fontSize: "1.9rem",
                      color: item.accent,
                      textShadow: `0 0 22px ${item.glow}, 0 1px 8px rgba(0,0,0,0.95)`,
                    }}
                  >
                    {integer}
                  </span>
                  {decimal && (
                    <span className="font-semibold tabular-nums leading-none" style={{ fontSize: "1.2rem", color: item.accent, opacity: 0.7 }}>
                      {decimal}
                    </span>
                  )}
                  <span className="text-[13px] font-semibold text-white/65 leading-none pl-[2px]">{item.unit}</span>
                </div>

                {/* energy flow bar */}
                <svg width="100%" height="5" viewBox="0 0 100 5" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
                  <line x1="0" y1="2.5" x2="100" y2="2.5" stroke={item.accent} strokeWidth="0.6" opacity="0.18" />
                  {[25, 50, 75].map((x) => (
                    <line key={x} x1={x} y1="1" x2={x} y2="4" stroke={item.accent} strokeWidth="0.6" opacity="0.14" />
                  ))}
                  <circle cy="2.5" r="2.2" fill={item.accent}>
                    <animate attributeName="cx" from={flowFrom} to={flowTo} dur="2.8s" begin={item.animDelay} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.07;0.88;1" dur="2.8s" begin={item.animDelay} repeatCount="indefinite" />
                  </circle>
                  <circle cy="2.5" r="5" fill={item.accent} opacity="0.12">
                    <animate attributeName="cx" from={flowFrom} to={flowTo} dur="2.8s" begin={item.animDelay} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;0.14;0.14;0" keyTimes="0;0.07;0.88;1" dur="2.8s" begin={item.animDelay} repeatCount="indefinite" />
                  </circle>
                </svg>
              </div>

              {/* vertical separator */}
              <div className="my-2 w-px shrink-0 self-stretch" style={{ background: `linear-gradient(180deg,transparent,${item.accent}28,transparent)` }} />

              {/* ── RIGHT: sub-stats ── */}
              <div
                className="flex shrink-0 flex-[4] flex-col justify-center gap-[6px] px-3 py-1.5"
                style={{ background: `linear-gradient(90deg,transparent,${item.accent}08)` }}
              >
                {item.subs.map((sub, i) => (
                  <div key={sub.labelZh} className="flex items-center justify-between gap-1">
                    <span className="text-[12px] font-medium leading-none text-white/65">
                      {zh ? sub.labelZh : sub.labelEn}
                    </span>
                    <div className="flex items-baseline gap-[3px]">
                      <span
                        className="text-[13px] font-semibold tabular-nums leading-none"
                        style={{
                          color: item.accent,
                          opacity: i === item.subs.length - 1 ? 1 : 0.82,
                          textShadow: i === item.subs.length - 1 ? `0 0 10px ${item.glow}` : undefined,
                        }}
                      >
                        {sub.value}
                      </span>
                      <span className="text-[11px] font-medium leading-none text-white/55">{sub.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
