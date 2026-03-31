"use client"

import { type ReactNode, useEffect, useMemo, useState } from "react"
import { useLanguage } from "@/components/language-provider"

type CellMetrics = {
  id: number
  voltage: number
  temp1: number
  temp2: number
  temp3: number
}

type TempSensorKey = "temp1" | "temp2" | "temp3"
type HeatmapMode = "voltage" | "temperature"

const RACK_LAYOUT: (number | null)[][] = [
  [50, 49, 18, 17, 16, 15],
  [48, 47, 20, 19, 14, 13],
  [46, 45, 22, 21, 12, 11],
  [44, 43, 24, 23, 10, 9],
  [42, 41, 26, 25, 8, 7],
  [40, 39, 28, 27, 6, 5],
  [38, 37, 30, 29, 4, 3],
  [36, 35, 32, 31, 2, 1],
  [null, null, 34, 33, null, null],
]

const TEMP_CARD_META: Record<TempSensorKey, { zh: string; en: string; color: string }> = {
  temp1: { zh: "T1 温度热力图", en: "T1 Temp Heatmap", color: "#fbbf24" },
  temp2: { zh: "T2 温度热力图", en: "T2 Temp Heatmap", color: "#fb923c" },
  temp3: { zh: "T3 温度热力图", en: "T3 Temp Heatmap", color: "#f87171" },
}

const VOLTAGE_GRADIENT =
  "linear-gradient(to bottom,rgb(220,53,34),rgb(251,191,36),rgb(74,222,128),rgb(59,130,246))"
const TEMPERATURE_GRADIENT =
  "linear-gradient(to bottom,rgb(136,19,19),rgb(220,53,34),rgb(249,115,22),rgb(250,204,21),rgb(167,224,50),rgb(101,205,90))"

const buildCells = (): CellMetrics[] =>
  Array.from({ length: 50 }, (_, index) => {
    const id = index + 1
    const baseVoltage = 3.32 + Math.sin(id * 0.71) * 0.04 + (id % 7 === 0 ? 0.07 : 0) + (id % 13 === 0 ? -0.06 : 0)
    const baseTemp = 29.5 + Math.sin(id * 0.43) * 2.8 + (id % 11 === 0 ? 2.4 : 0) + (id % 17 === 0 ? -1.8 : 0)

    return {
      id,
      voltage: +baseVoltage.toFixed(3),
      temp1: +(baseTemp + (((id * 3) % 10) - 5) * 0.22).toFixed(1),
      temp2: +(baseTemp + 0.6 + (((id * 7) % 10) - 5) * 0.18).toFixed(1),
      temp3: +(baseTemp - 0.4 + (((id * 11) % 10) - 5) * 0.26).toFixed(1),
    }
  })

function tempColor(temperature: number): string {
  const stops = [
    { t: 22, r: 101, g: 205, b: 90 },
    { t: 26, r: 167, g: 224, b: 50 },
    { t: 28, r: 250, g: 204, b: 21 },
    { t: 30, r: 249, g: 115, b: 22 },
    { t: 32, r: 220, g: 53, b: 34 },
    { t: 34, r: 136, g: 19, b: 19 },
  ]
  const value = Math.max(22, Math.min(34, temperature))

  for (let index = 0; index < stops.length - 1; index += 1) {
    if (value <= stops[index + 1].t) {
      const ratio = (value - stops[index].t) / (stops[index + 1].t - stops[index].t)
      return `rgb(${Math.round(stops[index].r + ratio * (stops[index + 1].r - stops[index].r))},${Math.round(
        stops[index].g + ratio * (stops[index + 1].g - stops[index].g),
      )},${Math.round(stops[index].b + ratio * (stops[index + 1].b - stops[index].b))})`
    }
  }

  return `rgb(${stops[stops.length - 1].r},${stops[stops.length - 1].g},${stops[stops.length - 1].b})`
}

function voltColor(voltage: number, min: number, max: number, avg: number): string {
  const delta = voltage - avg
  const maxDelta = Math.max(max - avg, avg - min, 0.001)
  const ratio = Math.max(-1, Math.min(1, delta / maxDelta))

  if (ratio < 0) {
    const scale = -ratio
    return `rgb(${Math.round(74 - scale * 15)},${Math.round(222 - scale * 92)},${Math.round(128 + scale * 118)})`
  }
  if (ratio < 0.5) {
    const scale = ratio * 2
    return `rgb(${Math.round(74 + scale * 177)},${Math.round(222 - scale * 31)},${Math.round(128 - scale * 92)})`
  }

  const scale = (ratio - 0.5) * 2
  return `rgb(${Math.round(251 - scale * 31)},${Math.round(191 - scale * 138)},${Math.round(36 - scale * 2)})`
}

function foregroundColor(background: string) {
  const match = background.match(/\d+/g)
  if (!match) return "#000000"

  const [r, g, b] = match.map(Number)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.48 ? "rgba(0,0,0,0.78)" : "rgba(255,255,255,0.92)"
}

function buildStat(values: number[]) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length

  return { min, max, avg }
}

function HeatmapCard({
  title,
  accentColor,
  children,
}: {
  title: string
  accentColor: string
  children: ReactNode
}) {
  return (
    <section className="min-h-0 overflow-hidden rounded-lg border border-[#1a2654] bg-[#0d1433]/90">
      <div className="flex h-full min-h-0 items-stretch gap-1.5 p-1.5">
        <div className="relative flex w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/5 bg-[linear-gradient(180deg,rgba(11,20,48,0.96),rgba(8,17,39,0.72))]">
          <div
            className="pointer-events-none absolute inset-y-1 left-0 w-px"
            style={{ background: `linear-gradient(to bottom, transparent, ${accentColor}, transparent)` }}
          />
          <h3
            className="whitespace-nowrap text-[9.5px] font-semibold tracking-[0.12em]"
            style={{ color: accentColor, transform: "rotate(-90deg)" }}
          >
            {title}
          </h3>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </section>
  )
}

function HeatmapGrid({
  cellMap,
  getColor,
  getValue,
}: {
  cellMap: Record<number, CellMetrics>
  getColor: (cell: CellMetrics) => string
  getValue: (cell: CellMetrics) => string
}) {
  const idFontSize = 6.4
  const valueFontSize = 7.2

  return (
    <div
      className="grid h-full min-h-0 min-w-0 flex-1 grid-cols-6 gap-[3px]"
      style={{ gridTemplateRows: `repeat(${RACK_LAYOUT.length}, minmax(0, 1fr))` }}
    >
      {RACK_LAYOUT.flatMap((row, rowIndex) =>
        row.map((cellId, cellIndex) => {
          if (cellId == null) {
            return <div key={`empty-${rowIndex}-${cellIndex}`} className="h-full w-full" />
          }

          const cell = cellMap[cellId]
          const backgroundColor = getColor(cell)
          const color = foregroundColor(backgroundColor)

          return (
            <div
              key={cellId}
              className="flex h-full w-full min-h-0 min-w-0 flex-col items-center justify-center rounded-[10px]"
              style={{ backgroundColor }}
            >
              <div className="leading-none" style={{ color, opacity: 0.62, fontSize: idFontSize }}>
                #{cellId}
              </div>
              <div className="mt-0.5 font-semibold leading-none" style={{ color, fontSize: valueFontSize }}>
                {getValue(cell)}
              </div>
            </div>
          )
        }),
      )}
    </div>
  )
}

function HeatmapLegend({
  mode,
  maxLabel,
  minLabel,
  zh,
}: {
  mode: HeatmapMode
  maxLabel: string
  minLabel: string
  zh: boolean
}) {
  const gradient = mode === "voltage" ? VOLTAGE_GRADIENT : TEMPERATURE_GRADIENT
  const highLabel = zh ? "高" : "H"
  const lowLabel = zh ? "低" : "L"

  return (
    <div className="flex h-full shrink-0 items-center gap-1 py-0.5 pr-0">
      <div
        className="h-full w-2.5 rounded-full border border-white/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"
        style={{ background: gradient }}
      />
      <div className="flex h-full flex-col justify-between text-right tracking-[0.02em]">
        <div className="flex items-center justify-end gap-1 whitespace-nowrap text-[8.5px] leading-none">
          <span className="font-semibold text-[#8ca4cd]">{highLabel}</span>
          <span className="tabular-nums text-[#6f89b8]">{maxLabel}</span>
        </div>
        <div className="flex items-center justify-end gap-1 whitespace-nowrap text-[8.5px] leading-none">
          <span className="font-semibold text-[#8ca4cd]">{lowLabel}</span>
          <span className="tabular-nums text-[#6f89b8]">{minLabel}</span>
        </div>
      </div>
    </div>
  )
}

export function CellHeatmapOverviewPanel() {
  const { language } = useLanguage()
  const zh = language === "zh"

  const [tick, setTick] = useState(0)
  const baseCells = useMemo(() => buildCells(), [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((current) => current + 1)
    }, 2000)

    return () => window.clearInterval(timer)
  }, [])

  const cells = useMemo(
    () =>
      baseCells.map((cell) => {
        const voltageOffset = Math.sin(tick * 0.7 + cell.id * 0.31) * 0.003 + Math.sin(tick * 0.4 + cell.id * 0.17) * 0.001
        const tempOffset = Math.sin(tick * 0.5 + cell.id * 0.29) * 0.15

        return {
          ...cell,
          voltage: +(cell.voltage + voltageOffset).toFixed(3),
          temp1: +(cell.temp1 + tempOffset + Math.sin(tick * 0.9 + cell.id) * 0.08).toFixed(1),
          temp2: +(cell.temp2 + tempOffset + Math.sin(tick * 0.8 + cell.id * 1.1) * 0.08).toFixed(1),
          temp3: +(cell.temp3 + tempOffset + Math.sin(tick * 1.1 + cell.id * 0.9) * 0.08).toFixed(1),
        }
      }),
    [baseCells, tick],
  )

  const cellMap = useMemo(() => {
    const map: Record<number, CellMetrics> = {}
    cells.forEach((cell) => {
      map[cell.id] = cell
    })
    return map
  }, [cells])

  const voltageStats = useMemo(() => buildStat(cells.map((cell) => cell.voltage)), [cells])
  const temperatureStats = useMemo(
    () => ({
      temp1: buildStat(cells.map((cell) => cell.temp1)),
      temp2: buildStat(cells.map((cell) => cell.temp2)),
      temp3: buildStat(cells.map((cell) => cell.temp3)),
    }),
    [cells],
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[#1a2654] bg-[#0d1233] p-1.5">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-1 md:grid-cols-2 md:grid-rows-2">
        <HeatmapCard title={zh ? "电压热力图" : "Voltage Heatmap"} accentColor="#7dd3fc">
          <div className="flex h-full min-h-0 items-stretch gap-1.5 overflow-hidden">
            <HeatmapGrid
              cellMap={cellMap}
              getColor={(cell) => voltColor(cell.voltage, voltageStats.min, voltageStats.max, voltageStats.avg)}
              getValue={(cell) => cell.voltage.toFixed(3)}
            />
            <HeatmapLegend
              mode="voltage"
              maxLabel={`${voltageStats.max.toFixed(3)}V`}
              minLabel={`${voltageStats.min.toFixed(3)}V`}
              zh={zh}
            />
          </div>
        </HeatmapCard>

        {(["temp1", "temp2", "temp3"] as TempSensorKey[]).map((sensorKey) => {
          const sensorMeta = TEMP_CARD_META[sensorKey]
          const stats = temperatureStats[sensorKey]

          return (
            <HeatmapCard key={sensorKey} title={zh ? sensorMeta.zh : sensorMeta.en} accentColor={sensorMeta.color}>
              <div className="flex h-full min-h-0 items-stretch gap-1.5 overflow-hidden">
                <HeatmapGrid
                  cellMap={cellMap}
                  getColor={(cell) => tempColor(cell[sensorKey])}
                  getValue={(cell) => `${cell[sensorKey].toFixed(1)}°`}
                />
                <HeatmapLegend
                  mode="temperature"
                  maxLabel={`${stats.max.toFixed(1)}°C`}
                  minLabel={`${stats.min.toFixed(1)}°C`}
                  zh={zh}
                />
              </div>
            </HeatmapCard>
          )
        })}
      </div>
    </div>
  )
}
