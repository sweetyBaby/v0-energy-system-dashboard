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

// Logo icon
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
      <path d="M28 7L19 18H25L17 31L33 15H27L28 7Z" fill="white" />
    </svg>
  )
}

// Top decorations
function TopDecorations() {
  return (
    <>
      {/* Left */}
      <svg className="pointer-events-none absolute left-0 top-0 h-20 w-72" viewBox="0 0 288 80" fill="none">
        <defs>
          <linearGradient id="line-l" x1="0" y1="0" x2="260" y2="0">
            <stop offset="0%" stopColor="#001a33" />
            <stop offset="60%" stopColor="#006688" />
            <stop offset="100%" stopColor="#00ccff" />
          </linearGradient>
        </defs>
        <path d="M0 40 L80 40 L120 12 L260 12" stroke="url(#line-l)" strokeWidth="1.5" fill="none" />
        <path d="M0 50 L60 50 L95 28 L180 28" stroke="#003355" strokeWidth="0.8" opacity="0.6" />
        <rect x="252" y="6" width="28" height="12" rx="1" fill="#00d4ff" />
        <rect x="225" y="6" width="20" height="12" rx="1" fill="#004466" opacity="0.6" />
        <circle cx="120" cy="12" r="3" fill="#00eeff">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
      {/* Right */}
      <svg className="pointer-events-none absolute right-0 top-0 h-20 w-72" viewBox="0 0 288 80" fill="none">
        <defs>
          <linearGradient id="line-r" x1="288" y1="0" x2="28" y2="0">
            <stop offset="0%" stopColor="#001a33" />
            <stop offset="60%" stopColor="#006688" />
            <stop offset="100%" stopColor="#00ccff" />
          </linearGradient>
        </defs>
        <path d="M288 40 L208 40 L168 12 L28 12" stroke="url(#line-r)" strokeWidth="1.5" fill="none" />
        <path d="M288 50 L228 50 L193 28 L108 28" stroke="#003355" strokeWidth="0.8" opacity="0.6" />
        <rect x="8" y="6" width="28" height="12" rx="1" fill="#00d4ff" />
        <rect x="43" y="6" width="20" height="12" rx="1" fill="#004466" opacity="0.6" />
        <circle cx="168" cy="12" r="3" fill="#00eeff">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </>
  )
}

// Left cloud decoration
function LeftDecoration() {
  return (
    <div className="pointer-events-none absolute bottom-[5%] left-[1%] hidden h-[560px] w-[360px] lg:block xl:left-[3%]">
      <svg viewBox="0 0 360 560" className="h-full w-full" fill="none">
        <defs>
          <linearGradient id="beam-main" x1="180" y1="200" x2="180" y2="520" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00e0ff" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#00bbdd" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#006699" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#003355" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beam-core" x1="180" y1="200" x2="180" y2="480" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="20%" stopColor="#00eeff" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#00aacc" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#006688" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="cloud-glow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#00aadd" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#004466" stopOpacity="0" />
          </radialGradient>
          <filter id="lightning-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Cloud outline - dotted particle style */}
        <ellipse cx="180" cy="110" rx="110" ry="60" fill="none" stroke="#00aadd" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.5" />
        <ellipse cx="130" cy="100" rx="50" ry="35" fill="none" stroke="#0099cc" strokeWidth="1" strokeDasharray="3 5" opacity="0.4" />
        <ellipse cx="230" cy="100" rx="45" ry="30" fill="none" stroke="#0099cc" strokeWidth="1" strokeDasharray="3 5" opacity="0.4" />
        <ellipse cx="160" cy="80" rx="35" ry="25" fill="none" stroke="#00bbdd" strokeWidth="1" strokeDasharray="2 4" opacity="0.45" />
        <ellipse cx="200" cy="85" rx="40" ry="28" fill="none" stroke="#00bbdd" strokeWidth="1" strokeDasharray="2 4" opacity="0.45" />
        
        {/* Cloud inner glow */}
        <ellipse cx="180" cy="105" rx="90" ry="50" fill="url(#cloud-glow)" />
        
        {/* Scattered cloud particles */}
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i / 60) * Math.PI * 2
          const rx = 85 + Math.sin(angle * 2.5) * 25
          const ry = 45 + Math.cos(angle * 1.8) * 18
          const cx = 180 + Math.cos(angle) * rx
          const cy = 105 + Math.sin(angle) * ry
          const size = 1.2 + (i % 4) * 0.5
          const opacity = 0.25 + (i % 5) * 0.12
          return <circle key={`cp${i}`} cx={cx} cy={cy} r={size} fill="#00ccee" opacity={opacity} />
        })}
        {Array.from({ length: 25 }).map((_, i) => {
          const cx = 140 + (i % 8) * 12 + Math.sin(i) * 8
          const cy = 85 + Math.floor(i / 8) * 15 + Math.cos(i) * 6
          return <circle key={`ci${i}`} cx={cx} cy={cy} r={1 + (i % 3) * 0.4} fill="#00ddff" opacity={0.2 + (i % 4) * 0.08} />
        })}

        {/* Lightning bolt - large and bright */}
        <g filter="url(#lightning-glow)">
          <path d="M195 40 L145 115 H180 L130 210 L215 105 H175 L195 40Z" fill="#00ddff" />
          <path d="M195 40 L145 115 H180 L130 210 L215 105 H175 L195 40Z" fill="white" opacity="0.7" />
          <path d="M190 50 L150 112 H178 L140 190 L205 108 H172 L190 50Z" fill="white" opacity="0.4" />
        </g>

        {/* Light beam - wide cone */}
        <path d="M140 200 L40 500 H320 L220 200 Z" fill="url(#beam-main)" />
        
        {/* Center bright beam */}
        <path d="M165 200 L155 480 H205 L195 200 Z" fill="url(#beam-core)" />
        
        {/* Beam edge highlights */}
        <line x1="140" y1="200" x2="40" y2="500" stroke="#00ccff" strokeWidth="1" opacity="0.3" />
        <line x1="220" y1="200" x2="320" y2="500" stroke="#00ccff" strokeWidth="1" opacity="0.3" />

        {/* Concentric rings - many layers */}
        {[160, 140, 120, 100, 80, 60, 45, 30, 18].map((rx, i) => (
          <ellipse 
            key={`ring${i}`} 
            cx="180" 
            cy="490" 
            rx={rx} 
            ry={rx * 0.2} 
            fill="none" 
            stroke={i < 3 ? "#003a55" : i < 6 ? "#006688" : "#00aacc"} 
            strokeWidth={0.5 + i * 0.12} 
            opacity={0.2 + i * 0.07}
          />
        ))}
        <ellipse cx="180" cy="490" rx="10" ry="2" fill="#00ddff" opacity="0.35" />
        
        {/* Ring glow */}
        <ellipse cx="180" cy="490" rx="100" ry="20" fill="#00aadd" opacity="0.06" />
      </svg>
    </div>
  )
}

// Right holographic screens
function RightDecoration() {
  return (
    <div className="pointer-events-none absolute bottom-[5%] right-[1%] hidden h-[560px] w-[380px] lg:block xl:right-[3%]">
      <svg viewBox="0 0 380 560" className="h-full w-full" fill="none">
        <defs>
          <linearGradient id="screen-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a2545" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#051020" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="cube-top" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00bbdd" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00eeff" stopOpacity="0.1" />
          </linearGradient>
          <filter id="screen-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Back screen (top right, more tilted) */}
        <g transform="translate(200, 20) skewY(-10) rotate(8)">
          <rect x="0" y="0" width="150" height="110" rx="4" fill="url(#screen-fill)" stroke="#0099cc" strokeWidth="1.5" filter="url(#screen-glow)" />
          {/* Pie chart */}
          <circle cx="45" cy="48" r="30" fill="none" stroke="#004466" strokeWidth="1" />
          <path d="M45 18 A30 30 0 0 1 72 63 L45 48 Z" fill="#00ddff" opacity="0.7" />
          <path d="M72 63 A30 30 0 0 1 20 63 L45 48 Z" fill="#0099cc" opacity="0.6" />
          <path d="M20 63 A30 30 0 0 1 45 18 L45 48 Z" fill="#00bbee" opacity="0.5" />
          <circle cx="45" cy="48" r="12" fill="#0a1825" />
          {/* Data lines */}
          <rect x="90" y="22" width="48" height="8" rx="2" fill="#00aacc" opacity="0.5" />
          <rect x="90" y="38" width="38" height="8" rx="2" fill="#0088aa" opacity="0.45" />
          <rect x="90" y="54" width="44" height="8" rx="2" fill="#00aacc" opacity="0.5" />
          <rect x="90" y="70" width="32" height="8" rx="2" fill="#0088aa" opacity="0.45" />
          <rect x="90" y="86" width="40" height="8" rx="2" fill="#00aacc" opacity="0.5" />
        </g>

        {/* Main front screen (larger, center-left) */}
        <g transform="translate(30, 100)">
          <rect x="0" y="0" width="210" height="155" rx="5" fill="url(#screen-fill)" stroke="#00bbdd" strokeWidth="2" filter="url(#screen-glow)" />
          {/* Chart area */}
          <rect x="15" y="15" width="105" height="75" rx="3" fill="none" stroke="#004466" strokeWidth="0.8" />
          {/* Bar chart */}
          <rect x="28" y="62" width="14" height="22" rx="1" fill="#00bbdd" opacity="0.65" />
          <rect x="48" y="45" width="14" height="39" rx="1" fill="#00ddff" opacity="0.75" />
          <rect x="68" y="52" width="14" height="32" rx="1" fill="#00bbdd" opacity="0.65" />
          <rect x="88" y="38" width="14" height="46" rx="1" fill="#00eeff" opacity="0.8" />
          {/* Axis */}
          <line x1="22" y1="84" x2="115" y2="84" stroke="#006688" strokeWidth="0.8" />
          <line x1="22" y1="40" x2="22" y2="84" stroke="#006688" strokeWidth="0.8" />
          {/* Right side stats */}
          <rect x="135" y="20" width="62" height="10" rx="2" fill="#0099bb" opacity="0.55" />
          <rect x="135" y="38" width="50" height="10" rx="2" fill="#0088aa" opacity="0.5" />
          <rect x="135" y="56" width="56" height="10" rx="2" fill="#0099bb" opacity="0.55" />
          <rect x="135" y="74" width="45" height="10" rx="2" fill="#0088aa" opacity="0.5" />
          {/* Bottom data rows */}
          <rect x="15" y="105" width="180" height="12" rx="2" fill="#004466" opacity="0.35" />
          <rect x="15" y="125" width="150" height="12" rx="2" fill="#003a55" opacity="0.3" />
        </g>

        {/* Small side screen */}
        <g transform="translate(250, 175) rotate(8)">
          <rect x="0" y="0" width="100" height="75" rx="3" fill="url(#screen-fill)" stroke="#0099bb" strokeWidth="1" filter="url(#screen-glow)" />
          {/* Mini donut chart */}
          <circle cx="28" cy="38" r="18" fill="none" stroke="#006688" strokeWidth="6" />
          <circle cx="28" cy="38" r="18" fill="none" stroke="#00ddff" strokeWidth="6" strokeDasharray="40 73" opacity="0.7" />
          <circle cx="28" cy="38" r="18" fill="none" stroke="#00aacc" strokeWidth="6" strokeDasharray="25 88" strokeDashoffset="-40" opacity="0.6" />
          {/* Mini text */}
          <rect x="55" y="22" width="36" height="7" rx="1" fill="#0099aa" opacity="0.5" />
          <rect x="55" y="35" width="28" height="7" rx="1" fill="#0088aa" opacity="0.45" />
          <rect x="55" y="48" width="32" height="7" rx="1" fill="#0099aa" opacity="0.5" />
        </g>

        {/* Isometric 3D cube */}
        <g transform="translate(100, 320)">
          {/* Cube faces */}
          <path d="M90 0 L180 45 L90 90 L0 45 Z" fill="url(#cube-top)" stroke="#00ddff" strokeWidth="1.2" />
          <path d="M0 45 L90 90 L90 170 L0 125 Z" fill="#002838" fillOpacity="0.5" stroke="#00bbdd" strokeWidth="1" />
          <path d="M180 45 L90 90 L90 170 L180 125 Z" fill="#001a28" fillOpacity="0.4" stroke="#00ccee" strokeWidth="1" />
          
          {/* Wireframe internal lines */}
          <line x1="45" y1="22.5" x2="45" y2="102.5" stroke="#00aacc" strokeWidth="0.6" strokeDasharray="4 4" opacity="0.4" />
          <line x1="135" y1="22.5" x2="135" y2="102.5" stroke="#00aacc" strokeWidth="0.6" strokeDasharray="4 4" opacity="0.4" />
          <line x1="90" y1="45" x2="90" y2="125" stroke="#00bbdd" strokeWidth="0.7" strokeDasharray="4 4" opacity="0.5" />
          <line x1="45" y1="67.5" x2="135" y2="67.5" stroke="#00aacc" strokeWidth="0.6" strokeDasharray="4 4" opacity="0.4" />
          
          {/* Corner glow points */}
          <circle cx="90" cy="0" r="4" fill="#00eeff" opacity="0.85">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="0" cy="45" r="3" fill="#00ddff" opacity="0.6" />
          <circle cx="180" cy="45" r="3" fill="#00ddff" opacity="0.6" />
          <circle cx="90" cy="90" r="3.5" fill="#00eeff" opacity="0.7" />
          <circle cx="0" cy="125" r="2.5" fill="#00ccdd" opacity="0.5" />
          <circle cx="180" cy="125" r="2.5" fill="#00ccdd" opacity="0.5" />
          <circle cx="90" cy="170" r="3" fill="#00ddff" opacity="0.6" />

          {/* Platform rings below */}
          <ellipse cx="90" cy="195" rx="120" ry="25" fill="none" stroke="#003344" strokeWidth="0.6" opacity="0.25" />
          <ellipse cx="90" cy="195" rx="95" ry="20" fill="none" stroke="#004455" strokeWidth="0.7" opacity="0.3" />
          <ellipse cx="90" cy="195" rx="70" ry="15" fill="none" stroke="#006677" strokeWidth="0.8" opacity="0.35" />
          <ellipse cx="90" cy="195" rx="45" ry="10" fill="none" stroke="#0088aa" strokeWidth="1" opacity="0.4" />
          <ellipse cx="90" cy="195" rx="22" ry="5" fill="#00aacc" opacity="0.2" />
        </g>

        {/* Data flow lines */}
        <path d="M140 270 L110 310" stroke="#006688" strokeWidth="1" strokeDasharray="5 5" opacity="0.4" />
        <path d="M200 265 L170 305" stroke="#005577" strokeWidth="1" strokeDasharray="5 5" opacity="0.35" />
      </svg>
    </div>
  )
}

// Background
function Background() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Deep gradient base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#061a2e] via-[#030c14] to-[#010406]" />
      
      {/* Top arc highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-10%,#0a2848_0%,transparent_55%)]" />
      
      {/* Center subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,transparent_20%,#010306_100%)]" />

      {/* Circuit board pattern - bottom layer */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="circuit" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M10 10 H40 V30 H60 V10 H90" fill="none" stroke="#00ccff" strokeWidth="0.5" />
            <path d="M10 50 H30 V70 H50 V50 H70 V90" fill="none" stroke="#00ccff" strokeWidth="0.5" />
            <path d="M90 30 V60 H70 V90" fill="none" stroke="#00ccff" strokeWidth="0.5" />
            <circle cx="10" cy="10" r="2" fill="#00ddff" />
            <circle cx="40" cy="30" r="2" fill="#00ddff" />
            <circle cx="90" cy="10" r="2" fill="#00ddff" />
            <circle cx="30" cy="70" r="2" fill="#00ddff" />
            <circle cx="70" cy="90" r="2" fill="#00ddff" />
            <rect x="58" y="48" width="4" height="4" fill="#00ccff" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>

      {/* Hexagon grid pattern */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hex-pattern" width="60" height="104" patternUnits="userSpaceOnUse" patternTransform="scale(1.5)">
            <path d="M30 0 L60 17 L60 52 L30 69 L0 52 L0 17 Z" fill="none" stroke="#00aadd" strokeWidth="0.4" />
            <path d="M30 35 L60 52 L60 87 L30 104 L0 87 L0 52 Z" fill="none" stroke="#00aadd" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex-pattern)" />
      </svg>
      
      {/* Perspective grid - bottom area full width */}
      <svg className="absolute bottom-0 left-0 right-0 h-[400px] opacity-[0.08]" viewBox="0 0 1600 400" preserveAspectRatio="xMidYMax slice" fill="none">
        <defs>
          <linearGradient id="grid-fade-h" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00ccee" stopOpacity="0" />
            <stop offset="20%" stopColor="#00ccee" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#00ccee" stopOpacity="1" />
            <stop offset="80%" stopColor="#00ccee" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#00ccee" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="grid-fade-v" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#00ccee" stopOpacity="1" />
            <stop offset="40%" stopColor="#00ccee" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#00ccee" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Horizontal lines with perspective */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => {
          const y = 400 - i * 28 - i * i * 0.8
          return <line key={`h${i}`} x1={0} y1={y} x2={1600} y2={y} stroke="url(#grid-fade-h)" strokeWidth={0.3 + i * 0.05} />
        })}
        {/* Vertical lines converging to center */}
        {Array.from({ length: 25 }).map((_, i) => {
          const baseX = i * 70 - 50
          const topX = 800 + (baseX - 800) * 0.3
          return <line key={`v${i}`} x1={baseX} y1={400} x2={topX} y2={50} stroke="url(#grid-fade-v)" strokeWidth="0.3" />
        })}
        {/* Center glow on horizon */}
        <ellipse cx="800" cy="60" rx="200" ry="30" fill="#00ddff" opacity="0.05" />
      </svg>

      {/* Radar scan effect - left bottom */}
      <svg className="absolute bottom-[10%] left-[5%] h-[300px] w-[300px] opacity-30" viewBox="0 0 200 200" fill="none">
        <defs>
          <linearGradient id="radar-sweep" x1="50%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#00ddff" stopOpacity="0" />
            <stop offset="100%" stopColor="#00ddff" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="80" fill="none" stroke="#004466" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="60" fill="none" stroke="#004466" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="40" fill="none" stroke="#004466" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="20" fill="none" stroke="#004466" strokeWidth="0.5" />
        <line x1="100" y1="20" x2="100" y2="180" stroke="#003344" strokeWidth="0.3" />
        <line x1="20" y1="100" x2="180" y2="100" stroke="#003344" strokeWidth="0.3" />
        <path d="M100 100 L100 20 A80 80 0 0 1 180 100 Z" fill="url(#radar-sweep)">
          <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="6s" repeatCount="indefinite" />
        </path>
        <circle cx="100" cy="100" r="3" fill="#00ddff" opacity="0.6" />
        {/* Radar blips */}
        <circle cx="130" cy="70" r="2" fill="#00ffff" opacity="0">
          <animate attributeName="opacity" values="0;0.8;0" dur="6s" repeatCount="indefinite" begin="1s" />
        </circle>
        <circle cx="75" cy="130" r="1.5" fill="#00ffff" opacity="0">
          <animate attributeName="opacity" values="0;0.6;0" dur="6s" repeatCount="indefinite" begin="3s" />
        </circle>
      </svg>

      {/* Scanning line animation */}
      <div className="absolute left-0 right-0 h-[1px] animate-[scan_8s_linear_infinite] bg-gradient-to-r from-transparent via-[#00ddff]/40 to-transparent shadow-[0_0_20px_2px_rgba(0,220,255,0.3)]" />
      
      {/* Energy wave rings - center */}
      <svg className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 opacity-[0.04]" viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="50" stroke="#00ddff" strokeWidth="0.5" opacity="0.5">
          <animate attributeName="r" values="50;180;50" dur="10s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="10s" repeatCount="indefinite" />
        </circle>
        <circle cx="200" cy="200" r="80" stroke="#00bbdd" strokeWidth="0.5" opacity="0.4">
          <animate attributeName="r" values="80;200;80" dur="12s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur="12s" repeatCount="indefinite" />
        </circle>
        <circle cx="200" cy="200" r="120" stroke="#0099cc" strokeWidth="0.5" opacity="0.3">
          <animate attributeName="r" values="120;190;120" dur="8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0;0.3" dur="8s" repeatCount="indefinite" />
        </circle>
      </svg>
      
      {/* Data flow lines - left side */}
      <svg className="absolute left-0 top-0 h-full w-[250px] opacity-30" viewBox="0 0 250 1000" fill="none">
        <defs>
          <linearGradient id="flow-line-1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00ddff" stopOpacity="0" />
            <stop offset="50%" stopColor="#00ddff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00ddff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M30 0 Q60 200, 40 400 T50 700 T35 1000" stroke="#003355" strokeWidth="0.5" fill="none" />
        <path d="M80 0 Q60 300, 90 500 T70 800 T85 1000" stroke="#003355" strokeWidth="0.5" fill="none" />
        <path d="M140 0 Q120 250, 150 500 T130 800 T145 1000" stroke="#003355" strokeWidth="0.5" fill="none" />
        {/* Moving particles on lines */}
        <circle cx="40" cy="0" r="3" fill="#00eeff">
          <animate attributeName="cy" values="0;1000" dur="8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" dur="8s" repeatCount="indefinite" keyTimes="0;0.1;0.9;1" />
        </circle>
        <circle cx="80" cy="0" r="2" fill="#00ddff">
          <animate attributeName="cy" values="0;1000" dur="10s" repeatCount="indefinite" begin="2s" />
          <animate attributeName="opacity" values="0;0.8;0.8;0" dur="10s" repeatCount="indefinite" begin="2s" keyTimes="0;0.1;0.9;1" />
        </circle>
        <circle cx="140" cy="0" r="2.5" fill="#00ccff">
          <animate attributeName="cy" values="0;1000" dur="12s" repeatCount="indefinite" begin="4s" />
          <animate attributeName="opacity" values="0;0.7;0.7;0" dur="12s" repeatCount="indefinite" begin="4s" keyTimes="0;0.1;0.9;1" />
        </circle>
      </svg>

      {/* Data flow lines - right side */}
      <svg className="absolute right-0 top-0 h-full w-[250px] opacity-30" viewBox="0 0 250 1000" fill="none">
        <path d="M220 0 Q190 200, 210 400 T200 700 T215 1000" stroke="#003355" strokeWidth="0.5" fill="none" />
        <path d="M170 0 Q190 300, 160 500 T180 800 T165 1000" stroke="#003355" strokeWidth="0.5" fill="none" />
        <path d="M110 0 Q130 250, 100 500 T120 800 T105 1000" stroke="#003355" strokeWidth="0.5" fill="none" />
        <circle cx="210" cy="1000" r="3" fill="#00eeff">
          <animate attributeName="cy" values="1000;0" dur="9s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" dur="9s" repeatCount="indefinite" keyTimes="0;0.1;0.9;1" />
        </circle>
        <circle cx="165" cy="1000" r="2" fill="#00ddff">
          <animate attributeName="cy" values="1000;0" dur="11s" repeatCount="indefinite" begin="3s" />
          <animate attributeName="opacity" values="0;0.8;0.8;0" dur="11s" repeatCount="indefinite" begin="3s" keyTimes="0;0.1;0.9;1" />
        </circle>
      </svg>
      
      {/* Particles - multi-layered with varied animations */}
      <svg className="absolute inset-0 h-full w-full">
        {/* Star-like bright particles */}
        {Array.from({ length: 15 }).map((_, i) => {
          const x = 10 + ((i * 53) % 80)
          const y = 10 + ((i * 67) % 80)
          const dur = 2 + (i % 3)
          return (
            <g key={`star${i}`}>
              <circle cx={`${x}%`} cy={`${y}%`} r={1} fill="#ffffff" opacity={0.4}>
                <animate attributeName="opacity" values="0.2;0.6;0.2" dur={`${dur}s`} repeatCount="indefinite" />
              </circle>
              <circle cx={`${x}%`} cy={`${y}%`} r={3} fill="#00ddff" opacity={0.1}>
                <animate attributeName="opacity" values="0.05;0.15;0.05" dur={`${dur}s`} repeatCount="indefinite" />
              </circle>
            </g>
          )
        })}
        {/* Medium floating particles */}
        {Array.from({ length: 50 }).map((_, i) => {
          const x = 2 + ((i * 41) % 96)
          const y = 2 + ((i * 53) % 96)
          const size = 0.5 + (i % 4) * 0.3
          const opacity = 0.1 + (i % 5) * 0.04
          return <circle key={`md${i}`} cx={`${x}%`} cy={`${y}%`} r={size} fill="#00d4ff" opacity={opacity} />
        })}
        {/* Tiny dust particles */}
        {Array.from({ length: 80 }).map((_, i) => {
          const x = 1 + ((i * 37) % 98)
          const y = 1 + ((i * 47) % 98)
          return <circle key={`tiny${i}`} cx={`${x}%`} cy={`${y}%`} r={0.3} fill="#88ddff" opacity={0.15 + (i % 3) * 0.05} />
        })}
      </svg>

      {/* Tech corner decorations - enhanced */}
      <svg className="absolute left-6 top-24 h-32 w-32 opacity-25" viewBox="0 0 120 120" fill="none">
        <path d="M0 30 L30 30 L30 0" stroke="#00ccee" strokeWidth="1.5" />
        <path d="M0 50 L50 50 L50 0" stroke="#006688" strokeWidth="0.8" />
        <path d="M0 70 L70 70 L70 0" stroke="#004466" strokeWidth="0.5" />
        <circle cx="30" cy="30" r="3" fill="#00eeff">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <rect x="26" y="26" width="8" height="8" fill="none" stroke="#00aacc" strokeWidth="0.5" opacity="0.5" />
      </svg>
      <svg className="absolute bottom-24 right-6 h-32 w-32 opacity-25" viewBox="0 0 120 120" fill="none">
        <path d="M120 90 L90 90 L90 120" stroke="#00ccee" strokeWidth="1.5" />
        <path d="M120 70 L70 70 L70 120" stroke="#006688" strokeWidth="0.8" />
        <path d="M120 50 L50 50 L50 120" stroke="#004466" strokeWidth="0.5" />
        <circle cx="90" cy="90" r="3" fill="#00eeff">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <rect x="86" y="86" width="8" height="8" fill="none" stroke="#00aacc" strokeWidth="0.5" opacity="0.5" />
      </svg>

      {/* Binary code decoration - subtle */}
      <div className="absolute right-[8%] top-[20%] font-mono text-[8px] leading-tight tracking-wider text-[#00aacc]/10">
        <div>01001010</div>
        <div>10110101</div>
        <div>01100110</div>
        <div>10011001</div>
      </div>
      <div className="absolute left-[8%] bottom-[25%] font-mono text-[8px] leading-tight tracking-wider text-[#00aacc]/10">
        <div>11010010</div>
        <div>00101101</div>
        <div>10010110</div>
      </div>
      
      {/* Ambient glows - refined */}
      <div className="absolute -left-[15%] top-[10%] h-[900px] w-[900px] rounded-full bg-[radial-gradient(circle,rgba(0,80,120,0.15)_0%,transparent_50%)]" />
      <div className="absolute -right-[10%] top-[20%] h-[800px] w-[800px] rounded-full bg-[radial-gradient(circle,rgba(0,120,160,0.1)_0%,transparent_50%)]" />
      <div className="absolute bottom-[5%] left-[40%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,180,220,0.06)_0%,transparent_55%)]" />
      
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
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
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#040a12] text-white">
      <Background />
      <TopDecorations />

      {/* Header */}
      <header className="relative z-10 flex flex-col items-center pt-5 sm:pt-6">
        <div className="flex items-center gap-3">
          <EnerCloudIcon className="h-12 w-12 sm:h-14 sm:w-14" />
          <span className="text-[1.9rem] font-semibold tracking-[0.15em] text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.25)] sm:text-[2.2rem]">
            {BRAND}
          </span>
        </div>
        <p className="mt-1.5 text-[10px] font-medium tracking-[0.45em] text-[#00d4ff] sm:text-[11px]">
          {copy.subtitle}
        </p>
      </header>

      {/* Content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <LeftDecoration />
        <RightDecoration />

        {/* Login card */}
        <div className="relative w-full max-w-[420px]">
          {/* Outer glow */}
          <div className="absolute -inset-5 rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(0,140,200,0.06)_0%,transparent_65%)]" />

          {/* Card */}
          <div
            className="relative overflow-hidden bg-[#0b1525]/95 shadow-[0_0_80px_rgba(0,100,160,0.08),inset_0_1px_0_rgba(0,180,220,0.12)]"
            style={{
              clipPath: "polygon(24px 0%, calc(100% - 24px) 0%, 100% 24px, 100% calc(100% - 24px), calc(100% - 24px) 100%, 24px 100%, 0% calc(100% - 24px), 0% 24px)",
            }}
          >
            {/* Border */}
            <div
              className="pointer-events-none absolute inset-0 border border-[#00a0c8]/35"
              style={{
                clipPath: "polygon(24px 0%, calc(100% - 24px) 0%, 100% 24px, 100% calc(100% - 24px), calc(100% - 24px) 100%, 24px 100%, 0% calc(100% - 24px), 0% 24px)",
              }}
            />

            {/* Corner accents - top */}
            <div className="pointer-events-none absolute left-0 top-[24px] h-[40px] w-[2.5px] bg-gradient-to-b from-[#00eeff] to-transparent" />
            <div className="pointer-events-none absolute left-[24px] top-0 h-[2.5px] w-[40px] bg-gradient-to-r from-[#00eeff] to-transparent" />
            <div className="pointer-events-none absolute right-0 top-[24px] h-[40px] w-[2.5px] bg-gradient-to-b from-[#00eeff] to-transparent" />
            <div className="pointer-events-none absolute right-[24px] top-0 h-[2.5px] w-[40px] bg-gradient-to-l from-[#00eeff] to-transparent" />
            
            {/* Corner accents - bottom */}
            <div className="pointer-events-none absolute bottom-[24px] left-0 h-[40px] w-[2px] bg-gradient-to-t from-[#00aacc]/60 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-[24px] h-[2px] w-[40px] bg-gradient-to-r from-[#00aacc]/60 to-transparent" />
            <div className="pointer-events-none absolute bottom-[24px] right-0 h-[40px] w-[2px] bg-gradient-to-t from-[#00aacc]/60 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 right-[24px] h-[2px] w-[40px] bg-gradient-to-l from-[#00aacc]/60 to-transparent" />

            {/* Top highlight */}
            <div className="pointer-events-none absolute left-[20%] right-[20%] top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ddff]/70 to-transparent" />

            {/* Content */}
            <div className="relative z-10 px-10 py-10 sm:px-12 sm:py-11">
              {/* Language toggle */}
              <div className="flex justify-center">
                <div className="flex overflow-hidden rounded border border-[#1a4060]/90 bg-[#071018]">
                  {LANGUAGE_OPTIONS.map((option) => {
                    const active = locale === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setLanguage(option.key)}
                        className={cn(
                          "min-w-[48px] px-4 py-1.5 text-[13px] font-medium transition-all",
                          active
                            ? "bg-[#1a70ff] text-white shadow-[0_0_14px_rgba(26,112,255,0.45)]"
                            : "text-[#5090b0] hover:text-[#88ccee]"
                        )}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Welcome */}
              <div className="mt-10 text-center">
                <h1 className="text-[2.1rem] font-bold tracking-[0.12em] text-white sm:text-[2.4rem]">
                  {copy.welcome}
                </h1>
                <p className="mt-2 text-[11px] tracking-[0.4em] text-[#5a8899]">
                  {copy.welcomeSub}
                </p>
              </div>

              {/* Form */}
              <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
                {/* Username */}
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#4080a8]" strokeWidth={1.5} />
                  <input
                    value={account}
                    onChange={(e) => {
                      setAccount(e.target.value)
                      setSubmitError(null)
                    }}
                    placeholder={copy.accountPlaceholder}
                    autoComplete="username"
                    spellCheck={false}
                    required
                    className="h-[54px] w-full rounded border border-[#1a3555]/90 bg-[#091825] pl-12 pr-4 text-[14px] text-[#c8e0f0] outline-none transition-all placeholder:text-[#3a5a75] focus:border-[#00aace]/60 focus:bg-[#0c1d2d] focus:shadow-[0_0_18px_rgba(0,160,200,0.1)]"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#4080a8]" strokeWidth={1.5} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setSubmitError(null)
                    }}
                    placeholder={copy.passwordPlaceholder}
                    autoComplete="current-password"
                    required
                    className="h-[54px] w-full rounded border border-[#1a3555]/90 bg-[#091825] pl-12 pr-12 text-[14px] text-[#c8e0f0] outline-none transition-all placeholder:text-[#3a5a75] focus:border-[#00aace]/60 focus:bg-[#0c1d2d] focus:shadow-[0_0_18px_rgba(0,160,200,0.1)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4080a8] transition-colors hover:text-[#88ccee]"
                    aria-label={locale === "zh" ? "切换密码显示" : "Toggle password visibility"}
                  >
                    {showPassword ? <Eye className="h-5 w-5" strokeWidth={1.5} /> : <EyeOff className="h-5 w-5" strokeWidth={1.5} />}
                  </button>
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between text-[13px]">
                  <label className="flex cursor-pointer items-center gap-2.5 text-[#6090a8]">
                    <div className="relative flex h-[16px] w-[16px] items-center justify-center">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="peer h-full w-full cursor-pointer appearance-none rounded-[3px] border border-[#2a5070] bg-transparent transition-all checked:border-[#00aacc] checked:bg-[#00aacc]"
                      />
                      <svg className="pointer-events-none absolute h-2.5 w-2.5 opacity-0 peer-checked:opacity-100" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span>{copy.remember}</span>
                  </label>
                  <button type="button" className="text-[#00ccff] transition-colors hover:text-[#66e0ff]">
                    {copy.forgot}
                  </button>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="group mt-5 flex h-[54px] w-full items-center justify-center gap-2.5 rounded border-0 bg-gradient-to-r from-[#00a0c8] via-[#00c8e8] to-[#0088b8] text-[15px] font-semibold tracking-[0.15em] text-white shadow-[0_0_30px_rgba(0,180,220,0.28)] transition-all hover:shadow-[0_0_40px_rgba(0,200,240,0.38)] disabled:opacity-70"
                >
                  <span>{submitting ? `${copy.submit}...` : copy.submit}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
                </Button>

                {/* Error */}
                {submitError && (
                  <div className="rounded border border-[#662222]/50 bg-[#1a0a0a]/70 px-4 py-3 text-[13px] text-[#ffaaaa]">
                    {submitError}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
