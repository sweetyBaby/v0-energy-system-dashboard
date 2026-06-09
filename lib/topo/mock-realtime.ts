/**
 * 阶段 2 演示用模拟实时数据。真实接口就绪后删除本文件，改为请求后端快照。
 *
 * 覆盖 4 类动态：① 字段值随时间变化 ② 流向随功率符号切换（PCS 充/放电）
 * ③ 连线按条件通断（pcs→load 周期性断开）④ 节点状态联动（BMS 充/放电）。
 */

import type { TopoRealtime } from "./topo-types"

const round = (v: number, d = 1) => {
  const p = 10 ** d
  return Math.round(v * p) / p
}

/** @param t 已运行秒数 */
export function makeMockRealtime(t: number): TopoRealtime {
  const wave = (amp: number, base: number, periodSec: number, phase = 0) =>
    base + amp * Math.sin((t / periodSec + phase) * 2 * Math.PI)

  // PCS 有功在 ±90kW 摆动：>0 视为给电池充电，<0 放电
  const pcsP = round(wave(90, 0, 24))
  const charging = pcsP >= 0
  const solarP = round(Math.max(0, wave(70, 55, 36)))
  const gridP = round(wave(70, 30, 20))
  const loadP = round(Math.max(0, wave(45, 95, 18)))
  const soc = round(55 + 20 * Math.sin((t / 120) * 2 * Math.PI), 0)

  return {
    ts: t,
    nodes: {
      pcs_1: { status: "运行", fields: { "P(kW)": pcsP, "I(A)": round(Math.abs(pcsP) * 1.3), "U(V)": 690 } },
      solar_1: { status: solarP > 1 ? "发电" : "待机", fields: { "P(kW)": solarP, "Vpv(V)": 742 } },
      bms_1: { status: charging ? "充电" : "放电", fields: { "SOC(%)": soc, "温度(℃)": round(26 + wave(2, 0, 40), 0) } },
      grid_1: { status: "在线", fields: { "P(kW)": gridP, "今日用电(kWh)": round(2300 + t * 0.1, 0) } },
      load_1: { status: "在线", fields: { "负载功率(kW)": loadP } },
      gen_1: { status: "备用", fields: { "P(kW)": 0 } },
    },
    // 每条线给「有功 p」（正=from→to），引擎据此判流向/通断；语义比单看一个节点更准
    edges: {
      "solar_1>pcs_1": { p: solarP }, // 光伏出力（>0 才有流动，夜间≈0 变灰）
      "grid_1>pcs_1": { p: gridP }, // 市电买/卖：p 变号 → 流向翻转
      "gen_1>pcs_1": { p: 0 }, // 发电机备用 → 无流动 → 结构边变灰
      "pcs_1>bms_1": { p: pcsP }, // 充(+)/放(−)电 → 流向翻转
      "pcs_1>load_1": { p: loadP }, // 始终向负载供电
    },
  }
}
