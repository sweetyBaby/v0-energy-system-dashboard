"use client"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ProjectInfo } from "@/components/dashboard/project-info"
import { ChargeDischargeTable } from "@/components/dashboard/charge-discharge-table"
import { EfficiencyChart } from "@/components/dashboard/efficiency-chart"
import { PowerCurveQuery } from "@/components/dashboard/power-curve-query"
import { EnergyCurveQuery } from "@/components/dashboard/energy-curve-query"
import { AnnualMonthlyChart } from "@/components/dashboard/annual-monthly-chart"
import { MonthlyDailyChart } from "@/components/dashboard/monthly-daily-chart"
import { VoltageDifferenceAnalysis } from "@/components/dashboard/voltage-difference-analysis"
import { TemperatureDifferenceAnalysis } from "@/components/dashboard/temperature-difference-analysis"
import { CellVoltageAnalysis } from "@/components/dashboard/cell-voltage-analysis"
import { BCUStatusQuery } from "@/components/dashboard/bcu-status-query"

export default function EnergyStorageDashboard() {
  return (
    <div className="min-h-screen bg-[#0a0e27] text-[#e8f4fc]">
      <DashboardHeader />
      
      <main className="p-4 space-y-4">
        {/* Row 1: Project Info + Charge/Discharge Table + Efficiency */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-3">
            <ProjectInfo />
          </div>
          <div className="col-span-12 lg:col-span-5">
            <ChargeDischargeTable />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <EfficiencyChart />
          </div>
        </div>

        {/* Row 2: Power Curve + Energy Curve */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-6">
            <PowerCurveQuery />
          </div>
          <div className="col-span-12 lg:col-span-6">
            <EnergyCurveQuery />
          </div>
        </div>

        {/* Row 3: Annual Monthly + Monthly Daily */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-6">
            <AnnualMonthlyChart />
          </div>
          <div className="col-span-12 lg:col-span-6">
            <MonthlyDailyChart />
          </div>
        </div>

        {/* Row 4: Voltage Difference + Temperature Difference */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-6">
            <VoltageDifferenceAnalysis />
          </div>
          <div className="col-span-12 lg:col-span-6">
            <TemperatureDifferenceAnalysis />
          </div>
        </div>

        {/* Row 5: Cell Voltage + BCU Status */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-6">
            <CellVoltageAnalysis />
          </div>
          <div className="col-span-12 lg:col-span-6">
            <BCUStatusQuery />
          </div>
        </div>
      </main>
    </div>
  )
}
