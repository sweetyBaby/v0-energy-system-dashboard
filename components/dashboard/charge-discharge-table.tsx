"use client"

import { ArrowDown, ArrowUp, Gauge } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

const energyStats = [
  {
    key: "charge",
    labelZh: "今日充电量",
    labelEn: "Today Charge",
    value: "3,256.8",
    unit: "kWh",
    icon: ArrowDown,
    accent: "text-[#39d0ff]",
    border: "border-[#1e4d6a]",
    iconBg: "bg-[#39d0ff]/12",
    bar: "w-[76%] bg-gradient-to-r from-[#39d0ff]/60 to-[#39d0ff]",
  },
  {
    key: "discharge",
    labelZh: "今日放电量",
    labelEn: "Today Discharge",
    value: "3,102.4",
    unit: "kWh",
    icon: ArrowUp,
    accent: "text-[#ff9a4c]",
    border: "border-[#5a3a1a]",
    iconBg: "bg-[#ff9a4c]/12",
    bar: "w-[72%] bg-gradient-to-r from-[#ff9a4c]/60 to-[#ff9a4c]",
  },
] as const

const gaugeStats = [
  {
    key: "charge-discharge-efficiency",
    labelZh: "充放电效率",
    labelEn: "Round-trip Eff.",
    value: 95.26,
    color: "#facc15",
    accent: "text-[#facc15]",
  },
  {
    key: "system-efficiency",
    labelZh: "系统效率",
    labelEn: "System Eff.",
    value: 94.73,
    color: "#29e6c2",
    accent: "text-[#29e6c2]",
  },
] as const

export function ChargeDischargeTable() {
  const { language } = useLanguage()
  const zh = language === "zh"

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5 overflow-hidden rounded-[22px] border border-[#22d3ee]/22 bg-[linear-gradient(180deg,rgba(10,24,46,0.28),rgba(5,14,30,0.42))] p-3 backdrop-blur-[4px] shadow-[0_0_0_1px_rgba(34,211,238,0.06)_inset,0_10px_24px_rgba(0,0,0,0.1)]">
      <div className="flex shrink-0 items-center gap-2">
        <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
        <h3 className="text-[1.05rem] font-semibold tracking-[0.02em] text-[#00d4aa]" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.95)" }}>
          {zh ? "充放电统计" : "Charge / Discharge"}
        </h3>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2">
        {energyStats.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.key} className="rounded-xl border border-[#22d3ee]/16 bg-[linear-gradient(180deg,rgba(13,31,58,0.28),rgba(8,19,39,0.42))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-white" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.95)" }}>{zh ? item.labelZh : item.labelEn}</span>
                <div className={`flex h-6 w-6 items-center justify-center rounded-md ${item.iconBg}`}>
                  <Icon className={`h-3.5 w-3.5 ${item.accent}`} />
                </div>
              </div>
              <div className="mt-1 flex items-end gap-1">
                <span className={`text-[1.4rem] font-bold leading-none ${item.accent}`} style={{ textShadow: "0 1px 8px rgba(0,0,0,0.95)" }}>{item.value}</span>
                <span className="pb-0.5 text-[11px] text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.95)" }}>{item.unit}</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${item.bar}`} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
        {gaugeStats.map((item) => {
          const ringFill = Math.max(0, Math.min(item.value, 100)) * 3.6
          return (
            <div key={item.key} className="flex min-h-0 flex-col items-center justify-center rounded-xl border border-[#22d3ee]/16 bg-[linear-gradient(180deg,rgba(13,31,58,0.28),rgba(8,19,39,0.42))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)]">
              <div className="relative h-[74px] w-[74px]">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(${item.color} 0deg ${ringFill}deg, rgba(20,30,60,0.6) ${ringFill}deg 360deg)`,
                    boxShadow: `0 0 20px ${item.color}40`,
                  }}
                />
                <div className="absolute inset-[7px] rounded-full bg-[#04080f]/70" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Gauge className={`h-5 w-5 ${item.accent}`} />
                </div>
              </div>
              <div className="mt-2 flex items-end gap-0.5">
                <span className={`text-[1.12rem] font-bold leading-none ${item.accent}`} style={{ textShadow: "0 1px 8px rgba(0,0,0,0.95)" }}>{item.value}</span>
                <span className="pb-px text-[11px] text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.95)" }}>%</span>
              </div>
              <span className="mt-1 text-[10px] font-medium text-white" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.95)" }}>{zh ? item.labelZh : item.labelEn}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
