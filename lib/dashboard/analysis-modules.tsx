/**
 * Registry for the "数据分析 / Data Analysis" sidebar group.
 *
 * Each module surfaces as a second-level item under "数据分析" in the left
 * sidebar (tab id `analysis:<module.key>`) and renders full-size on the page.
 * Everything is data-driven from {@link ANALYSIS_MODULES} so adding a new
 * analysis later is a single entry — no sidebar/page edits required:
 *
 *   1. Build the analysis component (see VoltageDifferenceAnalysis et al.) so it
 *      accepts {@link AnalysisModuleData}.
 *   2. Append a row to {@link ANALYSIS_MODULES} with its label, icon + render.
 *      It appears in the sidebar group automatically.
 *
 * `category` stays on each module as a health-domain tag (handy for future
 * grouping / labelling); it no longer drives navigation.
 */
import type { ReactNode } from "react"
import { Activity, GitCompare, Thermometer, Zap } from "lucide-react"
import { CellVoltageAnalysis } from "@/components/dashboard/cell-voltage-analysis"
import { TemperatureDifferenceAnalysis } from "@/components/dashboard/temperature-difference-analysis"
import { VoltageDifferenceAnalysis } from "@/components/dashboard/voltage-difference-analysis"
import type { DailyTrendRangePoint, DailyTrendRangeSummary } from "@/lib/api/daily-trend-range"

/** Health-domain tag for an analysis module. */
export type AnalysisCategoryKey = "battery" | "thermal" | "cell"

export type AnalysisCategory = {
  key: AnalysisCategoryKey
  zh: string
  en: string
  icon: React.ElementType
}

/** Shared data contract every analysis module receives from the page. */
export type AnalysisModuleData = {
  range: number
  summary: DailyTrendRangeSummary | null
  trendData: DailyTrendRangePoint[]
  loading: boolean
  error: string | null
}

export type AnalysisModule = {
  /** Stable key (also the React key + sidebar tab id suffix). */
  key: string
  category: AnalysisCategoryKey
  /** Sidebar / page display label + icon. */
  zh: string
  en: string
  icon: React.ElementType
  render: (data: AnalysisModuleData) => ReactNode
}

/**
 * Analysis modules surface as second-level items under the "数据分析" sidebar
 * group, addressed by tab id `analysis:<module.key>`. These helpers keep the
 * encoding in one place.
 */
export const ANALYSIS_TAB_PREFIX = "analysis:"
export const analysisModuleTabKey = (moduleKey: string) => `${ANALYSIS_TAB_PREFIX}${moduleKey}`
export const parseAnalysisModuleTab = (tab: string): string | null =>
  tab.startsWith(ANALYSIS_TAB_PREFIX) ? tab.slice(ANALYSIS_TAB_PREFIX.length) : null

export const ANALYSIS_CATEGORIES: AnalysisCategory[] = [
  { key: "battery", zh: "电压健康", en: "Voltage", icon: Zap },
  { key: "thermal", zh: "温度健康", en: "Thermal", icon: Thermometer },
  { key: "cell", zh: "电芯一致性", en: "Cell", icon: Activity },
]

export const ANALYSIS_MODULES: AnalysisModule[] = [
  {
    key: "voltage-diff",
    category: "battery",
    zh: "压差分析",
    en: "Voltage Diff",
    icon: Zap,
    render: (data) => <VoltageDifferenceAnalysis {...data} />,
  },
  {
    key: "temperature-diff",
    category: "thermal",
    zh: "温差分析",
    en: "Temp Diff",
    icon: Thermometer,
    render: (data) => <TemperatureDifferenceAnalysis {...data} />,
  },
  {
    key: "cell-voltage",
    category: "cell",
    zh: "单体电压分析",
    en: "Cell Voltage",
    icon: GitCompare,
    render: (data) => <CellVoltageAnalysis {...data} />,
  },
]

export const ANALYSIS_MODULE_BY_KEY: Record<string, AnalysisModule> = ANALYSIS_MODULES.reduce(
  (acc, module) => {
    acc[module.key] = module
    return acc
  },
  {} as Record<string, AnalysisModule>
)
