"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/components/language-provider"
import { TopoCanvas, TopoFullscreenButton } from "@/components/dashboard/topology/topo-canvas"
import { fetchTopologyLayout, makeTopologySignals } from "@/lib/topo/topo-api"
import { resolveTopoNav } from "@/lib/topo/project-topology-config"
import type { TopoNodeNav } from "@/lib/topo/topo-types"

const clampText = (minRem: number, multiple: number, maxRem: number) =>
  `clamp(${minRem}rem, calc(var(--overview-root-size, 15px) * ${multiple}), ${maxRem}rem)`

// 取数全部走接缝层 lib/topo/topo-api.ts（见 docs/拓扑前后台接口定义.md）：
// 现在走 mock，后端就绪后只改接缝层（TOPOLOGY_USE_MOCK=false），本组件零改动。
export function ProjectTopologyPanel({
  onNavigateTab,
  projectId,
}: {
  onNavigateTab?: (tab: string) => void
  /** 多项目时传入；mock 阶段忽略，接口阶段用于按项目拉取布局/信号。 */
  projectId?: string
}) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const router = useRouter()
  const [fullscreen, setFullscreen] = useState(false)

  // 稳定引用：避免每次渲染重建导致 TopoCanvas 重新拉取/重启信号轮询
  const loadDoc = useCallback(() => fetchTopologyLayout(projectId), [projectId])
  const makeSignals = useMemo(() => makeTopologySignals(projectId), [projectId])

  const handleNavigate = (nav: TopoNodeNav) => {
    if (nav.page.startsWith("/")) {
      // 路径型 → 外部路由
      const qs = new URLSearchParams({ ...(nav.deviceId ? { deviceId: nav.deviceId } : {}), ...(nav.params ?? {}) }).toString()
      router.push(qs ? `${nav.page}?${qs}` : nav.page)
    } else {
      // tab key → 切换 dashboard tab
      onNavigateTab?.(nav.page)
    }
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[22px] border border-[#22d3ee]/26 bg-[radial-gradient(circle_at_18%_16%,rgba(64,124,255,0.18),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(0,212,170,0.12),transparent_24%),linear-gradient(180deg,rgba(11,31,67,0.66),rgba(6,20,47,0.74))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_16px_32px_rgba(0,0,0,0.16)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.11] [background-image:linear-gradient(rgba(125,220,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(125,220,255,0.14)_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(95,208,255,0.72),transparent)]" />
      {/* 拓扑画布：铺满整个面板，作为单一容器（拖动/缩放用满全幅，顶部不再被状态栏切走一条） */}
      <div className="absolute inset-0 z-[1]">
        <TopoCanvas
          loadDoc={loadDoc}
          makeSignals={makeSignals}
          resolveNav={resolveTopoNav}
          onNavigate={handleNavigate}
          fullscreen={fullscreen}
          onExitFullscreen={() => setFullscreen(false)}
        />
      </div>

      {/* 状态栏：悬浮在画布之上（整行不挡拖动，仅徽标/按钮可交互），落在 fitView 顶部留白处 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex items-center justify-between px-4 pt-3">
        <span
          className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-[#22d3ee]/35 bg-[#0a2142]/60 px-2.5 py-[2px] text-[#7fe3ff]"
          style={{ fontSize: clampText(0.64, 0.74, 0.9) }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee]" style={{ boxShadow: "0 0 6px #22d3ee" }} />
          {zh ? "实时" : "Live"}
        </span>
        <TopoFullscreenButton className="pointer-events-auto" onClick={() => setFullscreen(true)} />
      </div>
    </div>
  )
}
