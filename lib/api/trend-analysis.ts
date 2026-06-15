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
  | "insulationResistance"
  | "soc"
  | "soh"
  | "dayChargeEnergy"
  | "dayDischargeEnergy"
  | "maxCellVoltage"
  | "minCellVoltage"
  | "avgCellVoltage"
  | "voltageDiff"
  | "maxTemp"
  | "minTemp"
  | "avgTemp"
  | "tempDiff"
  | "pcsDcVoltage"
  | "pcsDcCurrent"
  | "pcsDcPower"
  | "pcsAcPower"
  | "pcsAcReactivePower"
  | "pcsAcVoltage"
  | "pcsAcCurrent"
  | "pcsFrequency"
  | "pcsTemperature"
  | "pcsEfficiency"
  | "emsCommandPower"
  | "emsGridPower"
  | "emsLoadPower"
  | "emsSocTarget"
  | "emsSystemEfficiency"
  | "emsAlarmCount"

export type MonitorDeviceKind = "rack" | "pcs" | "ems" | "other"

/**
 * Logical sub-section a variable belongs to. The device-variable tree renders a
 * small header per group so a device's (now fairly long) measurement list stays
 * scannable. Add a new key here + a label in {@link TREND_VARIABLE_GROUPS}.
 */
export type TrendVariableGroup =
  | "electrical"
  | "state"
  | "cellVoltage"
  | "temperature"
  | "pcsDc"
  | "pcsAc"
  | "pcsState"
  | "emsPower"
  | "emsState"

export const TREND_VARIABLE_GROUPS: Record<TrendVariableGroup, { zh: string; en: string }> = {
  electrical: { zh: "电气量", en: "Electrical" },
  state: { zh: "电池状态", en: "Battery State" },
  cellVoltage: { zh: "单体电压", en: "Cell Voltage" },
  temperature: { zh: "温度", en: "Temperature" },
  pcsDc: { zh: "直流侧", en: "DC Side" },
  pcsAc: { zh: "交流侧", en: "AC Side" },
  pcsState: { zh: "运行状态", en: "Status" },
  emsPower: { zh: "功率调度", en: "Power" },
  emsState: { zh: "系统状态", en: "System" },
}

export type TrendVariableMeta = {
  key: TrendVariableKey
  nameZh: string
  nameEn: string
  unit: string
  deviceKinds: MonitorDeviceKind[]
  /** Logical sub-section used to group the variable in the selection tree. */
  group: TrendVariableGroup
  /** Plausible operating band used to seed the mock random-walk. */
  min: number
  max: number
  /** Decimal places used when formatting values. */
  digits: number
}

/**
 * Catalog of measurement points available for every device (BCU/BMS/PCS/EMS) of
 * the current site. The tree on the left of the panel is the cross product of
 * the site's device list and this catalog (e.g. `BCU1.簇电压`). Keep the array
 * ordered by `deviceKinds` then `group` so the tree shows tidy sections.
 *
 * To make monitoring "more comprehensive", add a row here (and the key to
 * {@link TrendVariableKey}); every monitoring view picks it up automatically.
 */
export const TREND_VARIABLES: TrendVariableMeta[] = [
  // —— Rack / BMS ——
  { key: "clusterVoltage", nameZh: "簇电压", nameEn: "Cluster Voltage", unit: "V", deviceKinds: ["rack"], group: "electrical", min: 680, max: 780, digits: 1 },
  { key: "clusterCurrent", nameZh: "簇电流", nameEn: "Cluster Current", unit: "A", deviceKinds: ["rack"], group: "electrical", min: -250, max: 250, digits: 1 },
  { key: "insulationResistance", nameZh: "绝缘电阻", nameEn: "Insulation Resistance", unit: "kΩ", deviceKinds: ["rack"], group: "electrical", min: 200, max: 2000, digits: 0 },
  { key: "soc", nameZh: "SOC", nameEn: "SOC", unit: "%", deviceKinds: ["rack"], group: "state", min: 12, max: 96, digits: 1 },
  { key: "soh", nameZh: "SOH", nameEn: "SOH", unit: "%", deviceKinds: ["rack"], group: "state", min: 95, max: 100, digits: 2 },
  { key: "dayChargeEnergy", nameZh: "日充电量", nameEn: "Daily Charge", unit: "kWh", deviceKinds: ["rack"], group: "state", min: 0, max: 800, digits: 1 },
  { key: "dayDischargeEnergy", nameZh: "日放电量", nameEn: "Daily Discharge", unit: "kWh", deviceKinds: ["rack"], group: "state", min: 0, max: 760, digits: 1 },
  { key: "maxCellVoltage", nameZh: "最高单体电压", nameEn: "Max Cell Voltage", unit: "V", deviceKinds: ["rack"], group: "cellVoltage", min: 3.25, max: 3.42, digits: 3 },
  { key: "minCellVoltage", nameZh: "最低单体电压", nameEn: "Min Cell Voltage", unit: "V", deviceKinds: ["rack"], group: "cellVoltage", min: 3.18, max: 3.35, digits: 3 },
  { key: "avgCellVoltage", nameZh: "平均单体电压", nameEn: "Avg Cell Voltage", unit: "V", deviceKinds: ["rack"], group: "cellVoltage", min: 3.2, max: 3.38, digits: 3 },
  { key: "voltageDiff", nameZh: "压差", nameEn: "Voltage Diff", unit: "mV", deviceKinds: ["rack"], group: "cellVoltage", min: 6, max: 58, digits: 0 },
  { key: "maxTemp", nameZh: "最高温度", nameEn: "Max Temp", unit: "℃", deviceKinds: ["rack"], group: "temperature", min: 24, max: 42, digits: 1 },
  { key: "minTemp", nameZh: "最低温度", nameEn: "Min Temp", unit: "℃", deviceKinds: ["rack"], group: "temperature", min: 20, max: 36, digits: 1 },
  { key: "avgTemp", nameZh: "平均温度", nameEn: "Avg Temp", unit: "℃", deviceKinds: ["rack"], group: "temperature", min: 22, max: 38, digits: 1 },
  { key: "tempDiff", nameZh: "温差", nameEn: "Temp Diff", unit: "℃", deviceKinds: ["rack"], group: "temperature", min: 0.4, max: 6, digits: 1 },
  // —— PCS ——
  { key: "pcsDcVoltage", nameZh: "直流侧电压", nameEn: "DC Voltage", unit: "V", deviceKinds: ["pcs"], group: "pcsDc", min: 690, max: 820, digits: 1 },
  { key: "pcsDcCurrent", nameZh: "直流侧电流", nameEn: "DC Current", unit: "A", deviceKinds: ["pcs"], group: "pcsDc", min: -280, max: 280, digits: 1 },
  { key: "pcsDcPower", nameZh: "直流侧功率", nameEn: "DC Power", unit: "kW", deviceKinds: ["pcs"], group: "pcsDc", min: -120, max: 120, digits: 1 },
  { key: "pcsAcPower", nameZh: "交流有功功率", nameEn: "AC Active Power", unit: "kW", deviceKinds: ["pcs"], group: "pcsAc", min: -120, max: 120, digits: 1 },
  { key: "pcsAcReactivePower", nameZh: "交流无功功率", nameEn: "AC Reactive Power", unit: "kvar", deviceKinds: ["pcs"], group: "pcsAc", min: -60, max: 60, digits: 1 },
  { key: "pcsAcVoltage", nameZh: "交流电压", nameEn: "AC Voltage", unit: "V", deviceKinds: ["pcs"], group: "pcsAc", min: 390, max: 410, digits: 1 },
  { key: "pcsAcCurrent", nameZh: "交流电流", nameEn: "AC Current", unit: "A", deviceKinds: ["pcs"], group: "pcsAc", min: 0, max: 200, digits: 1 },
  { key: "pcsFrequency", nameZh: "交流频率", nameEn: "AC Frequency", unit: "Hz", deviceKinds: ["pcs"], group: "pcsAc", min: 49.8, max: 50.2, digits: 2 },
  { key: "pcsTemperature", nameZh: "柜内温度", nameEn: "Cabinet Temp", unit: "℃", deviceKinds: ["pcs"], group: "pcsState", min: 24, max: 46, digits: 1 },
  { key: "pcsEfficiency", nameZh: "转换效率", nameEn: "Conversion Efficiency", unit: "%", deviceKinds: ["pcs"], group: "pcsState", min: 95, max: 99, digits: 1 },
  // —— EMS ——
  { key: "emsCommandPower", nameZh: "调度指令功率", nameEn: "Command Power", unit: "kW", deviceKinds: ["ems"], group: "emsPower", min: -120, max: 120, digits: 1 },
  { key: "emsGridPower", nameZh: "并网点功率", nameEn: "Grid Power", unit: "kW", deviceKinds: ["ems"], group: "emsPower", min: -130, max: 130, digits: 1 },
  { key: "emsLoadPower", nameZh: "负载功率", nameEn: "Load Power", unit: "kW", deviceKinds: ["ems"], group: "emsPower", min: 0, max: 140, digits: 1 },
  { key: "emsSocTarget", nameZh: "目标SOC", nameEn: "Target SOC", unit: "%", deviceKinds: ["ems"], group: "emsState", min: 20, max: 95, digits: 1 },
  { key: "emsSystemEfficiency", nameZh: "系统效率", nameEn: "System Efficiency", unit: "%", deviceKinds: ["ems"], group: "emsState", min: 88, max: 96, digits: 1 },
  { key: "emsAlarmCount", nameZh: "活动告警数", nameEn: "Active Alarms", unit: "条", deviceKinds: ["ems"], group: "emsState", min: 0, max: 8, digits: 0 },
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
