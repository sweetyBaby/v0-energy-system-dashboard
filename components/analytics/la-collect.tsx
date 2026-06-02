"use client"

import { useEffect, useState } from "react"
import Script from "next/script"

// 本地 localhost / 127.0.0.1 不上报统计；开发、测试、生产环境（真实域名/IP）正常统计。
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1"]

export function LaCollect() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const hostname = window.location.hostname
    setEnabled(!LOCAL_HOSTS.includes(hostname))
  }, [])

  if (!enabled) return null

  return (
    <Script
      id="LA_COLLECT"
      src="//sdk.51.la/js-sdk-pro.min.js?id=3Q7jbp2wKrGlaBmo&ck=3Q7jbp2wKrGlaBmo"
      strategy="afterInteractive"
      charSet="UTF-8"
    />
  )
}
