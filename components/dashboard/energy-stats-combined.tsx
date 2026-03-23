"use client"

import { useState, useMemo } from "react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Calendar, Search } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

type QueryType = "week" | "month" | "custom"

interface DataPoint {
  day: string
  chargeAh: number
  dischargeAh: number
  chargeWh: number
  dischargeWh: number
}

// Generate data for a list of date labels
const generateDataForDays = (labels: string[]): DataPoint[] =>
  labels.map((day) => ({
    day,
    chargeAh: Math.round(800 + Math.random() * 400),
    dischargeAh: Math.round(750 + Math.random() * 380),
    chargeWh: Math.round(3200 + Math.random() * 800),
    dischargeWh: Math.round(3000 + Math.random() * 760),
  }))

// Get last 7 days date labels
const getWeekLabels = (): string[] => {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 6 + i)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
}

// Get 1st-to-today date labels for current month
const getMonthLabels = (): string[] => {
  const today = new Date()
  const labels: string[] = []
  for (let d = 1; d <= today.getDate(); d++) {
    labels.push(`${d}日`)
  }
  return labels
}

export function EnergyStatsCombined() {
  const { t } = useLanguage()
  const [viewType, setViewType] = useState<"curve" | "bar">("curve")
  const [queryType, setQueryType] = useState<QueryType>("week")
  const [unitType, setUnitType] = useState<"Ah" | "Wh">("Wh")

  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState(todayStr)

  // Generate data based on queryType
  const data = useMemo<DataPoint[]>(() => {
    if (queryType === "week") return generateDataForDays(getWeekLabels())
    if (queryType === "month") return generateDataForDays(getMonthLabels())
    return generateDataForDays([]) // custom: empty until search
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryType, selectedMonth])

  const totalCharge = data.reduce((sum, item) => sum + (unitType === "Wh" ? item.chargeWh : item.chargeAh), 0)
  const totalDischarge = data.reduce((sum, item) => sum + (unitType === "Wh" ? item.dischargeWh : item.dischargeAh), 0)

  const periodLabel = queryType === "week" ? "周" : queryType === "month" ? "月" : "期间"

  const handleSearch = () => {
    if (startDate && endDate) {
      const end = new Date(endDate + "T23:59:59")
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 0)

      if (end > todayEnd) {
        alert("结束日期不能超过当前日期")
        return
      }

      const start = new Date(startDate + "T00:00:00")
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays > 31) {
        alert("自定义日期范围最多为一个月")
        return
      }
    }
  }

  const handleMonthChange = (newMonth: string) => {
    const selectedDate = new Date(newMonth + "-01")
    const firstOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    if (selectedDate > firstOfCurrentMonth) {
      alert("不能选择未来的月份")
      return
    }
    setSelectedMonth(newMonth)
  }

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
          <h3 className="text-base font-semibold text-[#00d4aa]">充放电电量统计</h3>
        </div>
      </div>

      {/* Query Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* View Type Toggle */}
        <div className="flex gap-1 bg-[#1a2654]/50 rounded-lg p-1">
          <button
            onClick={() => setViewType("curve")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${viewType === "curve"
                ? "bg-[#00d4aa] text-[#0a0e27] font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
              }`}
          >
            曲线图
          </button>
          <button
            onClick={() => setViewType("bar")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${viewType === "bar"
                ? "bg-[#00d4aa] text-[#0a0e27] font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
              }`}
          >
            柱状图
          </button>
        </div>

        {/* Query Type Toggle */}
        <div className="flex gap-1 bg-[#1a2654]/50 rounded-lg p-1">
          <button
            onClick={() => setQueryType("week")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${queryType === "week"
                ? "bg-[#3b82f6] text-white font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
              }`}
          >
            {t("thisWeek")}
          </button>
          <button
            onClick={() => setQueryType("month")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${queryType === "month"
                ? "bg-[#3b82f6] text-white font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
              }`}
          >
            {t("thisMonth")}
          </button>
          <button
            onClick={() => setQueryType("custom")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${queryType === "custom"
                ? "bg-[#3b82f6] text-white font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
              }`}
          >
            {t("custom")}
          </button>
        </div>

        {/* Unit Type Toggle */}
        <div className="flex gap-1 bg-[#1a2654]/50 rounded-lg p-1">
          <button
            onClick={() => setUnitType("Ah")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${unitType === "Ah"
                ? "bg-[#f97316] text-white font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
              }`}
          >
            Ah
          </button>
          <button
            onClick={() => setUnitType("Wh")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${unitType === "Wh"
                ? "bg-[#f97316] text-white font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
              }`}
          >
            Wh
          </button>
        </div>

        {queryType === "month" && (
          <input
            type="month"
            value={selectedMonth}
            max={currentMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="px-3 py-1.5 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-sm focus:outline-none focus:border-[#00d4aa]"
          />
        )}

        {queryType === "custom" && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7b8ab8]" />
              <input
                type="date"
                value={startDate}
                max={todayStr}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-sm focus:outline-none focus:border-[#00d4aa]"
              />
            </div>
            <span className="text-[#7b8ab8]">{t("to")}</span>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7b8ab8]" />
              <input
                type="date"
                value={endDate}
                max={todayStr}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-sm focus:outline-none focus:border-[#00d4aa]"
              />
            </div>
            <button
              onClick={handleSearch}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#3b82f6] text-white rounded-md text-sm hover:bg-[#3b82f6]/80 transition-colors">
              <Search className="w-4 h-4" />
              {t("search")}
            </button>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#1a2654]/30 rounded-lg p-3 text-center">
          <div className="text-xs text-[#7b8ab8]">{periodLabel}充电量</div>
          <div className="text-lg font-bold text-[#3b82f6] font-mono">
            {unitType === "Wh"
              ? `${(totalCharge / 1000).toFixed(1)} MWh`
              : `${(totalCharge / 1000).toFixed(1)} kAh`
            }
          </div>
        </div>
        <div className="bg-[#1a2654]/30 rounded-lg p-3 text-center">
          <div className="text-xs text-[#7b8ab8]">{periodLabel}放电量</div>
          <div className="text-lg font-bold text-[#f97316] font-mono">
            {unitType === "Wh"
              ? `${(totalDischarge / 1000).toFixed(1)} MWh`
              : `${(totalDischarge / 1000).toFixed(1)} kAh`
            }
          </div>
        </div>
        <div className="bg-[#1a2654]/30 rounded-lg p-3 text-center">
          <div className="text-xs text-[#7b8ab8]">{periodLabel}效率</div>
          <div className="text-lg font-bold text-[#00d4aa] font-mono">
            {totalCharge > 0 ? ((totalDischarge / totalCharge) * 100).toFixed(1) : "0.0"}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {viewType === "curve" ? (
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7b8ab8", fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7b8ab8", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0d1233",
                  border: "1px solid #1a2654",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#7b8ab8" }}
                formatter={(value: number) => [`${value.toLocaleString()} ${unitType}`]}
              />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => <span style={{ color: "#7b8ab8", fontSize: "12px" }}>{value}</span>}
              />
              <Line
                type="monotone"
                dataKey={unitType === "Ah" ? "chargeAh" : "chargeWh"}
                name={`充电量(${unitType})`}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 2, fill: "#3b82f6" }}
              />
              <Line
                type="monotone"
                dataKey={unitType === "Ah" ? "dischargeAh" : "dischargeWh"}
                name={`放电量(${unitType})`}
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 2, fill: "#f97316" }}
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" vertical={false} />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7b8ab8", fontSize: 9 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7b8ab8", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0d1233",
                  border: "1px solid #1a2654",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#7b8ab8" }}
                formatter={(value: number) => [`${value.toLocaleString()} ${unitType}`]}
              />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => <span style={{ color: "#7b8ab8", fontSize: "12px" }}>{value}</span>}
              />
              <Bar
                dataKey={unitType === "Ah" ? "chargeAh" : "chargeWh"}
                name={`充电量(${unitType})`}
                fill="#3b82f6"
                radius={[2, 2, 0, 0]}
                barSize={8}
              />
              <Bar
                dataKey={unitType === "Ah" ? "dischargeAh" : "dischargeWh"}
                name={`放电量(${unitType})`}
                fill="#f97316"
                radius={[2, 2, 0, 0]}
                barSize={8}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
