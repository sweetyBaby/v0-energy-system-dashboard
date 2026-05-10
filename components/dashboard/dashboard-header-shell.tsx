import type { ReactNode } from "react"

type DashboardHeaderShellProps = {
  compact?: boolean
  children: ReactNode
}

export function DashboardHeaderShell({ compact = false, children }: DashboardHeaderShellProps) {
  return (
    <>
      <header
        className={`relative z-30 shrink-0 overflow-hidden border-b border-[#173852] bg-[linear-gradient(180deg,#071322_0%,#040b15_58%,#03070f_100%)] shadow-[0_10px_28px_rgba(0,0,0,0.38)] ${
          compact ? "h-[56px]" : "h-[62px]"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-55%,rgba(34,211,238,0.34),transparent_34%),radial-gradient(circle_at_18%_38%,rgba(22,163,255,0.14),transparent_34%),radial-gradient(circle_at_82%_32%,rgba(0,212,170,0.12),transparent_24%),linear-gradient(90deg,rgba(13,31,47,0.2),rgba(3,10,18,0)_18%,rgba(3,10,18,0)_82%,rgba(13,31,47,0.2))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-full opacity-45 [background-image:linear-gradient(90deg,rgba(73,126,158,0.12)_1px,transparent_1px)] [background-size:120px_100%]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-full opacity-25 [background-image:linear-gradient(0deg,rgba(83,142,172,0.08)_1px,transparent_1px)] [background-size:100%_22px]" />
        <div className="pointer-events-none absolute inset-x-6 top-[7px] h-px bg-gradient-to-r from-transparent via-[#92eaff]/50 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-[72px] w-px bg-gradient-to-b from-transparent via-[#61d8ec]/14 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-[72px] w-px bg-gradient-to-b from-transparent via-[#61d8ec]/14 to-transparent" />
        <div className="pointer-events-none absolute left-[5.75rem] top-[10px] h-[3px] w-[44px] rounded-full bg-[linear-gradient(90deg,rgba(111,237,255,0.0),rgba(111,237,255,0.9),rgba(111,237,255,0.0))] opacity-80" />
        <div className="pointer-events-none absolute right-[5.75rem] top-[10px] h-[3px] w-[44px] rounded-full bg-[linear-gradient(90deg,rgba(111,237,255,0.0),rgba(111,237,255,0.9),rgba(111,237,255,0.0))] opacity-80" />
        <div
          className="pointer-events-none absolute inset-x-[18%] top-0 h-full bg-[linear-gradient(90deg,transparent,rgba(74,228,255,0.14),rgba(126,255,224,0.08),transparent)] mix-blend-screen"
          style={{ animation: "hdr-scan 6.8s linear infinite" }}
        />
        <div
          className="pointer-events-none absolute inset-y-[9px] left-[-12%] w-[32%] bg-[linear-gradient(90deg,transparent,rgba(88,190,255,0.12),transparent)] blur-[10px]"
          style={{ animation: "hdr-drift 9s ease-in-out infinite" }}
        />
        <div
          className="pointer-events-none absolute bottom-[8px] left-[12%] h-px w-[18%] bg-[linear-gradient(90deg,transparent,rgba(70,197,255,0.42),rgba(129,255,232,0.0))]"
          style={{ animation: "hdr-pulse 5.6s ease-in-out infinite" }}
        />
        <div
          className="pointer-events-none absolute bottom-[8px] right-[12%] h-px w-[18%] bg-[linear-gradient(90deg,rgba(129,255,232,0.0),rgba(70,197,255,0.42),transparent)]"
          style={{ animation: "hdr-pulse 5.6s ease-in-out infinite 1.8s" }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#68e6ff] to-transparent shadow-[0_0_20px_rgba(104,230,255,0.9)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#1ce1c2]/60 to-transparent" />
        <div className="pointer-events-none absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-[#29e4d4]/60" />
        <div className="pointer-events-none absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-[#29e4d4]/60" />
        <div className="pointer-events-none absolute bottom-[10px] left-[18px] h-[14px] w-[26px] border-b border-l border-[#3fc8de]/32" />
        <div className="pointer-events-none absolute bottom-[10px] right-[18px] h-[14px] w-[26px] border-b border-r border-[#3fc8de]/32" />
        <div className="pointer-events-none absolute left-[22px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full border border-[#4ddaf1]/12" />
        <div className="pointer-events-none absolute right-[22px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full border border-[#4ddaf1]/12" />
        <div className="pointer-events-none absolute bottom-0 left-[4.5rem] right-[4.5rem] h-[1px] bg-[linear-gradient(90deg,transparent,rgba(102,234,255,0.2)_16%,rgba(38,240,220,0.55),rgba(102,234,255,0.2)_84%,transparent)]" />

        <div className="relative flex h-full items-center justify-between gap-4 px-4">
          {children}
        </div>
      </header>

      <style>{`
        @keyframes hdr-scan {
          0% { transform: translateX(-24%); opacity: 0; }
          8% { opacity: .18; }
          50% { opacity: .24; }
          92% { opacity: .18; }
          100% { transform: translateX(24%); opacity: 0; }
        }
        @keyframes hdr-drift {
          0%, 100% { transform: translateX(-8%) scaleX(0.94); opacity: .28; }
          50% { transform: translateX(188%) scaleX(1.08); opacity: .42; }
        }
        @keyframes hdr-pulse {
          0%, 100% { opacity: .18; transform: scaleX(0.94); }
          50% { opacity: .55; transform: scaleX(1.02); }
        }
      `}</style>
    </>
  )
}
