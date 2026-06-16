"use client"

import { useMemo, useState } from "react"
import { BatteryCharging, ChevronDown, Cpu, Layers, Zap } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import type { MonitorDevice } from "@/lib/device-selection"
import type { MonitorDeviceKind } from "@/lib/api/trend-analysis"

/**
 * In-page secondary navigation for the monitoring views, rendered as a **nested
 * topology tree** that mirrors the physical hierarchy:
 *
 *   iMEMS (EMS, top layer)
 *     └ PCS (变流器)
 *         └ 电池储能单元 (battery storage unit — grouping node)
 *             ├ BCU1 (rack/BMS)
 *             ├ BCU2 …
 *
 * Selecting an EMS / PCS / BCU leaf chooses which device's *overview* to show
 * (总览维度) — distinct from {@link DeviceVariableTree} which selects measurement
 * points (明细维度). The 电池储能单元 node is a pure grouping label (expand only).
 * Shared by 运行状态 (operations) and 告警监测 (alarm).
 */

const normalizeKind = (kind: MonitorDeviceKind): Exclude<MonitorDeviceKind, "other"> =>
  kind === "other" ? "rack" : kind

type TreeNodeModel = {
  id: string
  label: string
  icon: React.ElementType
  /** A selectable device leaf carries a deviceId; grouping nodes do not. */
  deviceId?: string
  children: TreeNodeModel[]
}

type MonitorCategoryTreeProps = {
  devices: MonitorDevice[]
  selectedDeviceId: string
  onSelect: (deviceId: string) => void
  /** Optional per-device badge (e.g. active alarm count). */
  badgeCounts?: Record<string, number>
  title?: string
}

export function MonitorCategoryTree({
  devices,
  selectedDeviceId,
  onSelect,
  badgeCounts,
  title,
}: MonitorCategoryTreeProps) {
  const { language } = useLanguage()
  const zh = language === "zh"

  const roots = useMemo<TreeNodeModel[]>(() => {
    const ems = devices.filter((d) => normalizeKind(d.deviceKind) === "ems")
    const pcs = devices.filter((d) => normalizeKind(d.deviceKind) === "pcs")
    const racks = devices.filter((d) => normalizeKind(d.deviceKind) === "rack")

    const rackNodes: TreeNodeModel[] = racks.map((d) => ({
      id: d.deviceId,
      label: d.deviceName,
      icon: Layers,
      deviceId: d.deviceId,
      children: [],
    }))

    // The battery storage unit is a grouping node that holds the BCU/rack leaves.
    const batteryGroup: TreeNodeModel[] = rackNodes.length
      ? [
          {
            id: "__battery_unit__",
            label: zh ? "电池储能单元" : "Battery Unit",
            icon: BatteryCharging,
            children: rackNodes,
          },
        ]
      : []

    // PCS nodes: the first one carries the battery unit subtree (we lack a
    // PCS→rack mapping, so all BCUs hang under the first PCS).
    const pcsNodes: TreeNodeModel[] = pcs.map((d, index) => ({
      id: d.deviceId,
      label: d.deviceName,
      icon: Zap,
      deviceId: d.deviceId,
      children: index === 0 ? batteryGroup : [],
    }))

    const emsChildren = pcsNodes.length ? pcsNodes : batteryGroup
    const emsNodes: TreeNodeModel[] = ems.map((d, index) => ({
      id: d.deviceId,
      label: d.deviceName,
      icon: Cpu,
      deviceId: d.deviceId,
      children: index === 0 ? emsChildren : [],
    }))

    if (emsNodes.length) return emsNodes
    if (pcsNodes.length) return pcsNodes
    return batteryGroup
  }, [devices, zh])

  // Collapsed node ids (everything expanded by default, matching the topology view).
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const renderNode = (node: TreeNodeModel, depth: number): React.ReactNode => {
    const hasChildren = node.children.length > 0
    const open = !collapsed.has(node.id)
    const selectable = Boolean(node.deviceId)
    const active = selectable && node.deviceId === selectedDeviceId
    const Icon = node.icon
    const badge = node.deviceId ? badgeCounts?.[node.deviceId] ?? 0 : 0

    return (
      <div key={node.id} className="flex flex-col">
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (selectable) onSelect(node.deviceId!)
            else if (hasChildren) toggle(node.id)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              if (selectable) onSelect(node.deviceId!)
              else if (hasChildren) toggle(node.id)
            }
          }}
          title={node.label}
          className={`relative flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-2 transition-all ${
            active
              ? "border border-[#39d7cf]/42 bg-[linear-gradient(135deg,rgba(13,104,122,0.96),rgba(7,48,67,0.92))] text-[#efffff] shadow-[0_0_0_1px_rgba(57,215,207,0.08),inset_0_1px_0_rgba(233,255,255,0.16)]"
              : "border border-transparent text-[#bcd6e8] hover:bg-[rgba(115,198,255,0.08)] hover:text-[#eaf6ff]"
          }`}
          style={{ paddingLeft: 6 + depth * 12 }}
        >
          {active && (
            <span className="absolute inset-y-1 left-0 w-[2px] rounded-r-full bg-[#26f0dc] shadow-[0_0_8px_rgba(38,240,220,0.7)]" />
          )}
          {hasChildren ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                toggle(node.id)
              }}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-current/80 hover:text-current"
              aria-label={open ? "collapse" : "expand"}
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
            </button>
          ) : (
            <span className="h-4 w-4 shrink-0" />
          )}
          <Icon
            className={`h-4 w-4 shrink-0 ${
              active ? "text-[#26f0dc]" : selectable ? "text-[#78bfd1]" : "text-[#5d9bb3]"
            }`}
          />
          <span className="flex-1 truncate text-[11.5px] font-medium tracking-[0.02em]">{node.label}</span>
          {badge > 0 && (
            <span className="flex h-[15px] min-w-[15px] shrink-0 items-center justify-center rounded-full bg-[#ff4d6d] px-1 text-[9px] font-bold text-white shadow-[0_0_5px_rgba(255,77,109,0.7)]">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </div>

        {hasChildren && open && (
          <div className="relative ml-[14px] flex flex-col border-l border-[#214a60]/70">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[14px] border border-[#1c4263] bg-[linear-gradient(180deg,rgba(9,21,36,0.96),rgba(6,14,26,0.98))] shadow-[inset_0_1px_0_rgba(120,200,255,0.06)]">
      <div className="flex items-center gap-2 border-b border-[#16344f] px-3 py-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#26f0dc] shadow-[0_0_8px_rgba(38,240,220,0.7)]" />
        <span className="text-[12px] font-semibold tracking-[0.06em] text-[#d9f6ff]">
          {title ?? (zh ? "设备拓扑" : "Topology")}
        </span>
      </div>

      <nav className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-1.5 py-2">
        {roots.map((node) => renderNode(node, 0))}
      </nav>
    </aside>
  )
}
