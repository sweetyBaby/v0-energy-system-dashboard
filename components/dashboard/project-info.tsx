"use client"

import { Battery, Zap, Calendar, MapPin } from "lucide-react"
import { useProject } from "./dashboard-header"
import { useLanguage } from "@/components/language-provider"

export function ProjectInfo() {
  const { selectedProject } = useProject()
  const { t, language } = useLanguage()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[#1a2654] bg-[#0d1233] p-3.5">
      <div className="mb-3 flex items-center gap-2">
        <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
        <h3 className="text-base font-semibold text-[#00d4aa]">{t("projectInfo")}</h3>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {/* Project Image */}
        <div className="relative h-28 overflow-hidden rounded-lg border border-[#1a2654]">
          <img
            src={selectedProject.image}
            alt={language === "zh" ? selectedProject.name : selectedProject.nameEn}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1233]/55 via-transparent to-transparent" />
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/80 to-transparent" />
        </div>

        {/* Project Details Table */}
        <div className="min-h-0 flex-1 rounded-lg border border-[#1a2654] bg-[#101840]/55 px-3">
          <table className="w-full text-xs">
          <tbody>
            <tr className="border-b border-[#1a2654]">
              <td className="flex items-center gap-2 py-2 text-[#7b8ab8]">
                <MapPin className="h-3.5 w-3.5 text-[#00d4aa]" />
                {t("site")}
              </td>
              <td className="py-2 text-right font-mono text-[#00d4aa]">
                {language === "zh" ? selectedProject.name : selectedProject.nameEn}
              </td>
            </tr>
            <tr className="border-b border-[#1a2654]">
              <td className="flex items-center gap-2 py-2 text-[#7b8ab8]">
                <Zap className="h-3.5 w-3.5 text-[#f97316]" />
                {t("ratedPower")}
              </td>
              <td className="py-2 text-right font-mono text-[#00d4aa]">
                {selectedProject.ratedPower}
              </td>
            </tr>
            <tr className="border-b border-[#1a2654]">
              <td className="flex items-center gap-2 py-2 text-[#7b8ab8]">
                <Battery className="h-3.5 w-3.5 text-[#3b82f6]" />
                {t("ratedCapacity")}
              </td>
              <td className="py-2 text-right font-mono text-[#00d4aa]">
                {selectedProject.ratedCapacity}
              </td>
            </tr>
            <tr>
              <td className="flex items-center gap-2 py-2 text-[#7b8ab8]">
                <Calendar className="h-3.5 w-3.5 text-[#22d3ee]" />
                {t("commissioningDate")}
              </td>
              <td className="py-2 text-right font-mono text-[#00d4aa]">
                {selectedProject.commissioningDate}
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
