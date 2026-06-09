// 从运营端 topo.html 抽取「只读渲染引擎」到 lib/topo/engine.ts。
//
// 思路：渲染/路由算法逐段 *逐字* 抽取（保证与运营端像素级一致），
// 仅重写 drawAll（去掉编辑态可视化与 DOM 依赖）、自写 fitView/动画循环/公共 API，
// 并把所有原全局变量收进工厂闭包。运营端升级后重跑本脚本即可重新同步。
//
// 用法： node scripts/build-topo-engine.mjs
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..")
const srcPath = path.join(root, "topo.html")
const outPath = path.join(root, "lib", "topo", "engine.ts")

const lines = fs.readFileSync(srcPath, "utf8").split("\n")
// slice(a,b) → 含 1-indexed 行 a..b
const slice = (a, b) => lines.slice(a - 1, b).join("\n")

// 逐字抽取的源码区段（topo.html 行号；运营端改版后需核对这些边界）
const GEO_ROUTE = slice(1361, 2161) // 几何工具 + 确定性通道布线引擎
const CROSS = slice(3223, 3234) // segsCross / pathsCross（被布线引擎引用，但定义在编辑区段）
const DRAW_A = slice(2163, 2190) // hexRgb / rgba / drawJunctionDots
const DRAW_B = slice(2304, 2674) // 跨线弧 + drawEdge/drawNode/drawTextNode/字段 chip

// 连线类型默认表（topo.html 579-593，逐字）
const DEFAULT_ET = `const DEFAULT_ET = {
  ac_power: {label:'交流电力', labelEn:'AC Power', color:'#e74c3c',w:2.5,dash:[],    anim:'flow',     spd:.5, desc:'电网交流传输，红色流动'},
  dc_power: {label:'直流电力', labelEn:'DC Power', color:'#e67e22',w:2.5,dash:[],    anim:'flow',     spd:.5, desc:'直流母线传输'},
  pipe_blue:{label:'蓝光管道', labelEn:'Blue Pipe', color:'#3aa0ff',w:2.5,dash:[],    anim:'pipe',     spd:.7, desc:'母线管道，蓝色光点流动'},
  pipe_gold:{label:'金光管道', labelEn:'Gold Pipe', color:'#f5c518',w:2.5,dash:[],    anim:'pipe',     spd:.7, desc:'高亮管道，金色光点流动'},
  charge:   {label:'充电中',   labelEn:'Charging', color:'#2ecc71',w:2.5,dash:[],    anim:'flow',     spd:.9, desc:'充电，绿色快流'},
  discharge:{label:'放电中',   labelEn:'Discharging', color:'#3498db',w:2.5,dash:[],    anim:'flow',     spd:.9, desc:'放电，蓝色快流'},
  busbar:   {label:'母线汇流', labelEn:'Busbar', color:'#4dd0ff',w:3.5,dash:[],    anim:'glow',     spd:.3, desc:'母线/汇流排，较粗实线'},
  standby:  {label:'待机',     labelEn:'Standby', color:'#f1c40f',w:2,  dash:[5,5], anim:'pulse',    spd:.2, desc:'待机，慢速脉冲'},
  comm:     {label:'通信线',   labelEn:'Comm Line', color:'#9b59b6',w:1.5,dash:[4,4], anim:'dash',     spd:1.2,desc:'通信/控制信号'},
  pv_power: {label:'光伏出力', labelEn:'PV Output', color:'#f9ca24',w:2.5,dash:[],    anim:'flow',     spd:.6, desc:'光伏直流出力'},
  fault:    {label:'故障告警', labelEn:'Fault Alarm', color:'#ff3333',w:2.5,dash:[4,4], anim:'alarm',    spd:2.0,desc:'故障/告警，急闪'},
  disabled: {label:'断路',     labelEn:'Open Circuit', color:'#445566',w:2,  dash:[8,8], anim:'none',     spd:0,  desc:'断路/停用'},
  neutral:  {label:'接地线',   labelEn:'Ground', color:'#888888',w:1.5,dash:[3,5], anim:'none',     spd:0,  desc:'中性/接地线'},
}`

const header = `// @ts-nocheck
/* eslint-disable */
/**
 * 储能拓扑渲染引擎（只读）—— 由 scripts/build-topo-engine.mjs 从运营端 topo.html 自动抽取生成。
 *
 * 渲染与路由算法逐字抽取自 topo.html（schema 2.0），保证与运营端像素级一致；
 * 已剥离全部编辑态（拖拽/选择/对齐/撤销/侧栏/导出）。
 *
 * ⚠️ 请勿手改本文件的算法区段。运营端升级后重跑 scripts/build-topo-engine.mjs 同步。
 */

${DEFAULT_ET}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{bgColor?:string, lang?:'zh'|'en', showGrid?:boolean, showEdgeLabels?:boolean, showFieldChips?:boolean, busMerge?:boolean}} [opts]
 */
export function createTopoEngine(canvas, opts = {}) {
  const ctx = canvas.getContext("2d")

  // ── 视图 / 编辑态（编辑相关恒为只读默认值，替代 topo.html 全局变量）──
  let nodes = [], edges = []
  let zoom = 1, panX = 0, panY = 0, animT = 0
  let bgColor = opts.bgColor || "#0a1f40"
  // paintBg=false：不铺满画布底色（画布透明，露出外层卡片背景），但 bgColor 仍用于文字底板/抹线
  let paintBg = opts.paintBg !== false
  let lang = opts.lang || "zh"
  let showGrid = opts.showGrid === true
  let showEdgeLabels = opts.showEdgeLabels !== false
  let showFieldChips = opts.showFieldChips !== false
  let showAnchors = false
  let globalWidth = 1
  let busMerge = opts.busMerge !== false
  let busMergeGap = 16, busTrunkBold = true, busStyle = "busbar", busOffsets = {}, busShareTrunk = false, busShowHandles = false, routeStyle = 3, busAggregation = false
  const selNode = null, selEdge = null
  let selSet = new Set(), selChips = new Set()
  const edgeMode = false, edgeFrom = null, rubber = null
  const IMGS = {}, CUSTOM_ICONS = {}
  let ET = Object.assign({}, DEFAULT_ET)

  // ── 基础工具（topo.html 818 / 920 / 2762）──
  function toWorld(sx, sy) { return [(sx - panX) / zoom, (sy - panY) / zoom] }
  function gridColor() {
    const c = bgColor.replace("#", ""); const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16)
    const lum = (r * 0.299 + g * 0.587 + b * 0.114); return lum > 128 ? "rgba(0,40,90,0.13)" : "rgba(120,170,220,0.28)"
  }
  function bgPlate() { return bgColor }
`

const footer = `
  // ── 只读 drawAll（重写：去掉编辑态可视化与 DOM 依赖；其余与 topo.html 一致）──
  function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (paintBg) { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height) }
    ctx.save(); ctx.translate(panX, panY); ctx.scale(zoom, zoom)
    if (showGrid) {
      const step = 40
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.strokeStyle = gridColor(); ctx.lineWidth = 1
      const ox = ((panX % step) + step) % step, oy = ((panY % step) + step) % step
      ctx.beginPath()
      for (let x = ox; x <= canvas.width; x += step) { const px = Math.round(x) + 0.5; ctx.moveTo(px, 0); ctx.lineTo(px, canvas.height) }
      for (let y = oy; y <= canvas.height; y += step) { const py = Math.round(y) + 0.5; ctx.moveTo(0, py); ctx.lineTo(canvas.width, py) }
      ctx.stroke(); ctx.restore()
    }
    computeCrossHops()
    edges.forEach(drawEdge); drawJunctionDots(); nodes.forEach(drawNode)
    ctx.restore()
  }

  // ── fitView（topo.html 3356，去掉 DOM）──
  function fitViewInner(capZoom) {
    if (nodes.length === 0) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    nodes.forEach(n => {
      const s = nsz(n)
      const f = (!n.hideFields && n.data) ? n.data.filter(x => !x.hidden).length : 0
      const rc = f ? 185 : 0
      minX = Math.min(minX, n.x - s); minY = Math.min(minY, n.y - s)
      maxX = Math.max(maxX, n.x + s + rc); maxY = Math.max(maxY, n.y + s * 1.5)
    })
    const w = maxX - minX, h = maxY - minY, pad = 48
    if (!(w > 0) || !(h > 0)) return
    const zx = (canvas.width - pad * 2) / w, zy = (canvas.height - pad * 2) / h
    zoom = Math.max(0.2, Math.min(capZoom || 2, Math.min(zx, zy)))
    panX = pad - minX * zoom + (canvas.width - pad * 2 - w * zoom) / 2
    panY = pad - minY * zoom + (canvas.height - pad * 2 - h * zoom) / 2
  }

  // ── 动画循环 ──
  let rafId = null, running = false
  function frame(ts) { animT = (ts || 0) * 0.001; drawAll(); rafId = requestAnimationFrame(frame) }

  // ── 公共 API ──
  return {
    setData(n, e) { nodes = n || []; edges = e || []; _pathCache = {}; _pathCacheSig = "" },
    setEdgeTypes(map) { if (map) ET = Object.assign({}, ET, map) },
    setIcons(map) { if (map) Object.assign(IMGS, map) },
    setBg(c) { if (c) bgColor = c },
    setLang(l) { lang = (l === "en") ? "en" : "zh" },
    setOptions(o) {
      o = o || {}
      if ("showGrid" in o) showGrid = !!o.showGrid
      if ("showEdgeLabels" in o) showEdgeLabels = !!o.showEdgeLabels
      if ("showFieldChips" in o) showFieldChips = !!o.showFieldChips
      if ("busMerge" in o) busMerge = !!o.busMerge
      _pathCacheSig = ""
    },
    fitView(cap) { fitViewInner(cap); fitViewInner(cap) }, // 跑两次让 nsz 随新 zoom 收敛
    resize() { _pathCacheSig = ""; drawAll() },
    redraw() { _pathCacheSig = ""; drawAll() },
    hitTestNode(sx, sy) { const [wx, wy] = toWorld(sx, sy); return nodeAt(wx, wy) },
    getView() { return { zoom, panX, panY } },
    setView(v) { v = v || {}; if (typeof v.zoom === "number") zoom = v.zoom; if (typeof v.panX === "number") panX = v.panX; if (typeof v.panY === "number") panY = v.panY },
    start() { if (running) return; running = true; rafId = requestAnimationFrame(frame) },
    stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null },
    destroy() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; nodes = []; edges = [] },
  }
}
`

const banner = (label, fromLine, toLine) =>
  `\n  // ===== BEGIN 逐字抽取：${label}（topo.html ${fromLine}-${toLine}）=====\n`
const bannerEnd = `  // ===== END 逐字抽取 =====\n`

const body =
  header +
  banner("几何工具 + 通道布线引擎", 1361, 2161) + GEO_ROUTE + "\n" + bannerEnd +
  banner("线段相交判定 segsCross/pathsCross", 3223, 3234) + CROSS + "\n" + bannerEnd +
  banner("绘制工具 hexRgb/rgba/drawJunctionDots", 2163, 2190) + DRAW_A + "\n" + bannerEnd +
  banner("跨线弧 + 连线/节点/字段绘制", 2304, 2674) + DRAW_B + "\n" + bannerEnd +
  footer

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, body)
console.log("wrote", path.relative(root, outPath), "(" + body.split("\n").length + " lines)")
