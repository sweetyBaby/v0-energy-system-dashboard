"use client"

import { startTransition, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  User,
  Shield,
  Battery,
  Activity,
  Gauge,
  PieChart,
  Bell,
  Monitor,
  FileText,
  Box,
  Clock,
  ChevronRight,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { loginWithCloud } from "@/lib/api/auth"
import { persistAuthToken } from "@/lib/auth-storage"
import { cn } from "@/lib/utils"

type Locale = "zh" | "en"

type Copy = {
  welcome: string
  welcomeSub: string
  accountPlaceholder: string
  passwordPlaceholder: string
  remember: string
  forgot: string
  submit: string
}

const BRAND = "EnerCloud"
const BRAND_SUBTITLE_ZH = "数据监测云平台"
const BRAND_SUBTITLE_EN = "Data Monitoring Cloud Platform"

const COPY: Record<Locale, Copy> = {
  zh: {
    welcome: "欢迎登录",
    welcomeSub: "WELCOME",
    accountPlaceholder: "请输入用户名",
    passwordPlaceholder: "请输入密码",
    remember: "记住密码",
    forgot: "忘记密码?",
    submit: "登录平台",
  },
  en: {
    welcome: "Welcome Back",
    welcomeSub: "WELCOME",
    accountPlaceholder: "Enter username",
    passwordPlaceholder: "Enter password",
    remember: "Remember password",
    forgot: "Forgot password?",
    submit: "Login",
  },
}

const LANGUAGE_OPTIONS: Array<{ key: Locale; label: string }> = [
  { key: "zh", label: "中" },
  { key: "en", label: "EN" },
]

const LEFT_MENU_ITEMS = [
  { icon: Shield, titleZh: "系统状态", titleEn: "System Status", descZh: "系统运行状态总览", descEn: "System overview" },
  { icon: Battery, titleZh: "充放电量统计", titleEn: "Charge Stats", descZh: "充放电量统计分析", descEn: "Charge/discharge analysis" },
  { icon: Activity, titleZh: "功率趋势", titleEn: "Power Trends", descZh: "功率变化趋势分析", descEn: "Power trend analysis" },
  { icon: Gauge, titleZh: "能效分析", titleEn: "Energy Analysis", descZh: "能效指标分析", descEn: "Energy efficiency analysis" },
  { icon: PieChart, titleZh: "数据分析", titleEn: "Data Analysis", descZh: "多维数据分析", descEn: "Multi-dimensional analysis" },
]

const RIGHT_MENU_ITEMS = [
  { icon: Bell, titleZh: "告警监测", titleEn: "Alerts", descZh: "告警信息实时监测", descEn: "Real-time alerts monitoring" },
  { icon: Monitor, titleZh: "实时监测", titleEn: "Monitoring", descZh: "设备实时运行监测", descEn: "Device real-time monitoring" },
  { icon: FileText, titleZh: "报表日志", titleEn: "Reports", descZh: "报表日志查看与导出", descEn: "View and export reports" },
  { icon: Box, titleZh: "电芯矩阵", titleEn: "Cell Matrix", descZh: "电芯状态矩阵展示", descEn: "Cell status matrix display" },
  { icon: Clock, titleZh: "历史分析", titleEn: "History", descZh: "历史数据分析与追溯", descEn: "Historical data analysis" },
]

function EnerCloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 78 66" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="enercloud-cloud" x1="8" y1="8" x2="68" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6ff4ff" />
          <stop offset="100%" stopColor="#318eff" />
        </linearGradient>
        <linearGradient id="enercloud-bolt" x1="28" y1="10" x2="46" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c8fffa" />
          <stop offset="100%" stopColor="#3fe4ff" />
        </linearGradient>
      </defs>
      <path
        d="M23 54C13 54 8 47 8 39C8 30 14 23 24 22C25 12 33 7 42 7C51 7 58 12 61 20C69 21 74 27 74 35C74 45 67 54 55 54H23Z"
        fill="rgba(9,31,68,0.2)"
        stroke="url(#enercloud-cloud)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M43 13L31 31H39L33 50L48 28H40L43 13Z"
        fill="url(#enercloud-bolt)"
        stroke="rgba(92,242,255,0.24)"
        strokeWidth="0.8"
      />
    </svg>
  )
}

function CloudBoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cloud-stroke" x1="10" y1="10" x2="110" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4ae8ff" />
          <stop offset="100%" stopColor="#1a8fff" />
        </linearGradient>
        <linearGradient id="bolt-fill" x1="50" y1="30" x2="70" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#b0f4ff" />
          <stop offset="100%" stopColor="#4ae8ff" />
        </linearGradient>
        <filter id="bolt-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M30 65C15 65 5 54 5 42C5 28 15 18 30 17C32 4 44 -3 58 -3C72 -3 82 4 87 15C100 16 110 25 110 38C110 53 98 65 80 65H30Z"
        fill="transparent"
        stroke="url(#cloud-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M65 28L48 52H58L50 78L72 48H62L65 28Z"
        fill="url(#bolt-fill)"
        filter="url(#bolt-glow)"
      />
    </svg>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  direction = "left",
}: {
  icon: React.ElementType
  title: string
  description: string
  direction?: "left" | "right"
}) {
  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-center gap-4 rounded-lg border border-[#1a4a6a]/60 bg-[linear-gradient(135deg,rgba(8,24,48,0.9),rgba(4,16,32,0.95))] px-4 py-4 transition-all hover:border-[#3ae8ff]/50 hover:bg-[linear-gradient(135deg,rgba(12,32,56,0.95),rgba(6,20,40,0.98))] hover:shadow-[0_0_20px_rgba(58,232,255,0.15)]",
        direction === "right" && "flex-row-reverse"
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#2a7aaa]/50 bg-[linear-gradient(180deg,rgba(20,60,100,0.5),rgba(10,30,60,0.8))]">
        <Icon className="h-5 w-5 text-[#4ae8ff]" />
      </div>
      <div className={cn("flex-1 min-w-0", direction === "right" && "text-right")}>
        <div className="text-[15px] font-bold text-white">{title}</div>
        <div className="mt-0.5 text-[12px] text-[#6aa8c8]">{description}</div>
      </div>
      <ChevronRight
        className={cn(
          "h-5 w-5 shrink-0 text-[#3a88aa] transition-transform group-hover:text-[#4ae8ff]",
          direction === "right" && "rotate-180"
        )}
      />
    </div>
  )
}

function CornerDecoration({ position }: { position: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) {
  const isTop = position.includes("top")
  const isLeft = position.includes("left")

  return (
    <div
      className={cn(
        "pointer-events-none absolute",
        isTop ? "top-0" : "bottom-0",
        isLeft ? "left-0" : "right-0"
      )}
    >
      <svg
        viewBox="0 0 80 80"
        className={cn(
          "h-20 w-20",
          !isTop && "rotate-180",
          !isLeft && isTop && "-scale-x-100",
          !isLeft && !isTop && "scale-x-[-1]"
        )}
        fill="none"
      >
        <path d="M0 0 L40 0 L40 5 L5 5 L5 40 L0 40 Z" fill="rgba(58,232,255,0.3)" />
        <path d="M0 50 L0 80 L5 80 L5 55 L10 55 L10 50 Z" fill="rgba(58,232,255,0.2)" />
        <path d="M50 0 L80 0 L80 5 L55 5 L55 10 L50 10 Z" fill="rgba(58,232,255,0.2)" />
        <rect x="12" y="12" width="3" height="3" fill="rgba(58,232,255,0.5)" />
        <rect x="20" y="12" width="8" height="2" fill="rgba(58,232,255,0.3)" />
        <rect x="12" y="20" width="2" height="8" fill="rgba(58,232,255,0.3)" />
      </svg>
    </div>
  )
}

function CircularPlatform() {
  return (
    <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2">
      <div className="relative">
        {/* Outer glow rings */}
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(58,232,255,0.15),transparent_70%)] blur-2xl" />

        {/* Concentric circles */}
        <svg viewBox="0 0 400 200" className="h-[180px] w-[360px]">
          <defs>
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(58,232,255,0)" />
              <stop offset="50%" stopColor="rgba(58,232,255,0.6)" />
              <stop offset="100%" stopColor="rgba(58,232,255,0)" />
            </linearGradient>
          </defs>

          {/* Elliptical rings */}
          <ellipse cx="200" cy="160" rx="180" ry="35" fill="none" stroke="url(#ring-gradient)" strokeWidth="1" opacity="0.3" />
          <ellipse cx="200" cy="150" rx="150" ry="28" fill="none" stroke="url(#ring-gradient)" strokeWidth="1" opacity="0.4" />
          <ellipse cx="200" cy="140" rx="120" ry="22" fill="none" stroke="url(#ring-gradient)" strokeWidth="1" opacity="0.5" />
          <ellipse cx="200" cy="130" rx="90" ry="16" fill="none" stroke="url(#ring-gradient)" strokeWidth="1.5" opacity="0.6" />
          <ellipse cx="200" cy="120" rx="60" ry="10" fill="none" stroke="url(#ring-gradient)" strokeWidth="2" opacity="0.8" />

          {/* Center glow */}
          <ellipse cx="200" cy="115" rx="30" ry="5" fill="rgba(58,232,255,0.4)" />

          {/* Light beam */}
          <path d="M185 115 L200 40 L215 115 Z" fill="url(#beam-gradient)" opacity="0.6" />
          <defs>
            <linearGradient id="beam-gradient" x1="200" y1="40" x2="200" y2="115" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(58,232,255,0.8)" />
              <stop offset="100%" stopColor="rgba(58,232,255,0)" />
            </linearGradient>
          </defs>

          {/* Dots on rings */}
          <circle cx="80" cy="155" r="2" fill="#4ae8ff" opacity="0.8" />
          <circle cx="320" cy="155" r="2" fill="#4ae8ff" opacity="0.8" />
          <circle cx="100" cy="145" r="1.5" fill="#4ae8ff" opacity="0.6" />
          <circle cx="300" cy="145" r="1.5" fill="#4ae8ff" opacity="0.6" />
          <circle cx="130" cy="135" r="1.5" fill="#4ae8ff" opacity="0.7" />
          <circle cx="270" cy="135" r="1.5" fill="#4ae8ff" opacity="0.7" />
        </svg>

        {/* Cloud icon */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <CloudBoltIcon className="h-24 w-24 drop-shadow-[0_0_20px_rgba(58,232,255,0.5)]" />
        </div>
      </div>
    </div>
  )
}

function BackgroundScene() {
  return (
    <>
      {/* Base gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(20,60,100,0.3),transparent_50%),linear-gradient(180deg,#040a18_0%,#030812_40%,#020610_100%)]" />

      {/* Grid pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(58,232,255,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(58,232,255,0.3)_1px,transparent_1px)] [background-size:60px_60px]" />

      {/* Diagonal lines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(45deg,rgba(58,232,255,0.4)_1px,transparent_1px),linear-gradient(-45deg,rgba(58,232,255,0.4)_1px,transparent_1px)] [background-size:80px_80px]" />

      {/* Side glows */}
      <div className="pointer-events-none absolute left-0 top-1/4 h-[400px] w-[300px] bg-[radial-gradient(circle,rgba(30,150,220,0.15),transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/4 h-[400px] w-[300px] bg-[radial-gradient(circle,rgba(30,150,220,0.15),transparent_70%)] blur-3xl" />

      {/* Center glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[600px] -translate-x-1/2 bg-[radial-gradient(circle,rgba(20,100,180,0.2),transparent_60%)] blur-3xl" />

      {/* Corner decorations */}
      <CornerDecoration position="top-left" />
      <CornerDecoration position="top-right" />
      <CornerDecoration position="bottom-left" />
      <CornerDecoration position="bottom-right" />

      {/* Tech lines on sides */}
      <div className="pointer-events-none absolute left-8 top-1/4 h-px w-24 bg-gradient-to-r from-transparent via-[#3ae8ff]/40 to-transparent" />
      <div className="pointer-events-none absolute left-8 top-1/3 h-px w-16 bg-gradient-to-r from-transparent via-[#3ae8ff]/30 to-transparent" />
      <div className="pointer-events-none absolute right-8 top-1/4 h-px w-24 bg-gradient-to-l from-transparent via-[#3ae8ff]/40 to-transparent" />
      <div className="pointer-events-none absolute right-8 top-1/3 h-px w-16 bg-gradient-to-l from-transparent via-[#3ae8ff]/30 to-transparent" />
    </>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { language, setLanguage } = useLanguage()
  const locale: Locale = language === "en" ? "en" : "zh"
  const copy = COPY[locale]
  const [account, setAccount] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    setSubmitting(true)

    try {
      const response = await loginWithCloud({
        username: account.trim(),
        password,
      })

      if (response.code !== 200 || !response.token) {
        throw new Error(response.msg || (locale === "zh" ? "登录失败，请稍后重试" : "Login failed. Please try again."))
      }

      persistAuthToken(response.token, remember)

      startTransition(() => {
        router.push("/dashboard")
      })
    } catch (error) {
      const fallbackMessage = locale === "zh" ? "登录失败，请稍后重试" : "Login failed. Please try again."
      setSubmitError(error instanceof Error ? error.message || fallbackMessage : fallbackMessage)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
  }

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#030812] text-white">
      <BackgroundScene />

      <div className="relative z-10 flex h-full flex-col">
        {/* Header */}
        <header className="shrink-0 py-6">
          <div className="flex items-center justify-center gap-4">
            <EnerCloudIcon className="h-12 w-12 drop-shadow-[0_0_15px_rgba(58,232,255,0.4)]" />
            <div className="flex flex-col items-start">
              <div
                className="bg-clip-text text-[2.5rem] font-black leading-none tracking-wide text-transparent"
                style={{ backgroundImage: "linear-gradient(180deg,#ffffff 0%,#b0f4ff 50%,#4ae8ff 100%)" }}
              >
                {BRAND}
              </div>
              <div className="mt-1 text-[14px] tracking-[0.3em] text-[#4ae8ff]/80">
                {locale === "zh" ? BRAND_SUBTITLE_ZH : BRAND_SUBTITLE_EN}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden px-4 py-4 lg:px-8">
          <div className="flex w-full max-w-[1400px] items-start justify-between gap-6">
            {/* Left menu */}
            <div className="hidden w-[260px] shrink-0 flex-col gap-3 lg:flex xl:w-[280px]">
              {LEFT_MENU_ITEMS.map((item, index) => (
                <FeatureCard
                  key={index}
                  icon={item.icon}
                  title={locale === "zh" ? item.titleZh : item.titleEn}
                  description={locale === "zh" ? item.descZh : item.descEn}
                  direction="left"
                />
              ))}
            </div>

            {/* Center login form */}
            <div className="flex flex-1 flex-col items-center justify-start">
              <div className="relative w-full max-w-[420px]">
                {/* Hexagonal frame glow */}
                <div className="pointer-events-none absolute -inset-4 rounded-lg bg-[radial-gradient(circle,rgba(58,232,255,0.15),transparent_70%)] blur-2xl" />

                {/* Login card with hexagonal clip */}
                <div
                  className="relative overflow-hidden border border-[#2a6a8a]/60 bg-[linear-gradient(160deg,rgba(8,20,40,0.95),rgba(4,12,28,0.98))] px-8 py-8 shadow-[0_0_40px_rgba(58,232,255,0.15),inset_0_0_60px_rgba(58,232,255,0.05)]"
                  style={{
                    clipPath: "polygon(8% 0%, 92% 0%, 100% 6%, 100% 94%, 92% 100%, 8% 100%, 0% 94%, 0% 6%)",
                  }}
                >
                  {/* Inner border effect */}
                  <div
                    className="pointer-events-none absolute inset-[1px] border border-[#3ae8ff]/20"
                    style={{
                      clipPath: "polygon(8% 0%, 92% 0%, 100% 6%, 100% 94%, 92% 100%, 8% 100%, 0% 94%, 0% 6%)",
                    }}
                  />

                  {/* Corner accents */}
                  <div className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-[#4ae8ff]/60" />
                  <div className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-[#4ae8ff]/60" />
                  <div className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-[#4ae8ff]/60" />
                  <div className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-[#4ae8ff]/60" />

                  {/* Language toggle */}
                  <div className="flex items-center">
                    <div className="flex overflow-hidden rounded-md border border-[#2a5a7a]/60 bg-[rgba(6,16,34,0.9)]">
                      {LANGUAGE_OPTIONS.map((option) => {
                        const active = locale === option.key
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setLanguage(option.key)}
                            className={cn(
                              "px-4 py-2 text-[13px] font-bold transition-colors",
                              active ? "bg-[rgba(30,100,150,0.5)] text-[#4ae8ff]" : "text-[#6a98a8] hover:text-[#a0e8ff]"
                            )}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Welcome text */}
                  <div className="mt-8 text-center">
                    <h1 className="text-[2rem] font-black tracking-wider text-white">{copy.welcome}</h1>
                    <p className="mt-1 text-[13px] tracking-[0.2em] text-[#4ae8ff]/70">{copy.welcomeSub}</p>
                  </div>

                  {/* Login form */}
                  <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4ae8ff]" />
                      <input
                        value={account}
                        onChange={(event) => {
                          setAccount(event.target.value)
                          setSubmitError(null)
                        }}
                        placeholder={copy.accountPlaceholder}
                        required
                        className="h-[52px] w-full rounded-lg border border-[#2a5a7a]/60 bg-[rgba(6,16,34,0.9)] pl-12 pr-4 text-[15px] text-[#e8f6ff] outline-none transition-all placeholder:text-[#5a7888] focus:border-[#4ae8ff]/60 focus:shadow-[0_0_15px_rgba(58,232,255,0.15)]"
                      />
                    </div>

                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4ae8ff]" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value)
                          setSubmitError(null)
                        }}
                        placeholder={copy.passwordPlaceholder}
                        required
                        className="h-[52px] w-full rounded-lg border border-[#2a5a7a]/60 bg-[rgba(6,16,34,0.9)] pl-12 pr-12 text-[15px] text-[#e8f6ff] outline-none transition-all placeholder:text-[#5a7888] focus:border-[#4ae8ff]/60 focus:shadow-[0_0_15px_rgba(58,232,255,0.15)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a8898] transition-colors hover:text-[#a0f0ff]"
                      >
                        {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-[14px]">
                      <label className="flex cursor-pointer items-center gap-2 text-[#7ab0c0]">
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(event) => setRemember(event.target.checked)}
                          className="h-4 w-4 rounded border border-[#2a5a7a] bg-[#050f1e] accent-[#4ae8ff]"
                        />
                        <span>{copy.remember}</span>
                      </label>
                      <button type="button" className="text-[#4ae8ff] transition-colors hover:text-[#a0f8ff]">
                        {copy.forgot}
                      </button>
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="group relative mt-4 h-[54px] w-full rounded-lg border border-[#4ae8ff]/30 bg-[linear-gradient(90deg,#1a8ad8_0%,#2070c0_50%,#1a6ab0_100%)] text-[16px] font-bold tracking-wider text-white shadow-[0_0_25px_rgba(30,140,220,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:brightness-110 disabled:opacity-75"
                    >
                      <span className="relative flex items-center justify-center gap-2">
                        {submitting ? `${copy.submit}...` : copy.submit}
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </Button>

                    {submitError ? (
                      <div className="rounded-lg border border-[#ff7b7b]/30 bg-[rgba(80,20,30,0.6)] px-4 py-3 text-[13px] text-[#ffd0d8]">
                        {submitError}
                      </div>
                    ) : null}
                  </form>
                </div>
              </div>

              {/* Bottom cloud platform */}
              <div className="relative mt-8 hidden lg:block">
                <CircularPlatform />
              </div>
            </div>

            {/* Right menu */}
            <div className="hidden w-[260px] shrink-0 flex-col gap-3 lg:flex xl:w-[280px]">
              {RIGHT_MENU_ITEMS.map((item, index) => (
                <FeatureCard
                  key={index}
                  icon={item.icon}
                  title={locale === "zh" ? item.titleZh : item.titleEn}
                  description={locale === "zh" ? item.descZh : item.descEn}
                  direction="right"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
