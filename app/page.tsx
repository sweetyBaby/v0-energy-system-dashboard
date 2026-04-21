"use client"

import { useState } from "react"
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
const BRAND_SUBTITLE_ZH = "数 据 监 测 云 平 台"

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
  { icon: Battery, titleZh: "充放电量统计", titleEn: "Charge Stats", descZh: "充放电量统计分析", descEn: "Charge analysis" },
  { icon: Activity, titleZh: "功率趋势", titleEn: "Power Trends", descZh: "功率变化趋势分析", descEn: "Power trend" },
  { icon: Gauge, titleZh: "能效分析", titleEn: "Energy Analysis", descZh: "能效指标分析", descEn: "Energy analysis" },
  { icon: PieChart, titleZh: "数据分析", titleEn: "Data Analysis", descZh: "多维数据分析", descEn: "Multi-dim analysis" },
]

const RIGHT_MENU_ITEMS = [
  { icon: Bell, titleZh: "告警监测", titleEn: "Alerts", descZh: "告警信息实时监测", descEn: "Real-time alerts" },
  { icon: Monitor, titleZh: "实时监测", titleEn: "Monitoring", descZh: "设备实时运行监测", descEn: "Device monitoring" },
  { icon: FileText, titleZh: "报表日志", titleEn: "Reports", descZh: "报表日志查看与导出", descEn: "View & export" },
  { icon: Box, titleZh: "电芯矩阵", titleEn: "Cell Matrix", descZh: "电芯状态矩阵展示", descEn: "Cell matrix" },
  { icon: Clock, titleZh: "历史分析", titleEn: "History", descZh: "历史数据分析与追溯", descEn: "History data" },
]

export default function LoginPage() {
  const router = useRouter()
  const { setLocale } = useLanguage()
  const [locale, setLocalLocale] = useState<Locale>("zh")
  const [account, setAccount] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberPassword, setRememberPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const copy = COPY[locale]

  const handleLocaleChange = (newLocale: Locale) => {
    setLocalLocale(newLocale)
    setLocale(newLocale)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account || !password) {
      setError(locale === "zh" ? "请输入用户名和密码" : "Please enter username and password")
      return
    }
    setIsLoading(true)
    setError("")
    try {
      const res = await loginWithCloud(account, password)
      if (res.success && res.data?.token) {
        persistAuthToken(res.data.token, rememberPassword)
        router.push("/dashboard")
      } else {
        setError(res.message || (locale === "zh" ? "登录失败" : "Login failed"))
      }
    } catch {
      setError(locale === "zh" ? "登录失败，请重试" : "Login failed, please try again")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#030d1a]">
      {/* Background Effects */}
      <BackgroundEffects />
      
      {/* Corner Decorations */}
      <CornerDecoration position="tl" />
      <CornerDecoration position="tr" />
      <CornerDecoration position="bl" />
      <CornerDecoration position="br" />

      {/* City Skyline */}
      <CitySkyline />

      {/* Main Content */}
      <div className="relative z-10 flex w-full max-w-[1200px] flex-col items-center px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex items-center gap-3">
            <CloudLogo className="h-12 w-12" />
            <span className="text-3xl font-bold tracking-wide text-white">{BRAND}</span>
          </div>
          <p className="mt-2 text-sm tracking-[0.3em] text-[#4ae8ff]/80">{BRAND_SUBTITLE_ZH}</p>
        </div>

        {/* Three Column Layout */}
        <div className="flex w-full items-start justify-center gap-6">
          {/* Left Menu */}
          <div className="flex w-[220px] flex-col gap-3">
            {LEFT_MENU_ITEMS.map((item, idx) => (
              <MenuCard
                key={idx}
                icon={item.icon}
                title={locale === "zh" ? item.titleZh : item.titleEn}
                desc={locale === "zh" ? item.descZh : item.descEn}
                side="left"
              />
            ))}
          </div>

          {/* Center Login Card */}
          <div className="relative w-[380px]">
            <LoginCard
              locale={locale}
              copy={copy}
              account={account}
              setAccount={setAccount}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              rememberPassword={rememberPassword}
              setRememberPassword={setRememberPassword}
              isLoading={isLoading}
              error={error}
              onSubmit={handleSubmit}
              onLocaleChange={handleLocaleChange}
            />
          </div>

          {/* Right Menu */}
          <div className="flex w-[220px] flex-col gap-3">
            {RIGHT_MENU_ITEMS.map((item, idx) => (
              <MenuCard
                key={idx}
                icon={item.icon}
                title={locale === "zh" ? item.titleZh : item.titleEn}
                desc={locale === "zh" ? item.descZh : item.descEn}
                side="right"
              />
            ))}
          </div>
        </div>

        {/* Bottom Cloud Platform */}
        <CloudPlatform />
      </div>

      <style jsx>{`
        @keyframes scanLine {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(400%); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  )
}

// Cloud Logo Icon
function CloudLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 50" fill="none">
      <defs>
        <linearGradient id="logo-cloud" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6ff4ff" />
          <stop offset="100%" stopColor="#318eff" />
        </linearGradient>
        <filter id="logo-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M18 42C10 42 5 36 5 29C5 21 10 15 18 14C19 7 26 3 33 3C40 3 46 7 48 14C54 15 58 20 58 27C58 35 52 42 42 42H18Z"
        fill="rgba(9,31,68,0.3)"
        stroke="url(#logo-cloud)"
        strokeWidth="2"
        filter="url(#logo-glow)"
      />
      <path
        d="M34 10L25 24H32L27 38L38 21H31L34 10Z"
        fill="#b4faff"
        filter="url(#logo-glow)"
      />
    </svg>
  )
}

// Corner Decoration
function CornerDecoration({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const isTop = position.includes("t")
  const isLeft = position.includes("l")
  
  return (
    <div className={cn(
      "pointer-events-none absolute z-20",
      isTop ? "top-0" : "bottom-0",
      isLeft ? "left-0" : "right-0"
    )}>
      <svg 
        viewBox="0 0 100 100" 
        className="h-24 w-24 md:h-32 md:w-32"
        style={{ transform: `scale(${isLeft ? 1 : -1}, ${isTop ? 1 : -1})` }}
      >
        {/* L-bracket frame */}
        <path d="M0,0 L70,0 L70,3 L3,3 L3,70 L0,70 Z" fill="rgba(74,232,255,0.6)" />
        {/* Diagonal lines */}
        <line x1="0" y1="0" x2="50" y2="50" stroke="rgba(74,232,255,0.3)" strokeWidth="1" />
        <line x1="10" y1="0" x2="55" y2="45" stroke="rgba(74,232,255,0.15)" strokeWidth="0.5" />
        {/* Accent dots */}
        <circle cx="15" cy="15" r="2" fill="#4ae8ff">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="35" cy="35" r="1.5" fill="#4ae8ff" opacity="0.5" />
        {/* Small bars */}
        <rect x="10" y="6" width="25" height="1" fill="rgba(74,232,255,0.3)" />
        <rect x="6" y="10" width="1" height="25" fill="rgba(74,232,255,0.3)" />
      </svg>
    </div>
  )
}

// Menu Card Component
function MenuCard({ 
  icon: Icon, 
  title, 
  desc, 
  side 
}: { 
  icon: React.ElementType
  title: string
  desc: string
  side: "left" | "right"
}) {
  return (
    <div className={cn(
      "group relative flex cursor-pointer items-center gap-3 rounded-sm border border-[#1a4a6e]/60 bg-[#061428]/80 px-4 py-3 backdrop-blur-sm transition-all hover:border-[#4ae8ff]/50 hover:bg-[#0a2040]/90",
      side === "left" ? "flex-row" : "flex-row-reverse"
    )}>
      {/* Side accent bar */}
      <div className={cn(
        "absolute top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-[#4ae8ff] to-[#1a6a9e]",
        side === "left" ? "left-0" : "right-0"
      )} />
      
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[#1a4a6e]/50 bg-[#071830]/80">
        <Icon className="h-5 w-5 text-[#4ae8ff]" />
      </div>
      
      {/* Content */}
      <div className={cn("flex-1 min-w-0", side === "right" && "text-right")}>
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="mt-0.5 text-xs text-[#6aa8c8]">{desc}</div>
      </div>
      
      {/* Arrow */}
      <ChevronRight className={cn(
        "h-4 w-4 shrink-0 text-[#4ae8ff]/60 transition-transform group-hover:text-[#4ae8ff]",
        side === "right" && "rotate-180"
      )} />
    </div>
  )
}

// Login Card Component
function LoginCard({
  locale,
  copy,
  account,
  setAccount,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  rememberPassword,
  setRememberPassword,
  isLoading,
  error,
  onSubmit,
  onLocaleChange,
}: {
  locale: Locale
  copy: Copy
  account: string
  setAccount: (v: string) => void
  password: string
  setPassword: (v: string) => void
  showPassword: boolean
  setShowPassword: (v: boolean) => void
  rememberPassword: boolean
  setRememberPassword: (v: boolean) => void
  isLoading: boolean
  error: string
  onSubmit: (e: React.FormEvent) => void
  onLocaleChange: (locale: Locale) => void
}) {
  return (
    <div 
      className="relative overflow-hidden rounded-sm border border-[#1a5a8e]/60 bg-[#061428]/90 p-6 backdrop-blur-md"
      style={{
        clipPath: "polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)",
      }}
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 h-5 w-5 border-t-2 border-l-2 border-[#4ae8ff]/80" />
      <div className="absolute top-0 right-0 h-5 w-5 border-t-2 border-r-2 border-[#4ae8ff]/80" />
      <div className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-[#4ae8ff]/80" />
      <div className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-[#4ae8ff]/80" />

      {/* Language Toggle */}
      <div className="mb-6 flex gap-1">
        {LANGUAGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onLocaleChange(opt.key)}
            className={cn(
              "rounded px-3 py-1 text-sm font-medium transition-all",
              locale === opt.key
                ? "bg-[#1a5a8e] text-white"
                : "bg-[#0a2040] text-[#6aa8c8] hover:bg-[#0d2850]"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Welcome Text */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">{copy.welcome}</h2>
        <p className="mt-1 text-sm tracking-widest text-[#4ae8ff]/70">{copy.welcomeSub}</p>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Username */}
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4a7a9e]" />
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder={copy.accountPlaceholder}
            className="w-full rounded border border-[#1a4a6e]/60 bg-[#071830]/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#4a7a9e] outline-none transition-all focus:border-[#4ae8ff]/50 focus:ring-1 focus:ring-[#4ae8ff]/30"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4a7a9e]" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={copy.passwordPlaceholder}
            className="w-full rounded border border-[#1a4a6e]/60 bg-[#071830]/80 py-2.5 pl-10 pr-10 text-sm text-white placeholder-[#4a7a9e] outline-none transition-all focus:border-[#4ae8ff]/50 focus:ring-1 focus:ring-[#4ae8ff]/30"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a7a9e] hover:text-[#4ae8ff]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Remember & Forgot */}
        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-[#6aa8c8]">
            <input
              type="checkbox"
              checked={rememberPassword}
              onChange={(e) => setRememberPassword(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[#1a4a6e] bg-[#071830] accent-[#4ae8ff]"
            />
            {copy.remember}
          </label>
          <button type="button" className="text-[#4ae8ff] hover:underline">
            {copy.forgot}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-[#1a6a9e] to-[#2a8ac8] py-2.5 text-white hover:from-[#1a7ab0] hover:to-[#3a9ad8]"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {locale === "zh" ? "登录中..." : "Loading..."}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {copy.submit}
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>
    </div>
  )
}

// Background Effects
function BackgroundEffects() {
  return (
    <>
      {/* Base gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_20%,rgba(10,50,100,0.4),transparent)]" />
      
      {/* Grid */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{ 
          backgroundImage: "linear-gradient(rgba(74,232,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(74,232,255,1) 1px, transparent 1px)",
          backgroundSize: "50px 50px"
        }} 
      />

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg className="h-full w-full">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {[...Array(25)].map((_, i) => (
            <circle
              key={i}
              r={1 + Math.random() * 2}
              fill="#4ae8ff"
              opacity={0.3 + Math.random() * 0.4}
              filter="url(#glow)"
            >
              <animate
                attributeName="cx"
                values={`${Math.random() * 100}%;${Math.random() * 100}%;${Math.random() * 100}%`}
                dur={`${20 + Math.random() * 20}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="cy"
                values={`${Math.random() * 100}%;${Math.random() * 100}%;${Math.random() * 100}%`}
                dur={`${25 + Math.random() * 15}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </svg>
      </div>

      {/* Vertical data lines */}
      <div className="pointer-events-none absolute inset-0 flex justify-around px-20 opacity-[0.06]">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className="h-full w-px bg-gradient-to-b from-transparent via-[#4ae8ff] to-transparent"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}
      </div>
    </>
  )
}

// City Skyline
function CitySkyline() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[150px] overflow-hidden opacity-30">
      <svg viewBox="0 0 1400 150" className="h-full w-full" preserveAspectRatio="xMidYMax slice">
        {/* Left buildings */}
        <g fill="rgba(8,30,60,0.95)" stroke="rgba(74,232,255,0.2)" strokeWidth="0.5">
          <rect x="20" y="90" width="25" height="60" />
          <rect x="50" y="70" width="20" height="80" />
          <rect x="75" y="50" width="30" height="100" />
          <rect x="110" y="80" width="18" height="70" />
          <rect x="133" y="40" width="25" height="110" />
          <rect x="163" y="60" width="22" height="90" />
          <rect x="190" y="35" width="28" height="115" />
          <rect x="223" y="75" width="20" height="75" />
          <rect x="248" y="55" width="24" height="95" />
          <rect x="277" y="65" width="18" height="85" />
          <rect x="300" y="85" width="30" height="65" />
          <rect x="335" y="50" width="22" height="100" />
        </g>
        {/* Right buildings */}
        <g fill="rgba(8,30,60,0.95)" stroke="rgba(74,232,255,0.2)" strokeWidth="0.5">
          <rect x="1050" y="50" width="22" height="100" />
          <rect x="1077" y="85" width="30" height="65" />
          <rect x="1112" y="65" width="18" height="85" />
          <rect x="1135" y="55" width="24" height="95" />
          <rect x="1164" y="75" width="20" height="75" />
          <rect x="1189" y="35" width="28" height="115" />
          <rect x="1222" y="60" width="22" height="90" />
          <rect x="1249" y="40" width="25" height="110" />
          <rect x="1279" y="80" width="18" height="70" />
          <rect x="1302" y="50" width="30" height="100" />
          <rect x="1337" y="70" width="20" height="80" />
          <rect x="1362" y="90" width="25" height="60" />
        </g>
        {/* Window lights */}
        {[
          [85,60],[145,52],[200,48],[258,68],[305,75],[345,65],
          [1060,65],[1120,78],[1195,48],[1260,55],[1315,65],[1350,82],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width={3} height={4} fill="#4ae8ff" opacity="0.6">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${1.5 + (i % 4) * 0.3}s`} repeatCount="indefinite" />
          </rect>
        ))}
      </svg>
    </div>
  )
}

// Cloud Platform at Bottom
function CloudPlatform() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
      <div className="relative flex flex-col items-center">
        {/* Cloud Icon */}
        <svg viewBox="0 0 120 60" className="h-[60px] w-[120px]">
          <defs>
            <linearGradient id="platform-cloud" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ae8ff" />
              <stop offset="100%" stopColor="#1a6a9e" />
            </linearGradient>
            <filter id="platform-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M30 48C20 48 12 41 12 32C12 24 18 17 28 16C30 8 40 3 52 3C64 3 74 8 77 16C86 17 95 23 95 33C95 43 86 48 75 48H30Z"
            fill="rgba(4,18,36,0.85)"
            stroke="url(#platform-cloud)"
            strokeWidth="2"
            filter="url(#platform-glow)"
          />
          <path
            d="M58 10L48 25H55L49 42L63 22H55L58 10Z"
            fill="#b4faff"
            filter="url(#platform-glow)"
          />
        </svg>

        {/* Light Beam */}
        <svg viewBox="0 0 80 60" className="-mt-1 h-[60px] w-[80px]">
          <defs>
            <linearGradient id="beam" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="rgba(180,250,255,0.8)" />
              <stop offset="50%" stopColor="rgba(74,232,255,0.4)" />
              <stop offset="100%" stopColor="rgba(74,232,255,0)" />
            </linearGradient>
          </defs>
          <polygon points="40,0 60,60 20,60" fill="url(#beam)">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
          </polygon>
        </svg>

        {/* Concentric Rings */}
        <svg viewBox="0 0 400 70" className="-mt-4 h-[70px] w-[400px]">
          <defs>
            <linearGradient id="ring" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="rgba(74,232,255,0)" />
              <stop offset="20%" stopColor="rgba(74,232,255,0.4)" />
              <stop offset="50%" stopColor="rgba(180,250,255,0.9)" />
              <stop offset="80%" stopColor="rgba(74,232,255,0.4)" />
              <stop offset="100%" stopColor="rgba(74,232,255,0)" />
            </linearGradient>
            <filter id="ring-glow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Rings */}
          {[
            { rx: 180, ry: 14, cy: 35, opacity: 0.1, width: 0.5 },
            { rx: 150, ry: 11, cy: 38, opacity: 0.2, width: 0.7 },
            { rx: 120, ry: 9, cy: 41, opacity: 0.3, width: 0.9 },
            { rx: 90, ry: 7, cy: 44, opacity: 0.5, width: 1.1 },
            { rx: 60, ry: 5, cy: 47, opacity: 0.7, width: 1.4 },
            { rx: 35, ry: 3, cy: 50, opacity: 0.9, width: 1.8 },
          ].map((r, i) => (
            <ellipse
              key={i}
              cx="200"
              cy={r.cy}
              rx={r.rx}
              ry={r.ry}
              fill="none"
              stroke="url(#ring)"
              strokeWidth={r.width}
              opacity={r.opacity}
              filter={i >= 3 ? "url(#ring-glow)" : undefined}
            />
          ))}
          {/* Orbiting dots */}
          {[
            { rx: 150, ry: 11, dur: "10s" },
            { rx: 90, ry: 7, dur: "7s" },
            { rx: 60, ry: 5, dur: "5s" },
          ].map((o, i) => (
            <circle key={i} r="3" fill="#4ae8ff" filter="url(#ring-glow)">
              <animateMotion
                dur={o.dur}
                repeatCount="indefinite"
                path={`M${200 - o.rx},${38 + i * 3} a${o.rx},${o.ry} 0 1,1 ${o.rx * 2},0 a${o.rx},${o.ry} 0 1,1 -${o.rx * 2},0`}
              />
            </circle>
          ))}
        </svg>
      </div>
    </div>
  )
}
