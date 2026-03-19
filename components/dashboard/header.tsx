"use client"

import { useState, useEffect } from "react"
import { Zap, Settings, Bell, User } from "lucide-react"

export function Header() {
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
    <header className="relative px-6 py-4 border-b border-border bg-gradient-to-r from-secondary/50 via-transparent to-secondary/50">
      {/* Decorative lines */}
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      
      <div className="flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="absolute -inset-1 rounded-lg bg-primary/20 blur-sm -z-10" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-wide">储云科技</h1>
            <p className="text-xs text-muted-foreground">Energy Cloud</p>
          </div>
        </div>

        {/* Center Title */}
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <div className="flex items-center gap-4">
            <div className="w-24 h-px bg-gradient-to-r from-transparent to-primary" />
            <h2 className="text-xl lg:text-2xl font-bold text-foreground tracking-widest">
              独立储能电站能量云
            </h2>
            <div className="w-24 h-px bg-gradient-to-l from-transparent to-primary" />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-6">
          <span className="text-sm text-muted-foreground font-mono">
            {currentTime ? formatDate(currentTime) : "----/--/-- --:--:--"}
          </span>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <User className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <span className="text-sm text-primary cursor-pointer hover:underline">
            进入系统
          </span>
        </div>
      </div>
    </header>
  )
}
