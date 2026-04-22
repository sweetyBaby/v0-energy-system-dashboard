"use client"

import { useEffect, useRef } from "react"
import { AlertTriangle } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { AUTH_EXPIRED_EVENT } from "@/lib/api-client"

const REDIRECT_DELAY_MS = 1200

export function AuthExpiredHandler() {
  const router = useRouter()
  const pathname = usePathname()
  const redirectTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const redirectToLogin = () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current)
      }

      if (pathname !== "/") {
        router.replace("/")
        return
      }

      router.refresh()
    }

    const handleAuthExpired = (event: Event) => {
      const detail =
        event instanceof CustomEvent && typeof event.detail === "object" && event.detail
          ? event.detail
          : null
      const message =
        detail && typeof detail.message === "string" && detail.message.trim()
          ? detail.message.trim()
          : "登录状态已失效"

      toast({
        variant: "destructive",
        title: (
          <span className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ff9cac]/28 bg-[radial-gradient(circle_at_30%_30%,rgba(255,182,193,0.28),rgba(255,107,125,0.08)_58%,transparent_100%)] text-[#ffb6c0] shadow-[0_0_22px_rgba(255,107,125,0.15)]">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <span>{message}</span>
          </span>
        ),
        description: "正在返回登录页，请重新登录。",
        className:
          "border-[#ff6b7d]/35 shadow-[0_0_0_1px_rgba(255,153,171,0.08)_inset,0_18px_46px_rgba(24,6,12,0.52),0_0_30px_rgba(255,107,125,0.16)]",
      })

      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current)
      }

      redirectTimerRef.current = window.setTimeout(redirectToLogin, REDIRECT_DELAY_MS)
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
