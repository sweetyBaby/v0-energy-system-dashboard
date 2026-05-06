import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps"
import { CircuitBoard, Globe, LogOut, MapPinned, Radar, ScanSearch } from "lucide-react"
import { EnerCloudMark } from "@/components/brand/enercloud-mark"
import { useLanguage } from "@/components/language-provider"
import { logoutWithCloud } from "@/lib/api/auth"
import { clearStoredAuthToken } from "@/lib/auth-storage"
import { fetchProjectOptionsByDevice, type ProjectOption } from "@/lib/api/project"

const GEO_URL = "/world-atlas.json"

type MapCoordinates = [number, number]

type GeographyFeature = {
  rsmKey: string
}

type CountryFocusPreset = {
  countryName: string
  zh: string
  en: string
  center: MapCoordinates
  zoom: number
  bounds: [number, number, number, number]
}

type FocusFrame = {
  center: MapCoordinates
  zoom: number
  labelZh: string
  labelEn: string
}

const COUNTRY_FOCUS_PRESETS: CountryFocusPreset[] = [
  { countryName: "China", zh: "中国区域", en: "China Region", center: [104.5, 34.6], zoom: 3.2, bounds: [73, 17, 136, 54] },
  {
    countryName: "United States of America",
    zh: "美国区域",
    en: "United States Region",
    center: [-98.5, 38.2],
    zoom: 2.55,
    bounds: [-126, 24, -66, 50],
  },
  { countryName: "Canada", zh: "加拿大区域", en: "Canada Region", center: [-98, 58], zoom: 2.1, bounds: [-141, 41, -52, 83] },
  { countryName: "Australia", zh: "澳大利亚区域", en: "Australia Region", center: [134.5, -25.5], zoom: 2.55, bounds: [112, -44, 154, -10] },
  { countryName: "Japan", zh: "日本区域", en: "Japan Region", center: [138.4, 37.7], zoom: 4.15, bounds: [128, 30, 146, 46] },
  { countryName: "South Korea", zh: "韩国区域", en: "South Korea Region", center: [127.8, 36.2], zoom: 5, bounds: [124, 33, 131, 39.5] },
  { countryName: "India", zh: "印度区域", en: "India Region", center: [79.2, 22.8], zoom: 3.35, bounds: [67, 6, 90, 36] },
  { countryName: "Brazil", zh: "巴西区域", en: "Brazil Region", center: [-53, -12], zoom: 2.7, bounds: [-74, -34, -34, 6] },
  { countryName: "Germany", zh: "德国区域", en: "Germany Region", center: [10.3, 51.1], zoom: 5.3, bounds: [5, 47, 16, 55.5] },
  { countryName: "France", zh: "法国区域", en: "France Region", center: [2.3, 46.4], zoom: 4.95, bounds: [-5.5, 41, 9.8, 51.5] },
  { countryName: "United Kingdom", zh: "英国区域", en: "United Kingdom Region", center: [-2.8, 54.6], zoom: 4.7, bounds: [-8.7, 49.5, 2.5, 59] },
  { countryName: "Italy", zh: "意大利区域", en: "Italy Region", center: [12.5, 42.8], zoom: 4.7, bounds: [6.3, 36, 19.2, 47.2] },
  { countryName: "Spain", zh: "西班牙区域", en: "Spain Region", center: [-3.5, 40.3], zoom: 4.4, bounds: [-10.2, 35, 4.8, 44.5] },
  { countryName: "United Arab Emirates", zh: "阿联酋区域", en: "UAE Region", center: [54.3, 24.2], zoom: 5.5, bounds: [51, 22, 57.5, 26.8] },
  { countryName: "Saudi Arabia", zh: "沙特区域", en: "Saudi Arabia Region", center: [44.7, 23.8], zoom: 3.85, bounds: [34, 15, 56, 33] },
  { countryName: "South Africa", zh: "南非区域", en: "South Africa Region", center: [24.5, -29.1], zoom: 3.8, bounds: [16, -35.5, 33.5, -21] },
]

const COUNTRY_PRESET_MAP = new Map(COUNTRY_FOCUS_PRESETS.map((preset) => [preset.countryName, preset]))

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const getProjectName = (project: ProjectOption, zh: boolean) =>
  (zh ? project.projectName : project.projectNameEn || project.projectName).trim()

const formatCapacity = (value: number | null, zh: boolean) => {
  if (value == null || Number.isNaN(value)) {
    return zh ? "待补充" : "Pending"
  }

  const nextValue = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
  return `${nextValue} MW`
}

const inferCountryFromCoordinates = (project: ProjectOption) => {
  if (project.longitude == null || project.latitude == null) {
    return null
  }

  const preset = COUNTRY_FOCUS_PRESETS.find(
    ({ bounds: [minLon, minLat, maxLon, maxLat] }) =>
      project.longitude! >= minLon &&
      project.longitude! <= maxLon &&
      project.latitude! >= minLat &&
      project.latitude! <= maxLat
  )

  return preset?.countryName ?? null
}

const getFallbackFocusFrame = (zh: boolean): FocusFrame => ({
  center: [12, 18],
  zoom: 1.02,
  labelZh: "全球项目分布",
  labelEn: "Global Project View",
})

const getBoundsFocusFrame = (projects: ProjectOption[], inferredCountries: string[], zh: boolean): FocusFrame => {
  if (projects.length === 0) {
    return getFallbackFocusFrame(zh)
  }

  if (projects.length === 1 && inferredCountries.length === 1) {
    const preset = COUNTRY_PRESET_MAP.get(inferredCountries[0])

    if (preset) {
      return {
        center: preset.center,
        zoom: Math.min(preset.zoom, 3.1),
        labelZh: preset.zh,
        labelEn: preset.en,
      }
    }
  }

  let minLon = Infinity
  let maxLon = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  for (const project of projects) {
    if (project.longitude == null || project.latitude == null) {
      continue
    }

    minLon = Math.min(minLon, project.longitude)
    maxLon = Math.max(maxLon, project.longitude)
    minLat = Math.min(minLat, project.latitude)
    maxLat = Math.max(maxLat, project.latitude)
  }

  if (!Number.isFinite(minLon) || !Number.isFinite(maxLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
    return getFallbackFocusFrame(zh)
  }

  const centerLon = (minLon + maxLon) / 2
  const centerLat = (minLat + maxLat) / 2
  const span = Math.max(maxLon - minLon, (maxLat - minLat) * 1.45)
  let zoom = 1.35

  if (span <= 1.5) zoom = 3.15
  else if (span <= 3) zoom = 2.95
  else if (span <= 6) zoom = 2.7
  else if (span <= 12) zoom = 2.4
  else if (span <= 24) zoom = 2.05
  else if (span <= 48) zoom = 1.7

  return {
    center: [centerLon, clamp(centerLat, -55, 72)],
    zoom,
    labelZh: inferredCountries.length > 0 ? "项目分布区域" : "全球项目分布",
    labelEn: inferredCountries.length > 0 ? "Project Coverage" : "Global Project View",
  }
}

const getProjectFocusFrame = (project: ProjectOption, inferredCountry: string | null, zh: boolean): FocusFrame => {
  if (inferredCountry) {
    const preset = COUNTRY_PRESET_MAP.get(inferredCountry)

    if (preset) {
      return {
        center: preset.center,
        zoom: preset.zoom,
        labelZh: preset.zh,
        labelEn: preset.en,
      }
    }
  }

  if (project.longitude == null || project.latitude == null) {
    return getFallbackFocusFrame(zh)
  }

  return {
    center: [project.longitude, clamp(project.latitude, -55, 72)],
    zoom: 4.25,
    labelZh: project.region ? `${project.region}区域` : "项目区域",
    labelEn: project.region ? `${project.region} Region` : "Project Region",
  }
}

type ProjectMapPanelProps = {
  onProjectSelect?: (project: ProjectOption) => void
}

export function ProjectMapPanel({ onProjectSelect }: ProjectMapPanelProps) {
  const router = useRouter()
  const { language, setLanguage } = useLanguage()
  const zh = language === "zh"

  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadProjects = async () => {
      try {
        const options = await fetchProjectOptionsByDevice()
        if (!cancelled) {
          setProjects(options)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadProjects()

    return () => {
      cancelled = true
    }
  }, [])

  const mappableProjects = useMemo(
    () => projects.filter((project) => project.longitude != null && project.latitude != null),
    [projects]
  )

  const projectCountryMap = useMemo(() => {
    const map = new Map<string, string | null>()

    for (const project of projects) {
      map.set(project.id, inferCountryFromCoordinates(project))
    }

    return map
  }, [projects])

  const hoveredProject = useMemo(
    () => projects.find((project) => project.id === hoveredId) ?? null,
    [hoveredId, projects]
  )

  const representedCountries = useMemo(() => {
    const nextCountries = new Set<string>()

    for (const project of mappableProjects) {
      const country = projectCountryMap.get(project.id)
      if (country) {
        nextCountries.add(country)
      }
    }

    return Array.from(nextCountries)
  }, [mappableProjects, projectCountryMap])

  const focusFrame = useMemo(() => getFallbackFocusFrame(zh), [zh])

  const totalInstalledMw = useMemo(
    () => projects.reduce((sum, project) => sum + (project.installedCapacityMw ?? 0), 0),
    [projects]
  )

  const infoItems = hoveredProject
    ? [
        {
          label: zh ? "项目名称" : "Project",
          value: getProjectName(hoveredProject, zh),
        },
        {
          label: zh ? "地理位置" : "Region",
          value: hoveredProject.region || (zh ? "未标注" : "Unspecified"),
        },
        {
          label: zh ? "储能容量" : "Capacity",
          value: formatCapacity(hoveredProject.installedCapacityMw, zh),
        },
        {
          label: zh ? "接入状态" : "Status",
          value: zh ? "已接入平台" : "Connected",
        },
      ]
    : []

  const summaryItems = [
    {
      key: "sites",
      icon: MapPinned,
      color: "bg-[#20d9ff]",
      label: zh ? "已接入项目" : "Connected Sites",
      value: `${projects.length}${zh ? "座" : ""}`,
      detail: zh ? `${projects.length} 个站点接入平台` : `${projects.length} sites online`,
    },
    {
      key: "mapped",
      icon: ScanSearch,
      color: "bg-[#4ef7cf]",
      label: zh ? "可定位站点" : "Mapped Sites",
      value: `${mappableProjects.length}${zh ? "座" : ""}`,
      detail: zh ? "支持自动聚焦定位" : "Auto-focus enabled",
    },
    {
      key: "regions",
      icon: Globe,
      color: "bg-[#f4c45e]",
      label: zh ? "覆盖区域" : "Coverage",
      value: `${representedCountries.length || 1}${zh ? "个" : ""}`,
      detail: zh ? focusFrame.labelZh : focusFrame.labelEn,
    },
    {
      key: "capacity",
      icon: CircuitBoard,
      color: "bg-[#ff9b6a]",
      label: zh ? "总装机规模" : "Installed MW",
      value: formatCapacity(totalInstalledMw || null, zh),
      detail: zh ? "按已录入项目统计" : "Based on recorded sites",
    },
  ]

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

  const handleLogout = async () => {
    if (isLoggingOut) {
      return
    }

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
    <div className="relative flex h-full flex-col overflow-hidden bg-[#04111d] text-[#e8f4fc]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.15),transparent_24%),radial-gradient(circle_at_20%_32%,rgba(0,212,170,0.08),transparent_22%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.08),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(78,247,207,0.03),transparent_48%),repeating-linear-gradient(0deg,transparent,transparent_42px,rgba(67,206,255,0.018)_43px)]" />

      <div className="relative z-10 flex h-full flex-col overflow-hidden p-4">
        <header className="relative flex shrink-0 items-center justify-between overflow-hidden rounded-[18px] border border-[#1f5872] bg-[linear-gradient(180deg,rgba(8,23,41,0.98),rgba(6,17,31,0.99))] px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/55 to-transparent" />

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[radial-gradient(circle_at_50%_38%,rgba(36,229,217,0.18),rgba(7,25,34,0.9)_72%)]">
              <EnerCloudMark className="h-5 w-5 text-[#f7fafc]" glowClassName="text-[#24e5d9]/28" />
            </div>
            <div>
              <h1
                className="text-lg font-black tracking-[0.05em]"
                style={{
                  backgroundImage: "linear-gradient(180deg,#f8feff 0%,#d6f9ff 45%,#7effd7 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 10px rgba(60,223,255,0.32))",
                }}
              >
                EnerCloud
              </h1>
              <p className="text-[11px] tracking-[0.24em] text-[#7ea4bb]">
                {zh ? "项目地图" : "PROJECT MAP"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex overflow-hidden rounded-[12px] border border-[#27496f] bg-[rgba(9,18,45,0.82)]">
              {(["zh", "en"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1.5 text-xs font-semibold tracking-[0.12em] transition-colors ${
                    language === lang
                      ? "bg-[linear-gradient(180deg,rgba(28,219,190,0.96),rgba(10,193,165,0.9))] text-[#04241c]"
                      : "text-[#85a9cb] hover:text-[#e6f4ff]"
                  }`}
                >
                  {lang === "zh" ? "中文" : "EN"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-1.5 rounded-[12px] border border-[#27496f] bg-[rgba(9,18,45,0.82)] px-3 py-2 text-xs font-semibold text-[#85a9cb] transition-colors hover:text-[#e6f4ff] disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              {zh ? "退出" : "Logout"}
            </button>
          </div>
        </header>

        <section className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-[22px] border border-[#1e6f86] bg-[linear-gradient(180deg,rgba(4,16,29,0.99),rgba(2,12,22,1))] shadow-[0_22px_64px_rgba(0,0,0,0.28)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(42,230,227,0.18),transparent_18%),radial-gradient(circle_at_24%_58%,rgba(58,190,255,0.1),transparent_26%),radial-gradient(circle_at_82%_70%,rgba(40,245,196,0.08),transparent_24%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,20,34,0.04)_0%,rgba(6,20,34,0)_28%,rgba(5,14,24,0.24)_100%)]" />
          <div className="absolute inset-0">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 156 }}
              style={{ width: "100%", height: "100%" }}
            >
              <ZoomableGroup center={focusFrame.center} zoom={focusFrame.zoom} minZoom={1} maxZoom={8}>
                <Geographies geography={GEO_URL}>
                  {({ geographies }: { geographies: GeographyFeature[] }) =>
                    geographies.map((geo: GeographyFeature) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        style={{
                          default: {
                            fill: "#49c8e6",
                            fillOpacity: 0.2,
                            stroke: "#85e7f2",
                            strokeWidth: 0.6,
                            outline: "none",
                          },
                          hover: {
                            fill: "#59e0f2",
                            fillOpacity: 0.28,
                            stroke: "#9ef2fb",
                            strokeWidth: 0.65,
                            outline: "none",
                          },
                          pressed: {
                            fill: "#59e0f2",
                            fillOpacity: 0.28,
                            stroke: "#9ef2fb",
                            strokeWidth: 0.65,
                            outline: "none",
                          },
                        }}
                      />
                    ))
                  }
                </Geographies>

                {mappableProjects.map((project) => {
                  const isHighlighted = hoveredId === project.id

                  return (
                    <Marker
                      key={project.id}
                      coordinates={[project.longitude!, project.latitude!]}
                      onClick={() => handleMarkerClick(project)}
                      onMouseEnter={() => setHoveredId(project.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <circle
                        r={isHighlighted ? 15 : 11}
                        fill="rgba(99,255,241,0.06)"
                        stroke="rgba(99,255,241,0.24)"
                        strokeWidth={0.8}
                      />
                      <path
                        d="M0,-12 C5,-12 9,-8 9,-2 C9,5 1,10 0,12 C-1,10 -9,5 -9,-2 C-9,-8 -5,-12 0,-12 Z"
                        fill={isHighlighted ? "#93fff3" : "#57f2e2"}
                        stroke={isHighlighted ? "#f4fffd" : "#b4fff8"}
                        strokeWidth={1}
                        style={{
                          filter: isHighlighted
                            ? "drop-shadow(0 0 8px rgba(77,255,234,0.72))"
                            : "drop-shadow(0 0 5px rgba(77,255,234,0.36))",
                          transition: "all 0.2s ease",
                        }}
                      />
                      <circle
                        r={3.2}
                        cy={-3}
                        fill="#083340"
                      />
                    </Marker>
                  )
                })}
              </ZoomableGroup>
            </ComposableMap>
          </div>

          <div className="pointer-events-none absolute left-5 top-5 h-16 w-16 border-l border-t border-[#34f0ff]/35" />
          <div className="pointer-events-none absolute right-5 top-5 h-16 w-16 border-r border-t border-[#34f0ff]/35" />
          <div className="pointer-events-none absolute bottom-5 left-5 h-16 w-16 border-b border-l border-[#34f0ff]/28" />
          <div className="pointer-events-none absolute bottom-5 right-5 h-16 w-16 border-b border-r border-[#34f0ff]/28" />
          <div className="absolute bottom-10 left-10 z-20 w-[24rem] rounded-[18px] border border-[#2a8293]/55 bg-[linear-gradient(180deg,rgba(5,22,31,0.84),rgba(3,14,21,0.94))] px-4 py-4 shadow-[0_16px_42px_rgba(0,0,0,0.24)] backdrop-blur-[12px]">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-[#86dfea]">
              <Radar className="h-3.5 w-3.5 text-[#57f2e2]" />
              {zh ? "项目概览" : "SITE SUMMARY"}
            </div>
            <div className="mb-3 h-px bg-gradient-to-r from-transparent via-[#4ae8f0]/45 to-transparent" />
            <div className="grid grid-cols-2 gap-3">
              {summaryItems.map((item) => {
                const Icon = item.icon

                return (
                  <div
                    key={item.key}
                    className="rounded-[14px] border border-[#2d7282]/42 bg-[linear-gradient(180deg,rgba(8,30,40,0.62),rgba(5,18,26,0.74))] px-3 py-3 text-sm text-[#d9f6ff] shadow-[inset_0_1px_0_rgba(110,255,240,0.06)]"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.color} shadow-[0_0_10px_rgba(110,255,240,0.28)]`} />
                      <Icon className="h-3.5 w-3.5 text-[#7ef7ee]" />
                      <span className="truncate text-[12px] font-semibold text-[#a7dfe7]">{item.label}</span>
                    </div>
                    <div className="mt-2 text-[1.05rem] font-bold tracking-[0.02em] text-white">{item.value}</div>
                    <div className="mt-1 text-[11px] leading-5 text-[#86b9c7]">{item.detail}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {hoveredProject ? (
            <div className="absolute right-10 top-[11.5rem] z-20 w-[17rem] rounded-[18px] border border-[#2a8293]/55 bg-[linear-gradient(180deg,rgba(5,22,31,0.86),rgba(3,14,21,0.94))] px-4 py-4 shadow-[0_16px_42px_rgba(0,0,0,0.24)] backdrop-blur-[14px]">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-[#86dfea]">
                <ScanSearch className="h-3.5 w-3.5 text-[#57f2e2]" />
                {zh ? "项目详情" : "PROJECT DETAILS"}
              </div>
              <div className="mb-3 h-px bg-gradient-to-r from-transparent via-[#4ae8f0]/45 to-transparent" />
              <div className="space-y-2.5">
                {infoItems.map((item) => (
                  <div
                    key={item.label}
                    className="grid grid-cols-[5.1rem_minmax(0,1fr)] gap-2 rounded-[12px] border border-[#2d7282]/36 bg-[rgba(8,28,38,0.4)] px-3 py-2.5 text-sm"
                  >
                    <div className="text-[#8ab9c5]">{item.label}</div>
                    <div className="truncate font-semibold text-[#f2ffff]">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
