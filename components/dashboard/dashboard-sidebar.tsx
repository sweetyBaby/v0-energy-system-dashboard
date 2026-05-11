import { useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  BarChart3,
  Bell,
  FileText,
  Grid3X3,
  History,
  LayoutDashboard,
  Map,
  TrendingUp,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useProject } from "@/components/dashboard/dashboard-header"

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

const getSidebarLabelWidth = (label: string, zh: boolean) => {
  let width = 0

  for (const char of label) {
    if (char === " ") {
      width += 3.4
    } else if (char === ".") {
      width += 3.2
    } else if (/[A-Z]/.test(char)) {
      width += 7.4
    } else if (/[a-z0-9]/.test(char)) {
      width += 6.25
    } else if (/[\u3400-\u9fff\uf900-\ufaff]/.test(char)) {
      width += 12.2
    } else {
      width += 6.5
    }
  }

  return Math.ceil(width + (zh ? 2 : 4))
}

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
  const { selectedProject } = useProject()
  const { language } = useLanguage()
  const zh = language === "zh"

  const collapsedW = 68
  const collapseLabel = zh ? "折叠菜单" : "Collapse menu"
  const expandLabel = zh ? "展开菜单" : "Expand menu"
  const switchProjectLabel = zh ? "项目地图" : "Project Map"
  const backToMapLabel = zh ? "项目地图" : "Project Map"
  const backToMapHref = selectedProject.projectId
    ? `/project-map?projectId=${encodeURIComponent(selectedProject.projectId)}`
    : "/project-map"
  const labelWidth = useMemo(() => {
    const sidebarLabels = [...SIDEBAR_TABS.map((tab) => (zh ? tab.zh : tab.en)), switchProjectLabel]
    return Math.max(...sidebarLabels.map((label) => getSidebarLabelWidth(label, zh)))
  }, [switchProjectLabel, zh])
  const textWidth = labelWidth + (zh ? 4 : 8)
  const expandedW = textWidth + 58

  return (
    <aside
      className="relative z-20 flex shrink-0 flex-col overflow-hidden border-r border-[#16344f] shadow-[10px_0_28px_rgba(0,8,20,0.42)] backdrop-blur-xl"
      style={{
        width: expanded ? expandedW : collapsedW,
        background:
          "linear-gradient(180deg, rgba(8,20,33,0.98) 0%, rgba(4,11,20,0.98) 100%), radial-gradient(circle at 18% 0%, rgba(38,240,220,0.16), transparent 34%), radial-gradient(circle at 100% 18%, rgba(59,130,246,0.14), transparent 30%)",
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 0% 22%, rgba(88, 226, 220, 0.08), transparent 24%), radial-gradient(circle at 100% 72%, rgba(59, 130, 246, 0.1), transparent 22%), repeating-linear-gradient(180deg, rgba(111, 202, 223, 0.06) 0px, rgba(111, 202, 223, 0.06) 1px, transparent 1px, transparent 22px)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#26f0dc]/35 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[#8fe8ff]/20 to-transparent" />

      <div className="relative flex shrink-0 items-center justify-end px-2 py-1.5">
        <button
          type="button"
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? collapseLabel : expandLabel}
          title={expanded ? collapseLabel : expandLabel}
          className="group relative flex h-8 w-8 items-center justify-center rounded-lg text-[#c8f7ff] transition-all duration-200 hover:bg-[rgba(99,253,241,0.08)] hover:text-[#7ff8f0] active:scale-95"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="relative h-5 w-5"
            fill="none"
          >
            <rect
              x={expanded ? "3.2" : "13.3"}
              y="4"
              width="3.1"
              height="12"
              rx="1.55"
              fill="currentColor"
              opacity="0.9"
            />
            <path
              d={expanded ? "M13.4 6.7L10.3 10L13.4 13.3" : "M6.6 6.7L9.7 10L6.6 13.3"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <nav className="custom-scrollbar relative flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-1.5 py-1.5">
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
                  expanded ? "gap-2 rounded-lg px-2.5 py-2.5" : "justify-center rounded-lg px-0 py-3"
                } ${
                  isActive
                    ? "border border-[#39d7cf]/42 bg-[linear-gradient(135deg,rgba(13,104,122,0.96),rgba(7,48,67,0.92))] text-[#efffff] shadow-[0_0_0_1px_rgba(57,215,207,0.08),0_12px_24px_rgba(5,19,33,0.35),inset_0_1px_0_rgba(233,255,255,0.16)]"
                    : "border border-[#17354b]/85 bg-[linear-gradient(135deg,rgba(10,24,38,0.86),rgba(7,18,29,0.72))] text-[#9cc6d8] shadow-[inset_0_1px_0_rgba(152,232,255,0.05)] hover:border-[#2f728f]/85 hover:bg-[linear-gradient(135deg,rgba(14,33,52,0.94),rgba(9,24,39,0.9))] hover:text-[#dffbff]"
                }`}
              >
                <span
                  className={`pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-200 ${
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                  style={{
                    background:
                      "radial-gradient(circle at 100% 50%, rgba(87, 247, 239, 0.18), transparent 42%), linear-gradient(90deg, transparent, rgba(125, 226, 255, 0.04))",
                  }}
                />
                {isActive && (
                  <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-[#26f0dc] shadow-[0_0_8px_rgba(38,240,220,0.7)]" />
                )}

                <div className="relative shrink-0">
                  <Icon
                    style={{ width: "16px", height: "16px" }}
                    className={`transition-colors ${
                      isActive
                        ? "text-[#26f0dc] drop-shadow-[0_0_4px_rgba(38,240,220,0.7)]"
                        : "text-[#78bfd1] group-hover:text-[#b7f2ff]"
                    }`}
                  />
                  {showBadge && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-[13px] min-w-[13px] items-center justify-center rounded-full bg-[#ff4d6d] px-0.5 text-[7px] font-bold text-white shadow-[0_0_5px_rgba(255,77,109,0.7)]">
                      {alarmCount > 99 ? "99+" : alarmCount}
                    </span>
                  )}
                </div>

                <span
                  className={`whitespace-nowrap leading-tight transition-all ${
                    isActive ? "text-[#dffefe]" : "text-[#c1dbea] group-hover:text-[#ecfdff]"
                  }`}
                  style={{
                    fontSize: zh ? "12px" : "11px",
                    fontWeight: isActive ? 600 : 500,
                    letterSpacing: zh ? "0.04em" : "0.03em",
                    opacity: expanded ? 1 : 0,
                    maxWidth: expanded ? `${textWidth}px` : "0px",
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

      <div className="relative shrink-0 border-t border-[#16344f] px-1.5 pb-3 pt-2">
        <div className="group relative">
          <button
            type="button"
            onClick={() => router.push(backToMapHref)}
            title={!expanded ? backToMapLabel : undefined}
            className={`relative flex w-full items-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,rgba(9,23,36,0.72),rgba(7,18,29,0.52))] text-[#b7dbe8] shadow-[inset_0_1px_0_rgba(152,232,255,0.04)] transition-all hover:bg-[linear-gradient(135deg,rgba(15,35,53,0.86),rgba(9,24,39,0.82))] hover:text-[#f0fdff] ${
              expanded ? "gap-2 rounded-lg px-2.5 py-2.5" : "justify-center rounded-lg px-0 py-3"
            }`}
          >
            <span className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_100%_50%,rgba(92,233,222,0.16),transparent_40%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            <Map
              style={{ width: "16px", height: "16px", flexShrink: 0 }}
              className="text-[#5ce9de] drop-shadow-[0_0_6px_rgba(92,233,222,0.42)] transition-all group-hover:scale-105 group-hover:text-[#93fff8]"
            />
            <span
              className="whitespace-nowrap font-semibold tracking-[0.05em] text-[#d4edf6] transition-colors group-hover:text-[#f2fdff]"
              style={{
                fontSize: zh ? "12px" : "11px",
                opacity: expanded ? 1 : 0,
                maxWidth: expanded ? `${textWidth}px` : "0px",
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
