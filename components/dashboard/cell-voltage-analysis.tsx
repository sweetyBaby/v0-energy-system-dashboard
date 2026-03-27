"use client"

import { useState, useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts"
import { Table, LineChart as LineChartIcon } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

function buildData(days: number) {
  const today = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (days - 1 - i))
    const base = 3.2 + Math.random() * 0.4
    return {
      day: `${d.getMonth()+1}/${d.getDate()}`,
      maxVoltage: +(base + 0.15 + Math.random() * 0.1).toFixed(3),
      minVoltage: +(base - 0.05 - Math.random() * 0.1).toFixed(3),
      avgVoltage: +base.toFixed(3),
    }
  })
}

const TS = { backgroundColor:"#0d1233", border:"1px solid #1a2654", borderRadius:"8px", fontSize:11 }

export function CellVoltageAnalysis({ range }: { range: number }) {
  const [viewMode, setViewMode] = useState<"chart"|"table">("chart")
  const { t, language } = useLanguage()
  const zh = language === "zh"

  const data = useMemo(() => buildData(range), [range])

  const stats = useMemo(() => {
    const maxV = Math.max(...data.map(d => d.maxVoltage))
    const minV = Math.min(...data.map(d => d.minVoltage))
    const avgV = (data.reduce((s,d) => s + d.avgVoltage, 0) / data.length).toFixed(3)
    return { maxV, minV, avgV, range: (maxV - minV).toFixed(3) }
  }, [data])

  return (
    <div className="flex h-full flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#7dd3fc]" />
          <h3 className="text-sm font-semibold text-[#7dd3fc]">{t("cellVoltageAnalysis")}</h3>
        </div>
        <div className="flex gap-1 rounded-lg bg-[#1a2654]/50 p-1">
          <button onClick={() => setViewMode("chart")}
            className={`rounded-md p-1.5 transition-all ${viewMode==="chart"?"bg-[#7dd3fc] text-[#0a0e27]":"text-[#7b8ab8]"}`}>
            <LineChartIcon className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setViewMode("table")}
            className={`rounded-md p-1.5 transition-all ${viewMode==="table"?"bg-[#7dd3fc] text-[#0a0e27]":"text-[#7b8ab8]"}`}>
            <Table className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-3 grid grid-cols-4 gap-2">
        {[
          { label: zh?"最大电压":"Max",   value:`${stats.maxV.toFixed(3)} V`, color:"#ef4444" },
          { label: zh?"平均电压":"Avg",   value:`${stats.avgV} V`,            color:"#00d4aa" },
          { label: zh?"最小电压":"Min",   value:`${stats.minV.toFixed(3)} V`, color:"#22d3ee" },
          { label: zh?"极差":"Range",     value:`${stats.range} V`,           color:"#fbbf24" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-[#1a2654]/60 bg-[#101840]/80 px-2 py-2 text-center">
            <div className="text-xs font-medium text-[#7b8ab8]">{s.label}</div>
            <div className="mt-0.5 font-mono text-[0.95rem] font-bold" style={{color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chart / Table */}
      <div className="min-h-0 flex-1">
        {viewMode === "chart" ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{top:28,right:16,left:-8,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" vertical={false}/>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:"#7b8ab8",fontSize:10}}
                interval={range > 15 ? 4 : range > 7 ? 1 : 0}/>
              <YAxis axisLine={false} tickLine={false} tick={{fill:"#7b8ab8",fontSize:10}}
                domain={[2.4, 3.7]} tickFormatter={v=>v.toFixed(2)} unit="V"/>
              <Tooltip contentStyle={TS} labelStyle={{color:"#7b8ab8"}}
                formatter={(v:number, name:string) => [`${v.toFixed(3)} V`, name]}/>
              <Legend wrapperStyle={{paddingTop:"6px"}} layout="horizontal" verticalAlign="bottom"
                formatter={v => <span style={{color:"#7b8ab8",fontSize:"11px"}}>{v}</span>}/>
              <ReferenceLine y={3.65} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.8}
                label={{value:zh?"上限 3.65V":"Max 3.65V", fill:"#ef4444", fontSize:11, fontWeight:600, position:"insideTopLeft"}}/>
              <ReferenceLine y={2.5} stroke="#22d3ee" strokeDasharray="4 4" strokeOpacity={0.8}
                label={{value:zh?"下限 2.50V":"Min 2.50V", fill:"#22d3ee", fontSize:11, fontWeight:600, position:"insideBottomRight"}}/>
              <Line type="monotone" dataKey="maxVoltage" name={zh?"最大电压":"Max Voltage"} stroke="#ef4444" strokeWidth={2} dot={{r:2}} activeDot={{r:4}}/>
              <Line type="monotone" dataKey="avgVoltage" name={zh?"平均电压":"Avg Voltage"} stroke="#00d4aa" strokeWidth={2} dot={{r:2}} activeDot={{r:4}} strokeDasharray="5 3"/>
              <Line type="monotone" dataKey="minVoltage" name={zh?"最小电压":"Min Voltage"} stroke="#22d3ee" strokeWidth={2} dot={{r:2}} activeDot={{r:4}}/>
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0d1233]">
                <tr className="border-b border-[#1a2654] text-[#7b8ab8]">
                  <th className="px-2 py-2 text-left">{t("date")}</th>
                  <th className="px-2 py-2 text-right">{zh?"最大(V)":"Max (V)"}</th>
                  <th className="px-2 py-2 text-right">{zh?"平均(V)":"Avg (V)"}</th>
                  <th className="px-2 py-2 text-right">{zh?"最小(V)":"Min (V)"}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={i} className="border-b border-[#1a2654]/50 hover:bg-[#1a2654]/30">
                    <td className="px-2 py-1.5">{item.day}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[#ef4444]">{item.maxVoltage.toFixed(3)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[#00d4aa]">{item.avgVoltage.toFixed(3)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[#22d3ee]">{item.minVoltage.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
