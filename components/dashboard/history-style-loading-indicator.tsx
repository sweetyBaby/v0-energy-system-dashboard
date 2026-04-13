"use client"

import { DASHBOARD_CONTENT_SCALE, useFluidScale } from "@/hooks/use-fluid-scale"

export function HistoryStyleLoadingIndicator({
  text,
  variant = "panel",
}: {
  text: string
  variant?: "panel" | "overlay"
}) {
  const isOverlay = variant === "overlay"
  const scale = useFluidScale<HTMLDivElement>(1180, 1920, DASHBOARD_CONTENT_SCALE)
  const textSize = scale.fluid(12, 15)
  const orbEdge = scale.fluid(44, 54)
  const pulseEdge = scale.fluid(12, 15)

  return (
    <div
      ref={scale.ref}
      className={`relative overflow-hidden rounded-[20px] border border-[#29547f]/80 bg-[linear-gradient(180deg,rgba(12,27,58,0.9),rgba(8,18,40,0.96))] shadow-[0_18px_40px_rgba(0,0,0,0.24),inset_0_0_24px_rgba(63,231,255,0.05)] ${
        isOverlay ? "min-w-[240px] px-6 py-5" : "min-w-[220px] px-5 py-4"
      }`}
      style={scale.rootStyle}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(110,231,255,0.14),transparent_42%),linear-gradient(90deg,transparent,rgba(255,211,107,0.05),transparent)]" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <div
          className="relative flex items-center justify-center rounded-full border border-[#4ba7d7]/45 bg-[radial-gradient(circle,rgba(110,231,255,0.18),rgba(17,35,68,0.1)_65%,transparent)]"
          style={{ width: orbEdge, height: orbEdge }}
        >
          <span className="absolute animate-ping rounded-full border border-[#6ee7ff]/30" style={{ width: orbEdge, height: orbEdge }} />
          <span className="animate-pulse rounded-full bg-[#6ee7ff] shadow-[0_0_14px_rgba(110,231,255,0.95)]" style={{ width: pulseEdge, height: pulseEdge }} />
        </div>
        <div className="font-semibold tracking-[0.08em] text-[#dffbff]" style={{ fontSize: textSize }}>{text}</div>
        <div className="w-full max-w-[188px] space-y-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#102346]">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-[linear-gradient(90deg,rgba(63,231,255,0.42),rgba(255,211,107,0.78),rgba(63,231,255,0.42))]" />
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6ee7ff]/90" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffd36b]/80 [animation-delay:160ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6ee7ff]/70 [animation-delay:320ms]" />
          </div>
        </div>
      </div>
    </div>
  )
}
