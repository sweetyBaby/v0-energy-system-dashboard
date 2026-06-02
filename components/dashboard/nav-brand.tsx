import { EnerCloudMark } from "@/components/brand/enercloud-mark"

type NavBrandProps = {
  compact?: boolean
}

export function NavBrand({ compact = false }: NavBrandProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {/* Logo with outer pulse ring */}
      <div className="relative flex shrink-0 items-center justify-center">
        <div
          className={`absolute rounded-[17px] border border-[#22d3ee]/28 ${compact ? "h-[42px] w-[42px]" : "h-[50px] w-[50px]"}`}
          style={{ animation: "brand-ring-pulse 2.8s ease-in-out infinite" }}
        />
        <div
          className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-[13px] border border-[#3595b8]/65 bg-[linear-gradient(145deg,rgba(11,32,49,0.96),rgba(6,16,28,0.98))] shadow-[0_0_0_1px_rgba(127,215,255,0.08)_inset,0_0_22px_rgba(34,211,238,0.20),0_12px_24px_rgba(0,0,0,0.22)] ${
            compact ? "h-[34px] w-[34px]" : "h-[40px] w-[40px]"
          }`}
        >
          <span className="pointer-events-none absolute inset-x-[18%] top-0 h-px bg-gradient-to-r from-transparent via-[#98f1ff]/80 to-transparent" />
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(86,231,255,0.24),transparent_64%)]" />
          <EnerCloudMark
            className={`relative ${compact ? "h-[15px] w-[15px]" : "h-[18px] w-[18px]"} text-[#f8fdff]`}
            glowClassName="text-[#24e5d9]/22"
          />
        </div>
      </div>

      {/* Brand text */}
      <div className="min-w-0">
        <span
          className="mt-0.5 block shrink-0 truncate font-black leading-tight"
          style={{
            fontSize: compact ? "0.90rem" : "1.06rem",
            letterSpacing: compact ? "0.08em" : "0.09em",
            fontFamily: '"Arial Black","Segoe UI","Microsoft YaHei UI","Microsoft YaHei",sans-serif',
            backgroundImage: "linear-gradient(180deg,#f9feff 0%,#d8f2ff 48%,#93e8ff 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 14px rgba(60,223,255,0.30))",
          }}
        >
          EnerCloud
        </span>
        <span className="mt-1 block h-px w-full bg-[linear-gradient(90deg,rgba(124,234,255,0.64),rgba(124,234,255,0.16),transparent)]" />
      </div>
    </div>
  )
}
