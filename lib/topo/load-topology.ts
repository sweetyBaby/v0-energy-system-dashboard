/**
 * 布局 JSON（运营端导出格式）→ 渲染引擎内部运行态格式 的适配层。
 *
 * 引擎（engine.ts）逐字抽取自 topo.html，消费的是 topo.html 的「内部节点/连线」字段
 * （n.x/n.y、n.labelZh、f.dv/f.ox 等），而非导出 JSON 的嵌套结构（position/label/data.value）。
 * 这里做一次性转换，保证引擎拿到与运营端运行时一致的数据。
 */

import type { TopoEdgeStyle, TopologyDoc, TopoNode, TopoEdge } from "./topo-types"

// 引擎内部用的松散结构（与 topo.html 运行时一致）
export type InternalNode = Record<string, unknown> & {
  id: string
  type: string
  x: number
  y: number
  nav?: TopoNode["nav"]
}
export type InternalEdge = Record<string, unknown> & {
  from: string
  to: string
  et: string
}

export type InternalTopology = {
  nodes: InternalNode[]
  edges: InternalEdge[]
  edgeTypes: Record<string, unknown>
  bgColor: string
}

export type TopologyInternalOptions = {
  compact?: {
    x?: number
    y?: number
  }
}

// 导出 route（smart/arc/manual/line）→ 内部 route 值
const toInternalRoute = (r: string) => (r === "arc" || r === "manual" || r === "line" ? r : "smart")

function toInternalNode(n: TopoNode): InternalNode {
  const node: InternalNode = {
    id: n.id,
    type: n.type,
    labelZh: n.label?.zh ?? "",
    labelEn: n.label?.en ?? "",
    label: n.label?.zh ?? "",
    x: n.position?.x ?? 0,
    y: n.position?.y ?? 0,
    // 世界尺寸：统一缩放渲染按此画图标（随 fitView 等比），重现运营端比例
    sizeWorld: n.sizeWorld ?? 0,
    scale: n.scale ?? 1,
    rotation: n.rotation ?? 0,
    fontSize: n.fontSize ?? 14,
    fontColor: n.fontColor ?? "#e8f4ff",
    status: n.status?.zh ?? "",
    statusEn: n.status?.en ?? "",
    hideLabel: n.display ? !n.display.showLabel : false,
    hideFields: n.display ? !n.display.showFields : false,
    nav: n.nav,
    data: (n.data ?? []).map((f) => ({
      key: f.key?.zh ?? "",
      keyEn: f.key?.en ?? f.key?.zh ?? "",
      // 运行时 dv 为空字符串时引擎显示 "--"；导出的 "--" 占位归一为空
      dv: f.value === "--" || f.value == null ? "" : f.value,
      // 接回运营端字段偏移（offset 是世界坐标），以 wox/woy 传给引擎按「世界坐标」应用——随缩放等比，
      // 重现运营端精心摆位（如 PCS 字段左下避开断路器）。与早先「ox/oy 屏幕像素」不同：屏幕像素偏移在
      // 小 fit 下会变成巨大位移、把卡片拖到图标上；世界坐标偏移随 fit 缩小、不会遮挡。
      ox: 0,
      oy: 0,
      wox: f.offset?.x ?? 0,
      woy: f.offset?.y ?? 0,
      hidden: !!f.hidden,
    })),
  }
  // 文本框 / 占位点的样式平铺到节点上（drawTextNode / anchor 分支直接读 n.bg、n.fill 等）
  if (n.type === "text" && n.textStyle) Object.assign(node, n.textStyle)
  if (n.type === "anchor" && n.anchorStyle) {
    node.fill = n.anchorStyle.fill
    node.opacity = n.anchorStyle.opacity
  }
  return node
}

function toInternalEdge(e: TopoEdge): InternalEdge {
  return {
    from: e.from,
    to: e.to,
    et: e.edgeType,
    route: toInternalRoute(e.route),
    dir: e.dir || "forward",
    w: e.width ?? 1,
    lbl: e.label || "",
    hideLabel: e.showLabel === false,
    orthoSnap: e.orthoSnap !== false,
    waypoints: (e.waypoints ?? []).map((p) => [p.x, p.y]),
  }
}

function compactLayout(nodes: InternalNode[], edges: InternalEdge[], compact: TopologyInternalOptions["compact"]) {
  // 允许 >1（扩张）：小世界拓扑需放大节点间距，使其归一化后与大世界拓扑在容器内呈现一致比例
  const scaleX = Math.max(0.1, Math.min(4, compact?.x ?? 1))
  const scaleY = Math.max(0.1, Math.min(4, compact?.y ?? 1))
  if ((scaleX === 1 && scaleY === 1) || nodes.length === 0) {
    return { nodes, edges }
  }

  const xs = nodes.map((node) => Number(node.x) || 0)
  const ys = nodes.map((node) => Number(node.y) || 0)
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2
  const transformPoint = (x: number, y: number) => ({
    x: centerX + (x - centerX) * scaleX,
    y: centerY + (y - centerY) * scaleY,
  })

  return {
    nodes: nodes.map((node) => {
      const next = transformPoint(Number(node.x) || 0, Number(node.y) || 0)
      return { ...node, x: next.x, y: next.y }
    }),
    edges: edges.map((edge) => ({
      ...edge,
      waypoints: Array.isArray(edge.waypoints)
        ? edge.waypoints.map((point) => {
            const next = transformPoint(point[0], point[1])
            return [next.x, next.y]
          })
        : edge.waypoints,
    })),
  }
}

// 导出 edgeStyles（labelZh/width/speed）→ 引擎 ET 表（label/w/spd）
function edgeStylesToET(styles?: Record<string, TopoEdgeStyle>): Record<string, unknown> {
  const et: Record<string, unknown> = {}
  if (!styles) return et
  for (const [k, s] of Object.entries(styles)) {
    et[k] = { label: s.labelZh, labelEn: s.labelEn, color: s.color, w: s.width, dash: s.dash ?? [], anim: s.anim, spd: s.speed, desc: "" }
  }
  return et
}

/**
 * 把布局 JSON 转换为引擎可直接消费的内部结构。
 * 过滤掉 visible===false 的节点与 active===false 的连线（动态显隐 / 断路）。
 */
export function docToInternal(doc: TopologyDoc, options: TopologyInternalOptions = {}): InternalTopology {
  const rawNodes = (doc.nodes ?? []).filter((n) => n.visible !== false).map(toInternalNode)
  const rawEdges = (doc.edges ?? []).filter((e) => e.active !== false).map(toInternalEdge)
  const { nodes, edges } = compactLayout(rawNodes, rawEdges, options.compact)
  return {
    nodes,
    edges,
    edgeTypes: edgeStylesToET(doc.edgeStyles),
    bgColor: doc.meta?.canvas?.bgColor || "#0a1f40",
  }
}

// ───── 图标加载：public/topo/icons/*（按 type 走文件路径，清单见 icon-manifest.json）─────
// 资源由 scripts/build-topo-icons.mjs 从运营端「元素库包」生成（见 docs/topology-engine-and-rules.md）。
// 优于内联 dataURL：可审查 diff、按图标缓存、无 base64 膨胀、可只加载画布用到的 type。

type IconManifest = { version?: string; paths: Record<string, string> }

const ICON_BASE = "/topo/icons/"
const ICON_MANIFEST_URL = "/topo/icon-manifest.json"

let manifestPromise: Promise<IconManifest> | null = null
// 逐图标缓存（跨多张画布共享）：同一 type 至多加载一次
const imgCache = new Map<string, Promise<HTMLImageElement | null>>()

function loadManifest(): Promise<IconManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(ICON_MANIFEST_URL)
      .then((r) => (r.ok ? (r.json() as Promise<IconManifest>) : { paths: {} }))
      .catch(() => ({ paths: {} }))
  }
  return manifestPromise
}

function loadOneIcon(type: string, file: string, version?: string): Promise<HTMLImageElement | null> {
  let p = imgCache.get(type)
  if (!p) {
    p = new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null) // 缺图标 → 引擎按 type 画兜底方块，不阻塞
      img.src = ICON_BASE + file + (version ? `?v=${encodeURIComponent(version)}` : "")
    })
    imgCache.set(type, p)
  }
  return p
}

/**
 * 加载图标为 { type → HTMLImageElement }，交给 engine.setIcons。
 * 传 types 时只加载这些 type（画布实际用到的）；不传则加载清单内全部。
 */
export async function loadTopoIcons(types?: string[]): Promise<Record<string, HTMLImageElement>> {
  const manifest = await loadManifest()
  const wanted = (types && types.length ? types : Object.keys(manifest.paths)).filter((t) => manifest.paths[t])
  const entries = await Promise.all(
    wanted.map((t) => loadOneIcon(t, manifest.paths[t], manifest.version).then((img) => [t, img] as const)),
  )
  const out: Record<string, HTMLImageElement> = {}
  for (const [t, img] of entries) if (img) out[t] = img
  return out
}
