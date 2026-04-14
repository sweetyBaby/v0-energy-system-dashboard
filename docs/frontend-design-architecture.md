# 前端设计与架构说明

## 1. 文档目标

这份文档面向第一次接手该项目的前端同学，目标是解决三个问题：

1. 这个项目的前端整体是怎么组织的。
2. 我应该从哪里开始看代码，才能快速建立全局认知。
3. 如果我要新增一个页面能力、图表组件或接口，应该按什么方式落地。

本文档基于当前仓库代码结构整理，重点覆盖：

- 技术栈与运行方式
- 目录分层与职责边界
- 页面结构与业务模块
- 数据流、接口封装与代理链路
- 状态管理与轮询模式
- 样式体系与大屏适配方式
- 新功能开发建议
- 当前架构风险与后续优化方向

---

## 2. 项目定位

这是一个面向储能/BMS 场景的前端大屏项目，特点不是“多页面后台”，而是：

- 基于 `Next.js App Router` 的单路由应用
- 首页 `app/page.tsx` 承担主容器与业务编排
- 通过顶部 Tab 在单页面内切换不同业务视图
- 页面主体由多个高密度图表、监控卡片和历史回放面板组成
- 存在明显的大屏风格设计和持续轮询的实时数据场景

从用户视角看，当前系统主要包含以下业务区：

- 总览
- 运行状态
- 告警监测
- 电芯历史
- 数据分析
- 报表信息

---

## 3. 技术栈概览

### 3.1 核心框架

| 类别 | 当前方案 | 说明 |
| --- | --- | --- |
| 前端框架 | `Next.js 16` | 使用 App Router，项目当前核心页面集中在 `app/page.tsx` |
| 视图库 | `React 19` | 组件基本采用函数组件 + Hooks |
| 语言 | `TypeScript` | `tsconfig.json` 中启用 `strict: true`，但构建配置里暂时忽略 TS 错误 |
| 包管理 | `pnpm` | `packageManager` 指定为 `pnpm@10.18.2` |

### 3.2 UI 与样式

| 类别 | 当前方案 | 说明 |
| --- | --- | --- |
| 原子样式 | `Tailwind CSS 4` | 样式大量直接写在组件内 |
| 组件基础库 | `Radix UI` | 配合 `components/ui/*` 的封装使用 |
| UI 代码来源 | `shadcn/ui` 风格封装 | `components/ui` 下是通用基础组件 |
| 动效 | `tw-animate-css` | 主要用于动画基础能力 |
| 图表 | `Recharts` | 大部分业务图表基于它实现 |
| 图标 | `lucide-react` | 通用图标来源 |

### 3.3 状态与数据

| 类别 | 当前方案 | 说明 |
| --- | --- | --- |
| 全局状态 | React Context | 目前主要有 `LanguageProvider`、`ProjectProvider` |
| 页面状态 | 组件内 `useState/useEffect` | 主页面和业务组件各自维护局部状态 |
| 数据请求 | `fetch` + 本地封装 | 通过 `lib/api-client.ts` 和 `lib/api/*` 统一处理 |
| 接口代理 | Next Route Handler | 浏览器侧请求统一走 `app/api/proxy/[...path]/route.ts` |

### 3.4 当前需要特别知道的工程事实

1. `next.config.mjs` 中开启了 `typescript.ignoreBuildErrors = true`。这意味着“能构建”不等于“类型正确”，接手开发时要主动关注 TS 报错。
2. 项目当前没有显式接入 React Query、Redux、Zustand 这类状态库，数据流主要靠“Context + 组件内 effect”。
3. 项目中的很多业务组件体积较大，属于“功能完整但耦合偏高”的阶段，新人阅读时要先抓住数据入口和渲染出口，不要一开始试图逐行理解所有 UI 细节。

---

## 4. 建议的上手顺序

如果你是第一次进入这个项目，建议按下面顺序看代码。

### 第一步：看运行入口

- `package.json`
- `app/layout.tsx`
- `app/page.tsx`

这一步的目标是确认：

- 项目如何启动
- 根布局做了什么
- 当前应用是否为单页编排模式

### 第二步：看全局上下文

- `components/language-provider.tsx`
- `components/dashboard/dashboard-header.tsx`

这一步的目标是确认：

- 全局语言状态怎么切换
- 当前选中项目是怎么在页面里共享的
- 顶部头部与项目切换是如何驱动业务数据变更的

### 第三步：看数据层

- `lib/api-client.ts`
- `lib/api/endpoints.ts`
- `app/api/proxy/[...path]/route.ts`
- `lib/api/project.ts`
- `lib/api/power.ts`
- `lib/api/overview.ts`
- `lib/api/operations.ts`
- `lib/api/heatmap.ts`
- `lib/api/cell-history.ts`
- `lib/api/daily-trend-range.ts`

这一步的目标是确认：

- 前端请求到底打到哪里
- 为什么浏览器里看到的是 `/api/proxy/*`
- 后端原始字段是如何在前端被标准化的

### 第四步：看一个完整业务组件

建议优先读以下任意一个：

- `components/dashboard/power-curve-query.tsx`
- `components/dashboard/comprehensive-efficiency-panel.tsx`
- `components/dashboard/cell-history-replay-panel.tsx`

这一步的目标是确认：

- 一个图表型组件通常如何组织状态
- 如何发请求、处理 loading、处理空数据
- 如何做大屏视觉和自适应

---

## 5. 目录结构与职责

下面是当前项目最重要的目录职责。

```text
app/
  layout.tsx                    根布局
  page.tsx                      主页面容器，负责 Tab 编排
  api/proxy/[...path]/route.ts  浏览器侧接口代理

components/
  dashboard/                    业务组件，基本都是大屏模块
  ui/                           通用 UI 基础组件
  language-provider.tsx         语言上下文
  theme-provider.tsx            主题上下文（当前主页面未明显依赖）

hooks/
  use-fluid-scale.ts            大屏字体/尺寸流式缩放
  use-mobile.ts                 设备尺寸辅助
  use-toast.ts                  toast 能力

lib/
  api-client.ts                 fetch 基础封装
  api/                          业务接口封装与数据标准化
  utils.ts                      通用工具

docs/
  *.md                          项目文档

public/
  图标、占位图等静态资源
```

### 5.1 `app/` 层职责

`app` 是 Next.js 的路由层，但当前项目并没有拆成多个业务路由，而是：

- 用 `app/layout.tsx` 负责全局 HTML、metadata、全局样式
- 用 `app/page.tsx` 承担整个大屏应用的业务入口
- 用 `app/api/proxy/[...path]/route.ts` 做接口反向代理

也就是说，这个项目的“前端路由复杂度”不高，但“单页业务复杂度”很高。

### 5.2 `components/dashboard/` 层职责

这是当前项目最核心的业务层。

这里的组件大致可以分成三类：

1. 业务面板组件  
   例如：
   - `realtime-status-board.tsx`
   - `power-curve-query.tsx`
   - `comprehensive-efficiency-panel.tsx`
   - `cell-history-replay-panel.tsx`
   - `alarm-log-panel.tsx`
   - `report-center-panel.tsx`

2. 业务交互组件  
   例如：
   - `history-date-picker.tsx`
   - `custom-range-picker.tsx`
   - `dashboard-header.tsx`

3. 历史/保留组件  
   例如部分 `energy-*`、`power-*`、`project-info.tsx`、`header.tsx` 等文件，当前主页面并没有全部使用。接手时不要默认它们仍是主链路组件，需要先回到 `app/page.tsx` 确认真实入口。

### 5.3 `components/ui/` 层职责

这一层是基础 UI 组件层，作用是：

- 提供 Button、Popover、Dialog、Tabs、Table、Select 等基础能力
- 避免业务组件重复实现基础交互
- 让业务组件尽量聚焦在业务结构和视觉表达上

使用建议：

- 通用交互优先复用 `components/ui/*`
- 不要把 BMS 业务逻辑放到 `components/ui/*`
- 业务视觉封装应优先落在 `components/dashboard/*`

### 5.4 `lib/api/` 层职责

这一层非常关键。它不只是“写请求地址”，更重要的是：

- 统一封装接口请求
- 将后端返回的原始字段标准化成前端可直接消费的数据结构
- 将空值、异常值、单位换算、默认占位值等逻辑收敛到数据层

这是当前项目前后端协作里最有价值的一层抽象。

---

## 6. 页面架构与业务编排

### 6.1 整体结构

`app/page.tsx` 是当前应用的前端主编排文件，主要职责有：

- 定义 Tab 枚举和顶部导航元数据
- 初始化页面级状态
- 组合 `LanguageProvider` 和 `ProjectProvider`
- 根据当前 `activeTab` 决定渲染哪一类业务面板
- 控制部分跨面板的公共状态，例如：
  - 当前日期
  - 分析范围
  - 电芯历史视图模式
  - 当前选中电芯

可以把它理解为“Dashboard Shell”。

### 6.2 主页面的核心编排关系

```text
EnergyStorageDashboard
  ├─ LanguageProvider
  ├─ ProjectProvider
  ├─ DashboardHeader
  └─ DashboardTabs
       ├─ realtime            总览
       ├─ history             运行状态
       ├─ alarm-monitoring    告警监测
       ├─ cell-history        电芯历史
       ├─ analysis            数据分析
       └─ reports             报表信息
```

### 6.3 各 Tab 与核心组件映射

| Tab Key | 业务含义 | 核心组件 |
| --- | --- | --- |
| `realtime` | 总览 | `RealtimeStatusBoard`、`ChargeDischargeTable`、`ComprehensiveEfficiencyPanel`、`PowerCurveQuery` |
| `history` | 运行状态 | `BCUStatusQuery`、`CellHeatmapOverviewPanel` |
| `alarm-monitoring` | 告警监测 | `BCUStatusQuery`、`AlarmLogPanel` |
| `cell-history` | 电芯历史回放 | `CellHistoryReplayPanel`、`HistoryDatePicker` |
| `analysis` | 电压/温差/电芯分析 | `VoltageDifferenceAnalysis`、`TemperatureDifferenceAnalysis`、`CellVoltageAnalysis` |
| `reports` | 报表中心 | `ReportCenterPanel` |

### 6.4 为什么 `app/page.tsx` 会比较大

这是当前项目的一个明显架构特征：

- 所有主业务在一个页面内编排
- 多个 Tab 共享项目上下文
- 若拆成多路由，会增加切换成本和状态维护复杂度

所以当前选择是合理的，但代价也很明确：

- 页面文件过长
- 业务状态容易堆积
- 新人会先在这里“被信息量冲击”

因此后续如继续扩展，可以考虑把 `DashboardTabs` 下的每个 Tab 再拆为独立容器组件。

---

## 7. 数据流与接口架构

这是新人最需要先看懂的一部分。

### 7.1 浏览器侧数据流

```text
业务组件
  -> lib/api/*.ts
  -> lib/api-client.ts
  -> /api/proxy/*
  -> 后端 API
  -> 返回原始数据
  -> lib/api/*.ts 标准化
  -> 组件消费标准化后的数据
```

### 7.2 为什么有 `/api/proxy`

`lib/api-client.ts` 中定义了：

- 服务端运行时：直接使用 `API_BASE_URL`
- 浏览器运行时：统一请求 `/api/proxy`

这样做的目的通常有三个：

1. 避免浏览器直接暴露后端真实地址
2. 规避跨域问题
3. 统一浏览器和服务端的数据访问入口

对应实现位置：

- 基础请求封装：`lib/api-client.ts`
- 代理实现：`app/api/proxy/[...path]/route.ts`

### 7.3 接口地址如何管理

`lib/api/endpoints.ts` 统一维护后端接口路径，不建议在业务组件里手写 `/ems/...`。

当前按领域分组：

- `overview`
- `power`
- `operations`
- `heatmap`
- `cellHistory`
- `analysis`

这样做的意义：

- 便于定位接口归属
- 修改接口路径时集中处理
- 避免组件里散落硬编码地址

### 7.4 数据标准化原则

以 `lib/api/project.ts` 为例，数据层做了几件很重要的事：

1. 定义原始类型 `RawProjectDetail`、`RawProjectRealtime`
2. 定义前端视图类型 `ProjectDetailView`、`RealtimeSnapshotView`
3. 把空值统一转为占位值 `--`
4. 处理单位换算，例如 `Wh -> kWh / MWh`
5. 推导前端更好用的展示字段，例如在线状态、充放电状态等

这意味着：

- 业务组件应该尽量消费“标准化后的视图数据”
- 后端返回结构变动时，优先修改 `lib/api/*`
- 不要把大量数据清洗逻辑写在图表组件内部

### 7.5 当前几个主要数据域

| 模块 | 主要文件 | 职责 |
| --- | --- | --- |
| 项目总览 | `lib/api/project.ts` | 项目详情、实时概览、顶部概况卡片 |
| 综合效率 | `lib/api/overview.ts` | 日统计、效率图表、表格数据 |
| 功率曲线 | `lib/api/power.ts` | 今日/昨日/区间功率曲线、增量轮询合并 |
| 运行状态 | `lib/api/operations.ts` | 辅助系统、电压/温度趋势近期与增量数据 |
| 热力图 | `lib/api/heatmap.ts` | 温度/电压热力图 |
| 电芯历史 | `lib/api/cell-history.ts` | 历史回放、概览、明细、多曲线数据 |
| 数据分析 | `lib/api/daily-trend-range.ts` | 日期范围分析汇总与趋势 |

---

## 8. 状态管理设计

当前状态管理采用“少量全局 Context + 大量组件局部状态”的模式。

### 8.1 全局状态

#### `LanguageProvider`

文件：`components/language-provider.tsx`

职责：

- 维护当前语言 `zh/en`
- 提供 `t(key)` 翻译函数

适用范围：

- 文案较简单的场景
- 顶部头部、基础标签等通用文案

注意点：

- 当前文案维护方式是手写对象，适合规模较小项目
- 如果后续文案增多，建议拆分字典文件或引入更规范的 i18n 方案

#### `ProjectProvider`

文件：`components/dashboard/dashboard-header.tsx`

职责：

- 维护当前选中项目
- 缓存项目详情与实时数据
- 提供切换项目后的重新拉取能力

这是项目里最重要的业务上下文之一，因为很多面板都依赖 `selectedProject.projectId`。

### 8.2 页面局部状态

`app/page.tsx` 中维护的典型页面状态包括：

- 当前 Tab
- 告警监测模式：实时 / 历史
- 历史查询日期
- 分析时间范围
- 电芯历史的总览 / 明细模式
- 当前选中的电芯或电芯列表

这种做法适合“状态只在当前页面编排层有意义”的场景。

### 8.3 组件局部状态

具体业务组件内部通常还会维护：

- loading 状态
- error 状态
- 日期范围
- 图表缩放范围
- 隐藏/显示的图例系列
- 当前 hover / 拖拽 / 轮询状态

例如：

- `PowerCurveQuery` 里维护实时轮询、视窗范围、拖动状态
- `ComprehensiveEfficiencyPanel` 里维护图例显隐、图表/表格切换、拖动缩放
- `CellHistoryReplayPanel` 内维护较复杂的多图表、多面板、多缓存状态

### 8.4 当前状态管理的优点与边界

优点：

- 不需要额外状态库
- 组件自治性强
- 对当前单页大屏项目足够直接

边界：

- 跨面板状态共享能力有限
- 复杂组件会越来越大
- 请求缓存和失效策略主要依赖手工控制

如果未来数据复杂度继续上升，可以考虑在“请求缓存与轮询管理”层引入 React Query 一类方案，但当前项目还没有到必须重构的程度。

---

## 9. 实时轮询与副作用模式

该项目是典型的实时监控大屏，所以要特别关注 effect 的写法。

### 9.1 当前常见副作用模式

1. 初始化拉取一次
2. 使用 `setInterval` 定时轮询
3. 在 `useEffect` 清理函数里销毁定时器
4. 使用 `AbortController` 取消未完成请求
5. 在组件卸载或依赖变化时避免脏数据回写

这在以下位置比较明显：

- `app/page.tsx` 中的总览初始化与 10 秒轮询
- `components/dashboard/power-curve-query.tsx` 中的今日功率增量轮询
- 分析页和历史页中的区间请求与取消控制

### 9.2 新代码应该延续的模式

如果你新增需要轮询的组件，建议遵守以下规范：

1. 请求函数放到 `lib/api/*`
2. 组件内部只管调度，不要写大量字段清洗
3. effect 中使用 `cancelled` 或 `AbortController`
4. 清理掉 `setInterval`
5. 切项目、切日期、切查询范围时重置旧数据

一个可复用的思路如下：

```tsx
useEffect(() => {
  let cancelled = false
  const controller = new AbortController()

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchSomething(params, { signal: controller.signal })
      if (!cancelled) setData(data)
    } catch (error) {
      if (!cancelled && !controller.signal.aborted) {
        setData([])
      }
    } finally {
      if (!cancelled) setLoading(false)
    }
  }

  void load()
  const timer = window.setInterval(() => void load(), 6000)

  return () => {
    cancelled = true
    controller.abort()
    window.clearInterval(timer)
  }
}, [params])
```

---

## 10. 设计系统与视觉约束

这个项目不是通用后台管理界面，而是“科技感大屏”。新人开发时，视觉风格必须保持一致。

### 10.1 整体视觉特征

从现有代码看，当前视觉语言具有这些固定特征：

- 深色背景为主，偏蓝青色科技风
- 面板大量使用渐变、边框高光、发光阴影
- 标题与指示器常用青色、亮蓝、绿色强调
- 图表区域通常带有轻度纹理、渐变遮罩和发光效果
- 头部区域视觉较强，带扫描线、边缘装饰和动态光效

### 10.2 全局主题变量

`app/globals.css` 中定义了主题变量，例如：

- `--background`
- `--foreground`
- `--primary`
- `--secondary`
- `--chart-*`
- `--border`

虽然很多业务组件仍然直接写了大量十六进制颜色，但全局变量仍然是主题基线，后续如果要收敛样式，应该从这里开始。

### 10.3 大屏视觉实现方式

当前大屏视觉主要依赖三种手段：

1. Tailwind 原子类直接拼装
2. 内联 `linear-gradient / radial-gradient / box-shadow / clip-path`
3. 业务组件内部的局部结构化视觉容器

这意味着：

- 视觉表达高度灵活
- 组件可定制性高
- 但样式复用度偏低

### 10.4 样式开发建议

新增业务组件时，建议遵守以下约束：

1. 先复用已有面板边框、背景、标题条风格
2. 不要突然引入与现有风格不一致的浅色卡片或扁平化样式
3. 图表颜色优先沿用当前项目色盘
4. 标题、按钮、状态点尽量延续青蓝绿系主色
5. 只有通用样式才进入 `globals.css`，业务专属视觉尽量留在组件内部

---

## 11. 大屏适配策略

大屏项目和普通 Web 页面最大的不同，是“尺寸变化时不只是布局变化，字体、控件、图表也要一起缩放”。

### 11.1 当前核心方案：`useFluidScale`

文件：`hooks/use-fluid-scale.ts`

该 Hook 提供：

- 容器尺寸监听
- 根字号计算
- `fluid(min, max)` 数值插值
- `chart(min, max)` 图表字号插值
- `rem()` / `clampText()` 工具方法
- `rootStyle` 变量输出

实际作用是：

- 面板字体不会写死
- 在 1180 到 1920 等不同宽度下能平滑缩放
- 图表坐标轴、标题、按钮尺寸能随容器变化

### 11.2 当前适配实践

主要有两种使用方式：

1. 页面级缩放  
   例如 `app/page.tsx` 中对总览区和内容区分别设定缩放上下限。

2. 面板级缩放  
   例如 `PowerCurveQuery`、`ComprehensiveEfficiencyPanel`、`CellHistoryReplayPanel` 等组件内部单独调用 `useFluidScale`。

### 11.3 新组件的建议

如果你新增的是普通小控件，可以不必上来就接入 `useFluidScale`。

如果你新增的是以下类型组件，则建议直接接入：

- 图表面板
- 多列信息卡片
- 在 1366 / 1600 / 1920 等分辨率都需要可用的复杂容器

原则是：

- 容器越复杂，越应该在组件层自己持有缩放逻辑
- 不要把所有尺寸都写成固定像素值

---

## 12. 主要业务模块说明

本节帮助新人快速建立“每个模块大概管什么”的认知。

### 12.1 顶部头部：`DashboardHeader`

文件：`components/dashboard/dashboard-header.tsx`

职责：

- 页面标题
- Tab 切换
- 当前时间显示
- 项目切换
- 中英文切换

额外说明：

- 这个文件除了 UI 头部，还同时承载了 `ProjectProvider`
- 从架构纯度上说，Provider 和 Header UI 放在一个文件里耦合偏高
- 但从当前项目体量看，尚可接受

### 12.2 总览页

主要由以下部分组成：

- `RealtimeStatusBoard`
- `ChargeDischargeTable`
- `ComprehensiveEfficiencyPanel`
- `PowerCurveQuery`

其中：

- `RealtimeStatusBoard` 偏实时状态卡片
- `ComprehensiveEfficiencyPanel` 偏日级统计分析
- `PowerCurveQuery` 偏曲线查询和实时增量展示

### 12.3 运行状态页

主要组件：

- `BCUStatusQuery`
- `CellHeatmapOverviewPanel`

特点：

- 更偏设备与单体状态分布
- 图形密度高
- 与实时/增量接口关系更强

### 12.4 告警监测页

主要组件：

- `BCUStatusQuery`
- `AlarmLogPanel`

特点：

- 存在实时与历史模式切换
- 同时依赖项目和日期条件

### 12.5 电芯历史页

主要组件：

- `CellHistoryReplayPanel`

这是当前最复杂的业务组件之一，承担了：

- 历史概览
- 单体筛选
- 多曲线对比
- 极值趋势
- 电压/温度多指标联动

如果后续维护这个模块，建议先从其数据加载入口和主要导出类型看起，而不是从 JSX 结构硬啃。

### 12.6 数据分析页

主要组件：

- `VoltageDifferenceAnalysis`
- `TemperatureDifferenceAnalysis`
- `CellVoltageAnalysis`

特点：

- 共享同一份区间分析数据
- 页面层负责拉取，子组件负责展示

这种模式是当前项目里比较好的“父组件取数、子组件纯展示”实践，后续新增相近分析模块可以优先参考。

### 12.7 报表中心页

主要组件：

- `ReportCenterPanel`

当前更多偏展示型，可作为后续扩展导出、报表生成、状态跟踪的承载点。

---

## 13. 新功能开发落地指南

这一节最适合新人真正动手时参考。

### 13.1 新增一个接口

推荐步骤：

1. 在 `lib/api/endpoints.ts` 中登记接口地址
2. 在对应的 `lib/api/*.ts` 中新增请求函数
3. 在数据层处理：
   - 类型定义
   - 空值处理
   - 单位转换
   - 前端展示模型标准化
4. 在业务组件中调用数据层函数

不建议：

- 在组件里直接写 `/ems/xxx`
- 在组件里直接拼一堆后端字段兼容逻辑

### 13.2 新增一个面板组件

推荐步骤：

1. 在 `components/dashboard/` 新建组件
2. 先确定它属于哪个 Tab
3. 如需请求数据，先落到 `lib/api/*`
4. 组件内部统一处理 loading / empty / error
5. 如需自适应，接入 `useFluidScale`
6. 最后在 `app/page.tsx` 对应区域挂载

### 13.3 新增一个 Tab

需要同步改动的点通常有：

1. `app/page.tsx` 中新增 `DashboardTab` 类型
2. 扩展 `TAB_META`
3. 加入 `tabs` 数组来源
4. 在 `DashboardTabs` 中增加对应分支
5. 如果涉及新的共享状态，决定它应该放在：
   - 页面层
   - 组件层
   - 或新的 Context

### 13.4 新增一个图表

推荐先回答四个问题：

1. 图表数据是实时的，还是区间查询的？
2. 图表是单项目维度，还是多电芯/多指标维度？
3. 需要轮询吗？
4. 需要缩放、拖动、图例显隐吗？

如果答案里包含：

- 轮询
- 多系列切换
- 缩放拖拽
- 大量 tooltip 自定义

那么建议直接参考：

- `PowerCurveQuery`
- `ComprehensiveEfficiencyPanel`
- `CellHistoryReplayPanel`

---

## 14. 开发规范建议

结合当前代码现状，建议后续开发遵守以下约定。

### 14.1 接口层规范

1. 所有后端地址统一走 `lib/api/endpoints.ts`
2. 所有请求统一走 `lib/api-client.ts`
3. 所有字段兼容、默认值、单位换算优先放在 `lib/api/*`
4. 浏览器侧不要绕过 `/api/proxy`

### 14.2 组件层规范

1. 业务组件放 `components/dashboard`
2. 通用基础组件放 `components/ui`
3. 不要把大型业务逻辑塞进 `components/ui`
4. loading / empty / error 状态尽量标准化

### 14.3 状态规范

1. 仅当前页面使用的状态，优先放组件内部或 `app/page.tsx`
2. 多个模块共享的业务状态，再考虑 Context
3. 涉及轮询的 effect 一定要有清理逻辑

### 14.4 文案规范

1. 中英文共存的界面，文案要同时补齐
2. 新增文案优先集中管理，不要散落魔法字符串
3. 当前仓库里部分中文显示存在编码可读性风险，修改文案前先确认 IDE 文件编码统一为 UTF-8

### 14.5 样式规范

1. 保持深色科技大屏风格
2. 复用现有面板容器视觉
3. 避免引入明显不一致的配色体系
4. 图表组件优先保持现有坐标、提示框、图例风格统一

---

## 15. 当前架构的优点、问题与优化建议

### 15.1 当前优点

1. 业务功能集中，单页体验顺滑
2. 接口层已有较明确的分层
3. 数据标准化意识比较好
4. 大屏视觉风格统一度较高
5. 复杂图表交互能力已经比较完整

### 15.2 当前问题

1. `app/page.tsx` 偏大，编排职责较重
2. 若干业务组件文件体积过大，阅读成本高
3. Provider 与 UI 头部耦合在同一文件
4. `next.config.mjs` 暂时忽略 TS 构建错误，存在类型风险
5. 样式复用度一般，很多颜色和容器效果仍是组件内硬编码
6. 当前看不到测试体系与更严格的静态检查链路
7. README 仍保留较多模板化内容，对新人帮助有限

### 15.3 建议的后续优化顺序

优先级建议如下：

1. 将 `app/page.tsx` 的各 Tab 抽成独立容器组件
2. 拆分超大业务组件中的“数据 hooks / 纯展示子组件 / 图表渲染器”
3. 将重复的面板容器视觉沉淀为少量业务级壳组件
4. 收紧 TypeScript 构建错误策略
5. 补齐前端开发文档、接口约定和提测说明

---

## 16. 新人首周建议

如果你是新加入项目的同学，建议首周按下面方式进入：

### 第 1 天

- 跑通项目
- 阅读本篇文档
- 看 `app/page.tsx`、`dashboard-header.tsx`、`lib/api-client.ts`

### 第 2 天

- 选一个简单模块，例如 `PowerCurveQuery`
- 理清它的数据来源、状态、图表渲染逻辑

### 第 3 天

- 再看一个复杂模块，例如 `ComprehensiveEfficiencyPanel`
- 理解区间查询、视图切换、表格与图表复用数据的方式

### 第 4-5 天

- 阅读 `CellHistoryReplayPanel`
- 重点理解它的数据拆分和复杂 UI 组织方式

### 第 1 周结束前

- 尝试独立新增一个小型查询组件或小型统计卡片
- 严格按照“`endpoints -> lib/api -> dashboard component -> page`”链路落地

---

## 17. 常用文件索引

| 文件 | 作用 |
| --- | --- |
| `app/page.tsx` | 主页面业务编排入口 |
| `app/layout.tsx` | 根布局与全局 metadata |
| `app/globals.css` | 全局主题变量与基础样式 |
| `app/api/proxy/[...path]/route.ts` | 浏览器请求代理 |
| `components/dashboard/dashboard-header.tsx` | 顶部头部 + 项目上下文 |
| `components/language-provider.tsx` | 语言上下文 |
| `hooks/use-fluid-scale.ts` | 大屏缩放工具 |
| `lib/api-client.ts` | 请求基础封装 |
| `lib/api/endpoints.ts` | 后端地址注册表 |
| `lib/api/project.ts` | 项目详情/总览实时数据 |
| `lib/api/power.ts` | 功率曲线相关接口 |
| `lib/api/overview.ts` | 综合效率统计接口 |
| `lib/api/operations.ts` | 运行状态趋势接口 |
| `lib/api/heatmap.ts` | 热力图接口 |
| `lib/api/cell-history.ts` | 电芯历史回放接口 |
| `lib/api/daily-trend-range.ts` | 数据分析区间接口 |

---

## 18. 一句话总结

这个项目的前端架构可以概括为：

**一个由 `app/page.tsx` 统一编排的单页大屏应用，业务组件集中在 `components/dashboard`，数据通过 `lib/api` 标准化后经 `/api/proxy` 访问后端，并通过 `useFluidScale` 保持大屏场景下的视觉一致性。**

新人只要先看懂这条主链路，后续无论是加接口、加图表还是加 Tab，路径都会清晰很多。
