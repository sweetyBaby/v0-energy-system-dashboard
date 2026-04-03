"use client"

import { useMemo, useState } from "react"
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Crosshair } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/components/language-provider"

const DAY_MS = 24 * 60 * 60 * 1000

const monthNamesEn = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const monthNamesZh = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
]

const weekdayNamesZh = ["一", "二", "三", "四", "五", "六", "日"]

const toDayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const getDayDiff = (from: Date, to: Date) =>
  Math.round((toDayStart(to).getTime() - toDayStart(from).getTime()) / DAY_MS)

const getRangeLength = (from: Date, to: Date) => getDayDiff(from, to) + 1

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1)

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
  align = "end",
}: {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  maxDate: Date
  maxDays: number
  buttonLabel?: string
  hint: string
  maxRangeError: string
  align?: "start" | "center" | "end"
}) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const [open, setOpen] = useState(false)
  const [pickerMonth, setPickerMonth] = useState<Date>(startOfMonth(value?.from ?? maxDate))
  const [rangeError, setRangeError] = useState("")

  const normalizedMaxDate = useMemo(() => toDayStart(maxDate), [maxDate])
  const monthNames = zh ? monthNamesZh : monthNamesEn

  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let year = 2024; year <= normalizedMaxDate.getFullYear(); year += 1) {
      years.push(year)
    }
    return years
  }, [normalizedMaxDate])

  const canGoNextMonth =
    pickerMonth.getFullYear() < normalizedMaxDate.getFullYear() ||
    pickerMonth.getMonth() < normalizedMaxDate.getMonth()

  const handleRangeSelect = (nextRange: DateRange | undefined) => {
    if (!nextRange?.from) {
      onChange(undefined)
      setRangeError("")
      return
    }

    if (!nextRange.to) {
      onChange({ from: toDayStart(nextRange.from), to: undefined })
      setRangeError("")
      return
    }

    const from = toDayStart(nextRange.from)
    const to = toDayStart(nextRange.to)

    if (getRangeLength(from, to) > maxDays) {
      onChange({ from, to: undefined })
      setRangeError(maxRangeError)
      setPickerMonth(startOfMonth(from))
      return
    }

    onChange({ from, to })
    setRangeError("")
    setPickerMonth(startOfMonth(from))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-xl border border-[#26456e] bg-[#101840] px-3 py-1.5 text-xs text-[#e8f4fc] transition-all hover:border-[#22d3ee]/60">
          <CalendarDays className="h-3.5 w-3.5 text-[#8db7ff]" />
          <span className="font-medium">{buttonLabel ?? formatRangeLabel(value, language)}</span>
          <ChevronDown className="h-3.5 w-3.5 text-[#7b8ab8]" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        className="z-50 w-[320px] rounded-2xl border border-[#26456e] bg-[#0d1233] p-0 text-[#e8f4fc]"
      >
        <div className="border-b border-[#1a2654] px-4 py-3">
          <div className="text-sm font-semibold text-[#e8f4fc]">
            {zh ? "选择日期范围" : "Select range"}
            <span className="ml-1 text-[11px] font-normal text-[#7b8ab8]">
              {zh ? `（${hint}）` : `(${hint})`}
            </span>
          </div>
          {rangeError && <div className="mt-1 text-[11px] text-[#fda4af]">{rangeError}</div>}
        </div>

        <div className="border-b border-[#1a2654] p-3">
          <div className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2">
            <Select
              value={String(pickerMonth.getFullYear())}
              onValueChange={(nextYear) => setPickerMonth(new Date(Number(nextYear), pickerMonth.getMonth(), 1))}
            >
              <SelectTrigger className="h-9 w-full rounded-lg border-[#26456e] bg-[#101840] text-[#e8f4fc]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#26456e] bg-[#101840] text-[#e8f4fc]">
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)} className="text-[#e8f4fc]">
                    {zh ? `${year}年` : String(year)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(pickerMonth.getMonth())}
              onValueChange={(nextMonth) => setPickerMonth(new Date(pickerMonth.getFullYear(), Number(nextMonth), 1))}
            >
              <SelectTrigger className="h-9 w-full rounded-lg border-[#26456e] bg-[#101840] text-[#e8f4fc]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#26456e] bg-[#101840] text-[#e8f4fc]">
                {monthNames.map((month, index) => (
                  <SelectItem key={`${month}-${index}`} value={String(index)} className="text-[#e8f4fc]">
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={() => setPickerMonth((prev) => addMonths(prev, -1))}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[#26456e] bg-[#101840] text-[#c7d7f5] transition-colors hover:border-[#22d3ee]/50 hover:text-white"
              aria-label={zh ? "上一个月" : "Previous month"}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => canGoNextMonth && setPickerMonth((prev) => addMonths(prev, 1))}
              disabled={!canGoNextMonth}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[#26456e] bg-[#101840] text-[#c7d7f5] transition-colors hover:border-[#22d3ee]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              aria-label={zh ? "下一个月" : "Next month"}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Calendar
          mode="range"
          selected={value}
          month={pickerMonth}
          onMonthChange={(month) => setPickerMonth(startOfMonth(month))}
          onSelect={handleRangeSelect}
          numberOfMonths={1}
          weekStartsOn={zh ? 1 : 0}
          formatters={
            zh
              ? {
                  formatWeekdayName: (date) => weekdayNamesZh[(date.getDay() + 6) % 7],
                }
              : undefined
          }
          disabled={(date) => {
            const day = toDayStart(date)
            if (day > normalizedMaxDate) return true
            if (value?.from && !value.to) {
              return Math.abs(getDayDiff(value.from, day)) > maxDays - 1
            }
            return false
          }}
          hideNavigation
          showOutsideDays
          className="bg-[#0d1233] p-3"
          classNames={{
            month_caption: "hidden",
            weekday: "flex-1 rounded-md text-xs text-[#7b8ab8]",
            day: "relative aspect-square w-full p-0 text-center",
            selected: "rounded-md bg-[#00d4aa] text-[#041123] font-semibold",
            today: "rounded-md bg-[#1c315f] text-[#e8f4fc]",
            outside: "text-[#7b8ab8]/70",
            disabled: "text-[#8d97aa] opacity-55",
            range_middle: "bg-[#15406d] text-[#dff8ff]",
            range_start: "rounded-l-md bg-[#00d4aa] text-[#041123]",
            range_end: "rounded-r-md bg-[#00d4aa] text-[#041123]",
          }}
        />

        <div className="border-t border-[#1a2654] px-4 py-3">
          <button
            type="button"
            onClick={() => {
              const current = normalizedMaxDate
              onChange({ from: current, to: current })
              setRangeError("")
              setPickerMonth(startOfMonth(current))
              setOpen(false)
            }}
            className="mx-auto flex items-center gap-1.5 text-sm text-[#e8f4fc] transition-colors hover:text-[#22d3ee]"
          >
            <Crosshair className="h-4 w-4" />
            <span>{zh ? "今天" : "Today"}</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
