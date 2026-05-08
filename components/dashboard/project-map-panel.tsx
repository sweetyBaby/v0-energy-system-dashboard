import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Hammer,
  Layers3,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react"
import { EnerCloudMark } from "@/components/brand/enercloud-mark"
import { DashboardTopControls } from "@/components/dashboard/dashboard-top-controls"
import { useLanguage } from "@/components/language-provider"
import { logoutWithCloud } from "@/lib/api/auth"
import { clearStoredAuthToken } from "@/lib/auth-storage"
import { fetchProjectOptionsByDevice, fetchProjectRealtime, type ProjectOption } from "@/lib/api/project"

const GEO_URL = "/world-atlas.json"
const EXCLUDED_COUNTRY_NAMES = new Set(["Antarctica", "Fr. S. Antarctic Lands"])

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

const getFallbackFocusFrame = (): FocusFrame => ({
  center: [12, 16],
  zoom: 1.02,
})

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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#25576a] bg-[linear-gradient(180deg,rgba(11,31,44,0.95),rgba(8,20,31,0.96))] text-[#7ce8df] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {icon}
          </div>
          <span className="truncate text-[15px] font-bold tracking-[0.08em] text-[#f2fbff]">{title}</span>
        </div>
        {trailing ? <div className="text-[11px] font-medium tracking-[0.12em] text-[#71879b]">{trailing}</div> : null}
      </div>
      <div className="h-px w-full bg-[linear-gradient(90deg,rgba(54,222,214,0.55),rgba(54,222,214,0.08),transparent)]" />
    </div>
  )
}

export function ProjectMapPanel({ onProjectSelect }: ProjectMapPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const zh = language === "zh"
  const restoreProjectId = searchParams.get("projectId")

  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [efficiencyItems, setEfficiencyItems] = useState<EfficiencyItem[]>([])

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
    if (!restoreProjectId || !projects.length) return

    const restoredProject = projects.find((project) => project.projectId === restoreProjectId)
    if (restoredProject) {
      setSelectedId(restoredProject.id)
      setHoveredId(restoredProject.id)
    }
  }, [projects, restoreProjectId])

  useEffect(() => {
    if (restoreProjectId || selectedId || !projects.length) return

    const initialProject = projects.find((project) => project.longitude != null && project.latitude != null) ?? projects[0]
    setSelectedId(initialProject.id)
  }, [projects, restoreProjectId, selectedId])

  const mappableProjects = useMemo(
    () => projects.filter((project) => project.longitude != null && project.latitude != null),
    [projects]
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

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? null,
    [projects, selectedId]
  )

  const activeProject = hoveredProject ?? selectedProject
  const activeItem = useMemo(
    () => (activeProject ? efficiencyItems.find((item) => item.project.id === activeProject.id) ?? null : null),
    [activeProject, efficiencyItems]
  )

  const focusFrame = useMemo(() => getFallbackFocusFrame(), [])
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

      setSelectedId((prev) => (prev === project.id ? null : project.id))
      setHoveredId(project.id)
    },
    [onProjectSelect]
  )

  const handleProjectHover = useCallback((projectId: string | null) => {
    setHoveredId(projectId)
  }, [])

  const handleProjectNavigate = useCallback(
    (project: ProjectOption) => {
      router.push(`/dashboard?projectId=${project.projectId}`)
    },
    [router]
  )

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
    <div className="relative flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden bg-[#07111d] text-[#e6f4fb]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(41,213,216,0.16),transparent_26%),radial-gradient(circle_at_84%_14%,rgba(71,131,255,0.12),transparent_30%),linear-gradient(180deg,rgba(6,17,29,0.92),rgba(3,9,17,1))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(54,102,129,0.06)_1px,transparent_1px),linear-gradient(0deg,rgba(54,102,129,0.05)_1px,transparent_1px)] bg-[size:88px_88px]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col p-4">
        <header className="relative shrink-0 overflow-hidden rounded-[22px] border border-[#1c4357] bg-[linear-gradient(180deg,rgba(6,16,28,0.98),rgba(4,10,18,0.98))] px-5 py-4 shadow-[0_18px_36px_rgba(0,0,0,0.24)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#66ece1] to-transparent" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-[#1d596a] bg-[radial-gradient(circle_at_50%_40%,rgba(43,239,217,0.22),rgba(6,22,32,0.94)_72%)] shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
                <EnerCloudMark className="h-5 w-5 text-[#f7fafc]" glowClassName="text-[#28f1dc]/28" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1
                    className="text-[22px] font-black tracking-[0.04em]"
                    style={{
                      backgroundImage: "linear-gradient(180deg,#f7feff 0%,#ddfbff 52%,#77ffe1 100%)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {zh ? "全球项目地图" : "Global Project Map"}
                  </h1>
                  <span className="rounded-full border border-[#244b61] bg-[rgba(8,24,37,0.88)] px-3 py-1 text-[11px] font-medium tracking-[0.08em] text-[#85a4b8]">
                    {zh ? `${mappableProjects.length} / ${projects.length} 已定位` : `${mappableProjects.length} / ${projects.length} mapped`}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-[#7b95a8]">
                  {zh ? "聚焦项目分布、运行状态与关键能效指标" : "View site coverage, operating status, and performance signals in one place."}
                </p>
              </div>
            </div>

            <DashboardTopControls isLoggingOut={isLoggingOut} onLogout={handleLogout} />
          </div>
        </header>

        <section className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-[24px] border border-[#1b4c60] bg-[linear-gradient(180deg,rgba(4,15,27,0.99),rgba(2,9,18,1))] shadow-[0_26px_56px_rgba(0,0,0,0.28)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(42,230,227,0.12),transparent_18%),radial-gradient(circle_at_85%_75%,rgba(58,140,255,0.1),transparent_24%)]" />

          <div className="relative grid min-h-full gap-4 p-4 xl:h-full xl:grid-cols-[18rem_minmax(0,1fr)_18.5rem] 2xl:grid-cols-[19rem_minmax(0,1fr)_19.5rem]">
            <aside className="order-2 flex min-h-0 flex-col gap-4 xl:order-1">
              <div className={`${PANEL_CLASS} px-4 py-4`}>
                <SectionHeading icon={<Layers3 className="h-4 w-4" />} title={zh ? "项目状态" : "Project Status"} trailing={zh ? "实时汇总" : "LIVE"} />
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {statusCards.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-[16px] border border-[#244b60] bg-[linear-gradient(180deg,rgba(10,25,38,0.9),rgba(7,18,29,0.94))] px-3 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    >
                      <div className="text-[11px] font-medium tracking-[0.08em] text-[#7f98ab]">{item.label}</div>
                      <div
                        className={`mt-3 text-[30px] font-black leading-none ${
                          item.accent === "green" ? "text-[#3de9d8]" : "text-[#edf6fb]"
                        }`}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3">
                  {lifecycleItems.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center gap-3 rounded-[16px] border border-[#21495e] bg-[rgba(8,20,31,0.72)] px-3 py-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[linear-gradient(180deg,rgba(19,44,59,0.94),rgba(11,24,36,0.94))] text-[#8fe2dc]">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[14px] font-semibold text-[#eef9ff]">{item.label}</div>
                          <div className="text-[24px] font-black leading-none text-white">{item.value}</div>
                        </div>
                        <div className="mt-1 text-[12px] text-[#7f96aa]">{item.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${PANEL_CLASS} px-4 py-4`}>
                <SectionHeading icon={<Zap className="h-4 w-4" />} title={zh ? "系统容量" : "System Capacity"} trailing={zh ? "设计值" : "DESIGN"} />
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[16px] border border-[#244b60] bg-[linear-gradient(180deg,rgba(10,25,38,0.88),rgba(7,18,29,0.94))] p-4">
                    <div className="text-[12px] font-medium tracking-[0.08em] text-[#7f98ab]">{zh ? "装机功率" : "Installed Power"}</div>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-[34px] font-black leading-none text-white">
                        {totalInstalledMw > 0 ? formatMetricNumber(totalInstalledMw * 1000, 1) : "0.0"}
                      </span>
                      <span className="pb-1 text-[15px] font-semibold text-[#42e8d8]">kW</span>
                    </div>
                    <div className="mt-3 text-[12px] text-[#6f879b]">
                      {zh ? `${mappableProjects.length} 个项目具备地图坐标` : `${mappableProjects.length} sites currently placed on the map`}
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-[#244b60] bg-[linear-gradient(180deg,rgba(10,25,38,0.88),rgba(7,18,29,0.94))] p-4">
                    <div className="text-[12px] font-medium tracking-[0.08em] text-[#7f98ab]">{zh ? "设计容量" : "Designed Capacity"}</div>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-[34px] font-black leading-none text-white">
                        {totalDesignedCapacityKWh > 0 ? formatMetricNumber(totalDesignedCapacityKWh) : "0"}
                      </span>
                      <span className="pb-1 text-[15px] font-semibold text-[#42e8d8]">kWh</span>
                    </div>
                    <div className="mt-3 text-[12px] text-[#6f879b]">
                      {zh ? "按照项目额定参数汇总" : "Aggregated from project rated capacity fields"}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${PANEL_CLASS} px-4 py-4`}>
                <SectionHeading icon={<TrendingUp className="h-4 w-4" />} title={zh ? "累计电量" : "Cumulative Energy"} trailing={zh ? "全量统计" : "TOTAL"} />
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[16px] border border-[#1f5f62] bg-[linear-gradient(180deg,rgba(7,31,36,0.82),rgba(7,20,28,0.92))] p-4">
                    <div className="flex items-center gap-2 text-[#86e4dc]">
                      <ArrowUp className="h-4 w-4" />
                      <span className="text-[12px] font-medium tracking-[0.08em]">{zh ? "累计充电" : "Total Charge"}</span>
                    </div>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-[30px] font-black leading-none text-white">
                        {formatMetricNumber(totalChargeMWh, totalChargeMWh >= 100 ? 0 : 1)}
                      </span>
                      <span className="pb-1 text-[14px] font-semibold text-[#35e6d5]">MWh</span>
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-[#274e78] bg-[linear-gradient(180deg,rgba(10,25,47,0.82),rgba(7,16,30,0.94))] p-4">
                    <div className="flex items-center gap-2 text-[#9ac7ff]">
                      <ChevronDown className="h-4 w-4" />
                      <span className="text-[12px] font-medium tracking-[0.08em]">{zh ? "累计放电" : "Total Discharge"}</span>
                    </div>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-[30px] font-black leading-none text-white">
                        {formatMetricNumber(totalDischargeMWh, totalDischargeMWh >= 100 ? 0 : 1)}
                      </span>
                      <span className="pb-1 text-[14px] font-semibold text-[#5ea8ff]">MWh</span>
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-[#7a5a26] bg-[linear-gradient(180deg,rgba(54,38,13,0.48),rgba(28,19,6,0.6))] p-4">
                    <div className="flex items-center gap-2 text-[#e7c67a]">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-[12px] font-medium tracking-[0.08em]">{zh ? "综合效率" : "Average Efficiency"}</span>
                    </div>
                    <div className="mt-3 text-[28px] font-black leading-none text-[#ffd38a]">{formatEfficiency(averageEfficiency)}</div>
                  </div>
                </div>
              </div>
            </aside>

            <div className="order-1 relative min-h-[36rem] overflow-hidden rounded-[22px] border border-[#235b71]/55 bg-[linear-gradient(180deg,rgba(5,17,30,0.94),rgba(3,11,20,0.98))] xl:order-2 xl:min-h-0">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(28,81,111,0.28),transparent_62%)]" />
              <div className="absolute inset-0">
                <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 176 }} style={{ width: "100%", height: "100%" }}>
                  <ZoomableGroup center={focusFrame.center} zoom={focusFrame.zoom} minZoom={1} maxZoom={8}>
                    <Geographies geography={GEO_URL}>
                      {({ geographies }: { geographies: GeographyFeature[] }) =>
                        geographies
                          .filter((geo: GeographyFeature) => !EXCLUDED_COUNTRY_NAMES.has(geo.properties?.name ?? ""))
                          .map((geo: GeographyFeature) => (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              style={{
                                default: {
                                  fill: "#183549",
                                  stroke: "#5e87a0",
                                  strokeWidth: 0.54,
                                  outline: "none",
                                },
                                hover: {
                                  fill: "#224860",
                                  stroke: "#9be8ea",
                                  strokeWidth: 0.74,
                                  outline: "none",
                                },
                                pressed: {
                                  fill: "#224860",
                                  stroke: "#9be8ea",
                                  strokeWidth: 0.74,
                                  outline: "none",
                                },
                              }}
                            />
                          ))
                      }
                    </Geographies>

                    {mappableProjects.map((project) => {
                      const lifecycle = normalizeLifecycle(project)
                      const styles = getLifecycleStyles(lifecycle)
                      const isSelected = selectedId === project.id
                      const isHovered = hoveredId === project.id
                      const isActive = isSelected || isHovered
                      const projectLabel = getProjectRegionLabel(project, zh)
                      const labelWidth = Math.max(72, Math.min(156, projectLabel.length * 7 + 28))

                      return (
                        <Marker
                          key={project.id}
                          coordinates={[project.longitude!, project.latitude!]}
                          onClick={() => handleMarkerClick(project)}
                          onMouseEnter={() => handleProjectHover(project.id)}
                          onMouseLeave={() => handleProjectHover(null)}
                        >
                          <circle
                            r={isActive ? 18 : 13}
                            fill="transparent"
                            stroke={styles.ringStroke}
                            strokeWidth={isActive ? 2 : 1.3}
                            opacity={isActive ? 0.95 : 0.55}
                            style={{ transition: "all 0.2s ease" }}
                          />
                          <circle
                            r={isActive ? 8.5 : 6.3}
                            fill={styles.markerFill}
                            opacity={0.22}
                            style={{ transition: "all 0.2s ease", filter: styles.shadow }}
                          />
                          <circle
                            r={isActive ? 5.8 : 4.8}
                            fill={styles.markerFill}
                            stroke={styles.markerStroke}
                            strokeWidth={1}
                            style={{ transition: "all 0.2s ease", filter: styles.shadow }}
                          />
                          <circle
                            r={isActive ? 2.7 : 2.4}
                            fill="#f8ffff"
                            style={{ transition: "all 0.2s ease", filter: "drop-shadow(0 0 8px rgba(255,255,255,0.36))" }}
                          />

                          {isActive ? (
                            <>
                              <line x1={0} y1={-7} x2={0} y2={-24} stroke={styles.markerFill} strokeWidth={1.3} opacity={0.9} />
                              <g transform="translate(12 -36)">
                                <rect
                                  width={labelWidth}
                                  height={26}
                                  rx={13}
                                  fill="rgba(5,16,28,0.94)"
                                  stroke={styles.markerFill}
                                  strokeWidth={1}
                                />
                                <circle cx={13} cy={13} r={3} fill={styles.markerFill} />
                                <text x={24} y={17} style={{ fontSize: "11px", fontWeight: 700, fill: "#effaff" }}>
                                  {projectLabel}
                                </text>
                              </g>
                            </>
                          ) : null}
                        </Marker>
                      )
                    })}
                  </ZoomableGroup>
                </ComposableMap>
              </div>

              <div className="pointer-events-none absolute inset-x-4 top-4 z-20 flex flex-col gap-3 sm:inset-x-5 sm:top-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-[18rem] rounded-[18px] border border-[#23485d] bg-[rgba(5,18,29,0.84)] px-4 py-3 backdrop-blur-[10px]">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#2df0dc,#46c4ff)] text-[#05242d] shadow-[0_0_16px_rgba(45,240,220,0.25)]">
                      <Layers3 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[14px] font-bold tracking-[0.08em] text-[#f3ffff]">{zh ? "全球站点分布" : "Global Site Coverage"}</div>
                      <div className="text-[12px] text-[#7e98ab]">
                        {zh ? "悬停或点击站点查看项目详情" : "Hover or select a site to inspect project details."}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {mapStatusLegend.map((item) => {
                    const styles = getLifecycleStyles(item.key)
                    return (
                      <div key={item.key} className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] backdrop-blur-[6px] ${styles.badge}`}>
                        {item.label}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="pointer-events-none absolute left-5 top-5 h-14 w-14 rounded-tl-[18px] border-l border-t border-[#59dce2]/26" />
              <div className="pointer-events-none absolute bottom-5 right-5 h-14 w-14 rounded-br-[18px] border-b border-r border-[#59dce2]/22" />

              {activeProject ? (
                <div className="absolute bottom-4 left-4 right-4 z-20 sm:right-auto sm:w-[24rem] lg:bottom-5 lg:left-5">
                  <div className="overflow-hidden rounded-[22px] border border-[#294e62] bg-[linear-gradient(180deg,rgba(7,18,29,0.94),rgba(5,12,20,0.98))] shadow-[0_20px_44px_rgba(0,0,0,0.34)] backdrop-blur-[16px]">
                    <div className="relative h-32 overflow-hidden border-b border-[#23465b]">
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
                      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
                        <div className="flex items-end justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[11px] font-medium tracking-[0.14em] text-[#87cfc7]">{zh ? "当前聚焦项目" : "Focused Project"}</div>
                            <div className="mt-1 truncate text-[18px] font-black text-[#f6fbff]">
                              {getProjectName(activeProject, zh)}
                            </div>
                          </div>
                          <div
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.08em] ${
                              getLifecycleStyles(normalizeLifecycle(activeProject)).badge
                            }`}
                          >
                            {getLifecycleText(normalizeLifecycle(activeProject), zh)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 px-4 py-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-[14px] border border-[#21455a] bg-[rgba(9,21,33,0.78)] px-3 py-3">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#7f98ab]">{zh ? "区域" : "Region"}</div>
                          <div className="mt-1 truncate text-[14px] font-semibold text-[#f2fbff]">
                            {getProjectRegionLabel(activeProject, zh)}
                          </div>
                        </div>
                        <div className="rounded-[14px] border border-[#21455a] bg-[rgba(9,21,33,0.78)] px-3 py-3">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#7f98ab]">{zh ? "投运日期" : "Go-Live"}</div>
                          <div className="mt-1 truncate text-[14px] font-semibold text-[#f2fbff]">
                            {getProjectDateLabel(activeProject, zh)}
                          </div>
                        </div>
                        <div className="rounded-[14px] border border-[#21455a] bg-[rgba(9,21,33,0.78)] px-3 py-3">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#7f98ab]">{zh ? "设计容量" : "Capacity"}</div>
                          <div className="mt-1 truncate text-[14px] font-semibold text-[#f2fbff]">
                            {getProjectCapacityLabel(activeProject, zh)}
                          </div>
                        </div>
                        <div className="rounded-[14px] border border-[#21455a] bg-[rgba(9,21,33,0.78)] px-3 py-3">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#7f98ab]">{zh ? "综合效率" : "Efficiency"}</div>
                          <div className="mt-1 truncate text-[14px] font-semibold text-[#f2fbff]">
                            {formatEfficiency(activeItem?.score ?? null)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-[14px] border border-[#1f5b5f] bg-[rgba(7,29,34,0.72)] px-3 py-3">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#83e8de]">{zh ? "当前状态" : "Current State"}</div>
                          <div className="mt-1 flex items-center gap-2 text-[14px] font-semibold text-[#effaff]">
                            <CheckCircle2 className="h-4 w-4 text-[#3fe5d7]" />
                            <span>{zh ? activeItem?.runtimeLabelZh ?? "待补全" : activeItem?.runtimeLabelEn ?? "Pending"}</span>
                          </div>
                        </div>
                        <div className="rounded-[14px] border border-[#234f76] bg-[rgba(11,24,43,0.76)] px-3 py-3">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#97c8ff]">{zh ? "SOC / 功率" : "SOC / Power"}</div>
                          <div className="mt-1 text-[14px] font-semibold text-[#effaff]">
                            {formatSoc(activeItem?.socPercent ?? null, zh)} · {formatRealtimePower(activeItem?.powerKw ?? null, zh)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-[14px] border border-[#1f5b5f] bg-[rgba(7,29,34,0.72)] px-3 py-3">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#83e8de]">{zh ? "累计充电" : "Total Charge"}</div>
                          <div className="mt-1 text-[14px] font-semibold text-[#74f2e6]">
                            {formatEnergySummary(activeItem?.totalChargeMWh ?? null, zh)}
                          </div>
                        </div>
                        <div className="rounded-[14px] border border-[#234f76] bg-[rgba(11,24,43,0.76)] px-3 py-3">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#97c8ff]">{zh ? "累计放电" : "Total Discharge"}</div>
                          <div className="mt-1 text-[14px] font-semibold text-[#9fccff]">
                            {formatEnergySummary(activeItem?.totalDischargeMWh ?? null, zh)}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleProjectNavigate(activeProject)}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[#2b6f80] bg-[linear-gradient(135deg,rgba(33,217,204,0.2),rgba(42,132,213,0.2))] text-[14px] font-semibold text-[#dff9ff] transition-all hover:border-[#54dce0] hover:text-white"
                      >
                        {zh ? "进入项目详情" : "Open Project Dashboard"}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute bottom-4 left-4 right-4 z-20 sm:right-auto sm:w-[22rem] lg:bottom-5 lg:left-5">
                  <div className="rounded-[20px] border border-[#24485d] bg-[rgba(5,17,28,0.84)] px-4 py-4 text-[13px] text-[#7e98ab] backdrop-blur-[12px]">
                    {zh ? "将鼠标移到站点上，或点击标记点查看项目详情。" : "Hover a site or click a marker to view project details."}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="absolute inset-x-4 bottom-4 z-20 rounded-[14px] border border-[#235e71]/50 bg-[rgba(7,20,30,0.88)] px-4 py-3 text-[13px] text-[#94b5c2] sm:left-auto sm:right-5 sm:top-24 sm:bottom-auto sm:w-72">
                  {zh ? "正在加载地图与项目数据..." : "Loading map and project data..."}
                </div>
              ) : null}
            </div>

            <aside className="order-3 flex min-h-0 flex-col gap-4 xl:overflow-hidden">
              <div className={`${PANEL_CLASS} px-4 py-4`}>
                <SectionHeading icon={<Star className="h-4 w-4" />} title={zh ? "能效排行" : "Efficiency Ranking"} trailing={zh ? "综合效率" : "EE"} />
                <div className="mt-4 space-y-3.5">
                  {metricsLoading ? (
                    <div className="rounded-[14px] border border-[#245f72]/45 bg-[rgba(8,25,36,0.72)] px-3 py-4 text-[13px] text-[#92b5c2]">
                      {zh ? "正在加载能效排行..." : "Loading efficiency ranking..."}
                    </div>
                  ) : (
                    topEfficiencyItems.slice(0, 4).map((item, index) => {
                      const styles = getLifecycleStyles(item.lifecycle)
                      const progressWidth = `${Math.max(10, ((item.score ?? 0) / maxEfficiencyScore) * 100)}%`

                      return (
                        <div
                          key={item.project.id}
                          className="rounded-[16px] border border-[#21475c] bg-[linear-gradient(180deg,rgba(9,22,35,0.78),rgba(7,18,28,0.92))] p-3.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex items-start gap-3">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[12px] font-black ${
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
                              <div className="min-w-0">
                                <div className="truncate text-[14px] font-semibold text-[#eefcff]">{getProjectName(item.project, zh)}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-[#7f98ab]">
                                  <span>{getProjectRegionLabel(item.project, zh)}</span>
                                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${styles.badge}`}>
                                    {getLifecycleShortText(item.lifecycle, zh)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 text-[22px] font-black leading-none text-[#3de9d8]">
                              {formatEfficiency(item.score)}
                            </div>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#102636]">
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

              <div className={`${PANEL_CLASS} min-h-0 flex-1 px-4 py-4 xl:overflow-hidden`}>
                <SectionHeading icon={<ArrowUp className="h-4 w-4" />} title={zh ? "充放电对比" : "Charge / Discharge"} trailing="MWh" />
                <div className="mt-4 flex items-center justify-end gap-4 text-[11px] text-[#8aa7b8]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-3 rounded-full bg-[#24edd7]" />
                    <span>{zh ? "充电" : "Charge"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-3 rounded-full bg-[#5c9dff]" />
                    <span>{zh ? "放电" : "Discharge"}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-4 custom-scrollbar xl:h-full xl:overflow-y-auto xl:pr-1">
                  {metricsLoading ? (
                    <div className="rounded-[14px] border border-[#245f72]/45 bg-[rgba(8,25,36,0.72)] px-3 py-4 text-[13px] text-[#92b5c2]">
                      {zh ? "正在加载充放电对比..." : "Loading charge/discharge comparison..."}
                    </div>
                  ) : (
                    efficiencyItems.slice(0, 6).map((item) => (
                      <div
                        key={item.project.id}
                        className="rounded-[16px] border border-[#21475c] bg-[linear-gradient(180deg,rgba(9,22,35,0.78),rgba(7,18,28,0.92))] p-3.5"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <span className={`h-4 w-1 rounded-full ${getLifecycleStyles(item.lifecycle).dot}`} />
                          <span className="truncate text-[14px] font-semibold text-[#ddeef7]">{getProjectName(item.project, zh)}</span>
                        </div>
                        <div className="space-y-2.5 text-[12px]">
                          <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_4rem] items-center gap-3">
                            <span className="text-[#7d96a9]">{zh ? "充" : "C"}</span>
                            <div className="h-1.5 overflow-hidden rounded-full bg-[#102636]">
                              <div
                                className="h-full rounded-full bg-[linear-gradient(90deg,#24edd7,#9efff0)]"
                                style={{ width: `${Math.max(5, ((item.totalChargeMWh ?? 0) / maxEnergyValue) * 100)}%` }}
                              />
                            </div>
                            <span className="text-right font-semibold text-[#ddeef7]">{(item.totalChargeMWh ?? 0).toFixed(1)}</span>
                          </div>
                          <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_4rem] items-center gap-3">
                            <span className="text-[#7d96a9]">{zh ? "放" : "D"}</span>
                            <div className="h-1.5 overflow-hidden rounded-full bg-[#102636]">
                              <div
                                className="h-full rounded-full bg-[linear-gradient(90deg,#5c9dff,#b3d5ff)]"
                                style={{ width: `${Math.max(5, ((item.totalDischargeMWh ?? 0) / maxEnergyValue) * 100)}%` }}
                              />
                            </div>
                            <span className="text-right font-semibold text-[#ddeef7]">{(item.totalDischargeMWh ?? 0).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    ))
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
