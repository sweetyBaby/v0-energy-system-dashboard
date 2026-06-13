"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronRight, Cpu, Minus, Search, Trash2, X } from "lucide-react"
import {
  buildCellNodeId,
  buildDeviceNodeId,
  CELL_COUNT,
  CELL_VARIABLES,
  parseTrendNodeId,
  TREND_VARIABLES,
} from "@/lib/api/trend-analysis"

export type TreeDevice = { deviceId: string; deviceName: string }

const SCROLLBAR =
  "[scrollbar-color:rgba(34,211,238,0.38)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#1f4f78] [&::-webkit-scrollbar-thumb:hover]:bg-[#2aa7b3]"

const CELL_INDEXES = Array.from({ length: CELL_COUNT }, (_, index) => index + 1)

const deviceVarNodeIds = (deviceId: string) =>
  TREND_VARIABLES.map((variable) => buildDeviceNodeId(deviceId, variable.key))
const cellVarNodeIds = (deviceId: string, cell: number) =>
  CELL_VARIABLES.map((variable) => buildCellNodeId(deviceId, cell, variable.key))

const cellGroupKey = (deviceId: string, cell: number) => `${deviceId}#${cell}`

type CheckboxState = "none" | "some" | "all"

function TriCheckbox({ state, color }: { state: CheckboxState; color?: string }) {
  return (
    <span
      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
        state === "all"
          ? "border-transparent"
          : state === "some"
            ? "border-[#00d4aa] bg-[#00d4aa]/30"
            : "border-[#33507a] bg-transparent"
      }`}
      style={state === "all" ? { backgroundColor: color ?? "#00d4aa" } : undefined}
    >
      {state === "all" ? (
        <Check className="h-2.5 w-2.5 text-[#04241c]" strokeWidth={3.5} />
      ) : state === "some" ? (
        <Minus className="h-2.5 w-2.5 text-[#04241c]" strokeWidth={3.5} />
      ) : null}
    </span>
  )
}

/**
 * Multi-select tree: device/rack → (rack-level variables + 电芯 cells → cell
 * variables). Controlled via `value`/`onChange` (a Set of node ids). Shared by
 * the trend-analysis and device-status pages so both expose the same UX.
 */
export function DeviceVariableTree({
  devices,
  value,
  onChange,
  maxSelection,
  colorByNode,
  zh,
  title,
  labelSize,
  titleSize,
  width,
}: {
  devices: TreeDevice[]
  value: Set<string>
  onChange: (next: Set<string>) => void
  maxSelection: number
  colorByNode?: Map<string, string>
  zh: boolean
  title: string
  labelSize: number
  titleSize: number | string
  width: number
}) {
  const [openDevices, setOpenDevices] = useState<Set<string>>(new Set())
  const [openCellGroups, setOpenCellGroups] = useState<Set<string>>(new Set())
  const [openCells, setOpenCells] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (devices.length > 0) {
      setOpenDevices((prev) => (prev.size > 0 ? prev : new Set([devices[0].deviceId])))
    }
  }, [devices])

  // Expand the path to any node that gets selected (e.g. when a template loads).
  useEffect(() => {
    const devicesToOpen = new Set<string>()
    const cellGroupsToOpen = new Set<string>()
    const cellsToOpen = new Set<string>()
    value.forEach((nodeId) => {
      const node = parseTrendNodeId(nodeId)
      if (!node) return
      devicesToOpen.add(node.deviceId)
      if (node.kind === "cell") {
        cellGroupsToOpen.add(node.deviceId)
        cellsToOpen.add(cellGroupKey(node.deviceId, node.cell))
      }
    })
    const merge = (prev: Set<string>, additions: Set<string>) => {
      let changed = false
      const next = new Set(prev)
      additions.forEach((id) => {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      })
      return changed ? next : prev
    }
    setOpenDevices((prev) => merge(prev, devicesToOpen))
    setOpenCellGroups((prev) => merge(prev, cellGroupsToOpen))
    setOpenCells((prev) => merge(prev, cellsToOpen))
  }, [value])

  const normalizedSearch = search.trim().toLowerCase()
  const matches = (label: string) => !normalizedSearch || label.toLowerCase().includes(normalizedSearch)

  const stateOf = (nodeIds: string[]): CheckboxState => {
    const selected = nodeIds.filter((id) => value.has(id)).length
    if (selected === 0) return "none"
    if (selected === nodeIds.length) return "all"
    return "some"
  }

  const toggleOne = (nodeId: string) => {
    const next = new Set(value)
    if (next.has(nodeId)) next.delete(nodeId)
    else {
      if (next.size >= maxSelection) return
      next.add(nodeId)
    }
    onChange(next)
  }

  const toggleMany = (nodeIds: string[]) => {
    const next = new Set(value)
    const allSelected = nodeIds.every((id) => next.has(id))
    if (allSelected) {
      nodeIds.forEach((id) => next.delete(id))
    } else {
      for (const id of nodeIds) {
        if (next.has(id)) continue
        if (next.size >= maxSelection) break
        next.add(id)
      }
    }
    onChange(next)
  }

  const toggleInSet = (setter: typeof setOpenDevices, key: string) => {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Cells matching the current search (by cell number / "电芯N" label).
  const cellSearchActive = normalizedSearch.length > 0
  const cellLabelMatches = (cell: number) =>
    matches(`电芯${cell}`) || matches(`cell ${cell}`) || matches(String(cell))
  const cellGroupVisible = !cellSearchActive || matches("电芯") || matches("cell") || CELL_INDEXES.some(cellLabelMatches)

  return (
    <div
      className="flex min-h-0 shrink-0 flex-col rounded-xl border border-[#1a2654] bg-[#0d1233]"
      style={{ width }}
    >
      <div className="flex items-center justify-between border-b border-[#1a2654] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3 className="font-semibold text-[#00d4aa]" style={{ fontSize: titleSize }}>
            {title}
          </h3>
        </div>
        <span className="rounded-full bg-[#1a2654] px-2 py-0.5 font-mono text-[#7fdfff]" style={{ fontSize: labelSize - 1 }}>
          {value.size}/{maxSelection}
        </span>
      </div>

      <div className="px-2.5 pb-1.5 pt-2">
        <div className="flex items-center gap-2 rounded-lg border border-[#1a2654] bg-[#101840]/70 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-[#5d7299]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={zh ? "搜索变量/电芯" : "Search"}
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
        {devices.length === 0 ? (
          <div className="px-3 py-6 text-center text-[#5d7299]" style={{ fontSize: labelSize }}>
            {zh ? "当前站点暂无设备" : "No devices for this site"}
          </div>
        ) : (
          devices.map((device) => {
            const open = openDevices.has(device.deviceId)
            const devVars = TREND_VARIABLES.filter((variable) => matches(zh ? variable.nameZh : variable.nameEn))
            const showCellGroup = cellGroupVisible
            if (normalizedSearch && devVars.length === 0 && !showCellGroup && !matches(device.deviceName)) {
              return null
            }
            const deviceState = stateOf(deviceVarNodeIds(device.deviceId))
            const groupOpen = openCellGroups.has(device.deviceId)

            return (
              <div key={device.deviceId} className="mb-0.5">
                <div className="flex items-center rounded-md px-1 hover:bg-[#16213f]/70">
                  <button
                    type="button"
                    onClick={() => toggleInSet(setOpenDevices, device.deviceId)}
                    className="flex shrink-0 items-center justify-center p-1 text-[#6f86ad]"
                    aria-label={open ? "collapse" : "expand"}
                  >
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMany(deviceVarNodeIds(device.deviceId))}
                    className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
                  >
                    <TriCheckbox state={deviceState} />
                    <span className="truncate font-medium text-[#cfe4ff]" style={{ fontSize: labelSize }}>
                      {device.deviceName}
                    </span>
                  </button>
                </div>

                {open && (
                  <div className="ml-3 border-l border-[#1a2654] pl-1.5">
                    {/* Rack-level variables */}
                    {devVars.map((variable) => {
                      const nodeId = buildDeviceNodeId(device.deviceId, variable.key)
                      const checked = value.has(nodeId)
                      const disabled = !checked && value.size >= maxSelection
                      return (
                        <button
                          key={nodeId}
                          type="button"
                          onClick={() => toggleOne(nodeId)}
                          disabled={disabled}
                          className={`flex w-full items-center gap-2 rounded-md py-1.5 pl-2 pr-1.5 text-left transition-colors ${
                            checked ? "bg-[#0f2030]" : "hover:bg-[#16213f]/70"
                          } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                        >
                          <TriCheckbox state={checked ? "all" : "none"} color={colorByNode?.get(nodeId)} />
                          <span className="truncate" style={{ fontSize: labelSize, color: checked ? "#e6f4ff" : "#9fb6d6" }}>
                            {zh ? variable.nameZh : variable.nameEn}
                          </span>
                          <span className="ml-auto shrink-0 text-[#5d7299]" style={{ fontSize: labelSize - 1.5 }}>
                            {variable.unit}
                          </span>
                        </button>
                      )
                    })}

                    {/* 电芯 group */}
                    {showCellGroup && (
                      <div>
                        <div className="flex items-center rounded-md px-1 hover:bg-[#16213f]/70">
                          <button
                            type="button"
                            onClick={() => toggleInSet(setOpenCellGroups, device.deviceId)}
                            className="flex shrink-0 items-center justify-center p-1 text-[#6f86ad]"
                            aria-label={groupOpen ? "collapse" : "expand"}
                          >
                            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${groupOpen ? "rotate-90" : ""}`} />
                          </button>
                          <div className="flex min-w-0 flex-1 items-center gap-2 py-1.5">
                            <Cpu className="h-3.5 w-3.5 shrink-0 text-[#5d9fd6]" />
                            <span className="truncate font-medium text-[#cfe4ff]" style={{ fontSize: labelSize }}>
                              {zh ? "电芯" : "Cells"}
                            </span>
                            <span className="ml-auto shrink-0 text-[#5d7299]" style={{ fontSize: labelSize - 1.5 }}>
                              {CELL_COUNT}
                            </span>
                          </div>
                        </div>

                        {groupOpen && (
                          <div className="ml-3 border-l border-[#1a2654] pl-1.5">
                            {CELL_INDEXES.filter((cell) => !cellSearchActive || cellLabelMatches(cell)).map((cell) => {
                              const cKey = cellGroupKey(device.deviceId, cell)
                              const cellOpen = openCells.has(cKey)
                              const cellState = stateOf(cellVarNodeIds(device.deviceId, cell))
                              return (
                                <div key={cKey}>
                                  <div className="flex items-center rounded-md px-1 hover:bg-[#16213f]/70">
                                    <button
                                      type="button"
                                      onClick={() => toggleInSet(setOpenCells, cKey)}
                                      className="flex shrink-0 items-center justify-center p-1 text-[#6f86ad]"
                                      aria-label={cellOpen ? "collapse" : "expand"}
                                    >
                                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${cellOpen ? "rotate-90" : ""}`} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleMany(cellVarNodeIds(device.deviceId, cell))}
                                      className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
                                    >
                                      <TriCheckbox state={cellState} />
                                      <span className="truncate text-[#cfe4ff]" style={{ fontSize: labelSize }}>
                                        {zh ? `电芯${cell}` : `Cell ${cell}`}
                                      </span>
                                    </button>
                                  </div>

                                  {cellOpen && (
                                    <div className="ml-3 border-l border-[#1a2654] pl-1.5">
                                      {CELL_VARIABLES.map((variable) => {
                                        const nodeId = buildCellNodeId(device.deviceId, cell, variable.key)
                                        const checked = value.has(nodeId)
                                        const disabled = !checked && value.size >= maxSelection
                                        return (
                                          <button
                                            key={nodeId}
                                            type="button"
                                            onClick={() => toggleOne(nodeId)}
                                            disabled={disabled}
                                            className={`flex w-full items-center gap-2 rounded-md py-1.5 pl-2 pr-1.5 text-left transition-colors ${
                                              checked ? "bg-[#0f2030]" : "hover:bg-[#16213f]/70"
                                            } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                                          >
                                            <TriCheckbox state={checked ? "all" : "none"} color={colorByNode?.get(nodeId)} />
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
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {value.size > 0 && (
        <button
          type="button"
          onClick={() => onChange(new Set())}
          className="flex items-center justify-center gap-1.5 border-t border-[#1a2654] py-2 text-[#7b8ab8] transition-colors hover:text-[#ff8da3]"
          style={{ fontSize: labelSize }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {zh ? "清空选择" : "Clear all"}
        </button>
      )}
    </div>
  )
}

/**
 * Single-select device list (replaces the old in-page BCU dropdown). Used by the
 * status-overview page so the device picker lives in a left rail like the other
 * detail pages.
 */
export function DeviceListMenu({
  devices,
  value,
  onChange,
  zh,
  title,
  labelSize,
  titleSize,
  width,
}: {
  devices: TreeDevice[]
  value: string
  onChange: (deviceId: string) => void
  zh: boolean
  title: string
  labelSize: number
  titleSize: number | string
  width: number
}) {
  const [search, setSearch] = useState("")
  const normalizedSearch = search.trim().toLowerCase()
  const filtered = useMemo(
    () => devices.filter((device) => !normalizedSearch || device.deviceName.toLowerCase().includes(normalizedSearch)),
    [devices, normalizedSearch]
  )

  return (
    <div
      className="flex min-h-0 shrink-0 flex-col rounded-xl border border-[#1a2654] bg-[#0d1233]"
      style={{ width }}
    >
      <div className="flex items-center justify-between border-b border-[#1a2654] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3 className="font-semibold text-[#00d4aa]" style={{ fontSize: titleSize }}>
            {title}
          </h3>
        </div>
        <span className="rounded-full bg-[#1a2654] px-2 py-0.5 font-mono text-[#7fdfff]" style={{ fontSize: labelSize - 1 }}>
          {devices.length}
        </span>
      </div>

      {devices.length > 6 && (
        <div className="px-2.5 pb-1.5 pt-2">
          <div className="flex items-center gap-2 rounded-lg border border-[#1a2654] bg-[#101840]/70 px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#5d7299]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={zh ? "搜索设备" : "Search device"}
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
      )}

      <div className={`min-h-0 flex-1 overflow-y-auto px-1.5 py-2 ${SCROLLBAR}`}>
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-[#5d7299]" style={{ fontSize: labelSize }}>
            {zh ? "当前站点暂无设备" : "No devices for this site"}
          </div>
        ) : (
          filtered.map((device) => {
            const active = device.deviceId === value
            return (
              <button
                key={device.deviceId}
                type="button"
                onClick={() => onChange(device.deviceId)}
                className={`relative mb-0.5 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors ${
                  active ? "bg-[rgba(38,240,220,0.12)]" : "hover:bg-[#16213f]/70"
                }`}
              >
                {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-[#26f0dc]" />}
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-[#26f0dc] shadow-[0_0_6px_rgba(38,240,220,0.8)]" : "bg-[#33507a]"}`}
                />
                <span
                  className="truncate font-medium"
                  style={{ fontSize: labelSize, color: active ? "#bff8f2" : "#cfe4ff" }}
                >
                  {device.deviceName}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
