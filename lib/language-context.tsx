"use client"

import { createContext, useContext, useState, ReactNode } from "react"

type Language = "zh" | "en"

type Translations = {
  [key: string]: {
    zh: string
    en: string
  }
}

const translations: Translations = {
  // Header
  "header.title": { zh: "储能数据监测", en: "Energy Storage Monitoring" },
  
  // Common
  "common.loading": { zh: "加载中...", en: "Loading..." },
  "common.query": { zh: "查询", en: "Query" },
  "common.to": { zh: "至", en: "to" },
  
  // Energy Curve
  "energyCurve.title": { zh: "充放电电量统计", en: "Charge/Discharge Statistics" },
  "energyCurve.thisWeek": { zh: "本周", en: "This Week" },
  "energyCurve.thisMonth": { zh: "本月", en: "This Month" },
  "energyCurve.thisYear": { zh: "本年", en: "This Year" },
  "energyCurve.custom": { zh: "自定义", en: "Custom" },
  "energyCurve.hint": { zh: "提示：自定义日期范围最多一个月；日期范围超过一日按日统计，否则按小时统计", en: "Note: Custom date range is limited to one month; ranges over 1 day are shown daily, otherwise hourly" },
  "energyCurve.selectRange": { zh: "请选择日期范围并点击查询按钮", en: "Please select a date range and click Query" },
  "energyCurve.chargeBar": { zh: "充电量(柱状)", en: "Charge (Bar)" },
  "energyCurve.dischargeBar": { zh: "放电量(柱状)", en: "Discharge (Bar)" },
  "energyCurve.chargeLine": { zh: "充电量(曲线)", en: "Charge (Line)" },
  "energyCurve.dischargeLine": { zh: "放电量(曲线)", en: "Discharge (Line)" },
  "energyCurve.selectComplete": { zh: "请选择完整的日期范围", en: "Please select complete date range" },
  "energyCurve.endAfterStart": { zh: "结束时间必须大于开始时间", en: "End time must be after start time" },
  "energyCurve.maxOneMonth": { zh: "自定义日期范围最多为一个月", en: "Custom range limited to one month" },
  
  // Power Curve
  "powerCurve.title": { zh: "充放电功率曲线", en: "Charge/Discharge Power Curve" },
  "powerCurve.chargePower": { zh: "充电功率", en: "Charge Power" },
  "powerCurve.dischargePower": { zh: "放电功率", en: "Discharge Power" },
  
  // Project Info
  "projectInfo.title": { zh: "项目信息", en: "Project Info" },
  "projectInfo.ratedPower": { zh: "额定功率", en: "Rated Power" },
  "projectInfo.ratedCapacity": { zh: "额定容量", en: "Rated Capacity" },
  "projectInfo.commissioningDate": { zh: "投运日期", en: "Commissioning Date" },
  
  // Charge/Discharge Table
  "chargeTable.title": { zh: "充放电数据", en: "Charge/Discharge Data" },
  "chargeTable.time": { zh: "时间", en: "Time" },
  "chargeTable.charge": { zh: "充电", en: "Charge" },
  "chargeTable.discharge": { zh: "放电", en: "Discharge" },
  
  // Efficiency
  "efficiency.title": { zh: "系统效率", en: "System Efficiency" },
  
  // Voltage Difference
  "voltageDiff.title": { zh: "电压差异分析", en: "Voltage Difference Analysis" },
  
  // Temperature Difference
  "tempDiff.title": { zh: "温度差异分析", en: "Temperature Difference Analysis" },
  
  // Cell Voltage
  "cellVoltage.title": { zh: "电芯最大/最小电压", en: "Cell Max/Min Voltage" },
  "cellVoltage.chart": { zh: "图表", en: "Chart" },
  "cellVoltage.table": { zh: "表格", en: "Table" },
  "cellVoltage.maxVoltage": { zh: "最大电压", en: "Max Voltage" },
  "cellVoltage.minVoltage": { zh: "最小电压", en: "Min Voltage" },
  "cellVoltage.cellId": { zh: "电芯编号", en: "Cell ID" },
  "cellVoltage.voltage": { zh: "电压", en: "Voltage" },
  "cellVoltage.type": { zh: "类型", en: "Type" },
  
  // BCU Status
  "bcuStatus.title": { zh: "BCU运行状态查询", en: "BCU Status Query" },
  "bcuStatus.overview": { zh: "总览", en: "Overview" },
  "bcuStatus.voltage": { zh: "电芯电压", en: "Cell Voltage" },
  "bcuStatus.temperature": { zh: "电芯温度", en: "Cell Temperature" },
  "bcuStatus.cellNumber": { zh: "电芯编号", en: "Cell Number" },
}

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: "zh",
  setLanguage: () => {},
  t: (key: string) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("zh")

  const t = (key: string): string => {
    const translation = translations[key]
    if (!translation) return key
    return translation[language]
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
