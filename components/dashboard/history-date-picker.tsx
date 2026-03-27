"use client"

import { useMemo, useState } from "react"
import { CalendarDays, ChevronDown } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const monthNamesEn = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]
const monthNamesZh = [
  "1月","2月","3月","4月","5月","6月",
  "7月","8月","9月","10月","11月","12月",
]

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function isFuture(date: Date, max: Date) {
  return date > max
}

export function HistoryDatePicker({
  value,
  onChange,
  max,
}: {
  value: string
  onChange: (d: string) => void
  max: string
}) {
  const { language } = useLanguage()
  const zh = language === "zh"

  const maxDate = useMemo(() => new Date(max + "T00:00:00"), [max])
  const selected = useMemo(
    () => (value ? new Date(value + "T00:00:00") : maxDate),
    [value, maxDate],
  )
  const [viewDate, setViewDate] = useState(() => startOfMonth(selected))
  const [open, setOpen] = useState(false)

  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let y = 2024; y <= maxDate.getFullYear(); y++) years.push(y)
    return years
  }, [maxDate])

  const formatted = zh
    ? `${selected.getFullYear()}年${selected.getMonth() + 1}月${selected.getDate()}日`
    : `${monthNamesEn[selected.getMonth()].slice(0, 3)} ${selected.getDate()}, ${selected.getFullYear()}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-xl border border-[#26456e] bg-[#101840] px-3 py-1.5 text-xs text-[#e8f4fc] transition-all hover:border-[#22d3ee]/60">
          <CalendarDays className="h-3.5 w-3.5 text-[#8db7ff]" />
          <span className="font-medium">{formatted}</span>
          <ChevronDown className="h-3.5 w-3.5 text-[#7b8ab8]" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="z-50 w-[300px] rounded-2xl border border-[#26456e] bg-[#0d1233] p-0 text-[#e8f4fc]"
      >
        {/* Year + Month selects */}
        <div className="border-b border-[#1a2654] p-3">
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={String(viewDate.getFullYear())}
              onValueChange={(v) =>
                setViewDate(new Date(Number(v), viewDate.getMonth(), 1))
              }
            >
              <SelectTrigger className="h-9 w-full rounded-lg border-[#26456e] bg-[#101840] text-[#e8f4fc]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#26456e] bg-[#101840] text-[#e8f4fc]">
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-[#e8f4fc]">
                    {zh ? `${y}年` : String(y)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(viewDate.getMonth())}
              onValueChange={(v) =>
                setViewDate(new Date(viewDate.getFullYear(), Number(v), 1))
              }
            >
              <SelectTrigger className="h-9 w-full rounded-lg border-[#26456e] bg-[#101840] text-[#e8f4fc]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#26456e] bg-[#101840] text-[#e8f4fc]">
                {(zh ? monthNamesZh : monthNamesEn).map((m, i) => (
                  <SelectItem key={m} value={String(i)} className="text-[#e8f4fc]">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Day calendar */}
        <Calendar
          mode="single"
          selected={selected}
          month={viewDate}
          onMonthChange={(m) => setViewDate(startOfMonth(m))}
          disabled={(date) => isFuture(date, maxDate)}
          onSelect={(date) => {
            if (!date) return
            const pad = (n: number) => String(n).padStart(2, "0")
            const str = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
            onChange(str)
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
