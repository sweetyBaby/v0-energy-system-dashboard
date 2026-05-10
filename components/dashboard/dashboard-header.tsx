"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, Map } from "lucide-react"
import { DashboardHeaderShell } from "@/components/dashboard/dashboard-header-shell"
import { DashboardTopControls } from "@/components/dashboard/dashboard-top-controls"
import { NavBrand } from "@/components/dashboard/nav-brand"
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
  status: null,
  ratedPower: null,
  ratedCapacity: null,
  commissioningDate: null,
  workingDate: null,
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
  const { projectOptions, selectedProject, setSelectedProject, isProjectOptionsLoading, projectOptionsError, resetProjectState } = useProject()
  const { language } = useLanguage()
  const { isCompactWidth, isShortHeight } = useDashboardViewport()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false)
  const projectMenuRef = useRef<HTMLDivElement | null>(null)
  const zh = language === "zh"
  const useCompactHeader = compact || isCompactWidth || isShortHeight
  const hasProject = !!selectedProject.projectId
  const projectLabel = hasProject
    ? zh ? selectedProject.projectName : selectedProject.projectNameEn || selectedProject.projectName
    : isProjectOptionsLoading
      ? zh ? "加载中..." : "Loading..."
      : projectOptionsError
        ? zh ? "加载失败" : "Load failed"
        : zh ? "暂无项目" : "No projects"
  const backToMapHref = hasProject
    ? `/project-map?projectId=${encodeURIComponent(selectedProject.projectId)}`
    : "/project-map"
  const headerEyebrow = zh ? "项目运行中枢" : "PROJECT COMMAND"
  const headerSubtitle = hasProject
    ? [selectedProject.region, selectedProject.company].filter(Boolean).join(" / ") || (zh ? "实时运行总览" : "Realtime Operations Overview")
    : zh ? "实时运行总览" : "Realtime Operations Overview"

  useEffect(() => {
    if (!isProjectMenuOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!projectMenuRef.current?.contains(event.target as Node)) {
        setIsProjectMenuOpen(false)
      }
    }

    window.addEventListener("mousedown", handlePointerDown)
    return () => window.removeEventListener("mousedown", handlePointerDown)
  }, [isProjectMenuOpen])

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
    <DashboardHeaderShell compact={useCompactHeader}>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <NavBrand compact={useCompactHeader} />

      
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div ref={projectMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProjectMenuOpen((current) => !current)}
            className={`relative flex min-w-[14rem] max-w-[20rem] items-center justify-between gap-3 overflow-hidden rounded-[16px] border border-[#294960] bg-[linear-gradient(180deg,rgba(10,23,38,0.96),rgba(6,14,25,0.98))] px-4 text-left text-[#e7f8ff] shadow-[0_0_0_1px_rgba(117,198,234,0.05)_inset,0_12px_26px_rgba(0,0,0,0.18)] transition-all hover:border-[#4d8dae] ${
              useCompactHeader ? "h-[36px]" : "h-[40px]"
            }`}
            aria-haspopup="menu"
            aria-expanded={isProjectMenuOpen}
          >
            <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#9deeff]/70 to-transparent" />
            <span className="truncate text-sm font-semibold" title={projectLabel}>
              {projectLabel}
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-[#8de7f5] transition-transform ${isProjectMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {isProjectMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+0.6rem)] z-40 min-w-[16rem] overflow-hidden rounded-[18px] border border-[#284e65] bg-[linear-gradient(180deg,rgba(8,22,36,0.98),rgba(4,12,21,0.99))] shadow-[0_24px_48px_rgba(0,0,0,0.42),0_0_0_1px_rgba(104,230,255,0.06)_inset]">
              <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#8deeff]/68 to-transparent" />
              {projectOptions.map((project) => {
                const optionLabel = zh ? project.projectName : project.projectNameEn || project.projectName
                const isActive = selectedProject.id === project.id

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      setSelectedProject(project)
                      setIsProjectMenuOpen(false)
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-[linear-gradient(90deg,rgba(18,68,94,0.72),rgba(11,34,52,0.5))] text-[#6af6ef]"
                        : "text-[#d9ecff] hover:bg-[rgba(15,52,74,0.34)]"
                    }`}
                  >
                    <span className="truncate font-semibold">{optionLabel}</span>
                    {isActive ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <DashboardTopControls
          compact={useCompactHeader}
          action={{
            icon: Map,
            labelZh: "项目地图",
            labelEn: "Project Map",
            onClick: () => router.push(backToMapHref),
          }}
          isLoggingOut={isLoggingOut}
          onLogout={() => void handleLogout()}
        />
      </div>
    </DashboardHeaderShell>
  )
}
