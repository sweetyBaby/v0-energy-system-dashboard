import { useRouter } from "next/navigation"
import {
  Activity,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  Grid3X3,
  History,
  LayoutDashboard,
  Map,
  TrendingUp,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export type SidebarTab =
  | "realtime"
  | "history"
  | "alarm-monitoring"
  | "bms"
  | "cell-history"
  | "analysis"
  | "efficiency"
  | "reports"

type SidebarTabMeta = {
  key: SidebarTab
  icon: React.ElementType
  zh: string
  en: string
}

const SIDEBAR_TABS: SidebarTabMeta[] = [
  { key: "realtime", icon: LayoutDashboard, zh: "总览", en: "Overview" },
  { key: "history", icon: Activity, zh: "运行状态", en: "Operations" },
  { key: "alarm-monitoring", icon: Bell, zh: "告警监测", en: "Alarm" },
  { key: "bms", icon: Grid3X3, zh: "电芯矩阵", en: "Cell Matrix" },
  { key: "cell-history", icon: History, zh: "电芯历史", en: "Cell Hist." },
  { key: "analysis", icon: BarChart3, zh: "数据分析", en: "Analysis" },
  { key: "efficiency", icon: TrendingUp, zh: "效率分析", en: "Efficiency" },
  { key: "reports", icon: FileText, zh: "报表中心", en: "Reports" },
]

type DashboardSidebarProps = {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  alarmCount?: number
}

export function DashboardSidebar({
  activeTab,
  onTabChange,
  expanded,
  onExpandedChange,
  alarmCount = 0,
}: DashboardSidebarProps) {
  const router = useRouter()
  const { language } = useLanguage()
  const zh = language === "zh"

  const collapsedW = 68
  const expandedW = zh ? 156 : 176
  const labelWidth = zh ? 72 : 98
  const collapseLabel = zh ? "折叠菜单" : "Collapse menu"
  const expandLabel = zh ? "展开菜单" : "Expand menu"
  const switchProjectLabel = zh ? "项目地图" : "Map"
  const backToMapLabel = zh ? "返回项目地图" : "Back to Map"

  return (
    <aside
      className="relative z-20 flex shrink-0 flex-col border-r border-[#16344f] bg-[linear-gradient(180deg,#06111f_0%,#040b16_100%)] shadow-[4px_0_20px_rgba(0,0,0,0.35)]"
      style={{
        width: expanded ? expandedW : collapsedW,
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#26f0dc]/35 to-transparent" />

      <div className="flex shrink-0 items-center justify-end border-b border-[#0d2232] px-2 py-1.5">
        <button
          type="button"
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? collapseLabel : expandLabel}
          title={expanded ? collapseLabel : expandLabel}
          className="flex h-6 w-6 items-center justify-center rounded text-[#2a5a72] transition-colors hover:bg-[rgba(10,40,60,0.6)] hover:text-[#26f0dc]"
        >
          {expanded ? (
            <ChevronLeft style={{ width: "14px", height: "14px" }} />
          ) : (
            <ChevronRight style={{ width: "14px", height: "14px" }} />
          )}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-1.5 py-1">
        {SIDEBAR_TABS.map(({ key, icon: Icon, zh: zhLabel, en: enLabel }) => {
          const isActive = activeTab === key
          const label = zh ? zhLabel : enLabel
          const showBadge = key === "alarm-monitoring" && alarmCount > 0

          return (
            <div key={key} className="group relative">
              <button
                type="button"
                onClick={() => onTabChange(key)}
                title={!expanded ? label : undefined}
                className={`relative flex w-full items-center rounded-md transition-all ${
                  expanded ? "gap-2 px-2.5 py-2" : "justify-center px-0 py-3"
                } ${
                  isActive
                    ? "bg-[linear-gradient(135deg,rgba(12,102,122,0.9),rgba(7,48,67,0.85))] text-[#e8ffff] shadow-[0_0_12px_rgba(44,234,215,0.12)]"
                    : "text-[#4a7a96] hover:bg-[rgba(10,40,60,0.5)] hover:text-[#9dc8db]"
                }`}
              >
                {isActive && (
                  <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-[#26f0dc] shadow-[0_0_8px_rgba(38,240,220,0.7)]" />
                )}

                <div className="relative shrink-0">
                  <Icon
                    style={{ width: "16px", height: "16px" }}
                    className={`transition-colors ${
                      isActive
                        ? "text-[#26f0dc] drop-shadow-[0_0_4px_rgba(38,240,220,0.7)]"
                        : "group-hover:text-[#9dc8db]"
                    }`}
                  />
                  {showBadge && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-[13px] min-w-[13px] items-center justify-center rounded-full bg-[#ff4d6d] px-0.5 text-[7px] font-bold text-white shadow-[0_0_5px_rgba(255,77,109,0.7)]">
                      {alarmCount > 99 ? "99+" : alarmCount}
                    </span>
                  )}
                </div>

                <span
                  className={`whitespace-nowrap leading-tight transition-all ${isActive ? "text-[#a8f0e8]" : ""}`}
                  style={{
                    fontSize: zh ? "12px" : "11px",
                    letterSpacing: zh ? "0.04em" : "0.02em",
                    opacity: expanded ? 1 : 0,
                    maxWidth: expanded ? `${labelWidth}px` : "0px",
                    overflow: "hidden",
                    transition: "opacity 0.2s ease, max-width 0.25s cubic-bezier(0.4,0,0.2,1)",
                  }}
                >
                  {label}
                </span>
              </button>

              {!expanded && (
                <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded border border-[#1a3a52] bg-[rgba(4,12,26,0.95)] px-2.5 py-1 text-xs text-[#e8f4fc] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {label}
                  <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1a3a52]" />
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-[#16344f] px-1.5 pb-3 pt-2">
        <div className="group relative">
          <button
            type="button"
            onClick={() => router.push("/project-map")}
            title={!expanded ? backToMapLabel : undefined}
            className={`flex w-full items-center rounded-md text-[#2a5a70] transition-all hover:bg-[rgba(10,40,60,0.5)] hover:text-[#26f0dc] ${
              expanded ? "gap-2 px-2.5 py-2" : "justify-center px-0 py-3"
            }`}
          >
            <Map style={{ width: "16px", height: "16px", flexShrink: 0 }} />
            <span
              className="whitespace-nowrap"
              style={{
                fontSize: zh ? "12px" : "11px",
                letterSpacing: "0.04em",
                opacity: expanded ? 1 : 0,
                maxWidth: expanded ? `${labelWidth}px` : "0px",
                overflow: "hidden",
                transition: "opacity 0.2s ease, max-width 0.25s cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              {switchProjectLabel}
            </span>
          </button>

          {!expanded && (
            <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded border border-[#1a3a52] bg-[rgba(4,12,26,0.95)] px-2.5 py-1 text-xs text-[#e8f4fc] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {backToMapLabel}
              <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1a3a52]" />
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#26f0dc]/18 to-transparent" />
    </aside>
  )
}
