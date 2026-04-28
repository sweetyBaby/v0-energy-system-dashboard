"use client"

import { startTransition, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowRight, Eye, EyeOff, LockKeyhole, User } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { loginWithCloud } from "@/lib/api/auth"
import { persistAuthToken } from "@/lib/auth-storage"
import { cn } from "@/lib/utils"

type Locale = "zh" | "en"

type Copy = {
  welcome: string
  welcomeCaption: string
  platformSubtitle: string
  accountPlaceholder: string
  passwordPlaceholder: string
  accountRequired: string
  passwordRequired: string
  remember: string
  forgot: string
  submit: string
}

const BRAND = "EnerCloud"

const COPY: Record<Locale, Copy> = {
  zh: {
    welcome: "欢迎登录",
    welcomeCaption: "",
    platformSubtitle: "",
    accountPlaceholder: "请输入用户名",
    passwordPlaceholder: "请输入登录密码",
    accountRequired: "请输入用户名",
    passwordRequired: "请输入密码",
    remember: "记住密码",
    forgot: "忘记密码？",
    submit: "登录平台",
  },
  en: {
    welcome: "Welcome Login",
    welcomeCaption: "",
    platformSubtitle: "",
    accountPlaceholder: "Enter username",
    passwordPlaceholder: "Enter your password",
    accountRequired: "Please enter your username",
    passwordRequired: "Please enter your password",
    remember: "Remember password",
    forgot: "Forgot password?",
    submit: "Enter Platform",
  },
}

const LANGUAGE_OPTIONS: Array<{ key: Locale; label: string }> = [
  { key: "zh", label: "中" },
  { key: "en", label: "EN" },
]

type FormField = "account" | "password"

type FormErrors = Partial<Record<FormField, string>>

const normalizeCredentialValue = (value: string) => value.replace(/\u3000/g, " ").trim()

function getFieldError(field: FormField, value: string, copy: Copy) {
  if (field === "account") {
    return normalizeCredentialValue(value) ? null : copy.accountRequired
  }

  return normalizeCredentialValue(value) ? null : copy.passwordRequired
}

function EnerCloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 78 66" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="enercloud-cloud" x1="8" y1="8" x2="68" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67F1FF" />
          <stop offset="100%" stopColor="#255BFF" />
        </linearGradient>
        <linearGradient id="enercloud-bolt" x1="28" y1="10" x2="46" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EFFFFF" />
          <stop offset="100%" stopColor="#45E3FF" />
        </linearGradient>
      </defs>
      <path
        d="M23 54C13 54 8 47 8 39C8 30 14 23 24 22C25 12 33 7 42 7C51 7 58 12 61 20C69 21 74 27 74 35C74 45 67 54 55 54H23Z"
        fill="rgba(6,18,44,0.16)"
        stroke="url(#enercloud-cloud)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M43 13L31 31H39L33 50L48 28H40L43 13Z"
        fill="url(#enercloud-bolt)"
        stroke="rgba(92,242,255,0.22)"
        strokeWidth="0.8"
      />
    </svg>
  )
}

function TitleSideAccent({ side }: { side: "left" | "right" }) {
  const mirrored = side === "right"
  const cells = [0, 1, 2, 3, 4]

  return (
    <div className={cn("absolute top-[46px] hidden h-[78px] w-[214px] lg:block", side === "left" ? "left-4" : "right-4")}>
      <div className={cn("relative h-full w-full", mirrored && "-scale-x-100")}>
        <div className="absolute inset-x-[6px] top-[12px] h-px bg-gradient-to-r from-transparent via-[#35d9ff]/22 to-transparent" />
        <div className="absolute left-[6px] top-[18px] h-[44px] w-[140px] border border-[#1c4568]/44 bg-[linear-gradient(180deg,rgba(8,18,37,0.82),rgba(5,12,25,0.18))] shadow-[0_0_24px_rgba(34,211,238,0.06)]" style={{ clipPath: "polygon(0% 14%,9% 0%,100% 0%,100% 100%,0% 100%)" }} />
        <div className="absolute left-[12px] top-[24px] h-[32px] w-[128px] border border-[#2b618d]/28 bg-[linear-gradient(180deg,rgba(9,20,39,0.48),rgba(7,14,28,0.14))]" style={{ clipPath: "polygon(0% 12%,8% 0%,100% 0%,100% 100%,0% 100%)" }} />
        <div className="absolute left-[18px] top-[17px] h-[38px] w-[110px] bg-[radial-gradient(circle_at_35%_40%,rgba(48,220,255,0.14),transparent_76%)] blur-xl" />
        <div className="absolute left-[20px] top-[29px] h-px w-[96px] bg-gradient-to-r from-transparent via-[#6be8ff]/22 to-transparent" />
        <div className="absolute left-[21px] top-[43px] h-px w-[88px] bg-gradient-to-r from-transparent via-[#24d4ff]/12 to-transparent" />
        <div className="absolute left-[21px] top-[25px] h-[30px] w-[112px] overflow-hidden">
          <div className="absolute inset-y-0 left-[-16%] w-[30%] bg-[linear-gradient(90deg,transparent,rgba(84,244,255,0.24),transparent)] blur-sm" style={{ animation: "battery-core-scan 6.8s linear infinite" }} />
          {cells.map((index) => (
            <div
              key={index}
              className="absolute top-[7px] h-[12px] w-[13px] border border-[#7ccfff]/22 bg-[linear-gradient(180deg,rgba(153,245,255,0.96),rgba(64,188,255,0.84)_45%,rgba(27,125,255,0.62)_100%)] shadow-[0_0_14px_rgba(62,208,255,0.24)]"
              style={{
                left: `${index * 18 + 8}px`,
                clipPath: "polygon(16% 0%,100% 0%,84% 100%,0% 100%)",
                animation: `battery-cell-charge 2.4s ease-in-out ${index * 0.18}s infinite`,
              }}
            />
          ))}
        </div>
        <div className="absolute left-[18px] top-[25px] h-[30px] w-[112px] border border-[#53dcff]/[0.06]" style={{ clipPath: "polygon(0% 12%,8% 0%,100% 0%,100% 100%,0% 100%)" }} />
        <div className="absolute left-[140px] top-[38px] h-px w-[56px] bg-gradient-to-r from-[#35d9ff]/56 via-[#35d9ff]/18 to-transparent" />
        <div className="absolute left-[150px] top-[25px] h-[26px] w-px bg-gradient-to-b from-transparent via-[#35d9ff]/26 to-transparent" />
        <div className="absolute left-[145px] top-[33px] h-[12px] w-[12px] rounded-full border border-[#5fdfff]/34 bg-[#071a30] shadow-[0_0_16px_rgba(53,217,255,0.12)]" />
        <div className="absolute left-[148px] top-[36px] h-[6px] w-[6px] rounded-full bg-[#9ef8ff] shadow-[0_0_14px_rgba(158,248,255,0.9)]" style={{ animation: "battery-cell-charge 1.9s ease-in-out infinite" }} />
        <div className="absolute left-[160px] top-[38px] h-px w-[30px] bg-gradient-to-r from-[#238fff]/26 to-transparent" />
        <div className="absolute bottom-[11px] left-[24px] h-px w-[124px] bg-gradient-to-r from-transparent via-[#225d86]/42 to-transparent" />
      </div>
    </div>
  )
}

function TopBrandFrame({ subtitle }: { subtitle: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
      <div className="relative mx-auto h-[196px] w-full max-w-[1680px] px-4 pt-4 sm:h-[226px] sm:px-8 lg:px-10">
        <svg viewBox="0 0 1680 210" className="absolute inset-0 hidden h-full w-full lg:block" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 70H330L364 104L468 104L520 136" stroke="rgba(45,220,255,0.28)" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M1662 70H1350L1316 104H1212L1160 136" stroke="rgba(45,220,255,0.28)" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M42 50H356L394 88H482L514 120" stroke="rgba(46,116,255,0.18)" strokeWidth="1.2" />
          <path d="M1638 50H1324L1286 88H1198L1166 120" stroke="rgba(46,116,255,0.18)" strokeWidth="1.2" />
          <path d="M620 136H1060" stroke="rgba(71,232,255,0.42)" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M658 148H1022" stroke="rgba(71,232,255,0.16)" strokeWidth="1" strokeDasharray="8 11" />
        </svg>
        <TitleSideAccent side="left" />
        <TitleSideAccent side="right" />
        <div className="absolute left-1/2 top-[120px] hidden h-[138px] w-[240px] -translate-x-1/2 lg:block">
          <div
            className="absolute inset-x-[16%] top-0 h-[92px] bg-[linear-gradient(180deg,rgba(78,238,255,0.22),rgba(78,238,255,0.03)_62%,transparent)] blur-sm"
            style={{ clipPath: "polygon(30% 0%,70% 0%,88% 100%,12% 100%)", animation: "background-breathe 8s ease-in-out infinite" }}
          />
          <div className="absolute inset-x-0 top-[16px] h-px bg-gradient-to-r from-transparent via-[#52ECFF]/34 to-transparent" />
          <div className="absolute inset-x-[10%] top-[42px] h-px bg-gradient-to-r from-transparent via-[#52ECFF]/20 to-transparent" />
        </div>
        <div className="relative mx-auto flex w-fit flex-col items-center">
          <div className="absolute left-1/2 top-[-5px] h-[10px] w-[136px] -translate-x-1/2 rounded-full border border-[#40E7FF]/14 bg-[rgba(8,22,40,0.14)]" />
          <div className="absolute inset-x-[-90px] top-[-12px] h-[80px] bg-[radial-gradient(ellipse_at_center,rgba(47,218,255,0.1),transparent_72%)] blur-3xl" />
          <div className="absolute inset-x-[-150px] top-[72px] h-[116px] bg-[radial-gradient(ellipse_at_center,rgba(28,126,255,0.12),transparent_74%)] blur-3xl" />
          <div
            className="relative overflow-hidden border border-[#1ca7ff]/12 bg-[linear-gradient(180deg,rgba(6,16,34,0.54),rgba(4,10,20,0.2))] px-9 pb-3 pt-2.5 shadow-[0_0_0_1px_rgba(60,224,255,0.02)_inset] sm:px-12"
            style={{ clipPath: "polygon(10% 0%,29% 0%,35% 17%,65% 17%,71% 0%,90% 0%,100% 44%,95% 100%,5% 100%,0% 44%)" }}
          >
            <div className="absolute inset-[8px] border border-[#3de6ff]/5" style={{ clipPath: "polygon(10% 0%,29% 0%,35% 17%,65% 17%,71% 0%,90% 0%,100% 44%,95% 100%,5% 100%,0% 44%)" }} />
            <div className="absolute inset-x-[24%] bottom-0 h-px bg-gradient-to-r from-transparent via-[#52EAFF]/38 to-transparent" />
            <div className="absolute inset-x-[28%] top-[10px] h-px bg-gradient-to-r from-transparent via-[#52EAFF]/18 to-transparent" />
            <div className="relative flex items-center gap-3 sm:gap-4">
              <EnerCloudIcon className="h-[48px] w-[48px] drop-shadow-[0_0_18px_rgba(68,232,255,0.24)] sm:h-[58px] sm:w-[58px]" />
              <div>
                <div
                  className="bg-clip-text text-[2.8rem] font-black leading-none tracking-[0.01em] text-transparent sm:text-[4rem]"
                  style={{ backgroundImage: "linear-gradient(180deg,#ffffff 0%,#e2f7ff 38%,#8cecff 100%)" }}
                >
                  {BRAND}
                </div>
                <div className="mt-2 text-[10px] font-semibold tracking-[0.42em] text-[#2FE2FF] sm:text-[12px]">{subtitle}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Left: PCB / circuit-board decorative panel — no data, purely visual
function LeftTechPanel() {
  const nodeJunctions: [number, number, number][] = [
    [100, 160, 3.5], [115, 210, 3],   [150, 210, 3],
    [100, 260, 4],   [150, 260, 3],
    [100, 360, 3.5], [115, 310, 3],   [150, 310, 3],
    [330, 210, 3],   [365, 210, 3],   [388, 150, 3.5],
    [330, 260, 3],   [388, 260, 4],
    [330, 310, 3],   [365, 310, 3],   [388, 370, 3.5],
    [200, 220, 3],   [200, 120, 3],   [140, 120, 3],   [140, 40, 3],
    [240, 220, 3],   [240, 40,  3],
    [280, 220, 3],   [280, 120, 3],   [340, 120, 3],   [340, 40, 3],
    [200, 340, 3],   [200, 430, 3],   [140, 430, 3],
    [240, 340, 3],   [240, 490, 3],
    [280, 340, 3],   [280, 430, 3],   [340, 430, 3],
  ]
  return (
    <div
      className="pointer-events-none absolute left-0 top-[185px] hidden h-[520px] w-[480px] opacity-[0.48] lg:block"
      style={{ animation: "panel-float 16s ease-in-out infinite" }}
    >
      <div className="absolute left-[10%] top-[14%] h-[270px] w-[270px] rounded-full bg-[radial-gradient(circle,rgba(0,175,255,0.1),transparent_68%)] blur-3xl" />
      <svg viewBox="0 0 480 520" className="absolute inset-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* ── Circuit traces ─────────────────── */}
        {/* Left blocks → chip */}
        <path d="M92 160 H115 V210 H150" stroke="rgba(0,200,255,0.22)" strokeWidth="1.2" />
        <path d="M92 260 H150" stroke="rgba(0,200,255,0.22)" strokeWidth="1.2" />
        <path d="M92 360 H115 V310 H150" stroke="rgba(0,200,255,0.22)" strokeWidth="1.2" />
        {/* Chip → right blocks */}
        <path d="M330 210 H365 V150 H388" stroke="rgba(0,200,255,0.22)" strokeWidth="1.2" />
        <path d="M330 260 H388" stroke="rgba(0,200,255,0.22)" strokeWidth="1.2" />
        <path d="M330 310 H365 V370 H388" stroke="rgba(0,200,255,0.22)" strokeWidth="1.2" />
        {/* Chip → top */}
        <path d="M200 220 V120 H140 V40" stroke="rgba(0,190,255,0.15)" strokeWidth="1" />
        <path d="M240 220 V40" stroke="rgba(0,190,255,0.15)" strokeWidth="1" />
        <path d="M280 220 V120 H340 V40" stroke="rgba(0,190,255,0.15)" strokeWidth="1" />
        {/* Chip → bottom */}
        <path d="M200 340 V430 H140 V490" stroke="rgba(0,190,255,0.12)" strokeWidth="1" />
        <path d="M240 340 V490" stroke="rgba(0,190,255,0.12)" strokeWidth="1" />
        <path d="M280 340 V430 H340" stroke="rgba(0,190,255,0.12)" strokeWidth="1" />
        {/* Secondary dashed traces */}
        <path d="M50 160 V50 H180" stroke="rgba(0,180,255,0.1)" strokeWidth="0.8" strokeDasharray="4 8" />
        <path d="M50 360 V500 H260" stroke="rgba(0,180,255,0.09)" strokeWidth="0.8" strokeDasharray="4 8" />
        <path d="M430 150 V50 H300" stroke="rgba(0,180,255,0.1)" strokeWidth="0.8" strokeDasharray="4 8" />
        <path d="M430 370 V500 H320" stroke="rgba(0,180,255,0.09)" strokeWidth="0.8" strokeDasharray="4 8" />

        {/* ── Left component blocks ──────────── */}
        {([160, 236, 336] as number[]).map((y, i) => (
          <g key={`lb-${i}`}>
            <rect x="8" y={y} width="84" height="48" rx="4" fill="rgba(0,18,46,0.55)" stroke="rgba(0,190,255,0.16)" strokeWidth="1" />
            <rect x="14" y={y + 6} width="72" height="36" rx="3" fill="rgba(0,26,58,0.35)" stroke="rgba(0,190,255,0.07)" strokeWidth="0.8" />
            <line x1="14" y1={y + 19} x2="86" y2={y + 19} stroke="rgba(0,190,255,0.1)" strokeWidth="0.8" />
            <line x1="14" y1={y + 28} x2="86" y2={y + 28} stroke="rgba(0,190,255,0.1)" strokeWidth="0.8" />
          </g>
        ))}
        {/* ── Right component blocks ─────────── */}
        {([126, 236, 346] as number[]).map((y, i) => (
          <g key={`rb-${i}`}>
            <rect x="388" y={y} width="84" height="48" rx="4" fill="rgba(0,18,46,0.55)" stroke="rgba(0,190,255,0.16)" strokeWidth="1" />
            <rect x="394" y={y + 6} width="72" height="36" rx="3" fill="rgba(0,26,58,0.35)" stroke="rgba(0,190,255,0.07)" strokeWidth="0.8" />
            <line x1="394" y1={y + 19} x2="466" y2={y + 19} stroke="rgba(0,190,255,0.1)" strokeWidth="0.8" />
            <line x1="394" y1={y + 28} x2="466" y2={y + 28} stroke="rgba(0,190,255,0.07)" strokeWidth="0.8" />
          </g>
        ))}

        {/* ── Top connector pads ─────────────── */}
        {([140, 240, 340] as number[]).map((x, i) => (
          <g key={`tc-${i}`}>
            <rect x={x - 18} y="12" width="36" height="18" rx="3" fill="rgba(0,18,46,0.65)" stroke="rgba(0,190,255,0.18)" strokeWidth="1" />
            <rect x={x - 12} y="16" width="24" height="10" rx="2" fill="rgba(0,190,255,0.07)" />
          </g>
        ))}

        {/* ── Main chip block ────────────────── */}
        <rect x="150" y="220" width="180" height="120" rx="6" fill="rgba(0,20,50,0.65)" stroke="rgba(0,205,255,0.3)" strokeWidth="1.6" />
        <rect x="156" y="226" width="168" height="108" rx="5" fill="none" stroke="rgba(0,205,255,0.1)" strokeWidth="1" />
        <rect x="162" y="232" width="156" height="96" rx="4" fill="none" stroke="rgba(0,205,255,0.06)" strokeWidth="0.8" />
        {/* Mount holes */}
        {([[160,230],[320,230],[160,330],[320,330]] as [number,number][]).map(([x,y],i) => (
          <circle key={`mh-${i}`} cx={x} cy={y} r="5" fill="rgba(0,10,28,0.9)" stroke="rgba(0,190,255,0.2)" strokeWidth="1" />
        ))}
        {/* Chip pins top/bottom */}
        {[175, 198, 221, 244, 267, 290, 313].map((x, i) => (
          <g key={`cp-${i}`}>
            <line x1={x} y1="212" x2={x} y2="220" stroke="rgba(0,190,255,0.32)" strokeWidth="1.5" />
            <line x1={x} y1="340" x2={x} y2="348" stroke="rgba(0,190,255,0.32)" strokeWidth="1.5" />
          </g>
        ))}
        {/* Chip pins left/right */}
        {[238, 254, 270, 286, 302].map((y, i) => (
          <g key={`sp-${i}`}>
            <line x1="140" y1={y} x2="150" y2={y} stroke="rgba(0,190,255,0.28)" strokeWidth="1.5" />
            <line x1="330" y1={y} x2="340" y2={y} stroke="rgba(0,190,255,0.28)" strokeWidth="1.5" />
          </g>
        ))}
        {/* Abstract waveform inside chip */}
        <path d="M172 272 L186 258 L200 271 L214 253 L228 267 L242 250 L256 264 L270 251 L284 265 L298 255 L310 268"
          stroke="rgba(0,215,255,0.48)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M172 292 L186 287 L200 291 L214 285 L228 289 L242 283 L256 287 L270 282 L284 286 L298 280 L310 285"
          stroke="rgba(30,100,255,0.3)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />

        {/* ── Junction nodes ─────────────────── */}
        {nodeJunctions.map(([x, y, r], i) => (
          <circle key={`jn-${i}`} cx={x} cy={y} r={r} fill="rgba(0,200,255,0.55)" />
        ))}

        {/* ── Active glow nodes ──────────────── */}
        <circle cx="240" cy="270" r="7" fill="rgba(0,220,255,0.9)" />
        <circle cx="240" cy="270" r="14" fill="rgba(0,220,255,0.16)" style={{ animation: "node-pulse 2.6s ease-in-out infinite" }} />
        <circle cx="240" cy="270" r="22" fill="rgba(0,220,255,0.06)" style={{ animation: "node-pulse 2.6s ease-in-out infinite 0.5s" }} />

        <circle cx="100" cy="260" r="5" fill="rgba(0,210,255,0.8)" />
        <circle cx="100" cy="260" r="11" fill="rgba(0,210,255,0.13)" style={{ animation: "node-pulse 3.1s ease-in-out infinite 0.9s" }} />

        <circle cx="380" cy="260" r="5" fill="rgba(0,210,255,0.7)" />
        <circle cx="380" cy="260" r="11" fill="rgba(0,210,255,0.12)" style={{ animation: "node-pulse 3.4s ease-in-out infinite 1.3s" }} />

        <circle cx="240" cy="40" r="4" fill="rgba(0,200,255,0.6)" />
        <circle cx="240" cy="40" r="9" fill="rgba(0,200,255,0.1)" style={{ animation: "node-pulse 4s ease-in-out infinite" }} />

        {/* Corner brackets */}
        <path d="M10 10 H36 M10 10 V36" stroke="rgba(0,210,255,0.28)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M470 10 H444 M470 10 V36" stroke="rgba(0,210,255,0.28)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10 510 H36 M10 510 V484" stroke="rgba(0,210,255,0.2)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M470 510 H444 M470 510 V484" stroke="rgba(0,210,255,0.2)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// Right: abstract data-flow network — no data, purely visual
function RightDataFlowPanel() {
  const COLS = [68, 136, 212, 288, 352]
  // Horizontal link segments: [y, colStart, colEnd]
  const hLinks: [number, number, number][] = [
    [58,  0, 2], [58,  3, 4],
    [148, 1, 4],
    [228, 0, 1], [228, 2, 3],
    [318, 0, 4],
    [408, 1, 2], [408, 3, 4],
    [468, 0, 3],
  ]
  // Nodes: [x, y, isActive]
  const nodes: [number, number, boolean][] = [
    [68, 58, false], [212, 58, true], [288, 58, false], [352, 58, false],
    [136, 148, false], [212, 148, false], [288, 148, false], [352, 148, true],
    [68, 228, true], [136, 228, false], [212, 228, false], [288, 228, false],
    [68, 318, false], [136, 318, false], [212, 318, true], [288, 318, false], [352, 318, false],
    [136, 408, false], [212, 408, false], [288, 408, false], [352, 408, false],
    [68, 468, false], [136, 468, false], [212, 468, true], [288, 468, false],
  ]
  const activeNodes = nodes.filter(([,,a]) => a)
  return (
    <div
      className="pointer-events-none absolute right-0 top-[185px] hidden h-[520px] w-[430px] opacity-[0.46] lg:block"
      style={{ animation: "panel-float 14s ease-in-out infinite reverse" }}
    >
      <div className="absolute right-[10%] top-[12%] h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,rgba(28,68,255,0.08),transparent_70%)] blur-3xl" />
      <svg viewBox="0 0 430 520" className="absolute inset-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background grid */}
        {[60,120,180,240,300,360,420,480].map(v => (
          <line key={`gh${v}`} x1="10" y1={v} x2="420" y2={v} stroke="rgba(0,150,255,0.04)" strokeWidth="1" />
        ))}
        {[60,120,180,240,300,360].map(v => (
          <line key={`gv${v}`} x1={v} y1="10" x2={v} y2="510" stroke="rgba(0,150,255,0.04)" strokeWidth="1" />
        ))}

        {/* Vertical channel streams with flow animation */}
        {COLS.map((x, i) => (
          <line key={`col-${i}`} x1={x} y1="28" x2={x} y2="492"
            stroke="rgba(0,185,255,0.09)" strokeWidth="1.2" strokeDasharray="5 9"
            style={{ animation: `data-flow ${2.2 + i * 0.35}s linear infinite` }} />
        ))}

        {/* Horizontal link segments */}
        {hLinks.map(([y, c0, c1], i) => (
          <line key={`lnk-${i}`} x1={COLS[c0]} y1={y} x2={COLS[c1]} y2={y}
            stroke="rgba(0,200,255,0.18)" strokeWidth="1.2" />
        ))}

        {/* Diagonal accent lines */}
        <line x1="68" y1="58"  x2="136" y2="148" stroke="rgba(0,175,255,0.08)" strokeWidth="0.8" strokeDasharray="3 7" />
        <line x1="288" y1="148" x2="212" y2="228" stroke="rgba(0,175,255,0.08)" strokeWidth="0.8" strokeDasharray="3 7" />
        <line x1="212" y1="318" x2="136" y2="408" stroke="rgba(0,175,255,0.08)" strokeWidth="0.8" strokeDasharray="3 7" />
        <line x1="352" y1="318" x2="288" y2="408" stroke="rgba(0,175,255,0.08)" strokeWidth="0.8" strokeDasharray="3 7" />

        {/* All nodes */}
        {nodes.map(([x, y, active], i) => (
          <g key={`nd-${i}`}>
            <circle cx={x} cy={y} r={active ? 10 : 7} fill="rgba(0,195,255,0.07)" />
            <circle cx={x} cy={y} r={active ? 6.5 : 4.5}
              fill="rgba(0,14,38,0.88)" stroke="rgba(0,205,255,0.35)" strokeWidth="1.2" />
            <circle cx={x} cy={y} r={active ? 3.5 : 2.2} fill="rgba(0,215,255,0.75)" />
          </g>
        ))}

        {/* Pulsing halos on active nodes */}
        {activeNodes.map(([x, y], i) => (
          <circle key={`halo-${i}`} cx={x} cy={y} r="20"
            fill="rgba(0,210,255,0.06)"
            style={{ animation: `node-pulse ${2.4 + i * 0.7}s ease-in-out infinite` }} />
        ))}

        {/* Diamond ring markers on key active nodes */}
        {([[212, 58], [68, 228], [212, 318], [212, 468]] as [number,number][]).map(([x, y], i) => (
          <path key={`dm-${i}`}
            d={`M${x} ${y - 16} L${x + 9} ${y} L${x} ${y + 16} L${x - 9} ${y} Z`}
            fill="none" stroke="rgba(0,215,255,0.2)" strokeWidth="1" />
        ))}

        {/* Decorative label strips (top corners) */}
        <rect x="14" y="14" width="66" height="12" rx="2" fill="rgba(0,18,46,0.6)" stroke="rgba(0,190,255,0.12)" strokeWidth="0.8" />
        <rect x="350" y="14" width="66" height="12" rx="2" fill="rgba(0,18,46,0.6)" stroke="rgba(0,190,255,0.12)" strokeWidth="0.8" />
        {[0,1,2,3].map(j => (
          <rect key={`ls${j}`} x={18 + j * 15} y={17} width="11" height="6" rx="1" fill={`rgba(0,195,255,${0.14 + j * 0.09})`} />
        ))}
        {[0,1,2,3].map(j => (
          <rect key={`rs${j}`} x={354 + j * 15} y={17} width="11" height="6" rx="1" fill={`rgba(0,195,255,${0.38 - j * 0.09})`} />
        ))}

        {/* Corner brackets */}
        <path d="M12 12 H38 M12 12 V38" stroke="rgba(0,205,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M418 12 H392 M418 12 V38" stroke="rgba(0,205,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 508 H38 M12 508 V482" stroke="rgba(0,205,255,0.18)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M418 508 H392 M418 508 V482" stroke="rgba(0,205,255,0.18)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function HexOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.07]"
      style={{
        maskImage: "radial-gradient(ellipse 88% 84% at 50% 44%, black 8%, transparent 74%)",
        WebkitMaskImage: "radial-gradient(ellipse 88% 84% at 50% 44%, black 8%, transparent 74%)",
      }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hex-bg" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
            <path d="M28 66L0 50V16L28 0L56 16V50L28 66ZM28 66L28 100"
              fill="none" stroke="rgba(46,215,255,1)" strokeWidth="0.65" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex-bg)" />
      </svg>
    </div>
  )
}

function CenterTechField() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[198px] bottom-[14%] overflow-hidden">
      <div
        className="absolute left-1/2 top-[10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full border border-[#00d4aa]/10 bg-[radial-gradient(circle,rgba(10,28,58,0.82),rgba(10,28,58,0.26)_44%,transparent_72%)] shadow-[0_0_120px_rgba(0,212,170,0.08)]"
        style={{ animation: "orbit-drift 18s ease-in-out infinite" }}
      />
      <div className="absolute left-1/2 top-[13%] h-[360px] w-[760px] -translate-x-1/2 rounded-[50%] border border-[#3b82f6]/12" />
      <div className="absolute left-1/2 top-[15%] h-[300px] w-[640px] -translate-x-1/2 rounded-[50%] border border-[#22d3ee]/10" />
      <div
        className="absolute left-1/2 top-[11%] h-[3px] w-[860px] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#00d4aa]/32 to-transparent"
        style={{ animation: "line-pulse 6.5s ease-in-out infinite" }}
      />
      <div
        className="absolute left-1/2 top-[20%] h-[210px] w-[420px] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(0,212,170,0.14),rgba(59,130,246,0.05)_56%,transparent)] blur-2xl"
        style={{
          clipPath: "polygon(32% 0%,68% 0%,86% 100%,14% 100%)",
          animation: "background-breathe 10s ease-in-out infinite",
        }}
      />
      <div
        className="absolute left-1/2 top-[22%] h-[220px] w-[900px] -translate-x-1/2 opacity-[0.14] [background-image:repeating-linear-gradient(90deg,rgba(34,211,238,0.2)_0_2px,transparent_2px_48px)]"
        style={{
          maskImage: "linear-gradient(180deg,transparent,black 18%,black 82%,transparent)",
          WebkitMaskImage: "linear-gradient(180deg,transparent,black 18%,black 82%,transparent)",
        }}
      />
    </div>
  )
}

function DataScreenBackdrop() {
  const sidePanels = [
    {
      key: "left",
      shell: "left-[1.5%]",
      rail: "left-[18%]",
      glow: "left-[6%]",
      edge: "bg-gradient-to-r from-[#22d3ee]/0 via-[#22d3ee]/18 to-[#22d3ee]/0",
      clip: "polygon(0% 12%,14% 0%,100% 0%,100% 88%,86% 100%,0% 100%)",
    },
    {
      key: "right",
      shell: "right-[1.5%]",
      rail: "right-[18%]",
      glow: "right-[6%]",
      edge: "bg-gradient-to-r from-[#22d3ee]/0 via-[#22d3ee]/18 to-[#22d3ee]/0",
      clip: "polygon(0% 0%,86% 0%,100% 12%,100% 100%,0% 100%,0% 88%)",
    },
  ]
  const towers = [
    { x: 250, width: 46, height: 116 },
    { x: 320, width: 56, height: 172 },
    { x: 404, width: 70, height: 230 },
    { x: 504, width: 66, height: 206 },
    { x: 596, width: 52, height: 152 },
    { x: 670, width: 40, height: 104 },
  ]

  return (
    <div className="pointer-events-none absolute inset-x-[1%] top-[114px] bottom-[5%] overflow-hidden">
      <div className="absolute left-1/2 top-[-2%] h-[420px] w-[1120px] max-w-[170vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.3),rgba(59,130,246,0.14)_42%,transparent_78%)] blur-3xl sm:h-[480px] sm:w-[1320px]" />
      <div className="absolute left-1/2 top-[8%] h-[360px] w-[90vw] max-w-[980px] -translate-x-1/2 rounded-full border border-[#22d3ee]/12 opacity-80 sm:h-[520px] sm:w-[820px]" />
      <div className="absolute left-1/2 top-[14%] h-[300px] w-[72vw] max-w-[760px] -translate-x-1/2 rounded-full border border-[#3b82f6]/12 opacity-80 sm:h-[440px] sm:w-[640px]" />
      <div className="absolute left-1/2 top-[20%] h-[240px] w-[50vw] max-w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,212,170,0.22),rgba(34,211,238,0.14)_40%,transparent_76%)] blur-3xl sm:h-[320px] sm:w-[360px]" />
      <div className="absolute left-1/2 top-[18%] h-[280px] w-[76vw] max-w-[760px] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(34,211,238,0.18),rgba(59,130,246,0.06)_46%,transparent)] blur-2xl" style={{ clipPath: "polygon(30% 0%,70% 0%,88% 100%,12% 100%)" }} />
      <div className="absolute left-1/2 top-[26%] h-[220px] w-[220px] -translate-x-1/2 rounded-full border border-[#22d3ee]/20 bg-[radial-gradient(circle,rgba(255,255,255,0.1),rgba(34,211,238,0.16)_36%,transparent_72%)] shadow-[0_0_80px_rgba(34,211,238,0.16)] sm:h-[280px] sm:w-[280px]" />

      {sidePanels.map((panel) => (
        <div key={panel.key} className={`absolute inset-y-[18%] hidden w-[20.5%] xl:block ${panel.shell}`}>
          <div
            className="absolute inset-0 border border-[#24486c]/30 bg-[linear-gradient(180deg,rgba(12,22,40,0.42),rgba(4,10,18,0.08))] shadow-[0_0_40px_rgba(34,211,238,0.04)]"
            style={{ clipPath: panel.clip }}
          />
          <div
            className="absolute inset-[10px] border border-[#22d3ee]/10"
            style={{ clipPath: panel.clip }}
          />
          <div className={`absolute bottom-[14%] top-[12%] w-px bg-gradient-to-b from-transparent via-[#22d3ee]/20 to-transparent ${panel.rail}`} />
          <div className={`absolute top-[18%] h-[220px] w-[220px] rounded-full border border-[#00d4aa]/10 bg-[radial-gradient(circle,rgba(0,212,170,0.1),rgba(34,211,238,0.04)_54%,transparent_74%)] blur-3xl ${panel.glow}`} />
          <div className="absolute inset-[12%] opacity-[0.14] [background-image:linear-gradient(rgba(34,211,238,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.12)_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(180deg,rgba(148,163,184,0.18)_0,rgba(148,163,184,0.18)_1px,transparent_1px,transparent_9px)] [background-size:100%_10px]" />
          <div className={`absolute inset-x-[10%] top-[12%] h-[2px] ${panel.edge}`} />
          <div className="absolute inset-x-[14%] top-[18%] h-px bg-gradient-to-r from-transparent via-[#22d3ee]/24 to-transparent" />
          <div className="absolute inset-x-[18%] top-[28%] h-px bg-gradient-to-r from-transparent via-[#3b82f6]/18 to-transparent" />
          <div className="absolute inset-x-[16%] top-[42%] h-px bg-gradient-to-r from-transparent via-[#22d3ee]/14 to-transparent" />
          <div className="absolute inset-x-[12%] bottom-[18%] h-px bg-gradient-to-r from-transparent via-[#00d4aa]/18 to-transparent" />
          <div className="absolute left-[12%] top-[20%] h-[58px] w-[34%] border border-[#22d3ee]/10 bg-[linear-gradient(180deg,rgba(7,16,31,0.82),rgba(7,16,31,0.26))]" />
          <div className="absolute right-[12%] top-[32%] h-[76px] w-[42%] border border-[#3b82f6]/10 bg-[linear-gradient(180deg,rgba(7,16,31,0.78),rgba(7,16,31,0.22))]" />
          <div className="absolute left-[16%] bottom-[24%] h-[84px] w-[48%] border border-[#00d4aa]/10 bg-[linear-gradient(180deg,rgba(7,16,31,0.76),rgba(7,16,31,0.2))]" />
          <div
            className="absolute inset-y-[16%] left-[-12%] w-[30%] bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.16),transparent)] blur-md"
            style={{ animation: "panel-sweep 12s linear infinite" }}
          />
        </div>
      ))}

      <div className="absolute inset-x-[5%] top-[18%] bottom-[22%] sm:inset-x-[10%] sm:top-[16%] sm:bottom-[18%] lg:inset-x-[16%] lg:top-[8%] lg:bottom-[17%]">
        <div
          className="absolute inset-0 border border-[#265078]/46 bg-[linear-gradient(180deg,rgba(12,22,42,0.58),rgba(4,10,18,0.08))] shadow-[0_0_0_1px_rgba(34,211,238,0.05)_inset,0_0_140px_rgba(34,211,238,0.08)]"
          style={{ clipPath: "polygon(0% 8%,6% 0%,94% 0%,100% 8%,100% 92%,94% 100%,6% 100%,0% 92%)" }}
        />
        <div
          className="absolute inset-[14px] border border-[#22d3ee]/10"
          style={{ clipPath: "polygon(0% 8%,6% 0%,94% 0%,100% 8%,100% 92%,94% 100%,6% 100%,0% 92%)" }}
        />
        <div className="absolute inset-x-[3%] top-[6%] bottom-[7%] overflow-hidden rounded-[34px] border border-[#2d5b87]/40 bg-[linear-gradient(180deg,rgba(8,18,34,0.88),rgba(6,12,24,0.42))]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(34,211,238,0.22),rgba(59,130,246,0.08)_30%,transparent_66%)]" />
          <div className="absolute inset-0 opacity-[0.28] [background-image:linear-gradient(rgba(34,211,238,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.12)_1px,transparent_1px)] [background-size:52px_52px]" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(180deg,rgba(148,163,184,0.16)_0,rgba(148,163,184,0.16)_1px,transparent_1px,transparent_8px)] [background-size:100%_8px]" />
          <div
            className="absolute inset-y-0 left-[-10%] w-[26%] bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.22),transparent)] blur-md"
            style={{ animation: "panel-sweep 12s linear infinite" }}
          />
          <div className="absolute inset-x-[12%] top-[18%] h-[28%] bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.18),transparent_68%)] blur-3xl" />
          <div className="absolute inset-x-[8%] top-[7%] h-[3px] bg-gradient-to-r from-transparent via-[#22d3ee]/26 to-transparent" />
          <div className="absolute inset-x-[10%] top-[11%] h-px bg-gradient-to-r from-transparent via-[#22d3ee]/18 to-transparent" />
          <div className="absolute inset-x-[12%] top-[18%] h-px bg-gradient-to-r from-transparent via-[#3b82f6]/18 to-transparent" />
          <div className="absolute inset-x-[10%] bottom-[16%] h-px bg-gradient-to-r from-transparent via-[#00d4aa]/18 to-transparent" />
          <div className="absolute left-1/2 top-[53%] h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#22d3ee]/18 sm:h-[240px] sm:w-[240px]" />
          <div className="absolute left-1/2 top-[53%] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#3b82f6]/12 sm:h-[360px] sm:w-[360px]" style={{ animation: "orbital-spin 24s linear infinite" }} />
          <div className="absolute left-1/2 top-[53%] h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#00d4aa]/8 sm:h-[460px] sm:w-[460px]" style={{ animation: "orbital-spin 36s linear infinite reverse" }} />
          <div className="absolute left-1/2 top-[53%] h-[3px] w-[54%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-[#22d3ee]/36 to-transparent" />
          <div className="absolute left-1/2 top-[53%] h-[42%] w-[3px] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-[#00d4aa]/28 to-transparent" />
          <div className="absolute left-1/2 top-[39%] h-[220px] w-[220px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),rgba(34,211,238,0.2),rgba(59,130,246,0.08)_44%,transparent_72%)] blur-3xl sm:h-[280px] sm:w-[280px]" />
          <div className="absolute bottom-[14%] left-1/2 h-[110px] w-[82%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.18),transparent_62%)] blur-3xl" />
          <svg viewBox="0 0 960 520" className="absolute inset-x-[4%] top-[12%] h-[68%] w-[92%] opacity-[0.9]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="twin-platform" x1="480" y1="240" x2="480" y2="430" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(34,211,238,0.42)" />
                <stop offset="100%" stopColor="rgba(34,211,238,0.02)" />
              </linearGradient>
              <linearGradient id="twin-tower" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8ffaff" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <ellipse cx="480" cy="360" rx="282" ry="76" fill="url(#twin-platform)" />
            <ellipse cx="480" cy="360" rx="254" ry="60" stroke="rgba(34,211,238,0.42)" strokeWidth="1.8" />
            <ellipse cx="480" cy="360" rx="188" ry="40" stroke="rgba(0,212,170,0.32)" strokeWidth="1.4" strokeDasharray="8 10" />
            <path d="M196 360L480 204L764 360L480 516L196 360Z" fill="rgba(34,211,238,0.1)" stroke="rgba(34,211,238,0.3)" strokeWidth="1.6" />
            <path d="M254 360L480 246L706 360L480 472L254 360Z" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.24)" strokeWidth="1.2" />
            {towers.map((tower) => (
              <g key={`${tower.x}-${tower.height}`}>
                <rect x={tower.x} y={360 - tower.height} width={tower.width} height={tower.height} fill="rgba(34,211,238,0.08)" stroke="url(#twin-tower)" strokeWidth="1.4" />
                <rect x={tower.x + 8} y={360 - tower.height + 18} width={tower.width - 16} height={tower.height - 36} fill="rgba(143,250,255,0.08)" />
                <line x1={tower.x} y1={360 - tower.height} x2="480" y2="204" stroke="rgba(34,211,238,0.24)" strokeWidth="1" />
                <line x1={tower.x + tower.width} y1={360 - tower.height} x2="480" y2="204" stroke="rgba(34,211,238,0.24)" strokeWidth="1" />
              </g>
            ))}
            <circle cx="480" cy="204" r="14" fill="rgba(34,211,238,0.2)" />
            <circle cx="480" cy="204" r="7" fill="rgba(34,211,238,0.98)" />
            <path d="M48 308C126 308 170 226 248 226C328 226 368 302 442 302C530 302 560 164 640 164C722 164 764 262 844 262C898 262 934 240 960 240" stroke="rgba(34,211,238,0.54)" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M24 190C118 190 154 126 236 126C322 126 354 186 444 186C534 186 566 92 652 92C734 92 786 160 872 160C912 160 940 148 968 148" stroke="rgba(0,212,170,0.36)" strokeWidth="2" strokeLinecap="round" strokeDasharray="8 11" />
            <path d="M16 396C114 396 160 344 244 344C332 344 372 404 450 404C550 404 582 320 666 320C744 320 790 374 878 374C922 374 950 362 976 362" stroke="rgba(59,130,246,0.4)" strokeWidth="2" strokeLinecap="round" />
            {[244, 442, 640, 844].map((nodeX) => (
              <g key={nodeX}>
                <circle cx={nodeX} cy="344" r="10" fill="rgba(34,211,238,0.18)" />
                <circle cx={nodeX} cy="344" r="4.2" fill="rgba(34,211,238,0.92)" />
              </g>
            ))}
            <path d="M480 204L480 360" stroke="rgba(34,211,238,0.28)" strokeWidth="1.4" strokeDasharray="6 8" />
          </svg>
        </div>
      </div>

      <svg viewBox="0 0 1600 920" className="absolute inset-0 hidden h-full w-full lg:block" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 216H242L330 154H610" stroke="rgba(34,211,238,0.22)" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M1560 216H1358L1270 154H990" stroke="rgba(34,211,238,0.22)" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M108 760H304L366 814H584" stroke="rgba(0,212,170,0.16)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M1492 760H1296L1234 814H1016" stroke="rgba(0,212,170,0.16)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M602 126H998" stroke="rgba(34,211,238,0.22)" strokeWidth="1.4" strokeDasharray="10 12" />
        <path d="M646 846H954" stroke="rgba(59,130,246,0.2)" strokeWidth="1.4" strokeDasharray="10 12" />
        <circle cx="330" cy="154" r="6" fill="rgba(34,211,238,0.72)" />
        <circle cx="1270" cy="154" r="6" fill="rgba(34,211,238,0.72)" />
        <circle cx="366" cy="814" r="5" fill="rgba(0,212,170,0.6)" />
        <circle cx="1234" cy="814" r="5" fill="rgba(0,212,170,0.6)" />
      </svg>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { language, setLanguage } = useLanguage()
  const locale: Locale = language === "en" ? "en" : "zh"
  const copy = COPY[locale]
  const accountInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const [account, setAccount] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})

  const accountError = getFieldError("account", account, copy)
  const passwordError = getFieldError("password", password, copy)
  const canSubmit = !submitting && !accountError && !passwordError

  const setFieldError = (field: FormField, value: string) => {
    setFieldErrors((current) => {
      if (current[field] === value) return current
      return { ...current, [field]: value }
    })
  }

  const clearFieldError = (field: FormField) => {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const validateField = (field: FormField, value: string) => {
    const error = getFieldError(field, value, copy)
    if (error) {
      setFieldError(field, error)
      return false
    }

    clearFieldError(field)
    return true
  }

  const focusField = (field: FormField) => {
    if (field === "account") {
      accountInputRef.current?.focus()
      return
    }

    passwordInputRef.current?.focus()
  }

  useEffect(() => {
    setFieldErrors((current) => {
      const next: FormErrors = {}

      if (current.account) {
        const nextAccountError = getFieldError("account", account, copy)
        if (nextAccountError) {
          next.account = nextAccountError
        }
      }

      if (current.password) {
        const nextPasswordError = getFieldError("password", password, copy)
        if (nextPasswordError) {
          next.password = nextPasswordError
        }
      }

      const sameAccount = current.account === next.account
      const samePassword = current.password === next.password
      if (sameAccount && samePassword) {
        return current
      }

      return next
    })
  }, [account, password, copy])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedAccount = normalizeCredentialValue(account)
    const normalizedPassword = normalizeCredentialValue(password)
    if (normalizedAccount !== account) {
      setAccount(normalizedAccount)
    }
    if (normalizedPassword !== password) {
      setPassword(normalizedPassword)
    }

    const nextErrors: FormErrors = {}

    const nextAccountError = getFieldError("account", normalizedAccount, copy)
    if (nextAccountError) {
      nextErrors.account = nextAccountError
    }

    const nextPasswordError = getFieldError("password", normalizedPassword, copy)
    if (nextPasswordError) {
      nextErrors.password = nextPasswordError
    }

    if (nextErrors.account || nextErrors.password) {
      setFieldErrors(nextErrors)
      focusField(nextErrors.account ? "account" : "password")
      return
    }

    setSubmitting(true)

    try {
      const response = await loginWithCloud({
        username: normalizedAccount,
        password: normalizedPassword,
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
      const message = error instanceof Error ? error.message || fallbackMessage : fallbackMessage
      toast({
        variant: "destructive",
        title: (
          <span className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ff9cac]/28 bg-[radial-gradient(circle_at_30%_30%,rgba(255,182,193,0.28),rgba(255,107,125,0.08)_58%,transparent_100%)] text-[#ffb6c0] shadow-[0_0_22px_rgba(255,107,125,0.15)]">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <span>{locale === "zh" ? "登录校验未通过" : "Login validation failed"}</span>
          </span>
        ),
        description: message,
        className:
          "border-[#ff6b7d]/35 shadow-[0_0_0_1px_rgba(255,153,171,0.08)_inset,0_18px_46px_rgba(24,6,12,0.52),0_0_30px_rgba(255,107,125,0.16)]",
      })
      setSubmitting(false)
      return
    }

    setSubmitting(false)
  }

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#050b1b] text-white">
      <style>{`
        @keyframes background-breathe {
          0%, 100% { opacity: .72; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        @keyframes panel-float {
          0%, 100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(0,-14px,0); }
        }
        @keyframes data-flow {
          from { stroke-dashoffset: 25; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes node-pulse {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes horizon-glow {
          0%, 100% { opacity: 0.24; }
          50% { opacity: 0.52; }
        }
        @keyframes orbit-drift {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.04); }
        }
        @keyframes line-pulse {
          0%, 100% { opacity: 0.26; transform: translateX(-50%) scaleX(0.94); }
          50% { opacity: 0.72; transform: translateX(-50%) scaleX(1.02); }
        }
        @keyframes battery-cell-charge {
          0%, 100% { opacity: 0.72; transform: translateY(0) scaleY(0.94); box-shadow: 0 0 8px rgba(62,208,255,0.14); }
          50% { opacity: 1; transform: translateY(-1px) scaleY(1.04); box-shadow: 0 0 16px rgba(110,244,255,0.24); }
        }
        @keyframes battery-core-scan {
          0% { transform: translateX(0); opacity: 0; }
          14% { opacity: 0.28; }
          50% { opacity: 0.22; }
          100% { transform: translateX(420%); opacity: 0; }
        }
        @keyframes scan-sweep {
          0% { transform: translateY(-140%); opacity: 0; }
          18% { opacity: 0.24; }
          50% { opacity: 0.3; }
          82% { opacity: 0.14; }
          100% { transform: translateY(520%); opacity: 0; }
        }
        @keyframes panel-sweep {
          0% { transform: translateX(0); opacity: 0; }
          12% { opacity: 0.28; }
          50% { opacity: 0.16; }
          100% { transform: translateX(380%); opacity: 0; }
        }
        @keyframes orbital-spin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>

      {/* ── Base atmosphere ─────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0" style={{
        background:
          "radial-gradient(ellipse 84% 44% at 50% -6%, rgba(59,130,246,0.34) 0%, transparent 58%)," +
          "radial-gradient(circle at 50% 22%, rgba(34,211,238,0.12) 0%, transparent 22%)," +
          "radial-gradient(circle at 16% 20%, rgba(0,212,170,0.12) 0%, transparent 24%)," +
          "radial-gradient(circle at 84% 20%, rgba(59,130,246,0.16) 0%, transparent 26%)," +
          "linear-gradient(180deg, #07101f 0%, #050c17 44%, #030811 100%)",
      }} />

      {/* Dot texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:radial-gradient(circle,rgba(34,211,238,0.54)_1px,transparent_1.7px)] [background-size:32px_32px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(180deg,rgba(148,163,184,0.14)_0,rgba(148,163,184,0.14)_1px,transparent_1px,transparent_9px)] [background-size:100%_10px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(90deg,transparent_0,rgba(34,211,238,0.08)_50%,transparent_100%)]" />
      <HexOverlay />

      {/* Top edge accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#22D3EE]/22 via-[#00D4AA]/28 to-[#22D3EE]/22" />

      {/* Corner brackets */}
      <div className="pointer-events-none absolute left-0 top-0 h-[84px] w-[84px] border-l border-t border-[#22D3EE]/28" />
      <div className="pointer-events-none absolute right-0 top-0 h-[84px] w-[84px] border-r border-t border-[#22D3EE]/28" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[84px] w-[84px] border-b border-l border-[#00D4AA]/10" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[84px] w-[84px] border-b border-r border-[#00D4AA]/10" />

      {/* Side decorative channels */}
      <div className="pointer-events-none absolute inset-y-[14%] left-[15%] hidden w-[12%] border-x border-[#00D4AA]/8 bg-[linear-gradient(90deg,transparent,rgba(0,212,170,0.04),transparent)] lg:block" />
      <div className="pointer-events-none absolute inset-y-[14%] right-[15%] hidden w-[12%] border-x border-[#3B82F6]/8 bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.04),transparent)] lg:block" />
      <div className="pointer-events-none absolute inset-x-[18%] top-[214px] hidden h-px bg-gradient-to-r from-transparent via-[#22D3EE]/20 to-transparent lg:block" />
      <div className="pointer-events-none absolute left-[14%] top-[28%] hidden h-[220px] w-[220px] rounded-full border border-[#00D4AA]/8 lg:block" />
      <div className="pointer-events-none absolute right-[14%] top-[26%] hidden h-[240px] w-[240px] rounded-full border border-[#3B82F6]/8 lg:block" />

      {/* Central atmospheric column */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[58vh] w-[310px] -translate-x-1/2 blur-3xl"
        style={{ background: "linear-gradient(180deg, rgba(0,212,170,0.08) 0%, rgba(59,130,246,0.06) 42%, transparent 100%)" }} />

      {/* ── Scene components ─────────────────────────────────────── */}
      <TopBrandFrame subtitle={copy.platformSubtitle} />
      <DataScreenBackdrop />

      {/* Brand beacon below header */}
      <div className="pointer-events-none absolute left-1/2 top-[150px] hidden h-[210px] w-[240px] -translate-x-1/2 lg:block">
        <div className="absolute inset-x-[20%] top-0 h-[154px] bg-[linear-gradient(180deg,rgba(0,212,170,0.18),rgba(59,130,246,0.04)_58%,transparent)] blur-md"
          style={{ clipPath: "polygon(32% 0%,68% 0%,86% 100%,14% 100%)", animation: "background-breathe 9s ease-in-out infinite" }} />
        <div className="absolute inset-x-[4%] top-[52px] h-px bg-gradient-to-r from-transparent via-[#22D3EE]/24 to-transparent" />
        <div className="absolute inset-x-[10%] top-[86px] h-px bg-gradient-to-r from-transparent via-[#00D4AA]/14 to-transparent" />
      </div>

      {/* ── Perspective floor ─────────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-[-30%] left-1/2 h-[78vh] w-[182vw] -translate-x-1/2 opacity-[0.12] [background-image:linear-gradient(rgba(34,211,238,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.08)_1px,transparent_1px)] [background-size:88px_88px] [transform:perspective(1440px)_rotateX(80deg)]" />
      <div className="pointer-events-none absolute bottom-[-18%] left-1/2 h-[70vh] w-[150vw] -translate-x-1/2 opacity-[0.08] [background-image:linear-gradient(rgba(0,212,170,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px)] [background-size:44px_44px] [transform:perspective(1440px)_rotateX(80deg)]" />
      <div className="pointer-events-none absolute bottom-[30%] left-1/2 h-[2px] w-[82vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#22D3EE]/18 to-transparent" style={{ animation: "horizon-glow 5s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute bottom-[25%] left-1/2 h-[120px] w-[86vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.06),transparent_54%)] blur-2xl" />

      {/* ── Login form ───────────────────────────────────────────── */}
      <div className="relative z-30 flex h-full items-center justify-center px-4 py-20 sm:px-8 sm:py-24 lg:pt-32 lg:pb-20">
        <div className="relative mx-auto w-full lg:mt-10" style={{ width: "min(100%, 614px)" }}>
          <div className="pointer-events-none absolute inset-x-10 top-[-28px] h-[92px] bg-[radial-gradient(ellipse_at_center,rgba(0,212,170,0.14),transparent_72%)] blur-3xl" />
          <div className="pointer-events-none absolute inset-x-8 bottom-[-26px] h-[94px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.12),transparent_72%)] blur-3xl" />
          <div className="pointer-events-none absolute inset-x-[-32px] top-[-24px] hidden h-[74px] lg:block">
            <div className="absolute left-0 top-[16px] h-[30px] w-[188px] border border-[#22D3EE]/14 bg-[linear-gradient(180deg,rgba(8,18,36,0.5),rgba(4,10,20,0.04))]" style={{ clipPath: "polygon(18% 0%,100% 0%,82% 100%,0% 100%)" }} />
            <div className="absolute right-0 top-[16px] h-[30px] w-[188px] border border-[#22D3EE]/14 bg-[linear-gradient(180deg,rgba(8,18,36,0.5),rgba(4,10,20,0.04))]" style={{ clipPath: "polygon(0% 0%,82% 0%,100% 100%,18% 100%)" }} />
            <div className="absolute left-1/2 top-0 h-px w-[154px] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#00D4AA]/52 to-transparent" />
          </div>

          <div
            className="relative overflow-hidden border border-[#244d86] bg-[linear-gradient(180deg,rgba(10,20,41,0.96),rgba(6,12,28,0.98))] px-7 pb-8 pt-7 shadow-[0_0_0_1px_rgba(34,211,238,0.05)_inset,0_0_42px_rgba(0,212,170,0.07),0_28px_64px_rgba(0,0,0,0.44)] sm:px-9 sm:pb-9 sm:pt-8"
            style={{ clipPath: "polygon(5.2% 0%,94.8% 0%,100% 5.8%,100% 94.2%,94.8% 100%,5.2% 100%,0% 94.2%,0% 5.8%)" }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,212,170,0.09),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.08),transparent_42%)]" />
            <div className="absolute inset-[8px] border border-[#22D3EE]/8" style={{ clipPath: "polygon(5.2% 0%,94.8% 0%,100% 5.8%,100% 94.2%,94.8% 100%,5.2% 100%,0% 94.2%,0% 5.8%)" }} />
            <div className="absolute inset-x-[24%] top-0 h-px bg-gradient-to-r from-transparent via-[#22D3EE]/54 to-transparent" />
            <div className="absolute inset-x-[27%] bottom-0 h-px bg-gradient-to-r from-transparent via-[#00D4AA]/34 to-transparent" />
            <div className="absolute left-[10px] top-[10px] h-4 w-4 border-l-2 border-t-2 border-[#22D3EE]/30" />
            <div className="absolute right-[10px] top-[10px] h-4 w-4 border-r-2 border-t-2 border-[#22D3EE]/30" />
            <div className="absolute bottom-[10px] left-[10px] h-4 w-4 border-b-2 border-l-2 border-[#00D4AA]/18" />
            <div className="absolute bottom-[10px] right-[10px] h-4 w-4 border-b-2 border-r-2 border-[#00D4AA]/18" />
            <div className="absolute bottom-[72px] left-0 top-[100px] w-[1px] bg-gradient-to-b from-transparent via-[#22D3EE]/10 to-transparent" />
            <div className="absolute bottom-[72px] right-0 top-[100px] w-[1px] bg-gradient-to-b from-transparent via-[#22D3EE]/10 to-transparent" />
            <div className="absolute left-1/2 top-[10px] h-[4px] w-[70px] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-[#22D3EE]/46 to-transparent" />
            <div className="absolute bottom-[10px] left-1/2 h-[4px] w-[84px] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-[#00D4AA]/32 to-transparent" />
            <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
            <div
              className="absolute inset-x-[12%] top-0 h-24 bg-[linear-gradient(180deg,rgba(0,212,170,0),rgba(0,212,170,0.18),rgba(59,130,246,0))] blur-2xl"
              style={{ animation: "scan-sweep 8.5s linear infinite" }}
            />

            <div className="relative z-10">
              <div className="flex justify-start">
                <div className="flex items-center overflow-hidden rounded-[12px] border border-[#1d4b78] bg-[rgba(6,15,31,0.84)] shadow-[0_0_16px_rgba(0,212,170,0.05)]">
                  {LANGUAGE_OPTIONS.map((option) => {
                    const active = locale === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setLanguage(option.key)}
                        className={cn(
                          "min-w-[78px] px-4 py-2.5 text-[12px] font-bold tracking-[0.14em] transition-colors",
                          active
                            ? "bg-[linear-gradient(90deg,rgba(0,212,170,0.92),rgba(59,130,246,0.88))] text-white"
                            : "text-[#7d94b3] hover:text-[#defdff]"
                        )}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-12 text-center">
                <div className="mx-auto mb-3 h-px w-[124px] bg-gradient-to-r from-transparent via-[#22D3EE]/36 to-transparent" />
                <h1 className="text-[2.8rem] font-black tracking-[0.04em] text-white sm:text-[3.35rem]">{copy.welcome}</h1>
                <div className="mt-2 bg-gradient-to-r from-[#00D4AA] via-[#22D3EE] to-[#3B82F6] bg-clip-text text-[13px] font-semibold tracking-[0.24em] text-transparent">{copy.welcomeCaption}</div>
              </div>

              <form className="mt-10 space-y-5" onSubmit={handleSubmit} noValidate>
                <div className="relative">
                  <div className="pointer-events-none absolute left-[18px] top-1/2 h-[28px] w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-[#00D4AA] to-[#22D3EE]" />
                  <User className="pointer-events-none absolute left-7 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[#87c7ed]" />
                  <input
                    ref={accountInputRef}
                    value={account}
                    onChange={(event) => {
                      setAccount(event.target.value)
                      if (fieldErrors.account) {
                        validateField("account", event.target.value)
                      }
                    }}
                    onBlur={(event) => {
                      const normalizedValue = normalizeCredentialValue(event.target.value)
                      if (normalizedValue !== account) {
                        setAccount(normalizedValue)
                      }
                      validateField("account", normalizedValue)
                    }}
                    placeholder={copy.accountPlaceholder}
                    autoComplete="username"
                    spellCheck={false}
                    aria-invalid={Boolean(fieldErrors.account)}
                    aria-describedby={fieldErrors.account ? "account-error" : undefined}
                    className={cn(
                      "h-[60px] w-full rounded-[17px] border bg-[linear-gradient(180deg,rgba(9,21,42,0.9),rgba(8,17,35,0.94))] pr-6 text-[15px] text-[#ECF7FF] outline-none transition-all placeholder:text-[#7E94B4]",
                      fieldErrors.account
                        ? "border-[#ff7b7b] shadow-[0_0_0_1px_rgba(255,123,123,0.08)_inset,0_0_18px_rgba(255,123,123,0.08)]"
                        : "border-[#214b78] focus:border-[#00D4AA] focus:shadow-[0_0_0_1px_rgba(0,212,170,0.08)_inset,0_0_18px_rgba(34,211,238,0.08)]"
                    )}
                    style={{ paddingLeft: 62 }}
                  />
                  {fieldErrors.account ? (
                    <p id="account-error" className="mt-2 pl-1 text-[13px] text-[#ffb8c2]">
                      {fieldErrors.account}
                    </p>
                  ) : null}
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute left-[18px] top-1/2 h-[28px] w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-[#00D4AA] to-[#22D3EE]" />
                  <LockKeyhole className="pointer-events-none absolute left-7 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[#87c7ed]" />
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      if (fieldErrors.password) {
                        validateField("password", event.target.value)
                      }
                    }}
                    onBlur={(event) => {
                      const normalizedValue = normalizeCredentialValue(event.target.value)
                      if (normalizedValue !== password) {
                        setPassword(normalizedValue)
                      }
                      validateField("password", normalizedValue)
                    }}
                    placeholder={copy.passwordPlaceholder}
                    autoComplete="current-password"
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "password-error" : undefined}
                    className={cn(
                      "h-[60px] w-full rounded-[17px] border bg-[linear-gradient(180deg,rgba(9,21,42,0.9),rgba(8,17,35,0.94))] pr-14 text-[15px] text-[#ECF7FF] outline-none transition-all placeholder:text-[#7E94B4]",
                      fieldErrors.password
                        ? "border-[#ff7b7b] shadow-[0_0_0_1px_rgba(255,123,123,0.08)_inset,0_0_18px_rgba(255,123,123,0.08)]"
                        : "border-[#214b78] focus:border-[#00D4AA] focus:shadow-[0_0_0_1px_rgba(0,212,170,0.08)_inset,0_0_18px_rgba(34,211,238,0.08)]"
                    )}
                    style={{ paddingLeft: 62 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-[#7990C2] transition-colors hover:text-[#9ef4ec]"
                    aria-label={locale === "zh" ? "切换密码显示" : "Toggle password visibility"}
                  >
                    {showPassword ? <Eye className="h-[20px] w-[20px]" /> : <EyeOff className="h-[20px] w-[20px]" />}
                  </button>
                  {fieldErrors.password ? (
                    <p id="password-error" className="mt-2 pl-1 text-[13px] text-[#ffb8c2]">
                      {fieldErrors.password}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-6 pt-1 text-[14px]">
                  <label className="flex cursor-pointer items-center gap-3 text-[#B9C5D6]">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="h-[17px] w-[17px] rounded-[3px] border border-[#2A6BC4] bg-[#071729] accent-[#00D4AA]"
                    />
                    <span className="text-[14px]">{copy.remember}</span>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="group relative mt-3 flex h-[68px] w-full items-center justify-center gap-4 rounded-[20px] border border-[#22D3EE]/16 bg-[linear-gradient(90deg,#00D4AA_0%,#22D3EE_42%,#3B82F6_100%)] text-[1rem] font-black tracking-[0.16em] text-white shadow-[0_0_22px_rgba(0,212,170,0.12),0_16px_30px_rgba(17,72,166,0.24)] transition-all hover:brightness-105 hover:shadow-[0_0_26px_rgba(0,212,170,0.16),0_16px_32px_rgba(17,72,166,0.28)] disabled:opacity-75"
                >
                  <span className="absolute inset-y-0 left-0 w-[28%] rounded-[20px] bg-[linear-gradient(90deg,rgba(255,255,255,0.14),transparent)] blur-sm" />
                  <span className="relative">{submitting ? `${copy.submit}...` : copy.submit}</span>
                  <ArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
