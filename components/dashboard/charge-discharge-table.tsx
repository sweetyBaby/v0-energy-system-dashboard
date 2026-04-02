"use client"

import type { ReactNode } from "react"
import { BatteryCharging, BatteryMedium, Gauge } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

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

const heroCards: HeroCard[] = [
  {
    key: "efficiency",
    labelZh: "昨日效率",
    labelEn: "Yesterday Efficiency",
    value: "81.62",
    unit: "%",
    accent: "#57a8ff",
    softAccent: "rgba(87,168,255,0.28)",
    ringClass: "from-[#4a90ff] to-[#2e6be2]",
    valueClass: "text-[#f5f9ff]",
    icon: <Gauge className="h-5 w-5 text-[#73b6ff]" strokeWidth={1.8} />,
    details: [
      { labelZh: "本月", labelEn: "Month", value: "67.27", unit: "%" },
      { labelZh: "本年", labelEn: "Year", value: "79.31", unit: "%" },
      { labelZh: "累计", labelEn: "Total", value: "79.31", unit: "%" },
    ],
  },
  {
    key: "charge",
    labelZh: "今日充电量",
    labelEn: "Today Charge",
    value: "365.6",
    unit: "kWh",
    accent: "#8ef14d",
    softAccent: "rgba(142,241,77,0.28)",
    ringClass: "from-[#a3ff58] to-[#69d936]",
    valueClass: "text-[#b9ff8b]",
    icon: <BatteryCharging className="h-5 w-5 text-[#a0ff66]" strokeWidth={1.8} />,
    details: [
      { labelZh: "昨日", labelEn: "Yesterday", value: "690.4", unit: "kWh" },
      { labelZh: "本月", labelEn: "Month", value: "690.4", unit: "kWh" },
      { labelZh: "累计", labelEn: "Total", value: "29.5", unit: "MWh" },
    ],
  },
  {
    key: "discharge",
    labelZh: "今日放电量",
    labelEn: "Today Discharge",
    value: "267.2",
    unit: "kWh",
    accent: "#58a7ff",
    softAccent: "rgba(88,167,255,0.28)",
    ringClass: "from-[#5ca9ff] to-[#3575eb]",
    valueClass: "text-[#f5f9ff]",
    icon: <BatteryMedium className="h-5 w-5 text-[#6fb5ff]" strokeWidth={1.8} />,
    details: [
      { labelZh: "昨日", labelEn: "Yesterday", value: "516", unit: "kWh" },
      { labelZh: "本月", labelEn: "Month", value: "516", unit: "kWh" },
      { labelZh: "累计", labelEn: "Total", value: "23.45", unit: "MWh" },
    ],
  },
]

const totalCards = [
  {
    key: "charge-total",
    labelZh: "累计充电量",
    labelEn: "Total Charge",
    value: "29.5",
    unit: "MWh",
    accent: "#8af7bc",
    glow: "rgba(92,247,191,0.35)",
  },
  {
    key: "discharge-total",
    labelZh: "累计放电量",
    labelEn: "Total Discharge",
    value: "23.45",
    unit: "MWh",
    accent: "#ffb347",
    glow: "rgba(255,179,71,0.35)",
  },
] as const

function splitNumber(value: string) {
  const dotIndex = value.lastIndexOf(".")
  if (dotIndex === -1) return { integer: value, decimal: "" }
  return {
    integer: value.slice(0, dotIndex),
    decimal: value.slice(dotIndex),
  }
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
      className={`relative rounded-[16px] border border-dashed border-white/55 bg-[linear-gradient(180deg,rgba(13,36,78,0.92),rgba(10,26,58,0.96))] ${className ?? ""}`}
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

function HeroStatCard({ card, zh, className }: { card: HeroCard; zh: boolean; className?: string }) {
  const { integer, decimal } = splitNumber(card.value)

  return (
    <TileFrame accent={card.accent} softAccent={card.softAccent} className={`h-full ${className ?? ""}`.trim()}>
      <div className="relative flex h-full flex-col px-3 py-2.5">
        {/* Top row: icon + title + main value */}
        <div className="flex items-center gap-2">
          {/* Icon circle */}
          <div
            className="relative flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(5,18,43,0.96),rgba(9,27,60,0.88))] ring-1 ring-white/10"
            style={{ boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), 0 0 18px ${card.softAccent}` }}
          >
            <div className={`absolute inset-[3px] rounded-full bg-gradient-to-b ${card.ringClass} opacity-95`} />
            <div className="absolute inset-[7px] rounded-full bg-[linear-gradient(180deg,rgba(5,20,47,0.96),rgba(7,24,52,0.94))]" />
            <div className="relative z-10 flex h-[26px] w-[26px] items-center justify-center rounded-[8px] border border-white/15 bg-[linear-gradient(180deg,rgba(15,58,118,0.7),rgba(8,27,59,0.92))]">
              {card.icon}
            </div>
          </div>

          {/* Title + value */}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[0.7rem] font-semibold leading-tight tracking-[0.02em] text-[#f5f8ff] [text-shadow:0_2px_8px_rgba(0,0,0,0.55)]">
              {zh ? card.labelZh : card.labelEn}
            </span>
            <div className="flex items-baseline gap-0.5">
              <span
                className={`font-bold tabular-nums leading-none ${card.valueClass}`}
                style={{
                  fontSize: "clamp(1.2rem, 1.7vw, 1.75rem)",
                  textShadow: `0 0 16px ${card.softAccent}, 0 2px 8px rgba(0,0,0,0.45)`,
                }}
              >
                {integer}
              </span>
              {decimal && (
                <span
                  className={`font-bold tabular-nums leading-none ${card.valueClass}`}
                  style={{
                    fontSize: "clamp(0.75rem, 1vw, 0.95rem)",
                    textShadow: `0 0 12px ${card.softAccent}, 0 2px 8px rgba(0,0,0,0.45)`,
                  }}
                >
                  {decimal}
                </span>
              )}
              <span className="text-[0.65rem] font-semibold text-[#f4f8ff] [text-shadow:0_2px_8px_rgba(0,0,0,0.45)]">
                {card.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-2 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(180,220,255,0.7),transparent)]" />

        {/* Detail rows: stretch to fill remaining height */}
        <div className="flex flex-1 flex-col justify-between">
          {card.details.map((detail, idx) => (
            <div key={detail.labelEn} className="flex items-center justify-between gap-1">
              <span className="shrink-0 text-[0.66rem] font-medium leading-none text-[#b8d4f8]/85">
                {zh ? detail.labelZh : detail.labelEn}
              </span>
              {idx < card.details.length - 1 && (
                <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(196,230,255,0.25),transparent)]" />
              )}
              {idx === card.details.length - 1 && <div className="flex-1" />}
              <div className="flex shrink-0 items-baseline gap-[2px]">
                <span
                  className="font-semibold tabular-nums leading-none text-[#f2f8ff]"
                  style={{
                    fontSize: "0.78rem",
                    textShadow: `0 0 8px ${card.accent}33, 0 2px 6px rgba(0,0,0,0.4)`,
                  }}
                >
                  {detail.value}
                </span>
                <span className="text-[0.6rem] leading-none text-[#d8eeff]/85">{detail.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TileFrame>
  )
}

function TotalCard({
  title,
  value,
  unit,
  accent,
  glow,
  zh,
  labelEn,
}: {
  title: string
  labelEn: string
  value: string
  unit: string
  accent: string
  glow: string
  zh: boolean
}) {
  return (
    <TileFrame accent={accent} softAccent={glow} className="min-h-0">
      <div className="relative flex h-full min-h-0 flex-col justify-center px-3.5 py-2">
        <div className="text-[0.75rem] font-semibold tracking-[0.02em] text-[#f6f9ff] [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
          {zh ? title : labelEn}
        </div>
        <div
          className="my-1.5 h-px w-full"
          style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }}
        />
        <div className="flex items-baseline gap-1">
          <span
            className="font-bold tabular-nums leading-none"
            style={{
              fontSize: "clamp(1.2rem, 1.7vw, 1.75rem)",
              color: accent,
              textShadow: `0 0 20px ${glow}, 0 2px 8px rgba(0,0,0,0.45)`,
            }}
          >
            {value}
          </span>
          <span className="text-[0.7rem] font-semibold text-[#f4f8ff]">{unit}</span>
        </div>
      </div>
    </TileFrame>
  )
}

export function ChargeDischargeTable() {
  const { language } = useLanguage()
  const zh = language === "zh"

  return (
    <div className="relative w-full overflow-hidden rounded-[22px] border border-[#22d3ee]/26 bg-[radial-gradient(circle_at_18%_16%,rgba(64,124,255,0.22),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(0,212,170,0.14),transparent_24%),linear-gradient(180deg,rgba(11,31,67,0.66),rgba(6,20,47,0.74))] p-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_16px_32px_rgba(0,0,0,0.16)]">
      <div className="grid h-[290px] w-full grid-cols-2 grid-rows-2 gap-1.5">
        {/* 左上: 昨日效率 */}
        <HeroStatCard card={heroCards[0]} zh={zh} />

        {/* 右上: 累计充电量 + 累计放电量 */}
        <div className="grid h-full grid-rows-2 gap-1.5">
          <TotalCard
            title={totalCards[0].labelZh}
            labelEn={totalCards[0].labelEn}
            value={totalCards[0].value}
            unit={totalCards[0].unit}
            accent={totalCards[0].accent}
            glow={totalCards[0].glow}
            zh={zh}
          />
          <TotalCard
            title={totalCards[1].labelZh}
            labelEn={totalCards[1].labelEn}
            value={totalCards[1].value}
            unit={totalCards[1].unit}
            accent={totalCards[1].accent}
            glow={totalCards[1].glow}
            zh={zh}
          />
        </div>

        {/* 左下: 今日放电量 */}
        <HeroStatCard card={heroCards[2]} zh={zh} />

        {/* 右下: 今日充电量 */}
        <HeroStatCard card={heroCards[1]} zh={zh} />
      </div>
    </div>
  )
}
