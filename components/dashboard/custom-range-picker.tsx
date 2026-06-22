"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Crosshair } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useLanguage } from "@/components/language-provider"

const DAY_MS = 24 * 60 * 60 * 1000

const monthNamesEn = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const monthNamesZh = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
const weekdayNamesZh = ["一", "二", "三", "四", "五", "六", "日"]

const toDayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const getDayDiff = (from: Date, to: Date) => Math.round((toDayStart(to).getTime() - toDayStart(from).getTime()) / DAY_MS)
const getRangeLength = (from: Date, to: Date) => getDayDiff(from, to) + 1
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1)
const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth()

const formatRangeLabel = (range: DateRange | undefined, language: "zh" | "en") => {
  if (!range?.from) return language === "zh" ? "选择日期范围" : "Select range"
  const formatDate = (date: Date) => `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
  if (!range.to) return formatDate(range.from)
  return `${formatDate(range.from)} - ${formatDate(range.to)}`
}

export function CustomRangePicker({
  value,
  onChange,
  maxDate,
  maxDays,
  buttonLabel,
  hint,
  maxRangeError,
  quickSelectLabel,
  align = "end",
  compact = false,
  fontSize,
  height,
  minWidth,
}: {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  maxDate: Date
  maxDays: number
  buttonLabel?: string
  hint: string
  maxRangeError: string
  quickSelectLabel?: string
  align?: "start" | "center" | "end"
  compact?: boolean
  fontSize?: number
  height?: number
  minWidth?: number
}) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const [open, setOpen] = useState(false)
  const [rangeError, setRangeError] = useState("")
  const [hoverDate, setHoverDate] = useState<Date | null>(null)
  // Draft selection — committed to onChange only when 确定 is pressed.
  const [draft, setDraft] = useState<DateRange | undefined>(value)

  const normalizedMaxDate = useMemo(() => toDayStart(maxDate), [maxDate])
  const maxMonthIndex = monthIndex(normalizedMaxDate)
  const monthNames = zh ? monthNamesZh : monthNamesEn

  // The right panel is always one month after the left; cap the left panel so the
  // right one never goes past the max selectable month.
  const clampLeft = (month: Date) =>
    monthIndex(month) > maxMonthIndex - 1 ? addMonths(normalizedMaxDate, -1) : startOfMonth(month)

  const [leftMonth, setLeftMonth] = useState<Date>(() => clampLeft(startOfMonth(value?.from ?? maxDate)))
  const rightMonth = addMonths(leftMonth, 1)

  // Re-seed the draft + view from the committed value each time the panel opens.
  useEffect(() => {
    if (!open) {
      setHoverDate(null)
      return
    }
    setDraft(value)
    setRangeError("")
    setLeftMonth(clampLeft(startOfMonth(value?.from ?? maxDate)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const resolvedHeight = height ?? (compact ? 34 : 36)
  const resolvedFontSize = fontSize ?? null
  const triggerFontSize = resolvedFontSize ? `${resolvedFontSize}px` : "clamp(0.82rem, calc(var(--overview-root-size, 15px) * 0.92), 1.02rem)"
  const triggerIconSize = resolvedFontSize
    ? `${Math.max(resolvedFontSize + 1.5, resolvedHeight * 0.42)}px`
    : "clamp(0.92rem, calc(var(--overview-root-size, 15px) * 1.02), 1.1rem)"
  const panelTitleFontSize = "clamp(0.92rem, calc(var(--overview-root-size, 15px) * 1.02), 1.08rem)"
  const panelHintFontSize = "clamp(0.72rem, calc(var(--overview-root-size, 15px) * 0.8), 0.84rem)"
  const navLabelFontSize = "clamp(0.86rem, calc(var(--overview-root-size, 15px) * 0.96), 1rem)"
  const footerFontSize = "clamp(0.84rem, calc(var(--overview-root-size, 15px) * 0.94), 0.98rem)"

  const canPrev = monthIndex(leftMonth) > 2024 * 12
  const canNext = monthIndex(rightMonth) < maxMonthIndex
  const canNextYear = monthIndex(addMonths(rightMonth, 12)) <= maxMonthIndex

  // Ant Design hover preview: after the first click (from set, to empty), hovering a
  // day previews the range that would result.
  const selectingEnd = Boolean(draft?.from && !draft.to)
  const previewMatcher = (date: Date) => {
    if (!selectingEnd || !hoverDate || !draft?.from) return false
    const d = toDayStart(date).getTime()
    const a = toDayStart(draft.from).getTime()
    const b = toDayStart(hoverDate).getTime()
    return d > Math.min(a, b) && d <= Math.max(a, b)
  }

  const handleRangeSelect = (nextRange: DateRange | undefined) => {
    if (!nextRange?.from) {
      setDraft(undefined)
      setRangeError("")
      return
    }
    if (!nextRange.to) {
      setDraft({ from: toDayStart(nextRange.from), to: undefined })
      setRangeError("")
      return
    }
    const from = toDayStart(nextRange.from)
    const to = toDayStart(nextRange.to)
    if (getRangeLength(from, to) > maxDays) {
      // Keep the new start, ask for a closer end — do not commit / close.
      setDraft({ from, to: undefined })
      setRangeError(maxRangeError)
      setLeftMonth(clampLeft(startOfMonth(from)))
      return
    }
    setDraft({ from, to })
    setRangeError("")
    setHoverDate(null)
  }

  const draftComplete = Boolean(draft?.from && draft.to)

  const commit = () => {
    if (!draftComplete) return
    onChange(draft)
    setOpen(false)
  }

  const navButtonClass =
    "rounded p-1 text-[#7b8ab8] transition-colors hover:text-[#cfe4ff] disabled:cursor-not-allowed disabled:opacity-30"

  const calendarClassNames = {
    months: "flex gap-4",
    // Fixed panel width keeps the dual panels compact so the popover fits on screen.
    month: "flex w-[192px] flex-col gap-1",
    month_caption: "hidden",
    weekdays: "flex",
    weekday: "flex-1 rounded-md text-[12px] text-[#7b8ab8]",
    day: "relative aspect-square w-full p-0 text-center",
    selected: "bg-[#00d4aa] text-[#041123] font-semibold",
    today: "rounded-md ring-1 ring-[#45f1d0]/60",
    outside: "text-[#7b8ab8]/60",
    disabled: "text-[#8d97aa] opacity-45",
    // Override the inner day button too — it carries data-[range-middle]:bg-accent
    // (the theme's orange) which would otherwise sit on top of the cell color.
    range_middle: "rounded-none [&_button]:!bg-[#15406d] [&_button]:!text-[#dff8ff]",
    range_start: "rounded-l-md bg-[#00d4aa] text-[#041123]",
    range_end: "rounded-r-md bg-[#00d4aa] text-[#041123]",
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-2 rounded-xl border text-[#e8f4fc] transition-all ${compact ? "px-2.5" : "px-3.5"}`}
          style={{
            fontSize: triggerFontSize,
            height: `${resolvedHeight}px`,
            minWidth: minWidth ? `${minWidth}px` : undefined,
            background: "linear-gradient(180deg,rgba(17,27,60,0.98),rgba(10,18,45,0.98))",
            borderColor: open ? "rgba(69,241,208,0.55)" : "rgba(39,73,111,1)",
            boxShadow: open
              ? "0 0 0 1px rgba(69,241,208,0.08) inset, 0 0 18px rgba(34,211,238,0.14)"
              : "0 0 0 1px rgba(115,198,255,0.05) inset, 0 8px 18px rgba(0,0,0,0.16)",
          }}
        >
          <CalendarDays className="shrink-0 text-[#8db7ff]" style={{ width: triggerIconSize, height: triggerIconSize }} />
          <span className="font-semibold tracking-[0.01em]">{buttonLabel ?? formatRangeLabel(value, language)}</span>
          <ChevronDown className="shrink-0 text-[#7b8ab8]" style={{ width: triggerIconSize, height: triggerIconSize }} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        side="bottom"
        sideOffset={6}
        avoidCollisions
        collisionPadding={12}
        className="z-50 w-auto rounded-2xl border border-[#3f6ea8] bg-[#0d1233] p-0 text-[#e8f4fc] shadow-[0_18px_48px_rgba(0,0,0,0.6),0_0_0_1px_rgba(69,241,208,0.18)]"
      >
        <div className="border-b border-[#1a2654] px-4 py-2.5">
          <span className="font-semibold text-[#e8f4fc]" style={{ fontSize: panelTitleFontSize }}>
            {zh ? "选择日期范围" : "Select range"}
          </span>
          <div className="mt-1 text-[#7b8ab8]" style={{ fontSize: panelHintFontSize }}>
            {rangeError ? <span className="text-[#fda4af]">{rangeError}</span> : zh ? `（${hint}）` : `(${hint})`}
          </div>
        </div>

        {/* Dual-panel nav header */}
        <div className="flex items-center justify-between px-4 pt-2" style={{ fontSize: navLabelFontSize }}>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => canPrev && setLeftMonth((prev) => clampLeft(addMonths(prev, -12)))} disabled={!canPrev} className={navButtonClass} aria-label={zh ? "上一年" : "Previous year"}>
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => canPrev && setLeftMonth((prev) => clampLeft(addMonths(prev, -1)))} disabled={!canPrev} className={navButtonClass} aria-label={zh ? "上一月" : "Previous month"}>
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-around px-2 font-semibold text-[#e8f4fc]">
            <span>{zh ? `${leftMonth.getFullYear()}年 ${monthNames[leftMonth.getMonth()]}` : `${monthNames[leftMonth.getMonth()]} ${leftMonth.getFullYear()}`}</span>
            <span>{zh ? `${rightMonth.getFullYear()}年 ${monthNames[rightMonth.getMonth()]}` : `${monthNames[rightMonth.getMonth()]} ${rightMonth.getFullYear()}`}</span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => canNext && setLeftMonth((prev) => addMonths(prev, 1))} disabled={!canNext} className={navButtonClass} aria-label={zh ? "下一月" : "Next month"}>
              <ChevronRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => canNextYear && setLeftMonth((prev) => clampLeft(addMonths(prev, 12)))} disabled={!canNextYear} className={navButtonClass} aria-label={zh ? "下一年" : "Next year"}>
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Calendar
          mode="range"
          selected={draft}
          month={leftMonth}
          numberOfMonths={2}
          onMonthChange={(month) => setLeftMonth(clampLeft(month))}
          onSelect={handleRangeSelect}
          onDayMouseEnter={(day) => setHoverDate(day)}
          weekStartsOn={zh ? 1 : 0}
          formatters={zh ? { formatWeekdayName: (date) => weekdayNamesZh[(date.getDay() + 6) % 7] } : undefined}
          modifiers={{ preview: previewMatcher }}
          modifiersClassNames={{ preview: "rounded-none [&_button]:!bg-[#15406d]/55 [&_button]:!text-[#dff8ff]" }}
          disabled={(date) => {
            const day = toDayStart(date)
            if (day > normalizedMaxDate) return true
            if (draft?.from && !draft.to) return Math.abs(getDayDiff(draft.from, day)) > maxDays - 1
            return false
          }}
          hideNavigation
          // No outside days: in dual-panel view an endpoint would otherwise also show
          // (highlighted) in the adjacent month, looking like a 3rd selected date.
          showOutsideDays={false}
          className="bg-transparent px-3 py-2 [--cell-size:28px]"
          classNames={calendarClassNames}
        />

        {/* Footer: quick-select (left) + 取消 / 确定 (right) */}
        <div className="flex items-center justify-between gap-2 border-t border-[#1a2654] px-4 py-2.5" style={{ fontSize: footerFontSize }}>
          <button
            type="button"
            onClick={() => {
              const current = normalizedMaxDate
              setDraft({ from: current, to: current })
              setRangeError("")
              setHoverDate(null)
              setLeftMonth(clampLeft(startOfMonth(current)))
            }}
            className="flex items-center gap-1.5 text-[#9bc4e8] transition-colors hover:text-[#22d3ee]"
          >
            <Crosshair className="h-[16px] w-[16px]" />
            <span>{quickSelectLabel ?? (zh ? "今天" : "Today")}</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-[#27496f] px-3 py-1 text-[#9bc4e8] transition-colors hover:border-[#45f1d0]/55 hover:text-[#cffcf2]"
            >
              {zh ? "取消" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={commit}
              disabled={!draftComplete}
              className="rounded-md bg-[#00d4aa] px-4 py-1 font-semibold text-[#04241c] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {zh ? "确定" : "OK"}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
