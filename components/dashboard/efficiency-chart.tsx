"use client"

import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts"

export function EfficiencyChart() {
  const data = [
    { name: "昨日", value: 95.26, color: "#3b82f6" },
    { name: "本月", value: 94.82, color: "#22d3ee" },
    { name: "本年", value: 95.18, color: "#00d4aa" },
    { name: "累计", value: 95.21, color: "#f97316" },
  ]

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
        <h3 className="text-base font-semibold text-[#00d4aa]">充放电效率</h3>
        <span className="text-xs text-[#7b8ab8] ml-2">(%)</span>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 60, left: 40, bottom: 10 }}>
            <XAxis type="number" domain={[90, 100]} hide />
            <YAxis 
              type="category" 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7b8ab8", fontSize: 12 }}
            />
            <Bar 
              dataKey="value" 
              radius={[0, 4, 4, 0]}
              barSize={24}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList 
                dataKey="value" 
                position="right" 
                formatter={(value: number) => `${value}%`}
                fill="#e8f4fc"
                fontSize={14}
                fontWeight="bold"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Circular Progress Indicators */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="relative w-14 h-14">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke="#1a2654"
                  strokeWidth="4"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="4"
                  strokeDasharray={`${(item.value / 100) * 150.8} 150.8`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold" style={{ color: item.color }}>
                  {item.value}%
                </span>
              </div>
            </div>
            <span className="text-xs text-[#7b8ab8] mt-1">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
