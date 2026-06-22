"use client"

import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Battery, Building2, CalendarClock, MapPin, Receipt, Zap } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useProject } from "@/components/dashboard/dashboard-header"
import { DEFAULT_PROJECT_IMAGE } from "@/lib/api/project"

// 后端暂无字段，先用占位值展示，待接口接入后替换
const REVENUE_PLACEHOLDER = "--"

const clampText = (minRem: number, multiple: number, maxRem: number) =>
  `clamp(${minRem}rem, calc(var(--overview-root-size, 15px) * ${multiple}), ${maxRem}rem)`

function useOverviewFontBase(ref: React.RefObject<HTMLDivElement | null>) {
  const [base, setBase] = useState(15)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const calc = (w: number, h: number) => {
      // 字号基准随容器尺寸自适应；提高下限/上限，避免笔记本小屏下文字过小
      const next = Math.min(w, h * 1.05) * 0.031
      setBase(Math.max(15, Math.min(next, 19.5)))
    }

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      calc(width, height)
    })

    ro.observe(el)
    calc(el.offsetWidth, el.offsetHeight)
    return () => ro.disconnect()
  }, [ref])

  return base
}

type InfoRow = {
  icon: ReactNode
  labelZh: string
  labelEn: string
  value: string
}

const hasDisplayText = (value?: string | null) => typeof value === "string" && value.trim().length > 0

const isRegionCode = (value?: string | null) => typeof value === "string" && /^\d+$/.test(value.trim())

const META_TEXT_VALUE_LABELS = new Set(["Region", "Owner"])

/**
 * 单行数值：默认用容器（clamp）字号；若超出列宽则自动缩小字号直至完整显示（不省略、不换行）。
 * 容器尺寸变化（大屏自适应）时重新计算。
 */
function AutoFitValue({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    const box = el?.parentElement
    if (!el || !box) return
    let lastW = -1 // 仅当列宽变化时重算，避免字号变化→高度变化→反复触发的抖动
    const fit = () => {
      const w = box.clientWidth
      if (w === lastW) return
      lastW = w
      el.style.fontSize = "" // 回到容器 clamp 字号作为上限
      const max = parseFloat(getComputedStyle(box).fontSize) || 14
      let size = max
      let guard = 0
      while (el.scrollWidth > w && size > max * 0.78 && guard < 60) {
        size -= 0.5
        el.style.fontSize = `${size}px`
        guard += 1
      }
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    return () => ro.disconnect()
  }, [text])
  return <span ref={ref} className="inline-block max-w-full whitespace-nowrap align-middle">{text}</span>
}

export function ProjectOverviewInfoCard() {
  const { language } = useLanguage()
  const { selectedProject } = useProject()
  const zh = language === "zh"
  const cardRef = useRef<HTMLDivElement>(null)
  const base = useOverviewFontBase(cardRef)
  const projectThumbnail = selectedProject.image?.trim() || DEFAULT_PROJECT_IMAGE
  const rootStyle = {
    "--overview-root-size": `${base}px`,
    padding: `${base * 0.48}px`,
    gap: `${base * 0.3}px`,
  } as CSSProperties

  const iconClass = "h-[1em] w-[1em] text-[#5fd0ff]"
  const regionDisplayValue =
    (zh
      ? [selectedProject.regionName, selectedProject.regionPinyin, selectedProject.region]
      : [selectedProject.regionPinyin, selectedProject.regionName, selectedProject.region]
    ).find((value) => hasDisplayText(value) && !isRegionCode(value)) ?? REVENUE_PLACEHOLDER

  const profileRows: InfoRow[] = [
    { icon: <Zap className={iconClass} fill="currentColor" />, labelZh: "额定功率", labelEn: "Rated Power", value: selectedProject.ratedPower },
    { icon: <Battery className={iconClass} />, labelZh: "额定容量", labelEn: "Rated Capacity", value: selectedProject.ratedCapacity },
    { icon: <CalendarClock className={iconClass} />, labelZh: "投运日期", labelEn: "Commission Date", value: selectedProject.commissioningDate },
    { icon: <MapPin className={iconClass} />, labelZh: "所属地区", labelEn: "Region", value: regionDisplayValue },
    { icon: <Building2 className={iconClass} />, labelZh: "业主单位", labelEn: "Owner", value: selectedProject.company },
    { icon: <Receipt className={iconClass} />, labelZh: "电价信息", labelEn: "Tariff", value: selectedProject.tariffInfo },
  ]

  return (
    <div
      ref={cardRef}
      className="relative flex h-full w-full flex-col overflow-hidden rounded-[22px] border border-[#22d3ee]/26 bg-[radial-gradient(circle_at_18%_16%,rgba(64,124,255,0.22),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(0,212,170,0.14),transparent_24%),linear-gradient(180deg,rgba(11,31,67,0.66),rgba(6,20,47,0.74))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_16px_32px_rgba(0,0,0,0.16)]"
      style={rootStyle}
    >
      <div className="flex min-h-0 flex-1 flex-col" style={{ gap: "calc(var(--overview-root-size, 15px) * 0.26)" }}>
        <div
          className="relative shrink-0 overflow-hidden rounded-[14px] border border-[#68d9ff]/22 bg-[#071a34] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_8px_18px_rgba(0,0,0,0.16)]"
          style={{ height: "clamp(92px, calc(var(--overview-root-size, 15px) * 6.7), 126px)" }}
        >
          <img
            src={projectThumbnail}
            alt={zh ? `${selectedProject.projectName}缩略图` : `${selectedProject.projectNameEn || selectedProject.projectName} thumbnail`}
            className="h-full w-full object-cover brightness-[1.06] saturate-[1.08]"
            onError={(event) => {
              if (!event.currentTarget.src.endsWith(DEFAULT_PROJECT_IMAGE)) {
                event.currentTarget.src = DEFAULT_PROJECT_IMAGE
              }
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,18,38,0.02)_0%,rgba(5,18,38,0.08)_48%,rgba(5,18,38,0.64)_100%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(125,220,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(125,220,255,0.14)_1px,transparent_1px)] [background-size:22px_22px]" />
          <div className="pointer-events-none absolute bottom-0 left-4 right-4 h-px bg-[linear-gradient(90deg,transparent,rgba(95,208,255,0.85),transparent)]" />
          <div
            className="absolute bottom-2 left-3 right-3 truncate font-semibold tracking-[0.02em] text-[#effaff] drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]"
            style={{ fontSize: clampText(0.82, 0.94, 1.12) }}
          >
            {zh ? selectedProject.projectName : selectedProject.projectNameEn || selectedProject.projectName}
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-3" style={{ columnGap: "calc(var(--overview-root-size, 15px) * 0.56)", rowGap: "calc(var(--overview-root-size, 15px) * 0.22)" }}>
          {profileRows.map((row) => (
            <div
              key={row.labelEn}
              className="flex min-h-0 items-center gap-2 overflow-hidden rounded-[8px] border border-[#5fd0ff]/12 bg-[#071b38]/42 px-2.5"
            >
              <span
                className="flex shrink-0 items-center justify-center rounded-[7px] border border-[#5fd0ff]/24 bg-[#0a2142]/70 leading-none"
                style={{ width: "1.78em", height: "1.78em", fontSize: clampText(0.78, 0.9, 1.08) }}
              >
                {row.icon}
              </span>
              {/* 上下两行：标签在上、数值在下 */}
              <div className="flex min-w-0 flex-1 flex-col justify-center" style={{ gap: "calc(var(--overview-root-size, 15px) * 0.08)" }}>
                <span className="truncate leading-tight text-[#9ec4e8]" style={{ fontSize: clampText(0.72, 0.82, 0.94) }}>
                  {zh ? row.labelZh : row.labelEn}
                </span>
                <div
                  className="overflow-hidden font-semibold leading-tight tabular-nums text-[#eaf6ff]"
                  style={{
                    fontSize: META_TEXT_VALUE_LABELS.has(row.labelEn)
                      ? clampText(0.8, 0.92, 1.05)
                      : clampText(0.86, 1.0, 1.15),
                    textShadow: "0 1px 6px rgba(0,0,0,0.6)",
                  }}
                  title={row.value}
                >
                  <AutoFitValue text={row.value} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
