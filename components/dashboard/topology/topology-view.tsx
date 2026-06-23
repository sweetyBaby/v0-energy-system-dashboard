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
const DRAG_THRESHOLD = 4
const FIT_ZOOM_CAP = 2.4
// 放大上限：相对「全貌(fit)」的最大倍数。下限恒为 1（=fit），即缩到底也始终展示完整拓扑。
const MAX_USER_SCALE = 4
const TOPOLOGY_COMPACT_SCALE = { x: 0.82, y: 0.9 }
// 节点/标签/字段的基准放大倍率（userScale=1 时）。缩放时它们与 zoom 同步放大，
// 使「连线、文字、图标」随缩放一起变大/变小，而非引擎默认的「屏幕恒定尺寸」。
const BASE_NODE_SCALE = 1.18
const BASE_LABEL_SCALE = 1.28
const BASE_FIELD_SCALE = 1.32
// 文字随容器最短边（CSS px）放大：minSide=TEXT_REF_MIN 时倍率=1，更大（全屏/大卡片）按增益放大。
// 引擎里图标(nsz)本就随容器自适配，标签/字段是「屏幕恒定」——此倍率让文字「为主」随容器同步放大，
// 避免全屏只放大连线/图标、文字仍是小号。TEXT_GAIN 控制放大速度（越大文字越突出），
// floor=1 防小容器文字过小/重叠，cap 防过大。连线只随文字「适度」变粗（EDGE_DAMP<1）。
// 此倍率只施于 label/field/edge，不施于 nodeScale（图标已自适配，避免二次放大）。
const TEXT_REF_MIN = 640
const TEXT_GAIN = 1.8
const TEXT_SCALE_MIN = 1
const TEXT_SCALE_MAX = 3.2
const EDGE_DAMP = 0.4
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

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
  /** 适应容器时的最大放大倍数上限。全屏时传更大值，让拓扑充满大画布而非维持原尺寸。 */
  fitZoomCap?: number
  /**
   * 全屏模式：进入时按 fitZoomCap 充满容器（文字/连线随大画布等比放大），
   * 同样支持滚轮缩放与拖动平移；缩放下限为进入全屏时的全貌尺寸（=fit）。
   */
  fullscreen?: boolean
}

// 节点布局签名：仅在节点集合/位置变化时重新 fitView（实时数据每 2s 刷新但位置不变，无需反复重算）
const layoutSig = (doc: TopologyDoc) => doc.nodes.map((n) => `${n.id}:${n.position?.x},${n.position?.y}`).join("|")

/**
 * 拓扑只读视图：渲染布局 JSON，背景透明贴合项目卡片风格。
 * 初始/新布局自适应容器，随后支持用户滚轮缩放与拖动画布平移；
 * 仅保留点击命中节点 → onNavigate。实时数据更新由上层每次传入新 doc 驱动。
 */
export function TopologyView({ doc, resolveNav, onNavigate, fitZoomCap, fullscreen = false }: TopologyViewProps) {
  const { language } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<TopoEngine | null>(null)
  const resolveNavRef = useRef(resolveNav)
  resolveNavRef.current = resolveNav
  const onNavigateRef = useRef(onNavigate)
  onNavigateRef.current = onNavigate
  // 适应上限（全屏时增大）；用 ref 让挂载期创建的闭包也能读到最新值
  const fitCapRef = useRef(fitZoomCap ?? FIT_ZOOM_CAP)
  fitCapRef.current = fitZoomCap ?? FIT_ZOOM_CAP
  const fullscreenRef = useRef(fullscreen)
  fullscreenRef.current = fullscreen

  const lastSigRef = useRef<string | null>(null)
  // 已加载图标的 type 集合签名：仅当画布用到的 type 变化时才重新拉图标（实时数据刷新不触发）
  const lastTypesSigRef = useRef<string | null>(null)
  const hasUserViewRef = useRef(false)
  const dragStateRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
  // 「全貌」基线 zoom（fitView 得到，userScale=1 对应此值）与当前用户放大倍数
  const fitZoomRef = useRef(1)
  const userScaleRef = useRef(1)
  // 当前布局的原始边类型表（未放大）；放大时据此按 userScale 缩放线宽
  const edgeTypesRef = useRef<Record<string, { w?: number }> | null>(null)

  // 文字随「容器最短边(CSS px)」放大（普通与全屏统一）：minSide=TEXT_REF_MIN 时为 1，
  // 超过则按 TEXT_GAIN 增益放大（文字为主、放大更明显），小于则不缩（floor，避免过小/重叠）。
  const textScale = () => {
    const container = containerRef.current
    if (!container) return 1
    const minSide = Math.min(container.clientWidth, container.clientHeight)
    if (!minSide) return 1
    return clamp(1 + (minSide / TEXT_REF_MIN - 1) * TEXT_GAIN, TEXT_SCALE_MIN, TEXT_SCALE_MAX)
  }

  // 标签/字段放大到 userScale × 文字适配；连线只随文字「适度」变粗（EDGE_DAMP）；
  // 图标(nodeScale)只随 userScale（容器适配已在引擎 nsz 内，避免二次放大）。
  const applyScale = (scale: number) => {
    const engine = engineRef.current
    if (!engine) return
    userScaleRef.current = scale
    const ts = textScale()
    const es = 1 + (ts - 1) * EDGE_DAMP // 连线适度放大（不与文字同幅）
    engine.setOptions({
      nodeScale: BASE_NODE_SCALE * scale,
      labelScale: BASE_LABEL_SCALE * scale * ts,
      fieldScale: BASE_FIELD_SCALE * scale * ts,
    })
    const base = edgeTypesRef.current
    if (base) {
      const scaled: Record<string, unknown> = {}
      for (const k of Object.keys(base)) {
        const t = base[k]
        scaled[k] = { ...t, w: (typeof t.w === "number" ? t.w : 2.5) * scale * es }
      }
      engine.setEdgeTypes(scaled)
    }
  }

  // 适应容器，记录全貌基线 zoom，并把放大倍数复位为 1（基准尺寸）
  const fitToView = () => {
    const engine = engineRef.current
    if (!engine) return
    applyScale(1) // 复位用户缩放为 1（文字/线宽仍按容器适配）
    engine.fitView(fitCapRef.current)
    fitZoomRef.current = engine.getView().zoom || 1
    userScaleRef.current = 1
  }

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
    // 可点击节点用 pointer，否则抓手（全屏同样支持缩放与拖动平移）
    const idle = "grab"
    canvas.style.cursor = navOf(hitAt(clientX, clientY)) ? "pointer" : idle
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
      nodeScale: BASE_NODE_SCALE,
      labelScale: BASE_LABEL_SCALE,
      fieldScale: BASE_FIELD_SCALE,
    })
    engineRef.current = engine

    // 图标按画布实际用到的 type 懒加载（见下方 doc effect）；此处仅创建并启动引擎
    engine.start()

    // 容器尺寸变化：重算全貌基线；未手动缩放时回到全貌，否则保持当前放大倍数并以画布中心为锚。
    const sync = () => {
      sizeCanvasBitmap(canvas, container)
      if (hasUserViewRef.current) {
        const scale = userScaleRef.current
        applyScale(1)
        engine.fitView(fitCapRef.current)
        const newFit = engine.getView().zoom || 1
        fitZoomRef.current = newFit
        const fitV = engine.getView() // 居中的全貌视图
        const cx = canvas.width / 2
        const cy = canvas.height / 2
        const worldCx = (cx - fitV.panX) / newFit
        const worldCy = (cy - fitV.panY) / newFit
        const z = newFit * scale
        engine.setView({ zoom: z, panX: cx - worldCx * z, panY: cy - worldCy * z })
        applyScale(scale)
      } else {
        fitToView()
      }
      engine.redraw()
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(container)

    return () => {
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

  // 适应上限变化（进入/退出全屏）：丢弃用户视图并以新上限重新适应，使拓扑充满新画布
  useEffect(() => {
    const engine = engineRef.current
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!engine || !canvas || !container) return
    hasUserViewRef.current = false
    sizeCanvasBitmap(canvas, container)
    fitToView()
    engine.redraw()
    // fitToView/sizeCanvasBitmap 仅依赖 ref，随 fitZoomCap 变化触发即可
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitZoomCap])

  // 布局 / 实时数据更新：每次喂数据；仅当节点布局变化时才重新 fitView
  useEffect(() => {
    const engine = engineRef.current
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!engine || !canvas || !container || !doc) return

    const { nodes, edges, edgeTypes } = docToInternal(doc, { compact: TOPOLOGY_COMPACT_SCALE })
    edgeTypesRef.current = edgeTypes as Record<string, { w?: number }>
    engine.setEdgeTypes(edgeTypes)
    engine.setData(nodes, edges)

    // 图标：仅当画布用到的 type 集合变化时拉取（实时数据每 2s 刷新但 type 不变，不重复请求）
    const typesSig = Array.from(new Set(doc.nodes.map((n) => n.type)))
      .sort()
      .join(",")
    if (typesSig !== lastTypesSigRef.current) {
      lastTypesSigRef.current = typesSig
      const types = typesSig ? typesSig.split(",") : []
      // 应用到「解析时的当前引擎」而非捕获的 engine：StrictMode 双挂载会重建引擎，
      // 捕获的旧引擎已销毁，结果会被丢弃导致图标永不显示。
      void loadTopoIcons(types).then((imgs) => {
        const eng = engineRef.current
        if (!eng) return
        eng.setIcons(imgs)
        eng.redraw()
      })
    }

    const sig = layoutSig(doc)
    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig
      hasUserViewRef.current = false
      sizeCanvasBitmap(canvas, container)
      fitToView() // 新布局 → 适应一次（并复位放大倍数）
    } else {
      // 实时数据更新（布局不变）：保持当前缩放对应的尺寸与线宽
      applyScale(userScaleRef.current)
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
          const fit = fitZoomRef.current || 1
          // 以「全貌(fit)」为基准的放大倍数：下限 1（不能缩到比全貌更小），上限 MAX_USER_SCALE
          const curScale = view.zoom / fit
          const nextScale = clamp(curScale * Math.exp(-ev.deltaY * 0.0012), 1, MAX_USER_SCALE)
          if (Math.abs(nextScale - curScale) < 1e-4) return

          // 缩回全貌：恢复居中 fit（连线/文字回到基准尺寸）
          if (nextScale <= 1) {
            hasUserViewRef.current = false
            fitToView()
            engine.redraw()
            return
          }

          const nextZoom = fit * nextScale
          const worldX = (sx - view.panX) / view.zoom
          const worldY = (sy - view.panY) / view.zoom
          hasUserViewRef.current = true
          engine.setView({
            zoom: nextZoom,
            panX: sx - worldX * nextZoom,
            panY: sy - worldY * nextZoom,
          })
          applyScale(nextScale) // 连线/文字/图标随 zoom 同步放大
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
