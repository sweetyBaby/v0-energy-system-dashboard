"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Crosshair } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useFluidScale } from "@/hooks/use-fluid-scale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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

const weekdayNamesZh = ["一", "二", "三", "四", "五", "六", "日"]

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

const toDayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1)
const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth()
const isFuture = (date: Date, max: Date) => toDayStart(date) > toDayStart(max)
const clampToMax = (date: Date, max: Date) => (isFuture(date, max) ? toDayStart(max) : toDayStart(date))

export function HistoryDatePicker({
  value,
  onChange,
  max,
  compact = false,
  fontSize,
  height,
  minWidth,
}: {
  value: string
  onChange: (date: string) => void
  max: string
  compact?: boolean
  fontSize?: number
  height?: number
  minWidth?: number
}) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const scale = useFluidScale<HTMLDivElement>(1180, 1920, { minRootPx: 14, maxRootPx: 18 })
  const triggerFontSize = fontSize ?? (compact ? scale.fluid(11, 13.5) : scale.fluid(12, 15))
  const resolvedHeight = height ?? (compact ? 34 : 36)
  const triggerIconSize = Math.max(compact ? scale.fluid(14, 16) : scale.fluid(14, 18), triggerFontSize + 1.5, resolvedHeight * 0.42)
  const panelTitleSize = scale.fluid(14, 17)
  const panelControlSize = scale.fluid(12, 14.5)
  const panelHintSize = scale.fluid(11, 13)
  const triggerHeight = `${resolvedHeight}px`
  const panelWidth = scale.fluid(320, 376)

  const maxDate = useMemo(() => parseLocalDate(max), [max])
  const selected = useMemo(() => clampToMax(value ? parseLocalDate(value) : maxDate, maxDate), [value, maxDate])
  const [viewDate, setViewDate] = useState(() => startOfMonth(selected))
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setViewDate(startOfMonth(selected))
  }, [selected])

  const monthNames = zh ? monthNamesZh : monthNamesEn

  const formatted = zh
    ? `${selected.getFullYear()}/${selected.getMonth() + 1}/${selected.getDate()}`
    : `${monthNamesEn[selected.getMonth()].slice(0, 3)} ${selected.getDate()}, ${selected.getFullYear()}`

  const minMonthIndex = 2024 * 12
  const maxMonthIndex = monthIndex(maxDate)
  const canPrevMonth = monthIndex(viewDate) > minMonthIndex
  const canPrevYear = monthIndex(addMonths(viewDate, -12)) >= minMonthIndex
  const canGoNextMonth = monthIndex(viewDate) < maxMonthIndex
  const canNextYear = monthIndex(addMonths(viewDate, 12)) <= maxMonthIndex

  return (
    <div ref={scale.ref} style={scale.rootStyle}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`flex shrink-0 items-center whitespace-nowrap rounded-[11px] border text-[#e8f4fc] transition-all ${
              compact ? "gap-1.5 rounded-[11px] px-2.5" : "gap-2 rounded-xl px-3.5"
            }`}
            style={{
              height: triggerHeight,
              fontSize: triggerFontSize,
              minWidth: minWidth ? `${minWidth}px` : undefined,
              background: "linear-gradient(180deg,rgba(17,27,60,0.98),rgba(10,18,45,0.98))",
              borderColor: open ? "rgba(69,241,208,0.55)" : "rgba(39,73,111,1)",
              boxShadow: open
                ? "0 0 0 1px rgba(69,241,208,0.08) inset, 0 0 18px rgba(34,211,238,0.14)"
                : "0 0 0 1px rgba(115,198,255,0.05) inset, 0 8px 18px rgba(0,0,0,0.16)",
            }}
          >
            <CalendarDays className="text-[#8db7ff]" style={{ width: triggerIconSize, height: triggerIconSize }} />
            <span className="font-semibold tracking-[0.01em]">{formatted}</span>
            <ChevronDown className="text-[#7b8ab8]" style={{ width: triggerIconSize, height: triggerIconSize }} />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="z-50 rounded-2xl border border-[#26456e] bg-[#0d1233] p-0 text-[#e8f4fc]"
          style={{ width: panelWidth }}
        >
          <div className="border-b border-[#1a2654] px-4 py-3">
            <div className="font-semibold text-[#e8f4fc]" style={{ fontSize: panelTitleSize }}>
              {zh ? "选择日期" : "Select date"}
            </div>
          </div>

          {/* Ant Design style nav: «(year) ‹(month) [label] ›(month) »(year) */}
          <div className="flex items-center justify-between border-b border-[#1a2654] px-3 py-2.5" style={{ fontSize: panelControlSize }}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => canPrevYear && setViewDate((prev) => startOfMonth(addMonths(prev, -12)))}
                disabled={!canPrevYear}
                className="rounded p-1 text-[#7b8ab8] transition-colors hover:text-[#cfe4ff] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={zh ? "上一年" : "Previous year"}
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => canPrevMonth && setViewDate((prev) => startOfMonth(addMonths(prev, -1)))}
                disabled={!canPrevMonth}
                className="rounded p-1 text-[#7b8ab8] transition-colors hover:text-[#cfe4ff] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={zh ? "上一个月" : "Previous month"}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <span className="font-semibold text-[#e8f4fc]">
              {zh ? `${viewDate.getFullYear()}年 ${monthNames[viewDate.getMonth()]}` : `${monthNamesEn[viewDate.getMonth()]} ${viewDate.getFullYear()}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => canGoNextMonth && setViewDate((prev) => startOfMonth(clampToMax(addMonths(prev, 1), maxDate)))}
                disabled={!canGoNextMonth}
                className="rounded p-1 text-[#7b8ab8] transition-colors hover:text-[#cfe4ff] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={zh ? "下一个月" : "Next month"}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => canNextYear && setViewDate((prev) => startOfMonth(clampToMax(addMonths(prev, 12), maxDate)))}
                disabled={!canNextYear}
                className="rounded p-1 text-[#7b8ab8] transition-colors hover:text-[#cfe4ff] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={zh ? "下一年" : "Next year"}
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <Calendar
            mode="single"
            selected={selected}
            month={viewDate}
            onMonthChange={(month) => setViewDate(startOfMonth(clampToMax(month, maxDate)))}
            disabled={(date) => isFuture(date, maxDate)}
            onSelect={(date) => {
              if (!date) return
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, "0")
              const day = String(date.getDate()).padStart(2, "0")
              onChange(`${year}-${month}-${day}`)
              setOpen(false)
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
            className="bg-[#0d1233] p-3"
            classNames={{
              month_caption: "hidden",
              weekday: "flex-1 rounded-md text-[#7b8ab8]",
              day: "relative aspect-square w-full p-0 text-center",
              selected: "rounded-md bg-[#00d4aa] text-[#041123] font-semibold",
              today: "rounded-md bg-[#1c315f] text-[#e8f4fc]",
              outside: "text-[#7b8ab8]/70",
              disabled: "text-[#8d97aa] opacity-55",
            }}
            styles={{
              weekday: { fontSize: panelHintSize },
              day: { fontSize: panelControlSize },
            }}
          />

          <div className="border-t border-[#1a2654] px-4 py-3">
            <button
              type="button"
              onClick={() => {
                const year = maxDate.getFullYear()
                const month = String(maxDate.getMonth() + 1).padStart(2, "0")
                const day = String(maxDate.getDate()).padStart(2, "0")
                onChange(`${year}-${month}-${day}`)
                setViewDate(startOfMonth(maxDate))
                setOpen(false)
              }}
              className="mx-auto flex items-center gap-1.5 text-[#e8f4fc] transition-colors hover:text-[#22d3ee]"
              style={{ fontSize: panelControlSize }}
            >
              <Crosshair style={{ width: triggerIconSize, height: triggerIconSize }} />
              <span>{zh ? "最新可用日期" : "Latest available"}</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
