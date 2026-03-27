"use client"

import { useMemo, useState } from "react"
import { CalendarDays, ChevronDown, Download } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type CalendarCell = {
  date: Date
  inMonth: boolean
}

const weekdayLabels = {
  zh: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
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

const monthNamesZh = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
]

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

const formatMonthTitle = (date: Date, language: "zh" | "en") =>
  language === "zh"
    ? `${date.getFullYear()}年${date.getMonth() + 1}月`
    : `${monthNamesEn[date.getMonth()]} ${date.getFullYear()}`

const buildCalendarCells = (viewDate: Date): CalendarCell[] => {
  const firstDay = startOfMonth(viewDate)
  const lastDay = endOfMonth(viewDate)
  const leading = firstDay.getDay()
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

export function ReportCenterPanel() {
  const { language } = useLanguage()
  const today = useMemo(() => new Date(), [])
  const [viewDate, setViewDate] = useState(() => startOfMonth(today))
  const [pickerOpen, setPickerOpen] = useState(false)

  const labels = language === "zh" ? weekdayLabels.zh : weekdayLabels.en
  const monthTitle = formatMonthTitle(viewDate, language)
  const calendarCells = useMemo(() => buildCalendarCells(viewDate), [viewDate])
  const weekCount = calendarCells.length / 7
  const yearOptions = useMemo(
    () => Array.from({ length: today.getFullYear() + 3 - 2024 }, (_, index) => 2024 + index),
    [today],
  )

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#22d3ee]" />
          <h3 className="text-base font-semibold text-[#22d3ee]">
            {language === "zh" ? "报表信息" : "Report Center"}
          </h3>
        </div>

        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 rounded-xl border border-[#26456e] bg-[#101840] px-3 py-2 text-[#e8f4fc] transition-all hover:border-[#22d3ee]/60">
              <CalendarDays className="h-4 w-4 text-[#8db7ff]" />
              <span className="text-sm font-medium">{monthTitle}</span>
              <ChevronDown className="h-4 w-4 text-[#7b8ab8]" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            className="z-50 w-[320px] rounded-2xl border border-[#26456e] bg-[#0d1233] p-0 text-[#e8f4fc]"
          >
            <div className="border-b border-[#1a2654] p-3">
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={String(viewDate.getFullYear())}
                  onValueChange={(value) => {
                    setViewDate(new Date(Number(value), viewDate.getMonth(), 1))
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg border-[#26456e] bg-[#101840] text-[#e8f4fc]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#26456e] bg-[#101840] text-[#e8f4fc]">
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={String(year)} className="text-[#e8f4fc]">
                        {language === "zh" ? `${year}年` : String(year)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={String(viewDate.getMonth())}
                  onValueChange={(value) => {
                    setViewDate(new Date(viewDate.getFullYear(), Number(value), 1))
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg border-[#26456e] bg-[#101840] text-[#e8f4fc]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#26456e] bg-[#101840] text-[#e8f4fc]">
                    {(language === "zh" ? monthNamesZh : monthNamesEn).map((month, index) => (
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
              selected={viewDate}
              month={viewDate}
              onMonthChange={(month) => setViewDate(startOfMonth(month))}
              onSelect={(date) => {
                if (!date) return
                setViewDate(startOfMonth(date))
                setPickerOpen(false)
              }}
              hideNavigation
              showOutsideDays={false}
              className="bg-[#0d1233] p-3"
              classNames={{
                month_caption: "hidden",
                weekday: "flex-1 rounded-md text-xs text-[#7b8ab8]",
                day: "relative aspect-square w-full p-0 text-center",
                today: "rounded-md bg-[#1c315f] text-[#e8f4fc]",
                outside: "text-[#42557f]",
                disabled: "text-[#42557f] opacity-40",
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#1a2654] bg-[linear-gradient(180deg,rgba(16,24,64,0.9),rgba(10,18,48,0.94))]">
        <div className="grid grid-cols-7 border-b border-[#1a2654] bg-[#101840]/92">
          {labels.map((label) => (
            <div key={label} className="border-r border-[#1a2654] px-2 py-2 text-sm font-semibold text-[#eef4ff] last:border-r-0">
              {label}
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div
            className="grid h-full grid-cols-7"
            style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
          >
            {calendarCells.map((cell) => {
              const isToday = isSameDay(cell.date, today)
              const downloadable = cell.inMonth && !isFutureDay(cell.date, today)

              return (
                <div
                  key={cell.date.toISOString()}
                  className={`flex min-h-0 flex-col border-r border-b border-[#1a2654] p-2.5 ${
                    cell.inMonth
                      ? downloadable
                        ? "bg-[linear-gradient(180deg,rgba(25,56,104,0.2),rgba(13,20,51,0.96))]"
                        : "bg-[linear-gradient(180deg,rgba(14,22,54,0.92),rgba(10,17,42,0.96))]"
                      : "bg-[#0c1434]/18"
                  }`}
                >
                  {cell.inMonth ? (
                    <>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className={`text-xl font-medium ${isToday ? "text-[#22d3ee]" : "text-[#eef4ff]"}`}>
                          {cell.date.getDate()}
                        </span>
                        {isToday && (
                          <span className="rounded-full border border-[#1d5b54] bg-[#10252d] px-2 py-0.5 text-[10px] text-[#66e6cb]">
                            {language === "zh" ? "今天" : "Today"}
                          </span>
                        )}
                      </div>

                      <div className="mt-auto">
                        {downloadable ? (
                          <button className="flex h-9 w-full items-center justify-between rounded-lg border border-[#2e7be6]/35 bg-[#162c63]/75 px-2.5 text-left transition-all hover:border-[#4b95ff]/55 hover:bg-[#1d3775]">
                            <span className="truncate text-xs font-medium text-[#eef4ff]">
                              {language === "zh" ? "下载日报" : "Daily Report"}
                            </span>
                            <Download className="h-3.5 w-3.5 shrink-0 text-[#e8f4fc]" />
                          </button>
                        ) : (
                          <div className="rounded-lg border border-dashed border-[#29416f] px-2.5 py-2 text-xs text-[#5f79ad]">
                            {language === "zh" ? "待生成" : "Pending"}
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
