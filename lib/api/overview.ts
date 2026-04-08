import { apiClient } from "@/lib/api-client"
import { apiEndpoints } from "@/lib/api/endpoints"
import { API_PLACEHOLDER } from "@/lib/api/project"

export type DailyListRequest = {
  projectId: string
  params: {
    beginTime: string
    endTime: string
  }
}

export type RawDailyListRow = {
  reportDate: string
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

const formatDateLabel = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const convertWhToKwh = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return null
  return Number((value / 1000).toFixed(1))
}

const normalizeNumber = (value: number | null | undefined, digits = 1) => {
  if (value == null || Number.isNaN(value)) return null
  return Number(value.toFixed(digits))
}

/**
 * 拉取综合能效统计日报。
 * 请求体与接口文档保持一致：projectId + params.beginTime + params.endTime。
 */
export const fetchOverviewDailyList = async (payload: DailyListRequest) => {
  return apiClient.postRaw<DailyListResponse>(apiEndpoints.overview.dailyList, payload)
}

/**
 * 将 `/ems/daily/list` 响应行映射为图表/表格统一数据。
 * 电量统一按 kWh 展示，效率字段保留百分比数值。
 */
export const normalizeOverviewDailyRows = (rows: RawDailyListRow[]): EfficiencyPoint[] =>
  [...rows]
    .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
    .map((row) => ({
      label: formatDateLabel(row.reportDate),
      chargeCapacity: normalizeNumber(row.chargeAh),
      dischargeCapacity: normalizeNumber(row.dischargeAh),
      chargeEnergy: convertWhToKwh(row.chargeWh),
      dischargeEnergy: convertWhToKwh(row.dischargeWh),
      capacityEfficiency: normalizeNumber(row.chargeEfficiencyCe, 2),
      energyEfficiency: normalizeNumber(row.chargeEfficiencyEe, 2),
    }))

export const formatNullableMetric = (value: number | null | undefined, digits = 1, suffix = "") => {
  if (value == null || Number.isNaN(value)) return API_PLACEHOLDER
  return `${value.toFixed(digits)}${suffix}`
}

