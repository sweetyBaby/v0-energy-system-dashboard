# 总览拓扑：渲染引擎、规则与信号、运营端同步

> 适用范围：总览（运行总览 / realtime tab）中间那块拓扑图。涉及 `lib/topo/*`、
> `components/dashboard/topology/*`、`components/dashboard/project-topology-panel.tsx`、
> `public/topology-sample.json`、`scripts/build-topo-engine.mjs`、`vendor/topo-editor/*`。
>
> 一句话：**运营端**用编辑器配好拓扑+规则并导出画布 JSON；**前端**拉这份 JSON + 实时信号，
> 用**同一套求值逻辑**算出显隐/流向，再交给一个"只画图"的渲染引擎呈现。

---

## 1. 渲染链路总览

```
app/dashboard/page.tsx (realtime tab, 12 列栅格)
  └─ ProjectTopologyPanel            卡片外壳 + 全屏开关 + 节点点击路由
       └─ TopoCanvas                 数据层：拉布局 JSON + 每 2s 合并实时信号
            └─ TopologyView          视图层：canvas 容器 + 缩放/拖动/自适应/命中
                 └─ lib/topo/engine.ts   渲染引擎：真正往 canvas 上画（"哑"渲染器）
```

数据流（单向）：

```
TopoCanvas 拉 baseDoc(/topology-sample.json) + 每 2s makeMockSignals(t)
   │  signalsRef 累积合并（等价运营端 topo:merge：只发增量也能正确驱动）
   ▼
applySignals(baseDoc, signals)            // lib/topo/apply-signals.ts
   ├─ ① 信号分桶：节点字段值 / status（.online 仅参与规则，不显示为字段）
   ├─ ② resolveDynamic(doc, signals)      // lib/topo/rule-engine.ts ★规则引擎
   │      • buildContext：画布静态默认值 ← 实时信号覆盖
   │      • 节点 visibleWhen → nodeVisible[id]
   │      • 连线 visible = 两端节点都可见 && showWhen 命中
   │      • 连线 dir   = dirRules 顺序匹配，第一条命中决定；都不中用 e.dir 兜底
   └─ ③ 产出新 doc：节点带 visible、字段回写；连线带 dir/active
   ▼
TopologyView → engine.setData → 引擎只按"已定型的 doc"画
   docToInternal 过滤 visible===false 的节点 / active===false 的连线
```

**核心设计：显隐/流向在数据层算好，引擎只画。** 这正是运营端文档里的「方案 B（自研渲染器，用规则引擎，自己画图）」。我们没有走「把规则塞进渲染器」那条（见 §5）。

各层职责简表：

| 文件 | 职责 |
|---|---|
| `project-topology-panel.tsx` | 卡片外壳；布局地址 `SAMPLE_TOPOLOGY_URL`；全屏；节点点击 → 路由/切 tab |
| `topo-canvas.tsx` | 拉布局 JSON + 轮询实时信号；累积合并；纵览/运行状态页共用 |
| `apply-signals.ts` | 信号 → 布局的合并层（纯函数）：调规则引擎，产出新 doc |
| `rule-engine.ts` | 数据驱动规则引擎（运营端 runtime.js 的 TS 移植，1:1） |
| `topology-view.tsx` | canvas 交互：滚轮缩放、拖动平移、自适应、命中跳转、全屏 |
| `load-topology.ts` | 导出 JSON → 引擎内部结构的适配；图标加载 |
| `engine.ts` | 渲染引擎（半手工 fork，见 §4） |

---

## 2. 规则与信号（数据契约）

### 2.1 三种规则

规则是**纯 JSON**，挂在画布数据上，由内置引擎解释执行（**无 `eval`**，动态下发安全）。类型见 `lib/topo/topo-types.ts`：

| 规则 | 挂在 | 作用 | 字段 |
|---|---|---|---|
| 显示条件 | 节点 | 不满足 → 该节点**及其连线**隐藏 | `visibleWhen: TopoCond` |
| 显示条件 | 连线 | 不满足 → 该连线不画（适合"动态建立的连线"） | `showWhen: TopoCond` |
| 流向规则 | 连线 | 顺序匹配，第一条命中决定流向；都不中用 `e.dir` 兜底 | `dirRules: {when, dir}[]` |

`TopoCond` 是一棵条件树：

```jsonc
{ "var": "信号名", "op": "运算符", "val": 比较值 }     // 叶子：与常量比
{ "var": "信号名", "op": "运算符", "ref": "另一信号名" } // 叶子：与另一信号比
{ "all": [ ... ] }   // 且（全部满足）
{ "any": [ ... ] }   // 或（任一满足）
{ "not": ... }       // 非
// null / 不写 = 恒为真
```

运算符 `op`：`== != > >= < <= in between truthy falsy exists`
- 数字与字符串可互通（`true=="true"`、`0=="0"` 成立）
- `in`：`val` 逗号分隔，如 `"运行,充电"`；`between`：`val` 形如 `"20,80"`（含端点）
- **无值字段语义**：还没有值的字段（null/空串），数值比较一律不命中（"没有数据 ≠ 0"）；一旦有真实值（含 `0`）就按实际值判定

流向取值 `EdgeDir = "forward" | "reverse" | "both" | "none"`。

### 2.2 信号（同一份数据，两个用途）

实时数据是**扁平对象** `{ 信号名: 值 }`，命名规则：

| 类型 | 命名 | 示例 |
|---|---|---|
| 节点字段 | `节点id.字段名`（中文字段名） | `pcs_1.P(kW)`、`bms_1.SOC(%)` |
| 节点状态 | `节点id.status` | `pcs_1.status` = `"运行"` |
| 节点在线 | `节点id.online` | `gen_1.online` = `true`（仅参与规则，不显示为字段） |
| 全局信号 | `信号名` | `mode` = `"island"` |

**同一份信号同时**：① 喂规则求值（决定显隐/流向）；② 显示在节点字段卡片上。无需两份。
本地驱动见 `lib/topo/mock-signals.ts`（真实接口就绪后删除，后端按同一契约返回 `{信号名:值}` 即可，前端零改动）。

字段值显示：有值就显示（`0` 如实显示为 `0`）；`null`/空串/不传 → 显示空。

---

## 3. 与运营端的同步关系（规则：1:1）

`lib/topo/rule-engine.ts` 是运营端导出的 `runtime.js`（`resolveDynamic` / `buildContext` / `evalCond` / `cmpOp`）的 **TS 移植，逐行等价**：

- 运算符语义、显隐级联（端点隐藏 → 连线隐藏）、`dirRules` 顺序匹配 + `e.dir` 兜底 —— 全部一致；
- `buildContext` 已加 `nodeSupportsStateSignals` 守卫（text 节点不加 `.status`/`.online`），与运营端最后一处偏差也对齐。

即：**前端规则求值 = 运营端编辑器「预览效果」同一套逻辑。**

> 注意：运营端引擎在**运行时**实际走的是另一套与编辑器 DOM 耦合的 `computeDynamic`/`effDir`/`_dyn`；
> 我们**不**采用它（见 §5）。我们对齐的是它**导出**给"方案 B"用的那份自洁 `resolveDynamic`。

---

## 4. 引擎同步管线（engine.ts 是半手工 fork）

### 4.1 现状

`lib/topo/engine.ts` **不是纯生成物**，是「生成一次后大量手工调优」的**半手工 fork**，两层：

- **手工 / fork 部分**：header（含 `nodeScale`/`labelScale`/`fieldScale` 选项）、`drawAll`、`fitView`、
  动画循环、公共 API、以及整个 `draw*` 一族（剥离编辑态耦合 + 织入缩放定制）。**由我们维护，勿被覆盖。**
- **跟随上游部分**：几何 + 通道布线函数（**连线端口锚点能力在这里**）。

### 4.2 上游源

运营端已把原来的**单文件** `topo.html` 重构成正式工程，算法搬到了 `topology-editor.js`（`topo.html` 只剩壳子）。
我们把它 vendor 到 `vendor/topo-editor/topology-editor.js`（来自 `enercloud-platform/topo/topo-editor/`，见同目录 `SOURCE.txt`）。
**`topo.html` 不再是源。**

### 4.3 同步脚本：`scripts/build-topo-engine.mjs`

已从「按行号裁 + 整文件重生成」重写为 **「按函数名就地 upsert」**（幂等、冲突即报错）：

- `SYNC` 清单 = 布线 + 端口辅助函数：按大括号配平从上游抽取，**就地替换或插入**到 engine.ts；
- `PATCHES` = 重新织回我们的缩放定制（`nsz` → `*nodeScale`；`buildObstacleGrid` → `labelFontPx(n)/zoom`）；
- 其余（draw fork / header / footer）**一律不动**；
- 生成后断言：上游缺函数 / 补丁失配 → **报错退出**（不会默默生成坏引擎）。

用法：

```bash
# 运营端更新后：
cp <运营端>/topo-editor/topology-editor.js vendor/topo-editor/   # 1) 重新 vendor
node scripts/build-topo-engine.mjs                               # 2) 就地同步（--check 干跑）
git diff lib/topo/engine.ts                                      # 3) 核对
# 4) dev 验证（见 §6）
```

要引入上游**新的渲染能力**（不止布线）：把相关函数名加进 `SYNC` 即可。

> **运营端再更新时的完整流程、报错处理与自检清单见 §8「运营端更新维护手册」。**

### 4.4 端口能力（本次同步的重点）

运营端这轮新增「连线端口锚点」：连线带 `fromPort`/`toPort`，连到节点**指定侧**（上/下/左/右/线上比例点），
而非默认按几何方向。布线函数（`clipEnds`/`routeOrtho`/`edgePathRaw`/`channelRoute`/`straightVariants`/
`detourRoute`/`applyBusMerge` 等）改为用 `edgeAnchorPoint(..., e.fromPort)`；同时新增一批端口辅助函数
（`edgeAnchorPoint`/`portSide`/`isLinearBusNode`/`nodePortPoint`/`_pathScore` 等）。我们的样例数据本就带 ports，
此前引擎没有端口函数 → 一直在忽略端口，本次补齐。

---

## 5. 架构取舍：为什么不"全量同步"

运营端运行时把规则求值**搬进了渲染器**（`computeDynamic`/`effDir`/`edgeCfg`/`_dyn`/`_drawAlpha`/虚化绘制），
且与编辑器 DOM 深度耦合。若照搬，会把一坨编辑器耦合代码 + DOM 桩塞进 engine.ts，风险高，且方向上是
**从更干净的分层倒退回单体**。

我们保持「**引擎只画、规则在数据层**」（= 运营端 Readme 的方案 B），并以运营端导出的 `resolveDynamic` 为准
保证规则语义 1:1。结论：**路由层并入端口能力，规则层对齐导出语义，引擎不碰编辑器耦合。**

---

## 6. 验证方法（重要：dev server 来自另一副本）

磁盘上有**两个副本**：

- `e:/01_code/v0-energy-system-dashboard` —— 本仓库 / 编辑落点；
- `e:/01_code/enercloud-platform/v0-energy-system-dashboard` —— **另一个 checkout，用户的 `next dev` 实际在跑它**。

⇒ 改本仓库的文件，**不会**反映到 `localhost:3000`，新路由在那边会 404。**别用 :3000 验证本仓库改动。**

验证步骤：

```bash
# 从本仓库另起 dev server
npx next dev -p 3001
```

对于登录拦截 / canvas 视图，临时加一个**可路由**页 `app/<name>/page.tsx`
（**不要** `app/_<name>/`：下划线开头是私有目录、不参与路由），直接挂 `TopoCanvas`
（只依赖 `/topology-sample.json` + mock 信号，无需后端），无头截图后删除：

```bash
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
"$EDGE" --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
  --window-size=1700,820 --virtual-time-budget=9000 \
  --screenshot="C:\绝对路径\out.png" "http://localhost:3001/<name>"
# 注意：Edge 用自己的 CWD 解析相对路径 → --screenshot 必须给绝对 Windows 路径
```

---

## 7. 样例规则参考 & 自查导出数据

`public/topology-sample.json` 已补回三条规则作为可运行参考（也是运营端导出该有的格式）：

```jsonc
// 节点 solar_1：夜间（P(kW)≤0）整体隐藏（含连线）
"visibleWhen": { "var": "solar_1.P(kW)", "op": ">", "val": 0 }

// 连线 gen_1→pcs_1：发电机离线时联络线消失
"showWhen": { "var": "gen_1.online", "op": "truthy" }

// 连线 pcs_1→bms_1：I(A) 正充负放，流向随符号翻转
"dirRules": [
  { "when": { "var": "pcs_1.I(A)", "op": ">", "val": 0 }, "dir": "forward" },
  { "when": { "var": "pcs_1.I(A)", "op": "<", "val": 0 }, "dir": "reverse" },
  { "when": { "var": "pcs_1.I(A)", "op": "==", "val": 0 }, "dir": "none" }
]
```

实测（固定信号双场景）：白天 PV 可见 + 发电机联络线在 + PCS→BMS 正向；夜间 PV 及其连线隐藏 +
发电机联络线消失 + BMS→PCS 反向 —— 三条规则全部正确触发。

**重新从运营端导出后，按此自查是不是导出数据的问题：**

1. **规则键是否存在** —— 搜 `visibleWhen` / `showWhen` / `dirRules`，一个都搜不到 = 导出没带规则；
2. **信号名是否精确匹配** —— `var`（如 `pcs_1.I(A)`）必须 = 「节点 id . 中文字段名」，差一个字符就永远不命中；
3. **区分"注入信号(测试)"与"规则"** —— 注入信号只是本地测试值、**不随导出**；真正导出的是配在元素/连线属性面板里的规则；
4. **导出入口** —— 用「⬇ 下载画布 JSON」（含节点/连线/规则/全局信号），不要用只含布局的其它导出。

导出后直接替换 `public/topology-sample.json` 即可，前端规则链路已就绪、无需改代码。
若替换后规则仍不生效，对照上面 4 项排查，或保留导出 JSON 比对。

---

## 8. 运营端更新维护手册（runbook）

运营端 `topology-editor.js` 又更新时，按下面流程处理。**先判断属于哪类改动，再对应处理——不要无脑重跑。**

### 8.1 先判断要不要同步、同步哪一层

| 改动类型 | 表现 | 怎么办 |
|---|---|---|
| **纯数据 / 布局** | 运营端只是新增节点/连线/字段、改某项目拓扑、重新导出 JSON | **不动代码**。替换 `public/topology-sample.json`（或走接口）即可。仅当新增了**全新连线类型**时，确认导出的 `edgeStyles` 带上该类型 |
| **渲染 / 布线算法** | 改了走线几何、母线汇流、端口、节点/字段绘制 | **同步引擎** → §8.2 |
| **规则语义** | 改了 runtime.js 的运算符 / 求值逻辑 | **对齐规则引擎** → §8.3 |
| **文件结构重构** | 又拆/挪了文件、改了函数名 | 同步引擎时脚本会报错指出，按 §8.2 的报错处理 |

> 怎么知道改了哪类？重新 vendor 后 `git diff vendor/topo-editor/topology-editor.js`，或先 `node scripts/build-topo-engine.mjs --check` 看报告/报错。

### 8.2 同步引擎（布线 / 端口 / 几何）

```bash
cp <运营端>/topo-editor/topology-editor.js vendor/topo-editor/   # 1) 重新 vendor（顺手更新 SOURCE.txt 的 mtime）
node scripts/build-topo-engine.mjs --check                       # 2) 干跑：看「替换/新增/补丁」数，确认无报错
node scripts/build-topo-engine.mjs                               # 3) 写入 engine.ts
git diff lib/topo/engine.ts                                      # 4) 核对（见 §8.4）
# 5) dev 验证（§6）
```

**脚本三种报错与处理：**

| 报错 | 含义 | 处理 |
|---|---|---|
| `上游找不到函数「X」` | 上游重命名/删除了 X | 到 `vendor/topo-editor/topology-editor.js` 搜它的新名，更新脚本里 `SYNC_ROUTING`/`SYNC_PORTS` 清单（改名或删除已不存在的） |
| `缩放补丁失配：「find」命中 N 次（应为 1）` | 上游改了被补丁命中的那行 | 打开上游对应函数，找到等价新行，更新脚本 `PATCHES` 里的 `find`/`replace` |
| `engine.ts 缺少依赖符号「X」` / `找不到插入锚点` | 手工 fork（header/draw）被破坏 | 先 `git checkout -- lib/topo/engine.ts` 恢复，排查 fork 是否被误删，再同步 |

**引入上游新能力：** 上游新增了我们也要的渲染函数 → 把函数名加进 `SYNC`（布线类放 `SYNC_ROUTING`，新辅助放 `SYNC_PORTS`），如需定制再在 `PATCHES` 补。

**⚠️ `draw*` 一族默认不跟随**（它们是我们的 fork）。若确实要并入上游对 `drawEdge`/`drawNode` 等的改动，**不要直接加进 `SYNC`**——必须**人工三方合并**：只取几何/视觉改动，**丢弃** `_dyn`/`effDir`/`edgeCfg`/`_drawAlpha`/`previewMode`/虚化徽标等编辑器耦合，**保留**我们的 `labelScale`/`fieldScale`/`nodeScale` 缩放（理由见 §5）。

### 8.3 对齐规则引擎（rule-engine.ts，罕见）

仅当运营端改了 runtime.js 的求值逻辑时：

- 权威源 = 上游 `topology-editor.js` 里 **`export function resolveDynamic`/`buildContext`/`evalCond`/`cmpOp`**（在一段模板字符串里，搜 `export function resolveDynamic`；这段是运营端"导出给方案 B 的 runtime.js"源文本，自洁无 DOM）；
- 逐行对照更新 `lib/topo/rule-engine.ts`；
- **保留我们有意的适配**：我们的 `resolveDynamic` 返回 `{ ctx, nodeVisible, edges:[{visible,dir}] }`（供 `apply-signals` 合并），上游返回 `{ ctx, nodes, edges }`——**别照搬返回结构**，只对齐求值语义；
- 保留 `nodeSupportsStateSignals` 守卫。

### 8.4 同步后自检清单

- [ ] `git diff lib/topo/engine.ts` 只动了预期函数；缩放补丁仍在（`grep -c "nodeScale\|labelScale\|fieldScale" lib/topo/engine.ts` 不应骤减）
- [ ] `npx tsc --noEmit` 通过（engine.ts 有 `@ts-nocheck`，exit 0 即语法有效）
- [ ] dev（:3001）截图：端口连线 / 流向 / 显隐 / 字段 / 缩放 / 点击跳转 / 全屏 均正常
- [ ] 幂等：再跑 `--check`，**新增应为 0**（否则说明有函数没被正确替换）
- [ ] 提交时带上 `vendor/topo-editor/topology-editor.js`（上游快照）+ `engine.ts`，便于下次 `git diff` 看上游到底改了什么

---

## 9. 关联记忆 / 文档

- 运营端接入契约：`vendor/topo-editor/Readme.md`（方案 A/B、postMessage、信号契约、规则结构）
- 渲染"屏幕恒定尺寸"与 overlap：见仓库内拓扑布局相关说明
