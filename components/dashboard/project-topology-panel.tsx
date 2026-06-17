"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/components/language-provider"
import { TopoCanvas, TopoFullscreenButton } from "@/components/dashboard/topology/topo-canvas"
import { makeMockSignals } from "@/lib/topo/mock-signals"
import { resolveTopoNav } from "@/lib/topo/project-topology-config"
import type { TopoNodeNav } from "@/lib/topo/topo-types"

const clampText = (minRem: number, multiple: number, maxRem: number) =>
  `clamp(${minRem}rem, calc(var(--overview-root-size, 15px) * ${multiple}), ${maxRem}rem)`

// 阶段 1/2：先用运营端导出的示例布局 + 模拟实时信号跑通渲染与动态。
// 数据契约与运营端一致（见 topo/拓扑系统-接入文档.md §4）：布局 = 画布 JSON（含规则），
// 实时数据 = 扁平 {信号名:值}。后续替换：SAMPLE_TOPOLOGY_URL → 按 projectId 拉取布局接口；
// makeMockSignals → 实时信号接口（轮询/WebSocket，增量合并即可）。拉取/渲染逻辑由 TopoCanvas 共用。
const SAMPLE_TOPOLOGY_URL = "/topology-sample.json"

export function ProjectTopologyPanel({ onNavigateTab }: { onNavigateTab?: (tab: string) => void }) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const router = useRouter()
  const [fullscreen, setFullscreen] = useState(false)

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
      {/* 状态栏 */}
      <div className="relative z-[1] flex shrink-0 items-center justify-between px-4 pt-3">
        <span
          className="flex items-center gap-1.5 rounded-full border border-[#22d3ee]/35 bg-[#0a2142]/60 px-2.5 py-[2px] text-[#7fe3ff]"
          style={{ fontSize: clampText(0.64, 0.74, 0.9) }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee]" style={{ boxShadow: "0 0 6px #22d3ee" }} />
          {zh ? "实时" : "Live"}
        </span>
        <TopoFullscreenButton onClick={() => setFullscreen(true)} />
      </div>

      {/* 拓扑画布（拉取 + 渲染逻辑由 TopoCanvas 共用） */}
      <div className="relative z-[1] min-h-0 flex-1">
        <TopoCanvas
          url={SAMPLE_TOPOLOGY_URL}
          makeSignals={makeMockSignals}
          resolveNav={resolveTopoNav}
          onNavigate={handleNavigate}
          fullscreen={fullscreen}
          onExitFullscreen={() => setFullscreen(false)}
        />
      </div>
    </div>
  )
}
