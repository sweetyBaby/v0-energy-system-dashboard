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

export type EdgeDir = "forward" | "reverse" | "both" | "none"

// ───── 数据驱动规则（与运营端 topo.html / runtime.js 同一契约，见 topo/拓扑系统-接入文档.md §5）─────

/**
 * 条件树：叶子 {var,op,val|ref}；组合 {all}/{any}/{not}；null/缺省 = 恒为真。
 * op: == != > >= < <= in between truthy falsy exists（缺省 truthy）
 */
export type TopoCond = {
  all?: TopoCond[]
  any?: TopoCond[]
  not?: TopoCond
  var?: string
  op?: string
  val?: unknown
  /** 与另一个信号比较（优先于 val） */
  ref?: string
}

/** 连线流向规则：顺序匹配，首个命中生效，否则用连线自身 dir 兜底 */
export type TopoDirRule = { when?: TopoCond; dir: EdgeDir }

/** 运营端「⚙ 规则与信号」面板定义的全局信号（sample 作为未下发时的默认值） */
export type TopoSignalDef = { name: string; label?: string; sample?: number | string | boolean | null; type?: string; options?: string[] }

/**
 * 实时信号快照（扁平 {信号名:值}）：节点字段 `节点id.字段名`（中文字段名）、
 * 节点状态 `节点id.status`、在线 `节点id.online`、全局信号直接用信号名。
 * 同一份数据既驱动规则（显隐/流向），又显示在字段卡片上。
 */
export type TopoSignals = Record<string, number | string | boolean | null>

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
  /** 字段值；占位为 "--"，实时数据接入后替换（空串 = 无值，显示为空） */
  value: string | number | boolean
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
  /** 显示条件（运营端配置；条件不满足 → 元素及其连线隐藏） */
  visibleWhen?: TopoCond
  /** 实时规则求值结果（apply-signals 写入；缺省视为 true） */
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
  /** 显示/存在条件（运营端配置；条件不满足 → 该连线不画） */
  showWhen?: TopoCond
  /** 流向规则（运营端配置；顺序匹配，dir 兜底） */
  dirRules?: TopoDirRule[]
  /** 实时规则求值结果：是否渲染该连线（apply-signals 写入；缺省视为 true） */
  active?: boolean
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
  /** 全局信号定义（运营端「⚙ 规则与信号」面板，随图导出） */
  signals?: TopoSignalDef[]
  /** 导出时的样例信号值（未下发实时数据时作为默认） */
  sampleSignals?: TopoSignals
}

/** 节点点击跳转解析器：本项目按 id/type 决定目标，topo.html 不感知 */
export type NavResolver = (node: { id: string; type: string }) => TopoNodeNav | undefined
