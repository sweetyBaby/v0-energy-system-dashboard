import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

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

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  const upstreamUrl = buildUpstreamUrl(request, path)
  const headers = new Headers(request.headers)

  headers.delete("host")
  headers.delete("content-length")

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

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    return Response.json(
      {
        code: 500,
        message:
          error instanceof Error ? error.message : "Proxy request failed",
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
