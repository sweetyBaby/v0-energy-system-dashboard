import { apiClient } from "@/lib/api-client"
import { apiEndpoints } from "@/lib/api/endpoints"

export const API_PLACEHOLDER = "--"
const DEFAULT_PROJECT_IMAGE = "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1600&h=900&fit=crop"

export type ProjectOption = {
  id: string
  projectId: string
  projectName: string
  projectNameEn: string
  picPath: string
  devices: ProjectDevice[]
}

export type ProjectDevice = {
  deviceId: string
  deviceName: string
  deviceType: string | null
}

export type RawProjectListByDeviceDevice = {
  deviceId?: string | null
  deviceName?: string | null
  deviceType?: string | null
}

export type RawProjectListByDeviceRow = {
  createBy?: string | null
  createTime?: string | null
  updateBy?: string | null
  updateTime?: string | null
  remark?: string | null
  projectId?: string | null
  projectName?: string | null
  projectNameEn?: string | null
  region?: string | null
  company?: string | null
  ratedPower?: string | null
  commissioningDate?: string | null
  tariffInfo?: string | null
  status?: string | null
  delFlag?: string | null
  picPath?: string | null
  ratedCapacity?: string | null
  workingDate?: string | null
  totalChargeAh?: number | null
  totalDischargeAh?: number | null
  deviceId?: string | null
  deviceName?: string | null
  deviceType?: string | null
  deviceInfo?: RawProjectListByDeviceDevice | RawProjectListByDeviceDevice[] | null
  devices?: RawProjectListByDeviceDevice[] | null
}

export type ProjectListByDeviceResponse = {
  total: number
  rows: RawProjectListByDeviceRow[]
  code: number
  msg: string
}

const PROJECT_LIST_IMAGES: Record<string, string> = {
  "360c0347c09c4735900b9df32f3b8ff7":
    "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1600&h=900&fit=crop",
  "9964201b369549b4b04c29bfe3863daa":
    "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1600&h=900&fit=crop",
}

export const MOCK_PROJECT_LIST_BY_DEVICE_RESPONSE: ProjectListByDeviceResponse = {
  total: 2,
  rows: [
    {
      createBy: null,
      createTime: null,
      updateBy: null,
      updateTime: null,
      remark: null,
      projectId: "360c0347c09c4735900b9df32f3b8ff7",
      projectName: "金坛储能中心",
      projectNameEn: "Jintan Energy Storage Center",
      region: "常州",
      company: null,
      ratedPower: null,
      commissioningDate: null,
      tariffInfo: null,
      status: null,
      delFlag: null,
      picPath: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1600&h=900&fit=crop",
      ratedCapacity: "75kW / 150kWh",
      workingDate: "2025-11-15",
      totalChargeAh: null,
      totalDischargeAh: null,
      deviceInfo: [
        {
          deviceId: "8f97b65308af41eb895ffe9c58e978e3",
          deviceName: "BCU1",
          deviceType: null,
        },
        {
        deviceId: "8f97b65308af41eb895ffe9c58e978e2",
        deviceName: "BCU2",
        deviceType: null,
      },
      {
        deviceId: "8f97b65308af41eb895ffe9c58e978e8",
        deviceName: "BCU3",
        deviceType: null,
      },
      ],
    },
    {
      createBy: null,
      createTime: null,
      updateBy: null,
      updateTime: null,
      remark: null,
      projectId: "9964201b369549b4b04c29bfe3863daa",
      projectName: "鄂尔多斯储能中心",
      projectNameEn: "Ordos Energy Storage Center",
      region: "鄂尔多斯",
      company: null,
      ratedPower: null,
      commissioningDate: null,
      tariffInfo: null,
      status: null,
      delFlag: null,
      picPath: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1600&h=900&fit=crop",
      ratedCapacity: null,
      workingDate: null,
      totalChargeAh: null,
      totalDischargeAh: null,
      deviceInfo: [
        {
          deviceId: "f189b7aa2d1b44e9ae0c65e5039a2d7f",
          deviceName: "BCU-1",
          deviceType: null,
        },
      ],
    },
  ],
  code: 200,
  msg: "查询成功",
}

/**
 * 总览右侧卡片使用的四类指标。
 * 当前后端字段尚未完全稳定，因此这里统一做容错和兜底。
 */
export type OverviewMetrics = {
  charge: {
    current: string
    yesterday: string
    month: string
    total: string
  }
  discharge: {
    current: string
    yesterday: string
    month: string
    total: string
  }
  efficiency: {
    current: string
    month: string
    year: string
    total: string
  }
  totalCharge: string
  totalDischarge: string
}

export type RealtimePackStatus = "offline" | "standby" | "charge" | "discharge"

/**
 * 左侧实时状态板统一消费的数据结构。
 * 数值字段已经做过字符串化和空值兜底，组件无需再判断 null。
 */
export type RealtimeSnapshotView = {
  isOnline: boolean
  packStatus: RealtimePackStatus
  soc: string
  socPercent: number | null
  packVoltage: string
  powerKw: string
  stringCurrent: string
  soh: string
}

export type DeviceRealtimeSnapshotView = RealtimeSnapshotView & {
  deviceId: string
  deviceName: string
  deviceType: string | null
}

/**
 * `/ems/project/{projectId}` 原始响应中的 `data` 部分。
 * 文档当前明确了基础字段，其他总览字段先按可选扩展字段处理，便于后续快速联调。
 */
export type RawProjectDetail = Record<string, unknown> & {
  projectId?: string
  projectName?: string
  region?: string
  company?: string
  ratedPower?: unknown
  ratedCapacity?: unknown
  commissioningDate?: unknown
  tariffInfo?: string | null
  status?: string | null
  picPath?: string | null
}

/**
 * 前端统一消费的项目详情视图模型。
 * 所有展示字段都已经做过空值规范化，页面可直接渲染。
 */
export type ProjectDetailView = {
  projectName: string
  region: string
  company: string
  ratedPower: string
  ratedCapacity: string
  commissioningDate: string
  tariffInfo: string
  status: string
  image?: string
  overviewMetrics: OverviewMetrics
  realtimeSnapshot: RealtimeSnapshotView
}

type RawRealtimePeriod = {
  period?: string
  totalChargeAh?: number | null
  cumulativeEE?: number | null
  totalChargeWh?: number | null
  cumulativeCE?: number | null
  cumulativeSE?: number | null
  totalDischargeWh?: number | null
  totalMeterCharge?: number | null
  totalMeterDischarge?: number | null
  projectId?: string
  totalDischargeAh?: number | null
}

export type RawProjectRealtimeDevice = {
  deviceId?: string | null
  deviceName?: string | null
  deviceType?: string | null
  voltage?: number | null
  current?: number | null
  power?: number | null
  soc?: number | null
  totalChargeEnergy?: number | null
  totalDischargeEnergy?: number | null
  temperature?: number | null
  soh?: number | null
}

/**
 * `/ems/dashboard/realtime/{projectId}` 原始响应中的 `data` 部分。
 * 顶部当前值与昨日/本月/累计统计都从这里读取。
 */
export type RawProjectRealtime = {
  projectId?: string
  timestamp?: string | null
  voltage?: number | null
  current?: number | null
  power?: number | null
  soc?: number | null
  totalChargeEnergy?: number | null
  totalDischargeEnergy?: number | null
  temperature?: number | null
  soh?: number | null
  yesterday?: RawRealtimePeriod | null
  month?: RawRealtimePeriod | null
  year?: RawRealtimePeriod | null
  all?: RawRealtimePeriod | null
  devices?: RawProjectRealtimeDevice[] | null
}

export const EMPTY_OVERVIEW_METRICS: OverviewMetrics = {
  charge: {
    current: API_PLACEHOLDER,
    yesterday: API_PLACEHOLDER,
    month: API_PLACEHOLDER,
    total: API_PLACEHOLDER,
  },
  discharge: {
    current: API_PLACEHOLDER,
    yesterday: API_PLACEHOLDER,
    month: API_PLACEHOLDER,
    total: API_PLACEHOLDER,
  },
  efficiency: {
    current: API_PLACEHOLDER,
    month: API_PLACEHOLDER,
    year: API_PLACEHOLDER,
    total: API_PLACEHOLDER,
  },
  totalCharge: API_PLACEHOLDER,
  totalDischarge: API_PLACEHOLDER,
}

export const EMPTY_REALTIME_SNAPSHOT: RealtimeSnapshotView = {
  isOnline: false,
  packStatus: "offline",
  soc: API_PLACEHOLDER,
  socPercent: null,
  packVoltage: API_PLACEHOLDER,
  powerKw: API_PLACEHOLDER,
  stringCurrent: API_PLACEHOLDER,
  soh: API_PLACEHOLDER,
}

export const EMPTY_DEVICE_REALTIME_SNAPSHOT: DeviceRealtimeSnapshotView = {
  deviceId: API_PLACEHOLDER,
  deviceName: API_PLACEHOLDER,
  deviceType: null,
  ...EMPTY_REALTIME_SNAPSHOT,
}

const hasValue = (value: unknown) => {
  if (value == null) return false

  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized.length > 0 && normalized !== "null" && normalized !== "undefined"
  }

  return true
}

const normalizeProjectOptionId = (row: RawProjectListByDeviceRow, index: number) => {
  if (hasValue(row.projectId)) return String(row.projectId).trim()
  const devices = resolveProjectListDevices(row)
  if (hasValue(devices[0]?.deviceId)) return String(devices[0]?.deviceId).trim()
  return `project-${index + 1}`
}

const resolveProjectListDevices = (row: RawProjectListByDeviceRow): RawProjectListByDeviceDevice[] => {
  if (Array.isArray(row.deviceInfo)) {
    return row.deviceInfo
  }

  if (row.deviceInfo && typeof row.deviceInfo === "object") {
    return [row.deviceInfo]
  }

  if (Array.isArray(row.devices)) {
    return row.devices
  }

  if (hasValue(row.deviceId) || hasValue(row.deviceName)) {
    return [
      {
        deviceId: row.deviceId,
        deviceName: row.deviceName,
        deviceType: row.deviceType,
      },
    ]
  }

  return []
}

const normalizeProjectDevices = (
  devices: RawProjectListByDeviceDevice[] | null | undefined
): ProjectDevice[] => {
  if (!devices?.length) return []

  return devices
    .filter((device) => hasValue(device?.deviceId) || hasValue(device?.deviceName))
    .map((device, index) => ({
      deviceId: hasValue(device?.deviceId) ? String(device?.deviceId).trim() : `device-${index + 1}`,
      deviceName: hasValue(device?.deviceName) ? String(device?.deviceName).trim() : `Device ${index + 1}`,
      deviceType: hasValue(device?.deviceType) ? String(device?.deviceType).trim() : null,
    }))
}

const roundMetric = (value: number, digits: number) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

const buildMockRealtimeDevices = (
  projectId: string,
  projectDevices: ProjectDevice[],
  realtime: RawProjectRealtime | null | undefined
): RawProjectRealtimeDevice[] => {
  if (!projectDevices.length) return []

  const projectDefaults: Record<
    string,
    {
      voltage: number
      current: number
      power: number
      soc: number
      totalChargeEnergy: number
      totalDischargeEnergy: number
      temperature: number
      soh: number
    }
  > = {
    "360c0347c09c4735900b9df32f3b8ff7": {
      voltage: 1315.25,
      current: 33.33,
      power: 43.837,
      soc: 51,
      totalChargeEnergy: 6105.313,
      totalDischargeEnergy: 0,
      temperature: 27.4,
      soh: 98.6,
    },
    "9964201b369549b4b04c29bfe3863daa": {
      voltage: 1298.6,
      current: -21.48,
      power: -27.903,
      soc: 63.2,
      totalChargeEnergy: 4820.552,
      totalDischargeEnergy: 315.228,
      temperature: 26.1,
      soh: 97.8,
    },
  }

  const defaults = projectDefaults[projectId] ?? {
    voltage: 1302.5,
    current: 12.6,
    power: 16.4,
    soc: 55,
    totalChargeEnergy: 3200.125,
    totalDischargeEnergy: 180.25,
    temperature: 26.8,
    soh: 98.2,
  }

  const baseVoltage = typeof realtime?.voltage === "number" ? realtime.voltage : defaults.voltage
  const baseCurrent = typeof realtime?.current === "number" ? realtime.current : defaults.current
  const basePower = typeof realtime?.power === "number" ? realtime.power : defaults.power
  const baseSoc = typeof realtime?.soc === "number" ? realtime.soc : defaults.soc
  const baseCharge = typeof realtime?.totalChargeEnergy === "number" ? realtime.totalChargeEnergy : defaults.totalChargeEnergy
  const baseDischarge =
    typeof realtime?.totalDischargeEnergy === "number" ? realtime.totalDischargeEnergy : defaults.totalDischargeEnergy
  const baseTemperature =
    typeof realtime?.temperature === "number" ? realtime.temperature : defaults.temperature
  const baseSoh = typeof realtime?.soh === "number" ? realtime.soh : defaults.soh
  const centerOffset = (projectDevices.length - 1) / 2

  return projectDevices.map((device, index) => {
    const offset = index - centerOffset

    return {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      voltage: roundMetric(baseVoltage + offset * 2.35, 2),
      current: roundMetric(baseCurrent + offset * 0.92, 2),
      power: roundMetric(basePower + offset * 1.26, 3),
      soc: roundMetric(baseSoc + offset * 0.8, 1),
      totalChargeEnergy: roundMetric(Math.max(baseCharge + index * 14.375, 0), 3),
      totalDischargeEnergy: roundMetric(Math.max(baseDischarge + index * 3.125, 0), 3),
      temperature: roundMetric(baseTemperature + offset * 0.6, 1),
      soh: roundMetric(baseSoh - index * 0.15, 1),
    }
  })
}

const normalizeRealtimeDevices = (
  projectId: string,
  realtimeDevices: RawProjectRealtimeDevice[] | null | undefined,
  projectDevices: ProjectDevice[],
  realtime: RawProjectRealtime | null | undefined
): RawProjectRealtimeDevice[] => {
  if (realtimeDevices?.length) {
    return realtimeDevices.map((device, index) => {
      const matchedProjectDevice =
        projectDevices.find((projectDevice) => projectDevice.deviceId === device.deviceId) ?? projectDevices[index]

      return {
        deviceId: hasValue(device.deviceId)
          ? String(device.deviceId).trim()
          : matchedProjectDevice?.deviceId ?? `device-${index + 1}`,
        deviceName: hasValue(device.deviceName)
          ? String(device.deviceName).trim()
          : matchedProjectDevice?.deviceName ?? `Device ${index + 1}`,
        deviceType: hasValue(device.deviceType)
          ? String(device.deviceType).trim()
          : matchedProjectDevice?.deviceType ?? null,
        voltage: typeof device.voltage === "number" ? device.voltage : null,
        current: typeof device.current === "number" ? device.current : null,
        power: typeof device.power === "number" ? device.power : null,
        soc: typeof device.soc === "number" ? device.soc : null,
        totalChargeEnergy: typeof device.totalChargeEnergy === "number" ? device.totalChargeEnergy : null,
        totalDischargeEnergy: typeof device.totalDischargeEnergy === "number" ? device.totalDischargeEnergy : null,
        temperature: typeof device.temperature === "number" ? device.temperature : null,
        soh: typeof device.soh === "number" ? device.soh : null,
      }
    })
  }

  return buildMockRealtimeDevices(projectId, projectDevices, realtime)
}

const hydrateProjectRealtime = (
  realtime: RawProjectRealtime | null,
  projectId: string,
  projectDevices: ProjectDevice[]
): RawProjectRealtime | null => {
  if (!realtime) return null

  return {
    ...realtime,
    projectId: realtime.projectId ?? projectId,
    devices: normalizeRealtimeDevices(projectId, realtime.devices, projectDevices, realtime),
  }
}

export const formatApiValue = (value: unknown) => {
  if (!hasValue(value)) return API_PLACEHOLDER

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }

  return String(value).trim()
}

export const normalizeProjectOptionsFromListByDevice = (
  rows: RawProjectListByDeviceRow[] | null | undefined
): ProjectOption[] => {
  if (!rows?.length) return []

  return rows.map((row, index) => {
    const optionId = normalizeProjectOptionId(row, index)
    const projectId = hasValue(row.projectId) ? String(row.projectId).trim() : optionId
    const devices = normalizeProjectDevices(resolveProjectListDevices(row))
    const picPath = hasValue(row.picPath)
      ? String(row.picPath).trim()
      : PROJECT_LIST_IMAGES[projectId] ?? DEFAULT_PROJECT_IMAGE

    return {
      id: optionId,
      projectId,
      projectName: hasValue(row.projectName) ? String(row.projectName).trim() : `Project ${index + 1}`,
      projectNameEn: hasValue(row.projectNameEn)
        ? String(row.projectNameEn).trim()
        : hasValue(row.projectName)
          ? String(row.projectName).trim()
          : `Project ${index + 1}`,
      picPath,
      devices,
    }
  })
}

export const getMockProjectOptions = () =>
  normalizeProjectOptionsFromListByDevice(MOCK_PROJECT_LIST_BY_DEVICE_RESPONSE.rows)

const formatFixedValue = (value: unknown, digits = 1) => {
  if (!hasValue(value)) return API_PLACEHOLDER
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) return API_PLACEHOLDER
  return numericValue.toFixed(digits)
}

const formatEnergyFromWh = (value: unknown, unit: "kWh" | "MWh") => {
  if (!hasValue(value)) return API_PLACEHOLDER
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) return API_PLACEHOLDER
  const divisor = unit === "kWh" ? 1000 : 1000 * 1000
  return (numericValue / divisor).toFixed(2)
}

const normalizePackStatus = (
  power: number | null | undefined,
  current: number | null | undefined,
  online: boolean
): RealtimePackStatus => {
  if (!online) return "offline"

  const numericPower = typeof power === "number" && !Number.isNaN(power) ? power : null
  const numericCurrent = typeof current === "number" && !Number.isNaN(current) ? current : null

  if ((numericPower != null && numericPower > 0.05) || (numericCurrent != null && numericCurrent > 0.05)) {
    return "charge"
  }

  if ((numericPower != null && numericPower < -0.05) || (numericCurrent != null && numericCurrent < -0.05)) {
    return "discharge"
  }

  return "standby"
}

/**
 * 将 `/ems/dashboard/realtime/{projectId}` 的原始响应标准化为总览卡片数据。
 * 当前值优先取顶层实时字段，昨日/本月/累计取内嵌周期统计。
 */
export const normalizeOverviewMetricsFromRealtime = (
  realtime: RawProjectRealtime | null | undefined
): OverviewMetrics => ({
  charge: {
    current: formatFixedValue(realtime?.totalChargeEnergy),
    yesterday: formatEnergyFromWh(realtime?.yesterday?.totalChargeWh, "kWh"),
    month: formatEnergyFromWh(realtime?.month?.totalChargeWh, "kWh"),
    total: formatEnergyFromWh(realtime?.all?.totalChargeWh, "MWh"),
  },
  discharge: {
    current: formatFixedValue(realtime?.totalDischargeEnergy),
    yesterday: formatEnergyFromWh(realtime?.yesterday?.totalDischargeWh, "kWh"),
    month: formatEnergyFromWh(realtime?.month?.totalDischargeWh, "kWh"),
    total: formatEnergyFromWh(realtime?.all?.totalDischargeWh, "MWh"),
  },
  efficiency: {
    current: formatFixedValue(realtime?.yesterday?.cumulativeEE, 2),
    month: formatFixedValue(realtime?.month?.cumulativeEE, 2),
    year: formatFixedValue(realtime?.year?.cumulativeEE, 2),
    total: formatFixedValue(realtime?.all?.cumulativeEE, 2),
  },
  totalCharge: formatEnergyFromWh(realtime?.all?.totalChargeWh, "MWh"),
  totalDischarge: formatEnergyFromWh(realtime?.all?.totalDischargeWh, "MWh"),
})

/**
 * 将 `/ems/dashboard/realtime/{projectId}` 标准化为左侧实时状态板所需结构。
 */
export const normalizeRealtimeSnapshot = (
  realtime: RawProjectRealtime | null | undefined,
  requestSucceeded: boolean
): RealtimeSnapshotView => {
  const isOnline = requestSucceeded
  const power = typeof realtime?.power === "number" ? realtime.power : null
  const current = typeof realtime?.current === "number" ? realtime.current : null
  const socPercent =
    typeof realtime?.soc === "number" && !Number.isNaN(realtime.soc)
      ? Math.max(0, Math.min(100, Number(realtime.soc.toFixed(1))))
      : null

  return {
    isOnline,
    packStatus: normalizePackStatus(power, current, isOnline),
    soc: formatFixedValue(realtime?.soc, 1),
    socPercent,
    packVoltage: formatFixedValue(realtime?.voltage, 2),
    powerKw: formatFixedValue(realtime?.power, 2),
    stringCurrent: formatFixedValue(realtime?.current, 2),
    soh: formatFixedValue(realtime?.soh, 1),
  }
}

export const normalizeRealtimeDeviceSnapshots = (
  realtime: RawProjectRealtime | null | undefined,
  projectDevices: ProjectDevice[] = [],
  requestSucceeded: boolean
): DeviceRealtimeSnapshotView[] => {
  const candidateDevices =
    realtime?.devices?.length
      ? realtime.devices
      : projectDevices.map((device) => ({
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          deviceType: device.deviceType,
        }))

  if (!candidateDevices.length) return []

  return candidateDevices.map((device, index) => {
    const matchedProjectDevice =
      projectDevices.find((projectDevice) => projectDevice.deviceId === device.deviceId) ?? projectDevices[index]
    const power = typeof device.power === "number" ? device.power : null
    const current = typeof device.current === "number" ? device.current : null
    const socPercent =
      typeof device.soc === "number" && !Number.isNaN(device.soc)
        ? Math.max(0, Math.min(100, Number(device.soc.toFixed(1))))
        : null

    return {
      deviceId: hasValue(device.deviceId)
        ? String(device.deviceId).trim()
        : matchedProjectDevice?.deviceId ?? `device-${index + 1}`,
      deviceName: hasValue(device.deviceName)
        ? String(device.deviceName).trim()
        : matchedProjectDevice?.deviceName ?? `BCU-${index + 1}`,
      deviceType: hasValue(device.deviceType)
        ? String(device.deviceType).trim()
        : matchedProjectDevice?.deviceType ?? null,
      isOnline: requestSucceeded,
      packStatus: normalizePackStatus(power, current, requestSucceeded),
      soc: formatFixedValue(device.soc, 1),
      socPercent,
      packVoltage: formatFixedValue(device.voltage, 2),
      powerKw: formatFixedValue(device.power, 2),
      stringCurrent: formatFixedValue(device.current, 2),
      soh: formatFixedValue(device.soh, 1),
    }
  })
}

/**
 * 拉取项目详情。
 * 所有和项目基础信息相关的页面都应通过这个方法读取，而不是直接写接口路径。
 */
export const fetchProjectDetail = async (projectId: string) => {
  const response = await apiClient.get<RawProjectDetail>(apiEndpoints.overview.projectDetail(projectId))
  return response.data ?? null
}

/**
 * 拉取总览页实时数据。
 * 右侧充放电卡片和左侧实时状态板统一使用这条接口。
 */
export const fetchProjectListByDevice = async () => {
  return apiClient.getRaw<ProjectListByDeviceResponse>(apiEndpoints.project.listByDevice)
}

export const fetchProjectOptionsByDevice = async () => {
  const response = await fetchProjectListByDevice()
  return normalizeProjectOptionsFromListByDevice(response.rows)
}

export const fetchProjectRealtime = async (projectId: string, projectDevices: ProjectDevice[] = []) => {
  const response = await apiClient.get<RawProjectRealtime>(apiEndpoints.overview.realtime(projectId))
  return hydrateProjectRealtime(response.data ?? null, projectId, projectDevices)
}

/**
 * 将原始接口响应标准化为页面可直接渲染的数据。
 */
export const normalizeProjectDetail = (detail: RawProjectDetail | null, fallbackImage?: string): ProjectDetailView => ({
  projectName: formatApiValue(detail?.projectName),
  region: formatApiValue(detail?.region),
  company: formatApiValue(detail?.company),
  ratedPower: formatApiValue(detail?.ratedPower),
  ratedCapacity: formatApiValue(detail?.ratedCapacity),
  commissioningDate: formatApiValue(detail?.commissioningDate),
  tariffInfo: formatApiValue(detail?.tariffInfo),
  status: formatApiValue(detail?.status),
  image: hasValue(detail?.picPath) ? String(detail?.picPath) : fallbackImage,
  overviewMetrics: EMPTY_OVERVIEW_METRICS,
  realtimeSnapshot: EMPTY_REALTIME_SNAPSHOT,
})
