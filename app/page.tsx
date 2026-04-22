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

// Logo icon - precise match to design
function EnerCloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cloud-gradient" x1="0" y1="0" x2="48" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#0099ff" />
        </linearGradient>
        <filter id="logo-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M12 32C6 32 2 27.5 2 22.5C2 16.5 6.5 12 13 11C14 5.5 19 2 26 2C33.5 2 39 6 41 12C46 13 48 17 48 22C48 28.5 43 32 35 32H12Z"
        fill="url(#cloud-gradient)"
        filter="url(#logo-glow)"
      />
      <path
        d="M28 7L19 18H25L17 31L33 15H27L28 7Z"
        fill="white"
      />
    </svg>
  )
}

// Top corner tech decorations - angular lines with accent points
function TopDecorations() {
  return (
    <>
      {/* Left top */}
      <svg className="pointer-events-none absolute left-0 top-0 h-16 w-56" viewBox="0 0 224 64" fill="none">
        <path d="M0 32 L60 32 L90 10 L200 10" stroke="url(#line-grad-l)" strokeWidth="1" />
        <path d="M0 42 L40 42 L65 24 L140 24" stroke="#005580" strokeWidth="0.5" opacity="0.5" />
        <rect x="195" y="6" width="24" height="8" fill="#00c8ff" opacity="0.9" />
        <rect x="175" y="6" width="14" height="8" fill="#004466" opacity="0.5" />
        <circle cx="90" cy="10" r="2" fill="#00e0ff" />
        <defs>
          <linearGradient id="line-grad-l" x1="0" y1="0" x2="200" y2="0">
            <stop offset="0%" stopColor="#003355" />
            <stop offset="100%" stopColor="#00c8ff" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Right top */}
      <svg className="pointer-events-none absolute right-0 top-0 h-16 w-56" viewBox="0 0 224 64" fill="none">
        <path d="M224 32 L164 32 L134 10 L24 10" stroke="url(#line-grad-r)" strokeWidth="1" />
        <path d="M224 42 L184 42 L159 24 L84 24" stroke="#005580" strokeWidth="0.5" opacity="0.5" />
        <rect x="5" y="6" width="24" height="8" fill="#00c8ff" opacity="0.9" />
        <rect x="35" y="6" width="14" height="8" fill="#004466" opacity="0.5" />
        <circle cx="134" cy="10" r="2" fill="#00e0ff" />
        <defs>
          <linearGradient id="line-grad-r" x1="224" y1="0" x2="24" y2="0">
            <stop offset="0%" stopColor="#003355" />
            <stop offset="100%" stopColor="#00c8ff" />
          </linearGradient>
        </defs>
      </svg>
    </>
  )
}

// Left decoration - particle cloud with lightning and light beam
function LeftDecoration() {
  // Generate particle points for cloud shape
  const cloudParticles: Array<{ cx: number; cy: number; r: number; o: number }> = []
  for (let i = 0; i < 80; i++) {
    const angle = (i / 80) * Math.PI * 2
    const radiusX = 85 + Math.sin(angle * 3) * 20
    const radiusY = 45 + Math.cos(angle * 2) * 15
    const x = 150 + Math.cos(angle) * radiusX + (Math.random() - 0.5) * 30
    const y = 95 + Math.sin(angle) * radiusY + (Math.random() - 0.5) * 20
    cloudParticles.push({ cx: x, cy: y, r: 1 + Math.random() * 1.5, o: 0.3 + Math.random() * 0.4 })
  }
  // Inner particles
  for (let i = 0; i < 40; i++) {
    const x = 150 + (Math.random() - 0.5) * 120
    const y = 95 + (Math.random() - 0.5) * 60
    cloudParticles.push({ cx: x, cy: y, r: 0.8 + Math.random(), o: 0.2 + Math.random() * 0.3 })
  }

  return (
    <div className="pointer-events-none absolute bottom-[8%] left-[2%] hidden h-[520px] w-[320px] lg:block xl:left-[4%]">
      <svg viewBox="0 0 320 520" className="h-full w-full" fill="none">
        <defs>
          <linearGradient id="beam-grad" x1="160" y1="180" x2="160" y2="480" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00ddff" stopOpacity="0.7" />
            <stop offset="40%" stopColor="#00aadd" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0066aa" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beam-center" x1="160" y1="180" x2="160" y2="450" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#00eeff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00aacc" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="cloud-inner-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00aadd" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#006688" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* Cloud particles */}
        {cloudParticles.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="#00aadd" opacity={p.o} />
        ))}
        
        {/* Cloud inner glow */}
        <ellipse cx="160" cy="95" rx="100" ry="55" fill="url(#cloud-inner-glow)" />
        
        {/* Lightning bolt - larger and brighter */}
        <path d="M175 45 L135 105 H165 L125 180 L195 95 H160 L175 45Z" fill="#00ddff" />
        <path d="M175 45 L135 105 H165 L125 180 L195 95 H160 L175 45Z" fill="white" opacity="0.6" />
        <path d="M172 52 L140 102 H162 L132 165 L185 98 H158 L172 52Z" fill="white" opacity="0.3" />
        
        {/* Main light beam - conical shape */}
        <path d="M130 180 L60 470 H260 L190 180 Z" fill="url(#beam-grad)" />
        
        {/* Center bright beam */}
        <path d="M150 180 L140 440 H180 L170 180 Z" fill="url(#beam-center)" />
        
        {/* Concentric rings at bottom - more layers, thinner */}
        <ellipse cx="160" cy="460" rx="140" ry="28" fill="none" stroke="#004466" strokeWidth="0.5" opacity="0.3" />
        <ellipse cx="160" cy="460" rx="120" ry="24" fill="none" stroke="#005577" strokeWidth="0.5" opacity="0.35" />
        <ellipse cx="160" cy="460" rx="100" ry="20" fill="none" stroke="#006688" strokeWidth="0.6" opacity="0.4" />
        <ellipse cx="160" cy="460" rx="80" ry="16" fill="none" stroke="#0088aa" strokeWidth="0.7" opacity="0.45" />
        <ellipse cx="160" cy="460" rx="60" ry="12" fill="none" stroke="#00aacc" strokeWidth="0.8" opacity="0.5" />
        <ellipse cx="160" cy="460" rx="40" ry="8" fill="none" stroke="#00ccee" strokeWidth="1" opacity="0.6" />
        <ellipse cx="160" cy="460" rx="20" ry="4" fill="#00ddff" opacity="0.3" />
        
        {/* Ring glow */}
        <ellipse cx="160" cy="460" rx="90" ry="18" fill="#00aadd" opacity="0.08" />
      </svg>
    </div>
  )
}

// Right decoration - holographic screens with isometric cube
function RightDecoration() {
  return (
    <div className="pointer-events-none absolute bottom-[8%] right-[2%] hidden h-[520px] w-[340px] lg:block xl:right-[4%]">
      <svg viewBox="0 0 340 520" className="h-full w-full" fill="none">
        <defs>
          <linearGradient id="screen-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a2540" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#051525" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="cube-face-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ddff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0088aa" stopOpacity="0.05" />
          </linearGradient>
          <filter id="screen-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Back tilted screen (top right) */}
        <g transform="translate(190, 30) skewY(-8) rotate(5)">
          <rect x="0" y="0" width="130" height="95" rx="3" fill="url(#screen-bg)" stroke="#0088bb" strokeWidth="1" filter="url(#screen-glow)" />
          {/* Pie chart */}
          <circle cx="40" cy="40" r="25" fill="none" stroke="#0066aa" strokeWidth="1" opacity="0.3" />
          <path d="M40 15 A25 25 0 0 1 62 52 L40 40 Z" fill="#00ccff" opacity="0.6" />
          <path d="M62 52 A25 25 0 0 1 18 52 L40 40 Z" fill="#0099dd" opacity="0.5" />
          <path d="M18 52 A25 25 0 0 1 40 15 L40 40 Z" fill="#00aaee" opacity="0.4" />
          {/* Data rows */}
          <rect x="80" y="20" width="40" height="6" rx="1" fill="#00aacc" opacity="0.4" />
          <rect x="80" y="34" width="32" height="6" rx="1" fill="#0088aa" opacity="0.35" />
          <rect x="80" y="48" width="36" height="6" rx="1" fill="#00aacc" opacity="0.4" />
          <rect x="80" y="62" width="28" height="6" rx="1" fill="#0088aa" opacity="0.35" />
          <rect x="80" y="76" width="38" height="6" rx="1" fill="#00aacc" opacity="0.4" />
        </g>
        
        {/* Main front screen (center) */}
        <g transform="translate(50, 85)">
          <rect x="0" y="0" width="180" height="130" rx="4" fill="url(#screen-bg)" stroke="#00aadd" strokeWidth="1.5" filter="url(#screen-glow)" />
          {/* Inner chart box */}
          <rect x="15" y="15" width="85" height="60" rx="2" fill="none" stroke="#0088aa" strokeWidth="0.5" opacity="0.4" />
          {/* Bar chart */}
          <rect x="25" y="52" width="10" height="18" fill="#00bbdd" opacity="0.6" />
          <rect x="40" y="40" width="10" height="30" fill="#00ddff" opacity="0.7" />
          <rect x="55" y="46" width="10" height="24" fill="#00bbdd" opacity="0.6" />
          <rect x="70" y="35" width="10" height="35" fill="#00eeff" opacity="0.8" />
          {/* Axis line */}
          <line x1="20" y1="70" x2="95" y2="70" stroke="#0099bb" strokeWidth="0.5" opacity="0.4" />
          {/* Right side data */}
          <rect x="110" y="20" width="55" height="7" rx="1" fill="#0099bb" opacity="0.45" />
          <rect x="110" y="34" width="45" height="7" rx="1" fill="#0088aa" opacity="0.4" />
          <rect x="110" y="48" width="50" height="7" rx="1" fill="#0099bb" opacity="0.45" />
          <rect x="110" y="62" width="40" height="7" rx="1" fill="#0088aa" opacity="0.4" />
          {/* Bottom data rows */}
          <rect x="15" y="88" width="150" height="8" rx="1" fill="#006688" opacity="0.25" />
          <rect x="15" y="104" width="120" height="8" rx="1" fill="#005566" opacity="0.2" />
        </g>
        
        {/* Small side screen */}
        <g transform="translate(240, 140) rotate(6)">
          <rect x="0" y="0" width="80" height="60" rx="2" fill="url(#screen-bg)" stroke="#0088aa" strokeWidth="0.8" opacity="0.8" />
          {/* Mini donut */}
          <circle cx="22" cy="30" r="14" fill="none" stroke="#00aacc" strokeWidth="5" strokeDasharray="30 58" opacity="0.5" />
          <circle cx="22" cy="30" r="14" fill="none" stroke="#00ddff" strokeWidth="5" strokeDasharray="20 68" strokeDashoffset="-30" opacity="0.6" />
          {/* Mini text */}
          <rect x="45" y="18" width="28" height="5" rx="1" fill="#0099aa" opacity="0.4" />
          <rect x="45" y="28" width="22" height="5" rx="1" fill="#0088aa" opacity="0.35" />
          <rect x="45" y="38" width="25" height="5" rx="1" fill="#0099aa" opacity="0.4" />
        </g>
        
        {/* 3D Isometric cube */}
        <g transform="translate(130, 300)">
          {/* Cube top face */}
          <path d="M80 0 L160 40 L80 80 L0 40 Z" fill="url(#cube-face-1)" stroke="#00ccff" strokeWidth="1" opacity="0.7" />
          {/* Cube left face */}
          <path d="M0 40 L80 80 L80 150 L0 110 Z" fill="#003344" fillOpacity="0.3" stroke="#00aadd" strokeWidth="1" opacity="0.6" />
          {/* Cube right face */}
          <path d="M160 40 L80 80 L80 150 L160 110 Z" fill="#002233" fillOpacity="0.2" stroke="#00bbee" strokeWidth="1" opacity="0.5" />
          
          {/* Inner wireframe lines */}
          <line x1="40" y1="20" x2="40" y2="90" stroke="#00aacc" strokeWidth="0.5" opacity="0.3" strokeDasharray="3 3" />
          <line x1="120" y1="20" x2="120" y2="90" stroke="#00aacc" strokeWidth="0.5" opacity="0.3" strokeDasharray="3 3" />
          <line x1="80" y1="40" x2="80" y2="110" stroke="#00bbdd" strokeWidth="0.5" opacity="0.4" strokeDasharray="3 3" />
          
          {/* Corner glow points */}
          <circle cx="80" cy="0" r="3" fill="#00eeff" opacity="0.7" />
          <circle cx="0" cy="40" r="2" fill="#00ddff" opacity="0.5" />
          <circle cx="160" cy="40" r="2" fill="#00ddff" opacity="0.5" />
          <circle cx="80" cy="80" r="2.5" fill="#00eeff" opacity="0.6" />
          
          {/* Platform glow below cube */}
          <ellipse cx="80" cy="170" rx="100" ry="22" fill="none" stroke="#005566" strokeWidth="0.5" opacity="0.25" />
          <ellipse cx="80" cy="170" rx="75" ry="16" fill="none" stroke="#006677" strokeWidth="0.6" opacity="0.3" />
          <ellipse cx="80" cy="170" rx="50" ry="10" fill="none" stroke="#0088aa" strokeWidth="0.7" opacity="0.35" />
          <ellipse cx="80" cy="170" rx="25" ry="5" fill="#00aacc" opacity="0.15" />
        </g>
        
        {/* Connection data flow lines */}
        <path d="M180 225 L160 280 L175 310" stroke="#007799" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.35" />
        <path d="M100 220 L115 270 L95 305" stroke="#006688" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.3" />
      </svg>
    </div>
  )
}

// Background layer
function Background() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Deep navy gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#061020] via-[#040810] to-[#030608]" />
      
      {/* Subtle radial highlight at top */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_30%_at_50%_0%,#0a2040_0%,transparent_70%)]" />
      
      {/* Bottom right perspective grid */}
      <svg className="absolute bottom-0 right-0 h-[400px] w-[600px] opacity-[0.06]" viewBox="0 0 600 400" fill="none">
        {/* Horizontal lines with perspective */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
          const y = 400 - i * 35 - i * i * 2
          const xOffset = i * 20
          return (
            <line key={`h${i}`} x1={xOffset} y1={y} x2={600} y2={y} stroke="#00aacc" strokeWidth={0.5 + i * 0.1} />
          )
        })}
        {/* Vertical lines converging */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => {
          const x = 100 + i * 50
          return (
            <line key={`v${i}`} x1={x} y1={400} x2={300 + i * 20} y2={100} stroke="#00aacc" strokeWidth="0.5" />
          )
        })}
      </svg>
      
      {/* Scattered particles */}
      <svg className="absolute inset-0 h-full w-full">
        {Array.from({ length: 45 }).map((_, i) => {
          const x = 3 + ((i * 47) % 94)
          const y = 5 + ((i * 53) % 90)
          const size = 0.8 + (i % 4) * 0.4
          const opacity = 0.15 + (i % 6) * 0.08
          return (
            <circle key={i} cx={`${x}%`} cy={`${y}%`} r={size} fill="#00c8ff" opacity={opacity} />
          )
        })}
      </svg>
      
      {/* Ambient glow spots */}
      <div className="absolute -left-[15%] top-[25%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(0,80,140,0.12)_0%,transparent_60%)]" />
      <div className="absolute -right-[10%] top-[35%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,140,180,0.08)_0%,transparent_60%)]" />
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

      {/* Header with logo */}
      <header className="relative z-10 flex flex-col items-center pt-4 sm:pt-5">
        <div className="flex items-center gap-2.5">
          <EnerCloudIcon className="h-11 w-11 sm:h-12 sm:w-12" />
          <span className="text-[1.75rem] font-semibold tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] sm:text-[2rem]">
            {BRAND}
          </span>
        </div>
        <p className="mt-1 text-[10px] font-medium tracking-[0.4em] text-[#00d4ff] sm:text-[11px]">
          {copy.subtitle}
        </p>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-6">
        <LeftDecoration />
        <RightDecoration />
        
        {/* Login card */}
        <div className="relative w-full max-w-[420px]">
          {/* Outer glow */}
          <div className="absolute -inset-4 rounded-xl bg-[radial-gradient(ellipse_at_center,rgba(0,160,220,0.06)_0%,transparent_70%)]" />
          
          {/* Card container with clipped corners */}
          <div 
            className="relative overflow-hidden bg-[#0b1628]/90 shadow-[0_0_60px_rgba(0,120,180,0.08),inset_0_1px_0_rgba(0,200,255,0.1)]"
            style={{
              clipPath: 'polygon(20px 0%, calc(100% - 20px) 0%, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0% calc(100% - 20px), 0% 20px)'
            }}
          >
            {/* Border overlay */}
            <div 
              className="pointer-events-none absolute inset-0 border border-[#00a0cc]/30"
              style={{
                clipPath: 'polygon(20px 0%, calc(100% - 20px) 0%, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0% calc(100% - 20px), 0% 20px)'
              }}
            />
            
            {/* Corner accent lines - top left */}
            <div className="pointer-events-none absolute left-0 top-[20px] h-[35px] w-[2px] bg-gradient-to-b from-[#00ddff] to-transparent" />
            <div className="pointer-events-none absolute left-[20px] top-0 h-[2px] w-[35px] bg-gradient-to-r from-[#00ddff] to-transparent" />
            
            {/* Corner accent lines - top right */}
            <div className="pointer-events-none absolute right-0 top-[20px] h-[35px] w-[2px] bg-gradient-to-b from-[#00ddff] to-transparent" />
            <div className="pointer-events-none absolute right-[20px] top-0 h-[2px] w-[35px] bg-gradient-to-l from-[#00ddff] to-transparent" />
            
            {/* Corner accent lines - bottom left */}
            <div className="pointer-events-none absolute bottom-[20px] left-0 h-[35px] w-[2px] bg-gradient-to-t from-[#00aacc]/50 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-[20px] h-[2px] w-[35px] bg-gradient-to-r from-[#00aacc]/50 to-transparent" />
            
            {/* Corner accent lines - bottom right */}
            <div className="pointer-events-none absolute bottom-[20px] right-0 h-[35px] w-[2px] bg-gradient-to-t from-[#00aacc]/50 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 right-[20px] h-[2px] w-[35px] bg-gradient-to-l from-[#00aacc]/50 to-transparent" />
            
            {/* Top center highlight line */}
            <div className="pointer-events-none absolute left-[25%] right-[25%] top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ccff]/60 to-transparent" />

            {/* Content */}
            <div className="relative z-10 px-9 py-9 sm:px-11 sm:py-10">
              {/* Language toggle */}
              <div className="flex justify-center">
                <div className="flex overflow-hidden rounded border border-[#1a4060]/80 bg-[#071020]">
                  {LANGUAGE_OPTIONS.map((option) => {
                    const active = locale === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setLanguage(option.key)}
                        className={cn(
                          "min-w-[46px] px-3.5 py-1.5 text-[13px] font-medium transition-all",
                          active
                            ? "bg-[#1a70ff] text-white shadow-[0_0_12px_rgba(26,112,255,0.4)]"
                            : "text-[#5588aa] hover:text-[#88ccee]"
                        )}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Welcome text */}
              <div className="mt-9 text-center">
                <h1 className="text-[2rem] font-bold tracking-widest text-white sm:text-[2.25rem]">
                  {copy.welcome}
                </h1>
                <p className="mt-1.5 text-[11px] tracking-[0.35em] text-[#5a8899]">
                  {copy.welcomeSub}
                </p>
              </div>

              {/* Form */}
              <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
                {/* Username input */}
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#4080aa]" strokeWidth={1.5} />
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
                    className="h-[52px] w-full rounded border border-[#1a3550]/80 bg-[#0a1a2a] pl-12 pr-4 text-[14px] text-[#c8e0f0] outline-none transition-all placeholder:text-[#3a5a75] focus:border-[#00aacc]/50 focus:bg-[#0c1e30] focus:shadow-[0_0_15px_rgba(0,170,200,0.08)]"
                  />
                </div>

                {/* Password input */}
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#4080aa]" strokeWidth={1.5} />
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
                    className="h-[52px] w-full rounded border border-[#1a3550]/80 bg-[#0a1a2a] pl-12 pr-12 text-[14px] text-[#c8e0f0] outline-none transition-all placeholder:text-[#3a5a75] focus:border-[#00aacc]/50 focus:bg-[#0c1e30] focus:shadow-[0_0_15px_rgba(0,170,200,0.08)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4080aa] transition-colors hover:text-[#88ccee]"
                    aria-label={locale === "zh" ? "切换密码显示" : "Toggle password visibility"}
                  >
                    {showPassword ? <Eye className="h-5 w-5" strokeWidth={1.5} /> : <EyeOff className="h-5 w-5" strokeWidth={1.5} />}
                  </button>
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between text-[13px]">
                  <label className="flex cursor-pointer items-center gap-2.5 text-[#6090aa]">
                    <div className="relative flex h-[15px] w-[15px] items-center justify-center">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(event) => setRemember(event.target.checked)}
                        className="peer h-full w-full cursor-pointer appearance-none rounded-[3px] border border-[#2a5070] bg-transparent transition-all checked:border-[#00aacc] checked:bg-[#00aacc]"
                      />
                      <svg className="pointer-events-none absolute h-2.5 w-2.5 opacity-0 peer-checked:opacity-100" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
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
                  className="group mt-4 flex h-[52px] w-full items-center justify-center gap-2.5 rounded border-0 bg-gradient-to-r from-[#00a8cc] via-[#00c8ee] to-[#0090cc] text-[15px] font-semibold tracking-widest text-white shadow-[0_0_25px_rgba(0,180,220,0.25)] transition-all hover:shadow-[0_0_35px_rgba(0,200,240,0.35)] disabled:opacity-70"
                >
                  <span>{submitting ? `${copy.submit}...` : copy.submit}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
                </Button>

                {/* Error message */}
                {submitError ? (
                  <div className="rounded border border-[#662222]/40 bg-[#1a0a0a]/60 px-4 py-3 text-[13px] text-[#ffaaaa]">
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
