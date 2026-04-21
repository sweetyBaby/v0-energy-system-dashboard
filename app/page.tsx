"use client"

import { startTransition, useState, useEffect, useRef } from "react"
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
  Wifi,
  Cpu,
  Database,
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
  { icon: Shield, titleZh: "系统状态", titleEn: "System Status", descZh: "系统运行状态总览", descEn: "System overview", value: "98.6%", status: "normal" },
  { icon: Battery, titleZh: "充放电统计", titleEn: "Charge Stats", descZh: "充放电量统计分析", descEn: "Charge analysis", value: "12.4MWh", status: "normal" },
  { icon: Activity, titleZh: "功率趋势", titleEn: "Power Trends", descZh: "功率变化趋势分析", descEn: "Power trend", value: "856kW", status: "active" },
  { icon: Gauge, titleZh: "能效分析", titleEn: "Energy Analysis", descZh: "能效指标分析", descEn: "Energy analysis", value: "94.2%", status: "normal" },
  { icon: PieChart, titleZh: "数据分析", titleEn: "Data Analysis", descZh: "多维数据分析", descEn: "Multi-dim analysis", value: "3.2TB", status: "normal" },
]

const RIGHT_MENU_ITEMS = [
  { icon: Bell, titleZh: "告警监测", titleEn: "Alerts", descZh: "告警信息实时监测", descEn: "Real-time alerts", value: "2条", status: "warning" },
  { icon: Monitor, titleZh: "实时监测", titleEn: "Monitoring", descZh: "设备实时运行监测", descEn: "Device monitoring", value: "在线", status: "active" },
  { icon: FileText, titleZh: "报表日志", titleEn: "Reports", descZh: "报表日志查看导出", descEn: "View & export", value: "128份", status: "normal" },
  { icon: Box, titleZh: "电芯矩阵", titleEn: "Cell Matrix", descZh: "电芯状态矩阵展示", descEn: "Cell matrix", value: "512节", status: "normal" },
  { icon: Clock, titleZh: "历史分析", titleEn: "History", descZh: "历史数据分析追溯", descEn: "History data", value: "365天", status: "normal" },
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

// ── Animated counter for status bar numbers ──────────────────────────────────
function LiveCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(value)
  useEffect(() => {
    const jitter = setInterval(() => {
      setDisplay(+(value + (Math.random() - 0.5) * value * 0.004).toFixed(1))
    }, 2000)
    return () => clearInterval(jitter)
  }, [value])
  return <>{display}{suffix}</>
}

// ── Top HUD bar ───────────────────────────────────────────────────────────────
function TopHUD() {
  const [time, setTime] = useState("")
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("zh-CN", { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
      {/* Outer frame line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#4ae8ff]/60 to-transparent" />

      {/* Notch structure */}
      <div className="relative flex h-9 items-stretch">
        {/* Left segment */}
        <div className="flex flex-1 items-center gap-4 border-b border-r border-[#4ae8ff]/20 bg-[#020810]/80 px-4 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <Wifi className="h-3 w-3 text-[#4ae8ff]" />
            <span className="font-mono text-[10px] text-[#4ae8ff]/70">NET</span>
            <span className="font-mono text-[10px] text-[#4ae8ff]">1.2Gbps</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3 w-3 text-[#4ae8ff]/70" />
            <span className="font-mono text-[10px] text-[#4ae8ff]"><LiveCounter value={23.4} suffix="%" /></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="h-3 w-3 text-[#4ae8ff]/70" />
            <span className="font-mono text-[10px] text-[#4ae8ff]"><LiveCounter value={68.2} suffix="%" /></span>
          </div>
        </div>

        {/* Center notch */}
        <div className="relative flex shrink-0 items-center justify-center">
          <svg viewBox="0 0 200 36" className="h-9 w-[200px]" preserveAspectRatio="none">
            <defs>
              <linearGradient id="notch-side" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(74,232,255,0.2)" />
                <stop offset="100%" stopColor="rgba(74,232,255,0.6)" />
              </linearGradient>
              <linearGradient id="notch-side-r" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="rgba(74,232,255,0.2)" />
                <stop offset="100%" stopColor="rgba(74,232,255,0.6)" />
              </linearGradient>
            </defs>
            <path d="M0,36 L0,0 L30,0 L50,36 Z" fill="#020810" stroke="rgba(74,232,255,0.4)" strokeWidth="0.5" />
            <path d="M200,36 L200,0 L170,0 L150,36 Z" fill="#020810" stroke="rgba(74,232,255,0.4)" strokeWidth="0.5" />
            <rect x="50" y="0" width="100" height="36" fill="#020810" />
            <line x1="50" y1="0" x2="150" y2="0" stroke="rgba(74,232,255,0.5)" strokeWidth="1" />
            {/* Mini bar chart */}
            {[0,1,2,3,4,5,6,7].map((i) => (
              <rect key={i} x={68 + i * 9} y={36 - 8 - (i % 3) * 5} width="5" height={8 + (i % 3) * 5}
                fill={`rgba(74,232,255,${0.3 + (i % 3) * 0.2})`}>
                <animate attributeName="height" values={`${8 + (i % 3) * 5};${12 + (i % 4) * 4};${8 + (i % 3) * 5}`}
                  dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
                <animate attributeName="y" values={`${36 - 8 - (i % 3) * 5};${36 - 12 - (i % 4) * 4};${36 - 8 - (i % 3) * 5}`}
                  dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
              </rect>
            ))}
          </svg>
        </div>

        {/* Right segment */}
        <div className="flex flex-1 items-center justify-end gap-4 border-b border-l border-[#4ae8ff]/20 bg-[#020810]/80 px-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00ff88]" />
            <span className="font-mono text-[10px] text-[#00ff88]">ONLINE</span>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-[#4ae8ff]">{time}</span>
          <span className="font-mono text-[10px] text-[#4ae8ff]/50">2026-04-21</span>
        </div>
      </div>
    </div>
  )
}

// ── Radar scan background element ────────────────────────────────────────────
function RadarScan() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
      <svg viewBox="0 0 600 600" className="h-[600px] w-[600px] opacity-[0.07]">
        <defs>
          <radialGradient id="radar-bg" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgba(74,232,255,0.1)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        {[60, 120, 180, 240, 300].map((r) => (
          <circle key={r} cx="300" cy="300" r={r} fill="none" stroke="#4ae8ff" strokeWidth="0.8" />
        ))}
        <line x1="300" y1="0" x2="300" y2="600" stroke="#4ae8ff" strokeWidth="0.5" />
        <line x1="0" y1="300" x2="600" y2="300" stroke="#4ae8ff" strokeWidth="0.5" />
        <line x1="90" y1="90" x2="510" y2="510" stroke="#4ae8ff" strokeWidth="0.3" />
        <line x1="510" y1="90" x2="90" y2="510" stroke="#4ae8ff" strokeWidth="0.3" />
        {/* Sweep */}
        <path d="M300,300 L300,0 A300,300 0 0,1 600,300 Z" fill="url(#radar-bg)">
          <animateTransform attributeName="transform" type="rotate" from="0 300 300" to="360 300 300"
            dur="8s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  )
}

// ── Perspective grid floor ────────────────────────────────────────────────────
function PerspectiveGrid() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[45%] overflow-hidden">
      <svg viewBox="0 0 1400 400" className="h-full w-full" preserveAspectRatio="xMidYMax meet">
        <defs>
          <linearGradient id="grid-fade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(74,232,255,0)" />
            <stop offset="60%" stopColor="rgba(74,232,255,0.12)" />
            <stop offset="100%" stopColor="rgba(74,232,255,0.06)" />
          </linearGradient>
          <linearGradient id="horiz-fade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(74,232,255,0)" />
            <stop offset="15%" stopColor="rgba(74,232,255,0.25)" />
            <stop offset="50%" stopColor="rgba(74,232,255,0.4)" />
            <stop offset="85%" stopColor="rgba(74,232,255,0.25)" />
            <stop offset="100%" stopColor="rgba(74,232,255,0)" />
          </linearGradient>
          <mask id="grid-mask">
            <rect x="0" y="0" width="1400" height="400" fill="url(#grid-fade)" />
          </mask>
        </defs>
        {/* Perspective lines converging at vanishing point */}
        {Array.from({ length: 20 }, (_, i) => {
          const x = i * 75 - 10
          return <line key={i} x1={700} y1={0} x2={x} y2={400}
            stroke="rgba(74,232,255,0.3)" strokeWidth="0.6" mask="url(#grid-mask)" />
        })}
        {/* Horizontal lines */}
        {Array.from({ length: 12 }, (_, i) => {
          const y = (i + 1) * 33
          const spread = y * 0.9
          return <line key={i} x1={700 - spread} y1={y} x2={700 + spread} y2={y}
            stroke="url(#horiz-fade)" strokeWidth={0.4 + i * 0.04} />
        })}
        {/* Glow horizon line */}
        <line x1="0" y1="0" x2="1400" y2="0" stroke="rgba(74,232,255,0.35)" strokeWidth="1.5">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" />
        </line>
      </svg>
    </div>
  )
}

// ── City silhouette ───────────────────────────────────────────────────────────
function CitySilhouette() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[38%] overflow-hidden opacity-30">
      <svg viewBox="0 0 1400 280" className="h-full w-full" preserveAspectRatio="xMidYMax meet">
        <defs>
          <linearGradient id="city-glow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(74,232,255,0.5)" />
            <stop offset="100%" stopColor="rgba(20,80,140,0.1)" />
          </linearGradient>
          <filter id="city-blur">
            <feGaussianBlur stdDeviation="0.8" />
          </filter>
        </defs>
        {/* Left city block */}
        <g fill="rgba(10,40,80,0.9)" stroke="rgba(74,232,255,0.3)" strokeWidth="0.5">
          <rect x="0" y="180" width="30" height="100" />
          <rect x="25" y="150" width="22" height="130" />
          <rect x="40" y="120" width="18" height="160" />
          <rect x="52" y="90" width="24" height="190" />
          <rect x="68" y="140" width="16" height="140" />
          <rect x="78" y="100" width="28" height="180" />
          <rect x="98" y="130" width="14" height="150" />
          <rect x="105" y="70" width="20" height="210" />
          <rect x="118" y="110" width="26" height="170" />
          <rect x="136" y="150" width="18" height="130" />
          <rect x="147" y="120" width="22" height="160" />
          <rect x="162" y="160" width="16" height="120" />
          <rect x="172" y="90" width="30" height="190" />
          <rect x="194" y="130" width="20" height="150" />
          <rect x="208" y="160" width="14" height="120" />
          <rect x="218" y="80" width="26" height="200" />
          <rect x="236" y="140" width="18" height="140" />
          <rect x="248" y="110" width="24" height="170" />
          <rect x="264" y="150" width="16" height="130" />
          <rect x="274" y="100" width="22" height="180" />
          <rect x="288" y="130" width="18" height="150" />
          <rect x="300" y="160" width="30" height="120" />
          <rect x="320" y="100" width="20" height="180" />
          <rect x="334" y="140" width="16" height="140" />
          <rect x="344" y="170" width="22" height="110" />
          <rect x="360" y="120" width="18" height="160" />
          <rect x="372" y="150" width="28" height="130" />
          <rect x="392" y="110" width="20" height="170" />
          <rect x="406" y="160" width="16" height="120" />
        </g>
        {/* Right city block */}
        <g fill="rgba(10,40,80,0.9)" stroke="rgba(74,232,255,0.3)" strokeWidth="0.5">
          <rect x="994" y="160" width="16" height="120" />
          <rect x="1004" y="110" width="20" height="170" />
          <rect x="1018" y="150" width="28" height="130" />
          <rect x="1038" y="120" width="18" height="160" />
          <rect x="1050" y="170" width="22" height="110" />
          <rect x="1066" y="140" width="16" height="140" />
          <rect x="1076" y="100" width="20" height="180" />
          <rect x="1090" y="160" width="30" height="120" />
          <rect x="1112" y="130" width="18" height="150" />
          <rect x="1124" y="100" width="22" height="180" />
          <rect x="1138" y="150" width="16" height="130" />
          <rect x="1148" y="110" width="24" height="170" />
          <rect x="1164" y="140" width="18" height="140" />
          <rect x="1176" y="80" width="26" height="200" />
          <rect x="1194" y="160" width="14" height="120" />
          <rect x="1204" y="130" width="20" height="150" />
          <rect x="1218" y="90" width="30" height="190" />
          <rect x="1240" y="160" width="16" height="120" />
          <rect x="1250" y="120" width="22" height="160" />
          <rect x="1264" y="150" width="18" height="130" />
          <rect x="1276" y="110" width="26" height="170" />
          <rect x="1294" y="70" width="20" height="210" />
          <rect x="1308" y="130" width="14" height="150" />
          <rect x="1316" y="100" width="28" height="180" />
          <rect x="1336" y="140" width="16" height="140" />
          <rect x="1346" y="90" width="24" height="190" />
          <rect x="1362" y="120" width="18" height="160" />
          <rect x="1374" y="70" width="20" height="210" />
          <rect x="1388" y="150" width="22" height="130" />
          <rect x="1400" y="180" width="30" height="100" />
        </g>
        {/* Window lights - scattered random rects */}
        {[
          [60,84],[68,100],[80,106],[90,114],[108,76],[120,96],[130,86],[148,126],
          [174,96],[186,104],[200,106],[222,86],[240,100],[256,96],[280,106],[296,114],
          [308,106],[322,106],[346,108],[364,96],[378,88],[398,96],[406,116],
          [1002,76],[1014,96],[1026,88],[1042,96],[1054,116],[1070,100],[1082,106],
          [1094,116],[1116,100],[1126,106],[1140,100],[1150,116],[1168,100],[1178,86],
          [1208,136],[1222,96],[1242,116],[1252,126],[1266,100],[1280,106],[1298,76],
          [1310,96],[1318,106],[1338,100],[1350,96],[1366,86],[1378,76],[1390,96],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width={3} height={4} fill="rgba(74,232,255,0.6)">
            <animate attributeName="opacity" values="0.4;0.9;0.4"
              dur={`${1.2 + (i % 7) * 0.4}s`} begin={`${(i % 5) * 0.3}s`} repeatCount="indefinite" />
          </rect>
        ))}
        {/* Gradient overlay to fade buildings into floor */}
        <rect x="0" y="0" width="1400" height="280" fill="url(#city-glow)" />
      </svg>
    </div>
  )
}

// ── Holographic center platform ───────────────────────────────────────────────
function HoloPlatform() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-8">
      <div className="relative flex flex-col items-center">
        {/* Energy pillar rising from ground */}
        <svg viewBox="0 0 340 220" className="h-[220px] w-[340px]">
          <defs>
            <linearGradient id="pillar-v" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(74,232,255,0)" />
              <stop offset="30%" stopColor="rgba(74,232,255,0.08)" />
              <stop offset="70%" stopColor="rgba(74,232,255,0.25)" />
              <stop offset="100%" stopColor="rgba(180,250,255,0.7)" />
            </linearGradient>
            <linearGradient id="ring-h" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(74,232,255,0)" />
              <stop offset="25%" stopColor="rgba(74,232,255,0.7)" />
              <stop offset="50%" stopColor="rgba(180,250,255,1)" />
              <stop offset="75%" stopColor="rgba(74,232,255,0.7)" />
              <stop offset="100%" stopColor="rgba(74,232,255,0)" />
            </linearGradient>
            <filter id="holo-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="soft-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" /><feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Main energy beam */}
          <polygon points="162,0 178,0 200,210 140,210" fill="url(#pillar-v)" opacity="0.7">
            <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2s" repeatCount="indefinite" />
          </polygon>
          {/* Inner beam */}
          <polygon points="168,0 172,0 185,210 155,210" fill="rgba(210,250,255,0.4)" opacity="0.8">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
          </polygon>

          {/* Ellipse rings */}
          {[
            { rx: 155, ry: 13, cy: 205, w: 0.5, o: 0.2 },
            { rx: 135, ry: 11, cy: 200, w: 0.8, o: 0.3 },
            { rx: 112, ry: 9.5, cy: 195, w: 1.0, o: 0.45 },
            { rx: 90,  ry: 8,   cy: 190, w: 1.3, o: 0.6 },
            { rx: 68,  ry: 6,   cy: 185, w: 1.6, o: 0.75 },
            { rx: 45,  ry: 4,   cy: 180, w: 2.0, o: 0.9 },
          ].map((r, i) => (
            <ellipse key={i} cx="170" cy={r.cy} rx={r.rx} ry={r.ry}
              fill="none" stroke="url(#ring-h)" strokeWidth={r.w}
              filter={i >= 3 ? "url(#soft-glow)" : undefined}>
              <animate attributeName="ry" values={`${r.ry};${r.ry + 2};${r.ry}`}
                dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
            </ellipse>
          ))}

          {/* Center core glow */}
          <ellipse cx="170" cy="178" rx="28" ry="3.5" fill="rgba(180,250,255,0.8)"
            filter="url(#holo-glow)">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" />
          </ellipse>

          {/* Orbiting dots */}
          {[
            { r: 155, dur: "6s", size: 4 },
            { r: 112, dur: "4.5s", size: 3 },
            { r: 68, dur: "3s", size: 2.5 },
          ].map((o, i) => (
            <g key={i}>
              <circle r={o.size} fill="#4ae8ff" filter="url(#soft-glow)">
                <animateMotion dur={o.dur} repeatCount="indefinite" path={`M${170 - o.r},200 a${o.r},${o.r * 0.088} 0 1,1 ${o.r * 2},0 a${o.r},${o.r * 0.088} 0 1,1 -${o.r * 2},0`} />
              </circle>
            </g>
          ))}

          {/* Diamond markers on horizon */}
          {[20, 140, 320].map((x, i) => (
            <polygon key={i} points={`${x},198 ${x + 4},202 ${x},206 ${x - 4},202`}
              fill="none" stroke="#4ae8ff" strokeWidth="1" opacity={0.5 + i * 0.15}
              filter="url(#soft-glow)">
              <animate attributeName="opacity" values="0.4;1;0.4"
                dur={`${1.5 + i * 0.6}s`} repeatCount="indefinite" />
            </polygon>
          ))}
        </svg>
      </div>
    </div>
  )
}

// ── Corner HUD decoration ─────────────────────────────────────────────────────
function CornerHUD({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const sx = pos.includes("r") ? -1 : 1
  const sy = pos.includes("b") ? -1 : 1
  return (
    <div className={cn(
      "pointer-events-none absolute",
      pos.includes("t") ? "top-0" : "bottom-0",
      pos.includes("l") ? "left-0" : "right-0"
    )}>
      <svg viewBox="0 0 110 110" className="h-[110px] w-[110px]"
        style={{ transform: `scale(${sx},${sy})` }}>
        <defs>
          <linearGradient id={`chud-${pos}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(74,232,255,0.9)" />
            <stop offset="100%" stopColor="rgba(74,232,255,0.1)" />
          </linearGradient>
        </defs>
        {/* L-bracket */}
        <path d="M2,2 L70,2 L70,6 L6,6 L6,70 L2,70 Z" fill={`url(#chud-${pos})`} />
        {/* Inner detail lines */}
        <line x1="10" y1="10" x2="55" y2="10" stroke="rgba(74,232,255,0.3)" strokeWidth="1" />
        <line x1="10" y1="10" x2="10" y2="55" stroke="rgba(74,232,255,0.3)" strokeWidth="1" />
        <line x1="10" y1="18" x2="40" y2="18" stroke="rgba(74,232,255,0.15)" strokeWidth="0.5" />
        <line x1="18" y1="10" x2="18" y2="40" stroke="rgba(74,232,255,0.15)" strokeWidth="0.5" />
        {/* Active dot */}
        <circle cx="70" cy="4" r="3" fill="#4ae8ff">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="4" cy="70" r="3" fill="#4ae8ff">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2.5s" repeatCount="indefinite" />
        </circle>
        {/* Data dots */}
        <rect x="12" y="28" width="8" height="2" fill="rgba(74,232,255,0.5)" />
        <rect x="12" y="32" width="14" height="2" fill="rgba(74,232,255,0.3)" />
        <rect x="12" y="36" width="6" height="2" fill="rgba(74,232,255,0.4)" />
        <rect x="28" y="12" width="2" height="8" fill="rgba(74,232,255,0.5)" />
        <rect x="32" y="12" width="2" height="14" fill="rgba(74,232,255,0.3)" />
        <rect x="36" y="12" width="2" height="6" fill="rgba(74,232,255,0.4)" />
        {/* Dashed lines */}
        <line x1="10" y1="10" x2="55" y2="55" stroke="rgba(74,232,255,0.06)" strokeWidth="0.5" strokeDasharray="3,5" />
      </svg>
    </div>
  )
}

// ── Vertical data stream ──────────────────────────────────────────────────────
function DataStream({ x, dur, delay, up = false }: { x: string; dur: string; delay?: string; up?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-y-0" style={{ left: x }}>
      <svg className="h-full w-[2px]">
        <line x1="1" y1="0%" x2="1" y2="100%" stroke="rgba(74,232,255,0.08)" strokeWidth="1" />
        <circle r="2.5" fill="rgba(74,232,255,0.7)">
          <animate attributeName="cy" values={up ? "100%;0%" : "0%;100%"} dur={dur}
            begin={delay ?? "0s"} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.8;0.8;0" dur={dur}
            begin={delay ?? "0s"} repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon, title, description, value, status, direction = "left",
}: {
  icon: React.ElementType
  title: string
  description: string
  value: string
  status: "normal" | "active" | "warning"
  direction?: "left" | "right"
}) {
  const statusColor = status === "warning" ? "#ffaa00" : status === "active" ? "#00ff88" : "#4ae8ff"
  return (
    <div className={cn(
      "group relative flex cursor-pointer items-center gap-3 overflow-hidden px-3 py-2.5 transition-all duration-300",
      "border border-[#0d3a55]/70 bg-gradient-to-r",
      direction === "left"
        ? "from-[rgba(4,14,30,0.96)] to-[rgba(6,20,40,0.92)]"
        : "from-[rgba(6,20,40,0.92)] to-[rgba(4,14,30,0.96)]",
      "hover:border-[#4ae8ff]/50 hover:shadow-[0_0_20px_rgba(74,232,255,0.15),inset_0_0_15px_rgba(74,232,255,0.04)]",
    )}>
      {/* Top-edge glow on hover */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#4ae8ff]/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      {/* Scan shimmer */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#4ae8ff]/5 to-transparent opacity-0 transition-none group-hover:opacity-100"
        style={{ animation: "shimmer 1.5s infinite" }} />

      {/* Corner marks */}
      <div className={cn("pointer-events-none absolute top-0 h-2 w-2 border-t border-[#4ae8ff]/40",
        direction === "left" ? "left-0 border-l" : "right-0 border-r")} />
      <div className={cn("pointer-events-none absolute bottom-0 h-2 w-2 border-b border-[#4ae8ff]/40",
        direction === "left" ? "right-0 border-r" : "left-0 border-l")} />

      {/* Icon box */}
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center border border-[#174060]/70 bg-[rgba(6,20,44,0.9)]">
        <Icon className="h-4 w-4" style={{ color: statusColor, filter: `drop-shadow(0 0 5px ${statusColor}88)` }} />
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ background: `radial-gradient(circle, ${statusColor}15, transparent 70%)` }} />
      </div>

      {/* Text */}
      <div className={cn("min-w-0 flex-1", direction === "right" && "text-right")}>
        <div className="flex items-center gap-1.5" style={{ justifyContent: direction === "right" ? "flex-end" : "flex-start" }}>
          <span className="text-[13px] font-bold leading-none text-[#cceeff]">{title}</span>
          <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: statusColor, boxShadow: `0 0 6px ${statusColor}` }}>
            <div className="h-full w-full rounded-full animate-ping" style={{ backgroundColor: statusColor, opacity: 0.4 }} />
          </div>
        </div>
        <div className="mt-0.5 text-[11px] leading-none text-[#4a7890]">{description}</div>
      </div>

      {/* Value + chevron */}
      <div className={cn("flex shrink-0 items-center gap-1.5", direction === "right" && "flex-row-reverse")}>
        <span className="font-mono text-[12px] font-bold tabular-nums" style={{ color: statusColor }}>{value}</span>
        <ChevronRight className={cn("h-4 w-4 text-[#2a5870] transition-colors group-hover:text-[#4ae8ff]",
          direction === "right" && "rotate-180")} />
      </div>
    </div>
  )
}

// ── Background ────────────────────────────────────────────────────────────────
function BackgroundScene() {
  return (
    <>
      {/* Deep space base */}
      <div className="pointer-events-none absolute inset-0 bg-[#020810]" />
      {/* Radial vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(14,60,110,0.25),transparent)]" />
      {/* Fine grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{ backgroundImage: "linear-gradient(rgba(74,232,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(74,232,255,1) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />
      {/* Subtle diagonal lines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{ backgroundImage: "repeating-linear-gradient(45deg,rgba(74,232,255,1) 0,rgba(74,232,255,1) 1px,transparent 0,transparent 50%)", backgroundSize: "40px 40px" }} />

      <PerspectiveGrid />
      <CitySilhouette />
      <RadarScan />
      <HoloPlatform />

      {/* Ambient glows */}
      <div className="pointer-events-none absolute left-[15%] top-[30%] h-[500px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(14,70,160,0.12),transparent_65%)] blur-3xl" />
      <div className="pointer-events-none absolute right-[15%] top-[30%] h-[500px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(14,70,160,0.12),transparent_65%)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[350px] w-[700px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(74,232,255,0.08),transparent_65%)] blur-3xl" />

      {/* Vertical data streams */}
      <DataStream x="8%" dur="5s" />
      <DataStream x="14%" dur="7s" delay="1s" up />
      <DataStream x="86%" dur="6s" delay="0.5s" up />
      <DataStream x="92%" dur="4.5s" delay="2s" />

      {/* Corner HUDs */}
      <CornerHUD pos="tl" />
      <CornerHUD pos="tr" />
      <CornerHUD pos="bl" />
      <CornerHUD pos="br" />
    </>
  )
}

// ── Main login page ───────────────────────────────────────────────────────────
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
    <main className="relative h-[100dvh] overflow-hidden bg-[#020810] text-white">
      <BackgroundScene />

      {/* Global keyframes */}
      <style jsx global>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes scanDown {
          0%   { top: -2px; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes cardGlow {
          0%,100% { box-shadow: 0 0 20px rgba(74,232,255,0.18), inset 0 0 20px rgba(74,232,255,0.04); }
          50%      { box-shadow: 0 0 40px rgba(74,232,255,0.32), inset 0 0 35px rgba(74,232,255,0.07); }
        }
      `}</style>

      <TopHUD />

      <div className={cn(
        "relative z-10 flex h-full flex-col pt-9 transition-opacity duration-700",
        mounted ? "opacity-100" : "opacity-0"
      )}>
        {/* Brand header */}
        <header className="shrink-0 py-4">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-3">
              <EnerCloudIcon className="h-11 w-11 drop-shadow-[0_0_20px_rgba(74,232,255,0.7)]" />
              <div
                className="bg-clip-text text-[2.4rem] font-black leading-none tracking-wide text-transparent"
                style={{ backgroundImage: "linear-gradient(170deg,#ffffff 0%,#b8f4ff 35%,#4ae8ff 100%)", filter: "drop-shadow(0 0 20px rgba(74,232,255,0.35))" }}
              >
                {BRAND}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#4ae8ff]/60" />
              <span className="text-[12px] tracking-[0.4em] text-[#4ae8ff]/80">
                {locale === "zh" ? BRAND_SUBTITLE_ZH : BRAND_SUBTITLE_EN}
              </span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#4ae8ff]/60" />
            </div>
          </div>
        </header>

        {/* Three-column layout */}
        <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden px-3 py-1">
          <div className="flex w-full max-w-[1380px] items-start gap-4">

            {/* Left cards */}
            <div className="hidden w-[240px] shrink-0 flex-col gap-2 lg:flex xl:w-[260px]">
              {LEFT_MENU_ITEMS.map((item, i) => (
                <FeatureCard key={i} icon={item.icon}
                  title={locale === "zh" ? item.titleZh : item.titleEn}
                  description={locale === "zh" ? item.descZh : item.descEn}
                  value={item.value} status={item.status as "normal" | "active" | "warning"}
                  direction="left" />
              ))}
            </div>

            {/* Center login */}
            <div className="flex flex-1 flex-col items-center">
              <div className="relative w-full max-w-[400px]">
                {/* Outer ambient glow */}
                <div className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(74,232,255,0.12),transparent_55%)] blur-2xl" />

                {/* Card */}
                <div
                  className="relative overflow-hidden border border-[#1a5a8a]/60 bg-[linear-gradient(170deg,rgba(5,16,32,0.97),rgba(3,10,22,0.99))] px-7 py-6"
                  style={{
                    clipPath: "polygon(14px 0%,calc(100% - 14px) 0%,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0% calc(100% - 14px),0% 14px)",
                    animation: "cardGlow 5s ease-in-out infinite",
                  }}
                >
                  {/* Animated inner border */}
                  <div className="pointer-events-none absolute inset-[1px] border border-[#4ae8ff]/15"
                    style={{ clipPath: "polygon(14px 0%,calc(100% - 14px) 0%,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0% calc(100% - 14px),0% 14px)" }} />

                  {/* Scan line */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
                    <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#4ae8ff] to-transparent"
                      style={{ animation: "scanDown 6s linear infinite" }} />
                  </div>

                  {/* Corner accents */}
                  {[
                    "absolute left-2.5 top-2.5 h-4 w-4 border-l-[1.5px] border-t-[1.5px]",
                    "absolute right-2.5 top-2.5 h-4 w-4 border-r-[1.5px] border-t-[1.5px]",
                    "absolute bottom-2.5 left-2.5 h-4 w-4 border-b-[1.5px] border-l-[1.5px]",
                    "absolute bottom-2.5 right-2.5 h-4 w-4 border-b-[1.5px] border-r-[1.5px]",
                  ].map((cls, i) => (
                    <div key={i} className={`pointer-events-none ${cls} border-[#4ae8ff]/60`} />
                  ))}

                  {/* Lang toggle */}
                  <div className="flex">
                    <div className="flex overflow-hidden border border-[#163a55]/80 bg-[rgba(3,10,22,0.9)]">
                      {LANGUAGE_OPTIONS.map((opt) => {
                        const active = locale === opt.key
                        return (
                          <button key={opt.key} type="button" onClick={() => setLanguage(opt.key)}
                            className={cn(
                              "px-4 py-1.5 text-[12px] font-bold tracking-wider transition-all duration-200",
                              active
                                ? "bg-[rgba(14,70,120,0.7)] text-[#4ae8ff] shadow-[inset_0_0_12px_rgba(74,232,255,0.12)]"
                                : "text-[#4a7890] hover:text-[#80d8f8]"
                            )}>
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Welcome */}
                  <div className="mt-5 text-center">
                    <h1 className="text-[1.9rem] font-black tracking-widest text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.15)]">
                      {copy.welcome}
                    </h1>
                    <div className="mt-1 flex items-center justify-center gap-2">
                      <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#4ae8ff]/50" />
                      <p className="text-[11px] tracking-[0.3em] text-[#4ae8ff]/70">{copy.welcomeSub}</p>
                      <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#4ae8ff]/50" />
                    </div>
                  </div>

                  {/* Form */}
                  <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
                    {/* Username */}
                    <div className="relative">
                      <div className="pointer-events-none absolute left-0 top-0 bottom-0 flex items-center pl-3">
                        <User className="h-4 w-4 text-[#4ae8ff]/80 drop-shadow-[0_0_5px_rgba(74,232,255,0.5)]" />
                      </div>
                      <input
                        value={account}
                        onChange={(e) => { setAccount(e.target.value); setSubmitError(null) }}
                        placeholder={copy.accountPlaceholder}
                        required
                        className="h-11 w-full border border-[#163a55]/80 bg-[rgba(3,10,22,0.9)] pl-10 pr-4 text-[14px] text-[#e0f4ff] outline-none transition-all placeholder:text-[#3a6070] focus:border-[#4ae8ff]/60 focus:shadow-[0_0_16px_rgba(74,232,255,0.18),inset_0_0_12px_rgba(74,232,255,0.04)]"
                      />
                    </div>

                    {/* Password */}
                    <div className="relative">
                      <div className="pointer-events-none absolute left-0 top-0 bottom-0 flex items-center pl-3">
                        <LockKeyhole className="h-4 w-4 text-[#4ae8ff]/80 drop-shadow-[0_0_5px_rgba(74,232,255,0.5)]" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setSubmitError(null) }}
                        placeholder={copy.passwordPlaceholder}
                        required
                        className="h-11 w-full border border-[#163a55]/80 bg-[rgba(3,10,22,0.9)] pl-10 pr-11 text-[14px] text-[#e0f4ff] outline-none transition-all placeholder:text-[#3a6070] focus:border-[#4ae8ff]/60 focus:shadow-[0_0_16px_rgba(74,232,255,0.18),inset_0_0_12px_rgba(74,232,255,0.04)]"
                      />
                      <button type="button" onClick={() => setShowPassword(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3a6878] hover:text-[#4ae8ff] transition-colors">
                        {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Remember / forgot */}
                    <div className="flex items-center justify-between text-[12px]">
                      <label className="flex cursor-pointer items-center gap-2 text-[#5a8898] hover:text-[#80c8e0] transition-colors">
                        <input type="checkbox" checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="h-3.5 w-3.5 border border-[#163a55] bg-[#040c1c] accent-[#4ae8ff]" />
                        {copy.remember}
                      </label>
                      <button type="button" className="text-[#4ae8ff]/80 hover:text-[#80f0ff] transition-colors">
                        {copy.forgot}
                      </button>
                    </div>

                    {/* Submit */}
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="group relative mt-1 h-11 w-full overflow-hidden border border-[#4ae8ff]/35 bg-[linear-gradient(90deg,#084e8a,#0e78c8,#084e8a)] text-[14px] font-bold tracking-[0.15em] text-white shadow-[0_0_24px_rgba(14,120,200,0.4),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all hover:border-[#4ae8ff]/60 hover:shadow-[0_0_36px_rgba(74,232,255,0.45)] disabled:opacity-60"
                      style={{ clipPath: "polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px)" }}
                    >
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100"
                        style={{ animation: "shimmer 1.8s infinite" }} />
                      <span className="relative flex items-center justify-center gap-2">
                        {submitting ? `${copy.submit}...` : copy.submit}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </Button>

                    {submitError && (
                      <div className="border border-[#ff6b6b]/30 bg-[rgba(50,10,20,0.8)] px-3 py-2 text-[12px] text-[#ffc0c8]">
                        {submitError}
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>

            {/* Right cards */}
            <div className="hidden w-[240px] shrink-0 flex-col gap-2 lg:flex xl:w-[260px]">
              {RIGHT_MENU_ITEMS.map((item, i) => (
                <FeatureCard key={i} icon={item.icon}
                  title={locale === "zh" ? item.titleZh : item.titleEn}
                  description={locale === "zh" ? item.descZh : item.descEn}
                  value={item.value} status={item.status as "normal" | "active" | "warning"}
                  direction="right" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
