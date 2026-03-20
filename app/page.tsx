"use client"

import { DashboardHeader, ProjectProvider } from "@/components/dashboard/dashboard-header"
import { ProjectInfo } from "@/components/dashboard/project-info"
import { ChargeDischargeTable } from "@/components/dashboard/charge-discharge-table"
import { EfficiencyChart } from "@/components/dashboard/efficiency-chart"
import { PowerCurveQuery } from "@/components/dashboard/power-curve-query"
import { EnergyCurveQuery } from "@/components/dashboard/energy-curve-query"
import { VoltageDifferenceAnalysis } from "@/components/dashboard/voltage-difference-analysis"
import { TemperatureDifferenceAnalysis } from "@/components/dashboard/temperature-difference-analysis"
import { CellVoltageAnalysis } from "@/components/dashboard/cell-voltage-analysis"
import { BCUStatusQuery } from "@/components/dashboard/bcu-status-query"

export default function EnergyStorageDashboard() {
  return (
    <ProjectProvider>
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

          {/* Row 2: Energy Statistics + Power Curve */}
          <div className="grid grid-cols-12 gap-4 items-stretch">
            <div className="col-span-12 lg:col-span-6 flex">
              <EnergyCurveQuery />
            </div>
            <div className="col-span-12 lg:col-span-6 flex">
              <PowerCurveQuery />
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

          {/* Row 5: BCU Status + Cell Voltage */}
          <div className="grid grid-cols-12 gap-4 items-stretch">
            <div className="col-span-12 lg:col-span-6 flex">
              <CellVoltageAnalysis />
            </div>
            <div className="col-span-12 lg:col-span-6 flex">
              <BCUStatusQuery />
            </div>

          </div>
        </main>
      </div>
    </ProjectProvider>
  )
}
