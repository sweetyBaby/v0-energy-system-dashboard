"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
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
import { Calendar, Search } from "lucide-react"

type TimeRange = "week" | "month" | "year" | "custom"

type DataPoint = {
  label: string
  charge: number
  discharge: number
}

// Generate hourly data for a single day
const generateHourlyData = (): DataPoint[] => {
  const data: DataPoint[] = []
  for (let i = 0; i < 24; i++) {
    data.push({
      label: `${i.toString().padStart(2, "0")}:00`,
      charge: Math.round(100 + Math.random() * 80),
      discharge: Math.round(90 + Math.random() * 75),
    })
  }
  return data
}

// Generate daily data
const generateDailyData = (days: number): DataPoint[] => {
  const data: DataPoint[] = []
  for (let i = 1; i <= days; i++) {
    data.push({
      label: `${i}日`,
      charge: Math.round(1500 + Math.random() * 1000),
      discharge: Math.round(1400 + Math.random() * 950),
    })
  }
  return data
}

// Generate weekly data with specific dates
const generateWeeklyData = (): DataPoint[] => {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  
  const data: DataPoint[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    data.push({
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      charge: Math.round(1500 + Math.random() * 1000),
      discharge: Math.round(1400 + Math.random() * 950),
    })
  }
  return data
}

// Generate monthly data for a year
const generateMonthlyData = (): DataPoint[] => {
  const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
  return months.map((month) => ({
    label: month,
    charge: Math.round(40000 + Math.random() * 25000),
    discharge: Math.round(38000 + Math.random() * 24000),
  }))
}

// Generate custom range data
const generateCustomRangeData = (start: Date, end: Date): DataPoint[] => {
  const daysDiff = getDaysDiff(start, end)
  
  if (daysDiff <= 1) {
    return generateHourlyData()
  } else {
    const data: DataPoint[] = []
    for (let i = 0; i <= daysDiff; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      data.push({
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        charge: Math.round(1500 + Math.random() * 1000),
        discharge: Math.round(1400 + Math.random() * 950),
      })
    }
    return data
  }
}

// Get the number of days in a month
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate()
}

// Calculate days between two dates
const getDaysDiff = (start: Date, end: Date) => {
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Format datetime for input
const formatDateTimeLocal = (date: Date) => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

export function EnergyCurveQuery() {
  const [timeRange, setTimeRange] = useState<TimeRange>("week")
  const [unitType, setUnitType] = useState<"kWh" | "MWh">("kWh")
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<DataPoint[]>([])
  const [dataLabel, setDataLabel] = useState("本周充放电统计（按日）")
  
  // Custom date range state
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [appliedStart, setAppliedStart] = useState<Date | null>(null)
  const [appliedEnd, setAppliedEnd] = useState<Date | null>(null)
  const [customError, setCustomError] = useState<string | null>(null)

  // Initialize on client side only - default to yesterday
  useEffect(() => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const defaultStart = new Date(yesterday)
    defaultStart.setHours(0, 0, 0, 0)
    
    const defaultEnd = new Date(yesterday)
    defaultEnd.setHours(23, 59, 59, 0)
    
    setCustomStart(formatDateTimeLocal(defaultStart))
    setCustomEnd(formatDateTimeLocal(defaultEnd))
    
    // Generate initial data for "week"
    setData(generateWeeklyData())
    setMounted(true)
  }, [])

  // Regenerate data when time range changes (only on client)
  useEffect(() => {
    if (!mounted) return
    
    if (timeRange === "week") {
      setData(generateWeeklyData())
      setDataLabel("本周充放电统计（按日）")
    } else if (timeRange === "month") {
      const now = new Date()
      const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth())
      setData(generateDailyData(daysInMonth))
      setDataLabel("本月充放电统计（按日）")
    } else if (timeRange === "year") {
      setData(generateMonthlyData())
      setDataLabel("本年充放电统计（按月）")
    } else if (timeRange === "custom") {
      if (appliedStart && appliedEnd) {
        const daysDiff = getDaysDiff(appliedStart, appliedEnd)
        setData(generateCustomRangeData(appliedStart, appliedEnd))
        setDataLabel(daysDiff <= 1 ? "自定义范围统计（按小时）" : "自定义范围统计（按日）")
      } else {
        setData([])
        setDataLabel("请选择日期范围并点击查询")
      }
    }
  }, [timeRange, appliedStart, appliedEnd, mounted])

  // Validate custom date range
  const validateCustomRange = useCallback(() => {
    if (!customStart || !customEnd) {
      setCustomError("请选择完整的日期范围")
      return false
    }
    
    const start = new Date(customStart)
    const end = new Date(customEnd)
    
    if (start >= end) {
      setCustomError("结束时间必须大于开始时间")
      return false
    }
    
    const daysDiff = getDaysDiff(start, end)
    if (daysDiff > 31) {
      setCustomError("自定义日期范围最多为一个月")
      return false
    }
    
    setCustomError(null)
    return true
  }, [customStart, customEnd])

  // Handle search button click
  const handleSearch = useCallback(() => {
    if (validateCustomRange()) {
      setAppliedStart(new Date(customStart))
      setAppliedEnd(new Date(customEnd))
    }
  }, [customStart, customEnd, validateCustomRange])

  // Calculate totals
  const totals = useMemo(() => {
    const totalCharge = data.reduce((sum, item) => sum + item.charge, 0)
    const totalDischarge = data.reduce((sum, item) => sum + item.discharge, 0)
    const efficiency = totalCharge > 0 ? (totalDischarge / totalCharge) * 100 : 0
    
    return {
      charge: unitType === "MWh" ? totalCharge / 1000 : totalCharge,
      discharge: unitType === "MWh" ? totalDischarge / 1000 : totalDischarge,
      efficiency,
    }
  }, [data, unitType])

  // Format value for display
  const formatValue = (value: number) => {
    if (unitType === "MWh") {
      return `${value.toFixed(2)} MWh`
    }
    return `${value.toLocaleString()} kWh`
  }

  // Show loading state during SSR
  if (!mounted) {
    return (
      <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
          <h3 className="text-base font-semibold text-[#00d4aa]">充放电电量统计</h3>
        </div>
        <div className="h-72 flex items-center justify-center">
          <span className="text-[#7b8ab8] text-sm">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
          <h3 className="text-base font-semibold text-[#00d4aa]">充放电电量统计</h3>
          {dataLabel && (
            <span className="text-xs text-[#7b8ab8] ml-2">({dataLabel})</span>
          )}
        </div>
      </div>

      {/* Query Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Time Range Toggle */}
        <div className="flex gap-1 bg-[#1a2654]/50 rounded-lg p-1">
          <button
            onClick={() => setTimeRange("week")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              timeRange === "week"
                ? "bg-[#00d4aa] text-[#0a0e27] font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
            }`}
          >
            本周
          </button>
          <button
            onClick={() => setTimeRange("month")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              timeRange === "month"
                ? "bg-[#00d4aa] text-[#0a0e27] font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
            }`}
          >
            本月
          </button>
          <button
            onClick={() => setTimeRange("year")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              timeRange === "year"
                ? "bg-[#00d4aa] text-[#0a0e27] font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
            }`}
          >
            本年
          </button>
          <button
            onClick={() => setTimeRange("custom")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              timeRange === "custom"
                ? "bg-[#00d4aa] text-[#0a0e27] font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
            }`}
          >
            自定义
          </button>
        </div>

        {/* Unit Type Toggle */}
        <div className="flex gap-1 bg-[#1a2654]/50 rounded-lg p-1">
          <button
            onClick={() => setUnitType("kWh")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              unitType === "kWh"
                ? "bg-[#3b82f6] text-white font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
            }`}
          >
            kWh
          </button>
          <button
            onClick={() => setUnitType("MWh")}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              unitType === "MWh"
                ? "bg-[#3b82f6] text-white font-medium"
                : "text-[#7b8ab8] hover:text-[#e8f4fc]"
            }`}
          >
            MWh
          </button>
        </div>
      </div>

      {/* Custom Date Range Inputs */}
      {timeRange === "custom" && (
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7b8ab8]" />
              <input
                type="datetime-local"
                step="1"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-sm focus:outline-none focus:border-[#00d4aa] min-w-[200px]"
              />
            </div>
            <span className="text-[#7b8ab8]">至</span>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7b8ab8]" />
              <input
                type="datetime-local"
                step="1"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-sm focus:outline-none focus:border-[#00d4aa] min-w-[200px]"
              />
            </div>
            <button
              onClick={handleSearch}
              className="flex items-center gap-1 px-4 py-1.5 bg-[#3b82f6] text-white rounded-md text-sm hover:bg-[#3b82f6]/80 transition-colors"
            >
              <Search className="w-4 h-4" />
              查询
            </button>
          </div>
          {customError && (
            <p className="text-red-400 text-xs mt-2">{customError}</p>
          )}
          <p className="text-[#7b8ab8] text-xs mt-2">
            提示：自定义日期范围最多一个月；日期范围超过一日按日统计，否则按小时统计
          </p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#1a2654]/30 rounded-lg p-3 text-center">
          <div className="text-xs text-[#7b8ab8]">总充电量</div>
          <div className="text-lg font-bold text-[#3b82f6] font-mono">
            {formatValue(totals.charge)}
          </div>
        </div>
        <div className="bg-[#1a2654]/30 rounded-lg p-3 text-center">
          <div className="text-xs text-[#7b8ab8]">总放电量</div>
          <div className="text-lg font-bold text-[#f97316] font-mono">
            {formatValue(totals.discharge)}
          </div>
        </div>
        <div className="bg-[#1a2654]/30 rounded-lg p-3 text-center">
          <div className="text-xs text-[#7b8ab8]">转换效率</div>
          <div className="text-lg font-bold text-[#00d4aa] font-mono">
            {totals.efficiency.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Combined Chart */}
      <div className="h-72">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" vertical={false} />
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
                tickFormatter={(value) => 
                  unitType === "MWh" 
                    ? `${(value / 1000).toFixed(1)}` 
                    : value >= 1000 
                      ? `${(value / 1000).toFixed(0)}k` 
                      : value.toString()
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0d1233",
                  border: "1px solid #1a2654",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#7b8ab8" }}
                formatter={(value: number, name: string) => {
                  const displayValue = unitType === "MWh" 
                    ? `${(value / 1000).toFixed(3)} MWh` 
                    : `${value.toLocaleString()} kWh`
                  return [displayValue, name]
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => (
                  <span style={{ color: "#7b8ab8", fontSize: "12px" }}>{value}</span>
                )}
              />
              {/* Bar Chart */}
              <Bar
                dataKey="charge"
                name="充电量(柱状)"
                fill="#3b82f6"
                fillOpacity={0.7}
                radius={[4, 4, 0, 0]}
                barSize={data.length > 20 ? 8 : 16}
              />
              <Bar
                dataKey="discharge"
                name="放电量(柱状)"
                fill="#f97316"
                fillOpacity={0.7}
                radius={[4, 4, 0, 0]}
                barSize={data.length > 20 ? 8 : 16}
              />
              {/* Line Chart */}
              <Line
                type="monotone"
                dataKey="charge"
                name="充电量(曲线)"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={{ r: 2, fill: "#60a5fa" }}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="discharge"
                name="放电量(曲线)"
                stroke="#fb923c"
                strokeWidth={2}
                dot={{ r: 2, fill: "#fb923c" }}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[#7b8ab8]">
            请选择日期范围并点击查询按钮
          </div>
        )}
      </div>
    </div>
  )
}
