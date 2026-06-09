"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  CalendarDays,
  ChevronDown,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { DASHBOARD_CONTENT_SCALE, useFluidScale } from "@/hooks/use-fluid-scale"
import { useDashboardViewport } from "@/hooks/use-dashboard-viewport"
import { MonthPicker } from "@/components/ui/month-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  fetchReportList,
  toReportDateKey,
  type ReportFile,
  type ReportFileKind,
  type ReportListResult,
} from "@/lib/api/report"
import { fetchMonthlyEfficiencyByDay, type DailyEfficiencyEntry } from "@/lib/api/overview"

type CalendarCell = {
  date: Date
  inMonth: boolean
}

type ReportCenterPanelProps = {
  /** Selected BCU deviceId; without it the report list cannot be queried. */
  deviceId?: string
  /** Project id, required to query daily charge/discharge + efficiency. */
  projectId?: string
  /** Optional BCU selector rendered in the panel header (owned by the page). */
  bcuSelector?: ReactNode
}

/** Softened energy color tokens — calmer than the chart's neon accents. */
const CHARGE_ENERGY_COLOR = "#7fceb8"
const DISCHARGE_ENERGY_COLOR = "#aea0d6"
const EFFICIENCY_COLOR = "#56b483"

function EfficiencyRing({
  value,
  size,
  stroke,
  fontSize,
}: {
  value: number | null
  size: number
  stroke: number
  fontSize: number
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = value == null ? 0 : Math.min(Math.max(value, 0), 100)
  const dash = (pct / 100) * circumference
  const center = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block max-h-full max-w-full">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#223a30" strokeWidth={stroke} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={EFFICIENCY_COLOR}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight={700}
        fill="#cfe6d8"
      >
        {value == null ? "--" : `${Math.round(value)}%`}
      </text>
    </svg>
  )
}

function ChargeDischargeChart({
  zh,
  charge,
  discharge,
  max,
  barWidth,
  valueSize,
  labelSize,
  compact,
}: {
  zh: boolean
  charge: number | null
  discharge: number | null
  max: number
  barWidth: number
  valueSize: number
  labelSize: number
  compact: boolean
}) {
  const renderBar = (value: number | null, color: string, label: string) => {
    const ratio = max > 0 && value != null ? Math.min((value / max) * 100, 100) : 0
    // Keep a visible sliver for tiny non-zero values.
    const fillPct = value != null && value > 0 ? Math.max(ratio, 8) : 0
    // A real reading (including exactly 0) always keeps a small baseline nub so the
    // bar is never an empty column; only missing data (null) renders nothing.
    const minBarPx = value != null ? 4 : 0
    const isZero = value === 0

    return (
      <div className="flex h-full min-w-0 flex-col items-center justify-between">
        <span className="leading-none" style={{ fontSize: valueSize }}>
          <span className="font-semibold tabular-nums text-[#eef4ff]">
            {value == null ? "--" : value.toFixed(0)}
          </span>
          <span className={`font-normal text-[#9fb2dc] ${compact ? "ml-0" : "ml-0.5"}`} style={{ fontSize: labelSize }}>
            kWh
          </span>
        </span>
        <div className="flex min-h-0 flex-1 items-end justify-center self-stretch py-[2px]">
          {/* No min-height floor: the bar area is purely flex-driven so it grows on
              tall rows and shrinks on short ones, never pushing the label out of the
              cell. The fill keeps a small baseline nub so bars stay visible. */}
          <div className="flex h-full items-end overflow-hidden" style={{ width: barWidth }}>
            <div
              className="w-full rounded-t-[2px]"
              style={{
                height: `${fillPct}%`,
                minHeight: minBarPx,
                background: color,
                opacity: isZero ? 0.5 : 0.92,
              }}
            />
          </div>
        </div>
        <span className="whitespace-nowrap leading-none text-[#9fb2dc]" style={{ fontSize: labelSize }}>
          {label}
        </span>
      </div>
    )
  }

  return (
    <div className={`grid h-full min-h-0 flex-1 grid-cols-2 ${compact ? "gap-2" : "gap-3"}`}>
      {renderBar(charge, CHARGE_ENERGY_COLOR, zh ? "充电量" : "Charge")}
      {renderBar(discharge, DISCHARGE_ENERGY_COLOR, zh ? "放电量" : "Discharge")}
    </div>
  )
}

const weekdayLabels = {
  zh: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
} as const

const monthNamesEn = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const kindLabels: Record<"zh" | "en", Record<ReportFileKind, string>> = {
  zh: {
    emailSummary: "邮件摘要",
    test: "日报报表",
    summary: "汇总表",
    summarySum: "汇总表(累计)",
    other: "",
  },
  en: {
    emailSummary: "Email Summary",
    test: "Daily Report",
    summary: "Summary",
    summarySum: "Summary (Sum)",
    other: "",
  },
}

const langBadgeText: Record<"cn" | "en", { zh: string; en: string }> = {
  cn: { zh: "中", en: "CN" },
  en: { zh: "英", en: "EN" },
}

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const isSameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()

const isFutureDay = (date: Date, today: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return d > t
}

const isViewableInBrowser = (ext: string) => ext === "html" || ext === "htm" || ext === "pdf"

const buildCalendarCells = (viewDate: Date, language: "zh" | "en"): CalendarCell[] => {
  const firstDay = startOfMonth(viewDate)
  const lastDay = endOfMonth(viewDate)
  const leading = language === "zh" ? (firstDay.getDay() + 6) % 7 : firstDay.getDay()
  const totalDays = lastDay.getDate()
  const totalSlots = Math.ceil((leading + totalDays) / 7) * 7
  const firstGridDate = new Date(firstDay)
  firstGridDate.setDate(firstDay.getDate() - leading)

  return Array.from({ length: totalSlots }, (_, index) => {
    const date = new Date(firstGridDate)
    date.setDate(firstGridDate.getDate() + index)

    return {
      date,
      inMonth: isSameMonth(date, viewDate),
    }
  })
}

export function ReportCenterPanel({ deviceId, projectId, bcuSelector }: ReportCenterPanelProps) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const { isCompactViewport, isShortHeight } = useDashboardViewport()
  const compactCalendar = isCompactViewport || isShortHeight
  const scale = useFluidScale<HTMLDivElement>(isCompactViewport ? 760 : 1180, isCompactViewport ? 1440 : 1920, {
    ...DASHBOARD_CONTENT_SCALE,
    axis: compactCalendar ? "min" : "width",
    minRootPx: isCompactViewport ? 13 : DASHBOARD_CONTENT_SCALE.minRootPx,
    maxRootPx: isCompactViewport ? 18.5 : DASHBOARD_CONTENT_SCALE.maxRootPx,
  })
  const titleSize = scale.clampText(0.92, compactCalendar ? 0.96 : 1.02, 1.28)
  const controlSize = scale.fluid(compactCalendar ? 10.5 : 12, compactCalendar ? 13.2 : 15)
  const hintSize = scale.fluid(compactCalendar ? 9.5 : 11, compactCalendar ? 11.2 : 13)
  const dayNumberSize = scale.clampText(compactCalendar ? 1 : 1.22, compactCalendar ? 1.14 : 1.4, compactCalendar ? 1.44 : 1.82)
  const actionLabelSize = scale.fluid(compactCalendar ? 9.5 : 11, compactCalendar ? 12 : 14)
  const ringSize = scale.fluid(compactCalendar ? 34 : 46, compactCalendar ? 56 : 82)
  const ringStroke = scale.fluid(compactCalendar ? 4 : 4.5, compactCalendar ? 6 : 7)
  const ringFontSize = scale.fluid(compactCalendar ? 10 : 11.5, compactCalendar ? 14 : 17)
  const statLabelSize = scale.fluid(compactCalendar ? 8.2 : 9.8, compactCalendar ? 10.6 : 12.8)
  const statValueSize = scale.fluid(compactCalendar ? 10 : 11.5, compactCalendar ? 12.8 : 15.2)
  const barWidth = scale.fluid(compactCalendar ? 10 : 14, compactCalendar ? 17 : 24)
  const today = useMemo(() => new Date(), [])
  const [viewDate, setViewDate] = useState(() => startOfMonth(today))

  const [reportData, setReportData] = useState<ReportListResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [efficiencyByDay, setEfficiencyByDay] = useState<Record<string, DailyEfficiencyEntry>>({})

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth() + 1

  useEffect(() => {
    if (!deviceId) {
      setReportData(null)
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetchReportList({ deviceId, year, month }, { signal: controller.signal })
      .then((result) => {
        setReportData(result)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return
        }
        setReportData(null)
        setError(err instanceof Error ? err.message : zh ? "获取日报列表失败" : "Failed to load reports")
        setLoading(false)
      })

    return () => controller.abort()
  }, [deviceId, year, month, zh])

  useEffect(() => {
    if (!deviceId || !projectId) {
      setEfficiencyByDay({})
      return
    }

    const controller = new AbortController()

    fetchMonthlyEfficiencyByDay({ projectId, deviceId, year, month }, { signal: controller.signal })
      .then((result) => setEfficiencyByDay(result))
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return
        }
        setEfficiencyByDay({})
      })

    return () => controller.abort()
  }, [deviceId, projectId, year, month])

  const monthMaxEnergy = useMemo(() => {
    let max = 0
    for (const entry of Object.values(efficiencyByDay)) {
      if (entry.chargeEnergy != null) max = Math.max(max, entry.chargeEnergy)
      if (entry.dischargeEnergy != null) max = Math.max(max, entry.dischargeEnergy)
    }
    return max
  }, [efficiencyByDay])

  const labels = zh ? weekdayLabels.zh : weekdayLabels.en
  const calendarCells = useMemo(() => buildCalendarCells(viewDate, language), [language, viewDate])
  const weekCount = calendarCells.length / 7

  const triggerHeight = scale.fluid(compactCalendar ? 32 : 36, compactCalendar ? 38 : 44)
  const panelWidth = scale.fluid(compactCalendar ? 300 : 320, compactCalendar ? 340 : 380)
  const iconSize = scale.fluid(compactCalendar ? 12 : 14, compactCalendar ? 15.5 : 18)
  const filePanelWidth = scale.fluid(compactCalendar ? 296 : 312, compactCalendar ? 360 : 392)

  const fileKindLabel = (file: ReportFile) => kindLabels[language][file.kind] || file.fileName

  const tileSize = scale.fluid(30, 36)

  const fileToneClasses = (ext: string) => {
    if (ext === "xlsx" || ext === "xls" || ext === "csv") return "border-[#1d6b54]/55 bg-[#0f3a2e] text-[#5fe0b0]"
    if (ext === "zip" || ext === "rar" || ext === "7z" || ext === "gz") return "border-[#b9821f]/50 bg-[#37290f] text-[#ffce7a]"
    if (ext === "pdf") return "border-[#c0494f]/50 bg-[#3a1416] text-[#ff9ea3]"
    return "border-[#2e7be6]/45 bg-[#15306b] text-[#8db7ff]"
  }

  const renderDownloadRow = (key: string, options: {
    href: string
    primary: string
    secondary?: string
    fileName: string
    ext: string
    leadingIcon: ReactNode
    badges?: ReactNode
  }) => {
    const viewable = isViewableInBrowser(options.ext)
    const linkProps = viewable
      ? { target: "_blank" as const, rel: "noopener noreferrer" }
      : { download: options.fileName }

    return (
      <a
        key={key}
        href={options.href}
        {...linkProps}
        title={options.fileName}
        className="group flex items-start gap-2.5 rounded-xl border border-[#243a6b]/70 bg-[#101a40]/70 px-2.5 py-2 text-[#e8f4fc] transition-all hover:-translate-y-px hover:border-[#22d3ee]/55 hover:bg-[#16295c] hover:shadow-[0_6px_18px_rgba(3,8,24,0.45)]"
      >
        <span
          className={`mt-0.5 flex shrink-0 items-center justify-center rounded-lg border ${fileToneClasses(options.ext)}`}
          style={{ width: tileSize, height: tileSize }}
        >
          {options.leadingIcon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words font-medium leading-snug text-[#eef4ff]" style={{ fontSize: actionLabelSize }}>
            {options.primary}
          </span>
          {options.secondary ? (
            <span className="mt-0.5 block break-all leading-snug text-[#7b8ab8]" style={{ fontSize: hintSize }}>
              {options.secondary}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 pt-0.5">
          {options.badges}
          {options.ext ? (
            <span
              className="rounded-md border border-[#2e7be6]/35 bg-[#162c63]/60 px-1.5 py-0.5 font-semibold tracking-wide text-[#bcd4ff]"
              style={{ fontSize: hintSize }}
            >
              {options.ext.toUpperCase()}
            </span>
          ) : null}
          <span className="flex items-center justify-center text-[#9fb6e8] transition-colors group-hover:text-[#22d3ee]">
            {viewable ? (
              <ExternalLink style={{ width: iconSize, height: iconSize }} />
            ) : (
              <Download style={{ width: iconSize, height: iconSize }} />
            )}
          </span>
        </span>
      </a>
    )
  }

  const statusNode = (() => {
    if (!deviceId) {
      return (
        <span className="text-[#7b8ab8]" style={{ fontSize: hintSize }}>
          {zh ? "请选择 BCU 以查看日报" : "Select a BCU to view reports"}
        </span>
      )
    }
    if (loading) {
      return (
        <span className="flex items-center gap-1.5 text-[#8db7ff]" style={{ fontSize: hintSize }}>
          <Loader2 className="animate-spin" style={{ width: iconSize, height: iconSize }} />
          {zh ? "加载中…" : "Loading…"}
        </span>
      )
    }
    if (error) {
      return (
        <span className="truncate text-[#ff9b9b]" style={{ fontSize: hintSize }} title={error}>
          {error}
        </span>
      )
    }
    return null
  })()

  return (
    <div
      ref={scale.ref}
      className={`flex h-full min-h-0 flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] ${compactCalendar ? "p-3" : "p-4"}`}
      style={scale.rootStyle}
    >
      <div className={`flex flex-wrap items-center justify-between ${compactCalendar ? "mb-3 gap-2.5" : "mb-4 gap-3"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-[#22d3ee]" />
            <h3 className="font-semibold text-[#22d3ee]" style={{ fontSize: titleSize }}>
              {zh ? "报表信息" : "Report Center"}
            </h3>
          </div>
          {statusNode}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {bcuSelector}
          <MonthPicker
            value={viewDate}
            onChange={setViewDate}
            maxDate={today}
            minYear={2024}
            align="end"
            triggerHeight={triggerHeight}
            fontSize={controlSize}
            iconSize={iconSize}
            panelWidth={panelWidth}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#33507e] bg-[linear-gradient(180deg,rgba(16,24,64,0.9),rgba(10,18,48,0.94))]">
        <div className="grid grid-cols-7 border-b border-[#33507e] bg-[#101840]/92">
          {labels.map((label) => (
            <div
              key={label}
              className={`border-r border-[#2f4a78] font-semibold text-[#eef4ff] last:border-r-0 ${compactCalendar ? "px-1.5 py-1.5" : "px-2 py-2"}`}
              style={{ fontSize: controlSize }}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="grid h-full grid-cols-7" style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}>
            {calendarCells.map((cell) => {
              const isToday = isSameDay(cell.date, today)
              const future = isFutureDay(cell.date, today)
              const dateKey = toReportDateKey(cell.date)
              // While a request is in flight, ignore any stale month's data so
              // highlights/counts never flash the wrong values.
              const day = loading ? undefined : reportData?.byDate[dateKey]
              const reportCount = day?.files.length ?? 0
              const logCount = day?.logs.length ?? 0
              const totalCount = reportCount + logCount
              const hasReports = cell.inMonth && totalCount > 0
              const showLoading = cell.inMonth && !future && Boolean(deviceId) && loading
              const eff = cell.inMonth ? efficiencyByDay[dateKey] : undefined
              const hasEff =
                Boolean(eff) &&
                (eff!.energyEfficiency != null || eff!.chargeEnergy != null || eff!.dischargeEnergy != null)

              return (
                <div
                  key={cell.date.toISOString()}
                  className={`group/cell relative flex min-h-0 flex-col overflow-hidden border-r border-b border-[#2f4a78] ${compactCalendar ? "p-1" : "p-1.5"} transition-colors ${
                    cell.inMonth
                      ? hasReports
                        ? "bg-[linear-gradient(180deg,rgba(34,76,134,0.3),rgba(17,27,62,0.85))] hover:bg-[linear-gradient(180deg,rgba(40,88,150,0.38),rgba(17,27,62,0.85))]"
                        : "bg-[linear-gradient(180deg,rgba(30,43,84,0.42),rgba(22,32,66,0.5))]"
                      : "bg-[#0a1130]/30"
                  }`}
                >
                  {hasReports && (
                    <span className="pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-r bg-[linear-gradient(180deg,#22d3ee,#00d4aa)]" />
                  )}
                  {cell.inMonth ? (
                    <>
                      {/* Day number (left) + report access chip (right) — prominent header */}
                      <div
                        className={`flex items-center justify-between ${compactCalendar ? "gap-1" : "gap-2"} ${
                          hasEff
                            ? compactCalendar
                              ? "mb-1 border-b border-white/10 pb-1"
                              : "mb-1.5 border-b border-white/10 pb-1.5"
                            : compactCalendar
                              ? "mb-0.5"
                              : "mb-1"
                        }`}
                      >
                        <span className={`flex items-center ${compactCalendar ? "gap-1" : "gap-1.5"}`}>
                          <span
                            className={`font-bold leading-none ${isToday ? "text-[#5cc2d2]" : hasReports ? "text-[#eef4ff]" : "text-[#c9d6ee]"}`}
                            style={{
                              fontSize: dayNumberSize,
                              textShadow: "0 1px 4px rgba(2,8,24,0.5)",
                            }}
                          >
                            {cell.date.getDate()}
                          </span>
                          {hasReports && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#56b8c8]" />
                          )}
                        </span>

                        {hasReports ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                title={zh ? "查看日报" : "View reports"}
                                className={`group flex shrink-0 items-center rounded-lg border border-[#456da8]/65 bg-[linear-gradient(180deg,rgba(41,70,134,0.82),rgba(27,49,102,0.82))] font-semibold text-[#d6e2f3] shadow-[0_2px_8px_rgba(10,28,72,0.34)] outline-none transition-all hover:border-[#557fbf] hover:brightness-105 focus:outline-none focus-visible:outline-none data-[state=open]:border-[#557fbf] data-[state=open]:shadow-[0_0_0_1px_rgba(95,135,195,0.4)] ${compactCalendar ? "gap-1 px-1.5 py-0.5" : "gap-1.5 px-2 py-1"}`}
                              >
                                <FileText className="shrink-0 text-[#bcd0ef]" style={{ width: iconSize, height: iconSize }} />
                                <span className="whitespace-nowrap font-semibold" style={{ fontSize: controlSize }}>
                                  {zh ? `${totalCount} 项` : `${totalCount} items`}
                                </span>
                                <ChevronDown
                                  className="text-[#a4bae0] transition-transform duration-200 group-data-[state=open]:rotate-180"
                                  style={{ width: iconSize - 1, height: iconSize - 1 }}
                                />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              className="z-50 rounded-2xl border border-[#3a5da0] bg-[#172252] p-0 text-[#e8f4fc] shadow-[0_24px_64px_rgba(0,0,0,0.72)] ring-1 ring-[#4a6fb5]/25"
                              style={{ width: filePanelWidth }}
                            >
                              <div className="flex items-center justify-between gap-2 border-b border-[#2c4576] bg-[#101a40]/60 px-3.5 py-2.5">
                                <div className="flex min-w-0 items-center gap-2">
                                  <CalendarDays className="shrink-0 text-[#22d3ee]" style={{ width: iconSize, height: iconSize }} />
                                  <span className="truncate font-semibold text-[#e8f4fc]" style={{ fontSize: controlSize }}>
                                    {zh
                                      ? `${cell.date.getMonth() + 1}月${cell.date.getDate()}日 日报`
                                      : `${monthNamesEn[cell.date.getMonth()]} ${cell.date.getDate()}`}
                                  </span>
                                </div>
                                <span
                                  className="shrink-0 rounded-full border border-[#2e7be6]/45 bg-[#0f1f49] px-2 py-0.5 font-semibold text-[#bcd4ff]"
                                  style={{ fontSize: hintSize }}
                                >
                                  {zh ? `${totalCount} 项` : `${totalCount}`}
                                </span>
                              </div>

                              <div className="custom-scrollbar max-h-[360px] space-y-3 overflow-y-auto p-2.5">
                                {reportCount > 0 ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5 px-0.5">
                                      <span className="h-3 w-0.5 rounded-full bg-[#22d3ee]" />
                                      <span className="font-medium text-[#9fb6e8]" style={{ fontSize: hintSize }}>
                                        {zh ? "报表文件" : "Report Files"}
                                      </span>
                                    </div>
                                    {day!.files.map((file) =>
                                      renderDownloadRow(file.path, {
                                        href: file.url,
                                        primary: fileKindLabel(file),
                                        secondary: file.kind === "other" ? undefined : file.fileName,
                                        fileName: file.fileName,
                                        ext: file.ext,
                                        leadingIcon:
                                          file.ext === "xlsx" || file.ext === "xls" ? (
                                            <FileSpreadsheet style={{ width: iconSize, height: iconSize }} />
                                          ) : (
                                            <FileText style={{ width: iconSize, height: iconSize }} />
                                          ),
                                        badges: file.lang ? (
                                          <span
                                            className="shrink-0 rounded-md border border-[#1d5b54]/70 bg-[#10252d] px-1.5 py-0.5 font-medium text-[#66e6cb]"
                                            style={{ fontSize: hintSize }}
                                          >
                                            {langBadgeText[file.lang][language]}
                                          </span>
                                        ) : null,
                                      })
                                    )}
                                  </div>
                                ) : null}

                                {logCount > 0 ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5 px-0.5">
                                      <span className="h-3 w-0.5 rounded-full bg-[#ffce7a]" />
                                      <span className="font-medium text-[#9fb6e8]" style={{ fontSize: hintSize }}>
                                        {zh ? "原始日志" : "Raw Logs"}
                                      </span>
                                    </div>
                                    {day!.logs.map((log) =>
                                      renderDownloadRow(log.path, {
                                        href: log.url,
                                        primary: log.fileName,
                                        fileName: log.fileName,
                                        ext: log.ext,
                                        leadingIcon: <Package style={{ width: iconSize, height: iconSize }} />,
                                      })
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : showLoading ? (
                          <Loader2 className="shrink-0 animate-spin text-[#8db7ff]" style={{ width: iconSize, height: iconSize }} />
                        ) : !deviceId ? (
                          <span className="whitespace-nowrap text-[#5f79ad]" style={{ fontSize: hintSize }}>
                            {zh ? "选择BCU" : "Select BCU"}
                          </span>
                        ) : isToday ? (
                          <span
                            className="rounded-full border border-[#1d5b54] bg-[#10252d] px-2 py-0.5 text-[#66e6cb]"
                            style={{ fontSize: hintSize }}
                          >
                            {zh ? "今天" : "Today"}
                          </span>
                        ) : (
                          <span className="whitespace-nowrap text-[#6f86b8]" style={{ fontSize: hintSize }}>
                            {zh ? "无报表" : "No report"}
                          </span>
                        )}
                      </div>

                      {/* Energy efficiency (left) + charge/discharge bars (right) —
                          borderless, bottom-aligned so all labels sit on one horizontal line. */}
                      {hasEff && (
                        <div
                          className="flex min-h-0 flex-1 items-stretch"
                          title={`${zh ? "能量效率" : "Energy Efficiency"} ${
                            eff!.energyEfficiency == null ? "--" : `${eff!.energyEfficiency}%`
                          } · ${zh ? "充电量" : "Charge"} ${
                            eff!.chargeEnergy == null ? "--" : `${eff!.chargeEnergy} kWh`
                          } · ${zh ? "放电量" : "Discharge"} ${
                            eff!.dischargeEnergy == null ? "--" : `${eff!.dischargeEnergy} kWh`
                          }`}
                        >
                          {/* Inner row: bottom-aligned so all labels sit on one horizontal line */}
                          <div
                            className={`grid h-full w-full min-h-0 items-stretch ${
                              compactCalendar
                                ? "grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] gap-2"
                                : "grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3"
                            }`}
                          >
                            {/* Left: energy-efficiency gauge */}
                            <div className="flex h-full min-h-0 flex-col items-center justify-between">
                              <div className="flex min-h-0 flex-1 items-center justify-center self-stretch">
                                <EfficiencyRing
                                  value={eff!.energyEfficiency}
                                  size={ringSize}
                                  stroke={ringStroke}
                                  fontSize={ringFontSize}
                                />
                              </div>
                              <span className="whitespace-nowrap leading-none text-[#9fb2dc]" style={{ fontSize: statLabelSize }}>
                                {zh ? "\u80fd\u91cf\u6548\u7387" : "Energy Efficiency"}
                              </span>
                            </div>

                            {/* Right: charge / discharge bar chart with X/Y axes (unit on Y axis) */}
                            <ChargeDischargeChart
                              zh={zh}
                              charge={eff!.chargeEnergy}
                              discharge={eff!.dischargeEnergy}
                              max={monthMaxEnergy}
                              barWidth={barWidth}
                              valueSize={statValueSize}
                              labelSize={statLabelSize}
                              compact={compactCalendar}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
