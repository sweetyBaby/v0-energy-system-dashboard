import { apiClient } from "@/lib/api-client"
import { apiEndpoints } from "@/lib/api/endpoints"

export interface PowerApiResponse<T> {
  msg: string
  code: number
  data: T
}

export interface RawPowerPoint {
  time: string
  power: number | null
}

export interface PowerPoint {
  timestamp: number
  isoTime: string
  power: number | null
}

export type PowerRangeQuery = {
  projectId: string
  start: string
  end: string
}

type PowerRequestOptions = {
  signal?: AbortSignal
}

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

const toMeasurement = (projectId: string) => projectId
const toRealtimeMeasurement = (projectId: string) => `${projectId}${SYNC_SUFFIX}`

const normalizeTimestamp = (value: string) => {
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

/**
 * 将后端返回的功率点统一规整为按时间升序、去重后的结构。
 * 相同时间点以最后一条数据为准，便于增量数据覆盖同秒更新。
 */
export const normalizePowerPoints = (points: RawPowerPoint[] | null | undefined): PowerPoint[] => {
  const deduped = new Map<number, PowerPoint>()

  for (const point of points ?? []) {
    if (!point?.time) {
      continue
    }

    const timestamp = normalizeTimestamp(point.time)
    if (!timestamp) {
      continue
    }

    deduped.set(timestamp, {
      timestamp,
      isoTime: point.time,
      power: typeof point.power === "number" && !Number.isNaN(point.power) ? point.power : null,
    })
  }

  return Array.from(deduped.values()).sort((left, right) => left.timestamp - right.timestamp)
}

/**
 * 合并已有功率点与增量功率点，按时间戳去重并升序输出。
 */
export const mergePowerPoints = (base: PowerPoint[], incoming: PowerPoint[]) =>
  normalizePowerPoints([
    ...base.map((point) => ({ time: point.isoTime, power: point.power })),
    ...incoming.map((point) => ({ time: point.isoTime, power: point.power })),
  ])

/**
 * 获取今日首次加载时的全量功率数据。
 * 后端约定 measurement 需要传 `${projectId}_sync`。
 */
export const fetchTodayPowerDaily = async (projectId: string, options: PowerRequestOptions = {}) => {
  const path = buildQueryPath(apiEndpoints.power.daily, {
    measurement: toRealtimeMeasurement(projectId),
  })

  const response = await apiClient.getRaw<PowerApiResponse<RawPowerPoint[]>>(path, {
    signal: options.signal,
  })
  return normalizePowerPoints(response.data)
}

/**
 * 获取今日增量功率数据。
 * from 使用秒级 Unix 时间戳；未传时返回最近 6 秒内最新数据。
 */
export const fetchTodayPowerIncremental = async (
  projectId: string,
  fromSeconds?: number,
  options: PowerRequestOptions = {},
) => {
  const path = buildQueryPath(apiEndpoints.power.incremental, {
    measurement: toRealtimeMeasurement(projectId),
    from: fromSeconds,
  })

  const response = await apiClient.getRaw<PowerApiResponse<RawPowerPoint[]>>(path, {
    signal: options.signal,
  })
  return normalizePowerPoints(response.data)
}

/**
 * 获取历史范围功率数据。
 * 当前页面统一用它处理昨日、近 7 日和自定义日期查询。
 * 按用户联调约定，measurement 传 projectId，start/end 传 `YYYY-MM-DD`。
 */
export const fetchPowerRange = async ({ projectId, start, end }: PowerRangeQuery, options: PowerRequestOptions = {}) => {
  const path = buildQueryPath(apiEndpoints.power.range, {
    measurement: toMeasurement(projectId),
    start,
    end,
  })

  const response = await apiClient.getRaw<PowerApiResponse<RawPowerPoint[]>>(path, {
    signal: options.signal,
  })
  return normalizePowerPoints(response.data)
}
