"use client"

import { Battery, Zap, Calendar, MapPin } from "lucide-react"
import { useProject } from "./dashboard-header"
import { useLanguage } from "@/components/language-provider"

export function ProjectInfo() {
  const { selectedProject } = useProject()
  const { t, language } = useLanguage()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[#1a2654] bg-[#0d1233] p-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
        <h3 className="text-[1.05rem] font-semibold tracking-[0.02em] text-[#00d4aa]">{t("projectInfo")}</h3>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {/* Project Image */}
        <div className="relative h-24 overflow-hidden rounded-lg border border-[#1a2654]">
          <img
            src={selectedProject.image}
            alt={language === "zh" ? selectedProject.name : selectedProject.nameEn}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1233]/55 via-transparent to-transparent" />
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/80 to-transparent" />
        </div>

        {/* Project Details */}
        <div className="min-h-0 flex-1 rounded-lg border border-[#1a2654] bg-[#101840]/55 px-3 flex flex-col divide-y divide-[#1a2654]">
          {[
            { icon: <MapPin className="h-3.5 w-3.5 text-[#00d4aa]" />, label: t("site"), value: language === "zh" ? selectedProject.name : selectedProject.nameEn, truncate: true },
            { icon: <Zap className="h-3.5 w-3.5 text-[#f97316]" />, label: t("ratedPower"), value: selectedProject.ratedPower },
            { icon: <Battery className="h-3.5 w-3.5 text-[#3b82f6]" />, label: t("ratedCapacity"), value: selectedProject.ratedCapacity },
            { icon: <Calendar className="h-3.5 w-3.5 text-[#22d3ee]" />, label: t("commissioningDate"), value: selectedProject.commissioningDate },
          ].map((row, i) => (
            <div key={i} className="flex flex-1 items-center justify-between gap-2 min-h-0">
              <div className="flex shrink-0 items-center gap-2 text-[11px] font-medium tracking-[0.01em] text-[#a8b6db]">
                {row.icon}
                {row.label}
              </div>
              <span className={`text-[0.9rem] font-semibold text-[#63e8ff] tabular-nums${row.truncate ? " truncate" : ""}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
