/**
 * 拓扑取数接缝层 —— 前后台交互的唯一入口。
 *
 * 设计目标：现在用 mock 跑通，后端就绪后**只改本文件**（把 TOPOLOGY_USE_MOCK 置 false、
 * 填好接口路径），上层组件（ProjectTopologyPanel / TopoCanvas）与渲染引擎完全不用动。
 *
 * 两条独立数据流（详见 docs/拓扑前后台接口定义.md）：
 *   ① 布局 JSON（低频、结构性）   → fetchTopologyLayout()    返回 TopologyDoc
 *   ② 实时信号（高频、只是值）     → makeTopologySignals()   返回 (t)=>扁平 {信号名:值}
 * 前端 applySignals() 把两者合并后渲染；信号会在 TopoCanvas 内累积合并，故接口发增量即可。
 */

import { apiClient } from "@/lib/api-client"
import { makeMockSignals } from "./mock-signals"
import type { TopologyDoc, TopoSignals } from "./topo-types"

// ─────────────────────────────────────────────────────────────────────────────
// 接口就绪前为 true（走 mock）；后端联调时置 false 并确认下方接口路径与返回结构。
export const TOPOLOGY_USE_MOCK = true
// ─────────────────────────────────────────────────────────────────────────────

/** mock 布局：运营端导出的示例画布 JSON（含规则与样例信号）。 */
const MOCK_TOPOLOGY_URL = "/topology-sample.json"

/**
 * ① 拉取拓扑布局 JSON。
 * mock：取 public 下的静态导出文件；真实接口：GET /topology/layout?projectId=…（返回 ApiResponse<TopologyDoc>）。
 */
export async function fetchTopologyLayout(projectId?: string): Promise<TopologyDoc> {
  if (TOPOLOGY_USE_MOCK) {
    const r = await fetch(MOCK_TOPOLOGY_URL)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return (await r.json()) as TopologyDoc
  }
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""
  const res = await apiClient.get<TopologyDoc>(`/topology/layout${qs}`)
  return res.data
}

/**
 * ② 构造实时信号取数器：返回 (t)=>信号快照（可同步或异步）。
 * mock：用运行秒数 t 生成昼夜/充放电等动画信号；
 * 真实接口：忽略 t，按 projectId 轮询 GET /topology/signals（返回 ApiResponse<TopoSignals>，全量或增量皆可）。
 */
export function makeTopologySignals(projectId?: string): (t: number) => TopoSignals | Promise<TopoSignals> {
  if (TOPOLOGY_USE_MOCK) return (t) => makeMockSignals(t)
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""
  return async () => {
    const res = await apiClient.get<TopoSignals>(`/topology/signals${qs}`)
    return res.data
  }
}
