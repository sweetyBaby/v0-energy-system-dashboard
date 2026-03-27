"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { ChevronDown, Globe, Zap } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export const projects = [
  {
    id: "jintan",
    name: "金坛储能中心",
    nameEn: "Jintan Energy Storage Center",
    ratedPower: "2.0 MW",
    ratedCapacity: "4.0 MWh",
    commissioningDate: "2025-11-15",
    image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=200&fit=crop",
  },
  {
    id: "ordos",
    name: "鄂尔多斯储能中心",
    nameEn: "Ordos Energy Storage Center",
    ratedPower: "5.0 MW",
    ratedCapacity: "10.0 MWh",
    commissioningDate: "2025-11-20",
    image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&h=200&fit=crop",
  },
]

export type Project = typeof projects[number]

const ProjectContext = createContext<{
  selectedProject: Project
  setSelectedProject: (project: Project) => void
}>({
  selectedProject: projects[0],
  setSelectedProject: () => {},
})

export const useProject = () => useContext(ProjectContext)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [selectedProject, setSelectedProject] = useState(projects[0])

  return (
    <ProjectContext.Provider value={{ selectedProject, setSelectedProject }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function DashboardHeader() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const { selectedProject, setSelectedProject } = useProject()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { language, setLanguage } = useLanguage()

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    const seconds = String(date.getSeconds()).padStart(2, "0")
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
  }

  return (
    <header className="relative overflow-hidden border-b border-[#17325d] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.1),transparent_26%),linear-gradient(180deg,rgba(10,18,48,0.98),rgba(7,12,31,0.98))] px-4 py-2.5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/45 to-transparent" />
      <div className="pointer-events-none absolute left-0 top-0 h-14 w-24 border-l border-t border-[#3b82f6]/25" />
      <div className="pointer-events-none absolute right-0 top-0 h-14 w-24 border-r border-t border-[#3b82f6]/25" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-10 w-56 -translate-x-1/2 bg-[radial-gradient(circle_at_top,rgba(0,212,170,0.18),transparent_72%)]" />

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#22d3ee]/30 bg-[linear-gradient(135deg,rgba(0,212,170,0.2),rgba(59,130,246,0.22))] shadow-[0_0_16px_rgba(34,211,238,0.14)]">
            <Zap className="h-4.5 w-4.5 text-[#e8f4fc]" />
          </div>

          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex min-w-[208px] items-center justify-between gap-2 rounded-lg border border-[#28507c] bg-[#0b1434]/92 px-3 py-1.5 text-sm text-[#e8f4fc] shadow-[0_0_0_1px_rgba(34,211,238,0.02)_inset] transition-colors hover:border-[#00d4aa]"
            >
              <span className="truncate">{language === "zh" ? selectedProject.name : selectedProject.nameEn}</span>
              <ChevronDown className={`h-4 w-4 text-[#7b8ab8] transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-[#1a2654] bg-[#0d1233] shadow-lg">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project)
                      setDropdownOpen(false)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[#1a2654] ${
                      selectedProject.id === project.id ? "bg-[#1a2654]/50 text-[#00d4aa]" : "text-[#e8f4fc]"
                    }`}
                  >
                    {language === "zh" ? project.name : project.nameEn}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative flex min-w-[500px] items-center justify-center px-10">
          <div className="absolute left-0 top-1/2 h-px w-24 -translate-y-1/2 bg-gradient-to-r from-transparent to-[#22d3ee]" />
          <div className="absolute right-0 top-1/2 h-px w-24 -translate-y-1/2 bg-gradient-to-l from-transparent to-[#22d3ee]" />
          <div className="relative overflow-hidden rounded-[14px] border border-[#28507c] bg-[linear-gradient(180deg,rgba(8,17,46,0.95),rgba(10,18,48,0.9))] px-10 py-2 shadow-[0_0_0_1px_rgba(34,211,238,0.03)_inset]">
            <div className="absolute left-2 top-2 h-2 w-2 rounded-full bg-[#00d4aa] shadow-[0_0_10px_rgba(0,212,170,0.85)]" />
            <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#22d3ee] shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee] to-transparent" />
            <div className="absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/45 to-transparent" />
            <div className="text-center">
              <h1 className="mt-1 text-xl font-semibold tracking-[0.26em] text-[#e8f4fc]">
                {language === "zh" ? "BMS 数据监测云平台" : "BMS Data Monitoring Cloud"}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <span className="rounded-md border border-[#22456d] bg-[#08112e]/82 px-3 py-1.5 text-xs font-mono text-[#7dd3fc]">
            {currentTime ? formatDate(currentTime) : "----/--/-- --:--:--"}
          </span>

          <div className="flex items-center gap-1.5 rounded-md border border-[#28507c] bg-[#0b1434]/92 px-1.5 py-1">
            <Globe className="h-3.5 w-3.5 shrink-0 text-[#00d4aa]" />
            <div className="flex rounded-sm overflow-hidden">
              {(["zh", "en"] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2 py-0.5 text-xs font-medium transition-all ${
                    language === lang
                      ? "bg-[#00d4aa] text-[#041123]"
                      : "text-[#7b8ab8] hover:text-[#e8f4fc]"
                  }`}
                >
                  {lang === "zh" ? "中文" : "EN"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
