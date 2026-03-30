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
    image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1600&h=900&fit=crop",
  },
  {
    id: "ordos",
    name: "鄂尔多斯储能中心",
    nameEn: "Ordos Energy Storage Center",
    ratedPower: "5.0 MW",
    ratedCapacity: "10.0 MWh",
    commissioningDate: "2025-11-20",
    image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1600&h=900&fit=crop",
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
    const y = date.getFullYear()
    const mo = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    const h = String(date.getHours()).padStart(2, "0")
    const mi = String(date.getMinutes()).padStart(2, "0")
    const s = String(date.getSeconds()).padStart(2, "0")
    return `${y}/${mo}/${d} ${h}:${mi}:${s}`
  }

  return (
    <header className="relative h-[54px] shrink-0 overflow-hidden bg-[#020810]">
      {/* Scan-line texture */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(34,211,238,0.014)_3px,rgba(34,211,238,0.014)_4px)]" />
      {/* Centre top halo */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-20 w-[560px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.22),transparent_65%)]" />
      {/* Top glow line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#00e8cc] to-transparent" style={{ boxShadow: "0 0 12px rgba(0,232,204,0.6)" }} />
      {/* Bottom border */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/45 to-transparent" />
      {/* TL / TR outer corner brackets */}
      <div className="pointer-events-none absolute left-0 top-0 h-7 w-7 border-l-2 border-t-2 border-[#00d4aa]/60" />
      <div className="pointer-events-none absolute right-0 top-0 h-7 w-7 border-r-2 border-t-2 border-[#00d4aa]/60" />
      {/* BL / BR inner corner */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b border-l border-[#22d3ee]/25" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b border-r border-[#22d3ee]/25" />

      <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-4 px-4">

        {/* ── Left: logo + project ── */}
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
            <div className="absolute inset-0 border border-[#00d4aa]/35 bg-[#00d4aa]/8" style={{ clipPath: "polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0% 100%,0% 6px)" }} />
            <Zap className="relative h-4 w-4 text-[#00d4aa]" style={{ filter: "drop-shadow(0 0 6px rgba(0,212,170,0.8))" }} />
          </div>

          {/* Online dot */}
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#00ff9d] shadow-[0_0_8px_#00ff9d,0_0_18px_rgba(0,255,157,0.5)]" />

          {/* Project selector */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(p => !p)}
              className="group flex h-7 min-w-[175px] items-center justify-between gap-2 border-b border-[#22d3ee]/30 bg-transparent px-1 transition-colors hover:border-[#22d3ee]/70"
            >
              <span className="truncate text-[13px] font-medium tracking-[0.04em] text-[#e8f6ff]">
                {language === "zh" ? selectedProject.name : selectedProject.nameEn}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#22d3ee]/70 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden border border-[#22d3ee]/25 bg-[#030d1f] shadow-[0_16px_48px_rgba(0,0,0,0.7),0_0_0_1px_rgba(34,211,238,0.06)_inset]">
                <div className="h-px bg-gradient-to-r from-transparent via-[#22d3ee]/50 to-transparent" />
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProject(p); setDropdownOpen(false) }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors ${
                      selectedProject.id === p.id
                        ? "bg-[#0a1e40] text-[#00e8cc]"
                        : "text-[#b0cce8] hover:bg-[#071428]"
                    }`}
                  >
                    <span>{language === "zh" ? p.name : p.nameEn}</span>
                    {selectedProject.id === p.id && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#00e8cc] shadow-[0_0_6px_#00e8cc]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Centre: title with wings ── */}
        <div className="relative flex items-center gap-0">
          {/* Left wing */}
          <div className="flex items-center gap-2 pr-4">
            <div className="h-px w-[110px] bg-gradient-to-r from-transparent to-[#22d3ee]/70" />
            <div className="h-[7px] w-[7px] rotate-45 border border-[#22d3ee]/70 bg-transparent" />
            <div className="h-[4px] w-[4px] rotate-45 bg-[#22d3ee]/60" />
          </div>

          {/* Title panel */}
          <div className="relative px-8 py-1">
            {/* Corner brackets */}
            <div className="pointer-events-none absolute left-1 top-0.5 h-3 w-3 border-l-[2px] border-t-[2px] border-[#22d3ee]/90" />
            <div className="pointer-events-none absolute right-1 top-0.5 h-3 w-3 border-r-[2px] border-t-[2px] border-[#22d3ee]/90" />
            <div className="pointer-events-none absolute bottom-0.5 left-1 h-3 w-3 border-b-[2px] border-l-[2px] border-[#22d3ee]/45" />
            <div className="pointer-events-none absolute bottom-0.5 right-1 h-3 w-3 border-b-[2px] border-r-[2px] border-[#22d3ee]/45" />
            <h1
              className="bg-gradient-to-r from-[#70e8ff] via-[#ffffff] to-[#00d4aa] bg-clip-text text-[1.12rem] font-bold tracking-[0.22em] text-transparent"
              style={{ filter: "drop-shadow(0 0 18px rgba(34,211,238,0.55))" }}
            >
              {language === "zh" ? "BMS 数据监测云平台" : "BMS DATA MONITORING CLOUD"}
            </h1>
          </div>

          {/* Right wing */}
          <div className="flex flex-row-reverse items-center gap-2 pl-4">
            <div className="h-px w-[110px] bg-gradient-to-l from-transparent to-[#22d3ee]/70" />
            <div className="h-[7px] w-[7px] rotate-45 border border-[#22d3ee]/70 bg-transparent" />
            <div className="h-[4px] w-[4px] rotate-45 bg-[#22d3ee]/60" />
          </div>
        </div>

        {/* ── Right: time + lang ── */}
        <div className="flex items-center justify-end gap-2">
          {/* Time */}
          <div
            className="flex h-7 items-center gap-2 px-3"
            style={{ clipPath: "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)", border: "1px solid rgba(34,211,238,0.22)", background: "rgba(34,211,238,0.06)" }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00ff9d] shadow-[0_0_8px_#00ff9d]" />
            <span className="font-mono text-[11.5px] tabular-nums tracking-[0.1em] text-[#70d6ff]">
              {currentTime ? formatDate(currentTime) : "----/--/-- --:--:--"}
            </span>
          </div>

          {/* Language */}
          <div
            className="flex h-7 items-center overflow-hidden"
            style={{ clipPath: "polygon(0% 0%,calc(100% - 8px) 0%,100% 100%,0% 100%)", border: "1px solid rgba(34,211,238,0.22)", background: "rgba(34,211,238,0.06)" }}
          >
            <div className="flex items-center px-2">
              <Globe className="h-3.5 w-3.5 text-[#22d3ee]/60" />
            </div>
            <div className="h-4 w-px bg-[#22d3ee]/20" />
            {(["zh", "en"] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-0.5 text-[12px] font-bold tracking-wider transition-all ${
                  language === lang
                    ? "bg-[linear-gradient(180deg,#00d4aa,#00b894)] text-[#020c18] shadow-[0_0_12px_rgba(0,212,170,0.4)]"
                    : "text-[#5a88b0] hover:text-[#a0c8e8]"
                }`}
              >
                {lang === "zh" ? "中文" : "EN"}
              </button>
            ))}
          </div>
        </div>

      </div>
    </header>
  )
}
