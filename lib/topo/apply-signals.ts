/**
 * 实时信号 → 布局 的合并层：把扁平信号快照（运营端契约 {信号名:值}）应用到画布 JSON，
 * 产出一份新的 TopologyDoc 供渲染。纯函数、不改入参。
 *
 * 与运营端 topo.html 运行态（applyLiveSignals + 每帧规则求值）语义一致：
 *   ① 同一份信号既驱动规则（rule-engine.resolveDynamic → 显隐/流向），又回写字段卡片/状态显示；
 *   ② `节点id.字段名` → 覆盖字段值（null/空串 = 无值，显示为空）；
 *      `节点id.status` → 覆盖状态；`节点id.online` → 仅参与规则、无字段显示；
 *      其余键为全局信号，仅参与规则；
 *   ③ 节点显隐只由 visibleWhen 决定、连线显隐由端点显隐 + showWhen 决定、
 *      流向由 dirRules 顺序匹配（连线固定 dir 兜底）——前端不再做任何私有推导。
 *
 * 「长什么样」（走线几何/母线汇流）交给渲染引擎按当前可见节点与连线每帧重算，
 * 容器尺寸变化由 TopologyView fitView 自适应，与运营端仅画布大小不同、逻辑一致。
 */

import { resolveDynamic } from "./rule-engine"
import type { TopoEdge, TopologyDoc, TopoNode, TopoSignals } from "./topo-types"

// 信号名解析（与 topo.html parseSignal 一致）：最后一个 "." 前缀若是节点 id → 节点信号，否则全局
function parseSignal(name: string, nodeIds: Set<string>): { node: string; field: string } {
  const i = name.lastIndexOf(".")
  if (i > 0) {
    const nd = name.slice(0, i)
    const fd = name.slice(i + 1)
    if (nodeIds.has(nd)) return { node: nd, field: fd }
  }
  return { node: "@global", field: name }
}

export function applySignals(doc: TopologyDoc, signals: TopoSignals | null | undefined): TopologyDoc {
  if (!signals) return doc
  const nodeIds = new Set(doc.nodes.map((n) => n.id))

  // 1) 信号按节点分桶（字段值 / 状态）
  const fieldsByNode = new Map<string, Record<string, TopoSignals[string]>>()
  const statusByNode = new Map<string, string>()
  for (const key of Object.keys(signals)) {
    const ps = parseSignal(key, nodeIds)
    if (ps.node === "@global") continue // 全局信号只参与规则求值
    if (ps.field === "status") statusByNode.set(ps.node, String(signals[key] ?? ""))
    else if (ps.field === "online") continue // 仅参与规则，无字段显示
    else {
      let m = fieldsByNode.get(ps.node)
      if (!m) fieldsByNode.set(ps.node, (m = {}))
      m[ps.field] = signals[key]
    }
  }

  // 2) 规则求值（显隐 / 流向），与运营端 runtime.js 同一引擎
  const dyn = resolveDynamic(doc, signals)

  // 3) 合并出新文档
  const nodes: TopoNode[] = doc.nodes.map((n) => {
    const fields = fieldsByNode.get(n.id)
    const status = statusByNode.get(n.id)
    const visible = dyn.nodeVisible[n.id]
    if (!fields && status == null && visible !== false) return n
    return {
      ...n,
      data: fields
        ? n.data.map((f) =>
            Object.prototype.hasOwnProperty.call(fields, f.key.zh)
              ? { ...f, value: fields[f.key.zh] ?? "" } // null/未定义 → 无值（显示为空）
              : f,
          )
        : n.data,
      status: status != null ? { zh: status, en: status } : n.status,
      visible,
    }
  })

  const edges: TopoEdge[] = doc.edges.map((e, i) => {
    const { visible, dir } = dyn.edges[i]
    return dir === (e.dir || "forward") && visible === (e.active !== false) ? e : { ...e, dir, active: visible }
  })

  return { ...doc, nodes, edges }
}
