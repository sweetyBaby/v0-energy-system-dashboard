import type { ProjectDevice } from "@/lib/api/project"

export const normalizeOptionalDeviceId = (value?: string | null) => {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
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
