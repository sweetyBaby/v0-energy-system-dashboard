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
  /**
   * 仅用于「静态/本地」布局文件（public 下固定 JSON，如运行状态页的 topo-pcs/ems）。
   * ⚠️ 动态 / 后端 API 数据不要走这里——必须用 loadDoc 经接缝层 lib/topo/topo-api.ts，
   * 否则会绕过 mock↔API 的统一切换点。与 loadDoc 二选一，loadDoc 优先。
   */
  url?: string
  /**
   * 异步布局加载器（优先于 url）：动态 / API 数据走此项（经接缝层 lib/topo/topo-api.ts），
   * 后续 mock→API 切换只改接缝层，本组件不感知。
   */
  loadDoc?: () => Promise<TopologyDoc>
  /**
   * 可选的实时信号生成器：传入则按 intervalMs 周期合并信号并按运营端契约求值规则
   * （显隐/流向 + 字段回写）；不传则渲染静态布局（动画边由引擎自身驱动）。
   * 可返回 Promise（真实接口轮询）或同步值（mock）。
   */
  makeSignals?: (t: number) => TopoSignals | Promise<TopoSignals>
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
  loadDoc,
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
  // 实时信号连续拉取失败 → 进入「数据陈旧」态（仍显示最近一帧，但给可见提示）
  const [signalStale, setSignalStale] = useState(false)
  // 信号累积合并（等价运营端 topo:merge 语义）：接口只发变化的信号也能正确驱动
  const signalsRef = useRef<TopoSignals>({})
  // 连续失败计数：达到阈值才提示，避免偶发抖动误报
  const signalFailRef = useRef(0)

  // 全屏时支持 ESC 退出
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExitFullscreen?.()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fullscreen, onExitFullscreen])

  // 拉取布局 JSON（loadDoc 优先于 url；二者变化时重新拉取）
  useEffect(() => {
    let cancelled = false
    setError(false)
    setBaseDoc(null)
    setDoc(null)
    signalsRef.current = {}
    const load = loadDoc
      ? loadDoc()
      : url
        ? fetch(url).then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            return r.json() as Promise<TopologyDoc>
          })
        : Promise.reject(new Error("TopoCanvas: 需要 url 或 loadDoc"))
    load
      .then((json) => {
        if (!cancelled) setBaseDoc(json)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [url, loadDoc])

  // 实时信号轮询（可选）：合并信号 → 规则求值 + 字段回写；无生成器则渲染静态布局。
  // makeSignals 可同步（mock）或异步（接口轮询）；inFlight 防止慢接口下 tick 叠加。
  useEffect(() => {
    if (!baseDoc) return
    if (!makeSignals) {
      setDoc(baseDoc)
      return
    }
    // 先用「布局 + 已累积信号」渲染一帧：即使实时信号从首次起就失败，拓扑也能显示（占位值），
    // 不会卡在「加载中」——信号成功后再叠加实时值。
    setDoc(applySignals(baseDoc, signalsRef.current))
    let cancelled = false
    let inFlight = false
    let t = 0
    signalFailRef.current = 0
    setSignalStale(false)
    const SIGNAL_STALE_AFTER = 3 // 连续失败 N 次才提示（默认 2s 间隔 → 约 6s）
    const tick = async () => {
      if (inFlight) return
      inFlight = true
      try {
        const next = await makeSignals(t)
        if (cancelled) return
        signalFailRef.current = 0
        setSignalStale(false) // 恢复成功 → 清除提示（值不变时 React 自动跳过重渲染）
        signalsRef.current = { ...signalsRef.current, ...next }
        setDoc(applySignals(baseDoc, signalsRef.current))
        t += intervalMs / 1000
      } catch {
        // 信号拉取失败：保留上一帧、下个周期重试；连续多次才提示「数据陈旧」
        signalFailRef.current += 1
        if (!cancelled && signalFailRef.current >= SIGNAL_STALE_AFTER) setSignalStale(true)
      } finally {
        inFlight = false
      }
    }
    void tick()
    const timer = window.setInterval(() => void tick(), intervalMs)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
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

  // 信号陈旧提示：浮层、不挡交互；仅在有实时数据且连续拉取失败时出现
  const staleBadge =
    signalStale && !error && doc ? (
      <div className="pointer-events-none absolute left-1/2 top-2 z-[5] -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-400/40 bg-[#2a1c08]/85 px-2.5 py-[2px] text-[11px] text-amber-300 backdrop-blur-sm">
        {zh ? "● 实时数据更新中断，显示最近数据" : "● Live data interrupted — showing last known"}
      </div>
    ) : null

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
        {staleBadge}
        {content}
      </div>,
      document.body,
    )
  }

  return (
    <div className="relative h-full w-full">
      {staleBadge}
      {content}
    </div>
  )
}
