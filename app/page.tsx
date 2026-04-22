"use client"

import { startTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Eye, EyeOff, LockKeyhole, User } from "lucide-react"
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
  subtitle: string
}

const BRAND = "EnerCloud"

const COPY: Record<Locale, Copy> = {
  zh: {
    welcome: "欢迎登录",
    welcomeSub: "WELCOME",
    accountPlaceholder: "请输入用户名",
    passwordPlaceholder: "请输入密码",
    remember: "记住密码",
    forgot: "忘记密码?",
    submit: "登录平台",
    subtitle: "数 据 监 测 云 平 台",
  },
  en: {
    welcome: "Welcome",
    welcomeSub: "WELCOME",
    accountPlaceholder: "Enter username",
    passwordPlaceholder: "Enter password",
    remember: "Remember password",
    forgot: "Forgot password?",
    submit: "Enter Platform",
    subtitle: "Data Monitoring Cloud Platform",
  },
}

const LANGUAGE_OPTIONS: Array<{ key: Locale; label: string }> = [
  { key: "zh", label: "中" },
  { key: "en", label: "EN" },
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
          <stop offset="0%" stopColor="#d9ffff" />
          <stop offset="100%" stopColor="#3fe4ff" />
        </linearGradient>
      </defs>
      <path
        d="M23 54C13 54 8 47 8 39C8 30 14 23 24 22C25 12 33 7 42 7C51 7 58 12 61 20C69 21 74 27 74 35C74 45 67 54 55 54H23Z"
        fill="rgba(8,21,48,0.18)"
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

// Left side cloud decoration with lightning beam
function LeftDecoration() {
  return (
    <div className="pointer-events-none absolute left-[2%] top-1/2 hidden h-[400px] w-[320px] -translate-y-1/2 lg:block">
      {/* Cloud with lightning */}
      <svg viewBox="0 0 280 320" className="absolute left-0 top-0 h-full w-full" fill="none">
        <defs>
          <linearGradient id="cloud-grad" x1="60" y1="80" x2="220" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1a6fff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0ff" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="bolt-grad" x1="140" y1="100" x2="140" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4dedff" />
            <stop offset="100%" stopColor="#1a9fff" />
          </linearGradient>
          <radialGradient id="beam-glow" cx="0.5" cy="0" r="1" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#4dedff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1a6fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* Cloud shape */}
        <ellipse cx="140" cy="100" rx="90" ry="50" fill="url(#cloud-grad)" opacity="0.4" />
        <ellipse cx="100" cy="110" rx="60" ry="40" fill="url(#cloud-grad)" opacity="0.3" />
        <ellipse cx="180" cy="105" rx="50" ry="35" fill="url(#cloud-grad)" opacity="0.3" />
        
        {/* Cloud outline dots */}
        <ellipse cx="140" cy="100" rx="90" ry="50" fill="none" stroke="#3ad8ff" strokeWidth="1" strokeDasharray="2 4" opacity="0.5" />
        
        {/* Lightning bolt */}
        <path d="M150 80L130 120H145L125 160L160 115H145L150 80Z" fill="url(#bolt-grad)" />
        
        {/* Beam down from cloud */}
        <rect x="125" y="150" width="30" height="150" fill="url(#beam-glow)" opacity="0.4" />
        
        {/* Circular rings at bottom */}
        <ellipse cx="140" cy="290" rx="80" ry="20" fill="none" stroke="#2ae1ff" strokeWidth="1" opacity="0.5" />
        <ellipse cx="140" cy="290" rx="60" ry="15" fill="none" stroke="#2ae1ff" strokeWidth="1" opacity="0.4" />
        <ellipse cx="140" cy="290" rx="40" ry="10" fill="none" stroke="#4dedff" strokeWidth="1.5" opacity="0.6" />
        <ellipse cx="140" cy="290" rx="20" ry="5" fill="#4dedff" opacity="0.3" />
      </svg>
    </div>
  )
}

// Right side holographic screens decoration
function RightDecoration() {
  return (
    <div className="pointer-events-none absolute right-[2%] top-1/2 hidden h-[400px] w-[320px] -translate-y-1/2 lg:block">
      <svg viewBox="0 0 280 320" className="absolute right-0 top-0 h-full w-full" fill="none">
        <defs>
          <linearGradient id="screen-grad" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#1a6fff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0ff" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#4dedff" stopOpacity="0" />
            <stop offset="50%" stopColor="#4dedff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#4dedff" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Main screen */}
        <rect x="80" y="60" width="140" height="100" rx="4" fill="url(#screen-grad)" stroke="#3ad8ff" strokeWidth="1" opacity="0.6" />
        <rect x="90" y="70" width="50" height="30" rx="2" fill="none" stroke="#4dedff" strokeWidth="0.5" opacity="0.5" />
        <rect x="90" y="110" width="80" height="6" rx="1" fill="#2ae1ff" opacity="0.3" />
        <rect x="90" y="120" width="60" height="6" rx="1" fill="#2ae1ff" opacity="0.2" />
        <rect x="90" y="130" width="100" height="6" rx="1" fill="#2ae1ff" opacity="0.25" />
        
        {/* Secondary screen (tilted) */}
        <g transform="translate(160, 90) rotate(15)">
          <rect x="0" y="0" width="100" height="70" rx="3" fill="url(#screen-grad)" stroke="#3ad8ff" strokeWidth="0.8" opacity="0.4" />
          <circle cx="25" cy="25" r="15" fill="none" stroke="#4dedff" strokeWidth="0.5" opacity="0.5" />
          <rect x="50" y="15" width="40" height="4" rx="1" fill="#2ae1ff" opacity="0.3" />
          <rect x="50" y="25" width="30" height="4" rx="1" fill="#2ae1ff" opacity="0.2" />
        </g>
        
        {/* 3D cube wireframe */}
        <g transform="translate(100, 200)">
          <path d="M40 0L80 20L80 60L40 80L0 60L0 20Z" fill="none" stroke="#2ae1ff" strokeWidth="1" opacity="0.5" />
          <path d="M40 0L40 40L80 60" fill="none" stroke="#2ae1ff" strokeWidth="1" opacity="0.5" />
          <path d="M40 40L0 60" fill="none" stroke="#2ae1ff" strokeWidth="1" opacity="0.5" />
          <ellipse cx="40" cy="90" rx="50" ry="12" fill="none" stroke="#4dedff" strokeWidth="0.8" opacity="0.4" />
        </g>
        
        {/* Grid lines at bottom */}
        <path d="M20 280L260 280" stroke="url(#line-grad)" strokeWidth="0.5" />
        <path d="M40 290L240 290" stroke="url(#line-grad)" strokeWidth="0.5" opacity="0.6" />
        <path d="M60 300L220 300" stroke="url(#line-grad)" strokeWidth="0.5" opacity="0.4" />
      </svg>
    </div>
  )
}

// Top corner decorations
function CornerDecorations() {
  return (
    <>
      {/* Top left corner */}
      <div className="pointer-events-none absolute left-0 top-0">
        <svg viewBox="0 0 120 80" className="h-20 w-[120px]" fill="none">
          <path d="M0 40L40 0H100" stroke="#1a6fff" strokeWidth="1" opacity="0.6" />
          <path d="M0 50L30 20H60" stroke="#2ae1ff" strokeWidth="0.5" opacity="0.4" />
          <rect x="95" y="5" width="15" height="3" fill="#4dedff" opacity="0.5" />
        </svg>
      </div>
      
      {/* Top right corner */}
      <div className="pointer-events-none absolute right-0 top-0">
        <svg viewBox="0 0 120 80" className="h-20 w-[120px]" fill="none">
          <path d="M120 40L80 0H20" stroke="#1a6fff" strokeWidth="1" opacity="0.6" />
          <path d="M120 50L90 20H60" stroke="#2ae1ff" strokeWidth="0.5" opacity="0.4" />
          <rect x="10" y="5" width="15" height="3" fill="#4dedff" opacity="0.5" />
          <rect x="30" y="5" width="8" height="3" fill="#4dedff" opacity="0.3" />
        </svg>
      </div>
    </>
  )
}

// Background with particles and grid
function Background() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#0a1628_0%,#040810_100%)]" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(45,200,255,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(45,200,255,0.3)_1px,transparent_1px)] [background-size:60px_60px]" />
      
      {/* Perspective grid at bottom */}
      <div className="absolute bottom-0 left-1/2 h-[40vh] w-[200vw] -translate-x-1/2 opacity-[0.15] [background-image:linear-gradient(rgba(45,200,255,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(45,200,255,0.4)_1px,transparent_1px)] [background-size:80px_80px] [transform:perspective(500px)_rotateX(60deg)]" />
      
      {/* Floating particles */}
      <svg className="absolute inset-0 h-full w-full" fill="none">
        <defs>
          <radialGradient id="particle-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#4dedff" stopOpacity="1" />
            <stop offset="100%" stopColor="#4dedff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Random particles */}
        {[
          [10, 20], [25, 45], [15, 70], [35, 15], [45, 55], [55, 25], [65, 75], [75, 35], [85, 60], [90, 15],
          [8, 85], [30, 80], [50, 90], [70, 85], [88, 45], [5, 50], [95, 70], [40, 40], [60, 50], [20, 30]
        ].map(([x, y], i) => (
          <circle key={i} cx={`${x}%`} cy={`${y}%`} r="1.5" fill="url(#particle-glow)" opacity={0.3 + Math.random() * 0.4} />
        ))}
      </svg>
      
      {/* Ambient glow spots */}
      <div className="absolute left-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(26,111,255,0.15),transparent_70%)] blur-3xl" />
      <div className="absolute right-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(77,237,255,0.1),transparent_70%)] blur-3xl" />
    </div>
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
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#040810] text-white">
      <Background />
      <CornerDecorations />
      <LeftDecoration />
      <RightDecoration />

      {/* Header with logo */}
      <header className="relative z-10 flex flex-col items-center pt-6 sm:pt-8 lg:pt-10">
        <div className="flex items-center gap-3">
          <EnerCloudIcon className="h-[44px] w-[44px] drop-shadow-[0_0_12px_rgba(77,237,255,0.4)] sm:h-[52px] sm:w-[52px]" />
          <span
            className="bg-clip-text text-[1.8rem] font-bold tracking-[0.05em] text-transparent sm:text-[2.2rem]"
            style={{ backgroundImage: "linear-gradient(180deg,#ffffff 0%,#b8f4ff 100%)" }}
          >
            {BRAND}
          </span>
        </div>
        <p className="mt-1 text-[11px] font-medium tracking-[0.3em] text-[#4dedff] sm:text-[12px]">{copy.subtitle}</p>
      </header>

      {/* Login card */}
      <div className="relative z-10 flex min-h-[calc(100dvh-140px)] items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-[420px]">
          {/* Card glow */}
          <div className="absolute -inset-4 rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(42,225,255,0.12),transparent_70%)] blur-2xl" />
          
          {/* Card container with beveled corners */}
          <div
            className="relative overflow-hidden border border-[#2ae1ff]/30 bg-[linear-gradient(180deg,rgba(10,22,40,0.95),rgba(6,14,28,0.98))] px-6 py-8 shadow-[0_0_40px_rgba(42,225,255,0.1),inset_0_1px_0_rgba(255,255,255,0.05)] sm:px-8"
            style={{ clipPath: "polygon(20px 0%, calc(100% - 20px) 0%, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0% calc(100% - 20px), 0% 20px)" }}
          >
            {/* Inner border effect */}
            <div
              className="pointer-events-none absolute inset-[1px] border border-[#2ae1ff]/10"
              style={{ clipPath: "polygon(20px 0%, calc(100% - 20px) 0%, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0% calc(100% - 20px), 0% 20px)" }}
            />
            
            {/* Corner accents */}
            <div className="pointer-events-none absolute left-[2px] top-[2px] h-4 w-4 border-l-2 border-t-2 border-[#4dedff]/60" />
            <div className="pointer-events-none absolute right-[2px] top-[2px] h-4 w-4 border-r-2 border-t-2 border-[#4dedff]/60" />
            <div className="pointer-events-none absolute bottom-[2px] left-[2px] h-4 w-4 border-b-2 border-l-2 border-[#4dedff]/40" />
            <div className="pointer-events-none absolute bottom-[2px] right-[2px] h-4 w-4 border-b-2 border-r-2 border-[#4dedff]/40" />
            
            {/* Top highlight line */}
            <div className="pointer-events-none absolute left-[20%] right-[20%] top-0 h-px bg-gradient-to-r from-transparent via-[#4dedff]/60 to-transparent" />

            <div className="relative z-10">
              {/* Language toggle */}
              <div className="flex justify-center">
                <div className="flex items-center overflow-hidden rounded-lg border border-[#1a5878]/60 bg-[rgba(6,16,34,0.9)]">
                  {LANGUAGE_OPTIONS.map((option) => {
                    const active = locale === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setLanguage(option.key)}
                        className={cn(
                          "relative min-w-[48px] px-4 py-2 text-[13px] font-semibold tracking-wider transition-colors",
                          active
                            ? "bg-[#1a6fff] text-white"
                            : "text-[#5c879b] hover:text-[#bcf7ff]"
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
                <h1 className="text-[2rem] font-bold tracking-wider text-white sm:text-[2.4rem]">{copy.welcome}</h1>
                <p className="mt-1 text-[12px] tracking-[0.25em] text-[#7b9eb8]">{copy.welcomeSub}</p>
              </div>

              {/* Form */}
              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5c879b]" />
                  <input
                    value={account}
                    onChange={(event) => {
                      setAccount(event.target.value)
                      setSubmitError(null)
                    }}
                    placeholder={copy.accountPlaceholder}
                    autoComplete="username"
                    spellCheck={false}
                    required
                    className="h-[52px] w-full rounded-lg border border-[#1a4a6a]/60 bg-[rgba(8,18,36,0.8)] pl-12 pr-4 text-[14px] text-[#e8f6ff] outline-none transition-all placeholder:text-[#4a6a7a] focus:border-[#2ae1ff]/60 focus:shadow-[0_0_16px_rgba(42,225,255,0.1)]"
                  />
                </div>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5c879b]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setSubmitError(null)
                    }}
                    placeholder={copy.passwordPlaceholder}
                    autoComplete="current-password"
                    required
                    className="h-[52px] w-full rounded-lg border border-[#1a4a6a]/60 bg-[rgba(8,18,36,0.8)] pl-12 pr-12 text-[14px] text-[#e8f6ff] outline-none transition-all placeholder:text-[#4a6a7a] focus:border-[#2ae1ff]/60 focus:shadow-[0_0_16px_rgba(42,225,255,0.1)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5c879b] transition-colors hover:text-[#b7f7ff]"
                    aria-label={locale === "zh" ? "切换密码显示" : "Toggle password visibility"}
                  >
                    {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 text-[13px]">
                  <label className="flex cursor-pointer items-center gap-2 text-[#7b9eb8]">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="h-4 w-4 rounded border border-[#1a4a6a] bg-transparent accent-[#1a6fff]"
                    />
                    <span>{copy.remember}</span>
                  </label>
                  <button type="button" className="text-[#4dedff] transition-colors hover:text-[#b0f7ff]">
                    {copy.forgot}
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="group relative mt-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-lg border-0 bg-[linear-gradient(90deg,#1a9fff_0%,#2ae1ff_50%,#1a6fff_100%)] text-[15px] font-semibold tracking-wider text-white shadow-[0_0_24px_rgba(42,225,255,0.25)] transition-all hover:brightness-110 disabled:opacity-75"
                >
                  <span>{submitting ? `${copy.submit}...` : copy.submit}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>

                {submitError ? (
                  <div className="rounded-lg border border-[#ff7b7b]/20 bg-[rgba(74,18,28,0.5)] px-4 py-3 text-[13px] text-[#ffd3d8]">
                    {submitError}
                  </div>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
