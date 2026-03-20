"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts"
import { Calendar, Search, Table, LineChartIcon } from "lucide-react"

// Generate cell voltage data
const generateCellVoltageData = (days: number) => {
  const data = []
  for (let i = 1; i <= days; i++) {
    const base = 3.2 + Math.random() * 0.4
    data.push({
      day: `${i}日`,
      maxVoltage: (base + 0.15 + Math.random() * 0.1).toFixed(3),
      minVoltage: (base - 0.05 - Math.random() * 0.1).toFixed(3),
      avgVoltage: base.toFixed(3),
    })
  }
  return data
}

// Static initial data for SSR
const getInitialData = () => {
  return Array.from({ length: 15 }, (_, i) => ({
    day: `${i + 1}日`,
    maxVoltage: "3.450",
    minVoltage: "3.200",
    avgVoltage: "3.320",
  }))
}

export function CellVoltageAnalysis() {
  const [startDateTime, setStartDateTime] = useState("")
  const [endDateTime, setEndDateTime] = useState("")
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart")
  const [data, setData] = useState(getInitialData)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setData(generateCellVoltageData(15))
    setMounted(true)
  }, [])

  // Calculate statistics - use safe defaults if data is empty
  const maxV = data.length > 0 ? Math.max(...data.map(d => parseFloat(d.maxVoltage))) : 3.45
  const minV = data.length > 0 ? Math.min(...data.map(d => parseFloat(d.minVoltage))) : 3.2
  const avgV = data.length > 0 ? (data.reduce((sum, d) => sum + parseFloat(d.avgVoltage), 0) / data.length).toFixed(3) : "3.32"

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
          <h3 className="text-base font-semibold text-[#00d4aa]">电芯最大/最小电压</h3>
        </div>
        <div className="flex gap-1 bg-[#1a2654]/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode("chart")}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === "chart" ? "bg-[#00d4aa] text-[#0a0e27]" : "text-[#7b8ab8]"
            }`}
          >
            <LineChartIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === "table" ? "bg-[#00d4aa] text-[#0a0e27]" : "text-[#7b8ab8]"
            }`}
          >
            <Table className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Range Query with datetime */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7b8ab8]" />
          <input
            type="datetime-local"
            step="1"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
            className="pl-8 pr-2 py-1.5 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-xs focus:outline-none focus:border-[#00d4aa]"
          />
        </div>
        <span className="text-[#7b8ab8] text-sm">至</span>
        <div className="relative">
          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7b8ab8]" />
          <input
            type="datetime-local"
            step="1"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
            className="pl-8 pr-2 py-1.5 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-xs focus:outline-none focus:border-[#00d4aa]"
          />
        </div>
        <button className="flex items-center gap-1 px-3 py-1.5 bg-[#3b82f6] text-white rounded-md text-sm hover:bg-[#3b82f6]/80 transition-colors">
          <Search className="w-4 h-4" />
          查询
        </button>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[#1a2654]/30 rounded-lg p-2 text-center">
          <div className="text-xs text-[#7b8ab8]">最大电压</div>
          <div className="text-sm font-bold text-[#ef4444] font-mono">{maxV.toFixed(3)}V</div>
        </div>
        <div className="bg-[#1a2654]/30 rounded-lg p-2 text-center">
          <div className="text-xs text-[#7b8ab8]">平均电压</div>
          <div className="text-sm font-bold text-[#00d4aa] font-mono">{avgV}V</div>
        </div>
        <div className="bg-[#1a2654]/30 rounded-lg p-2 text-center">
          <div className="text-xs text-[#7b8ab8]">最小电压</div>
          <div className="text-sm font-bold text-[#22d3ee] font-mono">{minV.toFixed(3)}V</div>
        </div>
      </div>

      {viewMode === "chart" ? (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" />
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7b8ab8", fontSize: 10 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7b8ab8", fontSize: 10 }}
                domain={['dataMin - 0.1', 'dataMax + 0.1']}
                unit="V"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0d1233",
                  border: "1px solid #1a2654",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#7b8ab8" }}
                formatter={(value: string) => [`${value}V`]}
              />
              <Legend 
                wrapperStyle={{ paddingTop: "5px" }}
                formatter={(value) => <span style={{ color: "#7b8ab8", fontSize: "11px" }}>{value}</span>}
              />
              <ReferenceLine y={3.65} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "上限", fill: "#ef4444", fontSize: 10 }} />
              <ReferenceLine y={2.5} stroke="#22d3ee" strokeDasharray="5 5" label={{ value: "下限", fill: "#22d3ee", fontSize: 10 }} />
              <Line type="monotone" dataKey="maxVoltage" name="最大电压" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="minVoltage" name="最小电压" stroke="#22d3ee" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-48 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0d1233]">
              <tr className="text-[#7b8ab8] border-b border-[#1a2654]">
                <th className="py-2 px-2 text-left">日期</th>
                <th className="py-2 px-2 text-right">最大电压(V)</th>
                <th className="py-2 px-2 text-right">平均电压(V)</th>
                <th className="py-2 px-2 text-right">最小电压(V)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index} className="border-b border-[#1a2654]/50 hover:bg-[#1a2654]/30">
                  <td className="py-2 px-2">{item.day}</td>
                  <td className="py-2 px-2 text-right text-[#ef4444] font-mono">{item.maxVoltage}</td>
                  <td className="py-2 px-2 text-right text-[#00d4aa] font-mono">{item.avgVoltage}</td>
                  <td className="py-2 px-2 text-right text-[#22d3ee] font-mono">{item.minVoltage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
