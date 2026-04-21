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
    accountPlaceholder: "请输入用户名",
    passwordPlaceholder: "请输入登录密码",
    remember: "记住密码",
    forgot: "忘记密码？",
    submit: "登录平台",
    subtitle: "",
  },
  en: {
    welcome: "Welcome Login",
    accountPlaceholder: "Enter username",
    passwordPlaceholder: "Enter your password",
    remember: "Remember password",
    forgot: "Forgot password?",
    submit: "Enter Platform",
    subtitle: "Data Monitoring Cloud Platform",
  },
}

const LANGUAGE_OPTIONS: Array<{ key: Locale; label: string }> = [
  { key: "zh", label: "中文" },
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

function ConstellationField({ mirrored = false, className }: { mirrored?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 420 260"
      className={cn(className, mirrored && "-scale-x-100")}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="rgba(61,198,255,0.2)" strokeWidth="1.3">
        <path d="M24 168L82 106L162 128L232 64L310 90L394 38" />
        <path d="M82 106L98 192L162 128L214 180L310 90L338 172" />
        <path d="M214 180L156 236" />
        <path d="M338 172L392 220" />
      </g>
      {[
        [24, 168],
        [82, 106],
        [98, 192],
        [162, 128],
        [232, 64],
        [214, 180],
        [310, 90],
        [338, 172],
        [394, 38],
        [392, 220],
        [156, 236],
      ].map(([cx, cy], index) => (
        <g key={index}>
          <circle cx={cx} cy={cy} r="3.6" fill="rgba(114,245,255,0.86)" />
          <circle cx={cx} cy={cy} r="8.4" stroke="rgba(114,245,255,0.12)" strokeWidth="1" />
        </g>
      ))}
      <path d="M16 224H404" stroke="rgba(41,166,255,0.1)" strokeDasharray="5 8" />
      <path d="M210 20V244" stroke="rgba(41,166,255,0.08)" strokeDasharray="5 8" />
    </svg>
  )
}

function SceneWing({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-[74px] hidden h-[338px] w-[43vw] max-w-[780px] lg:block",
        mirrored ? "right-[16px] -scale-x-100" : "left-[16px]"
      )}
    >
      <div
        className="absolute inset-0 border border-[#11456e]/40 bg-[linear-gradient(180deg,rgba(5,14,30,0.34),rgba(4,10,20,0.05))]"
        style={{ clipPath: "polygon(0% 18%,8% 2%,42% 2%,48% 0%,92% 0%,100% 18%,100% 86%,96% 98%,0% 98%)" }}
      />
      <div
        className="absolute inset-[12px] border border-[#0f3456]/44"
        style={{ clipPath: "polygon(0% 20%,10% 0%,38% 0%,44% 8%,88% 8%,100% 20%,100% 86%,92% 100%,0% 100%)" }}
      />
      <div className="absolute left-[2%] top-[10px] h-[5px] w-[23%] rounded-full bg-gradient-to-r from-[#1c5fff]/0 via-[#1aa9ff]/88 to-[#33f0ff]" />
      <div className="absolute left-[8%] top-[20px] h-[30px] w-[110px] border-l border-t border-[#1bd8ff]/34 [clip-path:polygon(0%_100%,16%_0%,100%_0%,82%_100%)]" />
      <div className="absolute left-[17%] top-[32px] h-px w-[42%] bg-gradient-to-r from-[#18d8ff]/0 via-[#18d8ff]/42 to-[#18d8ff]/0" />
      <div className="absolute right-[9%] top-[28px] h-px w-[24%] bg-gradient-to-r from-[#18d8ff]/0 via-[#18d8ff]/24 to-[#18d8ff]/0" />
      <div className="absolute left-[10%] top-[56px] h-[170px] w-[232px] opacity-34 [background-image:linear-gradient(rgba(45,210,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(45,210,255,0.12)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute left-[8%] top-[88px] h-[182px] w-[248px] opacity-30">
        <ConstellationField className="h-full w-full" />
      </div>
      <div className="absolute right-[6%] top-[42px] h-[202px] w-[294px] opacity-16 [background-image:radial-gradient(circle,rgba(39,168,255,0.56)_1px,transparent_1.4px)] [background-size:12px_12px]" />
      <div className="absolute right-[10%] top-[82px] h-[136px] w-[228px] rounded-[30px] border border-[#10375b]/28 bg-[radial-gradient(circle_at_50%_50%,rgba(20,128,255,0.11),transparent_74%)]" />
      <div className="absolute left-[5%] bottom-[18px] h-px w-[34%] bg-gradient-to-r from-[#2ae1ff]/0 via-[#2ae1ff]/24 to-[#2ae1ff]/0" />
      <div className="absolute right-[8%] bottom-[26px] h-px w-[20%] bg-gradient-to-r from-[#2ae1ff]/0 via-[#2ae1ff]/18 to-[#2ae1ff]/0" />
    </div>
  )
}

function TopBrandMarquee({ subtitle }: { subtitle: string }) {
  return (
    <div className="pointer-events-none relative mx-auto flex w-full max-w-[1760px] items-start justify-center px-4 sm:px-6 lg:px-10">
      <SceneWing />
      <SceneWing mirrored />

      <div className="absolute inset-x-[6%] top-[40px] hidden h-px bg-gradient-to-r from-transparent via-[#28dfff]/26 to-transparent lg:block" />
      <div className="absolute left-[calc(50%-590px)] top-[58px] hidden h-px w-[340px] bg-gradient-to-r from-[#2de6ff]/0 via-[#2de6ff]/52 to-[#2de6ff]/0 lg:block" />
      <div className="absolute left-[calc(50%+250px)] top-[58px] hidden h-px w-[340px] bg-gradient-to-r from-[#2de6ff]/0 via-[#2de6ff]/52 to-[#2de6ff]/0 lg:block" />
      <div className="absolute left-[calc(50%-620px)] top-[70px] hidden h-[2px] w-[120px] rounded-full bg-gradient-to-r from-[#2281ff]/0 via-[#2281ff]/72 to-[#34f0ff] lg:block" />
      <div className="absolute left-[calc(50%+500px)] top-[70px] hidden h-[2px] w-[120px] rounded-full bg-gradient-to-r from-[#34f0ff] via-[#2281ff]/72 to-[#2281ff]/0 lg:block" />

      <div className="relative w-full max-w-[760px] pt-4 sm:pt-5 lg:pt-6">
        <div className="absolute inset-x-[10%] top-[0] hidden h-[118px] border border-[#1a72ff]/16 bg-[linear-gradient(180deg,rgba(6,18,38,0.42),rgba(4,10,20,0.08))] [clip-path:polygon(0%_44%,10%_10%,28%_10%,34%_0%,66%_0%,72%_10%,90%_10%,100%_44%,96%_100%,4%_100%)] lg:block" />
        <div className="absolute left-[12%] top-[14px] hidden h-px w-[12%] bg-gradient-to-r from-transparent via-[#4de6ff]/44 to-transparent lg:block" />
        <div className="absolute right-[12%] top-[14px] hidden h-px w-[12%] bg-gradient-to-r from-transparent via-[#4de6ff]/44 to-transparent lg:block" />
        <div className="absolute left-[7%] top-[26px] hidden h-[30px] w-[132px] border-l border-t border-[#2ad8ff]/30 [clip-path:polygon(0%_100%,14%_0%,100%_0%,86%_100%)] lg:block" />
        <div className="absolute right-[7%] top-[26px] hidden h-[30px] w-[132px] border-r border-t border-[#2ad8ff]/30 [clip-path:polygon(14%_0%,100%_100%,86%_100%,0%_0%)] lg:block" />
        <div className="absolute left-1/2 top-[-14px] h-[102px] w-[460px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(56,214,255,0.24),transparent_72%)] blur-3xl" />
        <div
          className="relative overflow-hidden border border-[#1ca7ff]/40 bg-[linear-gradient(180deg,rgba(5,16,34,0.96),rgba(6,14,28,0.9))] px-6 pb-5 pt-5 shadow-[0_0_46px_rgba(22,122,255,0.22),inset_0_0_20px_rgba(61,226,255,0.06)]"
          style={{ clipPath: "polygon(8% 0%,28% 0%,32% 12%,68% 12%,72% 0%,92% 0%,100% 36%,94% 100%,6% 100%,0% 36%)" }}
        >
          <div className="pointer-events-none absolute inset-[8px] border border-[#38dfff]/12" style={{ clipPath: "polygon(8% 0%,28% 0%,32% 12%,68% 12%,72% 0%,92% 0%,100% 36%,94% 100%,6% 100%,0% 36%)" }} />
          <div className="pointer-events-none absolute inset-x-[18%] top-0 h-px bg-gradient-to-r from-transparent via-[#68e9ff]/84 to-transparent" />
          <div className="pointer-events-none absolute inset-x-[22%] bottom-0 h-px bg-gradient-to-r from-transparent via-[#41d9ff]/56 to-transparent" />
          <div className="pointer-events-none absolute left-[10%] top-[18px] h-px w-[16%] bg-gradient-to-r from-transparent via-[#4ce1ff]/42 to-transparent" />
          <div className="pointer-events-none absolute right-[10%] top-[18px] h-px w-[16%] bg-gradient-to-r from-transparent via-[#4ce1ff]/42 to-transparent" />
          <div className="pointer-events-none absolute left-[18%] top-[12px] h-[2px] w-[24%] rounded-full bg-gradient-to-r from-[#2d79ff]/0 via-[#2d79ff]/54 to-[#36ecff]/82" />
          <div className="pointer-events-none absolute right-[18%] top-[12px] h-[2px] w-[24%] rounded-full bg-gradient-to-r from-[#36ecff]/82 via-[#2d79ff]/54 to-[#2d79ff]/0" />
          <div className="pointer-events-none absolute left-[8%] bottom-[18px] h-[14px] w-[14px] border-l border-b border-[#59ebff]/26" />
          <div className="pointer-events-none absolute right-[8%] bottom-[18px] h-[14px] w-[14px] border-r border-b border-[#59ebff]/26" />
          <div className="pointer-events-none absolute left-1/2 top-[20px] h-[10px] w-[116px] -translate-x-1/2 rounded-full border border-[#58ecff]/18 bg-[radial-gradient(circle,rgba(120,244,255,0.16),rgba(7,18,34,0.06)_72%)]" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center gap-3 sm:gap-4">
              <EnerCloudIcon className="h-[50px] w-[50px] drop-shadow-[0_0_16px_rgba(68,232,255,0.26)] sm:h-[54px] sm:w-[54px]" />
              <div
                className="bg-clip-text text-[2.4rem] font-black leading-none tracking-[0.04em] text-transparent sm:text-[3.2rem]"
                style={{ backgroundImage: "linear-gradient(180deg,#ffffff 0%,#dff7ff 40%,#84ebff 100%)" }}
              >
                {BRAND}
              </div>
            </div>
            <div className="mt-1 text-[11px] font-semibold tracking-[0.42em] text-[#49d6ff] sm:text-[13px]">{subtitle}</div>
          </div>
        </div>

        <div className="absolute left-1/2 top-[100%] h-[24px] w-[250px] -translate-x-1/2 border border-[#2de6ff]/12 bg-[linear-gradient(180deg,rgba(11,34,58,0.28),rgba(4,10,20,0.06))] [clip-path:polygon(14%_0%,86%_0%,100%_100%,0%_100%)]" />
        <div className="absolute left-1/2 top-[calc(100%+24px)] h-[2px] w-[150px] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-[#35e7ff]/46 to-transparent" />
      </div>
    </div>
  )
}

function EnergyPlatform() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-full h-[340px] w-[960px] origin-top -translate-x-1/2 -translate-y-[40%] scale-[0.8] sm:scale-[0.92] lg:scale-100">
      <div className="absolute left-1/2 top-[10px] h-[176px] w-[40px] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(112,246,255,0.34),rgba(86,224,255,0.12)_52%,transparent)] blur-md" />
      <div className="absolute left-1/2 top-[56px] h-[170px] w-[170px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(194,248,255,0.94),rgba(76,214,255,0.82)_20%,rgba(36,122,255,0.3)_48%,transparent_74%)] blur-lg" />
      <div className="absolute left-1/2 top-[102px] h-[14px] w-[540px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(93,228,255,0.54),transparent_72%)] blur-xl" />
      <div className="absolute left-1/2 top-[128px] h-[120px] w-[120px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(122,236,255,0.28),transparent_70%)] blur-2xl" />
      <svg viewBox="0 0 960 340" className="absolute inset-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="480" cy="186" rx="284" ry="86" stroke="rgba(70,214,255,0.64)" strokeWidth="2.2" />
        <ellipse cx="480" cy="186" rx="246" ry="72" stroke="rgba(70,214,255,0.26)" strokeWidth="1.8" strokeDasharray="12 10" />
        <ellipse cx="480" cy="186" rx="204" ry="56" stroke="rgba(70,214,255,0.38)" strokeWidth="2" />
        <ellipse cx="480" cy="186" rx="148" ry="36" stroke="rgba(95,228,255,0.88)" strokeWidth="2.6" />
        <ellipse cx="480" cy="186" rx="96" ry="22" stroke="rgba(139,242,255,0.96)" strokeWidth="2.8" />
        <ellipse cx="480" cy="186" rx="62" ry="14" stroke="rgba(216,252,255,0.98)" strokeWidth="2.4" />
        <path d="M244 184C286 134 364 106 480 106C596 106 674 134 716 184" stroke="rgba(74,208,255,0.26)" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M196 186C254 246 338 274 480 274C622 274 706 246 764 186" stroke="rgba(49,162,255,0.2)" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M350 124C390 104 430 94 480 94C530 94 570 104 610 124" stroke="rgba(114,242,255,0.28)" strokeWidth="2" strokeDasharray="9 8" strokeLinecap="round" />
        <path d="M304 186H656" stroke="rgba(58,200,255,0.2)" strokeWidth="1.5" strokeDasharray="8 8" />
        <path d="M268 186C320 170 370 164 480 164C590 164 640 170 692 186" stroke="rgba(95,228,255,0.18)" strokeWidth="2" strokeDasharray="7 9" />
        <path d="M336 152C380 138 420 132 480 132C540 132 580 138 624 152" stroke="rgba(95,228,255,0.16)" strokeWidth="2" strokeDasharray="7 9" />
      </svg>
    </div>
  )
}

function DigitalTwinBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block">
      <div
        className="absolute inset-x-[5%] top-[92px] h-[560px] opacity-[0.74]"
        style={{ animation: "background-breathe 16s ease-in-out infinite" }}
      >
        <svg viewBox="0 0 1600 720" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="login-twin-cyan" x1="276" y1="178" x2="1260" y2="472" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(86,239,255,0)" />
              <stop offset="0.2" stopColor="rgba(86,239,255,0.72)" />
              <stop offset="0.5" stopColor="rgba(57,170,255,0.92)" />
              <stop offset="0.8" stopColor="rgba(86,239,255,0.72)" />
              <stop offset="100%" stopColor="rgba(86,239,255,0)" />
            </linearGradient>
            <linearGradient id="login-twin-blue" x1="800" y1="92" x2="800" y2="604" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(105,238,255,0.84)" />
              <stop offset="0.42" stopColor="rgba(67,172,255,0.34)" />
              <stop offset="100%" stopColor="rgba(67,172,255,0)" />
            </linearGradient>
            <linearGradient id="login-twin-floor" x1="190" y1="520" x2="1410" y2="520" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(86,239,255,0)" />
              <stop offset="0.5" stopColor="rgba(86,239,255,0.62)" />
              <stop offset="100%" stopColor="rgba(86,239,255,0)" />
            </linearGradient>
            <radialGradient id="login-twin-core" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(800 242) rotate(90) scale(110 340)">
              <stop offset="0%" stopColor="rgba(86,239,255,0.28)" />
              <stop offset="0.54" stopColor="rgba(40,153,255,0.16)" />
              <stop offset="100%" stopColor="rgba(40,153,255,0)" />
            </radialGradient>
          </defs>

          <ellipse cx="800" cy="236" rx="368" ry="108" fill="url(#login-twin-core)" />
          <ellipse cx="800" cy="248" rx="414" ry="126" stroke="url(#login-twin-cyan)" strokeWidth="1.4" opacity="0.38" />
          <ellipse cx="800" cy="248" rx="332" ry="94" stroke="url(#login-twin-cyan)" strokeWidth="1.2" strokeDasharray="8 10" opacity="0.28" />
          <path d="M742 114L800 178L858 114" stroke="url(#login-twin-cyan)" strokeWidth="1.6" strokeLinecap="round" opacity="0.44" />
          <path d="M800 178V364" stroke="url(#login-twin-blue)" strokeWidth="1.4" strokeDasharray="6 12" opacity="0.38" />

          <g opacity="0.38">
            <ellipse cx="242" cy="238" rx="190" ry="132" stroke="url(#login-twin-cyan)" strokeWidth="1.6" />
            <ellipse cx="242" cy="238" rx="148" ry="102" stroke="rgba(84,236,255,0.26)" strokeWidth="1.2" strokeDasharray="8 10" />
            <path d="M54 238H430" stroke="url(#login-twin-floor)" strokeWidth="1.1" strokeDasharray="6 12" />
            <path d="M112 156L178 122L260 142L332 110L410 146" stroke="url(#login-twin-cyan)" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M178 122L198 244L260 142L318 228L332 110" stroke="rgba(84,236,255,0.28)" strokeWidth="1.3" />
            <circle cx="112" cy="156" r="3.6" fill="rgba(122,244,255,0.82)" />
            <circle cx="178" cy="122" r="3.2" fill="rgba(122,244,255,0.78)" />
            <circle cx="260" cy="142" r="3.2" fill="rgba(122,244,255,0.78)" />
            <circle cx="332" cy="110" r="3.2" fill="rgba(122,244,255,0.78)" />
            <circle cx="318" cy="228" r="3.2" fill="rgba(122,244,255,0.76)" />
          </g>

          <g opacity="0.38">
            <ellipse cx="1358" cy="232" rx="190" ry="132" stroke="url(#login-twin-cyan)" strokeWidth="1.6" />
            <ellipse cx="1358" cy="232" rx="148" ry="102" stroke="rgba(84,236,255,0.26)" strokeWidth="1.2" strokeDasharray="8 10" />
            <path d="M1170 232H1546" stroke="url(#login-twin-floor)" strokeWidth="1.1" strokeDasharray="6 12" />
            <path d="M1192 146L1270 110L1342 142L1424 120L1490 156" stroke="url(#login-twin-cyan)" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M1270 110L1284 224L1342 142L1404 246L1424 120" stroke="rgba(84,236,255,0.28)" strokeWidth="1.3" />
            <circle cx="1192" cy="146" r="3.2" fill="rgba(122,244,255,0.78)" />
            <circle cx="1270" cy="110" r="3.2" fill="rgba(122,244,255,0.78)" />
            <circle cx="1342" cy="142" r="3.2" fill="rgba(122,244,255,0.78)" />
            <circle cx="1424" cy="120" r="3.2" fill="rgba(122,244,255,0.78)" />
            <circle cx="1490" cy="156" r="3.6" fill="rgba(122,244,255,0.82)" />
          </g>

          <g opacity="0.48">
            <path d="M484 282L604 216L756 246L888 198L1040 236L1136 302" stroke="url(#login-twin-cyan)" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M604 216L646 344L756 246L854 354L1040 236L1102 340" stroke="rgba(84,236,255,0.34)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M646 344L570 410" stroke="rgba(84,236,255,0.22)" strokeWidth="1.3" />
            <path d="M854 354L944 420" stroke="rgba(84,236,255,0.22)" strokeWidth="1.3" />
            <path d="M570 410L720 458L944 420L1088 470" stroke="rgba(84,236,255,0.18)" strokeWidth="1.2" strokeDasharray="8 10" />
            {[
              [484, 282],
              [604, 216],
              [646, 344],
              [756, 246],
              [854, 354],
              [888, 198],
              [1040, 236],
              [1102, 340],
              [1136, 302],
              [570, 410],
              [720, 458],
              [944, 420],
              [1088, 470],
            ].map(([cx, cy], index) => (
              <g key={index}>
                <circle cx={cx} cy={cy} r="3.4" fill="rgba(126,244,255,0.84)" />
                <circle cx={cx} cy={cy} r="8.4" stroke="rgba(126,244,255,0.14)" strokeWidth="1" />
              </g>
            ))}
          </g>

          <g opacity="0.28">
            <path d="M184 518H1416" stroke="url(#login-twin-floor)" strokeWidth="1.2" strokeDasharray="10 10" />
            <path d="M258 564H1342" stroke="url(#login-twin-floor)" strokeWidth="1.1" strokeDasharray="8 12" />
            <path d="M336 608H1264" stroke="url(#login-twin-floor)" strokeWidth="0.9" strokeDasharray="6 12" />
            <path d="M452 454L800 388L1148 454" stroke="rgba(84,236,255,0.28)" strokeWidth="1.4" />
            <path d="M376 502L800 426L1224 502" stroke="rgba(84,236,255,0.22)" strokeWidth="1.3" />
            <path d="M286 560L800 464L1314 560" stroke="rgba(84,236,255,0.18)" strokeWidth="1.1" />
            <path d="M170 720L650 492" stroke="rgba(84,236,255,0.16)" strokeWidth="1" />
            <path d="M344 720L726 492" stroke="rgba(84,236,255,0.12)" strokeWidth="1" />
            <path d="M800 720V484" stroke="rgba(84,236,255,0.12)" strokeWidth="1" />
            <path d="M1256 720L874 492" stroke="rgba(84,236,255,0.12)" strokeWidth="1" />
            <path d="M1430 720L950 492" stroke="rgba(84,236,255,0.16)" strokeWidth="1" />
          </g>
        </svg>
      </div>
    </div>
  )
}

function BackgroundScene() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(68,156,255,0.34),transparent_34%),radial-gradient(circle_at_50%_18%,rgba(48,132,255,0.2),transparent_22%),radial-gradient(circle_at_14%_22%,rgba(34,208,255,0.18),transparent_22%),radial-gradient(circle_at_86%_22%,rgba(41,146,255,0.2),transparent_22%),linear-gradient(180deg,#081624_0%,#08131f_36%,#030a13_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(38,214,255,0.1),transparent_22%),radial-gradient(circle_at_50%_56%,rgba(28,112,195,0.2),transparent_24%),radial-gradient(circle_at_50%_80%,rgba(40,209,255,0.14),transparent_28%),radial-gradient(circle_at_30%_74%,rgba(46,118,255,0.08),transparent_24%),radial-gradient(circle_at_70%_74%,rgba(46,118,255,0.08),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle,rgba(96,230,255,0.36)_1px,transparent_1.8px)] [background-size:24px_24px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(44,220,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(44,220,255,0.12)_1px,transparent_1px)] [background-size:100px_100px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.09] [background-image:linear-gradient(38deg,rgba(34,214,255,0.12)_1px,transparent_1px),linear-gradient(-38deg,rgba(34,214,255,0.12)_1px,transparent_1px)] [background-size:150px_150px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[240px] bg-[linear-gradient(180deg,rgba(7,18,34,0.56),rgba(7,18,34,0.1)_60%,transparent_100%)]" />
      <div className="pointer-events-none absolute inset-x-[10%] top-[116px] hidden h-px bg-gradient-to-r from-transparent via-[#31dfff]/22 to-transparent lg:block" />
      <div className="pointer-events-none absolute inset-x-[14%] top-[152px] hidden h-px bg-gradient-to-r from-transparent via-[#1e7dff]/14 to-transparent lg:block" />
      <div className="pointer-events-none absolute left-1/2 top-[136px] hidden h-[420px] w-[1180px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(36,188,255,0.14),transparent_72%)] blur-3xl lg:block" />
      <div className="pointer-events-none absolute left-1/2 top-[150px] hidden h-[320px] w-[240px] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(102,242,255,0.16),rgba(102,242,255,0.03)_64%,transparent)] [clip-path:polygon(44%_0%,56%_0%,100%_100%,0%_100%)] lg:block" />
      <div className="pointer-events-none absolute left-1/2 top-[178px] hidden h-[1px] w-[860px] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#53edff]/22 to-transparent lg:block" />
      <div className="pointer-events-none absolute left-1/2 top-[210px] hidden h-[280px] w-[760px] -translate-x-1/2 rounded-[50%] border border-[#25beff]/10 lg:block" />

      <DigitalTwinBackdrop />

      <div className="pointer-events-none absolute left-[8%] top-[182px] hidden h-[260px] w-[420px] opacity-[0.22] lg:block">
        <div
          className="absolute inset-0 [background-image:radial-gradient(circle,rgba(38,149,255,0.44)_1px,transparent_1.4px)] [background-size:14px_14px]"
          style={{ clipPath: "polygon(2% 52%,16% 36%,34% 28%,48% 32%,56% 40%,70% 36%,84% 44%,86% 58%,74% 72%,56% 76%,38% 72%,20% 78%,8% 68%)" }}
        />
      </div>
      <div className="pointer-events-none absolute right-[8%] top-[176px] hidden h-[268px] w-[440px] opacity-[0.18] lg:block">
        <div
          className="absolute inset-0 [background-image:radial-gradient(circle,rgba(38,149,255,0.44)_1px,transparent_1.4px)] [background-size:14px_14px]"
          style={{ clipPath: "polygon(12% 44%,24% 28%,42% 24%,56% 32%,68% 26%,82% 34%,92% 48%,88% 64%,74% 72%,54% 74%,34% 70%,20% 62%)" }}
        />
      </div>

      <div
        className="pointer-events-none absolute left-[2%] top-[132px] hidden h-[420px] w-[34vw] max-w-[640px] border border-[#0d3657]/34 bg-[linear-gradient(180deg,rgba(7,18,34,0.18),rgba(4,10,20,0.02))] lg:block"
        style={{ clipPath: "polygon(0% 10%,12% 0%,94% 0%,100% 18%,100% 92%,96% 100%,0% 100%)" }}
      />
      <div
        className="pointer-events-none absolute right-[2%] top-[132px] hidden h-[420px] w-[34vw] max-w-[640px] border border-[#0d3657]/34 bg-[linear-gradient(180deg,rgba(7,18,34,0.18),rgba(4,10,20,0.02))] lg:block"
        style={{ clipPath: "polygon(0% 18%,6% 0%,88% 0%,100% 10%,100% 100%,4% 100%,0% 92%)" }}
      />
      <div className="pointer-events-none absolute left-[5%] top-[168px] hidden h-[180px] w-[300px] opacity-26 [background-image:linear-gradient(rgba(49,220,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(49,220,255,0.12)_1px,transparent_1px)] [background-size:26px_26px] lg:block" />
      <div className="pointer-events-none absolute right-[5%] top-[172px] hidden h-[176px] w-[280px] opacity-22 [background-image:linear-gradient(rgba(49,220,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(49,220,255,0.12)_1px,transparent_1px)] [background-size:26px_26px] lg:block" />

      <div className="pointer-events-none absolute left-1/2 bottom-[-22%] h-[66vh] w-[172vw] -translate-x-1/2 opacity-[0.22] [background-image:linear-gradient(rgba(52,206,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(52,206,255,0.18)_1px,transparent_1px)] [background-size:94px_94px] [transform:perspective(1200px)_rotateX(77deg)]" />
      <div className="pointer-events-none absolute left-1/2 bottom-[-18%] h-[62vh] w-[148vw] -translate-x-1/2 opacity-[0.16] [background-image:linear-gradient(rgba(52,206,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(52,206,255,0.14)_1px,transparent_1px)] [background-size:48px_48px] [transform:perspective(1200px)_rotateX(77deg)]" />
      <div className="pointer-events-none absolute left-1/2 bottom-[-12%] h-[54vh] w-[132vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(35,141,255,0.24),transparent_68%)] [transform:perspective(1200px)_rotateX(74deg)]" />
      <div className="pointer-events-none absolute left-1/2 bottom-[8%] h-[18vh] w-[96vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(32,198,255,0.16),transparent_74%)]" />
      <div className="pointer-events-none absolute left-1/2 bottom-[18%] hidden h-[240px] w-[980px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(44,198,255,0.18),transparent_72%)] blur-3xl lg:block" />

      <div className="pointer-events-none absolute left-[-5%] top-[16%] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(30,206,255,0.14),transparent_72%)] blur-3xl" style={{ animation: "background-drift 16s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute right-[-4%] top-[14%] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(43,110,255,0.18),transparent_72%)] blur-3xl" style={{ animation: "background-breathe 12s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute left-1/2 top-[54%] h-[500px] w-[1220px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(34,192,255,0.14),transparent_72%)] blur-3xl" style={{ animation: "background-breathe 14s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute left-1/2 top-[32%] h-[260px] w-[860px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(38,149,255,0.22),transparent_72%)] blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-[46%] h-[220px] w-[1080px] -translate-x-1/2 opacity-[0.22] [background-image:linear-gradient(104deg,transparent_34%,rgba(53,231,255,0.12)_50%,transparent_66%),linear-gradient(76deg,transparent_34%,rgba(53,231,255,0.08)_50%,transparent_66%)] lg:block" />

      <div className="pointer-events-none absolute inset-y-0 left-[18%] hidden w-[14%] bg-[linear-gradient(90deg,transparent,rgba(60,231,255,0.08),transparent)] lg:block" style={{ animation: "field-scan 9s linear infinite" }} />
      <div className="pointer-events-none absolute inset-y-0 right-[16%] hidden w-[12%] bg-[linear-gradient(90deg,transparent,rgba(42,146,255,0.06),transparent)] lg:block" style={{ animation: "field-scan 11s linear infinite reverse" }} />
      <div className="pointer-events-none absolute inset-y-0 left-[32%] hidden w-[8%] bg-[linear-gradient(90deg,transparent,rgba(60,231,255,0.04),transparent)] lg:block" style={{ animation: "field-scan 13s linear infinite reverse" }} />
      <div className="pointer-events-none absolute inset-y-0 right-[31%] hidden w-[8%] bg-[linear-gradient(90deg,transparent,rgba(42,146,255,0.04),transparent)] lg:block" style={{ animation: "field-scan 15s linear infinite" }} />

      <div className="pointer-events-none absolute left-0 top-0 h-20 w-20 border-l-2 border-t-2 border-[#1ce5ff]/24" />
      <div className="pointer-events-none absolute left-[8px] top-[8px] h-10 w-10 border-l border-t border-[#1ce5ff]/14" />
      <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 border-r-2 border-t-2 border-[#1ce5ff]/24" />
      <div className="pointer-events-none absolute right-[8px] top-[8px] h-10 w-10 border-r border-t border-[#1ce5ff]/14" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-20 border-b-2 border-l-2 border-[#1ce5ff]/16" />
      <div className="pointer-events-none absolute bottom-[8px] left-[8px] h-10 w-10 border-b border-l border-[#1ce5ff]/10" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-20 w-20 border-b-2 border-r-2 border-[#1ce5ff]/16" />
      <div className="pointer-events-none absolute bottom-[8px] right-[8px] h-10 w-10 border-b border-r border-[#1ce5ff]/10" />
      <div className="pointer-events-none absolute left-[26px] top-1/2 hidden h-[160px] w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-[#22dfff]/18 to-transparent lg:block" />
      <div className="pointer-events-none absolute right-[26px] top-1/2 hidden h-[160px] w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-[#22dfff]/18 to-transparent lg:block" />
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
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#020813] text-white">
      <style>{`
        @keyframes field-scan {
          0% { transform: translateX(-18%); opacity: 0; }
          18% { opacity: .12; }
          56% { opacity: .28; }
          100% { transform: translateX(18%); opacity: 0; }
        }
        @keyframes background-breathe {
          0%, 100% { opacity: .72; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        @keyframes background-drift {
          0%, 100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(0,-16px,0); }
        }
        @keyframes hud-pulse {
          0%, 100% { opacity: .64; }
          50% { opacity: 1; }
        }
        @keyframes card-float {
          0%, 100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(0,-8px,0); }
        }
        @keyframes orbital-glow {
          0%, 100% { opacity: .55; transform: scale(0.985); }
          50% { opacity: .94; transform: scale(1.02); }
        }
      `}</style>

      <BackgroundScene />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <header className="shrink-0 pt-4 sm:pt-5 lg:pt-6">
          <TopBrandMarquee subtitle={copy.subtitle} />
        </header>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-8 pt-8 sm:px-6 lg:px-8">
          <div className="relative w-full max-w-[760px]">
            <div className="absolute left-1/2 top-[62px] hidden h-[220px] w-[220px] -translate-x-1/2 rounded-full border border-[#2fe8ff]/10 bg-[radial-gradient(circle,rgba(47,232,255,0.08),transparent_70%)] blur-[1px] lg:block" />
            <div className="absolute left-1/2 top-[88px] hidden h-[290px] w-[640px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(22,132,255,0.12),transparent_70%)] blur-3xl lg:block" />

            <div className="relative mx-auto w-full max-w-[492px] translate-y-[-10px] sm:translate-y-[-14px]" style={{ animation: "card-float 7s ease-in-out infinite" }}>
              <EnergyPlatform />

              <div className="pointer-events-none absolute -inset-x-10 -inset-y-10 rounded-full bg-[radial-gradient(circle,rgba(34,196,255,0.2),transparent_70%)] blur-3xl" />
              <div className="pointer-events-none absolute left-1/2 top-[-32px] h-[74px] w-[300px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(72,236,255,0.18),transparent_72%)] blur-2xl" />
              <div className="pointer-events-none absolute left-1/2 top-[calc(100%-12px)] h-[78px] w-[240px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(92,228,255,0.26),transparent_72%)] blur-2xl" />
              <div className="pointer-events-none absolute left-1/2 bottom-[-58px] h-[116px] w-[34px] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(102,242,255,0.22),rgba(102,242,255,0.08)_48%,transparent)] blur-md" />
              <div className="pointer-events-none absolute left-1/2 bottom-[-10px] h-[46px] w-[180px] -translate-x-1/2 border border-[#2de8ff]/12 bg-[linear-gradient(180deg,rgba(8,30,52,0.28),rgba(4,10,20,0.06))] [clip-path:polygon(12%_0%,88%_0%,100%_100%,0%_100%)]" />
              <div className="pointer-events-none absolute left-1/2 bottom-[-8px] h-[14px] w-[220px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(96,232,255,0.32),transparent_72%)] blur-lg" />

              <div
                className="relative overflow-hidden border border-[#33dcff]/44 bg-[linear-gradient(180deg,rgba(5,14,28,0.95),rgba(4,10,20,0.98))] px-6 pb-8 pt-6 shadow-[0_0_0_1px_rgba(69,229,255,0.08)_inset,0_0_56px_rgba(22,132,255,0.22)] sm:px-7"
                style={{ clipPath: "polygon(6% 0%,94% 0%,100% 8%,100% 92%,94% 100%,6% 100%,0% 92%,0% 8%)" }}
              >
                <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-[#5af5ff]/84 to-transparent" />
                <div className="pointer-events-none absolute inset-x-7 bottom-0 h-px bg-gradient-to-r from-transparent via-[#5af5ff]/56 to-transparent" />
                <div className="pointer-events-none absolute inset-[8px] border border-[#2dcfff]/16" style={{ clipPath: "polygon(6% 0%,94% 0%,100% 8%,100% 92%,94% 100%,6% 100%,0% 92%,0% 8%)" }} />
                <div className="pointer-events-none absolute left-[10px] top-[10px] h-5 w-5 border-l-2 border-t-2 border-[#38f0ff]/62" />
                <div className="pointer-events-none absolute right-[10px] top-[10px] h-5 w-5 border-r-2 border-t-2 border-[#38f0ff]/62" />
                <div className="pointer-events-none absolute left-[10px] bottom-[10px] h-5 w-5 border-b-2 border-l-2 border-[#38f0ff]/42" />
                <div className="pointer-events-none absolute right-[10px] bottom-[10px] h-5 w-5 border-b-2 border-r-2 border-[#38f0ff]/42" />
                <div className="pointer-events-none absolute left-[22px] top-[20px] h-[18px] w-[92px] border border-[#2ce8ff]/10 bg-[linear-gradient(180deg,rgba(12,44,66,0.26),rgba(8,14,26,0.04))] [clip-path:polygon(0%_0%,88%_0%,100%_100%,12%_100%)]" />
                <div className="pointer-events-none absolute right-[22px] top-[20px] h-[18px] w-[92px] border border-[#2ce8ff]/10 bg-[linear-gradient(180deg,rgba(12,44,66,0.26),rgba(8,14,26,0.04))] [clip-path:polygon(12%_0%,100%_0%,88%_100%,0%_100%)]" />
                <div className="pointer-events-none absolute inset-y-[88px] left-0 w-[18px] bg-[linear-gradient(180deg,transparent,rgba(54,212,255,0.16),transparent)] blur-sm" />
                <div className="pointer-events-none absolute inset-y-[88px] right-0 w-[18px] bg-[linear-gradient(180deg,transparent,rgba(54,212,255,0.16),transparent)] blur-sm" />

                <div className="relative z-10">
                  <div className="flex justify-start">
                    <div className="flex items-center overflow-hidden rounded-[12px] border border-[#1a5878]/60 bg-[rgba(6,16,34,0.9)] shadow-[0_0_16px_rgba(29,144,208,0.08)]">
                      {LANGUAGE_OPTIONS.map((option) => {
                        const active = locale === option.key

                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setLanguage(option.key)}
                            className={cn(
                              "relative min-w-[72px] px-4 py-2.5 text-[12px] font-bold tracking-[0.14em] transition-colors",
                              active
                                ? "bg-[linear-gradient(90deg,rgba(28,146,255,0.86),rgba(34,92,255,0.78))] text-white shadow-[0_0_18px_rgba(32,128,255,0.36)]"
                                : "text-[#5c879b] hover:text-[#bcf7ff]"
                            )}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mt-10 text-center">
                    <h1 className="text-[2.55rem] font-black tracking-[0.08em] text-white sm:text-[2.8rem]">{copy.welcome}</h1>
                  </div>

                  <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#35e7ff]" />
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
                        className="h-[56px] w-full rounded-[16px] border border-[#1ea5ff]/48 bg-[rgba(8,18,36,0.9)] pl-12 pr-4 text-[15px] text-[#e8f6ff] outline-none transition-all placeholder:text-[#537185] focus:border-[#4cedff] focus:shadow-[0_0_24px_rgba(45,225,255,0.16)]"
                      />
                    </div>

                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#35e7ff]" />
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
                        className="h-[56px] w-full rounded-[16px] border border-[#1ea5ff]/48 bg-[rgba(8,18,36,0.9)] pl-12 pr-12 text-[15px] text-[#e8f6ff] outline-none transition-all placeholder:text-[#537185] focus:border-[#4cedff] focus:shadow-[0_0_24px_rgba(45,225,255,0.16)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#638ca0] transition-colors hover:text-[#b7f7ff]"
                        aria-label={locale === "zh" ? "切换密码显示" : "Toggle password visibility"}
                      >
                        {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-[14px]">
                      <label className="flex cursor-pointer items-center gap-2 text-[#8ab7ca]">
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(event) => setRemember(event.target.checked)}
                          className="h-4 w-4 border border-[#235b76] bg-[#06101e] accent-[#18dff5]"
                        />
                        <span>{copy.remember}</span>
                      </label>
                      <button type="button" className="text-[#36e7ff] transition-colors hover:text-[#b0f7ff]">
                        {copy.forgot}
                      </button>
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="group relative mt-1 flex h-[58px] w-full items-center justify-center gap-3 rounded-full border border-[#46edff]/34 bg-[linear-gradient(90deg,#18b7f4_0%,#22cfff_38%,#2354ff_100%)] text-[1.02rem] font-black tracking-[0.16em] text-white shadow-[0_0_40px_rgba(28,156,255,0.4),inset_0_0_14px_rgba(255,255,255,0.13)] transition-all hover:brightness-110 disabled:opacity-75"
                    >
                      <span className="absolute inset-y-0 left-0 w-[30%] rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.22),transparent)] blur-sm" />
                      <span className="relative">{submitting ? `${copy.submit}...` : copy.submit}</span>
                      <ArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>

                    {submitError ? (
                      <div className="rounded-[16px] border border-[#ff7b7b]/22 bg-[rgba(74,18,28,0.56)] px-4 py-3 text-[13px] text-[#ffd3d8]">
                        {submitError}
                      </div>
                    ) : null}
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
