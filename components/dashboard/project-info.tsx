"use client"

import { Battery, Zap, Calendar } from "lucide-react"
import { useProject } from "./dashboard-header"
import { useLanguage } from "@/components/language-provider"

export function ProjectInfo() {
  const { selectedProject } = useProject()
  const { t } = useLanguage()

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
        <h3 className="text-base font-semibold text-[#00d4aa]">{t("projectInfo")}</h3>
      </div>

      <div className="space-y-4">
        {/* Project Image */}
        <div className="relative rounded-lg overflow-hidden h-32">
          <img
            src={selectedProject.image}
            alt={selectedProject.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1233]/80 to-transparent" />
          <div className="absolute bottom-2 left-2 text-sm font-medium">
            {selectedProject.name}
          </div>
        </div>

        {/* Project Details Table */}
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-[#1a2654]">
              <td className="py-2 text-[#7b8ab8] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#f97316]" />
                {t("ratedPower")}
              </td>
              <td className="py-2 text-right font-mono text-[#00d4aa]">
                {selectedProject.ratedPower}
              </td>
            </tr>
            <tr className="border-b border-[#1a2654]">
              <td className="py-2 text-[#7b8ab8] flex items-center gap-2">
                <Battery className="w-4 h-4 text-[#3b82f6]" />
                {t("ratedCapacity")}
              </td>
              <td className="py-2 text-right font-mono text-[#00d4aa]">
                {selectedProject.ratedCapacity}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-[#7b8ab8] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#22d3ee]" />
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
  )
}
