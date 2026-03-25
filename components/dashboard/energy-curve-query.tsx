"use client"

import { useEffect, useState } from "react"
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { useLanguage } from "@/components/language-provider"

type TimeRange = "week" | "month" | "year"

type DataPoint = {
  label: string
  charge: number
  discharge: number
}

const monthNamesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const randomValue = (min: number, max: number) => Math.round(min + Math.random() * (max - min))

const generateWeekData = (): DataPoint[] => {
  const today = new Date()

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - 6 + index)

    return {
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      charge: randomValue(1500, 2500),
      discharge: randomValue(1400, 2350),
    }
  })
}

const generateMonthData = (language: "zh" | "en"): DataPoint[] => {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const data: DataPoint[] = []

  for (let date = new Date(firstDay); date <= today; date.setDate(date.getDate() + 1)) {
    data.push({
      label: language === "zh" ? `${date.getDate()}\u65e5` : `${date.getDate()}`,
      charge: randomValue(1500, 2500),
      discharge: randomValue(1400, 2350),
    })
  }

  return data
}

const generateYearData = (language: "zh" | "en"): DataPoint[] => {
  const today = new Date()
  const data: DataPoint[] = []

  for (let month = 0; month <= today.getMonth(); month += 1) {
    data.push({
      label: language === "zh" ? `${month + 1}\u6708` : monthNamesEn[month],
      charge: randomValue(40000, 65000),
      discharge: randomValue(38000, 62000),
    })
  }

  return data
}

const formatAxisValue = (value: number) => {
  if (value >= 1000) {
    const scaled = value / 1000
    return Number.isInteger(scaled) ? `${scaled}k` : `${scaled.toFixed(1)}k`
  }

  return value.toString()
}

export function EnergyCurveQuery() {
  const { t, language } = useLanguage()
  const [timeRange, setTimeRange] = useState<TimeRange>("week")
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<DataPoint[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) {
      return
    }

    if (timeRange === "week") {
      setData(generateWeekData())
      return
    }

    if (timeRange === "month") {
      setData(generateMonthData(language))
      return
    }

    setData(generateYearData(language))
  }, [language, mounted, timeRange])

  if (!mounted) {
    return (
      <div className="flex h-full w-full flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3 className="text-base font-semibold text-[#00d4aa]">{t("chargeDischargeStats")}</h3>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <span className="text-sm text-[#7b8ab8]">{t("loading")}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3 className="text-base font-semibold text-[#00d4aa]">{t("chargeDischargeStats")}</h3>
        </div>

        <div className="flex gap-1 rounded-lg bg-[#1a2654]/50 p-1">
          <button
            onClick={() => setTimeRange("week")}
            className={`rounded-md px-3 py-1.5 text-sm transition-all ${
              timeRange === "week"
                ? "bg-[#00d4aa] font-medium text-[#0a0e27]"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
            }`}
          >
            {t("thisWeek")}
          </button>
          <button
            onClick={() => setTimeRange("month")}
            className={`rounded-md px-3 py-1.5 text-sm transition-all ${
              timeRange === "month"
                ? "bg-[#00d4aa] font-medium text-[#0a0e27]"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
            }`}
          >
            {t("thisMonth")}
          </button>
          <button
            onClick={() => setTimeRange("year")}
            className={`rounded-md px-3 py-1.5 text-sm transition-all ${
              timeRange === "year"
                ? "bg-[#00d4aa] font-medium text-[#0a0e27]"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
            }`}
          >
            {t("thisYear")}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1a2654" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7b8ab8", fontSize: 10 }}
              interval={data.length > 15 ? Math.floor(data.length / 10) : 0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7b8ab8", fontSize: 10 }}
              tickFormatter={formatAxisValue}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0d1233",
                border: "1px solid #1a2654",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#7b8ab8" }}
              formatter={(value: number, name: string) => [`${value.toLocaleString()} kWh`, name]}
            />
            <Legend
              wrapperStyle={{ paddingTop: "10px" }}
              formatter={(value) => <span style={{ color: "#7b8ab8", fontSize: "12px" }}>{value}</span>}
            />
            <Bar
              dataKey="charge"
              name={t("chargeBar")}
              fill="#3b82f6"
              fillOpacity={0.7}
              radius={[4, 4, 0, 0]}
              barSize={data.length > 20 ? 8 : 16}
            />
            <Bar
              dataKey="discharge"
              name={t("dischargeBar")}
              fill="#f97316"
              fillOpacity={0.7}
              radius={[4, 4, 0, 0]}
              barSize={data.length > 20 ? 8 : 16}
            />
            <Line
              type="monotone"
              dataKey="charge"
              name={t("chargeLine")}
              stroke="#60a5fa"
              strokeWidth={2}
              dot={{ r: 2, fill: "#60a5fa" }}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="discharge"
              name={t("dischargeLine")}
              stroke="#fb923c"
              strokeWidth={2}
              dot={{ r: 2, fill: "#fb923c" }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
