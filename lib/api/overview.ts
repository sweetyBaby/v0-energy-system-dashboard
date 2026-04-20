import { apiClient } from "@/lib/api-client"
import { apiEndpoints } from "@/lib/api/endpoints"
import { API_PLACEHOLDER, getMockProjectOptions } from "@/lib/api/project"

export type DailyListRequest = {
  projectId: string
  deviceId?: string
  params: {
    beginTime: string
    endTime: string
    type?: "year"
    year?: string
  }
}

export type RawDailyListChildRow = {
  deviceId: string | null
  reportDate?: string | null
  month?: string | null
  year?: string | null
  chargeAh: number | null
  dischargeAh: number | null
  chargeWh: number | null
  dischargeWh: number | null
  chargeEfficiencyCe: number | null
  chargeEfficiencyEe: number | null
  children?: RawDailyListChildRow[] | null
}

export type RawDailyListRow = {
  createBy?: string | null
  createTime?: string | null
  updateBy?: string | null
  updateTime?: string | null
  remark?: string | null
  id?: string | null
  deviceId?: string | null
  projectId?: string | null
  reportDate: string | null
  month?: string | null
  chargeAh: number | null
  dischargeAh: number | null
  chargeWh: number | null
  dischargeWh: number | null
  chargeEfficiencyCe: number | null
  chargeEfficiencyEe: number | null
  maxVoltageDiff: number | null
  maxTempDiff: number | null
  maxVoltage: number | null
  minVoltage: number | null
  maxTemp?: number | null
  minTemp?: number | null
  minVoltageDiff?: number | null
  avgTempDiff?: number | null
  avgVoltage?: number | null
  meterCharge?: number | null
  meterDischarge?: number | null
  meterEfficiencySe?: number | null
  projectName: string | null
  delFlag?: string | null
  children?: RawDailyListChildRow[] | null
}

export type DailyListResponse = {
  total: number
  rows: RawDailyListRow[]
  code: number
  msg: string
}

export type EfficiencyPointChild = {
  deviceId: string
  chargeCapacity: number | null
  dischargeCapacity: number | null
  chargeEnergy: number | null
  dischargeEnergy: number | null
}

export type EfficiencyPoint = {
  label: string
  chargeCapacity: number | null
  dischargeCapacity: number | null
  chargeEnergy: number | null
  dischargeEnergy: number | null
  capacityEfficiency: number | null
  energyEfficiency: number | null
  children: EfficiencyPointChild[]
  [key: string]: string | number | null | EfficiencyPointChild[]
}

type NormalizeOverviewOptions = {
  groupBy?: "day" | "month"
  language?: "zh" | "en"
}

type MockBcuDevice = {
  deviceId: string
  deviceIndex: number
}

const MOCK_OVERVIEW_PROJECTS = getMockProjectOptions()

const parseReportDate = (value: string | null | undefined) => {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

const parseMonthValue = (value: string | null | undefined) => {
  if (!value) return null

  const month = Number.parseInt(value, 10)
  if (Number.isNaN(month) || month < 1 || month > 12) return null
  return month
}

const formatDateLabel = (value: string | null | undefined) => {
  const date = parseReportDate(value)
  if (!date) return API_PLACEHOLDER
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const formatMonthLabel = (month: number, language: "zh" | "en") =>
  language === "zh" ? `${month}\u6708` : `M${month}`

const convertWhToKwh = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return null
  return Number((value / 1000).toFixed(1))
}

const normalizeNumber = (value: number | null | undefined, digits = 1) => {
  if (value == null || Number.isNaN(value)) return null
  return Number(value.toFixed(digits))
}

const normalizeOverviewChildRows = (children: RawDailyListChildRow[] | null | undefined): EfficiencyPointChild[] => {
  if (!children?.length) return []

  return children
    .filter((child): child is RawDailyListChildRow & { deviceId: string } => Boolean(child.deviceId))
    .map((child) => ({
      deviceId: child.deviceId,
      chargeCapacity: normalizeNumber(child.chargeAh),
      dischargeCapacity: normalizeNumber(child.dischargeAh),
      chargeEnergy: convertWhToKwh(child.chargeWh),
      dischargeEnergy: convertWhToKwh(child.dischargeWh),
    }))
}

const hasNumericValue = (value: number | null | undefined): value is number => value != null && !Number.isNaN(value)

const sumChildMetric = (
  children: RawDailyListChildRow[] | null | undefined,
  selector: (child: RawDailyListChildRow) => number | null | undefined,
): number | null => {
  if (!children?.length) return null

  const values = children.map(selector).filter(hasNumericValue)
  if (values.length === 0) return null

  return values.reduce((sum, value) => sum + value, 0)
}

const resolveCapacityMetric = (
  topLevelValue: number | null | undefined,
  children: RawDailyListChildRow[] | null | undefined,
  selector: (child: RawDailyListChildRow) => number | null | undefined,
) => normalizeNumber(hasNumericValue(topLevelValue) ? topLevelValue : sumChildMetric(children, selector))

const resolveEnergyMetric = (
  topLevelValue: number | null | undefined,
  children: RawDailyListChildRow[] | null | undefined,
  selector: (child: RawDailyListChildRow) => number | null | undefined,
) => convertWhToKwh(hasNumericValue(topLevelValue) ? topLevelValue : sumChildMetric(children, selector))

type MonthlyOverviewSourceRow = Pick<
  RawDailyListRow,
  "reportDate" | "month" | "chargeAh" | "dischargeAh" | "chargeWh" | "dischargeWh" | "chargeEfficiencyCe" | "chargeEfficiencyEe"
> & {
  children?: RawDailyListChildRow[] | null
}

const toMonthlyOverviewSourceRow = (
  row: Pick<
    RawDailyListChildRow,
    "reportDate" | "month" | "chargeAh" | "dischargeAh" | "chargeWh" | "dischargeWh" | "chargeEfficiencyCe" | "chargeEfficiencyEe" | "children"
  >,
): MonthlyOverviewSourceRow => ({
  reportDate: row.reportDate ?? null,
  month: row.month ?? null,
  chargeAh: row.chargeAh,
  dischargeAh: row.dischargeAh,
  chargeWh: row.chargeWh,
  dischargeWh: row.dischargeWh,
  chargeEfficiencyCe: row.chargeEfficiencyCe,
  chargeEfficiencyEe: row.chargeEfficiencyEe,
  children: row.children ?? null,
})

const hasMonthGroupingValue = (row: { reportDate?: string | null; month?: string | null }) =>
  parseMonthValue(row.month ?? null) != null || parseReportDate(row.reportDate ?? null) != null

const resolveMonthlyOverviewRows = (rows: RawDailyListRow[]): MonthlyOverviewSourceRow[] =>
  rows.flatMap((row) => {
    if (hasMonthGroupingValue(row)) {
      return [toMonthlyOverviewSourceRow(row)]
    }

    const monthlyChildren = (row.children ?? [])
      .filter((child) => hasMonthGroupingValue(child))
      .map((child) => toMonthlyOverviewSourceRow(child))

    return monthlyChildren
  })

const formatIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const parseRequestDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid overview daily list date: ${value}`)
  }

  return date
}

const roundValue = (value: number, digits = 2) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

const averageMetric = (values: Array<number | null | undefined>, digits = 2) => {
  const candidates = values.filter((value): value is number => value != null && !Number.isNaN(value))
  if (candidates.length === 0) return null

  const total = candidates.reduce((sum, value) => sum + value, 0)
  return roundValue(total / candidates.length, digits)
}

const sumMetric = (values: Array<number | null | undefined>, digits = 2) => {
  const candidates = values.filter((value): value is number => value != null && !Number.isNaN(value))
  if (candidates.length === 0) return null

  const total = candidates.reduce((sum, value) => sum + value, 0)
  return roundValue(total, digits)
}

const normalizeDailyListPayload = (payload: DailyListRequest): DailyListRequest => ({
  ...payload,
  deviceId: payload.deviceId?.trim() ?? "",
})

const resolveMockDevices = (payload: DailyListRequest): MockBcuDevice[] => {
  const requestedDeviceId = payload.deviceId?.trim()
  const matchedProject = MOCK_OVERVIEW_PROJECTS.find((project) => project.projectId === payload.projectId)
  const projectDevices = matchedProject?.devices ?? []

  if (requestedDeviceId) {
    const matchedIndex = projectDevices.findIndex((device) => device.deviceId === requestedDeviceId)

    return [
      {
        deviceId: requestedDeviceId,
        deviceIndex: matchedIndex >= 0 ? matchedIndex : 0,
      },
    ]
  }

  if (projectDevices.length > 0) {
    return projectDevices.map((device, index) => ({
      deviceId: device.deviceId,
      deviceIndex: index,
    }))
  }

  return [
    { deviceId: "BCU-1", deviceIndex: 0 },
    { deviceId: "BCU-2", deviceIndex: 1 },
    { deviceId: "BCU-3", deviceIndex: 2 },
  ]
}

const buildMockChildRow = (projectId: string, periodIndex: number, device: MockBcuDevice): RawDailyListChildRow => {
  const projectOffset =
    projectId === "9964201b369549b4b04c29bfe3863daa"
      ? 12
      : projectId === "360c0347c09c4735900b9df32f3b8ff7"
        ? 0
        : 6
  const periodOffset = periodIndex * 4.35
  const deviceOffset = device.deviceIndex * 9.4
  const chargeAh = roundValue(78 + projectOffset + periodOffset + deviceOffset, 2)
  const dischargeAh = roundValue(chargeAh * (0.935 + device.deviceIndex * 0.012), 2)
  const chargeWh = roundValue(chargeAh * (430 + projectOffset * 2 + device.deviceIndex * 8), 2)
  const dischargeWh = roundValue(dischargeAh * (405 + projectOffset * 2 + device.deviceIndex * 7), 2)
  const chargeEfficiencyCe = roundValue(89.8 - device.deviceIndex * 0.55 + (periodIndex % 4) * 0.18, 2)
  const chargeEfficiencyEe = roundValue(94.4 - device.deviceIndex * 0.35 + (periodIndex % 3) * 0.12, 2)

  return {
    deviceId: device.deviceId,
    chargeAh,
    dischargeAh,
    chargeWh,
    dischargeWh,
    chargeEfficiencyCe,
    chargeEfficiencyEe,
  }
}

const buildMockAggregateRow = (
  payload: DailyListRequest,
  periodIndex: number,
  rowDate: Date | null,
  month: string | null,
  children: RawDailyListChildRow[],
): RawDailyListRow => {
  const chargeWhValues = children.map((child) => child.chargeWh)
  const dischargeWhValues = children.map((child) => child.dischargeWh)
  const chargeAhValues = children.map((child) => child.chargeAh)
  const dischargeAhValues = children.map((child) => child.dischargeAh)
  const topLevelChargeAh = sumMetric(chargeAhValues, 2)
  const topLevelDischargeAh = sumMetric(dischargeAhValues, 2)
  const topLevelChargeWh = sumMetric(chargeWhValues, 2)
  const topLevelDischargeWh = sumMetric(dischargeWhValues, 2)
  const maxVoltage = roundValue(3.48 + periodIndex * 0.012, 2)
  const minVoltage = roundValue(maxVoltage - (0.09 + (periodIndex % 4) * 0.01), 2)
  const maxTemp = roundValue(31.6 + periodIndex * 0.45, 2)
  const minTemp = roundValue(maxTemp - (5.8 + (periodIndex % 3) * 0.6), 2)

  return {
    createBy: null,
    createTime: null,
    updateBy: null,
    updateTime: null,
    remark: null,
    id: null,
    deviceId: payload.deviceId?.trim() || null,
    projectId: payload.projectId,
    reportDate: rowDate ? formatIsoDate(rowDate) : null,
    month: month ?? undefined,
    chargeAh: topLevelChargeAh,
    dischargeAh: topLevelDischargeAh,
    chargeWh: topLevelChargeWh,
    dischargeWh: topLevelDischargeWh,
    chargeEfficiencyCe: averageMetric(children.map((child) => child.chargeEfficiencyCe), 2),
    chargeEfficiencyEe: averageMetric(children.map((child) => child.chargeEfficiencyEe), 2),
    meterCharge: null,
    meterDischarge: null,
    meterEfficiencySe: null,
    maxVoltageDiff: roundValue(maxVoltage - minVoltage, 2),
    maxTempDiff: roundValue(maxTemp - minTemp, 2),
    maxVoltage,
    minVoltage,
    maxTemp,
    minTemp,
    minVoltageDiff: roundValue(0.03 + (periodIndex % 5) * 0.01, 2),
    avgTempDiff: roundValue(3.6 + (periodIndex % 4) * 0.48, 2),
    avgVoltage: roundValue((maxVoltage + minVoltage) / 2, 2),
    projectName: null,
    delFlag: null,
    children: payload.deviceId?.trim() ? [] : children,
  }
}

const buildMockOverviewDailyListResponse = (payload: DailyListRequest): DailyListResponse => {
  const devices = resolveMockDevices(payload)
  const rows: RawDailyListRow[] = []

  if (payload.params.type === "year") {
    const startDate = parseRequestDate(payload.params.beginTime)
    const endDate = parseRequestDate(payload.params.endTime)
    const startMonth = startDate.getMonth() + 1
    const endMonth = endDate.getMonth() + 1

    for (let month = startMonth; month <= endMonth; month += 1) {
      const children = devices.map((device) => buildMockChildRow(payload.projectId, month - 1, device))
      rows.push(buildMockAggregateRow(payload, month - 1, null, String(month), children))
    }

    return {
      total: rows.length,
      rows,
      code: 200,
      msg: "查询成功",
    }
  }

  const startDate = parseRequestDate(payload.params.beginTime)
  const endDate = parseRequestDate(payload.params.endTime)
  let cursor = new Date(startDate)
  let periodIndex = 0

  while (cursor.getTime() <= endDate.getTime()) {
    const children = devices.map((device) => buildMockChildRow(payload.projectId, periodIndex, device))
    rows.push(buildMockAggregateRow(payload, periodIndex, cursor, String(cursor.getMonth() + 1), children))
    cursor = addDays(cursor, 1)
    periodIndex += 1
  }

  return {
    total: rows.length,
    rows,
    code: 200,
    msg: "查询成功",
  }
}

export const fetchOverviewDailyList = async (payload: DailyListRequest) => {
  const normalizedPayload = normalizeDailyListPayload(payload)
  return apiClient.postRaw<DailyListResponse>(apiEndpoints.overview.dailyList, normalizedPayload)
}

export const normalizeOverviewDailyRows = (
  rows: RawDailyListRow[],
  options: NormalizeOverviewOptions = {},
): EfficiencyPoint[] => {
  const groupBy = options.groupBy ?? "day"
  const language = options.language ?? "zh"

  if (groupBy === "month") {
    return resolveMonthlyOverviewRows(rows)
      .map((row) => {
        const monthFromField = parseMonthValue(row.month)
        const monthFromDate = parseReportDate(row.reportDate)?.getMonth()
        const month = monthFromField ?? (monthFromDate == null ? null : monthFromDate + 1)

        if (month == null) {
          return null
        }

        return {
          month,
          chargeCapacity: resolveCapacityMetric(row.chargeAh, row.children, (child) => child.chargeAh),
          dischargeCapacity: resolveCapacityMetric(row.dischargeAh, row.children, (child) => child.dischargeAh),
          chargeEnergy: resolveEnergyMetric(row.chargeWh, row.children, (child) => child.chargeWh),
          dischargeEnergy: resolveEnergyMetric(row.dischargeWh, row.children, (child) => child.dischargeWh),
          capacityEfficiency: normalizeNumber(row.chargeEfficiencyCe, 2),
          energyEfficiency: normalizeNumber(row.chargeEfficiencyEe, 2),
          children: normalizeOverviewChildRows(row.children),
        }
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
      .sort((a, b) => a.month - b.month)
      .map((row) => ({
        label: formatMonthLabel(row.month, language),
        chargeCapacity: row.chargeCapacity,
        dischargeCapacity: row.dischargeCapacity,
        chargeEnergy: row.chargeEnergy,
        dischargeEnergy: row.dischargeEnergy,
        capacityEfficiency: row.capacityEfficiency,
        energyEfficiency: row.energyEfficiency,
        children: row.children,
      }))
  }

  return [...rows]
    .sort((a, b) => {
      const aTime = parseReportDate(a.reportDate)?.getTime() ?? Number.POSITIVE_INFINITY
      const bTime = parseReportDate(b.reportDate)?.getTime() ?? Number.POSITIVE_INFINITY
      return aTime - bTime
    })
    .map((row) => ({
      label: formatDateLabel(row.reportDate),
      chargeCapacity: resolveCapacityMetric(row.chargeAh, row.children, (child) => child.chargeAh),
      dischargeCapacity: resolveCapacityMetric(row.dischargeAh, row.children, (child) => child.dischargeAh),
      chargeEnergy: resolveEnergyMetric(row.chargeWh, row.children, (child) => child.chargeWh),
      dischargeEnergy: resolveEnergyMetric(row.dischargeWh, row.children, (child) => child.dischargeWh),
      capacityEfficiency: normalizeNumber(row.chargeEfficiencyCe, 2),
      energyEfficiency: normalizeNumber(row.chargeEfficiencyEe, 2),
      children: normalizeOverviewChildRows(row.children),
    }))
}

export const formatNullableMetric = (value: number | null | undefined, digits = 1, suffix = "") => {
  if (value == null || Number.isNaN(value)) return API_PLACEHOLDER
  return `${value.toFixed(digits)}${suffix}`
}
