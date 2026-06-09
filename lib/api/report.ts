import { apiEndpoints } from "@/lib/api/endpoints"

/**
 * Report-center (日报) API.
 *
 * This service lives on a SEPARATE upstream (`REPORT_API_BASE_URL`, e.g. 8083),
 * not the common API (`API_BASE_URL` -> 9016/prod-api), and returns a custom
 * payload shape — not the project's `{ code, msg, data }` envelope. So it does
 * NOT go through the shared `apiClient`; it talks to the dedicated
 * `/api/report-proxy/*` route (same-origin) instead.
 *
 * Both the JSON list call and the file/log downloads are routed through that
 * proxy, so the browser never makes a cross-origin request.
 */

/** Same-origin base for the dedicated report-center proxy route. */
const REPORT_PROXY_BASE = "/api/report-proxy"

type RawReportListResponse = {
  success?: boolean
  year?: number
  month?: number
  project_id?: string
  project_name?: string
  date_folder_count?: number
  days_in_month?: number
  dates?: string[] | null
  files?: Record<string, string[]> | null
  ftp_urls_by_date?: Record<string, string[]> | null
  message?: string
  msg?: string
  error?: string
}

export type ReportFileKind = "emailSummary" | "test" | "summary" | "summarySum" | "other"

export type ReportFile = {
  /** Raw server path, e.g. `/data/JinTan/20260601/report_cn/xxx.html`. */
  path: string
  /** Same-origin download URL via the report proxy. */
  url: string
  /** Decoded base filename, e.g. `2026.6.1 _0-00_email_summary.html`. */
  fileName: string
  /** Report language folder, when detectable. */
  lang: "cn" | "en" | null
  /** Rough category for display labelling. */
  kind: ReportFileKind
  /** Lowercased extension without the dot, e.g. `html` | `xlsx`. */
  ext: string
}

export type ReportLogFile = {
  path: string
  url: string
  fileName: string
  ext: string
}

export type ReportDay = {
  /** `YYYYMMDD`. */
  dateKey: string
  files: ReportFile[]
  logs: ReportLogFile[]
}

export type ReportListResult = {
  success: boolean
  year: number
  month: number
  projectName: string
  /** Sorted `YYYYMMDD` keys that have at least a report or a log. */
  dates: string[]
  byDate: Record<string, ReportDay>
}

export type FetchReportListParams = {
  /** Selected BCU deviceId. */
  deviceId: string
  /** Plain year, e.g. 2026 (no zero-padding). */
  year: number
  /** Plain month 1-12 (no zero-padding). */
  month: number
}

/** Build a `YYYYMMDD` key from a Date, matching the report API's date keys. */
export const toReportDateKey = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}${m}${d}`
}

/**
 * Convert a raw report file path (relative `/data/...`, possibly already
 * percent-encoded, or an absolute report-host URL) into a same-origin URL that
 * downloads through the report proxy. The proxy decodes/re-encodes path
 * segments on the way upstream, so percent-encoding here round-trips cleanly.
 */
export const buildReportFileUrl = (rawPath: string) => {
  if (!rawPath) return ""

  let pathAndQuery = rawPath
  if (/^https?:\/\//i.test(rawPath)) {
    try {
      const url = new URL(rawPath)
      pathAndQuery = `${url.pathname}${url.search}`
    } catch {
      return rawPath
    }
  }

  const normalized = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`
  return `${REPORT_PROXY_BASE}${normalized}`
}

const decodeSegment = (segment: string) => {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

const getFileName = (path: string) => {
  const withoutQuery = path.split(/[?#]/)[0]
  const segment = withoutQuery.split("/").filter(Boolean).pop() ?? ""
  return decodeSegment(segment)
}

const getExt = (fileName: string) => {
  const idx = fileName.lastIndexOf(".")
  return idx >= 0 ? fileName.slice(idx + 1).toLowerCase() : ""
}

const detectLang = (path: string): ReportFile["lang"] => {
  if (/\/report_cn\//i.test(path)) return "cn"
  if (/\/report_en\//i.test(path)) return "en"
  return null
}

const detectKind = (fileName: string): ReportFileKind => {
  const lower = fileName.toLowerCase()
  if (lower.includes("email_summary")) return "emailSummary"
  if (lower.includes("summary-sum")) return "summarySum"
  if (lower.includes("summary")) return "summary"
  if (lower.includes("test")) return "test"
  return "other"
}

const toReportFile = (path: string): ReportFile => {
  const fileName = getFileName(path)
  return {
    path,
    url: buildReportFileUrl(path),
    fileName,
    lang: detectLang(path),
    kind: detectKind(fileName),
    ext: getExt(fileName),
  }
}

const toReportLogFile = (path: string): ReportLogFile => {
  const fileName = getFileName(path)
  return {
    path,
    url: buildReportFileUrl(path),
    fileName,
    ext: getExt(fileName),
  }
}

const normalizeReportList = (
  payload: RawReportListResponse,
  params: FetchReportListParams
): ReportListResult => {
  const files = payload.files ?? {}
  const logs = payload.ftp_urls_by_date ?? {}
  const dateKeys = new Set<string>()

  ;(payload.dates ?? []).forEach((date) => {
    if (date) dateKeys.add(String(date))
  })
  Object.keys(files).forEach((key) => dateKeys.add(key))
  Object.keys(logs).forEach((key) => dateKeys.add(key))

  const byDate: Record<string, ReportDay> = {}
  dateKeys.forEach((dateKey) => {
    byDate[dateKey] = {
      dateKey,
      // Email-summary reports are intentionally excluded from the list. Filtering
      // here keeps every downstream count (calendar badge, popover total) correct.
      files: (files[dateKey] ?? [])
        .filter(Boolean)
        .map(toReportFile)
        .filter((file) => file.kind !== "emailSummary"),
      logs: (logs[dateKey] ?? []).filter(Boolean).map(toReportLogFile),
    }
  })

  return {
    success: payload.success !== false,
    year: typeof payload.year === "number" ? payload.year : params.year,
    month: typeof payload.month === "number" ? payload.month : params.month,
    projectName: typeof payload.project_name === "string" ? payload.project_name : "",
    dates: Array.from(dateKeys).sort(),
    byDate,
  }
}

/**
 * Fetch the monthly daily-report list for a BCU.
 * POST body: `{ project_id, year, month }` — `project_id` carries the selected
 * BCU deviceId (value unchanged); year/month are plain numbers.
 */
export const fetchReportList = async (
  params: FetchReportListParams,
  options: { signal?: AbortSignal } = {}
): Promise<ReportListResult> => {
  const url = `${REPORT_PROXY_BASE}${apiEndpoints.reports.list}`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: params.deviceId,
      year: params.year,
      month: params.month,
    }),
    signal: options.signal,
    cache: "no-store",
  })

  const rawText = await res.text()
  let payload: RawReportListResponse | null = null
  if (rawText.trim()) {
    try {
      payload = JSON.parse(rawText) as RawReportListResponse
    } catch {
      payload = null
    }
  }

  if (!res.ok) {
    const message = payload?.message || payload?.msg || payload?.error
    throw new Error(message || `获取日报列表失败 (HTTP ${res.status})`)
  }

  if (!payload) {
    throw new Error("日报接口返回了空响应或非 JSON 内容")
  }

  if (payload.success === false) {
    throw new Error(payload.message || payload.msg || payload.error || "日报接口返回失败")
  }

  return normalizeReportList(payload, params)
}
