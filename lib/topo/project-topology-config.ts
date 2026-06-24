/**
 * 本项目侧的拓扑配置 —— 与运营端 topo.html 解耦的部分都放这里。
 *
 * 目前只有「节点点击跳转」解析：topo.html 不含 nav，由本项目按节点 type/id 决定目标页面，
 * 这样运营端拓扑结构调整时本项目无需跟改，渲染保持一致。
 */

import type { NavResolver } from "./topo-types"

// 「数据分析」是按模块参数化的 tab（analysis:<模块key>），不存在裸 "analysis" tab——
// 用裸 "analysis" 会导致点击跳转无效。默认进第一个分析模块「压差」，换默认改这里即可。
const ANALYSIS_TAB = "analysis:voltage-diff"

/**
 * 节点类型 → 目标页面（dashboard tab key）。这是本项目侧的映射，运营端不感知。
 * page 取值必须是真实存在的 tab key：realtime / history / alarm-monitoring / cell-history /
 * `analysis:<模块key>`（如 analysis:voltage-diff）/ trend-analysis / device-status / reports；
 * 若取以 "/" 开头的路径（如 "/project-map"）则按外部路由跳转。
 *
 * ⚠️ 默认映射为合理猜测，按产品需求在此调整即可。未列出的类型点击无动作。
 */
const TYPE_TO_PAGE: Record<string, string> = {
  // 电池侧 → 电芯诊断
  bms: "cell-history",
  cabinet: "cell-history",
  // 变流/能量管理 → 运行状态
  pcs: "history",
  ems: "history",
  // 电源 / 计量 / 负载 → 数据分析（参数化 tab，不能用裸 "analysis"）
  grid: ANALYSIS_TAB,
  solar: ANALYSIS_TAB,
  generator: ANALYSIS_TAB,
  meter: ANALYSIS_TAB,
  meter2: ANALYSIS_TAB,
  load: ANALYSIS_TAB,
  charger: ANALYSIS_TAB,
  // 安全 / 环境设备 → 告警监测
  fire: "alarm-monitoring",
  aircon: "alarm-monitoring",
  sensor: "alarm-monitoring",
}

/**
 * 节点 → 跳转目标。返回 undefined 表示该节点不可点击。
 * 需要按 id 精确跳转（带 deviceId）时，可在此优先判断 node.id。
 */
export const resolveTopoNav: NavResolver = (node) => {
  const page = TYPE_TO_PAGE[node.type]
  return page ? { page } : undefined
}
