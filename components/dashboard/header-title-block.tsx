type HeaderTitleBlockProps = {
  eyebrow: string
  title: string
  subtitle: string
  compact?: boolean
}

export function HeaderTitleBlock({
  eyebrow,
  title,
  subtitle,
  compact = false,
}: HeaderTitleBlockProps) {
  return (
    <div
      className={`relative min-w-0 overflow-hidden rounded-[14px] border border-[#24475b]/58 bg-[linear-gradient(180deg,rgba(7,18,30,0.66),rgba(4,10,19,0.54))] shadow-[0_0_0_1px_rgba(125,219,255,0.04)_inset] backdrop-blur-md ${
        compact ? "px-2.5 py-1.5" : "px-3 py-2"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(57,189,255,0.10),transparent_26%),linear-gradient(90deg,rgba(9,26,40,0.32),rgba(9,26,40,0)_58%)]" />
      <div className="pointer-events-none absolute inset-y-[18%] left-0 w-px bg-gradient-to-b from-transparent via-[#6fe4ff]/36 to-transparent" />
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#8defff]/48 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-3 right-8 h-px bg-gradient-to-r from-[#2dd4bf]/28 via-[#52e7ff]/16 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 h-3.5 w-3.5 border-r border-t border-[#3c7a97]/46" />
      <div className="relative min-w-0">
        <div className={`truncate font-semibold tracking-[0.2em] text-[#6f95aa] ${compact ? "text-[7px]" : "text-[8px]"}`}>
          {eyebrow}
        </div>
        <div className={`mt-0.5 truncate font-black leading-none text-[#f2fbff] ${compact ? "text-[14px]" : "text-[16px]"}`}>
          {title}
        </div>
        <div className={`mt-1 truncate font-medium text-[#8baec1] ${compact ? "text-[9px]" : "text-[10px]"}`}>
          {subtitle}
        </div>
      </div>
    </div>
  )
}
