"use client"

import type { ReactNode } from "react"
import { Battery, Building2, CalendarClock, MapPin, Receipt, TrendingUp, Wallet, Zap } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useProject } from "@/components/dashboard/dashboard-header"

// 收益统计后端暂无字段，先用占位值展示，待接口接入后替换
const REVENUE_PLACEHOLDER = "--"

const clampText = (minRem: number, multiple: number, maxRem: number) =>
  `clamp(${minRem}rem, calc(var(--overview-root-size, 15px) * ${multiple}), ${maxRem}rem)`

type InfoRow = {
  icon: ReactNode
  labelZh: string
  labelEn: string
  value: string
}

type RevenueTile = {
  icon: ReactNode
  labelZh: string
  labelEn: string
  value: string
  unit: string
  accent: string
  glow: string
}

const hasDisplayText = (value?: string | null) => typeof value === "string" && value.trim().length > 0

const isRegionCode = (value?: string | null) => typeof value === "string" && /^\d+$/.test(value.trim())

function SectionTitle({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="h-[0.9em] w-[3px] rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
      <span
        className="font-semibold tracking-[0.04em] text-[#e8f4fc]"
        style={{ fontSize: clampText(0.84, 1.0, 1.18), textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}
      >
        {children}
      </span>
    </div>
  )
}

export function ProjectOverviewInfoCard() {
  const { language } = useLanguage()
  const { selectedProject } = useProject()
  const zh = language === "zh"

  const iconClass = "h-[1em] w-[1em] text-[#5fd0ff]"
  const regionDisplayValue =
    (zh
      ? [selectedProject.regionName, selectedProject.regionPinyin, selectedProject.region]
      : [selectedProject.regionPinyin, selectedProject.regionName, selectedProject.region]
    ).find((value) => hasDisplayText(value) && !isRegionCode(value)) ?? REVENUE_PLACEHOLDER

  const profileRows: InfoRow[] = [
    { icon: <Zap className={iconClass} fill="currentColor" />, labelZh: "额定功率", labelEn: "Rated Power", value: selectedProject.ratedPower },
    { icon: <Battery className={iconClass} />, labelZh: "额定容量", labelEn: "Rated Capacity", value: selectedProject.ratedCapacity },
    { icon: <CalendarClock className={iconClass} />, labelZh: "投运日期", labelEn: "Commission Date", value: selectedProject.commissioningDate },
    { icon: <MapPin className={iconClass} />, labelZh: "所属地区", labelEn: "Region", value: regionDisplayValue },
    { icon: <Building2 className={iconClass} />, labelZh: "业主单位", labelEn: "Owner", value: selectedProject.company },
    { icon: <Receipt className={iconClass} />, labelZh: "电价信息", labelEn: "Tariff", value: selectedProject.tariffInfo },
  ]

  const revenueTiles: RevenueTile[] = [
    {
      icon: <Wallet className="h-[1em] w-[1em]" style={{ color: "#8af7bc" }} />,
      labelZh: "昨日收益",
      labelEn: "Yesterday Revenue",
      value: REVENUE_PLACEHOLDER,
      unit: zh ? "元" : "CNY",
      accent: "#8af7bc",
      glow: "rgba(92,247,191,0.35)",
    },
    {
      icon: <TrendingUp className="h-[1em] w-[1em]" style={{ color: "#ffd66b" }} />,
      labelZh: "总收益",
      labelEn: "Total Revenue",
      value: REVENUE_PLACEHOLDER,
      unit: zh ? "元" : "CNY",
      accent: "#ffd66b",
      glow: "rgba(255,214,107,0.35)",
    },
  ]

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden rounded-[22px] border border-[#22d3ee]/26 bg-[radial-gradient(circle_at_18%_16%,rgba(64,124,255,0.22),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(0,212,170,0.14),transparent_24%),linear-gradient(180deg,rgba(11,31,67,0.66),rgba(6,20,47,0.74))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_16px_32px_rgba(0,0,0,0.16)]"
      style={{ padding: "calc(var(--overview-root-size, 15px) * 0.85)", gap: "calc(var(--overview-root-size, 15px) * 0.7)" }}
    >
      {/* 项目概况 */}
      <div className="flex min-h-0 flex-[1.55] flex-col" style={{ gap: "calc(var(--overview-root-size, 15px) * 0.55)" }}>
        <SectionTitle accent="#22d3ee">{zh ? "项目概况" : "Project Profile"}</SectionTitle>
        <div className="flex min-h-0 flex-1 flex-col justify-around">
          {profileRows.map((row) => (
            <div key={row.labelEn} className="flex items-center" style={{ gap: "calc(var(--overview-root-size, 15px) * 0.5)" }}>
              <span
                className="flex shrink-0 items-center justify-center rounded-[7px] border border-[#5fd0ff]/30 bg-[#0a2142]/70"
                style={{ width: "1.75em", height: "1.75em", fontSize: clampText(0.82, 0.98, 1.18) }}
              >
                {row.icon}
              </span>
              <span
                className="shrink-0 text-[#9ec4e8]"
                style={{ fontSize: clampText(0.74, 0.88, 1.04) }}
              >
                {zh ? row.labelZh : row.labelEn}
              </span>
              <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(120,170,220,0.22),transparent)]" />
              <span
                className="max-w-[58%] truncate text-right font-semibold tabular-nums text-[#eaf6ff]"
                style={{ fontSize: clampText(0.8, 0.96, 1.14), textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}
                title={zh ? row.labelZh : row.labelEn}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px w-full shrink-0 bg-[linear-gradient(90deg,transparent,rgba(180,220,255,0.55),transparent)]" />

      {/* 收益统计 */}
      <div className="flex min-h-0 flex-1 flex-col" style={{ gap: "calc(var(--overview-root-size, 15px) * 0.55)" }}>
        <div className="flex shrink-0 items-center justify-between">
          <SectionTitle accent="#8af7bc">{zh ? "收益统计" : "Revenue"}</SectionTitle>
          <span
            className="rounded-full border border-[#5fd0ff]/30 bg-[#0a2142]/60 px-2 py-[1px] text-[#8fb6da]"
            style={{ fontSize: clampText(0.6, 0.7, 0.84) }}
          >
            {zh ? "待接入" : "Pending"}
          </span>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2" style={{ gap: "calc(var(--overview-root-size, 15px) * 0.6)" }}>
          {revenueTiles.map((tile) => (
            <div
              key={tile.labelEn}
              className="relative flex min-w-0 flex-col justify-center overflow-hidden rounded-[14px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,36,78,0.9),rgba(10,26,58,0.94))]"
              style={{
                padding: "calc(var(--overview-root-size, 15px) * 0.55)",
                gap: "calc(var(--overview-root-size, 15px) * 0.3)",
                boxShadow: `inset 0 -22px 36px ${tile.glow}`,
              }}
            >
              <div
                className="pointer-events-none absolute bottom-0 left-5 right-5 h-[3px] rounded-full"
                style={{ background: `linear-gradient(90deg,transparent,${tile.accent},transparent)`, boxShadow: `0 0 10px ${tile.accent}` }}
              />
              <div className="flex items-center" style={{ gap: "calc(var(--overview-root-size, 15px) * 0.35)" }}>
                <span style={{ fontSize: clampText(0.84, 1.0, 1.2) }}>{tile.icon}</span>
                <span className="truncate text-[#b8d4f8]" style={{ fontSize: clampText(0.72, 0.86, 1.0) }}>
                  {zh ? tile.labelZh : tile.labelEn}
                </span>
              </div>
              <div className="flex items-baseline" style={{ gap: "2px" }}>
                <span
                  className="font-bold tabular-nums leading-none"
                  style={{ fontSize: clampText(1.2, 1.55, 2.1), color: tile.accent, textShadow: `0 0 16px ${tile.glow}` }}
                >
                  {tile.value}
                </span>
                <span className="shrink-0 font-semibold text-[#eaf6ff]" style={{ fontSize: clampText(0.72, 0.86, 1.04) }}>
                  {tile.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
