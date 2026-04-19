"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Crosshair } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useFluidScale } from "@/hooks/use-fluid-scale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
const isFuture = (date: Date, max: Date) => toDayStart(date) > toDayStart(max)
const clampToMax = (date: Date, max: Date) => (isFuture(date, max) ? toDayStart(max) : toDayStart(date))

export function HistoryDatePicker({
  value,
  onChange,
  max,
  compact = false,
  fontSize,
}: {
  value: string
  onChange: (date: string) => void
  max: string
  compact?: boolean
  fontSize?: number
}) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const scale = useFluidScale<HTMLDivElement>(1180, 1920, { minRootPx: 14, maxRootPx: 18 })
  const triggerFontSize = fontSize ?? (compact ? scale.fluid(11, 13.5) : scale.fluid(12, 15))
  const triggerIconSize = compact ? scale.fluid(14, 16) : scale.fluid(14, 18)
  const panelTitleSize = scale.fluid(14, 17)
  const panelControlSize = scale.fluid(12, 14.5)
  const panelHintSize = scale.fluid(11, 13)
  const triggerHeight = compact ? "34px" : "36px"
  const panelWidth = scale.fluid(320, 376)
  const navEdge = scale.fluid(36, 42)

  const maxDate = useMemo(() => parseLocalDate(max), [max])
  const selected = useMemo(() => clampToMax(value ? parseLocalDate(value) : maxDate, maxDate), [value, maxDate])
  const [viewDate, setViewDate] = useState(() => startOfMonth(selected))
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setViewDate(startOfMonth(selected))
  }, [selected])

  const monthNames = zh ? monthNamesZh : monthNamesEn

  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let year = 2024; year <= maxDate.getFullYear(); year += 1) {
      years.push(year)
    }
    return years
  }, [maxDate])

  const formatted = zh
    ? `${selected.getFullYear()}/${selected.getMonth() + 1}/${selected.getDate()}`
    : `${monthNamesEn[selected.getMonth()].slice(0, 3)} ${selected.getDate()}, ${selected.getFullYear()}`

  const canGoNextMonth =
    viewDate.getFullYear() < maxDate.getFullYear() || viewDate.getMonth() < maxDate.getMonth()

  return (
    <div ref={scale.ref} style={scale.rootStyle}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`flex shrink-0 items-center whitespace-nowrap border border-[#26456e] bg-[#101840] text-[#e8f4fc] transition-all hover:border-[#22d3ee]/60 ${
              compact ? "gap-1.5 rounded-[11px] px-2.5" : "gap-2 rounded-xl px-3.5"
            }`}
            style={{ height: triggerHeight, fontSize: triggerFontSize }}
          >
            <CalendarDays className="text-[#8db7ff]" style={{ width: triggerIconSize, height: triggerIconSize }} />
            <span className="font-medium">{formatted}</span>
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

          <div className="border-b border-[#1a2654] p-3">
            <div className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2">
              <Select
                value={String(viewDate.getFullYear())}
                onValueChange={(nextYear) =>
                  setViewDate(startOfMonth(clampToMax(new Date(Number(nextYear), viewDate.getMonth(), 1), maxDate)))
                }
              >
                <SelectTrigger
                  className="w-full rounded-lg border-[#26456e] bg-[#101840] text-[#e8f4fc]"
                  style={{ height: triggerHeight, fontSize: panelControlSize }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#26456e] bg-[#101840] text-[#e8f4fc]" style={{ fontSize: panelControlSize }}>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)} className="text-[#e8f4fc]" style={{ fontSize: panelControlSize }}>
                      {zh ? `${year}年` : String(year)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(viewDate.getMonth())}
                onValueChange={(nextMonth) =>
                  setViewDate(startOfMonth(clampToMax(new Date(viewDate.getFullYear(), Number(nextMonth), 1), maxDate)))
                }
              >
                <SelectTrigger
                  className="w-full rounded-lg border-[#26456e] bg-[#101840] text-[#e8f4fc]"
                  style={{ height: triggerHeight, fontSize: panelControlSize }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#26456e] bg-[#101840] text-[#e8f4fc]" style={{ fontSize: panelControlSize }}>
                  {monthNames.map((month, index) => (
                    <SelectItem
                      key={`${month}-${index}`}
                      value={String(index)}
                      className="text-[#e8f4fc]"
                      style={{ fontSize: panelControlSize }}
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
                <ChevronLeft style={{ width: triggerIconSize, height: triggerIconSize }} />
              </button>

              <button
                type="button"
                onClick={() => canGoNextMonth && setViewDate((prev) => addMonths(prev, 1))}
                disabled={!canGoNextMonth}
                className="flex items-center justify-center rounded-md border border-[#26456e] bg-[#101840] text-[#c7d7f5] transition-colors hover:border-[#22d3ee]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                style={{ width: navEdge, height: navEdge }}
                aria-label={zh ? "下一个月" : "Next month"}
              >
                <ChevronRight style={{ width: triggerIconSize, height: triggerIconSize }} />
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
