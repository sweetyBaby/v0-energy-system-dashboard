"use client"

import { useState, useEffect } from "react"
import { Zap, Bell, Settings } from "lucide-react"

export function DashboardHeader() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    const seconds = String(date.getSeconds()).padStart(2, "0")
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
  }

  return (
    <header className="relative px-6 py-4 border-b border-[#1a2654]">
      {/* Background gradient line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[2px] bg-gradient-to-r from-transparent via-[#00d4aa] to-transparent" />
      
      <div className="flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#3b82f6] flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-lg font-semibold text-[#7b8ab8]">储能云平台</span>
        </div>

        {/* Center: Title */}
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <h1 className="text-2xl font-bold tracking-wider bg-gradient-to-r from-[#00d4aa] via-[#22d3ee] to-[#00d4aa] bg-clip-text text-transparent">
            储能电站数据分析大屏
          </h1>
        </div>

        {/* Right: Time and controls */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#7b8ab8] font-mono">
            {currentTime ? formatDate(currentTime) : "----/--/-- --:--:--"}
          </span>
          <button className="p-2 rounded-lg hover:bg-[#1a2654] transition-colors">
            <Bell className="w-5 h-5 text-[#7b8ab8]" />
          </button>
          <button className="p-2 rounded-lg hover:bg-[#1a2654] transition-colors">
            <Settings className="w-5 h-5 text-[#7b8ab8]" />
          </button>
        </div>
      </div>
    </header>
  )
}
