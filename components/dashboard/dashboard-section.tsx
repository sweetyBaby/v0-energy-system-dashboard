"use client"

interface DashboardSectionProps {
  title: string
  description: string
}

export function DashboardSection({ title, description }: DashboardSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-1 rounded-full bg-[#00d4aa]" />
          <h2 className="text-lg font-semibold tracking-wide text-[#e8f4fc]">{title}</h2>
        </div>
        <div className="hidden h-px flex-1 bg-gradient-to-r from-[#00d4aa]/40 via-[#1a2654] to-transparent lg:block" />
      </div>
      <p className="text-sm text-[#7b8ab8]">{description}</p>
    </div>
  )
}
