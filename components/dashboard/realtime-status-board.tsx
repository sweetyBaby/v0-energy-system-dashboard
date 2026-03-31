"use client"

import { useEffect, useMemo, useState } from "react"
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
  offline: { zh: "断开", en: "Offline" },
  precharge: { zh: "预充", en: "Precharge" },
  standby: { zh: "待机", en: "Standby" },
  charge: { zh: "充电", en: "Charge" },
  discharge: { zh: "放电", en: "Discharge" },
  fault: { zh: "故障", en: "Fault" },
}

const createSnapshot = (phase: number): LiveSnapshot => {
  const packStatus = packStatusCycle[phase % packStatusCycle.length]
  return {
    soc: 93 + (phase % 4) * 2,
    packVoltage: 5682.4 + (phase % 4) * 6.2,
    busVoltage: 1320.5 + (phase % 4) * 4.1,
    cellTotalVoltage: 1313.5 + (phase % 4) * 2.3,
    powerKw: packStatus === "discharge" ? -628.8 : 655.4 + (phase % 3) * 18.6,
    stringCurrent: packStatus === "discharge" ? -154.8 : 161.3 + (phase % 4) * 2.8,
    hallCurrent: 0.22 + (phase % 3) * 0.04,
    availableCapacity: 832.76 + (phase % 4) * 9.5,
    soh: 99.6 + (phase % 3) * 0.1,
    packStatus,
  }
}

// Per-status color tokens
const statusColors: Record<PackStatus, { wave: string; fill: string; glow: string; border: string; text: string }> = {
  charge:    { wave: "#00e87a", fill: "linear-gradient(0deg,#054d22,#0c7a38,#00c060)", glow: "rgba(0,232,122,0.55)", border: "rgba(0,200,100,0.7)", text: "text-[#00f38d]" },
  discharge: { wave: "#f59e0b", fill: "linear-gradient(0deg,#7c3000,#c05a00,#f59e0b)", glow: "rgba(245,158,11,0.55)", border: "rgba(230,130,0,0.7)",  text: "text-[#ffb14a]" },
  standby:   { wave: "#38bdf8", fill: "linear-gradient(0deg,#0c2a4a,#1a5080,#38bdf8)", glow: "rgba(56,189,248,0.45)", border: "rgba(56,189,248,0.6)", text: "text-white" },
  precharge: { wave: "#59b6ff", fill: "linear-gradient(0deg,#0c2a4a,#1a5080,#59b6ff)", glow: "rgba(89,182,255,0.45)", border: "rgba(89,182,255,0.6)", text: "text-[#59b6ff]" },
  offline:   { wave: "#4a6070", fill: "linear-gradient(0deg,#0a1520,#1a2a38,#2a3a48)", glow: "rgba(74,96,112,0.3)",  border: "rgba(74,96,112,0.5)",  text: "text-[#8ea4be]" },
  fault:     { wave: "#ff6464", fill: "linear-gradient(0deg,#4a0000,#8a0000,#ff3232)", glow: "rgba(255,100,100,0.55)", border: "rgba(255,80,80,0.7)", text: "text-[#ff6464]" },
}

export function RealtimeStatusBoard() {
  const { language } = useLanguage()
  const [snapshot, setSnapshot] = useState<LiveSnapshot>(() => createSnapshot(0))

  useEffect(() => {
    let phase = 0
    const timer = window.setInterval(() => {
      phase += 1
      setSnapshot(createSnapshot(phase))
    }, 4000)
    return () => window.clearInterval(timer)
  }, [])

  const packStatusLabel = useMemo(() => {
    return language === "zh"
      ? packStatusLabels[snapshot.packStatus].zh
      : packStatusLabels[snapshot.packStatus].en
  }, [language, snapshot.packStatus])

  const colors = statusColors[snapshot.packStatus]

  const metricRows = [
    { labelZh: "PACK电压", labelEn: "PACK Voltage",   value: snapshot.packVoltage.toFixed(1),    unit: "V",   Icon: Activity,    accent: "text-[#39d0ff]", iconBg: "bg-[#39d0ff]/12" },
    { labelZh: "当前功率", labelEn: "Power",           value: snapshot.powerKw.toFixed(1),        unit: "kW",  Icon: Zap,         accent: "text-[#00d4aa]", iconBg: "bg-[#00d4aa]/12" },
    { labelZh: "组串电流", labelEn: "String Current",  value: snapshot.stringCurrent.toFixed(1),  unit: "A",   Icon: ArrowUpDown, accent: "text-[#7dd3fc]", iconBg: "bg-[#7dd3fc]/12" },
    { labelZh: "SOH",     labelEn: "SOH",              value: snapshot.soh.toFixed(1),            unit: "%",   Icon: ShieldCheck, accent: "text-[#22e6b8]", iconBg: "bg-[#22e6b8]/12" },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#22d3ee]/22 bg-[linear-gradient(180deg,rgba(10,24,46,0.28),rgba(5,14,30,0.42))] p-3 backdrop-blur-[4px] shadow-[0_0_0_1px_rgba(34,211,238,0.06)_inset,0_10px_24px_rgba(0,0,0,0.1)]">
      <style>{`
        @keyframes rsb-wave1 {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes rsb-wave2 {
          0%   { transform: translateX(-25%); }
          100% { transform: translateX(25%); }
        }
        @keyframes rsb-ripple {
          0%,100% { opacity: 0.5; transform: scaleX(0.6); }
          50%     { opacity: 1;   transform: scaleX(1); }
        }
        @keyframes rsb-scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>

      {/* Title row */}
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
        <h3 className="text-[1.05rem] font-semibold tracking-[0.02em] text-[#00d4aa]" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.95)" }}>
          {language === "zh" ? "系统状态" : "System Status"}
        </h3>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-row gap-3 overflow-hidden">

        {/* ── Left: battery with water-wave ── */}
        <div className="flex w-[68px] shrink-0 flex-col items-center justify-center gap-1">
          {/* Positive terminal */}
          <div
            className="h-[5px] w-[28px] rounded-t-[3px] transition-all duration-700"
            style={{ background: colors.wave, boxShadow: `0 0 8px ${colors.glow}` }}
          />

          {/* Battery shell */}
          <div
            className="relative h-[132px] w-full overflow-hidden rounded-[12px] transition-all duration-700"
            style={{ border: `1.5px solid ${colors.border}`, background: "#020810", boxShadow: `0 0 22px ${colors.glow}, inset 0 0 16px rgba(0,0,0,0.7)` }}
          >
            {/* Inner inset border */}
            <div className="pointer-events-none absolute inset-[2px] z-10 rounded-[10px] border border-white/[0.07]" />

            {/* ── Solid fill ── */}
            <div
              className="absolute bottom-0 left-0 right-0 transition-all duration-1000"
              style={{ height: `${snapshot.soc}%`, background: colors.fill }}
            />

            {/* ── Wave layer 1 (slow) ── */}
            <div
              className="pointer-events-none absolute left-0 right-0 z-20 overflow-hidden"
              style={{ bottom: `calc(${snapshot.soc}% - 9px)`, height: "18px", transition: "bottom 1s ease" }}
            >
              <svg
                viewBox="0 0 400 18"
                preserveAspectRatio="none"
                style={{ width: "200%", height: "100%", animation: "rsb-wave1 2.4s linear infinite" }}
              >
                <path
                  d="M0,9 C50,0 100,18 150,9 C200,0 250,18 300,9 C350,0 400,18 400,9 L400,18 L0,18 Z"
                  style={{ fill: colors.wave, opacity: 0.9 }}
                />
              </svg>
            </div>

            {/* ── Wave layer 2 (fast, offset) ── */}
            <div
              className="pointer-events-none absolute left-0 right-0 z-20 overflow-hidden"
              style={{ bottom: `calc(${snapshot.soc}% - 6px)`, height: "14px", transition: "bottom 1s ease" }}
            >
              <svg
                viewBox="0 0 400 14"
                preserveAspectRatio="none"
                style={{ width: "200%", height: "100%", animation: "rsb-wave2 1.6s linear infinite" }}
              >
                <path
                  d="M0,7 C50,0 100,14 150,7 C200,0 250,14 300,7 C350,0 400,14 400,7 L400,14 L0,14 Z"
                  style={{ fill: colors.wave, opacity: 0.5 }}
                />
              </svg>
            </div>

            {/* ── Scan line shimmer ── */}
            <div
              className="pointer-events-none absolute left-0 right-0 z-30 h-[30%]"
              style={{
                background: "linear-gradient(180deg,transparent,rgba(255,255,255,0.06),transparent)",
                animation: "rsb-scanline 3s ease-in-out infinite",
              }}
            />

            {/* ── Segment ticks ── */}
            {[25, 50, 75].map((pct) => (
              <div
                key={pct}
                className="pointer-events-none absolute left-3 right-3 z-40 h-px"
                style={{ bottom: `${pct}%`, background: "rgba(255,255,255,0.12)" }}
              />
            ))}

            {/* ── SOC text overlay ── */}
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-0.5">
              <Zap className="h-3 w-3 text-white/70" fill="currentColor" />
              <span
                className="text-[1.05rem] font-extrabold leading-none text-white"
                style={{ textShadow: "0 0 12px rgba(0,0,0,0.95), 0 1px 6px rgba(0,0,0,0.95)" }}
              >
                {Math.round(snapshot.soc)}%
              </span>
            </div>
          </div>

          {/* Status label */}
          <div
            className={`shrink-0 text-[11px] font-bold tracking-[0.04em] ${colors.text}`}
            style={{ textShadow: `0 0 8px ${colors.glow}` }}
          >
            {packStatusLabel}
          </div>
        </div>

        {/* ── Right: 2×2 metric grid ── */}
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-1.5 overflow-hidden">
          {metricRows.map((item) => {
            const Icon = item.Icon
            return (
              <div
                key={item.labelEn}
                className="relative flex min-h-0 min-w-0 flex-col justify-between overflow-hidden rounded-[14px] border border-[#22d3ee]/16 bg-[linear-gradient(180deg,rgba(13,31,58,0.28),rgba(8,19,39,0.42))] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)]"
                style={{ clipPath: "polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)" }}
              >
                <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#7cecff]/40 to-transparent" />

                <div className="flex items-start justify-between gap-1">
                  <span
                    className="text-[11.5px] font-semibold tracking-[0.02em] text-white/82"
                    style={{ textShadow: "0 1px 5px rgba(0,0,0,0.95)" }}
                  >
                    {language === "zh" ? item.labelZh : item.labelEn}
                  </span>
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] ${item.iconBg}`}>
                    <Icon className={`h-3.5 w-3.5 ${item.accent}`} />
                  </div>
                </div>

                <div className="mt-1 flex items-end gap-1">
                  <span
                    className={`text-[1.18rem] font-bold leading-none ${item.accent}`}
                    style={{ textShadow: "0 1px 8px rgba(0,0,0,0.95)" }}
                  >
                    {item.value}
                  </span>
                  <span
                    className="pb-0.5 text-[11px] text-white/92"
                    style={{ textShadow: "0 1px 4px rgba(0,0,0,0.95)" }}
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
