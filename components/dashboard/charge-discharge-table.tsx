"use client"

import { ArrowUp, ArrowDown } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export function ChargeDischargeTable() {
  const { language } = useLanguage()
  const data = {
    charge: {
      yesterday: 3256.8,
      thisMonth: 45678.5,
      thisYear: 523456.2,
      cumulative: 1234567.8,
    },
    discharge: {
      yesterday: 3102.4,
      thisMonth: 43521.3,
      thisYear: 498234.6,
      cumulative: 1175432.1,
    },
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  }

  return (
    <div className="bg-[#0d1233] rounded-lg border border-[#1a2654] p-4 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 bg-[#00d4aa] rounded-full" />
        <h3 className="text-base font-semibold text-[#00d4aa]">{language === "zh" ? "充放电量统计" : "Charge/Discharge Stats"}</h3>
        <span className="text-xs text-[#7b8ab8] ml-2">{language === "zh" ? "(单位: kWh)" : "(kWh)"}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#7b8ab8] border-b border-[#1a2654]">
              <th className="py-3 px-2 text-left font-medium">{language === "zh" ? "类型" : "Type"}</th>
              <th className="py-3 px-2 text-right font-medium">{language === "zh" ? "昨日" : "Yesterday"}</th>
              <th className="py-3 px-2 text-right font-medium">{language === "zh" ? "本月" : "Month"}</th>
              <th className="py-3 px-2 text-right font-medium">{language === "zh" ? "本年" : "Year"}</th>
              <th className="py-3 px-2 text-right font-medium">{language === "zh" ? "累计" : "Total"}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#1a2654]/50 hover:bg-[#1a2654]/30 transition-colors">
              <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/20 flex items-center justify-center">
                    <ArrowDown className="w-4 h-4 text-[#3b82f6]" />
                  </div>
                  <span className="font-medium text-[#3b82f6]">{language === "zh" ? "充电量" : "Charge"}</span>
                </div>
              </td>
              <td className="py-3 px-2 text-right font-mono">{formatNumber(data.charge.yesterday)}</td>
              <td className="py-3 px-2 text-right font-mono">{formatNumber(data.charge.thisMonth)}</td>
              <td className="py-3 px-2 text-right font-mono">{formatNumber(data.charge.thisYear)}</td>
              <td className="py-3 px-2 text-right font-mono text-[#00d4aa] font-semibold">
                {formatNumber(data.charge.cumulative)}
              </td>
            </tr>
            <tr className="hover:bg-[#1a2654]/30 transition-colors">
              <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#f97316]/20 flex items-center justify-center">
                    <ArrowUp className="w-4 h-4 text-[#f97316]" />
                  </div>
                  <span className="font-medium text-[#f97316]">{language === "zh" ? "放电量" : "Discharge"}</span>
                </div>
              </td>
              <td className="py-3 px-2 text-right font-mono">{formatNumber(data.discharge.yesterday)}</td>
              <td className="py-3 px-2 text-right font-mono">{formatNumber(data.discharge.thisMonth)}</td>
              <td className="py-3 px-2 text-right font-mono">{formatNumber(data.discharge.thisYear)}</td>
              <td className="py-3 px-2 text-right font-mono text-[#00d4aa] font-semibold">
                {formatNumber(data.discharge.cumulative)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-[#1a2654]/50 rounded-lg p-3">
          <div className="text-xs text-[#7b8ab8] mb-1">{language === "zh" ? "昨日充放电效率" : "Yesterday Efficiency"}</div>
          <div className="text-xl font-bold text-[#00d4aa]">95.26%</div>
        </div>
        <div className="bg-[#1a2654]/50 rounded-lg p-3">
          <div className="text-xs text-[#7b8ab8] mb-1">{language === "zh" ? "累计充放电效率" : "Total Efficiency"}</div>
          <div className="text-xl font-bold text-[#22d3ee]">95.21%</div>
        </div>
      </div>
    </div>
  )
}
