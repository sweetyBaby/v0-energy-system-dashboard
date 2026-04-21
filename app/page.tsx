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
}

const BRAND = "EnerCloud"

const COPY: Record<Locale, Copy> = {
  zh: {
    welcome: "欢迎登录",
    accountPlaceholder: "请输入用户名或邮箱",
    passwordPlaceholder: "请输入登录密码",
    remember: "记住密码",
    forgot: "忘记密码？",
    submit: "进入平台",
  },
  en: {
    welcome: "Welcome Back",
    accountPlaceholder: "Username or email",
    passwordPlaceholder: "Enter your password",
    remember: "Remember password",
    forgot: "Forgot password?",
    submit: "Enter Platform",
  },
}

const LANGUAGE_OPTIONS: Array<{ key: Locale; label: string }> = [
  { key: "zh", label: "中" },
  { key: "en", label: "EN" },
]

const CELL_LEVELS = [
  54, 64, 58, 72, 60, 68, 56, 76, 62, 70,
  52, 61, 57, 71, 59, 67, 55, 74, 60, 69,
  54, 63, 58, 73, 61, 68, 57, 75, 62, 70,
  53, 62, 59, 72, 58, 66, 56, 74, 61, 68,
  55, 64, 60, 73, 62, 69, 57, 76, 63, 71,
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
      </defs>
      <path
        d="M23 54C13 54 8 47 8 39C8 30 14 23 24 22C25 12 33 7 42 7C51 7 58 12 61 20C69 21 74 27 74 35C74 45 67 54 55 54H23Z"
        fill="rgba(9,31,68,0.2)"
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

function NetworkCluster({ className, mirrored = false }: { className?: string; mirrored?: boolean }) {
  return (
    <svg
      viewBox="0 0 320 320"
      className={cn(className, mirrored && "-scale-x-100")}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="rgba(81,232,255,0.22)" strokeWidth="1.2">
        <path d="M18 242L76 150L160 92L236 130L296 238" />
        <path d="M76 150L118 224L198 204L236 130" />
        <path d="M118 224L56 278" />
        <path d="M198 204L270 280" />
        <path d="M160 92L190 24" />
        <path d="M18 242H118" />
      </g>
      {[
        [18, 242], [76, 150], [160, 92], [236, 130], [296, 238], [118, 224], [198, 204], [56, 278], [270, 280], [190, 24],
      ].map(([x, y], index) => (
        <circle key={index} cx={x} cy={y} r="3.4" fill="rgba(118,244,255,0.9)" />
      ))}
    </svg>
  )
}

function BatteryCell({ level }: { level: number }) {
  return (
    <div className="relative h-[94px] w-[26px] rounded-t-[14px] rounded-b-[9px] border border-[#89f7ff]/24 bg-[linear-gradient(180deg,rgba(118,246,255,0.24),rgba(29,110,173,0.14)_24%,rgba(10,39,70,0.7)_58%,rgba(4,13,24,0.96)_100%)] shadow-[0_0_18px_rgba(58,214,255,0.1)]">
      <div className="absolute inset-x-[5px] top-[-7px] h-[12px] rounded-full border border-[#b1ffff]/22 bg-[radial-gradient(circle_at_50%_35%,rgba(216,255,252,0.94),rgba(76,224,255,0.38)_55%,rgba(8,24,42,0.94)_100%)]" />
      <div className="absolute inset-y-[12px] left-[7px] w-px bg-white/10" />
      <div className="absolute right-[5px] top-[18px] h-[48px] w-[5px] rounded-full bg-white/6 blur-[1px]" />
      <div
        className="absolute inset-x-[4px] bottom-[6px] rounded-[7px] bg-[linear-gradient(180deg,rgba(124,255,236,0.92),rgba(46,203,255,0.42)_55%,rgba(16,84,192,0.1)_100%)] shadow-[0_0_14px_rgba(96,244,255,0.26)]"
        style={{ height: `${level}px` }}
      />
      <div className="absolute inset-x-0 bottom-[-10px] h-[18px] rounded-full bg-[radial-gradient(circle,rgba(59,220,255,0.24),transparent_72%)] blur-md" />
    </div>
  )
}

function BatteryField() {
  const heatZones = [
    { left: 18, top: 108, size: 74, tint: "rgba(92,255,224,0.18)" },
    { left: 110, top: 68, size: 72, tint: "rgba(255,181,84,0.18)" },
    { left: 182, top: 94, size: 64, tint: "rgba(88,244,255,0.16)" },
    { left: 246, top: 54, size: 84, tint: "rgba(255,122,64,0.2)" },
    { left: 280, top: 118, size: 66, tint: "rgba(100,255,210,0.14)" },
  ]
  const nodePoints = [
    { cx: 28, cy: 146 }, { cx: 66, cy: 126 }, { cx: 100, cy: 134 }, { cx: 140, cy: 96 }, { cx: 170, cy: 110 },
    { cx: 206, cy: 82 }, { cx: 244, cy: 98 }, { cx: 280, cy: 76 }, { cx: 314, cy: 92 }, { cx: 196, cy: 156 },
  ]

  return (
    <div className="relative h-[520px] w-[670px]">
      <div className="absolute left-[56px] top-[268px] h-[190px] w-[492px] bg-[radial-gradient(circle_at_50%_55%,rgba(46,214,255,0.16),transparent_72%)] blur-3xl" />
      <div
        className="absolute left-[54px] top-[286px] h-[150px] w-[488px] border border-[#1fe0ff]/20 bg-[linear-gradient(180deg,rgba(8,24,43,0.2),rgba(4,12,24,0.54))]"
        style={{ clipPath: "polygon(10% 0%,100% 0%,90% 100%,0% 100%)" }}
      />
      <div
        className="absolute left-[96px] top-[242px] h-[174px] w-[412px] border border-[#2be6ff]/28 bg-[linear-gradient(180deg,rgba(10,31,54,0.24),rgba(5,16,28,0.62))] shadow-[0_0_48px_rgba(17,176,255,0.2)]"
        style={{ clipPath: "polygon(10% 0%,100% 0%,90% 100%,0% 100%)" }}
      />
      <div
        className="absolute left-[124px] top-[206px] h-[42px] w-[360px] border border-[#50efff]/42 bg-[linear-gradient(180deg,rgba(22,104,141,0.34),rgba(8,26,44,0.84))]"
        style={{ clipPath: "polygon(10% 0%,100% 0%,90% 100%,0% 100%)" }}
      />
      <div className="absolute left-[160px] top-[86px] grid grid-cols-10 gap-x-3 gap-y-2 [transform:perspective(1460px)_rotateX(69deg)_rotateZ(-32deg)]">
        {CELL_LEVELS.map((level, index) => (
          <BatteryCell key={index} level={level} />
        ))}
      </div>
      <div className="absolute left-[148px] top-[74px] h-[202px] w-[352px] border border-[#57f1ff]/12 shadow-[0_0_28px_rgba(52,226,255,0.06)] [transform:perspective(1460px)_rotateX(69deg)_rotateZ(-32deg)]" />
      <div className="absolute left-[154px] top-[82px] h-[190px] w-[340px] overflow-hidden [transform:perspective(1460px)_rotateX(69deg)_rotateZ(-32deg)]">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(93,248,255,0.08),rgba(93,248,255,0.08)_1px,transparent_1px,transparent_16px)]" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(93,248,255,0.05),rgba(93,248,255,0.05)_1px,transparent_1px,transparent_22px)]" />
        {heatZones.map((zone, index) => (
          <div
            key={index}
            className="absolute rounded-full blur-xl"
            style={{
              left: zone.left,
              top: zone.top,
              width: zone.size,
              height: zone.size,
              background: `radial-gradient(circle, ${zone.tint}, rgba(58,226,255,0.06) 54%, transparent 76%)`,
            }}
          />
        ))}
        <svg viewBox="0 0 340 190" className="absolute inset-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M28 146L66 126L100 134L140 96L170 110L206 82L244 98L280 76L314 92" stroke="rgba(108,248,255,0.8)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M66 126L92 164L146 150L196 156L244 132L298 144" stroke="rgba(61,193,255,0.68)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M140 96L142 56L206 34L280 44" stroke="rgba(109,247,255,0.44)" strokeWidth="1.8" strokeDasharray="6 6" strokeLinecap="round" />
          <path d="M196 156L196 186" stroke="rgba(87,239,255,0.3)" strokeWidth="1.6" strokeDasharray="5 5" />
          {nodePoints.map((point, index) => (
            <g key={index}>
              <circle cx={point.cx} cy={point.cy} r="4.2" fill="rgba(106,252,255,0.86)" />
              <circle cx={point.cx} cy={point.cy} r="10" stroke="rgba(106,252,255,0.18)" strokeWidth="1.4" />
            </g>
          ))}
        </svg>
        <div className="absolute left-[126px] top-[58px] h-[70px] w-[70px] rounded-full border border-[#ffb467]/12 bg-[radial-gradient(circle,rgba(255,184,96,0.18),transparent_70%)]" />
        <div className="absolute left-[248px] top-[38px] h-[86px] w-[86px] rounded-full border border-[#ff875a]/12 bg-[radial-gradient(circle,rgba(255,129,84,0.2),transparent_70%)]" />
        <div
          className="absolute inset-y-0 left-[-24%] w-[26%] bg-[linear-gradient(90deg,transparent,rgba(119,252,255,0.28),transparent)] blur-sm"
          style={{ animation: "scan-sweep 6.2s linear infinite" }}
        />
      </div>
      <div className="absolute left-[58px] top-[114px] h-[292px] w-[264px] border border-[#1cdfff]/10 [clip-path:polygon(8%_0%,100%_12%,84%_100%,0%_88%)]" />
      <div className="absolute left-[246px] top-[54px] h-[140px] w-[140px] rounded-full bg-[radial-gradient(circle,rgba(86,237,255,0.32),transparent_72%)] blur-3xl" />
      <div className="absolute left-[108px] top-[304px] h-px w-[372px] bg-gradient-to-r from-transparent via-[#49ebff]/54 to-transparent" />
      <div className="absolute left-[144px] top-[394px] h-px w-[300px] bg-gradient-to-r from-transparent via-[#49ebff]/38 to-transparent" />
      <div className="absolute left-[0] top-[300px] h-px w-[160px] bg-gradient-to-r from-transparent via-[#24deff]/26 to-transparent" />
      <div className="absolute right-[54px] top-[114px] h-[104px] w-[104px] rounded-full border border-[#2ce9ff]/12" />
      <div className="absolute right-[54px] top-[114px] h-[104px] w-[104px] rounded-full bg-[radial-gradient(circle,rgba(61,232,255,0.12),transparent_70%)] blur-2xl" />
      <div className="absolute right-[12px] top-[168px] h-px w-[146px] bg-gradient-to-r from-[#1cd9ff]/0 via-[#1cd9ff]/42 to-[#1cd9ff]/0" />
    </div>
  )
}

function TelemetryConstellation() {
  const moduleRows = [8, 28, 48, 68, 88]
  const clusterNodes = [
    { x: 120, y: 70, size: 4.5 },
    { x: 108, y: 120, size: 4 },
    { x: 74, y: 126, size: 4.5 },
    { x: 36, y: 88, size: 4 },
  ]

  return (
    <div className="relative h-[560px] w-[660px]">
      <div className="absolute left-[214px] top-[44px] h-[304px] w-[304px] rounded-full bg-[radial-gradient(circle,rgba(56,228,255,0.2),transparent_72%)] blur-3xl" />
      <div className="absolute left-[72px] top-[138px] h-[184px] w-[184px] rounded-full border border-[#35ebff]/16 bg-[radial-gradient(circle,rgba(54,224,255,0.1),transparent_70%)] shadow-[0_0_40px_rgba(24,176,255,0.08)]">
        <div className="absolute inset-[16px] rounded-full border border-[#35ebff]/18" />
        <div className="absolute inset-[34px] rounded-full border border-[#35ebff]/14" />
        <div className="absolute left-1/2 top-[24px] bottom-[24px] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#4feeff]/28 to-transparent" />
        <div className="absolute left-[24px] right-[24px] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[#4feeff]/28 to-transparent" />
        {clusterNodes.map((node, index) => (
          <div
            key={index}
            className="absolute rounded-full bg-[#78f8ff] shadow-[0_0_18px_rgba(102,247,255,0.3)]"
            style={{ left: node.x, top: node.y, width: node.size * 2, height: node.size * 2 }}
          />
        ))}
      </div>

      <div className="absolute left-[224px] top-[258px] h-[22px] w-[224px] border border-[#3deaff]/20 bg-[linear-gradient(180deg,rgba(8,20,38,0.22),rgba(4,12,24,0.06))] [clip-path:polygon(10%_0%,90%_0%,100%_100%,0%_100%)]" />
      <div className="absolute left-[246px] top-[272px] h-[16px] w-[180px] border border-[#3deaff]/18 bg-[linear-gradient(180deg,rgba(8,20,38,0.18),rgba(4,12,24,0.04))] [clip-path:polygon(10%_0%,90%_0%,100%_100%,0%_100%)]" />
      <div className="absolute left-[270px] top-[284px] h-[12px] w-[132px] border border-[#3deaff]/14 bg-[linear-gradient(180deg,rgba(8,20,38,0.12),rgba(4,12,24,0.02))] [clip-path:polygon(10%_0%,90%_0%,100%_100%,0%_100%)]" />
      <div className="absolute left-[278px] top-[84px] h-[212px] w-[122px] [transform:perspective(900px)_rotateY(-15deg)_rotateX(3deg)]" style={{ animation: "signal-drift 6s ease-in-out infinite" }}>
        <div className="absolute left-[12px] top-[10px] h-[24px] w-[64px] border border-[#53f1ff]/20 bg-[linear-gradient(180deg,rgba(8,20,38,0.2),rgba(4,12,24,0.04))] [clip-path:polygon(10%_100%,20%_0%,100%_0%,90%_100%)]" />
        <div className="absolute left-0 top-[30px] h-[168px] w-[82px] border border-[#53f1ff]/22 bg-[linear-gradient(180deg,rgba(84,255,229,0.12),rgba(46,180,255,0.06)_72%,transparent_100%)] shadow-[0_0_30px_rgba(70,236,255,0.12)]" />
        <div className="absolute left-[82px] top-[42px] h-[156px] w-[26px] border border-[#53f1ff]/16 bg-[linear-gradient(180deg,rgba(10,24,46,0.18),rgba(5,12,24,0.04))] [clip-path:polygon(0%_0%,100%_8%,100%_92%,0%_100%)]" />
        <div className="absolute left-[12px] top-[46px] h-[132px] w-[58px] border border-[#66f6ff]/16 bg-[repeating-linear-gradient(180deg,rgba(104,248,255,0.14),rgba(104,248,255,0.14)_1px,transparent_1px,transparent_16px)]">
          {moduleRows.map((top, index) => (
            <div key={index} className="absolute left-[6px] right-[6px] h-[16px] border border-[#6cf6ff]/14 bg-[linear-gradient(90deg,rgba(88,255,232,0.1),rgba(56,184,255,0.28),rgba(88,255,232,0.1))]" style={{ top }} />
          ))}
          <div className="absolute inset-y-0 left-[-30%] w-[40%] bg-[linear-gradient(90deg,transparent,rgba(119,252,255,0.34),transparent)] blur-sm" style={{ animation: "scan-sweep 5.2s linear infinite" }} />
        </div>
      </div>
      <div className="absolute left-[286px] top-[38px] h-[226px] w-[122px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(98,247,255,0.3),transparent_72%)] blur-2xl" />
      <div className="absolute left-[276px] top-[78px] h-[42px] w-[134px] rounded-full border border-[#4deeff]/14" />

      <svg viewBox="0 0 610 520" className="absolute inset-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M168 226C214 228 246 228 278 214" stroke="rgba(79,238,255,0.44)" strokeWidth="2.2" strokeDasharray="6 7" strokeLinecap="round" />
        <path d="M390 222C444 232 474 246 500 280" stroke="rgba(79,238,255,0.42)" strokeWidth="2.2" strokeDasharray="6 7" strokeLinecap="round" />
        <path d="M338 296C350 338 386 366 438 374" stroke="rgba(79,238,255,0.34)" strokeWidth="2.2" strokeDasharray="6 7" strokeLinecap="round" />
        <path d="M326 298C308 342 260 374 208 398" stroke="rgba(79,238,255,0.3)" strokeWidth="2.2" strokeDasharray="6 7" strokeLinecap="round" />
        <circle cx="278" cy="214" r="5" fill="rgba(118,248,255,0.92)" />
        <circle cx="500" cy="280" r="5" fill="rgba(118,248,255,0.88)" />
        <circle cx="438" cy="374" r="4.5" fill="rgba(118,248,255,0.86)" />
        <circle cx="208" cy="398" r="4.5" fill="rgba(118,248,255,0.82)" />
      </svg>

      <div className="absolute left-[456px] top-[180px] h-[144px] w-[144px] rounded-full border border-[#2fe8ff]/12 bg-[radial-gradient(circle,rgba(48,221,255,0.08),transparent_72%)] shadow-[0_0_28px_rgba(24,176,255,0.06)]">
        <div className="absolute inset-[18px] rounded-full border border-[#2fe8ff]/14" />
        <div className="absolute inset-[42px] rounded-full border border-[#2fe8ff]/16" />
        <div className="absolute left-1/2 top-[18px] bottom-[18px] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#4feeff]/24 to-transparent" />
        <div className="absolute left-[18px] right-[18px] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[#4feeff]/24 to-transparent" />
      </div>

      <div className="absolute left-[486px] top-[162px] flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[#2fe8ff]/16 bg-[linear-gradient(180deg,rgba(8,20,38,0.24),rgba(4,12,24,0.04))] shadow-[0_0_16px_rgba(24,176,255,0.08)]">
        <div className="h-[8px] w-[8px] rounded-full bg-[#7af9ff]" />
      </div>
      <div className="absolute left-[548px] top-[236px] flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#2fe8ff]/16 bg-[linear-gradient(180deg,rgba(8,20,38,0.24),rgba(4,12,24,0.04))] shadow-[0_0_16px_rgba(24,176,255,0.08)]">
        <div className="h-[10px] w-[10px] rounded-full border border-[#7af9ff]/60" />
      </div>
      <div className="absolute left-[506px] top-[312px] flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[#2fe8ff]/16 bg-[linear-gradient(180deg,rgba(8,20,38,0.24),rgba(4,12,24,0.04))] shadow-[0_0_16px_rgba(24,176,255,0.08)]">
        <div className="h-[9px] w-[9px] rotate-45 border border-[#7af9ff]/60" />
      </div>

      <div className="absolute left-[150px] top-[380px] h-[96px] w-[184px] border border-[#2fe8ff]/12 bg-[linear-gradient(180deg,rgba(8,20,38,0.12),rgba(4,12,24,0.02))] [clip-path:polygon(12%_0%,100%_0%,88%_100%,0%_100%)] shadow-[0_0_18px_rgba(24,176,255,0.06)]">
        <div className="absolute inset-x-5 bottom-[16px] top-[18px]">
          <svg viewBox="0 0 140 48" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 34L28 24L48 30L70 12L92 22L112 10L132 18" stroke="#47EDFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 34L28 24L48 30L70 12L92 22L112 10L132 18" stroke="rgba(71,237,255,0.24)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <svg viewBox="0 0 344 132" className="absolute left-[142px] top-[390px] h-[132px] w-[344px] opacity-65" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g stroke="rgba(72,228,255,0.16)" strokeWidth="1.2">
          <path d="M10 114L58 80L112 94L164 48L228 74L290 26L334 84" />
          <path d="M58 80L90 126" />
          <path d="M164 48L194 106" />
          <path d="M228 74L268 126" />
        </g>
        {[10, 58, 112, 164, 228, 290, 334, 90, 194, 268].map((x, index) => {
          const y = [114, 80, 94, 48, 74, 26, 84, 126, 106, 126][index]
          return <circle key={index} cx={x} cy={y} r="3" fill="rgba(103,240,255,0.84)" />
        })}
      </svg>
    </div>
  )
}

function HeaderWing({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <div className={cn("relative hidden h-[110px] flex-1 lg:block", mirrored && "-scale-x-100")}>
      <div className="absolute inset-y-[18px] left-0 right-[3%] border border-[#1cdfff]/10 bg-[linear-gradient(180deg,rgba(7,18,34,0.46),rgba(5,12,24,0.08))] [clip-path:polygon(0%_34%,10%_0%,100%_0%,94%_100%,0%_100%)]" />
      <div className="absolute inset-y-[32px] left-[8%] right-[12%] border border-[#1cdfff]/8 bg-[linear-gradient(180deg,rgba(8,18,34,0.18),rgba(5,12,24,0.02))] [clip-path:polygon(0%_18%,12%_0%,100%_0%,88%_100%,0%_100%)]" />
    </div>
  )
}

function TopBrandBar() {
  return (
    <div className="relative mx-auto flex w-full max-w-[1760px] items-start justify-center gap-4 px-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-[6%] top-[14px] hidden h-px bg-gradient-to-r from-transparent via-[#5ceeff]/28 to-transparent lg:block" />
      <div className="pointer-events-none absolute left-1/2 top-[-6px] hidden h-[52px] w-[360px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(76,240,255,0.14),transparent_72%)] blur-2xl lg:block" />

      <HeaderWing />

      <div className="relative w-full max-w-[840px]">
        <div className="pointer-events-none absolute left-1/2 top-[-26px] hidden h-[28px] w-[140px] -translate-x-1/2 border border-[#2fe7ff]/10 bg-[linear-gradient(180deg,rgba(12,34,58,0.34),rgba(5,12,24,0.08))] [clip-path:polygon(16%_0%,84%_0%,100%_100%,0%_100%)] lg:block" />
        <div className="pointer-events-none absolute left-1/2 bottom-[-24px] hidden h-[28px] w-[220px] -translate-x-1/2 border border-[#25e2ff]/10 bg-[linear-gradient(180deg,rgba(11,42,65,0.3),rgba(5,12,24,0.1))] [clip-path:polygon(14%_0%,86%_0%,100%_100%,0%_100%)] lg:block" />

        <div className="relative flex min-h-[122px] w-full items-center justify-center overflow-hidden border border-[#1cdfff]/18 bg-[linear-gradient(180deg,rgba(8,20,38,0.96),rgba(6,14,28,0.82))] px-6 shadow-[0_0_42px_rgba(17,176,255,0.14)] [clip-path:polygon(6%_0%,32%_0%,35%_15%,65%_15%,68%_0%,94%_0%,100%_22%,100%_78%,94%_100%,6%_100%,0%_78%,0%_22%)] sm:px-8">
          <div className="pointer-events-none absolute inset-x-[10%] top-0 h-px bg-gradient-to-r from-transparent via-[#68e6ff]/72 to-transparent" />
          <div className="pointer-events-none absolute inset-x-[12%] bottom-0 h-px bg-gradient-to-r from-transparent via-[#53ebff]/68 to-transparent" />
          <div className="pointer-events-none absolute inset-x-[24%] bottom-[-14px] h-[24px] bg-[radial-gradient(circle,rgba(61,232,255,0.26),transparent_70%)] blur-lg" />
          <div className="pointer-events-none absolute left-[10%] top-[18px] h-px w-[112px] bg-gradient-to-r from-transparent via-[#63eeff]/34 to-transparent" />
          <div className="pointer-events-none absolute right-[10%] top-[18px] h-px w-[112px] bg-gradient-to-r from-transparent via-[#63eeff]/34 to-transparent" />
          <div className="pointer-events-none absolute left-[11%] bottom-[18px] h-[14px] w-[14px] border-l border-b border-[#4ef1ff]/24" />
          <div className="pointer-events-none absolute right-[11%] bottom-[18px] h-[14px] w-[14px] border-r border-b border-[#4ef1ff]/24" />
          <div className="pointer-events-none absolute left-1/2 top-[12px] hidden h-[10px] w-[72px] -translate-x-1/2 rounded-full border border-[#5af5ff]/18 bg-[radial-gradient(circle,rgba(114,244,255,0.14),rgba(7,18,34,0.08)_72%)] lg:block" />

          <div className="relative z-10 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-5 sm:gap-6">
              <EnerCloudIcon className="h-[52px] w-[52px] drop-shadow-[0_0_18px_rgba(68,232,255,0.22)]" />
              <div
                className="bg-clip-text text-[2.85rem] font-black leading-none tracking-[0.04em] text-transparent sm:text-[3.4rem]"
                style={{ backgroundImage: "linear-gradient(180deg,#f7ffff 0%,#d8faff 44%,#89f6de 100%)" }}
              >
                {BRAND}
              </div>
            </div>
          </div>
        </div>
      </div>

      <HeaderWing mirrored />
    </div>
  )
}

function BackgroundScene() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(48,148,220,0.2),transparent_34%),radial-gradient(circle_at_15%_28%,rgba(47,223,255,0.16),transparent_18%),radial-gradient(circle_at_84%_28%,rgba(39,146,255,0.14),transparent_18%),linear-gradient(180deg,#07111d_0%,#040b17_40%,#030914_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_56%,rgba(28,112,195,0.16),transparent_24%),radial-gradient(circle_at_50%_84%,rgba(40,209,255,0.07),transparent_26%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(44,220,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(44,220,255,0.12)_1px,transparent_1px)] [background-size:112px_112px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(36deg,rgba(34,214,255,0.12)_1px,transparent_1px),linear-gradient(-36deg,rgba(34,214,255,0.12)_1px,transparent_1px)] [background-size:144px_144px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,transparent_58%,rgba(0,0,0,0.3)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[182px] bg-[linear-gradient(180deg,rgba(7,20,38,0.28),rgba(7,20,38,0.06)_58%,transparent_100%)]" />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[200px] w-[880px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(72,236,255,0.1),transparent_72%)] blur-2xl"
        style={{ animation: "background-breathe 9s ease-in-out infinite" }}
      />
      <div className="pointer-events-none absolute left-[10%] top-[62px] hidden h-px w-[180px] bg-gradient-to-r from-transparent via-[#58efff]/18 to-transparent lg:block" />
      <div className="pointer-events-none absolute right-[10%] top-[62px] hidden h-px w-[180px] bg-gradient-to-r from-transparent via-[#58efff]/18 to-transparent lg:block" />

      <div
        className="pointer-events-none absolute left-[-6%] top-[16%] h-[430px] w-[430px] rounded-full bg-[radial-gradient(circle,rgba(30,206,255,0.16),transparent_72%)] blur-3xl"
        style={{ animation: "background-drift 14s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute right-[-4%] top-[14%] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(43,110,255,0.16),transparent_72%)] blur-3xl"
        style={{ animation: "background-breathe 11s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute right-[2%] top-[18%] hidden h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(46,224,255,0.14),transparent_72%)] blur-3xl lg:block"
        style={{ animation: "background-drift 16s ease-in-out infinite reverse" }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[52%] h-[320px] w-[920px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(38,188,255,0.16),transparent_72%)] blur-3xl"
        style={{ animation: "background-breathe 12s ease-in-out infinite" }}
      />

      <div className="pointer-events-none absolute left-1/2 top-[58%] hidden h-[216px] w-[980px] -translate-x-1/2 border border-[#1fe5ff]/12 bg-[linear-gradient(180deg,rgba(7,18,34,0.08),rgba(4,10,20,0.18))] [clip-path:polygon(14%_0%,86%_0%,100%_100%,0%_100%)] lg:block" />
      <div className="pointer-events-none absolute left-1/2 top-[60%] hidden h-[154px] w-[760px] -translate-x-1/2 border border-[#1fe5ff]/10 bg-[linear-gradient(180deg,rgba(7,18,34,0.04),rgba(4,10,20,0.18))] [clip-path:polygon(14%_0%,86%_0%,100%_100%,0%_100%)] lg:block" />
      <div className="pointer-events-none absolute left-1/2 top-[54%] hidden h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#30e9ff]/14 lg:block" />
      <div className="pointer-events-none absolute left-1/2 top-[54%] hidden h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(74,236,255,0.12),transparent_70%)] blur-2xl lg:block" />
      <div className="pointer-events-none absolute left-[calc(50%-430px)] top-[54%] hidden h-px w-[290px] bg-gradient-to-r from-[#1ce5ff]/0 via-[#1ce5ff]/48 to-[#1ce5ff]/0 lg:block" />
      <div className="pointer-events-none absolute left-[calc(50%+150px)] top-[54%] hidden h-px w-[260px] bg-gradient-to-r from-[#1ce5ff]/0 via-[#1ce5ff]/48 to-[#1ce5ff]/0 lg:block" />

      <div className="pointer-events-none absolute inset-y-0 left-[18%] hidden w-[16%] bg-[linear-gradient(90deg,transparent,rgba(60,231,255,0.08),transparent)] lg:block" style={{ animation: "field-scan 8s linear infinite" }} />
      <div className="pointer-events-none absolute inset-y-0 right-[16%] hidden w-[14%] bg-[linear-gradient(90deg,transparent,rgba(42,146,255,0.06),transparent)] lg:block" style={{ animation: "field-scan 10s linear infinite reverse" }} />

      <NetworkCluster className="pointer-events-none absolute left-[4%] top-[12%] hidden h-[300px] w-[300px] opacity-60 lg:block" />
      <NetworkCluster className="pointer-events-none absolute right-[2%] bottom-[8%] hidden h-[280px] w-[280px] opacity-40 xl:block" mirrored />

      <div className="pointer-events-none absolute left-[-2%] top-[22%] hidden origin-top-left scale-[0.76] opacity-95 lg:block xl:scale-[0.88] 2xl:scale-100">
        <BatteryField />
      </div>
      <div className="pointer-events-none absolute right-[-2%] top-[14%] hidden origin-top-right scale-[0.9] opacity-100 lg:block xl:scale-[0.98] 2xl:scale-[1.06]">
        <TelemetryConstellation />
      </div>

      <div className="pointer-events-none absolute left-0 top-0 h-16 w-16 border-l-2 border-t-2 border-[#1ce5ff]/20" />
      <div className="pointer-events-none absolute right-0 top-0 h-16 w-16 border-r-2 border-t-2 border-[#1ce5ff]/20" />
      <div className="pointer-events-none absolute left-0 bottom-0 h-16 w-16 border-b-2 border-l-2 border-[#1ce5ff]/12" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-16 w-16 border-b-2 border-r-2 border-[#1ce5ff]/12" />

      <div className="pointer-events-none absolute bottom-[34px] right-[34px] opacity-80">
        <StarSpark />
      </div>
    </>
  )
}

function StarSpark() {
  return (
    <svg viewBox="0 0 44 44" className="h-10 w-10" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22 2L24 20L42 22L24 24L22 42L20 24L2 22L20 20L22 2Z"
        fill="rgba(220,230,255,0.86)"
        style={{ filter: "drop-shadow(0 0 8px rgba(220,230,255,0.55))" }}
      />
    </svg>
  )
}

function MobileStatusRail() {
  const metrics = [
    { label: "Twin Sync", value: "99.8%" },
    { label: "Clusters", value: "12" },
    { label: "Shield", value: "L3" },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 xl:hidden">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="overflow-hidden rounded-[16px] border border-[#2ce8ff]/14 bg-[linear-gradient(180deg,rgba(11,22,42,0.84),rgba(5,12,24,0.88))] px-3 py-3 shadow-[0_0_20px_rgba(22,170,255,0.08)]"
        >
          <div className="text-[10px] font-bold tracking-[0.26em] text-[#6beeff]/54">{metric.label}</div>
          <div className="mt-2 text-[1.05rem] font-black tracking-[0.04em] text-[#eefaff]">{metric.value}</div>
        </div>
      ))}
    </div>
  )
}

function LoginRunway() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[-90px] hidden h-[220px] lg:block">
      <div className="absolute left-1/2 top-[16px] h-[140px] w-[860px] -translate-x-1/2 border border-[#28e6ff]/14 bg-[linear-gradient(180deg,rgba(6,18,34,0.08),rgba(4,10,20,0.28))] [clip-path:polygon(16%_0%,84%_0%,100%_100%,0%_100%)]" />
      <div className="absolute left-1/2 top-[38px] h-[110px] w-[620px] -translate-x-1/2 border border-[#28e6ff]/10 bg-[linear-gradient(180deg,rgba(6,18,34,0.04),rgba(4,10,20,0.24))] [clip-path:polygon(16%_0%,84%_0%,100%_100%,0%_100%)]" />
      <div className="absolute left-1/2 top-[70px] h-px w-[760px] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#56eeff]/54 to-transparent" />
      <div className="absolute left-1/2 top-[118px] h-px w-[520px] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#56eeff]/38 to-transparent" />
      <div className="absolute left-1/2 top-[28px] h-[130px] w-[130px] -translate-x-1/2 rounded-full border border-[#35ebff]/14" />
      <div className="absolute left-1/2 top-[28px] h-[130px] w-[130px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(74,236,255,0.16),transparent_70%)] blur-xl" />
      <div className="absolute left-1/2 top-[78px] h-[32px] w-[32px] -translate-x-1/2 rounded-full bg-[#7cf7ff]/72 shadow-[0_0_20px_rgba(124,247,255,0.28)]" />
      <div className="absolute left-[calc(50%-420px)] top-[74px] h-px w-[230px] bg-gradient-to-r from-transparent via-[#1ce5ff]/46 to-[#1ce5ff]/0" />
      <div className="absolute left-[calc(50%+190px)] top-[74px] h-px w-[230px] bg-gradient-to-r from-[#1ce5ff]/0 via-[#1ce5ff]/46 to-transparent" />
      <div className="absolute inset-x-[18%] top-[54px] h-[38px] [background-image:repeating-linear-gradient(90deg,rgba(84,239,255,0.18),rgba(84,239,255,0.18)_12px,transparent_12px,transparent_22px)] opacity-55" />
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
    <main className="relative h-[100dvh] overflow-hidden bg-[#030915] text-white">
      <style>{`
        @keyframes field-scan {
          0% { transform: translateX(-18%); opacity: 0; }
          18% { opacity: .12; }
          56% { opacity: .28; }
          100% { transform: translateX(18%); opacity: 0; }
        }
        @keyframes scan-sweep {
          0% { transform: translateX(-120%) rotate(0deg); opacity: 0; }
          18% { opacity: .12; }
          50% { opacity: .34; }
          100% { transform: translateX(320%) rotate(0deg); opacity: 0; }
        }
        @keyframes orbital-glow {
          0%, 100% { opacity: .58; transform: scale(0.985); }
          50% { opacity: 1; transform: scale(1.02); }
        }
        @keyframes pulse-line {
          0%, 100% { opacity: .3; }
          50% { opacity: .92; }
        }
        @keyframes signal-drift {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes background-breathe {
          0%, 100% { opacity: .72; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        @keyframes background-drift {
          0%, 100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(0,-14px,0); }
        }
      `}</style>

      <BackgroundScene />

      <div className="relative z-10 flex h-full flex-col overflow-hidden">
        <header className="shrink-0 pt-5 sm:pt-6">
          <TopBrandBar />
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-8 pt-6 sm:px-6 lg:px-8">
          <section className="relative w-full max-w-[1320px] lg:min-h-[720px]" style={{ perspective: "1800px" }}>
            <LoginRunway />

            <div className="mx-auto flex w-full max-w-[470px] flex-col gap-4 pt-6 lg:pt-12">
              <MobileStatusRail />

              <div className="relative">
                <div className="pointer-events-none absolute -inset-x-14 -inset-y-12 rounded-full bg-[radial-gradient(circle,rgba(42,214,255,0.2),transparent_70%)] blur-3xl" />
                <div className="pointer-events-none absolute left-1/2 top-[-40px] h-[70px] w-[280px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(68,232,255,0.16),transparent_72%)] blur-2xl" />
                <div className="pointer-events-none absolute left-1/2 top-[-8px] h-[24px] w-[188px] -translate-x-1/2 border border-[#2ce8ff]/14 bg-[linear-gradient(180deg,rgba(10,35,56,0.42),rgba(5,12,24,0.14))] [clip-path:polygon(12%_100%,18%_0%,82%_0%,88%_100%)]" />
                <div className="pointer-events-none absolute inset-x-8 top-[-18px] h-px bg-gradient-to-r from-transparent via-[#58efff]/26 to-transparent" />

                <div
                  className="relative overflow-hidden border border-[#39f0ff]/44 bg-[linear-gradient(160deg,rgba(13,23,40,0.94),rgba(8,15,28,0.98))] px-5 pb-6 pt-5 shadow-[0_0_0_1px_rgba(70,235,255,0.08)_inset,0_0_52px_rgba(32,192,255,0.18)] sm:px-6"
                  style={{
                    clipPath: "polygon(6% 0%,18% 0%,20% 3%,80% 3%,82% 0%,94% 0%,100% 6%,100% 94%,94% 100%,6% 100%,0% 94%,0% 6%)",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,transparent_44%,rgba(255,255,255,0.08)_50%,transparent_66%)]" />
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#5af5ff]/88 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-[#5af5ff]/56 to-transparent" />
                  <div className="pointer-events-none absolute left-[6px] top-[6px] h-5 w-5 border-l-2 border-t-2 border-[#38f0ff]/66" />
                  <div className="pointer-events-none absolute right-[6px] top-[6px] h-5 w-5 border-r-2 border-t-2 border-[#38f0ff]/66" />
                  <div className="pointer-events-none absolute left-[6px] bottom-[6px] h-5 w-5 border-b-2 border-l-2 border-[#38f0ff]/66" />
                  <div className="pointer-events-none absolute right-[6px] bottom-[6px] h-5 w-5 border-b-2 border-r-2 border-[#38f0ff]/66" />
                  <div className="pointer-events-none absolute left-[20px] top-[18px] h-[18px] w-[108px] border border-[#2ce8ff]/10 bg-[linear-gradient(180deg,rgba(12,44,66,0.28),rgba(8,14,26,0.04))] [clip-path:polygon(0%_0%,88%_0%,100%_100%,12%_100%)]" />
                  <div className="pointer-events-none absolute right-[20px] top-[18px] h-[18px] w-[108px] border border-[#2ce8ff]/10 bg-[linear-gradient(180deg,rgba(12,44,66,0.28),rgba(8,14,26,0.04))] [clip-path:polygon(12%_0%,100%_0%,88%_100%,0%_100%)]" />
                  <div
                    className="pointer-events-none absolute inset-x-[-8px] top-[74%] h-[3px] bg-gradient-to-r from-transparent via-[#5af5ff]/24 to-transparent blur-sm"
                    style={{ animation: "pulse-line 3s ease-in-out infinite" }}
                  />
                  <div className="pointer-events-none absolute left-1/2 top-[72px] h-px w-[180px] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#58efff]/26 to-transparent" />
                  <div className="pointer-events-none absolute left-1/2 bottom-[-18px] h-[28px] w-[240px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(61,232,255,0.24),transparent_72%)] blur-lg" />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center overflow-hidden rounded-[10px] border border-[#1a5878]/60 bg-[rgba(6,16,34,0.86)] shadow-[0_0_16px_rgba(29,144,208,0.08)]">
                        {LANGUAGE_OPTIONS.map((option) => {
                          const active = locale === option.key

                          return (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => setLanguage(option.key)}
                              className={cn(
                                "relative min-w-[62px] px-4 py-2.5 text-[12px] font-bold tracking-[0.12em] transition-colors",
                                active ? "bg-[rgba(19,124,190,0.3)] text-[#44eeff]" : "text-[#5b8497] hover:text-[#b3f4ff]"
                              )}
                            >
                              {option.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="mt-8 text-center">
                      <h1 className="text-[2.15rem] font-black tracking-[0.08em] text-white">{copy.welcome}</h1>
                    </div>

                    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#42ecff]" />
                        <input
                          value={account}
                          onChange={(event) => {
                            setAccount(event.target.value)
                            setSubmitError(null)
                          }}
                          placeholder={copy.accountPlaceholder}
                          required
                          className="h-[54px] w-full rounded-[14px] border border-[#2ce8ff]/42 bg-[rgba(9,18,36,0.84)] pl-12 pr-4 text-[15px] text-[#e8f6ff] outline-none transition-all placeholder:text-[#547080] focus:border-[#4aeeff] focus:shadow-[0_0_22px_rgba(45,225,255,0.16)]"
                        />
                      </div>

                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#42ecff]" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(event) => {
                            setPassword(event.target.value)
                            setSubmitError(null)
                          }}
                          placeholder={copy.passwordPlaceholder}
                          required
                          className="h-[54px] w-full rounded-[14px] border border-[#2a5777]/60 bg-[rgba(9,18,36,0.8)] pl-12 pr-12 text-[15px] text-[#e8f6ff] outline-none transition-all placeholder:text-[#547080] focus:border-[#4aeeff] focus:shadow-[0_0_18px_rgba(45,225,255,0.13)]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5f899a] transition-colors hover:text-[#b9f7ff]"
                        >
                          {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-4 text-[14px]">
                        <label className="flex cursor-pointer items-center gap-2 text-[#86b7c9]">
                          <input
                            type="checkbox"
                            checked={remember}
                            onChange={(event) => setRemember(event.target.checked)}
                            className="h-4 w-4 border border-[#205870] bg-[#050f1e] accent-[#18dff5]"
                          />
                          <span>{copy.remember}</span>
                        </label>
                        <button type="button" className="text-[#38e8ff] transition-colors hover:text-[#aaf4ff]">
                          {copy.forgot}
                        </button>
                      </div>

                      <Button
                        type="submit"
                        disabled={submitting}
                        className="group relative mt-2 h-[58px] w-full rounded-full border border-[#40f0ff]/34 bg-[linear-gradient(90deg,#18d8f6_0%,#1bc6f2_28%,#2468ff_100%)] text-[1.02rem] font-black tracking-[0.14em] text-white shadow-[0_0_36px_rgba(22,165,255,0.38),inset_0_0_12px_rgba(255,255,255,0.13)] transition-all hover:brightness-110 disabled:opacity-75"
                      >
                        <span className="absolute inset-y-0 left-0 w-[30%] rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.22),transparent)] blur-sm" />
                        <span className="relative">{submitting ? `${copy.submit}...` : copy.submit}</span>
                        <ArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </Button>

                      {submitError ? (
                        <div className="rounded-[14px] border border-[#ff7b7b]/22 bg-[rgba(74,18,28,0.56)] px-4 py-3 text-[13px] text-[#ffd3d8]">
                          {submitError}
                        </div>
                      ) : null}
                    </form>
                  </div>
                </div>
              </div>

            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
