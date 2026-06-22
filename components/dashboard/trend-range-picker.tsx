"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"

const weekdayNamesZh = ["一", "二", "三", "四", "五", "六", "日"]

const pad = (value: number) => String(value).padStart(2, "0")
const toDayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1)
const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth()

const formatStamp = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
const formatClock = (ms: number) => {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Replace the calendar-date part of `ms` with `day`, keeping the time-of-day. */
const withDate = (ms: number, day: Date) => {
  const d = new Date(ms)
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()).getTime()
}

/** Replace one time-of-day unit (0=h, 1=m, 2=s) of `ms`, keeping the calendar date. */
const withTimeUnit = (ms: number, unit: 0 | 1 | 2, value: number) => {
  const d = new Date(ms)
  const parts = [d.getHours(), d.getMinutes(), d.getSeconds()] as [number, number, number]
  parts[unit] = value
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), parts[0], parts[1], parts[2]).getTime()
}

const ITEM_H = 28

// Vertical-only scroll, thin thumb in the dashboard palette (no horizontal bar / arrow buttons).
const SCROLLBAR_Y =
  "overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:#1f4f78_transparent] [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#1f4f78] [&::-webkit-scrollbar-thumb:hover]:bg-[#2aa7b3]"

/** A single scrollable time column (时 / 分 / 秒) — Ant Design style. */
function TimeColumn({
  count,
  value,
  onSelect,
  fontSize,
}: {
  count: number
  value: number
  onSelect: (next: number) => void
  fontSize: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Center the selected cell whenever it changes (and on first paint). scrollIntoView
  // computes layout at call time; retry across a rAF + macrotask to cover mount/animation.
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const center = () => container.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "center" })
    center()
    const raf = requestAnimationFrame(center)
    const timer = setTimeout(center, 60)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [value])

  return (
    <div ref={containerRef} className={`relative h-full w-[46px] ${SCROLLBAR_Y}`}>
      <div className="flex flex-col py-[2px]">
        {Array.from({ length: count }, (_, n) => {
          const active = n === value
          return (
            <button
              key={n}
              type="button"
              data-active={active}
              onClick={() => onSelect(n)}
              className={`mx-auto my-[1px] flex w-[36px] shrink-0 items-center justify-center rounded-md font-mono tabular-nums transition-colors ${
                active ? "bg-[#00d4aa] font-semibold text-[#041123]" : "text-[#cfe4ff] hover:bg-[#16213f]"
              }`}
              style={{ height: ITEM_H - 2, fontSize }}
            >
              {pad(n)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TrendRangePicker({
  startTime,
  endTime,
  onChange,
  zh,
  fontSize,
  valid,
}: {
  startTime: number
  endTime: number
  onChange: (next: { startTime: number; endTime: number }) => void
  zh: boolean
  fontSize: number
  /** Reflects whether the current committed range is valid (end > start). */
  valid: boolean
}) {
  const [open, setOpen] = useState(false)
  // Draft kept local so edits don't commit until OK confirms the end.
  const [draftStart, setDraftStart] = useState(startTime)
  const [draftEnd, setDraftEnd] = useState(endTime)
  // Which endpoint the panel (calendar + time) is currently editing.
  const [active, setActive] = useState<"start" | "end">("start")
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date(startTime)))

  const todayMonth = useMemo(() => startOfMonth(new Date()), [])

  // Keep external changes reflected while closed.
  useEffect(() => {
    if (open) return
    setDraftStart(startTime)
    setDraftEnd(endTime)
  }, [open, startTime, endTime])

  // Open the panel focused on a given endpoint (Ant Design: clicking a field activates it).
  const activateField = (field: "start" | "end") => {
    const sourceMs = field === "start" ? (open ? draftStart : startTime) : (open ? draftEnd : endTime)
    if (!open) {
      setDraftStart(startTime)
      setDraftEnd(endTime)
      setOpen(true)
    }
    setActive(field)
    setViewMonth(startOfMonth(new Date(sourceMs)))
  }

  const draftValid = draftEnd > draftStart
  const activeMs = active === "start" ? draftStart : draftEnd
  const activeDate = new Date(activeMs)
  const setActiveMs = (ms: number) => (active === "start" ? setDraftStart(ms) : setDraftEnd(ms))

  const canPrev = monthIndex(viewMonth) > 2024 * 12
  const canNext = monthIndex(viewMonth) < monthIndex(todayMonth)

  const handleDaySelect = (day: Date) => {
    // Ant Design + showTime: a date click only sets the active endpoint's date;
    // advancing to the next endpoint happens on OK.
    setActiveMs(withDate(activeMs, day))
  }

  const presets = [
    { ms: 60 * 60 * 1000, zh: "近1小时", en: "Last 1 Hour" },
    { ms: 6 * 60 * 60 * 1000, zh: "近6小时", en: "Last 6 Hours" },
    { ms: 24 * 60 * 60 * 1000, zh: "近24小时", en: "Last 24 Hours" },
    { ms: 7 * 24 * 60 * 60 * 1000, zh: "近7天", en: "Last 7 Days" },
  ]

  const applyPreset = (durationMs: number) => {
    const now = Date.now()
    onChange({ startTime: now - durationMs, endTime: now })
    setOpen(false)
  }

  // OK: confirm the active endpoint. On start, advance to end; on end, commit + close.
  const handleOk = () => {
    if (active === "start") {
      setActive("end")
      setViewMonth(startOfMonth(new Date(draftEnd)))
      return
    }
    if (!draftValid) return
    onChange({ startTime: draftStart, endTime: draftEnd })
    setOpen(false)
  }

  const okDisabled = active === "end" && !draftValid

  const segmentClass = (field: "start" | "end") =>
    `rounded-md px-2 py-1 font-mono tabular-nums transition-colors ${
      open && active === field
        ? "bg-[#101840] text-[#e8f4fc] shadow-[inset_0_-2px_0_0_#26f0dc]"
        : "text-[#dbeaff] hover:bg-[#16213f]/60"
    }`

  const calendarClassNames = {
    months: "flex",
    month: "flex flex-col gap-2",
    month_caption: "hidden",
    weekdays: "flex",
    weekday: "flex-1 rounded-md text-[#7b8ab8]",
    day: "relative aspect-square w-full p-0 text-center",
    // Single selected day — the inner button also carries data-[selected-single]:bg-primary,
    // which is teal in this theme, matching the cell color below.
    selected: "rounded-md bg-[#00d4aa] text-[#041123] font-semibold",
    today: "rounded-md ring-1 ring-[#45f1d0]/60",
    outside: "text-[#7b8ab8]/60",
    disabled: "text-[#8d97aa] opacity-45",
  }

  const monthLabel = zh
    ? `${viewMonth.getFullYear()}年 ${viewMonth.getMonth() + 1}月`
    : viewMonth.toLocaleDateString("en", { year: "numeric", month: "long" })

  return (
    <Popover open={open} onOpenChange={(next) => !next && setOpen(false)}>
      <PopoverAnchor asChild>
        {/* Big range input box (Ant Design RangePicker style) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => !open && activateField("start")}
          className={`ml-auto flex cursor-pointer items-center gap-1 rounded-lg border bg-[#101840]/80 px-2 py-1 text-[#dbeaff] transition-colors ${
            valid ? "border-[#27496f] hover:border-[#45f1d0]/55" : "border-[#ef4444]/70"
          } ${open ? "border-[#45f1d0]/70 shadow-[0_0_0_2px_rgba(38,240,220,0.12)]" : ""}`}
          style={{ fontSize }}
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-[#5d9fd6]" />
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              activateField("start")
            }}
            className={segmentClass("start")}
          >
            {formatStamp(open ? draftStart : startTime)}
          </button>
          <span className="px-0.5 text-[#5d7299]">→</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              activateField("end")
            }}
            className={segmentClass("end")}
          >
            {formatStamp(open ? draftEnd : endTime)}
          </button>
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="end"
        className="z-50 w-auto rounded-2xl border border-[#3f6ea8] bg-[#0d1233] p-0 text-[#e8f4fc] shadow-[0_18px_48px_rgba(0,0,0,0.6),0_0_0_1px_rgba(69,241,208,0.18)]"
      >
        <div className="flex items-stretch">
          {/* Left: quick presets */}
          <div className="flex w-[120px] shrink-0 flex-col gap-0.5 border-r border-[#1a2654] py-2">
            {presets.map((preset) => (
              <button
                key={preset.ms}
                type="button"
                onClick={() => applyPreset(preset.ms)}
                className="mx-2 rounded-md px-2 py-1.5 text-left text-[#9bc4e8] transition-colors hover:bg-[#16213f] hover:text-[#cffcf2]"
                style={{ fontSize }}
              >
                {zh ? preset.zh : preset.en}
              </button>
            ))}
          </div>

          {/* Center: single calendar panel */}
          <div className="px-3 py-2.5">
            <div className="mb-1 flex items-center justify-between" style={{ fontSize: fontSize + 0.5 }}>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => canPrev && setViewMonth((prev) => addMonths(prev, -12))}
                  disabled={!canPrev}
                  className="rounded p-0.5 text-[#7b8ab8] transition-colors hover:text-[#cfe4ff] disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={zh ? "上一年" : "Previous year"}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => canPrev && setViewMonth((prev) => addMonths(prev, -1))}
                  disabled={!canPrev}
                  className="rounded p-0.5 text-[#7b8ab8] transition-colors hover:text-[#cfe4ff] disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={zh ? "上一月" : "Previous month"}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
              <span className="font-semibold text-[#e8f4fc]">{monthLabel}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => canNext && setViewMonth((prev) => addMonths(prev, 1))}
                  disabled={!canNext}
                  className="rounded p-0.5 text-[#7b8ab8] transition-colors hover:text-[#cfe4ff] disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={zh ? "下一月" : "Next month"}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => canNext && setViewMonth((prev) => addMonths(prev, 12))}
                  disabled={monthIndex(addMonths(viewMonth, 12)) > monthIndex(todayMonth)}
                  className="rounded p-0.5 text-[#7b8ab8] transition-colors hover:text-[#cfe4ff] disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={zh ? "下一年" : "Next year"}
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <Calendar
              mode="single"
              required
              selected={activeDate}
              month={viewMonth}
              numberOfMonths={1}
              onMonthChange={(month) => setViewMonth(startOfMonth(month))}
              // Controlled selection (onSelect, not onDayClick) so the calendar reflects
              // the active endpoint's date whenever `active` switches. Disabled days never fire.
              onSelect={(day) => handleDaySelect(day)}
              weekStartsOn={zh ? 1 : 0}
              formatters={zh ? { formatWeekdayName: (date) => weekdayNamesZh[(date.getDay() + 6) % 7] } : undefined}
              disabled={(date) => toDayStart(date) > toDayStart(new Date())}
              hideNavigation
              showOutsideDays
              className="bg-transparent p-0 [--cell-size:32px]"
              classNames={calendarClassNames}
            />
          </div>

          {/* Right: 时 / 分 / 秒 columns for the active endpoint */}
          <div className="flex w-[156px] shrink-0 flex-col border-l border-[#1a2654]">
            <div
              className="border-b border-[#1a2654] py-1.5 text-center font-mono tabular-nums text-[#e8f4fc]"
              style={{ fontSize: fontSize + 0.5 }}
            >
              {formatClock(activeMs)}
            </div>
            <div className="flex text-center text-[#7b8ab8]" style={{ fontSize: fontSize - 2 }}>
              <span className="flex-1 py-1">{zh ? "时" : "HH"}</span>
              <span className="flex-1 py-1">{zh ? "分" : "MM"}</span>
              <span className="flex-1 py-1">{zh ? "秒" : "SS"}</span>
            </div>
            <div className="flex justify-around gap-0.5 px-1 pb-1" style={{ height: 220 }}>
              <TimeColumn count={24} value={activeDate.getHours()} onSelect={(h) => setActiveMs(withTimeUnit(activeMs, 0, h))} fontSize={fontSize} />
              <TimeColumn count={60} value={activeDate.getMinutes()} onSelect={(m) => setActiveMs(withTimeUnit(activeMs, 1, m))} fontSize={fontSize} />
              <TimeColumn count={60} value={activeDate.getSeconds()} onSelect={(s) => setActiveMs(withTimeUnit(activeMs, 2, s))} fontSize={fontSize} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-[#1a2654] px-3 py-2.5">
          <span className="text-[#9bc4e8]" style={{ fontSize: fontSize - 0.5 }}>
            {okDisabled
              ? zh
                ? "结束时间须晚于开始时间"
                : "End must be after start"
              : active === "start"
                ? zh
                  ? "正在设置开始时间"
                  : "Setting start time"
                : zh
                  ? "正在设置结束时间"
                  : "Setting end time"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-[#27496f] bg-[#101840]/60 px-3.5 py-1 text-[#9bc4e8] transition-colors hover:border-[#45f1d0]/55 hover:text-[#cffcf2]"
              style={{ fontSize }}
            >
              {zh ? "取消" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleOk}
              disabled={okDisabled}
              className="rounded-md bg-[#00d4aa] px-4 py-1 font-semibold text-[#04241c] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              style={{ fontSize }}
            >
              {zh ? "确定" : "OK"}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
