"use client"

import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react"

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const round = (value: number, digits = 2) => Number(value.toFixed(digits))

type UseFluidScaleOptions = {
  axis?: "width" | "height" | "min"
  minRootPx?: number
  maxRootPx?: number
}

type FluidScaleResult<T extends HTMLElement> = {
  ref: RefObject<T | null>
  progress: number
  scale: number
  rootPx: number
  fluid: (min: number, max: number) => number
  chart: (min: number, max: number) => number
  rem: (multiple: number) => string
  clampText: (minRem: number, multiple: number, maxRem: number) => string
  rootStyle: CSSProperties
}

export function useFluidScale<T extends HTMLElement = HTMLDivElement>(
  minSize = 1280,
  maxSize = 1920,
  options: UseFluidScaleOptions = {},
): FluidScaleResult<T> {
  const { axis = "width", minRootPx = 14, maxRootPx = 18 } = options
  const ref = useRef<T>(null)
  const [{ width, height }, setRect] = useState({ width: minSize, height: minSize })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const updateRect = (nextWidth: number, nextHeight: number) => {
      setRect((current) => {
        if (current.width === nextWidth && current.height === nextHeight) {
          return current
        }

        return { width: nextWidth, height: nextHeight }
      })
    }

    updateRect(element.clientWidth, element.clientHeight)

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return

      const nextWidth = entry.contentRect.width || element.clientWidth
      const nextHeight = entry.contentRect.height || element.clientHeight
      updateRect(nextWidth, nextHeight)
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return useMemo(() => {
    const targetSize = axis === "height" ? height : axis === "min" ? Math.min(width, height) : width
    const safeSpan = Math.max(1, maxSize - minSize)
    const progress = clamp((targetSize - minSize) / safeSpan, 0, 1)
    const scale = round(0.94 + progress * 0.4, 4)
    const rootPx = round(minRootPx + (maxRootPx - minRootPx) * progress, 3)
    const fluid = (min: number, max: number) => round(min + (max - min) * progress, 2)
    const chart = (min: number, max: number) => round(min + (max - min) * (0.18 + progress * 0.82), 2)
    const rem = (multiple: number) => `calc(var(--overview-root-size, ${minRootPx}px) * ${multiple})`
    const clampText = (minRem: number, multiple: number, maxRem: number) =>
      `clamp(${minRem}rem, calc(var(--overview-root-size, ${minRootPx}px) * ${multiple}), ${maxRem}rem)`

    return {
      ref,
      progress,
      scale,
      rootPx,
      fluid,
      chart,
      rem,
      clampText,
      rootStyle: {
        ["--overview-root-size" as "--overview-root-size"]: `${rootPx}px`,
        ["--overview-chart-font-size" as "--overview-chart-font-size"]: `${chart(10, 13)}px`,
        ["--overview-control-font-size" as "--overview-control-font-size"]: `${fluid(12, 15)}px`,
      } as CSSProperties,
    }
  }, [axis, height, maxRootPx, maxSize, minRootPx, minSize, width])
}
