import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  BarChart3,
  Bell,
  ChevronDown,
  FileText,
  Gauge,
  History,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Map,
  TrendingUp,
} from "lucide-react"
import { useProject } from "@/components/dashboard/dashboard-header"
import { useLanguage } from "@/components/language-provider"

export type SidebarTab =
  | "realtime"
  | "history"
  | "alarm-monitoring"
  | "bms"
  | "cell-history"
  | "analysis"
  | "trend-analysis"
  | "device-status"
  | "efficiency"
  | "reports"

type SidebarLeaf = {
  key: SidebarTab
  icon: React.ElementType
  zh: string
  en: string
}

type SidebarGroup = {
  groupKey: string
  icon: React.ElementType
  zh: string
  en: string
  children: SidebarLeaf[]
}

type SidebarItem = SidebarLeaf | SidebarGroup

const isGroup = (item: SidebarItem): item is SidebarGroup => "children" in item

const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: "realtime", icon: LayoutDashboard, zh: "总览", en: "Overview" },
  {
    groupKey: "operations",
    icon: Activity,
    zh: "运行状态",
    en: "Operations",
    children: [
      { key: "history", icon: Gauge, zh: "状态概览", en: "Status Overview" },
      { key: "device-status", icon: ListChecks, zh: "设备状态", en: "Device Status" },
    ],
  },
  { key: "alarm-monitoring", icon: Bell, zh: "告警监测", en: "Alarm" },
  { key: "cell-history", icon: History, zh: "电芯历史", en: "Cell Hist." },
  {
    groupKey: "analysis",
    icon: BarChart3,
    zh: "数据分析",
    en: "Analysis",
    children: [
      { key: "analysis", icon: LineChart, zh: "趋势概览", en: "Trend Overview" },
      { key: "trend-analysis", icon: TrendingUp, zh: "趋势分析", en: "Trend Analysis" },
    ],
  },
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
  const backToMapLabel = zh ? "项目地图" : "Project Map"
  const backToMapHref = selectedProject.projectId
    ? `/project-map?projectId=${encodeURIComponent(selectedProject.projectId)}`
    : "/project-map"
  const labelWidth = useMemo(() => {
    // Children are indented, so reserve extra room for their labels.
    const childIndent = 18
    const widths = SIDEBAR_ITEMS.flatMap((item) => {
      if (isGroup(item)) {
        return [
          getSidebarLabelWidth(zh ? item.zh : item.en, zh),
          ...item.children.map((child) => getSidebarLabelWidth(zh ? child.zh : child.en, zh) + childIndent),
        ]
      }
      return [getSidebarLabelWidth(zh ? item.zh : item.en, zh)]
    })
    return Math.max(...widths)
  }, [zh])
  const textWidth = labelWidth + (zh ? 4 : 8)
  const expandedW = textWidth + 58

  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  // Auto-open the group that contains the active tab.
  useEffect(() => {
    const activeGroup = SIDEBAR_ITEMS.find(
      (item) => isGroup(item) && item.children.some((child) => child.key === activeTab)
    )
    if (activeGroup && isGroup(activeGroup)) {
      setOpenGroups((prev) => (prev.has(activeGroup.groupKey) ? prev : new Set(prev).add(activeGroup.groupKey)))
    }
  }, [activeTab])

  const toggleGroup = (group: SidebarGroup) => {
    const isOpen = openGroups.has(group.groupKey)
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (isOpen) next.delete(group.groupKey)
      else next.add(group.groupKey)
      return next
    })
    // When opening a group whose child is not active yet, jump to its first child.
    if (!isOpen && !group.children.some((child) => child.key === activeTab)) {
      onTabChange(group.children[0].key)
    }
  }

  const renderNavButton = ({
    icon: Icon,
    label,
    isActive,
    onClick,
    showBadge = false,
    isChild = false,
    trailing,
  }: {
    icon: React.ElementType
    label: string
    isActive: boolean
    onClick: () => void
    showBadge?: boolean
    isChild?: boolean
    trailing?: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={!expanded ? label : undefined}
      className={`relative flex w-full items-center rounded-md transition-all ${
        expanded
          ? `gap-2 rounded-lg ${isChild ? "py-2 pl-3.5 pr-2.5" : "px-2.5 py-2.5"}`
          : "justify-center rounded-lg px-0 py-3"
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
          style={{ width: isChild ? "14px" : "16px", height: isChild ? "14px" : "16px" }}
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
          fontSize: zh ? (isChild ? "11.5px" : "12px") : "11px",
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

      {expanded && trailing ? <span className="ml-auto flex shrink-0 items-center">{trailing}</span> : null}
    </button>
  )

  const renderCollapsedTooltip = (label: string) => (
    <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded border border-[#1a3a52] bg-[rgba(4,12,26,0.95)] px-2.5 py-1 text-xs text-[#e8f4fc] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
      {label}
      <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1a3a52]" />
    </div>
  )

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
        {SIDEBAR_ITEMS.map((item) => {
          if (!isGroup(item)) {
            const label = zh ? item.zh : item.en
            const showBadge = item.key === "alarm-monitoring" && alarmCount > 0

            return (
              <div key={item.key} className="group relative">
                {renderNavButton({
                  icon: item.icon,
                  label,
                  isActive: activeTab === item.key,
                  onClick: () => onTabChange(item.key),
                  showBadge,
                })}
                {!expanded && renderCollapsedTooltip(label)}
              </div>
            )
          }

          const groupLabel = zh ? item.zh : item.en
          const anyChildActive = item.children.some((child) => child.key === activeTab)
          const open = openGroups.has(item.groupKey)

          // Collapsed: parent icon with a hover fly-out listing children.
          if (!expanded) {
            return (
              <div key={item.groupKey} className="group relative">
                {renderNavButton({
                  icon: item.icon,
                  label: groupLabel,
                  isActive: anyChildActive,
                  onClick: () =>
                    onTabChange(anyChildActive ? activeTab : item.children[0].key),
                })}
                <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 min-w-[148px] rounded-lg border border-[#1a3a52] bg-[rgba(4,12,26,0.97)] p-1.5 opacity-0 shadow-[0_8px_28px_rgba(0,0,0,0.5)] transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                  <div className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5d83a0]">
                    {groupLabel}
                  </div>
                  {item.children.map((child) => {
                    const childActive = activeTab === child.key
                    const ChildIcon = child.icon
                    return (
                      <button
                        key={child.key}
                        type="button"
                        onClick={() => onTabChange(child.key)}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                          childActive
                            ? "bg-[rgba(38,240,220,0.12)] text-[#bff8f2]"
                            : "text-[#bcd6e8] hover:bg-[rgba(115,198,255,0.08)] hover:text-[#eaf6ff]"
                        }`}
                      >
                        <ChildIcon
                          className={`h-3.5 w-3.5 shrink-0 ${childActive ? "text-[#26f0dc]" : "text-[#78bfd1]"}`}
                        />
                        <span className="truncate">{zh ? child.zh : child.en}</span>
                      </button>
                    )
                  })}
                  <div className="absolute -left-[5px] top-4 border-4 border-transparent border-r-[#1a3a52]" />
                </div>
              </div>
            )
          }

          // Expanded: parent toggles the sub-menu open/closed.
          return (
            <div key={item.groupKey} className="group relative flex flex-col gap-1">
              {renderNavButton({
                icon: item.icon,
                label: groupLabel,
                isActive: anyChildActive,
                onClick: () => toggleGroup(item),
                trailing: (
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-current transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  />
                ),
              })}
              {open && (
                <div className="flex flex-col gap-1">
                  {item.children.map((child) => (
                    <div key={child.key} className="group relative">
                      {renderNavButton({
                        icon: child.icon,
                        label: zh ? child.zh : child.en,
                        isActive: activeTab === child.key,
                        onClick: () => onTabChange(child.key),
                        isChild: true,
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="relative border-t border-[#16344f] px-1.5 pb-2 pt-2">
        <div className="group relative">
          <button
            type="button"
            onClick={() => router.push(backToMapHref)}
            title={!expanded ? backToMapLabel : undefined}
            className={`relative inline-flex w-full items-center overflow-hidden text-[11px] font-semibold text-[#9cc6d8] outline-none transition-all hover:bg-[rgba(14,33,52,0.72)] hover:text-[#dffbff] focus:outline-none focus-visible:outline-none ${
              expanded
                ? "h-[34px] justify-start gap-2 rounded-lg px-3"
                : "h-[34px] justify-center rounded-lg px-0"
            }`}
          >
            <Map className="h-4 w-4 shrink-0 text-[#7cc1d4] transition-colors group-hover:text-[#b7f2ff]" />
            {expanded ? <span className="tracking-[0.08em]">{backToMapLabel}</span> : null}
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
