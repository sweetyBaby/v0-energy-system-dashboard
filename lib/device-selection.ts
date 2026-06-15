import type { ProjectDevice } from "@/lib/api/project"
import type { MonitorDeviceKind } from "@/lib/api/trend-analysis"

export const normalizeOptionalDeviceId = (value?: string | null) => {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

export type MonitorDevice = { deviceId: string; deviceName: string; deviceKind: MonitorDeviceKind }

/** Classify a project device into the monitoring hierarchy (Rack / PCS / EMS). */
export const inferDeviceKind = (device: Pick<ProjectDevice, "deviceType" | "deviceName">): MonitorDeviceKind => {
  const source = `${device.deviceType ?? ""} ${device.deviceName ?? ""}`.toLowerCase()
  if (source.includes("pcs")) return "pcs"
  if (source.includes("ems")) return "ems"
  return "rack"
}

/**
 * The canonical monitorable device list for a site: real devices (BCU/Rack…)
 * classified by kind, plus a synthesized PCS / EMS entry when the site has none
 * (so every monitoring view exposes the full Rack/PCS/EMS hierarchy). Shared by
 * the trend/status workspaces and the alarm device selector so they stay in sync.
 */
export const buildMonitorDevices = (
  projectId: string,
  devices: ProjectDevice[],
  includeStationDevices = true
): MonitorDevice[] => {
  const base = devices
    .filter((device) => device.deviceId)
    .map((device, index) => ({
      deviceId: device.deviceId,
      deviceName: device.deviceName || `BCU ${index + 1}`,
      deviceKind: inferDeviceKind(device),
    }))

  if (!includeStationDevices) return base

  const hasKind = (kind: MonitorDeviceKind) => base.some((device) => device.deviceKind === kind)
  return [
    ...base,
    ...(hasKind("pcs") ? [] : [{ deviceId: `${projectId}::pcs-1`, deviceName: "PCS-1", deviceKind: "pcs" as const }]),
    ...(hasKind("ems") ? [] : [{ deviceId: `${projectId}::ems`, deviceName: "EMS", deviceKind: "ems" as const }]),
  ]
}

export const resolveProjectDeviceId = (devices: ProjectDevice[], preferredDeviceId?: string | null) => {
  const normalizedPreferred = normalizeOptionalDeviceId(preferredDeviceId)

  if (normalizedPreferred) {
    const matchedDevice = devices.find((device) => normalizeOptionalDeviceId(device.deviceId) === normalizedPreferred)
    if (matchedDevice) {
      return normalizedPreferred
    }
  }

  return devices.map((device) => normalizeOptionalDeviceId(device.deviceId)).find((deviceId) => Boolean(deviceId))
}
