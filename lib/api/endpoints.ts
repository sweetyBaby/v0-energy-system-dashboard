/**
 * 统一管理前端使用到的后端接口路径。
 * 页面和组件层不要直接拼接 `/ems/...`，统一从这里取。
 */
export const apiEndpoints = {
  overview: {
    /**
     * 总览页项目基础信息。
     * 用于获取额定功率、额定容量、投运日期，以及后续总览卡片可能补充的扩展字段。
     */
    projectDetail: (projectId: string) => `/ems/project/${projectId}`,
    /**
     * 总览页实时数据。
     * 用于获取 SOC、PACK 电压、电流、功率、SOH，以及昨日/本月/累计统计值。
     */
    realtime: (projectId: string) => `/ems/dashboard/realtime/${projectId}`,
  },
} as const
