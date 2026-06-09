/**
 * 储能拓扑图 —— 数据契约类型。
 *
 * 与运营端 topo.html 的 buildJSON() 导出格式保持一致（schemaVersion 2.0）。
 * 后端下发的「布局 JSON」即此结构，前端渲染引擎直接消费。
 *
 * 几何约定（运营端元素库 iconRender）：
 *   节点以 position(x,y) 为中心；图标绘制区 = [x - sizeWorld/2, y - sizeWorld*0.72]，宽高均为 sizeWorld；
 *   图标视觉中心在 (x, y - sizeWorld*0.22)；名称在图标下方；数据字段在节点右侧按 offset 偏移。
 */

export type Bilingual = { zh: string; en: string }

export type EdgeAnim = "none" | "flow" | "dash" | "pipe" | "busbar" | "glow" | "alarm" | "pulse"

export type EdgeRoute = "smart" | "arc" | "manual" | "line" | "straight"

export type EdgeDir = "forward" | "reverse" | "both"

export type Point = { x: number; y: number }

export type TopoEdgeStyle = {
  labelZh: string
  labelEn: string
  color: string
  width: number
  dash: number[]
  anim: EdgeAnim
  speed: number
}

export type TopoNodeDataField = {
  key: Bilingual
  /** 字段值；占位为 "--"，实时数据接入后替换 */
  value: string | number
  hidden: boolean
  /** 相对节点的偏移（世界坐标） */
  offset: Point
}

/** 节点点击跳转配置（本项目扩展字段，运营端导出可不含） */
export type TopoNodeNav = {
  /** 目标页面 / tab key */
  page: string
  deviceId?: string
  /** 透传查询参数 */
  params?: Record<string, string>
}

export type TopoNode = {
  id: string
  type: string
  label: Bilingual
  position: Point
  /** 实际绘制尺寸（已含 scale），前端可直接用 */
  sizeWorld: number
  scale: number
  rotation: number
  fontSize: number
  fontColor: string
  status: Bilingual
  display: { showLabel: boolean; showFields: boolean }
  data: TopoNodeDataField[]
  /** 自定义图标 type 附带的文件名 */
  icon?: string
  /** text 类型节点样式 */
  textStyle?: Record<string, unknown>
  /** anchor 类型节点样式 */
  anchorStyle?: { fill?: string; opacity?: number }
  /** 本项目扩展：点击跳转 */
  nav?: TopoNodeNav
  /** 本项目扩展：实时规则决定的可见性（缺省视为 true） */
  visible?: boolean
}

export type TopoEdge = {
  from: string
  to: string
  edgeType: string
  edgeTypeLabel?: Bilingual
  color?: string
  dash?: number[]
  route: EdgeRoute
  dir: EdgeDir
  width: number
  label: string
  showLabel: boolean
  orthoSnap: boolean
  waypoints: Point[]
  /** 是否渲染该连线（动态连线 / 断路时切换） */
  active: boolean
}

export type TopoCanvasMeta = {
  bgColor: string
  zoom: number
  panX: number
  panY: number
  grid: { show: boolean; stepPx: number }
  showAnchors: boolean
}

export type TopologyDoc = {
  schemaVersion: string
  meta: {
    app?: string
    generatedAt?: string
    lang?: "zh" | "en"
    libraryRef: { name: string; version: string }
    canvas: TopoCanvasMeta
  }
  edgeStyles: Record<string, TopoEdgeStyle>
  nodes: TopoNode[]
  edges: TopoEdge[]
}

// ───── 实时数据契约（本项目侧，按 nodeId 关联布局；字段名复用布局 data.key.zh）─────

export type TopoRealtimeNode = {
  /** 状态（中文），覆盖布局 status.zh */
  status?: string
  /** 在线状态；false 可用于规则隐藏 */
  online?: boolean
  /** 字段值：中文字段名 → 实时值 */
  fields?: Record<string, number | string>
}

/**
 * 连线运行态；key = `${from}>${to}`（同一对节点多条边时可加 `:${edgeType}`）。
 * 推荐后端给 `p`（线路有功，kW，正=from→to）——流向/通断据此推导、语义最准；
 * 也可直接给 `dir`/`active` 覆盖。
 */
export type TopoRealtimeEdge = { dir?: EdgeDir; active?: boolean; p?: number }

export type TopoRealtime = {
  ts?: number
  nodes: Record<string, TopoRealtimeNode>
  edges?: Record<string, TopoRealtimeEdge>
}

/** 前端实时规则配置（含默认值，见 realtime-binding.ts） */
export type TopoBindingRules = {
  /** 流向判定阈值：|线路功率| ≤ epsilon 视为无流动（kW） */
  flowEpsilon: number
  /** 回退用：未给线路 p 时，按源节点这个字段(key.zh)的功率符号推导流向 */
  powerFieldByType: Record<string, string>
  /**
   * 结构边（布局 active:true）无流动时的呈现：
   *   字符串(如 "disabled") → 切到该线型（变灰静止，表示"已连接·无功率"）；
   *   null → 直接隐藏。
   * 按需出现的边（布局 active:false）无流动时一律隐藏。
   */
  idleEdgeType: string | null
  /** 命中这些节点状态时，其相连连线置为断路（active:false） */
  openStatuses: string[]
}

/** 节点点击跳转解析器：本项目按 id/type 决定目标，topo.html 不感知 */
export type NavResolver = (node: { id: string; type: string }) => TopoNodeNav | undefined
