"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { X } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

const clamp = (value:number,min:number,max:number)=>Math.max(min,Math.min(max,value))

const RACK_LAYOUT: (number | null)[][] = [
  [50, 49, 18, 17, 16, 15],
  [48, 47, 20, 19, 14, 13],
  [46, 45, 22, 21, 12, 11],
  [44, 43, 24, 23, 10,  9],
  [42, 41, 26, 25,  8,  7],
  [40, 39, 28, 27,  6,  5],
  [38, 37, 30, 29,  4,  3],
  [36, 35, 32, 31,  2,  1],
  [null, null, 34, 33, null, null],
]

function tempColor(t: number): string {
  const s = [
    { t:22, r:101,g:205,b:90  },{ t:26, r:167,g:224,b:50  },
    { t:28, r:250,g:204,b:21  },{ t:30, r:249,g:115,b:22  },
    { t:32, r:220,g:53, b:34  },{ t:34, r:136,g:19, b:19  },
  ]
  const v = Math.max(22, Math.min(34, t))
  for (let i=0;i<s.length-1;i++) {
    if (v<=s[i+1].t) { const r=(v-s[i].t)/(s[i+1].t-s[i].t); return `rgb(${Math.round(s[i].r+r*(s[i+1].r-s[i].r))},${Math.round(s[i].g+r*(s[i+1].g-s[i].g))},${Math.round(s[i].b+r*(s[i+1].b-s[i].b))})` }
  }
  return `rgb(${s[5].r},${s[5].g},${s[5].b})`
}

function voltColor(v: number, mn:number, mx:number, avg:number): string {
  const d=v-avg, md=Math.max(mx-avg,avg-mn,0.001), r=Math.max(-1,Math.min(1,d/md))
  if (r<0){const t=-r;return`rgb(${Math.round(74-t*15)},${Math.round(222-t*92)},${Math.round(128+t*118)})`}
  if (r<0.5){const t=r*2;return`rgb(${Math.round(74+t*177)},${Math.round(222-t*31)},${Math.round(128-t*92)})`}
  const t=(r-0.5)*2;return`rgb(${Math.round(251-t*31)},${Math.round(191-t*138)},${Math.round(36-t*2)})`
}

function fg(bg:string){
  const m=bg.match(/\d+/g);if(!m)return"#000"
  const[r,g,b]=m.map(Number)
  return(0.299*r+0.587*g+0.114*b)/255>0.48?"rgba(0,0,0,0.78)":"rgba(255,255,255,0.92)"
}

type Cell={id:number;voltage:number;temp1:number;temp2:number;temp3:number;avgTemp:number}
type Hist={label:string;voltage:number;temp1:number;temp2:number;temp3:number}

const buildCells=():Cell[]=>Array.from({length:50},(_,i)=>{
  const id=i+1
  const bv=25.9+Math.sin(id*.71)*1.15+(id%7===0?1.85:0)+(id%13===0?-2.1:0)
  const bt=29.5+Math.sin(id*.43)*2.8+(id%11===0?2.4:0)+(id%17===0?-1.8:0)
  const t1=bt+(((id*3)%10)-5)*.22,t2=bt+.6+(((id*7)%10)-5)*.18,t3=bt-.4+(((id*11)%10)-5)*.26
  return{id,voltage:+clamp(bv,21,29).toFixed(2),temp1:+t1.toFixed(1),temp2:+t2.toFixed(1),temp3:+t3.toFixed(1),avgTemp:+((t1+t2+t3)/3).toFixed(1)}
})

const buildHist=(cid:number):Hist[]=>{
  const now=new Date()
  return Array.from({length:7},(_,i)=>{
    const d=new Date(now);d.setDate(now.getDate()-6+i)
    const bv=25.8+Math.sin(cid*.71+i*.4)*0.7,bt=28.5+Math.sin(cid*.43+i*.3)*.9
    const t1=+(bt+Math.sin(i*.5+cid)*.25).toFixed(1)
    const t2=+(bt+.6+Math.sin(i*.6+cid*.9)*.2).toFixed(1)
    const t3=+(bt-.3+Math.sin(i*.4+cid*1.1)*.25).toFixed(1)
    return{label:`${d.getMonth()+1}/${d.getDate()}`,voltage:+clamp(bv,21,29).toFixed(2),temp1:t1,temp2:t2,temp3:t3}
  })
}

const TS={backgroundColor:"#0d1233",border:"1px solid #1a2654",borderRadius:"6px",fontSize:10}

// Heatmap grid
function HeatGrid({mode,cellMap,vs,sel,onClk}:{
  mode:"voltage"|"temperature"; cellMap:Record<number,Cell>
  vs:{min:number;max:number;avg:number}; sel:number|null; onClk:(id:number)=>void
}){
  const isV=mode==="voltage"
  return(
    <div className="flex items-start gap-1.5">
      <div className="flex flex-col gap-1">
        {RACK_LAYOUT.map((row,ri)=>(
          <div key={ri} className="flex gap-1">
            {row.map((id,ci)=>id!=null?(
              <button key={id} onClick={()=>onClk(id)}
                className={`relative h-14 w-14 rounded transition-all ${sel===id?"scale-105 ring-2 ring-white ring-offset-1 ring-offset-[#0d1233]":"hover:scale-105 hover:ring-1 hover:ring-white/50"}`}
                style={{backgroundColor:isV?voltColor(cellMap[id].voltage,vs.min,vs.max,vs.avg):tempColor(cellMap[id].avgTemp)}}>
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-[11px] leading-none" style={{color:fg(isV?voltColor(cellMap[id].voltage,vs.min,vs.max,vs.avg):tempColor(cellMap[id].avgTemp)),opacity:.76}}>#{id}</div>
                  <div className="mt-1.5 text-[15px] font-bold leading-none" style={{color:fg(isV?voltColor(cellMap[id].voltage,vs.min,vs.max,vs.avg):tempColor(cellMap[id].avgTemp))}}>
                    {isV ? `${cellMap[id].voltage.toFixed(2)}` : `${cellMap[id].avgTemp.toFixed(1)}°`}
                  </div>
                </div>
                {sel===id&&<div className="absolute inset-0 rounded" style={{background:"rgba(255,255,255,0.1)"}}/>}
              </button>
            ):(
              <div key={`e${ri}${ci}`} className="h-14 w-14"/>
            ))}
          </div>
        ))}
      </div>
      {/* vertical scale */}
      <div className="flex flex-col items-center self-stretch py-0.5">
        <span className="text-[10px] text-[#7b8ab8]">{isV ? "29V" : "34"}</span>
        <div className="my-0.5 w-2.5 flex-1 rounded-full" style={{background:isV
          ?"linear-gradient(to bottom,rgb(220,53,34),rgb(251,191,36),rgb(74,222,128),rgb(59,130,246))"
          :"linear-gradient(to bottom,rgb(136,19,19),rgb(220,53,34),rgb(249,115,22),rgb(250,204,21),rgb(167,224,50),rgb(101,205,90))"}}/>
        <span className="text-[10px] text-[#7b8ab8]">{isV ? "21V" : "22"}</span>
      </div>
    </div>
  )
}

// Main panel
export function CellMatrixPanel(){
  const{language}=useLanguage()
  const[sel,setSel]=useState<number|null>(null)
  const zh=language==="zh"

  const baseCells=useMemo(()=>buildCells(),[])
  const[tick,setTick]=useState(0)
  useEffect(()=>{const t=setInterval(()=>setTick(n=>n+1),2000);return()=>clearInterval(t)},[])

  const cells=useMemo(()=>baseCells.map(c=>{
    const vOff=Math.sin(tick*.7+c.id*.31)*0.08+Math.sin(tick*.4+c.id*.17)*0.04
    const tOff=Math.sin(tick*.5+c.id*.29)*.15
    const temp1=+(c.temp1+tOff+Math.sin(tick*.9+c.id)*.08).toFixed(1)
    const temp2=+(c.temp2+tOff+Math.sin(tick*.8+c.id*1.1)*.08).toFixed(1)
    const temp3=+(c.temp3+tOff+Math.sin(tick*1.1+c.id*.9)*.08).toFixed(1)
    return{...c,voltage:+clamp(c.voltage+vOff,21,29).toFixed(2),temp1,temp2,temp3,avgTemp:+((temp1+temp2+temp3)/3).toFixed(1)}
  }),[baseCells,tick])

  const cmap=useMemo(()=>{const m:Record<number,Cell>={};cells.forEach(c=>{m[c.id]=c});return m},[cells])
  const vs=useMemo(()=>{const v=cells.map(c=>c.voltage);return{min:Math.min(...v),max:Math.max(...v),avg:v.reduce((a,b)=>a+b)/v.length}},[cells])
  const hist=useMemo(()=>sel!==null?buildHist(sel):[]  ,[sel])

  const tempTrend=useMemo(()=>[...cells].sort((a,b)=>a.id-b.id).map(c=>({id:c.id,T1:c.temp1,T2:c.temp2,T3:c.temp3})),[cells])

  const cStats=useMemo(()=>{
    const v=cells.map(c=>c.voltage),t=cells.map(c=>c.avgTemp)
    const mean=(a:number[])=>a.reduce((x,y)=>x+y)/a.length
    const std=(a:number[],m:number)=>Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length)
    const vm=mean(v),tm=mean(t)
    return{
      vRange:(Math.max(...v)-Math.min(...v)).toFixed(2),vStd:std(v,vm).toFixed(3),vAvg:vm.toFixed(2),
      tRange:(Math.max(...t)-Math.min(...t)).toFixed(1), tStd:std(t,tm).toFixed(2), tAvg:tm.toFixed(1),
    }
  },[cells])

  return(
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden rounded-lg border border-[#1a2654] bg-[#0d1233] p-3">

      {/* Main row: 4 columns */}
      <div className="flex min-h-0 flex-1 gap-3">

        {/* 1. Voltage heatmap */}
        <div className="flex shrink-0 flex-col">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-[#7dd3fc]"/>
            <span className="text-sm font-semibold text-[#7dd3fc]">{zh ? "电压热力图" : "Voltage Heatmap"}</span>
            <span className="text-xs text-[#4a5f8a]">· {zh ? "点击电芯查看历史" : "Click cell for history"}</span>
          </div>
          <HeatGrid mode="voltage" cellMap={cmap} vs={vs} sel={sel} onClk={id=>setSel(p=>p===id?null:id)}/>
          {/* Voltage stats below heatmap */}
          <div className="mt-5 flex flex-col gap-2">
            {[
              {label:zh ? "电压极差" : "Volt Range", value:`${cStats.vRange} V`,  sub:`avg ${cStats.vAvg} V`, color:"#7dd3fc"},
              {label:zh ? "电压标准差" : "Volt Std",  value:`${cStats.vStd} V`,   sub:"σ",                    color:"#39d0ff"},
            ].map(c=>(
              <div key={c.label} className="flex items-center justify-between rounded-xl border border-[#1a2654] bg-[#0d1433]/90 px-4 py-3">
                <div className="text-[15px] text-[#7b8ab8]">{c.label}</div>
                <div className="flex flex-col items-end">
                  <div className="font-mono text-[17px] font-bold" style={{color:c.color}}>{c.value}</div>
                  <div className="mt-1 text-[13px] text-[#5f79ad]">{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Voltage scatter+line */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-[#7dd3fc]"/>
            <span className="text-sm font-semibold text-[#7dd3fc]">{zh ? "电压分布" : "Voltage Distribution"}</span>
          </div>
          <div className="min-h-0 flex-1 rounded-lg border border-[#1a2654] bg-[#0d1433]/90 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...cells].sort((a,b)=>a.id-b.id).map(c=>({id:c.id,voltage:c.voltage}))} margin={{top:8,right:12,left:-12,bottom:20}}>
                <CartesianGrid stroke="#1a2654" strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="id" type="number" domain={[1,50]} tick={{fill:"#7b8ab8",fontSize:9}} axisLine={false} tickLine={false}
                  label={{value:zh ? "电芯编号" : "Cell ID",position:"insideBottom",offset:-12,fill:"#5f79ad",fontSize:9}}/>
                <YAxis domain={["auto","auto"]} tick={{fill:"#7b8ab8",fontSize:9}} axisLine={false} tickLine={false}
                  tickFormatter={v=>v.toFixed(2)}
                  label={{value:"V",angle:-90,position:"insideLeft",offset:16,fill:"#5f79ad",fontSize:9}}/>
                <Tooltip contentStyle={TS} labelStyle={{color:"#7b8ab8"}}
                  formatter={(v:number)=>[`${v.toFixed(2)} V`,zh ? "电压" : "Voltage"]}
                  labelFormatter={v=>`Cell #${v}`}/>
                <Line type="monotone" dataKey="voltage" stroke="#7dd3fc" strokeWidth={1.5} dot={{r:2,fill:"#7dd3fc"}} activeDot={{r:4}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* divider */}
        <div className="w-px shrink-0 self-stretch bg-[#1a2654]"/>

        {/* 3. Temperature heatmap */}
        <div className="flex shrink-0 flex-col">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-[#fb923c]"/>
            <span className="text-sm font-semibold text-[#fb923c]">{zh ? "温度热力图" : "Temperature Heatmap"}</span>
            <span className="text-xs text-[#4a5f8a]">· {zh ? "点击电芯查看历史" : "Click cell for history"}</span>
          </div>
          <HeatGrid mode="temperature" cellMap={cmap} vs={vs} sel={sel} onClk={id=>setSel(p=>p===id?null:id)}/>
          {/* Temperature stats below heatmap */}
          <div className="mt-5 flex flex-col gap-2">
            {[
              {label:zh ? "温度极差" : "Temp Range", value:`${cStats.tRange} °C`, sub:`avg ${cStats.tAvg} °C`, color:"#fb923c"},
              {label:zh ? "温度标准差" : "Temp Std",  value:`${cStats.tStd} °C`,  sub:"σ",                     color:"#fbbf24"},
            ].map(c=>(
              <div key={c.label} className="flex items-center justify-between rounded-xl border border-[#1a2654] bg-[#0d1433]/90 px-4 py-3">
                <div className="text-[15px] text-[#7b8ab8]">{c.label}</div>
                <div className="flex flex-col items-end">
                  <div className="font-mono text-[17px] font-bold" style={{color:c.color}}>{c.value}</div>
                  <div className="mt-1 text-[13px] text-[#5f79ad]">{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Temperature scatter (T1/T2/T3) */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-[#fb923c]"/>
            <span className="text-sm font-semibold text-[#fb923c]">{zh ? "三温分布 (T1/T2/T3)" : "Temp Distribution (T1/T2/T3)"}</span>
          </div>
          <div className="min-h-0 flex-1 rounded-lg border border-[#1a2654] bg-[#0d1433]/90 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tempTrend} margin={{top:4,right:12,left:-12,bottom:20}}>
                <CartesianGrid stroke="#1a2654" strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="id" type="number" domain={[1,50]} tick={{fill:"#7b8ab8",fontSize:9}} axisLine={false} tickLine={false}
                  label={{value:zh ? "电芯编号" : "Cell ID",position:"insideBottom",offset:-12,fill:"#5f79ad",fontSize:9}}/>
                <YAxis domain={["auto","auto"]} tick={{fill:"#7b8ab8",fontSize:9}} axisLine={false} tickLine={false}
                  tickFormatter={v=>`${v.toFixed(0)}°`}
                  label={{value:"°C",angle:-90,position:"insideLeft",offset:16,fill:"#5f79ad",fontSize:9}}/>
                <Tooltip contentStyle={TS} labelStyle={{color:"#7b8ab8"}}
                  formatter={(v:number,n:string)=>[`${v.toFixed(1)} °C`,n]}
                  labelFormatter={v=>`Cell #${v}`}/>
                <Legend verticalAlign="top" wrapperStyle={{paddingBottom:"4px",fontSize:"10px"}} formatter={v=><span style={{color:"#7b8ab8",fontSize:"10px"}}>{v}</span>}/>
                <Line type="monotone" dataKey="T1" stroke="#fbbf24" strokeWidth={1.5} dot={{r:1.5}} activeDot={{r:3}}/>
                <Line type="monotone" dataKey="T2" stroke="#fb923c" strokeWidth={1.5} dot={{r:1.5}} activeDot={{r:3}}/>
                <Line type="monotone" dataKey="T3" stroke="#f87171" strokeWidth={1.5} dot={{r:1.5}} activeDot={{r:3}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>


{/* Cell detail modal */}
      {sel!==null&&(
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0a0e27]/70 backdrop-blur-sm"
          onClick={e=>{if(e.target===e.currentTarget)setSel(null)}}>
          <div className="relative flex w-[780px] max-w-[90vw] flex-col gap-3 rounded-2xl border border-[#00d4aa]/30 bg-[#0d1233] p-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 rounded-full bg-[#00d4aa]"/>
                <span className="text-sm font-semibold text-[#e8f4fc]">
                  {zh ? `电芯 #${sel} · 近7日历史` : `Cell #${sel} · 7-Day History`}
                </span>
              </div>
              <button onClick={()=>setSel(null)} className="rounded p-1 text-[#7b8ab8] hover:bg-[#1a2654]/60 hover:text-[#e8f4fc]">
                <X className="h-4 w-4"/>
              </button>
            </div>
            {/* Content */}
            <div className="flex gap-4">
              {/* stat cards */}
              <div className="grid shrink-0 grid-cols-1 gap-1.5" style={{width:100}}>
                {[
                  {label:zh ? "电压" : "Volt",  value:`${cmap[sel]?.voltage.toFixed(2)} V`,  color:"#7dd3fc"},
                  {label:zh ? "均温" : "AvgT",  value:`${cmap[sel]?.avgTemp.toFixed(1)} °C`, color:"#00d4aa"},
                  {label:"T1", value:`${cmap[sel]?.temp1.toFixed(1)} °C`, color:"#fbbf24"},
                  {label:"T2", value:`${cmap[sel]?.temp2.toFixed(1)} °C`, color:"#fb923c"},
                  {label:"T3", value:`${cmap[sel]?.temp3.toFixed(1)} °C`, color:"#f87171"},
                ].map(s=>(
                  <div key={s.label} className="rounded border border-[#1a2654]/60 bg-[#101840]/80 px-2 py-1.5">
                    <div className="text-[9px] text-[#7b8ab8]">{s.label}</div>
                    <div className="mt-0.5 font-mono text-[11px] font-bold" style={{color:s.color}}>{s.value}</div>
                  </div>
                ))}
              </div>
              {/* voltage chart */}
              <div className="flex flex-1 flex-col">
                <div className="mb-1 text-[10px] text-[#6b7db8]">{zh ? "电压趋势" : "Voltage Trend"}</div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hist} margin={{top:6,right:12,left:-20,bottom:0}}>
                      <CartesianGrid stroke="#1a2654" strokeDasharray="3 3" vertical={false}/>
                      <XAxis dataKey="label" tick={{fill:"#7b8ab8",fontSize:9}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:"#7b8ab8",fontSize:9}} axisLine={false} tickLine={false} domain={["auto","auto"]} tickFormatter={v=>v.toFixed(2)}/>
                      <Tooltip contentStyle={TS} labelStyle={{color:"#7b8ab8"}} formatter={(v:number)=>[`${v.toFixed(2)} V`,zh ? "电压" : "Voltage"]}/>
                      <Line type="monotone" dataKey="voltage" stroke="#7dd3fc" strokeWidth={2} dot={{r:2}} activeDot={{r:4}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* 3-temp chart */}
              <div className="flex flex-1 flex-col">
                <div className="mb-1 text-[10px] text-[#6b7db8]">{zh ? "三温趋势 (T1/T2/T3)" : "Temp Trend (T1/T2/T3)"}</div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hist} margin={{top:6,right:12,left:-20,bottom:0}}>
                      <CartesianGrid stroke="#1a2654" strokeDasharray="3 3" vertical={false}/>
                      <XAxis dataKey="label" tick={{fill:"#7b8ab8",fontSize:9}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:"#7b8ab8",fontSize:9}} axisLine={false} tickLine={false} domain={["auto","auto"]} tickFormatter={v=>`${v.toFixed(0)}°`}/>
                      <Tooltip contentStyle={TS} labelStyle={{color:"#7b8ab8"}} formatter={(v:number,n:string)=>[`${v.toFixed(1)} °C`,n]}/>
                      <Legend wrapperStyle={{paddingTop:"4px"}} formatter={v=><span style={{color:"#7b8ab8",fontSize:"10px"}}>{v}</span>}/>
                      <Line type="monotone" dataKey="temp1" name="T1" stroke="#fbbf24" strokeWidth={1.5} dot={{r:2}} activeDot={{r:4}}/>
                      <Line type="monotone" dataKey="temp2" name="T2" stroke="#fb923c" strokeWidth={1.5} dot={{r:2}} activeDot={{r:4}}/>
                      <Line type="monotone" dataKey="temp3" name="T3" stroke="#f87171" strokeWidth={1.5} dot={{r:2}} activeDot={{r:4}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


