// 把运营端最新拓扑引擎的「布线/几何/端口」函数就地同步进 lib/topo/engine.ts。
//
// 背景（重要，先读再改）：
//   旧版脚本按 *行号区段* 从单文件 topo.html 逐字裁剪，整文件重生成 engine.ts。
//   运营端后来把代码拆成独立的 topology-editor.js，行号区段全部失效；而且 engine.ts
//   早已不是纯生成物——它是「半手工 fork」：
//     · 自写部分：header（含 nodeScale/labelScale/fieldScale 选项）、drawAll、fitView、
//       动画循环、公共 API、以及 draw* 一族（去掉编辑态耦合 + 织入缩放定制）。
//     · 跟随上游部分：几何 + 通道布线（端口锚点能力在此）。
//   「整文件重生成」会冲掉手工 fork。故本脚本改为 **按函数名就地 upsert**：
//     只替换/插入下面 SYNC 清单里的函数（布线 + 端口辅助），对 PATCHES 里的函数补回
//     缩放定制，其余（draw fork / header / footer）一律原样保留。幂等、冲突即报错。
//
// 维护：运营端 topology-editor.js 更新后
//   1) 重新 vendor： cp <运营端>/topo-editor/topology-editor.js vendor/topo-editor/
//   2) node scripts/build-topo-engine.mjs
//   3) git diff lib/topo/engine.ts 核对，dev 跑总览拓扑验证
// 若上游新增了我们也需要的渲染能力（不止布线），把相关函数名加进 SYNC 即可；
// 若上游改了 PATCHES 命中的那行，脚本会报错，提示你重新核对该补丁。
//
// 用法： node scripts/build-topo-engine.mjs   [--check]   (--check 只校验不写文件)
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..")
const srcPath = path.join(root, "vendor", "topo-editor", "topology-editor.js")
const outPath = path.join(root, "lib", "topo", "engine.ts")
const checkOnly = process.argv.includes("--check")

// ── 跟随上游、就地 upsert 的函数（顺序即插入新函数时的写入顺序）──
// 布线 / 几何（端口锚点能力随这批进来）：
const SYNC_ROUTING = [
  "nodeBox", "clipEnds", "topoSig", "buildObstacleGrid", "routeOrtho", "edgePathRaw",
  "channelRoute", "straightVariants", "optimizeChannel", "detourRoute", "applyBusMerge", "nsz",
  "_pathScore", "_pathBends", "_pathDetourPenalty",
]
// 端口辅助（engine.ts 原本没有，本次新增）：
const SYNC_PORTS = [
  "clamp", "isLinearBusNode", "linearBusSpan", "linearBusPort",
  "nodePortPoint", "nearestNodePort", "directionalNodePort", "edgeAnchorPoint", "portSide",
]
const SYNC = [...SYNC_ROUTING, ...SYNC_PORTS]

// ── 缩放定制补丁：upsert 上游版本后，把我们的 nodeScale/labelScale/fieldScale 织回去 ──
// find 必须在「刚 upsert 进来的上游函数体」里唯一命中，否则报错（说明上游改了该行，需人工复核）。
const PATCHES = {
  // 节点尺寸随 nodeScale 联动（仪表盘缩放时图标同步放大）
  nsz: [{ find: "return s*(base/600)*scale;", replace: "return s*(base/600)*scale*nodeScale;" }],
  // 障碍盒底部按「带缩放的标签字号」延伸（与我们的 labelScale 体系一致）
  buildObstacleGrid: [{ find: "const lfs=(n.fontSize||14);", replace: "const lfs=labelFontPx(n)/zoom;" }],
}

// engine.ts 中既存的依赖（被 SYNC 函数引用，但属于 draw fork / header，不在本脚本管辖）——
// 仅做存在性断言，缺失则说明 fork 被破坏，应停止同步。
const REQUIRED_IN_ENGINE = ["nsz", "nodeBox", "anchorPoint", "labelFontPx", "_pathLen", "_pathCache"]
// 新函数插入锚点（header 末尾的 bgPlate 之后；函数声明在闭包内会提升，位置不影响调用）。
// 不含换行，兼容 CRLF/LF。
const INSERT_ANCHOR = "  function bgPlate() { return bgColor }"

// ── 大括号配平：从源码中按函数名抽出完整 `function NAME(...){...}`（跳过字符串/注释里的花括号）──
function extractFn(src, name) {
  const re = new RegExp(`function\\s+${name}\\s*\\(`)
  const m = re.exec(src)
  if (!m) return null
  let i = src.indexOf("{", m.index)
  if (i < 0) return null
  let depth = 0, inStr = null, esc = false, inLine = false, inBlock = false
  const start = m.index
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1]
    if (inLine) { if (c === "\n") inLine = false; continue }
    if (inBlock) { if (c === "*" && n === "/") { inBlock = false; i++ } continue }
    if (inStr) {
      if (esc) { esc = false; continue }
      if (c === "\\") { esc = true; continue }
      if (c === inStr) inStr = null
      continue
    }
    if (c === "/" && n === "/") { inLine = true; i++; continue }
    if (c === "/" && n === "*") { inBlock = true; i++; continue }
    if (c === "'" || c === '"' || c === "`") { inStr = c; continue }
    if (c === "{") depth++
    else if (c === "}") { depth--; if (depth === 0) return { text: src.slice(start, i + 1), start, end: i + 1 } }
  }
  return null
}

const fail = (msg) => { console.error("✗ " + msg); process.exit(1) }

const upstream = fs.readFileSync(srcPath, "utf8")
let engine = fs.readFileSync(outPath, "utf8")
const EOL = engine.includes("\r\n") ? "\r\n" : "\n"
// 上游函数体统一换成 engine.ts 的行尾，避免混入异种换行
const toEol = (s) => s.replace(/\r\n/g, "\n").replace(/\n/g, EOL)

// 0) 前置断言：fork 必须自洽
for (const dep of REQUIRED_IN_ENGINE) {
  if (!new RegExp(`\\b${dep}\\b`).test(engine)) fail(`engine.ts 缺少依赖符号「${dep}」——手工 fork 可能已损坏，停止同步。`)
}
if (!engine.includes(INSERT_ANCHOR)) fail(`engine.ts 找不到插入锚点（bgPlate 行）——请检查 header 是否被改动。`)

// 1) 逐个 upsert
let replaced = 0, inserted = 0, patched = 0
const insertBlock = []
for (const name of SYNC) {
  const up = extractFn(upstream, name)
  if (!up) fail(`上游 topology-editor.js 中找不到函数「${name}」——上游可能重命名/删除了它，请更新 SYNC 清单。`)

  // 应用缩放补丁（在上游函数文本上操作）
  let body = toEol(up.text)
  for (const p of PATCHES[name] || []) {
    const cnt = body.split(p.find).length - 1
    if (cnt !== 1) fail(`缩放补丁失配：函数「${name}」中「${p.find}」命中 ${cnt} 次（应为 1）——上游改了该行，请人工复核 PATCHES。`)
    body = body.replace(p.find, p.replace)
    patched++
  }

  const existing = extractFn(engine, name)
  if (existing) {
    engine = engine.slice(0, existing.start) + body + engine.slice(existing.end)
    replaced++
  } else {
    insertBlock.push(body)
    inserted++
  }
}

// 2) 插入新函数（带横幅，便于辨识来源）
if (insertBlock.length) {
  const banner = EOL + "  // ===== 端口/几何辅助：由 scripts/build-topo-engine.mjs 从 topology-editor.js 同步，勿手改 =====" + EOL
  const block = banner + insertBlock.join(EOL) + EOL + "  // ===== END 同步 =====" + EOL
  engine = engine.replace(INSERT_ANCHOR, INSERT_ANCHOR + block)
}

// 3) 写回
if (checkOnly) {
  console.log(`[check] OK：可同步 替换 ${replaced} / 新增 ${inserted} / 补丁 ${patched}（未写文件）`)
} else {
  fs.writeFileSync(outPath, engine)
  console.log(`✓ 同步完成：替换 ${replaced} 个、新增 ${inserted} 个、应用补丁 ${patched} 处 → ${path.relative(root, outPath)}`)
}
