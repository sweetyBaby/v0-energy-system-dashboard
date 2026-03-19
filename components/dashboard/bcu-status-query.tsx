"use client"

import { useState } from "react"
import { Calendar, Clock, Search, Battery, Thermometer, Zap } from "lucide-react"

// Mock BCU data
const mockBCUData = {
  groupVoltage: 768.5,
  current: 125.8,
  soc: 68.5,
  cellVoltages: [
    3.256, 3.261, 3.258, 3.255, 3.262, 3.259, 3.257, 3.260,
    3.254, 3.263, 3.258, 3.256, 3.261, 3.259, 3.257, 3.255,
  ],
  cellTemps: [
    28.5, 29.2, 28.8, 29.0, 28.6, 29.1, 28.9, 28.7,
    29.3, 28.4, 29.0, 28.8, 28.6, 29.2, 28.9, 28.5,
  ],
}

export function BCUStatusQuery() {
  const [queryDate, setQueryDate] = useState("")
  const [queryTime, setQueryTime] = useState("")
  const [hasQueried, setHasQueried] = useState(true)
  const [data] = useState(mockBCUData)

  const handleQuery = () => {
    setHasQueried(true)
  }

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
        <h3 className="text-base font-semibold text-[#00d4aa]">BCU运行状态查询</h3>
      </div>

      {/* Query Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7b8ab8]" />
          <input
            type="date"
            value={queryDate}
            onChange={(e) => setQueryDate(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-[#1a2654] border border-[#3b82f6]/30 rounded-md text-sm focus:outline-none focus:border-[#00d4aa]"
          />
        </div>
        <div className="relative">
          <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7b8ab8]" />
          <input
            type="time"
            value={queryTime}
            onChange={(e) => setQueryTime(e.target.value)}
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

      {hasQueried && (
        <div className="space-y-4">
          {/* Main Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-[#3b82f6]/20 to-[#3b82f6]/5 rounded-lg p-3 border border-[#3b82f6]/30">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-[#3b82f6]" />
                <span className="text-xs text-[#7b8ab8]">组电压</span>
              </div>
              <div className="text-xl font-bold text-[#3b82f6] font-mono">{data.groupVoltage}V</div>
            </div>
            <div className="bg-gradient-to-br from-[#f97316]/20 to-[#f97316]/5 rounded-lg p-3 border border-[#f97316]/30">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-[#f97316]" />
                <span className="text-xs text-[#7b8ab8]">电流</span>
              </div>
              <div className="text-xl font-bold text-[#f97316] font-mono">{data.current}A</div>
            </div>
            <div className="bg-gradient-to-br from-[#00d4aa]/20 to-[#00d4aa]/5 rounded-lg p-3 border border-[#00d4aa]/30">
              <div className="flex items-center gap-2 mb-1">
                <Battery className="w-4 h-4 text-[#00d4aa]" />
                <span className="text-xs text-[#7b8ab8]">SOC</span>
              </div>
              <div className="text-xl font-bold text-[#00d4aa] font-mono">{data.soc}%</div>
            </div>
          </div>

          {/* Cell Voltages */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[#22d3ee]" />
              <span className="text-sm text-[#7b8ab8]">电芯电压 (V)</span>
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {data.cellVoltages.map((voltage, index) => (
                <div
                  key={index}
                  className="bg-[#1a2654]/50 rounded px-1.5 py-1 text-center"
                >
                  <div className="text-[10px] text-[#7b8ab8]">#{index + 1}</div>
                  <div className="text-xs font-mono text-[#22d3ee]">{voltage.toFixed(3)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cell Temperatures */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="w-4 h-4 text-[#f97316]" />
              <span className="text-sm text-[#7b8ab8]">电芯温度 (°C)</span>
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {data.cellTemps.map((temp, index) => (
                <div
                  key={index}
                  className={`rounded px-1.5 py-1 text-center ${
                    temp > 29 
                      ? 'bg-[#f97316]/20 border border-[#f97316]/30' 
                      : 'bg-[#1a2654]/50'
                  }`}
                >
                  <div className="text-[10px] text-[#7b8ab8]">#{index + 1}</div>
                  <div className={`text-xs font-mono ${temp > 29 ? 'text-[#f97316]' : 'text-[#22d3ee]'}`}>
                    {temp.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
