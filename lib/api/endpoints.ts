/**
 * Centralized backend endpoint registry.
 * UI components should not hardcode `/ems/...` paths directly.
 */
export const apiEndpoints = {
  auth: {
    cloudLogin: "/login/cloud",
    logout: "/logout",
  },
  project: {
    /**
     * Header project selector list.
     * This endpoint returns `{ code, msg, total, rows }`.
     */
    listByDevice: "/ems/project/listByDevice",
  },
  overview: {
    /**
     * Overview project detail.
     * Used for rated power, rated capacity, commissioning date and other project-level fields.
     */
    projectDetail: (projectId: string) => `/ems/project/${projectId}`,
    /**
     * Project dashboard overview statistics.
     * Used by the map overview cards and lifecycle summary.
     */
    dashboardOverview: "/ems/project/dashboard/overview",
    /**
     * Project dashboard EE ranking.
     */
    eeRanking: "/ems/project/dashboard/eeRanking",
    /**
     * Project dashboard charge/discharge ranking.
     */
    chargeDischargeRanking: "/ems/project/dashboard/chargeDischargeRanking",
    /**
     * Project dashboard site-level realtime info.
     * Query: projectId?, deviceId?
     */
    siteInfos: "/ems/project/dashboard/siteInfos",
    /**
     * Overview realtime snapshot.
     * Used for SOC, PACK voltage/current, power, SOH and overview cards.
     */
    realtime: (projectId: string) => `/ems/dashboard/realtime/${projectId}`,
    /**
     * Comprehensive efficiency daily statistics.
     */
    dailyList: "/ems/daily/list",
  },
  power: {
    /**
     * Today full power series.
     * measurement = `${projectId}`
     */
    daily: "/ems/power/daily",
    /**
     * Today incremental power series.
     * measurement = `${projectId}`
     */
    incremental: "/ems/power/incremental",
    /**
     * Historical power series by date range.
     */
    range: "/ems/power/range",
    yesterday: "/ems/power/yesterday",
    last7days: "/ems/power/last7days",
  },
  operations: {
    auxRecent: "/ems/aux/recent",
    auxIncremental: "/ems/aux/incremental",
    cellVoltageRecent: "/ems/cell/statistics/recent",
    cellVoltageIncremental: "/ems/cell/statistics/incremental",
    cellTemperatureRecent: "/ems/cell/temperature/recent",
    cellTemperatureIncremental: "/ems/cell/temperature/incremental",
  },
  heatmap: {
    /**
     * Latest T1 temperature heatmap snapshot.
     * Query: measurement = `${projectId}`
     */
    temp1Latest: "/ems/temp/temp1/latest",
    /**
     * Latest T2 temperature heatmap snapshot.
     * Query: measurement = `${projectId}`
     */
    temp2Latest: "/ems/temp/temp2/latest",
    /**
     * Latest T3 temperature heatmap snapshot.
     * Query: measurement = `${projectId}`
     */
    temp3Latest: "/ems/temp/temp3/latest",
    /**
     * Latest cell voltage heatmap snapshot.
     * Query: measurement = `${projectId}`
     */
    cellLatest: "/ems/cell/latest",
  },
  cellHistory: {
    /**
     * BCU daily history for current / voltage / power / SOC.
     * Query: measurement = projectId, date = YYYY-MM-DD
     */
    bcuDaily: "/ems/bcu/history/daily",
    /**
     * Daily max/min cell voltage for the selected BCU.
     * Query: measurement = projectId, deviceId = BCU id, date = YYYY-MM-DD
     */
    voltageStatisticsDaily: "/ems/cell/statistics/daily",
    /**
     * Daily max/min cell temperature for the selected BCU.
     * Query: measurement = projectId, deviceId = BCU id, date = YYYY-MM-DD
     */
    temperatureDaily: "/ems/cell/temperature/daily",
    /**
     * Cell daily detail metrics.
     * Query: measurement = projectId, date = YYYY-MM-DD
     */
    detailDaily: "/ems/cell/detail/daily",
    /**
     * Cell voltage / temperature extreme statistics.
     * Query: measurement = projectId, date = YYYY-MM-DD
     */
    extremeDaily: "/ems/cell/extreme/daily",
    /**
     * Cell daily voltage curve.
     * Query: measurement = projectId, date = YYYY-MM-DD
     */
    voltageDaily: "/ems/cell/history/voltage",
    /**
     * Cell daily T1 curve.
     * Query: measurement = projectId, date = YYYY-MM-DD
     */
    temp1Daily: "/ems/cell/history/temp1",
    /**
     * Cell daily T2 curve.
     * Query: measurement = projectId, date = YYYY-MM-DD
     */
    temp2Daily: "/ems/cell/history/temp2",
    /**
     * Cell daily T3 curve.
     * Query: measurement = projectId, date = YYYY-MM-DD
     */
    temp3Daily: "/ems/cell/history/temp3",
  },
  fault: {
    /**
     * Historical fault summary list for alarm monitoring table.
     * Query: projectId, deviceId, statDate = YYYY-MM-DD
     */
    list: "/ems/fault/list",
    /**
     * Historical fault detail list for alarm monitoring gantt.
     * Query: projectId, deviceId, statDate = YYYY-MM-DD
     */
    detailList: "/ems/fault/detail/list",
  },
  analysis: {
    /**
     * Daily trend data within a date range for voltage diff / temp diff / cell voltage analysis.
     * Query: projectId, startDate = yyyyMMdd, endDate = yyyyMMdd
     */
    dailyTrendRange: "/ems/daily/trend/range",
  },
  reports: {
    /**
     * Report-center daily report list.
     *
     * NOTE: this endpoint lives on a SEPARATE upstream (`REPORT_API_BASE_URL`,
     * e.g. 8083) — NOT the common `API_BASE_URL` (9016/prod-api). It is reached
     * through the dedicated `/api/report-proxy/*` route, so paths here are
     * relative to that proxy base, not the common `/api/proxy` base.
     *
     * POST body: { project_id, year, month } — project_id carries the selected
     * BCU deviceId (value unchanged); year/month are plain numbers, no zero-padding.
     */
    list: "/api/getReportList",
  },
} as const
