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
  LineChart as LineChartIcon,
  Minus,
  RefreshCw,
  Save,
  Search,
  Table as TableIcon,
  Trash2,
  TrendingUp,
  X,
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
import { HistoryStyleLoadingIndicator } from "@/components/dashboard/history-style-loading-indicator"
import { useLanguage } from "@/components/language-provider"
import { useDashboardViewport } from "@/hooks/use-dashboard-viewport"
import { DASHBOARD_DENSE_PANEL_SCALE, useFluidScale } from "@/hooks/use-fluid-scale"
import type { ProjectDevice } from "@/lib/api/project"
import {
  buildTrendNodeId,
  fetchTrendSeries,
  parseTrendNodeId,
  TREND_DEFAULT_RANGE_MS,
  TREND_INTERVALS,
  TREND_INTERVAL_RAW,
  TREND_VARIABLES,
  TREND_VARIABLE_BY_KEY,
  type TrendFetchResult,
  type TrendIntervalSeconds,
  type TrendSelection,
} from "@/lib/api/trend-analysis"

const SERIES_COLORS = [
  "#22d3ee",
  "#34d399",
  "#f59e0b",
  "#a78bfa",
  "#f472b6",
  "#60a5fa",
  "#fb7185",
  "#facc15",
  "#4ade80",
  "#38bdf8",
  "#c084fc",
  "#fca5a5",
]

const MAX_SELECTION = 12
const TEMPLATE_STORAGE_KEY = "trend-analysis-store-v2"

const SCROLLBAR =
  "[scrollbar-color:rgba(34,211,238,0.38)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar]:h-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#1f4f78] [&::-webkit-scrollbar-thumb:hover]:bg-[#2aa7b3]"

type ViewMode = "chart" | "table"

type TrendFolder = { id: string; name: string }

type TrendTemplate = {
  id: string
  name: string
  folderId: string | null
  nodeIds: string[]
  /** Window length to re-apply on load (templates store a duration, not absolute times). */
  durationMs: number
  interval: TrendIntervalSeconds
}

type TrendStore = { folders: TrendFolder[]; templates: TrendTemplate[] }

const EMPTY_STORE: TrendStore = { folders: [], templates: [] }

const genId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.round(Math.random() * 1e6)}`
}

const loadStore = (): TrendStore => {
  if (typeof window === "undefined") return EMPTY_STORE
  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY)
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

const persistStore = (store: TrendStore) => {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(store))
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
  if (spanMs > 24 * 60 * 60 * 1000) {
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${hm}`
  }
  return spanMs > 6 * 60 * 60 * 1000 ? hm : `${hm}:${pad(date.getSeconds())}`
}

const formatFullTime = (time: number) => {
  const date = new Date(time)
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`
}

export function TrendAnalysisPanel({
  devices,
  projectId,
}: {
  devices: ProjectDevice[]
  projectId: string
}) {
  const { language } = useLanguage()
  const { isCompactViewport } = useDashboardViewport()
  const zh = language === "zh"
  const scale = useFluidScale<HTMLDivElement>(1180, 2560, { ...DASHBOARD_DENSE_PANEL_SCALE, maxRootPx: 25 })
  const titleSize = scale.clampText(0.92, 1, 1.4)
  const labelSize = scale.fluid(11.5, 14.5)
  const controlSize = scale.fluid(11.5, 14)
  const chartFontSize = scale.chart(10, 14)

  const safeDevices = useMemo(
    () =>
      devices
        .filter((device) => device.deviceId)
        .map((device, index) => ({
          deviceId: device.deviceId,
          deviceName: device.deviceName || `BCU ${index + 1}`,
        })),
    [devices]
  )

  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [openDevices, setOpenDevices] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("chart")
  const [startTime, setStartTime] = useState(() => Date.now() - TREND_DEFAULT_RANGE_MS)
  const [endTime, setEndTime] = useState(() => Date.now())
  const [interval, setSampleInterval] = useState<TrendIntervalSeconds>(TREND_INTERVAL_RAW)
  const [refreshToken, setRefreshToken] = useState(0)
  const [result, setResult] = useState<TrendFetchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    setStore(loadStore())
  }, [])

  // Close the save popover on outside click.
  useEffect(() => {
    if (!showSave) return
    const handler = (event: MouseEvent) => {
      if (saveRef.current && !saveRef.current.contains(event.target as Node)) {
        setShowSave(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showSave])

  useEffect(() => {
    if (safeDevices.length > 0) {
      setOpenDevices((prev) => (prev.size > 0 ? prev : new Set([safeDevices[0].deviceId])))
    }
  }, [safeDevices])

  // Drop selections that no longer map to a device of the current site.
  useEffect(() => {
    const validDeviceIds = new Set(safeDevices.map((device) => device.deviceId))
    setSelectedNodes((prev) => {
      const next = new Set<string>()
      prev.forEach((nodeId) => {
        const parsed = parseTrendNodeId(nodeId)
        if (parsed && validDeviceIds.has(parsed.deviceId)) next.add(nodeId)
      })
      return next.size === prev.size ? prev : next
    })
  }, [safeDevices])

  const selections = useMemo<TrendSelection[]>(() => {
    const deviceNameById = new Map(safeDevices.map((device) => [device.deviceId, device.deviceName]))
    const list: TrendSelection[] = []
    selectedNodes.forEach((nodeId) => {
      const parsed = parseTrendNodeId(nodeId)
      if (!parsed) return
      const deviceName = deviceNameById.get(parsed.deviceId)
      if (!deviceName) return
      list.push({ deviceId: parsed.deviceId, deviceName, variableKey: parsed.variableKey })
    })
    const deviceOrder = new Map(safeDevices.map((device, index) => [device.deviceId, index]))
    const variableOrder = new Map(TREND_VARIABLES.map((variable, index) => [variable.key, index]))
    return list.sort((a, b) => {
      const deviceDiff = (deviceOrder.get(a.deviceId) ?? 0) - (deviceOrder.get(b.deviceId) ?? 0)
      if (deviceDiff !== 0) return deviceDiff
      return (variableOrder.get(a.variableKey) ?? 0) - (variableOrder.get(b.variableKey) ?? 0)
    })
  }, [safeDevices, selectedNodes])

  const rangeValid = endTime > startTime
  const spanMs = Math.max(0, endTime - startTime)

  // Fetch (mocked) trend series whenever the query inputs change.
  useEffect(() => {
    if (selections.length === 0) {
      setResult(null)
      setError(null)
      setLoading(false)
      return
    }
    if (!rangeValid) {
      setResult(null)
      setLoading(false)
      setError(zh ? "结束时间必须大于开始时间" : "End time must be later than start time")
      return
    }

    let cancelled = false
    const abortController = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchTrendSeries({
          projectId,
          selections,
          startTime,
          endTime,
          intervalSeconds: interval,
          signal: abortController.signal,
        })
        if (!cancelled) setResult(data)
      } catch (err) {
        if (cancelled || abortController.signal.aborted) return
        console.error("Failed to load trend analysis series", err)
        setError(zh ? "数据加载失败，请稍后重试" : "Failed to load trend data")
        setResult(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
      abortController.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, selections, interval, startTime, endTime, rangeValid, refreshToken, zh])

  const colorByNode = useMemo(() => {
    const map = new Map<string, string>()
    selections.forEach((selection, index) => {
      map.set(buildTrendNodeId(selection.deviceId, selection.variableKey), SERIES_COLORS[index % SERIES_COLORS.length])
    })
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

  // ---- device tree actions ----
  const deviceNodeIds = (deviceId: string) =>
    TREND_VARIABLES.map((variable) => buildTrendNodeId(deviceId, variable.key))

  const toggleNode = (nodeId: string) => {
    setActiveTemplateId(null)
    setSelectedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else {
        if (next.size >= MAX_SELECTION) return prev
        next.add(nodeId)
      }
      return next
    })
  }

  const toggleDeviceAll = (deviceId: string) => {
    setActiveTemplateId(null)
    const nodeIds = deviceNodeIds(deviceId)
    setSelectedNodes((prev) => {
      const next = new Set(prev)
      const allSelected = nodeIds.every((id) => next.has(id))
      if (allSelected) {
        nodeIds.forEach((id) => next.delete(id))
        return next
      }
      for (const id of nodeIds) {
        if (next.has(id)) continue
        if (next.size >= MAX_SELECTION) break
        next.add(id)
      }
      return next
    })
  }

  const toggleDeviceOpen = (deviceId: string) => {
    setOpenDevices((prev) => {
      const next = new Set(prev)
      if (next.has(deviceId)) next.delete(deviceId)
      else next.add(deviceId)
      return next
    })
  }

  const clearAll = () => {
    setActiveTemplateId(null)
    setSelectedNodes(new Set())
  }

  const toggleSeriesVisibility = (seriesId: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev)
      if (next.has(seriesId)) next.delete(seriesId)
      else next.add(seriesId)
      return next
    })
  }

  // ---- template / folder actions ----
  const startNewTrend = () => {
    setActiveTemplateId(null)
    setSelectedNodes(new Set())
  }

  const handleCreateFolder = () => {
    const name = newFolderName.trim()
    if (!name) return
    setStore((prev) => {
      const next = { ...prev, folders: [...prev.folders, { id: genId(), name }] }
      persistStore(next)
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
      persistStore(next)
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
      const parsed = parseTrendNodeId(nodeId)
      return parsed && validDeviceIds.has(parsed.deviceId)
    })
    setSelectedNodes(new Set(valid.slice(0, MAX_SELECTION)))
    setSampleInterval(template.interval)
    const now = Date.now()
    setEndTime(now)
    setStartTime(now - template.durationMs)
    setActiveTemplateId(template.id)
    setOpenDevices((prev) => {
      const next = new Set(prev)
      valid.forEach((nodeId) => {
        const parsed = parseTrendNodeId(nodeId)
        if (parsed) next.add(parsed.deviceId)
      })
      return next
    })
  }

  const deleteTemplate = (id: string) => {
    setStore((prev) => {
      const next = { ...prev, templates: prev.templates.filter((item) => item.id !== id) }
      persistStore(next)
      return next
    })
    setActiveTemplateId((current) => (current === id ? null : current))
  }

  const deleteFolder = (id: string) => {
    setStore((prev) => {
      const next = {
        folders: prev.folders.filter((folder) => folder.id !== id),
        // Templates inside the folder fall back to the root level.
        templates: prev.templates.map((template) =>
          template.folderId === id ? { ...template, folderId: null } : template
        ),
      }
      persistStore(next)
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

  const normalizedSearch = search.trim().toLowerCase()
  const matchesSearch = (label: string) => !normalizedSearch || label.toLowerCase().includes(normalizedSearch)

  const handleExport = () => {
    if (!result || result.series.length === 0) return
    const header = ["time", ...result.series.map((s) => `${s.deviceName}.${zh ? s.nameZh : s.nameEn}(${s.unit})`)]
    const lines = result.timestamps.map((time, index) =>
      [formatFullTime(time), ...result.series.map((s) => (s.values[index] ?? ""))].join(",")
    )
    const csv = `﻿${header.join(",")}\n${lines.join("\n")}`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `trend-${toLocalInput(Date.now()).replace(/[:T]/g, "")}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const placeholderText =
    error ??
    (selections.length === 0
      ? zh
        ? "请在设备变量树中勾选变量进行趋势分析"
        : "Select variables from the device tree to analyze trends"
      : zh
        ? "暂无数据"
        : "No data")

  const renderTemplateRow = (template: TrendTemplate) => {
    const active = activeTemplateId === template.id
    return (
      <div
        key={template.id}
        className={`group/tpl flex items-center gap-1.5 rounded-md py-1.5 pl-2 pr-1 ${
          active ? "bg-[rgba(38,240,220,0.12)]" : "hover:bg-[#16213f]/70"
        }`}
      >
        <button
          type="button"
          onClick={() => applyTemplate(template)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <FileText className={`h-3.5 w-3.5 shrink-0 ${active ? "text-[#26f0dc]" : "text-[#6f86ad]"}`} />
          <span
            className="truncate"
            style={{ fontSize: labelSize, color: active ? "#bff8f2" : "#cfe4ff" }}
          >
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
    <div
      ref={scale.ref}
      className={`flex h-full min-h-0 ${isCompactViewport ? "gap-2" : "gap-3"}`}
      style={scale.rootStyle}
    >
      {/* Column 1: template / folder tree */}
      <div
        className="flex min-h-0 shrink-0 flex-col rounded-xl border border-[#1a2654] bg-[#0d1233]"
        style={{ width: isCompactViewport ? 168 : 204 }}
      >
        <div className="flex items-center gap-2 border-b border-[#1a2654] px-3 py-2.5">
          <TrendingUp className="h-4 w-4 shrink-0 text-[#00d4aa]" />
          <h3 className="truncate font-semibold text-[#00d4aa]" style={{ fontSize: titleSize }}>
            {zh ? "趋势分析" : "Trend Analysis"}
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
          {/* "趋势" — the live working view (no saved template) */}
          <button
            type="button"
            onClick={startNewTrend}
            className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors ${
              activeTemplateId === null ? "bg-[rgba(38,240,220,0.12)]" : "hover:bg-[#16213f]/70"
            }`}
          >
            <LineChartIcon
              className={`h-4 w-4 shrink-0 ${activeTemplateId === null ? "text-[#26f0dc]" : "text-[#78bfd1]"}`}
            />
            <span
              className="truncate font-medium"
              style={{ fontSize: labelSize, color: activeTemplateId === null ? "#bff8f2" : "#cfe4ff" }}
            >
              {zh ? "趋势" : "Trend"}
            </span>
          </button>

          {rootTemplates.map((template) => renderTemplateRow(template))}

          {store.folders.map((folder) => {
            const open = openFolders.has(folder.id)
            const folderTemplates = templatesByFolder.get(folder.id) ?? []
            return (
              <div key={folder.id} className="mb-0.5">
                <div className="group/folder flex items-center rounded-md px-1 hover:bg-[#16213f]/70">
                  <button
                    type="button"
                    onClick={() => toggleFolderOpen(folder.id)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left"
                  >
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
      <div
        className="flex min-h-0 shrink-0 flex-col rounded-xl border border-[#1a2654] bg-[#0d1233]"
        style={{ width: isCompactViewport ? 206 : 252 }}
      >
        <div className="flex items-center justify-between border-b border-[#1a2654] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
            <h3 className="font-semibold text-[#00d4aa]" style={{ fontSize: titleSize }}>
              {zh ? "设备变量" : "Variables"}
            </h3>
          </div>
          <span className="rounded-full bg-[#1a2654] px-2 py-0.5 font-mono text-[#7fdfff]" style={{ fontSize: labelSize - 1 }}>
            {selectedNodes.size}/{MAX_SELECTION}
          </span>
        </div>

        <div className="px-2.5 pb-1.5 pt-2">
          <div className="flex items-center gap-2 rounded-lg border border-[#1a2654] bg-[#101840]/70 px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#5d7299]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={zh ? "搜索变量" : "Search"}
              className="w-full bg-transparent text-[#dbeaff] outline-none placeholder:text-[#5d7299]"
              style={{ fontSize: labelSize }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="shrink-0 text-[#5d7299] hover:text-[#9bc4e8]">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto px-1.5 pb-2 ${SCROLLBAR}`}>
          {safeDevices.length === 0 ? (
            <div className="px-3 py-6 text-center text-[#5d7299]" style={{ fontSize: labelSize }}>
              {zh ? "当前站点暂无设备" : "No devices for this site"}
            </div>
          ) : (
            safeDevices.map((device) => {
              const nodeIds = deviceNodeIds(device.deviceId)
              const selectedCount = nodeIds.filter((id) => selectedNodes.has(id)).length
              const allSelected = selectedCount === nodeIds.length
              const open = openDevices.has(device.deviceId)
              const variables = TREND_VARIABLES.filter((variable) =>
                matchesSearch(zh ? variable.nameZh : variable.nameEn)
              )
              if (normalizedSearch && variables.length === 0 && !matchesSearch(device.deviceName)) {
                return null
              }

              return (
                <div key={device.deviceId} className="mb-0.5">
                  <div className="flex items-center rounded-md px-1 hover:bg-[#16213f]/70">
                    <button
                      type="button"
                      onClick={() => toggleDeviceOpen(device.deviceId)}
                      className="flex shrink-0 items-center justify-center p-1 text-[#6f86ad]"
                      aria-label={open ? "collapse" : "expand"}
                    >
                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleDeviceAll(device.deviceId)}
                      className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
                    >
                      <span
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                          allSelected
                            ? "border-[#00d4aa] bg-[#00d4aa]"
                            : selectedCount > 0
                              ? "border-[#00d4aa] bg-[#00d4aa]/30"
                              : "border-[#33507a] bg-transparent"
                        }`}
                      >
                        {allSelected ? (
                          <Check className="h-2.5 w-2.5 text-[#04241c]" strokeWidth={3.5} />
                        ) : selectedCount > 0 ? (
                          <Minus className="h-2.5 w-2.5 text-[#04241c]" strokeWidth={3.5} />
                        ) : null}
                      </span>
                      <span className="truncate font-medium text-[#cfe4ff]" style={{ fontSize: labelSize }}>
                        {device.deviceName}
                      </span>
                    </button>
                  </div>

                  {open && (
                    <div className="ml-3 border-l border-[#1a2654] pl-1.5">
                      {variables.map((variable) => {
                        const nodeId = buildTrendNodeId(device.deviceId, variable.key)
                        const checked = selectedNodes.has(nodeId)
                        const disabled = !checked && selectedNodes.size >= MAX_SELECTION
                        const color = colorByNode.get(nodeId)
                        return (
                          <button
                            key={nodeId}
                            type="button"
                            onClick={() => toggleNode(nodeId)}
                            disabled={disabled}
                            className={`flex w-full items-center gap-2 rounded-md py-1.5 pl-2 pr-1.5 text-left transition-colors ${
                              checked ? "bg-[#0f2030]" : "hover:bg-[#16213f]/70"
                            } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                          >
                            <span
                              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                                checked ? "border-transparent" : "border-[#33507a] bg-transparent"
                              }`}
                              style={checked && color ? { backgroundColor: color } : undefined}
                            >
                              {checked && <Check className="h-2.5 w-2.5 text-[#04241c]" strokeWidth={3.5} />}
                            </span>
                            <span
                              className="truncate"
                              style={{ fontSize: labelSize, color: checked ? "#e6f4ff" : "#9fb6d6" }}
                            >
                              {zh ? variable.nameZh : variable.nameEn}
                            </span>
                            <span className="ml-auto shrink-0 text-[#5d7299]" style={{ fontSize: labelSize - 1.5 }}>
                              {variable.unit}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {selectedNodes.size > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center justify-center gap-1.5 border-t border-[#1a2654] py-2 text-[#7b8ab8] transition-colors hover:text-[#ff8da3]"
            style={{ fontSize: labelSize }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {zh ? "清空选择" : "Clear all"}
          </button>
        )}
      </div>

      {/* Right: toolbar + chart / table */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-[#1a2654] bg-[#0d1233]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#1a2654] px-3 py-2.5">
          {/* View tabs */}
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

          {/* Datetime range */}
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

          {/* Sampling interval */}
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

          {/* Save template */}
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
                  <button
                    type="button"
                    onClick={() => setShowSave(false)}
                    className="rounded-md px-2.5 py-1 text-[#9bc4e8] hover:text-[#cfe4ff]"
                    style={{ fontSize: controlSize }}
                  >
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

        {/* Legend (chart view only) */}
        {viewMode === "chart" && selections.length > 0 && (
          <div className={`flex max-h-[64px] flex-wrap items-center gap-x-3 gap-y-1.5 overflow-y-auto px-3 py-2 ${SCROLLBAR}`}>
            {selections.map((selection) => {
              const nodeId = buildTrendNodeId(selection.deviceId, selection.variableKey)
              const meta = TREND_VARIABLE_BY_KEY[selection.variableKey]
              const color = colorByNode.get(nodeId) ?? "#22d3ee"
              const hidden = hiddenSeries.has(nodeId)
              return (
                <button
                  key={nodeId}
                  type="button"
                  onClick={() => toggleSeriesVisibility(nodeId)}
                  className={`flex items-center gap-1.5 transition-opacity ${hidden ? "opacity-35" : ""}`}
                  style={{ fontSize: controlSize }}
                  title={`${selection.deviceName}.${zh ? meta.nameZh : meta.nameEn}`}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-[#cfe4ff]">
                    {selection.deviceName}.{zh ? meta.nameZh : meta.nameEn}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Content */}
        <div className="min-h-0 flex-1 px-2 pb-2">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <HistoryStyleLoadingIndicator text={zh ? "加载趋势数据..." : "Loading trend data..."} />
            </div>
          ) : !result || result.series.length === 0 || chartData.length === 0 ? (
            <div
              className="flex h-full items-center justify-center rounded-lg border border-[#1a2654]/80 bg-[#101840]/40 px-4 text-center text-[#7b8ab8]"
              style={{ fontSize: labelSize }}
            >
              {placeholderText}
            </div>
          ) : viewMode === "chart" ? (
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
                  contentStyle={{
                    backgroundColor: "#0d1233",
                    border: "1px solid #1a2654",
                    borderRadius: 8,
                    fontSize: chartFontSize,
                  }}
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
          ) : (
            <div className={`h-full overflow-auto rounded-lg border border-[#1a2654]/80 ${SCROLLBAR}`}>
              <table className="w-full border-collapse" style={{ fontSize: chartFontSize }}>
                <thead className="sticky top-0 z-10 bg-[#0d1233]">
                  <tr className="border-b border-[#1a2654] text-[#7b8ab8]">
                    <th className="sticky left-0 z-10 whitespace-nowrap bg-[#0d1233] px-3 py-2 text-left">
                      {zh ? "时间" : "Time"}
                    </th>
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
          )}
        </div>
      </div>
    </div>
  )
}
