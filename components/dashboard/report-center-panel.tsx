"use client"

import { FileText, ShieldCheck, TimerReset } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

const reportRows = [
  {
    nameZh: "日报",
    nameEn: "Daily Report",
    cycleZh: "每日 00:05",
    cycleEn: "Daily 00:05",
    latest: "2026-03-24",
    statusZh: "已生成",
    statusEn: "Ready",
  },
  {
    nameZh: "月报",
    nameEn: "Monthly Report",
    cycleZh: "每月 1 日",
    cycleEn: "1st day monthly",
    latest: "2026-03",
    statusZh: "已生成",
    statusEn: "Ready",
  },
  {
    nameZh: "告警专题报表",
    nameEn: "Alarm Report",
    cycleZh: "每周一",
    cycleEn: "Every Monday",
    latest: "2026-W12",
    statusZh: "待更新",
    statusEn: "Pending",
  },
]

const reportFields = [
  "功率曲线",
  "SOC/SOH 趋势",
  "充放电量统计",
  "系统效率",
  "压差分析",
  "温差分析",
  "BCU 运行状态",
  "告警闭环",
]

export function ReportCenterPanel() {
  const { language } = useLanguage()

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#22d3ee]" />
          <h3 className="text-base font-semibold text-[#22d3ee]">
            {language === "zh" ? "报表中心" : "Report Center"}
          </h3>
        </div>
        <span className="text-xs text-[#7b8ab8]">
          {language === "zh" ? "支持日报 / 月报 / 年报 / 专题报表" : "Daily / Monthly / Topic Reports"}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="rounded-lg border border-[#1a2654] bg-[#101840]/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs text-[#7b8ab8]">
            <FileText className="h-4 w-4 text-[#22d3ee]" />
            {language === "zh" ? "自动生成" : "Auto Generation"}
          </div>
          <div className="text-lg font-semibold text-[#22d3ee]">03</div>
          <div className="mt-1 text-xs text-[#7b8ab8]">
            {language === "zh" ? "已配置 3 类标准报表" : "3 report templates configured"}
          </div>
        </div>
        <div className="rounded-lg border border-[#1a2654] bg-[#101840]/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs text-[#7b8ab8]">
            <ShieldCheck className="h-4 w-4 text-[#00d4aa]" />
            {language === "zh" ? "字段覆盖" : "Field Coverage"}
          </div>
          <div className="text-lg font-semibold text-[#00d4aa]">92%</div>
          <div className="mt-1 text-xs text-[#7b8ab8]">
            {language === "zh" ? "已覆盖运行、能效、分析、告警等主题" : "Operations, efficiency, analysis, and alarms covered"}
          </div>
        </div>
        <div className="rounded-lg border border-[#1a2654] bg-[#101840]/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs text-[#7b8ab8]">
            <TimerReset className="h-4 w-4 text-[#f97316]" />
            {language === "zh" ? "最近生成" : "Latest Export"}
          </div>
          <div className="text-lg font-semibold text-[#f97316]">2026-03-24 00:05</div>
          <div className="mt-1 text-xs text-[#7b8ab8]">
            {language === "zh" ? "日报已归档，可供导出和审计追溯" : "Daily report archived for export and audit"}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-lg border border-[#1a2654]">
          <div className="grid grid-cols-[1fr_120px_120px_100px] gap-3 bg-[#101840] px-3 py-3 text-xs text-[#7b8ab8]">
            <span>{language === "zh" ? "报表类型" : "Report"}</span>
            <span>{language === "zh" ? "生成周期" : "Schedule"}</span>
            <span>{language === "zh" ? "最新周期" : "Latest"}</span>
            <span>{language === "zh" ? "状态" : "Status"}</span>
          </div>
          <div className="divide-y divide-[#1a2654]">
            {reportRows.map((row) => (
              <div key={row.latest + row.nameZh} className="grid grid-cols-[1fr_120px_120px_100px] gap-3 px-3 py-3 text-sm">
                <span className="text-[#e8f4fc]">{language === "zh" ? row.nameZh : row.nameEn}</span>
                <span className="text-[#7b8ab8]">{language === "zh" ? row.cycleZh : row.cycleEn}</span>
                <span className="font-mono text-[#22d3ee]">{row.latest}</span>
                <span className={row.statusZh === "待更新" ? "text-[#f97316]" : "text-[#00d4aa]"}>
                  {language === "zh" ? row.statusZh : row.statusEn}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#1a2654] bg-[#101840]/70 p-4">
          <div className="mb-3 text-sm font-medium text-[#e8f4fc]">
            {language === "zh" ? "建议纳入报表字段" : "Recommended Fields"}
          </div>
          <div className="flex flex-wrap gap-2">
            {reportFields.map((field) => (
              <span
                key={field}
                className="rounded-full border border-[#3b82f6]/30 bg-[#1a2654]/60 px-3 py-1 text-xs text-[#7dd3fc]"
              >
                {field}
              </span>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-[#1a2654]/45 p-3 text-sm text-[#7b8ab8]">
            {language === "zh"
              ? "建议下一步把“告警闭环率、设备可用率、等效循环、收益测算”也纳入月报和经营分析专题。"
              : "Next step: include alarm closure rate, availability, equivalent cycles, and revenue analytics in monthly reports."}
          </div>
        </div>
      </div>
    </div>
  )
}
