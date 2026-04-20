import { apiClient } from "@/lib/api-client"
import { apiEndpoints } from "@/lib/api/endpoints"
import { getMockProjectOptions } from "@/lib/api/project"

export interface PowerApiResponse<T> {
  msg: string
  code: number
  data: T
}

export interface RawPowerPoint {
  time: string
  power: number | null
}

export interface RawPowerDevice {
  deviceId?: string | null
  deviceName?: string | null
  deviceType?: string | null
  data?: RawPowerPoint[] | null
}

export interface RawPowerDevicesPayload {
  devices?: RawPowerDevice[] | null
}

export interface PowerPoint {
  timestamp: number
  isoTime: string
  power: number | null
}

export interface PowerDeviceSeries {
  deviceId: string
  deviceName: string
  deviceType: string | null
  points: PowerPoint[]
}

export type PowerRangeQuery = {
  projectId: string
  start: string
  end: string
}

type PowerRequestOptions = {
  signal?: AbortSignal
}

type MockPowerDevice = {
  deviceId: string
  deviceIndex: number
  deviceName: string
  deviceType: string | null
}

type MockPowerProfile = {
  chargePeakKw: number
  dischargePeakKw: number
  shiftHours: number
  templateOffset: number
  idleBiasKw: number
}

type MockPowerSegment = {
  startHour: number
  endHour: number
  level: number
}

type MockPowerPulseWindow = {
  centerHour: number
  widthHours: number
  amplitudeFactor: number
}

type MockPowerTemplate = {
  segments: MockPowerSegment[]
  pulseWindows: MockPowerPulseWindow[]
  rippleScale: number
  noiseScale: number
}

const SYNC_SUFFIX = ""
const MOCK_POWER_PROJECTS = getMockProjectOptions()

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

const toSafeString = (value: string | null | undefined, fallback: string) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

const formatDateOnly = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const toDayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const roundValue = (value: number, digits = 3) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const smoothstep = (start: number, end: number, value: number) => {
  if (end <= start) {
    return value >= end ? 1 : 0
  }

  const progress = clamp((value - start) / (end - start), 0, 1)
  return progress * progress * (3 - 2 * progress)
}

const interpolate = (from: number, to: number, progress: number) => from + (to - from) * progress

const gaussianPulse = (value: number, center: number, width: number) => {
  if (width <= 0) {
    return 0
  }

  const normalized = (value - center) / width
  return Math.exp(-(normalized * normalized) / 2)
}

const seededNoise01 = (seed: number) => {
  const raw = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123
  return raw - Math.floor(raw)
}

const seededNoiseSigned = (seed: number) => seededNoise01(seed) * 2 - 1

const parseRangeDate = (value: string, endOfDay = false) => {
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid power range date: ${value}`)
  }

  return date
}

/**
 * Normalize a single BCU power series into ascending, deduped points.
 * Later points with the same timestamp replace earlier ones.
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

const normalizePowerDevices = (devices: RawPowerDevice[] | null | undefined): PowerDeviceSeries[] =>
  (devices ?? []).map((device, index) => ({
    deviceId: toSafeString(device?.deviceId, `device-${index + 1}`),
    deviceName: toSafeString(device?.deviceName, `BCU-${index + 1}`),
    deviceType: device?.deviceType ?? null,
    points: normalizePowerPoints(device?.data),
  }))

const isRawPowerPoint = (value: unknown): value is RawPowerPoint =>
  typeof value === "object" && value !== null && "time" in value

const isRawPowerDevice = (value: unknown): value is RawPowerDevice =>
  typeof value === "object" &&
  value !== null &&
  ("data" in value || "deviceId" in value || "deviceName" in value || "deviceType" in value)

/**
 * Backward compatible payload normalization.
 * Supports direct device arrays, `{ devices: [...] }`, and the legacy single-series array.
 */
export const normalizePowerSeries = (
  payload: RawPowerPoint[] | RawPowerDevice[] | RawPowerDevicesPayload | null | undefined,
): PowerDeviceSeries[] => {
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return []
    }

    if (payload.some(isRawPowerDevice) && !payload.every(isRawPowerPoint)) {
      return normalizePowerDevices(payload as RawPowerDevice[])
    }

    const points = normalizePowerPoints(payload as RawPowerPoint[])
    return points.length === 0
      ? []
      : [
          {
            deviceId: "legacy-bcu-1",
            deviceName: "BCU-1",
            deviceType: null,
            points,
          },
        ]
  }

  return normalizePowerDevices(payload?.devices)
}

/**
 * Merge points within a single device series.
 */
export const mergePowerPoints = (base: PowerPoint[], incoming: PowerPoint[]) =>
  normalizePowerPoints([
    ...base.map((point) => ({ time: point.isoTime, power: point.power })),
    ...incoming.map((point) => ({ time: point.isoTime, power: point.power })),
  ])

const LEGACY_POWER_DEVICE_ID = "legacy-bcu-1"

/**
 * Merge multi-BCU series data while preserving device order.
 */
export const mergePowerSeries = (base: PowerDeviceSeries[], incoming: PowerDeviceSeries[]) => {
  const merged = new Map<string, PowerDeviceSeries>()

  const register = (series: PowerDeviceSeries) => {
    const mergedSeries =
      series.deviceId === LEGACY_POWER_DEVICE_ID
        ? (() => {
            const candidates = Array.from(merged.values()).filter((item) => item.deviceId !== LEGACY_POWER_DEVICE_ID)
            const populatedCandidates = candidates.filter((item) => item.points.length > 0)

            if (populatedCandidates.length === 1) {
              return populatedCandidates[0]
            }

            if (candidates.length === 1) {
              return candidates[0]
            }

            return null
          })()
        : null
    const targetDeviceId = mergedSeries?.deviceId ?? series.deviceId
    const existing = merged.get(targetDeviceId)

    if (!existing) {
      merged.set(targetDeviceId, {
        deviceId: targetDeviceId,
        deviceName: mergedSeries?.deviceName || series.deviceName,
        deviceType: mergedSeries?.deviceType ?? series.deviceType,
        points: [...series.points],
      })
      return
    }

    merged.set(targetDeviceId, {
      deviceId: targetDeviceId,
      deviceName: existing.deviceName || series.deviceName,
      deviceType: existing.deviceType ?? series.deviceType,
      points: mergePowerPoints(existing.points, series.points),
    })
  }

  base.forEach(register)
  incoming.forEach(register)

  return Array.from(merged.values())
}

const resolveMockDevices = (projectId: string): MockPowerDevice[] => {
  const matchedProject = MOCK_POWER_PROJECTS.find((project) => project.projectId === projectId)
  const projectDevices = matchedProject?.devices ?? []

  if (projectDevices.length > 0) {
    return projectDevices.map((device, index) => ({
      deviceId: device.deviceId,
      deviceIndex: index,
      deviceName: device.deviceName || `BCU-${index + 1}`,
      deviceType: device.deviceType ?? null,
    }))
  }

  return [
    { deviceId: "mock-bcu-1", deviceIndex: 0, deviceName: "BCU-1", deviceType: null },
    { deviceId: "mock-bcu-2", deviceIndex: 1, deviceName: "BCU-2", deviceType: null },
    { deviceId: "mock-bcu-3", deviceIndex: 2, deviceName: "BCU-3", deviceType: null },
  ]
}

const resolveMockPowerProfile = (projectId: string): MockPowerProfile => {
  if (projectId === "9964201b369549b4b04c29bfe3863daa") {
    return {
      chargePeakKw: 44.5,
      dischargePeakKw: 25.5,
      shiftHours: -0.06,
      templateOffset: 1,
      idleBiasKw: 0,
    }
  }

  if (projectId === "360c0347c09c4735900b9df32f3b8ff7") {
    return {
      chargePeakKw: 44.2,
      dischargePeakKw: 25.2,
      shiftHours: 0,
      templateOffset: 0,
      idleBiasKw: 0,
    }
  }

  return {
    chargePeakKw: 42.8,
    dischargePeakKw: 24.8,
    shiftHours: 0.04,
    templateOffset: 2,
    idleBiasKw: 0,
  }
}

const MOCK_POWER_TEMPLATES: MockPowerTemplate[] = [
  {
    segments: [
      { startHour: 0, endHour: 1.95, level: 0 },
      { startHour: 1.95, endHour: 2.55, level: 1 },
      { startHour: 2.55, endHour: 5.1, level: 0 },
      { startHour: 5.1, endHour: 5.28, level: 1.02 },
      { startHour: 5.28, endHour: 7.02, level: 0 },
      { startHour: 7.02, endHour: 8.42, level: -1 },
      { startHour: 8.42, endHour: 10.58, level: 0 },
      { startHour: 10.58, endHour: 15.08, level: -1 },
      { startHour: 15.08, endHour: 15.46, level: 0 },
      { startHour: 15.46, endHour: 15.82, level: -1 },
      { startHour: 15.82, endHour: 24, level: 0 },
    ],
    pulseWindows: [
      { centerHour: 7.18, widthHours: 0.03, amplitudeFactor: 0.08 },
      { centerHour: 7.34, widthHours: 0.04, amplitudeFactor: 0.11 },
      { centerHour: 7.52, widthHours: 0.035, amplitudeFactor: 0.07 },
    ],
    rippleScale: 0.004,
    noiseScale: 0.0016,
  },
  {
    segments: [
      { startHour: 0, endHour: 1.02, level: 0 },
      { startHour: 1.02, endHour: 6.12, level: 0.98 },
      { startHour: 6.12, endHour: 7.28, level: 0 },
      { startHour: 7.28, endHour: 8.08, level: -1 },
      { startHour: 8.08, endHour: 8.56, level: 0 },
      { startHour: 8.56, endHour: 9.52, level: -1 },
      { startHour: 9.52, endHour: 11.18, level: 0 },
      { startHour: 11.18, endHour: 23.02, level: -1 },
      { startHour: 23.02, endHour: 24, level: 0 },
    ],
    pulseWindows: [
      { centerHour: 8.82, widthHours: 0.045, amplitudeFactor: 0.06 },
      { centerHour: 8.98, widthHours: 0.035, amplitudeFactor: 0.08 },
      { centerHour: 23.04, widthHours: 0.05, amplitudeFactor: 0.05 },
    ],
    rippleScale: 0.0035,
    noiseScale: 0.0013,
  },
  {
    segments: [
      { startHour: 0, endHour: 1.62, level: 0 },
      { startHour: 1.62, endHour: 3.28, level: 0.82 },
      { startHour: 3.28, endHour: 4.06, level: 0 },
      { startHour: 4.06, endHour: 5.92, level: 0.9 },
      { startHour: 5.92, endHour: 7.45, level: 0 },
      { startHour: 7.45, endHour: 8.86, level: -0.97 },
      { startHour: 8.86, endHour: 10.72, level: 0 },
      { startHour: 10.72, endHour: 14.5, level: -0.97 },
      { startHour: 14.5, endHour: 15.98, level: 0 },
      { startHour: 15.98, endHour: 18.42, level: -0.92 },
      { startHour: 18.42, endHour: 24, level: 0 },
    ],
    pulseWindows: [
      { centerHour: 7.76, widthHours: 0.035, amplitudeFactor: 0.07 },
      { centerHour: 8.03, widthHours: 0.03, amplitudeFactor: 0.09 },
      { centerHour: 16.14, widthHours: 0.035, amplitudeFactor: 0.05 },
    ],
    rippleScale: 0.0038,
    noiseScale: 0.0015,
  },
]

const resolveMockPowerTemplate = (profile: MockPowerProfile, deviceIndex: number) =>
  MOCK_POWER_TEMPLATES[(profile.templateOffset + deviceIndex) % MOCK_POWER_TEMPLATES.length]

const resolveSegmentValue = (
  level: number,
  chargePeakKw: number,
  dischargePeakKw: number,
  idleBiasKw: number,
) => {
  if (level > 0) {
    return chargePeakKw * level
  }

  if (level < 0) {
    return dischargePeakKw * level
  }

  return idleBiasKw
}

const buildTransitionPulse = (
  template: MockPowerTemplate,
  hour: number,
  chargePeakKw: number,
  dischargePeakKw: number,
) => {
  let pulse = 0

  for (let index = 0; index < template.segments.length - 1; index += 1) {
    const current = resolveSegmentValue(template.segments[index].level, chargePeakKw, dischargePeakKw, 0)
    const next = resolveSegmentValue(template.segments[index + 1].level, chargePeakKw, dischargePeakKw, 0)
    const magnitude = Math.max(Math.abs(current), Math.abs(next))

    if (magnitude < 1) {
      continue
    }

    const boundaryHour = template.segments[index].endHour

    if (Math.abs(current) > 1 && Math.abs(next) <= 1) {
      pulse += -Math.sign(current) * magnitude * 0.075 * gaussianPulse(hour, boundaryHour + 0.03, 0.055)
      continue
    }

    if (Math.abs(current) <= 1 && Math.abs(next) > 1) {
      pulse += Math.sign(next) * magnitude * 0.045 * gaussianPulse(hour, boundaryHour - 0.02, 0.05)
      continue
    }

    if (Math.sign(current) !== Math.sign(next)) {
      pulse += Math.sign(next) * magnitude * 0.055 * gaussianPulse(hour, boundaryHour, 0.06)
    }
  }

  return pulse
}

const buildMockPowerValue = (projectId: string, timestamp: number, deviceIndex: number) => {
  const profile = resolveMockPowerProfile(projectId)
  const template = resolveMockPowerTemplate(profile, deviceIndex)
  const date = new Date(timestamp)
  const minutesOfDay = date.getHours() * 60 + date.getMinutes()
  const daySeed = date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate()
  const hourOffset = seededNoiseSigned(daySeed * 0.031 + deviceIndex * 0.83 + profile.templateOffset) * 0.08
  const shiftedHour = ((minutesOfDay / 60 + profile.shiftHours + hourOffset) % 24 + 24) % 24
  const dayFactor = 0.96 + seededNoise01(daySeed * 0.137 + profile.chargePeakKw) * 0.08
  const deviceFactor = 0.94 + deviceIndex * 0.05
  const chargePeak = profile.chargePeakKw * dayFactor * deviceFactor
  const dischargePeak =
    profile.dischargePeakKw *
    (0.95 + seededNoise01(daySeed * 0.227 + deviceIndex * 0.61) * 0.08) *
    (0.97 + deviceIndex * 0.03)
  const dominantPeak = Math.max(chargePeak, dischargePeak)
  const activeSegment = template.segments.find((segment) => shiftedHour >= segment.startHour && shiftedHour < segment.endHour)
  const baseValue = resolveSegmentValue(activeSegment?.level ?? 0, chargePeak, dischargePeak, profile.idleBiasKw)
  const activeMagnitude = Math.abs(baseValue)
  const ripple =
    activeMagnitude < 1
      ? 0
      : activeMagnitude *
          (Math.sin(shiftedHour * Math.PI * 0.42 + daySeed * 0.18 + deviceIndex * 0.35) * template.rippleScale +
            Math.cos(shiftedHour * Math.PI * 0.86 + daySeed * 0.09 + deviceIndex * 0.21) * template.rippleScale * 0.6)
  const slotSeed = Math.floor(timestamp / (5 * 60 * 1000))
  const noise =
    activeMagnitude < 1
      ? 0
      : activeMagnitude *
        template.noiseScale *
        seededNoiseSigned(slotSeed * 0.131 + deviceIndex * 1.73 + daySeed * 0.041)
  const transitionPulse = buildTransitionPulse(template, shiftedHour, chargePeak, dischargePeak)
  const pulseCluster = template.pulseWindows.reduce(
    (sum, pulse) => sum + dominantPeak * pulse.amplitudeFactor * gaussianPulse(shiftedHour, pulse.centerHour, pulse.widthHours),
    0,
  )
  const value = baseValue + ripple + noise + transitionPulse + pulseCluster

  return roundValue(Math.abs(value) < 0.12 ? 0 : value, 3)
}

const shouldSkipMockPowerPoint = (_timestamp: number, _deviceIndex: number) => false

const buildMockPowerSeries = (
  projectId: string,
  startTime: number,
  endTime: number,
  stepMs: number,
  device: MockPowerDevice,
  fromSeconds?: number,
): RawPowerDevice => {
  const data: RawPowerPoint[] = []

  for (let cursor = startTime; cursor <= endTime; cursor += stepMs) {
    const timestamp = cursor

    if (fromSeconds != null && Math.floor(timestamp / 1000) <= fromSeconds) {
      continue
    }

    if (shouldSkipMockPowerPoint(timestamp, device.deviceIndex)) {
      continue
    }

    data.push({
      time: new Date(timestamp).toISOString(),
      power: buildMockPowerValue(projectId, timestamp, device.deviceIndex),
    })
  }

  return {
    deviceId: device.deviceId,
    deviceName: device.deviceName,
    deviceType: device.deviceType,
    data,
  }
}

const buildMockPowerPayload = (
  projectId: string,
  startTime: number,
  endTime: number,
  stepMs: number,
  fromSeconds?: number,
): RawPowerDevicesPayload => ({
  devices: resolveMockDevices(projectId).map((device) =>
    buildMockPowerSeries(projectId, startTime, endTime, stepMs, device, fromSeconds),
  ),
})

/**
 * Fetch today's initial multi-BCU power series.
 * Backend payload is expected to be `{ devices: [{ deviceId, deviceName, data: [...] }] }`.
 */
export const fetchTodayPowerDaily = async (projectId: string, options: PowerRequestOptions = {}) => {
  const path = buildQueryPath(apiEndpoints.power.daily, {
    measurement: toRealtimeMeasurement(projectId),
  })

  const response = await apiClient.getRaw<PowerApiResponse<RawPowerPoint[] | RawPowerDevice[] | RawPowerDevicesPayload>>(path, {
    signal: options.signal,
  })
  return normalizePowerSeries(response.data)
}

/**
 * Fetch today's incremental multi-BCU power series.
 * `fromSeconds` follows the existing unix-seconds contract.
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

  const response = await apiClient.getRaw<PowerApiResponse<RawPowerPoint[] | RawPowerDevice[] | RawPowerDevicesPayload>>(path, {
    signal: options.signal,
  })
  return normalizePowerSeries(response.data)
}

/**
 * Fetch historical multi-BCU power series across a date range.
 * `measurement = projectId`, `start/end = YYYY-MM-DD`.
 */
export const fetchPowerRange = async ({ projectId, start, end }: PowerRangeQuery, options: PowerRequestOptions = {}) => {
  const path = buildQueryPath(apiEndpoints.power.range, {
    measurement: toMeasurement(projectId),
    start,
    end,
  })

  const response = await apiClient.getRaw<PowerApiResponse<RawPowerPoint[] | RawPowerDevice[] | RawPowerDevicesPayload>>(path, {
    signal: options.signal,
  })
  return normalizePowerSeries(response.data)
}

export const getMockPowerDateRange = (projectId: string, days: number) => {
  const today = toDayStart(new Date())
  return {
    projectId,
    start: formatDateOnly(addDays(today, -(days - 1))),
    end: formatDateOnly(today),
  }
}
