"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { AUTH_EXPIRED_EVENT, AUTH_EXPIRED_MESSAGE } from "@/lib/api-client"

const REDIRECT_DELAY_MS = 1200

export function AuthExpiredHandler() {
  const router = useRouter()
  const pathname = usePathname()
  const redirectTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const handleAuthExpired = (event: Event) => {
      const detail =
        event instanceof CustomEvent && typeof event.detail === "object" && event.detail
          ? event.detail
          : null
      const message =
        detail && typeof detail.message === "string" && detail.message.trim()
          ? detail.message.trim()
          : AUTH_EXPIRED_MESSAGE

      toast({
        title: message,
        className:
          "border border-[#22D3EE]/22 bg-[linear-gradient(180deg,rgba(8,18,36,0.96),rgba(6,12,28,0.94))] text-[#ECF7FF] shadow-[0_0_0_1px_rgba(34,211,238,0.06)_inset,0_18px_46px_rgba(4,10,24,0.48),0_0_28px_rgba(34,211,238,0.12)]",
      })

      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current)
      }

      redirectTimerRef.current = window.setTimeout(() => {
        if (pathname !== "/") {
          router.replace("/")
          return
        }

        router.refresh()
      }, REDIRECT_DELAY_MS)
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current)
      }
    }
  }, [pathname, router])

  return null
}
