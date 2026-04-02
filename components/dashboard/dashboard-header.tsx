"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { Check, ChevronDown, Globe, Zap } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export const projects = [
  {
    id: "jintan",
    name: "金坛储能中心",
    nameEn: "Jintan Energy Storage Center",
    ratedPower: "75 kW",
    ratedCapacity: "150 kWh",
    commissioningDate: "2025-11-15",
    image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1600&h=900&fit=crop",
  },
  {
    id: "ordos",
    name: "鄂尔多斯储能中心",
    nameEn: "Ordos Energy Storage Center",
    ratedPower: "75 kW",
    ratedCapacity: "150 kWh",
    commissioningDate: "2025-11-20",
    image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1600&h=900&fit=crop",
  },
]

export type Project = typeof projects[number]

type DashboardHeaderTab = {
  key: string
  label: {
    zh: string
    en: string
  }
}

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

  return <ProjectContext.Provider value={{ selectedProject, setSelectedProject }}>{children}</ProjectContext.Provider>
}

export function DashboardHeader({
  activeTab,
  onTabChange,
  tabs,
}: {
  activeTab: string
  onTabChange: (tab: string) => void
  tabs: DashboardHeaderTab[]
}) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const { selectedProject, setSelectedProject } = useProject()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { language, setLanguage } = useLanguage()
  const controlRef = useRef<HTMLDivElement>(null)
  const zh = language === "zh"

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!controlRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      window.removeEventListener("keydown", handleKeyDown)
    }
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
    <header className="relative z-30 h-[72px] shrink-0 overflow-visible border-b border-[#16344f] bg-[linear-gradient(180deg,#06111f_0%,#040b16_100%)] shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
      <style>{`
        @keyframes hdr-scan {
          0% { transform: translateX(-18%); opacity: 0; }
          10% { opacity: .18; }
          55% { opacity: .26; }
          100% { transform: translateX(18%); opacity: 0; }
        }
        @keyframes hdr-pulse {
          0%,100% { opacity: .45; }
          50% { opacity: 1; }
        }
        @keyframes hdr-title-sweep {
          0% { transform: translateX(-110%); opacity: 0; }
          35% { opacity: 0; }
          50% { opacity: .85; }
          65% { opacity: 0; }
          100% { transform: translateX(120%); opacity: 0; }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-40%,rgba(34,211,238,0.32),transparent_38%),radial-gradient(circle_at_18%_40%,rgba(22,163,255,0.16),transparent_36%),radial-gradient(circle_at_82%_32%,rgba(0,212,170,0.12),transparent_26%),linear-gradient(90deg,rgba(4,14,26,0.98),rgba(8,22,38,0.84)_52%,rgba(4,14,26,0.98))]" />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_118px,rgba(84,191,255,0.055)_119px),repeating-linear-gradient(0deg,transparent,transparent_7px,rgba(0,212,170,0.02)_8px)] opacity-80" />
      <div className="pointer-events-none absolute inset-x-[18%] top-0 h-full bg-[linear-gradient(90deg,transparent,rgba(74,228,255,0.18),transparent)]" style={{ animation: "hdr-scan 5.2s linear infinite" }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#68e6ff] to-transparent shadow-[0_0_20px_rgba(104,230,255,0.9),0_0_40px_rgba(104,230,255,0.4)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#1ce1c2]/80 to-transparent shadow-[0_0_8px_rgba(28,225,194,0.5)]" />
      {/* 四角装饰 */}
      <div className="pointer-events-none absolute left-0 top-0 h-10 w-10 border-l-2 border-t-2 border-[#29e4d4]/70" />
      <div className="pointer-events-none absolute right-0 top-0 h-10 w-10 border-r-2 border-t-2 border-[#29e4d4]/70" />
      <div className="pointer-events-none absolute left-0 bottom-0 h-10 w-10 border-l-2 border-b-2 border-[#1ce1c2]/50" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-10 w-10 border-r-2 border-b-2 border-[#1ce1c2]/50" />
      {/* 角点高亮 */}
      <div className="pointer-events-none absolute left-0 top-0 h-1 w-1 bg-[#68e6ff] shadow-[0_0_8px_rgba(104,230,255,1)]" />
      <div className="pointer-events-none absolute right-0 top-0 h-1 w-1 bg-[#68e6ff] shadow-[0_0_8px_rgba(104,230,255,1)]" />

      <div className="pointer-events-none absolute left-[320px] right-[360px] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[#46dfff]/30 to-transparent" />
      <div className="pointer-events-none absolute left-[420px] right-[440px] top-1/2 h-[22px] -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(53,208,255,0.2),transparent_72%)]" />

      <div
        className={`relative grid h-full items-center gap-2 px-3 sm:gap-3 sm:px-4 ${
          zh
            ? "grid-cols-[minmax(220px,320px)_minmax(0,1fr)_auto] xl:grid-cols-[minmax(260px,360px)_minmax(0,1fr)_auto]"
            : "grid-cols-[minmax(220px,290px)_minmax(0,1fr)_auto] xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)_auto]"
        }`}
      >
        <div className="relative flex min-w-0 items-center gap-2 sm:gap-3">
          <div
            className="relative flex h-[36px] w-[36px] shrink-0 items-center justify-center border border-[#27f0dd]/45 bg-[linear-gradient(180deg,rgba(7,45,54,0.98),rgba(4,20,28,0.98))] shadow-[0_0_18px_rgba(39,240,221,0.18),inset_0_0_0_1px_rgba(140,255,240,0.06)]"
            style={{ clipPath: "polygon(8px 0%,100% 0%,100% calc(100% - 8px),calc(100% - 8px) 100%,0% 100%,0% 8px)" }}
          >
            <span className="pointer-events-none absolute inset-x-[6px] top-[4px] h-px bg-gradient-to-r from-transparent via-[#8ffef0]/75 to-transparent" />
            <span className="pointer-events-none absolute inset-[4px] border border-[#8ffef0]/10" />
            <Zap className="h-[16px] w-[16px] text-[#27f0dd]" style={{ filter: "drop-shadow(0 0 6px rgba(39,240,221,0.7))" }} />
          </div>

          <div className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#15ffaf] shadow-[0_0_10px_rgba(21,255,175,0.8)]" style={{ animation: "hdr-pulse 1.9s ease-in-out infinite" }} />

          <div
            className={`relative min-w-0 flex-1 overflow-hidden border border-[#235f7f]/70 bg-[linear-gradient(180deg,rgba(8,29,44,0.98),rgba(4,14,27,1))] py-1.5 shadow-[0_0_28px_rgba(18,94,132,0.16),inset_0_0_0_1px_rgba(126,220,255,0.05)] ${
              zh ? "px-4" : "px-2.5 sm:px-3 xl:px-4"
            }`}
            style={{ clipPath: "polygon(12px 0%,100% 0%,calc(100% - 14px) 100%,0% 100%)" }}
          >
            <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#7de9ff]/70 to-transparent" />
            <span className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-[#20e1c4]/40 to-transparent" />
            <div className="flex min-w-0 flex-col items-start">
             
              <h1
                className={`relative mt-0.5 whitespace-nowrap font-bold ${
                  zh
                    ? "text-[0.92rem] tracking-[0.14em] xl:text-[1rem] xl:tracking-[0.18em]"
                    : "text-[0.56rem] tracking-[0em] sm:text-[0.62rem] sm:tracking-[0.01em] xl:text-[0.82rem] xl:tracking-[0.1em]"
                }`}
                style={{
                  ...(zh ? {} : { fontSize: "clamp(0.56rem,0.84vw,0.82rem)", letterSpacing: "0.02em" }),
                  color: "#e2f8ff",
                  backgroundImage: "linear-gradient(90deg,#b6fbff,#ffffff,#7effd7)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 20px rgba(60,223,255,0.56))",
                }}
              >
                {zh ? "BMS 数据监测云平台" : "BMS Data Monitoring Cloud Platform"}
              </h1>
              <div className="relative mt-1 h-[2px] w-full overflow-hidden rounded-full bg-[linear-gradient(90deg,rgba(34,64,95,0.18),rgba(41,123,174,0.55),rgba(34,64,95,0.18))]">
                <span
                  className="absolute inset-y-0 w-[24%] bg-[linear-gradient(90deg,transparent,rgba(169,244,255,0.95),transparent)]"
                  style={{ animation: "hdr-title-sweep 3.8s ease-in-out infinite" }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative min-w-0">
          <div
            className="relative flex h-[40px] items-center overflow-hidden border border-[#2a6688]/72 bg-[linear-gradient(180deg,rgba(9,28,44,0.98),rgba(4,14,28,1))] px-1.5 shadow-[0_0_28px_rgba(36,204,255,0.12),inset_0_0_0_1px_rgba(129,224,255,0.04)] sm:h-[42px] sm:px-2"
            style={{ clipPath: "polygon(12px 0%,calc(100% - 12px) 0%,100% 50%,calc(100% - 12px) 100%,12px 100%,0% 50%)" }}
          >
            <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#6ee9ff]/75 to-transparent" />
            <span className="pointer-events-none absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-[#1ce1c2]/45 to-transparent" />
            <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1.5 sm:px-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key
                const label = zh ? tab.label.zh : tab.label.en

                return (
                  <button
                    key={tab.key}
                    onClick={() => onTabChange(tab.key)}
                    className={`group relative h-[28px] shrink-0 whitespace-nowrap px-2.5 text-[11px] font-semibold tracking-[0.06em] transition-all sm:h-[30px] sm:px-3 sm:text-[12px] ${
                      isActive
                        ? "border border-[#2cead7]/60 bg-[linear-gradient(180deg,rgba(12,102,122,0.96),rgba(7,48,67,0.94))] text-[#e8ffff] shadow-[0_0_18px_rgba(44,234,215,0.2),inset_0_0_0_1px_rgba(139,255,247,0.12)]"
                        : "border border-[#163d59]/55 bg-[linear-gradient(180deg,rgba(8,24,39,0.86),rgba(4,14,26,0.88))] text-[#8fb7cb] hover:border-[#2a88ad]/55 hover:text-[#d9f7ff]"
                    }`}
                    style={{
                      clipPath: isActive
                        ? "polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)"
                        : "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)",
                    }}
                    aria-pressed={isActive}
                  >
                    <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#8ef8ff]/50 to-transparent" />
                    {isActive ? <span className="pointer-events-none absolute inset-x-2 bottom-0 h-px bg-gradient-to-r from-transparent via-[#2fe8d7] to-transparent" /> : null}
                    <span className="relative flex items-center justify-center gap-2">
                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#2ff4db] shadow-[0_0_8px_rgba(47,244,219,0.85)]" />}
                      <span>{label}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="relative z-40 flex items-center gap-1.5 xl:gap-2" ref={controlRef}>
          <div
            className="relative hidden h-[32px] items-center gap-2 px-3 2xl:flex"
            style={{
              clipPath: "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)",
              border: "1px solid rgba(53,188,245,0.34)",
              background: "linear-gradient(180deg,rgba(9,29,48,0.96),rgba(4,17,31,0.98))",
              boxShadow: "0 0 18px rgba(56,207,255,0.08), inset 0 0 0 1px rgba(129,224,255,0.05)",
            }}
          >
            <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#6ee9ff]/75 to-transparent" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#15ffaf] shadow-[0_0_8px_rgba(21,255,175,0.85)]" />
            <span className="font-mono text-[11px] tabular-nums tracking-[0.1em] text-[#7de6ff]">
              {currentTime ? formatDate(currentTime) : "----/--/-- --:--:--"}
            </span>
          </div>

          <div className={`relative ${zh ? "w-[132px] sm:w-[144px] xl:w-[160px]" : "w-[182px] sm:w-[204px] xl:w-[236px]"}`}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="group relative flex h-[32px] w-full items-center justify-between gap-2 border border-[#225d7a]/75 bg-[linear-gradient(180deg,rgba(7,24,39,0.96),rgba(4,13,25,0.98))] px-3 text-left shadow-[0_0_18px_rgba(56,207,255,0.08),inset_0_0_0_1px_rgba(126,220,255,0.04)] transition-all hover:border-[#38cfff]/70 hover:shadow-[0_0_22px_rgba(56,207,255,0.18),inset_0_0_0_1px_rgba(126,220,255,0.08)]"
              style={{ clipPath: "polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)" }}
              aria-expanded={dropdownOpen}
              aria-label={zh ? "切换项目" : "Switch project"}
            >
              <span className="pointer-events-none absolute left-[10px] top-0 h-full w-px bg-gradient-to-b from-[#1df2d7]/0 via-[#1df2d7]/35 to-[#1df2d7]/0" />
              <span className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-[#3bd2ff]/60 to-transparent" />
              <div className="min-w-0 flex-1">
                <div className="whitespace-nowrap text-[10.5px] font-semibold tracking-[0.02em] text-[#e7fbff] sm:text-[11.5px] sm:tracking-[0.04em] xl:text-[12px] xl:tracking-[0.05em]" style={{ textShadow: "0 0 12px rgba(104,230,255,0.35)" }}>
                  {zh ? selectedProject.name : selectedProject.nameEn}
                </div>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#68dfff] transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-full overflow-hidden rounded-[12px] border border-[#2a6d8e]/70 bg-[linear-gradient(180deg,rgba(4,16,30,0.98),rgba(2,10,20,0.98))] shadow-[0_16px_48px_rgba(0,0,0,0.56),0_0_24px_rgba(40,180,255,0.08)]">
                <div className="h-px bg-gradient-to-r from-transparent via-[#50dcff]/70 to-transparent" />
                {projects.map((project) => {
                  const isActive = selectedProject.id === project.id

                  return (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project)
                        setDropdownOpen(false)
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-[12.5px] transition-colors ${
                        isActive
                          ? "bg-[linear-gradient(90deg,rgba(10,57,82,0.92),rgba(6,29,52,0.92))] text-[#2cf3dd]"
                          : "text-[#a7c8df] hover:bg-[rgba(18,44,72,0.72)]"
                      }`}
                    >
                      <span className="whitespace-nowrap">{zh ? project.name : project.nameEn}</span>
                      {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div
            className="relative flex h-[32px] items-center overflow-hidden"
            style={{
              clipPath: "polygon(0% 0%,calc(100% - 10px) 0%,100% 100%,0% 100%)",
              border: "1px solid rgba(53,188,245,0.45)",
              background: "linear-gradient(180deg,rgba(9,29,48,0.98),rgba(4,17,31,0.98))",
              boxShadow: "0 0 18px rgba(56,207,255,0.12),inset 0 0 0 1px rgba(129,224,255,0.06)",
            }}
          >
            <span className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-[#6ee9ff]/80 to-transparent" />
            <div className="flex items-center px-2.5">
              <Globe className="h-[13px] w-[13px] text-[#62dfff]" style={{ filter: "drop-shadow(0 0 4px rgba(98,223,255,0.8))" }} />
            </div>
            <div className="h-4 w-px bg-[#38cfff]/30" />
            {(["zh", "en"] as const).map((lang) => {
              const isActive = language === lang
              return (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`relative px-2.5 text-[12px] font-bold tracking-[0.08em] transition-all ${
                    isActive ? "text-[#26f0dc]" : "text-[#5a7f95] hover:text-[#9feeff]"
                  }`}
                  style={isActive ? { textShadow: "0 0 12px rgba(38,240,220,0.7),0 0 4px rgba(38,240,220,0.9)" } : undefined}
                >
                  {isActive && <span className="absolute -bottom-px left-1/2 h-px w-3 -translate-x-1/2 bg-[#26f0dc] shadow-[0_0_6px_rgba(38,240,220,0.8)]" />}
                  {lang === "zh" ? "中" : "EN"}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </header>
  )
}
