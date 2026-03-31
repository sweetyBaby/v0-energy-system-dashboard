"use client"

import { useEffect, useMemo, useState } from "react"
import { Zap } from "lucide-react"
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

const statusStyles: Record<PackStatus, string> = {
  offline: "text-[#8ea4be]",
  precharge: "text-[#59b6ff]",
  standby: "text-white",
  charge: "text-[#00f38d]",
  discharge: "text-[#ffb14a]",
  fault: "text-[#ff6464]",
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

  const metricRows = [
    { labelZh: "PACK电压", labelEn: "PACK Voltage", value: `${snapshot.packVoltage.toFixed(1)} V` },
    { labelZh: "BUS电压", labelEn: "BUS Voltage", value: `${snapshot.busVoltage.toFixed(1)} V` },
    { labelZh: "电芯累计电压", labelEn: "Cell Sum Voltage", value: `${snapshot.cellTotalVoltage.toFixed(1)} V` },
    { labelZh: "当前功率", labelEn: "Power", value: `${snapshot.powerKw.toFixed(1)} kW` },
    { labelZh: "组串电流", labelEn: "String Current", value: `${snapshot.stringCurrent.toFixed(1)} A` },
    { labelZh: "霍尔电流", labelEn: "Hall Current", value: `${snapshot.hallCurrent.toFixed(2)} A` },
    { labelZh: "当前可用容量", labelEn: "Available Capacity", value: `${snapshot.availableCapacity.toFixed(2)} Ah` },
    { labelZh: "SOH", labelEn: "SOH", value: `${snapshot.soh.toFixed(1)}%` },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#22d3ee]/22 bg-[linear-gradient(180deg,rgba(10,24,46,0.28),rgba(5,14,30,0.42))] p-3 backdrop-blur-[4px] shadow-[0_0_0_1px_rgba(34,211,238,0.06)_inset,0_10px_24px_rgba(0,0,0,0.1)]">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3 className="text-[1.05rem] font-semibold tracking-[0.02em] text-[#00d4aa]" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.95)" }}>
            {language === "zh" ? "系统状态" : "System Status"}
          </h3>
        </div>

        <div className="relative flex h-[42px] w-[168px] shrink-0 items-center justify-between rounded-[14px] border border-[#0e8d52]/80 bg-[linear-gradient(90deg,#0f8e45,#11c55d)] px-3 pr-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),0_0_18px_rgba(0,212,122,0.14)]">
          <div className="pointer-events-none absolute inset-[3px] rounded-[11px] border border-white/8" />
          <div className="absolute -right-[7px] top-1/2 h-[18px] w-[7px] -translate-y-1/2 rounded-r-[3px] border border-[#0e8d52]/70 bg-[#16a34a] shadow-[0_0_8px_rgba(0,212,122,0.16)]" />
          <div className="flex h-7 min-w-[58px] items-center justify-center rounded-[10px] bg-black/10 px-2 text-[1rem] font-semibold leading-none text-white">
            {Math.round(snapshot.soc)}%
          </div>
          <div className="rounded-full bg-white/10 p-1.5">
            <Zap className="h-4 w-4 text-white" fill="currentColor" />
          </div>
          <div className={`whitespace-nowrap text-[12px] font-semibold tracking-[0.01em] ${statusStyles[snapshot.packStatus]}`}>
            {packStatusLabel}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-3 gap-y-2 overflow-hidden">
        {metricRows.map((item) => (
          <div
            key={item.labelEn}
            className="flex min-w-0 items-center justify-between rounded-[12px] border border-[#22d3ee]/10 bg-[linear-gradient(180deg,rgba(13,31,58,0.28),rgba(8,19,39,0.42))] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)]"
          >
            <span
              className="truncate pr-2 text-[11.5px] font-medium tracking-[0.01em] text-white"
              style={{ textShadow: "0 1px 5px rgba(0,0,0,0.95)" }}
              title={language === "zh" ? item.labelZh : item.labelEn}
            >
              {language === "zh" ? item.labelZh : item.labelEn}
            </span>
            <span
              className="shrink-0 whitespace-nowrap text-[0.9rem] font-semibold tabular-nums leading-none tracking-[0.01em] text-[#63e8ff]"
              style={{ textShadow: "0 1px 6px rgba(0,0,0,0.95)" }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
