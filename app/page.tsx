"use client"

import { startTransition, useState, useEffect } from "react"
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
        <filter id="enercloud-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M23 54C13 54 8 47 8 39C8 30 14 23 24 22C25 12 33 7 42 7C51 7 58 12 61 20C69 21 74 27 74 35C74 45 67 54 55 54H23Z"
        fill="rgba(9,31,68,0.3)"
        stroke="url(#enercloud-cloud)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        filter="url(#enercloud-glow)"
      />
      <path
        d="M43 13L31 31H39L33 50L48 28H40L43 13Z"
        fill="url(#enercloud-bolt)"
        stroke="rgba(92,242,255,0.4)"
        strokeWidth="0.8"
        filter="url(#enercloud-glow)"
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
          <feGaussianBlur stdDeviation="4" result="blur" />
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
        filter="url(#bolt-glow)"
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
  delay = 0,
}: {
  icon: React.ElementType
  title: string
  description: string
  direction?: "left" | "right"
  delay?: number
}) {
  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-sm px-4 py-4 transition-all duration-300",
        "border border-[#0e4a6a]/80 bg-[linear-gradient(135deg,rgba(4,18,38,0.95),rgba(2,12,28,0.98))]",
        "hover:border-[#3ae8ff]/60 hover:bg-[linear-gradient(135deg,rgba(8,28,52,0.98),rgba(4,18,38,0.99))]",
        "hover:shadow-[0_0_30px_rgba(58,232,255,0.2),inset_0_0_20px_rgba(58,232,255,0.05)]",
        direction === "right" && "flex-row-reverse"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Animated border glow */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute inset-[-1px] rounded-sm bg-gradient-to-r from-transparent via-[#4ae8ff]/30 to-transparent" 
          style={{ animation: 'shimmer 2s infinite' }} />
      </div>
      
      {/* Corner cuts */}
      <div className={cn(
        "pointer-events-none absolute top-0 h-3 w-3 border-t border-[#4ae8ff]/50",
        direction === "left" ? "left-0 border-l" : "right-0 border-r"
      )} />
      <div className={cn(
        "pointer-events-none absolute bottom-0 h-3 w-3 border-b border-[#4ae8ff]/50",
        direction === "left" ? "right-0 border-r" : "left-0 border-l"
      )} />

      {/* Scan line effect */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-0 transition-opacity group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-b from-[#4ae8ff]/10 via-transparent to-transparent" 
          style={{ animation: 'scanline 2s infinite linear' }} />
      </div>

      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded border border-[#1a6090]/60 bg-[linear-gradient(180deg,rgba(10,40,70,0.8),rgba(5,20,45,0.95))] shadow-[0_0_15px_rgba(58,232,255,0.1),inset_0_1px_0_rgba(58,232,255,0.1)]">
        <Icon className="h-5 w-5 text-[#4ae8ff] drop-shadow-[0_0_6px_rgba(74,232,255,0.5)]" />
        {/* Icon pulse effect */}
        <div className="absolute inset-0 rounded border border-[#4ae8ff]/30 opacity-0 transition-opacity group-hover:animate-ping group-hover:opacity-50" />
      </div>
      
      <div className={cn("flex-1 min-w-0", direction === "right" && "text-right")}>
        <div className="text-[15px] font-bold text-[#e8f8ff] drop-shadow-[0_0_10px_rgba(232,248,255,0.3)]">{title}</div>
        <div className="mt-0.5 text-[12px] text-[#5a98b8]">{description}</div>
      </div>
      
      <ChevronRight
        className={cn(
          "h-5 w-5 shrink-0 text-[#3a7898] transition-all duration-300 group-hover:text-[#4ae8ff] group-hover:drop-shadow-[0_0_8px_rgba(74,232,255,0.6)]",
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
        viewBox="0 0 100 100"
        className={cn(
          "h-24 w-24",
          !isTop && "rotate-180",
          !isLeft && isTop && "-scale-x-100",
          !isLeft && !isTop && "scale-x-[-1]"
        )}
        fill="none"
      >
        <path d="M0 0 L50 0 L50 3 L3 3 L3 50 L0 50 Z" fill="rgba(58,232,255,0.4)" />
        <path d="M0 60 L0 100 L3 100 L3 65 L8 65 L8 60 Z" fill="rgba(58,232,255,0.25)" />
        <path d="M60 0 L100 0 L100 3 L65 3 L65 8 L60 8 Z" fill="rgba(58,232,255,0.25)" />
        <rect x="10" y="10" width="4" height="4" fill="rgba(58,232,255,0.6)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
        </rect>
        <rect x="20" y="10" width="12" height="2" fill="rgba(58,232,255,0.3)" />
        <rect x="10" y="20" width="2" height="12" fill="rgba(58,232,255,0.3)" />
        <circle cx="38" cy="10" r="1.5" fill="#4ae8ff" opacity="0.5">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="10" cy="38" r="1.5" fill="#4ae8ff" opacity="0.5">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}

function CityScape() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[200px] opacity-30">
      <svg viewBox="0 0 1200 200" className="h-full w-full" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="building-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a4a6a" />
            <stop offset="100%" stopColor="#0a1a2a" />
          </linearGradient>
          <filter id="building-glow">
            <feGaussianBlur stdDeviation="1" />
          </filter>
        </defs>
        {/* Buildings */}
        <rect x="50" y="120" width="30" height="80" fill="url(#building-gradient)" />
        <rect x="90" y="100" width="25" height="100" fill="url(#building-gradient)" />
        <rect x="120" y="140" width="35" height="60" fill="url(#building-gradient)" />
        <rect x="170" y="80" width="40" height="120" fill="url(#building-gradient)" />
        <rect x="220" y="110" width="30" height="90" fill="url(#building-gradient)" />
        <rect x="260" y="130" width="25" height="70" fill="url(#building-gradient)" />
        <rect x="300" y="90" width="45" height="110" fill="url(#building-gradient)" />
        <rect x="360" y="120" width="30" height="80" fill="url(#building-gradient)" />
        
        <rect x="800" y="100" width="35" height="100" fill="url(#building-gradient)" />
        <rect x="845" y="130" width="25" height="70" fill="url(#building-gradient)" />
        <rect x="880" y="90" width="40" height="110" fill="url(#building-gradient)" />
        <rect x="930" y="110" width="30" height="90" fill="url(#building-gradient)" />
        <rect x="970" y="80" width="45" height="120" fill="url(#building-gradient)" />
        <rect x="1030" y="140" width="25" height="60" fill="url(#building-gradient)" />
        <rect x="1070" y="120" width="35" height="80" fill="url(#building-gradient)" />
        <rect x="1120" y="100" width="30" height="100" fill="url(#building-gradient)" />
        
        {/* Building windows */}
        {[55, 95, 175, 225, 305, 365, 805, 885, 935, 975, 1075, 1125].map((x, i) => (
          <g key={i}>
            <rect x={x} y={120 + (i % 3) * 10} width="3" height="3" fill="#4ae8ff" opacity="0.3">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
            </rect>
            <rect x={x + 8} y={130 + (i % 4) * 8} width="3" height="3" fill="#4ae8ff" opacity="0.4">
              <animate attributeName="opacity" values="0.4;0.9;0.4" dur={`${2 + i * 0.15}s`} repeatCount="indefinite" />
            </rect>
          </g>
        ))}
      </svg>
    </div>
  )
}

function CircularPlatform() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
      <div className="relative">
        {/* Outer glow rings */}
        <div className="absolute left-1/2 top-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(58,232,255,0.2),transparent_60%)] blur-3xl" />

        {/* Concentric circles */}
        <svg viewBox="0 0 400 180" className="h-[160px] w-[380px]">
          <defs>
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(58,232,255,0)" />
              <stop offset="30%" stopColor="rgba(58,232,255,0.5)" />
              <stop offset="50%" stopColor="rgba(58,232,255,0.8)" />
              <stop offset="70%" stopColor="rgba(58,232,255,0.5)" />
              <stop offset="100%" stopColor="rgba(58,232,255,0)" />
            </linearGradient>
            <linearGradient id="ring-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(26,138,255,0)" />
              <stop offset="50%" stopColor="rgba(26,138,255,0.6)" />
              <stop offset="100%" stopColor="rgba(26,138,255,0)" />
            </linearGradient>
            <filter id="ring-glow">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>

          {/* Animated elliptical rings */}
          <ellipse cx="200" cy="150" rx="185" ry="28" fill="none" stroke="url(#ring-gradient)" strokeWidth="0.8" opacity="0.25">
            <animate attributeName="ry" values="28;30;28" dur="3s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="200" cy="140" rx="155" ry="23" fill="none" stroke="url(#ring-gradient)" strokeWidth="1" opacity="0.35">
            <animate attributeName="ry" values="23;25;23" dur="2.5s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="200" cy="130" rx="125" ry="18" fill="none" stroke="url(#ring-gradient)" strokeWidth="1.2" opacity="0.5">
            <animate attributeName="ry" values="18;20;18" dur="2s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="200" cy="120" rx="95" ry="13" fill="none" stroke="url(#ring-gradient)" strokeWidth="1.5" opacity="0.65" filter="url(#ring-glow)">
            <animate attributeName="ry" values="13;15;13" dur="2.2s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="200" cy="110" rx="65" ry="8" fill="none" stroke="url(#ring-gradient)" strokeWidth="2" opacity="0.8" filter="url(#ring-glow)">
            <animate attributeName="ry" values="8;10;8" dur="1.8s" repeatCount="indefinite" />
          </ellipse>

          {/* Center platform glow */}
          <ellipse cx="200" cy="105" rx="40" ry="5" fill="rgba(58,232,255,0.5)" filter="url(#ring-glow)">
            <animate attributeName="opacity" values="0.4;0.6;0.4" dur="2s" repeatCount="indefinite" />
          </ellipse>

          {/* Light beam */}
          <defs>
            <linearGradient id="beam-gradient" x1="200" y1="20" x2="200" y2="105" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(58,232,255,0.9)" />
              <stop offset="50%" stopColor="rgba(58,232,255,0.4)" />
              <stop offset="100%" stopColor="rgba(58,232,255,0)" />
            </linearGradient>
          </defs>
          <path d="M180 105 L200 25 L220 105 Z" fill="url(#beam-gradient)" opacity="0.7">
            <animate attributeName="opacity" values="0.5;0.8;0.5" dur="2s" repeatCount="indefinite" />
          </path>

          {/* Orbiting dots */}
          <circle r="3" fill="#4ae8ff" filter="url(#ring-glow)">
            <animateMotion dur="8s" repeatCount="indefinite">
              <mpath xlinkHref="#orbit1" />
            </animateMotion>
          </circle>
          <path id="orbit1" d="M15,140 A185,28 0 1,1 385,140 A185,28 0 1,1 15,140" fill="none" />
          
          <circle r="2" fill="#1a8aff">
            <animateMotion dur="6s" repeatCount="indefinite">
              <mpath xlinkHref="#orbit2" />
            </animateMotion>
          </circle>
          <path id="orbit2" d="M45,130 A155,23 0 1,1 355,130 A155,23 0 1,1 45,130" fill="none" />

          {/* Static glowing dots on rings */}
          <circle cx="60" cy="145" r="2.5" fill="#4ae8ff" opacity="0.9" filter="url(#ring-glow)">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="340" cy="145" r="2.5" fill="#4ae8ff" opacity="0.9" filter="url(#ring-glow)">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="90" cy="135" r="2" fill="#4ae8ff" opacity="0.7">
            <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="310" cy="135" r="2" fill="#4ae8ff" opacity="0.7">
            <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.7s" repeatCount="indefinite" />
          </circle>
        </svg>

        {/* Cloud icon */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-8">
          <CloudBoltIcon className="h-20 w-20 drop-shadow-[0_0_25px_rgba(58,232,255,0.6)]" />
        </div>
      </div>
    </div>
  )
}

function DataFlowLines() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Left side data flow */}
      <svg className="absolute left-0 top-0 h-full w-48 opacity-40" viewBox="0 0 200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(58,232,255,0)" />
            <stop offset="50%" stopColor="rgba(58,232,255,0.8)" />
            <stop offset="100%" stopColor="rgba(58,232,255,0)" />
          </linearGradient>
        </defs>
        <line x1="30" y1="0" x2="30" y2="800" stroke="rgba(58,232,255,0.15)" strokeWidth="1" />
        <line x1="60" y1="0" x2="60" y2="800" stroke="rgba(58,232,255,0.1)" strokeWidth="1" />
        <line x1="30" y1="0" x2="30" y2="100" stroke="url(#flow-gradient)" strokeWidth="2">
          <animate attributeName="y1" values="-100;800" dur="4s" repeatCount="indefinite" />
          <animate attributeName="y2" values="0;900" dur="4s" repeatCount="indefinite" />
        </line>
        <line x1="60" y1="0" x2="60" y2="80" stroke="url(#flow-gradient)" strokeWidth="1.5">
          <animate attributeName="y1" values="-80;800" dur="3s" repeatCount="indefinite" />
          <animate attributeName="y2" values="0;880" dur="3s" repeatCount="indefinite" />
        </line>
      </svg>

      {/* Right side data flow */}
      <svg className="absolute right-0 top-0 h-full w-48 opacity-40" viewBox="0 0 200 800" preserveAspectRatio="xMidYMid slice">
        <line x1="170" y1="0" x2="170" y2="800" stroke="rgba(58,232,255,0.15)" strokeWidth="1" />
        <line x1="140" y1="0" x2="140" y2="800" stroke="rgba(58,232,255,0.1)" strokeWidth="1" />
        <line x1="170" y1="0" x2="170" y2="100" stroke="url(#flow-gradient)" strokeWidth="2">
          <animate attributeName="y1" values="-100;800" dur="5s" repeatCount="indefinite" />
          <animate attributeName="y2" values="0;900" dur="5s" repeatCount="indefinite" />
        </line>
        <line x1="140" y1="0" x2="140" y2="60" stroke="url(#flow-gradient)" strokeWidth="1.5">
          <animate attributeName="y1" values="-60;800" dur="3.5s" repeatCount="indefinite" />
          <animate attributeName="y2" values="0;860" dur="3.5s" repeatCount="indefinite" />
        </line>
      </svg>
    </div>
  )
}

function ParticleField() {
  const [particles] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    }))
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-[#4ae8ff]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: 0.4,
            animation: `twinkle ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function ScanLine() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
      <div 
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#4ae8ff]/60 to-transparent"
        style={{ animation: 'scanVertical 6s linear infinite' }}
      />
    </div>
  )
}

function BackgroundScene() {
  return (
    <>
      {/* Base gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(20,80,140,0.25),transparent_60%),linear-gradient(180deg,#030a18_0%,#020812_50%,#010610_100%)]" />

      {/* Grid pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(58,232,255,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(58,232,255,0.4)_1px,transparent_1px)] [background-size:50px_50px]" />

      {/* Perspective grid at bottom */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[300px] opacity-20 [background-image:linear-gradient(transparent_0%,rgba(58,232,255,0.1)_100%),linear-gradient(90deg,rgba(58,232,255,0.3)_1px,transparent_1px),linear-gradient(rgba(58,232,255,0.3)_1px,transparent_1px)] [background-size:100%_100%,80px_80px,80px_80px] [transform:perspective(500px)_rotateX(60deg)] [transform-origin:bottom]" />

      {/* Diagonal tech lines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(45deg,rgba(58,232,255,0.5)_1px,transparent_1px),linear-gradient(-45deg,rgba(58,232,255,0.5)_1px,transparent_1px)] [background-size:100px_100px]" />

      {/* Side ambient glows */}
      <div className="pointer-events-none absolute left-0 top-1/4 h-[500px] w-[400px] bg-[radial-gradient(circle,rgba(20,100,180,0.2),transparent_60%)] blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/4 h-[500px] w-[400px] bg-[radial-gradient(circle,rgba(20,100,180,0.2),transparent_60%)] blur-3xl" />

      {/* Center top glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(30,120,200,0.2),transparent_70%)] blur-3xl" />

      {/* Data flow lines */}
      <DataFlowLines />

      {/* Particle field */}
      <ParticleField />

      {/* Scan line */}
      <ScanLine />

      {/* City skyline */}
      <CityScape />

      {/* Corner decorations */}
      <CornerDecoration position="top-left" />
      <CornerDecoration position="top-right" />
      <CornerDecoration position="bottom-left" />
      <CornerDecoration position="bottom-right" />

      {/* Tech lines on sides */}
      <div className="pointer-events-none absolute left-12 top-[20%] flex flex-col gap-4">
        <div className="h-px w-20 bg-gradient-to-r from-[#4ae8ff]/50 to-transparent" />
        <div className="h-px w-12 bg-gradient-to-r from-[#4ae8ff]/30 to-transparent" />
        <div className="h-px w-16 bg-gradient-to-r from-[#4ae8ff]/40 to-transparent" />
      </div>
      <div className="pointer-events-none absolute right-12 top-[20%] flex flex-col items-end gap-4">
        <div className="h-px w-20 bg-gradient-to-l from-[#4ae8ff]/50 to-transparent" />
        <div className="h-px w-12 bg-gradient-to-l from-[#4ae8ff]/30 to-transparent" />
        <div className="h-px w-16 bg-gradient-to-l from-[#4ae8ff]/40 to-transparent" />
      </div>
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
    <main className="relative h-[100dvh] overflow-hidden bg-[#020810] text-white">
      <BackgroundScene />

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.3); }
        }
        @keyframes scanVertical {
          0% { top: -2px; }
          100% { top: 100%; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(58,232,255,0.3), inset 0 0 30px rgba(58,232,255,0.05); }
          50% { box-shadow: 0 0 40px rgba(58,232,255,0.5), inset 0 0 50px rgba(58,232,255,0.1); }
        }
      `}</style>

      <div className={cn(
        "relative z-10 flex h-full flex-col transition-opacity duration-700",
        mounted ? "opacity-100" : "opacity-0"
      )}>
        {/* Header */}
        <header className="shrink-0 py-5">
          <div className="flex items-center justify-center gap-4">
            <EnerCloudIcon className="h-14 w-14 drop-shadow-[0_0_20px_rgba(58,232,255,0.5)]" />
            <div className="flex flex-col items-start">
              <div
                className="bg-clip-text text-[2.8rem] font-black leading-none tracking-wide text-transparent drop-shadow-[0_0_30px_rgba(58,232,255,0.4)]"
                style={{ backgroundImage: "linear-gradient(180deg,#ffffff 0%,#c0f8ff 40%,#4ae8ff 100%)" }}
              >
                {BRAND}
              </div>
              <div className="mt-1 text-[14px] tracking-[0.35em] text-[#4ae8ff]/90 drop-shadow-[0_0_10px_rgba(58,232,255,0.5)]">
                {locale === "zh" ? BRAND_SUBTITLE_ZH : BRAND_SUBTITLE_EN}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden px-4 py-2 lg:px-8">
          <div className="flex w-full max-w-[1440px] items-start justify-between gap-6">
            {/* Left menu */}
            <div className="hidden w-[270px] shrink-0 flex-col gap-3 lg:flex xl:w-[290px]">
              {LEFT_MENU_ITEMS.map((item, index) => (
                <FeatureCard
                  key={index}
                  icon={item.icon}
                  title={locale === "zh" ? item.titleZh : item.titleEn}
                  description={locale === "zh" ? item.descZh : item.descEn}
                  direction="left"
                  delay={index * 100}
                />
              ))}
            </div>

            {/* Center login form */}
            <div className="flex flex-1 flex-col items-center justify-start">
              <div className="relative w-full max-w-[420px]">
                {/* Hexagonal frame outer glow */}
                <div className="pointer-events-none absolute -inset-6 rounded-lg bg-[radial-gradient(circle,rgba(58,232,255,0.2),transparent_60%)] blur-3xl" />

                {/* Login card with hexagonal clip */}
                <div
                  className="relative overflow-hidden border border-[#1a5a8a]/70 bg-[linear-gradient(165deg,rgba(6,18,36,0.97),rgba(3,10,24,0.99))] px-8 py-7"
                  style={{
                    clipPath: "polygon(6% 0%, 94% 0%, 100% 5%, 100% 95%, 94% 100%, 6% 100%, 0% 95%, 0% 5%)",
                    animation: 'pulse-glow 4s ease-in-out infinite',
                  }}
                >
                  {/* Animated border */}
                  <div
                    className="pointer-events-none absolute inset-[1px] border border-[#4ae8ff]/25"
                    style={{
                      clipPath: "polygon(6% 0%, 94% 0%, 100% 5%, 100% 95%, 94% 100%, 6% 100%, 0% 95%, 0% 5%)",
                    }}
                  />

                  {/* Scan line effect inside form */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
                    <div 
                      className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#4ae8ff] to-transparent"
                      style={{ animation: 'scanVertical 4s linear infinite' }}
                    />
                  </div>

                  {/* Corner accents with glow */}
                  <div className="pointer-events-none absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-[#4ae8ff]/70 shadow-[0_0_10px_rgba(74,232,255,0.3)]" />
                  <div className="pointer-events-none absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-[#4ae8ff]/70 shadow-[0_0_10px_rgba(74,232,255,0.3)]" />
                  <div className="pointer-events-none absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-[#4ae8ff]/70 shadow-[0_0_10px_rgba(74,232,255,0.3)]" />
                  <div className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-[#4ae8ff]/70 shadow-[0_0_10px_rgba(74,232,255,0.3)]" />

                  {/* Language toggle */}
                  <div className="flex items-center">
                    <div className="flex overflow-hidden rounded border border-[#1a4a6a]/80 bg-[rgba(4,12,28,0.95)]">
                      {LANGUAGE_OPTIONS.map((option) => {
                        const active = locale === option.key
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setLanguage(option.key)}
                            className={cn(
                              "px-4 py-2 text-[13px] font-bold transition-all duration-200",
                              active 
                                ? "bg-[rgba(20,80,130,0.6)] text-[#4ae8ff] shadow-[inset_0_0_15px_rgba(74,232,255,0.15)]" 
                                : "text-[#5a8898] hover:text-[#80d0f0]"
                            )}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Welcome text */}
                  <div className="mt-7 text-center">
                    <h1 className="text-[2.1rem] font-black tracking-wider text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                      {copy.welcome}
                    </h1>
                    <p className="mt-1 text-[13px] tracking-[0.25em] text-[#4ae8ff]/80">{copy.welcomeSub}</p>
                  </div>

                  {/* Login form */}
                  <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
                    <div className="group relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4ae8ff] drop-shadow-[0_0_6px_rgba(74,232,255,0.5)]" />
                      <input
                        value={account}
                        onChange={(event) => {
                          setAccount(event.target.value)
                          setSubmitError(null)
                        }}
                        placeholder={copy.accountPlaceholder}
                        required
                        className="h-[50px] w-full rounded border border-[#1a4a6a]/80 bg-[rgba(4,12,28,0.95)] pl-12 pr-4 text-[15px] text-[#e8f6ff] outline-none transition-all placeholder:text-[#4a6878] focus:border-[#4ae8ff]/70 focus:shadow-[0_0_20px_rgba(58,232,255,0.2),inset_0_0_20px_rgba(58,232,255,0.05)]"
                      />
                    </div>

                    <div className="group relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4ae8ff] drop-shadow-[0_0_6px_rgba(74,232,255,0.5)]" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value)
                          setSubmitError(null)
                        }}
                        placeholder={copy.passwordPlaceholder}
                        required
                        className="h-[50px] w-full rounded border border-[#1a4a6a]/80 bg-[rgba(4,12,28,0.95)] pl-12 pr-12 text-[15px] text-[#e8f6ff] outline-none transition-all placeholder:text-[#4a6878] focus:border-[#4ae8ff]/70 focus:shadow-[0_0_20px_rgba(58,232,255,0.2),inset_0_0_20px_rgba(58,232,255,0.05)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4a7888] transition-colors hover:text-[#4ae8ff]"
                      >
                        {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-[14px]">
                      <label className="flex cursor-pointer items-center gap-2 text-[#6a9aaa] transition-colors hover:text-[#8ac8e0]">
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(event) => setRemember(event.target.checked)}
                          className="h-4 w-4 rounded border border-[#1a4a6a] bg-[#040c1c] accent-[#4ae8ff]"
                        />
                        <span>{copy.remember}</span>
                      </label>
                      <button type="button" className="text-[#4ae8ff] transition-colors hover:text-[#80f0ff] hover:drop-shadow-[0_0_8px_rgba(74,232,255,0.5)]">
                        {copy.forgot}
                      </button>
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="group relative mt-5 h-[52px] w-full overflow-hidden rounded border border-[#4ae8ff]/40 bg-[linear-gradient(90deg,#0a6ab0_0%,#1a90d8_50%,#0a6ab0_100%)] text-[16px] font-bold tracking-wider text-white shadow-[0_0_30px_rgba(26,144,216,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all hover:border-[#4ae8ff]/60 hover:shadow-[0_0_40px_rgba(58,232,255,0.5)] disabled:opacity-70"
                    >
                      {/* Button shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" style={{ animation: 'shimmer 2s infinite' }} />
                      <span className="relative flex items-center justify-center gap-2">
                        {submitting ? `${copy.submit}...` : copy.submit}
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </Button>

                    {submitError ? (
                      <div className="rounded border border-[#ff6b6b]/40 bg-[rgba(60,15,25,0.8)] px-4 py-3 text-[13px] text-[#ffc8d0] shadow-[0_0_15px_rgba(255,100,100,0.1)]">
                        {submitError}
                      </div>
                    ) : null}
                  </form>
                </div>
              </div>

              {/* Bottom cloud platform */}
              <div className="relative mt-6 hidden lg:block">
                <CircularPlatform />
              </div>
            </div>

            {/* Right menu */}
            <div className="hidden w-[270px] shrink-0 flex-col gap-3 lg:flex xl:w-[290px]">
              {RIGHT_MENU_ITEMS.map((item, index) => (
                <FeatureCard
                  key={index}
                  icon={item.icon}
                  title={locale === "zh" ? item.titleZh : item.titleEn}
                  description={locale === "zh" ? item.descZh : item.descEn}
                  direction="right"
                  delay={index * 100}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
