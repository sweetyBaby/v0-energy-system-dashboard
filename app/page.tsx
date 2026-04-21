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

// Top notch frame - futuristic header decoration
function TopNotchFrame() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
      <svg viewBox="0 0 800 80" className="h-20 w-[800px]" preserveAspectRatio="xMidYMin meet">
        <defs>
          <linearGradient id="notch-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(58,232,255,0)" />
            <stop offset="15%" stopColor="rgba(58,232,255,0.6)" />
            <stop offset="50%" stopColor="rgba(58,232,255,0.9)" />
            <stop offset="85%" stopColor="rgba(58,232,255,0.6)" />
            <stop offset="100%" stopColor="rgba(58,232,255,0)" />
          </linearGradient>
          <linearGradient id="notch-fill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(10,40,80,0.8)" />
            <stop offset="100%" stopColor="rgba(5,20,40,0.95)" />
          </linearGradient>
          <filter id="notch-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Main notch shape */}
        <path 
          d="M0,0 L280,0 L300,12 L340,12 L360,0 L440,0 L460,12 L500,12 L520,0 L800,0 L800,3 L525,3 L505,15 L455,15 L435,3 L365,3 L345,15 L295,15 L275,3 L0,3 Z"
          fill="url(#notch-fill)"
          stroke="url(#notch-gradient)"
          strokeWidth="1"
          filter="url(#notch-glow)"
        />
        
        {/* Inner decorative lines */}
        <line x1="100" y1="1.5" x2="250" y2="1.5" stroke="rgba(58,232,255,0.4)" strokeWidth="0.5" />
        <line x1="550" y1="1.5" x2="700" y2="1.5" stroke="rgba(58,232,255,0.4)" strokeWidth="0.5" />
        
        {/* Animated pulse dots */}
        <circle cx="280" cy="6" r="2" fill="#4ae8ff">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="520" cy="6" r="2" fill="#4ae8ff">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" begin="0.5s" />
        </circle>
        
        {/* Center data display area */}
        <rect x="370" y="4" width="60" height="8" fill="rgba(58,232,255,0.1)" rx="1" />
        <rect x="375" y="6" width="8" height="4" fill="rgba(58,232,255,0.6)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
        </rect>
        <rect x="386" y="6" width="8" height="4" fill="rgba(58,232,255,0.5)">
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.2s" repeatCount="indefinite" />
        </rect>
        <rect x="397" y="6" width="8" height="4" fill="rgba(58,232,255,0.7)">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="0.8s" repeatCount="indefinite" />
        </rect>
        <rect x="408" y="6" width="8" height="4" fill="rgba(58,232,255,0.4)">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.5s" repeatCount="indefinite" />
        </rect>
        <rect x="419" y="6" width="8" height="4" fill="rgba(58,232,255,0.6)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="1.1s" repeatCount="indefinite" />
        </rect>
        
        {/* Side tech elements */}
        <rect x="50" y="1" width="30" height="1" fill="rgba(58,232,255,0.3)" />
        <rect x="720" y="1" width="30" height="1" fill="rgba(58,232,255,0.3)" />
      </svg>
    </div>
  )
}

// Bottom tech frame
function BottomTechFrame() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2">
      <svg viewBox="0 0 800 60" className="h-16 w-[800px]" preserveAspectRatio="xMidYMax meet">
        <defs>
          <linearGradient id="bottom-notch-gradient" x1="0%" y1="100%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(58,232,255,0)" />
            <stop offset="20%" stopColor="rgba(58,232,255,0.5)" />
            <stop offset="50%" stopColor="rgba(58,232,255,0.8)" />
            <stop offset="80%" stopColor="rgba(58,232,255,0.5)" />
            <stop offset="100%" stopColor="rgba(58,232,255,0)" />
          </linearGradient>
        </defs>
        
        <path 
          d="M0,60 L200,60 L220,48 L320,48 L340,36 L460,36 L480,48 L580,48 L600,60 L800,60 L800,57 L605,57 L585,45 L475,45 L455,33 L345,33 L325,45 L215,45 L195,57 L0,57 Z"
          fill="rgba(5,20,40,0.9)"
          stroke="url(#bottom-notch-gradient)"
          strokeWidth="1"
        />
        
        {/* Animated scanning line */}
        <line x1="340" y1="40" x2="460" y2="40" stroke="rgba(58,232,255,0.6)" strokeWidth="1">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
        </line>
      </svg>
    </div>
  )
}

// Side tech panels
function SideTechPanel({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left"
  
  return (
    <div className={cn(
      "pointer-events-none absolute top-1/2 -translate-y-1/2",
      isLeft ? "left-0" : "right-0"
    )}>
      <svg 
        viewBox="0 0 40 400" 
        className={cn("h-[400px] w-10", !isLeft && "scale-x-[-1]")}
      >
        <defs>
          <linearGradient id={`side-gradient-${side}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(58,232,255,0)" />
            <stop offset="30%" stopColor="rgba(58,232,255,0.5)" />
            <stop offset="50%" stopColor="rgba(58,232,255,0.8)" />
            <stop offset="70%" stopColor="rgba(58,232,255,0.5)" />
            <stop offset="100%" stopColor="rgba(58,232,255,0)" />
          </linearGradient>
        </defs>
        
        {/* Main vertical line */}
        <line x1="3" y1="50" x2="3" y2="350" stroke={`url(#side-gradient-${side})`} strokeWidth="2" />
        
        {/* Horizontal branches */}
        <line x1="3" y1="100" x2="25" y2="100" stroke="rgba(58,232,255,0.4)" strokeWidth="1" />
        <line x1="3" y1="150" x2="20" y2="150" stroke="rgba(58,232,255,0.3)" strokeWidth="1" />
        <line x1="3" y1="200" x2="30" y2="200" stroke="rgba(58,232,255,0.5)" strokeWidth="1" />
        <line x1="3" y1="250" x2="20" y2="250" stroke="rgba(58,232,255,0.3)" strokeWidth="1" />
        <line x1="3" y1="300" x2="25" y2="300" stroke="rgba(58,232,255,0.4)" strokeWidth="1" />
        
        {/* Node points */}
        <circle cx="25" cy="100" r="3" fill="#4ae8ff" opacity="0.7">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="30" cy="200" r="4" fill="#4ae8ff" opacity="0.8">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="25" cy="300" r="3" fill="#4ae8ff" opacity="0.7">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2.5s" repeatCount="indefinite" />
        </circle>
        
        {/* Data blocks */}
        <rect x="8" y="115" width="12" height="3" fill="rgba(58,232,255,0.4)" />
        <rect x="8" y="120" width="8" height="3" fill="rgba(58,232,255,0.3)" />
        <rect x="8" y="215" width="15" height="3" fill="rgba(58,232,255,0.5)" />
        <rect x="8" y="220" width="10" height="3" fill="rgba(58,232,255,0.3)" />
      </svg>
    </div>
  )
}

// Holographic platform with 3D effect
function HolographicPlatform() {
  return (
    <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2">
      <div className="relative">
        {/* Outer glow */}
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(58,232,255,0.15),transparent_60%)] blur-3xl" />
        
        <svg viewBox="0 0 500 200" className="h-[180px] w-[500px]">
          <defs>
            <linearGradient id="platform-ring" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(58,232,255,0)" />
              <stop offset="20%" stopColor="rgba(58,232,255,0.6)" />
              <stop offset="50%" stopColor="rgba(58,232,255,1)" />
              <stop offset="80%" stopColor="rgba(58,232,255,0.6)" />
              <stop offset="100%" stopColor="rgba(58,232,255,0)" />
            </linearGradient>
            <linearGradient id="beam-gradient" x1="250" y1="0" x2="250" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(58,232,255,0.9)" />
              <stop offset="40%" stopColor="rgba(58,232,255,0.3)" />
              <stop offset="100%" stopColor="rgba(58,232,255,0)" />
            </linearGradient>
            <linearGradient id="inner-beam" x1="250" y1="0" x2="250" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(180,255,255,0.8)" />
              <stop offset="50%" stopColor="rgba(58,232,255,0.2)" />
              <stop offset="100%" stopColor="rgba(58,232,255,0)" />
            </linearGradient>
            <filter id="platform-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="strong-glow">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Energy beam from center */}
          <path d="M220 160 L250 20 L280 160 Z" fill="url(#beam-gradient)" opacity="0.6">
            <animate attributeName="opacity" values="0.4;0.7;0.4" dur="2s" repeatCount="indefinite" />
          </path>
          <path d="M235 160 L250 40 L265 160 Z" fill="url(#inner-beam)" opacity="0.8">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
          </path>
          
          {/* Concentric ellipse rings */}
          <ellipse cx="250" cy="175" rx="230" ry="20" fill="none" stroke="url(#platform-ring)" strokeWidth="0.5" opacity="0.2" />
          <ellipse cx="250" cy="170" rx="200" ry="18" fill="none" stroke="url(#platform-ring)" strokeWidth="0.8" opacity="0.3">
            <animate attributeName="ry" values="18;20;18" dur="3s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="250" cy="165" rx="170" ry="15" fill="none" stroke="url(#platform-ring)" strokeWidth="1" opacity="0.4">
            <animate attributeName="ry" values="15;17;15" dur="2.5s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="250" cy="160" rx="140" ry="12" fill="none" stroke="url(#platform-ring)" strokeWidth="1.2" opacity="0.55" filter="url(#platform-glow)">
            <animate attributeName="ry" values="12;14;12" dur="2s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="250" cy="155" rx="110" ry="9" fill="none" stroke="url(#platform-ring)" strokeWidth="1.5" opacity="0.7" filter="url(#platform-glow)">
            <animate attributeName="ry" values="9;11;9" dur="2.2s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="250" cy="150" rx="80" ry="6" fill="none" stroke="url(#platform-ring)" strokeWidth="2" opacity="0.85" filter="url(#strong-glow)">
            <animate attributeName="ry" values="6;8;6" dur="1.8s" repeatCount="indefinite" />
          </ellipse>
          
          {/* Center glow */}
          <ellipse cx="250" cy="148" rx="50" ry="4" fill="rgba(58,232,255,0.6)" filter="url(#strong-glow)">
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
          </ellipse>
          
          {/* Orbiting particles */}
          <circle r="4" fill="#4ae8ff" filter="url(#platform-glow)">
            <animateMotion dur="6s" repeatCount="indefinite">
              <mpath xlinkHref="#orbit-path-1" />
            </animateMotion>
          </circle>
          <path id="orbit-path-1" d="M20,170 A230,20 0 1,1 480,170 A230,20 0 1,1 20,170" fill="none" />
          
          <circle r="3" fill="#1a9fff">
            <animateMotion dur="5s" repeatCount="indefinite">
              <mpath xlinkHref="#orbit-path-2" />
            </animateMotion>
          </circle>
          <path id="orbit-path-2" d="M50,165 A200,18 0 1,1 450,165 A200,18 0 1,1 50,165" fill="none" />
          
          <circle r="2.5" fill="#4ae8ff" opacity="0.8">
            <animateMotion dur="4s" repeatCount="indefinite">
              <mpath xlinkHref="#orbit-path-3" />
            </animateMotion>
          </circle>
          <path id="orbit-path-3" d="M80,160 A170,15 0 1,1 420,160 A170,15 0 1,1 80,160" fill="none" />
          
          {/* Static glowing nodes */}
          <circle cx="60" cy="168" r="3" fill="#4ae8ff" opacity="0.9" filter="url(#platform-glow)">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="440" cy="168" r="3" fill="#4ae8ff" opacity="0.9" filter="url(#platform-glow)">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="120" cy="162" r="2" fill="#4ae8ff" opacity="0.7">
            <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="380" cy="162" r="2" fill="#4ae8ff" opacity="0.7">
            <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.9s" repeatCount="indefinite" />
          </circle>
          
          {/* Hexagonal data nodes */}
          <polygon points="250,135 260,140 260,150 250,155 240,150 240,140" fill="rgba(58,232,255,0.2)" stroke="#4ae8ff" strokeWidth="1" filter="url(#platform-glow)">
            <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
          </polygon>
        </svg>
        
        {/* Cloud icon above platform */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-20">
          <div className="relative">
            <div className="absolute inset-0 blur-xl">
              <EnerCloudIcon className="h-24 w-24 opacity-50" />
            </div>
            <EnerCloudIcon className="relative h-24 w-24 drop-shadow-[0_0_30px_rgba(58,232,255,0.8)]" />
          </div>
        </div>
      </div>
    </div>
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
        viewBox="0 0 120 120"
        className={cn(
          "h-28 w-28",
          !isTop && "rotate-180",
          !isLeft && isTop && "-scale-x-100",
          !isLeft && !isTop && "scale-x-[-1]"
        )}
        fill="none"
      >
        <path d="M0 0 L60 0 L60 3 L3 3 L3 60 L0 60 Z" fill="rgba(58,232,255,0.5)" />
        <path d="M0 70 L0 120 L3 120 L3 75 L10 75 L10 70 Z" fill="rgba(58,232,255,0.3)" />
        <path d="M70 0 L120 0 L120 3 L75 3 L75 10 L70 10 Z" fill="rgba(58,232,255,0.3)" />
        
        {/* Animated corner elements */}
        <rect x="12" y="12" width="6" height="6" fill="rgba(58,232,255,0.7)">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
        </rect>
        <rect x="24" y="12" width="20" height="2" fill="rgba(58,232,255,0.4)" />
        <rect x="12" y="24" width="2" height="20" fill="rgba(58,232,255,0.4)" />
        
        <circle cx="50" cy="12" r="2" fill="#4ae8ff" opacity="0.6">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="12" cy="50" r="2" fill="#4ae8ff" opacity="0.6">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" repeatCount="indefinite" />
        </circle>
        
        {/* Data flow lines */}
        <line x1="18" y1="18" x2="45" y2="18" stroke="rgba(58,232,255,0.2)" strokeWidth="1" strokeDasharray="4,4">
          <animate attributeName="stroke-dashoffset" values="0;8" dur="1s" repeatCount="indefinite" />
        </line>
        <line x1="18" y1="18" x2="18" y2="45" stroke="rgba(58,232,255,0.2)" strokeWidth="1" strokeDasharray="4,4">
          <animate attributeName="stroke-dashoffset" values="0;8" dur="1s" repeatCount="indefinite" />
        </line>
      </svg>
    </div>
  )
}

function ParticleField() {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      duration: Math.random() * 4 + 2,
      delay: Math.random() * 3,
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
            opacity: 0.3,
            animation: `twinkle ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function DataFlowLines() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Vertical data streams */}
      <svg className="absolute left-[10%] top-0 h-full w-1 opacity-30">
        <line x1="2" y1="0" x2="2" y2="100%" stroke="rgba(58,232,255,0.3)" strokeWidth="1" />
        <circle r="3" fill="#4ae8ff">
          <animate attributeName="cy" values="0;100%" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" dur="4s" repeatCount="indefinite" />
        </circle>
      </svg>
      <svg className="absolute right-[10%] top-0 h-full w-1 opacity-30">
        <line x1="2" y1="0" x2="2" y2="100%" stroke="rgba(58,232,255,0.3)" strokeWidth="1" />
        <circle r="3" fill="#4ae8ff">
          <animate attributeName="cy" values="100%;0" dur="5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" dur="5s" repeatCount="indefinite" />
        </circle>
      </svg>
      <svg className="absolute left-[5%] top-0 h-full w-1 opacity-20">
        <line x1="2" y1="0" x2="2" y2="100%" stroke="rgba(58,232,255,0.2)" strokeWidth="1" />
        <circle r="2" fill="#1a9fff">
          <animate attributeName="cy" values="0;100%" dur="6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.8;0.8;0" dur="6s" repeatCount="indefinite" />
        </circle>
      </svg>
      <svg className="absolute right-[5%] top-0 h-full w-1 opacity-20">
        <line x1="2" y1="0" x2="2" y2="100%" stroke="rgba(58,232,255,0.2)" strokeWidth="1" />
        <circle r="2" fill="#1a9fff">
          <animate attributeName="cy" values="100%;0" dur="7s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.8;0.8;0" dur="7s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}

function ScanLine() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
      <div 
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#4ae8ff]/80 to-transparent"
        style={{ animation: 'scanVertical 8s linear infinite' }}
      />
    </div>
  )
}

function BackgroundScene() {
  return (
    <>
      {/* Base gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(20,80,140,0.2),transparent_60%),linear-gradient(180deg,#030a18_0%,#020812_50%,#010610_100%)]" />

      {/* Grid pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(58,232,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(58,232,255,0.5)_1px,transparent_1px)] [background-size:60px_60px]" />

      {/* Perspective grid at bottom */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[350px] opacity-15 [background-image:linear-gradient(transparent_0%,rgba(58,232,255,0.08)_100%),linear-gradient(90deg,rgba(58,232,255,0.25)_1px,transparent_1px),linear-gradient(rgba(58,232,255,0.25)_1px,transparent_1px)] [background-size:100%_100%,60px_60px,60px_60px] [transform:perspective(500px)_rotateX(60deg)] [transform-origin:bottom]" />

      {/* Ambient glows */}
      <div className="pointer-events-none absolute left-0 top-1/3 h-[600px] w-[500px] bg-[radial-gradient(circle,rgba(20,100,180,0.15),transparent_60%)] blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-[600px] w-[500px] bg-[radial-gradient(circle,rgba(20,100,180,0.15),transparent_60%)] blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(30,120,200,0.15),transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(58,232,255,0.1),transparent_70%)] blur-3xl" />

      {/* Top notch frame */}
      <TopNotchFrame />
      
      {/* Bottom tech frame */}
      <BottomTechFrame />
      
      {/* Side tech panels */}
      <SideTechPanel side="left" />
      <SideTechPanel side="right" />

      {/* Data flow lines */}
      <DataFlowLines />

      {/* Particle field */}
      <ParticleField />

      {/* Scan line */}
      <ScanLine />

      {/* Corner decorations */}
      <CornerDecoration position="top-left" />
      <CornerDecoration position="top-right" />
      <CornerDecoration position="bottom-left" />
      <CornerDecoration position="bottom-right" />

      {/* Holographic platform */}
      <HolographicPlatform />
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
          50% { opacity: 0.8; transform: scale(1.5); }
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
          0%, 100% { box-shadow: 0 0 25px rgba(58,232,255,0.3), inset 0 0 30px rgba(58,232,255,0.05); }
          50% { box-shadow: 0 0 50px rgba(58,232,255,0.5), inset 0 0 50px rgba(58,232,255,0.1); }
        }
      `}</style>

      <div className={cn(
        "relative z-10 flex h-full flex-col transition-opacity duration-700",
        mounted ? "opacity-100" : "opacity-0"
      )}>
        {/* Header */}
        <header className="shrink-0 py-6 pt-8">
          <div className="flex items-center justify-center gap-4">
            <EnerCloudIcon className="h-14 w-14 drop-shadow-[0_0_25px_rgba(58,232,255,0.6)]" />
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
                <div className="pointer-events-none absolute -inset-8 rounded-lg bg-[radial-gradient(circle,rgba(58,232,255,0.15),transparent_60%)] blur-3xl" />

                {/* Login card with hexagonal clip */}
                <div
                  className="relative overflow-hidden border border-[#1a5a8a]/70 bg-[linear-gradient(165deg,rgba(6,18,36,0.97),rgba(3,10,24,0.99))] px-8 py-7"
                  style={{
                    clipPath: "polygon(5% 0%, 95% 0%, 100% 4%, 100% 96%, 95% 100%, 5% 100%, 0% 96%, 0% 4%)",
                    animation: 'pulse-glow 4s ease-in-out infinite',
                  }}
                >
                  {/* Animated border */}
                  <div
                    className="pointer-events-none absolute inset-[1px] border border-[#4ae8ff]/20"
                    style={{
                      clipPath: "polygon(5% 0%, 95% 0%, 100% 4%, 100% 96%, 95% 100%, 5% 100%, 0% 96%, 0% 4%)",
                    }}
                  />

                  {/* Scan line effect inside form */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-15">
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
