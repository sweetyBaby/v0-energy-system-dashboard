"use client"

import { useState, useEffect } from "react"
import { Calendar, Search } from "lucide-react"
import {
  ScatterChart, Scatter, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ZAxis
} from "recharts"

// Generate mock cell voltage data for 50 cells
const generateCellVoltages = () => {
  return Array.from({ length: 50 }, (_, i) => ({
    cell: i + 1,
    voltage: 3.2 + Math.random() * 0.15,
    name: `#${i + 1}`,
  }))
}

// Generate mock temperature data for 50 cells x 3 temps each
const generateCellTemperatures = () => {
  const data: { cell: number; temp: number; sensor: number; name: string }[] = []
  for (let cell = 1; cell <= 50; cell++) {
    for (let sensor = 1; sensor <= 3; sensor++) {
      data.push({
        cell,
        temp: 25 + Math.random() * 10,
        sensor,
        name: `#${cell}-T${sensor}`,
      })
    }
  }
  return data
}

// Generate time series data for voltage, current, SOC
const generateTimeSeriesData = () => {
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    voltage: 750 + Math.random() * 50,
    current: -50 + Math.random() * 200,
    soc: 30 + (i / 24) * 50 + Math.random() * 5,
  }))
}

// Get yesterday's date in YYYY-MM-DD format
const getYesterdayDate = () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
}

// Static initial data for SSR
const getInitialVoltageData = () => Array.from({ length: 50 }, (_, i) => ({ cell: i + 1, voltage: 3.25, name: `#${i + 1}` }))
const getInitialTempData = () => {
  const data: { cell: number; temp: number; sensor: number; name: string }[] = []
  for (let cell = 1; cell <= 50; cell++) {
    for (let sensor = 1; sensor <= 3; sensor++) {
      data.push({ cell, temp: 28, sensor, name: `#${cell}-T${sensor}` })
    }
  }
  return data
}
const getInitialTimeSeriesData = () => Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, voltage: 780, current: 50, soc: 50 }))

export function BCUStatusQuery() {
  const [queryDate, setQueryDate] = useState("")
  const [hasQueried, setHasQueried] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "voltage" | "temperature">("temperature")
  const [mounted, setMounted] = useState(false)

  const [voltageData, setVoltageData] = useState(getInitialVoltageData)
  const [temperatureData, setTemperatureData] = useState(getInitialTempData)
  const [timeSeriesData, setTimeSeriesData] = useState(getInitialTimeSeriesData)

  // Initialize on client side - set default to yesterday
  useEffect(() => {
    setQueryDate(getYesterdayDate())
    setVoltageData(generateCellVoltages())
    setTemperatureData(generateCellTemperatures())
    setTimeSeriesData(generateTimeSeriesData())
    setMounted(true)
  }, [])

  const handleQuery = () => {
    setHasQueried(true)
  }

  // Calculate stats
  const avgVoltage = voltageData.reduce((sum, d) => sum + d.voltage, 0) / voltageData.length
  const maxVoltage = Math.max(...voltageData.map(d => d.voltage))
  const minVoltage = Math.min(...voltageData.map(d => d.voltage))

  const avgTemp = temperatureData.reduce((sum, d) => sum + d.temp, 0) / temperatureData.length
  const maxTemp = Math.max(...temperatureData.map(d => d.temp))
  const minTemp = Math.min(...temperatureData.map(d => d.temp))

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4 flex flex-col w-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
        <h3 className="text-base font-semibold text-[#00d4aa]">BCU运行状态查询</h3>
      </div>

      {/* Query Controls - Single date only, default to yesterday */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-[#7b8ab8]">查询日期:</span>
        <div className="relative">
          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7b8ab8]" />
          <input
            type="date"
            value={queryDate}
            onChange={(e) => setQueryDate(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-sm focus:outline-none focus:border-[#00d4aa]"
          />
        </div>
        <button
          onClick={handleQuery}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#3b82f6] text-white rounded-md text-sm hover:bg-[#3b82f6]/80 transition-colors"
        >
          <Search className="w-4 h-4" />
          查询
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-[#1a2654]/50 rounded-lg p-1 mb-4">
        <button
          onClick={() => setActiveTab("temperature")}
          className={`px-3 py-1.5 text-sm rounded-md transition-all ${activeTab === "temperature"
              ? "bg-[#00d4aa] text-[#0a0e27] font-medium"
              : "text-[#7b8ab8] hover:text-[#e8f4fc]"
            }`}
        >
          电芯温度
        </button>
        <button
          onClick={() => setActiveTab("voltage")}
          className={`px-3 py-1.5 text-sm rounded-md transition-all ${activeTab === "voltage"
              ? "bg-[#00d4aa] text-[#0a0e27] font-medium"
              : "text-[#7b8ab8] hover:text-[#e8f4fc]"
            }`}
        >
          电芯电压
        </button>
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-1.5 text-sm rounded-md transition-all ${activeTab === "overview"
              ? "bg-[#00d4aa] text-[#0a0e27] font-medium"
              : "text-[#7b8ab8] hover:text-[#e8f4fc]"
            }`}
        >
          组电压/电流/SOC
        </button>


      </div>

      {hasQueried && (
        <div className="space-y-4">
          {activeTab === "overview" && (
            <>
              {/* Overview Trend Chart - Voltage, Current, SOC */}
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#7b8ab8", fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="voltage"
                      orientation="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#3b82f6", fontSize: 10 }}
                      domain={[700, 850]}
                      label={{ value: 'V', angle: -90, position: 'insideLeft', fill: "#3b82f6", fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="current"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#f97316", fontSize: 10 }}
                      domain={[-100, 200]}
                      label={{ value: 'A', angle: 90, position: 'insideRight', fill: "#f97316", fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="soc"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#00d4aa", fontSize: 10 }}
                      domain={[0, 100]}
                      hide
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0d1233",
                        border: "1px solid #1a2654",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#7b8ab8" }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: "10px" }}
                      formatter={(value) => <span style={{ color: "#7b8ab8", fontSize: "12px" }}>{value}</span>}
                    />
                    <Line
                      yAxisId="voltage"
                      type="monotone"
                      dataKey="voltage"
                      name="组电压(V)"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="current"
                      type="monotone"
                      dataKey="current"
                      name="电流(A)"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="soc"
                      type="monotone"
                      dataKey="soc"
                      name="SOC(%)"
                      stroke="#00d4aa"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {activeTab === "voltage" && (
            <>
              {/* Voltage Stats */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="bg-[#1a2654]/30 rounded-lg p-2 text-center">
                  <div className="text-xs text-[#7b8ab8]">平均电压</div>
                  <div className="text-sm font-bold text-[#22d3ee] font-mono">{avgVoltage.toFixed(3)}V</div>
                </div>
                <div className="bg-[#1a2654]/30 rounded-lg p-2 text-center">
                  <div className="text-xs text-[#7b8ab8]">最大电压</div>
                  <div className="text-sm font-bold text-[#f97316] font-mono">{maxVoltage.toFixed(3)}V</div>
                </div>
                <div className="bg-[#1a2654]/30 rounded-lg p-2 text-center">
                  <div className="text-xs text-[#7b8ab8]">最小电压</div>
                  <div className="text-sm font-bold text-[#3b82f6] font-mono">{minVoltage.toFixed(3)}V</div>
                </div>
                <div className="bg-[#1a2654]/30 rounded-lg p-2 text-center">
                  <div className="text-xs text-[#7b8ab8]">压差</div>
                  <div className="text-sm font-bold text-[#00d4aa] font-mono">{((maxVoltage - minVoltage) * 1000).toFixed(1)}mV</div>
                </div>
              </div>

              {/* Cell Voltage Scatter Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" />
                    <XAxis
                      type="number"
                      dataKey="cell"
                      name="电芯"
                      domain={[0, 51]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#7b8ab8", fontSize: 10 }}
                      label={{ value: '电芯编号', position: 'bottom', fill: "#7b8ab8", fontSize: 10 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="voltage"
                      name="电压"
                      domain={[3.15, 3.4]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#7b8ab8", fontSize: 10 }}
                      label={{ value: 'V', angle: -90, position: 'insideLeft', fill: "#7b8ab8", fontSize: 10 }}
                    />
                    <ZAxis range={[50, 50]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0d1233",
                        border: "1px solid #1a2654",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === "电压") return [`${value.toFixed(3)}V`, name]
                        return [value, name]
                      }}
                    />
                    <Scatter
                      name="电芯电压"
                      data={voltageData}
                      fill="#22d3ee"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {activeTab === "temperature" && (
            <>
              {/* Temperature Stats */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="bg-[#1a2654]/30 rounded-lg p-2 text-center">
                  <div className="text-xs text-[#7b8ab8]">平均温度</div>
                  <div className="text-sm font-bold text-[#22d3ee] font-mono">{avgTemp.toFixed(1)}°C</div>
                </div>
                <div className="bg-[#1a2654]/30 rounded-lg p-2 text-center">
                  <div className="text-xs text-[#7b8ab8]">最高温度</div>
                  <div className="text-sm font-bold text-[#f97316] font-mono">{maxTemp.toFixed(1)}°C</div>
                </div>
                <div className="bg-[#1a2654]/30 rounded-lg p-2 text-center">
                  <div className="text-xs text-[#7b8ab8]">最低温度</div>
                  <div className="text-sm font-bold text-[#3b82f6] font-mono">{minTemp.toFixed(1)}°C</div>
                </div>
                <div className="bg-[#1a2654]/30 rounded-lg p-2 text-center">
                  <div className="text-xs text-[#7b8ab8]">温差</div>
                  <div className="text-sm font-bold text-[#00d4aa] font-mono">{(maxTemp - minTemp).toFixed(1)}°C</div>
                </div>
              </div>

              {/* Cell Temperature Scatter Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" />
                    <XAxis
                      type="number"
                      dataKey="cell"
                      name="电芯"
                      domain={[0, 51]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#7b8ab8", fontSize: 10 }}
                      label={{ value: '电芯编号', position: 'bottom', fill: "#7b8ab8", fontSize: 10 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="temp"
                      name="温度"
                      domain={[20, 40]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#7b8ab8", fontSize: 10 }}
                      label={{ value: '°C', angle: -90, position: 'insideLeft', fill: "#7b8ab8", fontSize: 10 }}
                    />
                    <ZAxis range={[30, 30]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0d1233",
                        border: "1px solid #1a2654",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === "温度") return [`${value.toFixed(1)}°C`, name]
                        return [value, name]
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: "5px" }}
                      formatter={(value) => <span style={{ color: "#7b8ab8", fontSize: "11px" }}>{value}</span>}
                    />
                    <Scatter
                      name="T1传感器"
                      data={temperatureData.filter(d => d.sensor === 1)}
                      fill="#3b82f6"
                    />
                    <Scatter
                      name="T2传感器"
                      data={temperatureData.filter(d => d.sensor === 2)}
                      fill="#f97316"
                    />
                    <Scatter
                      name="T3传感器"
                      data={temperatureData.filter(d => d.sensor === 3)}
                      fill="#00d4aa"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  )
}
