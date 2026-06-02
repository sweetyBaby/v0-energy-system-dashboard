import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { Check, ChevronDown, Languages, LogOut, UserCircle2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getStoredAuthUsername } from "@/lib/auth-storage"

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
  const controlHeight = compact ? "h-[30px]" : "h-[34px]"
  const buttonClass =
    "relative inline-flex items-center gap-2 overflow-hidden rounded-[14px] border border-[#22465c]/84 bg-[linear-gradient(180deg,rgba(8,19,32,0.92),rgba(5,11,21,0.98))] px-3 text-[11px] font-semibold text-[#d7eaf5] shadow-[0_0_0_1px_rgba(132,220,255,0.05)_inset,0_10px_22px_rgba(0,0,0,0.18)] transition-all hover:border-[#3e7592] hover:text-[#f4fcff] hover:shadow-[0_0_0_1px_rgba(132,220,255,0.1)_inset,0_0_16px_rgba(59,196,255,0.08)]"
  const [username, setUsername] = React.useState("")
  const logoutLabel = zh ? "退出" : "Logout"
  const languageLabel = zh ? "语言切换" : "Language"
  const menuLabel = zh ? "账户菜单" : "Account menu"
  const usernameFallback = zh ? "当前用户" : "Account"

  React.useEffect(() => {
    setUsername(getStoredAuthUsername() ?? "")
  }, [])

  return (
    <div className="flex shrink-0 items-center gap-2">
      {action ? (
        <button type="button" onClick={action.onClick} className={`${buttonClass} ${controlHeight}`}>
          <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#8aefff]/52 to-transparent" />
          <action.icon className="h-3.5 w-3.5 text-[#88e7ff]" />
          <span className="tracking-[0.08em]">{zh ? action.labelZh : action.labelEn}</span>
        </button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={menuLabel}
            className={`${buttonClass} ${controlHeight} min-w-[128px] justify-between gap-2 pr-2.5`}
          >
            <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#8aefff]/52 to-transparent" />
            <span className="flex min-w-0 items-center gap-2">
              <UserCircle2 className="h-3.5 w-3.5 shrink-0 text-[#9bdcff]" />
              <span className="truncate text-[11px] font-semibold tracking-[0.04em] text-[#eef9ff]">
                {username || usernameFallback}
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#86aac2]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="min-w-[12rem] rounded-[16px] border-[#26465d] bg-[linear-gradient(180deg,rgba(8,19,33,0.98),rgba(5,12,23,0.98))] p-1.5 text-[#d8ebf7] shadow-[0_0_0_1px_rgba(117,198,234,0.05)_inset,0_18px_40px_rgba(0,0,0,0.34)]"
        >
          <div className="px-2.5 pb-1 pt-1 text-[10px] font-medium tracking-[0.08em] text-[#7fa6bc]">
            {languageLabel}
          </div>
          {LANGUAGE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.key}
              onClick={() => setLanguage(option.key)}
              className={`mx-1 rounded-[10px] px-2.5 py-2 text-[11px] ${
                language === option.key
                  ? "bg-[linear-gradient(180deg,rgba(100,235,255,0.18),rgba(55,180,229,0.12))] text-[#effcff]"
                  : "text-[#a7bfd0]"
              }`}
            >
              <Languages className="h-3.5 w-3.5" />
              <span>{option.key === "zh" ? (zh ? "中文" : "Chinese") : "English"}</span>
              {language === option.key ? <Check className="ml-auto h-3.5 w-3.5 text-[#8aefff]" /> : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="mx-1 bg-[#1f3b4d]" />
          <DropdownMenuItem
            onClick={onLogout}
            disabled={isLoggingOut}
            className="mx-1 rounded-[10px] px-2.5 py-2 text-[11px] text-[#ffdbe1] focus:bg-[rgba(127,35,55,0.18)] focus:text-[#fff1f4] data-[disabled]:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{logoutLabel}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
