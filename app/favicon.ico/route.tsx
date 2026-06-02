import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import path from "node:path"

export async function GET() {
  const iconPath = path.join(process.cwd(), "public", "enervenue-logo-mark-white.png")
  const iconBuffer = await readFile(iconPath)
  const iconDataUri = `data:image/png;base64,${iconBuffer.toString("base64")}`

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            background: "linear-gradient(180deg, #29586b 0%, #183847 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 1px rgba(17,24,39,0.14)",
          }}
        >
          <img
            src={iconDataUri}
            alt="EnerCloud"
            width={20}
            height={20}
            style={{
              objectFit: "contain",
              filter: "drop-shadow(0 0 0.6px rgba(255,255,255,0.16))",
            }}
          />
        </div>
      </div>
    ),
    {
      width: 32,
      height: 32,
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    }
  )
}
