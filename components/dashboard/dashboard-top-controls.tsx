import * as React from "react"
import { Check, ChevronDown, Globe, LogOut, UserCircle2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getStoredAuthUsername } from "@/lib/auth-storage"

type DashboardTopControlsProps = {
  compact?: boolean
  isLoggingOut?: boolean
  onLogout: () => void
}

const LANGUAGE_OPTIONS = [
  { key: "zh" as const, label: "中" },
  { key: "en" as const, label: "EN" },
]

export function DashboardTopControls({
  compact = false,
  isLoggingOut = false,
  onLogout,
}: DashboardTopControlsProps) {
  const { language, setLanguage } = useLanguage()
  const zh = language === "zh"
  const controlHeight = compact ? "h-[30px]" : "h-[34px]"
  const iconButtonClass =
    "relative inline-flex items-center justify-center gap-1 overflow-hidden rounded-[14px] border border-[#22465c]/84 bg-[linear-gradient(180deg,rgba(8,19,32,0.92),rgba(5,11,21,0.98))] px-2.5 text-[#d7eaf5] shadow-[0_0_0_1px_rgba(132,220,255,0.05)_inset,0_10px_22px_rgba(0,0,0,0.18)] outline-none transition-all hover:border-[#3e7592] hover:text-[#f4fcff] hover:shadow-[0_0_0_1px_rgba(132,220,255,0.1)_inset,0_0_16px_rgba(59,196,255,0.08)] focus:outline-none focus-visible:outline-none focus-visible:border-[#3e7592] data-[state=open]:border-[#3e7592]"
  const [username, setUsername] = React.useState("")
  const logoutLabel = zh ? "退出" : "Logout"
  const languageLabel = zh ? "语言切换" : "Switch language"
  const menuLabel = zh ? "账户菜单" : "Account menu"
  const usernameFallback = zh ? "当前用户" : "Account"

  React.useEffect(() => {
    setUsername(getStoredAuthUsername() ?? "")
  }, [])

  return (
    <div className="flex shrink-0 items-center gap-2">
      {/* Language dropdown select */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={languageLabel}
            title={languageLabel}
            className={`${iconButtonClass} ${controlHeight}`}
          >
            <span className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-[#8aefff]/52 to-transparent" />
            <Globe className="h-4 w-4 shrink-0 text-[#88e7ff]" />
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#86aac2]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="min-w-[8.5rem] rounded-[16px] border-[#26465d] bg-[linear-gradient(180deg,rgba(8,19,33,0.98),rgba(5,12,23,0.98))] p-1.5 text-[#d8ebf7] shadow-[0_0_0_1px_rgba(117,198,234,0.05)_inset,0_18px_40px_rgba(0,0,0,0.34)]"
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const active = language === option.key
            return (
              <DropdownMenuItem
                key={option.key}
                onClick={() => setLanguage(option.key)}
                className={`mx-1 rounded-[10px] px-2.5 py-2 text-[11px] ${
                  active
                    ? "bg-[linear-gradient(180deg,rgba(100,235,255,0.18),rgba(55,180,229,0.12))] text-[#effcff]"
                    : "text-[#a7bfd0]"
                }`}
              >
                <span
                  className={`flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-md border px-1 text-[10px] font-bold leading-none ${
                    active ? "border-[#8aefff]/55 bg-[#0e3344] text-[#8aefff]" : "border-[#2d5778] bg-[#0b1c2e] text-[#9bdcff]"
                  }`}
                >
                  {option.label}
                </span>
                <span>{option.key === "zh" ? "中文" : "English"}</span>
                {active ? <Check className="ml-auto h-3.5 w-3.5 text-[#8aefff]" /> : null}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={menuLabel}
            title={username || usernameFallback}
            className={`${iconButtonClass} ${controlHeight}`}
          >
            <span className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-[#8aefff]/52 to-transparent" />
            <UserCircle2 className="h-4 w-4 shrink-0 text-[#9bdcff]" />
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#86aac2]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="min-w-[12rem] rounded-[16px] border-[#26465d] bg-[linear-gradient(180deg,rgba(8,19,33,0.98),rgba(5,12,23,0.98))] p-1.5 text-[#d8ebf7] shadow-[0_0_0_1px_rgba(117,198,234,0.05)_inset,0_18px_40px_rgba(0,0,0,0.34)]"
        >
          <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-1 text-[11px] font-medium text-[#cfe6f5]">
            <UserCircle2 className="h-3.5 w-3.5 shrink-0 text-[#9bdcff]" />
            <span className="truncate">{username || usernameFallback}</span>
          </div>
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
