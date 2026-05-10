import { EnerCloudMark } from "@/components/brand/enercloud-mark"

type NavBrandProps = {
  compact?: boolean
}

export function NavBrand({ compact = false }: NavBrandProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-[#23556e]/70 bg-[radial-gradient(circle_at_50%_38%,rgba(36,229,217,0.2),rgba(7,25,34,0.92)_72%)] shadow-[0_0_0_1px_rgba(71,154,195,0.12)_inset,0_0_18px_rgba(36,229,217,0.08)] ${
          compact ? "h-[38px] w-[38px]" : "h-[44px] w-[44px]"
        }`}
      >
        <span className="pointer-events-none absolute left-[4px] top-[4px] h-[6px] w-[6px] border-l border-t border-[#7cecff]/70" />
        <span className="pointer-events-none absolute bottom-[4px] right-[4px] h-[6px] w-[6px] border-b border-r border-[#52f0da]/55" />
        <span className="pointer-events-none absolute inset-x-[18%] top-0 h-px bg-gradient-to-r from-transparent via-[#8ff7ff]/80 to-transparent" />
        <span className="pointer-events-none absolute inset-y-[20%] right-0 w-px bg-gradient-to-b from-transparent via-[#37e6ff]/45 to-transparent" />
        <span className="pointer-events-none absolute inset-y-[18%] left-[-35%] w-[70%] rotate-[18deg] bg-[linear-gradient(90deg,transparent,rgba(132,244,255,0.16),transparent)] blur-[4px]" />
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(92,231,255,0.26),transparent_68%)] blur-md" />
        <EnerCloudMark
          className={`${compact ? "h-[18px] w-[18px]" : "h-[22px] w-[22px]"} text-[#f7fafc]`}
          glowClassName="text-[#24e5d9]/28"
        />
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute -left-3 top-1/2 h-px w-2.5 -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(126,243,255,0.72))]" />
        <span className="pointer-events-none absolute -right-3 top-1/2 h-px w-2.5 -translate-y-1/2 bg-[linear-gradient(90deg,rgba(126,243,255,0.72),transparent)]" />
        <span
          className="shrink-0 font-black leading-tight"
          style={{
            fontSize: compact ? "1.1rem" : "1.3rem",
            letterSpacing: compact ? "0.08em" : "0.1em",
            fontFamily: '"Arial Black","Segoe UI","Microsoft YaHei UI","Microsoft YaHei",sans-serif',
            backgroundImage: "linear-gradient(180deg,#f8feff 0%,#d8f3ff 38%,#8cf3ff 62%,#7effd7 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 16px rgba(60,223,255,0.42))",
          }}
        >
          EnerCloud
        </span>
        <span className="pointer-events-none absolute -bottom-[4px] left-[6%] right-[6%] h-px bg-[linear-gradient(90deg,transparent,rgba(103,231,255,0.46),transparent)]" />
      </div>
    </div>
  )
}
