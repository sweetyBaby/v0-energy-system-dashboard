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

// Logo icon matching the design
function EnerCloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cloud-fill" x1="5" y1="5" x2="55" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#0088ff" />
        </linearGradient>
      </defs>
      {/* Cloud shape */}
      <path
        d="M15 38C8 38 4 33 4 27C4 20 9 15 17 14C18 7 24 3 32 3C40 3 46 7 48 14C54 15 58 19 58 26C58 34 52 38 43 38H15Z"
        fill="url(#cloud-fill)"
      />
      {/* Lightning bolt */}
      <path
        d="M34 8L24 22H30L24 36L38 19H32L34 8Z"
        fill="white"
      />
    </svg>
  )
}

// Top decorative tech lines - matching the angular design
function TopDecorations() {
  return (
    <>
      {/* Left top corner decoration */}
      <svg className="pointer-events-none absolute left-0 top-0 h-[60px] w-[200px]" viewBox="0 0 200 60" fill="none">
        {/* Main angular line */}
        <path d="M0 30L50 30L80 8L180 8" stroke="#00c8ff" strokeWidth="1.5" />
        {/* Secondary line */}
        <path d="M0 40L30 40L55 20L120 20" stroke="#0088aa" strokeWidth="1" opacity="0.6" />
        {/* Accent rectangles */}
        <rect x="175" y="5" width="20" height="6" fill="#00c8ff" opacity="0.8" />
        <rect x="160" y="5" width="10" height="6" fill="#005577" opacity="0.6" />
      </svg>
      
      {/* Right top corner decoration */}
      <svg className="pointer-events-none absolute right-0 top-0 h-[60px] w-[200px]" viewBox="0 0 200 60" fill="none">
        {/* Main angular line */}
        <path d="M200 30L150 30L120 8L20 8" stroke="#00c8ff" strokeWidth="1.5" />
        {/* Secondary line */}
        <path d="M200 40L170 40L145 20L80 20" stroke="#0088aa" strokeWidth="1" opacity="0.6" />
        {/* Accent rectangles */}
        <rect x="5" y="5" width="20" height="6" fill="#00c8ff" opacity="0.8" />
        <rect x="30" y="5" width="10" height="6" fill="#005577" opacity="0.6" />
      </svg>
    </>
  )
}

// Left decoration - Cloud with lightning and beam rings
function LeftDecoration() {
  return (
    <div className="pointer-events-none absolute bottom-[10%] left-[3%] hidden h-[480px] w-[300px] lg:block xl:left-[5%]">
      <svg viewBox="0 0 300 480" className="h-full w-full" fill="none">
        <defs>
          <linearGradient id="left-beam" x1="150" y1="200" x2="150" y2="450" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="ring-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* Cloud shape - dotted outline style */}
        <ellipse cx="150" cy="100" rx="100" ry="55" fill="none" stroke="#0077cc" strokeWidth="2" strokeDasharray="3 6" opacity="0.5" />
        <ellipse cx="95" cy="115" rx="65" ry="40" fill="none" stroke="#0077cc" strokeWidth="1.5" strokeDasharray="2 5" opacity="0.4" />
        <ellipse cx="200" cy="110" rx="55" ry="35" fill="none" stroke="#0077cc" strokeWidth="1.5" strokeDasharray="2 5" opacity="0.4" />
        
        {/* Cloud inner glow */}
        <ellipse cx="150" cy="100" rx="85" ry="45" fill="url(#ring-glow)" opacity="0.3" />
        
        {/* Lightning bolt */}
        <path d="M165 55L130 110H155L120 175L180 100H155L165 55Z" fill="#00d4ff" />
        <path d="M165 55L130 110H155L120 175L180 100H155L165 55Z" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
        
        {/* Main beam down */}
        <path d="M120 170L100 450H200L180 170Z" fill="url(#left-beam)" opacity="0.3" />
        
        {/* Central bright beam */}
        <rect x="135" y="170" width="30" height="250" fill="url(#left-beam)" opacity="0.5" />
        
        {/* Concentric rings at bottom */}
        <ellipse cx="150" cy="430" rx="120" ry="25" fill="none" stroke="#00aadd" strokeWidth="1" opacity="0.3" />
        <ellipse cx="150" cy="430" rx="95" ry="20" fill="none" stroke="#00bbee" strokeWidth="1" opacity="0.4" />
        <ellipse cx="150" cy="430" rx="70" ry="15" fill="none" stroke="#00ccff" strokeWidth="1.5" opacity="0.5" />
        <ellipse cx="150" cy="430" rx="45" ry="10" fill="none" stroke="#00ddff" strokeWidth="2" opacity="0.6" />
        <ellipse cx="150" cy="430" rx="20" ry="5" fill="#00eeff" opacity="0.4" />
        
        {/* Ring glow effect */}
        <ellipse cx="150" cy="430" rx="100" ry="22" fill="url(#ring-glow)" />
      </svg>
    </div>
  )
}

// Right decoration - Holographic screens and 3D cube
function RightDecoration() {
  return (
    <div className="pointer-events-none absolute bottom-[10%] right-[3%] hidden h-[480px] w-[320px] lg:block xl:right-[5%]">
      <svg viewBox="0 0 320 480" className="h-full w-full" fill="none">
        <defs>
          <linearGradient id="screen-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#003366" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#001133" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="cube-glow" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#00ddff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#00ddff" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Back tilted screen */}
        <g transform="translate(180, 40) rotate(12)">
          <rect x="0" y="0" width="120" height="85" rx="4" fill="url(#screen-fill)" stroke="#0088bb" strokeWidth="1" />
          {/* Pie chart */}
          <circle cx="35" cy="35" r="20" fill="none" stroke="#0099cc" strokeWidth="8" strokeDasharray="40 86" strokeDashoffset="0" opacity="0.6" />
          <circle cx="35" cy="35" r="20" fill="none" stroke="#00ccff" strokeWidth="8" strokeDasharray="30 96" strokeDashoffset="-40" opacity="0.8" />
          {/* Data lines */}
          <rect x="70" y="20" width="40" height="5" rx="1" fill="#00aacc" opacity="0.5" />
          <rect x="70" y="32" width="30" height="5" rx="1" fill="#0088aa" opacity="0.4" />
          <rect x="70" y="44" width="35" height="5" rx="1" fill="#00aacc" opacity="0.5" />
          <rect x="70" y="56" width="25" height="5" rx="1" fill="#0088aa" opacity="0.4" />
        </g>
        
        {/* Main front screen */}
        <g transform="translate(60, 90)">
          <rect x="0" y="0" width="160" height="115" rx="5" fill="url(#screen-fill)" stroke="#00aadd" strokeWidth="1.5" />
          {/* Chart area */}
          <rect x="15" y="15" width="70" height="50" rx="3" fill="none" stroke="#00aacc" strokeWidth="1" opacity="0.5" />
          {/* Bar chart inside */}
          <rect x="25" y="45" width="8" height="15" fill="#00ccff" opacity="0.6" />
          <rect x="38" y="35" width="8" height="25" fill="#00ddff" opacity="0.7" />
          <rect x="51" y="40" width="8" height="20" fill="#00ccff" opacity="0.6" />
          <rect x="64" y="30" width="8" height="30" fill="#00eeff" opacity="0.8" />
          {/* Text lines */}
          <rect x="95" y="20" width="50" height="6" rx="1" fill="#0099bb" opacity="0.5" />
          <rect x="95" y="32" width="40" height="6" rx="1" fill="#0088aa" opacity="0.4" />
          <rect x="95" y="44" width="45" height="6" rx="1" fill="#0099bb" opacity="0.5" />
          {/* Bottom data row */}
          <rect x="15" y="80" width="130" height="8" rx="1" fill="#0077aa" opacity="0.3" />
          <rect x="15" y="95" width="100" height="8" rx="1" fill="#0066aa" opacity="0.25" />
        </g>
        
        {/* Small side screen */}
        <g transform="translate(230, 160) rotate(8)">
          <rect x="0" y="0" width="70" height="50" rx="3" fill="url(#screen-fill)" stroke="#0088aa" strokeWidth="1" opacity="0.7" />
          <circle cx="20" cy="25" r="12" fill="none" stroke="#00bbcc" strokeWidth="1" opacity="0.5" />
          <rect x="38" y="15" width="25" height="4" rx="1" fill="#0099aa" opacity="0.4" />
          <rect x="38" y="25" width="20" height="4" rx="1" fill="#0088aa" opacity="0.3" />
          <rect x="38" y="35" width="22" height="4" rx="1" fill="#0099aa" opacity="0.4" />
        </g>
        
        {/* 3D Wireframe cube */}
        <g transform="translate(120, 300)">
          {/* Cube faces */}
          <path d="M60 0L120 30L120 90L60 120L0 90L0 30Z" fill="none" stroke="#00ccff" strokeWidth="1.5" opacity="0.6" />
          <path d="M60 0L60 60L120 90" fill="none" stroke="#00ddff" strokeWidth="1" opacity="0.5" />
          <path d="M60 60L0 90" fill="none" stroke="#00ddff" strokeWidth="1" opacity="0.5" />
          <path d="M0 30L60 60L120 30" fill="none" stroke="#00bbee" strokeWidth="1" opacity="0.4" />
          
          {/* Cube glow */}
          <ellipse cx="60" cy="60" rx="50" ry="50" fill="url(#cube-glow)" opacity="0.2" />
          
          {/* Platform rings below cube */}
          <ellipse cx="60" cy="135" rx="80" ry="18" fill="none" stroke="#00aacc" strokeWidth="1" opacity="0.3" />
          <ellipse cx="60" cy="135" rx="55" ry="12" fill="none" stroke="#00bbdd" strokeWidth="1" opacity="0.4" />
          <ellipse cx="60" cy="135" rx="30" ry="7" fill="#00ccee" opacity="0.2" />
        </g>
        
        {/* Connection lines / data flow */}
        <path d="M200 220L180 280L200 300" stroke="#00aacc" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
        <path d="M100 210L120 260L100 300" stroke="#0099bb" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
      </svg>
    </div>
  )
}

// Background with subtle grid and particles
function Background() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base dark blue gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,#0a1830_0%,#040810_60%)]" />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,200,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,200,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px'
        }}
      />
      
      {/* Floating particles */}
      <svg className="absolute inset-0 h-full w-full" fill="none">
        {Array.from({ length: 30 }).map((_, i) => {
          const x = 5 + (i * 31) % 90
          const y = 8 + (i * 37) % 84
          const size = 1 + (i % 3) * 0.5
          const opacity = 0.2 + (i % 5) * 0.1
          return (
            <circle
              key={i}
              cx={`${x}%`}
              cy={`${y}%`}
              r={size}
              fill="#00d4ff"
              opacity={opacity}
            />
          )
        })}
      </svg>
      
      {/* Ambient glow - left */}
      <div className="absolute -left-[10%] top-[30%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,100,180,0.15)_0%,transparent_70%)]" />
      
      {/* Ambient glow - right */}
      <div className="absolute -right-[10%] top-[40%] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(0,180,220,0.1)_0%,transparent_70%)]" />
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
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#040810] text-white">
      <Background />
      <TopDecorations />

      {/* Header with logo - centered at top */}
      <header className="relative z-10 flex flex-col items-center pt-5 sm:pt-6">
        <div className="flex items-center gap-2">
          <EnerCloudIcon className="h-[40px] w-[40px] drop-shadow-[0_0_15px_rgba(0,212,255,0.5)] sm:h-[48px] sm:w-[48px]" />
          <span className="text-[1.6rem] font-semibold tracking-wide text-white sm:text-[2rem]">
            {BRAND}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] font-normal tracking-[0.35em] text-[#00d4ff] sm:text-[11px]">
          {copy.subtitle}
        </p>
      </header>

      {/* Main content area with decorations */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-6">
        <LeftDecoration />
        <RightDecoration />
        
        {/* Login card */}
        <div className="relative w-full max-w-[400px]">
          {/* Card outer glow */}
          <div className="absolute -inset-3 rounded-lg bg-[radial-gradient(ellipse_at_center,rgba(0,180,255,0.08)_0%,transparent_70%)]" />
          
          {/* Card with beveled corners */}
          <div className="relative overflow-hidden bg-[#0a1525]/95 shadow-[0_0_50px_rgba(0,150,200,0.1)]"
            style={{
              clipPath: 'polygon(24px 0%, calc(100% - 24px) 0%, 100% 24px, 100% calc(100% - 24px), calc(100% - 24px) 100%, 24px 100%, 0% calc(100% - 24px), 0% 24px)'
            }}
          >
            {/* Border effect using SVG */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="border-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00ccff" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#0088aa" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#00ccff" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <path
                d="M24,1 L calc(100%-24),1 L calc(100%-1),24 L calc(100%-1),calc(100%-24) L calc(100%-24),calc(100%-1) L 24,calc(100%-1) L 1,calc(100%-24) L 1,24 Z"
                fill="none"
                stroke="url(#border-gradient)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            
            {/* Actual border using pseudo element approach via tailwind */}
            <div 
              className="pointer-events-none absolute inset-0 border border-[#00aacc]/40"
              style={{
                clipPath: 'polygon(24px 0%, calc(100% - 24px) 0%, 100% 24px, 100% calc(100% - 24px), calc(100% - 24px) 100%, 24px 100%, 0% calc(100% - 24px), 0% 24px)'
              }}
            />
            
            {/* Corner accent lines */}
            <div className="pointer-events-none absolute left-0 top-[24px] h-[40px] w-[2px] bg-gradient-to-b from-[#00ddff] to-transparent" />
            <div className="pointer-events-none absolute left-[24px] top-0 h-[2px] w-[40px] bg-gradient-to-r from-[#00ddff] to-transparent" />
            <div className="pointer-events-none absolute right-0 top-[24px] h-[40px] w-[2px] bg-gradient-to-b from-[#00ddff] to-transparent" />
            <div className="pointer-events-none absolute right-[24px] top-0 h-[2px] w-[40px] bg-gradient-to-l from-[#00ddff] to-transparent" />
            <div className="pointer-events-none absolute bottom-[24px] left-0 h-[40px] w-[2px] bg-gradient-to-t from-[#00aacc]/60 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-[24px] h-[2px] w-[40px] bg-gradient-to-r from-[#00aacc]/60 to-transparent" />
            <div className="pointer-events-none absolute bottom-[24px] right-0 h-[40px] w-[2px] bg-gradient-to-t from-[#00aacc]/60 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 right-[24px] h-[2px] w-[40px] bg-gradient-to-l from-[#00aacc]/60 to-transparent" />
            
            {/* Top edge highlight */}
            <div className="pointer-events-none absolute left-[30%] right-[30%] top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ddff]/70 to-transparent" />

            {/* Card content */}
            <div className="relative z-10 px-8 py-8 sm:px-10 sm:py-10">
              {/* Language toggle */}
              <div className="flex justify-center">
                <div className="flex overflow-hidden rounded border border-[#1a4060] bg-[#061020]">
                  {LANGUAGE_OPTIONS.map((option) => {
                    const active = locale === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setLanguage(option.key)}
                        className={cn(
                          "min-w-[44px] px-3 py-1.5 text-[13px] font-medium transition-colors",
                          active
                            ? "bg-[#1a6fff] text-white"
                            : "text-[#5588aa] hover:text-[#88ccdd]"
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
                <h1 className="text-[1.9rem] font-bold tracking-wider text-white sm:text-[2.2rem]">
                  {copy.welcome}
                </h1>
                <p className="mt-1 text-[11px] tracking-[0.3em] text-[#6699aa]">
                  {copy.welcomeSub}
                </p>
              </div>

              {/* Form */}
              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                {/* Username input */}
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#4477aa]" strokeWidth={1.5} />
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
                    className="h-[50px] w-full rounded-md border border-[#1a3550] bg-[#0a1828] pl-12 pr-4 text-[14px] text-[#c0e0f0] outline-none transition-all placeholder:text-[#3a5570] focus:border-[#00aacc]/60 focus:bg-[#0c1c30]"
                  />
                </div>

                {/* Password input */}
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#4477aa]" strokeWidth={1.5} />
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
                    className="h-[50px] w-full rounded-md border border-[#1a3550] bg-[#0a1828] pl-12 pr-12 text-[14px] text-[#c0e0f0] outline-none transition-all placeholder:text-[#3a5570] focus:border-[#00aacc]/60 focus:bg-[#0c1c30]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4477aa] transition-colors hover:text-[#88ccdd]"
                    aria-label={locale === "zh" ? "切换密码显示" : "Toggle password visibility"}
                  >
                    {showPassword ? <Eye className="h-5 w-5" strokeWidth={1.5} /> : <EyeOff className="h-5 w-5" strokeWidth={1.5} />}
                  </button>
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between text-[13px]">
                  <label className="flex cursor-pointer items-center gap-2 text-[#6699aa]">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="h-[14px] w-[14px] appearance-none rounded-sm border border-[#2a4a60] bg-transparent checked:border-[#00aacc] checked:bg-[#00aacc]"
                    />
                    <span>{copy.remember}</span>
                  </label>
                  <button type="button" className="text-[#00ccff] transition-colors hover:text-[#66ddff]">
                    {copy.forgot}
                  </button>
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="group mt-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-md border-0 bg-gradient-to-r from-[#00aacc] via-[#00ccee] to-[#0088cc] text-[15px] font-semibold tracking-wider text-white shadow-[0_0_20px_rgba(0,180,220,0.3)] transition-all hover:shadow-[0_0_30px_rgba(0,200,240,0.4)] disabled:opacity-70"
                >
                  <span>{submitting ? `${copy.submit}...` : copy.submit}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
                </Button>

                {/* Error message */}
                {submitError ? (
                  <div className="rounded-md border border-[#662222]/40 bg-[#1a0a0a]/60 px-4 py-3 text-[13px] text-[#ffaaaa]">
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
