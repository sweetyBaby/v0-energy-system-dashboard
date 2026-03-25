"use client"

import {
  Activity,
  ArrowDown,
  ArrowUp,
  Gauge,
  RefreshCw,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"

const headlineStats = [
  {
    key: "charge-energy",
    labelZh: "\u5f53\u65e5\u5145\u7535\u91cf",
    labelEn: "Today Charge Energy",
    value: "3,256.8",
    unit: "kWh",
    icon: ArrowDown,
    accent: "text-[#39d0ff]",
    border: "border-[#205d79]",
    glow: "shadow-[0_0_18px_rgba(57,208,255,0.08)]",
    iconBg: "bg-[#39d0ff]/14",
  },
  {
    key: "discharge-energy",
    labelZh: "\u5f53\u65e5\u653e\u7535\u91cf",
    labelEn: "Today Discharge Energy",
    value: "3,102.4",
    unit: "kWh",
    icon: ArrowUp,
    accent: "text-[#ff9a4c]",
    border: "border-[#6a4527]",
    glow: "shadow-[0_0_18px_rgba(255,154,76,0.08)]",
    iconBg: "bg-[#ff9a4c]/14",
  },
  {
    key: "day-throughput",
    labelZh: "\u5f53\u65e5\u541e\u5410\u91cf",
    labelEn: "Today Throughput",
    value: "6,359.2",
    unit: "kWh",
    icon: Activity,
    accent: "text-[#00d4aa]",
    border: "border-[#1d5b54]",
    glow: "shadow-[0_0_18px_rgba(0,212,170,0.08)]",
    iconBg: "bg-[#00d4aa]/14",
  },
] as const

const qualityStats = [
  {
    key: "dc-efficiency",
    labelZh: "\u5f53\u65e5\u5145\u653e\u7535\u6548\u7387",
    labelEn: "Round-trip Efficiency",
    value: "95.26",
    unit: "%",
    icon: Gauge,
    accent: "text-[#facc15]",
    color: "#facc15",
    border: "border-[#6b5b18]",
    iconBg: "bg-[#facc15]/14",
  },
  {
    key: "system-efficiency",
    labelZh: "\u7cfb\u7edf\u6548\u7387",
    labelEn: "System Efficiency",
    value: "94.73",
    unit: "%",
    icon: Gauge,
    accent: "text-[#29e6c2]",
    color: "#29e6c2",
    border: "border-[#215e56]",
    iconBg: "bg-[#29e6c2]/14",
  },
  {
    key: "equivalent-cycles",
    labelZh: "\u5f53\u65e5\u7b49\u6548\u5faa\u73af",
    labelEn: "Equivalent Cycles",
    value: "0.78",
    unit: "\u6b21",
    icon: RefreshCw,
    accent: "text-[#7ea8ff]",
    color: "#7ea8ff",
    border: "border-[#304d83]",
    iconBg: "bg-[#7ea8ff]/14",
  },
] as const

export function ChargeDischargeTable() {
  const { language } = useLanguage()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[#1a2654] bg-[linear-gradient(180deg,#10173d,#0c1230)] p-3 shadow-[0_0_0_1px_rgba(34,211,238,0.02)_inset]">
      <div className="mb-3 flex items-center">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3 className="text-base font-semibold text-[#00d4aa]">
            {language === "zh" ? "\u5145\u653e\u7535\u7edf\u8ba1" : "Charge / Discharge Stats"}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {headlineStats.map((item) => {
          const Icon = item.icon

          return (
            <div
              key={item.key}
              className={`rounded-xl border bg-[linear-gradient(180deg,rgba(16,24,64,0.96),rgba(10,18,48,0.94))] px-3 py-3 ${item.border} ${item.glow}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#7b8ab8]">
                  {language === "zh" ? item.labelZh : item.labelEn}
                </span>
                <div className={`flex h-7 w-7 items-center justify-center rounded-md ${item.iconBg}`}>
                  <Icon className={`h-4 w-4 ${item.accent}`} />
                </div>
              </div>

              <div className="mt-4 flex items-end gap-1">
                <span className={`text-[1.65rem] font-semibold leading-none ${item.accent}`}>{item.value}</span>
                <span className="pb-1 text-[11px] text-[#7b8ab8]">{item.unit}</span>
              </div>

              <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#17224b]">
                <div
                  className={`h-full rounded-full ${
                    item.key === "charge-energy"
                      ? "w-[76%] bg-[#39d0ff]"
                      : item.key === "discharge-energy"
                        ? "w-[72%] bg-[#ff9a4c]"
                        : "w-[88%] bg-[#00d4aa]"
                  }`}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-2.5 grid min-h-0 flex-1 grid-cols-3 gap-2.5">
        {qualityStats.map((item) => {
          const Icon = item.icon
          const metricValue = Number.parseFloat(item.value)
          const isEfficiencyMetric = item.unit === "%"
          const ringFill = Math.max(0, Math.min(metricValue, 100)) * 3.6

          return (
            <div
              key={item.key}
              className={`flex min-h-0 flex-col justify-between rounded-lg border bg-[linear-gradient(180deg,rgba(16,24,64,0.94),rgba(11,19,52,0.92))] px-3 py-2.5 ${item.border}`}
            >
              {isEfficiencyMetric ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[11px] text-[#7b8ab8]">
                        {language === "zh" ? item.labelZh : item.labelEn}
                      </span>

                      <div className="mt-5 flex items-end gap-1">
                        <span className={`text-[1.85rem] font-semibold leading-none ${item.accent}`}>{item.value}</span>
                        <span className="pb-1 text-[11px] text-[#7b8ab8]">{item.unit}</span>
                      </div>
                    </div>

                    <div className="relative mt-0.5 h-[72px] w-[72px] flex-shrink-0">
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: `conic-gradient(${item.color} 0deg ${ringFill}deg, rgba(123,138,184,0.16) ${ringFill}deg 360deg)`,
                          boxShadow: `0 0 18px ${item.color}22`,
                        }}
                      />
                      <div className="absolute inset-[8px] rounded-full border border-white/5 bg-[#10183a]" />
                      <div className="absolute inset-[17px] rounded-full bg-[radial-gradient(circle,#152552_0%,#0f1734_100%)]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/8 bg-white/5">
                          <Icon className={`h-4 w-4 ${item.accent}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#7b8ab8]">
                      {language === "zh" ? item.labelZh : item.labelEn}
                    </span>
                    <div className={`flex h-6 w-6 items-center justify-center rounded-md ${item.iconBg}`}>
                      <Icon className={`h-3.5 w-3.5 ${item.accent}`} />
                    </div>
                  </div>

                  <div className="mt-3 flex items-end gap-1">
                    <span className={`text-xl font-semibold leading-none ${item.accent}`}>{item.value}</span>
                    <span className="pb-0.5 text-[11px] text-[#7b8ab8]">{item.unit}</span>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
