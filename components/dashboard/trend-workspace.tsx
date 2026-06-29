"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  FolderPlus,
  Folder as FolderIcon,
  Gauge,
  LineChart as LineChartIcon,
  Maximize2,
  Minimize2,
  RefreshCw,
  Save,
  Search,
  Star,
  Table as TableIcon,
  Trash2,
  TrendingUp,
} from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { BcuSelector } from "@/components/dashboard/bcu-selector"
import { DeviceVariableTree, type TreeDevice } from "@/components/dashboard/device-selection-tree"
import { HistoryStyleLoadingIndicator } from "@/components/dashboard/history-style-loading-indicator"
import { RailCollapseButton, RailRestoreHandle } from "@/components/dashboard/rail-collapse-controls"
import { TrendRangePicker } from "@/components/dashboard/trend-range-picker"
import { useLanguage } from "@/components/language-provider"
import { useDashboardViewport } from "@/hooks/use-dashboard-viewport"
import { DASHBOARD_DENSE_PANEL_SCALE, useFluidScale } from "@/hooks/use-fluid-scale"
import type { ProjectDevice } from "@/lib/api/project"
import { buildMonitorDevices } from "@/lib/device-selection"
import {
  buildDeviceNodeId,
  fetchTrendSeries,
  parseTrendNodeId,
  resolveNodeMeta,
  startOfToday,
  TREND_DEFAULT_RANGE_MS,
  TREND_INTERVALS,
  TREND_INTERVAL_RAW,
  TREND_VARIABLE_BY_KEY,
  TREND_VARIABLES,
  type TrendFetchResult,
  type TrendIntervalSeconds,
  type TrendNode,
  type TrendSelection,
  type TrendVariableKey,
} from "@/lib/api/trend-analysis"

const SERIES_COLORS = [
  "#22d3ee", "#34d399", "#f59e0b", "#a78bfa", "#f472b6", "#60a5fa",
  "#fb7185", "#facc15", "#4ade80", "#38bdf8", "#c084fc", "#fca5a5",
]

const SCROLLBAR =
  "[scrollbar-color:rgba(34,211,238,0.38)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar]:h-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#1f4f78] [&::-webkit-scrollbar-thumb:hover]:bg-[#2aa7b3]"

const AUTO_REFRESH_MS = 10000

export type TrendWorkspaceMode = "trend" | "status"

type ViewMode = "chart" | "table"

type TrendFolder = { id: string; name: string }

type TrendTemplate = {
  id: string
  name: string
  folderId: string | null
  nodeIds: string[]
  /** Window length to re-apply on load (trend mode only). */
  durationMs: number
  interval: TrendIntervalSeconds
}

type TrendStore = { folders: TrendFolder[]; templates: TrendTemplate[] }

const EMPTY_STORE: TrendStore = { folders: [], templates: [] }

/**
 * Built-in "通用模板": mirrors the measurement points of the BCU 运行状态曲线
 * (Pack 电压 / 电流 / SOC / 单体温度 / 单体电压). Always present, selected by
 * default on entry. Its node ids are bound to the site's first rack device.
 */
const GENERAL_TEMPLATE_ID = "__general__"
const GENERAL_TEMPLATE_VARIABLE_KEYS: TrendVariableKey[] = [
  "clusterVoltage",
  "clusterCurrent",
  "soc",
  "maxCellVoltage",
  "minCellVoltage",
  "maxTemp",
  "minTemp",
]

const genId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `${Date.now()}-${Math.round(Math.random() * 1e6)}`
}

// Sentinel <select> value for the "保存到 → 新建分组" inline-create option.
const NEW_GROUP_VALUE = "__new_group__"

// Lightweight fuzzy match for the template picker search: a case-insensitive
// substring hit, or a character-subsequence match (so "tyqs" matches "通用-曲势"
// style abbreviations). Empty query matches everything.
const fuzzyMatch = (query: string, text: string) => {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const t = text.toLowerCase()
  if (t.includes(q)) return true
  let i = 0
  for (let c = 0; c < t.length && i < q.length; c += 1) {
    if (t[c] === q[i]) i += 1
  }
  return i === q.length
}

const loadStore = (storageKey: string): TrendStore => {
  if (typeof window === "undefined") return EMPTY_STORE
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return EMPTY_STORE
    const parsed = JSON.parse(raw) as Partial<TrendStore>
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      templates: Array.isArray(parsed.templates) ? parsed.templates : [],
    }
  } catch {
    return EMPTY_STORE
  }
}

const persistStore = (storageKey: string, store: TrendStore) => {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(store))
  } catch {
    /* storage may be unavailable; ignore */
  }
}

// Per-workspace left-rail UI prefs (rail collapsed). Kept apart from the
// template store under a `:ui` suffix so the rail remembers its layout across
// visits without touching saved templates.
type UiPrefs = { railCollapsed: boolean }
const DEFAULT_UI_PREFS: UiPrefs = { railCollapsed: false }
const loadUiPrefs = (storageKey: string): UiPrefs => {
  if (typeof window === "undefined") return DEFAULT_UI_PREFS
  try {
    const raw = window.localStorage.getItem(`${storageKey}:ui`)
    if (!raw) return DEFAULT_UI_PREFS
    const parsed = JSON.parse(raw) as Partial<UiPrefs>
    return {
      railCollapsed: typeof parsed.railCollapsed === "boolean" ? parsed.railCollapsed : DEFAULT_UI_PREFS.railCollapsed,
    }
  } catch {
    return DEFAULT_UI_PREFS
  }
}
const persistUiPrefs = (storageKey: string, prefs: UiPrefs) => {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(`${storageKey}:ui`, JSON.stringify(prefs))
  } catch {
    /* storage may be unavailable; ignore */
  }
}

const pad = (value: number) => String(value).padStart(2, "0")

const toLocalInput = (ms: number) => {
  const date = new Date(ms)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`
}

const formatTick = (time: number, spanMs: number) => {
  const date = new Date(time)
  const hm = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  if (spanMs > 24 * 60 * 60 * 1000) return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${hm}`
  return spanMs > 6 * 60 * 60 * 1000 ? hm : `${hm}:${pad(date.getSeconds())}`
}

const formatFullTime = (time: number) => {
  const date = new Date(time)
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`
}

const nodeOrderRank = (node: TrendNode, deviceRank: number, varOrder: Map<string, number>) => {
  if (node.kind === "device") return [deviceRank, 0, varOrder.get(node.variableKey) ?? 0, 0] as const
  const cellVarOrder: Record<string, number> = { voltage: 0, temp1: 1, temp2: 2, temp3: 3 }
  return [deviceRank, 1, node.cell, cellVarOrder[node.cellVar] ?? 0] as const
}

export function TrendWorkspace({
  devices,
  projectId,
  mode,
  storageKeyOverride,
  titleZh,
  titleEn,
  maxSelectionOverride,
  includeStationDevices = true,
}: {
  devices: ProjectDevice[]
  projectId: string
  mode: TrendWorkspaceMode
  storageKeyOverride?: string
  titleZh?: string
  titleEn?: string
  maxSelectionOverride?: number
  includeStationDevices?: boolean
}) {
  const isStatus = mode === "status"
  const storageKey = storageKeyOverride ?? (isStatus ? "device-status-store-v2" : "trend-analysis-store-v4")
  const maxSelection = maxSelectionOverride ?? (isStatus ? 24 : 18)

  const { language } = useLanguage()
  const { isCompactViewport } = useDashboardViewport()
  const zh = language === "zh"
  const scale = useFluidScale<HTMLDivElement>(1180, 2560, { ...DASHBOARD_DENSE_PANEL_SCALE, maxRootPx: 25 })
  const titleSize = scale.clampText(0.92, 1, 1.4)
  const labelSize = scale.fluid(11.5, 14.5)
  const controlSize = scale.fluid(11.5, 14)
  const chartFontSize = scale.chart(10, 14)

  const safeDevices = useMemo<TreeDevice[]>(
    () => buildMonitorDevices(projectId, devices, includeStationDevices),
    [devices, includeStationDevices, projectId]
  )

  // Node ids for the built-in 通用模板, bound to the site's first rack device.
  const generalTemplateNodeIds = useMemo(() => {
    const targetDevice = safeDevices.find((device) => (device.deviceKind ?? "rack") === "rack") ?? safeDevices[0]
    if (!targetDevice) return []
    const kind = targetDevice.deviceKind ?? "rack"
    return GENERAL_TEMPLATE_VARIABLE_KEYS.filter((key) => TREND_VARIABLE_BY_KEY[key]?.deviceKinds.includes(kind)).map(
      (key) => buildDeviceNodeId(targetDevice.deviceId, key)
    )
  }, [safeDevices])

  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  // Whole merged left rail collapse (frees the chart). The 模板 area within the
  // rail has its own open/closed state and defaults open; both are restored from
  // persisted UI prefs on mount.
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("chart")
  const [startTime, setStartTime] = useState(() => Date.now() - TREND_DEFAULT_RANGE_MS)
  const [endTime, setEndTime] = useState(() => Date.now())
  const [interval, setSampleInterval] = useState<TrendIntervalSeconds>(TREND_INTERVAL_RAW)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshToken, setRefreshToken] = useState(0)
  const [result, setResult] = useState<TrendFetchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())

  // ---- chart zoom / pan / fullscreen ----
  // X 轴可见时间窗口（null = 全量）。滚轮缩放、拖拽平移都只改这个域。
  const [xDomain, setXDomain] = useState<[number, number] | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const chartCardRef = useRef<HTMLDivElement>(null)
  const xDomainRef = useRef<[number, number] | null>(null)
  const fullDomainRef = useRef<[number, number] | null>(null)
  const minSpanRef = useRef(1000)
  // 最近一次悬停的 (像素x, 数据时间值)，用于把滚轮/拖拽换算成时间域。
  const hoverRef = useRef<{ x: number; val: number } | null>(null)
  const valuePerPixelRef = useRef(0)
  const panRef = useRef<{ startX: number; domain: [number, number] } | null>(null)
  const wheelCleanupRef = useRef<(() => void) | null>(null)

  // Template / folder store (localStorage-backed; swap for an API later).
  const [store, setStore] = useState<TrendStore>(EMPTY_STORE)
  // Groups are expanded by default; this tracks the ones the user has manually
  // collapsed (presence = collapsed, absence = open).
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  // 模板 picker dropdown (transient — not persisted) + its fuzzy-search query.
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false)
  const [templateQuery, setTemplateQuery] = useState("")
  const [showSave, setShowSave] = useState(false)
  const [saveName, setSaveName] = useState("")
  const [saveFolderId, setSaveFolderId] = useState<string>("")
  // Inline "新建分组" name typed inside the save popover (when 保存到 = 新建分组).
  const [saveGroupName, setSaveGroupName] = useState("")
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const saveRef = useRef<HTMLDivElement>(null)
  const templatePickerRef = useRef<HTMLDivElement>(null)
  const initializedKeyRef = useRef<string | null>(null)
  const uiPrefsLoadedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    setStore(loadStore(storageKey))
  }, [storageKey])

  // Persist rail layout changes. Declared BEFORE the load effect so that on the
  // first mount flush (and after any storageKey change) it runs while the loaded
  // key still differs from the current storageKey and skips — otherwise it would
  // write the previous workspace's prefs over the new key's stored prefs before
  // the load effect restores them.
  useEffect(() => {
    if (uiPrefsLoadedKeyRef.current !== storageKey) return
    persistUiPrefs(storageKey, { railCollapsed })
  }, [storageKey, railCollapsed])

  // Restore the rail layout for this workspace on mount and whenever storageKey
  // changes; the persist effect above then re-runs with the loaded values (now
  // that the loaded key matches) on the following render.
  useEffect(() => {
    const prefs = loadUiPrefs(storageKey)
    setRailCollapsed(prefs.railCollapsed)
    uiPrefsLoadedKeyRef.current = storageKey
  }, [storageKey])

  useEffect(() => {
    if (!showSave) return
    const handler = (event: MouseEvent) => {
      if (saveRef.current && !saveRef.current.contains(event.target as Node)) setShowSave(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showSave])

  useEffect(() => {
    if (!templateMenuOpen) return
    const handler = (event: MouseEvent) => {
      if (templatePickerRef.current && !templatePickerRef.current.contains(event.target as Node)) {
        setTemplateMenuOpen(false)
        setShowNewFolder(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [templateMenuOpen])

  // Drop selections that no longer map to a device of the current site.
  useEffect(() => {
    const validDeviceIds = new Set(safeDevices.map((device) => device.deviceId))
    setSelectedNodes((prev) => {
      const next = new Set<string>()
      prev.forEach((nodeId) => {
        const node = parseTrendNodeId(nodeId)
        if (node && validDeviceIds.has(node.deviceId)) next.add(nodeId)
      })
      return next.size === prev.size ? prev : next
    })
  }, [safeDevices])

  // On first entry (and whenever the site's device set changes), default to the
  // built-in 通用模板 and show its data.
  useEffect(() => {
    if (safeDevices.length === 0) return
    const deviceKey = safeDevices.map((device) => device.deviceId).join("|")
    if (initializedKeyRef.current === deviceKey) return
    initializedKeyRef.current = deviceKey
    if (generalTemplateNodeIds.length === 0) return
    setSelectedNodes(new Set(generalTemplateNodeIds.slice(0, maxSelection)))
    setActiveTemplateId(GENERAL_TEMPLATE_ID)
  }, [safeDevices, generalTemplateNodeIds, maxSelection])

  const selections = useMemo<TrendSelection[]>(() => {
    const nameById = new Map(safeDevices.map((device) => [device.deviceId, device.deviceName]))
    const deviceRankById = new Map(safeDevices.map((device, index) => [device.deviceId, index]))
    const varOrder = new Map(TREND_VARIABLES.map((variable, index) => [variable.key, index]))
    const list: TrendSelection[] = []
    selectedNodes.forEach((nodeId) => {
      const node = parseTrendNodeId(nodeId)
      if (!node) return
      const deviceName = nameById.get(node.deviceId)
      if (!deviceName) return
      list.push({ nodeId, deviceId: node.deviceId, deviceName, node })
    })
    return list.sort((a, b) => {
      const ra = nodeOrderRank(a.node, deviceRankById.get(a.deviceId) ?? 0, varOrder)
      const rb = nodeOrderRank(b.node, deviceRankById.get(b.deviceId) ?? 0, varOrder)
      for (let i = 0; i < ra.length; i += 1) {
        if (ra[i] !== rb[i]) return ra[i] - rb[i]
      }
      return 0
    })
  }, [safeDevices, selectedNodes])

  const selectionKey = useMemo(() => Array.from(selectedNodes).sort().join("|"), [selectedNodes])
  const rangeValid = endTime > startTime

  // Fetch (mocked) series whenever the query inputs change; status mode polls.
  useEffect(() => {
    if (selections.length === 0) {
      setResult(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null
    const abortController = new AbortController()

    const run = async (showSpinner: boolean) => {
      const end = isStatus ? Date.now() : endTime
      const start = isStatus ? startOfToday(end) : startTime
      if (!isStatus && !(end > start)) {
        setError(zh ? "结束时间必须大于开始时间" : "End time must be later than start time")
        setResult(null)
        setLoading(false)
        return
      }
      if (showSpinner) setLoading(true)
      setError(null)
      try {
        const data = await fetchTrendSeries({
          projectId,
          selections,
          startTime: start,
          endTime: end,
          intervalSeconds: interval,
          signal: abortController.signal,
        })
        if (!cancelled) {
          setResult(data)
          setLastUpdated(end)
        }
      } catch (err) {
        if (cancelled || abortController.signal.aborted) return
        console.error("Failed to load trend series", err)
        setError(zh ? "数据加载失败，请稍后重试" : "Failed to load data")
        setResult(null)
      } finally {
        if (!cancelled && showSpinner) setLoading(false)
      }
    }

    void run(true)
    if (isStatus && autoRefresh) timer = setInterval(() => void run(false), AUTO_REFRESH_MS)

    return () => {
      cancelled = true
      abortController.abort()
      if (timer) clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStatus, projectId, selectionKey, interval, startTime, endTime, autoRefresh, refreshToken, zh])

  const colorByNode = useMemo(() => {
    const map = new Map<string, string>()
    selections.forEach((selection, index) => map.set(selection.nodeId, SERIES_COLORS[index % SERIES_COLORS.length]))
    return map
  }, [selections])

  const chartData = useMemo(() => {
    if (!result) return []
    return result.timestamps.map((time, index) => {
      const row: Record<string, number | null> = { t: time }
      result.series.forEach((series) => {
        row[series.id] = series.values[index] ?? null
      })
      return row
    })
  }, [result])

  const unitAxes = useMemo(() => {
    if (!result) return []
    const units: string[] = []
    result.series.forEach((series) => {
      if (!units.includes(series.unit)) units.push(series.unit)
    })
    return units.map((unit, index) => ({
      unit,
      orientation: (index % 2 === 0 ? "left" : "right") as "left" | "right",
    }))
  }, [result])

  const seriesById = useMemo(() => {
    const map = new Map<string, TrendFetchResult["series"][number]>()
    result?.series.forEach((series) => map.set(series.id, series))
    return map
  }, [result])

  const spanMs = useMemo(() => {
    if (!result || result.timestamps.length < 2) return endTime - startTime
    return result.timestamps[result.timestamps.length - 1] - result.timestamps[0]
  }, [result, endTime, startTime])

  // Full data extent + zoom limit, kept in refs for the native wheel listener.
  const fullDomain = useMemo<[number, number] | null>(() => {
    if (!result || result.timestamps.length === 0) return null
    return [result.timestamps[0], result.timestamps[result.timestamps.length - 1]]
  }, [result])
  useEffect(() => {
    fullDomainRef.current = fullDomain
    const gap =
      result && result.timestamps.length > 1 ? result.timestamps[1] - result.timestamps[0] : 1000
    minSpanRef.current = Math.max(gap * 3, 1000)
  }, [fullDomain, result])
  useEffect(() => {
    xDomainRef.current = xDomain
  }, [xDomain])

  // Reset zoom when the underlying query changes (not on a status-mode poll).
  useEffect(() => {
    setXDomain(null)
  }, [selectionKey, interval, startTime, endTime])

  // Keep the zoom window valid as the live data extent shifts — status mode
  // polls with a Date.now()/startOfToday window, so a left-zoomed chart could
  // otherwise hold stale (e.g. pre-midnight) timestamps and clip all new points.
  useEffect(() => {
    if (!fullDomain) return
    setXDomain((prev) => {
      if (!prev) return prev
      const [fl, fr] = fullDomain
      if (prev[1] <= fl || prev[0] >= fr) return null // window fully outside new data
      const width = Math.min(prev[1] - prev[0], fr - fl)
      let [l, r] = prev
      if (l < fl) {
        l = fl
        r = fl + width
      }
      if (r > fr) {
        r = fr
        l = fr - width
      }
      if (l <= fl && r >= fr) return null
      return l === prev[0] && r === prev[1] ? prev : [l, r]
    })
  }, [fullDomain])

  const displaySpanMs = xDomain ? xDomain[1] - xDomain[0] : spanMs

  // ---- fullscreen ----
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === chartCardRef.current)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const toggleFullscreen = () => {
    const el = chartCardRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen?.()
  }

  // ---- wheel zoom (native listener so we can preventDefault page scroll) ----
  const attachChartArea = useCallback((node: HTMLDivElement | null) => {
    if (wheelCleanupRef.current) {
      wheelCleanupRef.current()
      wheelCleanupRef.current = null
    }
    if (!node) return
    const onWheel = (event: WheelEvent) => {
      const full = fullDomainRef.current
      if (!full || full[1] <= full[0]) return
      event.preventDefault()
      const [l, r] = xDomainRef.current ?? full
      const focus = Math.min(Math.max(hoverRef.current?.val ?? (l + r) / 2, l), r)
      const factor = event.deltaY > 0 ? 1.3 : 1 / 1.3
      let newL = focus - (focus - l) * factor
      let newR = focus + (r - focus) * factor
      newL = Math.max(full[0], newL)
      newR = Math.min(full[1], newR)
      if (factor < 1 && newR - newL < minSpanRef.current) return // zoom-in limit
      if (newL <= full[0] && newR >= full[1]) setXDomain(null)
      else setXDomain([newL, newR])
    }
    node.addEventListener("wheel", onWheel, { passive: false })
    wheelCleanupRef.current = () => node.removeEventListener("wheel", onWheel)
  }, [])

  // ---- drag pan ----
  const handleChartMouseDown = (state: { chartX?: number } | null) => {
    const full = fullDomainRef.current
    if (!state || state.chartX == null || !full) return
    const [l, r] = xDomainRef.current ?? full
    panRef.current = { startX: state.chartX, domain: [l, r] }
    setIsPanning(true)
  }

  const handleChartMouseMove = (state: { chartX?: number; activeLabel?: number | string } | null) => {
    if (!state) return
    const px = state.chartX
    const val = typeof state.activeLabel === "number" ? state.activeLabel : null
    if (px != null && val != null) {
      const prev = hoverRef.current
      if (prev && prev.x !== px) {
        const slope = (val - prev.val) / (px - prev.x)
        if (Number.isFinite(slope) && slope !== 0) valuePerPixelRef.current = slope
      }
      hoverRef.current = { x: px, val }
    }
    const pan = panRef.current
    const full = fullDomainRef.current
    const slope = valuePerPixelRef.current
    if (!pan || px == null || !full || !slope) return
    const deltaVal = (px - pan.startX) * slope
    const width = pan.domain[1] - pan.domain[0]
    let newL = pan.domain[0] - deltaVal
    let newR = pan.domain[1] - deltaVal
    if (newL < full[0]) {
      newL = full[0]
      newR = full[0] + width
    }
    if (newR > full[1]) {
      newR = full[1]
      newL = full[1] - width
    }
    if (newL <= full[0] && newR >= full[1]) setXDomain(null)
    else setXDomain([newL, newR])
  }

  const endPan = () => {
    panRef.current = null
    setIsPanning(false)
  }

  // End panning even if the mouse is released outside the chart.
  useEffect(() => {
    if (!isPanning) return
    const onUp = () => endPan()
    window.addEventListener("mouseup", onUp)
    return () => window.removeEventListener("mouseup", onUp)
  }, [isPanning])

  // ---- selection ----
  const handleSelectionChange = (next: Set<string>) => {
    setActiveTemplateId(null)
    setSelectedNodes(next)
  }

  const toggleSeriesVisibility = (seriesId: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev)
      if (next.has(seriesId)) {
        next.delete(seriesId)
        return next
      }
      // Keep at least one curve visible — block hiding the last one.
      const visibleCount = selections.filter((selection) => !next.has(selection.nodeId)).length
      if (visibleCount <= 1) return prev
      next.add(seriesId)
      return next
    })
  }

  // ---- templates / 分组 (groups) ----
  const applyGeneralTemplate = () => {
    if (generalTemplateNodeIds.length === 0) return
    setSelectedNodes(new Set(generalTemplateNodeIds.slice(0, maxSelection)))
    setActiveTemplateId(GENERAL_TEMPLATE_ID)
    setTemplateMenuOpen(false)
  }

  const handleCreateFolder = () => {
    const name = newFolderName.trim()
    if (!name) return
    setStore((prev) => {
      const next = { ...prev, folders: [...prev.folders, { id: genId(), name }] }
      persistStore(storageKey, next)
      return next
    })
    setNewFolderName("")
    setShowNewFolder(false)
  }

  const handleSaveTemplate = () => {
    const name = saveName.trim()
    if (!name || selectedNodes.size === 0) return
    // 保存到 = 新建分组 → create the group inline (and bail if it has no name).
    const makingGroup = saveFolderId === NEW_GROUP_VALUE
    const newGroupName = saveGroupName.trim()
    if (makingGroup && !newGroupName) return
    const newGroup: TrendFolder | null = makingGroup ? { id: genId(), name: newGroupName } : null
    const folderId = newGroup ? newGroup.id : saveFolderId || null
    const template: TrendTemplate = {
      id: genId(),
      name,
      folderId,
      nodeIds: Array.from(selectedNodes),
      durationMs: Math.max(60_000, endTime - startTime),
      interval,
    }
    setStore((prev) => {
      const next = {
        folders: newGroup ? [...prev.folders, newGroup] : prev.folders,
        templates: [...prev.templates, template],
      }
      persistStore(storageKey, next)
      return next
    })
    setActiveTemplateId(template.id)
    if (folderId)
      setCollapsedFolders((prev) => {
        if (!prev.has(folderId)) return prev
        const next = new Set(prev)
        next.delete(folderId)
        return next
      })
    setSaveName("")
    setSaveGroupName("")
    setSaveFolderId("")
    setShowSave(false)
  }

  const applyTemplate = (template: TrendTemplate) => {
    const validDeviceIds = new Set(safeDevices.map((device) => device.deviceId))
    const valid = template.nodeIds.filter((nodeId) => {
      const node = parseTrendNodeId(nodeId)
      return node && validDeviceIds.has(node.deviceId)
    })
    setSelectedNodes(new Set(valid.slice(0, maxSelection)))
    setSampleInterval(template.interval)
    if (!isStatus) {
      const now = Date.now()
      setEndTime(now)
      setStartTime(now - template.durationMs)
    }
    setActiveTemplateId(template.id)
    setTemplateMenuOpen(false)
  }

  const deleteTemplate = (id: string) => {
    setStore((prev) => {
      const next = { ...prev, templates: prev.templates.filter((item) => item.id !== id) }
      persistStore(storageKey, next)
      return next
    })
    setActiveTemplateId((current) => (current === id ? null : current))
  }

  const deleteFolder = (id: string) => {
    setStore((prev) => {
      const next = {
        folders: prev.folders.filter((folder) => folder.id !== id),
        templates: prev.templates.map((template) =>
          template.folderId === id ? { ...template, folderId: null } : template
        ),
      }
      persistStore(storageKey, next)
      return next
    })
  }

  const toggleFolderOpen = (id: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const rootTemplates = useMemo(() => store.templates.filter((item) => !item.folderId), [store.templates])
  const templatesByFolder = useMemo(() => {
    const map = new Map<string, TrendTemplate[]>()
    store.templates.forEach((template) => {
      if (!template.folderId) return
      const list = map.get(template.folderId) ?? []
      list.push(template)
      map.set(template.folderId, list)
    })
    return map
  }, [store.templates])

  // ---- 模板 picker search (fuzzy) ----
  const trimmedQuery = templateQuery.trim()
  const searching = trimmedQuery.length > 0
  const generalLabel = zh ? "通用模板" : "General"
  const generalVisible = fuzzyMatch(trimmedQuery, generalLabel)
  const visibleRootTemplates = useMemo(
    () => rootTemplates.filter((item) => fuzzyMatch(trimmedQuery, item.name)),
    [rootTemplates, trimmedQuery]
  )
  // Each group + the templates to show under it. When the group name matches the
  // query, keep all its templates; otherwise keep only the templates that match.
  // A group is shown if it has any visible template (or, with no query, always).
  const visibleGroups = useMemo(() => {
    return store.folders
      .map((folder) => {
        const all = templatesByFolder.get(folder.id) ?? []
        const nameHit = fuzzyMatch(trimmedQuery, folder.name)
        const items = nameHit ? all : all.filter((item) => fuzzyMatch(trimmedQuery, item.name))
        return { folder, items, show: trimmedQuery ? nameHit || items.length > 0 : true }
      })
      .filter((entry) => entry.show)
  }, [store.folders, templatesByFolder, trimmedQuery])
  const noResults =
    searching && !generalVisible && visibleRootTemplates.length === 0 && visibleGroups.length === 0

  const handleExport = () => {
    if (!result || result.series.length === 0) return
    const header = ["time", ...result.series.map((s) => `${s.deviceName}.${zh ? s.nameZh : s.nameEn}(${s.unit})`)]
    const lines = result.timestamps.map((time, index) =>
      [formatFullTime(time), ...result.series.map((s) => s.values[index] ?? "")].join(",")
    )
    const csv = `﻿${header.join(",")}\n${lines.join("\n")}`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${isStatus ? "device-status" : "trend"}-${toLocalInput(Date.now()).replace(/[:T]/g, "")}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const placeholderText =
    error ??
    (selections.length === 0
      ? zh
        ? "请在设备变量树中勾选变量"
        : "Select variables from the device tree"
      : zh
        ? "暂无数据"
        : "No data")

  const ColTitleIcon = isStatus ? Gauge : TrendingUp
  const colTitle = titleZh && titleEn ? (zh ? titleZh : titleEn) : isStatus ? (zh ? "设备监测" : "Device Monitoring") : zh ? "历史数据" : "Historical Data"
  // 设备监测（status）下数据按固定节奏自动刷新，故该间隔语义为"刷新间隔"。
  const intervalLabel = isStatus ? (zh ? "刷新间隔" : "Refresh interval") : zh ? "采样间隔" : "Interval"

  // Name shown on the 模板 picker trigger so the active preset stays visible.
  // null = no template active (manual variable selection) → render a placeholder.
  const activeTemplateName = useMemo(() => {
    if (activeTemplateId === GENERAL_TEMPLATE_ID) return zh ? "通用模板" : "General"
    if (activeTemplateId === null) return null
    return store.templates.find((item) => item.id === activeTemplateId)?.name ?? null
  }, [activeTemplateId, store.templates, zh])

  const renderTemplateRow = (template: TrendTemplate) => {
    const active = activeTemplateId === template.id
    return (
      <div
        key={template.id}
        className={`group/tpl flex items-center gap-1.5 rounded-md py-1.5 pl-2 pr-1 ${
          active ? "bg-[rgba(38,240,220,0.12)]" : "hover:bg-[#16213f]/70"
        }`}
      >
        <button type="button" onClick={() => applyTemplate(template)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
          <FileText className={`h-3.5 w-3.5 shrink-0 ${active ? "text-[#26f0dc]" : "text-[#6f86ad]"}`} />
          <span className="truncate" style={{ fontSize: labelSize, color: active ? "#bff8f2" : "#cfe4ff" }}>
            {template.name}
          </span>
        </button>
        <button
          type="button"
          onClick={() => deleteTemplate(template.id)}
          className="shrink-0 p-0.5 text-[#46618a] opacity-0 transition-opacity hover:text-[#ff8da3] group-hover/tpl:opacity-100"
          title={zh ? "删除模板" : "Delete template"}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div ref={scale.ref} className={`flex h-full min-h-0 ${isCompactViewport ? "gap-2" : "gap-3"}`} style={scale.rootStyle}>
      {/* Merged left rail: 模板 (collapsible bar) + 设备变量 tree in one container.
          When collapsed the rail leaves the flow entirely (zero width) — a small
          floating chevron on the chart's left edge restores it (see below). */}
      {railCollapsed ? null : (
        <div
          className="flex min-h-0 shrink-0 flex-col rounded-xl border border-[#1a2654] bg-[#0d1233]"
          style={{ width: isCompactViewport ? 210 : 256 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-[#1a2654] px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <ColTitleIcon className="h-4 w-4 shrink-0 text-[#00d4aa]" />
              <h3 className="truncate font-semibold text-[#00d4aa]" style={{ fontSize: titleSize }}>
                {colTitle}
              </h3>
            </div>
            <RailCollapseButton onClick={() => setRailCollapsed(true)} zh={zh} />
          </div>

          {/* 模板 picker: dropdown trigger (shows active template) → overlay menu
              with fuzzy search + grouped templates + inline 新建分组. The trigger
              is a bordered control so it reads as a real dropdown and lines up
              visually with the 设备变量 search box directly below it. */}
          <div className="relative border-b border-[#1a2654] px-2.5 py-2" ref={templatePickerRef}>
            <button
              type="button"
              onClick={() => setTemplateMenuOpen((value) => !value)}
              className={`flex w-full min-w-0 items-center gap-2 rounded-lg border bg-[#101840]/70 px-2.5 py-1.5 text-left transition-colors ${
                templateMenuOpen
                  ? "border-[#45f1d0]/75 bg-[#101840]"
                  : "border-[#4f86c8] hover:border-[#45f1d0]/55"
              }`}
              aria-haspopup="listbox"
              aria-expanded={templateMenuOpen}
            >
              <Star
                className="h-3.5 w-3.5 shrink-0 text-[#78bfd1]"
                fill={activeTemplateId === GENERAL_TEMPLATE_ID ? "currentColor" : "none"}
              />
              <span className="shrink-0 text-[#7b8ab8]" style={{ fontSize: labelSize - 1 }}>
                {zh ? "模板" : "Templates"}
              </span>
              <span
                className="min-w-0 flex-1 truncate font-medium"
                style={{ fontSize: labelSize, color: activeTemplateName ? "#d6ecff" : "#5d7299" }}
                title={activeTemplateName ?? undefined}
              >
                {activeTemplateName ?? (zh ? "未选择" : "None")}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#8db7ff] transition-transform ${templateMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {templateMenuOpen && (
              <div className="absolute left-2.5 right-2.5 top-full z-50 mt-1 overflow-hidden rounded-lg border border-[#45f1d0]/35 bg-[#0c163a] shadow-[0_10px_30px_rgba(0,0,0,0.55)]">
                {/* fuzzy-search input */}
                <div className="border-b border-[#1a2654] p-2">
                  <div className="flex items-center gap-2 rounded-lg border border-[#4f86c8] bg-[#101840]/70 px-2.5 py-1.5 transition-colors focus-within:border-[#45f1d0]/75">
                    <Search className="h-3.5 w-3.5 shrink-0 text-[#6f86ad]" />
                    <input
                      autoFocus
                      value={templateQuery}
                      onChange={(event) => setTemplateQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setTemplateMenuOpen(false)
                      }}
                      placeholder={zh ? "搜索模板 / 分组" : "Search templates / groups"}
                      className="w-full bg-transparent text-[#dbeaff] outline-none placeholder:text-[#5d7299]"
                      style={{ fontSize: controlSize }}
                    />
                  </div>
                </div>

                <div className={`max-h-[46vh] overflow-y-auto p-1.5 ${SCROLLBAR}`}>
                  {generalVisible && (
                    <button
                      type="button"
                      onClick={applyGeneralTemplate}
                      disabled={generalTemplateNodeIds.length === 0}
                      className={`mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        activeTemplateId === GENERAL_TEMPLATE_ID ? "bg-[rgba(38,240,220,0.12)]" : "hover:bg-[#16213f]/70"
                      }`}
                    >
                      <Star
                        className={`h-4 w-4 shrink-0 ${activeTemplateId === GENERAL_TEMPLATE_ID ? "text-[#26f0dc]" : "text-[#78bfd1]"}`}
                        fill={activeTemplateId === GENERAL_TEMPLATE_ID ? "currentColor" : "none"}
                      />
                      <span
                        className="truncate font-medium"
                        style={{ fontSize: labelSize, color: activeTemplateId === GENERAL_TEMPLATE_ID ? "#bff8f2" : "#cfe4ff" }}
                      >
                        {generalLabel}
                      </span>
                    </button>
                  )}

                  {visibleRootTemplates.map((template) => renderTemplateRow(template))}

                  {visibleGroups.map(({ folder, items }) => {
                    const open = searching || !collapsedFolders.has(folder.id)
                    return (
                      <div key={folder.id} className="mb-0.5">
                        <div className="group/folder flex items-center rounded-md px-1 hover:bg-[#16213f]/70">
                          <button
                            type="button"
                            onClick={() => toggleFolderOpen(folder.id)}
                            className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left"
                          >
                            <ChevronRight
                              className={`h-3.5 w-3.5 shrink-0 text-[#6f86ad] transition-transform ${open ? "rotate-90" : ""}`}
                            />
                            <FolderIcon className="h-3.5 w-3.5 shrink-0 text-[#5d9fd6]" />
                            <span className="truncate font-medium text-[#cfe4ff]" style={{ fontSize: labelSize }}>
                              {folder.name}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteFolder(folder.id)}
                            className="shrink-0 p-0.5 text-[#46618a] opacity-0 transition-opacity hover:text-[#ff8da3] group-hover/folder:opacity-100"
                            title={zh ? "删除分组" : "Delete group"}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        {open && (
                          <div className="ml-3 border-l border-[#1a2654] pl-1.5">
                            {items.length > 0 ? (
                              items.map((template) => renderTemplateRow(template))
                            ) : (
                              <div className="px-2 py-1.5 text-[#46618a]" style={{ fontSize: labelSize - 1 }}>
                                {zh ? "（空）" : "(empty)"}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {noResults && (
                    <div className="px-2 py-3 text-center text-[#5d7299]" style={{ fontSize: labelSize }}>
                      {zh ? "无匹配结果" : "No matches"}
                    </div>
                  )}
                </div>

                {/* footer: inline 新建分组 */}
                <div className="border-t border-[#1a2654] p-1.5">
                  {showNewFolder ? (
                    <div className="flex items-center gap-1 px-1">
                      <input
                        autoFocus
                        value={newFolderName}
                        onChange={(event) => setNewFolderName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") handleCreateFolder()
                          if (event.key === "Escape") setShowNewFolder(false)
                        }}
                        placeholder={zh ? "分组名称" : "Group name"}
                        className="w-full rounded-md border border-[#27496f] bg-[#101840] px-2 py-1 text-[#dbeaff] outline-none placeholder:text-[#5d7299]"
                        style={{ fontSize: controlSize }}
                      />
                      <button
                        type="button"
                        onClick={handleCreateFolder}
                        disabled={!newFolderName.trim()}
                        className="shrink-0 rounded-md bg-[#00d4aa] px-1.5 py-1 text-[#04241c] disabled:opacity-40"
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowNewFolder(true)}
                      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[#9bc4e8] transition-colors hover:bg-[#16213f]/70 hover:text-[#cffcf2]"
                      style={{ fontSize: labelSize }}
                    >
                      <FolderPlus className="h-3.5 w-3.5 shrink-0" />
                      {zh ? "新建分组" : "New group"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 设备变量 tree fills the remaining height */}
          <DeviceVariableTree
            embedded
            devices={safeDevices}
            value={selectedNodes}
            onChange={handleSelectionChange}
            maxSelection={maxSelection}
            zh={zh}
            title={zh ? "设备变量" : "Variables"}
            labelSize={labelSize}
            titleSize={titleSize}
            width={0}
          />
        </div>
      )}

      {/* Right: toolbar + chart / table */}
      <div
        ref={chartCardRef}
        className="relative flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-[#1a2654] bg-[#0d1233]"
      >
        {/* Floating restore handle, mirroring the app sidebar's expander — only
            shown while the rail is collapsed; straddles the chart's left edge. */}
        {railCollapsed && (
          <RailRestoreHandle
            onClick={() => setRailCollapsed(false)}
            zh={zh}
            title={zh ? "展开变量面板" : "Expand panel"}
          />
        )}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#1a2654] px-3 py-2.5">
          {!isStatus ? (
            <div className="flex items-center gap-4">
              {([
                { key: "chart" as ViewMode, icon: LineChartIcon, zh: "曲线图", en: "Chart" },
                { key: "table" as ViewMode, icon: TableIcon, zh: "点值表", en: "Table" },
              ]).map((tab) => {
                const Icon = tab.icon
                const active = viewMode === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setViewMode(tab.key)}
                    className={`relative flex items-center gap-1.5 pb-1 font-medium transition-colors ${
                      active ? "text-[#26f0dc]" : "text-[#7b8ab8] hover:text-[#cfe4ff]"
                    }`}
                    style={{ fontSize: controlSize + 1 }}
                  >
                    <Icon className="h-4 w-4" />
                    {zh ? tab.zh : tab.en}
                    {active && <span className="absolute -bottom-[10px] left-0 right-0 h-[2px] rounded-full bg-[#26f0dc]" />}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <LineChartIcon className="h-4 w-4 text-[#26f0dc]" />
              <span className="font-medium text-[#26f0dc]" style={{ fontSize: controlSize + 1 }}>
                {zh ? "曲线图" : "Chart"}
              </span>
            </div>
          )}

          {!isStatus ? (
            <TrendRangePicker
              startTime={startTime}
              endTime={endTime}
              onChange={({ startTime: nextStart, endTime: nextEnd }) => {
                setStartTime(nextStart)
                setEndTime(nextEnd)
              }}
              zh={zh}
              fontSize={controlSize}
              valid={rangeValid}
            />
          ) : (
            <div className="ml-auto flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[#9bc4e8]" style={{ fontSize: controlSize }}>
                <Clock className="h-3.5 w-3.5 text-[#5d9fd6]" />
                {zh ? "今日" : "Today"} 00:00:00 - {lastUpdated ? formatFullTime(lastUpdated).slice(11) : "--:--:--"}
              </span>
              <label className="flex cursor-pointer items-center gap-1.5 text-[#9bc4e8]" style={{ fontSize: controlSize }}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(event) => setAutoRefresh(event.target.checked)}
                  className="h-3.5 w-3.5 accent-[#00d4aa]"
                />
                {zh ? "自动刷新" : "Auto refresh"}
              </label>
            </div>
          )}

          {/* 采样间隔：显式展示标签，避免只看到选中值（如"原始"）不知含义。
              设备监测（status）下该控件语义为刷新间隔。 */}
          <div className="flex items-center gap-1.5">
            <span className="whitespace-nowrap text-[#9bc4e8]" style={{ fontSize: controlSize }}>
              {intervalLabel}
            </span>
            <BcuSelector
              value={String(interval)}
              onChange={(value) => setSampleInterval(Number(value) as TrendIntervalSeconds)}
              options={TREND_INTERVALS.map((item) => ({ value: String(item.value), label: zh ? item.zh : item.en }))}
              allLabel=""
              includeAllOption={false}
              label={intervalLabel}
              compact
              fontSize={controlSize}
              height={32}
              minWidth={84}
            />
          </div>

          <button
            type="button"
            onClick={() => setRefreshToken((token) => token + 1)}
            disabled={selections.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-[#27496f] bg-[#101840]/80 px-2.5 py-1.5 font-medium text-[#9bc4e8] transition-colors hover:border-[#45f1d0]/55 hover:text-[#cffcf2] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ fontSize: controlSize }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {zh ? "刷新" : "Refresh"}
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={!result || result.series.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-[#27496f] bg-[#101840]/80 px-2.5 py-1.5 font-medium text-[#9bc4e8] transition-colors hover:border-[#45f1d0]/55 hover:text-[#cffcf2] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ fontSize: controlSize }}
          >
            <Download className="h-3.5 w-3.5" />
            {zh ? "导出" : "Export"}
          </button>

       
          <div className="relative" ref={saveRef}>
            <button
              type="button"
              onClick={() => {
                setSaveFolderId("")
                setSaveGroupName("")
                setShowSave((value) => !value)
              }}
              disabled={selectedNodes.size === 0}
              className="flex items-center gap-1.5 rounded-lg border border-[#27496f] bg-[#101840]/80 px-2.5 py-1.5 font-medium text-[#9bc4e8] transition-colors hover:border-[#45f1d0]/55 hover:text-[#cffcf2] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ fontSize: controlSize }}
            >
              <Save className="h-3.5 w-3.5" />
              {zh ? "保存模板" : "Save"}
            </button>
            {showSave && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-60 rounded-lg border border-[#2a4f7a] bg-[#0c163a] p-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.5)]">
                <div className="mb-1 text-[#7b8ab8]" style={{ fontSize: controlSize - 0.5 }}>
                  {zh ? "模板名称" : "Template name"}
                </div>
                <input
                  autoFocus
                  value={saveName}
                  onChange={(event) => setSaveName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSaveTemplate()
                    if (event.key === "Escape") setShowSave(false)
                  }}
                  placeholder={zh ? "输入名称" : "Enter name"}
                  className="mb-2 w-full rounded-md border border-[#27496f] bg-[#101840] px-2 py-1.5 text-[#dbeaff] outline-none placeholder:text-[#5d7299]"
                  style={{ fontSize: controlSize }}
                />
                <div className="mb-1 text-[#7b8ab8]" style={{ fontSize: controlSize - 0.5 }}>
                  {zh ? "保存到分组" : "Save to group"}
                </div>
                <select
                  value={saveFolderId}
                  onChange={(event) => setSaveFolderId(event.target.value)}
                  className="mb-2 w-full rounded-md border border-[#27496f] bg-[#101840] px-2 py-1.5 text-[#dbeaff] outline-none"
                  style={{ fontSize: controlSize, colorScheme: "dark" }}
                >
                  <option value="">{zh ? "未分组" : "Ungrouped"}</option>
                  {store.folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                  <option value={NEW_GROUP_VALUE}>{zh ? "＋ 新建分组…" : "＋ New group…"}</option>
                </select>
                {saveFolderId === NEW_GROUP_VALUE && (
                  <input
                    autoFocus
                    value={saveGroupName}
                    onChange={(event) => setSaveGroupName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSaveTemplate()
                      if (event.key === "Escape") setShowSave(false)
                    }}
                    placeholder={zh ? "新分组名称" : "New group name"}
                    className="mb-2.5 w-full rounded-md border border-[#27496f] bg-[#101840] px-2 py-1.5 text-[#dbeaff] outline-none placeholder:text-[#5d7299]"
                    style={{ fontSize: controlSize }}
                  />
                )}
                {saveFolderId !== NEW_GROUP_VALUE && <div className="mb-0.5" />}
                <div className="flex items-center justify-end gap-1.5">
                  <button type="button" onClick={() => setShowSave(false)} className="rounded-md px-2.5 py-1 text-[#9bc4e8] hover:text-[#cfe4ff]" style={{ fontSize: controlSize }}>
                    {zh ? "取消" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={!saveName.trim() || (saveFolderId === NEW_GROUP_VALUE && !saveGroupName.trim())}
                    className="rounded-md bg-[#00d4aa] px-3 py-1 font-semibold text-[#04241c] transition-opacity disabled:opacity-40"
                    style={{ fontSize: controlSize }}
                  >
                    {zh ? "保存" : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-lg border border-[#27496f] bg-[#101840]/80 px-2.5 py-1.5 font-medium text-[#9bc4e8] transition-colors hover:border-[#45f1d0]/55 hover:text-[#cffcf2]"
            style={{ fontSize: controlSize }}
            title={isFullscreen ? (zh ? "退出全屏" : "Exit fullscreen") : (zh ? "全屏" : "Fullscreen")}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {isFullscreen ? (zh ? "退出全屏" : "Exit fullscreen") : (zh ? "全屏" : "Fullscreen")}
          </button>

        </div>

        {/* Legend */}
        {(isStatus || viewMode === "chart") && selections.length > 0 && (
          <div className={`flex max-h-[64px] flex-wrap items-center gap-x-3 gap-y-1.5 overflow-y-auto px-3 py-2 ${SCROLLBAR}`}>
            {selections.map((selection) => {
              const meta = resolveNodeMeta(selection.node)
              const color = colorByNode.get(selection.nodeId) ?? "#22d3ee"
              const hidden = hiddenSeries.has(selection.nodeId)
              const label = `${selection.deviceName}.${zh ? meta.nameZh : meta.nameEn}`
              return (
                <button
                  key={selection.nodeId}
                  type="button"
                  onClick={() => toggleSeriesVisibility(selection.nodeId)}
                  className={`flex items-center gap-1.5 transition-opacity ${hidden ? "opacity-35" : ""}`}
                  style={{ fontSize: controlSize }}
                  title={label}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-[#cfe4ff]">{label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Content */}
        <div className="min-h-0 flex-1 px-2 pb-2">
          {loading && (!result || result.series.length === 0) ? (
            <div className="flex h-full items-center justify-center">
              <HistoryStyleLoadingIndicator text={zh ? "加载数据..." : "Loading..."} />
            </div>
          ) : !result || result.series.length === 0 || chartData.length === 0 ? (
            <div
              className="flex h-full items-center justify-center rounded-lg border border-[#1a2654]/80 bg-[#101840]/40 px-4 text-center text-[#7b8ab8]"
              style={{ fontSize: labelSize }}
            >
              {placeholderText}
            </div>
          ) : !isStatus && viewMode === "table" ? (
            <div className={`h-full overflow-auto rounded-lg border border-[#1a2654]/80 ${SCROLLBAR}`}>
              <table className="w-full border-collapse" style={{ fontSize: chartFontSize }}>
                <thead className="sticky top-0 z-10 bg-[#0d1233]">
                  <tr className="border-b border-[#1a2654] text-[#7b8ab8]">
                    <th className="sticky left-0 z-10 whitespace-nowrap bg-[#0d1233] px-3 py-2 text-left">{zh ? "时间" : "Time"}</th>
                    {result.series.map((series) => (
                      <th key={series.id} className="whitespace-nowrap px-3 py-2 text-right">
                        <span style={{ color: colorByNode.get(series.id) ?? "#cfe4ff" }}>
                          {series.deviceName}.{zh ? series.nameZh : series.nameEn}
                        </span>
                        <span className="ml-1 text-[#5d7299]">({series.unit})</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.timestamps.map((time, index) => (
                    <tr key={time} className="border-b border-[#1a2654]/40 hover:bg-[#16213f]/40">
                      <td className="sticky left-0 whitespace-nowrap bg-[#0d1233] px-3 py-1.5 font-mono text-[#9fb6d6]">
                        {formatFullTime(time)}
                      </td>
                      {result.series.map((series) => {
                        const value = series.values[index]
                        return (
                          <td key={series.id} className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-[#cfe4ff]">
                            {value == null ? "--" : value.toFixed(series.digits)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              ref={attachChartArea}
              className={`relative h-full w-full select-none ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
            >
              <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
                onMouseDown={handleChartMouseDown}
                onMouseMove={handleChartMouseMove}
                onMouseUp={endPan}
                onMouseLeave={() => {
                  endPan()
                  hoverRef.current = null
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" vertical={false} />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={xDomain ?? ["dataMin", "dataMax"]}
                  allowDataOverflow
                  axisLine={{ stroke: "#33507a" }}
                  tickLine={{ stroke: "#33507a" }}
                  tick={{ fill: "#7b8ab8", fontSize: chartFontSize }}
                  tickFormatter={(value: number) => formatTick(value, displaySpanMs)}
                  minTickGap={56}
                />
                {unitAxes.map((axis) => (
                  <YAxis
                    key={axis.unit}
                    yAxisId={axis.unit}
                    orientation={axis.orientation}
                    axisLine={{ stroke: "#33507a" }}
                    tickLine={{ stroke: "#33507a" }}
                    width={44}
                    tick={{ fill: "#7b8ab8", fontSize: chartFontSize }}
                    tickFormatter={(value: number) => `${value}`}
                    label={{
                      value: axis.unit,
                      position: axis.orientation === "left" ? "insideTopLeft" : "insideTopRight",
                      fill: "#5d7299",
                      fontSize: chartFontSize - 1,
                      offset: 6,
                    }}
                  />
                ))}
                <Tooltip
                  isAnimationActive={false}
                  contentStyle={{ backgroundColor: "#0d1233", border: "1px solid #1a2654", borderRadius: 8, fontSize: chartFontSize }}
                  labelFormatter={(value: number) => formatFullTime(value)}
                  labelStyle={{ color: "#7b8ab8", fontSize: chartFontSize }}
                  formatter={(value: number | string, _name, item) => {
                    const seriesId = String(item?.dataKey ?? "")
                    const series = seriesById.get(seriesId)
                    if (!series) return [value, _name]
                    const numeric = typeof value === "number" ? value : Number(value)
                    const display = Number.isFinite(numeric) ? numeric.toFixed(series.digits) : "--"
                    return [`${display} ${series.unit}`, `${series.deviceName}.${zh ? series.nameZh : series.nameEn}`]
                  }}
                />
                {result.series.map((series) => (
                  <Line
                    key={series.id}
                    yAxisId={series.unit}
                    type="monotone"
                    dataKey={series.id}
                    name={`${series.deviceName}.${zh ? series.nameZh : series.nameEn}`}
                    stroke={colorByNode.get(series.id) ?? "#22d3ee"}
                    strokeWidth={1.6}
                    dot={false}
                    activeDot={{ r: 3 }}
                    connectNulls={false}
                    hide={hiddenSeries.has(series.id)}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
