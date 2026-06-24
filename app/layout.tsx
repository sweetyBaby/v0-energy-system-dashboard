import type { Metadata } from "next"
import { LaCollect } from "@/components/analytics/la-collect"
import { AuthExpiredHandler } from "@/components/auth/auth-expired-handler"
import { LanguageProvider } from "@/components/language-provider"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

export const metadata: Metadata = {
  title: "EnerCloud",
  description: "Real-time monitoring, analytics, replay, and reporting for energy storage systems.",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/favicon.ico?v=3", type: "image/png", sizes: "32x32" },
      { url: "/enervenue-logo-mark-white.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=3",
  },
}

const chunkRecoveryScript = `
(function () {
  var reloadKey = "enercloud:chunk-reload-attempted";
  var maxAgeMs = 30000;

  function isChunkFailure(event) {
    if (!event) return false;

    // 资源加载失败：error 事件 target 是下载失败的 <script>/<link>，按其 URL 判断是否 chunk。
    var target = event.target;
    if (target && (target.tagName === "SCRIPT" || target.tagName === "LINK")) {
      return /_next\\/static\\/chunks/i.test(target.src || target.href || "");
    }

    // 运行时错误 / Promise 拒绝：只认「错误名 + 错误消息」，**不看 filename**——普通运行时错误
    // 的 filename 同样落在 _next/static/chunks 下，按 filename 判断会把普通 bug 误当 chunk 失败而刷新。
    var err = event.error || event.reason;
    var text = [
      err && err.name,
      err && err.message,
      typeof err === "string" ? err : "",
      typeof event.message === "string" ? event.message : ""
    ].filter(Boolean).join(" ");

    return /ChunkLoadError|Loading chunk\\b|Loading CSS chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|ERR_CACHE_READ_FAILURE/i.test(text);
  }

  function recoverFromChunkFailure(event) {
    if (!isChunkFailure(event)) return;

    try {
      var lastAttempt = Number(window.sessionStorage.getItem(reloadKey) || "0");
      var now = Date.now();

      if (lastAttempt && now - lastAttempt < maxAgeMs) return;
      window.sessionStorage.setItem(reloadKey, String(now));
    } catch (_) {}

    window.location.reload();
  }

  window.addEventListener("error", recoverFromChunkFailure, true);
  window.addEventListener("unhandledrejection", recoverFromChunkFailure, true);
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // suppressHydrationWarning：浏览器扩展常在 React 加载前往 <html>/<head> 注入脚本或属性，
    // 会让确定性的内联内容被误报 hydration 不匹配；此处脚本内容是静态确定的，抑制该误报噪声。
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: chunkRecoveryScript }} />
      </head>
      <body className="font-sans antialiased">
        <LanguageProvider>
          <AuthExpiredHandler />
          {children}
          <Toaster />
        </LanguageProvider>
        <LaCollect />
      </body>
    </html>
  )
}
