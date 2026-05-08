import type { LucideIcon } from "lucide-react"
import { Globe, LogOut } from "lucide-react"
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
    "inline-flex items-center gap-2 rounded-[14px] border border-[#284b6c] bg-[linear-gradient(180deg,rgba(8,18,34,0.94),rgba(5,13,24,0.96))] px-3.5 text-[12px] font-semibold text-[#97b2c8] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all hover:border-[#3b678f] hover:text-[#f3fbff]"
  const logoutLabel = zh ? "退出" : "Logout"
  const languageLabel = zh ? "语言" : "Language"

  return (
    <div className="flex shrink-0 items-center gap-2">
      {action ? (
        <button type="button" onClick={action.onClick} className={`${buttonClass} ${controlHeight}`}>
          <action.icon className="h-4 w-4" />
          <span>{zh ? action.labelZh : action.labelEn}</span>
        </button>
      ) : null}

      <div
        className={`flex items-center overflow-hidden rounded-[14px] border border-[#284b6c] bg-[linear-gradient(180deg,rgba(8,18,34,0.94),rgba(5,13,24,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${controlHeight}`}
      >
        <div className="flex items-center gap-1.5 border-r border-[#23415d] px-2.5 text-[#7fd8d9]">
          <Globe className="h-3.5 w-3.5" />
          {!compact ? (
            <span className="text-[11px] font-semibold tracking-[0.12em] text-[#86a6bc]">{languageLabel}</span>
          ) : null}
        </div>

        {(["zh", "en"] as const).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className={`px-3 py-1.5 text-[12px] font-semibold tracking-[0.08em] transition-all ${
              language === lang
                ? "bg-[linear-gradient(180deg,rgba(57,228,214,0.92),rgba(22,183,213,0.88))] text-[#05222a] shadow-[0_0_18px_rgba(47,207,220,0.2)]"
                : "text-[#8ea9bf] hover:bg-[rgba(16,39,59,0.72)] hover:text-[#eef8fc]"
            }`}
          >
            {lang === "zh" ? "中文" : "EN"}
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
