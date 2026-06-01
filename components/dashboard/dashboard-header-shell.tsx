import type { ReactNode } from "react"

type DashboardHeaderShellProps = {
  compact?: boolean
  children: ReactNode
}

export function DashboardHeaderShell({ compact = false, children }: DashboardHeaderShellProps) {
  return (
    <>
      <header
        className={`relative z-30 shrink-0 border-b border-[#17354b] bg-[linear-gradient(180deg,#06111d_0%,#081724_54%,#040b12_100%)] shadow-[0_16px_40px_rgba(0,0,0,0.34)] ${
          compact ? "h-[52px]" : "h-[62px]"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(71,207,255,0.22),transparent_28%),radial-gradient(circle_at_84%_0%,rgba(48,224,196,0.16),transparent_22%),linear-gradient(90deg,rgba(10,27,43,0.42),rgba(3,10,16,0)_22%,rgba(3,10,16,0)_78%,rgba(10,27,43,0.42))]" />
          <div className="absolute inset-x-0 top-0 h-full opacity-35 [background-image:linear-gradient(90deg,rgba(104,160,188,0.1)_1px,transparent_1px),linear-gradient(0deg,rgba(104,160,188,0.07)_1px,transparent_1px)] [background-size:160px_100%,100%_24px]" />
          <div className="absolute inset-x-0 top-0 h-[12px] bg-[linear-gradient(180deg,rgba(86,220,255,0.08),transparent)]" />
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(115,228,255,0.26),rgba(115,228,255,0.06)_30%,rgba(34,215,197,0.08)_70%,transparent)]" />
          <div className="absolute left-1/2 top-[7px] h-[20px] w-[220px] -translate-x-1/2 rounded-b-[18px] border border-[#2b5f79]/40 bg-[linear-gradient(180deg,rgba(9,28,45,0.84),rgba(5,16,28,0.18))] shadow-[0_0_18px_rgba(53,184,255,0.08)]" />
          <div className="absolute left-1/2 top-[9px] h-[5px] w-[132px] -translate-x-1/2 rounded-full bg-[linear-gradient(90deg,rgba(115,228,255,0.0),rgba(115,228,255,0.72),rgba(115,228,255,0.0))]" />
          <div className="absolute left-[calc(50%-84px)] top-[18px] h-[2px] w-[2px] rounded-full bg-[#73e4ff]/70 shadow-[0_0_8px_rgba(115,228,255,0.55)]" />
          <div className="absolute left-1/2 top-[18px] h-[2px] w-[2px] -translate-x-1/2 rounded-full bg-[#22d7c5]/60 shadow-[0_0_8px_rgba(34,215,197,0.45)]" />
          <div className="absolute left-[calc(50%+82px)] top-[18px] h-[2px] w-[2px] rounded-full bg-[#73e4ff]/70 shadow-[0_0_8px_rgba(115,228,255,0.55)]" />
          <div className="absolute left-3 top-[8px] h-[44px] w-[188px] opacity-90">
            <div className="absolute inset-x-[6px] top-[4px] h-px bg-gradient-to-r from-transparent via-[#35d9ff]/26 to-transparent" />
            <div
              className="absolute left-[6px] top-[9px] h-[24px] w-[118px] border border-[#1c4568]/40 bg-[linear-gradient(180deg,rgba(8,18,37,0.72),rgba(5,12,25,0.12))] shadow-[0_0_18px_rgba(34,211,238,0.05)]"
              style={{ clipPath: "polygon(0% 14%,9% 0%,100% 0%,100% 100%,0% 100%)" }}
            />
            <div
              className="absolute left-[10px] top-[13px] h-[17px] w-[108px] border border-[#2b618d]/24 bg-[linear-gradient(180deg,rgba(9,20,39,0.46),rgba(7,14,28,0.1))]"
              style={{ clipPath: "polygon(0% 12%,8% 0%,100% 0%,100% 100%,0% 100%)" }}
            />
            <div className="absolute left-[14px] top-[10px] h-[22px] w-[92px] bg-[radial-gradient(circle_at_35%_40%,rgba(48,220,255,0.14),transparent_76%)] blur-lg" />
            <div className="absolute left-[16px] top-[18px] h-px w-[84px] bg-gradient-to-r from-transparent via-[#6be8ff]/20 to-transparent" />
            <div className="absolute left-[17px] top-[26px] h-px w-[78px] bg-gradient-to-r from-transparent via-[#24d4ff]/12 to-transparent" />
            <div className="absolute left-[112px] top-[21px] h-px w-[44px] bg-gradient-to-r from-[#35d9ff]/42 via-[#35d9ff]/14 to-transparent" />
            <div className="absolute left-[124px] top-[13px] h-[16px] w-px bg-gradient-to-b from-transparent via-[#35d9ff]/24 to-transparent" />
            <div className="absolute left-[119px] top-[18px] h-[9px] w-[9px] rounded-full border border-[#5fdfff]/28 bg-[#071a30] shadow-[0_0_12px_rgba(53,217,255,0.1)]" />
            <div className="absolute left-[122px] top-[21px] h-[4px] w-[4px] rounded-full bg-[#9ef8ff] shadow-[0_0_10px_rgba(158,248,255,0.72)]" />
            <div className="absolute bottom-[7px] left-[18px] h-px w-[102px] bg-gradient-to-r from-transparent via-[#225d86]/34 to-transparent" />
          </div>
          <div className="absolute right-5 top-2 h-[18px] w-[72px] border-r border-t border-[#4fdfff]/34" />
          <div className="absolute right-7 bottom-2 h-[10px] w-[44px] border-r border-b border-[#22d7c5]/22" />
          <div className="absolute right-[92px] top-[13px] h-px w-[96px] bg-[linear-gradient(90deg,rgba(79,223,255,0.0),rgba(79,223,255,0.32),rgba(79,223,255,0.0))]" />
          <div className="absolute left-[14%] top-[10px] h-[16px] w-[92px] border-l border-t border-[#1f4d64]/26 opacity-60" />
          <div className="absolute right-[14%] top-[10px] h-[16px] w-[120px] border-r border-t border-[#1f4d64]/40 opacity-80" />
          <div className="absolute left-[15%] bottom-[8px] h-px w-[56px] bg-[linear-gradient(90deg,rgba(34,215,197,0.0),rgba(34,215,197,0.18),rgba(34,215,197,0.0))]" />
          <div className="absolute right-[15%] bottom-[8px] h-px w-[72px] bg-[linear-gradient(90deg,rgba(34,215,197,0.0),rgba(34,215,197,0.28),rgba(34,215,197,0.0))]" />
          <div className="absolute left-[22%] top-[9px] h-[6px] w-[6px] rounded-full bg-[#73e4ff]/50 shadow-[0_0_10px_rgba(115,228,255,0.45)]" />
          <div className="absolute right-[24%] bottom-[10px] h-[5px] w-[5px] rounded-full bg-[#22d7c5]/40 shadow-[0_0_9px_rgba(34,215,197,0.35)]" />
          <div className="absolute inset-x-[28%] top-[11px] h-px bg-[linear-gradient(90deg,transparent,rgba(115,228,255,0.28),transparent)]" />
          <div className="absolute inset-x-[34%] bottom-[9px] h-px bg-[linear-gradient(90deg,transparent,rgba(34,215,197,0.2),transparent)]" />
          <div className="absolute inset-x-0 top-[26px] h-px bg-[linear-gradient(90deg,transparent,rgba(73,140,171,0.18),transparent)]" />
          <div className="absolute inset-x-0 bottom-[12px] h-px bg-[linear-gradient(90deg,transparent,rgba(73,140,171,0.10),transparent)]" />
          <div className="absolute left-[8%] top-[18px] h-[18px] w-[140px] opacity-35 [background-image:radial-gradient(circle,rgba(115,228,255,0.55)_0.8px,transparent_0.8px)] [background-size:14px_14px]" />
          <div className="absolute right-[8%] top-[18px] h-[18px] w-[140px] opacity-25 [background-image:radial-gradient(circle,rgba(34,215,197,0.6)_0.8px,transparent_0.8px)] [background-size:14px_14px]" />
          <div
            className="absolute inset-y-[12px] left-[-18%] w-[36%] bg-[linear-gradient(90deg,transparent,rgba(102,222,255,0.14),transparent)] blur-[10px]"
            style={{ animation: "hdr-sheen 8s ease-in-out infinite" }}
          />
          <div
            className="absolute inset-y-[18px] left-[-12%] w-[20%] bg-[linear-gradient(90deg,transparent,rgba(34,215,197,0.1),transparent)] blur-[8px]"
            style={{ animation: "hdr-sheen-secondary 11s linear infinite" }}
          />
          <div
            className="absolute inset-x-0 top-[6px] h-[1px] bg-[linear-gradient(90deg,transparent,rgba(115,228,255,0.45),transparent)]"
            style={{ animation: "hdr-pulse-line 5.2s ease-in-out infinite" }}
          />
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#73e4ff]/90 to-transparent shadow-[0_0_22px_rgba(115,228,255,0.45)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#22d7c5]/60 to-transparent" />
          <div className="absolute left-[18%] top-[15px] h-[14px] w-px bg-[linear-gradient(180deg,rgba(115,228,255,0.0),rgba(115,228,255,0.28),rgba(115,228,255,0.0))]" />
          <div className="absolute right-[18%] top-[15px] h-[14px] w-px bg-[linear-gradient(180deg,rgba(115,228,255,0.0),rgba(115,228,255,0.22),rgba(115,228,255,0.0))]" />
          <svg className="absolute inset-0 h-full w-full opacity-45" viewBox="0 0 1600 64" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 48 H180 L206 34 H338" stroke="rgba(84,214,255,0.16)" strokeWidth="1" fill="none" />
            <path d="M1600 48 H1420 L1394 34 H1262" stroke="rgba(84,214,255,0.14)" strokeWidth="1" fill="none" />
            <path d="M620 18 H980" stroke="rgba(115,228,255,0.12)" strokeWidth="1" strokeDasharray="8 10" fill="none" />
            <circle cx="206" cy="34" r="2.2" fill="rgba(115,228,255,0.38)" />
            <circle cx="1394" cy="34" r="2.2" fill="rgba(34,215,197,0.34)" />
            <circle cx="800" cy="18" r="1.8" fill="rgba(115,228,255,0.4)" />
          </svg>
        </div>

        <div className="relative flex h-full items-center justify-between gap-3 px-3.5 md:px-5">
          {children}
        </div>
      </header>

      <style>{`
        @keyframes hdr-sheen {
          0%, 100% { transform: translateX(0) scaleX(0.96); opacity: .12; }
          50% { transform: translateX(186%) scaleX(1.08); opacity: .28; }
        }
        @keyframes hdr-sheen-secondary {
          0% { transform: translateX(0) scaleX(0.94); opacity: .08; }
          50% { transform: translateX(360%) scaleX(1.02); opacity: .18; }
          100% { transform: translateX(720%) scaleX(0.94); opacity: .08; }
        }
        @keyframes hdr-pulse-line {
          0%, 100% { opacity: .18; transform: scaleX(.92); }
          50% { opacity: .42; transform: scaleX(1); }
        }
      `}</style>
    </>
  )
}
