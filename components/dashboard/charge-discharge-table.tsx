"use client"

import { ArrowDown, ArrowUp, BatteryCharging, BatteryWarning } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

const energyStats = [
  {
    key: "today-charge",
    labelZh: "今日充电量",
    labelEn: "Today Charge",
    value: "3,256.8",
    unit: "kWh",
    icon: ArrowDown,
    accent: "text-[#39d0ff]",
    iconBg: "bg-[#39d0ff]/12",
    pulse: "bg-[#39d0ff]",
  },
  {
    key: "today-discharge",
    labelZh: "今日放电量",
    labelEn: "Today Discharge",
    value: "3,102.4",
    unit: "kWh",
    icon: ArrowUp,
    accent: "text-[#ff9a4c]",
    iconBg: "bg-[#ff9a4c]/12",
    pulse: "bg-[#ff9a4c]",
  },
  {
    key: "total-charge",
    labelZh: "累计充电量",
    labelEn: "Total Charge",
    value: "286,540.2",
    unit: "kWh",
    icon: BatteryCharging,
    accent: "text-[#22e6b8]",
    iconBg: "bg-[#22e6b8]/12",
    pulse: "bg-[#22e6b8]",
  },
  {
    key: "total-discharge",
    labelZh: "累计放电量",
    labelEn: "Total Discharge",
    value: "271,908.7",
    unit: "kWh",
    icon: BatteryWarning,
    accent: "text-[#7dd3fc]",
    iconBg: "bg-[#7dd3fc]/12",
    pulse: "bg-[#7dd3fc]",
  },
] as const

export function ChargeDischargeTable() {
  const { language } = useLanguage()
  const zh = language === "zh"

  return (
    <div className="flex h-full max-h-full w-full flex-col gap-1.5 overflow-hidden rounded-[22px] border border-[#22d3ee]/22 bg-[linear-gradient(180deg,rgba(10,24,46,0.28),rgba(5,14,30,0.42))] p-2.5 backdrop-blur-[4px] shadow-[0_0_0_1px_rgba(34,211,238,0.06)_inset,0_10px_24px_rgba(0,0,0,0.1)]">
      <div className="flex shrink-0 items-center gap-2">
        <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
        <h3 className="text-[1.12rem] font-semibold tracking-[0.02em] text-[#00d4aa]" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.95)" }}>
          {zh ? "充放电统计" : "Charge / Discharge"}
        </h3>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 auto-rows-fr gap-1.5">
        {energyStats.map((item) => {
          const Icon = item.icon

          return (
            <div
              key={item.key}
              className="relative flex min-h-0 flex-col justify-between overflow-hidden rounded-[14px] border border-[#22d3ee]/16 bg-[linear-gradient(180deg,rgba(13,31,58,0.28),rgba(8,19,39,0.42))] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)]"
              style={{ clipPath: "polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)" }}
            >
              <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#7cecff]/40 to-transparent" />

              <div className="flex items-start justify-between gap-2">
                <span
                  className="text-[11.5px] font-semibold tracking-[0.02em] text-white/82"
                  style={{ textShadow: "0 1px 5px rgba(0,0,0,0.95)" }}
                >
                  {zh ? item.labelZh : item.labelEn}
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
  )
}
