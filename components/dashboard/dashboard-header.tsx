"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { ChevronDown, Globe, Zap } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export const projects = [
  {
    id: "jintan",
    name: "金坛储能中心",
    nameEn: "Jintan Energy Storage Center",
    ratedPower: "2.0 MW",
    ratedCapacity: "4.0 MWh",
    commissioningDate: "2025-11-15",
    // image: "/jintan-1.jpg",
    image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1600&h=900&fit=crop",
  },
  {
    id: "ordos",
    name: "鄂尔多斯储能中心",
    nameEn: "Ordos Energy Storage Center",
    ratedPower: "5.0 MW",
    ratedCapacity: "10.0 MWh",
    commissioningDate: "2025-11-20",
    image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1600&h=900&fit=crop",
  },
]

export type Project = typeof projects[number]

const ProjectContext = createContext<{
  selectedProject: Project
  setSelectedProject: (project: Project) => void
}>({
  selectedProject: projects[0],
  setSelectedProject: () => {},
})

export const useProject = () => useContext(ProjectContext)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [selectedProject, setSelectedProject] = useState(projects[0])
  return (
    <ProjectContext.Provider value={{ selectedProject, setSelectedProject }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function DashboardHeader() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const { selectedProject, setSelectedProject } = useProject()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { language, setLanguage } = useLanguage()

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatDate = (date: Date) => {
    const y = date.getFullYear()
    const mo = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    const h = String(date.getHours()).padStart(2, "0")
    const mi = String(date.getMinutes()).padStart(2, "0")
    const s = String(date.getSeconds()).padStart(2, "0")
    return `${y}/${mo}/${d} ${h}:${mi}:${s}`
  }

  return (
    <header className="relative z-30 h-[56px] shrink-0 overflow-visible bg-[#020810]">

      {/* ── 背景层 ── */}
      {/* 扫描线纹理 */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(34,211,238,0.010)_3px,rgba(34,211,238,0.010)_4px)]" />
      {/* 中心顶部晕光 */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[56px] w-[500px] -translate-x-1/2 bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(34,211,238,0.18),transparent)]" />

      {/* ── 顶部发光线（贯穿全宽，最亮的边） ── */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#00e8cc] to-transparent"
        style={{ boxShadow: "0 0 12px rgba(0,232,204,0.55)" }}
      />
      {/* 底部分隔线 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/35 to-transparent" />

      {/* ── 四角装饰 ── */}
      <div className="pointer-events-none absolute left-0 top-0 h-7 w-7 border-l-[1.5px] border-t-[1.5px] border-[#00d4aa]/55" />
      <div className="pointer-events-none absolute right-0 top-0 h-7 w-7 border-r-[1.5px] border-t-[1.5px] border-[#00d4aa]/55" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b border-l border-[#22d3ee]/20" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b border-r border-[#22d3ee]/20" />

      {/* ── 水平延伸导轨线（绝对定位，左右各一段，从标题两侧向外渐出） ── */}
      {/* 左段：从屏幕左边 → 标题左侧 */}
      <div
        className="pointer-events-none absolute top-1/2 h-px -translate-y-1/2"
        style={{
          left: 0,
          right: "calc(50% + 152px)",
          background: "linear-gradient(to right, transparent 0%, rgba(34,211,238,0.12) 30%, rgba(34,211,238,0.45) 100%)",
        }}
      />
      {/* 右段：从标题右侧 → 屏幕右边 */}
      <div
        className="pointer-events-none absolute top-1/2 h-px -translate-y-1/2"
        style={{
          left: "calc(50% + 152px)",
          right: 0,
          background: "linear-gradient(to left, transparent 0%, rgba(34,211,238,0.12) 30%, rgba(34,211,238,0.45) 100%)",
        }}
      />

      {/* ── 节点装饰（左右对称） ── */}
      {/* 紧接标题的短亮段 */}
      <div className="pointer-events-none absolute top-1/2 h-[2px] -translate-y-1/2 rounded-full" style={{ right: "calc(50% + 140px)", width: 18, background: "rgba(34,211,238,0.80)", boxShadow: "0 0 6px rgba(34,211,238,0.6)" }} />
      <div className="pointer-events-none absolute top-1/2 h-[2px] -translate-y-1/2 rounded-full" style={{ left: "calc(50% + 140px)", width: 18, background: "rgba(34,211,238,0.80)", boxShadow: "0 0 6px rgba(34,211,238,0.6)" }} />
      {/* 菱形节点 ①：220px */}
      <div className="pointer-events-none absolute top-1/2 border border-[#22d3ee]/70" style={{ left: "calc(50% - 220px)", width: 9, height: 9, transform: "translate(-50%,-50%) rotate(45deg)" }} />
      <div className="pointer-events-none absolute top-1/2 border border-[#22d3ee]/70" style={{ left: "calc(50% + 220px)", width: 9, height: 9, transform: "translate(-50%,-50%) rotate(45deg)" }} />
      {/* 小实心菱形 ②：310px */}
      <div className="pointer-events-none absolute top-1/2 bg-[#22d3ee]/65" style={{ left: "calc(50% - 310px)", width: 5, height: 5, transform: "translate(-50%,-50%) rotate(45deg)", boxShadow: "0 0 5px rgba(34,211,238,0.5)" }} />
      <div className="pointer-events-none absolute top-1/2 bg-[#22d3ee]/65" style={{ left: "calc(50% + 310px)", width: 5, height: 5, transform: "translate(-50%,-50%) rotate(45deg)", boxShadow: "0 0 5px rgba(34,211,238,0.5)" }} />
      {/* 光点 ③：420px */}
      <div className="pointer-events-none absolute top-1/2 rounded-full bg-[#22d3ee]/50" style={{ left: "calc(50% - 420px)", width: 4, height: 4, transform: "translate(-50%,-50%)", boxShadow: "0 0 6px rgba(34,211,238,0.4)" }} />
      <div className="pointer-events-none absolute top-1/2 rounded-full bg-[#22d3ee]/50" style={{ left: "calc(50% + 420px)", width: 4, height: 4, transform: "translate(-50%,-50%)", boxShadow: "0 0 6px rgba(34,211,238,0.4)" }} />

      {/* ── 内容三栏布局 ── */}
      <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center px-4">

        {/* ── 左侧：图标 + 项目选择 ── */}
        <div className="relative z-40 flex items-center gap-2.5">
          {/* 切角图标框 */}
          <div
            className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center border border-[#00d4aa]/40 bg-[#00d4aa]/08"
            style={{ clipPath: "polygon(5px 0%,100% 0%,100% calc(100% - 5px),calc(100% - 5px) 100%,0% 100%,0% 5px)" }}
          >
            <Zap className="h-[15px] w-[15px] text-[#00d4aa]" style={{ filter: "drop-shadow(0 0 5px rgba(0,212,170,0.7))" }} />
          </div>
          {/* 在线脉冲点 */}
          <span className="h-[7px] w-[7px] shrink-0 animate-pulse rounded-full bg-[#00ff9d] shadow-[0_0_7px_#00ff9d,0_0_14px_rgba(0,255,157,0.4)]" />
          {/* 项目下拉 */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(p => !p)}
              className="flex h-[26px] min-w-[160px] items-center justify-between gap-2 border-b border-[#22d3ee]/28 bg-transparent px-1 transition-colors hover:border-[#22d3ee]/60"
            >
              <span className="truncate text-[13px] font-medium tracking-[0.03em] text-[#d8eeff]">
                {language === "zh" ? selectedProject.name : selectedProject.nameEn}
              </span>
              <ChevronDown className={`h-3 w-3 shrink-0 text-[#22d3ee]/60 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-full overflow-hidden border border-[#22d3ee]/22 bg-[#030d1f] shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
                <div className="h-px bg-gradient-to-r from-transparent via-[#22d3ee]/45 to-transparent" />
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProject(p); setDropdownOpen(false) }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12.5px] transition-colors ${
                      selectedProject.id === p.id ? "bg-[#0a1e40] text-[#00e8cc]" : "text-[#a0c0dc] hover:bg-[#071428]"
                    }`}
                  >
                    <span>{language === "zh" ? p.name : p.nameEn}</span>
                    {selectedProject.id === p.id && <span className="h-1.5 w-1.5 rounded-full bg-[#00e8cc] shadow-[0_0_5px_#00e8cc]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 中间：标题发光核心框体 ── */}
        <div
          className="relative px-9 py-[5px]"
          style={{
            background: "linear-gradient(180deg,rgba(34,211,238,0.065) 0%,rgba(34,211,238,0.022) 100%)",
            clipPath: "polygon(10px 0%,calc(100% - 10px) 0%,100% 50%,calc(100% - 10px) 100%,10px 100%,0% 50%)",
          }}
        >
          {/* 内边框 — 用 outline 替代 border（clip-path 会裁掉 border） */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              clipPath: "polygon(10px 0%,calc(100% - 10px) 0%,100% 50%,calc(100% - 10px) 100%,10px 100%,0% 50%)",
              border: "1px solid rgba(34,211,238,0.30)",
              boxShadow: "inset 0 0 16px rgba(34,211,238,0.06)",
            }}
          />
          {/* 顶部亮缝 */}
          <div className="pointer-events-none absolute left-[10px] right-[10px] top-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/80 to-transparent" />
          {/* 底部暗缝 */}
          <div className="pointer-events-none absolute bottom-0 left-[10px] right-[10px] h-px bg-gradient-to-r from-transparent via-[#22d3ee]/25 to-transparent" />

          <h1
            className="whitespace-nowrap bg-gradient-to-r from-[#7af0ff] via-[#ffffff] to-[#00d4aa] bg-clip-text text-[1.10rem] font-bold tracking-[0.20em] text-transparent"
            style={{ filter: "drop-shadow(0 0 18px rgba(34,211,238,0.55))" }}
          >
            {language === "zh" ? "BMS 数据监测云平台" : "BMS DATA MONITORING CLOUD"}
          </h1>
        </div>

        {/* ── 右侧：时间 + 语言 ── */}
        <div className="flex items-center justify-end gap-2">
          {/* 时间：切角平行四边形 */}
          <div
            className="flex h-[26px] items-center gap-1.5 px-3"
            style={{ clipPath: "polygon(7px 0%,100% 0%,calc(100% - 7px) 100%,0% 100%)", border: "1px solid rgba(34,211,238,0.20)", background: "rgba(5,15,35,0.70)" }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00ff9d] shadow-[0_0_6px_#00ff9d]" />
            <span className="font-mono text-[11px] tabular-nums tracking-[0.08em] text-[#5ec8f0]">
              {currentTime ? formatDate(currentTime) : "----/--/-- --:--:--"}
            </span>
          </div>

          {/* 语言切换：反向切角 */}
          <div
            className="flex h-[26px] items-center overflow-hidden"
            style={{ clipPath: "polygon(0% 0%,calc(100% - 7px) 0%,100% 100%,0% 100%)", border: "1px solid rgba(34,211,238,0.20)", background: "rgba(5,15,35,0.70)" }}
          >
            <div className="flex items-center px-2">
              <Globe className="h-[13px] w-[13px] text-[#22d3ee]/50" />
            </div>
            <div className="h-3.5 w-px bg-[#22d3ee]/18" />
            {(["zh", "en"] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2.5 text-[11.5px] font-semibold tracking-wide transition-all ${
                  language === lang
                    ? "text-[#00e8cc]"
                    : "text-[#3d6070] hover:text-[#7ab8cc]"
                }`}
                style={language === lang ? { textShadow: "0 0 10px rgba(0,232,204,0.55)" } : undefined}
              >
                {lang === "zh" ? "中文" : "EN"}
              </button>
            ))}
          </div>
        </div>

      </div>
    </header>
  )
}
