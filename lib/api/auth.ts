import { apiClient } from "@/lib/api-client"
import { apiEndpoints } from "@/lib/api/endpoints"

export interface CloudLoginRequest {
  username: string
  password: string
  code?: string
  uuid?: string
}

export interface CloudLoginResponse {
  msg: string
  code: number
  token: string
}

export async function loginWithCloud(payload: CloudLoginRequest) {
  return apiClient.postRaw<CloudLoginResponse>(apiEndpoints.auth.cloudLogin, payload)
}
