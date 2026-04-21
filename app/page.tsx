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
const BRAND_SUBTITLE_ZH = "数 据 监 测 云 平 台"
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

// Brand Logo
function EnerCloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 78 66" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cloud-grad" x1="8" y1="8" x2="68" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6ff4ff" />
          <stop offset="100%" stopColor="#318eff" />
        </linearGradient>
        <linearGradient id="bolt-grad" x1="28" y1="10" x2="46" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c8fffa" />
          <stop offset="100%" stopColor="#3fe4ff" />
        </linearGradient>
        <filter id="glow-filter">
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
        stroke="url(#cloud-grad)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        filter="url(#glow-filter)"
      />
      <path
        d="M43 13L31 31H39L33 50L48 28H40L43 13Z"
        fill="url(#bolt-grad)"
        stroke="rgba(92,242,255,0.4)"
        strokeWidth="0.8"
        filter="url(#glow-filter)"
      />
    </svg>
  )
}

// Corner Tech Decoration
function CornerDecoration({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const isTop = position.includes("t")
  const isLeft = position.includes("l")
  
  return (
    <div className={cn(
      "pointer-events-none absolute z-10",
      isTop ? "top-0" : "bottom-0",
      isLeft ? "left-0" : "right-0"
    )}>
      <svg 
        viewBox="0 0 120 120" 
        className="h-[120px] w-[120px]"
        style={{ 
          transform: `scale(${isLeft ? 1 : -1}, ${isTop ? 1 : -1})` 
        }}
      >
        <defs>
          <linearGradient id={`corner-${position}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(74,232,255,0.8)" />
            <stop offset="100%" stopColor="rgba(74,232,255,0.1)" />
          </linearGradient>
        </defs>
        {/* Main L-bracket */}
        <path 
          d="M0,0 L80,0 L80,4 L4,4 L4,80 L0,80 Z" 
          fill={`url(#corner-${position})`} 
        />
        {/* Diagonal accent */}
        <line x1="0" y1="0" x2="60" y2="60" stroke="rgba(74,232,255,0.3)" strokeWidth="1" />
        <line x1="8" y1="0" x2="68" y2="60" stroke="rgba(74,232,255,0.15)" strokeWidth="0.5" />
        {/* Tech dots */}
        <circle cx="20" cy="20" r="2" fill="rgba(74,232,255,0.6)">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="40" cy="40" r="1.5" fill="rgba(74,232,255,0.4)">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.5s" repeatCount="indefinite" />
        </circle>
        {/* Side accents */}
        <rect x="12" y="8" width="30" height="1" fill="rgba(74,232,255,0.25)" />
        <rect x="8" y="12" width="1" height="30" fill="rgba(74,232,255,0.25)" />
        <rect x="18" y="14" width="20" height="0.5" fill="rgba(74,232,255,0.15)" />
        <rect x="14" y="18" width="0.5" height="20" fill="rgba(74,232,255,0.15)" />
      </svg>
    </div>
  )
}

// Bottom Cloud Platform - matching design mockup
function CloudPlatform() {
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2">
      <div className="relative flex flex-col items-center">
        {/* Cloud Icon - rounder, more pill-shaped like mockup */}
        <svg viewBox="0 0 140 70" className="h-[70px] w-[140px]">
          <defs>
            <linearGradient id="cloud-outline" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ae8ff" />
              <stop offset="100%" stopColor="#1a7cbb" />
            </linearGradient>
            <filter id="cloud-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Cloud shape - more rounded/pill shaped */}
          <path
            d="M35 55C22 55 12 47 12 36C12 26 20 18 32 17C35 8 46 2 60 2C74 2 86 8 90 18C102 19 115 27 115 40C115 52 104 55 90 55H35Z"
            fill="rgba(4,16,32,0.8)"
            stroke="url(#cloud-outline)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            filter="url(#cloud-glow)"
          />
          {/* Lightning bolt - centered */}
          <path
            d="M72 12L54 32H66L56 52L78 28H66L72 12Z"
            fill="rgba(200,255,255,0.95)"
            stroke="rgba(74,232,255,0.5)"
            strokeWidth="0.5"
            filter="url(#cloud-glow)"
          />
        </svg>

        {/* Triangular energy beam - matching mockup style */}
        <div className="relative -mt-1">
          <svg viewBox="0 0 100 80" className="h-[80px] w-[100px]">
            <defs>
              <linearGradient id="beam-grad" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="rgba(200,255,255,0.9)" />
                <stop offset="30%" stopColor="rgba(74,232,255,0.6)" />
                <stop offset="70%" stopColor="rgba(74,232,255,0.2)" />
                <stop offset="100%" stopColor="rgba(74,232,255,0)" />
              </linearGradient>
              <filter id="beam-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Main beam triangle */}
            <polygon 
              points="50,0 75,80 25,80" 
              fill="url(#beam-grad)"
              filter="url(#beam-glow)"
            >
              <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
            </polygon>
            {/* Inner bright core */}
            <polygon 
              points="50,5 60,80 40,80" 
              fill="rgba(200,255,255,0.3)"
            >
              <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1.5s" repeatCount="indefinite" />
            </polygon>
          </svg>
        </div>

        {/* Concentric ellipse rings - cleaner like mockup */}
        <div className="relative -mt-6">
          <svg viewBox="0 0 500 100" className="h-[100px] w-[500px]">
            <defs>
              <linearGradient id="ring-grad" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="rgba(74,232,255,0)" />
                <stop offset="15%" stopColor="rgba(74,232,255,0.3)" />
                <stop offset="50%" stopColor="rgba(180,250,255,0.9)" />
                <stop offset="85%" stopColor="rgba(74,232,255,0.3)" />
                <stop offset="100%" stopColor="rgba(74,232,255,0)" />
              </linearGradient>
              <filter id="ring-glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Multiple rings - tighter spacing */}
            {[
              { rx: 220, ry: 18, cy: 50, opacity: 0.12, width: 0.5 },
              { rx: 190, ry: 15, cy: 52, opacity: 0.18, width: 0.7 },
              { rx: 160, ry: 12, cy: 54, opacity: 0.25, width: 0.8 },
              { rx: 130, ry: 10, cy: 56, opacity: 0.35, width: 1 },
              { rx: 100, ry: 8, cy: 58, opacity: 0.5, width: 1.2 },
              { rx: 70, ry: 5, cy: 60, opacity: 0.7, width: 1.5 },
              { rx: 45, ry: 3, cy: 62, opacity: 0.9, width: 2 },
            ].map((ring, i) => (
              <ellipse 
                key={i}
                cx="250" 
                cy={ring.cy} 
                rx={ring.rx} 
                ry={ring.ry}
                fill="none"
                stroke="url(#ring-grad)"
                strokeWidth={ring.width}
                opacity={ring.opacity}
                filter={i >= 4 ? "url(#ring-glow)" : undefined}
              >
                <animate 
                  attributeName="ry" 
                  values={`${ring.ry};${ring.ry + 0.5};${ring.ry}`}
                  dur={`${3 + i * 0.2}s`}
                  repeatCount="indefinite"
                />
              </ellipse>
            ))}
            {/* Orbiting particles - matching mockup cyan dots */}
            {[
              { rx: 190, ry: 15, dur: "12s", size: 4, offset: 0 },
              { rx: 190, ry: 15, dur: "12s", size: 4, offset: 0.5 },
              { rx: 130, ry: 10, dur: "8s", size: 3.5, offset: 0 },
              { rx: 130, ry: 10, dur: "8s", size: 3.5, offset: 0.5 },
              { rx: 70, ry: 5, dur: "5s", size: 3, offset: 0 },
              { rx: 70, ry: 5, dur: "5s", size: 3, offset: 0.5 },
            ].map((orbit, i) => (
              <g key={i}>
                <circle r={orbit.size} fill="#4ae8ff" filter="url(#ring-glow)">
                  <animateMotion 
                    dur={orbit.dur} 
                    repeatCount="indefinite"
                    begin={`${orbit.offset * parseFloat(orbit.dur)}s`}
                    path={`M${250 - orbit.rx},${52 + (6 - i) * 1.5} a${orbit.rx},${orbit.ry} 0 1,1 ${orbit.rx * 2},0 a${orbit.rx},${orbit.ry} 0 1,1 -${orbit.rx * 2},0`}
                  />
                </circle>
              </g>
            ))}
            {/* Static glow dots on rings */}
            {[
              { cx: 60, cy: 58 }, { cx: 440, cy: 58 },
              { cx: 120, cy: 56 }, { cx: 380, cy: 56 },
            ].map((dot, i) => (
              <circle key={`dot-${i}`} cx={dot.cx} cy={dot.cy} r="2" fill="#4ae8ff" opacity="0.6" filter="url(#ring-glow)">
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </svg>
        </div>
      </div>
    </div>
  )
}

// City Skyline Background
function CitySkyline() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[180px] overflow-hidden opacity-40">
      <svg viewBox="0 0 1400 180" className="h-full w-full" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="city-fade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(74,232,255,0.3)" />
            <stop offset="100%" stopColor="rgba(10,40,80,0.1)" />
          </linearGradient>
        </defs>
        {/* Left buildings */}
        <g fill="rgba(8,30,60,0.9)" stroke="rgba(74,232,255,0.25)" strokeWidth="0.5">
          <rect x="20" y="100" width="25" height="80" />
          <rect x="40" y="80" width="20" height="100" />
          <rect x="55" y="60" width="30" height="120" />
          <rect x="80" y="90" width="18" height="90" />
          <rect x="95" y="50" width="25" height="130" />
          <rect x="115" y="70" width="22" height="110" />
          <rect x="132" y="40" width="28" height="140" />
          <rect x="155" y="85" width="20" height="95" />
          <rect x="170" y="55" width="24" height="125" />
          <rect x="190" y="75" width="18" height="105" />
          <rect x="205" y="95" width="30" height="85" />
          <rect x="230" y="65" width="22" height="115" />
          <rect x="248" y="45" width="26" height="135" />
          <rect x="270" y="80" width="20" height="100" />
          <rect x="285" y="100" width="24" height="80" />
          <rect x="305" y="70" width="18" height="110" />
          <rect x="320" y="90" width="28" height="90" />
          <rect x="345" y="60" width="22" height="120" />
          <rect x="362" y="110" width="20" height="70" />
        </g>
        {/* Right buildings */}
        <g fill="rgba(8,30,60,0.9)" stroke="rgba(74,232,255,0.25)" strokeWidth="0.5">
          <rect x="1020" y="110" width="20" height="70" />
          <rect x="1036" y="60" width="22" height="120" />
          <rect x="1055" y="90" width="28" height="90" />
          <rect x="1080" y="70" width="18" height="110" />
          <rect x="1095" y="100" width="24" height="80" />
          <rect x="1115" y="80" width="20" height="100" />
          <rect x="1132" y="45" width="26" height="135" />
          <rect x="1154" y="65" width="22" height="115" />
          <rect x="1172" y="95" width="30" height="85" />
          <rect x="1198" y="75" width="18" height="105" />
          <rect x="1212" y="55" width="24" height="125" />
          <rect x="1232" y="85" width="20" height="95" />
          <rect x="1248" y="40" width="28" height="140" />
          <rect x="1272" y="70" width="22" height="110" />
          <rect x="1290" y="50" width="25" height="130" />
          <rect x="1310" y="90" width="18" height="90" />
          <rect x="1325" y="60" width="30" height="120" />
          <rect x="1350" y="80" width="20" height="100" />
          <rect x="1365" y="100" width="25" height="80" />
        </g>
        {/* Window lights */}
        {[
          [65,72],[85,96],[108,58],[138,52],[158,92],[178,66],[212,78],[238,58],[258,88],[282,78],[328,68],[352,88],
          [1042,68],[1068,88],[1098,78],[1142,58],[1162,88],[1186,78],[1222,66],[1258,52],[1282,78],[1318,68],[1342,88],[1362,78],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width={3} height={4} fill="rgba(74,232,255,0.7)">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur={`${1.5 + (i % 5) * 0.3}s`} begin={`${(i % 4) * 0.2}s`} repeatCount="indefinite" />
          </rect>
        ))}
      </svg>
    </div>
  )
}

// Background Grid with Data Twin Effects
function BackgroundGrid() {
  return (
    <>
      {/* Base color */}
      <div className="pointer-events-none absolute inset-0 bg-[#030d1a]" />
      {/* Radial gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_20%,rgba(10,50,100,0.3),transparent)]" />
      {/* Grid pattern */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ 
          backgroundImage: "linear-gradient(rgba(74,232,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(74,232,255,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} 
      />
      {/* Data twin particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg className="h-full w-full">
          <defs>
            <filter id="particle-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Floating particles */}
          {Array.from({ length: 30 }).map((_, i) => (
            <circle
              key={i}
              r={Math.random() * 2 + 1}
              fill={`rgba(74,232,255,${0.3 + Math.random() * 0.4})`}
              filter="url(#particle-glow)"
            >
              <animate
                attributeName="cx"
                values={`${Math.random() * 100}%;${Math.random() * 100}%;${Math.random() * 100}%`}
                dur={`${15 + Math.random() * 20}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="cy"
                values={`${Math.random() * 100}%;${Math.random() * 100}%;${Math.random() * 100}%`}
                dur={`${20 + Math.random() * 15}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.2;0.8;0.2"
                dur={`${2 + Math.random() * 3}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
          {/* Data flow lines */}
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={`line-${i}`}
              x1={`${10 + i * 12}%`}
              y1="0%"
              x2={`${10 + i * 12}%`}
              y2="100%"
              stroke="rgba(74,232,255,0.05)"
              strokeWidth="1"
              strokeDasharray="4 20"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="0;-24"
                dur={`${2 + i * 0.3}s`}
                repeatCount="indefinite"
              />
            </line>
          ))}
        </svg>
      </div>
      {/* Horizontal scan line */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div 
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#4ae8ff]/30 to-transparent"
          style={{ animation: "bgScanLine 8s linear infinite" }}
        />
      </div>
      {/* Radar sweep effect at bottom center */}
      <div className="pointer-events-none absolute bottom-[10%] left-1/2 -translate-x-1/2">
        <svg viewBox="0 0 400 200" className="h-[200px] w-[400px] opacity-20">
          <defs>
            <linearGradient id="radar-sweep" x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="rgba(74,232,255,0.4)" />
              <stop offset="100%" stopColor="rgba(74,232,255,0)" />
            </linearGradient>
          </defs>
          {/* Radar circles */}
          {[80, 120, 160].map((r, i) => (
            <ellipse
              key={i}
              cx="200"
              cy="180"
              rx={r}
              ry={r * 0.3}
              fill="none"
              stroke="rgba(74,232,255,0.15)"
              strokeWidth="1"
            />
          ))}
          {/* Sweep line */}
          <path
            d="M200,180 L200,40"
            stroke="url(#radar-sweep)"
            strokeWidth="2"
            opacity="0.6"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 200 180"
              to="360 200 180"
              dur="10s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      </div>
    </>
  )
}

// Feature Card Component (matching mockup style)
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
    <div className={cn(
      "group relative flex cursor-pointer items-center gap-3 overflow-hidden px-4 py-3 transition-all duration-300",
      "border border-[#1a4a6a]/60 bg-gradient-to-r",
      direction === "left"
        ? "from-[rgba(6,20,40,0.95)] to-[rgba(8,28,50,0.9)]"
        : "from-[rgba(8,28,50,0.9)] to-[rgba(6,20,40,0.95)]",
      "hover:border-[#4ae8ff]/40 hover:bg-gradient-to-r hover:from-[rgba(10,35,60,0.95)] hover:to-[rgba(12,40,70,0.9)]",
    )}>
      {/* Top border glow on hover */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#4ae8ff]/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      
      {/* Left accent bar */}
      {direction === "left" && (
        <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-gradient-to-b from-[#4ae8ff]/60 via-[#4ae8ff]/30 to-[#4ae8ff]/60" />
      )}
      {direction === "right" && (
        <div className="absolute right-0 top-2 bottom-2 w-[3px] bg-gradient-to-b from-[#4ae8ff]/60 via-[#4ae8ff]/30 to-[#4ae8ff]/60" />
      )}

      {/* Icon */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-[#1a4a6a]/50 bg-[rgba(6,20,40,0.8)]">
        <Icon className="h-5 w-5 text-[#4ae8ff]" style={{ filter: "drop-shadow(0 0 6px rgba(74,232,255,0.5))" }} />
      </div>

      {/* Text */}
      <div className={cn("min-w-0 flex-1", direction === "right" && "text-right")}>
        <div className="text-[14px] font-bold leading-tight text-[#d0f0ff]">{title}</div>
        <div className="mt-0.5 text-[12px] leading-tight text-[#4a7890]">{description}</div>
      </div>

      {/* Arrow */}
      <ChevronRight className={cn(
        "h-5 w-5 shrink-0 text-[#3a6880] transition-all group-hover:text-[#4ae8ff]",
        direction === "right" && "rotate-180"
      )} />
    </div>
  )
}

// Main Login Page
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

  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    setSubmitting(true)
    try {
      const response = await loginWithCloud({ username: account.trim(), password })
      if (response.code !== 200 || !response.token) {
        throw new Error(response.msg || (locale === "zh" ? "登录失败，请稍后重试" : "Login failed. Please try again."))
      }
      persistAuthToken(response.token, remember)
      startTransition(() => { router.push("/dashboard") })
    } catch (error) {
      const fallback = locale === "zh" ? "登录失败，请稍后重试" : "Login failed. Please try again."
      setSubmitError(error instanceof Error ? error.message || fallback : fallback)
      setSubmitting(false)
    }
    setSubmitting(false)
  }

  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#030d1a] text-white">
      {/* Background layers */}
      <BackgroundGrid />
      <CitySkyline />
      
      {/* Corner decorations */}
      <CornerDecoration position="tl" />
      <CornerDecoration position="tr" />
      <CornerDecoration position="bl" />
      <CornerDecoration position="br" />

      {/* Cloud platform at bottom */}
      <CloudPlatform />

      {/* Global animations */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes scanLine {
          0% { top: -2px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes cardPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(74,232,255,0.15), inset 0 0 15px rgba(74,232,255,0.03); }
          50% { box-shadow: 0 0 35px rgba(74,232,255,0.25), inset 0 0 25px rgba(74,232,255,0.05); }
        }
        @keyframes bgScanLine {
          0% { top: 0%; opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>

      {/* Content */}
      <div className={cn(
        "relative z-10 flex flex-1 flex-col transition-opacity duration-700",
        mounted ? "opacity-100" : "opacity-0"
      )}>
        {/* Header */}
        <header className="shrink-0 py-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <EnerCloudIcon className="h-12 w-12 drop-shadow-[0_0_20px_rgba(74,232,255,0.6)]" />
              <div
                className="bg-clip-text text-[2.6rem] font-black leading-none tracking-wide text-transparent"
                style={{ 
                  backgroundImage: "linear-gradient(170deg, #ffffff 0%, #b8f4ff 40%, #4ae8ff 100%)",
                  filter: "drop-shadow(0 0 15px rgba(74,232,255,0.3))"
                }}
              >
                {BRAND}
              </div>
            </div>
            <div className="text-[13px] tracking-[0.5em] text-[#4ae8ff]/70">
              {locale === "zh" ? BRAND_SUBTITLE_ZH : BRAND_SUBTITLE_EN}
            </div>
          </div>
        </header>

        {/* Three-column layout */}
        <div className="flex flex-1 items-start justify-center overflow-hidden px-4 pb-32">
          <div className="flex w-full max-w-[1100px] items-start gap-5">

            {/* Left cards */}
            <div className="hidden w-[260px] shrink-0 flex-col gap-3 lg:flex">
              {LEFT_MENU_ITEMS.map((item, i) => (
                <FeatureCard
                  key={i}
                  icon={item.icon}
                  title={locale === "zh" ? item.titleZh : item.titleEn}
                  description={locale === "zh" ? item.descZh : item.descEn}
                  direction="left"
                />
              ))}
            </div>

            {/* Center login form */}
            <div className="flex flex-1 flex-col items-center">
              <div className="relative w-full max-w-[380px]">
                {/* Outer glow */}
                <div className="pointer-events-none absolute -inset-8 rounded-full bg-[radial-gradient(circle,rgba(74,232,255,0.1),transparent_60%)] blur-xl" />

                {/* Login card */}
                <div
                  className="relative overflow-hidden border border-[#1a5a8a]/50 bg-[linear-gradient(170deg,rgba(6,20,38,0.98),rgba(4,14,28,0.99))] px-7 py-6"
                  style={{
                    clipPath: "polygon(16px 0%, calc(100% - 16px) 0%, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0% calc(100% - 16px), 0% 16px)",
                    animation: "cardPulse 4s ease-in-out infinite",
                  }}
                >
                  {/* Inner border */}
                  <div 
                    className="pointer-events-none absolute inset-[1px] border border-[#4ae8ff]/10"
                    style={{ clipPath: "polygon(16px 0%, calc(100% - 16px) 0%, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0% calc(100% - 16px), 0% 16px)" }}
                  />

                  {/* Scan line */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
                    <div 
                      className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#4ae8ff] to-transparent"
                      style={{ animation: "scanLine 5s linear infinite" }}
                    />
                  </div>

                  {/* Corner accents */}
                  <div className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l-2 border-t-2 border-[#4ae8ff]/50" />
                  <div className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r-2 border-t-2 border-[#4ae8ff]/50" />
                  <div className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b-2 border-l-2 border-[#4ae8ff]/50" />
                  <div className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b-2 border-r-2 border-[#4ae8ff]/50" />

                  {/* Language toggle */}
                  <div className="flex">
                    <div className="flex overflow-hidden border border-[#1a4a6a]/60 bg-[rgba(4,14,28,0.9)]">
                      {LANGUAGE_OPTIONS.map((opt) => {
                        const active = locale === opt.key
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setLanguage(opt.key)}
                            className={cn(
                              "px-4 py-1.5 text-[12px] font-bold tracking-wider transition-all",
                              active
                                ? "bg-[rgba(14,60,100,0.6)] text-[#4ae8ff]"
                                : "text-[#4a7890] hover:text-[#80d8f8]"
                            )}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Welcome text */}
                  <div className="mt-6 text-center">
                    <h1 className="text-[1.8rem] font-black tracking-wider text-white">
                      {copy.welcome}
                    </h1>
                    <p className="mt-1 text-[12px] tracking-[0.25em] text-[#4ae8ff]/60">
                      {copy.welcomeSub}
                    </p>
                  </div>

                  {/* Form */}
                  <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                    {/* Username input */}
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <User className="h-4 w-4 text-[#4ae8ff]/70" />
                      </div>
                      <input
                        type="text"
                        value={account}
                        onChange={(e) => { setAccount(e.target.value); setSubmitError(null) }}
                        placeholder={copy.accountPlaceholder}
                        required
                        className="h-11 w-full border border-[#1a4a6a]/60 bg-[rgba(4,14,28,0.9)] pl-10 pr-4 text-[14px] text-[#d0f0ff] outline-none transition-all placeholder:text-[#3a6070] focus:border-[#4ae8ff]/50 focus:shadow-[0_0_12px_rgba(74,232,255,0.15)]"
                      />
                    </div>

                    {/* Password input */}
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <LockKeyhole className="h-4 w-4 text-[#4ae8ff]/70" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setSubmitError(null) }}
                        placeholder={copy.passwordPlaceholder}
                        required
                        className="h-11 w-full border border-[#1a4a6a]/60 bg-[rgba(4,14,28,0.9)] pl-10 pr-11 text-[14px] text-[#d0f0ff] outline-none transition-all placeholder:text-[#3a6070] focus:border-[#4ae8ff]/50 focus:shadow-[0_0_12px_rgba(74,232,255,0.15)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3a6878] transition-colors hover:text-[#4ae8ff]"
                      >
                        {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Remember & forgot */}
                    <div className="flex items-center justify-between text-[12px]">
                      <label className="flex cursor-pointer items-center gap-2 text-[#5a8898] transition-colors hover:text-[#80c8e0]">
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="h-3.5 w-3.5 border border-[#1a4a6a] bg-[#040c1c] accent-[#4ae8ff]"
                        />
                        {copy.remember}
                      </label>
                      <button type="button" className="text-[#4ae8ff]/70 transition-colors hover:text-[#80f0ff]">
                        {copy.forgot}
                      </button>
                    </div>

                    {/* Submit button */}
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="group relative mt-2 h-11 w-full overflow-hidden border border-[#4ae8ff]/30 bg-gradient-to-r from-[#0a5090] via-[#0e80c8] to-[#0a5090] text-[14px] font-bold tracking-widest text-white shadow-[0_0_20px_rgba(14,100,180,0.3)] transition-all hover:border-[#4ae8ff]/50 hover:shadow-[0_0_30px_rgba(74,232,255,0.35)] disabled:opacity-60"
                      style={{ clipPath: "polygon(10px 0%, calc(100% - 10px) 0%, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0% calc(100% - 10px), 0% 10px)" }}
                    >
                      <div
                        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100"
                        style={{ animation: "shimmer 2s infinite" }}
                      />
                      <span className="relative flex items-center justify-center gap-2">
                        {submitting ? `${copy.submit}...` : copy.submit}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </Button>

                    {/* Error message */}
                    {submitError && (
                      <div className="border border-red-500/30 bg-red-900/20 px-3 py-2 text-[12px] text-red-300">
                        {submitError}
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>

            {/* Right cards */}
            <div className="hidden w-[260px] shrink-0 flex-col gap-3 lg:flex">
              {RIGHT_MENU_ITEMS.map((item, i) => (
                <FeatureCard
                  key={i}
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
