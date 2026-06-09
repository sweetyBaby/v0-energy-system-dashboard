"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

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

// Grid uses short labels so three columns stay compact and aligned.
const monthShortEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const monthNamesZh = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

type MonthPickerProps = {
  /** Currently selected month (any date within it; normalized to the 1st). */
  value: Date
  /** Fired with the first day of the chosen month. */
  onChange: (date: Date) => void
  /** Latest selectable month; later months are disabled. Defaults to today. */
  maxDate?: Date
  /** Earliest selectable year. Defaults to 2000. */
  minYear?: number
  /** Popover alignment relative to the trigger. */
  align?: "start" | "center" | "end"
  /** Trigger height in px — match the surrounding toolbar controls. */
  triggerHeight?: number
  /** Base font size in px for the trigger and panel cells. */
  fontSize?: number
  /** Icon size in px. */
  iconSize?: number
  /** Panel width in px. */
  panelWidth?: number
  /** Extra classes merged onto the trigger button. */
  className?: string
}

/**
 * Month picker modeled on the Ant Design `<DatePicker picker="month" />` panel:
 * a single popover with a 12-month grid and a clickable year header that flips to
 * a decade grid for fast year jumps — no stacked dropdowns. Selecting a month
 * commits the value and closes the panel.
 */
export function MonthPicker({
  value,
  onChange,
  maxDate,
  minYear = 2000,
  align = "end",
  triggerHeight = 40,
  fontSize = 14,
  iconSize = 16,
  panelWidth = 280,
  className,
}: MonthPickerProps) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const now = useMemo(() => new Date(), [])
  const max = maxDate ?? now
  const maxYear = max.getFullYear()
  const maxMonth = max.getMonth()

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"month" | "year">("month")
  const [displayYear, setDisplayYear] = useState(value.getFullYear())

  // Re-anchor the panel to the selected month every time it opens.
  useEffect(() => {
    if (open) {
      setDisplayYear(value.getFullYear())
      setMode("month")
    }
  }, [open, value])

  const triggerTitle = zh
    ? `${value.getFullYear()}年${value.getMonth() + 1}月`
    : `${monthNamesEn[value.getMonth()]} ${value.getFullYear()}`

  const monthLabels = zh ? monthNamesZh : monthShortEn
  const decadeStart = Math.floor(displayYear / 10) * 10
  const cellHeight = Math.round(fontSize * 2.55)

  // Header navigation steps by a year (month view) or a decade (year view).
  const step = mode === "month" ? 1 : 10
  const canGoPrev = mode === "month" ? displayYear > minYear : decadeStart - 1 > minYear
  const canGoNext = mode === "month" ? displayYear < maxYear : decadeStart + 10 < maxYear

  const goPrev = () => setDisplayYear((y) => Math.max(minYear, y - step))
  const goNext = () => setDisplayYear((y) => Math.min(maxYear, y + step))

  const headerLabel =
    mode === "month"
      ? zh
        ? `${displayYear}年`
        : String(displayYear)
      : zh
        ? `${decadeStart}-${decadeStart + 9}年`
        : `${decadeStart}-${decadeStart + 9}`

  const selectMonth = (monthIndex: number) => {
    onChange(startOfMonth(new Date(displayYear, monthIndex, 1)))
    setOpen(false)
  }

  const navButtonClass =
    "flex shrink-0 items-center justify-center rounded-md text-[#c7d7f5] transition-colors hover:bg-[#1c315f] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-xl border border-[#26456e] bg-[#101840] px-3.5 text-[#e8f4fc] transition-all hover:border-[#22d3ee]/60 data-[state=open]:border-[#22d3ee]/70",
            className,
          )}
          style={{ height: triggerHeight, fontSize }}
        >
          <CalendarDays className="shrink-0 text-[#8db7ff]" style={{ width: iconSize, height: iconSize }} />
          <span className="font-medium">{triggerTitle}</span>
          <ChevronDown
            className={cn("shrink-0 text-[#7b8ab8] transition-transform duration-200", open && "rotate-180")}
            style={{ width: iconSize, height: iconSize }}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        className="z-50 rounded-2xl border border-[#3a5da0] bg-[#172252] p-0 text-[#e8f4fc] shadow-[0_24px_64px_rgba(0,0,0,0.72)] ring-1 ring-[#4a6fb5]/25"
        style={{ width: panelWidth }}
      >
        <div className="flex items-center gap-1.5 border-b border-[#2c4576] px-2.5 py-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canGoPrev}
            className={navButtonClass}
            style={{ width: cellHeight, height: cellHeight }}
            aria-label={mode === "month" ? (zh ? "上一年" : "Previous year") : zh ? "上一个十年" : "Previous decade"}
          >
            <ChevronLeft style={{ width: iconSize, height: iconSize }} />
          </button>

          <button
            type="button"
            onClick={() => setMode((m) => (m === "month" ? "year" : "month"))}
            className="flex-1 rounded-lg py-1.5 text-center font-semibold text-[#e8f4fc] transition-colors hover:bg-[#1c315f] hover:text-[#7fe9ff]"
            style={{ fontSize: fontSize + 1 }}
          >
            {headerLabel}
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className={navButtonClass}
            style={{ width: cellHeight, height: cellHeight }}
            aria-label={mode === "month" ? (zh ? "下一年" : "Next year") : zh ? "下一个十年" : "Next decade"}
          >
            <ChevronRight style={{ width: iconSize, height: iconSize }} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 p-3">
          {mode === "month"
            ? monthLabels.map((label, monthIndex) => {
                const selected = displayYear === value.getFullYear() && monthIndex === value.getMonth()
                const isCurrent = displayYear === now.getFullYear() && monthIndex === now.getMonth()
                const disabled =
                  displayYear < minYear ||
                  displayYear > maxYear ||
                  (displayYear === maxYear && monthIndex > maxMonth)

                return (
                  <button
                    key={label}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectMonth(monthIndex)}
                    className={cn(
                      "flex items-center justify-center rounded-lg font-medium transition-all",
                      selected
                        ? "bg-[#00d4aa] font-semibold text-[#041123] shadow-[0_4px_14px_rgba(0,212,170,0.35)]"
                        : isCurrent
                          ? "border border-[#22d3ee]/70 text-[#7fe9ff] hover:bg-[#1c315f]"
                          : "text-[#c7d7f5] hover:bg-[#1c315f] hover:text-white",
                      disabled && "cursor-not-allowed text-[#5a6a92] opacity-40 hover:bg-transparent hover:text-[#5a6a92]",
                    )}
                    style={{ height: cellHeight, fontSize }}
                  >
                    {label}
                  </button>
                )
              })
            : Array.from({ length: 12 }, (_, index) => decadeStart - 1 + index).map((yearValue) => {
                const selected = yearValue === value.getFullYear()
                const isCurrent = yearValue === now.getFullYear()
                const outside = yearValue < decadeStart || yearValue > decadeStart + 9
                const disabled = yearValue < minYear || yearValue > maxYear

                return (
                  <button
                    key={yearValue}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setDisplayYear(yearValue)
                      setMode("month")
                    }}
                    className={cn(
                      "flex items-center justify-center rounded-lg font-medium transition-all",
                      selected
                        ? "bg-[#00d4aa] font-semibold text-[#041123] shadow-[0_4px_14px_rgba(0,212,170,0.35)]"
                        : isCurrent
                          ? "border border-[#22d3ee]/70 text-[#7fe9ff] hover:bg-[#1c315f]"
                          : outside
                            ? "text-[#5f79ad] hover:bg-[#1c315f] hover:text-[#c7d7f5]"
                            : "text-[#c7d7f5] hover:bg-[#1c315f] hover:text-white",
                      disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
                    )}
                    style={{ height: cellHeight, fontSize }}
                  >
                    {zh ? `${yearValue}` : yearValue}
                  </button>
                )
              })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
