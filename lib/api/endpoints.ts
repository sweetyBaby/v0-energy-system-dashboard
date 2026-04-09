/**
 * Centralized backend endpoint registry.
 * UI components should not hardcode `/ems/...` paths directly.
 */
export const apiEndpoints = {
  overview: {
    /**
     * Overview project detail.
     * Used for rated power, rated capacity, commissioning date and other project-level fields.
     */
    projectDetail: (projectId: string) => `/ems/project/${projectId}`,
    /**
     * Overview realtime snapshot.
     * Used for SOC, PACK voltage/current, power, SOH and overview cards.
     */
    realtime: (projectId: string) => `/ems/dashboard/realtime/${projectId}_sync`,
    /**
     * Comprehensive efficiency daily statistics.
     */
    dailyList: "/ems/daily/list",
  },
  power: {
    /**
     * Today full power series.
     * measurement = `${projectId}_sync`
     */
    daily: "/ems/power/daily",
    /**
     * Today incremental power series.
     * measurement = `${projectId}_sync`
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
     * Query: measurement = `${projectId}_sync`
     */
    temp1Latest: "/ems/temp/temp1/latest",
    /**
     * Latest T2 temperature heatmap snapshot.
     * Query: measurement = `${projectId}_sync`
     */
    temp2Latest: "/ems/temp/temp2/latest",
    /**
     * Latest T3 temperature heatmap snapshot.
     * Query: measurement = `${projectId}_sync`
     */
    temp3Latest: "/ems/temp/temp3/latest",
    /**
     * Latest cell voltage heatmap snapshot.
     * Query: measurement = `${projectId}_sync`
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
  analysis: {
    /**
     * Daily trend data within a date range for voltage diff / temp diff / cell voltage analysis.
     * Query: projectId, startDate = yyyyMMdd, endDate = yyyyMMdd
     */
    dailyTrendRange: "/ems/daily/trend/range",
  },
} as const
