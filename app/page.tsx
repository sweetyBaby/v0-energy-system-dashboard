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
    <div className="pointer-events-none absolute left-1/2 top-full h-[390px] w-[1040px] origin-top -translate-x-1/2 -translate-y-[42%] scale-[0.78] sm:scale-[0.9] lg:scale-100">
      <div
        className="absolute left-1/2 top-[6px] h-[192px] w-[48px] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(112,246,255,0.42),rgba(86,224,255,0.14)_56%,transparent)] blur-md"
        style={{ animation: "beam-rise 10s ease-in-out infinite" }}
      />
      <div
        className="absolute left-1/2 top-[48px] h-[188px] w-[188px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(214,251,255,0.96),rgba(76,214,255,0.84)_20%,rgba(36,122,255,0.34)_48%,transparent_74%)] blur-lg"
        style={{ animation: "orbital-glow 8s ease-in-out infinite" }}
      />
      <div className="absolute left-1/2 top-[116px] h-[18px] w-[660px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(93,228,255,0.62),transparent_72%)] blur-xl" />
      <div className="absolute left-1/2 top-[144px] h-[134px] w-[134px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(122,236,255,0.3),transparent_70%)] blur-2xl" />
      <div className="absolute left-1/2 top-[168px] h-[104px] w-[780px] -translate-x-1/2 rounded-[50%] border border-[#29d7ff]/10 bg-[radial-gradient(ellipse_at_center,rgba(20,130,255,0.12),transparent_72%)]" />
      <div className="absolute left-[12%] top-[176px] h-[98px] w-[170px] border border-[#1d8eff]/12 bg-[linear-gradient(180deg,rgba(7,26,46,0.28),rgba(4,10,20,0.04))] [clip-path:polygon(0%_22%,18%_0%,100%_0%,82%_100%,0%_100%)]" />
      <div className="absolute right-[12%] top-[176px] h-[98px] w-[170px] border border-[#1d8eff]/12 bg-[linear-gradient(180deg,rgba(7,26,46,0.28),rgba(4,10,20,0.04))] [clip-path:polygon(18%_0%,100%_22%,100%_100%,0%_100%,82%_0%)]" />
      <div className="absolute left-[16%] top-[214px] h-px w-[16%] bg-gradient-to-r from-transparent via-[#53edff]/30 to-transparent" />
      <div className="absolute right-[16%] top-[214px] h-px w-[16%] bg-gradient-to-r from-transparent via-[#53edff]/30 to-transparent" />
      <div
        className="absolute left-[22%] top-[182px] h-[72px] w-[12%] bg-[linear-gradient(90deg,transparent,rgba(84,238,255,0.16),transparent)]"
        style={{ animation: "telemetry-sweep 7.8s linear infinite" }}
      />
      <div
        className="absolute right-[22%] top-[182px] h-[72px] w-[12%] bg-[linear-gradient(90deg,transparent,rgba(84,238,255,0.16),transparent)]"
        style={{ animation: "telemetry-sweep 8.6s linear infinite reverse" }}
      />

      <svg viewBox="0 0 1040 390" className="absolute inset-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="platform-ring" x1="214" y1="110" x2="826" y2="272" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(81,236,255,0)" />
            <stop offset="0.18" stopColor="rgba(81,236,255,0.62)" />
            <stop offset="0.5" stopColor="rgba(48,156,255,0.92)" />
            <stop offset="0.82" stopColor="rgba(81,236,255,0.62)" />
            <stop offset="100%" stopColor="rgba(81,236,255,0)" />
          </linearGradient>
          <linearGradient id="platform-floor" x1="164" y1="294" x2="876" y2="294" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(81,236,255,0)" />
            <stop offset="0.5" stopColor="rgba(81,236,255,0.44)" />
            <stop offset="100%" stopColor="rgba(81,236,255,0)" />
          </linearGradient>
        </defs>

        <ellipse cx="520" cy="194" rx="318" ry="94" stroke="url(#platform-ring)" strokeWidth="2.4" />
        <ellipse cx="520" cy="194" rx="276" ry="80" stroke="rgba(70,214,255,0.28)" strokeWidth="1.8" strokeDasharray="12 10" />
        <ellipse cx="520" cy="194" rx="224" ry="62" stroke="rgba(70,214,255,0.4)" strokeWidth="2" />
        <ellipse cx="520" cy="194" rx="166" ry="42" stroke="rgba(95,228,255,0.88)" strokeWidth="2.6" />
        <ellipse cx="520" cy="194" rx="108" ry="24" stroke="rgba(139,242,255,0.98)" strokeWidth="2.8" />
        <ellipse cx="520" cy="194" rx="70" ry="14" stroke="rgba(216,252,255,0.98)" strokeWidth="2.4" />
        <path d="M260 192C312 136 398 106 520 106C642 106 728 136 780 192" stroke="rgba(74,208,255,0.28)" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M198 194C264 272 366 304 520 304C674 304 776 272 842 194" stroke="rgba(49,162,255,0.22)" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M382 126C426 110 470 102 520 102C570 102 614 110 658 126" stroke="rgba(114,242,255,0.28)" strokeWidth="2" strokeDasharray="9 8" strokeLinecap="round" />
        <path d="M332 194H708" stroke="rgba(58,200,255,0.2)" strokeWidth="1.5" strokeDasharray="8 8" />
        <path d="M300 194C352 176 416 168 520 168C624 168 688 176 740 194" stroke="rgba(95,228,255,0.18)" strokeWidth="2" strokeDasharray="7 9" />
        <path d="M362 156C404 142 452 134 520 134C588 134 636 142 678 156" stroke="rgba(95,228,255,0.16)" strokeWidth="2" strokeDasharray="7 9" />
        <path d="M286 264L406 226L520 254L634 226L754 264" stroke="rgba(92,236,255,0.28)" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M224 304L520 236L816 304" stroke="rgba(92,236,255,0.18)" strokeWidth="1.4" />
        <path d="M160 352L442 250" stroke="rgba(92,236,255,0.12)" strokeWidth="1.1" />
        <path d="M878 352L598 250" stroke="rgba(92,236,255,0.12)" strokeWidth="1.1" />
        <path d="M254 292H786" stroke="url(#platform-floor)" strokeWidth="1.2" strokeDasharray="8 10" />
        <path d="M328 326H712" stroke="url(#platform-floor)" strokeWidth="1" strokeDasharray="6 10" />
        <path d="M520 254V338" stroke="rgba(92,236,255,0.18)" strokeWidth="1.2" strokeDasharray="7 9" />

        {[
          [286, 264],
          [406, 226],
          [520, 106],
          [520, 254],
          [634, 226],
          [754, 264],
          [442, 250],
          [598, 250],
        ].map(([cx, cy], index) => (
          <g key={index}>
            <circle cx={cx} cy={cy} r="3.2" fill="rgba(132,246,255,0.88)" />
            <circle cx={cx} cy={cy} r="8" stroke="rgba(132,246,255,0.12)" strokeWidth="1" />
          </g>
        ))}
      </svg>
    </div>
  )
}

function BottomCommandDeck() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[238px] hidden h-[500px] w-[1260px] -translate-x-1/2 lg:block">
      <div className="absolute left-1/2 bottom-[38px] h-[216px] w-[1160px] -translate-x-1/2 opacity-[0.22] [background-image:linear-gradient(rgba(52,206,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(52,206,255,0.18)_1px,transparent_1px)] [background-size:82px_82px] [transform:perspective(1320px)_rotateX(77deg)]" />
      <div className="absolute left-1/2 bottom-[52px] h-[194px] w-[1080px] -translate-x-1/2 opacity-[0.18] [background-image:linear-gradient(rgba(52,206,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(52,206,255,0.14)_1px,transparent_1px)] [background-size:42px_42px] [transform:perspective(1320px)_rotateX(77deg)]" />
      <div className="absolute left-1/2 bottom-[64px] h-[172px] w-[940px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(36,176,255,0.18),transparent_72%)] [transform:perspective(1200px)_rotateX(75deg)]" />

      <div className="absolute left-[8%] top-[104px] h-[112px] w-[286px] border border-[#12486f]/22 bg-[linear-gradient(180deg,rgba(7,22,42,0.26),rgba(4,10,20,0.04))] [clip-path:polygon(0%_18%,10%_0%,100%_0%,88%_100%,0%_100%)]" />
      <div className="absolute right-[8%] top-[104px] h-[112px] w-[286px] border border-[#12486f]/22 bg-[linear-gradient(180deg,rgba(7,22,42,0.26),rgba(4,10,20,0.04))] [clip-path:polygon(12%_0%,100%_18%,100%_100%,0%_100%,90%_0%)]" />
      <div className="absolute left-[11%] top-[132px] h-[86px] w-[226px] opacity-[0.2] [background-image:linear-gradient(rgba(54,228,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(54,228,255,0.14)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute right-[11%] top-[132px] h-[86px] w-[226px] opacity-[0.2] [background-image:linear-gradient(rgba(54,228,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(54,228,255,0.14)_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="absolute left-1/2 top-[108px] h-[84px] w-[420px] -translate-x-1/2 border border-[#1c99ff]/16 bg-[linear-gradient(180deg,rgba(9,28,52,0.34),rgba(6,12,24,0.04))] [clip-path:polygon(8%_0%,92%_0%,100%_28%,92%_100%,8%_100%,0%_28%)]" />
      <div className="absolute left-1/2 top-[122px] h-[2px] w-[240px] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-[#59efff]/34 to-transparent" />
      <div className="absolute left-1/2 top-[196px] h-[22px] w-[360px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(80,236,255,0.26),transparent_72%)] blur-lg" />

      <div
        className="absolute left-[18%] top-[116px] h-[96px] w-[10%] bg-[linear-gradient(90deg,transparent,rgba(84,238,255,0.16),transparent)]"
        style={{ animation: "telemetry-sweep 8.2s linear infinite" }}
      />
      <div
        className="absolute right-[18%] top-[116px] h-[96px] w-[10%] bg-[linear-gradient(90deg,transparent,rgba(84,238,255,0.16),transparent)]"
        style={{ animation: "telemetry-sweep 9.4s linear infinite reverse" }}
      />

      <svg viewBox="0 0 1260 500" className="absolute inset-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="deck-rail" x1="146" y1="198" x2="1114" y2="198" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(82,238,255,0)" />
            <stop offset="0.18" stopColor="rgba(82,238,255,0.42)" />
            <stop offset="0.5" stopColor="rgba(42,150,255,0.72)" />
            <stop offset="0.82" stopColor="rgba(82,238,255,0.42)" />
            <stop offset="100%" stopColor="rgba(82,238,255,0)" />
          </linearGradient>
          <linearGradient id="deck-floor" x1="118" y1="314" x2="1142" y2="314" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(82,238,255,0)" />
            <stop offset="0.5" stopColor="rgba(82,238,255,0.34)" />
            <stop offset="100%" stopColor="rgba(82,238,255,0)" />
          </linearGradient>
        </defs>

        <path d="M184 184L352 160L486 178L630 132L774 178L908 160L1076 184" stroke="url(#deck-rail)" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M240 232L414 204L630 172L846 204L1020 232" stroke="rgba(84,236,255,0.22)" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M312 272L630 214L948 272" stroke="rgba(84,236,255,0.16)" strokeWidth="1.2" />
        <path d="M118 318H1142" stroke="url(#deck-floor)" strokeWidth="1.2" strokeDasharray="9 10" />
        <path d="M204 356H1056" stroke="url(#deck-floor)" strokeWidth="1.1" strokeDasharray="7 11" />
        <path d="M286 396H974" stroke="url(#deck-floor)" strokeWidth="0.9" strokeDasharray="6 11" />
        <path d="M162 500L496 266" stroke="rgba(84,236,255,0.14)" strokeWidth="1" />
        <path d="M312 500L552 266" stroke="rgba(84,236,255,0.12)" strokeWidth="1" />
        <path d="M948 500L708 266" stroke="rgba(84,236,255,0.12)" strokeWidth="1" />
        <path d="M1098 500L764 266" stroke="rgba(84,236,255,0.14)" strokeWidth="1" />
        <path d="M630 212V420" stroke="rgba(84,236,255,0.12)" strokeWidth="1" strokeDasharray="8 10" />
        <path d="M494 266L630 226L766 266" stroke="rgba(96,240,255,0.22)" strokeWidth="1.4" />

        {[
          [184, 184],
          [352, 160],
          [486, 178],
          [630, 132],
          [774, 178],
          [908, 160],
          [1076, 184],
          [494, 266],
          [630, 226],
          [766, 266],
        ].map(([cx, cy], index) => (
          <g key={index}>
            <circle cx={cx} cy={cy} r="3" fill="rgba(128,246,255,0.86)" />
            <circle cx={cx} cy={cy} r="7.5" stroke="rgba(128,246,255,0.1)" strokeWidth="1" />
          </g>
        ))}
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

function CentralScanner() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[138px] hidden h-[520px] w-[1180px] -translate-x-1/2 lg:block">
      <div
        className="absolute inset-[10%] bg-[radial-gradient(ellipse_at_center,rgba(52,220,255,0.16),transparent_72%)] blur-3xl"
        style={{ animation: "orbital-glow 10s ease-in-out infinite" }}
      />
      <div
        className="absolute left-1/2 top-[6%] h-[166px] w-[460px] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(112,246,255,0.16),rgba(112,246,255,0.02)_72%,transparent)] [clip-path:polygon(44%_0%,56%_0%,100%_100%,0%_100%)]"
        style={{ animation: "beam-rise 11s ease-in-out infinite" }}
      />
      <svg viewBox="0 0 1180 520" className="absolute inset-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="scanner-ring" x1="210" y1="82" x2="970" y2="346" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(91,244,255,0)" />
            <stop offset="0.18" stopColor="rgba(91,244,255,0.62)" />
            <stop offset="0.52" stopColor="rgba(50,162,255,0.92)" />
            <stop offset="0.82" stopColor="rgba(91,244,255,0.62)" />
            <stop offset="100%" stopColor="rgba(91,244,255,0)" />
          </linearGradient>
          <linearGradient id="scanner-beam" x1="590" y1="66" x2="590" y2="456" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(139,247,255,0.8)" />
            <stop offset="0.36" stopColor="rgba(78,188,255,0.28)" />
            <stop offset="100%" stopColor="rgba(78,188,255,0)" />
          </linearGradient>
          <radialGradient
            id="scanner-core"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(590 230) rotate(90) scale(126 260)"
          >
            <stop offset="0%" stopColor="rgba(108,245,255,0.28)" />
            <stop offset="0.5" stopColor="rgba(48,162,255,0.14)" />
            <stop offset="100%" stopColor="rgba(48,162,255,0)" />
          </radialGradient>
        </defs>

        <ellipse cx="590" cy="230" rx="284" ry="98" fill="url(#scanner-core)" />
        <ellipse cx="590" cy="246" rx="420" ry="124" stroke="url(#scanner-ring)" strokeWidth="1.5" opacity="0.34" />
        <ellipse cx="590" cy="246" rx="346" ry="98" stroke="url(#scanner-ring)" strokeWidth="1.2" strokeDasharray="8 10" opacity="0.24" />
        <ellipse cx="590" cy="246" rx="228" ry="64" stroke="rgba(98,240,255,0.34)" strokeWidth="1.8" opacity="0.44" />
        <ellipse cx="590" cy="246" rx="136" ry="36" stroke="rgba(138,247,255,0.78)" strokeWidth="2.4" />
        <path d="M590 126V364" stroke="url(#scanner-beam)" strokeWidth="1.6" strokeDasharray="8 12" opacity="0.4" />
        <path d="M456 184L590 144L724 184" stroke="rgba(96,238,255,0.28)" strokeWidth="1.6" />
        <path d="M410 246H770" stroke="rgba(86,236,255,0.2)" strokeWidth="1.2" strokeDasharray="8 9" />
        <path d="M470 308L590 348L710 308" stroke="rgba(86,236,255,0.22)" strokeWidth="1.4" />
        <path d="M590 146L666 192V280L590 326L514 280V192L590 146Z" stroke="rgba(97,241,255,0.38)" strokeWidth="1.6" />
        <path d="M590 176L636 204V262L590 290L544 262V204L590 176Z" stroke="rgba(97,241,255,0.22)" strokeWidth="1.2" strokeDasharray="8 10" />
        <path d="M278 228L418 196L514 214" stroke="rgba(84,236,255,0.18)" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M666 214L762 196L902 228" stroke="rgba(84,236,255,0.18)" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M304 306L446 344L536 318" stroke="rgba(84,236,255,0.14)" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M644 318L734 344L876 306" stroke="rgba(84,236,255,0.14)" strokeWidth="1.1" strokeLinecap="round" />

        {[
          [418, 196],
          [514, 214],
          [590, 146],
          [666, 214],
          [762, 196],
          [446, 344],
          [536, 318],
          [644, 318],
          [734, 344],
        ].map(([cx, cy], index) => (
          <g key={index}>
            <circle cx={cx} cy={cy} r="3.2" fill="rgba(132,246,255,0.86)" />
            <circle cx={cx} cy={cy} r="8" stroke="rgba(132,246,255,0.12)" strokeWidth="1" />
          </g>
        ))}
      </svg>
    </div>
  )
}

function TelemetryPanel({ mirrored = false, className }: { mirrored?: boolean; className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute hidden overflow-hidden lg:block", className, mirrored && "-scale-x-100")}>
      <div
        className="absolute inset-0 border border-[#114f76]/34 bg-[linear-gradient(180deg,rgba(6,18,36,0.44),rgba(4,10,20,0.08))]"
        style={{ clipPath: "polygon(0% 14%,12% 0%,92% 0%,100% 18%,100% 100%,6% 100%,0% 84%)" }}
      />
      <div
        className="absolute inset-[10px] border border-[#2195ff]/10"
        style={{ clipPath: "polygon(0% 16%,13% 0%,91% 0%,100% 19%,100% 100%,7% 100%,0% 82%)" }}
      />
      <div className="absolute inset-x-[18%] top-0 h-px bg-gradient-to-r from-transparent via-[#57eeff]/46 to-transparent" />
      <div className="absolute left-[8%] top-[12px] h-[2px] w-[26%] rounded-full bg-gradient-to-r from-[#2b84ff]/0 via-[#2b84ff]/50 to-[#35efff]/88" />
      <div className="absolute right-[8%] top-[12px] h-[2px] w-[18%] rounded-full bg-gradient-to-r from-[#35efff]/88 via-[#2b84ff]/50 to-[#2b84ff]/0" />

      <div className="absolute left-[6%] top-[16%] h-[33%] w-[50%] overflow-hidden rounded-[24px] border border-[#1d88ff]/14 bg-[linear-gradient(180deg,rgba(9,28,52,0.36),rgba(6,12,24,0.06))]">
        <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(54,228,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(54,228,255,0.14)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div
          className="absolute inset-y-0 left-[-18%] w-[20%] bg-[linear-gradient(90deg,transparent,rgba(100,245,255,0.18),transparent)]"
          style={{ animation: "telemetry-sweep 7s linear infinite" }}
        />
        <svg viewBox="0 0 220 112" className="absolute inset-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 84H220" stroke="rgba(85,236,255,0.18)" strokeDasharray="6 8" />
          <path d="M20 74L54 58L90 64L132 36L166 46L200 18" stroke="rgba(114,245,255,0.82)" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M20 88L54 76L90 80L132 58L166 66L200 44" stroke="rgba(55,154,255,0.44)" strokeWidth="1.6" strokeLinecap="round" />
          {[
            [20, 74],
            [54, 58],
            [90, 64],
            [132, 36],
            [166, 46],
            [200, 18],
          ].map(([cx, cy], index) => (
            <g key={index}>
              <circle cx={cx} cy={cy} r="3.2" fill="rgba(132,246,255,0.88)" />
              <circle cx={cx} cy={cy} r="8" stroke="rgba(132,246,255,0.12)" strokeWidth="1" />
            </g>
          ))}
        </svg>
      </div>

      <div className="absolute right-[7%] top-[12%] flex h-[38%] w-[28%] items-center justify-center rounded-full border border-[#1d88ff]/14 bg-[radial-gradient(circle,rgba(10,40,66,0.34),rgba(4,10,20,0.04)_72%)]">
        <div
          className="absolute inset-[18%] rounded-full border border-[#59efff]/10"
          style={{ animation: "hud-pulse 6s ease-in-out infinite" }}
        />
        <svg viewBox="0 0 120 120" className="absolute inset-[14%] h-[72%] w-[72%]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="60" cy="60" r="40" stroke="rgba(88,238,255,0.34)" strokeWidth="1.5" />
          <circle cx="60" cy="60" r="28" stroke="rgba(88,238,255,0.18)" strokeWidth="1.2" strokeDasharray="7 8" />
          <path d="M60 20A40 40 0 0 1 96 42" stroke="rgba(127,246,255,0.86)" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M32 80A34 34 0 0 0 88 70" stroke="rgba(54,160,255,0.56)" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M60 60L84 40" stroke="rgba(127,246,255,0.88)" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="84" cy="40" r="4" fill="rgba(127,246,255,0.92)" />
          <circle cx="60" cy="60" r="5" fill="rgba(127,246,255,0.88)" />
        </svg>
        <div className="absolute h-[58%] w-px bg-gradient-to-b from-transparent via-[#59efff]/26 to-transparent" />
        <div className="absolute h-px w-[58%] bg-gradient-to-r from-transparent via-[#59efff]/18 to-transparent" />
      </div>

      <div className="absolute left-[6%] top-[56%] h-px w-[88%] bg-gradient-to-r from-transparent via-[#3be7ff]/16 to-transparent" />
      <div className="absolute right-[35%] top-[52%] h-[30%] w-px bg-gradient-to-b from-transparent via-[#3be7ff]/16 to-transparent" />

      <div className="absolute left-[6%] bottom-[12%] h-[22%] w-[56%] overflow-hidden rounded-[20px] border border-[#1d88ff]/14 bg-[linear-gradient(180deg,rgba(8,22,42,0.32),rgba(4,10,20,0.04))]">
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(54,228,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(54,228,255,0.14)_1px,transparent_1px)] [background-size:20px_20px]" />
        <svg viewBox="0 0 240 84" className="absolute inset-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          {[
            [30, 58, 18],
            [62, 46, 30],
            [94, 34, 42],
            [126, 48, 28],
            [158, 24, 52],
            [190, 38, 38],
          ].map(([x, y, height], index) => (
            <rect
              key={index}
              x={x}
              y={y}
              width="16"
              height={height}
              rx="4"
              fill={index % 2 === 0 ? "rgba(104,245,255,0.62)" : "rgba(60,152,255,0.52)"}
            />
          ))}
          <path d="M20 68L52 60L84 50L116 54L148 34L180 42L212 28" stroke="rgba(126,245,255,0.72)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>

      <div className="absolute right-[7%] bottom-[12%] h-[22%] w-[24%] overflow-hidden rounded-[18px] border border-[#1d88ff]/14 bg-[linear-gradient(180deg,rgba(8,22,42,0.32),rgba(4,10,20,0.04))]">
        <div
          className="absolute left-[-24%] top-0 h-full w-[28%] bg-[linear-gradient(90deg,transparent,rgba(100,245,255,0.16),transparent)]"
          style={{ animation: "telemetry-sweep 8.5s linear infinite" }}
        />
        <svg viewBox="0 0 112 84" className="absolute inset-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 64L32 34L52 46L72 22L92 36" stroke="rgba(126,245,255,0.82)" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 70H98" stroke="rgba(74,228,255,0.14)" strokeDasharray="5 7" />
          {[12, 32, 52, 72, 92].map((cx, index) => (
            <circle key={index} cx={cx} cy={[64, 34, 46, 22, 36][index]} r="3.2" fill="rgba(126,245,255,0.86)" />
          ))}
        </svg>
      </div>
    </div>
  )
}

function BackgroundScene() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-12%,rgba(78,172,255,0.36),transparent_34%),radial-gradient(circle_at_50%_16%,rgba(48,132,255,0.24),transparent_22%),radial-gradient(circle_at_18%_22%,rgba(34,208,255,0.2),transparent_24%),radial-gradient(circle_at_82%_22%,rgba(41,146,255,0.22),transparent_24%),linear-gradient(180deg,#071421_0%,#06111c_36%,#020913_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(38,214,255,0.14),transparent_24%),radial-gradient(circle_at_50%_56%,rgba(28,112,195,0.24),transparent_26%),radial-gradient(circle_at_50%_80%,rgba(40,209,255,0.16),transparent_30%),radial-gradient(circle_at_28%_74%,rgba(46,118,255,0.1),transparent_24%),radial-gradient(circle_at_72%_74%,rgba(46,118,255,0.1),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle,rgba(96,230,255,0.36)_1px,transparent_1.8px)] [background-size:24px_24px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(44,220,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(44,220,255,0.12)_1px,transparent_1px)] [background-size:96px_96px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.1] [background-image:linear-gradient(38deg,rgba(34,214,255,0.12)_1px,transparent_1px),linear-gradient(-38deg,rgba(34,214,255,0.12)_1px,transparent_1px)] [background-size:148px_148px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(180deg,transparent_0%,rgba(90,240,255,0.18)_50%,transparent_100%)] [background-size:100%_8px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[240px] bg-[linear-gradient(180deg,rgba(7,18,34,0.56),rgba(7,18,34,0.1)_60%,transparent_100%)]" />
      <div className="pointer-events-none absolute inset-x-[10%] top-[116px] hidden h-px bg-gradient-to-r from-transparent via-[#31dfff]/22 to-transparent lg:block" />
      <div className="pointer-events-none absolute inset-x-[14%] top-[152px] hidden h-px bg-gradient-to-r from-transparent via-[#1e7dff]/14 to-transparent lg:block" />
      <div className="pointer-events-none absolute left-1/2 top-[136px] hidden h-[420px] w-[1180px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(36,188,255,0.14),transparent_72%)] blur-3xl lg:block" />
      <div className="pointer-events-none absolute left-1/2 top-[150px] hidden h-[320px] w-[240px] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(102,242,255,0.16),rgba(102,242,255,0.03)_64%,transparent)] [clip-path:polygon(44%_0%,56%_0%,100%_100%,0%_100%)] lg:block" />
      <div className="pointer-events-none absolute left-1/2 top-[178px] hidden h-[1px] w-[860px] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#53edff]/22 to-transparent lg:block" />
      <div className="pointer-events-none absolute left-1/2 top-[210px] hidden h-[280px] w-[760px] -translate-x-1/2 rounded-[50%] border border-[#25beff]/10 lg:block" />

      <DigitalTwinBackdrop />
      <CentralScanner />
      <TelemetryPanel className="left-[3.5%] top-[168px] h-[278px] w-[33vw] max-w-[520px]" />
      <TelemetryPanel mirrored className="right-[3.5%] top-[168px] h-[278px] w-[33vw] max-w-[520px]" />

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

      <div className="pointer-events-none absolute left-1/2 bottom-[-22%] h-[66vh] w-[172vw] -translate-x-1/2 opacity-[0.24] [background-image:linear-gradient(rgba(52,206,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(52,206,255,0.18)_1px,transparent_1px)] [background-size:94px_94px] [transform:perspective(1200px)_rotateX(77deg)]" />
      <div className="pointer-events-none absolute left-1/2 bottom-[-18%] h-[62vh] w-[148vw] -translate-x-1/2 opacity-[0.18] [background-image:linear-gradient(rgba(52,206,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(52,206,255,0.14)_1px,transparent_1px)] [background-size:48px_48px] [transform:perspective(1200px)_rotateX(77deg)]" />
      <div className="pointer-events-none absolute left-1/2 bottom-[-12%] h-[54vh] w-[132vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(35,141,255,0.24),transparent_68%)] [transform:perspective(1200px)_rotateX(74deg)]" />
      <div className="pointer-events-none absolute left-1/2 bottom-[-10%] hidden h-[58vh] w-[136vw] -translate-x-1/2 opacity-[0.16] [background-image:linear-gradient(115deg,transparent_22%,rgba(74,238,255,0.16)_50%,transparent_78%),linear-gradient(65deg,transparent_24%,rgba(44,140,255,0.1)_50%,transparent_76%)] [transform:perspective(1200px)_rotateX(75deg)] lg:block" />
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
        @keyframes orbital-glow {
          0%, 100% { opacity: .55; transform: scale(0.985); }
          50% { opacity: .94; transform: scale(1.02); }
        }
        @keyframes telemetry-sweep {
          0% { transform: translateX(0); opacity: 0; }
          16% { opacity: .1; }
          52% { opacity: .34; }
          100% { transform: translateX(640%); opacity: 0; }
        }
        @keyframes beam-rise {
          0%, 100% { transform: translate3d(-50%,0,0); opacity: .22; }
          50% { transform: translate3d(-50%,-18px,0); opacity: .46; }
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
            <BottomCommandDeck />

            <div className="relative mx-auto w-full max-w-[492px] translate-y-[-10px] sm:translate-y-[-14px]">
              <EnergyPlatform />

              <div className="pointer-events-none absolute -inset-x-12 -inset-y-12 rounded-full bg-[radial-gradient(circle,rgba(34,196,255,0.24),transparent_70%)] blur-3xl" />
              <div
                className="pointer-events-none absolute inset-x-[-26px] top-[-22px] bottom-[-34px] border border-[#1a7fff]/16 bg-[linear-gradient(180deg,rgba(8,24,44,0.08),rgba(4,10,20,0.02))]"
                style={{ clipPath: "polygon(8% 0%,26% 0%,30% 3%,70% 3%,74% 0%,92% 0%,100% 12%,100% 88%,92% 100%,8% 100%,0% 88%,0% 12%)" }}
              />
              <div
                className="pointer-events-none absolute inset-x-[-14px] top-[-10px] bottom-[-18px] border border-[#54ecff]/10"
                style={{ clipPath: "polygon(8% 0%,24% 0%,29% 5%,71% 5%,76% 0%,92% 0%,100% 13%,100% 87%,92% 100%,8% 100%,0% 87%,0% 13%)" }}
              />
              <div className="pointer-events-none absolute left-1/2 top-[-32px] h-[74px] w-[300px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(72,236,255,0.18),transparent_72%)] blur-2xl" />
              <div className="pointer-events-none absolute left-1/2 top-[calc(100%-8px)] h-[102px] w-[360px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(92,228,255,0.3),transparent_72%)] blur-2xl" />
              <div className="pointer-events-none absolute left-1/2 bottom-[-74px] h-[146px] w-[40px] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(102,242,255,0.24),rgba(102,242,255,0.08)_48%,transparent)] blur-md" />
              <div className="pointer-events-none absolute left-1/2 bottom-[-18px] h-[60px] w-[250px] -translate-x-1/2 border border-[#2de8ff]/14 bg-[linear-gradient(180deg,rgba(8,30,52,0.32),rgba(4,10,20,0.06))] [clip-path:polygon(10%_0%,90%_0%,100%_100%,0%_100%)]" />
              <div className="pointer-events-none absolute left-1/2 bottom-[-20px] h-[18px] w-[280px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(96,232,255,0.34),transparent_72%)] blur-lg" />
              <div className="pointer-events-none absolute left-[12%] bottom-[-40px] hidden h-[2px] w-[20%] bg-gradient-to-r from-transparent via-[#53edff]/24 to-transparent lg:block" />
              <div className="pointer-events-none absolute right-[12%] bottom-[-40px] hidden h-[2px] w-[20%] bg-gradient-to-r from-transparent via-[#53edff]/24 to-transparent lg:block" />
              <div
                className="pointer-events-none absolute left-[14%] bottom-[-64px] hidden h-[84px] w-[12%] bg-[linear-gradient(90deg,transparent,rgba(84,238,255,0.16),transparent)] lg:block"
                style={{ animation: "telemetry-sweep 8s linear infinite" }}
              />
              <div
                className="pointer-events-none absolute right-[14%] bottom-[-64px] hidden h-[84px] w-[12%] bg-[linear-gradient(90deg,transparent,rgba(84,238,255,0.16),transparent)] lg:block"
                style={{ animation: "telemetry-sweep 9s linear infinite reverse" }}
              />

              <div
                className="relative overflow-hidden border border-[#33dcff]/44 bg-[linear-gradient(180deg,rgba(5,14,28,0.95),rgba(4,10,20,0.98))] px-6 pb-8 pt-6 shadow-[0_0_0_1px_rgba(69,229,255,0.08)_inset,0_0_56px_rgba(22,132,255,0.22)] sm:px-7"
                style={{ clipPath: "polygon(6% 0%,94% 0%,100% 8%,100% 92%,94% 100%,6% 100%,0% 92%,0% 8%)" }}
              >
                <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(64,227,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(64,227,255,0.12)_1px,transparent_1px)] [background-size:26px_26px]" />
                <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(90deg,transparent_0%,rgba(94,241,255,0.16)_50%,transparent_100%)] [background-size:100%_9px]" />
                <div className="pointer-events-none absolute left-[18%] top-0 h-full w-px bg-gradient-to-b from-transparent via-[#53edff]/12 to-transparent" />
                <div className="pointer-events-none absolute right-[18%] top-0 h-full w-px bg-gradient-to-b from-transparent via-[#53edff]/12 to-transparent" />
                <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-[#5af5ff]/84 to-transparent" />
                <div className="pointer-events-none absolute inset-x-7 bottom-0 h-px bg-gradient-to-r from-transparent via-[#5af5ff]/56 to-transparent" />
                <div className="pointer-events-none absolute inset-[8px] border border-[#2dcfff]/16" style={{ clipPath: "polygon(6% 0%,94% 0%,100% 8%,100% 92%,94% 100%,6% 100%,0% 92%,0% 8%)" }} />
                <div className="pointer-events-none absolute inset-x-[20%] top-[12px] h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#68efff]/36 to-transparent" />
                <div className="pointer-events-none absolute inset-x-[26%] top-[22px] h-px bg-gradient-to-r from-transparent via-[#39dfff]/30 to-transparent" />
                <div className="pointer-events-none absolute inset-x-[30%] bottom-[18px] h-px bg-gradient-to-r from-transparent via-[#39dfff]/18 to-transparent" />
                <div className="pointer-events-none absolute left-[10px] top-[10px] h-5 w-5 border-l-2 border-t-2 border-[#38f0ff]/62" />
                <div className="pointer-events-none absolute right-[10px] top-[10px] h-5 w-5 border-r-2 border-t-2 border-[#38f0ff]/62" />
                <div className="pointer-events-none absolute left-[10px] bottom-[10px] h-5 w-5 border-b-2 border-l-2 border-[#38f0ff]/42" />
                <div className="pointer-events-none absolute right-[10px] bottom-[10px] h-5 w-5 border-b-2 border-r-2 border-[#38f0ff]/42" />
                <div className="pointer-events-none absolute left-[22px] top-[20px] h-[18px] w-[92px] border border-[#2ce8ff]/10 bg-[linear-gradient(180deg,rgba(12,44,66,0.26),rgba(8,14,26,0.04))] [clip-path:polygon(0%_0%,88%_0%,100%_100%,12%_100%)]" />
                <div className="pointer-events-none absolute right-[22px] top-[20px] h-[18px] w-[92px] border border-[#2ce8ff]/10 bg-[linear-gradient(180deg,rgba(12,44,66,0.26),rgba(8,14,26,0.04))] [clip-path:polygon(12%_0%,100%_0%,88%_100%,0%_100%)]" />
                <div className="pointer-events-none absolute left-[26px] top-[56px] h-[24px] w-[132px] border border-[#2ce8ff]/10 bg-[linear-gradient(180deg,rgba(10,36,60,0.24),rgba(6,12,24,0.04))] [clip-path:polygon(0%_0%,100%_0%,86%_100%,0%_100%)]" />
                <div className="pointer-events-none absolute right-[26px] top-[56px] h-[24px] w-[132px] border border-[#2ce8ff]/10 bg-[linear-gradient(180deg,rgba(10,36,60,0.24),rgba(6,12,24,0.04))] [clip-path:polygon(14%_0%,100%_0%,100%_100%,0%_100%)]" />
                <div className="pointer-events-none absolute inset-y-[88px] left-0 w-[18px] bg-[linear-gradient(180deg,transparent,rgba(54,212,255,0.16),transparent)] blur-sm" />
                <div className="pointer-events-none absolute inset-y-[88px] right-0 w-[18px] bg-[linear-gradient(180deg,transparent,rgba(54,212,255,0.16),transparent)] blur-sm" />
                <div className="pointer-events-none absolute left-[14px] top-[96px] bottom-[72px] w-[2px] bg-gradient-to-b from-transparent via-[#4de8ff]/20 to-transparent" />
                <div className="pointer-events-none absolute right-[14px] top-[96px] bottom-[72px] w-[2px] bg-gradient-to-b from-transparent via-[#4de8ff]/20 to-transparent" />
                <div className="pointer-events-none absolute left-[50%] bottom-[14px] h-[8px] w-[164px] -translate-x-1/2 rounded-full border border-[#57edff]/12 bg-[radial-gradient(circle,rgba(108,244,255,0.16),rgba(8,18,34,0.04)_72%)]" />
                <div
                  className="pointer-events-none absolute left-[-16%] top-[90px] h-[14px] w-[24%] bg-[linear-gradient(90deg,transparent,rgba(90,241,255,0.18),transparent)]"
                  style={{ animation: "telemetry-sweep 6.8s linear infinite" }}
                />

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
