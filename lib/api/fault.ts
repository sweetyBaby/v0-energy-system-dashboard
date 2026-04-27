import { apiClient } from "@/lib/api-client"
import { apiEndpoints } from "@/lib/api/endpoints"

type FaultDetailListResponse = {
  total?: number
  rows?: RawFaultDetailRow[] | null
  code?: number
  msg?: string
  message?: string
}

type FaultListResponse = {
  total?: number
  rows?: RawFaultListRow[] | null
  code?: number
  msg?: string
  message?: string
}

type RawFaultDetailRow = {
  id?: string | null
  projectId?: string | null
  deviceId?: string | null
  statDate?: string | null
  faultName?: string | null
  level?: string | null
  totalDuration?: number | string | null
  occurrenceRatio?: number | string | null
  timeIntervals?: string | RawFaultTimeInterval[] | null
}

type RawFaultListRow = {
  id?: string | null
  projectId?: string | null
  deviceId?: string | null
  statDate?: string | null
  faultCode?: string | null
  faultName?: string | null
  level?: string | null
  firstOccur?: string | null
  lastOccur?: string | null
  windowDuration?: number | string | null
  rows?: number | string | null
}

type RawFaultTimeInterval = {
  start?: string | null
  end?: string | null
  duration?: number | string | null
}

type RequestOptions = {
  deviceId?: string
  signal?: AbortSignal
}

export type FaultDetailInterval = {
  start: string
  end: string
  durationSeconds: number
}

export type FaultDetailItem = {
  id: string
  projectId: string
  deviceId: string
  statDate: string
  faultName: string
  level: string
  levelValue: number
  totalDurationSeconds: number
  occurrenceRatio: number | null
  timeIntervals: FaultDetailInterval[]
}

export type FaultListItem = {
  id: string
  projectId: string
  deviceId: string
  statDate: string
  faultCode: string
  faultName: string
  level: string
  levelValue: number
  firstOccur: string
  lastOccur: string
  windowDurationSeconds: number
  rowCount: number
}

const SUCCESS_CODE = 200

const buildQueryPath = (path: string, params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value))
    }
  })

  const query = search.toString()
  return query ? `${path}?${query}` : path
}

const toSafeString = (value: unknown) => (typeof value === "string" ? value.trim() : "")

const toFiniteNumber = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null

    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const clampLevel = (value: number | null) => {
  if (value == null) return 0

  const normalized = Math.round(value)
  return normalized >= 1 && normalized <= 5 ? normalized : 0
}

const parseLevelValue = (value: unknown) => {
  if (typeof value === "number") {
    return clampLevel(value)
  }

  if (typeof value === "string") {
    const direct = toFiniteNumber(value)
    if (direct != null) {
      return clampLevel(direct)
    }

    const match = value.match(/(\d+)/)
    return clampLevel(match ? Number(match[1]) : null)
  }

  return 0
}

const parseTimeIntervals = (value: RawFaultDetailRow["timeIntervals"]): FaultDetailInterval[] => {
  let rawIntervals: RawFaultTimeInterval[] = []

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) {
      return []
    }

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        rawIntervals = parsed
      }
    } catch {
      return []
    }
  } else if (Array.isArray(value)) {
    rawIntervals = value
  }

  return rawIntervals
    .map((interval) => {
      const start = toSafeString(interval?.start)
      const end = toSafeString(interval?.end)
      const durationSeconds = Math.max(0, Math.round(toFiniteNumber(interval?.duration) ?? 0))

      if (!start || !end) {
        return null
      }

      return {
        start,
        end,
        durationSeconds,
      } satisfies FaultDetailInterval
    })
    .filter((interval): interval is FaultDetailInterval => interval !== null)
}

const assertSuccessfulResponse = (response: { code?: number; msg?: string; message?: string }, path: string) => {
  if (response.code !== SUCCESS_CODE) {
    throw new Error(response.msg || response.message || `Fault detail request failed: ${path}`)
  }
}

export const fetchFaultDetailList = async (projectId: string, statDate: string, options: RequestOptions = {}) => {
  const queryPath = buildQueryPath(apiEndpoints.fault.detailList, {
    projectId,
    deviceId: options.deviceId,
    statDate,
  })

  const response = await apiClient.getRaw<FaultDetailListResponse>(queryPath, {
    signal: options.signal,
  })

  assertSuccessfulResponse(response, apiEndpoints.fault.detailList)

  return (response.rows ?? []).map((row, index) => ({
    id: toSafeString(row.id) || `fault-${index + 1}`,
    projectId: toSafeString(row.projectId) || projectId,
    deviceId: toSafeString(row.deviceId),
    statDate: toSafeString(row.statDate) || statDate,
    faultName: toSafeString(row.faultName) || `Fault ${index + 1}`,
    level: toSafeString(row.level) || "Other Level",
    levelValue: parseLevelValue(row.level),
    totalDurationSeconds: Math.max(0, Math.round(toFiniteNumber(row.totalDuration) ?? 0)),
    occurrenceRatio: toFiniteNumber(row.occurrenceRatio),
    timeIntervals: parseTimeIntervals(row.timeIntervals),
  })) satisfies FaultDetailItem[]
}

export const fetchFaultList = async (projectId: string, statDate: string, options: RequestOptions = {}) => {
  const queryPath = buildQueryPath(apiEndpoints.fault.list, {
    projectId,
    deviceId: options.deviceId,
    statDate,
  })

  const response = await apiClient.getRaw<FaultListResponse>(queryPath, {
    signal: options.signal,
  })

  assertSuccessfulResponse(response, apiEndpoints.fault.list)

  return (response.rows ?? []).map((row, index) => ({
    id: toSafeString(row.id) || `fault-list-${index + 1}`,
    projectId: toSafeString(row.projectId) || projectId,
    deviceId: toSafeString(row.deviceId),
    statDate: toSafeString(row.statDate) || statDate,
    faultCode: toSafeString(row.faultCode),
    faultName: toSafeString(row.faultName) || `Fault ${index + 1}`,
    level: toSafeString(row.level) || "Other Level",
    levelValue: parseLevelValue(row.level),
    firstOccur: toSafeString(row.firstOccur),
    lastOccur: toSafeString(row.lastOccur),
    windowDurationSeconds: Math.max(0, Math.round(toFiniteNumber(row.windowDuration) ?? 0)),
    rowCount: Math.max(0, Math.round(toFiniteNumber(row.rows) ?? 0)),
  })) satisfies FaultListItem[]
}
