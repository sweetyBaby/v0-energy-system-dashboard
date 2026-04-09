import { apiClient } from "@/lib/api-client"
import { apiEndpoints } from "@/lib/api/endpoints"
import type { OperationTrendPoint } from "@/lib/api/operations"

type CellHistoryApiResponse<T> = {
  msg?: string
  message?: string
  code?: number
  data?: T | null
}

type RequestOptions = {
  detailCellIndexes?: number[]
  deviceId?: string
  measurement?: string
  signal?: AbortSignal
}

type HistoryPoint = {
  time: string
} & Record<`v${number}`, number> &
  Record<`t1_${number}`, number> &
  Record<`t2_${number}`, number> &
  Record<`t3_${number}`, number>

type OverviewPoint = {
  time: string
  maxVoltage: number
  minVoltage: number
  avgVoltage: number
  voltageDelta: number
  maxTemp: number
  minTemp: number
  avgTemp: number
  tempDelta: number
  interCellTempDiff: number
  intraCellTempDiff: number
}

type CellMetric = {
  cell: number
  voltageMax: number
  voltageMaxAt: string
  voltageMin: number
  voltageMinAt: string
  voltageAvg: number
  voltageSpread: number
  voltageDeviation: number
  tempMax: number
  tempMaxAt: string
  tempMin: number
  tempAvg: number
  tempSpread: number
  maxIntraTempDiff: number
  maxIntraTempDiffAt: string
  riskScore: number
}

type ExtremeCurveTrendPoint = {
  time: string
  max: number
  min: number
  maxCell: number
  minCell: number
}

type TemperatureExtremeTrendMap = {
  t1: ExtremeCurveTrendPoint[]
  t2: ExtremeCurveTrendPoint[]
  t3: ExtremeCurveTrendPoint[]
}

type DailyEnergySummary = {
  chargeAh: number | null
  dischargeAh: number | null
  chargeEfficiencyCe: number | null
}

type DailyCellHistoryBundle = {
  historyData: HistoryPoint[]
  overviewData: OverviewPoint[]
  cellMetrics: CellMetric[]
  bcuHistory: OperationTrendPoint[]
  extremeSummary: ExtremeSummary
  voltageExtremeTrend: ExtremeCurveTrendPoint[]
  temperatureExtremeTrends: TemperatureExtremeTrendMap
  dailyEnergySummary: DailyEnergySummary
}

type CurveSeriesPoint = {
  time: string
  timestamp: number
  values: Array<number | null>
}

type DetailMetricPatch = Partial<CellMetric> & {
  cell: number
}

type OverviewPatch = Partial<OverviewPoint> & {
  time: string
}

type ExtremeRankItem = {
  cell: number
  value: number
  time: string
}

type ExtremeSummary = {
  topMaxVoltages: ExtremeRankItem[]
  topMinVoltages: ExtremeRankItem[]
  topMaxTemperatures: ExtremeRankItem[]
}

type DetailHistoryPatchPoint = {
  cell: number
  time: string
  timestamp: number
  voltage?: number | null
  temp1?: number | null
  temp2?: number | null
  temp3?: number | null
}

const CELL_COUNT = 50
const SUCCESS_CODE = 200
const STEP_MINUTES = 15
const ALL_CELL_INDEXES = Array.from({ length: CELL_COUNT }, (_, index) => index + 1)
const EMPTY_EXTREME_SUMMARY: ExtremeSummary = {
  topMaxVoltages: [],
  topMinVoltages: [],
  topMaxTemperatures: [],
}
const EMPTY_TEMPERATURE_EXTREME_TRENDS: TemperatureExtremeTrendMap = {
  t1: [],
  t2: [],
  t3: [],
}
const EMPTY_DAILY_ENERGY_SUMMARY: DailyEnergySummary = {
  chargeAh: null,
  dischargeAh: null,
  chargeEfficiencyCe: null,
}
const EMPTY_DAILY_CELL_HISTORY_BUNDLE: DailyCellHistoryBundle = {
  historyData: [],
  overviewData: [],
  cellMetrics: [],
  bcuHistory: [],
  extremeSummary: EMPTY_EXTREME_SUMMARY,
  voltageExtremeTrend: [],
  temperatureExtremeTrends: EMPTY_TEMPERATURE_EXTREME_TRENDS,
  dailyEnergySummary: EMPTY_DAILY_ENERGY_SUMMARY,
}

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

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)

const formatTimeByMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`

const getTimeLabelFromDate = (date: Date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`

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

const normalizeCellVoltage = (value: unknown) => {
  const parsed = toFiniteNumber(value)
  if (parsed == null) {
    return null
  }

  return Math.abs(parsed) > 100 ? parsed / 1000 : parsed
}

const normalizeTemperature = (value: unknown) => {
  const parsed = toFiniteNumber(value)
  if (parsed == null) {
    return null
  }

  return Math.abs(parsed) >= 100 ? parsed / 10 : parsed
}

const normalizePower = (value: unknown) => {
  const parsed = toFiniteNumber(value)
  if (parsed == null) {
    return null
  }

  return Math.abs(parsed) > 1000 ? parsed / 1000 : parsed
}

const coerceRows = (data: unknown): Record<string, unknown>[] => {
  if (Array.isArray(data)) {
    return data.filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>
    const candidate = Object.values(record).find(
      (value) => Array.isArray(value) && value.every((item) => !!item && typeof item === "object"),
    )

    if (candidate && Array.isArray(candidate)) {
      return candidate.filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    }
  }

  return []
}

const getFieldValue = (row: Record<string, unknown>, candidates: string[]) => {
  const entries = Object.entries(row)

  for (const candidate of candidates) {
    const exact = entries.find(([key]) => key === candidate)
    if (exact) {
      return exact[1]
    }

    const insensitive = entries.find(([key]) => key.toLowerCase() === candidate.toLowerCase())
    if (insensitive) {
      return insensitive[1]
    }
  }

  return undefined
}

const toDateFromTimeLike = (value: unknown, date: string, fallbackMinutes: number) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const dateValue = new Date(value > 1_000_000_000_000 ? value : value * 1000)
    if (!Number.isNaN(dateValue.getTime())) {
      return dateValue
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }

    const directDate = new Date(trimmed)
    if (!Number.isNaN(directDate.getTime())) {
      return directDate
    }

    const timeMatch = trimmed.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/)
    if (timeMatch) {
      const hours = Number(timeMatch[1])
      const minutes = Number(timeMatch[2])
      const seconds = Number(timeMatch[3] ?? "0")
      const composed = new Date(`${date}T00:00:00`)
      composed.setHours(hours, minutes, seconds, 0)
      return composed
    }
  }

  const composed = new Date(`${date}T00:00:00`)
  composed.setHours(0, fallbackMinutes, 0, 0)
  return Number.isNaN(composed.getTime()) ? null : composed
}

const extractTimeMeta = (row: Record<string, unknown>, index: number, date: string) => {
  const timeValue =
    getFieldValue(row, ["time", "_time", "timestamp", "ts", "datetime", "recordTime", "createTime", "occurTime"]) ??
    index * STEP_MINUTES

  const dateValue = toDateFromTimeLike(timeValue, date, index * STEP_MINUTES)
  if (!dateValue) {
    const fallbackTime = formatTimeByMinutes(index * STEP_MINUTES)
    return {
      time: fallbackTime,
      timestamp: index,
    }
  }

  return {
    time: getTimeLabelFromDate(dateValue),
    timestamp: dateValue.getTime(),
  }
}

const getCellTemps = (point: HistoryPoint, cell: number) => [point[`t1_${cell}`], point[`t2_${cell}`], point[`t3_${cell}`]]

const buildOverview = (historyData: HistoryPoint[], cellIndexes: number[] = ALL_CELL_INDEXES): OverviewPoint[] =>
  historyData.map((point) => {
    const voltages = cellIndexes
      .map((cell) => point[`v${cell}` as const])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    const cellAvgTemps = cellIndexes
      .map((cell) => {
        const temps = getCellTemps(point, cell).filter((value): value is number => typeof value === "number" && Number.isFinite(value))
        return temps.length > 0 ? average(temps) : null
      })
      .filter((value): value is number => value != null)
    const intraDiffs = cellIndexes
      .map((cell) => {
        const temps = getCellTemps(point, cell).filter((value): value is number => typeof value === "number" && Number.isFinite(value))
        if (temps.length === 0) {
          return null
        }
        return Math.max(...temps) - Math.min(...temps)
      })
      .filter((value): value is number => value != null)
    const allTemps = cellIndexes
      .flatMap((cell) => getCellTemps(point, cell))
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))

    if (voltages.length === 0 || allTemps.length === 0 || cellAvgTemps.length === 0 || intraDiffs.length === 0) {
      return {
        time: point.time,
        maxVoltage: 0,
        minVoltage: 0,
        avgVoltage: 0,
        voltageDelta: 0,
        maxTemp: 0,
        minTemp: 0,
        avgTemp: 0,
        tempDelta: 0,
        interCellTempDiff: 0,
        intraCellTempDiff: 0,
      }
    }

    const maxVoltage = Math.max(...voltages)
    const minVoltage = Math.min(...voltages)
    const maxTemp = Math.max(...allTemps)
    const minTemp = Math.min(...allTemps)

    return {
      time: point.time,
      maxVoltage: Number(maxVoltage.toFixed(3)),
      minVoltage: Number(minVoltage.toFixed(3)),
      avgVoltage: Number(average(voltages).toFixed(3)),
      voltageDelta: Number((maxVoltage - minVoltage).toFixed(3)),
      maxTemp: Number(maxTemp.toFixed(1)),
      minTemp: Number(minTemp.toFixed(1)),
      avgTemp: Number(average(allTemps).toFixed(1)),
      tempDelta: Number((maxTemp - minTemp).toFixed(1)),
      interCellTempDiff: Number((Math.max(...cellAvgTemps) - Math.min(...cellAvgTemps)).toFixed(1)),
      intraCellTempDiff: Number(Math.max(...intraDiffs).toFixed(1)),
    }
  })

const buildCellMetrics = (historyData: HistoryPoint[], cellIndexes: number[] = ALL_CELL_INDEXES): CellMetric[] =>
  cellIndexes.map((cell) => {
    const voltageValues = historyData
      .map((point) => point[`v${cell}`])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    const tempValues = historyData
      .flatMap((point) => getCellTemps(point, cell))
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    const intraDiffSeries = historyData
      .map((point) => {
        const temps = getCellTemps(point, cell).filter((value): value is number => typeof value === "number" && Number.isFinite(value))
        if (temps.length === 0) {
          return null
        }
        return { time: point.time, value: Math.max(...temps) - Math.min(...temps) }
      })
      .filter((item): item is { time: string; value: number } => item !== null)

    if (voltageValues.length === 0 || tempValues.length === 0 || intraDiffSeries.length === 0) {
      return {
        cell,
        voltageMax: 0,
        voltageMaxAt: "--",
        voltageMin: 0,
        voltageMinAt: "--",
        voltageAvg: 0,
        voltageSpread: 0,
        voltageDeviation: 0,
        tempMax: 0,
        tempMaxAt: "--",
        tempMin: 0,
        tempAvg: 0,
        tempSpread: 0,
        maxIntraTempDiff: 0,
        maxIntraTempDiffAt: "--",
        riskScore: 0,
      }
    }

    const maxVoltageValue = Math.max(...voltageValues)
    const minVoltageValue = Math.min(...voltageValues)
    const maxTempValue = Math.max(...tempValues)
    const minTempValue = Math.min(...tempValues)
    const maxIntraDiff = intraDiffSeries.reduce((best, current) => (current.value > best.value ? current : best), intraDiffSeries[0])
    const voltageDeviationRows = historyData
      .map((point) => {
        const cellVoltage = point[`v${cell}`]
        if (typeof cellVoltage !== "number" || !Number.isFinite(cellVoltage)) {
          return null
        }

        const fleetVoltages = cellIndexes
          .map((fleetCell) => point[`v${fleetCell}` as const])
          .filter((value): value is number => typeof value === "number" && Number.isFinite(value))

        if (fleetVoltages.length === 0) {
          return null
        }

        const fleetMean = fleetVoltages.reduce((acc, value) => acc + value, 0) / fleetVoltages.length
        return Math.abs(cellVoltage - fleetMean)
      })
      .filter((value): value is number => value != null)
    const voltageDeviation =
      voltageDeviationRows.reduce((sum, value) => sum + value, 0) / Math.max(voltageDeviationRows.length, 1)

    const voltageMaxAt = historyData.find((point) => point[`v${cell}`] === maxVoltageValue)?.time ?? historyData[0]?.time ?? "--"
    const voltageMinAt = historyData.find((point) => point[`v${cell}`] === minVoltageValue)?.time ?? historyData[0]?.time ?? "--"
    const tempMaxAt =
      historyData.find((point) => {
        const temps = getCellTemps(point, cell)
        return Math.max(...temps) === maxTempValue
      })?.time ?? historyData[0]?.time ?? "--"

    const riskScore =
      (maxVoltageValue - minVoltageValue) * 1000 * 0.4 +
      voltageDeviation * 1000 * 0.25 +
      maxTempValue * 0.15 +
      maxIntraDiff.value * 5 +
      (maxTempValue - minTempValue) * 0.2

    return {
      cell,
      voltageMax: Number(maxVoltageValue.toFixed(3)),
      voltageMaxAt,
      voltageMin: Number(minVoltageValue.toFixed(3)),
      voltageMinAt,
      voltageAvg: Number(average(voltageValues).toFixed(3)),
      voltageSpread: Number((maxVoltageValue - minVoltageValue).toFixed(3)),
      voltageDeviation: Number(voltageDeviation.toFixed(3)),
      tempMax: Number(maxTempValue.toFixed(1)),
      tempMaxAt,
      tempMin: Number(minTempValue.toFixed(1)),
      tempAvg: Number(average(tempValues).toFixed(1)),
      tempSpread: Number((maxTempValue - minTempValue).toFixed(1)),
      maxIntraTempDiff: Number(maxIntraDiff.value.toFixed(1)),
      maxIntraTempDiffAt: maxIntraDiff.time,
      riskScore: Number(riskScore.toFixed(1)),
    }
  })

const mergeOverviewPatches = (base: OverviewPoint[], patches: OverviewPatch[]) => {
  if (patches.length === 0) {
    return base
  }

  const patchMap = new Map(patches.map((item) => [item.time, item]))
  return base.map((item) => {
    const patch = patchMap.get(item.time)
    if (!patch) {
      return item
    }

    const sanitizedPatch = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    ) as Partial<OverviewPoint>

    return { ...item, ...sanitizedPatch }
  })
}

const mergeCellMetricPatches = (base: CellMetric[], patches: DetailMetricPatch[]) => {
  if (patches.length === 0) {
    return base
  }

  const patchMap = new Map(patches.map((item) => [item.cell, item]))
  return base.map((item) => {
    const patch = patchMap.get(item.cell)
    if (!patch) {
      return item
    }

    const sanitizedPatch = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    ) as Partial<CellMetric>

    return { ...item, ...sanitizedPatch }
  })
}

const mergeDetailHistoryPatches = (base: HistoryPoint[], patches: DetailHistoryPatchPoint[]): HistoryPoint[] => {
  if (patches.length === 0) {
    return base
  }

  const patchMap = new Map<string, Partial<HistoryPoint>>()

  patches.forEach((patch) => {
    const key = patch.time
    const current = patchMap.get(key) ?? {}

    if (patch.voltage != null) {
      current[`v${patch.cell}` as const] = Number(patch.voltage.toFixed(3))
    }
    if (patch.temp1 != null) {
      current[`t1_${patch.cell}` as const] = Number(patch.temp1.toFixed(1))
    }
    if (patch.temp2 != null) {
      current[`t2_${patch.cell}` as const] = Number(patch.temp2.toFixed(1))
    }
    if (patch.temp3 != null) {
      current[`t3_${patch.cell}` as const] = Number(patch.temp3.toFixed(1))
    }

    patchMap.set(key, current)
  })

  return base.map((row) => {
    const patch = patchMap.get(row.time)
    return patch ? ({ ...row, ...patch } as HistoryPoint) : row
  })
}

const buildHistoryDataFromDetailPatches = (
  patches: DetailHistoryPatchPoint[],
  requiredCells: number[] = ALL_CELL_INDEXES,
): HistoryPoint[] => {
  if (patches.length === 0) {
    return []
  }

  const rowMap = new Map<string, { time: string; timestamp: number } & Partial<HistoryPoint>>()

  patches.forEach((patch) => {
    const key = `${patch.timestamp}|${patch.time}`
    const current = rowMap.get(key) ?? ({ time: patch.time, timestamp: patch.timestamp } as { time: string; timestamp: number } & Partial<HistoryPoint>)

    if (patch.voltage != null) {
      current[`v${patch.cell}` as const] = Number(patch.voltage.toFixed(3))
    }
    if (patch.temp1 != null) {
      current[`t1_${patch.cell}` as const] = Number(patch.temp1.toFixed(1))
    }
    if (patch.temp2 != null) {
      current[`t2_${patch.cell}` as const] = Number(patch.temp2.toFixed(1))
    }
    if (patch.temp3 != null) {
      current[`t3_${patch.cell}` as const] = Number(patch.temp3.toFixed(1))
    }

    rowMap.set(key, current)
  })

  return Array.from(rowMap.values())
    .sort((left, right) => left.timestamp - right.timestamp)
    .map((row) => {
      const point: Partial<HistoryPoint> & { time: string } = { time: row.time }
      let hasAnyMetric = false

      for (const cell of requiredCells) {
        const voltage = row[`v${cell}` as const]
        const temp1 = row[`t1_${cell}` as const]
        const temp2 = row[`t2_${cell}` as const]
        const temp3 = row[`t3_${cell}` as const]

        if (voltage != null) {
          point[`v${cell}` as const] = voltage
          hasAnyMetric = true
        }
        if (temp1 != null) {
          point[`t1_${cell}` as const] = temp1
          hasAnyMetric = true
        }
        if (temp2 != null) {
          point[`t2_${cell}` as const] = temp2
          hasAnyMetric = true
        }
        if (temp3 != null) {
          point[`t3_${cell}` as const] = temp3
          hasAnyMetric = true
        }
      }

      return hasAnyMetric ? (point as HistoryPoint) : null
    })
    .filter((point): point is HistoryPoint => point !== null)
}

const assertSuccessfulResponse = (response: CellHistoryApiResponse<unknown>, path: string) => {
  if (response.code !== SUCCESS_CODE) {
    throw new Error(response.msg || response.message || `Cell history request failed: ${path}`)
  }
}

const requestDaily = async (path: string, projectId: string, date: string, options: RequestOptions = {}) => {
  const queryPath = buildQueryPath(path, {
    measurement: options.measurement ?? projectId,
    deviceId: options.deviceId,
    cellIndexes: options.detailCellIndexes?.length ? options.detailCellIndexes.join(",") : undefined,
    date,
  })

  const response = await apiClient.getRaw<CellHistoryApiResponse<unknown>>(queryPath, {
    signal: options.signal,
  })

  assertSuccessfulResponse(response, path)
  return response.data ?? null
}

const parseCurveSeries = (
  data: unknown,
  date: string,
  readValue: (row: Record<string, unknown>, cell: number) => number | null,
) => {
  const rows = coerceRows(data)

  return rows
    .map((row, index) => {
      const values = Array.from({ length: CELL_COUNT }, (_, cellIndex) => readValue(row, cellIndex + 1))
      if (values.every((value) => value == null)) {
        return null
      }

      const timeMeta = extractTimeMeta(row, index, date)
      return {
        ...timeMeta,
        values,
      } satisfies CurveSeriesPoint
    })
    .filter((row): row is CurveSeriesPoint => row !== null)
    .sort((left, right) => left.timestamp - right.timestamp)
}

const readPrefixedCellValue = (
  row: Record<string, unknown>,
  cell: number,
  prefixes: string[],
  normalizer: (value: unknown) => number | null,
) => {
  const candidates = prefixes.flatMap((prefix) => [
    `${prefix}${cell}`,
    `${prefix}_${cell}`,
    `${prefix}${String(cell).padStart(2, "0")}`,
    `cell${cell}`,
    `cell_${cell}`,
    `value${cell}`,
    `value_${cell}`,
  ])

  return normalizer(getFieldValue(row, candidates))
}

const buildHistoryData = (
  voltageRows: CurveSeriesPoint[],
  temp1Rows: CurveSeriesPoint[],
  temp2Rows: CurveSeriesPoint[],
  temp3Rows: CurveSeriesPoint[],
  requiredCells: number[] = ALL_CELL_INDEXES,
) => {
  if (voltageRows.length === 0 || temp1Rows.length === 0 || temp2Rows.length === 0 || temp3Rows.length === 0) {
    return [] as HistoryPoint[]
  }

  const mergeTarget = new Map<string, { time: string; timestamp: number } & Partial<HistoryPoint>>()
  const ensureRow = (time: string, timestamp: number) => {
    const key = `${timestamp}|${time}`
    const existing = mergeTarget.get(key)
    if (existing) {
      return existing
    }

    const next = { time, timestamp } as { time: string; timestamp: number } & Partial<HistoryPoint>
    mergeTarget.set(key, next)
    return next
  }

  voltageRows.forEach((row) => {
    const target = ensureRow(row.time, row.timestamp)
    row.values.forEach((value, index) => {
      if (value != null) {
        target[`v${index + 1}` as const] = Number(value.toFixed(3))
      }
    })
  })

  temp1Rows.forEach((row) => {
    const target = ensureRow(row.time, row.timestamp)
    row.values.forEach((value, index) => {
      if (value != null) {
        target[`t1_${index + 1}` as const] = Number(value.toFixed(1))
      }
    })
  })

  temp2Rows.forEach((row) => {
    const target = ensureRow(row.time, row.timestamp)
    row.values.forEach((value, index) => {
      if (value != null) {
        target[`t2_${index + 1}` as const] = Number(value.toFixed(1))
      }
    })
  })

  temp3Rows.forEach((row) => {
    const target = ensureRow(row.time, row.timestamp)
    row.values.forEach((value, index) => {
      if (value != null) {
        target[`t3_${index + 1}` as const] = Number(value.toFixed(1))
      }
    })
  })

  return Array.from(mergeTarget.values())
    .sort((left, right) => left.timestamp - right.timestamp)
    .map((row) => {
      const point: Partial<HistoryPoint> & { time: string } = { time: row.time }
      let hasAnyMetric = false

      for (const cell of requiredCells) {
        const voltage = row[`v${cell}` as const]
        const temp1 = row[`t1_${cell}` as const]
        const temp2 = row[`t2_${cell}` as const]
        const temp3 = row[`t3_${cell}` as const]

        if (voltage != null) {
          point[`v${cell}` as const] = voltage
          hasAnyMetric = true
        }
        if (temp1 != null) {
          point[`t1_${cell}` as const] = temp1
          hasAnyMetric = true
        }
        if (temp2 != null) {
          point[`t2_${cell}` as const] = temp2
          hasAnyMetric = true
        }
        if (temp3 != null) {
          point[`t3_${cell}` as const] = temp3
          hasAnyMetric = true
        }
      }

      return hasAnyMetric ? (point as HistoryPoint) : null
    })
    .filter((point): point is HistoryPoint => point !== null)
}

const coerceTimePointRows = (section: unknown) => {
  if (!section || typeof section !== "object") {
    return []
  }

  const record = section as Record<string, unknown>
  return coerceRows(record.timePoints)
}

const parseNestedBcuHistory = (data: unknown, date: string): OperationTrendPoint[] => {
  if (!data || typeof data !== "object") {
    return []
  }

  const record = data as Record<string, unknown>
  const merged = new Map<
    string,
    {
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
  >()

  const metrics = [
    { sectionKey: "current", field: "current" as const, normalize: toFiniteNumber },
    { sectionKey: "voltage", field: "voltage" as const, normalize: toFiniteNumber },
    { sectionKey: "power", field: "power" as const, normalize: normalizePower },
    { sectionKey: "soc", field: "soc" as const, normalize: toFiniteNumber },
  ]

  for (const metric of metrics) {
    const rows = coerceTimePointRows(record[metric.sectionKey])

    rows.forEach((row, index) => {
      const timeMeta = extractTimeMeta(row, index, date)
      const value = metric.normalize(getFieldValue(row, ["value", "val"]))

      if (value == null) {
        return
      }

      const key = `${timeMeta.timestamp}|${timeMeta.time}`
      const existing = merged.get(key) ?? {
        timestamp: timeMeta.timestamp,
        isoTime: new Date(timeMeta.timestamp).toISOString(),
        time: timeMeta.time,
        voltage: null,
        current: null,
        soc: null,
        power: null,
        maxTemp: null,
        minTemp: null,
        maxCell: null,
        minCell: null,
      }

      existing[metric.field] = value
      merged.set(key, existing)
    })
  }

  const points = Array.from(merged.values())
    .map((point) => ({
      ...point,
      power:
        point.power ?? (point.voltage != null && point.current != null ? Number(((point.voltage * point.current) / 1000).toFixed(1)) : null),
    }))
    .sort((left, right) => left.timestamp - right.timestamp)

  return points
}

const parseFlatBcuHistory = (data: unknown, date: string): OperationTrendPoint[] =>
  coerceRows(data)
    .map((row, index) => {
      const timeMeta = extractTimeMeta(row, index, date)
      const voltage = toFiniteNumber(getFieldValue(row, ["packVoltage", "voltage", "totalVoltage"]))
      const current = toFiniteNumber(getFieldValue(row, ["packCurrent", "current", "batteryCurrent"]))
      const power = normalizePower(getFieldValue(row, ["power", "packPower", "activePower"]))
      const soc = toFiniteNumber(getFieldValue(row, ["soc", "systemSoc", "batterySoc"]))

      if (voltage == null && current == null && power == null && soc == null) {
        return null
      }

      return {
        timestamp: timeMeta.timestamp,
        isoTime: new Date(timeMeta.timestamp).toISOString(),
        time: timeMeta.time,
        voltage,
        current,
        soc,
        power: power ?? (voltage != null && current != null ? Number(((voltage * current) / 1000).toFixed(1)) : null),
        maxTemp: toFiniteNumber(getFieldValue(row, ["maxTemp", "maxCellTemp"])),
        minTemp: toFiniteNumber(getFieldValue(row, ["minTemp", "minCellTemp"])),
        maxCell: normalizeCellVoltage(getFieldValue(row, ["maxCell", "maxCellVolt", "maxCellVoltage"])),
        minCell: normalizeCellVoltage(getFieldValue(row, ["minCell", "minCellVolt", "minCellVoltage"])),
      } satisfies OperationTrendPoint
    })
    .filter((row): row is OperationTrendPoint => row !== null)
    .sort((left, right) => left.timestamp - right.timestamp)

const parseBcuHistory = (data: unknown, date: string): OperationTrendPoint[] => {
  const nested = parseNestedBcuHistory(data, date)
  if (nested.length > 0) {
    return nested
  }

  return parseFlatBcuHistory(data, date)
}

const parseDetailMetricPatches = (data: unknown): DetailMetricPatch[] => {
  const patches: DetailMetricPatch[] = []

  for (const row of coerceRows(data)) {
    const stats = getFieldValue(row, ["stats"])
    const statsRow = stats && typeof stats === "object" ? (stats as Record<string, unknown>) : row
    const cell = Math.trunc(
      toFiniteNumber(getFieldValue(row, ["cell", "cellId", "cellNo", "cellIndex", "id", "index", "batteryId", "batteryNo"])) ?? 0,
    )

    if (cell < 1 || cell > CELL_COUNT) {
      continue
    }

    const voltageMaxAt = getFieldValue(statsRow, ["voltageMaxAt", "maxVoltageAt", "maxVoltAt", "voltageMaxTime", "maxVoltageTime"])
    const voltageMinAt = getFieldValue(statsRow, ["voltageMinAt", "minVoltageAt", "minVoltAt", "voltageMinTime", "minVoltageTime"])
    const tempMaxAt = getFieldValue(statsRow, ["tempMaxAt", "maxTempAt", "maxTemperatureAt", "tempMaxTime", "maxTemperatureTime"])
    const maxIntraTempDiffAt = getFieldValue(statsRow, ["maxIntraTempDiffAt", "intraTempDiffAt", "maxInnerTempDiffAt"])

    patches.push({
      cell,
      voltageMax: normalizeCellVoltage(getFieldValue(statsRow, ["voltageMax", "maxVoltage", "maxVolt", "maxCellVoltage"])) ?? undefined,
      voltageMaxAt:
        typeof voltageMaxAt === "string" ? extractTimeMeta({ time: voltageMaxAt }, 0, "1970-01-01").time : undefined,
      voltageMin: normalizeCellVoltage(getFieldValue(statsRow, ["voltageMin", "minVoltage", "minVolt", "minCellVoltage"])) ?? undefined,
      voltageMinAt:
        typeof voltageMinAt === "string" ? extractTimeMeta({ time: voltageMinAt }, 0, "1970-01-01").time : undefined,
      voltageAvg: normalizeCellVoltage(getFieldValue(statsRow, ["voltageAvg", "avgVoltage", "averageVoltage"])) ?? undefined,
      voltageSpread:
        normalizeCellVoltage(getFieldValue(statsRow, ["voltageSpread", "voltageDelta", "deltaVoltage", "voltageDiff", "maxVoltageDiff"])) ?? undefined,
      voltageDeviation:
        normalizeCellVoltage(getFieldValue(statsRow, ["voltageDeviation", "voltageDev", "voltageStd"])) ?? undefined,
      tempMax: normalizeTemperature(getFieldValue(statsRow, ["tempMax", "maxTemp", "maxTemperature"])) ?? undefined,
      tempMaxAt: typeof tempMaxAt === "string" ? extractTimeMeta({ time: tempMaxAt }, 0, "1970-01-01").time : undefined,
      tempMin: normalizeTemperature(getFieldValue(statsRow, ["tempMin", "minTemp", "minTemperature"])) ?? undefined,
      tempAvg: normalizeTemperature(getFieldValue(statsRow, ["tempAvg", "avgTemp", "averageTemp"])) ?? undefined,
      tempSpread: normalizeTemperature(getFieldValue(statsRow, ["tempSpread", "tempDelta", "deltaTemperature", "tempDiff", "maxTempDiff"])) ?? undefined,
      maxIntraTempDiff:
        normalizeTemperature(getFieldValue(statsRow, ["maxIntraTempDiff", "intraTempDiff", "maxInnerTempDiff"])) ?? undefined,
      maxIntraTempDiffAt:
        typeof maxIntraTempDiffAt === "string"
          ? extractTimeMeta({ time: maxIntraTempDiffAt }, 0, "1970-01-01").time
          : undefined,
      riskScore: toFiniteNumber(getFieldValue(statsRow, ["riskScore", "score"])) ?? undefined,
    })
  }

  return patches
}

const parseDetailHistoryPatches = (data: unknown, date: string): DetailHistoryPatchPoint[] => {
  const patches: DetailHistoryPatchPoint[] = []

  for (const row of coerceRows(data)) {
    const cell = Math.trunc(
      toFiniteNumber(getFieldValue(row, ["cell", "cellId", "cellNo", "cellIndex", "id", "index", "batteryId", "batteryNo"])) ?? 0,
    )

    if (cell < 1 || cell > CELL_COUNT) {
      continue
    }

    const sections = [
      { key: "voltage", field: "voltage" as const, normalize: normalizeCellVoltage },
      { key: "temp1", field: "temp1" as const, normalize: normalizeTemperature },
      { key: "temp2", field: "temp2" as const, normalize: normalizeTemperature },
      { key: "temp3", field: "temp3" as const, normalize: normalizeTemperature },
    ]

    const merged = new Map<string, DetailHistoryPatchPoint>()

    sections.forEach((section) => {
      const sectionValue = getFieldValue(row, [section.key])
      const points = sectionValue && typeof sectionValue === "object" ? coerceRows((sectionValue as Record<string, unknown>).points) : []

      points.forEach((point, index) => {
        const timeMeta = extractTimeMeta(point, index, date)
      const value = section.normalize(getFieldValue(point, ["value", "val"]))

        if (value == null) {
          return
        }

        const key = `${timeMeta.timestamp}|${timeMeta.time}`
        const existing =
          merged.get(key) ??
          ({
            cell,
            time: timeMeta.time,
            timestamp: timeMeta.timestamp,
          } satisfies DetailHistoryPatchPoint)

        existing[section.field] = value
        merged.set(key, existing)
      })
    })

    patches.push(...Array.from(merged.values()))
  }

  return patches
}

const parseOverviewPatches = (data: unknown, date: string): OverviewPatch[] => {
  const patches: OverviewPatch[] = []

  for (const [index, row] of coerceRows(data).entries()) {
    const hasExtremeValue =
      getFieldValue(row, ["maxVoltage", "minVoltage", "maxTemp", "minTemp", "voltageDelta", "tempDelta"]) !== undefined

    if (!hasExtremeValue) {
      continue
    }

    const timeMeta = extractTimeMeta(row, index, date)
    patches.push({
      time: timeMeta.time,
      maxVoltage: normalizeCellVoltage(getFieldValue(row, ["maxVoltage", "maxVolt", "maxCellVoltage"])) ?? undefined,
      minVoltage: normalizeCellVoltage(getFieldValue(row, ["minVoltage", "minVolt", "minCellVoltage"])) ?? undefined,
      avgVoltage: normalizeCellVoltage(getFieldValue(row, ["avgVoltage", "voltageAvg", "averageVoltage"])) ?? undefined,
      voltageDelta: normalizeCellVoltage(getFieldValue(row, ["voltageDelta", "voltageDiff", "maxVoltageDiff"])) ?? undefined,
      maxTemp: toFiniteNumber(getFieldValue(row, ["maxTemp", "maxTemperature"])) ?? undefined,
      minTemp: toFiniteNumber(getFieldValue(row, ["minTemp", "minTemperature"])) ?? undefined,
      avgTemp: toFiniteNumber(getFieldValue(row, ["avgTemp", "averageTemp"])) ?? undefined,
      tempDelta: toFiniteNumber(getFieldValue(row, ["tempDelta", "tempDiff", "maxTempDiff"])) ?? undefined,
      interCellTempDiff: toFiniteNumber(getFieldValue(row, ["interCellTempDiff", "betweenCellTempDiff"])) ?? undefined,
      intraCellTempDiff: toFiniteNumber(getFieldValue(row, ["intraCellTempDiff", "innerCellTempDiff"])) ?? undefined,
    })
  }

  return patches
}

const normalizeExtremeCellIndex = (items: Record<string, unknown>[]) => {
  const rawIndexes = items
    .map((item) => Math.trunc(toFiniteNumber(getFieldValue(item, ["index", "cellIndex", "cell"])) ?? -1))
    .filter((value) => value >= 0)

  const containsZeroBasedIndex = rawIndexes.includes(0)

  return (rawIndex: number) => {
    if (containsZeroBasedIndex) {
      return rawIndex + 1
    }

    return rawIndex
  }
}

const parseExtremeRankItems = (data: unknown, key: string, normalizeValue: (value: unknown) => number | null): ExtremeRankItem[] => {
  if (!data || typeof data !== "object") {
    return []
  }

  const record = data as Record<string, unknown>
  const rows = coerceRows(record[key])
  const toCell = normalizeExtremeCellIndex(rows)

  return rows
    .map((row) => {
      const rawIndex = Math.trunc(toFiniteNumber(getFieldValue(row, ["index", "cellIndex", "cell"])) ?? -1)
      const value = normalizeValue(getFieldValue(row, ["value", "val"]))
      const timeValue = getFieldValue(row, ["time", "_time", "timestamp"])

      if (rawIndex < 0 || value == null) {
        return null
      }

      return {
        cell: toCell(rawIndex),
        value,
        time: typeof timeValue === "string" ? extractTimeMeta({ time: timeValue }, 0, "1970-01-01").time : "--",
      } satisfies ExtremeRankItem
    })
    .filter((item): item is ExtremeRankItem => item !== null)
}

const parseExtremeSummary = (data: unknown): ExtremeSummary => ({
  topMaxVoltages: parseExtremeRankItems(data, "topMaxVoltages", normalizeCellVoltage),
  topMinVoltages: parseExtremeRankItems(data, "topMinVoltages", normalizeCellVoltage),
  topMaxTemperatures: parseExtremeRankItems(data, "topMaxTemperatures", toFiniteNumber),
})

const parseFieldCell = (value: unknown) => {
  if (typeof value !== "string") {
    return null
  }

  const match = value.match(/(\d+)/)
  if (!match) {
    return null
  }

  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

const parseExtremeCurveTrend = (
  data: unknown,
  date: string,
  normalizeValue: (value: unknown) => number | null,
): ExtremeCurveTrendPoint[] => {
  if (!data || typeof data !== "object") {
    return []
  }

  const record = data as Record<string, unknown>
  const rows = coerceRows(record.timePoints)

  return rows
    .map((row, index) => {
      const timeMeta = extractTimeMeta(row, index, date)
      const max = normalizeValue(getFieldValue(row, ["maxValue"]))
      const min = normalizeValue(getFieldValue(row, ["minValue"]))
      const maxCell = parseFieldCell(getFieldValue(row, ["maxField"]))
      const minCell = parseFieldCell(getFieldValue(row, ["minField"]))

      if (max == null || min == null || maxCell == null || minCell == null) {
        return null
      }

      return {
        time: timeMeta.time,
        max,
        min,
        maxCell,
        minCell,
      } satisfies ExtremeCurveTrendPoint
    })
    .filter((item): item is ExtremeCurveTrendPoint => item !== null)
}

const parseVoltageExtremeTrend = (data: unknown, date: string) =>
  parseExtremeCurveTrend(data, date, normalizeCellVoltage)

const parseTemperatureExtremeTrend = (data: unknown, date: string) =>
  parseExtremeCurveTrend(data, date, toFiniteNumber)

const parseDailyEnergySummary = (data: unknown): DailyEnergySummary => {
  if (!data || typeof data !== "object") {
    return EMPTY_DAILY_ENERGY_SUMMARY
  }

  const record = data as Record<string, unknown>
  const candidates: Record<string, unknown>[] = [record]

  ;["summary", "statistics", "stats", "overview", "data"].forEach((key) => {
    const nested = record[key]
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      candidates.push(nested as Record<string, unknown>)
    }
  })

  for (const candidate of candidates) {
    const chargeAh = toFiniteNumber(getFieldValue(candidate, ["chargeAh", "chargeCapacity"]))
    const dischargeAh = toFiniteNumber(getFieldValue(candidate, ["dischargeAh", "dischargeCapacity"]))
    const chargeEfficiencyCe = toFiniteNumber(
      getFieldValue(candidate, ["chargeEfficiencyCe", "capacityEfficiency", "ceEfficiency"]),
    )

    if (chargeAh != null || dischargeAh != null || chargeEfficiencyCe != null) {
      return {
        chargeAh: chargeAh == null ? null : Number(chargeAh.toFixed(3)),
        dischargeAh: dischargeAh == null ? null : Number(dischargeAh.toFixed(3)),
        chargeEfficiencyCe: chargeEfficiencyCe == null ? null : Number(chargeEfficiencyCe.toFixed(2)),
      }
    }
  }

  return EMPTY_DAILY_ENERGY_SUMMARY
}

export const fetchDailyCellHistory = async (
  projectId: string,
  date: string,
  options: RequestOptions = {},
): Promise<DailyCellHistoryBundle> => {
  const { detailCellIndexes, ...sharedOptions } = options
  const shouldFetchDetail = (detailCellIndexes?.length ?? 0) > 0
  const requiredCells =
    detailCellIndexes?.length
      ? Array.from(new Set(detailCellIndexes.filter((cell) => cell >= 1 && cell <= CELL_COUNT)))
      : ALL_CELL_INDEXES
  const isFullPackRequest = requiredCells.length === CELL_COUNT
  const settled = await Promise.allSettled([
    requestDaily(apiEndpoints.cellHistory.bcuDaily, projectId, date, sharedOptions),
    shouldFetchDetail
      ? requestDaily(apiEndpoints.cellHistory.detailDaily, projectId, date, {
          ...sharedOptions,
          detailCellIndexes,
        })
      : Promise.resolve(null),
    isFullPackRequest ? requestDaily(apiEndpoints.cellHistory.extremeDaily, projectId, date, sharedOptions) : Promise.resolve(null),
    isFullPackRequest ? requestDaily(apiEndpoints.cellHistory.voltageDaily, projectId, date, sharedOptions) : Promise.resolve(null),
    isFullPackRequest ? requestDaily(apiEndpoints.cellHistory.temp1Daily, projectId, date, sharedOptions) : Promise.resolve(null),
    isFullPackRequest ? requestDaily(apiEndpoints.cellHistory.temp2Daily, projectId, date, sharedOptions) : Promise.resolve(null),
    isFullPackRequest ? requestDaily(apiEndpoints.cellHistory.temp3Daily, projectId, date, sharedOptions) : Promise.resolve(null),
  ])

  const [bcuResult, detailResult, extremeResult, voltageResult, temp1Result, temp2Result, temp3Result] = settled
  const detailHistoryPatches = detailResult.status === "fulfilled" ? parseDetailHistoryPatches(detailResult.value, date) : []

  const voltageRows =
    voltageResult.status === "fulfilled"
      ? parseCurveSeries(voltageResult.value, date, (row, cell) => readPrefixedCellValue(row, cell, ["V", "v"], normalizeCellVoltage))
      : []
  const temp1Rows =
    temp1Result.status === "fulfilled"
      ? parseCurveSeries(temp1Result.value, date, (row, cell) => readPrefixedCellValue(row, cell, ["T", "t"], toFiniteNumber))
      : []
  const temp2Rows =
    temp2Result.status === "fulfilled"
      ? parseCurveSeries(temp2Result.value, date, (row, cell) => readPrefixedCellValue(row, cell, ["T", "t"], toFiniteNumber))
      : []
  const temp3Rows =
    temp3Result.status === "fulfilled"
      ? parseCurveSeries(temp3Result.value, date, (row, cell) => readPrefixedCellValue(row, cell, ["T", "t"], toFiniteNumber))
      : []

  const curveHistoryData = buildHistoryData(voltageRows, temp1Rows, temp2Rows, temp3Rows, requiredCells)
  const historyData =
    curveHistoryData.length > 0
      ? mergeDetailHistoryPatches(curveHistoryData, detailHistoryPatches)
      : buildHistoryDataFromDetailPatches(detailHistoryPatches, requiredCells)

  if (historyData.length === 0) {
    return EMPTY_DAILY_CELL_HISTORY_BUNDLE
  }

  const overviewData = isFullPackRequest
    ? mergeOverviewPatches(
        buildOverview(historyData, requiredCells),
        extremeResult.status === "fulfilled" ? parseOverviewPatches(extremeResult.value, date) : [],
      )
    : []
  const extremeSummary =
    isFullPackRequest && extremeResult.status === "fulfilled" ? parseExtremeSummary(extremeResult.value) : EMPTY_EXTREME_SUMMARY

  const cellMetrics = mergeCellMetricPatches(
    buildCellMetrics(historyData, requiredCells),
    detailResult.status === "fulfilled" ? parseDetailMetricPatches(detailResult.value) : [],
  )
  const voltageExtremeTrend =
    isFullPackRequest && voltageResult.status === "fulfilled" ? parseVoltageExtremeTrend(voltageResult.value, date) : []
  const temperatureExtremeTrends: TemperatureExtremeTrendMap = {
    ...EMPTY_TEMPERATURE_EXTREME_TRENDS,
    t1: isFullPackRequest && temp1Result.status === "fulfilled" ? parseTemperatureExtremeTrend(temp1Result.value, date) : [],
    t2: isFullPackRequest && temp2Result.status === "fulfilled" ? parseTemperatureExtremeTrend(temp2Result.value, date) : [],
    t3: isFullPackRequest && temp3Result.status === "fulfilled" ? parseTemperatureExtremeTrend(temp3Result.value, date) : [],
  }
  const dailyEnergySummarySources = [
    bcuResult.status === "fulfilled" ? bcuResult.value : null,
    detailResult.status === "fulfilled" ? detailResult.value : null,
    extremeResult.status === "fulfilled" ? extremeResult.value : null,
  ]
  const dailyEnergySummary =
    dailyEnergySummarySources
      .map((source) => parseDailyEnergySummary(source))
      .find((summary) => summary.chargeAh != null || summary.dischargeAh != null || summary.chargeEfficiencyCe != null) ??
    EMPTY_DAILY_ENERGY_SUMMARY

  return {
    historyData,
    overviewData,
    cellMetrics,
    bcuHistory: bcuResult.status === "fulfilled" ? parseBcuHistory(bcuResult.value, date) : [],
    extremeSummary,
    voltageExtremeTrend,
    temperatureExtremeTrends,
    dailyEnergySummary,
  }
}

export type { CellMetric, DailyCellHistoryBundle, DailyEnergySummary, HistoryPoint, OverviewPoint }
