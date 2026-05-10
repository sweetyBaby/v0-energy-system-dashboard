import type { LucideIcon } from "lucide-react"
import { LogOut } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

type ActionConfig = {
  icon: LucideIcon
  labelZh: string
  labelEn: string
  onClick: () => void
}

type DashboardTopControlsProps = {
  compact?: boolean
  action?: ActionConfig
  isLoggingOut?: boolean
  onLogout: () => void
}

const LANGUAGE_OPTIONS = [
  { key: "zh" as const, label: "中" },
  { key: "en" as const, label: "EN" },
]

export function DashboardTopControls({
  compact = false,
  action,
  isLoggingOut = false,
  onLogout,
}: DashboardTopControlsProps) {
  const { language, setLanguage } = useLanguage()
  const zh = language === "zh"
  const controlHeight = compact ? "h-[34px]" : "h-[36px]"
  const buttonClass =
    "relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-[#33556f] bg-[linear-gradient(180deg,rgba(8,18,34,0.94),rgba(7,15,29,0.96))] px-3 text-[12px] font-medium text-[#d7e7f2] shadow-[0_0_0_1px_rgba(117,198,234,0.06)_inset,0_8px_18px_rgba(0,0,0,0.18)] transition-all hover:border-[#53a4c7] hover:bg-[linear-gradient(180deg,rgba(10,25,45,0.96),rgba(8,19,35,0.98))] hover:shadow-[0_0_0_1px_rgba(122,225,255,0.12)_inset,0_0_18px_rgba(65,185,255,0.12)]"
  const logoutLabel = zh ? "退出" : "Logout"

  return (
      <div className="flex shrink-0 items-center gap-2">
      {action ? (
        <button type="button" onClick={action.onClick} className={`${buttonClass} ${controlHeight}`}>
          <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#8aefff]/70 to-transparent" />
          <action.icon className="h-4 w-4" />
          <span>{zh ? action.labelZh : action.labelEn}</span>
        </button>
      ) : null}

      <div
        className={`relative grid min-w-[84px] grid-cols-2 items-stretch overflow-hidden rounded-full border border-[#33556f] bg-[linear-gradient(180deg,rgba(8,18,34,0.94),rgba(7,15,29,0.96))] shadow-[0_0_0_1px_rgba(117,198,234,0.06)_inset,0_8px_18px_rgba(0,0,0,0.18)] ${controlHeight}`}
      >
        <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#8aefff]/70 to-transparent" />
        <span className="pointer-events-none absolute inset-y-[6px] left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#73b8d5]/35 to-transparent" />
        {LANGUAGE_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setLanguage(option.key)}
            className={`relative h-full min-w-[40px] px-2.5 text-[12px] font-semibold transition-all ${
              language === option.key
                ? "bg-[linear-gradient(180deg,rgba(99,239,255,1),rgba(42,201,239,0.94))] text-[#042536] shadow-[0_0_0_1px_rgba(178,249,255,0.4)_inset,0_0_16px_rgba(71,215,255,0.28)]"
                : "text-[#88a5bb] hover:text-[#edf8ff]"
            }`}
          >
            {language === option.key ? (
              <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#effdff]/85 to-transparent" />
            ) : null}
            {option.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onLogout}
        disabled={isLoggingOut}
        className={`${buttonClass} ${controlHeight} disabled:opacity-50`}
        aria-label={logoutLabel}
      >
        <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#ffbfcb]/55 to-transparent" />
        <LogOut className="h-4 w-4" />
        <span>{logoutLabel}</span>
      </button>
    </div>
  )
}
