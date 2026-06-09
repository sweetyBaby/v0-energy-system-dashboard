import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { ComposableMap, Geographies, Geography, Graticule, Marker, Sphere, ZoomableGroup } from "react-simple-maps"
import type { LucideIcon } from "lucide-react"
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowDownCircle,
  ArrowRight,
  ArrowUp,
  ArrowUpCircle,
  BatteryFull,
  Building2,
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
import { HistoryStyleLoadingIndicator } from "@/components/dashboard/history-style-loading-indicator"
import { NavBrand } from "@/components/dashboard/nav-brand"
import { useLanguage } from "@/components/language-provider"
import { useDashboardViewport } from "@/hooks/use-dashboard-viewport"
import { toast } from "@/hooks/use-toast"
import { logoutWithCloud } from "@/lib/api/auth"

const HeaderInfoBar = dynamic(
  () => import("@/components/dashboard/header-info-bar").then((mod) => mod.HeaderInfoBar),
  { ssr: false },
)
import { clearStoredAuthToken, clearStoredAuthUsername } from "@/lib/auth-storage"
import {
  fetchProjectDashboardChargeDischargeRanking,
  fetchProjectDashboardOverview,
  fetchProjectDashboardEeRanking,
  fetchProjectDashboardSiteInfos,
  fetchProjectOptionsByDevice,
  type ProjectOption,
  type RawProjectDashboardChargeDischargeRankingItem,
  type RawProjectDashboardOverview,
  type RawProjectDashboardEeRankingItem,
  type RawProjectDashboardSiteInfo,
} from "@/lib/api/project"

const GEO_URL = "/world-atlas.json"
const EXCLUDED_COUNTRY_NAMES = new Set(["Antarctica", "Fr. S. Antarctic Lands"])
const HOVER_EXIT_DELAY_MS = 220
const LINKED_COUNTRY_SELECTION_GROUPS = [["China", "Taiwan"]] as const

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

type ProjectSiteInfoItem = {
  projectId: string
  projectName: string | null
  region: string | null
  regionName: string | null
  regionPinyin: string | null
  ratedPower: string | null
  ratedCapacity: string | null
  workingDate: string | null
  status: string | null
  score: number | null
  totalChargeMWh: number | null
  totalDischargeMWh: number | null
  isOnline: boolean
  powerKw: number | null
  socPercent: number | null
  runtimeLabelZh: string
  runtimeLabelEn: string
}

type ProjectSiteInfoLoadState = {
  status: "loading" | "ready" | "error"
  data: ProjectSiteInfoItem | null
}

type EeRankingItem = {
  projectId: string
  projectName: string
  project: ProjectOption | null
  lifecycle: LifecycleKey
  score: number | null
}

type ChargeDischargeRankingItem = {
  projectId: string
  projectName: string
  project: ProjectOption | null
  chargeMWh: number
  dischargeMWh: number
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

type StatCardItem = {
  key: string
  label: string
  value: string
  accent?: "green" | "neutral"
}

type OverviewRailItem = {
  key: string
  icon: LucideIcon
  label: string
  value: string
  unit: string
}

type LifecycleItem = {
  key: string
  icon: LucideIcon
  label: string
  value: string
  detail: string
}

type OverviewLifecycleCounts = Record<LifecycleKey, number>

type ProjectMapPanelProps = {
  onProjectSelect?: (project: ProjectOption) => void
}

const PANEL_CLASS =
  "rounded-[20px] border border-[#1a4d6a] bg-[linear-gradient(160deg,rgba(8,24,42,0.96),rgba(5,16,30,0.98))] shadow-[0_12px_32px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(100,200,255,0.08)]"

const getMarkerFlagWidth = (label: string, zh: boolean, minWidth: number, maxWidth: number) => {
  const perChar = zh ? 11.5 : 7.2
  const horizontalPadding = zh ? 8 : 12
  return Math.max(minWidth, Math.min(maxWidth, Math.round(label.length * perChar + horizontalPadding)))
}

const makeMarkerFlagPath = (width: number, bodyHeight: number, pointerHeight: number) => {
  const halfW = width / 2
  const bodyBottomY = -pointerHeight
  const pointerHalfW = Math.max(7, Math.min(12, width * 0.11))
  return [
    `M ${-halfW} ${-bodyHeight}`,
    `H ${halfW}`,
    `Q ${halfW + 4} ${-bodyHeight} ${halfW + 4} ${-bodyHeight + 4}`,
    `V ${bodyBottomY - 4}`,
    `Q ${halfW + 4} ${bodyBottomY} ${halfW} ${bodyBottomY}`,
    `H ${pointerHalfW}`,
    `L 0 0`,
    `L ${-pointerHalfW} ${bodyBottomY}`,
    `H ${-halfW}`,
    `Q ${-halfW - 4} ${bodyBottomY} ${-halfW - 4} ${bodyBottomY - 4}`,
    `V ${-bodyHeight + 4}`,
    `Q ${-halfW - 4} ${-bodyHeight} ${-halfW} ${-bodyHeight}`,
    "Z",
  ].join(" ")
}

const hasText = (value?: string | null) => typeof value === "string" && value.trim().length > 0

const getProjectName = (project: ProjectOption, zh: boolean) =>
  (zh ? project.projectName : project.projectNameEn || project.projectName).trim()

const formatPending = (_zh: boolean) => "--"

const formatIntegerCount = (value: number) => `${value}`

const formatGroupedNumber = (value: number, digits = 0) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)

const formatMetricNumber = (value: number, digits = 0) =>
  formatGroupedNumber(value, digits)

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

const formatOverviewMetric = (value: number, digits = 0) =>
  formatGroupedNumber(value, digits)

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
    if (normalizedStatus === "1") {
      return "commissioned"
    }

    if (normalizedStatus === "3") {
      return "construction"
    }

    if (normalizedStatus === "0" || normalizedStatus === "2") {
      return "planned"
    }

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

const SHARED_MARKER_FILL = "rgba(255,219,92,0.94)"
const SHARED_MARKER_STROKE = "rgba(255,243,177,0.96)"
const SHARED_RING_STROKE = "rgba(255,219,92,0.28)"
const SHARED_FLAG_FILL = "rgba(17,52,96,0.98)"

const getClusterLifecycle = (projects: ProjectOption[]): LifecycleKey | null => {
  if (!projects.length) return null
  const first = normalizeLifecycle(projects[0])
  return projects.every((project) => normalizeLifecycle(project) === first) ? first : null
}


const getLifecycleStyles = (lifecycle: LifecycleKey) => {
  if (lifecycle === "commissioned") {
    return {
      badge: "border-[#56b8ff]/28 bg-[rgba(18,56,94,0.26)] text-[#86d0ff]",
      text: "#86d0ff",
      markerFill: SHARED_MARKER_FILL,
      markerStroke: SHARED_MARKER_STROKE,
      ringStroke: SHARED_RING_STROKE,
      flagFill: SHARED_FLAG_FILL,
      flagStroke: SHARED_MARKER_STROKE,
      bar: "from-[#67c2ff] to-[#4599ff]",
      dot: "bg-[#56b8ff]",
      shadow: "drop-shadow(0 0 12px rgba(86,184,255,0.30))",
    }
  }

  if (lifecycle === "construction") {
    return {
      badge: "border-[#ffbf52]/28 bg-[rgba(97,71,14,0.28)] text-[#ffc96e]",
      text: "#ffc96e",
      markerFill: SHARED_MARKER_FILL,
      markerStroke: SHARED_MARKER_STROKE,
      ringStroke: SHARED_RING_STROKE,
      flagFill: SHARED_FLAG_FILL,
      flagStroke: SHARED_MARKER_STROKE,
      bar: "from-[#ffc14d] to-[#ff9d3d]",
      dot: "bg-[#56b8ff]",
      shadow: "drop-shadow(0 0 12px rgba(86,184,255,0.30))",
    }
  }

  return {
    badge: "border-[#7aa6ff]/22 bg-[rgba(34,59,99,0.24)] text-[#9ac0ff]",
    text: "#9ac0ff",
    markerFill: SHARED_MARKER_FILL,
    markerStroke: SHARED_MARKER_STROKE,
    ringStroke: SHARED_RING_STROKE,
    flagFill: SHARED_FLAG_FILL,
    flagStroke: SHARED_MARKER_STROKE,
    bar: "from-[#77a4ff] to-[#4e8fff]",
    dot: "bg-[#56b8ff]",
    shadow: "drop-shadow(0 0 10px rgba(86,184,255,0.30))",
  }
}

const formatDateYmd = (value?: string | null) => {
  if (!hasText(value)) return null

  const normalized = value!.trim()
  const match = normalized.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (match) {
    const [, year, month, day] = match
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  return normalized
}

const getProjectDateLabel = (project: ProjectOption, zh: boolean) => {
  const workingDate = formatDateYmd(project.workingDate)
  if (workingDate) return workingDate

  const commissioningDate = formatDateYmd(project.commissioningDate)
  if (commissioningDate) return commissioningDate
  return zh ? "未登记" : "Not Set"
}

const getProjectCapacityLabel = (project: ProjectOption, zh: boolean) => {
  if (hasText(project.ratedCapacity)) return project.ratedCapacity!
  if (hasText(project.ratedPower)) return project.ratedPower!
  return formatPowerFromMw(project.installedCapacityMw, zh)
}

const getProjectPowerLabel = (project: ProjectOption, zh: boolean) => {
  if (hasText(project.ratedPower)) return project.ratedPower!
  return formatPowerFromMw(project.installedCapacityMw, zh)
}

const getProjectRegionLabel = (project: ProjectOption, zh: boolean) =>
  (zh ? project.regionName || project.region : project.regionPinyin || project.regionName || project.region) ||
  (zh ? "未标注区域" : "Unspecified")

const getSiteRegionLabel = (site: ProjectSiteInfoItem | null | undefined, project: ProjectOption, zh: boolean) =>
  (site
    ? zh
      ? site.regionName || site.region
      : site.regionPinyin || site.regionName || site.region
    : null) || getProjectRegionLabel(project, zh)

function ChargeModeIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-[16px] w-[16px]">
      <path
        d="M9.1 2.2a.9.9 0 0 1 1.8 0v1.4h1.2c.4 0 .6.5.3.8l-2.4 2.7a.5.5 0 0 1-.8 0L6.8 4.4c-.3-.3-.1-.8.3-.8h2V2.2Z"
        fill="currentColor"
      />
      <path
        d="M6.2 7.8h7.6c.8 0 1.4.6 1.4 1.4v5.4c0 .8-.6 1.4-1.4 1.4H6.2c-.8 0-1.4-.6-1.4-1.4V9.2c0-.8.6-1.4 1.4-1.4Zm8.8 2.2h1.2c.6 0 1 .4 1 1s-.4 1-1 1H15v-2Z"
        fill="currentColor"
        opacity="0.92"
      />
    </svg>
  )
}

function DischargeModeIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-[16px] w-[16px]">
      <path
        d="M6.2 4h7.6c.8 0 1.4.6 1.4 1.4v5.4c0 .8-.6 1.4-1.4 1.4H6.2c-.8 0-1.4-.6-1.4-1.4V5.4C4.8 4.6 5.4 4 6.2 4Zm8.8 2.2h1.2c.6 0 1 .4 1 1s-.4 1-1 1H15v-2Z"
        fill="currentColor"
        opacity="0.92"
      />
      <path
        d="M9.1 17.8a.9.9 0 0 0 1.8 0v-1.4h1.2c.4 0 .6-.5.3-.8L10 12.9a.5.5 0 0 0-.8 0l-2.4 2.7c-.3.3-.1.8.3.8h2v1.4Z"
        fill="currentColor"
      />
    </svg>
  )
}

const toFiniteNumber = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) return null
  return value
}

const buildRankingProjectName = (project: ProjectOption | null, fallbackName: string, zh: boolean) => {
  if (project) {
    return getProjectName(project, zh)
  }

  return hasText(fallbackName) ? fallbackName.trim() : "--"
}

const clusterMappableProjects = (projects: ProjectOption[]): ProjectCluster[] => {
  const buckets = new Map<
    string,
    { longitudeTotal: number; latitudeTotal: number; count: number; projects: ProjectOption[] }
  >()

  for (const project of projects) {
    const lng = project.longitude!
    const lat = project.latitude!
    const roundedLng = Math.round(lng * 100) / 100
    const roundedLat = Math.round(lat * 100) / 100
    const key = project.cityCode?.trim() ? `city_${project.cityCode.trim()}` : `coords_${roundedLng}_${roundedLat}`
    const currentBucket = buckets.get(key)

    if (!currentBucket) {
      buckets.set(key, {
        longitudeTotal: lng,
        latitudeTotal: lat,
        count: 1,
        projects: [project],
      })
      continue
    }

    currentBucket.longitudeTotal += lng
    currentBucket.latitudeTotal += lat
    currentBucket.count += 1
    currentBucket.projects.push(project)
  }

  return Array.from(buckets.entries()).map(([key, bucket]) => ({
    id: `cluster_${key}`,
    coordinates: [bucket.longitudeTotal / bucket.count, bucket.latitudeTotal / bucket.count],
    projects: bucket.projects,
  }))
}

// [minLng, minLat, maxLng, maxLat] bounding boxes for country detection
const COUNTRY_BBOX: Record<string, [number, number, number, number]> = {
  "China":        [73,  15, 136, 54],
  "Taiwan":       [119, 21, 123, 26],
  "Mongolia":     [87,  41, 120, 52],
  "Russia":       [27,  41, 180, 82],
  "India":        [68,   7,  97, 37],
  "Japan":        [122, 24, 146, 46],
  "South Korea":  [125, 33, 130, 39],
  "Australia":    [113, -44, 154, -10],
  "Canada":       [-141, 41, -52, 84],
  "United States of America": [-170, 18, -66, 72],
  "United Arab Emirates": [51, 22, 57, 27],
  "Germany":      [6,  47,  15, 55],
  "Brazil":       [-74, -34, -34,  6],
}

const COUNTRY_LABELS: Record<string, { zh: string; en: string }> = {
  China: { zh: "中国", en: "China" },
  Mongolia: { zh: "蒙古", en: "Mongolia" },
  Russia: { zh: "俄罗斯", en: "Russia" },
  India: { zh: "印度", en: "India" },
  Japan: { zh: "日本", en: "Japan" },
  "South Korea": { zh: "韩国", en: "South Korea" },
  Australia: { zh: "澳大利亚", en: "Australia" },
  Canada: { zh: "加拿大", en: "Canada" },
  "United States of America": { zh: "美国", en: "United States" },
  "United Arab Emirates": { zh: "阿联酋", en: "United Arab Emirates" },
  Germany: { zh: "德国", en: "Germany" },
  Brazil: { zh: "巴西", en: "Brazil" },
}

const PRIORITY_MARKETS = new Set(["United States of America", "Australia", "Canada", "United Arab Emirates"])

const COUNTRY_LABEL_CENTERS: Partial<Record<string, MapCoordinates>> = {
  China: [108, 34],                       // 湖北/陕西附近，中国主体区域视觉中心
  Mongolia: [103, 47],                    // 中蒙古，肯特省附近
  Russia: [100, 64],                      // 中西伯利亚，叶尼塞河流域
  India: [79, 22],                        // 中央邦，印度地理中心
  Japan: [136, 36],                       // 本州岛中部，爱知县附近
  "South Korea": [128, 36],              // 韩国中部，大田附近
  Germany: [10, 51],                      // 德国中部，图林根州
  Brazil: [-53, -11],                     // 马托格罗索州，巴西地理中心
  Australia: [134, -26],                  // 南澳大利亚，地理中心
  Canada: [-110, 62],                     // 西北地区/不列颠哥伦比亚以东，远离边界的内陆中心
  "United States of America": [-98, 39], // 堪萨斯州，美国大陆重心
  "United Arab Emirates": [53.15, 24.2], // 明确压到阿联酋主体西中部，避免标签继续贴东侧边界
}

const COUNTRY_LABEL_OFFSET_FACTORS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0, 0.07],
  [0, -0.07],
  [0.08, 0],
  [-0.08, 0],
  [0.07, 0.06],
  [-0.07, 0.06],
  [0.07, -0.06],
  [-0.07, -0.06],
]

const clampToRange = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const expandLinkedCountrySelections = (countries: Iterable<string>) => {
  const expanded = new Set<string>(countries)

  for (const group of LINKED_COUNTRY_SELECTION_GROUPS) {
    if (group.some((country) => expanded.has(country))) {
      group.forEach((country) => expanded.add(country))
    }
  }

  return expanded
}

const isCoordinateInBbox = (coordinates: MapCoordinates, bbox: readonly [number, number, number, number]) => {
  const [lng, lat] = coordinates
  const [minLng, minLat, maxLng, maxLat] = bbox
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat
}

const getCoordinateDistance = (left: MapCoordinates, right: MapCoordinates) => {
  const averageLatitude = ((left[1] + right[1]) / 2) * (Math.PI / 180)
  const dx = (left[0] - right[0]) * Math.cos(averageLatitude)
  const dy = left[1] - right[1]
  return Math.sqrt(dx * dx + dy * dy)
}

type ClusterFlagLayout = {
  offsetX: number
  offsetY: number
}

const getClusterFlagLayoutMap = (clusters: ProjectCluster[]): Map<string, ClusterFlagLayout> => {
  const nearbyThreshold = 13
  const layoutMap = new Map<string, ClusterFlagLayout>()

  for (const cluster of clusters) {
    const neighbors = clusters
      .filter((candidate) => getCoordinateDistance(cluster.coordinates, candidate.coordinates) <= nearbyThreshold)
      .sort((left, right) => {
        if (left.coordinates[0] !== right.coordinates[0]) return left.coordinates[0] - right.coordinates[0]
        return right.coordinates[1] - left.coordinates[1]
      })

    const index = Math.max(0, neighbors.findIndex((candidate) => candidate.id === cluster.id))
    const layoutBySize: Record<number, ClusterFlagLayout[]> = {
      1: [{ offsetX: 0, offsetY: 0 }],
      2: [
        { offsetX: -44, offsetY: -8 },
        { offsetX: 44, offsetY: 8 },
      ],
      3: [
        { offsetX: -48, offsetY: -8 },
        { offsetX: 0, offsetY: 8 },
        { offsetX: 48, offsetY: -2 },
      ],
      4: [
        { offsetX: -54, offsetY: -10 },
        { offsetX: -18, offsetY: 6 },
        { offsetX: 18, offsetY: -2 },
        { offsetX: 54, offsetY: 10 },
      ],
    }
    const fallbackLayouts = neighbors.map((_, lane) => ({
      offsetX: (lane - (neighbors.length - 1) / 2) * 34,
      offsetY: lane % 2 === 0 ? -6 : 8,
    }))
    const layout = layoutBySize[neighbors.length]?.[index] ?? fallbackLayouts[index] ?? { offsetX: 0, offsetY: 0 }

    layoutMap.set(cluster.id, layout)
  }

  return layoutMap
}

const resolveCountryLabelCenter = (
  baseCenter: MapCoordinates,
  bbox: readonly [number, number, number, number],
  occupiedCoordinates: MapCoordinates[],
): MapCoordinates => {
  if (occupiedCoordinates.length === 0) {
    return baseCenter
  }

  const [minLng, minLat, maxLng, maxLat] = bbox
  const lngSpan = maxLng - minLng
  const latSpan = maxLat - minLat
  const lngPadding = Math.max(0.65, lngSpan * 0.08)
  const latPadding = Math.max(0.55, latSpan * 0.08)

  let bestCenter = baseCenter
  let bestScore = Number.NEGATIVE_INFINITY

  for (const [lngFactor, latFactor] of COUNTRY_LABEL_OFFSET_FACTORS) {
    const candidate: MapCoordinates = [
      clampToRange(baseCenter[0] + lngSpan * lngFactor, minLng + lngPadding, maxLng - lngPadding),
      clampToRange(baseCenter[1] + latSpan * latFactor, minLat + latPadding, maxLat - latPadding),
    ]

    const nearestOccupiedDistance = occupiedCoordinates.reduce((minDistance, coordinates) => {
      const distance = getCoordinateDistance(candidate, coordinates)
      return Math.min(minDistance, distance)
    }, Number.POSITIVE_INFINITY)

    const originPenalty = getCoordinateDistance(candidate, baseCenter) * 0.35
    const score = nearestOccupiedDistance - originPenalty

    if (score > bestScore) {
      bestScore = score
      bestCenter = candidate
    }
  }

  return bestCenter
}

const DEFAULT_FOCUS_FRAME: FocusFrame = { center: [10, 10], zoom: 1 }

const toNumberOrNull = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) return null
  return value
}

const pickRuntimeLabel = (project: ProjectOption, powerKw: number | null, isOnline: boolean, zh: boolean) => {
  const lifecycle = normalizeLifecycle(project)
  const normalizedStatus = `${project.status ?? ""}`.trim()

  if (!isOnline) return zh ? "离线" : "Offline"
  if (lifecycle === "construction") return zh ? "调试中" : "Testing"
  if (lifecycle === "planned") return zh ? "待建设" : "Planned"
  if (powerKw != null && powerKw > 0.05) return zh ? "充电中" : "Charging"
  if (powerKw != null && powerKw < -0.05) return zh ? "放电中" : "Discharging"
  return zh ? "在线" : "Online"
}

const pickSiteInfoRow = (rows: RawProjectDashboardSiteInfo[] | null, projectId: string) => {
  if (!rows?.length) return null

  return rows.find((row) => String(row.projectId ?? "").trim() === projectId) ?? rows[0] ?? null
}

const normalizeProjectSiteInfo = (project: ProjectOption, row: RawProjectDashboardSiteInfo | null): ProjectSiteInfoItem | null => {
  if (!row) return null

  const powerKw = toNumberOrNull(row.power)
  const socPercent = toNumberOrNull(row.soc)
  const isOnline = typeof row.online === "boolean" ? row.online : false
  const status = hasText(row.status == null ? null : String(row.status)) ? String(row.status).trim() : project.status
  const workingDate = hasText(row.workingDate) ? row.workingDate!.trim() : project.workingDate
  const lifecycleProject: ProjectOption = {
    ...project,
    status,
    workingDate,
  }
  const totalChargeWh = toNumberOrNull(row.totalChargeWh)
  const totalDischargeWh = toNumberOrNull(row.totalDischargeWh)
  const runtimeLabelZh = isOnline ? "在线" : "离线"
  const runtimeLabelEn = isOnline ? "Online" : "Offline"

  return {
    projectId: hasText(row.projectId) ? String(row.projectId).trim() : project.projectId,
    projectName: hasText(row.projectName) ? String(row.projectName).trim() : project.projectName,
    region: hasText(row.region) ? String(row.region).trim() : project.region,
    regionName: hasText(row.regionName) ? String(row.regionName).trim() : project.regionName,
    regionPinyin: hasText(row.regionPinyin) ? String(row.regionPinyin).trim() : project.regionPinyin,
    ratedPower: hasText(row.ratedPower) ? String(row.ratedPower).trim() : project.ratedPower,
    ratedCapacity: hasText(row.ratedCapacity) ? String(row.ratedCapacity).trim() : project.ratedCapacity,
    workingDate,
    status,
    score: toNumberOrNull(row.efficiencyEe),
    totalChargeMWh: totalChargeWh != null ? totalChargeWh / 1_000_000 : null,
    totalDischargeMWh: totalDischargeWh != null ? totalDischargeWh / 1_000_000 : null,
    isOnline,
    powerKw,
    socPercent,
    runtimeLabelZh,
    runtimeLabelEn,
  }
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

const RAIL_ACCENTS: Record<string, { iconBg: string; border: string; iconColor: string; glow: string; bar: string }> = {
  "site-count":      { iconBg: "linear-gradient(145deg,rgba(14,116,144,0.72),rgba(7,56,76,0.92))",   border: "rgba(34,211,238,0.34)",  iconColor: "#22d3ee", glow: "rgba(34,211,238,0.30)",  bar: "linear-gradient(180deg,#22d3ee,#22d3ee66)" },
  "online-sites":    { iconBg: "linear-gradient(145deg,rgba(6,100,72,0.72),rgba(3,52,38,0.92))",      border: "rgba(52,211,153,0.34)",  iconColor: "#34d399", glow: "rgba(52,211,153,0.28)",  bar: "linear-gradient(180deg,#34d399,#34d39966)" },
  "rated-power":     { iconBg: "linear-gradient(145deg,rgba(120,82,0,0.72),rgba(64,42,0,0.92))",      border: "rgba(251,191,36,0.34)",  iconColor: "#fbbf24", glow: "rgba(251,191,36,0.28)",  bar: "linear-gradient(180deg,#fbbf24,#fbbf2466)" },
  "rated-capacity":  { iconBg: "linear-gradient(145deg,rgba(29,58,138,0.72),rgba(14,28,80,0.92))",    border: "rgba(96,165,250,0.34)",  iconColor: "#60a5fa", glow: "rgba(96,165,250,0.28)",  bar: "linear-gradient(180deg,#60a5fa,#60a5fa66)" },
  "total-charge":    { iconBg: "linear-gradient(145deg,rgba(13,100,90,0.72),rgba(6,52,48,0.92))",     border: "rgba(45,212,191,0.34)",  iconColor: "#2dd4bf", glow: "rgba(45,212,191,0.28)",  bar: "linear-gradient(180deg,#2dd4bf,#2dd4bf66)" },
  "total-discharge": { iconBg: "linear-gradient(145deg,rgba(55,48,163,0.72),rgba(28,24,92,0.92))",    border: "rgba(129,140,248,0.34)", iconColor: "#818cf8", glow: "rgba(129,140,248,0.28)", bar: "linear-gradient(180deg,#818cf8,#818cf866)" },
}

function MapSceneBackdrop() {
  return (
    <>
      <style>{`
        @keyframes map-bg-breathe {
          0%, 100% { opacity: 0.72; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        @keyframes map-bg-sweep {
          0% { transform: translateX(-140%); opacity: 0; }
          18% { opacity: 0.22; }
          50% { opacity: 0.16; }
          100% { transform: translateX(320%); opacity: 0; }
        }
        @keyframes map-grid-drift {
          0% { transform: translateY(0); }
          100% { transform: translateY(28px); }
        }
      `}</style>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 88% 48% at 50% -8%, rgba(96,165,250,0.36) 0%, transparent 60%)," +
            "radial-gradient(circle at 18% 16%, rgba(45,212,191,0.14) 0%, transparent 28%)," +
            "radial-gradient(circle at 82% 18%, rgba(56,189,248,0.14) 0%, transparent 30%)," +
            "radial-gradient(ellipse 70% 24% at 50% 100%, rgba(37,99,235,0.18) 0%, transparent 64%)," +
            "linear-gradient(180deg, #0a1730 0%, #081425 38%, #06101c 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:radial-gradient(circle,rgba(34,211,238,0.56)_1px,transparent_1.8px)] [background-size:32px_32px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(34,211,238,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.09)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,170,0.08)_1px,transparent_1px)] [background-size:24px_24px]"
        style={{ animation: "map-grid-drift 16s linear infinite" }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#22d3ee]/28 to-transparent" />
      <div className="pointer-events-none absolute left-0 top-0 h-[84px] w-[84px] border-l border-t border-[#22d3ee]/24" />
      <div className="pointer-events-none absolute right-0 top-0 h-[84px] w-[84px] border-r border-t border-[#22d3ee]/24" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[72px] w-[72px] border-b border-l border-[#00d4aa]/12" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[72px] w-[72px] border-b border-r border-[#00d4aa]/12" />

      <div className="pointer-events-none absolute left-1/2 top-0 h-[42vh] w-[420px] -translate-x-1/2 blur-3xl" style={{ background: "linear-gradient(180deg, rgba(34,211,238,0.16) 0%, rgba(96,165,250,0.07) 48%, transparent 100%)" }} />
      <div className="pointer-events-none absolute left-[8%] top-[16%] h-[20rem] w-[20rem] rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.16),transparent_72%)] blur-3xl" />
      <div className="pointer-events-none absolute right-[8%] top-[14%] h-[20rem] w-[20rem] rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.16),transparent_74%)] blur-3xl" />

      <div className="pointer-events-none absolute inset-x-0 top-[5.75rem] hidden h-[13rem] lg:block">
        <div
          className="absolute left-1/2 top-0 h-full w-[34rem] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(0,212,170,0.16),rgba(34,211,238,0.08)_48%,transparent)] blur-xl"
          style={{ clipPath: "polygon(28% 0%,72% 0%,88% 100%,12% 100%)", animation: "map-bg-breathe 9s ease-in-out infinite" }}
        />
        <div className="absolute left-1/2 top-[1.2rem] h-px w-[42rem] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#52ecff]/26 to-transparent" />
        <div className="absolute left-1/2 top-[3.6rem] h-px w-[34rem] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#52ecff]/18 to-transparent" />
      </div>

      <div className="pointer-events-none absolute inset-y-[15%] left-[12%] hidden w-[10%] border-x border-[#00d4aa]/8 bg-[linear-gradient(90deg,transparent,rgba(0,212,170,0.04),transparent)] xl:block" />
      <div className="pointer-events-none absolute inset-y-[14%] right-[12%] hidden w-[10%] border-x border-[#3b82f6]/8 bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.04),transparent)] xl:block" />
      <div className="pointer-events-none absolute left-[10%] top-[22%] hidden h-[14rem] w-[13rem] border border-[#1f5d78]/18 bg-[linear-gradient(180deg,rgba(8,18,34,0.36),rgba(4,12,23,0.04))] xl:block" style={{ clipPath: "polygon(0% 10%,10% 0%,100% 0%,100% 100%,0% 100%)" }} />
      <div className="pointer-events-none absolute right-[10%] top-[27%] hidden h-[15rem] w-[14rem] border border-[#24629f]/18 bg-[linear-gradient(180deg,rgba(8,18,34,0.34),rgba(4,12,23,0.04))] xl:block" style={{ clipPath: "polygon(0% 0%,90% 0%,100% 10%,100% 100%,0% 100%)" }} />
      <div
        className="pointer-events-none absolute left-[10%] top-[30%] hidden h-[6rem] w-[22%] bg-[linear-gradient(90deg,transparent,rgba(84,244,255,0.18),transparent)] blur-md xl:block"
        style={{ animation: "map-bg-sweep 9s linear infinite" }}
      />

      <div className="pointer-events-none absolute bottom-[-28%] left-1/2 h-[76vh] w-[176vw] -translate-x-1/2 opacity-[0.12] [background-image:linear-gradient(rgba(34,211,238,0.11)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.08)_1px,transparent_1px)] [background-size:88px_88px] [transform:perspective(1440px)_rotateX(79deg)]" />
      <div className="pointer-events-none absolute bottom-[-18%] left-1/2 h-[68vh] w-[148vw] -translate-x-1/2 opacity-[0.08] [background-image:linear-gradient(rgba(0,212,170,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px)] [background-size:44px_44px] [transform:perspective(1440px)_rotateX(79deg)]" />
      <div className="pointer-events-none absolute bottom-[24%] left-1/2 h-[6rem] w-[82vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.08),transparent_58%)] blur-3xl" />
    </>
  )
}

export function ProjectMapPanel({ onProjectSelect }: ProjectMapPanelProps) {
  const router = useRouter()
  const { language } = useLanguage()
  const { isCompactWidth, isShortHeight } = useDashboardViewport()
  const zh = language === "zh"
  const useCompactHeader = isCompactWidth || isShortHeight
  const useCompactOverviewRail = isCompactWidth || isShortHeight

  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [dashboardOverview, setDashboardOverview] = useState<RawProjectDashboardOverview | null>(null)
  const [eeRankingLoading, setEeRankingLoading] = useState(true)
  const [energyRankingLoading, setEnergyRankingLoading] = useState(true)
  const [siteInfoByProjectId, setSiteInfoByProjectId] = useState<Record<string, ProjectSiteInfoLoadState>>({})
  const [eeRankingItems, setEeRankingItems] = useState<EeRankingItem[]>([])
  const [chargeRankingItems, setChargeRankingItems] = useState<ChargeDischargeRankingItem[]>([])
  const [dischargeRankingItems, setDischargeRankingItems] = useState<ChargeDischargeRankingItem[]>([])
  const [energyRankingMode, setEnergyRankingMode] = useState<EnergyRankingMode>("charge")
  const [hoveredClusterId, setHoveredClusterId] = useState<string | null>(null)
  const [hoveredCountryName, setHoveredCountryName] = useState<string | null>(null)
  const hoverExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [mapDimensions, setMapDimensions] = useState({ width: 800, height: 450 })
  const [markerPixelPos, setMarkerPixelPos] = useState<{ x: number; y: number } | null>(null)

  const showApiErrorToast = (
    titleZh: string,
    titleEn: string,
    error: unknown,
    fallbackZh: string,
    fallbackEn: string
  ) => {
    const fallbackMessage = zh ? fallbackZh : fallbackEn
    const message = error instanceof Error ? error.message || fallbackMessage : fallbackMessage

    toast({
      variant: "destructive",
      title: (
        <span className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ff9cac]/28 bg-[radial-gradient(circle_at_30%_30%,rgba(255,182,193,0.28),rgba(255,107,125,0.08)_58%,transparent_100%)] text-[#ffb6c0] shadow-[0_0_22px_rgba(255,107,125,0.15)]">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <span>{zh ? titleZh : titleEn}</span>
        </span>
      ),
      description: message,
      className:
        "border-[#ff6b7d]/35 shadow-[0_0_0_1px_rgba(255,153,171,0.08)_inset,0_18px_46px_rgba(24,6,12,0.52),0_0_30px_rgba(255,107,125,0.16)]",
    })
  }

  useEffect(() => {
    const container = mapContainerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setMapDimensions({ width: Math.round(width), height: Math.round(height) })
        }
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const clearHoverExitTimer = () => {
    if (hoverExitTimerRef.current) {
      clearTimeout(hoverExitTimerRef.current)
      hoverExitTimerRef.current = null
    }
  }

  const scheduleHoverExit = () => {
    clearHoverExitTimer()
    hoverExitTimerRef.current = setTimeout(() => {
      setHoveredClusterId(null)
      setHoveredId(null)
      setMarkerPixelPos(null)
      hoverExitTimerRef.current = null
    }, HOVER_EXIT_DELAY_MS)
  }

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
    let cancelled = false

    const loadDashboardOverview = async () => {
      try {
        const overview = await fetchProjectDashboardOverview()
        if (!cancelled) {
          setDashboardOverview(overview)
        }
      } catch (error) {
        console.error("Failed to load project dashboard overview", error)
        if (!cancelled) {
          setDashboardOverview(null)
          const fallbackMessage = zh ? "总览信息获取失败，请稍后重试" : "Failed to load overview. Please try again."
          const message = error instanceof Error ? error.message || fallbackMessage : fallbackMessage
          toast({
            variant: "destructive",
            title: (
              <span className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ff9cac]/28 bg-[radial-gradient(circle_at_30%_30%,rgba(255,182,193,0.28),rgba(255,107,125,0.08)_58%,transparent_100%)] text-[#ffb6c0] shadow-[0_0_22px_rgba(255,107,125,0.15)]">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <span>{zh ? "总览接口校验未通过" : "Overview validation failed"}</span>
              </span>
            ),
            description: message,
            className:
              "border-[#ff6b7d]/35 shadow-[0_0_0_1px_rgba(255,153,171,0.08)_inset,0_18px_46px_rgba(24,6,12,0.52),0_0_30px_rgba(255,107,125,0.16)]",
          })
        }
      } finally {
        if (!cancelled) {
          setOverviewLoading(false)
        }
      }
    }

    void loadDashboardOverview()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadEeRanking = async () => {
      setEeRankingLoading(true)

      try {
        const ranking = await fetchProjectDashboardEeRanking()
        if (cancelled) return

        setEeRankingItems(
          (ranking ?? []).map((item: RawProjectDashboardEeRankingItem) => {
            const projectId = hasText(item.projectId) ? String(item.projectId).trim() : ""
            const matchedProject = projects.find((project) => project.projectId === projectId) ?? null

            return {
              projectId,
              projectName: hasText(item.projectName) ? String(item.projectName).trim() : projectId,
              project: matchedProject,
              lifecycle: matchedProject ? normalizeLifecycle(matchedProject) : "planned",
              score: toFiniteNumber(item.chargeEfficiencyEe),
            } satisfies EeRankingItem
          })
        )
      } catch (error) {
        console.error("Failed to load project dashboard EE ranking", error)
        if (!cancelled) {
          setEeRankingItems([])
          showApiErrorToast(
            "能效排行接口校验未通过",
            "EE ranking validation failed",
            error,
            "能效排行获取失败，请稍后重试",
            "Failed to load EE ranking. Please try again."
          )
        }
      } finally {
        if (!cancelled) {
          setEeRankingLoading(false)
        }
      }
    }

    void loadEeRanking()

    return () => {
      cancelled = true
    }
  }, [projects])

  useEffect(() => {
    let cancelled = false

    const mapRankingItems = (items: RawProjectDashboardChargeDischargeRankingItem[] | null | undefined) =>
      (items ?? []).map((item) => {
        const projectId = hasText(item.projectId) ? String(item.projectId).trim() : ""
        const matchedProject = projects.find((project) => project.projectId === projectId) ?? null

        return {
          projectId,
          projectName: hasText(item.projectName) ? String(item.projectName).trim() : projectId,
          project: matchedProject,
          chargeMWh: (toFiniteNumber(item.totalChargeWh) ?? 0) / 1_000_000,
          dischargeMWh: (toFiniteNumber(item.totalDischargeWh) ?? 0) / 1_000_000,
        } satisfies ChargeDischargeRankingItem
      })

    const loadEnergyRanking = async () => {
      setEnergyRankingLoading(true)

      try {
        const ranking = await fetchProjectDashboardChargeDischargeRanking({ energyType: energyRankingMode })

        if (cancelled) return

        if (energyRankingMode === "charge") {
          setChargeRankingItems(mapRankingItems(ranking))
        } else {
          setDischargeRankingItems(mapRankingItems(ranking))
        }
      } catch (error) {
        console.error("Failed to load project dashboard charge/discharge ranking", error)
        if (!cancelled) {
          if (energyRankingMode === "charge") {
            setChargeRankingItems([])
          } else {
            setDischargeRankingItems([])
          }
          showApiErrorToast(
            "充放电排行接口校验未通过",
            "Charge/discharge ranking validation failed",
            error,
            "充放电排行获取失败，请稍后重试",
            "Failed to load charge/discharge ranking. Please try again."
          )
        }
      } finally {
        if (!cancelled) {
          setEnergyRankingLoading(false)
        }
      }
    }

    void loadEnergyRanking()

    return () => {
      cancelled = true
    }
  }, [projects, energyRankingMode])

  useEffect(() => {
    if (!projects.length) return
    let cancelled = false

    const loadAllSiteInfos = async () => {
      try {
        const rows = await fetchProjectDashboardSiteInfos()
        if (cancelled) return

        const nextMap: Record<string, ProjectSiteInfoLoadState> = {}
        for (const project of projects) {
          const row = (rows ?? []).find((r) => String(r.projectId ?? "").trim() === project.projectId) ?? null
          nextMap[project.projectId] = { status: "ready", data: normalizeProjectSiteInfo(project, row) }
        }
        setSiteInfoByProjectId(nextMap)
      } catch (error) {
        console.error("Failed to load project dashboard site infos", error)
        if (cancelled) return
        showApiErrorToast(
          "项目实时数据获取失败",
          "Failed to load site infos",
          error,
          "项目实时数据获取失败，请稍后重试",
          "Failed to load site infos. Please try again."
        )
      }
    }

    void loadAllSiteInfos()

    return () => {
      cancelled = true
    }
  }, [projects])

  const mappableProjects = useMemo(
    () => projects.filter((project) => project.longitude != null && project.latitude != null),
    [projects]
  )

  const projectClusters = useMemo(() => clusterMappableProjects(mappableProjects), [mappableProjects])
  const clusterFlagLayouts = useMemo(() => getClusterFlagLayoutMap(projectClusters), [projectClusters])

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

  const cachedSiteInfoItems = useMemo(
    () =>
      Object.values(siteInfoByProjectId)
        .map((entry) => entry.data)
        .filter((item): item is ProjectSiteInfoItem => item != null),
    [siteInfoByProjectId]
  )

  const totalChargeMWh = useMemo(
    () => cachedSiteInfoItems.reduce((sum, item) => sum + (item.totalChargeMWh ?? 0), 0),
    [cachedSiteInfoItems]
  )

  const totalDischargeMWh = useMemo(
    () => cachedSiteInfoItems.reduce((sum, item) => sum + (item.totalDischargeMWh ?? 0), 0),
    [cachedSiteInfoItems]
  )

  const averageEfficiency = useMemo(() => {
    const validItems = cachedSiteInfoItems.filter((item) => item.score != null)
    if (!validItems.length) return null
    return validItems.reduce((sum, item) => sum + (item.score ?? 0), 0) / validItems.length
  }, [cachedSiteInfoItems])

  const lifecycleCounts = useMemo<OverviewLifecycleCounts>(() => {
    const counts: OverviewLifecycleCounts = {
      commissioned: 0,
      construction: 0,
      planned: 0,
    }

    for (const stat of dashboardOverview?.statusStats ?? []) {
      const total = typeof stat?.total === "number" && !Number.isNaN(stat.total) ? stat.total : 0
      const status = `${stat?.status ?? ""}`.trim()

      if (status === "1") {
        counts.commissioned += total
        continue
      }

      if (status === "3") {
        counts.construction += total
        continue
      }

      counts.planned += total
    }

    return counts
  }, [dashboardOverview])

  const hoveredProject = useMemo(
    () => projects.find((project) => project.id === hoveredId) ?? null,
    [hoveredId, projects]
  )

  const activeProject = hoveredProject
  const activeSiteInfoState = useMemo(
    () => (activeProject ? siteInfoByProjectId[activeProject.projectId] ?? null : null),
    [activeProject, siteInfoByProjectId]
  )
  const activeItem = useMemo(
    () => activeSiteInfoState?.data ?? null,
    [activeSiteInfoState]
  )
  const activeLifecycleProject = useMemo(() => {
    if (!activeProject) return null

    return {
      ...activeProject,
      status: activeItem?.status ?? activeProject.status,
      workingDate: activeItem?.workingDate ?? activeProject.workingDate,
      ratedPower: activeItem?.ratedPower ?? activeProject.ratedPower,
      ratedCapacity: activeItem?.ratedCapacity ?? activeProject.ratedCapacity,
      region: activeItem?.region ?? activeProject.region,
      regionName: activeItem?.regionName ?? activeProject.regionName,
      regionPinyin: activeItem?.regionPinyin ?? activeProject.regionPinyin,
      projectName: activeItem?.projectName ?? activeProject.projectName,
    } satisfies ProjectOption
  }, [activeItem, activeProject])
  const activeRealtimeLabel = useMemo(
    () => (zh ? activeItem?.runtimeLabelZh ?? "--" : activeItem?.runtimeLabelEn ?? "--"),
    [activeItem, zh]
  )

  const detailCardLayout = useMemo(() => {
    const isMultiProject = Boolean(activeCluster && activeCluster.projects.length > 1)
    const cardWidth = isMultiProject ? 320 : 296
    const cardHeight = isMultiProject ? 360 : 420
    const sideGap = 14

    if (!markerPixelPos) {
      return {
        style: { left: "12px", bottom: "12px", width: isMultiProject ? "20rem" : "18.5rem" },
      }
    }

    let left = markerPixelPos.x + sideGap
    if (left + cardWidth > mapDimensions.width - 8) {
      left = markerPixelPos.x - cardWidth - sideGap
    }
    left = Math.max(8, Math.min(left, mapDimensions.width - cardWidth - 8))

    let top = markerPixelPos.y - cardHeight / 2
    top = Math.max(8, Math.min(top, mapDimensions.height - cardHeight - 8))

    return {
      style: {
        left: `${Math.round(left)}px`,
        top: `${Math.round(top)}px`,
        width: isMultiProject ? "20rem" : "18.5rem",
      },
    }
  }, [activeCluster, mapDimensions, markerPixelPos])

  const focusFrame = DEFAULT_FOCUS_FRAME
  const [mapZoomK, setMapZoomK] = useState(focusFrame.zoom)
  // Counter-scale exactly 1/k so markers stay constant screen size regardless of zoom level
  const markerScale = 1 / Math.max(mapZoomK, 1)
  // Keep labels readable while zooming instead of letting them feel smaller against the enlarged map.
  const markerLabelScale = 1 + Math.min(Math.max(mapZoomK - focusFrame.zoom, 0) * 0.12, 0.35)
  const mapProjectionScale = useMemo(() => Math.round(mapDimensions.width * 0.22), [mapDimensions.width])

  const projectCountries = useMemo(() => {
    const detectedCountries = new Set<string>()
    for (const p of mappableProjects) {
      const lng = p.longitude!
      const lat = p.latitude!
      for (const [country, [minLng, minLat, maxLng, maxLat]] of Object.entries(COUNTRY_BBOX)) {
        if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
          detectedCountries.add(country)
        }
      }
    }

    return expandLinkedCountrySelections(detectedCountries)
  }, [mappableProjects])
  const highlightedCountries = useMemo(() => {
    const set = new Set<string>(projectCountries)
    PRIORITY_MARKETS.forEach((country) => set.add(country))
    return set
  }, [projectCountries])
  const hoveredCountries = useMemo(
    () => (hoveredCountryName ? expandLinkedCountrySelections([hoveredCountryName]) : new Set<string>()),
    [hoveredCountryName]
  )
  const highlightedCountryLabels = useMemo(
    () =>
      Array.from(highlightedCountries)
        .filter((country) => !(country === "Taiwan" && highlightedCountries.has("China")))
        .map((country) => {
          const bbox = COUNTRY_BBOX[country]
          if (!bbox) return null

          const [minLng, minLat, maxLng, maxLat] = bbox
          const baseCenter: MapCoordinates = COUNTRY_LABEL_CENTERS[country] ?? [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
          const display = COUNTRY_LABELS[country]
          const label = zh ? display?.zh ?? country : display?.en ?? country

          return {
            country,
            center: baseCenter,
            label,
            isProspect: PRIORITY_MARKETS.has(country) && !projectCountries.has(country),
          }
        })
        .filter((item): item is { country: string; center: MapCoordinates; label: string; isProspect: boolean } => item != null),
    [highlightedCountries, projectClusters, projectCountries, zh]
  )
  const topEfficiencyItems = useMemo(() => eeRankingItems.slice(0, 5), [eeRankingItems])

  const maxEfficiencyScore = useMemo(() => {
    const max = eeRankingItems.reduce((value, item) => Math.max(value, item.score ?? 0), 0)
    return max > 0 ? max : 1
  }, [eeRankingItems])

  const energyRankingItems = useMemo(
    () => (energyRankingMode === "charge" ? chargeRankingItems : dischargeRankingItems),
    [chargeRankingItems, dischargeRankingItems, energyRankingMode]
  )

  const maxRankedEnergyValue = useMemo(() => {
    const max = energyRankingItems.reduce((value, item) => {
      const itemValue = energyRankingMode === "charge" ? item.chargeMWh : item.dischargeMWh
      return Math.max(value, itemValue)
    }, 0)

    return max > 0 ? max : 1
  }, [energyRankingItems, energyRankingMode])

  const mapStatusLegend = useMemo(
    () => [
      { key: "commissioned" as const, label: zh ? "已投运" : "Commissioned" },
      { key: "construction" as const, label: zh ? "建设中" : "Construction" },
      { key: "planned" as const, label: zh ? "待建设" : "Planned" },
    ],
    [zh]
  )
  const mapMarketLegend = useMemo(
    () => [
      {
        key: "landed" as const,
        label: zh ? "已落地项目" : "Landed Project",
        fill: "#0d6a88",
        stroke: "#2ab8dc",
      },
      {
        key: "prospect" as const,
        label: zh ? "意向市场" : "Prospect Market",
        fill: "#6d5314",
        stroke: "#f7c948",
      },
    ],
    [zh]
  )

  const siteCount = useMemo(() => {
    if (typeof dashboardOverview?.siteTotal === "number" && !Number.isNaN(dashboardOverview.siteTotal)) {
      return dashboardOverview.siteTotal
    }

    return projects.length
  }, [dashboardOverview?.siteTotal, projects.length])

  const onlineCount = useMemo(() => {
    if (typeof dashboardOverview?.onlineSiteTotal === "number" && !Number.isNaN(dashboardOverview.onlineSiteTotal)) {
      return dashboardOverview.onlineSiteTotal
    }

    return cachedSiteInfoItems.filter((item) => item.isOnline).length
  }, [cachedSiteInfoItems, dashboardOverview?.onlineSiteTotal])

  const offlineCount = useMemo(() => Math.max(siteCount - onlineCount, 0), [onlineCount, siteCount])

  const overviewRailItems = useMemo<OverviewRailItem[]>(
    () => [
      {
        key: "site-count",
        icon: Building2,
        label: zh ? "站点总数" : "Platform Sites",
        value: overviewLoading ? "--" : formatIntegerCount(siteCount),
        unit: zh ? "个" : "sites",
      },
      {
        key: "online-sites",
        icon: Activity,
        label: zh ? "在线站点数" : "Online Sites",
        value: overviewLoading ? "--" : formatIntegerCount(onlineCount),
        unit: zh ? "个" : "sites",
      },
      {
        key: "rated-power",
        icon: Zap,
        label: zh ? "总额定功率" : "Total Rated Power",
        value:
          overviewLoading || typeof dashboardOverview?.totalRatedPower !== "number" || Number.isNaN(dashboardOverview.totalRatedPower)
            ? "--"
            : formatOverviewMetric(dashboardOverview.totalRatedPower, dashboardOverview.totalRatedPower >= 100 ? 0 : 1),
        unit: "kW",
      },
      {
        key: "rated-capacity",
        icon: BatteryFull,
        label: zh ? "总额定容量" : "Total Rated Capacity",
        value:
          overviewLoading || typeof dashboardOverview?.totalRatedCapacity !== "number" || Number.isNaN(dashboardOverview.totalRatedCapacity)
            ? "--"
            : formatOverviewMetric(dashboardOverview.totalRatedCapacity),
        unit: "kWh",
      },
      {
        key: "total-charge",
        icon: ArrowUpCircle,
        label: zh ? "累计充电量" : "Total Charge of All Sites",
        value:
          overviewLoading || typeof dashboardOverview?.totalChargeWh !== "number" || Number.isNaN(dashboardOverview.totalChargeWh)
            ? "--"
            : formatOverviewMetric(dashboardOverview.totalChargeWh / 1000),
        unit: "kWh",
      },
      {
        key: "total-discharge",
        icon: ArrowDownCircle,
        label: zh ? "累计放电量" : "Total Discharge of All Sites",
        value:
          overviewLoading || typeof dashboardOverview?.totalDischargeWh !== "number" || Number.isNaN(dashboardOverview.totalDischargeWh)
            ? "--"
            : formatOverviewMetric(dashboardOverview.totalDischargeWh / 1000),
        unit: "kWh",
      },
    ],
    [dashboardOverview, onlineCount, overviewLoading, siteCount, zh]
  )

  const statusCards = useMemo<StatCardItem[]>(
    () => [
      { key: "sites", label: zh ? "总站点" : "Sites", value: formatIntegerCount(siteCount), accent: "green" },
      { key: "online", label: zh ? "在线" : "Online", value: formatIntegerCount(onlineCount), accent: "green" },
      { key: "offline", label: zh ? "离线" : "Offline", value: formatIntegerCount(offlineCount), accent: "neutral" },
    ],
    [offlineCount, onlineCount, siteCount, zh]
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

  const handleMarkerClick = (project: ProjectOption) => {
    if (onProjectSelect) {
      onProjectSelect(project)
      return
    }
    router.push(`/dashboard?projectId=${project.projectId}`)
  }

  const handleClusterClick = (cluster: ProjectCluster) => {
    const target = cluster.projects.find((p) => p.id === hoveredId) ?? cluster.projects[0]
    handleMarkerClick(target)
  }

  const handleClusterHover = (cluster: ProjectCluster, event: { clientX: number; clientY: number }) => {
    clearHoverExitTimer()
    setHoveredClusterId(cluster.id)
    setHoveredId(cluster.projects[0].id)
    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect()
      setMarkerPixelPos({ x: event.clientX - rect.left, y: event.clientY - rect.top })
    }
  }

  const handleClusterHoverEnd = () => {
    scheduleHoverExit()
  }

  const handleProjectHover = (projectId: string, event: { clientX: number; clientY: number }) => {
    clearHoverExitTimer()
    setHoveredClusterId(null)
    setHoveredId(projectId)
    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect()
      setMarkerPixelPos({ x: event.clientX - rect.left, y: event.clientY - rect.top })
    }
  }

  const handleProjectHoverEnd = () => {
    scheduleHoverExit()
  }

  const handleProjectNavigate = (projectId: string) => {
    router.push(`/dashboard?projectId=${projectId}`)
  }

  const handleSelectProjectInCluster = (projectId: string) => {
    clearHoverExitTimer()
    setHoveredId(projectId)
  }

  const handleCardMouseEnter = () => {
    clearHoverExitTimer()
  }

  useEffect(() => {
    return () => {
      if (hoverExitTimerRef.current) clearTimeout(hoverExitTimerRef.current)
    }
  }, [])

  const handleLogout = async () => {

    if (isLoggingOut) return

    setIsLoggingOut(true)
    try {
      await logoutWithCloud()
    } finally {
      clearStoredAuthToken()
      clearStoredAuthUsername()
      router.replace("/")
      router.refresh()
      setIsLoggingOut(false)
    }
  }

  return (
    <div
        className="relative flex h-full min-h-0 flex-col overflow-hidden text-[#e8f6ff]"
        style={{ background: "#081529" }}
    >
      <MapSceneBackdrop />

      <DashboardHeaderShell compact={useCompactHeader}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <NavBrand compact={useCompactHeader} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HeaderInfoBar compact={useCompactHeader} />
          <DashboardTopControls compact={useCompactHeader} isLoggingOut={isLoggingOut} onLogout={handleLogout} />
        </div>
      </DashboardHeaderShell>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col p-2">
        <section className="relative min-h-0 flex-1 overflow-hidden rounded-[24px] border border-[#22d3ee]/18 bg-[linear-gradient(180deg,rgba(8,20,38,0.48),rgba(5,14,28,0.60))] shadow-[0_20px_56px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(34,211,238,0.10)] backdrop-blur-[4px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.08),transparent_30%),radial-gradient(ellipse_at_88%_80%,rgba(40,120,255,0.07),transparent_32%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(34,211,238,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.10)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="pointer-events-none absolute inset-y-0 left-[-16%] w-[32%] bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.14),transparent)] blur-xl" style={{ animation: "map-bg-sweep 12s linear infinite" }} />

          <div className="relative grid min-h-full gap-2 p-2 xl:h-full xl:grid-cols-[13.75rem_minmax(0,1fr)_14.25rem] 2xl:grid-cols-[14.25rem_minmax(0,1fr)_14.75rem]">
            <aside className="order-2 flex min-h-0 flex-col gap-2 xl:order-1 xl:overflow-y-auto xl:overscroll-contain custom-scrollbar xl:pr-0.5">
              <div className={`${PANEL_CLASS} relative overflow-hidden ${useCompactOverviewRail ? "px-2.5 py-2" : "px-3 py-2.5"}`}>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(43,195,255,0.12),transparent_26%),radial-gradient(circle_at_86%_88%,rgba(35,129,255,0.10),transparent_30%)]" />
                <div className={`relative ${useCompactOverviewRail ? "mb-2 pb-2" : "mb-2.5 pb-2.5"}`}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`relative flex shrink-0 items-center justify-center ${useCompactOverviewRail ? "h-6 w-6 rounded-[8px]" : "h-7 w-7 rounded-[9px]"}`}
                      style={{
                        background: "linear-gradient(145deg,rgba(14,116,144,0.75),rgba(7,56,76,0.95))",
                        border: "1px solid rgba(34,211,238,0.36)",
                        boxShadow: "0 0 14px rgba(34,211,238,0.24), inset 0 1px 0 rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className="pointer-events-none absolute inset-0 rounded-[8px]" style={{ background: "radial-gradient(circle at 35% 28%, rgba(34,211,238,0.22), transparent 62%)" }} />
                      <Layers3 className={`relative text-[#22d3ee] ${useCompactOverviewRail ? "h-3 w-3" : "h-3.5 w-3.5"}`} />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className={`${useCompactOverviewRail ? "text-[13px]" : "text-[14px]"} font-black tracking-[0.06em] text-[#e9fbff]`}>
                        {zh ? "总览信息" : "Overview"}
                      </span>
                      <div className={`flex shrink-0 items-center gap-1 rounded-full border border-[#1d5574]/55 bg-[rgba(6,24,36,0.65)] ${useCompactOverviewRail ? "px-1.5 py-0.5" : "px-2 py-0.5"}`}>
                        <span className={`${useCompactOverviewRail ? "h-1.25 w-1.25" : "h-1.5 w-1.5"} rounded-full bg-[#22d3ee] shadow-[0_0_5px_rgba(34,211,238,0.9)]`} />
                        <span className={`${useCompactOverviewRail ? "text-[8px]" : "text-[9px]"} font-bold tracking-[0.12em] text-[#6ec8e0]`}>LIVE</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 h-px bg-[linear-gradient(90deg,rgba(34,211,238,0.5),rgba(34,211,238,0.12),transparent)]" />
                </div>

                <div className={`relative ${useCompactOverviewRail ? "space-y-1.25" : "space-y-1.5"}`}>
                  {overviewRailItems.map((item) => {
                    const accent = RAIL_ACCENTS[item.key] ?? RAIL_ACCENTS["site-count"]
                    return (
                    <div
                      key={item.key}
                      className={`group relative grid items-center border border-[#1d5675]/60 bg-[linear-gradient(180deg,rgba(8,24,40,0.94),rgba(5,15,28,0.98))] pl-0 shadow-[inset_0_1px_0_rgba(120,220,255,0.05),0_6px_16px_rgba(0,0,0,0.18)] overflow-hidden ${
                        useCompactOverviewRail
                          ? "grid-cols-[2.75rem_minmax(0,1fr)] gap-2 rounded-[14px] py-1.5 pr-2"
                          : "grid-cols-[3rem_minmax(0,1fr)] gap-2.5 rounded-[16px] py-2 pr-2.5"
                      }`}
                    >
                      {/* left accent bar */}
                      <div className="pointer-events-none absolute left-0 inset-y-[5px] w-[3px] rounded-r-full" style={{ background: accent.bar }} />
                      {/* top highlight line */}
                      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(133,236,255,0.25),transparent)]" />

                      {/* icon */}
                      <div className={`flex shrink-0 items-center justify-center ${useCompactOverviewRail ? "pl-2.5" : "pl-3"}`}>
                        <div
                          className={`relative flex items-center justify-center ${useCompactOverviewRail ? "h-8 w-8 rounded-[10px]" : "h-9 w-9 rounded-[11px]"}`}
                          style={{
                            background: accent.iconBg,
                            border: `1px solid ${accent.border}`,
                            boxShadow: `0 0 16px ${accent.glow}, inset 0 1px 0 rgba(255,255,255,0.09)`,
                          }}
                        >
                          <div className="pointer-events-none absolute inset-0 rounded-[10px]" style={{ background: `radial-gradient(circle at 35% 28%, ${accent.iconColor}28, transparent 62%)` }} />
                          <item.icon className={`relative ${useCompactOverviewRail ? "h-[0.95rem] w-[0.95rem]" : "h-[1.05rem] w-[1.05rem]"}`} style={{ color: accent.iconColor }} />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className={`${useCompactOverviewRail ? "text-[10px] leading-[1.3]" : "text-[10.5px] leading-snug"} font-semibold tracking-[0.03em] text-[#7fb7d7]`}>
                          {item.label}
                        </div>
                        <div className={`${useCompactOverviewRail ? "mt-0.5 gap-x-0.5" : "mt-0.5 gap-x-1"} flex flex-wrap items-end gap-y-0`}>
                          <span className={`${useCompactOverviewRail ? "text-[1.28rem]" : "text-[1.42rem] 2xl:text-[1.5rem]"} break-words font-black leading-none tracking-[0.01em] text-[#44e8ff] [text-shadow:0_0_14px_rgba(68,232,255,0.18)]`}>
                            {item.value}
                          </span>
                          <span className={`${useCompactOverviewRail ? "pb-0 text-[9.5px]" : "pb-0.5 text-[10px]"} font-bold uppercase tracking-[0.03em] text-[#5ed7ff]`}>
                            {item.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>
              </div>

              <div className="hidden">
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

              <div className="hidden">
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

              <div className="hidden">
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

            <div className="order-1 relative min-h-[30rem] overflow-hidden rounded-[22px] border border-[#22d3ee]/18 bg-[rgba(3,10,24,0.45)] xl:order-2 xl:min-h-0">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(0,90,160,0.38),rgba(0,30,70,0.15)_55%,transparent_78%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.45),transparent)]" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.20),transparent)]" />
              <div ref={mapContainerRef} className="absolute inset-0">
                <ComposableMap
                  projection="geoNaturalEarth1"
                  projectionConfig={{ scale: mapProjectionScale }}
                  width={mapDimensions.width}
                  height={mapDimensions.height}
                  style={{ width: "100%", height: "100%", display: "block" }}
                >
                  <ZoomableGroup center={focusFrame.center} zoom={focusFrame.zoom} minZoom={1} maxZoom={8} onMove={({ zoom }: { zoom: number }) => setMapZoomK(zoom)} onMoveEnd={({ zoom }: { zoom: number }) => setMapZoomK(zoom)}>
                    <Sphere id="map-sphere" fill="rgba(4,14,34,0.0)" stroke="rgba(34,211,238,0.14)" strokeWidth={0.6} />
                    <Graticule stroke="rgba(0,160,200,0.12)" strokeWidth={0.5} step={[30, 30]} />
                    <Geographies geography={GEO_URL}>
                      {({ geographies }: { geographies: GeographyFeature[] }) =>
                        geographies
                          .filter((geo: GeographyFeature) => !EXCLUDED_COUNTRY_NAMES.has(geo.properties?.name ?? ""))
                          .map((geo: GeographyFeature) => {
                            const countryName = geo.properties?.name ?? ""
                            const hasProject = projectCountries.has(countryName)
                            const isProspect = PRIORITY_MARKETS.has(countryName)
                            const isLinkedHover = hoveredCountries.has(countryName)
                            return (
                              <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                onMouseEnter={() => setHoveredCountryName(countryName)}
                                onMouseLeave={() => setHoveredCountryName((current) => (current === countryName ? null : current))}
                                style={{
                                  default: {
                                    fill: isLinkedHover ? (hasProject ? "#1280a8" : isProspect ? "#8a6918" : "#224f70") : hasProject ? "#0d6a88" : isProspect ? "#6d5314" : "#1a3d58",
                                    stroke: isLinkedHover ? (hasProject ? "#55d4f0" : isProspect ? "#ffd978" : "#55d4f0") : hasProject ? "#2ab8dc" : isProspect ? "#f7c948" : "#2a5878",
                                    strokeWidth: hasProject || isProspect ? 1.0 : 0.55,
                                    outline: "none",
                                    filter:
                                      isLinkedHover
                                        ? hasProject
                                          ? "drop-shadow(0 0 12px rgba(42,184,220,0.52))"
                                          : isProspect
                                            ? "drop-shadow(0 0 12px rgba(247,201,72,0.42))"
                                            : "none"
                                        : hasProject
                                        ? "drop-shadow(0 0 8px rgba(42,184,220,0.36))"
                                        : isProspect
                                          ? "drop-shadow(0 0 10px rgba(247,201,72,0.32))"
                                          : "none",
                                  },
                                  hover: {
                                    fill: hasProject ? "#1280a8" : isProspect ? "#8a6918" : "#224f70",
                                    stroke: hasProject ? "#55d4f0" : isProspect ? "#ffd978" : "#55d4f0",
                                    strokeWidth: 1.0,
                                    outline: "none",
                                    filter:
                                      hasProject
                                        ? "drop-shadow(0 0 12px rgba(42,184,220,0.52))"
                                        : isProspect
                                          ? "drop-shadow(0 0 12px rgba(247,201,72,0.42))"
                                          : "none",
                                  },
                                  pressed: {
                                    fill: "#1f6080",
                                    stroke: "#55d4f0",
                                    strokeWidth: 1.0,
                                    outline: "none",
                                  },
                                }}
                              />
                            )
                          })
                      }
                    </Geographies>

                    {highlightedCountryLabels.map((item) => {
                      return (
                        <Marker key={`country-label-${item.country}`} coordinates={item.center}>
                          <g transform={`scale(${markerScale})`} pointerEvents="none">
                            <g transform={`scale(${markerLabelScale})`}>
                              <text
                                y={0}
                                textAnchor="middle"
                                dominantBaseline="central"
                                style={{
                                  fontSize: zh ? "11px" : "9.5px",
                                  fontWeight: 800,
                                  fill: "#9fd8ff",
                                  letterSpacing: zh ? "0.08em" : "0.06em",
                                  textTransform: zh ? undefined : "uppercase",
                                }}
                              >
                                {item.label}
                              </text>
                            </g>
                          </g>
                        </Marker>
                      )
                    })}

                    {projectClusters.map((cluster) => {
                      const isClusterActive = hoveredClusterId === cluster.id
                      const flagLayout = clusterFlagLayouts.get(cluster.id) ?? { offsetX: 0, offsetY: 0 }

                      if (cluster.projects.length > 1) {
                        const clusterLifecycle = getClusterLifecycle(cluster.projects)
                        const clusterStyles = clusterLifecycle ? getLifecycleStyles(clusterLifecycle) : null
                        const regionName = getProjectRegionLabel(cluster.projects[0], zh)
                        const regionLabelW = getMarkerFlagWidth(regionName, zh, 52, 92)
                        const regionFlagH = 24
                        const regionFlagPointerH = 7
                        const badgeR = 7.4
                        const badgeCx = regionLabelW / 2 + badgeR - 2
                        const badgeCy = -regionFlagH + badgeR - 1
                        const regionFlagTopY = (isClusterActive ? -58 : -54) + flagLayout.offsetY
                        const regionStemTopY = regionFlagTopY - 4
                        const regionFlagPath = makeMarkerFlagPath(regionLabelW, regionFlagH, regionFlagPointerH)
                        const regionJointY = -20

                        return (
                          <Marker
                            key={cluster.id}
                            coordinates={cluster.coordinates}
                            onClick={() => handleClusterClick(cluster)}
                            onMouseEnter={(event: ReactMouseEvent<SVGGElement>) => handleClusterHover(cluster, event)}
                            onMouseLeave={handleClusterHoverEnd}
                          >
                            <g transform={`scale(${markerScale})`}>
                              {/* Pulse rings */}
                              <circle cx={0} cy={-18} r={10} fill="none" stroke={SHARED_RING_STROKE} strokeWidth={1.0} strokeOpacity={0}>
                                <animate attributeName="r" values="10;26" dur="2.8s" repeatCount="indefinite" begin="0s" />
                                <animate attributeName="stroke-opacity" values="0.45;0" dur="2.8s" repeatCount="indefinite" begin="0s" />
                              </circle>
                              <circle cx={0} cy={-18} r={10} fill="none" stroke={SHARED_RING_STROKE} strokeWidth={1.0} strokeOpacity={0}>
                                <animate attributeName="r" values="10;26" dur="2.8s" repeatCount="indefinite" begin="1.4s" />
                                <animate attributeName="stroke-opacity" values="0.45;0" dur="2.8s" repeatCount="indefinite" begin="1.4s" />
                              </circle>
                              <circle cx={0} cy={0} r={4.6} fill={SHARED_MARKER_FILL} stroke={SHARED_MARKER_STROKE} strokeWidth={1.1} />
                              <line
                                x1={0}
                                y1={-1}
                                x2={0}
                                y2={regionJointY}
                                stroke={SHARED_MARKER_FILL}
                                strokeWidth={isClusterActive ? 4.2 : 3.4}
                                strokeLinecap="round"
                                style={{ transition: "all 0.2s ease" }}
                              />
                              <line
                                x1={0}
                                y1={regionJointY}
                                x2={flagLayout.offsetX}
                                y2={regionStemTopY}
                                stroke={SHARED_MARKER_FILL}
                                strokeWidth={isClusterActive ? 3.7 : 3}
                                strokeLinecap="round"
                                style={{ transition: "all 0.2s ease" }}
                              />
                              <circle
                                cx={flagLayout.offsetX}
                                cy={regionStemTopY}
                                r={isClusterActive ? 5.3 : 4.8}
                                fill={SHARED_MARKER_FILL}
                                stroke={SHARED_MARKER_STROKE}
                                strokeWidth={1.1}
                                style={{ transition: "all 0.2s ease" }}
                              />
                              <g transform={`translate(${flagLayout.offsetX} ${regionFlagTopY}) scale(${markerLabelScale})`} style={{ transition: "all 0.2s ease" }}>
                                <path
                                  d={regionFlagPath}
                                  fill={SHARED_FLAG_FILL}
                                  stroke={clusterStyles?.flagStroke ?? SHARED_MARKER_STROKE}
                                  strokeWidth={isClusterActive ? 2 : 1.7}
                                  style={{ transition: "all 0.2s ease" }}
                                />
                                <path
                                  d={`M ${-regionLabelW / 2 + 10} ${-regionFlagH + 5} H ${regionLabelW / 2 - 18}`}
                                  stroke="rgba(255,255,255,0.22)"
                                  strokeWidth={0.9}
                                  strokeLinecap="round"
                                />
                                <text x={-4} y={-10.5} textAnchor="middle"
                                  style={{ fontSize: zh ? "11.5px" : "9.5px", fontWeight: 900, fill: clusterStyles?.text ?? "#f3f8ff", letterSpacing: zh ? "0.01em" : "0.05em" }}>
                                  {regionName}
                                </text>
                                <g transform={`translate(${badgeCx} ${badgeCy})`}>
                                  <circle r={badgeR} fill={SHARED_MARKER_FILL} stroke={SHARED_MARKER_STROKE} strokeWidth={1} />
                                  <text y={3.4} textAnchor="middle" style={{ fontSize: "10px", fontWeight: 900, fill: "#173a78" }}>
                                    {cluster.projects.length}
                                  </text>
                                </g>
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
                      const regionLabelW = getMarkerFlagWidth(projectLabel, zh, 56, 98)
                      const flagH = 25
                      const flagPointerH = 7
                      const flagTopY = (isActive ? -60 : -56) + flagLayout.offsetY
                      const stemTopY = flagTopY - 4
                      const flagPath = makeMarkerFlagPath(regionLabelW, flagH, flagPointerH)
                      const jointY = -20

                      return (
                        <Marker
                          key={cluster.id}
                          coordinates={cluster.coordinates}
                          onClick={() => handleClusterClick(cluster)}
                          onMouseEnter={(event: ReactMouseEvent<SVGGElement>) => handleProjectHover(project.id, event)}
                          onMouseLeave={handleProjectHoverEnd}
                        >
                          <g transform={`scale(${markerScale})`}>
                            {/* Pulse rings — commissioned projects only */}
                            {lifecycle === "commissioned" && (
                              <>
                                <circle cx={0} cy={-18} r={8} fill="none" stroke={styles.ringStroke} strokeWidth={1.1} strokeOpacity={0}>
                                  <animate attributeName="r" values="8;22" dur="2.5s" repeatCount="indefinite" begin="0s" />
                                  <animate attributeName="stroke-opacity" values="0.55;0" dur="2.5s" repeatCount="indefinite" begin="0s" />
                                </circle>
                                <circle cx={0} cy={-18} r={8} fill="none" stroke={styles.ringStroke} strokeWidth={1.1} strokeOpacity={0}>
                                  <animate attributeName="r" values="8;22" dur="2.5s" repeatCount="indefinite" begin="1.25s" />
                                  <animate attributeName="stroke-opacity" values="0.55;0" dur="2.5s" repeatCount="indefinite" begin="1.25s" />
                                </circle>
                              </>
                            )}
                            <circle cx={0} cy={0} r={5} fill={styles.markerFill} stroke={styles.markerStroke} strokeWidth={1.2} />
                            <line
                              x1={0}
                              y1={-2}
                              x2={0}
                              y2={jointY}
                              stroke={styles.markerFill}
                              strokeWidth={isActive ? 4.2 : 3.4}
                              strokeLinecap="round"
                              style={{ transition: "all 0.2s ease" }}
                            />
                            <line
                              x1={0}
                              y1={jointY}
                              x2={flagLayout.offsetX}
                              y2={stemTopY}
                              stroke={styles.markerFill}
                              strokeWidth={isActive ? 3.6 : 2.9}
                              strokeLinecap="round"
                              style={{ transition: "all 0.2s ease" }}
                            />
                            <circle
                              cx={flagLayout.offsetX}
                              cy={stemTopY}
                              r={isActive ? 5.5 : 4.9}
                              fill={styles.markerFill}
                              stroke={styles.markerStroke}
                              strokeWidth={1.1}
                              style={{ transition: "all 0.2s ease" }}
                            />
                            <g transform={`translate(${flagLayout.offsetX} ${flagTopY}) scale(${markerLabelScale})`} style={{ transition: "all 0.2s ease" }}>
                              <path
                                d={flagPath}
                                fill={styles.flagFill}
                                stroke={styles.flagStroke}
                                strokeWidth={isActive ? 2.2 : 1.9}
                                style={{ transition: "all 0.2s ease" }}
                              />
                              <path
                                d={`M ${-regionLabelW / 2 + 10} ${-flagH + 5} H ${regionLabelW / 2 - 10}`}
                                stroke="rgba(255,255,255,0.22)"
                                strokeWidth={0.9}
                                strokeLinecap="round"
                              />
                              <text y={-11} textAnchor="middle"
                                style={{ fontSize: zh ? "11.5px" : "9.5px", fontWeight: 900, fill: styles.text, letterSpacing: zh ? "0.01em" : "0.05em" }}>
                                {projectLabel}
                              </text>
                            </g>
                          </g>
                        </Marker>
                      )
                    })}
                  </ZoomableGroup>
                </ComposableMap>
              </div>

              <div className="pointer-events-none absolute bottom-3 left-3 z-20">
                <div
                  className="w-[11.5rem] rounded-[10px] px-2.5 py-2 backdrop-blur-[12px]"
                  style={{
                    background: "rgba(2,10,22,0.84)",
                    border: "1px solid rgba(96,180,214,0.22)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3), inset 0 0 12px rgba(80,180,220,0.08)",
                  }}
                >
                  <div className="text-[10px] font-semibold tracking-[0.1em] text-[#78aac0]">
                    {zh ? "项目状态" : "Project Status"}
                  </div>
                  <div className="mt-1 flex flex-col gap-1">
                    {mapStatusLegend.map((item) => {
                      const styles = getLifecycleStyles(item.key)
                      return (
                        <div key={item.key} className="flex items-center gap-2 rounded-[7px] border border-white/6 bg-white/[0.02] px-2 py-1">
                          <svg width="16" height="16" viewBox="-8 -18 16 18" className="shrink-0">
                            <circle cx={0} cy={0} r={2.2} fill={styles.markerFill} stroke={styles.markerStroke} strokeWidth={0.8} />
                            <line x1={0} y1={-1} x2={0} y2={-12} stroke={styles.markerFill} strokeWidth={2.2} strokeLinecap="round" />
                            <path
                              d={makeMarkerFlagPath(11, 8, 3)}
                              transform="translate(0 -10)"
                              fill={styles.flagFill}
                              stroke={styles.flagStroke}
                              strokeWidth={0.9}
                            />
                          </svg>
                          <span className="min-w-0 flex-1 text-[11px] font-semibold tracking-[0.04em]" style={{ color: styles.text }}>{item.label}</span>
                          <span className="text-[12px] font-black leading-none" style={{ color: styles.text }}>
                            {formatIntegerCount(lifecycleCounts[item.key])}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-3 right-3 z-20">
                <div
                  className="w-[11.5rem] rounded-[10px] px-2.5 py-2 backdrop-blur-[12px]"
                  style={{
                    background: "rgba(2,10,22,0.84)",
                    border: "1px solid rgba(96,180,214,0.22)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3), inset 0 0 12px rgba(80,180,220,0.08)",
                  }}
                >
                  <div className="text-[10px] font-semibold tracking-[0.1em] text-[#78aac0]">
                    {zh ? "市场类型" : "Market Type"}
                  </div>
                  <div className="mt-1 flex flex-col gap-1">
                    {mapMarketLegend.map((item) => (
                      <div key={item.key} className="flex items-center gap-2 rounded-[7px] border border-white/6 bg-white/[0.02] px-2 py-1">
                        <span
                          className="h-2.5 w-5 shrink-0 rounded-sm"
                          style={{
                            background: item.fill,
                            border: `1px solid ${item.stroke}`,
                            boxShadow: `0 0 8px ${item.stroke}33`,
                          }}
                        />
                        <span className="text-[11px] font-semibold tracking-[0.04em] text-[#d0eeff]">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {activeProject ? (
                <div
                  className="absolute z-20"
                  style={detailCardLayout.style}
                  onMouseEnter={handleCardMouseEnter}
                  onMouseLeave={activeCluster ? handleClusterHoverEnd : handleProjectHoverEnd}
                >
                  <div className="overflow-hidden rounded-[18px] border border-[#2c657f]/90 bg-[linear-gradient(180deg,rgba(6,18,31,0.97),rgba(4,11,22,0.98))] shadow-[0_18px_36px_rgba(0,0,0,0.34),0_0_0_1px_rgba(112,225,255,0.06)_inset] backdrop-blur-[18px]">
                    <div className="hidden">
                    <div className="pointer-events-none h-px w-full bg-[linear-gradient(90deg,transparent,rgba(126,233,255,0.45),transparent)]" />
                    {activeCluster && activeCluster.projects.length > 1 ? (
                      <>
                        <div className="border-b border-[#1f4457] px-3 py-2.5">
                          <div className="text-[10px] font-semibold tracking-[0.12em] text-[#79b5cf]">
                            {getProjectRegionLabel(activeCluster.projects[0], zh)}
                          </div>
                          <div className="mt-1 text-[13px] font-black leading-tight text-[#eefbff]">
                            {activeCluster.projects.length}
                            {zh ? " 个项目" : " Projects"}
                          </div>
                        </div>
                        <div className="custom-scrollbar max-h-[18rem] overflow-y-auto px-2 py-2">
                          <div className="space-y-2">
                            {activeCluster.projects.map((project) => {
                              const isSelected = hoveredId === project.id
                              return (
                                <button
                                  key={project.id}
                                  type="button"
                                  onClick={() => handleSelectProjectInCluster(project.id)}
                                  className={`w-full rounded-[15px] border px-3 py-2 text-left transition-all ${
                                    isSelected
                                      ? "border-[#34dddf] bg-[linear-gradient(180deg,rgba(20,72,88,0.42),rgba(9,29,43,0.72))] shadow-[0_0_0_1px_rgba(63,233,230,0.08)_inset]"
                                      : "border-[#21485d] bg-[linear-gradient(180deg,rgba(9,23,36,0.82),rgba(6,16,28,0.92))] hover:border-[#2a6b86]"
                                  }`}
                                >
                                  <div className="break-words text-[12px] font-black leading-snug text-[#f1fbff]">
                                    {getProjectName(project, zh)}
                                  </div>
                                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                                    <div className="rounded-[11px] border border-[#22465b] bg-[rgba(8,19,31,0.76)] px-2 py-1.5">
                                      <div className="text-[9px] font-medium tracking-[0.05em] text-[#7da9bf]">{zh ? "额定功率" : "Rated Power"}</div>
                                      <div className="mt-1 break-words text-[11px] font-semibold leading-snug text-[#edf9ff]">
                                        {getProjectPowerLabel(project, zh)}
                                      </div>
                                    </div>
                                    <div className="rounded-[11px] border border-[#22465b] bg-[rgba(8,19,31,0.76)] px-2 py-1.5">
                                      <div className="text-[9px] font-medium tracking-[0.05em] text-[#7da9bf]">{zh ? "额定容量" : "Rated Capacity"}</div>
                                      <div className="mt-1 break-words text-[11px] font-semibold leading-snug text-[#edf9ff]">
                                        {getProjectCapacityLabel(project, zh)}
                                      </div>
                                    </div>
                                    <div className="rounded-[11px] border border-[#22465b] bg-[rgba(8,19,31,0.76)] px-2 py-1.5">
                                      <div className="text-[9px] font-medium tracking-[0.05em] text-[#7da9bf]">{zh ? "投运日期" : "Go-Live"}</div>
                                      <div className="mt-1 break-words text-[11px] font-semibold leading-snug text-[#edf9ff]">
                                        {getProjectDateLabel(project, zh)}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="px-3 py-3">
                        <div className="text-[10px] font-semibold tracking-[0.12em] text-[#79b5cf]">
                          {zh ? "项目详情" : "Project Detail"}
                        </div>
                        <div className="mt-1 break-words text-[14px] font-black leading-snug text-[#f1fbff]">
                          {getProjectName(activeProject, zh)}
                        </div>
                        <div className="mt-3 grid gap-2">
                          <div className="rounded-[13px] border border-[#224b61] bg-[linear-gradient(180deg,rgba(10,25,38,0.86),rgba(6,16,28,0.94))] px-3 py-2">
                            <div className="text-[10px] font-medium tracking-[0.08em] text-[#7eaac2]">{zh ? "额定功率" : "Rated Power"}</div>
                            <div className="mt-1 break-words text-[13px] font-semibold leading-snug text-[#edf9ff]">
                              {getProjectPowerLabel(activeProject, zh)}
                            </div>
                          </div>
                          <div className="rounded-[13px] border border-[#224b61] bg-[linear-gradient(180deg,rgba(10,25,38,0.86),rgba(6,16,28,0.94))] px-3 py-2">
                            <div className="text-[10px] font-medium tracking-[0.08em] text-[#7eaac2]">{zh ? "额定容量" : "Rated Capacity"}</div>
                            <div className="mt-1 break-words text-[13px] font-semibold leading-snug text-[#edf9ff]">
                              {getProjectCapacityLabel(activeProject, zh)}
                            </div>
                          </div>
                          <div className="rounded-[13px] border border-[#224b61] bg-[linear-gradient(180deg,rgba(10,25,38,0.86),rgba(6,16,28,0.94))] px-3 py-2">
                            <div className="text-[10px] font-medium tracking-[0.08em] text-[#7eaac2]">{zh ? "投运日期" : "Go-Live"}</div>
                            <div className="mt-1 break-words text-[13px] font-semibold leading-snug text-[#edf9ff]">
                              {getProjectDateLabel(activeProject, zh)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    </div>
                    {/* Cluster project switcher — only shown when multiple projects share this marker */}
                    {activeCluster && activeCluster.projects.length > 1 ? (
                      <div className="border-b border-[#1d3f52] px-3 pt-2.5 pb-2">
                        <div className="mb-2 text-[11px] font-black tracking-[0.1em] text-[#d8f5ff] [text-shadow:0_0_10px_rgba(92,214,255,0.18)]">
                          {getProjectRegionLabel(activeCluster.projects[0], zh)}
                          &nbsp;·&nbsp;{activeCluster.projects.length}{zh ? " 个项目" : " projects"}
                        </div>
                        <div className="-mx-1 overflow-x-auto pb-1 custom-scrollbar">
                          <div className="flex min-w-max gap-1.5 px-1">
                            {activeCluster.projects.map((p) => {
                              const isSelected = hoveredId === p.id
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleSelectProjectInCluster(p.id)}
                                  className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold whitespace-nowrap transition-all ${
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
                            <div className="mt-0.5 truncate text-[15px] font-black text-[#f6fbff]">
                              {getProjectName(activeProject, zh)}
                            </div>
                          </div>
                          <div
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.07em] ${
                              getLifecycleStyles(normalizeLifecycle(activeLifecycleProject ?? activeProject)).badge
                            }`}
                          >
                            {getLifecycleText(normalizeLifecycle(activeLifecycleProject ?? activeProject), zh)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 px-3 py-2.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="rounded-[13px] border border-[#21455a] bg-[rgba(9,21,33,0.78)] px-2.5 py-1.5">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#7f98ab]">{zh ? "区域" : "Region"}</div>
                          <div className="mt-0.5 truncate text-[12px] font-semibold text-[#f2fbff]">
                            {getSiteRegionLabel(activeItem, activeProject, zh)}
                          </div>
                        </div>
                        <div className="rounded-[13px] border border-[#21455a] bg-[rgba(9,21,33,0.78)] px-2.5 py-1.5">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#7f98ab]">{zh ? "投运日期" : "Go-Live"}</div>
                          <div className="mt-0.5 truncate text-[12px] font-semibold text-[#f2fbff]">
                            {formatDateYmd(activeItem?.workingDate) || getProjectDateLabel(activeProject, zh)}
                          </div>
                        </div>
                        <div className="rounded-[13px] border border-[#21455a] bg-[rgba(9,21,33,0.78)] px-2.5 py-1.5">
                          <div className="text-[11px] font-medium tracking-[0.08em] text-[#7f98ab]">{zh ? "额定容量" : "Rated Capacity"}</div>
                          <div className="mt-0.5 truncate text-[12px] font-semibold text-[#f2fbff]">
                            {activeItem?.ratedCapacity || getProjectCapacityLabel(activeProject, zh)}
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
                            <span>{activeRealtimeLabel}</span>
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
                        onClick={() => handleProjectNavigate(activeProject.projectId)}
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
                <div className="absolute inset-0 z-20 flex items-center justify-center px-4">
                  <HistoryStyleLoadingIndicator
                    text={zh ? "正在加载地图与项目数据..." : "Loading map and project data..."}
                    variant="overlay"
                  />
                </div>
              ) : null}
            </div>

            <aside className="order-3 flex min-h-0 flex-col gap-2 xl:overflow-y-auto xl:pr-0.5 xl:overscroll-contain custom-scrollbar">

              {/* ── 能效排行 ── */}
              <div className={`${PANEL_CLASS} px-2.5 py-2.5`}>
                <div className="relative mb-2 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`relative flex shrink-0 items-center justify-center ${useCompactOverviewRail ? "h-6 w-6 rounded-[8px]" : "h-7 w-7 rounded-[9px]"}`}
                      style={{
                        background: "linear-gradient(145deg,rgba(120,82,0,0.75),rgba(64,42,0,0.95))",
                        border: "1px solid rgba(251,191,36,0.36)",
                        boxShadow: "0 0 14px rgba(251,191,36,0.22), inset 0 1px 0 rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className={`pointer-events-none absolute inset-0 ${useCompactOverviewRail ? "rounded-[7px]" : "rounded-[8px]"}`} style={{ background: "radial-gradient(circle at 35% 28%, rgba(251,191,36,0.22), transparent 62%)" }} />
                      <Star className={`relative text-[#fbbf24] ${useCompactOverviewRail ? "h-3 w-3" : "h-3.5 w-3.5"}`} />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className={`font-black tracking-[0.07em] text-[#e9fbff] ${useCompactOverviewRail ? "text-[12px]" : "text-[14px]"}`}>
                        {zh ? "能效排行" : "Efficiency Ranking"}
                      </span>
                      <span className="shrink-0 rounded-full border border-[#7a5a26]/55 bg-[rgba(60,38,4,0.55)] px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] text-[#d4a84e]">EE</span>
                    </div>
                  </div>
                  <div className="mt-2 h-px bg-[linear-gradient(90deg,rgba(251,191,36,0.48),rgba(251,191,36,0.10),transparent)]" />
                </div>

                <div className="space-y-1.5">
                  {eeRankingLoading ? (
                    <div className="flex justify-center py-1">
                      <HistoryStyleLoadingIndicator
                        text={zh ? "正在加载能效排行..." : "Loading efficiency ranking..."}
                      />
                    </div>
                  ) : (
                    topEfficiencyItems.slice(0, 3).map((item, index) => {
                      const styles = getLifecycleStyles(item.lifecycle)
                      const efficiencyValue = item.score ?? 0
                      const progressWidth = efficiencyValue <= 0 ? "0%" : `${Math.max(6, (efficiencyValue / maxEfficiencyScore) * 100)}%`
                      const rankBg =
                        index === 0 ? "bg-[#ffcf4f] text-[#181818]"
                        : index === 1 ? "bg-[#d7dde4] text-[#181818]"
                        : "bg-[#ce8a4b] text-white"

                      return (
                        <div key={item.projectId || `${item.projectName}-${index}`} className="relative overflow-hidden rounded-[14px] border border-[#21475c] bg-[linear-gradient(180deg,rgba(9,22,35,0.80),rgba(7,18,28,0.94))] px-2 py-2">
                          <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(251,191,36,0.22),transparent)]" />
                          <div className="flex items-start gap-2">
                            <div className={`mt-0.5 flex shrink-0 items-center justify-center font-black ${useCompactOverviewRail ? "h-5 w-5 rounded-[6px] text-[9px]" : "h-6 w-6 rounded-[8px] text-[10px]"} ${rankBg}`}>
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-1">
                                <div className={`min-w-0 break-words font-semibold leading-[1.3] text-[#eefcff] ${useCompactOverviewRail ? "text-[10px]" : "text-[11px]"}`}>
                                  {buildRankingProjectName(item.project, item.projectName, zh)}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleProjectNavigate(item.projectId)}
                                  className={`mt-px flex shrink-0 items-center justify-center rounded-full bg-[rgba(45,212,191,0.12)] text-[#2dd4bf] shadow-[0_0_7px_rgba(45,212,191,0.20)] transition-all hover:bg-[rgba(45,212,191,0.24)] hover:shadow-[0_0_12px_rgba(45,212,191,0.40)] hover:text-[#7efff4] ${useCompactOverviewRail ? "h-4 w-4" : "h-5 w-5"}`}
                                >
                                  <ArrowRight className={useCompactOverviewRail ? "h-2.5 w-2.5" : "h-3 w-3"} />
                                </button>
                              </div>
                              <div className={`mt-1 text-right font-black leading-none text-[#fbbf24] [text-shadow:0_0_10px_rgba(251,191,36,0.28)] ${useCompactOverviewRail ? "text-[13px]" : "text-[16px]"}`}>
                                {formatEfficiency(efficiencyValue)}
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#0d1f30]">
                                <div
                                  className={`h-full rounded-full bg-[linear-gradient(90deg,var(--tw-gradient-from),var(--tw-gradient-to))] ${styles.bar}`}
                                  style={{ width: progressWidth }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* ── 充放电排名 ── */}
              <div className={`${PANEL_CLASS} px-2.5 py-2.5`}>
                <div className="relative mb-2 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`relative flex shrink-0 items-center justify-center ${useCompactOverviewRail ? "h-6 w-6 rounded-[8px]" : "h-7 w-7 rounded-[9px]"}`}
                      style={{
                        background: "linear-gradient(145deg,rgba(13,100,90,0.75),rgba(6,52,48,0.95))",
                        border: "1px solid rgba(45,212,191,0.36)",
                        boxShadow: "0 0 14px rgba(45,212,191,0.22), inset 0 1px 0 rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className={`pointer-events-none absolute inset-0 ${useCompactOverviewRail ? "rounded-[7px]" : "rounded-[8px]"}`} style={{ background: "radial-gradient(circle at 35% 28%, rgba(45,212,191,0.22), transparent 62%)" }} />
                      <Zap className={`relative text-[#2dd4bf] ${useCompactOverviewRail ? "h-3 w-3" : "h-3.5 w-3.5"}`} />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className={`font-black tracking-[0.07em] text-[#e9fbff] ${zh ? "shrink-0 whitespace-nowrap" : "min-w-0"} ${useCompactOverviewRail ? "text-[12px]" : "text-[14px]"}`}>
                        {zh ? "充放电排名" : "Energy Ranking"}
                      </span>
                      <div className="inline-grid shrink-0 grid-cols-[1fr_auto_1fr] overflow-hidden rounded-[7px] border border-[#2d5778] bg-[rgba(8,22,38,0.95)] shadow-[inset_0_1px_0_rgba(151,218,255,0.05)]">
                        <button
                          type="button"
                          onClick={() => setEnergyRankingMode("charge")}
                          className={`inline-flex h-6 min-w-[46px] items-center justify-center px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.05em] transition-all ${
                            energyRankingMode === "charge"
                              ? zh
                                ? "bg-[linear-gradient(180deg,rgba(29,95,154,0.85),rgba(13,49,96,0.98))] text-[#4fe8da] shadow-[inset_0_1px_0_rgba(164,230,255,0.15)]"
                                : "bg-[linear-gradient(180deg,rgba(29,95,154,0.85),rgba(13,49,96,0.98))] text-[#4ade80] shadow-[inset_0_1px_0_rgba(164,230,255,0.15)]"
                              : zh
                                ? "bg-transparent text-[#6a96b0] hover:text-[#d0f0ff]"
                                : "bg-transparent text-[#7bbf92] hover:text-[#9df0b7]"
                          }`}
                        >
                          {zh ? "充" : <ChargeModeIcon />}
                        </button>
                        <div className="w-px bg-[rgba(74,125,158,0.35)]" />
                        <button
                          type="button"
                          onClick={() => setEnergyRankingMode("discharge")}
                          className={`inline-flex h-6 min-w-[46px] items-center justify-center px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.05em] transition-all ${
                            energyRankingMode === "discharge"
                              ? zh
                                ? "bg-[linear-gradient(180deg,rgba(29,95,154,0.85),rgba(13,49,96,0.98))] text-[#7ab8ff] shadow-[inset_0_1px_0_rgba(164,230,255,0.15)]"
                                : "bg-[linear-gradient(180deg,rgba(29,95,154,0.85),rgba(13,49,96,0.98))] text-[#ffd35a] shadow-[inset_0_1px_0_rgba(164,230,255,0.15)]"
                              : zh
                                ? "bg-transparent text-[#6a96b0] hover:text-[#d0f0ff]"
                                : "bg-transparent text-[#d7b763] hover:text-[#ffe083]"
                          }`}
                        >
                          {zh ? "放" : <DischargeModeIcon />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 h-px bg-[linear-gradient(90deg,rgba(45,212,191,0.48),rgba(45,212,191,0.10),transparent)]" />
                </div>

                <div className="space-y-1.5">
                  {energyRankingLoading ? (
                    <div className="flex justify-center py-1">
                      <HistoryStyleLoadingIndicator
                        text={zh ? "正在加载充放电排名..." : "Loading energy ranking..."}
                      />
                    </div>
                  ) : (
                    energyRankingItems.map((item, index) => {
                      const rankingValue = energyRankingMode === "charge" ? item.chargeMWh : item.dischargeMWh
                      const progressWidth = rankingValue <= 0 ? "0%" : `${Math.max(6, (rankingValue / maxRankedEnergyValue) * 100)}%`
                      const rankBg =
                        index === 0 ? "bg-[#ffcf4f] text-[#181818]"
                        : index === 1 ? "bg-[#d7dde4] text-[#181818]"
                        : index === 2 ? "bg-[#ce8a4b] text-white"
                        : "bg-[#1d3d51] text-[#9bc8df]"
                      const barGradient = energyRankingMode === "charge"
                        ? "bg-[linear-gradient(90deg,#2dd4bf,#38bdf8)]"
                        : "bg-[linear-gradient(90deg,#60a5fa,#818cf8)]"
                      const valueColor = energyRankingMode === "charge" ? "text-[#2dd4bf]" : "text-[#818cf8]"

                      return (
                        <div key={item.projectId || `${item.projectName}-${index}`} className="relative overflow-hidden rounded-[14px] border border-[#21475c] bg-[linear-gradient(180deg,rgba(9,22,35,0.80),rgba(7,18,28,0.94))] px-2 py-2">
                          <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(45,212,191,0.18),transparent)]" />
                          <div className="flex items-start gap-2">
                            <div className={`mt-0.5 flex shrink-0 items-center justify-center font-black ${useCompactOverviewRail ? "h-5 w-5 rounded-[6px] text-[9px]" : "h-6 w-6 rounded-[8px] text-[10px]"} ${rankBg}`}>
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-1">
                                <div className={`min-w-0 break-words font-semibold leading-[1.3] text-[#e4f4ff] ${useCompactOverviewRail ? "text-[10px]" : "text-[11px]"}`}>
                                  {buildRankingProjectName(item.project, item.projectName, zh)}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleProjectNavigate(item.projectId)}
                                  className={`mt-px flex shrink-0 items-center justify-center rounded-full bg-[rgba(45,212,191,0.12)] text-[#2dd4bf] shadow-[0_0_7px_rgba(45,212,191,0.20)] transition-all hover:bg-[rgba(45,212,191,0.24)] hover:shadow-[0_0_12px_rgba(45,212,191,0.40)] hover:text-[#7efff4] ${useCompactOverviewRail ? "h-4 w-4" : "h-5 w-5"}`}
                                >
                                  <ArrowRight className={useCompactOverviewRail ? "h-2.5 w-2.5" : "h-3 w-3"} />
                                </button>
                              </div>
                              <div className={`mt-1 text-right font-black leading-none ${valueColor} ${useCompactOverviewRail ? "text-[13px]" : "text-[16px]"}`}>
                                {rankingValue.toFixed(1)}
                                <span className="ml-0.5 text-[9px] font-bold opacity-70">MWh</span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#0d1f30]">
                                <div className={`h-full rounded-full ${barGradient}`} style={{ width: progressWidth }} />
                              </div>
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
