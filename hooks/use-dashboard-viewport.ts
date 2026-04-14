"use client"

import { useEffect, useState } from "react"

type DashboardViewport = {
  width: number
  height: number
  isCompactWidth: boolean
  isShortHeight: boolean
  isCompactViewport: boolean
}

const DEFAULT_VIEWPORT = {
  width: 1440,
  height: 900,
}

const readViewport = () => {
  if (typeof window === "undefined") {
    return DEFAULT_VIEWPORT
  }

  const visualViewport = window.visualViewport

  return {
    width: Math.round(visualViewport?.width ?? window.innerWidth),
    height: Math.round(visualViewport?.height ?? window.innerHeight),
  }
}

export function useDashboardViewport(): DashboardViewport {
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT)

  useEffect(() => {
    const updateViewport = () => {
      setViewport((current) => {
        const next = readViewport()
        if (current.width === next.width && current.height === next.height) {
          return current
        }

        return next
      })
    }

    updateViewport()
    window.addEventListener("resize", updateViewport)
    window.visualViewport?.addEventListener("resize", updateViewport)

    return () => {
      window.removeEventListener("resize", updateViewport)
      window.visualViewport?.removeEventListener("resize", updateViewport)
    }
  }, [])

  const isCompactWidth = viewport.width <= 1280
  const isShortHeight = viewport.height <= 840

  return {
    ...viewport,
    isCompactWidth,
    isShortHeight,
    isCompactViewport: isCompactWidth || isShortHeight,
  }
}
