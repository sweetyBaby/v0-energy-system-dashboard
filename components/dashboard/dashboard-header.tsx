"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Globe, LogOut, Map } from "lucide-react"
import { EnerCloudMark } from "@/components/brand/enercloud-mark"
import {
  fetchProjectOptionsByDevice,
  fetchProjectDetail,
  fetchProjectRealtime,
  normalizeRealtimeDeviceSnapshots,
  normalizeOverviewMetricsFromRealtime,
  normalizeProjectDetail,
  normalizeRealtimeSnapshot,
  type DeviceRealtimeSnapshotView,
  type OverviewMetrics,
  type ProjectOption,
  type RawProjectDetail,
  type RawProjectRealtime,
  type RealtimeSnapshotView,
} from "@/lib/api/project"
import { useLanguage } from "@/components/language-provider"
import { useDashboardViewport } from "@/hooks/use-dashboard-viewport"
import { clearStoredAuthToken } from "@/lib/auth-storage"
import { logoutWithCloud } from "@/lib/api/auth"

export type Project = ProjectOption & {
  projectName: string
  image?: string
  region: string
  company: string
  ratedPower: string
  ratedCapacity: string
  commissioningDate: string
  tariffInfo: string
  status: string
  overviewMetrics: OverviewMetrics
  realtimeSnapshot: RealtimeSnapshotView
  deviceRealtimeSnapshots: DeviceRealtimeSnapshotView[]
}



const defaultProjectOption: ProjectOption = {
  id: "",
  projectId: "",
  projectName: "Loading projects",
  projectNameEn: "Loading projects",
  picPath: "",
  devices: [],
  longitude: null,
  latitude: null,
  region: "",
  installedCapacityMw: null,
}

const buildProjectView = (
  project: ProjectOption,
  detail: RawProjectDetail | null = null,
  realtime: RawProjectRealtime | null = null,
  realtimeRequestSucceeded = false
): Project => ({
  ...project,
  ...normalizeProjectDetail(detail, project.picPath),
  projectName: detail?.projectName ? String(detail.projectName) : project.projectName,
  overviewMetrics: realtime ? normalizeOverviewMetricsFromRealtime(realtime) : normalizeOverviewMetricsFromRealtime(null),
  realtimeSnapshot: normalizeRealtimeSnapshot(realtime, realtimeRequestSucceeded),
  deviceRealtimeSnapshots: normalizeRealtimeDeviceSnapshots(realtime, project.devices, realtimeRequestSucceeded),
})

const ProjectContext = createContext<{
  projectOptions: ProjectOption[]
  selectedProject: Project
  setSelectedProject: (project: ProjectOption) => void
  projectDetail: RawProjectDetail | null
  isProjectLoading: boolean
  isProjectOptionsLoading: boolean
  projectOptionsError: string | null
  loadCurrentProjectDetail: () => Promise<void>
  loadCurrentProjectRealtime: () => Promise<void>
  clearCurrentProjectOverviewData: () => void
  resetProjectState: () => void
}>({
  projectOptions: [],
  selectedProject: buildProjectView(defaultProjectOption),
  setSelectedProject: () => {},
  projectDetail: null,
  isProjectLoading: false,
  isProjectOptionsLoading: true,
  projectOptionsError: null,
  loadCurrentProjectDetail: async () => {},
  loadCurrentProjectRealtime: async () => {},
  clearCurrentProjectOverviewData: () => {},
  resetProjectState: () => {},
})

export const useProject = () => useContext(ProjectContext)

export function ProjectProvider({ children, initialProjectId }: { children: React.ReactNode; initialProjectId?: string | null }) {
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectOption.id)
  const [projectDetails, setProjectDetails] = useState<Record<string, RawProjectDetail | null>>({})
  const [projectRealtime, setProjectRealtime] = useState<Record<string, RawProjectRealtime | null>>({})
  const [projectRealtimeSuccess, setProjectRealtimeSuccess] = useState<Record<string, boolean>>({})
  const [isProjectLoading, setIsProjectLoading] = useState(false)
  const [isProjectOptionsLoading, setIsProjectOptionsLoading] = useState(true)
  const [projectOptionsError, setProjectOptionsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadProjectOptions = async () => {
      try {
        setIsProjectOptionsLoading(true)
        setProjectOptionsError(null)

        const nextProjectOptions = await fetchProjectOptionsByDevice()
        if (cancelled) {
          return
        }

        setProjectOptions(nextProjectOptions)

        if (nextProjectOptions.length === 0) {
          setProjectOptionsError("empty")
        }
      } catch (error) {
        if (cancelled) {
          return
        }

        setProjectOptions([])
        setProjectOptionsError("failed")
        console.error("Failed to load project selector options", error)
      } finally {
        if (!cancelled) {
          setIsProjectOptionsLoading(false)
        }
      }
    }

    void loadProjectOptions()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (projectOptions.length === 0) return

    if (initialProjectId) {
      const target = projectOptions.find((p) => p.projectId === initialProjectId)
      if (target) {
        setSelectedProjectId(target.id)
        return
      }
    }

    const hasSelectedProject = projectOptions.some((project) => project.id === selectedProjectId)
    if (!hasSelectedProject) {
      setSelectedProjectId(projectOptions[0].id)
    }
  }, [projectOptions, selectedProjectId, initialProjectId])

  const projectOption =
    projectOptions.find((project) => project.id === selectedProjectId) ?? projectOptions[0] ?? defaultProjectOption
  const projectDetail = projectDetails[projectOption.id] ?? null
  const selectedRealtime = projectRealtime[projectOption.id] ?? null
  const selectedRealtimeSuccess = projectRealtimeSuccess[projectOption.id] ?? false
  const selectedProject = buildProjectView(projectOption, projectDetail, selectedRealtime, selectedRealtimeSuccess)

  const loadCurrentProjectDetail = useCallback(async () => {
    if (!projectOption.projectId) {
      return
    }

    setIsProjectLoading(true)

    try {
      const response = await fetchProjectDetail(projectOption.projectId)
      setProjectDetails((current) => ({
        ...current,
        [projectOption.id]: response,
      }))
    } catch (error) {
      setProjectDetails((current) => ({
        ...current,
        [projectOption.id]: current[projectOption.id] ?? null,
      }))

      console.error(`Failed to load project detail for ${projectOption.projectId}`, error)
    } finally {
      setIsProjectLoading(false)
    }
  }, [projectOption.id, projectOption.projectId])

  const loadCurrentProjectRealtime = useCallback(async () => {
    if (!projectOption.projectId) {
      return
    }

    try {
      const response = await fetchProjectRealtime(projectOption.projectId, projectOption.devices)

      setProjectRealtime((current) => ({
        ...current,
        [projectOption.id]: response,
      }))
      setProjectRealtimeSuccess((current) => ({
        ...current,
        [projectOption.id]: true,
      }))
    } catch (error) {
      setProjectRealtime((current) => ({
        ...current,
        [projectOption.id]: current[projectOption.id] ?? null,
      }))
      setProjectRealtimeSuccess((current) => ({
        ...current,
        [projectOption.id]: false,
      }))

      console.error(`Failed to load realtime overview for ${projectOption.projectId}`, error)
    }
  }, [projectOption.devices, projectOption.id, projectOption.projectId])

  const clearCurrentProjectOverviewData = useCallback(() => {
    setProjectDetails((current) => ({
      ...current,
      [projectOption.id]: null,
    }))
    setProjectRealtime((current) => ({
      ...current,
      [projectOption.id]: null,
    }))
    setProjectRealtimeSuccess((current) => ({
      ...current,
      [projectOption.id]: false,
    }))
    setIsProjectLoading(false)
  }, [projectOption.id])

  const resetProjectState = useCallback(() => {
    setProjectOptions([])
    setSelectedProjectId(defaultProjectOption.id)
    setProjectDetails({})
    setProjectRealtime({})
    setProjectRealtimeSuccess({})
    setIsProjectLoading(false)
    setIsProjectOptionsLoading(false)
    setProjectOptionsError(null)
  }, [])

  const setSelectedProject = useCallback((project: ProjectOption) => {
    if (!project.id) {
      return
    }

    setSelectedProjectId(project.id)
  }, [])

  return (
    <ProjectContext.Provider
      value={{
        projectOptions,
        selectedProject,
        setSelectedProject,
        projectDetail,
        isProjectLoading,
        isProjectOptionsLoading,
        projectOptionsError,
        loadCurrentProjectDetail,
        loadCurrentProjectRealtime,
        clearCurrentProjectOverviewData,
        resetProjectState,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function DashboardHeader({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const { selectedProject, isProjectOptionsLoading, projectOptionsError, resetProjectState } = useProject()
  const { language, setLanguage } = useLanguage()
  const { isCompactWidth, isShortHeight } = useDashboardViewport()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const zh = language === "zh"
  const useCompactHeader = compact || isCompactWidth || isShortHeight
  const hasProject = !!selectedProject.projectId
  const projectLabel = hasProject
    ? zh ? selectedProject.projectName : selectedProject.projectNameEn
    : isProjectOptionsLoading
      ? zh ? "加载中..." : "Loading..."
      : projectOptionsError
        ? zh ? "加载失败" : "Load failed"
        : zh ? "暂无项目" : "No projects"
  const logoutLabel = zh ? "退出登录" : "Logout"

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logoutWithCloud()
    } catch (error) {
      console.error("Failed to logout from backend", error)
    } finally {
      resetProjectState()
      clearStoredAuthToken()
      router.replace("/")
      router.refresh()
      setIsLoggingOut(false)
    }
  }

  return (
    <header
      className={`relative z-30 shrink-0 border-b border-[#16344f] bg-[linear-gradient(180deg,#06111f_0%,#040b16_100%)] shadow-[0_8px_24px_rgba(0,0,0,0.32)] ${
        useCompactHeader ? "h-[56px]" : "h-[62px]"
      }`}
    >
      <style>{`
        @keyframes hdr-scan {
          0% { transform: translateX(-18%); opacity: 0; }
          10% { opacity: .18; }
          90% { opacity: .18; }
          100% { transform: translateX(18%); opacity: 0; }
        }
        @keyframes hdr-title-sweep {
          0% { transform: translateX(-110%); opacity: 0; }
          35% { opacity: 0; }
          50% { opacity: .85; }
          65% { opacity: 0; }
          100% { transform: translateX(120%); opacity: 0; }
        }
      `}</style>

      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-40%,rgba(34,211,238,0.28),transparent_38%),radial-gradient(circle_at_18%_40%,rgba(22,163,255,0.12),transparent_36%),radial-gradient(circle_at_82%_32%,rgba(0,212,170,0.10),transparent_26%)]" />
      <div className="pointer-events-none absolute inset-x-[20%] top-0 h-full bg-[linear-gradient(90deg,transparent,rgba(74,228,255,0.12),transparent)]" style={{ animation: "hdr-scan 5.5s linear infinite" }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#68e6ff] to-transparent shadow-[0_0_20px_rgba(104,230,255,0.9)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#1ce1c2]/60 to-transparent" />
      <div className="pointer-events-none absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-[#29e4d4]/60" />
      <div className="pointer-events-none absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-[#29e4d4]/60" />

      <div className="relative flex h-full items-center justify-between gap-4 px-4">
        {/* Left: Logo + Brand + Project name */}
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`relative flex shrink-0 items-center justify-center rounded-[10px] bg-[radial-gradient(circle_at_50%_38%,rgba(36,229,217,0.18),rgba(7,25,34,0.9)_72%)] ${
              useCompactHeader ? "h-[38px] w-[38px]" : "h-[44px] w-[44px]"
            }`}
          >
            <EnerCloudMark
              className={useCompactHeader ? "h-[18px] w-[18px] text-[#f7fafc]" : "h-[22px] w-[22px] text-[#f7fafc]"}
              glowClassName="text-[#24e5d9]/28"
            />
          </div>

          <div>
            <h1
              className="font-black leading-tight"
              style={{
                fontSize: useCompactHeader ? "1.1rem" : "1.3rem",
                letterSpacing: "0.05em",
                fontFamily: '"Arial Black","Segoe UI","Microsoft YaHei UI","Microsoft YaHei",sans-serif',
                backgroundImage: "linear-gradient(180deg,#f8feff 0%,#d6f9ff 45%,#7effd7 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 14px rgba(60,223,255,0.4))",
              }}
            >
              EnerCloud
            </h1>
            {hasProject && (
              <div className="mt-0.5 truncate text-[10px] tracking-[0.04em] text-[#3a7a96]" style={{ maxWidth: "260px" }}>
                {projectLabel}
              </div>
            )}
          </div>
        </div>

        {/* Right: Back to Map + Language + Logout */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Back to map */}
          <button
            type="button"
            onClick={() => router.push("/project-map")}
            className={`relative flex items-center gap-1.5 overflow-hidden border border-[#1a4a62]/70 bg-[linear-gradient(180deg,rgba(6,22,38,0.96),rgba(3,12,24,0.98))] px-3 text-[#4a9ab8] transition-all hover:border-[#26f0dc]/50 hover:text-[#26f0dc] ${
              useCompactHeader ? "h-[28px]" : "h-[30px]"
            }`}
            style={{ clipPath: "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)" }}
            title={zh ? "返回项目地图" : "Back to Map"}
          >
            <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#26f0dc]/30 to-transparent" />
            <Map className="h-[12px] w-[12px] shrink-0" />
            <span className="text-[11px] font-semibold tracking-[0.06em]">
              {zh ? "切换项目" : "Projects"}
            </span>
          </button>

          {/* Language switcher */}
          <div
            className={`relative flex items-center overflow-hidden ${useCompactHeader ? "h-[28px]" : "h-[30px]"}`}
            style={{
              clipPath: "polygon(0% 0%,calc(100% - 8px) 0%,100% 100%,0% 100%)",
              border: "1px solid rgba(53,188,245,0.4)",
              background: "linear-gradient(180deg,rgba(9,29,48,0.98),rgba(4,17,31,0.98))",
            }}
          >
            <span className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-[#6ee9ff]/70 to-transparent" />
            <div className="flex items-center px-2">
              <Globe className="h-[12px] w-[12px] text-[#62dfff]" />
            </div>
            <div className="h-3.5 w-px bg-[#38cfff]/30" />
            {(["zh", "en"] as const).map((lang) => {
              const isActive = language === lang
              return (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`relative px-2.5 text-[11px] font-bold tracking-[0.08em] transition-all ${
                    isActive ? "text-[#26f0dc]" : "text-[#5a7f95] hover:text-[#9feeff]"
                  }`}
                  style={isActive ? { textShadow: "0 0 10px rgba(38,240,220,0.8)" } : undefined}
                >
                  {lang === "zh" ? "中" : "EN"}
                </button>
              )
            })}
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            className={`relative flex items-center gap-1.5 overflow-hidden border border-[#7a3942]/70 bg-[linear-gradient(180deg,rgba(46,14,24,0.96),rgba(24,8,14,0.98))] px-3 text-[#ffd7dd] transition-all hover:border-[#ff6d88]/70 hover:text-white disabled:opacity-50 ${
              useCompactHeader ? "h-[28px]" : "h-[30px]"
            }`}
            style={{ clipPath: "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)" }}
            aria-label={logoutLabel}
          >
            <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#ff9fb2]/60 to-transparent" />
            <LogOut className="h-[12px] w-[12px] shrink-0" />
            <span className="text-[11px] font-semibold tracking-[0.06em]">{logoutLabel}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
