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
    <header className="relative z-30 h-[60px] shrink-0 overflow-visible bg-[linear-gradient(180deg,#06111f_0%,#040b16_100%)] shadow-[0_10px_28px_rgba(0,0,0,0.2)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-25%,rgba(34,211,238,0.34),transparent_38%),radial-gradient(circle_at_50%_50%,rgba(29,111,161,0.18),transparent_56%),linear-gradient(90deg,rgba(4,14,26,0.98),rgba(8,22,38,0.84)_50%,rgba(4,14,26,0.98))]" />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_119px,rgba(84,191,255,0.055)_120px),repeating-linear-gradient(0deg,transparent,transparent_7px,rgba(0,212,170,0.022)_8px)] opacity-80" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-full w-[480px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(80,220,255,0.15),transparent_74%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#68e6ff] to-transparent shadow-[0_0_14px_rgba(104,230,255,0.6)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#1ce1c2]/65 to-transparent" />
      <div className="pointer-events-none absolute left-0 top-0 h-8 w-8 border-l border-t border-[#29e4d4]/45" />
      <div className="pointer-events-none absolute right-0 top-0 h-8 w-8 border-r border-t border-[#29e4d4]/45" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b border-l border-[#3aa8d6]/20" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b border-r border-[#3aa8d6]/20" />

      <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2">
        <div className="absolute left-0 right-[calc(50%+165px)] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[#46dfff]/45 to-[#46dfff]/82" />
        <div className="absolute left-[calc(50%+165px)] right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-l from-transparent via-[#46dfff]/45 to-[#46dfff]/82" />
        <div className="absolute right-[calc(50%+168px)] top-1/2 h-[2px] w-[24px] -translate-y-1/2 rounded-full bg-[#68e6ff] shadow-[0_0_10px_rgba(104,230,255,0.72)]" />
        <div className="absolute left-[calc(50%+168px)] top-1/2 h-[2px] w-[24px] -translate-y-1/2 rounded-full bg-[#68e6ff] shadow-[0_0_10px_rgba(104,230,255,0.72)]" />
        <div className="absolute left-[calc(50%-280px)] top-1/2 h-[5px] w-[5px] -translate-y-1/2 rotate-45 bg-[#46dfff]/75 shadow-[0_0_8px_rgba(70,223,255,0.5)]" />
        <div className="absolute left-[calc(50%+280px)] top-1/2 h-[5px] w-[5px] -translate-y-1/2 rotate-45 bg-[#46dfff]/75 shadow-[0_0_8px_rgba(70,223,255,0.5)]" />
        <div className="absolute left-[calc(50%-220px)] top-1/2 h-[8px] w-[8px] -translate-y-1/2 rotate-45 border border-[#46dfff]/65" />
        <div className="absolute left-[calc(50%+220px)] top-1/2 h-[8px] w-[8px] -translate-y-1/2 rotate-45 border border-[#46dfff]/65" />
        <div className="absolute left-[calc(50%-430px)] top-1/2 h-[4px] w-[4px] -translate-y-1/2 rounded-full bg-[#46dfff]/60 shadow-[0_0_8px_rgba(70,223,255,0.4)]" />
        <div className="absolute left-[calc(50%+430px)] top-1/2 h-[4px] w-[4px] -translate-y-1/2 rounded-full bg-[#46dfff]/60 shadow-[0_0_8px_rgba(70,223,255,0.4)]" />
      </div>

      <div className="relative grid h-full grid-cols-[1fr_auto_1fr] items-center px-4">
        <div className="relative z-40 flex items-center gap-3">
          <div
            className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center border border-[#27f0dd]/45 bg-[linear-gradient(180deg,rgba(7,45,54,0.94),rgba(4,20,28,0.94))] shadow-[0_0_18px_rgba(39,240,221,0.14),inset_0_0_0_1px_rgba(140,255,240,0.04)]"
            style={{ clipPath: "polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0% 100%,0% 6px)" }}
          >
            <span className="pointer-events-none absolute inset-x-[5px] top-[3px] h-px bg-gradient-to-r from-transparent via-[#8ffef0]/75 to-transparent" />
            <Zap className="h-[14px] w-[14px] text-[#27f0dd]" style={{ filter: "drop-shadow(0 0 6px rgba(39,240,221,0.7))" }} />
          </div>

          <div className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#15ffaf] shadow-[0_0_10px_rgba(21,255,175,0.8)]" />

          <div className="relative min-w-[190px]">
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="group relative flex h-[30px] w-full items-center justify-between gap-3 border border-[#225d7a]/75 bg-[linear-gradient(180deg,rgba(7,24,39,0.94),rgba(4,13,25,0.94))] px-3 text-left shadow-[inset_0_0_0_1px_rgba(126,220,255,0.04)] transition-all hover:border-[#38cfff]/70 hover:shadow-[0_0_18px_rgba(56,207,255,0.12),inset_0_0_0_1px_rgba(126,220,255,0.06)]"
              style={{ clipPath: "polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)" }}
            >
              <span className="pointer-events-none absolute left-[10px] top-0 h-full w-px bg-gradient-to-b from-[#1df2d7]/0 via-[#1df2d7]/35 to-[#1df2d7]/0" />
              <span className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-[#3bd2ff]/60 to-transparent" />
              <span className="pointer-events-none absolute right-3 top-[4px] h-[4px] w-[4px] rotate-45 border border-[#61dcff]/60 opacity-70" />
              <span className="truncate text-[13px] font-medium tracking-[0.03em] text-[#dff6ff]">
                {language === "zh" ? selectedProject.name : selectedProject.nameEn}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#68dfff] transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-[12px] border border-[#2a6d8e]/70 bg-[linear-gradient(180deg,rgba(4,16,30,0.98),rgba(2,10,20,0.98))] shadow-[0_16px_48px_rgba(0,0,0,0.56),0_0_24px_rgba(40,180,255,0.08)]">
                <div className="h-px bg-gradient-to-r from-transparent via-[#50dcff]/70 to-transparent" />
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project)
                      setDropdownOpen(false)
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-[12.5px] transition-colors ${
                      selectedProject.id === project.id
                        ? "bg-[linear-gradient(90deg,rgba(10,57,82,0.92),rgba(6,29,52,0.92))] text-[#2cf3dd]"
                        : "text-[#a7c8df] hover:bg-[rgba(18,44,72,0.72)]"
                    }`}
                  >
                    <span>{language === "zh" ? project.name : project.nameEn}</span>
                    {selectedProject.id === project.id && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#28f0db] shadow-[0_0_6px_rgba(40,240,219,0.8)]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative flex items-center justify-center px-10">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[24px] -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(53,208,255,0.18),transparent_72%)]" />
          <div className="pointer-events-none absolute right-[calc(100%-4px)] top-1/2 h-[10px] w-[52px] -translate-y-1/2 bg-gradient-to-r from-transparent to-[#64e7ff]/85 shadow-[0_0_12px_rgba(100,231,255,0.42)]" />
          <div className="pointer-events-none absolute left-[calc(100%-4px)] top-1/2 h-[10px] w-[52px] -translate-y-1/2 bg-gradient-to-l from-transparent to-[#64e7ff]/85 shadow-[0_0_12px_rgba(100,231,255,0.42)]" />
          <div
            className="relative px-10 py-[6px] shadow-[0_0_28px_rgba(36,204,255,0.16)]"
            style={{
              background: "linear-gradient(180deg,rgba(12,46,64,0.94) 0%, rgba(7,23,39,0.98) 100%)",
              clipPath: "polygon(14px 0%,calc(100% - 14px) 0%,100% 50%,calc(100% - 14px) 100%,14px 100%,0% 50%)",
            }}
          >
            <div className="pointer-events-none absolute -left-[20px] top-1/2 h-[14px] w-[20px] -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(101,232,255,0.5))]" />
            <div className="pointer-events-none absolute -right-[20px] top-1/2 h-[14px] w-[20px] -translate-y-1/2 bg-[linear-gradient(270deg,transparent,rgba(101,232,255,0.5))]" />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                clipPath: "polygon(14px 0%,calc(100% - 14px) 0%,100% 50%,calc(100% - 14px) 100%,14px 100%,0% 50%)",
                border: "1px solid rgba(72,221,255,0.34)",
                boxShadow: "inset 0 0 22px rgba(74,223,255,0.09)",
              }}
            />
            <div className="pointer-events-none absolute left-[14px] right-[14px] top-0 h-px bg-gradient-to-r from-transparent via-[#79ebff]/90 to-transparent" />
            <div className="pointer-events-none absolute left-[14px] right-[14px] bottom-0 h-px bg-gradient-to-r from-transparent via-[#1ce1c2]/42 to-transparent" />

            <h1
              className="whitespace-nowrap bg-gradient-to-r from-[#9ff7ff] via-[#ffffff] to-[#7effd7] bg-clip-text text-[1.02rem] font-bold tracking-[0.24em] text-transparent"
              style={{ filter: "drop-shadow(0 0 20px rgba(60,223,255,0.5))" }}
            >
              {language === "zh" ? "BMS 数据监测云平台" : "BMS DATA MONITORING CLOUD"}
            </h1>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <div
            className="relative flex h-[30px] items-center gap-2 px-3"
            style={{
              clipPath: "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)",
              border: "1px solid rgba(53,188,245,0.28)",
              background: "linear-gradient(180deg,rgba(9,29,48,0.94),rgba(4,17,31,0.94))",
              boxShadow: "inset 0 0 0 1px rgba(129,224,255,0.04)",
            }}
          >
            <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#6ee9ff]/75 to-transparent" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#15ffaf] shadow-[0_0_8px_rgba(21,255,175,0.85)]" />
            <span className="font-mono text-[11px] tabular-nums tracking-[0.1em] text-[#7de6ff]">
              {currentTime ? formatDate(currentTime) : "----/--/-- --:--:--"}
            </span>
          </div>

          <div
            className="relative flex h-[30px] items-center overflow-hidden"
            style={{
              clipPath: "polygon(0% 0%,calc(100% - 8px) 0%,100% 100%,0% 100%)",
              border: "1px solid rgba(53,188,245,0.28)",
              background: "linear-gradient(180deg,rgba(9,29,48,0.94),rgba(4,17,31,0.94))",
              boxShadow: "inset 0 0 0 1px rgba(129,224,255,0.04)",
            }}
          >
            <div className="flex items-center px-2.5">
              <Globe className="h-[13px] w-[13px] text-[#62dfff]" />
            </div>
            <div className="h-4 w-px bg-[#38cfff]/20" />
            {(["zh", "en"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2.5 text-[11.5px] font-semibold tracking-[0.06em] transition-all ${
                  language === lang
                    ? "text-[#26f0dc]"
                    : "text-[#5a7f95] hover:text-[#9feeff]"
                }`}
                style={language === lang ? { textShadow: "0 0 10px rgba(38,240,220,0.5)" } : undefined}
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
