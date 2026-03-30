"use client"

import { Battery, Zap, Calendar } from "lucide-react"
import { useProject } from "./dashboard-header"
import { useLanguage } from "@/components/language-provider"

export function ProjectInfo() {
  const { selectedProject } = useProject()
  const { language } = useLanguage()
  const zh = language === "zh"

  const stats = [
    {
      icon: <Zap className="h-6 w-6 text-[#00d4aa]" fill="currentColor" />,
      iconBg: "bg-[#00d4aa]/15 border border-[#00d4aa]/40",
      labelZh: "额定功率",
      labelEn: "Rated Power",
      value: selectedProject.ratedPower,
    },
    {
      icon: <Battery className="h-6 w-6 text-[#3b82f6]" />,
      iconBg: "bg-[#3b82f6]/15 border border-[#3b82f6]/40",
      labelZh: "额定容量",
      labelEn: "Rated Capacity",
      value: selectedProject.ratedCapacity,
    },
    {
      icon: <Calendar className="h-6 w-6 text-[#22d3ee]" />,
      iconBg: "bg-[#22d3ee]/15 border border-[#22d3ee]/40",
      labelZh: "投运日期",
      labelEn: "Commission",
      value: selectedProject.commissioningDate,
    },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-end pb-5">
      <div className="w-full max-w-[500px] rounded-2xl border border-[#1a3060]/75 bg-[#040c1e]/70 px-6 py-4 backdrop-blur-[3px]">
        {/* Title */}
        <div className="mb-4 flex items-center gap-2.5">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <span
            className="text-[1.1rem] font-semibold tracking-[0.04em] text-[#e8f4fc]"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}
          >
            {zh ? "项目概览" : "Project Overview"}
          </span>
        </div>

        {/* 3 stat blocks */}
        <div className="grid w-full grid-cols-3 gap-3">
          {stats.map((s, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 rounded-xl border border-[#1e3a60]/80 bg-[#040c1e]/50 py-4"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${s.iconBg}`}>
                {s.icon}
              </div>
              <span className="text-[11px] text-[#8ab0d8]">{zh ? s.labelZh : s.labelEn}</span>
              <span
                className="text-[1.1rem] font-bold tabular-nums text-[#e8f4fc]"
                style={{ textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
