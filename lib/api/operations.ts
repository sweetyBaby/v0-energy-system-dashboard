import { apiClient } from "@/lib/api-client"
import { apiEndpoints } from "@/lib/api/endpoints"

type OperationsApiResponse<T> = {
  msg: string
  code: number
  data: T
}

type RequestOptions = {
  signal?: AbortSignal
}

type AuxRealtimePoint = {
  time: string
  packCurrent: number | null
  packVoltage: number | null
  systemSoc: number | null
  power: number | null
}

type CellVoltagePoint = {
  time: string
  maxCellVolt: number | null
  minCellVolt: number | null
}

type CellTemperaturePoint = {
  time: string
  maxCellTemp: number | null
  minCellTemp: number | null
}

export type OperationTrendPoint = {
  timestamp: number
  isoTime: string
  time: string
  voltage: number | null
  current: number | null
  soc: number | null
  power: number | null
  maxTemp: number | null
  minTemp: number | null
  maxCell: number | null
  minCell: number | null
}

type RecentBundle = {
  auxPoints: AuxRealtimePoint[]
  cellVoltagePoints: CellVoltagePoint[]
  cellTemperaturePoints: CellTemperaturePoint[]
}

type IncrementalBundle = RecentBundle

export type OperationsCursor = {
  auxSince?: number
  cellVoltageSince?: number
  cellTemperatureSeconds?: number
  cellTemperatureNanos?: number
}

const FIVE_MINUTES_MS = 5 * 60 * 1000
const MERGE_ALIGNMENT_TOLERANCE_MS = 30 * 1000
const SYNC_SUFFIX = "_sync"

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

const parseTimestamp = (value: string) => {
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const toSeconds = (timestamp: number) => Math.floor(timestamp / 1000)

const toNanos = (timestamp: number) => {
  const milliseconds = ((timestamp % 1000) + 1000) % 1000
  return milliseconds * 1_000_000
}

const formatTimeLabel = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(
    date.getSeconds(),
  ).padStart(2, "0")}`
}

const toFiniteNumber = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null
  }

  return value
}

const emptyTrendPoint = (isoTime: string, timestamp: number): OperationTrendPoint => ({
  timestamp,
  isoTime,
  time: formatTimeLabel(isoTime),
  voltage: null,
  current: null,
  soc: null,
  power: null,
  maxTemp: null,
  minTemp: null,
  maxCell: null,
  minCell: null,
})

const sortTrendPoints = (points: OperationTrendPoint[]) =>
  points
    .filter((point) => point.timestamp > 0)
    .sort((left, right) => left.timestamp - right.timestamp)

const trimRecentWindow = (points: OperationTrendPoint[]) => {
  if (points.length === 0) {
    return points
  }

  const latestTimestamp = points[points.length - 1].timestamp
  const threshold = latestTimestamp - FIVE_MINUTES_MS
  return points.filter((point) => point.timestamp >= threshold)
}

const hasPrimaryTrendMetrics = (point: OperationTrendPoint) =>
  point.current != null || point.voltage != null || point.soc != null || point.power != null

const getAlignmentTimestamps = (merged: Map<number, OperationTrendPoint>) => {
  const primaryTimestamps: number[] = []

  for (const [timestamp, point] of merged) {
    if (hasPrimaryTrendMetrics(point)) {
      primaryTimestamps.push(timestamp)
    }
  }

  return primaryTimestamps.length > 0 ? primaryTimestamps : Array.from(merged.keys())
}

const findNearestTimestamp = (timestamps: number[], target: number) => {
  let nearest = target
  let nearestDistance = Number.POSITIVE_INFINITY

  for (const timestamp of timestamps) {
    const distance = Math.abs(timestamp - target)

    if (distance < nearestDistance) {
      nearest = timestamp
      nearestDistance = distance
    }
  }

  return nearestDistance <= MERGE_ALIGNMENT_TOLERANCE_MS ? nearest : target
}

const resolveMergedTimestamp = (merged: Map<number, OperationTrendPoint>, target: number) =>
  findNearestTimestamp(getAlignmentTimestamps(merged), target)

export const mergeOperationTrendData = (
  base: OperationTrendPoint[],
  updates: Partial<RecentBundle | IncrementalBundle>,
) => {
  const merged = new Map<number, OperationTrendPoint>()

  for (const point of base) {
    merged.set(point.timestamp, { ...point })
  }

  for (const point of updates.auxPoints ?? []) {
    const timestamp = parseTimestamp(point.time)
    if (!timestamp) continue

    const next = merged.get(timestamp) ?? emptyTrendPoint(point.time, timestamp)
    next.current = toFiniteNumber(point.packCurrent)
    next.voltage = toFiniteNumber(point.packVoltage)
    next.soc = toFiniteNumber(point.systemSoc)
    next.power = toFiniteNumber(point.power)
    merged.set(timestamp, next)
  }

  for (const point of updates.cellVoltagePoints ?? []) {
    const timestamp = parseTimestamp(point.time)
    if (!timestamp) continue

    const resolvedTimestamp = resolveMergedTimestamp(merged, timestamp)
    const next = merged.get(resolvedTimestamp) ?? emptyTrendPoint(point.time, resolvedTimestamp)
    next.maxCell = point.maxCellVolt == null ? null : Number(point.maxCellVolt) / 1000
    next.minCell = point.minCellVolt == null ? null : Number(point.minCellVolt) / 1000
    merged.set(resolvedTimestamp, next)
  }

  for (const point of updates.cellTemperaturePoints ?? []) {
    const timestamp = parseTimestamp(point.time)
    if (!timestamp) continue

    const resolvedTimestamp = resolveMergedTimestamp(merged, timestamp)
    const next = merged.get(resolvedTimestamp) ?? emptyTrendPoint(point.time, resolvedTimestamp)
    next.maxTemp = toFiniteNumber(point.maxCellTemp)
    next.minTemp = toFiniteNumber(point.minCellTemp)
    merged.set(resolvedTimestamp, next)
  }

  return trimRecentWindow(sortTrendPoints(Array.from(merged.values())))
}

const getLatestTimestamp = <T extends { time: string }>(points: T[]) => {
  const latest = points.reduce((current, point) => {
    const timestamp = parseTimestamp(point.time)
    return timestamp > current ? timestamp : current
  }, 0)

  return latest || undefined
}

export const getOperationsCursorFromBundle = (bundle: RecentBundle | IncrementalBundle): OperationsCursor => {
  const auxTimestamp = getLatestTimestamp(bundle.auxPoints)
  const cellVoltageTimestamp = getLatestTimestamp(bundle.cellVoltagePoints)
  const cellTemperatureTimestamp = getLatestTimestamp(bundle.cellTemperaturePoints)

  return {
    auxSince: auxTimestamp ? toSeconds(auxTimestamp) : undefined,
    cellVoltageSince: cellVoltageTimestamp ? toSeconds(cellVoltageTimestamp) : undefined,
    cellTemperatureSeconds: cellTemperatureTimestamp ? toSeconds(cellTemperatureTimestamp) : undefined,
    cellTemperatureNanos: cellTemperatureTimestamp ? toNanos(cellTemperatureTimestamp) : undefined,
  }
}

export const fetchAuxRecent = async (projectId: string, options: RequestOptions = {}) => {
  const path = buildQueryPath(apiEndpoints.operations.auxRecent, {
    measurement: toMeasurement(projectId),
  })

  const response = await apiClient.getRaw<OperationsApiResponse<AuxRealtimePoint[]>>(path, {
    signal: options.signal,
  })

  return response.data ?? []
}

export const fetchAuxIncremental = async (
  projectId: string,
  since?: number,
  options: RequestOptions = {},
) => {
  const path = buildQueryPath(apiEndpoints.operations.auxIncremental, {
    measurement: toMeasurement(projectId),
    since,
  })

  const response = await apiClient.getRaw<OperationsApiResponse<AuxRealtimePoint[]>>(path, {
    signal: options.signal,
  })

  return response.data ?? []
}

export const fetchCellVoltageRecent = async (projectId: string, options: RequestOptions = {}) => {
  const path = buildQueryPath(apiEndpoints.operations.cellVoltageRecent, {
    measurement: toMeasurement(projectId),
  })

  const response = await apiClient.getRaw<OperationsApiResponse<CellVoltagePoint[]>>(path, {
    signal: options.signal,
  })

  return response.data ?? []
}

export const fetchCellVoltageIncremental = async (
  projectId: string,
  since?: number,
  options: RequestOptions = {},
) => {
  const path = buildQueryPath(apiEndpoints.operations.cellVoltageIncremental, {
    measurement: toMeasurement(projectId),
    since,
  })

  const response = await apiClient.getRaw<OperationsApiResponse<CellVoltagePoint[]>>(path, {
    signal: options.signal,
  })

  return response.data ?? []
}

export const fetchCellTemperatureRecent = async (projectId: string, options: RequestOptions = {}) => {
  const path = buildQueryPath(apiEndpoints.operations.cellTemperatureRecent, {
    measurement: toMeasurement(projectId),
  })

  const response = await apiClient.getRaw<OperationsApiResponse<CellTemperaturePoint[]>>(path, {
    signal: options.signal,
  })

  return response.data ?? []
}

export const fetchCellTemperatureIncremental = async (
  projectId: string,
  cursor: Pick<OperationsCursor, "cellTemperatureSeconds" | "cellTemperatureNanos">,
  options: RequestOptions = {},
) => {
  const path = buildQueryPath(apiEndpoints.operations.cellTemperatureIncremental, {
    measurement: toMeasurement(projectId),
    seconds: cursor.cellTemperatureSeconds,
    nanos: cursor.cellTemperatureNanos,
  })

  const response = await apiClient.getRaw<OperationsApiResponse<CellTemperaturePoint[]>>(path, {
    signal: options.signal,
  })

  return response.data ?? []
}

const toBundleFromSettled = (
  settled: [
    PromiseSettledResult<AuxRealtimePoint[]>,
    PromiseSettledResult<CellVoltagePoint[]>,
    PromiseSettledResult<CellTemperaturePoint[]>,
  ],
) => ({
  auxPoints: settled[0].status === "fulfilled" ? settled[0].value : [],
  cellVoltagePoints: settled[1].status === "fulfilled" ? settled[1].value : [],
  cellTemperaturePoints: settled[2].status === "fulfilled" ? settled[2].value : [],
})

export const fetchOperationsRecentBundle = async (projectId: string, options: RequestOptions = {}) => {
  const settled = (await Promise.allSettled([
    fetchAuxRecent(projectId, options),
    fetchCellVoltageRecent(projectId, options),
    fetchCellTemperatureRecent(projectId, options),
  ])) as [
    PromiseSettledResult<AuxRealtimePoint[]>,
    PromiseSettledResult<CellVoltagePoint[]>,
    PromiseSettledResult<CellTemperaturePoint[]>,
  ]

  const bundle = toBundleFromSettled(settled)
  return bundle
}

export const fetchOperationsIncrementalBundle = async (
  projectId: string,
  cursor: OperationsCursor,
  options: RequestOptions = {},
) => {
  const settled = (await Promise.allSettled([
    fetchAuxIncremental(projectId, cursor.auxSince, options),
    fetchCellVoltageIncremental(projectId, cursor.cellVoltageSince, options),
    fetchCellTemperatureIncremental(
      projectId,
      {
        cellTemperatureSeconds: cursor.cellTemperatureSeconds,
        cellTemperatureNanos: cursor.cellTemperatureNanos,
      },
      options,
    ),
  ])) as [
    PromiseSettledResult<AuxRealtimePoint[]>,
    PromiseSettledResult<CellVoltagePoint[]>,
    PromiseSettledResult<CellTemperaturePoint[]>,
  ]

  return toBundleFromSettled(settled)
}
