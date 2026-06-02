import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

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
])

function getBackendBaseUrl() {
  const baseUrl =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8080"

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
}

function buildUpstreamUrl(request: NextRequest, path: string[]) {
  const encodedPath = path.map(encodeURIComponent).join("/")
  const url = new URL(`${getBackendBaseUrl()}/${encodedPath}`)
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
    console.error("Proxy request failed", {
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
            : "Proxy request failed",
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
  return proxyRequest(request, context)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context)
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context)
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context)
}
