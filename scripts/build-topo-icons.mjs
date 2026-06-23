// 把运营端「元素库包」里的图标，落成前端按路径加载的静态资源。
//
// 背景 / 方案（先读再改）：
//   拓扑 JSON 只按 node.type 引用图标，图标字节与布局解耦。本项目**不让后台托管图标**，
//   图标是构建期 vendored 静态资源（与 vendor/topo-editor/topology-editor.js 同性质）。
//   渲染端要的是「public 下的文件路径」而非内联 dataURL（可审查 diff、按图标缓存、无 base64 膨胀、
//   可懒加载）——见 docs/topology-engine-and-rules.md「图标同步」。
//
//   本脚本把图标解出来写进 public/topo/icons/，并生成 public/topo/icon-manifest.json
//   （version + type→文件名）。loadTopoIcons() 读清单、按用到的 type 走 /topo/icons/{file}?v=ver 加载。
//
// 源优先级（取第一个存在的）：
//   1) vendor/topo-editor/icons/ + vendor/topo-editor/icon-map.json   —— 元素库包的原始文件（最佳）
//   2) vendor/topo-editor/icons.js  里的 ICON_DATA = {type: dataURI}   —— 元素库包的内联导出
//   3) public/topo-icons.json       {type: dataURI}                    —— 当前引导源（迁移用）
//
// 版本号优先级：--version=x.y.z > vendor/topo-editor/element-library.json 的 library.version
//             > 既有 manifest 的 version > "0.0.0"
//
// 维护：运营端「元素库包」更新后
//   1) 解压进 vendor/topo-editor/（icons/ + icon-map.json + element-library.json + icons.js）
//   2) node scripts/build-topo-icons.mjs   （或 pnpm build:topo-icons）
//   3) git diff public/topo/ 核对（svg 可读、png 二进制可见，能看出改了哪个图标），dev 验证
//
// 用法： node scripts/build-topo-icons.mjs [--check] [--version=x.y.z]
//        --check 只校验源与版本、列出将写出的文件，不落盘。
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..")
const vendorDir = path.join(root, "vendor", "topo-editor")
const outIconsDir = path.join(root, "public", "topo", "icons")
const outManifest = path.join(root, "public", "topo", "icon-manifest.json")

const args = process.argv.slice(2)
const checkOnly = args.includes("--check")
const versionArg = (args.find((a) => a.startsWith("--version=")) || "").split("=")[1] || null

const fail = (msg) => { console.error("✗ " + msg); process.exit(1) }
const exists = (p) => { try { fs.accessSync(p); return true } catch { return false } }

// dataURI → { ext, bytes }
const MIME_EXT = { "image/svg+xml": "svg", "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/webp": "webp" }
function decodeDataUri(type, uri) {
  const m = /^data:([^;,]+)(;[^,]*)?,(.*)$/s.exec(uri)
  if (!m) fail(`图标「${type}」不是合法 dataURI（前 32 字符：${String(uri).slice(0, 32)}…）`)
  const mime = m[1].trim()
  const ext = MIME_EXT[mime]
  if (!ext) fail(`图标「${type}」的 MIME「${mime}」暂不支持，请在 MIME_EXT 中补充。`)
  const isB64 = (m[2] || "").includes("base64")
  const bytes = isB64 ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]), "utf8")
  return { ext, bytes }
}

// ── 1) 解析源 ──────────────────────────────────────────────────────────────
// 统一产出 { byType: { type: {ext, bytes} }, sourceLabel }
function loadFromRawFiles() {
  const mapPath = path.join(vendorDir, "icon-map.json")
  const iconsSrc = path.join(vendorDir, "icons")
  if (!exists(mapPath) || !exists(iconsSrc)) return null
  const map = JSON.parse(fs.readFileSync(mapPath, "utf8"))
  const paths = map.paths || map.iconMap || {}
  const byType = {}
  for (const [type, rel] of Object.entries(paths)) {
    const file = path.join(vendorDir, rel.startsWith("icons/") ? rel : path.join("icons", rel))
    if (!exists(file)) fail(`icon-map 指向的文件不存在：${rel}（type=${type}）`)
    byType[type] = { ext: path.extname(file).slice(1).toLowerCase() || "png", bytes: fs.readFileSync(file) }
  }
  return { byType, sourceLabel: "vendor/topo-editor/icons + icon-map.json" }
}

function loadFromIconsJs() {
  const jsPath = path.join(vendorDir, "icons.js")
  if (!exists(jsPath)) return null
  const src = fs.readFileSync(jsPath, "utf8")
  // 抽出 `export const ICON_DATA = {...};`
  const i = src.indexOf("ICON_DATA")
  if (i < 0) return null
  const braceStart = src.indexOf("{", i)
  if (braceStart < 0) fail("icons.js 中找到 ICON_DATA 但缺少对象字面量。")
  let depth = 0, end = -1
  for (let j = braceStart; j < src.length; j++) {
    if (src[j] === "{") depth++
    else if (src[j] === "}") { depth--; if (depth === 0) { end = j + 1; break } }
  }
  if (end < 0) fail("icons.js 中 ICON_DATA 对象括号不配平。")
  const map = JSON.parse(src.slice(braceStart, end))
  const byType = {}
  for (const [type, uri] of Object.entries(map)) byType[type] = decodeDataUri(type, uri)
  return { byType, sourceLabel: "vendor/topo-editor/icons.js (ICON_DATA)" }
}

function loadFromPublicJson() {
  const p = path.join(root, "public", "topo-icons.json")
  if (!exists(p)) return null
  const map = JSON.parse(fs.readFileSync(p, "utf8"))
  const byType = {}
  for (const [type, uri] of Object.entries(map)) byType[type] = decodeDataUri(type, uri)
  return { byType, sourceLabel: "public/topo-icons.json (引导源)" }
}

const source = loadFromRawFiles() || loadFromIconsJs() || loadFromPublicJson()
if (!source) fail("找不到图标源：请将运营端「元素库包」解压进 vendor/topo-editor/（icons/ 或 icons.js），或保留 public/topo-icons.json。")
const types = Object.keys(source.byType).sort()
if (types.length === 0) fail("图标源为空。")

// ── 2) 版本号 ──────────────────────────────────────────────────────────────
function detectVersion() {
  if (versionArg) return versionArg
  const libPath = path.join(vendorDir, "element-library.json")
  if (exists(libPath)) {
    try { const v = JSON.parse(fs.readFileSync(libPath, "utf8"))?.library?.version; if (v) return String(v) } catch {}
  }
  if (exists(outManifest)) {
    try { const v = JSON.parse(fs.readFileSync(outManifest, "utf8"))?.version; if (v) return String(v) } catch {}
  }
  return "0.0.0"
}
const version = detectVersion()

// ── 3) 组装 manifest（确定性输出：键排序、无时间戳，便于 git diff）──────────────
const paths = {}
for (const type of types) paths[type] = `${type}.${source.byType[type].ext}`
const manifest = { version, count: types.length, paths }

if (checkOnly) {
  console.log(`[check] 源：${source.sourceLabel}`)
  console.log(`[check] 版本：${version}　图标数：${types.length}`)
  console.log(`[check] 将写出：public/topo/icons/{${types.map((t) => paths[t]).join(", ")}}`)
  console.log("[check] OK（未写文件）")
  process.exit(0)
}

// ── 4) 落盘：清空旧的受管目录后重写（处理被运营端删掉的图标）──────────────────
fs.rmSync(outIconsDir, { recursive: true, force: true })
fs.mkdirSync(outIconsDir, { recursive: true })
for (const type of types) {
  fs.writeFileSync(path.join(outIconsDir, paths[type]), source.byType[type].bytes)
}
fs.writeFileSync(outManifest, JSON.stringify(manifest, null, 2) + "\n")

console.log(`✓ 图标同步完成：源=${source.sourceLabel}`)
console.log(`  写出 ${types.length} 个图标 → public/topo/icons/`)
console.log(`  清单 → public/topo/icon-manifest.json（version=${version}）`)
