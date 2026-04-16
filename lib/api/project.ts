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
  devices?:
    | Array<{
        deviceId?: string | null
        deviceName?: string | null
        deviceType?: string | null
      }>
    | null
}

export type ProjectListByDeviceResponse = {
  total: number
  rows: RawProjectListByDeviceRow[]
  code: number
  msg: string
}

const PROJECT_LIST_BY_DEVICE_USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_PROJECT_LIST !== "false"

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
      devices: [
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
      devices: [
        {
          deviceId: "f189b7aa2d1b44e9ae0c65e5039a2d7f",
          deviceName: "BCU-鄂尔多斯",
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
  if (hasValue(row.devices?.[0]?.deviceId)) return String(row.devices?.[0]?.deviceId).trim()
  return `project-${index + 1}`
}

const normalizeProjectDevices = (
  devices: RawProjectListByDeviceRow["devices"]
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
    const devices = normalizeProjectDevices(row.devices)
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
      ? Math.max(0, Math.min(100, Math.round(realtime.soc)))
      : null

  return {
    isOnline,
    packStatus: normalizePackStatus(power, current, isOnline),
    soc: formatFixedValue(realtime?.soc),
    socPercent,
    packVoltage: formatFixedValue(realtime?.voltage),
    powerKw: formatFixedValue(realtime?.power),
    stringCurrent: formatFixedValue(realtime?.current),
    soh: formatFixedValue(realtime?.soh),
  }
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
  if (PROJECT_LIST_BY_DEVICE_USE_MOCK) {
    return MOCK_PROJECT_LIST_BY_DEVICE_RESPONSE
  }

  return apiClient.getRaw<ProjectListByDeviceResponse>(apiEndpoints.project.listByDevice)
}

export const fetchProjectOptionsByDevice = async () => {
  const response = await fetchProjectListByDevice()
  return normalizeProjectOptionsFromListByDevice(response.rows)
}

export const fetchProjectRealtime = async (projectId: string) => {
  const response = await apiClient.get<RawProjectRealtime>(apiEndpoints.overview.realtime(projectId))
  return response.data ?? null
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
