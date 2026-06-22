"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Check,
  ChevronRight,
  Clock,
  Download,
  FileText,
  FolderPlus,
  Folder as FolderIcon,
  Gauge,
  LineChart as LineChartIcon,
  RefreshCw,
  Save,
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
import { useLanguage } from "@/components/language-provider"
import { useDashboardViewport } from "@/hooks/use-dashboard-viewport"
import { DASHBOARD_DENSE_PANEL_SCALE, useFluidScale } from "@/hooks/use-fluid-scale"
import type { ProjectDevice } from "@/lib/api/project"
import { buildMonitorDevices } from "@/lib/device-selection"
import {
  fetchTrendSeries,
  parseTrendNodeId,
  resolveNodeMeta,
  startOfToday,
  TREND_DEFAULT_RANGE_MS,
  TREND_INTERVALS,
  TREND_INTERVAL_RAW,
  TREND_VARIABLES,
  type TrendFetchResult,
  type TrendIntervalSeconds,
  type TrendNode,
  type TrendSelection,
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

const genId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `${Date.now()}-${Math.round(Math.random() * 1e6)}`
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

const pad = (value: number) => String(value).padStart(2, "0")

const toLocalInput = (ms: number) => {
  const date = new Date(ms)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`
}

const fromLocalInput = (value: string) => {
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
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

  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
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

  // Template / folder store (localStorage-backed; swap for an API later).
  const [store, setStore] = useState<TrendStore>(EMPTY_STORE)
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set())
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const [showSave, setShowSave] = useState(false)
  const [saveName, setSaveName] = useState("")
  const [saveFolderId, setSaveFolderId] = useState<string>("")
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const saveRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setStore(loadStore(storageKey))
  }, [storageKey])

  useEffect(() => {
    if (!showSave) return
    const handler = (event: MouseEvent) => {
      if (saveRef.current && !saveRef.current.contains(event.target as Node)) setShowSave(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showSave])

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

  // ---- selection ----
  const handleSelectionChange = (next: Set<string>) => {
    setActiveTemplateId(null)
    setSelectedNodes(next)
  }

  const toggleSeriesVisibility = (seriesId: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev)
      if (next.has(seriesId)) next.delete(seriesId)
      else next.add(seriesId)
      return next
    })
  }

  // ---- templates / folders ----
  const startNew = () => {
    setActiveTemplateId(null)
    setSelectedNodes(new Set())
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
    const template: TrendTemplate = {
      id: genId(),
      name,
      folderId: saveFolderId || null,
      nodeIds: Array.from(selectedNodes),
      durationMs: Math.max(60_000, endTime - startTime),
      interval,
    }
    setStore((prev) => {
      const next = { ...prev, templates: [...prev.templates, template] }
      persistStore(storageKey, next)
      return next
    })
    setActiveTemplateId(template.id)
    if (template.folderId) setOpenFolders((prev) => new Set(prev).add(template.folderId as string))
    setSaveName("")
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
    setOpenFolders((prev) => {
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
  const RootIcon = isStatus ? Gauge : LineChartIcon
  const colTitle = titleZh && titleEn ? (zh ? titleZh : titleEn) : isStatus ? (zh ? "设备监测" : "Device Monitoring") : zh ? "历史数据" : "Historical Data"
  const rootLabel = isStatus ? (zh ? "今日趋势" : "Today") : zh ? "趋势" : "Trend"

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
      {/* Column 1: template / folder tree */}
      <div
        className="flex min-h-0 shrink-0 flex-col rounded-xl border border-[#1a2654] bg-[#0d1233]"
        style={{ width: isCompactViewport ? 168 : 204 }}
      >
        <div className="flex items-center gap-2 border-b border-[#1a2654] px-3 py-2.5">
          <ColTitleIcon className="h-4 w-4 shrink-0 text-[#00d4aa]" />
          <h3 className="truncate font-semibold text-[#00d4aa]" style={{ fontSize: titleSize }}>
            {colTitle}
          </h3>
        </div>

        <div className="px-2.5 py-2">
          <button
            type="button"
            onClick={() => setShowNewFolder((value) => !value)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#27496f] bg-[#101840]/80 py-1.5 font-medium text-[#9bc4e8] transition-colors hover:border-[#45f1d0]/55 hover:text-[#cffcf2]"
            style={{ fontSize: controlSize }}
          >
            <FolderPlus className="h-3.5 w-3.5" />
            {zh ? "文件夹" : "Folder"}
          </button>
          {showNewFolder && (
            <div className="mt-1.5 flex items-center gap-1">
              <input
                autoFocus
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleCreateFolder()
                  if (event.key === "Escape") setShowNewFolder(false)
                }}
                placeholder={zh ? "文件夹名称" : "Folder name"}
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
          )}
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto px-1.5 pb-2 ${SCROLLBAR}`}>
          <button
            type="button"
            onClick={startNew}
            className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors ${
              activeTemplateId === null ? "bg-[rgba(38,240,220,0.12)]" : "hover:bg-[#16213f]/70"
            }`}
          >
            <RootIcon className={`h-4 w-4 shrink-0 ${activeTemplateId === null ? "text-[#26f0dc]" : "text-[#78bfd1]"}`} />
            <span className="truncate font-medium" style={{ fontSize: labelSize, color: activeTemplateId === null ? "#bff8f2" : "#cfe4ff" }}>
              {rootLabel}
            </span>
          </button>

          {rootTemplates.map((template) => renderTemplateRow(template))}

          {store.folders.map((folder) => {
            const open = openFolders.has(folder.id)
            const folderTemplates = templatesByFolder.get(folder.id) ?? []
            return (
              <div key={folder.id} className="mb-0.5">
                <div className="group/folder flex items-center rounded-md px-1 hover:bg-[#16213f]/70">
                  <button type="button" onClick={() => toggleFolderOpen(folder.id)} className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left">
                    <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-[#6f86ad] transition-transform ${open ? "rotate-90" : ""}`} />
                    <FolderIcon className="h-3.5 w-3.5 shrink-0 text-[#5d9fd6]" />
                    <span className="truncate font-medium text-[#cfe4ff]" style={{ fontSize: labelSize }}>
                      {folder.name}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFolder(folder.id)}
                    className="shrink-0 p-0.5 text-[#46618a] opacity-0 transition-opacity hover:text-[#ff8da3] group-hover/folder:opacity-100"
                    title={zh ? "删除文件夹" : "Delete folder"}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {open && (
                  <div className="ml-3 border-l border-[#1a2654] pl-1.5">
                    {folderTemplates.length > 0 ? (
                      folderTemplates.map((template) => renderTemplateRow(template))
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
        </div>
      </div>

      {/* Column 2: device / variable tree */}
      <DeviceVariableTree
        devices={safeDevices}
        value={selectedNodes}
        onChange={handleSelectionChange}
        maxSelection={maxSelection}
        colorByNode={colorByNode}
        zh={zh}
        title={zh ? "设备变量" : "Variables"}
        labelSize={labelSize}
        titleSize={titleSize}
        width={isCompactViewport ? 210 : 256}
      />

      {/* Right: toolbar + chart / table */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-[#1a2654] bg-[#0d1233]">
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
            <div
              className={`ml-auto flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${
                rangeValid ? "border-[#27496f]" : "border-[#ef4444]/70"
              } bg-[#101840]/80`}
              style={{ colorScheme: "dark" }}
            >
              <Clock className="h-3.5 w-3.5 shrink-0 text-[#5d9fd6]" />
              <input
                type="datetime-local"
                step={1}
                value={toLocalInput(startTime)}
                onChange={(event) => {
                  const ms = fromLocalInput(event.target.value)
                  if (ms != null) setStartTime(ms)
                }}
                className="bg-transparent text-[#dbeaff] outline-none"
                style={{ fontSize: controlSize }}
              />
              <span className="text-[#5d7299]">-</span>
              <input
                type="datetime-local"
                step={1}
                value={toLocalInput(endTime)}
                onChange={(event) => {
                  const ms = fromLocalInput(event.target.value)
                  if (ms != null) setEndTime(ms)
                }}
                className="bg-transparent text-[#dbeaff] outline-none"
                style={{ fontSize: controlSize }}
              />
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[#9bc4e8]" style={{ fontSize: controlSize }}>
                <Clock className="h-3.5 w-3.5 text-[#5d9fd6]" />
                {zh ? "今日" : "Today"} 00:00 - {lastUpdated ? formatFullTime(lastUpdated).slice(11) : "--:--:--"}
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

          {/* 采样间隔：显式展示标签，避免只看到选中值（如"原始"）不知含义 */}
          <div className="flex items-center gap-1.5">
            <span className="whitespace-nowrap text-[#9bc4e8]" style={{ fontSize: controlSize }}>
              {zh ? "采样间隔" : "Interval"}
            </span>
            <BcuSelector
              value={String(interval)}
              onChange={(value) => setSampleInterval(Number(value) as TrendIntervalSeconds)}
              options={TREND_INTERVALS.map((item) => ({ value: String(item.value), label: zh ? item.zh : item.en }))}
              allLabel=""
              includeAllOption={false}
              label={zh ? "采样间隔" : "Interval"}
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
                  {zh ? "保存到" : "Save to"}
                </div>
                <select
                  value={saveFolderId}
                  onChange={(event) => setSaveFolderId(event.target.value)}
                  className="mb-2.5 w-full rounded-md border border-[#27496f] bg-[#101840] px-2 py-1.5 text-[#dbeaff] outline-none"
                  style={{ fontSize: controlSize, colorScheme: "dark" }}
                >
                  <option value="">{zh ? "根目录" : "Root"}</option>
                  {store.folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-end gap-1.5">
                  <button type="button" onClick={() => setShowSave(false)} className="rounded-md px-2.5 py-1 text-[#9bc4e8] hover:text-[#cfe4ff]" style={{ fontSize: controlSize }}>
                    {zh ? "取消" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={!saveName.trim()}
                    className="rounded-md bg-[#00d4aa] px-3 py-1 font-semibold text-[#04241c] transition-opacity disabled:opacity-40"
                    style={{ fontSize: controlSize }}
                  >
                    {zh ? "保存" : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
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
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" vertical={false} />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#7b8ab8", fontSize: chartFontSize }}
                  tickFormatter={(value: number) => formatTick(value, spanMs)}
                  minTickGap={56}
                />
                {unitAxes.map((axis) => (
                  <YAxis
                    key={axis.unit}
                    yAxisId={axis.unit}
                    orientation={axis.orientation}
                    axisLine={false}
                    tickLine={false}
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
          )}
        </div>
      </div>
    </div>
  )
}
