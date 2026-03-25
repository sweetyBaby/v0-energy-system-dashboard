"use client"

import { createContext, useContext, useState, ReactNode } from "react"

type Language = "zh" | "en"

type Translations = {
  [key: string]: {
    zh: string
    en: string
  }
}

// All translations for the dashboard
export const translations: Translations = {
  // Header
  "energyMonitoring": { zh: "储能数据监测", en: "Energy Storage Monitoring" },
  "enterSystem": { zh: "进入系统", en: "Enter System" },

  // Project Info
  "projectInfo": { zh: "项目信息", en: "Project Info" },
  "ratedPower": { zh: "额定功率", en: "Rated Power" },
  "ratedCapacity": { zh: "额定容量", en: "Rated Capacity" },
  "commissioningDate": { zh: "投运日期", en: "Commissioning Date" },
  "site": { zh: "站点", en: "Site" },

  // Charge/Discharge
  "chargeDischargeStats": { zh: "充放电量统计", en: "Charge/Discharge Statistics" },
  "chargeAmount": { zh: "充电量", en: "Charge" },
  "dischargeAmount": { zh: "放电量", en: "Discharge" },
  "chargeBar": { zh: "充电量(柱状)", en: "Charge (Bar)" },
  "dischargeBar": { zh: "放电量(柱状)", en: "Discharge (Bar)" },
  "chargeLine": { zh: "充电量(曲线)", en: "Charge (Line)" },
  "dischargeLine": { zh: "放电量(曲线)", en: "Discharge (Line)" },
  "thisWeek": { zh: "近7天", en: "Last 7 Days" },
  "thisMonth": { zh: "本月", en: "This Month" },
  "thisYear": { zh: "本年", en: "This Year" },
  "custom": { zh: "自定义", en: "Custom" },
  "search": { zh: "查询", en: "Search" },
  "to": { zh: "至", en: "to" },
  "loading": { zh: "加载中...", en: "Loading..." },
  "selectDateRange": { zh: "请选择日期范围并点击查询按钮", en: "Please select a date range and click Search" },
  "customDateHint": { zh: "提示：自定义日期范围最多一个月；日期范围超过一日按日统计，否则按小时统计", en: "Hint: Custom date range max 1 month; daily aggregation if >1 day, otherwise hourly" },
  "selectCompleteDateRange": { zh: "请选择完整的日期范围", en: "Please select complete date range" },
  "endTimeMustBeLater": { zh: "结束时间必须大于开始时间", en: "End time must be later than start time" },
  "maxOneMonth": { zh: "自定义日期范围最多为一个月", en: "Custom date range cannot exceed one month" },

  // Power Curve
  "powerCurveQuery": { zh: "功率曲线", en: "Power Curve Query" },
  "chargePower": { zh: "充电功率", en: "Charge Power" },
  "dischargePower": { zh: "放电功率", en: "Discharge Power" },
  "today": { zh: "今日", en: "Today" },
  "yesterday": { zh: "昨日", en: "Yesterday" },
  "selectDate": { zh: "选择日期", en: "Select Date" },

  // Efficiency
  "chargeDischargeEfficiency": { zh: "充放电效率", en: "Charge/Discharge Efficiency" },
  "efficiency": { zh: "效率", en: "Efficiency" },
  "avgEfficiency": { zh: "平均效率", en: "Avg Efficiency" },

  // Voltage Analysis
  "voltageDiffAnalysis": { zh: "压差分析", en: "Voltage Difference Analysis" },
  "voltageRange": { zh: "压差区间", en: "Voltage Range" },
  "clusterCount": { zh: "簇数", en: "Cluster Count" },

  // Temperature Analysis
  "tempDiffAnalysis": { zh: "温差分析", en: "Temperature Difference Analysis" },
  "tempRange": { zh: "温差区间", en: "Temp Range" },

  // Cell Voltage
  "cellVoltageAnalysis": { zh: "单体电芯电压分析", en: "Cell Voltage Analysis" },
  "voltageDistribution": { zh: "电压分布", en: "Voltage Distribution" },
  "cellCount": { zh: "单体数量", en: "Cell Count" },

  // BCU Status
  "bcuStatusQuery": { zh: "BCU 状态查询", en: "BCU Status Query" },
  "cluster": { zh: "簇", en: "Cluster" },
  "voltage": { zh: "电压", en: "Voltage" },
  "current": { zh: "电流", en: "Current" },
  "soc": { zh: "SOC", en: "SOC" },
  "soh": { zh: "SOH", en: "SOH" },
  "maxCellVoltage": { zh: "单体最高电压", en: "Max Cell Voltage" },
  "minCellVoltage": { zh: "单体最低电压", en: "Min Cell Voltage" },
  "maxCellTemp": { zh: "单体最高温度", en: "Max Cell Temp" },
  "minCellTemp": { zh: "单体最低温度", en: "Min Cell Temp" },
  "status": { zh: "状态", en: "Status" },
  "normal": { zh: "正常", en: "Normal" },
  "warning": { zh: "预警", en: "Warning" },
  "fault": { zh: "故障", en: "Fault" },
  "cellNumber": { zh: "电芯编号", en: "cellNumber" },
  // Charge/Discharge Table
  "chargeDischargeRecord": { zh: "充放电记录", en: "Charge/Discharge Record" },
  "date": { zh: "日期", en: "Date" },
  "startTime": { zh: "开始时间", en: "Start Time" },
  "endTime": { zh: "结束时间", en: "End Time" },
  "duration": { zh: "持续时间", en: "Duration" },
  "type": { zh: "类型", en: "Type" },
  "charge": { zh: "充电", en: "Charge" },
  "discharge": { zh: "放电", en: "Discharge" },
  "energy": { zh: "电量", en: "Energy" },

  // Day names
  "day": { zh: "日", en: "" },
  "month1": { zh: "1月", en: "Jan" },
  "month2": { zh: "2月", en: "Feb" },
  "month3": { zh: "3月", en: "Mar" },
  "month4": { zh: "4月", en: "Apr" },
  "month5": { zh: "5月", en: "May" },
  "month6": { zh: "6月", en: "Jun" },
  "month7": { zh: "7月", en: "Jul" },
  "month8": { zh: "8月", en: "Aug" },
  "month9": { zh: "9月", en: "Sep" },
  "month10": { zh: "10月", en: "Oct" },
  "month11": { zh: "11月", en: "Nov" },
  "month12": { zh: "12月", en: "Dec" },
}

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: "zh",
  setLanguage: () => { },
  t: (key: string) => key,
})

export const useLanguage = () => useContext(LanguageContext)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("zh")

  const t = (key: string): string => {
    if (translations[key]) {
      return translations[key][language]
    }
    return key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}
