type EnerCloudMarkProps = {
  className?: string
  glowClassName?: string
}

export function EnerCloudMark({ className }: EnerCloudMarkProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/enervenue-logo-mark-white.png"
      alt="Logo"
      className={`object-contain ${className ?? ""}`}
    />
  )
}
