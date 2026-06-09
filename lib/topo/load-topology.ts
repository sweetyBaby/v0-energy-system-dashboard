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
      ox: f.offset?.x ?? 0,
      oy: f.offset?.y ?? 0,
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
export function docToInternal(doc: TopologyDoc): InternalTopology {
  const nodes = (doc.nodes ?? []).filter((n) => n.visible !== false).map(toInternalNode)
  const edges = (doc.edges ?? []).filter((e) => e.active !== false).map(toInternalEdge)
  return {
    nodes,
    edges,
    edgeTypes: edgeStylesToET(doc.edgeStyles),
    bgColor: doc.meta?.canvas?.bgColor || "#0a1f40",
  }
}

// ───── 图标加载：/topo-icons.json（type → base64 dataURL，抽取自运营端元素库）─────
let iconsPromise: Promise<Record<string, HTMLImageElement>> | null = null

export function loadTopoIcons(): Promise<Record<string, HTMLImageElement>> {
  if (iconsPromise) return iconsPromise
  iconsPromise = fetch("/topo-icons.json")
    .then((r) => r.json() as Promise<Record<string, string>>)
    .then(
      (map) =>
        new Promise<Record<string, HTMLImageElement>>((resolve) => {
          const imgs: Record<string, HTMLImageElement> = {}
          const entries = Object.entries(map)
          if (entries.length === 0) return resolve(imgs)
          let remaining = entries.length
          const done = () => {
            remaining -= 1
            if (remaining === 0) resolve(imgs)
          }
          entries.forEach(([type, src]) => {
            const img = new Image()
            img.onload = () => {
              imgs[type] = img
              done()
            }
            img.onerror = done
            img.src = src
          })
        }),
    )
    .catch(() => ({}))
  return iconsPromise
}
