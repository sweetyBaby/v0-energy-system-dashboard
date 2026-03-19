"use client"

import { MapPin, Zap, ChevronRight } from "lucide-react"
import Image from "next/image"

const stationImages = [
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-wc84R1My3YmQOpbtoC8n3MQKi2HhhV.png",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-to1wBbMdYBN5jlS05Ho0MGVtEC5EEq.png",
]

const stations = [
  {
    name: "苏云储能1号",
    capacity: "100MWh",
    status: "正常",
    location: "浙江省杭州市萧山区",
    image: 0,
  },
  {
    name: "苏云储能2号",
    capacity: "52MWh",
    status: "正常",
    location: "江苏省南京市江宁区",
    image: 1,
  },
]

export function StationCards() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {stations.map((station, index) => (
        <div
          key={station.name}
          className="rounded-lg border border-border bg-card overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors"
        >
          {/* Image */}
          <div className="relative h-32 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary to-card">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-lg bg-secondary/50 flex items-center justify-center border border-border">
                  <Zap className="w-10 h-10 text-primary/50" />
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          </div>

          {/* Content */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">站点名称:</p>
                <p className="text-sm font-medium text-foreground">{station.name}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>

            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="text-muted-foreground">装机容量:</p>
                <p className="font-medium text-chart-4">{station.capacity}</p>
              </div>
              <div>
                <p className="text-muted-foreground">站点状态:</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-primary">{station.status}</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-1 text-xs">
              <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-muted-foreground">{station.location}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
