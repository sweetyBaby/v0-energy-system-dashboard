/**
 * Trend-analysis data source for the "趋势分析" dashboard tab.
 *
 * NOTE: there is no backend endpoint for this view yet. {@link fetchTrendSeries}
 * currently generates realistic mocked time-series locally. When the real API
 * lands, replace the body of {@link fetchTrendSeries} with an `apiClient.get`
 * call (add the path to `apiEndpoints.analysis`) and map the response into
 * {@link TrendFetchResult}. The public types and signature are designed to stay
 * stable across that swap so the panel does not need to change.
 */

export type TrendVariableKey =
  | "clusterVoltage"
  | "clusterCurrent"
  | "soc"
  | "soh"
  | "maxCellVoltage"
  | "minCellVoltage"
  | "maxTemp"
  | "minTemp"
  | "voltageDiff"
  | "tempDiff"

export type TrendVariableMeta = {
  key: TrendVariableKey
  nameZh: string
  nameEn: string
  unit: string
  /** Plausible operating band used to seed the mock random-walk. */
  min: number
  max: number
  /** Decimal places used when formatting values. */
  digits: number
}

/**
 * Catalog of measurement points available for every device (BCU/BMS) of the
 * current site. The tree on the left of the panel is the cross product of the
 * site's device list and this catalog (e.g. `BCU1.簇电压`).
 */
export const TREND_VARIABLES: TrendVariableMeta[] = [
  { key: "clusterVoltage", nameZh: "簇电压", nameEn: "Cluster Voltage", unit: "V", min: 680, max: 780, digits: 1 },
  { key: "clusterCurrent", nameZh: "簇电流", nameEn: "Cluster Current", unit: "A", min: -250, max: 250, digits: 1 },
  { key: "soc", nameZh: "SOC", nameEn: "SOC", unit: "%", min: 12, max: 96, digits: 1 },
  { key: "soh", nameZh: "SOH", nameEn: "SOH", unit: "%", min: 95, max: 100, digits: 2 },
  { key: "maxCellVoltage", nameZh: "最高单体电压", nameEn: "Max Cell Voltage", unit: "V", min: 3.25, max: 3.42, digits: 3 },
  { key: "minCellVoltage", nameZh: "最低单体电压", nameEn: "Min Cell Voltage", unit: "V", min: 3.18, max: 3.35, digits: 3 },
  { key: "maxTemp", nameZh: "最高温度", nameEn: "Max Temp", unit: "℃", min: 24, max: 42, digits: 1 },
  { key: "minTemp", nameZh: "最低温度", nameEn: "Min Temp", unit: "℃", min: 20, max: 36, digits: 1 },
  { key: "voltageDiff", nameZh: "压差", nameEn: "Voltage Diff", unit: "mV", min: 6, max: 58, digits: 0 },
  { key: "tempDiff", nameZh: "温差", nameEn: "Temp Diff", unit: "℃", min: 0.4, max: 6, digits: 1 },
]

export const TREND_VARIABLE_BY_KEY: Record<TrendVariableKey, TrendVariableMeta> = TREND_VARIABLES.reduce(
  (acc, item) => {
    acc[item.key] = item
    return acc
  },
  {} as Record<TrendVariableKey, TrendVariableMeta>
)

/** Number of cells (电芯) under each rack/BCU. Matches the cell-history view. */
export const CELL_COUNT = 50

export type CellVarKey = "voltage" | "temp1" | "temp2" | "temp3"

export type CellVariableMeta = {
  key: CellVarKey
  nameZh: string
  nameEn: string
  unit: string
  min: number
  max: number
  digits: number
}

/** Per-cell measurement points: 1 voltage + 3 temperatures. */
export const CELL_VARIABLES: CellVariableMeta[] = [
  { key: "voltage", nameZh: "电压", nameEn: "Voltage", unit: "V", min: 3.18, max: 3.42, digits: 3 },
  { key: "temp1", nameZh: "温度1", nameEn: "Temp 1", unit: "℃", min: 20, max: 40, digits: 1 },
  { key: "temp2", nameZh: "温度2", nameEn: "Temp 2", unit: "℃", min: 20, max: 40, digits: 1 },
  { key: "temp3", nameZh: "温度3", nameEn: "Temp 3", unit: "℃", min: 20, max: 40, digits: 1 },
]

export const CELL_VARIABLE_BY_KEY: Record<CellVarKey, CellVariableMeta> = CELL_VARIABLES.reduce(
  (acc, item) => {
    acc[item.key] = item
    return acc
  },
  {} as Record<CellVarKey, CellVariableMeta>
)

/**
 * Sampling interval, in seconds, used to space the returned points.
 * `0` is the "原始 / Raw" mode (no down-sampling — return the densest series).
 */
export type TrendIntervalSeconds = 0 | 300 | 600 | 900 | 1800 | 3600 | 86400

export const TREND_INTERVAL_RAW: TrendIntervalSeconds = 0

export const TREND_INTERVALS: { value: TrendIntervalSeconds; zh: string; en: string }[] = [
  { value: 0, zh: "原始", en: "Raw" },
  { value: 300, zh: "5分钟", en: "5 min" },
  { value: 600, zh: "10分钟", en: "10 min" },
  { value: 900, zh: "15分钟", en: "15 min" },
  { value: 1800, zh: "30分钟", en: "30 min" },
  { value: 3600, zh: "1小时", en: "1 hour" },
  { value: 86400, zh: "1天", en: "1 day" },
]

/** Default working window for a fresh trend query: the last 12 hours. */
export const TREND_DEFAULT_RANGE_MS = 12 * 60 * 60 * 1000

/** Base cadence (seconds) used to synthesize "原始/Raw" mock points. */
const RAW_BASE_INTERVAL_SECONDS = 60

/**
 * A selectable tree leaf. Either a device/rack-level measurement point, or a
 * per-cell measurement point (cell index is 1-based).
 */
export type TrendNode =
  | { kind: "device"; deviceId: string; variableKey: TrendVariableKey }
  | { kind: "cell"; deviceId: string; cell: number; cellVar: CellVarKey }

const DEV_MARKER = "::dev::"
const CELL_MARKER = "::cell::"

/** Encode a device/rack-level leaf as `${deviceId}::dev::${variableKey}`. */
export const buildDeviceNodeId = (deviceId: string, variableKey: TrendVariableKey) =>
  `${deviceId}${DEV_MARKER}${variableKey}`

/** Encode a cell-level leaf as `${deviceId}::cell::${cell}::${cellVar}`. */
export const buildCellNodeId = (deviceId: string, cell: number, cellVar: CellVarKey) =>
  `${deviceId}${CELL_MARKER}${cell}::${cellVar}`

export const parseTrendNodeId = (nodeId: string): TrendNode | null => {
  if (nodeId.includes(DEV_MARKER)) {
    const index = nodeId.indexOf(DEV_MARKER)
    const deviceId = nodeId.slice(0, index)
    const variableKey = nodeId.slice(index + DEV_MARKER.length) as TrendVariableKey
    if (!deviceId || !TREND_VARIABLE_BY_KEY[variableKey]) return null
    return { kind: "device", deviceId, variableKey }
  }
  if (nodeId.includes(CELL_MARKER)) {
    const index = nodeId.indexOf(CELL_MARKER)
    const deviceId = nodeId.slice(0, index)
    const rest = nodeId.slice(index + CELL_MARKER.length)
    const separator = rest.indexOf("::")
    if (separator < 0) return null
    const cell = Number(rest.slice(0, separator))
    const cellVar = rest.slice(separator + 2) as CellVarKey
    if (!deviceId || !Number.isInteger(cell) || !CELL_VARIABLE_BY_KEY[cellVar]) return null
    return { kind: "cell", deviceId, cell, cellVar }
  }
  return null
}

export type TrendNodeMeta = {
  /** Stable key used to seed the mock generator. */
  seedKey: string
  nameZh: string
  nameEn: string
  unit: string
  min: number
  max: number
  digits: number
}

/** Resolve a node to its display + value metadata (full leaf label incl. cell). */
export const resolveNodeMeta = (node: TrendNode): TrendNodeMeta => {
  if (node.kind === "device") {
    const meta = TREND_VARIABLE_BY_KEY[node.variableKey]
    return {
      seedKey: `${node.deviceId}:dev:${node.variableKey}`,
      nameZh: meta.nameZh,
      nameEn: meta.nameEn,
      unit: meta.unit,
      min: meta.min,
      max: meta.max,
      digits: meta.digits,
    }
  }
  const meta = CELL_VARIABLE_BY_KEY[node.cellVar]
  return {
    seedKey: `${node.deviceId}:cell:${node.cell}:${node.cellVar}`,
    nameZh: `电芯${node.cell} ${meta.nameZh}`,
    nameEn: `Cell ${node.cell} ${meta.nameEn}`,
    unit: meta.unit,
    min: meta.min,
    max: meta.max,
    digits: meta.digits,
  }
}

export type TrendSelection = {
  /** Stable id == build*NodeId(...). */
  nodeId: string
  deviceId: string
  deviceName: string
  node: TrendNode
}

export type TrendSeries = {
  /** Stable id == selection.nodeId. */
  id: string
  deviceId: string
  deviceName: string
  nameZh: string
  nameEn: string
  unit: string
  digits: number
  /** Values aligned 1:1 with {@link TrendFetchResult.timestamps}; null = gap. */
  values: (number | null)[]
}

export type TrendFetchResult = {
  /** Epoch milliseconds for each sample, ascending. */
  timestamps: number[]
  series: TrendSeries[]
}

export type FetchTrendSeriesParams = {
  projectId: string
  selections: TrendSelection[]
  startTime: number
  endTime: number
  intervalSeconds: TrendIntervalSeconds
  signal?: AbortSignal
}

/** Hard cap on points per series so the chart stays responsive (downsampling). */
const MAX_POINTS = 1500

const buildTimestamps = (startTime: number, endTime: number, intervalSeconds: number): number[] => {
  const span = Math.max(0, endTime - startTime)
  const effectiveInterval = intervalSeconds === TREND_INTERVAL_RAW ? RAW_BASE_INTERVAL_SECONDS : intervalSeconds
  let stepMs = effectiveInterval * 1000
  const rawCount = Math.floor(span / stepMs) + 1

  if (rawCount > MAX_POINTS) {
    // Coarsen the step instead of returning thousands of DOM-heavy points.
    stepMs = Math.ceil(span / (MAX_POINTS - 1))
  }

  const timestamps: number[] = []
  for (let time = startTime; time <= endTime; time += stepMs) {
    timestamps.push(time)
  }
  if (timestamps[timestamps.length - 1] !== endTime) {
    timestamps.push(endTime)
  }
  return timestamps
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const roundTo = (value: number, digits: number) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

// A cheap deterministic hash so each device/variable starts from a stable phase
// while the random walk still varies between refreshes.
const hashSeed = (input: string) => {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

/**
 * Generate a believable curve for one measurement point: a slow daily
 * sinusoid (load cycle) plus a bounded random walk plus a little noise.
 */
const buildMockValues = (
  meta: TrendNodeMeta,
  timestamps: number[]
): (number | null)[] => {
  const span = meta.max - meta.min
  const mid = meta.min + span / 2
  const phase = hashSeed(meta.seedKey) * Math.PI * 2
  const amplitude = span * 0.32
  const dayMs = 24 * 60 * 60 * 1000

  let walk = 0
  const maxWalk = span * 0.18

  return timestamps.map((time) => {
    const cyclic = Math.sin((time / dayMs) * Math.PI * 2 + phase) * amplitude
    walk = clamp(walk + (Math.random() - 0.5) * span * 0.05, -maxWalk, maxWalk)
    const noise = (Math.random() - 0.5) * span * 0.04
    const value = clamp(mid + cyclic + walk + noise, meta.min, meta.max)
    return roundTo(value, meta.digits)
  })
}

const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException("Aborted", "AbortError"))
    }
    signal?.addEventListener("abort", onAbort, { once: true })
  })

export const fetchTrendSeries = async ({
  selections,
  startTime,
  endTime,
  intervalSeconds,
  signal,
}: FetchTrendSeriesParams): Promise<TrendFetchResult> => {
  // TODO(api): replace this mock body with a real request, e.g.
  //   const response = await apiClient.get(`${apiEndpoints.analysis.trendSeries}?...`, { signal })
  //   return normalizeTrendResponse(response.data)
  await delay(420, signal)

  const timestamps = buildTimestamps(startTime, endTime, intervalSeconds)

  const series: TrendSeries[] = selections.map((selection) => {
    const meta = resolveNodeMeta(selection.node)
    return {
      id: selection.nodeId,
      deviceId: selection.deviceId,
      deviceName: selection.deviceName,
      nameZh: meta.nameZh,
      nameEn: meta.nameEn,
      unit: meta.unit,
      digits: meta.digits,
      values: buildMockValues(meta, timestamps),
    }
  })

  return { timestamps, series }
}

/** Start-of-today epoch ms — the left edge of the device-status (intraday) chart. */
export const startOfToday = (now = Date.now()) => {
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}
