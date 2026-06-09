"use client"

import { useEffect, useRef } from "react"
import { Maximize2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { createTopoEngine } from "@/lib/topo/engine"
import { docToInternal, loadTopoIcons } from "@/lib/topo/load-topology"
import type { NavResolver, TopologyDoc, TopoNodeNav } from "@/lib/topo/topo-types"

type TopoEngine = ReturnType<typeof createTopoEngine>
type HitNode = { id: string; type: string; nav?: TopoNodeNav }

// 文字底板/抹线用色：贴合本项目深色卡片风格（画布本身透明，露出卡片渐变背景）
const PLATE_BG = "#0a1a33"
const ZOOM_MIN = 0.25
const ZOOM_MAX = 6

export type TopologyViewProps = {
  doc: TopologyDoc | null
  /** 本项目侧的节点→跳转解析（topo.html 不含 nav） */
  resolveNav?: NavResolver
  /** 命中可跳转节点时回调 */
  onNavigate?: (nav: TopoNodeNav, node: HitNode) => void
}

// 节点布局签名：仅在节点集合/位置变化时重新 fitView，避免实时刷新打断用户缩放/拖动
const layoutSig = (doc: TopologyDoc) => doc.nodes.map((n) => `${n.id}:${n.position?.x},${n.position?.y}`).join("|")

/**
 * 拓扑只读视图：渲染布局 JSON，背景透明贴合项目卡片风格；
 * 支持滚轮缩放、拖动平移整张图（不可编辑节点）；点击命中节点 → onNavigate。
 * 实时数据更新由上层每次传入新 doc 驱动，不会重置用户视图。
 */
export function TopologyView({ doc, resolveNav, onNavigate }: TopologyViewProps) {
  const { language } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<TopoEngine | null>(null)
  const resolveNavRef = useRef(resolveNav)
  resolveNavRef.current = resolveNav
  const onNavigateRef = useRef(onNavigate)
  onNavigateRef.current = onNavigate

  const lastSigRef = useRef<string | null>(null)
  const userMovedRef = useRef(false)
  // 拖动平移状态
  const dragRef = useRef<{ active: boolean; sx: number; sy: number; px: number; py: number; moved: boolean }>({
    active: false, sx: 0, sy: 0, px: 0, py: 0, moved: false,
  })

  const navOf = (node: HitNode | null): TopoNodeNav | undefined => {
    if (!node) return undefined
    return resolveNavRef.current?.({ id: node.id, type: node.type }) ?? node.nav
  }

  const hitAt = (clientX: number, clientY: number): HitNode | null => {
    const engine = engineRef.current
    const canvas = canvasRef.current
    if (!engine || !canvas) return null
    const rect = canvas.getBoundingClientRect()
    return engine.hitTestNode(clientX - rect.left, clientY - rect.top) as HitNode | null
  }

  const fitToView = () => {
    const engine = engineRef.current
    if (!engine) return
    userMovedRef.current = false
    engine.fitView(2)
  }

  // 引擎只创建一次
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const engine = createTopoEngine(canvas, {
      lang: language === "en" ? "en" : "zh",
      paintBg: false, // 画布透明，露出卡片背景，风格与项目一致
      bgColor: PLATE_BG,
    })
    engineRef.current = engine

    let disposed = false
    void loadTopoIcons().then((imgs) => {
      if (disposed) return
      engine.setIcons(imgs)
      engine.redraw()
    })
    engine.start()

    const sync = () => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      if (!userMovedRef.current) engine.fitView(2) // 用户未手动操作时随容器自适应
      engine.redraw()
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(container)

    // 滚轮缩放（向光标聚焦）；用原生非被动监听以便 preventDefault
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault()
      const eng = engineRef.current
      if (!eng) return
      const rect = canvas.getBoundingClientRect()
      const mx = ev.clientX - rect.left
      const my = ev.clientY - rect.top
      const v = eng.getView()
      const factor = ev.deltaY < 0 ? 1.12 : 1 / 1.12
      const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v.zoom * factor))
      if (z === v.zoom) return
      const wx = (mx - v.panX) / v.zoom
      const wy = (my - v.panY) / v.zoom
      eng.setView({ zoom: z, panX: mx - wx * z, panY: my - wy * z })
      userMovedRef.current = true
    }
    canvas.addEventListener("wheel", onWheel, { passive: false })

    return () => {
      disposed = true
      ro.disconnect()
      canvas.removeEventListener("wheel", onWheel)
      engine.destroy()
      engineRef.current = null
    }
    // 仅挂载时创建；language/doc 变更走各自的 effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 语言切换
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.setLang(language === "en" ? "en" : "zh")
    engine.redraw()
  }, [language])

  // 布局 / 实时数据更新：每次喂数据；仅当节点布局变化时才重新 fitView
  useEffect(() => {
    const engine = engineRef.current
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!engine || !canvas || !container || !doc) return

    const { nodes, edges, edgeTypes } = docToInternal(doc)
    engine.setEdgeTypes(edgeTypes)
    engine.setData(nodes, edges)

    const sig = layoutSig(doc)
    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      fitToView() // 新布局 → 适应一次
    }
    engine.redraw()
  }, [doc])

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-grab"
        onMouseDown={(ev) => {
          const eng = engineRef.current
          if (!eng) return
          const v = eng.getView()
          dragRef.current = { active: true, sx: ev.clientX, sy: ev.clientY, px: v.panX, py: v.panY, moved: false }
          if (canvasRef.current) canvasRef.current.style.cursor = "grabbing"
        }}
        onMouseMove={(ev) => {
          const eng = engineRef.current
          const canvas = canvasRef.current
          if (!eng || !canvas) return
          const drag = dragRef.current
          if (drag.active) {
            const dx = ev.clientX - drag.sx
            const dy = ev.clientY - drag.sy
            if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
            eng.setView({ panX: drag.px + dx, panY: drag.py + dy })
            if (drag.moved) userMovedRef.current = true
          } else {
            canvas.style.cursor = navOf(hitAt(ev.clientX, ev.clientY)) ? "pointer" : "grab"
          }
        }}
        onMouseUp={() => {
          dragRef.current.active = false
          if (canvasRef.current) canvasRef.current.style.cursor = "grab"
        }}
        onMouseLeave={() => {
          dragRef.current.active = false
          if (canvasRef.current) canvasRef.current.style.cursor = "grab"
        }}
        onClick={(ev) => {
          if (dragRef.current.moved) return // 刚才是拖动，不触发跳转
          const node = hitAt(ev.clientX, ev.clientY)
          const nav = navOf(node)
          if (node && nav && onNavigateRef.current) onNavigateRef.current(nav, node)
        }}
      />
      {/* 复位/适应按钮 */}
      <button
        type="button"
        onClick={fitToView}
        title={language === "en" ? "Fit view" : "复位适应"}
        className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-md border border-[#22d3ee]/30 bg-[#0a2142]/70 text-[#7fe3ff] backdrop-blur-sm transition hover:border-[#22d3ee]/60 hover:text-[#bdf2ff]"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
