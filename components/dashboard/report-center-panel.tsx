"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { DateRange } from "react-day-picker"
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { DASHBOARD_CONTENT_SCALE, useFluidScale } from "@/hooks/use-fluid-scale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  fetchReportList,
  toReportDateKey,
  type ReportFile,
  type ReportFileKind,
  type ReportListResult,
} from "@/lib/api/report"

type CalendarCell = {
  date: Date
  inMonth: boolean
}

type ReportCenterPanelProps = {
  /** Selected BCU deviceId; without it the report list cannot be queried. */
  deviceId?: string
  /** Optional BCU selector rendered in the panel header (owned by the page). */
  bcuSelector?: ReactNode
}

const weekdayLabels = {
  zh: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
} as const

const weekdayNamesZh = ["一", "二", "三", "四", "五", "六", "日"]

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

const monthNamesZh = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]

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
const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1)

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const isSameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()

const isFutureDay = (date: Date, today: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return d > t
}

const formatMonthTitle = (date: Date, language: "zh" | "en") =>
  language === "zh" ? `${date.getFullYear()}年${date.getMonth() + 1}月` : `${monthNamesEn[date.getMonth()]} ${date.getFullYear()}`

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

export function ReportCenterPanel({ deviceId, bcuSelector }: ReportCenterPanelProps) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const scale = useFluidScale<HTMLDivElement>(1180, 1920, DASHBOARD_CONTENT_SCALE)
  const titleSize = scale.clampText(0.95, 1.02, 1.28)
  const controlSize = scale.fluid(12, 15)
  const hintSize = scale.fluid(11, 13)
  const dayNumberSize = scale.clampText(1.05, 1.18, 1.52)
  const actionLabelSize = scale.fluid(11, 14)
  const today = useMemo(() => new Date(), [])
  const [viewDate, setViewDate] = useState(() => startOfMonth(today))
  const [pickerOpen, setPickerOpen] = useState(false)

  const [reportData, setReportData] = useState<ReportListResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const labels = zh ? weekdayLabels.zh : weekdayLabels.en
  const monthTitle = formatMonthTitle(viewDate, language)
  const calendarCells = useMemo(() => buildCalendarCells(viewDate, language), [language, viewDate])
  const weekCount = calendarCells.length / 7
  const monthNames = zh ? monthNamesZh : monthNamesEn
  const selectedMonthRange: DateRange = useMemo(
    () => ({
      from: startOfMonth(viewDate),
      to: endOfMonth(viewDate),
    }),
    [viewDate]
  )
  const yearOptions = useMemo(
    () => Array.from({ length: today.getFullYear() + 3 - 2024 }, (_, index) => 2024 + index),
    [today]
  )

  const canGoNextMonth =
    viewDate.getFullYear() < today.getFullYear() || viewDate.getMonth() < today.getMonth()

  const triggerHeight = scale.fluid(36, 44)
  const navEdge = scale.fluid(36, 42)
  const panelWidth = scale.fluid(320, 380)
  const iconSize = scale.fluid(14, 18)
  const filePanelWidth = scale.fluid(312, 392)

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
    <div ref={scale.ref} className="flex h-full min-h-0 flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] p-4" style={scale.rootStyle}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
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
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-xl border border-[#26456e] bg-[#101840] px-3.5 text-[#e8f4fc] transition-all hover:border-[#22d3ee]/60"
                style={{ height: triggerHeight, fontSize: controlSize }}
              >
                <CalendarDays className="text-[#8db7ff]" style={{ width: iconSize, height: iconSize }} />
                <span className="font-medium">{monthTitle}</span>
                <ChevronDown className="text-[#7b8ab8]" style={{ width: iconSize, height: iconSize }} />
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="end"
              className="z-50 rounded-2xl border border-[#3a5da0] bg-[#172252] p-0 text-[#e8f4fc] shadow-[0_24px_64px_rgba(0,0,0,0.72)] ring-1 ring-[#4a6fb5]/25"
              style={{ width: panelWidth }}
            >
              <div className="border-b border-[#2c4576] px-4 py-3">
                <div className="font-semibold text-[#e8f4fc]" style={{ fontSize: scale.fluid(14, 17) }}>
                  {zh ? "选择月份" : "Select month"}
                </div>
              </div>

              <div className="border-b border-[#2c4576] p-3">
                <div className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2">
                  <Select
                    value={String(viewDate.getFullYear())}
                    onValueChange={(value) => setViewDate(new Date(Number(value), viewDate.getMonth(), 1))}
                  >
                    <SelectTrigger
                      className="w-full rounded-lg border-[#26456e] bg-[#101840] text-[#e8f4fc]"
                      style={{ height: triggerHeight, fontSize: controlSize }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[#26456e] bg-[#101840] text-[#e8f4fc]" style={{ fontSize: controlSize }}>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={String(year)} className="text-[#e8f4fc]" style={{ fontSize: controlSize }}>
                          {zh ? `${year}年` : String(year)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={String(viewDate.getMonth())}
                    onValueChange={(value) => setViewDate(new Date(viewDate.getFullYear(), Number(value), 1))}
                  >
                    <SelectTrigger
                      className="w-full rounded-lg border-[#26456e] bg-[#101840] text-[#e8f4fc]"
                      style={{ height: triggerHeight, fontSize: controlSize }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[#26456e] bg-[#101840] text-[#e8f4fc]" style={{ fontSize: controlSize }}>
                      {monthNames.map((month, index) => (
                        <SelectItem
                          key={`${month}-${index}`}
                          value={String(index)}
                          className="text-[#e8f4fc]"
                          style={{ fontSize: controlSize }}
                        >
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <button
                    type="button"
                    onClick={() => setViewDate((prev) => addMonths(prev, -1))}
                    className="flex items-center justify-center rounded-md border border-[#26456e] bg-[#101840] text-[#c7d7f5] transition-colors hover:border-[#22d3ee]/50 hover:text-white"
                    style={{ width: navEdge, height: navEdge }}
                    aria-label={zh ? "上一个月" : "Previous month"}
                  >
                    <ChevronLeft style={{ width: iconSize, height: iconSize }} />
                  </button>

                  <button
                    type="button"
                    onClick={() => canGoNextMonth && setViewDate((prev) => addMonths(prev, 1))}
                    disabled={!canGoNextMonth}
                    className="flex items-center justify-center rounded-md border border-[#26456e] bg-[#101840] text-[#c7d7f5] transition-colors hover:border-[#22d3ee]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    style={{ width: navEdge, height: navEdge }}
                    aria-label={zh ? "下一个月" : "Next month"}
                  >
                    <ChevronRight style={{ width: iconSize, height: iconSize }} />
                  </button>
                </div>
              </div>

              <Calendar
                mode="range"
                selected={selectedMonthRange}
                month={viewDate}
                onMonthChange={(month) => setViewDate(startOfMonth(month))}
                onSelect={(range) => {
                  if (!range?.from) return
                  setViewDate(startOfMonth(range.from))
                  setPickerOpen(false)
                }}
                hideNavigation
                showOutsideDays
                weekStartsOn={zh ? 1 : 0}
                formatters={
                  zh
                    ? {
                        formatWeekdayName: (date) => weekdayNamesZh[(date.getDay() + 6) % 7],
                      }
                    : undefined
                }
                className="bg-transparent p-3"
                classNames={{
                  month_caption: "hidden",
                  weekday: "flex-1 rounded-md text-[#7b8ab8]",
                  day: "relative aspect-square w-full p-0 text-center",
                  selected: "rounded-md bg-[#00d4aa] text-[#041123] font-semibold",
                  today: "rounded-md bg-[#1c315f] text-[#e8f4fc]",
                  outside: "text-[#7b8ab8]/70",
                  disabled: "text-[#8d97aa] opacity-55",
                  range_middle: "bg-[#15406d] text-[#dff8ff]",
                  range_start: "rounded-l-md bg-[#00d4aa] text-[#041123]",
                  range_end: "rounded-r-md bg-[#00d4aa] text-[#041123]",
                }}
                styles={{
                  weekday: { fontSize: hintSize },
                  day: { fontSize: controlSize },
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#33507e] bg-[linear-gradient(180deg,rgba(16,24,64,0.9),rgba(10,18,48,0.94))]">
        <div className="grid grid-cols-7 border-b border-[#33507e] bg-[#101840]/92">
          {labels.map((label) => (
            <div key={label} className="border-r border-[#2f4a78] px-2 py-2 font-semibold text-[#eef4ff] last:border-r-0" style={{ fontSize: controlSize }}>
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

              return (
                <div
                  key={cell.date.toISOString()}
                  className={`group/cell relative flex min-h-0 flex-col border-r border-b border-[#2f4a78] p-2.5 transition-colors ${
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
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold ${isToday ? "text-[#22d3ee]" : hasReports ? "text-[#eef4ff]" : "text-[#c4d2f0]"}`}
                            style={{ fontSize: dayNumberSize }}
                          >
                            {cell.date.getDate()}
                          </span>
                          {hasReports && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee] shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                          )}
                        </span>
                        {isToday && (
                          <span
                            className="rounded-full border border-[#1d5b54] bg-[#10252d] px-2 py-0.5 text-[#66e6cb]"
                            style={{ fontSize: hintSize }}
                          >
                            {zh ? "今天" : "Today"}
                          </span>
                        )}
                      </div>

                      <div className="mt-auto">
                        {hasReports ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                className="group flex w-full items-center justify-between gap-1 rounded-lg border border-[#4b95ff]/60 bg-[linear-gradient(180deg,rgba(43,82,170,0.92),rgba(26,52,116,0.92))] px-2.5 text-left shadow-[0_2px_10px_rgba(20,60,140,0.35)] transition-all hover:border-[#62a6ff] hover:brightness-110 hover:shadow-[0_4px_16px_rgba(30,90,200,0.5)] data-[state=open]:border-[#62a6ff] data-[state=open]:shadow-[0_0_0_1px_rgba(98,166,255,0.45)]"
                                style={{ height: triggerHeight }}
                              >
                                <span className="flex min-w-0 items-center gap-1.5">
                                  <FileText className="shrink-0 text-[#bcd6ff]" style={{ width: iconSize, height: iconSize }} />
                                  <span className="truncate font-semibold text-white" style={{ fontSize: actionLabelSize }}>
                                    {zh ? "日报" : "Report"}
                                  </span>
                                </span>
                                <span className="flex shrink-0 items-center gap-1">
                                  <span
                                    className="rounded-full border border-[#7fb4ff]/55 bg-[#0f1f49] px-1.5 font-semibold text-[#cfe0ff]"
                                    style={{ fontSize: hintSize }}
                                  >
                                    {totalCount}
                                  </span>
                                  <ChevronDown
                                    className="text-[#9fc2ff] transition-transform duration-200 group-data-[state=open]:rotate-180"
                                    style={{ width: iconSize, height: iconSize }}
                                  />
                                </span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
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
                          <div
                            className="animate-pulse rounded-lg border border-[#243a6b]/50 bg-[#16224e]/70"
                            style={{ height: triggerHeight }}
                          />
                        ) : (
                          <div
                            className="flex items-center justify-center rounded-lg border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] font-medium tracking-wide text-[#aab9dc] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-[1px]"
                            style={{ height: triggerHeight, fontSize: actionLabelSize }}
                          >
                            {!deviceId
                              ? zh
                                ? "选择 BCU"
                                : "Select BCU"
                              : zh
                                ? "无报表"
                                : "No report"}
                          </div>
                        )}
                      </div>
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
