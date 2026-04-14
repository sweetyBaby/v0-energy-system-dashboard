import { apiClient } from "@/lib/api-client"
import { apiEndpoints } from "@/lib/api/endpoints"
import { API_PLACEHOLDER } from "@/lib/api/project"

export type DailyListRequest = {
  projectId: string
  params: {
    beginTime: string
    endTime: string
    type?: "year"
    year?: string
  }
}

export type RawDailyListRow = {
  reportDate: string | null
  month?: string | null
  chargeAh: number | null
  dischargeAh: number | null
  chargeWh: number | null
  dischargeWh: number | null
  chargeEfficiencyCe: number | null
  chargeEfficiencyEe: number | null
  maxVoltageDiff: number | null
  maxTempDiff: number | null
  maxVoltage: number | null
  minVoltage: number | null
  projectName: string | null
}

export type DailyListResponse = {
  total: number
  rows: RawDailyListRow[]
  code: number
  msg: string
}

export type EfficiencyPoint = {
  label: string
  chargeCapacity: number | null
  dischargeCapacity: number | null
  chargeEnergy: number | null
  dischargeEnergy: number | null
  capacityEfficiency: number | null
  energyEfficiency: number | null
}

type NormalizeOverviewOptions = {
  groupBy?: "day" | "month"
  language?: "zh" | "en"
}

const parseReportDate = (value: string | null | undefined) => {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

const parseMonthValue = (value: string | null | undefined) => {
  if (!value) return null

  const month = Number.parseInt(value, 10)
  if (Number.isNaN(month) || month < 1 || month > 12) return null
  return month
}

const formatDateLabel = (value: string | null | undefined) => {
  const date = parseReportDate(value)
  if (!date) return API_PLACEHOLDER
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const formatMonthLabel = (month: number, language: "zh" | "en") =>
  language === "zh" ? `${month}\u6708` : `M${month}`

const convertWhToKwh = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return null
  return Number((value / 1000).toFixed(1))
}

const normalizeNumber = (value: number | null | undefined, digits = 1) => {
  if (value == null || Number.isNaN(value)) return null
  return Number(value.toFixed(digits))
}

export const fetchOverviewDailyList = async (payload: DailyListRequest) => {
  return apiClient.postRaw<DailyListResponse>(apiEndpoints.overview.dailyList, payload)
}

export const normalizeOverviewDailyRows = (
  rows: RawDailyListRow[],
  options: NormalizeOverviewOptions = {},
): EfficiencyPoint[] => {
  const groupBy = options.groupBy ?? "day"
  const language = options.language ?? "zh"

  if (groupBy === "month") {
    return [...rows]
      .map((row) => {
        const monthFromField = parseMonthValue(row.month)
        const monthFromDate = parseReportDate(row.reportDate)?.getMonth()
        const month = monthFromField ?? (monthFromDate == null ? null : monthFromDate + 1)

        if (month == null) {
          return null
        }

        return {
          month,
          chargeCapacity: normalizeNumber(row.chargeAh),
          dischargeCapacity: normalizeNumber(row.dischargeAh),
          chargeEnergy: convertWhToKwh(row.chargeWh),
          dischargeEnergy: convertWhToKwh(row.dischargeWh),
          capacityEfficiency: normalizeNumber(row.chargeEfficiencyCe, 2),
          energyEfficiency: normalizeNumber(row.chargeEfficiencyEe, 2),
        }
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
      .sort((a, b) => a.month - b.month)
      .map((row) => ({
        label: formatMonthLabel(row.month, language),
        chargeCapacity: row.chargeCapacity,
        dischargeCapacity: row.dischargeCapacity,
        chargeEnergy: row.chargeEnergy,
        dischargeEnergy: row.dischargeEnergy,
        capacityEfficiency: row.capacityEfficiency,
        energyEfficiency: row.energyEfficiency,
      }))
  }

  return [...rows]
    .sort((a, b) => {
      const aTime = parseReportDate(a.reportDate)?.getTime() ?? Number.POSITIVE_INFINITY
      const bTime = parseReportDate(b.reportDate)?.getTime() ?? Number.POSITIVE_INFINITY
      return aTime - bTime
    })
    .map((row) => ({
      label: formatDateLabel(row.reportDate),
      chargeCapacity: normalizeNumber(row.chargeAh),
      dischargeCapacity: normalizeNumber(row.dischargeAh),
      chargeEnergy: convertWhToKwh(row.chargeWh),
      dischargeEnergy: convertWhToKwh(row.dischargeWh),
      capacityEfficiency: normalizeNumber(row.chargeEfficiencyCe, 2),
      energyEfficiency: normalizeNumber(row.chargeEfficiencyEe, 2),
    }))
}

export const formatNullableMetric = (value: number | null | undefined, digits = 1, suffix = "") => {
  if (value == null || Number.isNaN(value)) return API_PLACEHOLDER
  return `${value.toFixed(digits)}${suffix}`
}
