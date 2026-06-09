/**
 * 前端实时规则引擎：把实时快照（TopoRealtime）合并进布局（TopologyDoc），
 * 产出一份新的 TopologyDoc 供渲染。纯函数、不改入参。
 *
 * 设计原则：规则只决定「有什么」——连线通断(active)、流向(dir)、节点显隐(visible)、字段值；
 * 「长什么样」——走线几何——完全交给逐字抽取的引擎按当前激活的边自动重算，保证与运营端一致。
 *
 * 连线判定（优先级）：
 *   1) 实时显式 active/dir → 直接采用；
 *   2) 线路有功 p（推荐后端给）→ |p|>ε 流动、dir 取 p 符号；
 *   3) 回退：源节点功率字段符号。
 * 边的分类来自布局：
 *   · 结构边（布局 active:true）：常显；无流动时按 idleEdgeType 变灰或隐藏；
 *   · 按需边（布局 active:false）：仅在流动时出现（动态新增连线 / 联络线闭合）。
 *   · 任一端节点状态命中 openStatuses（断路/故障）→ 强制断开。
 */

import type {
  EdgeDir,
  TopoBindingRules,
  TopoEdge,
  TopoNode,
  TopoRealtime,
  TopologyDoc,
} from "./topo-types"

export const DEFAULT_BINDING_RULES: TopoBindingRules = {
  flowEpsilon: 0.5,
  powerFieldByType: {
    pcs: "P(kW)",
    grid: "P(kW)",
    solar: "P(kW)",
    generator: "P(kW)",
    meter: "P(kW)",
    meter2: "P(kW)",
    tie_line: "P(kW)",
    load: "负载功率(kW)",
  },
  idleEdgeType: "disabled",
  openStatuses: ["断开", "故障", "离线", "停机", "断路"],
}

const toNumber = (v: number | string | undefined | null): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v === "string" && v.trim() !== "" && v.trim() !== "--") {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

// 回退：取源节点用于推导流向的"功率/流量"值
function sourcePower(node: TopoNode | undefined, rules: TopoBindingRules): number | null {
  if (!node) return null
  const key = rules.powerFieldByType[node.type]
  if (key) {
    const f = node.data.find((d) => d.key.zh === key)
    if (f) return toNumber(f.value)
  }
  const guess = node.data.find((d) => /P\(kW\)|功率/.test(d.key.zh))
  return guess ? toNumber(guess.value) : null
}

export function applyRealtime(
  doc: TopologyDoc,
  rt: TopoRealtime | null | undefined,
  rules: TopoBindingRules = DEFAULT_BINDING_RULES,
): TopologyDoc {
  if (!rt) return doc
  const nodeRt = rt.nodes || {}

  // 1) 节点：覆盖字段值 / 状态 / 在线（仅显式离线时隐藏，避免误删结构节点）
  const nodes: TopoNode[] = doc.nodes.map((n) => {
    const r = nodeRt[n.id]
    if (!r) return n
    const fields = r.fields
    const data = fields
      ? n.data.map((f) => (Object.prototype.hasOwnProperty.call(fields, f.key.zh) ? { ...f, value: fields[f.key.zh] } : f))
      : n.data
    return {
      ...n,
      data,
      status: r.status ? { zh: r.status, en: n.status?.en ?? r.status } : n.status,
      visible: r.online === false ? false : n.visible,
    }
  })

  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const isOpen = (id: string) => {
    const n = nodeById.get(id)
    return n ? rules.openStatuses.includes(n.status?.zh ?? "") : false
  }
  const edgeRt = rt.edges || {}
  const eps = rules.flowEpsilon

  // 2) 连线
  const edges: TopoEdge[] = doc.edges.map((e) => {
    const ex = edgeRt[`${e.from}>${e.to}:${e.edgeType}`] || edgeRt[`${e.from}>${e.to}`]
    const conditional = e.active === false // 布局预置 false = 按需出现
    const open = isOpen(e.from) || isOpen(e.to)

    // 驱动流量：优先线路 p，其次源节点功率
    const f = ex?.p != null ? ex.p : sourcePower(nodeById.get(e.from), rules)
    const flowing = f != null && Math.abs(f) > eps

    // 流向
    let dir: EdgeDir = e.dir
    if (ex?.dir) dir = ex.dir
    else if (flowing) dir = (f as number) >= 0 ? "forward" : "reverse"

    // 通断
    let active: boolean
    let edgeType = e.edgeType
    if (ex?.active != null) {
      active = ex.active
    } else if (open) {
      active = false
    } else if (conditional) {
      active = flowing // 按需边：有流动才出现
    } else {
      active = true // 结构边：常显
      if (!flowing) {
        if (rules.idleEdgeType) edgeType = rules.idleEdgeType // 变灰静止
        else active = false // 或隐藏
      }
    }

    return dir === e.dir && active === e.active && edgeType === e.edgeType
      ? e
      : { ...e, dir, active, edgeType }
  })

  return { ...doc, nodes, edges }
}
