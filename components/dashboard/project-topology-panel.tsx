"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/components/language-provider"
import { TopologyView } from "@/components/dashboard/topology/topology-view"
import { applySignals } from "@/lib/topo/apply-signals"
import { makeMockSignals } from "@/lib/topo/mock-signals"
import { resolveTopoNav } from "@/lib/topo/project-topology-config"
import type { TopologyDoc, TopoNodeNav, TopoSignals } from "@/lib/topo/topo-types"

const clampText = (minRem: number, multiple: number, maxRem: number) =>
  `clamp(${minRem}rem, calc(var(--overview-root-size, 15px) * ${multiple}), ${maxRem}rem)`

// 阶段 1/2：先用运营端导出的示例布局 + 模拟实时信号跑通渲染与动态。
// 数据契约与运营端一致（见 topo/拓扑系统-接入文档.md §4）：布局 = 画布 JSON（含规则），
// 实时数据 = 扁平 {信号名:值}。后续替换：SAMPLE_TOPOLOGY_URL → 按 projectId 拉取布局接口；
// makeMockSignals → 实时信号接口（轮询/WebSocket，增量合并到 signalsRef 即可）。
const SAMPLE_TOPOLOGY_URL = "/topology-sample.json"
const REALTIME_INTERVAL_MS = 2000

export function ProjectTopologyPanel({ onNavigateTab }: { onNavigateTab?: (tab: string) => void }) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const router = useRouter()
  const [baseDoc, setBaseDoc] = useState<TopologyDoc | null>(null)
  const [doc, setDoc] = useState<TopologyDoc | null>(null)
  const [error, setError] = useState(false)
  // 信号累积合并（等价运营端 topo:merge 语义）：接口只发变化的信号也能正确驱动
  const signalsRef = useRef<TopoSignals>({})

  // 拉取布局 JSON（一次）
  useEffect(() => {
    let cancelled = false
    setError(false)
    fetch(SAMPLE_TOPOLOGY_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<TopologyDoc>
      })
      .then((json) => {
        if (!cancelled) setBaseDoc(json)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 实时信号轮询：合并信号 → 规则求值（显隐/流向）+ 字段回写，全部按运营端契约
  useEffect(() => {
    if (!baseDoc) return
    let t = 0
    const tick = () => {
      signalsRef.current = { ...signalsRef.current, ...makeMockSignals(t) }
      setDoc(applySignals(baseDoc, signalsRef.current))
      t += REALTIME_INTERVAL_MS / 1000
    }
    tick()
    const timer = window.setInterval(tick, REALTIME_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [baseDoc])

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
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[22px] border border-[#22d3ee]/26 bg-[radial-gradient(circle_at_50%_0%,rgba(64,124,255,0.18),transparent_42%),linear-gradient(180deg,rgba(9,24,52,0.62),rgba(5,15,38,0.7))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_16px_32px_rgba(0,0,0,0.16)]">
      {/* 标题栏 */}
      <div className="flex shrink-0 items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          <span className="h-[0.9em] w-[3px] rounded-full bg-[#22d3ee]" style={{ boxShadow: "0 0 8px #22d3ee" }} />
          <span
            className="font-semibold tracking-[0.04em] text-[#e8f4fc]"
            style={{ fontSize: clampText(0.9, 1.05, 1.28), textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}
          >
            {zh ? "项目拓扑图" : "Project Topology"}
          </span>
        </div>
        <span
          className="flex items-center gap-1.5 rounded-full border border-[#22d3ee]/35 bg-[#0a2142]/60 px-2.5 py-[2px] text-[#7fe3ff]"
          style={{ fontSize: clampText(0.64, 0.74, 0.9) }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee]" style={{ boxShadow: "0 0 6px #22d3ee" }} />
          {zh ? "实时" : "Live"}
        </span>
      </div>

      {/* 拓扑画布 */}
      <div className="relative min-h-0 flex-1">
        {error ? (
          <div className="flex h-full items-center justify-center text-[#6f93b8]" style={{ fontSize: clampText(0.74, 0.86, 1.0) }}>
            {zh ? "拓扑数据加载失败" : "Failed to load topology"}
          </div>
        ) : doc ? (
          <TopologyView doc={doc} resolveNav={resolveTopoNav} onNavigate={handleNavigate} />
        ) : (
          <div className="flex h-full items-center justify-center text-[#6f93b8]" style={{ fontSize: clampText(0.74, 0.86, 1.0) }}>
            {zh ? "拓扑加载中…" : "Loading topology…"}
          </div>
        )}
      </div>
    </div>
  )
}
