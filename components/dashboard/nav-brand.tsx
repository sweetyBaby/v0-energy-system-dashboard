import { EnerCloudMark } from "@/components/brand/enercloud-mark"

type NavBrandProps = {
  compact?: boolean
}

export function NavBrand({ compact = false }: NavBrandProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`relative flex shrink-0 items-center justify-center rounded-[10px] bg-[radial-gradient(circle_at_50%_38%,rgba(36,229,217,0.18),rgba(7,25,34,0.9)_72%)] ${
          compact ? "h-[38px] w-[38px]" : "h-[44px] w-[44px]"
        }`}
      >
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(92,231,255,0.26),transparent_68%)] blur-md" />
        <EnerCloudMark
          className={`${compact ? "h-[18px] w-[18px]" : "h-[22px] w-[22px]"} text-[#f7fafc]`}
          glowClassName="text-[#24e5d9]/28"
        />
      </div>
      <span
        className="shrink-0 font-black leading-tight"
        style={{
          fontSize: compact ? "1.1rem" : "1.3rem",
          letterSpacing: "0.05em",
          fontFamily: '"Arial Black","Segoe UI","Microsoft YaHei UI","Microsoft YaHei",sans-serif',
          backgroundImage: "linear-gradient(180deg,#f8feff 0%,#d6f9ff 45%,#7effd7 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 0 14px rgba(60,223,255,0.4))",
        }}
      >
        EnerCloud
      </span>
    </div>
  )
}
