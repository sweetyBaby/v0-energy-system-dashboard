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
const FIT_ZOOM_CAP = 1.8
// 放大上限：相对「全貌(fit)」的最大倍数。下限恒为 1（=fit），即缩到底也始终展示完整拓扑。
const MAX_USER_SCALE = 4
// 按「每张拓扑」归一化布局尺度：compact = TOPOLOGY_TARGET_SPAN / 该拓扑世界包围盒最长边
// （朝质心缩放，允许 >1 扩张小世界）。这样不同世界尺寸的拓扑归一化后包围盒一致 → fitView 后
// 各拓扑「适配缩放、文字/图标大小、连线占比」都一致，且都铺满容器（小世界不再留白、大世界不溢出）。
// 这是对动态 JSON 通用的关键：尺寸/位置按容器归一（次要因素），而连线/线型/走向/规则等关键因素
// 全部来自 JSON 与引擎、保持与运营端一致。
const TOPOLOGY_TARGET_SPAN = 500
// ── 统一缩放(uniform zoom)：图标(sizeWorld)/标签(fontSize)/字段(偏移+字号) 全部世界坐标，
// 由 engine.fitView 等比缩放铺满容器 → 完整、最大、永不堆叠（忠实重现运营端、对任意 JSON 通用）。
// nodeScale=1 即图标=sizeWorld，标签/字段基准=1 即世界字号；用户滚轮缩放(userScale)整体放大。
// 「文字可读下限」(方案2)：统一缩放下若屏幕字号过小，按下限放大标签/字段字号（极端下可能轻微重叠）。
const ENGINE_BASE_FONT = 14 // 与 engine labelFontPx 基准一致：world 字号 = ENGINE_BASE_FONT × labelScale
// 用户诉求：文字看清楚（优先）、图标别太大。故图标按 ICON_SCALE 缩小（运营端 sizeWorld 偏大），
// 文字用较高的可读下限放大；二者叠加 → 图标适中、文字清晰。
// 图标整体归一化目标（世界坐标 nsz 目标值）。引擎 nsz=sizeWorld×nodeScale，本项目按「每张拓扑
// 的 sizeWorld 中位数」算 nodeScale=ICON_TARGET_WORLD/median，使各拓扑图标整体大小适中且一致，
// 同时保留同一拓扑内节点的相对大小（走线/几何沿用运营端）。配合 fit cap≈1.8 → 屏幕约 ICON_TARGET_WORLD×1.8。
const ICON_TARGET_WORLD = 84
// 节点名称(标签)与数据字段统一字号：与页面正文(≈12–14px)协调、不过大；引擎 fieldFontPx 已去掉 0.92，
// 故二者自然字号相等，下限也用同一值 → 标签与字段屏幕字号一致（用户诉求：同样的字号）。
const TEXT_FLOOR_PX = 15 // 标签/字段统一的最小屏幕字号 CSS px
const TEXT_FLOOR_CAP = 5 // 可读下限放大封顶
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

// 布局签名：仅涵盖会改变「归一化(span/median)与 fitView 包围盒」的输入——
// 节点 位置/sizeWorld/可见性 + 「手动布线(route==='manual')且有拐点」的连线(其拐点/显隐影响包围盒)。
// 普通连线的 active 显隐（如发电机联络线 showWhen）不进签名 → 实时切换时不会重置用户的平移/缩放。
const layoutSig = (doc: TopologyDoc) =>
  doc.nodes.map((n) => `${n.id}:${n.position?.x},${n.position?.y}:${n.sizeWorld ?? 0}:${n.visible === false ? 0 : 1}`).join("|") +
  "##" +
  doc.edges
    .filter((e) => e.route === "manual" && (e.waypoints?.length ?? 0) > 0)
    .map((e) => `${e.from}-${e.to}:${e.active === false ? 0 : 1}:${(e.waypoints ?? []).map((p) => `${p.x},${p.y}`).join(";")}`)
    .join("|")

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

  // 文字「可读下限」放大倍率（方案2）：统一缩放下若屏幕字号过小，按下限放大标签/字段世界字号。
  // 由 fitToView 据 fitZoom 算出；默认 1（纯统一缩放，字号即世界 fontSize）。
  const labelFloorRef = useRef(1)
  const fieldFloorRef = useRef(1)
  // 图标归一化系数 = ICON_TARGET_WORLD / 本拓扑 sizeWorld 中位数（doc effect 计算）。
  const iconNormRef = useRef(0.5)
  // 本拓扑布局压缩系数 = TOPOLOGY_TARGET_SPAN / 世界包围盒最长边（doc effect 按布局算，缓存复用）。
  const compactRef = useRef(0.5)

  // 统一缩放：图标=sizeWorld(nodeScale=1)，标签/字段=世界 fontSize×可读下限，全部随 fitView 等比；
  // 用户滚轮缩放(scale)整体放大。连线为屏幕恒定原生宽度（仅随用户缩放略变，不参与堆叠问题）。
  const applyScale = (scale: number) => {
    const engine = engineRef.current
    if (!engine) return
    userScaleRef.current = scale
    engine.setOptions({
      nodeScale: iconNormRef.current * scale,
      labelScale: labelFloorRef.current * scale,
      fieldScale: fieldFloorRef.current * scale,
    })
    const base = edgeTypesRef.current
    if (base) {
      const scaled: Record<string, unknown> = {}
      for (const k of Object.keys(base)) {
        const t = base[k]
        scaled[k] = { ...t, w: (typeof t.w === "number" ? t.w : 2.5) * scale }
      }
      engine.setEdgeTypes(scaled)
    }
  }

  // 适应容器：按「纯统一缩放」fit（保证整图完整、不溢出、不堆叠），再把文字「可读下限」作为
  // 纯显示放大叠加（不重新 fit，避免 文字↔fit 反馈不稳定/裁切）。极端小尺寸下放大的文字可能轻微
  // 越界/相邻（方案2 取舍）；下限放大封顶 2 倍以控制该影响。
  const fitToView = () => {
    const engine = engineRef.current
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!engine) return
    // 1) 纯统一缩放 fit（图标=sizeWorld、字号=世界 fontSize，等比铺满）
    labelFloorRef.current = 1
    fieldFloorRef.current = 1
    applyScale(1)
    engine.fitView(fitCapRef.current)
    const z = engine.getView().zoom || 1
    // 引擎按「位图像素」绘制(canvas.width = CSS×DPR)，z 也是位图口径。可读下限要的是 CSS 像素，
    // 故乘以有效 DPR(canvas.width/clientWidth)，否则高 DPR 笔记本上下限文字会被缩成 下限/DPR、偏小。
    const effDpr = canvas && container && container.clientWidth ? canvas.width / container.clientWidth : 1
    // 2) 可读下限：屏幕字号(CSS) = world字号×z/DPR，低于下限则放大世界字号（文字优先）。下限只按这一次的
    //    z 计算（不随二次 fit 反复重算 → 不会反馈发散），再二次 fit 让放大的文字也完整纳入、不裁切。
    // 标签与字段同一下限公式（fieldFontPx 已无 0.92）→ 二者屏幕字号一致
    const floor = clamp((TEXT_FLOOR_PX * effDpr) / (ENGINE_BASE_FONT * z), 1, TEXT_FLOOR_CAP)
    labelFloorRef.current = floor
    fieldFloorRef.current = floor
    applyScale(1)
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
      // 统一缩放初值：图标=sizeWorld、字号=世界 fontSize（fitToView 会据 fitZoom 再定可读下限）
      nodeScale: 1,
      labelScale: 1,
      fieldScale: 1,
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

    // 布局变化时（非实时数据刷新）重算「每张拓扑」的归一化系数：图标整体大小 + 布局压缩。
    const sig = layoutSig(doc)
    const layoutChanged = sig !== lastSigRef.current
    if (layoutChanged) {
      // 仅用「实际会渲染的可见节点」（与 docToInternal 一致：过滤 visible===false），避免被规则隐藏的
      // 离群节点（visibleWhen/showWhen）撑大跨度/带偏中位数，导致可见拓扑被缩小、留白。
      const visible = doc.nodes.filter((n) => n.visible !== false)
      // 图标整体大小：按 sizeWorld 中位数归一（保留同图相对尺寸，跨图一致适中）
      const sizes = visible
        .filter((n) => n.type !== "text" && n.type !== "anchor" && (n.sizeWorld ?? 0) > 0)
        .map((n) => n.sizeWorld as number)
        .sort((a, b) => a - b)
      const median = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0
      iconNormRef.current = median > 0 ? ICON_TARGET_WORLD / median : 0.5
      // 布局压缩：按世界包围盒最长边归一到 TOPOLOGY_TARGET_SPAN（允许 >1 扩张小世界）。
      // 包围盒含「可见节点」+「手动布线(route==='manual')且未被规则隐藏(active!==false)的连线拐点」——
      // 与引擎 fitView 同一集合，避免归一化与适配口径不一致（手动拐点被放大后又被缩出视野）。
      const pts = visible.length ? visible : doc.nodes
      const xs = pts.map((n) => n.position?.x ?? 0)
      const ys = pts.map((n) => n.position?.y ?? 0)
      const visIds = new Set(pts.map((n) => n.id))
      for (const e of doc.edges) {
        // 仅计入会渲染的手动布线拐点：route==='manual'、未被隐藏、且两端节点都可见（与引擎 fit 同口径）
        if (e.route !== "manual" || e.active === false || !visIds.has(e.from) || !visIds.has(e.to)) continue
        for (const p of e.waypoints ?? []) {
          xs.push(p.x)
          ys.push(p.y)
        }
      }
      const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1
      compactRef.current = clamp(TOPOLOGY_TARGET_SPAN / span, 0.15, 4)
    }

    const c = compactRef.current
    const { nodes, edges, edgeTypes } = docToInternal(doc, { compact: { x: c, y: c } })
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

    if (layoutChanged) {
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
