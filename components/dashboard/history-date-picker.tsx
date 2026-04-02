"use client"

import { useMemo, useState } from "react"
import { CalendarDays, ChevronDown } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const monthNamesEn = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const monthNamesZh = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
]

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function isFuture(date: Date, max: Date) {
  return date > max
}

export function HistoryDatePicker({
  value,
  onChange,
  max,
  compact = false,
}: {
  value: string
  onChange: (date: string) => void
  max: string
  compact?: boolean
}) {
  const { language } = useLanguage()
  const zh = language === "zh"

  const maxDate = useMemo(() => parseLocalDate(max), [max])
  const selected = useMemo(() => (value ? parseLocalDate(value) : maxDate), [value, maxDate])
  const [viewDate, setViewDate] = useState(() => startOfMonth(selected))
  const [open, setOpen] = useState(false)

  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let year = 2024; year <= maxDate.getFullYear(); year += 1) {
      years.push(year)
    }
    return years
  }, [maxDate])

  const formatted = zh
    ? `${selected.getFullYear()}年${selected.getMonth() + 1}月${selected.getDate()}日`
    : `${monthNamesEn[selected.getMonth()].slice(0, 3)} ${selected.getDate()}, ${selected.getFullYear()}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex shrink-0 items-center whitespace-nowrap border border-[#26456e] bg-[#101840] text-[#e8f4fc] transition-all hover:border-[#22d3ee]/60 ${
            compact
              ? "h-8 gap-1.5 rounded-[11px] px-2.5 text-[11px]"
              : "h-9 gap-2 rounded-xl px-3 text-xs"
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5 text-[#8db7ff]" />
          <span className="font-medium">{formatted}</span>
          <ChevronDown className="h-3.5 w-3.5 text-[#7b8ab8]" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="z-50 w-[300px] rounded-2xl border border-[#26456e] bg-[#0d1233] p-0 text-[#e8f4fc]"
      >
        <div className="border-b border-[#1a2654] p-3">
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={String(viewDate.getFullYear())}
              onValueChange={(nextYear) => setViewDate(new Date(Number(nextYear), viewDate.getMonth(), 1))}
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
              value={String(viewDate.getMonth())}
              onValueChange={(nextMonth) => setViewDate(new Date(viewDate.getFullYear(), Number(nextMonth), 1))}
            >
              <SelectTrigger className="h-9 w-full rounded-lg border-[#26456e] bg-[#101840] text-[#e8f4fc]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#26456e] bg-[#101840] text-[#e8f4fc]">
                {(zh ? monthNamesZh : monthNamesEn).map((month, index) => (
                  <SelectItem key={month} value={String(index)} className="text-[#e8f4fc]">
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Calendar
          mode="single"
          selected={selected}
          month={viewDate}
          onMonthChange={(month) => setViewDate(startOfMonth(month))}
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
          showOutsideDays={false}
          className="bg-[#0d1233] p-3"
          classNames={{
            month_caption: "hidden",
            weekday: "flex-1 rounded-md text-xs text-[#7b8ab8]",
            day: "relative aspect-square w-full p-0 text-center",
            selected: "rounded-md bg-[#00d4aa] text-[#041123] font-semibold",
            today: "rounded-md bg-[#1c315f] text-[#e8f4fc]",
            outside: "text-[#42557f]",
            disabled: "text-[#42557f] opacity-40",
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
