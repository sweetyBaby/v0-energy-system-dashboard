import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps"
import type { LucideIcon } from "lucide-react"
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Clock3,
  Hammer,
  Layers3,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react"
import { DashboardHeaderShell } from "@/components/dashboard/dashboard-header-shell"
import { DashboardTopControls } from "@/components/dashboard/dashboard-top-controls"
import { HeaderInfoBar } from "@/components/dashboard/header-info-bar"
import { NavBrand } from "@/components/dashboard/nav-brand"
import { useLanguage } from "@/components/language-provider"
import { useDashboardViewport } from "@/hooks/use-dashboard-viewport"
import { logoutWithCloud } from "@/lib/api/auth"
import { clearStoredAuthToken } from "@/lib/auth-storage"
import { fetchProjectOptionsByDevice, fetchProjectRealtime, type ProjectOption } from "@/lib/api/project"

const GEO_URL = "/world-atlas.json"
const EXCLUDED_COUNTRY_NAMES = new Set(["Antarctica", "Fr. S. Antarctic Lands"])
const HOVER_EXIT_DELAY_MS = 220

type MapCoordinates = [number, number]
type LifecycleKey = "commissioned" | "construction" | "planned"

type GeographyFeature = {
  properties?: {
    name?: string
  }
  rsmKey: string
}

type FocusFrame = {
  center: MapCoordinates
  zoom: number
}

type StatCardItem = {
  key: string
  label: string
  value: string
  accent?: "green" | "neutral"
}

type LifecycleItem = {
  key: LifecycleKey
  icon: LucideIcon
  label: string
  value: string
  detail: string
}

type EfficiencyItem = {
  project: ProjectOption
  lifecycle: LifecycleKey
  score: number | null
  totalChargeMWh: number | null
  totalDischargeMWh: number | null
  combinedEnergyMWh: number
  isOnline: boolean
  powerKw: number | null
  socPercent: number | null
  runtimeLabelZh: string
  runtimeLabelEn: string
}

type EnergyRankingMode = "charge" | "discharge"

type ProjectCluster = {
  id: string
  coordinates: [number, number]
  projects: ProjectOption[]
}

type SectionHeadingProps = {
  icon: ReactNode
  title: string
  trailing?: string
}

type ProjectMapPanelProps = {
  onProjectSelect?: (project: ProjectOption) => void
}

const PANEL_CLASS =
  "rounded-[20px] border border-[#214b5f] bg-[linear-gradient(180deg,rgba(8,21,33,0.98),rgba(5,13,22,0.98))] shadow-[0_20px_40px_rgba(0,0,0,0.24)]"

const hasText = (value?: string | null) => typeof value === "string" && value.trim().length > 0

const getProjectName = (project: ProjectOption, zh: boolean) =>
  (zh ? project.projectName : project.projectNameEn || project.projectName).trim()

const formatPending = (zh: boolean) => (zh ? "待补全" : "Pending")

const formatIntegerCount = (value: number) => `${value}`

const formatMetricNumber = (value: number, digits = 0) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })

const formatPowerFromMw = (value: number | null, zh: boolean) => {
  if (value == null || Number.isNaN(value)) return formatPending(zh)
  return `${(value * 1000).toFixed(1)} kW`
}

const formatRealtimePower = (value: number | null, zh: boolean) => {
  if (value == null || Number.isNaN(value)) return formatPending(zh)
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)} kW`
}

const formatSoc = (value: number | null, zh: boolean) => {
  if (value == null || Number.isNaN(value)) return formatPending(zh)
  return `${value.toFixed(1)}%`
}

const formatEfficiency = (value: number | null) =>
  value == null || Number.isNaN(value) ? "--" : `${value.toFixed(2)}%`

const formatEnergySummary = (valueMWh: number | null, zh: boolean) => {
  if (valueMWh == null || Number.isNaN(valueMWh)) return formatPending(zh)
  return `${valueMWh.toFixed(valueMWh >= 100 ? 0 : 1)} MWh`
}

const parseRatedCapacityKWh = (value: string | null | undefined) => {
  if (!hasText(value)) return null

  const normalized = String(value).replace(/,/g, "").toUpperCase()
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(GWH|MWH|KWH)/)
  if (!match) return null

  const numericValue = Number(match[1])
  if (Number.isNaN(numericValue)) return null

  if (match[2] === "GWH") return numericValue * 1_000_000
  if (match[2] === "MWH") return numericValue * 1000
  return numericValue
}

const normalizeLifecycle = (project: ProjectOption): LifecycleKey => {
  const normalizedStatus = `${project.status ?? ""}`.trim().toLowerCase()

  if (normalizedStatus) {
    if (
      normalizedStatus.includes("已投") ||
      normalizedStatus.includes("投运") ||
      normalizedStatus.includes("并网") ||
      normalizedStatus.includes("运行") ||
      normalizedStatus.includes("运营") ||
      normalizedStatus.includes("online") ||
      normalizedStatus.includes("commission")
    ) {
      return "commissioned"
    }

    if (
      normalizedStatus.includes("在建") ||
      normalizedStatus.includes("建设") ||
      normalizedStatus.includes("施工") ||
      normalizedStatus.includes("construct") ||
      normalizedStatus.includes("building") ||
      normalizedStatus.includes("调试")
    ) {
      return "construction"
    }

    if (
      normalizedStatus.includes("待建") ||
      normalizedStatus.includes("规划") ||
      normalizedStatus.includes("储备") ||
      normalizedStatus.includes("计划") ||
      normalizedStatus.includes("planned") ||
      normalizedStatus.includes("plan")
    ) {
      return "planned"
    }
  }

  if (hasText(project.workingDate) || hasText(project.commissioningDate)) {
    return "commissioned"
  }

  return "planned"
}

const getLifecycleText = (lifecycle: LifecycleKey, zh: boolean) => {
  if (lifecycle === "commissioned") return zh ? "已投运" : "Commissioned"
  if (lifecycle === "construction") return zh ? "建设中" : "Construction"
  return zh ? "待建设" : "Planned"
}

const getLifecycleShortText = (lifecycle: LifecycleKey, zh: boolean) => {
  if (lifecycle === "commissioned") return zh ? "投运" : "Live"
  if (lifecycle === "construction") return zh ? "调试" : "Build"
  return zh ? "规划" : "Plan"
}

const getLifecycleStyles = (lifecycle: LifecycleKey) => {
  if (lifecycle === "commissioned") {
    return {
      badge: "border-[#2ff3cf]/28 bg-[rgba(17,95,82,0.24)] text-[#71ffef]",
      markerFill: "#2ef1df",
      markerStroke: "#dcfffb",
      ringStroke: "rgba(46,241,223,0.34)",
      bar: "from-[#1eead8] to-[#38e8cf]",
      dot: "bg-[#2ef1df]",
      shadow: "drop-shadow(0 0 12px rgba(46,241,223,0.38))",
    }
  }

  if (lifecycle === "construction") {
    return {
      badge: "border-[#ffbf52]/28 bg-[rgba(97,71,14,0.28)] text-[#ffc96e]",
      markerFill: "#ffb74b",
      markerStroke: "#fff0cb",
      ringStroke: "rgba(255,183,75,0.34)",
      bar: "from-[#ffc14d] to-[#ff9d3d]",
      dot: "bg-[#ffb74b]",
      shadow: "drop-shadow(0 0 12px rgba(255,183,75,0.42))",
    }
  }

  return {
    badge: "border-[#7aa6ff]/22 bg-[rgba(34,59,99,0.24)] text-[#9ac0ff]",
    markerFill: "#7aa6ff",
    markerStroke: "#eef5ff",
    ringStroke: "rgba(122,166,255,0.28)",
    bar: "from-[#77a4ff] to-[#4e8fff]",
    dot: "bg-[#7aa6ff]",
    shadow: "drop-shadow(0 0 10px rgba(122,166,255,0.34))",
  }
}

const getProjectDateLabel = (project: ProjectOption, zh: boolean) => {
  if (hasText(project.workingDate)) return project.workingDate!
  if (hasText(project.commissioningDate)) return project.commissioningDate!
  return zh ? "未登记" : "Not Set"
}

const getProjectCapacityLabel = (project: ProjectOption, zh: boolean) => {
  if (hasText(project.ratedCapacity)) return project.ratedCapacity!
  if (hasText(project.ratedPower)) return project.ratedPower!
  return formatPowerFromMw(project.installedCapacityMw, zh)
}

const getProjectRegionLabel = (project: ProjectOption, zh: boolean) =>
  project.region || (zh ? "未标注区域" : "Unspecified")

const clusterMappableProjects = (projects: ProjectOption[]): ProjectCluster[] => {
  const buckets = new Map<string, { firstCoords: [number, number]; projects: ProjectOption[] }>()
  for (const project of projects) {
    const lng = Math.round(project.longitude! * 100) / 100
    const lat = Math.round(project.latitude! * 100) / 100
    const key = `${lng}_${lat}`
    if (!buckets.has(key)) {
      buckets.set(key, { firstCoords: [project.longitude!, project.latitude!], projects: [] })
    }
    buckets.get(key)!.projects.push(project)
  }
  return Array.from(buckets.entries()).map(([key, { firstCoords, projects }]) => ({
    id: `cluster_${key}`,
    coordinates: firstCoords,
    projects,
  }))
}

// [minLng, minLat, maxLng, maxLat] bounding boxes for country detection
const COUNTRY_BBOX: Record<string, [number, number, number, number]> = {
  "China":        [73,  15, 136, 54],
  "Mongolia":     [87,  41, 120, 52],
  "Russia":       [27,  41, 180, 82],
  "India":        [68,   7,  97, 37],
  "Japan":        [122, 24, 146, 46],
  "South Korea":  [125, 33, 130, 39],
  "Australia":    [113, -44, 154, -10],
  "United States of America": [-170, 18, -66, 72],
  "Germany":      [6,  47,  15, 55],
  "Brazil":       [-74, -34, -34,  6],
}

const getFallbackFocusFrame = (): FocusFrame => ({
  center: [108, 35],
  zoom: 2.5,
})

const computeFocusFrame = (projects: ProjectOption[]): FocusFrame => {
  if (!projects.length) return getFallbackFocusFrame()

  const lngs = projects.map((p) => p.longitude!)
  const lats  = projects.map((p) => p.latitude!)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const minLat  = Math.min(...lats),  maxLat  = Math.max(...lats)
  const centerLng = (minLng + maxLng) / 2
  const centerLat  = (minLat  + maxLat)  / 2
  const span = Math.max(maxLng - minLng, maxLat - minLat)

  let zoom: number
  if (span < 1)  zoom = 6
  else if (span < 5)  zoom = 4
  else if (span < 15) zoom = 3
  else if (span < 35) zoom = 2
  else zoom = 1.5

  return { center: [centerLng, centerLat], zoom }
}

const toNumberOrNull = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) return null
  return value
}

const pickEfficiencyScore = (realtime: Awaited<ReturnType<typeof fetchProjectRealtime>>) =>
  toNumberOrNull(realtime?.all?.cumulativeEE) ??
  toNumberOrNull(realtime?.year?.cumulativeEE) ??
  toNumberOrNull(realtime?.month?.cumulativeEE) ??
  toNumberOrNull(realtime?.yesterday?.cumulativeEE)

const pickTotalChargeMWh = (realtime: Awaited<ReturnType<typeof fetchProjectRealtime>>) => {
  const totalWh = toNumberOrNull(realtime?.all?.totalChargeWh)
  if (totalWh != null) return totalWh / 1_000_000

  const fallback = toNumberOrNull(realtime?.totalChargeEnergy)
  return fallback != null ? fallback / 1000 : null
}

const pickTotalDischargeMWh = (realtime: Awaited<ReturnType<typeof fetchProjectRealtime>>) => {
  const totalWh = toNumberOrNull(realtime?.all?.totalDischargeWh)
  if (totalWh != null) return totalWh / 1_000_000

  const fallback = toNumberOrNull(realtime?.totalDischargeEnergy)
  return fallback != null ? fallback / 1000 : null
}

const pickRuntimeLabel = (project: ProjectOption, powerKw: number | null, isOnline: boolean, zh: boolean) => {
  const lifecycle = normalizeLifecycle(project)

  if (!isOnline) return zh ? "离线" : "Offline"
  if (lifecycle === "construction") return zh ? "调试中" : "Testing"
  if (lifecycle === "planned") return zh ? "待建设" : "Planned"
  if (powerKw != null && powerKw > 0.05) return zh ? "充电中" : "Charging"
  if (powerKw != null && powerKw < -0.05) return zh ? "放电中" : "Discharging"
  return zh ? "在线" : "Online"
}

function SectionHeading({ icon, title, trailing }: SectionHeadingProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-6.5 w-6.5 items-center justify-center rounded-[9px] border border-[#25576a] bg-[linear-gradient(180deg,rgba(11,31,44,0.95),rgba(8,20,31,0.96))] text-[#7ce8df] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {icon}
          </div>
          <span className="truncate text-[13px] font-bold tracking-[0.06em] text-[#f2fbff]">{title}</span>
        </div>
        {trailing ? <div className="text-[10px] font-medium tracking-[0.1em] text-[#71879b]">{trailing}</div> : null}
      </div>
      <div className="h-px w-full bg-[linear-gradient(90deg,rgba(54,222,214,0.55),rgba(54,222,214,0.08),transparent)]" />
    </div>
  )
}

export function ProjectMapPanel({ onProjectSelect }: ProjectMapPanelProps) {
  const router = useRouter()
  const { language } = useLanguage()
  const { isCompactWidth, isShortHeight } = useDashboardViewport()
  const zh = language === "zh"
  const useCompactHeader = isCompactWidth || isShortHeight

  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [efficiencyItems, setEfficiencyItems] = useState<EfficiencyItem[]>([])
  const [energyRankingMode, setEnergyRankingMode] = useState<EnergyRankingMode>("charge")
  const [hoveredClusterId, setHoveredClusterId] = useState<string | null>(null)
  const hoverExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHoverExitTimer = useCallback(() => {
    if (hoverExitTimerRef.current) {
      clearTimeout(hoverExitTimerRef.current)
      hoverExitTimerRef.current = null
    }
  }, [])

  const scheduleHoverExit = useCallback(() => {
    clearHoverExitTimer()
    hoverExitTimerRef.current = setTimeout(() => {
      setHoveredClusterId(null)
      setHoveredId(null)
      hoverExitTimerRef.current = null
    }, HOVER_EXIT_DELAY_MS)
  }, [clearHoverExitTimer])

  useEffect(() => {
    let cancelled = false

    const loadProjects = async () => {
      try {
        const options = await fetchProjectOptionsByDevice()
        if (!cancelled) setProjects(options)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadProjects()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!projects.length) {
      setEfficiencyItems([])
      setMetricsLoading(false)
      return
    }

    let cancelled = false
    setMetricsLoading(true)

    const loadEfficiencyItems = async () => {
      const nextItems = await Promise.all(
        projects.map(async (project) => {
          try {
            const realtime = await fetchProjectRealtime(project.projectId, project.devices)
            const lifecycle = normalizeLifecycle(project)
            const totalChargeMWh = pickTotalChargeMWh(realtime)
            const totalDischargeMWh = pickTotalDischargeMWh(realtime)
            const powerKw = toNumberOrNull(realtime?.power)
            const socPercent = toNumberOrNull(realtime?.soc)

            return {
              project,
              lifecycle,
              score: pickEfficiencyScore(realtime),
              totalChargeMWh,
              totalDischargeMWh,
              combinedEnergyMWh: (totalChargeMWh ?? 0) + (totalDischargeMWh ?? 0),
              isOnline: realtime != null,
              powerKw,
              socPercent,
              runtimeLabelZh: pickRuntimeLabel(project, powerKw, realtime != null, true),
              runtimeLabelEn: pickRuntimeLabel(project, powerKw, realtime != null, false),
            } satisfies EfficiencyItem
          } catch {
            return {
              project,
              lifecycle: normalizeLifecycle(project),
              score: null,
              totalChargeMWh: null,
              totalDischargeMWh: null,
              combinedEnergyMWh: 0,
              isOnline: false,
              powerKw: null,
              socPercent: null,
              runtimeLabelZh: "离线",
              runtimeLabelEn: "Offline",
            } satisfies EfficiencyItem
          }
        })
      )

      if (cancelled) return

      nextItems.sort((left, right) => {
        if ((right.score ?? -Infinity) !== (left.score ?? -Infinity)) {
          return (right.score ?? -Infinity) - (left.score ?? -Infinity)
        }
        return right.combinedEnergyMWh - left.combinedEnergyMWh
      })

      setEfficiencyItems(nextItems)
      setMetricsLoading(false)
    }

    void loadEfficiencyItems()

    return () => {
      cancelled = true
    }
  }, [projects])

  useEffect(() => {
    return () => {
      if (hoverExitTimerRef.current) {
        clearTimeout(hoverExitTimerRef.current)
      }
    }
  }, [])

  const mappableProjects = useMemo(
    () => projects.filter((project) => project.longitude != null && project.latitude != null),
    [projects]
  )

  const projectClusters = useMemo(() => clusterMappableProjects(mappableProjects), [mappableProjects])

  const activeCluster = useMemo(
    () => projectClusters.find((c) => c.id === hoveredClusterId) ?? null,
    [hoveredClusterId, projectClusters]
  )

  const totalInstalledMw = useMemo(
    () => projects.reduce((sum, project) => sum + (project.installedCapacityMw ?? 0), 0),
    [projects]
  )

  const totalDesignedCapacityKWh = useMemo(
    () => projects.reduce((sum, project) => sum + (parseRatedCapacityKWh(project.ratedCapacity) ?? 0), 0),
    [projects]
  )

  const onlineCount = useMemo(() => efficiencyItems.filter((item) => item.isOnline).length, [efficiencyItems])
  const offlineCount = Math.max(projects.length - onlineCount, 0)

  const totalChargeMWh = useMemo(
    () => efficiencyItems.reduce((sum, item) => sum + (item.totalChargeMWh ?? 0), 0),
    [efficiencyItems]
  )

  const totalDischargeMWh = useMemo(
    () => efficiencyItems.reduce((sum, item) => sum + (item.totalDischargeMWh ?? 0), 0),
    [efficiencyItems]
  )

  const averageEfficiency = useMemo(() => {
    const validItems = efficiencyItems.filter((item) => item.score != null)
    if (!validItems.length) return null
    return validItems.reduce((sum, item) => sum + (item.score ?? 0), 0) / validItems.length
  }, [efficiencyItems])

  const lifecycleCounts = useMemo(() => {
    return projects.reduce<Record<LifecycleKey, number>>(
      (counts, project) => {
        counts[normalizeLifecycle(project)] += 1
        return counts
      },
      { commissioned: 0, construction: 0, planned: 0 }
    )
  }, [projects])

  const hoveredProject = useMemo(
    () => projects.find((project) => project.id === hoveredId) ?? null,
    [hoveredId, projects]
  )

  const activeProject = hoveredProject
  const activeItem = useMemo(
    () => (activeProject ? efficiencyItems.find((item) => item.project.id === activeProject.id) ?? null : null),
    [activeProject, efficiencyItems]
  )

  const focusFrame = useMemo(() => computeFocusFrame(mappableProjects), [mappableProjects])
  const markerScale = focusFrame.zoom > 0 ? 1 / focusFrame.zoom : 1

  const highlightedCountries = useMemo(() => {
    const set = new Set<string>()
    for (const p of mappableProjects) {
      const lng = p.longitude!
      const lat = p.latitude!
      for (const [country, [minLng, minLat, maxLng, maxLat]] of Object.entries(COUNTRY_BBOX)) {
        if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
          set.add(country)
        }
      }
    }
    return set
  }, [mappableProjects])
  const topEfficiencyItems = useMemo(() => efficiencyItems.slice(0, 5), [efficiencyItems])

  const maxEfficiencyScore = useMemo(() => {
    const max = efficiencyItems.reduce((value, item) => Math.max(value, item.score ?? 0), 0)
    return max > 0 ? max : 1
  }, [efficiencyItems])

  const maxEnergyValue = useMemo(() => {
    const max = efficiencyItems.reduce(
      (value, item) => Math.max(value, item.totalChargeMWh ?? 0, item.totalDischargeMWh ?? 0),
      0
    )
    return max > 0 ? max : 1
  }, [efficiencyItems])

  const rankedEnergyItems = useMemo(() => {
    const getValue = (item: EfficiencyItem) =>
      energyRankingMode === "charge" ? item.totalChargeMWh ?? 0 : item.totalDischargeMWh ?? 0

    return [...efficiencyItems]
      .sort((left, right) => getValue(right) - getValue(left))
      .slice(0, 5)
  }, [efficiencyItems, energyRankingMode])

  const maxRankedEnergyValue = useMemo(() => {
    const max = rankedEnergyItems.reduce((value, item) => {
      const itemValue = energyRankingMode === "charge" ? item.totalChargeMWh ?? 0 : item.totalDischargeMWh ?? 0
      return Math.max(value, itemValue)
    }, 0)

    return max > 0 ? max : 1
  }, [energyRankingMode, rankedEnergyItems])

  const mapStatusLegend = useMemo(
    () => [
      { key: "commissioned" as const, label: zh ? "已投运" : "Commissioned" },
      { key: "construction" as const, label: zh ? "建设中" : "Construction" },
      { key: "planned" as const, label: zh ? "待建设" : "Planned" },
    ],
    [zh]
  )

  const statusCards = useMemo<StatCardItem[]>(
    () => [
      { key: "sites", label: zh ? "总站点" : "Sites", value: formatIntegerCount(projects.length), accent: "green" },
      { key: "online", label: zh ? "在线" : "Online", value: formatIntegerCount(onlineCount), accent: "green" },
      { key: "offline", label: zh ? "离线" : "Offline", value: formatIntegerCount(offlineCount), accent: "neutral" },
    ],
    [offlineCount, onlineCount, projects.length, zh]
  )

  const lifecycleItems = useMemo<LifecycleItem[]>(
    () => [
      {
        key: "construction",
        icon: Hammer,
        label: zh ? "在建项目" : "Building",
        value: formatIntegerCount(lifecycleCounts.construction),
        detail: zh ? "施工或调试阶段项目" : "Sites in construction or commissioning",
      },
      {
        key: "planned",
        icon: Clock3,
        label: zh ? "规划项目" : "Planned",
        value: formatIntegerCount(lifecycleCounts.planned),
        detail: zh ? "储备或规划中的项目" : "Pipeline and reserved sites",
      },
    ],
    [lifecycleCounts.construction, lifecycleCounts.planned, zh]
  )

  const handleMarkerClick = useCallback(
    (project: ProjectOption) => {
      if (onProjectSelect) {
        onProjectSelect(project)
        return
      }

      router.push(`/dashboard?projectId=${project.projectId}`)
    },
    [onProjectSelect, router]
  )

  const handleClusterClick = useCallback(
    (cluster: ProjectCluster) => {
      // Navigate to whichever project is currently shown in the detail card
      const target = cluster.projects.find((p) => p.id === hoveredId) ?? cluster.projects[0]
      handleMarkerClick(target)
    },
    [handleMarkerClick, hoveredId]
  )

  const handleClusterHover = useCallback(
    (cluster: ProjectCluster) => {
      clearHoverExitTimer()
      setHoveredClusterId(cluster.id)
      setHoveredId(cluster.projects[0].id)
    },
    [clearHoverExitTimer]
  )

  const handleClusterHoverEnd = useCallback(() => {
    scheduleHoverExit()
  }, [scheduleHoverExit])

  const handleProjectHover = useCallback((projectId: string | null) => {
    clearHoverExitTimer()
    setHoveredClusterId(null)
    setHoveredId(projectId)
  }, [clearHoverExitTimer])

  const handleProjectHoverEnd = useCallback(() => {
    scheduleHoverExit()
  }, [scheduleHoverExit])

  const handleProjectNavigate = useCallback(
    (project: ProjectOption) => {
      router.push(`/dashboard?projectId=${project.projectId}`)
    },
    [router]
  )

  // Switch the active project within a cluster card without touching cluster hover state
  const handleSelectProjectInCluster = useCallback((projectId: string) => {
    clearHoverExitTimer()
    setHoveredId(projectId)
  }, [clearHoverExitTimer])

  // Keep the card visible while the mouse is over it — just cancel the exit timer
  const handleCardMouseEnter = useCallback(() => {
    clearHoverExitTimer()
  }, [clearHoverExitTimer])

  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    try {
      await logoutWithCloud()
    } finally {
      clearStoredAuthToken()
      router.replace("/")
      router.refresh()
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#07111d] text-[#e6f4fb]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(41,213,216,0.16),transparent_26%),radial-gradient(circle_at_84%_14%,rgba(71,131,255,0.12),transparent_30%),linear-gradient(180deg,rgba(6,17,29,0.92),rgba(3,9,17,1))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(54,102,129,0.06)_1px,transparent_1px),linear-gradient(0deg,rgba(54,102,129,0.05)_1px,transparent_1px)] bg-[size:88px_88px]" />

      <DashboardHeaderShell compact={useCompactHeader}>
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <NavBrand compact={useCompactHeader} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HeaderInfoBar compact={useCompactHeader} />
          <DashboardTopControls compact={useCompactHeader} isLoggingOut={isLoggingOut} onLogout={handleLogout} />
        </div>
      </DashboardHeaderShell>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col p-2">
        <section className="relative min-h-0 flex-1 overflow-hidden rounded-[24px] border border-[#1b4c60] bg-[linear-gradient(180deg,rgba(4,15,27,0.99),rgba(2,9,18,1))] shadow-[0_26px_56px_rgba(0,0,0,0.28)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(42,230,227,0.12),transparent_18%),radial-gradient(circle_at_85%_75%,rgba(58,140,255,0.1),transparent_24%)]" />

          <div className="relative grid min-h-full gap-2 p-2 xl:h-full xl:grid-cols-[13.75rem_minmax(0,1fr)_14.25rem] 2xl:grid-cols-[14.25rem_minmax(0,1fr)_14.75rem]">
            <aside className="order-2 flex min-h-0 flex-col gap-2 xl:order-1 xl:overflow-y-hidden xl:pr-0.5">
              <div className={`${PANEL_CLASS} px-2.5 py-2`}>
                <SectionHeading icon={<Layers3 className="h-4 w-4" />} title={zh ? "项目状态" : "Project Status"} trailing={zh ? "实时汇总" : "LIVE"} />
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {statusCards.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-[14px] border border-[#244b60] bg-[linear-gradient(180deg,rgba(10,25,38,0.9),rgba(7,18,29,0.94))] px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    >
                      <div className="text-[10px] font-medium tracking-[0.06em] text-[#7f98ab]">{item.label}</div>
                      <div
                        className={`mt-1 text-[18px] font-black leading-none ${
                          item.accent === "green" ? "text-[#3de9d8]" : "text-[#edf6fb]"
                        }`}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {lifecycleItems.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-[14px] border border-[#21495e] bg-[rgba(8,20,31,0.72)] px-2.5 py-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex h-6.5 w-6.5 items-center justify-center rounded-[9px] bg-[linear-gradient(180deg,rgba(19,44,59,0.94),rgba(11,24,36,0.94))] text-[#8fe2dc]">
                          <item.icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-[16px] font-black leading-none text-white">{item.value}</div>
                      </div>
                      <div className="mt-0.5 text-[11px] font-semibold text-[#eef9ff]">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${PANEL_CLASS} px-2.5 py-2`}>
                <SectionHeading icon={<Zap className="h-4 w-4" />} title={zh ? "系统容量" : "System Capacity"} trailing={zh ? "额定值" : "RATED"} />
                <div className="mt-1.5 grid gap-1.5">
                  <div className="rounded-[14px] border border-[#244b60] bg-[linear-gradient(180deg,rgba(10,25,38,0.88),rgba(7,18,29,0.94))] px-2.5 py-1.5">
                    <div className="text-[11px] font-medium tracking-[0.06em] text-[#7f98ab]">{zh ? "装机功率" : "Installed Power"}</div>
                    <div className="mt-1 flex items-end gap-1">
                      <span className="text-[18px] font-black leading-none text-white">
                        {totalInstalledMw > 0 ? formatMetricNumber(totalInstalledMw * 1000, 1) : "0.0"}
                      </span>
                      <span className="pb-0.5 text-[12px] font-semibold text-[#42e8d8]">kW</span>
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-[#244b60] bg-[linear-gradient(180deg,rgba(10,25,38,0.88),rgba(7,18,29,0.94))] px-2.5 py-1.5">
                    <div className="text-[11px] font-medium tracking-[0.06em] text-[#7f98ab]">{zh ? "额定容量" : "Rated Capacity"}</div>
                    <div className="mt-1 flex items-end gap-1">
                      <span className="text-[18px] font-black leading-none text-white">
                        {totalDesignedCapacityKWh > 0 ? formatMetricNumber(totalDesignedCapacityKWh) : "0"}
                      </span>
                      <span className="pb-0.5 text-[12px] font-semibold text-[#42e8d8]">kWh</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${PANEL_CLASS} px-2.5 py-2`}>
                <SectionHeading icon={<TrendingUp className="h-4 w-4" />} title={zh ? "累计电量" : "Cumulative Energy"} trailing={zh ? "全量统计" : "TOTAL"} />
                <div className="mt-1.5 grid gap-1.5">
                  <div className="rounded-[14px] border border-[#1f5f62] bg-[linear-gradient(180deg,rgba(7,31,36,0.82),rgba(7,20,28,0.92))] px-2.5 py-2">
                    <div className="flex items-center gap-2 text-[#86e4dc]">
                      <ArrowUp className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium tracking-[0.06em]">{zh ? "累计充电" : "Total Charge"}</span>
                    </div>
                    <div className="mt-1 flex items-end gap-1">
                      <span className="text-[18px] font-black leading-none text-white">
                        {formatMetricNumber(totalChargeMWh, totalChargeMWh >= 100 ? 0 : 1)}
                      </span>
                      <span className="pb-0.5 text-[12px] font-semibold text-[#35e6d5]">MWh</span>
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-[#274e78] bg-[linear-gradient(180deg,rgba(10,25,47,0.82),rgba(7,16,30,0.94))] px-2.5 py-2">
                    <div className="flex items-center gap-2 text-[#9ac7ff]">
                      <ArrowDown className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium tracking-[0.06em]">{zh ? "累计放电" : "Total Discharge"}</span>
                    </div>
                    <div className="mt-1 flex items-end gap-1">
                      <span className="text-[18px] font-black leading-none text-white">
                        {formatMetricNumber(totalDischargeMWh, totalDischargeMWh >= 100 ? 0 : 1)}
                      </span>
                      <span className="pb-0.5 text-[12px] font-semibold text-[#5ea8ff]">MWh</span>
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-[#7a5a26] bg-[linear-gradient(180deg,rgba(54,38,13,0.48),rgba(28,19,6,0.6))] px-2.5 py-2">
                    <div className="flex items-center gap-2 text-[#e7c67a]">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="text-[11px] font-medium tracking-[0.06em]">{zh ? "综合效率" : "Average Efficiency"}</span>
                    </div>
                    <div className="mt-1 text-[17px] font-black leading-none text-[#ffd38a]">{formatEfficiency(averageEfficiency)}</div>
                  </div>
                </div>
              </div>
            </aside>

            <div className="order-1 relative min-h-[30rem] overflow-hidden rounded-[22px] border border-[#235b71]/55 bg-[linear-gradient(180deg,rgba(5,17,30,0.94),rgba(3,11,20,0.98))] xl:order-2 xl:min-h-0">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(28,81,111,0.28),transparent_62%)]" />
              <div className="absolute inset-0">
                <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 176 }} style={{ width: "100%", height: "100%" }}>
                  <ZoomableGroup center={focusFrame.center} zoom={focusFrame.zoom} minZoom={1} maxZoom={8}>
                    <Geographies geography={GEO_URL}>
                      {({ geographies }: { geographies: GeographyFeature[] }) =>
                        geographies
                          .filter((geo: GeographyFeature) => !EXCLUDED_COUNTRY_NAMES.has(geo.properties?.name ?? ""))
                          .map((geo: GeographyFeature) => {
                            const hasProject = highlightedCountries.has(geo.properties?.name ?? "")
                            return (
                              <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                style={{
                                  default: {
                                    fill: hasProject ? "#1b5068" : "#183549",
                                    stroke: hasProject ? "#3d94b4" : "#4a7a96",
                                    strokeWidth: hasProject ? 0.8 : 0.44,
                                    outline: "none",
                                    filter: hasProject ? "drop-shadow(0 0 6px rgba(46,196,220,0.22))" : "none",
                                  },
                                  hover: {
                                    fill: hasProject ? "#236080" : "#1e4560",
                                    stroke: "#7dd4e8",
                                    strokeWidth: 0.8,
                                    outline: "none",
                                    filter: hasProject ? "drop-shadow(0 0 8px rgba(46,196,220,0.32))" : "none",
                                  },
                                  pressed: {
                                    fill: "#1e4560",
                                    stroke: "#7dd4e8",
                                    strokeWidth: 0.8,
                                    outline: "none",
                                  },
                                }}
                              />
                            )
                          })
                      }
                    </Geographies>

                    {projectClusters.map((cluster) => {
                      const isClusterActive = hoveredClusterId === cluster.id

                      if (cluster.projects.length > 1) {
                        const regionName = cluster.projects[0].region || (zh ? "未标注" : "Unknown")
                        const regionLabelW = Math.max(26, Math.min(70, regionName.length * 7 + 10))

                        return (
                          <Marker
                            key={cluster.id}
                            coordinates={cluster.coordinates}
                            onClick={() => handleClusterClick(cluster)}
                            onMouseEnter={() => handleClusterHover(cluster)}
                            onMouseLeave={handleClusterHoverEnd}
                          >
                            <g transform={`scale(${markerScale})`}>
                              {/* Area halo — dashed ring to visually mark the region */}
                              <circle
                                r={isClusterActive ? 26 : 20}
                                fill="rgba(46,241,223,0.05)"
                                stroke="rgba(46,241,223,0.24)"
                                strokeWidth={0.8}
                                strokeDasharray="4 2.5"
                                style={{ transition: "all 0.3s ease" }}
                              />
                              {/* Outer ring */}
                              <circle
                                r={isClusterActive ? 14 : 10}
                                fill="transparent"
                                stroke="rgba(46,241,223,0.36)"
                                strokeWidth={isClusterActive ? 1.5 : 1.2}
                                opacity={isClusterActive ? 1 : 0.75}
                                style={{ transition: "all 0.2s ease" }}
                              />
                              {/* Badge */}
                              <circle
                                r={isClusterActive ? 9 : 7}
                                fill={isClusterActive ? "rgba(10,48,58,0.97)" : "rgba(7,30,40,0.94)"}
                                stroke={isClusterActive ? "#2ef1df" : "#1db8ae"}
                                strokeWidth={isClusterActive ? 1.4 : 1.1}
                                style={{ transition: "all 0.2s ease", filter: "drop-shadow(0 0 8px rgba(46,241,223,0.32))" }}
                              />
                              {/* Project count */}
                              <text
                                y={3}
                                textAnchor="middle"
                                style={{ fontSize: "8px", fontWeight: 900, fill: isClusterActive ? "#a8fff8" : "#6ee8df", letterSpacing: "0", transition: "all 0.2s ease" }}
                              >
                                {cluster.projects.length}
                              </text>
                              {/* Region name label chip below marker */}
                              <g transform={`translate(0 ${isClusterActive ? 18 : 13})`} style={{ transition: "all 0.2s ease" }}>
                                <rect
                                  x={-regionLabelW / 2}
                                  y={0}
                                  width={regionLabelW}
                                  height={12}
                                  rx={6}
                                  fill="rgba(4,14,24,0.90)"
                                  stroke={isClusterActive ? "rgba(46,241,223,0.55)" : "rgba(46,241,223,0.30)"}
                                  strokeWidth={0.7}
                                />
                                <text
                                  y={8.5}
                                  textAnchor="middle"
                                  style={{ fontSize: "7px", fontWeight: 700, fill: isClusterActive ? "#6ee8df" : "#4abfb4", letterSpacing: "0.06em" }}
                                >
                                  {regionName}
                                </text>
                              </g>
                            </g>
                          </Marker>
                        )
                      }

                      const project = cluster.projects[0]
                      const lifecycle = normalizeLifecycle(project)
                      const styles = getLifecycleStyles(lifecycle)
                      const isHovered = hoveredId === project.id
                      const isActive = isHovered
                      const projectLabel = getProjectRegionLabel(project, zh)
                      const labelWidth = Math.max(70, Math.min(140, projectLabel.length * 11 + 30))
                      const regionLabelW = Math.max(36, Math.min(90, projectLabel.length * 10 + 12))

                      return (
                        <Marker
                          key={cluster.id}
                          coordinates={cluster.coordinates}
                          onClick={() => handleClusterClick(cluster)}
                          onMouseEnter={() => handleProjectHover(project.id)}
                          onMouseLeave={handleProjectHoverEnd}
                        >
                          <g transform={`scale(${markerScale})`}>
                            <circle
                              r={isActive ? 10 : 7}
                              fill="transparent"
                              stroke={styles.ringStroke}
                              strokeWidth={isActive ? 1.5 : 1}
                              opacity={isActive ? 0.95 : 0.55}
                              style={{ transition: "all 0.2s ease" }}
                            />
                            <circle
                              r={isActive ? 5 : 3.5}
                              fill={styles.markerFill}
                              opacity={0.22}
                              style={{ transition: "all 0.2s ease", filter: styles.shadow }}
                            />
                            <circle
                              r={isActive ? 3.2 : 2.6}
                              fill={styles.markerFill}
                              stroke={styles.markerStroke}
                              strokeWidth={0.8}
                              style={{ transition: "all 0.2s ease", filter: styles.shadow }}
                            />
                            <circle
                              r={isActive ? 2 : 1.6}
                              fill="#f8ffff"
                              style={{ transition: "all 0.2s ease", filter: "drop-shadow(0 0 6px rgba(255,255,255,0.36))" }}
                            />

                            {/* Always-visible region label chip */}
                            {!isActive ? (
                              <g transform="translate(0 12)">
                                <rect
                                  x={-regionLabelW / 2}
                                  y={0}
                                  width={regionLabelW}
                                  height={14}
                                  rx={7}
                                  fill="rgba(4,14,24,0.82)"
                                  stroke={styles.ringStroke}
                                  strokeWidth={0.6}
                                />
                                <text
                                  y={10}
                                  textAnchor="middle"
                                  style={{ fontSize: "10px", fontWeight: 700, fill: styles.markerFill, opacity: 0.9, letterSpacing: "0.04em" }}
                                >
                                  {projectLabel}
                                </text>
                              </g>
                            ) : null}

                            {/* Hover callout above */}
                            {isActive ? (
                              <>
                                <line x1={0} y1={-5} x2={0} y2={-18} stroke={styles.markerFill} strokeWidth={1} opacity={0.9} />
                                <g transform="translate(8 -30)">
                                  <rect
                                    width={labelWidth}
                                    height={24}
                                    rx={12}
                                    fill="rgba(5,16,28,0.94)"
                                    stroke={styles.markerFill}
                                    strokeWidth={0.8}
                                  />
                                  <circle cx={12} cy={12} r={3} fill={styles.markerFill} />
                                  <text x={21} y={16} style={{ fontSize: "11px", fontWeight: 700, fill: "#effaff" }}>
                                    {projectLabel}
                                  </text>
                                </g>
                              </>
                            ) : null}
                          </g>
                        </Marker>
                      )
                    })}
                  </ZoomableGroup>
                </ComposableMap>
              </div>

              <div className="pointer-events-none absolute right-2.5 top-2.5 z-20 flex flex-col gap-1">
                {mapStatusLegend.map((item) => {
                  const accentColor = item.key === "commissioned" ? "#2ef1df" : item.key === "construction" ? "#ffb74b" : "#7aa6ff"
                  return (
                    <div
                      key={item.key}
                      className="flex items-center gap-1.5 px-2 py-1.5 backdrop-blur-[8px]"
                      style={{
                        background: "rgba(4,12,22,0.82)",
                        border: `1px solid ${accentColor}55`,
                        boxShadow: `inset 0 0 0 1px ${accentColor}18`,
                      }}
                    >
                      <div className="h-2 w-2 shrink-0" style={{ backgroundColor: accentColor }} />
                      <span className="text-[10px] font-bold tracking-[0.04em] text-[#e8f6ff]">{item.label}</span>
                    </div>
                  )
                })}
              </div>

              {activeProject ? (
                <div
                  className="absolute bottom-2.5 left-2.5 right-2.5 z-20 sm:right-auto sm:w-[18.5rem] lg:bottom-3 lg:left-3"
                  onMouseEnter={handleCardMouseEnter}
                  onMouseLeave={activeCluster ? handleClusterHoverEnd : handleProjectHoverEnd}
                >
                  <div className="overflow-hidden rounded-[20px] border border-[#294e62] bg-[linear-gradient(180deg,rgba(7,18,29,0.94),rgba(5,12,20,0.98))] shadow-[0_20px_44px_rgba(0,0,0,0.34)] backdrop-blur-[16px]">
                    {/* Cluster project switcher — only shown when multiple projects share this marker */}
                    {activeCluster && activeCluster.projects.length > 1 ? (
                      <div className="border-b border-[#1d3f52] px-3 pt-2.5 pb-2">
                        <div className="mb-2 text-[10px] font-medium tracking-[0.12em] text-[#5a8fa8]">
                          {activeCluster.projects[0].region || (zh ? "此区域" : "This Area")}
                          &nbsp;·&nbsp;{activeCluster.projects.length}{zh ? " 个项目" : " projects"}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {activeCluster.projects.map((p) => {
                            const isSelected = hoveredId === p.id
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectProjectInCluster(p.id)}
                                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all ${
                                  isSelected
                                    ? "border-[#2dd8ca] bg-[rgba(33,217,204,0.14)] text-[#4ffff3]"
                                    : "border-[#21455a] text-[#7faec2] hover:border-[#2b6f80] hover:text-[#dff9ff]"
                                }`}
                              >
                                {getProjectName(p, zh)}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
                    <div className="relative h-[5.5rem] overflow-hidden border-b border-[#23465b]">
                      {hasText(activeProject.picPath) ? (
                        <img
                          src={activeProject.picPath}
                          alt={getProjectName(activeProject, zh)}
                          className="h-full w-full object-cover opacity-72"
                        />
                      ) : (
                        <div className="h-full w-full bg-[radial-gradient(circle_at_30%_30%,rgba(56,193,216,0.36),transparent_35%),linear-gradient(135deg,#102635,#08131f)]" />
                      )}
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,12,20,0.14),rgba(5,12,20,0.88))]" />
                      <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
                        <div className="flex items-end justify-between gap-2.5">
                          <div className="min-w-0">
                            <div className="text-[11px] font-medium tracking-[0.14em] text-[#87cfc7]">{zh ? "项目预览" : "Project Preview"}</div>
                            <div className="mt-0.5 truncate text-[15px] font-black text-[#f6fbff]">
                              {getProjectName(activeProject, zh)}
                            </div>
                          </div>
                          <div
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.07em] ${
                              getLifecycleStyles(normalizeLifecycle(activeProject)).badge
                            }`}
                          >
                            {getLifecycleText(normalizeLifecycle(activeProject), zh)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 px-3 py-2.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="rounded-[13px] border border-[#21455a] bg-[rgba(9,21,33,0.78)] px-2.5 py-1.5">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#7f98ab]">{zh ? "区域" : "Region"}</div>
                          <div className="mt-0.5 truncate text-[12px] font-semibold text-[#f2fbff]">
                            {getProjectRegionLabel(activeProject, zh)}
                          </div>
                        </div>
                        <div className="rounded-[13px] border border-[#21455a] bg-[rgba(9,21,33,0.78)] px-2.5 py-1.5">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#7f98ab]">{zh ? "投运日期" : "Go-Live"}</div>
                          <div className="mt-0.5 truncate text-[12px] font-semibold text-[#f2fbff]">
                            {getProjectDateLabel(activeProject, zh)}
                          </div>
                        </div>
                        <div className="rounded-[13px] border border-[#21455a] bg-[rgba(9,21,33,0.78)] px-2.5 py-1.5">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#7f98ab]">{zh ? "额定容量" : "Rated Capacity"}</div>
                          <div className="mt-0.5 truncate text-[12px] font-semibold text-[#f2fbff]">
                            {getProjectCapacityLabel(activeProject, zh)}
                          </div>
                        </div>
                        <div className="rounded-[13px] border border-[#21455a] bg-[rgba(9,21,33,0.78)] px-2.5 py-1.5">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#7f98ab]">{zh ? "综合效率" : "Efficiency"}</div>
                          <div className="mt-0.5 truncate text-[12px] font-semibold text-[#f2fbff]">
                            {formatEfficiency(activeItem?.score ?? null)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="rounded-[13px] border border-[#1f5b5f] bg-[rgba(7,29,34,0.72)] px-2.5 py-1.5">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#83e8de]">{zh ? "当前状态" : "Current State"}</div>
                          <div className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-[#effaff]">
                            <CheckCircle2 className="h-4 w-4 text-[#3fe5d7]" />
                            <span>{zh ? activeItem?.runtimeLabelZh ?? "待补全" : activeItem?.runtimeLabelEn ?? "Pending"}</span>
                          </div>
                        </div>
                        <div className="rounded-[13px] border border-[#234f76] bg-[rgba(11,24,43,0.76)] px-2.5 py-1.5">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#97c8ff]">{zh ? "SOC / 功率" : "SOC / Power"}</div>
                          <div className="mt-0.5 text-[12px] font-semibold text-[#effaff]">
                            {formatSoc(activeItem?.socPercent ?? null, zh)} · {formatRealtimePower(activeItem?.powerKw ?? null, zh)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="rounded-[13px] border border-[#1f5b5f] bg-[rgba(7,29,34,0.72)] px-2.5 py-1.5">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#83e8de]">{zh ? "累计充电" : "Total Charge"}</div>
                          <div className="mt-0.5 text-[12px] font-semibold text-[#74f2e6]">
                            {formatEnergySummary(activeItem?.totalChargeMWh ?? null, zh)}
                          </div>
                        </div>
                        <div className="rounded-[13px] border border-[#234f76] bg-[rgba(11,24,43,0.76)] px-2.5 py-1.5">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#97c8ff]">{zh ? "累计放电" : "Total Discharge"}</div>
                          <div className="mt-0.5 text-[12px] font-semibold text-[#9fccff]">
                            {formatEnergySummary(activeItem?.totalDischargeMWh ?? null, zh)}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleProjectNavigate(activeProject)}
                        className="flex h-[2.125rem] w-full items-center justify-center gap-1.5 rounded-[13px] border border-[#2b6f80] bg-[linear-gradient(135deg,rgba(33,217,204,0.2),rgba(42,132,213,0.2))] text-[11px] font-semibold text-[#dff9ff] transition-all hover:border-[#54dce0] hover:text-white"
                      >
                        {zh ? "进入项目详情" : "Open Project Dashboard"}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {loading ? (
                <div className="absolute inset-x-4 bottom-4 z-20 rounded-[14px] border border-[#235e71]/50 bg-[rgba(7,20,30,0.88)] px-4 py-3 text-[13px] text-[#94b5c2] sm:left-auto sm:right-5 sm:top-24 sm:bottom-auto sm:w-72">
                  {zh ? "正在加载地图与项目数据..." : "Loading map and project data..."}
                </div>
              ) : null}
            </div>

            <aside className="order-3 flex min-h-0 flex-col gap-2 xl:overflow-y-auto xl:pr-0.5 xl:overscroll-contain custom-scrollbar">
              <div className={`${PANEL_CLASS} px-2.5 py-2`}>
                <SectionHeading icon={<Star className="h-4 w-4" />} title={zh ? "能效排行" : "Efficiency Ranking"} trailing={zh ? "综合效率" : "EE"} />
                <div className="mt-2 space-y-1.5">
                  {metricsLoading ? (
                    <div className="rounded-[14px] border border-[#245f72]/45 bg-[rgba(8,25,36,0.72)] px-3 py-4 text-[13px] text-[#92b5c2]">
                      {zh ? "正在加载能效排行..." : "Loading efficiency ranking..."}
                    </div>
                  ) : (
                    topEfficiencyItems.slice(0, 3).map((item, index) => {
                      const styles = getLifecycleStyles(item.lifecycle)
                      const efficiencyValue = item.score ?? 0
                      const progressWidth =
                        efficiencyValue <= 0 ? "0%" : `${Math.max(6, (efficiencyValue / maxEfficiencyScore) * 100)}%`

                      return (
                        <div key={item.project.id} className="rounded-[14px] border border-[#21475c] bg-[linear-gradient(180deg,rgba(9,22,35,0.78),rgba(7,18,28,0.92))] px-2 py-1.5">
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="min-w-0 flex items-start gap-2">
                              <div
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[9px] text-[10px] font-black ${
                                  index === 0
                                    ? "bg-[#ffcf4f] text-[#181818]"
                                    : index === 1
                                      ? "bg-[#d7dde4] text-[#181818]"
                                      : index === 2
                                        ? "bg-[#ce8a4b] text-white"
                                        : "bg-[#1d3d51] text-[#9bc8df]"
                                }`}
                              >
                                {index + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-semibold leading-[1.25] break-words text-[#eefcff]">{getProjectName(item.project, zh)}</div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-[#7f98ab]">
                                  <span>{getProjectRegionLabel(item.project, zh)}</span>
                                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${styles.badge}`}>
                                    {getLifecycleShortText(item.lifecycle, zh)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 text-[17px] font-black leading-none text-[#3de9d8]">
                              {formatEfficiency(efficiencyValue)}
                            </div>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#102636]">
                            <div
                              className={`h-full rounded-full bg-[linear-gradient(90deg,var(--tw-gradient-from),var(--tw-gradient-to))] ${styles.bar}`}
                              style={{ width: progressWidth }}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className={`${PANEL_CLASS} px-2.5 py-2.5`}>
                <SectionHeading icon={<ArrowUp className="h-4 w-4" />} title={zh ? "充放电排名" : "Charge / Discharge Ranking"} trailing="MWh" />

                <div className="mt-2 flex justify-end">
                  <div className="inline-grid grid-cols-[1fr_auto_1fr] items-stretch overflow-hidden rounded-[6px] border border-[#2d5778] bg-[linear-gradient(180deg,rgba(11,29,47,0.92),rgba(7,20,34,0.96))] shadow-[inset_0_1px_0_rgba(151,218,255,0.06)]">
                  <button
                    type="button"
                    onClick={() => setEnergyRankingMode("charge")}
                    className={`min-w-[50px] px-2 py-1 text-[10px] font-semibold tracking-[0.05em] transition-all ${
                      energyRankingMode === "charge"
                        ? "bg-[linear-gradient(180deg,rgba(29,95,154,0.84),rgba(13,49,96,0.96))] text-[#5ff1e6] shadow-[inset_0_1px_0_rgba(164,230,255,0.18),inset_0_-1px_0_rgba(6,18,34,0.56),inset_0_0_0_1px_rgba(118,219,255,0.16),0_0_12px_rgba(53,165,255,0.14)]"
                        : "bg-transparent text-[#86a1b6] hover:text-[#dff8ff]"
                    }`}
                  >
                    {zh ? "充电" : "Charge"}
                  </button>
                  <div className="w-px bg-[linear-gradient(180deg,rgba(124,183,215,0.08),rgba(74,125,158,0.44),rgba(124,183,215,0.08))]" />
                  <button
                    type="button"
                    onClick={() => setEnergyRankingMode("discharge")}
                    className={`min-w-[50px] px-2 py-1 text-[10px] font-semibold tracking-[0.05em] transition-all ${
                      energyRankingMode === "discharge"
                        ? "bg-[linear-gradient(180deg,rgba(29,95,154,0.84),rgba(13,49,96,0.96))] text-[#8ec0ff] shadow-[inset_0_1px_0_rgba(164,230,255,0.18),inset_0_-1px_0_rgba(6,18,34,0.56),inset_0_0_0_1px_rgba(118,219,255,0.16),0_0_12px_rgba(53,165,255,0.14)]"
                        : "bg-transparent text-[#86a1b6] hover:text-[#dff8ff]"
                    }`}
                  >
                    {zh ? "放电" : "Discharge"}
                  </button>
                  </div>
                </div>

                <div className="mt-2 grid gap-1.5">
                  {metricsLoading ? (
                    <div className="rounded-[14px] border border-[#245f72]/45 bg-[rgba(8,25,36,0.72)] px-3 py-4 text-[13px] text-[#92b5c2]">
                      {zh ? "正在加载充放电排名..." : "Loading energy ranking..."}
                    </div>
                  ) : (
                    rankedEnergyItems.map((item, index) => {
                      const rankingValue = energyRankingMode === "charge" ? item.totalChargeMWh ?? 0 : item.totalDischargeMWh ?? 0
                      const progressWidth = rankingValue <= 0 ? "0%" : `${Math.max(8, (rankingValue / maxRankedEnergyValue) * 100)}%`
                      const rankClass =
                        index === 0
                          ? "bg-[#ffcf4f] text-[#181818]"
                          : index === 1
                            ? "bg-[#d7dde4] text-[#181818]"
                            : index === 2
                              ? "bg-[#ce8a4b] text-white"
                              : "bg-[#1d3d51] text-[#9bc8df]"
                      const barClass =
                        energyRankingMode === "charge"
                          ? "bg-[linear-gradient(90deg,#2de8d9,#3cb7ff)]"
                          : "bg-[linear-gradient(90deg,#53bfff,#467bff)]"

                      return (
                        <div
                          key={item.project.id}
                          className="rounded-[14px] border border-[#21475c] bg-[linear-gradient(180deg,rgba(9,22,35,0.82),rgba(7,18,28,0.94))] px-2 py-1.5"
                        >
                          <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_3.75rem] items-center gap-2">
                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[9px] text-[10px] font-black ${rankClass}`}>
                              {index + 1}
                            </div>
                            <div className="min-w-0 text-[11px] font-semibold leading-[1.25] text-[#e4f4ff]">
                              {getProjectName(item.project, zh)}
                            </div>
                            <div className="text-right text-[10px] font-semibold text-[#d8e8f7]">{rankingValue.toFixed(1)}</div>
                          </div>
                          <div className="mt-1.5 pl-[2rem]">
                            <div className="h-1.5 overflow-hidden rounded-full bg-[#10263b]">
                              <div className={`h-full rounded-full ${barClass}`} style={{ width: progressWidth }} />
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  )
}
