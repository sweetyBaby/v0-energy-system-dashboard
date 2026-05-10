import type { ReactNode } from "react"

type DashboardHeaderShellProps = {
  compact?: boolean
  children: ReactNode
}

export function DashboardHeaderShell({ compact = false, children }: DashboardHeaderShellProps) {
  return (
    <>
      <header
        className={`relative z-30 shrink-0 border-b border-[#16344f] bg-[linear-gradient(180deg,#06111f_0%,#040b16_100%)] shadow-[0_8px_24px_rgba(0,0,0,0.32)] ${
          compact ? "h-[56px]" : "h-[62px]"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-40%,rgba(34,211,238,0.28),transparent_38%),radial-gradient(circle_at_18%_40%,rgba(22,163,255,0.12),transparent_36%),radial-gradient(circle_at_82%_32%,rgba(0,212,170,0.10),transparent_26%)]" />
        <div
          className="pointer-events-none absolute inset-x-[20%] top-0 h-full bg-[linear-gradient(90deg,transparent,rgba(74,228,255,0.12),transparent)]"
          style={{ animation: "hdr-scan 5.5s linear infinite" }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#68e6ff] to-transparent shadow-[0_0_20px_rgba(104,230,255,0.9)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#1ce1c2]/60 to-transparent" />
        <div className="pointer-events-none absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-[#29e4d4]/60" />
        <div className="pointer-events-none absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-[#29e4d4]/60" />

        <div className="relative flex h-full items-center justify-between gap-4 px-4">
          {children}
        </div>
      </header>

      <style>{`
        @keyframes hdr-scan {
          0% { transform: translateX(-18%); opacity: 0; }
          10% { opacity: .18; }
          90% { opacity: .18; }
          100% { transform: translateX(18%); opacity: 0; }
        }
      `}</style>
    </>
  )
}
