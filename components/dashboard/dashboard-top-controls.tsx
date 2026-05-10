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
  const controlHeight = compact ? "h-[34px]" : "h-[38px]"
  const buttonClass =
    "relative inline-flex items-center gap-2 overflow-hidden rounded-[14px] border border-[#28475d] bg-[linear-gradient(180deg,rgba(9,21,35,0.94),rgba(6,14,25,0.98))] px-3.5 text-[12px] font-medium text-[#d7e7f2] shadow-[0_0_0_1px_rgba(117,198,234,0.05)_inset,0_10px_24px_rgba(0,0,0,0.16)] transition-all hover:border-[#4f88a9] hover:text-[#f4fcff] hover:shadow-[0_0_0_1px_rgba(122,225,255,0.1)_inset,0_0_18px_rgba(65,185,255,0.1)]"
  const logoutLabel = zh ? "退出" : "Logout"

  return (
    <div className="flex shrink-0 items-center gap-2.5">
      {action ? (
        <button type="button" onClick={action.onClick} className={`${buttonClass} ${controlHeight}`}>
          <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#8aefff]/68 to-transparent" />
          <action.icon className="h-4 w-4" />
          <span className="tracking-[0.08em]">{zh ? action.labelZh : action.labelEn}</span>
        </button>
      ) : null}

      <div
        className={`relative grid min-w-[92px] grid-cols-2 items-stretch overflow-hidden rounded-[14px] border border-[#28475d] bg-[linear-gradient(180deg,rgba(9,21,35,0.94),rgba(6,14,25,0.98))] shadow-[0_0_0_1px_rgba(117,198,234,0.05)_inset,0_10px_24px_rgba(0,0,0,0.16)] ${controlHeight}`}
      >
        <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#8aefff]/68 to-transparent" />
        <span className="pointer-events-none absolute inset-y-[7px] left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#73b8d5]/28 to-transparent" />
        {LANGUAGE_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setLanguage(option.key)}
            className={`relative h-full min-w-[40px] px-2.5 text-[12px] font-semibold transition-all ${
              language === option.key
                ? "bg-[linear-gradient(180deg,rgba(100,235,255,0.96),rgba(55,180,229,0.92))] text-[#052737] shadow-[0_0_0_1px_rgba(190,245,255,0.34)_inset]"
                : "text-[#88a5bb] hover:text-[#edf8ff]"
            }`}
          >
            {language === option.key ? (
              <span className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-[#effdff]/82 to-transparent" />
            ) : null}
            {option.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onLogout}
        disabled={isLoggingOut}
        className={`${buttonClass} ${controlHeight} border-[#5b3640] text-[#ffe2e7] hover:border-[#a45a69] disabled:opacity-50`}
        aria-label={logoutLabel}
      >
        <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#ffbfcb]/58 to-transparent" />
        <LogOut className="h-4 w-4" />
        <span>{logoutLabel}</span>
      </button>
    </div>
  )
}
