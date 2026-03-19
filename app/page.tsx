"use client"

import { Header } from "@/components/dashboard/header"
import { PowerStats } from "@/components/dashboard/power-stats"
import { ElectricityIndicators } from "@/components/dashboard/electricity-indicators"
import { ChinaMap } from "@/components/dashboard/china-map"
import { StationStats } from "@/components/dashboard/station-stats"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { EfficiencyIndicators } from "@/components/dashboard/efficiency-indicators"
import { SocialBenefits } from "@/components/dashboard/social-benefits"
import { GridConnectionData } from "@/components/dashboard/grid-connection-data"
import { PowerCurve } from "@/components/dashboard/power-curve"
import { StationCards } from "@/components/dashboard/station-cards"

export default function EnergyStorageDashboard() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className="p-4 lg:p-6">
        <div className="grid grid-cols-12 gap-4 lg:gap-6">
          {/* Left Column */}
          <div className="col-span-12 lg:col-span-3 space-y-4 lg:space-y-6">
            <PowerStats />
            <ElectricityIndicators />
            <GridConnectionData />
            <PowerCurve />
          </div>

          {/* Center Column */}
          <div className="col-span-12 lg:col-span-6 space-y-4 lg:space-y-6">
            <ChinaMap />
            <StationStats />
            <StationCards />
          </div>

          {/* Right Column */}
          <div className="col-span-12 lg:col-span-3 space-y-4 lg:space-y-6">
            <RevenueChart />
            <EfficiencyIndicators />
            <SocialBenefits />
          </div>
        </div>
      </main>
    </div>
  )
}
