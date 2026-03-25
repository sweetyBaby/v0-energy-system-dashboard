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
    const label = `${d.getMonth()+1}/${d.getDate()}`
    return {
      day: label,
      maxDiff: +(20 + Math.random() * 30).toFixed(1),
      avgDiff: +(10 + Math.random() * 15).toFixed(1),
      minDiff: +(5  + Math.random() * 8).toFixed(1),
    }
  })
}

const TS = { backgroundColor:"#0d1233", border:"1px solid #1a2654", borderRadius:"8px", fontSize:11 }

export function VoltageDifferenceAnalysis({ range }: { range: number }) {
  const [viewMode, setViewMode] = useState<"chart"|"table">("chart")
  const { t, language } = useLanguage()
  const zh = language === "zh"

  const data = useMemo(() => buildData(range), [range])

  const stats = useMemo(() => ({
    max: Math.max(...data.map(d => d.maxDiff)),
    avg: (data.reduce((s,d) => s + d.avgDiff, 0) / data.length).toFixed(1),
    min: Math.min(...data.map(d => d.minDiff)),
  }), [data])

  return (
    <div className="flex h-full flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#00d4aa]" />
          <h3 className="text-sm font-semibold text-[#00d4aa]">{t("voltageDiffAnalysis")}</h3>
        </div>
        <div className="flex gap-1 rounded-lg bg-[#1a2654]/50 p-1">
          <button onClick={() => setViewMode("chart")}
            className={`rounded-md p-1.5 transition-all ${viewMode==="chart"?"bg-[#00d4aa] text-[#0a0e27]":"text-[#7b8ab8]"}`}>
            <LineChartIcon className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setViewMode("table")}
            className={`rounded-md p-1.5 transition-all ${viewMode==="table"?"bg-[#00d4aa] text-[#0a0e27]":"text-[#7b8ab8]"}`}>
            <Table className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { label: zh?"最大压差":"Max Diff", value:`${stats.max.toFixed(1)} mV`, color:"#ef4444" },
          { label: zh?"平均压差":"Avg Diff", value:`${stats.avg} mV`,            color:"#f97316" },
          { label: zh?"最小压差":"Min Diff", value:`${stats.min.toFixed(1)} mV`, color:"#22d3ee" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-[#1a2654]/60 bg-[#101840]/80 px-2 py-2 text-center">
            <div className="text-[10px] text-[#7b8ab8]">{s.label}</div>
            <div className="mt-0.5 font-mono text-xs font-bold" style={{color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chart / Table */}
      <div className="min-h-0 flex-1">
        {viewMode === "chart" ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{top:8,right:16,left:-8,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2654" vertical={false}/>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:"#7b8ab8",fontSize:10}}
                interval={range > 15 ? 4 : range > 7 ? 1 : 0}/>
              <YAxis axisLine={false} tickLine={false} tick={{fill:"#7b8ab8",fontSize:10}} unit="mV"
                domain={[0,"dataMax + 10"]}/>
              <Tooltip contentStyle={TS} labelStyle={{color:"#7b8ab8"}}
                formatter={(v:number) => [`${v.toFixed(1)} mV`]}/>
              <Legend wrapperStyle={{paddingTop:"6px"}}
                formatter={v => <span style={{color:"#7b8ab8",fontSize:"11px"}}>{v}</span>}/>
              <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.7}
                label={{value:zh?"⚠ 警戒 50mV":"⚠ Alert 50mV", fill:"#ef4444", fontSize:9, position:"insideTopLeft"}}/>
              <Line type="monotone" dataKey="maxDiff" name={zh?"最大压差":"Max Diff"} stroke="#ef4444" strokeWidth={2} dot={{r:2}} activeDot={{r:4}}/>
              <Line type="monotone" dataKey="avgDiff" name={zh?"平均压差":"Avg Diff"} stroke="#f97316" strokeWidth={2} dot={{r:2}} activeDot={{r:4}}/>
              <Line type="monotone" dataKey="minDiff" name={zh?"最小压差":"Min Diff"} stroke="#22d3ee" strokeWidth={2} dot={{r:2}} activeDot={{r:4}}/>
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0d1233]">
                <tr className="border-b border-[#1a2654] text-[#7b8ab8]">
                  <th className="px-2 py-2 text-left">{t("date")}</th>
                  <th className="px-2 py-2 text-right">{zh?"最大压差(mV)":"Max (mV)"}</th>
                  <th className="px-2 py-2 text-right">{zh?"平均压差(mV)":"Avg (mV)"}</th>
                  <th className="px-2 py-2 text-right">{zh?"最小压差(mV)":"Min (mV)"}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={i} className="border-b border-[#1a2654]/50 hover:bg-[#1a2654]/30">
                    <td className="px-2 py-1.5">{item.day}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[#ef4444]">{item.maxDiff.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[#f97316]">{item.avgDiff.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[#22d3ee]">{item.minDiff.toFixed(1)}</td>
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
