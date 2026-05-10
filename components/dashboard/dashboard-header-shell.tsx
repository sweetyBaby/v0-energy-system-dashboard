import type { ReactNode } from "react"

type DashboardHeaderShellProps = {
  compact?: boolean
  children: ReactNode
}

export function DashboardHeaderShell({ compact = false, children }: DashboardHeaderShellProps) {
  return (
    <>
      <header
        className={`relative z-30 shrink-0 overflow-hidden border-b border-[#17354b] bg-[linear-gradient(180deg,#06111d_0%,#081724_54%,#040b12_100%)] shadow-[0_16px_40px_rgba(0,0,0,0.34)] ${
          compact ? "h-[60px]" : "h-[72px]"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(71,207,255,0.22),transparent_28%),radial-gradient(circle_at_84%_0%,rgba(48,224,196,0.16),transparent_22%),linear-gradient(90deg,rgba(10,27,43,0.42),rgba(3,10,16,0)_22%,rgba(3,10,16,0)_78%,rgba(10,27,43,0.42))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-full opacity-35 [background-image:linear-gradient(90deg,rgba(104,160,188,0.1)_1px,transparent_1px),linear-gradient(0deg,rgba(104,160,188,0.07)_1px,transparent_1px)] [background-size:160px_100%,100%_24px]" />
        <div
          className="pointer-events-none absolute inset-y-[12px] left-[-18%] w-[36%] bg-[linear-gradient(90deg,transparent,rgba(102,222,255,0.14),transparent)] blur-[10px]"
          style={{ animation: "hdr-sheen 8s ease-in-out infinite" }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#73e4ff]/90 to-transparent shadow-[0_0_22px_rgba(115,228,255,0.45)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#22d7c5]/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-[18%] top-[14px] h-px " />

        <div className="relative flex h-full items-center justify-between gap-4 px-4 md:px-6">
          {children}
        </div>
      </header>

      <style>{`
        @keyframes hdr-sheen {
          0%, 100% { transform: translateX(0) scaleX(0.96); opacity: .12; }
          50% { transform: translateX(186%) scaleX(1.08); opacity: .28; }
        }
      `}</style>
    </>
  )
}
