import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Server-side proxy for the report-center service (日报中心), which lives on a
 * DIFFERENT upstream than the common API (`API_BASE_URL` -> 9016/prod-api).
 *
 * Both the `getReportList` JSON endpoint and the report/log file downloads
 * (`/data/...`) are forwarded here so the browser only ever talks to the
 * same origin — no CORS, no mixed-content, and downloads keep their filenames.
 *
 * The cloud auth token is intentionally NOT forwarded: this is a separate
 * service and its auth requirements are independent of the EMS cloud login.
 */
const BLOCKED_UPSTREAM_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
  "accept-encoding",
  "expect",
  "origin",
  "referer",
  // Report service is a separate upstream — never leak EMS cloud credentials.
  "authorization",
  "cookie",
])

function getReportBaseUrl() {
  const baseUrl = process.env.REPORT_API_BASE_URL || "http://223.107.76.50:8083"

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
}

function buildUpstreamUrl(request: NextRequest, path: string[]) {
  const encodedPath = path.map(encodeURIComponent).join("/")
  const url = new URL(`${getReportBaseUrl()}/${encodedPath}`)
  url.search = request.nextUrl.search
  return url
}

function buildUpstreamHeaders(request: NextRequest) {
  const headers = new Headers()

  for (const [key, value] of request.headers.entries()) {
    const normalizedKey = key.toLowerCase()

    if (BLOCKED_UPSTREAM_HEADERS.has(normalizedKey)) {
      continue
    }

    if (normalizedKey.startsWith("sec-")) {
      continue
    }

    headers.set(key, value)
  }

  return headers
}

/**
 * File requests (HTML/XLSX/ZIP logs) are redirected straight to the report host
 * instead of being streamed back through this server. Large zip logs failed to
 * stream through the Next server hop ("Site wasn't available"), whereas the
 * browser can reach the report host directly. The small JSON `getReportList`
 * POST is still proxied (see `proxyRequest`) so it stays same-origin / CORS-free.
 */
async function redirectToUpstream(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  const upstreamUrl = buildUpstreamUrl(request, path)
  return Response.redirect(upstreamUrl.toString(), 302)
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  const upstreamUrl = buildUpstreamUrl(request, path)
  const headers = buildUpstreamHeaders(request)

  const method = request.method.toUpperCase()
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer()

  try {
    const response = await fetch(upstreamUrl, {
      method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      cache: "no-store",
      redirect: "manual",
    })

    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete("content-length")
    responseHeaders.delete("content-encoding")
    responseHeaders.delete("transfer-encoding")

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error("Report proxy request failed", {
      method,
      upstreamUrl: upstreamUrl.toString(),
      requestHeaders: Object.fromEntries(headers.entries()),
      error,
      cause: error instanceof Error && "cause" in error ? error.cause : undefined,
    })

    return Response.json(
      {
        code: 500,
        message:
          error instanceof Error
            ? [
                error.message,
                error instanceof Error && "cause" in error && error.cause instanceof Error
                  ? error.cause.message
                  : null,
              ]
                .filter(Boolean)
                .join(": ")
            : "Report proxy request failed",
        data: null,
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return redirectToUpstream(request, context)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context)
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return redirectToUpstream(request, context)
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context)
}
