import { EnerCloudMark } from "@/components/brand/enercloud-mark"

type NavBrandProps = {
  compact?: boolean
}

export function NavBrand({ compact = false }: NavBrandProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-[15px] border border-[#29556b] bg-[linear-gradient(135deg,rgba(18,52,72,0.96),rgba(7,19,31,0.98))] shadow-[0_0_0_1px_rgba(127,215,255,0.08)_inset,0_14px_28px_rgba(0,0,0,0.24)] ${
          compact ? "h-[36px] w-[36px]" : "h-[44px] w-[44px]"
        }`}
      >
        <span className="pointer-events-none absolute inset-x-[18%] top-0 h-px bg-gradient-to-r from-transparent via-[#98f1ff]/80 to-transparent" />
        <span className="pointer-events-none absolute inset-y-[16%] left-0 w-full bg-[linear-gradient(118deg,transparent,rgba(110,231,255,0.14),transparent)]" />
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(86,231,255,0.22),transparent_64%)]" />
        <EnerCloudMark
          className={`${compact ? "h-[17px] w-[17px]" : "h-[21px] w-[21px]"} text-[#f8fdff]`}
          glowClassName="text-[#24e5d9]/22"
        />
      </div>
      <div className="min-w-0">
        
        <span
          className="mt-0.5 block shrink-0 truncate font-black leading-tight"
          style={{
            fontSize: compact ? "1rem" : "1.28rem",
            letterSpacing: compact ? "0.08em" : "0.1em",
            fontFamily: '"Arial Black","Segoe UI","Microsoft YaHei UI","Microsoft YaHei",sans-serif',
            backgroundImage: "linear-gradient(180deg,#f9feff 0%,#d8f2ff 40%,#8eebff 72%,#8df6da 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 18px rgba(60,223,255,0.24))",
          }}
        >
          EnerCloud
        </span>
        <span className="mt-0.5 block h-px w-full bg-[linear-gradient(90deg,rgba(124,234,255,0.6),rgba(124,234,255,0.12),transparent)]" />
      </div>
    </div>
  )
}
