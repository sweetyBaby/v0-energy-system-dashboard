import { apiClient } from "@/lib/api-client"
import { apiEndpoints } from "@/lib/api/endpoints"

type RawDailyTrendSummary = {
  maxVoltageDiff?: unknown
  minVoltageDiff?: unknown
  maxTemp?: unknown
  minTemp?: unknown
  maxTempDiff?: unknown
  avgTempDiff?: unknown
  maxVoltage?: unknown
  minVoltage?: unknown
  avgVoltage?: unknown
  voltageRange?: unknown
}

type RawDailyTrendRow = {
  date?: unknown
  maxVoltageDiff?: unknown
  minVoltageDiff?: unknown
  maxTemp?: unknown
  minTemp?: unknown
  maxTempDiff?: unknown
  avgTempDiff?: unknown
  maxVoltage?: unknown
  minVoltage?: unknown
  avgVoltage?: unknown
  voltageRange?: unknown
}

type RawDailyTrendRangeData = {
  summary?: RawDailyTrendSummary | null
  dailyTrend?: RawDailyTrendRow[] | null
}

export type DailyTrendRangeSummary = {
  maxVoltageDiff: number | null
  minVoltageDiff: number | null
  maxTemp: number | null
  minTemp: number | null
  maxTempDiff: number | null
  avgTempDiff: number | null
  maxVoltage: number | null
  minVoltage: number | null
  avgVoltage: number | null
  voltageRange: number | null
}

export type DailyTrendRangePoint = DailyTrendRangeSummary & {
  date: string
  label: string
}

export type DailyTrendRangeResult = {
  summary: DailyTrendRangeSummary
  dailyTrend: DailyTrendRangePoint[]
}

const EMPTY_SUMMARY: DailyTrendRangeSummary = {
  maxVoltageDiff: null,
  minVoltageDiff: null,
  maxTemp: null,
  minTemp: null,
  maxTempDiff: null,
  avgTempDiff: null,
  maxVoltage: null,
  minVoltage: null,
  avgVoltage: null,
  voltageRange: null,
}

const toFiniteNumber = (value: unknown, digits?: number) => {
  if (value == null) return null

  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN

  if (!Number.isFinite(numericValue)) {
    return null
  }

  return typeof digits === "number" ? Number(numericValue.toFixed(digits)) : numericValue
}

const formatTrendLabel = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const normalizeSummary = (summary?: RawDailyTrendSummary | null): DailyTrendRangeSummary => ({
  maxVoltageDiff: toFiniteNumber(summary?.maxVoltageDiff, 3),
  minVoltageDiff: toFiniteNumber(summary?.minVoltageDiff, 3),
  maxTemp: toFiniteNumber(summary?.maxTemp, 2),
  minTemp: toFiniteNumber(summary?.minTemp, 2),
  maxTempDiff: toFiniteNumber(summary?.maxTempDiff, 2),
  avgTempDiff: toFiniteNumber(summary?.avgTempDiff, 2),
  maxVoltage: toFiniteNumber(summary?.maxVoltage, 3),
  minVoltage: toFiniteNumber(summary?.minVoltage, 3),
  avgVoltage: toFiniteNumber(summary?.avgVoltage, 3),
  voltageRange: toFiniteNumber(summary?.voltageRange, 3),
})

const normalizeTrendRow = (row: RawDailyTrendRow): DailyTrendRangePoint | null => {
  const date = typeof row.date === "string" ? row.date : ""
  if (!date) {
    return null
  }

  return {
    date,
    label: formatTrendLabel(date),
    maxVoltageDiff: toFiniteNumber(row.maxVoltageDiff, 3),
    minVoltageDiff: toFiniteNumber(row.minVoltageDiff, 3),
    maxTemp: toFiniteNumber(row.maxTemp, 2),
    minTemp: toFiniteNumber(row.minTemp, 2),
    maxTempDiff: toFiniteNumber(row.maxTempDiff, 2),
    avgTempDiff: toFiniteNumber(row.avgTempDiff, 2),
    maxVoltage: toFiniteNumber(row.maxVoltage, 3),
    minVoltage: toFiniteNumber(row.minVoltage, 3),
    avgVoltage: toFiniteNumber(row.avgVoltage, 3),
    voltageRange: toFiniteNumber(row.voltageRange, 3),
  }
}

export const formatAnalysisRangeDate = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}${month}${day}`
}

export const getAnalysisRangeDates = (days: number, now = new Date()) => {
  const endDate = new Date(now)
  const startDate = new Date(now)
  startDate.setDate(endDate.getDate() - Math.max(days - 1, 0))

  return {
    startDate: formatAnalysisRangeDate(startDate),
    endDate: formatAnalysisRangeDate(endDate),
  }
}

export const fetchDailyTrendRange = async (
  projectId: string,
  startDate: string,
  endDate: string,
  options?: { deviceId?: string; signal?: AbortSignal }
): Promise<DailyTrendRangeResult> => {
  const params = new URLSearchParams({
    projectId,
    startDate,
    endDate,
  })

  if (options?.deviceId) {
    params.set("deviceId", options.deviceId)
  }

  const response = await apiClient.get<RawDailyTrendRangeData>(
    `${apiEndpoints.analysis.dailyTrendRange}?${params.toString()}`,
    options?.signal ? { signal: options.signal } : undefined
  )

  const data = response.data

  return {
    summary: data?.summary ? normalizeSummary(data.summary) : EMPTY_SUMMARY,
    dailyTrend: (data?.dailyTrend ?? [])
      .map((row) => normalizeTrendRow(row))
      .filter((row): row is DailyTrendRangePoint => row !== null),
  }
}
