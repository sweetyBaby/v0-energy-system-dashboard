"use client"

import { Battery, Zap, Calendar } from "lucide-react"

export function ProjectInfo() {
  const projectData = {
    name: "北工大软件园储能电站",
    image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=200&fit=crop",
    ratedPower: "2.0 MW",
    ratedCapacity: "4.0 MWh",
    commissioningDate: "2023-06-15",
  }

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
        <h3 className="text-base font-semibold text-[#00d4aa]">项目情况</h3>
      </div>

      <div className="space-y-4">
        {/* Project Image */}
        <div className="relative rounded-lg overflow-hidden h-32">
          <img
            src={projectData.image}
            alt={projectData.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1233]/80 to-transparent" />
          <div className="absolute bottom-2 left-2 text-sm font-medium">
            {projectData.name}
          </div>
        </div>

        {/* Project Details Table */}
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-[#1a2654]">
              <td className="py-2 text-[#7b8ab8] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#f97316]" />
                额定功率
              </td>
              <td className="py-2 text-right font-mono text-[#00d4aa]">
                {projectData.ratedPower}
              </td>
            </tr>
            <tr className="border-b border-[#1a2654]">
              <td className="py-2 text-[#7b8ab8] flex items-center gap-2">
                <Battery className="w-4 h-4 text-[#3b82f6]" />
                额定容量
              </td>
              <td className="py-2 text-right font-mono text-[#00d4aa]">
                {projectData.ratedCapacity}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-[#7b8ab8] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#22d3ee]" />
                投运日期
              </td>
              <td className="py-2 text-right font-mono text-[#00d4aa]">
                {projectData.commissioningDate}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
