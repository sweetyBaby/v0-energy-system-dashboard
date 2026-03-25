"use client"

import { BellRing } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

const alarmLogs = [
  {
    time: "2026-03-24 14:26:18",
    level: "critical",
    source: "BCU-03",
    messageZh: "3#簇温差预警",
    messageEn: "Cluster 3 temperature delta warning",
    statusZh: "未恢复",
    statusEn: "Active",
  },
  {
    time: "2026-03-24 13:08:44",
    level: "major",
    source: "BCU-07",
    messageZh: "单体压差越限",
    messageEn: "Cell voltage delta exceeded threshold",
    statusZh: "已确认",
    statusEn: "Acknowledged",
  },
  {
    time: "2026-03-24 10:42:06",
    level: "minor",
    source: "PCS-01",
    messageZh: "PCS 通讯抖动",
    messageEn: "PCS communication jitter",
    statusZh: "已恢复",
    statusEn: "Recovered",
  },
  {
    time: "2026-03-23 22:17:31",
    level: "major",
    source: "EMS",
    messageZh: "调度功率指令偏差",
    messageEn: "Dispatch power deviation",
    statusZh: "已确认",
    statusEn: "Acknowledged",
  },
]

const levelStyles: Record<string, string> = {
  critical: "bg-[#ef4444]/15 text-[#ef4444]",
  major: "bg-[#f97316]/15 text-[#f97316]",
  minor: "bg-[#3b82f6]/15 text-[#3b82f6]",
}

export function AlarmLogPanel() {
  const { language } = useLanguage()
  const todayAlarmCount = alarmLogs.filter((item) => item.time.startsWith("2026-03-24")).length

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-[#1a2654] bg-[#0d1233] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[#f97316]" />
          <h3 className="text-base font-semibold text-[#f97316]">
            {language === "zh" ? "告警日志" : "Alarm Log"}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#7b8ab8]">
          <BellRing className="h-4 w-4 text-[#f97316]" />
          {language === "zh" ? `今日 ${todayAlarmCount} 条` : `${todayAlarmCount} alarms today`}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-[#1a2654]/45 p-3">
          <div className="text-xs text-[#7b8ab8]">{language === "zh" ? "活动告警" : "Active"}</div>
          <div className="mt-1 text-xl font-semibold text-[#ef4444]">2</div>
        </div>
        <div className="rounded-lg bg-[#1a2654]/45 p-3">
          <div className="text-xs text-[#7b8ab8]">{language === "zh" ? "已确认" : "Acknowledged"}</div>
          <div className="mt-1 text-xl font-semibold text-[#f97316]">5</div>
        </div>
        <div className="rounded-lg bg-[#1a2654]/45 p-3">
          <div className="text-xs text-[#7b8ab8]">{language === "zh" ? "恢复率" : "Recovery Rate"}</div>
          <div className="mt-1 text-xl font-semibold text-[#00d4aa]">78%</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[#1a2654]">
        <div className="grid grid-cols-[150px_88px_92px_1fr_88px] gap-3 bg-[#101840] px-3 py-3 text-xs text-[#7b8ab8]">
          <span>{language === "zh" ? "时间" : "Time"}</span>
          <span>{language === "zh" ? "等级" : "Level"}</span>
          <span>{language === "zh" ? "来源" : "Source"}</span>
          <span>{language === "zh" ? "告警内容" : "Message"}</span>
          <span>{language === "zh" ? "状态" : "Status"}</span>
        </div>

        <div className="divide-y divide-[#1a2654]">
          {alarmLogs.map((log) => (
            <div
              key={`${log.time}-${log.source}`}
              className="grid grid-cols-[150px_88px_92px_1fr_88px] gap-3 px-3 py-3 text-sm text-[#e8f4fc]"
            >
              <span className="font-mono text-xs text-[#7b8ab8]">{log.time}</span>
              <span>
                <span className={`rounded-full px-2 py-1 text-xs ${levelStyles[log.level]}`}>
                  {log.level.toUpperCase()}
                </span>
              </span>
              <span className="text-[#22d3ee]">{log.source}</span>
              <span>{language === "zh" ? log.messageZh : log.messageEn}</span>
              <span className="text-[#7b8ab8]">{language === "zh" ? log.statusZh : log.statusEn}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
