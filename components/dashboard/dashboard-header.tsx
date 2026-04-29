"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, Globe, LogOut, Zap } from "lucide-react"
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

type DashboardHeaderTab = {
  key: string
  label: {
    zh: string
    en: string
  }
}

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

export function ProjectProvider({ children }: { children: React.ReactNode }) {
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

    const hasSelectedProject = projectOptions.some((project) => project.id === selectedProjectId)
    if (!hasSelectedProject) {
      setSelectedProjectId(projectOptions[0].id)
    }
  }, [projectOptions, selectedProjectId])

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

export function DashboardHeader({
  activeTab,
  onTabChange,
  tabs,
  compact = false,
}: {
  activeTab: string
  onTabChange: (tab: string) => void
  tabs: DashboardHeaderTab[]
  compact?: boolean
}) {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const { projectOptions, selectedProject, setSelectedProject, isProjectOptionsLoading, projectOptionsError, resetProjectState } =
    useProject()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { language, setLanguage } = useLanguage()
  const controlRef = useRef<HTMLDivElement>(null)
  const { isCompactWidth, isShortHeight } = useDashboardViewport()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const zh = language === "zh"
  const useCompactHeader = compact || isCompactWidth || isShortHeight
  const canSelectProject = projectOptions.length > 0
  const projectLabel = canSelectProject
    ? zh
      ? selectedProject.projectName
      : selectedProject.projectNameEn
    : isProjectOptionsLoading
      ? "Loading projects"
        : projectOptionsError
          ? "Failed to load projects"
          : "No projects"
  const logoutLabel = zh ? "退出登录" : "Logout"

  const handleLogout = async () => {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)

    try {
      await logoutWithCloud()
    } catch (error) {
      console.error("Failed to logout from backend", error)
    } finally {
      setDropdownOpen(false)
      resetProjectState()
      clearStoredAuthToken()
      router.replace("/")
      router.refresh()
      setIsLoggingOut(false)
    }
  }

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
    <header
      className={`relative z-30 shrink-0 overflow-visible border-b border-[#16344f] bg-[linear-gradient(180deg,#06111f_0%,#040b16_100%)] shadow-[0_12px_30px_rgba(0,0,0,0.32)] ${
        useCompactHeader ? "h-[64px] lg:h-[68px]" : "h-[68px] 2xl:h-[72px]"
      }`}
    >
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
      <div className="pointer-events-none absolute left-0 top-0 h-10 w-10 border-l-2 border-t-2 border-[#29e4d4]/70" />
      <div className="pointer-events-none absolute right-0 top-0 h-10 w-10 border-r-2 border-t-2 border-[#29e4d4]/70" />
      <div className="pointer-events-none absolute left-0 bottom-0 h-10 w-10 border-l-2 border-b-2 border-[#1ce1c2]/50" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-10 w-10 border-r-2 border-b-2 border-[#1ce1c2]/50" />
      <div className="pointer-events-none absolute left-0 top-0 h-1 w-1 bg-[#68e6ff] shadow-[0_0_8px_rgba(104,230,255,1)]" />
      <div className="pointer-events-none absolute right-0 top-0 h-1 w-1 bg-[#68e6ff] shadow-[0_0_8px_rgba(104,230,255,1)]" />

      {!useCompactHeader ? (
        <>
          <div className="pointer-events-none absolute left-[320px] right-[360px] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[#46dfff]/30 to-transparent" />
          <div className="pointer-events-none absolute left-[420px] right-[440px] top-1/2 h-[22px] -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(53,208,255,0.2),transparent_72%)]" />
        </>
      ) : null}

      <div
        className={`relative grid h-full items-center gap-2 px-3 sm:gap-3 sm:px-4 ${
          useCompactHeader
            ? "grid-cols-[minmax(204px,264px)_minmax(0,1fr)_auto] lg:grid-cols-[minmax(236px,316px)_minmax(0,1fr)_auto]"
            : "grid-cols-[minmax(236px,316px)_minmax(0,1fr)_auto] xl:grid-cols-[minmax(296px,388px)_minmax(0,1fr)_auto]"
        }`}
      >
        <div className="relative flex min-w-0 items-center gap-2 sm:gap-3">
          <div
            className={`relative flex shrink-0 items-center justify-center border border-[#27f0dd]/45 bg-[linear-gradient(180deg,rgba(7,45,54,0.98),rgba(4,20,28,0.98))] shadow-[0_0_18px_rgba(39,240,221,0.18),inset_0_0_0_1px_rgba(140,255,240,0.06)] ${
              useCompactHeader ? "h-[32px] w-[32px]" : "h-[36px] w-[36px]"
            }`}
            style={{ clipPath: "polygon(8px 0%,100% 0%,100% calc(100% - 8px),calc(100% - 8px) 100%,0% 100%,0% 8px)" }}
          >
            <span className="pointer-events-none absolute inset-x-[6px] top-[4px] h-px bg-gradient-to-r from-transparent via-[#8ffef0]/75 to-transparent" />
            <span className="pointer-events-none absolute inset-[4px] border border-[#8ffef0]/10" />
            <Zap
              className={useCompactHeader ? "h-[14px] w-[14px] text-[#27f0dd]" : "h-[16px] w-[16px] text-[#27f0dd]"}
              style={{ filter: "drop-shadow(0 0 6px rgba(39,240,221,0.7))" }}
            />
          </div>

          {!useCompactHeader ? (
            <div className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#15ffaf] shadow-[0_0_10px_rgba(21,255,175,0.8)]" style={{ animation: "hdr-pulse 1.9s ease-in-out infinite" }} />
          ) : null}

          <div
            className={`relative min-w-0 flex-1 overflow-hidden border border-[#235f7f]/70 bg-[linear-gradient(180deg,rgba(8,29,44,0.98),rgba(4,14,27,1))] pt-1.5 pb-2 shadow-[0_0_28px_rgba(18,94,132,0.16),inset_0_0_0_1px_rgba(126,220,255,0.05)] ${
              useCompactHeader ? "px-3" : "px-4"
            }`}
            style={{ clipPath: "polygon(12px 0%,100% 0%,calc(100% - 14px) 100%,0% 100%)" }}
          >
            <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#7de9ff]/70 to-transparent" />
            <span className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-[#20e1c4]/40 to-transparent" />
            <span className="pointer-events-none absolute left-3 top-1/2 h-10 w-32 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(103,232,249,0.18),transparent_72%)] blur-md" />
            <span className="pointer-events-none absolute right-5 top-1/2 h-12 w-28 -translate-y-1/2 bg-[radial-gradient(circle,rgba(70,223,255,0.12),transparent_72%)] blur-lg" />
            <div className="relative flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1
                  className={`relative whitespace-nowrap font-black leading-[1.04] ${
                    useCompactHeader
                      ? "text-[0.96rem] tracking-[0.08em] lg:text-[1.08rem] lg:tracking-[0.11em]"
                      : "text-[1.08rem] tracking-[0.1em] xl:text-[1.24rem] xl:tracking-[0.13em]"
                  }`}
                  style={{
                    fontFamily: '"Segoe UI Semibold","Microsoft YaHei UI","Microsoft YaHei",sans-serif',
                    color: "#effdff",
                    backgroundImage: "linear-gradient(180deg,#f8feff 0%,#d6f9ff 45%,#7effd7 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    textShadow: "0 0 14px rgba(111,236,255,0.34)",
                    filter: "drop-shadow(0 0 16px rgba(60,223,255,0.42)) drop-shadow(0 0 26px rgba(60,223,255,0.18))",
                  }}
                >
                  {zh ? "EnerCloud" : "EnerCloud"}
                </h1>
              </div>

              <div className="pointer-events-none flex shrink-0 items-center gap-2">
                <div className="hidden min-[280px]:flex flex-col items-end gap-1.5">
                  <span className="h-[2px] w-16 rounded-full bg-[linear-gradient(90deg,rgba(57,180,219,0),rgba(121,234,255,0.95),rgba(126,255,215,0.85))] shadow-[0_0_12px_rgba(94,235,255,0.35)]" />
                  <span className="h-[2px] w-11 rounded-full bg-[linear-gradient(90deg,rgba(57,180,219,0),rgba(121,234,255,0.78),rgba(126,255,215,0.65))]" />
                  <span className="h-[2px] w-7 rounded-full bg-[linear-gradient(90deg,rgba(57,180,219,0),rgba(121,234,255,0.52),rgba(126,255,215,0.45))]" />
                </div>
                <div
                  className={`relative overflow-hidden border border-[#2ecfdf]/28 bg-[linear-gradient(180deg,rgba(13,42,61,0.78),rgba(7,24,38,0.9))] shadow-[0_0_18px_rgba(51,202,255,0.12),inset_0_0_0_1px_rgba(125,243,255,0.06)] ${
                    useCompactHeader ? "h-4 w-6" : "h-[18px] w-7"
                  }`}
                  style={{ clipPath: "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)" }}
                >
                  <span className="absolute inset-x-1.5 top-0 h-px bg-gradient-to-r from-transparent via-[#8ef6ff]/70 to-transparent" />
                  <span className="absolute left-1.5 top-1/2 h-[3px] w-[3px] -translate-y-1/2 rounded-full bg-[#8ef6ff] shadow-[0_0_8px_rgba(142,246,255,0.9)]" />
                  <span className="absolute right-1.5 top-1/2 h-px w-2.5 -translate-y-1/2 bg-[linear-gradient(90deg,rgba(142,246,255,0.18),rgba(126,255,215,0.8))]" />
                </div>
              </div>
            </div>

            <div className="relative mt-1 h-[2px] w-full overflow-hidden rounded-full bg-[linear-gradient(90deg,rgba(34,64,95,0.14),rgba(41,123,174,0.6),rgba(65,230,214,0.34),rgba(34,64,95,0.08))]">
              <span
                className="absolute inset-y-0 w-[24%] bg-[linear-gradient(90deg,transparent,rgba(169,244,255,0.95),transparent)]"
                style={{ animation: "hdr-title-sweep 3.8s ease-in-out infinite" }}
              />
              <span className="absolute right-[16%] top-1/2 h-[4px] w-[4px] -translate-y-1/2 rounded-full bg-[#88fbff] shadow-[0_0_10px_rgba(136,251,255,0.9)]" />
              <span className="absolute right-[8%] top-1/2 h-[4px] w-[4px] -translate-y-1/2 rounded-full bg-[#58ffd0] shadow-[0_0_10px_rgba(88,255,208,0.8)]" />
            </div>
          </div>
        </div>

        <div className="relative min-w-0">
          <div
            className={`relative flex items-center overflow-hidden border border-[#2a6688]/72 bg-[linear-gradient(180deg,rgba(9,28,44,0.98),rgba(4,14,28,1))] px-1.5 shadow-[0_0_28px_rgba(36,204,255,0.12),inset_0_0_0_1px_rgba(129,224,255,0.04)] sm:px-2 ${
              useCompactHeader ? "h-[36px] lg:h-[38px]" : "h-[40px] sm:h-[42px]"
            }`}
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
                    className={`group relative shrink-0 whitespace-nowrap font-semibold transition-all ${
                      useCompactHeader ? "h-[26px] px-2 sm:h-[28px] sm:px-2.5" : "h-[28px] px-2.5 sm:h-[30px] sm:px-3 xl:h-[32px] xl:px-3.5"
                    } ${
                      isActive
                        ? "border border-[#2cead7]/60 bg-[linear-gradient(180deg,rgba(12,102,122,0.96),rgba(7,48,67,0.94))] text-[#e8ffff] shadow-[0_0_18px_rgba(44,234,215,0.2),inset_0_0_0_1px_rgba(139,255,247,0.12)]"
                        : "border border-[#163d59]/55 bg-[linear-gradient(180deg,rgba(8,24,39,0.86),rgba(4,14,26,0.88))] text-[#8fb7cb] hover:border-[#2a88ad]/55 hover:text-[#d9f7ff]"
                    }`}
                    style={{
                      fontSize: useCompactHeader
                        ? zh
                          ? "clamp(10px, 0.3vw + 8px, 13px)"
                          : "clamp(9px, 0.28vw + 7.5px, 12px)"
                        : zh
                          ? "clamp(11px, 0.36vw + 9px, 15px)"
                          : "clamp(10px, 0.34vw + 8.5px, 14px)",
                      letterSpacing: zh ? "0.08em" : "0.04em",
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
            className={`relative hidden items-center 2xl:flex ${useCompactHeader ? "h-[30px] gap-2 px-3" : "h-[36px] gap-2.5 px-3.5"}`}
            style={{
              clipPath: "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)",
              border: "1px solid rgba(53,188,245,0.34)",
              background: "linear-gradient(180deg,rgba(9,29,48,0.96),rgba(4,17,31,0.98))",
              boxShadow: "0 0 18px rgba(56,207,255,0.08), inset 0 0 0 1px rgba(129,224,255,0.05)",
            }}
          >
            <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#6ee9ff]/75 to-transparent" />
            <span className={`${useCompactHeader ? "h-1.5 w-1.5" : "h-2 w-2"} rounded-full bg-[#15ffaf] shadow-[0_0_8px_rgba(21,255,175,0.85)]`} />
            <span
              className="font-mono tabular-nums tracking-[0.12em] text-[#7de6ff]"
              style={{ fontSize: useCompactHeader ? "11px" : "clamp(12px, 0.34vw + 8px, 15px)" }}
            >
              {currentTime ? formatDate(currentTime) : "----/--/-- --:--:--"}
            </span>
          </div>

          <div
            className={`relative ${
              zh
                ? useCompactHeader
                  ? "w-[178px] sm:w-[208px] lg:w-[228px]"
                  : "w-[220px] sm:w-[252px] xl:w-[292px]"
                : useCompactHeader
                  ? "w-[200px] sm:w-[232px] lg:w-[256px]"
                  : "w-[238px] sm:w-[272px] xl:w-[320px]"
            }`}
          >
            <button
              onClick={() => {
                if (!canSelectProject) {
                  return
                }

                setDropdownOpen((prev) => !prev)
              }}
              className={`group relative flex w-full items-center justify-between gap-2 border border-[#225d7a]/75 bg-[linear-gradient(180deg,rgba(7,24,39,0.96),rgba(4,13,25,0.98))] px-3 text-left shadow-[0_0_18px_rgba(56,207,255,0.08),inset_0_0_0_1px_rgba(126,220,255,0.04)] transition-all ${
                canSelectProject
                  ? "hover:border-[#38cfff]/70 hover:shadow-[0_0_22px_rgba(56,207,255,0.18),inset_0_0_0_1px_rgba(126,220,255,0.08)]"
                  : "cursor-default opacity-75"
              } ${useCompactHeader ? "h-[30px]" : "h-[32px]"}`}
              style={{ clipPath: "polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)" }}
              aria-expanded={canSelectProject ? dropdownOpen : false}
              title={projectLabel}
              aria-label={zh ? "切换项目" : "Switch project"}
            >
              <span className="pointer-events-none absolute left-[10px] top-0 h-full w-px bg-gradient-to-b from-[#1df2d7]/0 via-[#1df2d7]/35 to-[#1df2d7]/0" />
              <span className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-[#3bd2ff]/60 to-transparent" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[10.5px] font-semibold tracking-[0.02em] text-[#e7fbff] sm:text-[11.5px] sm:tracking-[0.04em] xl:text-[12px] xl:tracking-[0.05em]" style={{ textShadow: "0 0 12px rgba(104,230,255,0.35)" }}>
                  {projectLabel}
                </div>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#68dfff] transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && canSelectProject && (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-full overflow-hidden rounded-[12px] border border-[#2a6d8e]/70 bg-[linear-gradient(180deg,rgba(4,16,30,0.98),rgba(2,10,20,0.98))] shadow-[0_16px_48px_rgba(0,0,0,0.56),0_0_24px_rgba(40,180,255,0.08)]">
                <div className="h-px bg-gradient-to-r from-transparent via-[#50dcff]/70 to-transparent" />
                {projectOptions.map((project) => {
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
                      <span className="truncate" title={zh ? project.projectName : project.projectNameEn}>{zh ? project.projectName : project.projectNameEn}</span>
                      {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div
            className={`relative flex items-center overflow-hidden ${useCompactHeader ? "h-[30px]" : "h-[32px]"}`}
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

          <button
            type="button"
            onClick={() => {
              void handleLogout()
            }}
            className={`relative flex items-center gap-1.5 overflow-hidden border border-[#7a3942]/75 bg-[linear-gradient(180deg,rgba(46,14,24,0.96),rgba(24,8,14,0.98))] px-3 text-[#ffd7dd] shadow-[0_0_18px_rgba(255,93,122,0.1),inset_0_0_0_1px_rgba(255,180,194,0.05)] transition-all hover:border-[#ff6d88]/70 hover:text-white hover:shadow-[0_0_22px_rgba(255,109,136,0.18),inset_0_0_0_1px_rgba(255,180,194,0.08)] ${
              useCompactHeader ? "h-[30px]" : "h-[32px]"
            }`}
            style={{ clipPath: "polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)" }}
            aria-label={logoutLabel}
            disabled={isLoggingOut}
          >
            <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#ff9fb2]/65 to-transparent" />
            <LogOut className="h-[13px] w-[13px] shrink-0" />
            <span className="text-[12px] font-semibold tracking-[0.06em]">{logoutLabel}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
