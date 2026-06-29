"use client"

import { ChevronRight } from "lucide-react"
import { MenuFoldIcon } from "@/components/dashboard/menu-fold-icons"

// Shared collapse/expand affordances for a left-rail panel that can fold itself
// out of the flow to free the main content. Used by TrendWorkspace (设备监测) and
// the MonitorCategoryTree panels (运行总览 / 告警分类) so all three behave and
// look identical.

/** Fold button that lives in a panel header; collapses the rail. */
export function RailCollapseButton({
  onClick,
  zh,
  className,
}: {
  onClick: () => void
  zh: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center justify-center rounded-md border border-[#27496f] bg-[#101840]/80 p-1 text-[#9bc4e8] transition-colors hover:border-[#45f1d0]/55 hover:text-[#cffcf2] ${className ?? ""}`}
      title={zh ? "折叠面板" : "Collapse panel"}
      aria-label={zh ? "折叠面板" : "Collapse panel"}
    >
      <MenuFoldIcon className="h-4 w-4" />
    </button>
  )
}

/** Floating chevron handle on the content's left edge; restores the rail. */
export function RailRestoreHandle({
  onClick,
  zh,
  title,
}: {
  onClick: () => void
  zh: boolean
  /** Optional tooltip override (e.g. "展开变量面板"); defaults to a generic label. */
  title?: string
}) {
  const label = title ?? (zh ? "展开面板" : "Expand panel")
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-0 top-1/2 z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#27496f] bg-[#0d1233] text-[#9bc4e8] shadow-[0_2px_10px_rgba(0,0,0,0.45)] transition-colors hover:border-[#45f1d0]/60 hover:text-[#cffcf2]"
      title={label}
      aria-label={label}
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  )
}
