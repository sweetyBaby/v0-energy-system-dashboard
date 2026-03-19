"use client"

import { useState } from "react"
import { MapPin } from "lucide-react"

const stations = [
  { id: 1, name: "苏云储能1号", location: "华东区域", x: 78, y: 52, status: "正常" },
  { id: 2, name: "苏云储能2号", location: "华北区域", x: 72, y: 35, status: "正常" },
  { id: 3, name: "苏云储能3号", location: "华南区域", x: 68, y: 72, status: "正常" },
  { id: 4, name: "苏云储能4号", location: "西南区域", x: 45, y: 58, status: "维护中" },
  { id: 5, name: "苏云储能5号", location: "华中区域", x: 62, y: 50, status: "正常" },
]

export function ChinaMap() {
  const [hoveredStation, setHoveredStation] = useState<number | null>(null)

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="relative aspect-[4/3] bg-gradient-to-b from-secondary/30 to-transparent rounded-lg overflow-hidden">
        {/* Map Background - Simplified China shape using CSS */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 100 80" className="w-full h-full opacity-60">
            <defs>
              <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1a2654" />
                <stop offset="100%" stopColor="#0d1233" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {/* Simplified China map outline */}
            <path
              d="M25,15 L35,10 L45,8 L55,10 L65,8 L75,12 L85,15 L88,25 L85,35 L82,45 L78,55 L72,62 L65,65 L55,68 L45,65 L38,60 L32,55 L28,48 L25,40 L22,32 L20,25 Z"
              fill="url(#mapGradient)"
              stroke="#3b82f6"
              strokeWidth="0.5"
              filter="url(#glow)"
            />
            {/* Province borders (simplified) */}
            <path d="M45,20 L55,35 L65,45" stroke="#3b82f6" strokeWidth="0.2" fill="none" opacity="0.5" />
            <path d="M35,35 L50,40 L60,35" stroke="#3b82f6" strokeWidth="0.2" fill="none" opacity="0.5" />
            <path d="M40,50 L55,52 L65,48" stroke="#3b82f6" strokeWidth="0.2" fill="none" opacity="0.5" />
          </svg>
        </div>

        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {stations.slice(0, -1).map((station, index) => {
            const next = stations[index + 1]
            return (
              <line
                key={`line-${station.id}`}
                x1={`${station.x}%`}
                y1={`${station.y}%`}
                x2={`${next.x}%`}
                y2={`${next.y}%`}
                stroke="#00d4aa"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.5"
              />
            )
          })}
        </svg>

        {/* Station Markers */}
        {stations.map((station) => (
          <div
            key={station.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
            style={{ left: `${station.x}%`, top: `${station.y}%` }}
            onMouseEnter={() => setHoveredStation(station.id)}
            onMouseLeave={() => setHoveredStation(null)}
          >
            <div className={`relative ${station.status === "正常" ? "text-primary" : "text-accent"}`}>
              <div className="absolute inset-0 animate-ping rounded-full bg-current opacity-20" />
              <div className="relative w-6 h-6 rounded-full bg-current/20 border-2 border-current flex items-center justify-center">
                <MapPin className="w-3 h-3" />
              </div>
            </div>
            
            {/* Tooltip */}
            {hoveredStation === station.id && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-xl z-10 whitespace-nowrap">
                <p className="text-sm font-medium text-foreground">{station.name}</p>
                <p className="text-xs text-muted-foreground">{station.location}</p>
                <div className="flex items-center gap-1 mt-1">
                  <div className={`w-2 h-2 rounded-full ${station.status === "正常" ? "bg-primary" : "bg-accent"}`} />
                  <span className="text-xs text-muted-foreground">{station.status}</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">运行中</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-muted-foreground">维护中</span>
          </div>
        </div>
      </div>
    </div>
  )
}
