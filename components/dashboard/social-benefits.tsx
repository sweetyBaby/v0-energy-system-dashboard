"use client"

import { Leaf, Droplets, TreePine, Wind } from "lucide-react"

const benefits = [
  {
    label: "CO2减排总量 (吨)",
    value: "75,656.35",
    icon: Wind,
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
  },
  {
    label: "等效植树 (万棵)",
    value: "56.35",
    icon: TreePine,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    label: "煤炭节省 (吨)",
    value: "656.35",
    icon: Droplets,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
]

export function SocialBenefits() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-primary rounded-full" />
        <h3 className="text-sm font-medium text-muted-foreground">社会效益</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {benefits.map((benefit) => (
          <div key={benefit.label} className="text-center space-y-2">
            <div className={`w-12 h-12 mx-auto rounded-xl ${benefit.bgColor} flex items-center justify-center`}>
              <benefit.icon className={`w-6 h-6 ${benefit.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground leading-tight">{benefit.label}</p>
              <p className={`text-lg font-bold ${benefit.color}`}>{benefit.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="pt-2 border-t border-border">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">日均发电量</p>
            <p className="text-lg font-bold text-foreground">1,234.56 <span className="text-xs font-normal">kWh</span></p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">月度节能</p>
            <p className="text-lg font-bold text-foreground">45,678.90 <span className="text-xs font-normal">kWh</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
