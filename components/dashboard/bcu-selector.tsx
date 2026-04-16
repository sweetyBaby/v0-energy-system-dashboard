"use client"

import { ChevronDown } from "lucide-react"

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
  hideWhenSingleOption?: boolean
  label?: string
  compact?: boolean
  fontSize?: number
  className?: string
}

export function BcuSelector({
  value,
  options,
  onChange,
  allLabel,
  hideWhenSingleOption = false,
  label = "BCU",
  compact = false,
  fontSize,
  className = "",
}: BcuSelectorProps) {
  if (hideWhenSingleOption && options.length <= 1) {
    return null
  }

  return (
    <label className={`relative flex items-center ${className}`.trim()}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`appearance-none rounded-lg border border-[#1a2654] bg-[#0a1225] pr-9 text-[#dce7ff] outline-none transition-colors hover:border-[#24507d] focus:border-[#11d8bf] ${
          compact ? "h-[34px] min-w-[112px] pl-3 text-[12px]" : "h-[36px] min-w-[136px] pl-3.5"
        }`}
        style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
        aria-label={label}
        title={label}
      >
        <option value={BCU_SELECTOR_ALL_VALUE}>{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[#6f86b7]" />
    </label>
  )
}
