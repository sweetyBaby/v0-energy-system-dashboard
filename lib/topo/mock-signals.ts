/**
 * 模拟实时数据 —— 运营端「扁平信号」契约（见 topo/拓扑系统-接入文档.md §4）。
 *
 * 键名 = 规则与字段卡片共用的信号名：
 *   节点字段 `节点id.字段名`（中文字段名，与运营端配置一致）、
 *   节点状态 `节点id.status`、在线 `节点id.online`、全局信号直接用信号名。
 * 同一份数据既驱动画布 JSON 里的规则（visibleWhen/showWhen/dirRules），又显示在字段卡片上。
 *
 * 本 mock 专门驱动 topology-sample.json 中运营端配置的三条规则：
 *   ① solar_1.visibleWhen: P(kW)>0  → 模拟昼夜，夜间光伏整体隐藏（含连线）
 *   ② pcs_1→bms_1.dirRules: I(A) 正充负放 → 流向随符号翻转
 *   ③ gen_1→pcs_1.showWhen: gen_1.online → 发电机离线时联络线消失
 *
 * 真实接口就绪后删除本文件：后端按同一契约返回 { 信号名: 值 } 快照即可，前端零改动。
 */

import type { TopoSignals } from "./topo-types"

export type { TopoSignals }

const round = (v: number, d = 1) => {
  const p = 10 ** d
  return Math.round(v * p) / p
}

/** @param t 已运行秒数 */
export function makeMockSignals(t: number): TopoSignals {
  const wave = (amp: number, base: number, periodSec: number, phase = 0) =>
    base + amp * Math.sin((t / periodSec + phase) * 2 * Math.PI)

  // PCS 有功在 ±90kW 摆动：>0 充电、<0 放电；I(A) 同号 → 驱动 dirRules
  const pcsP = round(wave(90, 0, 24))
  const charging = pcsP >= 0
  // 光伏出力按 36s 一个“昼夜”，夜间为 0 → 触发 visibleWhen 隐藏
  const solarP = round(Math.max(0, wave(70, 25, 36)))
  const gridP = round(wave(70, 30, 20))
  const loadP = round(Math.max(0, wave(45, 95, 18)))
  const soc = round(55 + 20 * Math.sin((t / 120) * 2 * Math.PI), 0)
  // 发电机每 40s 上/下线一次 → 触发 showWhen 通断
  const genOnline = Math.sin((t / 40) * 2 * Math.PI) > -0.3

  return {
    "pcs_1.P(kW)": pcsP,
    "pcs_1.I(A)": round(pcsP * 1.3),
    "pcs_1.U(V)": 690,
    "pcs_1.status": "运行",
    "solar_1.P(kW)": solarP,
    "solar_1.Vpv(V)": solarP > 0 ? 742 : 0,
    "solar_1.status": solarP > 1 ? "发电" : "待机",
    "bms_1.SOC(%)": soc,
    "bms_1.温度(℃)": round(26 + wave(2, 0, 40), 0),
    "bms_1.status": charging ? "充电" : "放电",
    "grid_1.P(kW)": gridP,
    "grid_1.今日用电(kWh)": round(2300 + t * 0.1, 0),
    "grid_1.status": "在线",
    "grid_1.online": true,
    "load_1.负载功率(kW)": loadP,
    "load_1.status": "在线",
    "gen_1.P(kW)": genOnline ? round(Math.abs(wave(20, 25, 30))) : 0,
    "gen_1.status": genOnline ? "运行" : "停机",
    "gen_1.online": genOnline,
  }
}
