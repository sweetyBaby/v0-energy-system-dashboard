import { TopoCanvas } from "@/components/dashboard/topology/topo-canvas"
export default async function P({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams
  const map: Record<string, [string, number, number]> = {
    sample: ["/topology-sample.json", 1360, 620],
    pcs: ["/topo-pcs.json", 980, 760],
    ems: ["/topo-ems.json", 1000, 980],
  }
  // 仅取自有键，避免 ?t=constructor/__proto__ 命中原型属性致解构崩溃（500）
  const key = t && Object.prototype.hasOwnProperty.call(map, t) ? t : "sample"
  const [url, w, h] = map[key]
  return (<div style={{ background: "#050f24", minHeight: "100vh", padding: 16 }}><div style={{ width: w, height: h, border: "1px solid #1a3a5c" }}><TopoCanvas url={url} /></div></div>)
}
