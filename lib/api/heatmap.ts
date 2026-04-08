import { apiClient } from "@/lib/api-client"
import { apiEndpoints } from "@/lib/api/endpoints"

type HeatmapApiResponse<T> = {
  msg?: string
  message?: string
  code?: number
  data?: T | null
}

type RequestOptions = {
  signal?: AbortSignal
}

type LatestHeatmapPayload = Record<string, unknown>

export type HeatmapCellMetrics = {
  id: number
  voltage: number | null
  temp1: number | null
  temp2: number | null
  temp3: number | null
}

const CELL_COUNT = 50
const SUCCESS_CODE = 200
const SYNC_SUFFIX = "_sync"

const isAbortError = (error: unknown) =>
  error instanceof DOMException
    ? error.name === "AbortError"
    : typeof error === "object" &&
      error !== null &&
      "name" in error &&
      typeof error.name === "string" &&
      error.name === "AbortError"

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

const toMeasurement = (projectId: string) => `${projectId}${SYNC_SUFFIX}`

const toFiniteNumber = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }

    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const normalizeVoltage = (value: unknown) => {
  const parsed = toFiniteNumber(value)
  if (parsed == null) {
    return null
  }

  return Math.abs(parsed) > 100 ? parsed / 1000 : parsed
}

const readIndexedValue = (
  payload: LatestHeatmapPayload | null,
  prefix: "T" | "V",
  index: number,
  normalizer: (value: unknown) => number | null,
) => {
  if (!payload) {
    return null
  }

  return normalizer(payload[`${prefix}${index}`])
}

const assertSuccessfulResponse = (response: HeatmapApiResponse<LatestHeatmapPayload>, path: string) => {
  if (response.code !== SUCCESS_CODE) {
    throw new Error(response.msg || response.message || `Heatmap request failed: ${path}`)
  }
}

const fetchLatestPayload = async (path: string, projectId: string, options: RequestOptions = {}) => {
  const queryPath = buildQueryPath(path, {
    measurement: toMeasurement(projectId),
  })

  const response = await apiClient.getRaw<HeatmapApiResponse<LatestHeatmapPayload>>(queryPath, {
    signal: options.signal,
  })

  assertSuccessfulResponse(response, path)

  if (!response.data || typeof response.data !== "object") {
    return null
  }

  return response.data
}

export const createEmptyHeatmapCells = (): HeatmapCellMetrics[] =>
  Array.from({ length: CELL_COUNT }, (_, index) => ({
    id: index + 1,
    voltage: null,
    temp1: null,
    temp2: null,
    temp3: null,
  }))

export const hasAnyHeatmapValue = (cells: HeatmapCellMetrics[]) =>
  cells.some((cell) => cell.voltage != null || cell.temp1 != null || cell.temp2 != null || cell.temp3 != null)

export const fetchLatestHeatmap = async (projectId: string, options: RequestOptions = {}) => {
  const settled = await Promise.allSettled([
    fetchLatestPayload(apiEndpoints.heatmap.temp1Latest, projectId, options),
    fetchLatestPayload(apiEndpoints.heatmap.temp2Latest, projectId, options),
    fetchLatestPayload(apiEndpoints.heatmap.temp3Latest, projectId, options),
    fetchLatestPayload(apiEndpoints.heatmap.cellLatest, projectId, options),
  ])

  const [temp1Result, temp2Result, temp3Result, voltageResult] = settled
  const succeededCount = settled.filter((result) => result.status === "fulfilled").length

  if (succeededCount === 0) {
    const rejectedResults = settled.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    )

    if (rejectedResults.every((result) => isAbortError(result.reason)) || options.signal?.aborted) {
      throw rejectedResults[0]?.reason ?? new DOMException("Aborted", "AbortError")
    }

    return createEmptyHeatmapCells()
  }

  const temp1Payload = temp1Result.status === "fulfilled" ? temp1Result.value : null
  const temp2Payload = temp2Result.status === "fulfilled" ? temp2Result.value : null
  const temp3Payload = temp3Result.status === "fulfilled" ? temp3Result.value : null
  const voltagePayload = voltageResult.status === "fulfilled" ? voltageResult.value : null

  return createEmptyHeatmapCells().map((cell) => ({
    ...cell,
    voltage: readIndexedValue(voltagePayload, "V", cell.id, normalizeVoltage),
    temp1: readIndexedValue(temp1Payload, "T", cell.id, toFiniteNumber),
    temp2: readIndexedValue(temp2Payload, "T", cell.id, toFiniteNumber),
    temp3: readIndexedValue(temp3Payload, "T", cell.id, toFiniteNumber),
  }))
}
