"use client"

import { ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export const BCU_SELECTOR_ALL_VALUE = "__all_bcu__"

export type BcuSelectorOption = {
  value: string
  label: string
}

type BcuSelectorProps = {
  value: string
  options: BcuSelectorOption[]
  onChange: (value: string) => void
  allLabel: string
  includeAllOption?: boolean
  hideWhenSingleOption?: boolean
  label?: string
  compact?: boolean
  fontSize?: number
  height?: number
  minWidth?: number
  className?: string
}

export function BcuSelector({
  value,
  options,
  onChange,
  allLabel,
  includeAllOption = true,
  hideWhenSingleOption = false,
  label = "BCU",
  compact = false,
  fontSize,
  height,
  minWidth,
  className = "",
}: BcuSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const allOptions = [
    ...(includeAllOption ? [{ value: BCU_SELECTOR_ALL_VALUE, label: allLabel }] : []),
    ...options,
  ]

  const selectedLabel = allOptions.find((o) => o.value === value)?.label ?? value

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (hideWhenSingleOption && options.length <= 1) {
    return null
  }

  const controlHeight = height ?? (compact ? 34 : 36)
  const controlMinWidth = minWidth ?? (compact ? 112 : 136)
  const minWidthClass = compact ? "min-w-[112px]" : "min-w-[136px]"
  const textSize = compact ? "text-[12px]" : "text-[13px]"
  const px = compact ? "pl-3 pr-9" : "pl-3.5 pr-9"
  const iconSize = Math.max(fontSize ? fontSize + 2 : compact ? 14 : 15, Math.round(controlHeight * 0.42))
  const optionHeight = Math.max(compact ? 32 : 34, controlHeight - 2)

  return (
    <div ref={ref} className={`relative flex items-center ${className}`.trim()}>
      {/* trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          ...(fontSize ? { fontSize: `${fontSize}px` } : undefined),
          height: `${controlHeight}px`,
          minWidth: `${controlMinWidth}px`,
        }}
        className={`relative ${minWidthClass} ${textSize} ${px} appearance-none rounded-[11px] border text-[#eff7ff] outline-none transition-all
          ${
            open
              ? "border-[#45f1d0]/55 bg-[linear-gradient(180deg,rgba(18,32,76,0.98),rgba(10,22,54,0.98))] shadow-[0_0_0_1px_rgba(69,241,208,0.08)_inset,0_0_18px_rgba(34,211,238,0.14)]"
              : "border-[#27496f] bg-[linear-gradient(180deg,rgba(17,27,60,0.98),rgba(10,18,45,0.98))] shadow-[0_0_0_1px_rgba(115,198,255,0.05)_inset,0_8px_18px_rgba(0,0,0,0.16)] hover:border-[#58c7ff]/68 hover:shadow-[0_0_0_1px_rgba(115,198,255,0.08)_inset,0_0_18px_rgba(34,211,238,0.1)]"
          }`}
      >
        {/* top shimmer line */}
        <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#79dfff]/70 to-transparent" />
        <span className="block truncate text-left font-semibold tracking-[0.01em]">{selectedLabel}</span>
      </button>

      <ChevronDown
        className={`pointer-events-none absolute right-3 text-[#8db7ff] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
      />

      {/* dropdown list */}
      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute z-50 mt-1 overflow-hidden rounded-[10px] border border-[#2a4f7a] bg-[linear-gradient(180deg,rgba(12,22,58,0.98),rgba(8,15,40,0.98))] shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_0_1px_rgba(115,198,255,0.06)_inset,0_0_20px_rgba(34,211,238,0.06)]"
          style={{ top: "100%", left: 0, minWidth: "100%" }}
        >
          {/* top accent line */}
          <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#45f1d0]/40 to-transparent" />

          {allOptions.map((option) => {
            const isSelected = option.value === value
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onMouseDown={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`relative flex cursor-pointer select-none items-center px-3 transition-colors duration-100
                  ${compact ? "text-[12px]" : "text-[13px]"}
                  ${
                    isSelected
                      ? "bg-[rgba(69,241,208,0.08)] text-[#45f1d0]"
                      : "text-[#c8deff] hover:bg-[rgba(115,198,255,0.07)] hover:text-[#eff7ff]"
                  }`}
                style={{
                  ...(fontSize ? { fontSize: `${fontSize}px` } : undefined),
                  height: `${optionHeight}px`,
                }}
              >
                {isSelected && (
                  <span className="absolute left-0 top-1/2 h-3 w-[2px] -translate-y-1/2 rounded-r-full bg-[#45f1d0]/80" />
                )}
                <span className="pl-1">{option.label}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
