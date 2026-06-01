import type { ReactNode } from "react"

type DashboardHeaderShellProps = {
  compact?: boolean
  children: ReactNode
}

export function DashboardHeaderShell({ compact = false, children }: DashboardHeaderShellProps) {
  return (
    <>
      <header
        className={`relative z-30 shrink-0 border-b border-[#1a4060]/70 bg-[linear-gradient(180deg,rgba(4,11,22,0.98),rgba(6,16,30,0.95)_55%,rgba(3,9,18,0.99))] shadow-[0_16px_48px_rgba(0,0,0,0.38)] backdrop-blur-xl ${
          compact ? "h-[52px]" : "h-[62px]"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Base atmosphere gradients */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_14%_0%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(ellipse_at_86%_0%,rgba(45,212,191,0.10),transparent_30%),linear-gradient(90deg,rgba(4,14,26,0.52),rgba(4,14,26,0)_20%,rgba(4,14,26,0)_80%,rgba(4,14,26,0.52))]" />

          {/* Grid scan lines */}
          <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(90deg,rgba(113,171,197,0.18)_1px,transparent_1px),linear-gradient(0deg,rgba(113,171,197,0.10)_1px,transparent_1px)] [background-size:120px_100%,100%_20px]" />

          {/* ── Top glow stack ── */}
          {/* Hard bright line */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#5ef0ff] to-transparent" />
          {/* Wide soft halo */}
          <div className="absolute inset-x-0 top-0 h-[18px] bg-gradient-to-b from-[#22d3ee]/28 to-transparent" />
          {/* Tight inner glow on the line */}
          <div className="absolute inset-x-[10%] top-0 h-px shadow-[0_0_28px_6px_rgba(34,211,238,0.55)]" />

          {/* ── Corner brackets ── */}
          {/* Top-left */}
          <div className="absolute left-0 top-0">
            <div className="absolute left-0 top-0 h-[3px] w-[44px] bg-gradient-to-r from-[#22d3ee]/95 to-transparent" />
            <div className="absolute left-0 top-0 h-[44px] w-[3px] bg-gradient-to-b from-[#22d3ee]/95 to-transparent" />
            <div className="absolute left-[3px] top-[3px] h-[5px] w-[5px] rounded-full bg-[#6af4ff] shadow-[0_0_12px_3px_rgba(34,211,238,0.9)]" />
          </div>
          {/* Top-right */}
          <div className="absolute right-0 top-0">
            <div className="absolute right-0 top-0 h-[3px] w-[44px] bg-gradient-to-l from-[#22d3ee]/95 to-transparent" />
            <div className="absolute right-0 top-0 h-[44px] w-[3px] bg-gradient-to-b from-[#22d3ee]/95 to-transparent" />
            <div className="absolute right-[3px] top-[3px] h-[5px] w-[5px] rounded-full bg-[#6af4ff] shadow-[0_0_12px_3px_rgba(34,211,238,0.9)]" />
          </div>



          {/* Primary horizontal sweep */}
          <div
            className="absolute inset-y-[10px] left-[-26%] w-[40%] bg-[linear-gradient(90deg,transparent,rgba(114,228,255,0.16),transparent)] blur-[14px]"
            style={{ animation: "hdr-sheen 10s ease-in-out infinite" }}
          />
          {/* Secondary sweep — offset phase */}
          <div
            className="absolute inset-y-[10px] left-[-26%] w-[22%] bg-[linear-gradient(90deg,transparent,rgba(45,212,191,0.12),transparent)] blur-[9px]"
            style={{ animation: "hdr-sheen 10s ease-in-out infinite 5s" }}
          />

          {/* Bottom border glow */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#2dd4bf]/55 to-transparent" />
        </div>

        <div className="relative flex h-full items-center justify-between gap-3 px-3.5 md:px-5">{children}</div>
      </header>

      <style>{`
        @keyframes hdr-sheen {
          0%, 100% { transform: translateX(0) scaleX(0.96); opacity: .08; }
          50% { transform: translateX(210%) scaleX(1.06); opacity: .24; }
        }
        @keyframes brand-ring-pulse {
          0%, 100% { opacity: 0.18; transform: scale(1); }
          50% { opacity: 0.40; transform: scale(1.06); }
        }
        @keyframes brand-dot-blink {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px 1px rgba(34,197,94,0.9); }
          50% { opacity: 0.55; box-shadow: 0 0 3px 0px rgba(34,197,94,0.5); }
        }
      `}</style>
    </>
  )
}
