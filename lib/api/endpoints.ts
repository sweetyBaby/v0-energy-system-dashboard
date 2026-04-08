/**
 * 统一管理前端使用到的后端接口路径。
 * 页面和组件层不要直接拼接 `/ems/...`，统一从这里取。
 */
export const apiEndpoints = {
  overview: {
    /**
     * 总览页项目基础信息。
     * 用于获取额定功率、额定容量、投运日期等项目级字段。
     */
    projectDetail: (projectId: string) => `/ems/project/${projectId}`,
    /**
     * 总览页实时概览数据。
     * 用于获取 SOC、PACK 电压、电流、功率、SOH 以及总览统计卡片数据。
     */
    realtime: (projectId: string) => `/ems/dashboard/realtime/${projectId}`,
    /**
     * 综合能效统计。
     * 根据项目和时间范围返回日报列表，供图表和表格共用。
     */
    dailyList: "/ems/daily/list",
  },
  power: {
    /**
     * 获取今日功率全量数据。
     * 约定 measurement = `${projectId}_sync`。
     */
    daily: "/ems/power/daily",
    /**
     * 获取今日功率增量数据。
     * 约定 measurement = `${projectId}_sync`，from 为秒级 Unix 时间戳。
     */
    incremental: "/ems/power/incremental",
    /**
     * 获取历史时间范围内的功率数据。
     * 用于昨日、近 7 日和自定义日期查询。
     */
    range: "/ems/power/range",
    /**
     * 文档中还提供了昨日独立接口，当前页面不直接使用。
     */
    yesterday: "/ems/power/yesterday",
    /**
     * 文档中还提供了近 7 日独立接口，当前页面不直接使用。
     */
    last7days: "/ems/power/last7days",
  },
} as const
