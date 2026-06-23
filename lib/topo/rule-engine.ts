/**
 * 数据驱动规则引擎 —— 逐字移植自运营端 topo.html 元素库包的 runtime.js
 * （topo/topo.html 内嵌的 RUNTIME_JS，与编辑器「预览效果」同一套求值逻辑）。
 *
 * ⚠️ 为保证与运营端行为完全一致，求值逻辑保持与源码字符级等价，只加 TS 类型；
 *    运营端升级 runtime.js 时，请对照源码同步本文件。
 *
 * 用法：
 *   const state = resolveDynamic(topology, signals)
 *   state.nodeVisible[id]=false → 不渲染该元素；
 *   state.edges[i]: {visible, dir} 与 doc.edges 同序 —— visible=false → 不渲染
 *   （含"条件不满足时无连线"与"端点被隐藏"）；dir=动态流向（dirRules 顺序匹配，e.dir 兜底）。
 *   （源码版返回带 visible/dir 的节点/连线拷贝，这里改为返回判定结果、由 apply-signals.ts 合并，求值语义不变。）
 * signals：扁平对象，如 { "bms_1.SOC(%)": 20, "grid_1.online": true, "mode": "island" }
 *   未提供的信号回退到画布静态值（节点字段 value / 状态 / 在线=true / topology.signals 样例 / sampleSignals）。
 */

import type { EdgeDir, TopoCond, TopologyDoc, TopoSignals } from "./topo-types"

export type SignalValue = TopoSignals[string]
type Ctx = Record<string, SignalValue>

function _num(x: unknown): number {
  if (typeof x === "number") return x
  if (typeof x === "boolean") return x ? 1 : 0
  const f = parseFloat(x as string)
  return isNaN(f) ? NaN : f
}
function _looseEq(a: unknown, b: unknown): boolean {
  if (a === b) return true
  const na = _num(a)
  const nb = _num(b)
  if (!isNaN(na) && !isNaN(nb)) return na === nb
  return String(a) === String(b)
}
function _toList(rv: unknown): string[] {
  if (Array.isArray(rv)) return rv
  return String(rv == null ? "" : rv)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "")
}
function cmpOp(lv: SignalValue, op: string, rv: unknown): boolean {
  switch (op) {
    case "==":
      return _looseEq(lv, rv)
    case "!=":
      return !_looseEq(lv, rv)
    case ">":
      return _num(lv) > _num(rv)
    case ">=":
      return _num(lv) >= _num(rv)
    case "<":
      return _num(lv) < _num(rv)
    case "<=":
      return _num(lv) <= _num(rv)
    case "truthy":
      return !!lv && lv !== "false" && lv !== "0"
    case "falsy":
      return !lv || lv === "false" || lv === "0"
    case "exists":
      return lv !== undefined && lv !== null && lv !== ""
    case "in":
      return _toList(rv).some((x) => _looseEq(lv, x))
    case "between": {
      const a = _toList(rv).map(_num)
      if (a.length < 2) return false
      return _num(lv) >= Math.min(a[0], a[1]) && _num(lv) <= Math.max(a[0], a[1])
    }
    default:
      return true
  }
}

export function evalCond(cond: TopoCond | null | undefined, ctx: Ctx): boolean {
  if (cond == null) return true
  if (typeof cond !== "object") return !!cond
  if (Array.isArray(cond.all)) return cond.all.every((c) => evalCond(c, ctx))
  if (Array.isArray(cond.any)) return cond.any.some((c) => evalCond(c, ctx))
  if (cond.not != null) return !evalCond(cond.not, ctx)
  if (cond.var == null) return true
  const lv = ctx[cond.var]
  const rv = cond.ref != null ? ctx[cond.ref] : cond.val
  return cmpOp(lv, cond.op || "truthy", rv)
}

/** 与运营端 runtime.js 一致：text 等不支持状态信号的节点不写 .status/.online。 */
function nodeSupportsStateSignals(n: TopologyDoc["nodes"][number]): boolean {
  return !!(n && n.type !== "text")
}

/** 求值上下文：画布静态默认值（字段 value / status / online=true / 全局信号样例 / sampleSignals）← 实时信号覆盖 */
export function buildContext(topology: TopologyDoc, signals?: TopoSignals | null): Ctx {
  const ctx: Ctx = {}
  ;(topology.nodes || []).forEach((n) => {
    ;(n.data || []).forEach((f) => {
      const key = f.key && typeof f.key === "object" ? f.key.zh : (f.key as unknown as string)
      if (key != null) ctx[n.id + "." + key] = f.value === "--" ? "" : f.value
    })
    if (nodeSupportsStateSignals(n)) {
      ctx[n.id + ".status"] = n.status && typeof n.status === "object" ? n.status.zh : ((n.status as unknown as string) || "")
      ctx[n.id + ".online"] = true
    }
  })
  ;(topology.signals || []).forEach((s) => {
    if (s && s.name != null && s.sample !== undefined) ctx[s.name] = s.sample
  })
  if (topology.sampleSignals) Object.keys(topology.sampleSignals).forEach((k) => (ctx[k] = topology.sampleSignals![k]))
  if (signals) Object.keys(signals).forEach((k) => (ctx[k] = signals[k]))
  return ctx
}

export type ResolvedState = {
  ctx: Ctx
  /** 节点 id → 是否可见（visibleWhen 求值结果） */
  nodeVisible: Record<string, boolean>
  /** 与 doc.edges 同序：每条连线的可见性（端点隐藏/showWhen）与动态流向（dirRules 顺序匹配，e.dir 兜底） */
  edges: { visible: boolean; dir: EdgeDir }[]
}

export function resolveDynamic(topology: TopologyDoc, signals?: TopoSignals | null): ResolvedState {
  const ctx = buildContext(topology, signals)
  const hidden: Record<string, true> = {}
  ;(topology.nodes || []).forEach((n) => {
    if (n.visibleWhen != null && !evalCond(n.visibleWhen, ctx)) hidden[n.id] = true
  })
  const nodeVisible: Record<string, boolean> = {}
  ;(topology.nodes || []).forEach((n) => (nodeVisible[n.id] = !hidden[n.id]))
  const edges = (topology.edges || []).map((e) => {
    let visible = !(hidden[e.from] || hidden[e.to])
    if (visible && e.showWhen != null) visible = evalCond(e.showWhen, ctx)
    let dir: EdgeDir = e.dir || "forward"
    if (Array.isArray(e.dirRules)) {
      for (let i = 0; i < e.dirRules.length; i++) {
        if (evalCond(e.dirRules[i].when, ctx)) {
          dir = e.dirRules[i].dir
          break
        }
      }
    }
    return { visible, dir }
  })
  return { ctx, nodeVisible, edges }
}
