"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProjectMapPanel } from "@/components/dashboard/project-map-panel"
import { getStoredAuthToken } from "@/lib/auth-storage"

export default function ProjectMapPage() {
  const router = useRouter()

  useEffect(() => {
    if (!getStoredAuthToken()) {
      router.replace("/")
    }
  }, [router])

  return (
    <div className="h-[100dvh] overflow-hidden">
      <ProjectMapPanel />
    </div>
  )
}
