"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Maximize2, Minimize2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { TopologyView } from "@/components/dashboard/topology/topology-view"
import { applySignals } from "@/lib/topo/apply-signals"
import type { NavResolver, TopologyDoc, TopoNodeNav, TopoSignals } from "@/lib/topo/topo-types"

// 全屏时放大上限：让小拓扑也能充满整屏（而非维持原尺寸）。
const FULLSCREEN_FIT_CAP = 12

export type TopoCanvasProps = {
  /** 布局 JSON 的地址（public 下的静态文件或后端接口）。 */
  url: string
  /**
   * 可选的实时信号生成器：传入则按 intervalMs 周期合并信号并按运营端契约求值规则
   * （显隐/流向 + 字段回写）；不传则渲染静态布局（动画边由引擎自身驱动）。
   */
  makeSignals?: (t: number) => TopoSignals
  intervalMs?: number
  /** 节点 → 跳转解析（与纵览页一致，可选）。 */
  resolveNav?: NavResolver
  onNavigate?: (nav: TopoNodeNav) => void
  /** 受控全屏：由上层（卡片标题栏的全屏按钮）控制。 */
  fullscreen?: boolean
  /** 请求退出全屏（全屏内的退出按钮 / ESC 触发）。 */
  onExitFullscreen?: () => void
}

/** 进入全屏按钮：放在各卡片标题栏右侧，与标题水平对齐。 */
export function TopoFullscreenButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const label = zh ? "全屏" : "Fullscreen"
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#22d3ee]/35 bg-[#0a2142]/70 text-[#7fe3ff] transition-colors hover:bg-[#0a2142] hover:text-[#bdf3ff] ${className}`}
    >
      <Maximize2 className="h-3.5 w-3.5" />
    </button>
  )
}

/**
 * 拓扑画布加载器：拉取布局 JSON 并交由共享的 {@link TopologyView} 渲染
 * （缩放 / 拖动 / 自适应均由 TopologyView 提供）。纵览页与运行状态页共用此逻辑。
 * 全屏由上层受控；进入按钮见 {@link TopoFullscreenButton}（放标题栏），退出按钮在全屏视图内。
 */
export function TopoCanvas({
  url,
  makeSignals,
  intervalMs = 2000,
  resolveNav,
  onNavigate,
  fullscreen = false,
  onExitFullscreen,
}: TopoCanvasProps) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const [baseDoc, setBaseDoc] = useState<TopologyDoc | null>(null)
  const [doc, setDoc] = useState<TopologyDoc | null>(null)
  const [error, setError] = useState(false)
  // 信号累积合并（等价运营端 topo:merge 语义）：接口只发变化的信号也能正确驱动
  const signalsRef = useRef<TopoSignals>({})

  // 全屏时支持 ESC 退出
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExitFullscreen?.()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fullscreen, onExitFullscreen])

  // 拉取布局 JSON（url 变化时重新拉取）
  useEffect(() => {
    let cancelled = false
    setError(false)
    setBaseDoc(null)
    setDoc(null)
    signalsRef.current = {}
    fetch(url)
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
  }, [url])

  // 实时信号轮询（可选）：合并信号 → 规则求值 + 字段回写；无生成器则渲染静态布局
  useEffect(() => {
    if (!baseDoc) return
    if (!makeSignals) {
      setDoc(baseDoc)
      return
    }
    let t = 0
    const tick = () => {
      signalsRef.current = { ...signalsRef.current, ...makeSignals(t) }
      setDoc(applySignals(baseDoc, signalsRef.current))
      t += intervalMs / 1000
    }
    tick()
    const timer = window.setInterval(tick, intervalMs)
    return () => window.clearInterval(timer)
  }, [baseDoc, makeSignals, intervalMs])

  const content = error ? (
    <div className="flex h-full items-center justify-center text-[12px] text-[#6f93b8]">
      {zh ? "拓扑数据加载失败" : "Failed to load topology"}
    </div>
  ) : !doc ? (
    <div className="flex h-full items-center justify-center text-[12px] text-[#6f93b8]">
      {zh ? "拓扑加载中…" : "Loading topology…"}
    </div>
  ) : (
    <TopologyView
      doc={doc}
      resolveNav={resolveNav}
      onNavigate={onNavigate}
      fitZoomCap={fullscreen ? FULLSCREEN_FIT_CAP : undefined}
      fullscreen={fullscreen}
    />
  )

  // 全屏：通过 portal 渲染到 body，避免被祖先的层叠上下文（z-index）/包含块困住，
  // 从而真正覆盖整页并保证退出按钮可见（否则会出现"其他元素透出、找不到退出按钮"）。
  if (fullscreen && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed inset-0 z-[200] bg-[linear-gradient(180deg,#081a36,#050f24)] p-3">
        <button
          type="button"
          onClick={onExitFullscreen}
          title={zh ? "退出全屏" : "Exit fullscreen"}
          aria-label={zh ? "退出全屏" : "Exit fullscreen"}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-[#22d3ee]/35 bg-[#0a2142]/80 text-[#7fe3ff] backdrop-blur-sm transition-colors hover:bg-[#0a2142] hover:text-[#bdf3ff]"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
        {content}
      </div>,
      document.body,
    )
  }

  return <div className="relative h-full w-full">{content}</div>
}
