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
    "inline-flex items-center gap-2 rounded-full border border-[#31556f] bg-[rgba(8,18,34,0.9)] px-3 text-[12px] font-medium text-[#d7e7f2] transition-all hover:border-[#4f7b97] hover:bg-[rgba(11,24,43,0.96)]"
  const logoutLabel = zh ? "退出" : "Logout"

  return (
    <div className="flex shrink-0 items-center gap-2">
      {action ? (
        <button type="button" onClick={action.onClick} className={`${buttonClass} ${controlHeight}`}>
          <action.icon className="h-4 w-4" />
          <span>{zh ? action.labelZh : action.labelEn}</span>
        </button>
      ) : null}

      <div
        className={`flex items-center overflow-hidden rounded-full border border-[#31556f] bg-[rgba(8,18,34,0.9)] p-1 ${controlHeight}`}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setLanguage(option.key)}
            className={`min-w-[38px] rounded-full px-2.5 py-1 text-[12px] font-semibold transition-all ${
              language === option.key
                ? "bg-[linear-gradient(180deg,rgba(82,236,255,0.98),rgba(39,205,240,0.92))] text-[#062432]"
                : "text-[#88a5bb] hover:text-[#edf8ff]"
            }`}
          >
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
        <LogOut className="h-4 w-4" />
        <span>{logoutLabel}</span>
      </button>
    </div>
  )
}
