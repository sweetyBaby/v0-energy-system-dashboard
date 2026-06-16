"use client"

import { useEffect, useRef } from "react"
import { useLanguage } from "@/components/language-provider"
import { createTopoEngine } from "@/lib/topo/engine"
import { docToInternal, loadTopoIcons } from "@/lib/topo/load-topology"
import type { NavResolver, TopologyDoc, TopoNodeNav } from "@/lib/topo/topo-types"

type TopoEngine = ReturnType<typeof createTopoEngine>
type HitNode = { id: string; type: string; nav?: TopoNodeNav }
type DragState = {
  pointerId: number
  startClientX: number
  startClientY: number
  startPanX: number
  startPanY: number
  moved: boolean
}

// 文字底板/抹线用色：贴合本项目深色卡片风格（画布本身透明，露出卡片渐变背景）
const PLATE_BG = "#0a1a33"
const MIN_ZOOM = 0.25
const MAX_ZOOM = 5
const DRAG_THRESHOLD = 4
const FIT_ZOOM_CAP = 2.4
const TOPOLOGY_COMPACT_SCALE = { x: 0.82, y: 0.9 }

// 引擎内的节点标签/字段卡片是「屏幕恒定尺寸」：在容器尺寸下它们恒为 ~14px，本就清晰可读。
// 故按容器原生尺寸渲染（再乘 devicePixelRatio 让文字更锐利），文字不被整体缩小；
// 「节点/数据字段不叠放」由布局自身的间距保证（拓扑布局已按内容足迹排布，见 topology-sample.json）。
const MAX_BITMAP = 3200 // 位图最长边上限：高 DPR + 大容器时避免位图过大拖累动画

/** 按容器原生尺寸 × DPR 设置画布内部位图分辨率（文字清晰、不缩小；封顶 MAX_BITMAP）。 */
function sizeCanvasBitmap(canvas: HTMLCanvasElement, container: HTMLElement) {
  const cw = Math.max(1, container.clientWidth)
  const ch = Math.max(1, container.clientHeight)
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  const scale = Math.min(dpr, MAX_BITMAP / Math.max(cw, ch))
  canvas.width = Math.max(1, Math.round(cw * scale))
  canvas.height = Math.max(1, Math.round(ch * scale))
}

/** CSS 像素 → 画布位图像素的换算系数（位图分辨率与 CSS 显示尺寸不一致时用于命中测试）。 */
function canvasScale(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  return {
    rect,
    fx: rect.width ? canvas.width / rect.width : 1,
    fy: rect.height ? canvas.height / rect.height : 1,
  }
}

export type TopologyViewProps = {
  doc: TopologyDoc | null
  /** 本项目侧的节点→跳转解析（topo.html 不含 nav） */
  resolveNav?: NavResolver
  /** 命中可跳转节点时回调 */
  onNavigate?: (nav: TopoNodeNav, node: HitNode) => void
}

// 节点布局签名：仅在节点集合/位置变化时重新 fitView（实时数据每 2s 刷新但位置不变，无需反复重算）
const layoutSig = (doc: TopologyDoc) => doc.nodes.map((n) => `${n.id}:${n.position?.x},${n.position?.y}`).join("|")

/**
 * 拓扑只读视图：渲染布局 JSON，背景透明贴合项目卡片风格。
 * 初始/新布局自适应容器，随后支持用户滚轮缩放与拖动画布平移；
 * 仅保留点击命中节点 → onNavigate。实时数据更新由上层每次传入新 doc 驱动。
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
  const hasUserViewRef = useRef(false)
  const dragStateRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)

  const navOf = (node: HitNode | null): TopoNodeNav | undefined => {
    if (!node) return undefined
    return resolveNavRef.current?.({ id: node.id, type: node.type }) ?? node.nav
  }

  const hitAt = (clientX: number, clientY: number): HitNode | null => {
    const engine = engineRef.current
    const canvas = canvasRef.current
    if (!engine || !canvas) return null
    const { rect, fx, fy } = canvasScale(canvas)
    return engine.hitTestNode((clientX - rect.left) * fx, (clientY - rect.top) * fy) as HitNode | null
  }

  const updateHoverCursor = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas || dragStateRef.current) return
    canvas.style.cursor = navOf(hitAt(clientX, clientY)) ? "pointer" : "grab"
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
      nodeScale: 1.18,
      labelScale: 1.28,
      fieldScale: 1.32,
    })
    engineRef.current = engine

    let disposed = false
    void loadTopoIcons().then((imgs) => {
      if (disposed) return
      engine.setIcons(imgs)
      engine.redraw()
    })
    engine.start()

    // 容器尺寸变化：未手动调整时继续自适应；手动调整后尽量保持当前视图。
    const sync = () => {
      const prevWidth = canvas.width || 1
      const prevHeight = canvas.height || 1
      const prevView = engine.getView()
      sizeCanvasBitmap(canvas, container)
      if (hasUserViewRef.current) {
        const scaleX = canvas.width / prevWidth
        const scaleY = canvas.height / prevHeight
        const scale = (scaleX + scaleY) / 2
        engine.setView({
          zoom: prevView.zoom * scale,
          panX: prevView.panX * scaleX,
          panY: prevView.panY * scaleY,
        })
      } else {
        engine.fitView(FIT_ZOOM_CAP)
      }
      engine.redraw()
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(container)

    return () => {
      disposed = true
      ro.disconnect()
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

    const { nodes, edges, edgeTypes } = docToInternal(doc, { compact: TOPOLOGY_COMPACT_SCALE })
    engine.setEdgeTypes(edgeTypes)
    engine.setData(nodes, edges)

    const sig = layoutSig(doc)
    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig
      hasUserViewRef.current = false
      sizeCanvasBitmap(canvas, container)
      engine.fitView(FIT_ZOOM_CAP) // 新布局 → 适应一次
    }
    engine.redraw()
  }, [doc])

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        onWheel={(ev) => {
          const engine = engineRef.current
          const canvas = canvasRef.current
          if (!engine || !canvas) return

          ev.preventDefault()
          const { rect, fx, fy } = canvasScale(canvas)
          const sx = (ev.clientX - rect.left) * fx
          const sy = (ev.clientY - rect.top) * fy
          const view = engine.getView()
          const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.zoom * Math.exp(-ev.deltaY * 0.0012)))
          if (nextZoom === view.zoom) return

          const worldX = (sx - view.panX) / view.zoom
          const worldY = (sy - view.panY) / view.zoom
          hasUserViewRef.current = true
          engine.setView({
            zoom: nextZoom,
            panX: sx - worldX * nextZoom,
            panY: sy - worldY * nextZoom,
          })
          engine.redraw()
        }}
        onPointerDown={(ev) => {
          if (ev.button !== 0) return
          const engine = engineRef.current
          const canvas = canvasRef.current
          if (!engine || !canvas) return

          const view = engine.getView()
          dragStateRef.current = {
            pointerId: ev.pointerId,
            startClientX: ev.clientX,
            startClientY: ev.clientY,
            startPanX: view.panX,
            startPanY: view.panY,
            moved: false,
          }
          canvas.setPointerCapture(ev.pointerId)
          canvas.style.cursor = "grabbing"
        }}
        onPointerMove={(ev) => {
          const engine = engineRef.current
          const canvas = canvasRef.current
          if (!engine || !canvas) return

          const dragState = dragStateRef.current
          if (!dragState || dragState.pointerId !== ev.pointerId) {
            updateHoverCursor(ev.clientX, ev.clientY)
            return
          }

          const dx = ev.clientX - dragState.startClientX
          const dy = ev.clientY - dragState.startClientY
          if (!dragState.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return

          const { fx, fy } = canvasScale(canvas)
          dragState.moved = true
          hasUserViewRef.current = true
          engine.setView({
            panX: dragState.startPanX + dx * fx,
            panY: dragState.startPanY + dy * fy,
          })
          engine.redraw()
        }}
        onPointerUp={(ev) => {
          const canvas = canvasRef.current
          const dragState = dragStateRef.current
          if (!canvas || !dragState || dragState.pointerId !== ev.pointerId) return

          suppressClickRef.current = dragState.moved
          dragStateRef.current = null
          if (canvas.hasPointerCapture(ev.pointerId)) {
            canvas.releasePointerCapture(ev.pointerId)
          }
          updateHoverCursor(ev.clientX, ev.clientY)
        }}
        onPointerCancel={(ev) => {
          const canvas = canvasRef.current
          const dragState = dragStateRef.current
          if (!canvas || !dragState || dragState.pointerId !== ev.pointerId) return

          dragStateRef.current = null
          if (canvas.hasPointerCapture(ev.pointerId)) {
            canvas.releasePointerCapture(ev.pointerId)
          }
          updateHoverCursor(ev.clientX, ev.clientY)
        }}
        onLostPointerCapture={(ev) => {
          const dragState = dragStateRef.current
          if (!dragState || dragState.pointerId !== ev.pointerId) return

          dragStateRef.current = null
          updateHoverCursor(ev.clientX, ev.clientY)
        }}
        onClick={(ev) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false
            return
          }

          const node = hitAt(ev.clientX, ev.clientY)
          const nav = navOf(node)
          if (node && nav && onNavigateRef.current) onNavigateRef.current(nav, node)
        }}
      />
    </div>
  )
}
