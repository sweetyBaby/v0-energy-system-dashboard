type EnerCloudMarkProps = {
  className?: string
  glowClassName?: string
}

export function EnerCloudMark({ className, glowClassName = "text-[#24e5d9]/25" }: EnerCloudMarkProps) {
  return (
    <svg className={className} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M63 44H142M63 44V90H121M38 136H128M38 136V90H58"
        className={glowClassName}
        stroke="currentColor"
        strokeWidth="34"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M63 44H142M63 44V90H121M38 136H128M38 136V90H58"
        stroke="currentColor"
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
