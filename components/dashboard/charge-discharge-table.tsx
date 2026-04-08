"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { BatteryCharging, BatteryMedium, Gauge } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useProject } from "@/components/dashboard/dashboard-header"

const PLACEHOLDER = "--"

type DetailItem = {
  labelZh: string
  labelEn: string
  value: string
  unit: string
}

type HeroCard = {
  key: string
  labelZh: string
  labelEn: string
  value: string
  unit: string
  accent: string
  softAccent: string
  ringClass: string
  valueClass: string
  icon: ReactNode
  details: DetailItem[]
}

const isPlaceholder = (value: string) => value.trim() === PLACEHOLDER

const splitNumber = (value: string) => {
  const dotIndex = value.lastIndexOf(".")
  if (dotIndex === -1 || isPlaceholder(value)) return { integer: value, decimal: "" }
  return { integer: value.slice(0, dotIndex), decimal: value.slice(dotIndex) }
}

// 用 ResizeObserver 监听容器尺寸，返回动态基准字号
function useContainerFontBase(ref: React.RefObject<HTMLDivElement>) {
  const [base, setBase] = useState(13)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current

    const calc = (w: number, h: number) => {
      // 每个子卡片实际宽约 w/2，高约 h/2
      // 基准 = min(宽/2, 高/2) 的 5.5%，保证内容在任意比例下不溢出
      const cardW = w / 2
      const cardH = h / 2
      const b = Math.min(cardW, cardH) * 0.055
      setBase(Math.max(10, Math.min(b, 22))) // 下限10px 上限22px
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

function TileFrame({
  accent,
  softAccent,
  className,
  children,
}: {
  accent: string
  softAccent: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[16px] border border-dashed border-white/55 bg-[linear-gradient(180deg,rgba(13,36,78,0.92),rgba(10,26,58,0.96))] ${className ?? ""}`}
      style={{
        boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 -24px 40px ${softAccent}, 0 0 18px rgba(0,0,0,0.18)`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[16px] bg-[radial-gradient(circle_at_18%_22%,rgba(130,193,255,0.14),transparent_30%),radial-gradient(circle_at_78%_84%,rgba(92,246,228,0.14),transparent_26%)]" />
      <div
        className="pointer-events-none absolute bottom-0 left-6 right-6 h-[3px] rounded-full"
        style={{
          background: `linear-gradient(90deg,transparent,${accent},transparent)`,
          boxShadow: `0 0 10px ${accent}`,
        }}
      />
      {children}
    </div>
  )
}

function HeroStatCard({ card, zh, base }: { card: HeroCard; zh: boolean; base: number }) {
  const { integer, decimal } = splitNumber(card.value)
  const B = base // 基准字号 px

  return (
    <TileFrame accent={card.accent} softAccent={card.softAccent} className="h-full">
      <div
        className="relative flex h-full flex-col"
        style={{ padding: `${B * 0.6}px ${B * 0.75}px`, gap: `${B * 0.38}px` }}
      >
        {/* header */}
        <div className="flex shrink-0 items-center" style={{ gap: `${B * 0.5}px` }}>
          {/* icon */}
          <div
            className="relative flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(5,18,43,0.96),rgba(9,27,60,0.88))] ring-1 ring-white/10"
            style={{
              width: `${B * 2.2}px`,
              height: `${B * 2.2}px`,
              boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), 0 0 18px ${card.softAccent}`,
            }}
          >
            <div className={`absolute inset-[3px] rounded-full bg-gradient-to-b ${card.ringClass} opacity-95`} />
            <div className="absolute inset-[6px] rounded-full bg-[linear-gradient(180deg,rgba(5,20,47,0.96),rgba(7,24,52,0.94))]" />
            <div
              className="relative z-10 flex items-center justify-center rounded-[7px] border border-white/15 bg-[linear-gradient(180deg,rgba(15,58,118,0.7),rgba(8,27,59,0.92))]"
              style={{ width: `${B * 1.1}px`, height: `${B * 1.1}px` }}
            >
              {card.icon}
            </div>
          </div>

          {/* 标题 + 今日值 */}
          <div className="flex min-w-0 flex-1 flex-col" style={{ gap: `${B * 0.2}px` }}>
            <span
              className="whitespace-nowrap font-semibold leading-tight tracking-[0.02em] text-[#f5f8ff] [text-shadow:0_2px_8px_rgba(0,0,0,0.55)]"
              style={{ fontSize: `${B * 1.05}px` }}
            >
              {zh ? card.labelZh : card.labelEn}
            </span>
            <div className="flex items-baseline whitespace-nowrap" style={{ gap: "2px" }}>
              <span
                className={`font-bold tabular-nums leading-none ${card.valueClass}`}
                style={{
                  fontSize: `${B * 1.85}px`,
                  textShadow: `0 0 16px ${card.softAccent}, 0 2px 8px rgba(0,0,0,0.45)`,
                }}
              >
                {integer}
              </span>
              {decimal && (
                <span
                  className={`font-bold tabular-nums leading-none ${card.valueClass}`}
                  style={{
                    fontSize: `${B * 1.05}px`,
                    textShadow: `0 0 12px ${card.softAccent}, 0 2px 8px rgba(0,0,0,0.45)`,
                  }}
                >
                  {decimal}
                </span>
              )}
              <span
                className="font-semibold text-[#f4f8ff] [text-shadow:0_2px_8px_rgba(0,0,0,0.45)]"
                style={{ fontSize: `${B * 1.05}px` }}
              >
                {card.unit}
              </span>
            </div>
          </div>
        </div>

        <div className="h-px w-full shrink-0 bg-[linear-gradient(90deg,transparent,rgba(180,220,255,0.7),transparent)]" />

        {/* details */}
        <div className="flex flex-1 flex-col justify-around min-h-0">
          {card.details.map((detail, idx) => (
            <div key={detail.labelEn} className="flex items-center justify-between" style={{ gap: "4px" }}>
              <span
                className="shrink-0 font-medium leading-none text-[#b8d4f8]/88"
                style={{ fontSize: `${B * 0.88}px` }}
              >
                {zh ? detail.labelZh : detail.labelEn}
              </span>
              {idx < card.details.length - 1 ? (
                <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(196,230,255,0.3),transparent)]" />
              ) : (
                <div className="flex-1" />
              )}
              <div className="flex shrink-0 items-baseline" style={{ gap: "2px" }}>
                <span
                  className="font-semibold tabular-nums leading-none text-[#f2f8ff]"
                  style={{
                    fontSize: `${B * 1.05}px`,
                    textShadow: `0 0 8px ${card.accent}33, 0 2px 6px rgba(0,0,0,0.4)`,
                  }}
                >
                  {detail.value}
                </span>
                <span className="leading-none text-[#d8eeff]/85" style={{ fontSize: `${B * 0.85}px` }}>
                  {detail.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TileFrame>
  )
}

function TotalCard({
  title, value, unit, accent, glow, zh, labelEn, base,
}: {
  title: string; labelEn: string; value: string; unit: string
  accent: string; glow: string; zh: boolean; base: number
}) {
  const B = base
  return (
    <TileFrame accent={accent} softAccent={glow} className="h-full">
      <div
        className="relative flex h-full flex-col justify-between"
        style={{ padding: `${B * 0.55}px ${B * 0.75}px`, gap: `${B * 0.3}px` }}
      >
        <div
          className="whitespace-nowrap font-semibold tracking-[0.02em] text-[#f6f9ff] [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]"
          style={{ fontSize: `${B * 1.05}px` }}
        >
          {zh ? title : labelEn}
        </div>
        <div className="h-px w-full shrink-0" style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
        <div className="flex min-h-0 flex-1 items-center">
          <div className="flex min-w-0 items-baseline overflow-hidden" style={{ gap: "3px" }}>
            <span
              className="font-bold tabular-nums leading-none"
              style={{
                fontSize: `${B * 2.2}px`,
                color: accent,
                textShadow: `0 0 20px ${glow}, 0 2px 8px rgba(0,0,0,0.45)`,
              }}
            >
              {value}
            </span>
            <span className="shrink-0 font-semibold text-[#f4f8ff]" style={{ fontSize: `${B * 1.3}px` }}>
              {unit}
            </span>
          </div>
        </div>
      </div>
    </TileFrame>
  )
}

export function ChargeDischargeTable() {
  const { language } = useLanguage()
  const { selectedProject } = useProject()
  const zh = language === "zh"
  const containerRef = useRef<HTMLDivElement>(null)
  const base = useContainerFontBase(containerRef)

  const gap = `${base * 0.4}px`
  const padding = `${base * 0.5}px`

  const heroCards: HeroCard[] = [
    {
      key: "efficiency",
      labelZh: "昨日能量效率",
      labelEn: "Yesterday Efficiency",
      value: selectedProject.overviewMetrics.efficiency.current,
      unit: "%",
      accent: "#57a8ff",
      softAccent: "rgba(87,168,255,0.28)",
      ringClass: "from-[#4a90ff] to-[#2e6be2]",
      valueClass: "text-[#f5f9ff]",
      icon: <Gauge className="h-[0.85em] w-[0.85em] text-[#73b6ff]" strokeWidth={1.8} />,
      details: [
        { labelZh: "本月", labelEn: "Month", value: selectedProject.overviewMetrics.efficiency.month, unit: "%" },
        { labelZh: "本年", labelEn: "Year", value: selectedProject.overviewMetrics.efficiency.year, unit: "%" },
        { labelZh: "累计", labelEn: "Total", value: selectedProject.overviewMetrics.efficiency.total, unit: "%" },
      ],
    },
    {
      key: "charge",
      labelZh: "今日充电量",
      labelEn: "Today Charge",
      value: selectedProject.overviewMetrics.charge.current,
      unit: "kWh",
      accent: "#8ef14d",
      softAccent: "rgba(142,241,77,0.28)",
      ringClass: "from-[#a3ff58] to-[#69d936]",
      valueClass: "text-[#b9ff8b]",
      icon: <BatteryCharging className="h-[0.85em] w-[0.85em] text-[#a0ff66]" strokeWidth={1.8} />,
      details: [
        { labelZh: "昨日", labelEn: "Yesterday", value: selectedProject.overviewMetrics.charge.yesterday, unit: "kWh" },
        { labelZh: "本月", labelEn: "Month", value: selectedProject.overviewMetrics.charge.month, unit: "kWh" },
        { labelZh: "累计", labelEn: "Total", value: selectedProject.overviewMetrics.charge.total, unit: "MWh" },
      ],
    },
    {
      key: "discharge",
      labelZh: "今日放电量",
      labelEn: "Today Discharge",
      value: selectedProject.overviewMetrics.discharge.current,
      unit: "kWh",
      accent: "#58a7ff",
      softAccent: "rgba(88,167,255,0.28)",
      ringClass: "from-[#5ca9ff] to-[#3575eb]",
      valueClass: "text-[#f5f9ff]",
      icon: <BatteryMedium className="h-[0.85em] w-[0.85em] text-[#6fb5ff]" strokeWidth={1.8} />,
      details: [
        { labelZh: "昨日", labelEn: "Yesterday", value: selectedProject.overviewMetrics.discharge.yesterday, unit: "kWh" },
        { labelZh: "本月", labelEn: "Month", value: selectedProject.overviewMetrics.discharge.month, unit: "kWh" },
        { labelZh: "累计", labelEn: "Total", value: selectedProject.overviewMetrics.discharge.total, unit: "MWh" },
      ],
    },
  ]

  const totalCards = [
    {
      key: "charge-total",
      labelZh: "累计充电量",
      labelEn: "Total Charge",
      value: selectedProject.overviewMetrics.totalCharge,
      unit: "MWh",
      accent: "#8af7bc",
      glow: "rgba(92,247,191,0.35)",
    },
    {
      key: "discharge-total",
      labelZh: "累计放电量",
      labelEn: "Total Discharge",
      value: selectedProject.overviewMetrics.totalDischarge,
      unit: "MWh",
      accent: "#ffb347",
      glow: "rgba(255,179,71,0.35)",
    },
  ] as const

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-[22px] border border-[#22d3ee]/26 bg-[radial-gradient(circle_at_18%_16%,rgba(64,124,255,0.22),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(0,212,170,0.14),transparent_24%),linear-gradient(180deg,rgba(11,31,67,0.66),rgba(6,20,47,0.74))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_16px_32px_rgba(0,0,0,0.16)]"
      style={{ padding }}
    >
      <div
        className="grid h-full w-full grid-cols-2"
        style={{ gap, gridTemplateRows: "minmax(0, 1fr) minmax(0, 1fr)" }}
      >
        <HeroStatCard card={heroCards[1]} zh={zh} base={base} />
        <HeroStatCard card={heroCards[2]} zh={zh} base={base} />
        <HeroStatCard card={heroCards[0]} zh={zh} base={base} />
        <div className="grid h-full min-h-0" style={{ gap, gridTemplateRows: "minmax(0, 1fr) minmax(0, 1fr)" }}>
          <TotalCard
            title={totalCards[0].labelZh} labelEn={totalCards[0].labelEn}
            value={totalCards[0].value} unit={totalCards[0].unit}
            accent={totalCards[0].accent} glow={totalCards[0].glow} zh={zh} base={base}
          />
          <TotalCard
            title={totalCards[1].labelZh} labelEn={totalCards[1].labelEn}
            value={totalCards[1].value} unit={totalCards[1].unit}
            accent={totalCards[1].accent} glow={totalCards[1].glow} zh={zh} base={base}
          />
        </div>
      </div>
    </div>
  )
}
