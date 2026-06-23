// @ts-nocheck
/* eslint-disable */
/**
 * 储能拓扑渲染引擎（只读）—— 由 scripts/build-topo-engine.mjs 从运营端 topo.html 自动抽取生成。
 *
 * 渲染与路由算法逐字抽取自 topo.html（schema 2.0），保证与运营端像素级一致；
 * 已剥离全部编辑态（拖拽/选择/对齐/撤销/侧栏/导出）。
 *
 * ⚠️ 请勿手改本文件的算法区段。运营端升级后重跑 scripts/build-topo-engine.mjs 同步。
 */

const DEFAULT_ET = {
  ac_power: {label:'交流电力', labelEn:'AC Power', color:'#e74c3c',w:2.5,dash:[],    anim:'flow',     spd:.5, desc:'电网交流传输，红色流动'},
  dc_power: {label:'直流电力', labelEn:'DC Power', color:'#e67e22',w:2.5,dash:[],    anim:'flow',     spd:.5, desc:'直流母线传输'},
  pipe_blue:{label:'蓝光管道', labelEn:'Blue Pipe', color:'#3aa0ff',w:2.5,dash:[],    anim:'pipe',     spd:.7, desc:'母线管道，蓝色光点流动'},
  pipe_gold:{label:'金光管道', labelEn:'Gold Pipe', color:'#f5c518',w:2.5,dash:[],    anim:'pipe',     spd:.7, desc:'高亮管道，金色光点流动'},
  charge:   {label:'充电中',   labelEn:'Charging', color:'#2ecc71',w:2.5,dash:[],    anim:'flow',     spd:.9, desc:'充电，绿色快流'},
  discharge:{label:'放电中',   labelEn:'Discharging', color:'#3498db',w:2.5,dash:[],    anim:'flow',     spd:.9, desc:'放电，蓝色快流'},
  busbar:   {label:'母线汇流', labelEn:'Busbar', color:'#4dd0ff',w:3.5,dash:[],    anim:'glow',     spd:.3, desc:'母线/汇流排，较粗实线'},
  standby:  {label:'待机',     labelEn:'Standby', color:'#f1c40f',w:2,  dash:[5,5], anim:'pulse',    spd:.2, desc:'待机，慢速脉冲'},
  comm:     {label:'通信线',   labelEn:'Comm Line', color:'#9b59b6',w:1.5,dash:[4,4], anim:'dash',     spd:1.2,desc:'通信/控制信号'},
  pv_power: {label:'光伏出力', labelEn:'PV Output', color:'#f9ca24',w:2.5,dash:[],    anim:'flow',     spd:.6, desc:'光伏直流出力'},
  fault:    {label:'故障告警', labelEn:'Fault Alarm', color:'#ff3333',w:2.5,dash:[4,4], anim:'alarm',    spd:2.0,desc:'故障/告警，急闪'},
  disabled: {label:'断路',     labelEn:'Open Circuit', color:'#445566',w:2,  dash:[8,8], anim:'none',     spd:0,  desc:'断路/停用'},
  neutral:  {label:'接地线',   labelEn:'Ground', color:'#888888',w:1.5,dash:[3,5], anim:'none',     spd:0,  desc:'中性/接地线'},
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{bgColor?:string, lang?:'zh'|'en', showGrid?:boolean, showEdgeLabels?:boolean, showFieldChips?:boolean, busMerge?:boolean, nodeScale?:number, labelScale?:number, fieldScale?:number}} [opts]
 */
export function createTopoEngine(canvas, opts = {}) {
  const ctx = canvas.getContext("2d")

  // ── 视图 / 编辑态（编辑相关恒为只读默认值，替代 topo.html 全局变量）──
  let nodes = [], edges = []
  let zoom = 1, panX = 0, panY = 0, animT = 0
  let bgColor = opts.bgColor || "#0a1f40"
  // paintBg=false：不铺满画布底色（画布透明，露出外层卡片背景），但 bgColor 仍用于文字底板/抹线
  let paintBg = opts.paintBg !== false
  let lang = opts.lang || "zh"
  let showGrid = opts.showGrid === true
  let showEdgeLabels = opts.showEdgeLabels !== false
  let showFieldChips = opts.showFieldChips !== false
  let showAnchors = false
  let globalWidth = 1
  let busMerge = opts.busMerge !== false
  let nodeScale = typeof opts.nodeScale === "number" ? opts.nodeScale : 1
  let labelScale = typeof opts.labelScale === "number" ? opts.labelScale : 1
  let fieldScale = typeof opts.fieldScale === "number" ? opts.fieldScale : 1
  let busMergeGap = 16, busTrunkBold = true, busStyle = "busbar", busOffsets = {}, busShareTrunk = false, busShowHandles = false, routeStyle = 3, busAggregation = false
  const selNode = null, selEdge = null
  let selSet = new Set(), selChips = new Set()
  const edgeMode = false, edgeFrom = null, rubber = null
  const IMGS = {}, CUSTOM_ICONS = {}
  let ET = Object.assign({}, DEFAULT_ET)

  // ── 基础工具（topo.html 818 / 920 / 2762）──
  function toWorld(sx, sy) { return [(sx - panX) / zoom, (sy - panY) / zoom] }
  function gridColor() {
    const c = bgColor.replace("#", ""); const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16)
    const lum = (r * 0.299 + g * 0.587 + b * 0.114); return lum > 128 ? "rgba(0,40,90,0.13)" : "rgba(120,170,220,0.28)"
  }
  function bgPlate() { return bgColor }
  // ===== 端口/几何辅助：由 scripts/build-topo-engine.mjs 从 topology-editor.js 同步，勿手改 =====
function _pathScore(p,a,b){
  return _pathLen(p)+_pathBends(p)*18+_pathDetourPenalty(p,a,b)*4;
}
function _pathBends(p){
  if(!p||p.length<3)return 0;
  let n=0;
  for(let i=1;i<p.length-1;i++){
    const a=p[i-1],b=p[i],c=p[i+1];
    const dx1=Math.sign(b[0]-a[0]),dy1=Math.sign(b[1]-a[1]);
    const dx2=Math.sign(c[0]-b[0]),dy2=Math.sign(c[1]-b[1]);
    if(dx1!==dx2||dy1!==dy2)n++;
  }
  return n;
}
function _pathDetourPenalty(p,a,b){
  if(!p||p.length<2||!a||!b)return 0;
  const ba=nodeBox(a),bb=nodeBox(b);
  const direct=Math.hypot(bb.cx-ba.cx,bb.cy-ba.cy);
  const margin=Math.max(80,Math.min(180,direct*0.35));
  const minX=Math.min(ba.left,bb.left)-margin,maxX=Math.max(ba.right,bb.right)+margin;
  const minY=Math.min(ba.top,bb.top)-margin,maxY=Math.max(ba.bottom,bb.bottom)+margin;
  let pen=0;
  p.forEach(pt=>{
    if(pt[0]<minX)pen+=minX-pt[0]; else if(pt[0]>maxX)pen+=pt[0]-maxX;
    if(pt[1]<minY)pen+=minY-pt[1]; else if(pt[1]>maxY)pen+=pt[1]-maxY;
  });
  return pen;
}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function isLinearBusNode(n){
  return !!(n&&['busbar','trunk_ac','trunk_dc','tie_line'].includes(n.type));
}
function linearBusSpan(n){
  const b=nodeBox(n), s=nsz(n);
  // 母线/主干线图标主体是横向线段，不是完整方盒；连接点应落在线段上。
  const half=s*0.42;
  return {y:b.cy,left:b.cx-half,right:b.cx+half,cx:b.cx};
}
function linearBusPort(n, wx){
  const sp=linearBusSpan(n);
  const x=clamp(wx,sp.left,sp.right);
  const ratio=(sp.right===sp.left)?0.5:(x-sp.left)/(sp.right-sp.left);
  return {name:'line:'+ratio.toFixed(3),point:[x,sp.y],dist:0};
}
function nodePortPoint(n, port){
  const b=nodeBox(n);
  if(isLinearBusNode(n)){
    if(typeof port==='string'&&port.startsWith('line:')){
      const sp=linearBusSpan(n), r=clamp(parseFloat(port.slice(5)),0,1);
      return [sp.left+(sp.right-sp.left)*(isFinite(r)?r:0.5),sp.y];
    }
    if(port==='left'||port==='right'||port==='top'||port==='bottom'||port==='center'){
      const sp=linearBusSpan(n);
      if(port==='left')return [sp.left,sp.y];
      if(port==='right')return [sp.right,sp.y];
      return [sp.cx,sp.y];
    }
  }
  switch(port){
    case 'top': return [b.cx,b.top];
    case 'right': return [b.right,b.cy];
    case 'bottom': return [b.cx,b.bottom];
    case 'left': return [b.left,b.cy];
    case 'center': return [b.cx,b.cy];
    default: return null;
  }
}
function nearestNodePort(n, wx, wy){
  if(isLinearBusNode(n)){
    const p=linearBusPort(n,wx);
    p.dist=Math.hypot(wx-p.point[0],wy-p.point[1]);
    return p;
  }
  const ports=['top','right','bottom','left'];
  let best=null,bd=Infinity;
  ports.forEach(name=>{
    const p=nodePortPoint(n,name);
    const d=Math.hypot(wx-p[0],wy-p[1]);
    if(d<bd){bd=d;best={name,point:p,dist:d};}
  });
  return best;
}
function directionalNodePort(n, wx, wy){
  if(isLinearBusNode(n))return linearBusPort(n,wx);
  const b=nodeBox(n);
  const dx=wx-b.cx,dy=wy-b.cy,adx=Math.abs(dx),ady=Math.abs(dy);
  if(ady>adx*0.8)return {name:dy<0?'top':'bottom',point:nodePortPoint(n,dy<0?'top':'bottom'),dist:0};
  if(adx>ady*0.8)return {name:dx<0?'left':'right',point:nodePortPoint(n,dx<0?'left':'right'),dist:0};
  return nearestNodePort(n,wx,wy);
}
function edgeAnchorPoint(n, tx, ty, port){
  const explicit=nodePortPoint(n,port);
  if(explicit)return explicit;
  const inferred=directionalNodePort(n,tx,ty);
  return inferred?inferred.point:anchorPoint(n,tx,ty);
}
function portSide(port){return {left:'L',right:'R',top:'T',bottom:'B'}[port]||null;}
  // ===== END 同步 =====


  // ===== BEGIN 逐字抽取：几何工具 + 通道布线引擎（topo.html 1361-2161）=====
function nodeLabel(n){ return lang==='en' ? (n.labelEn||n.labelZh||n.id) : (n.labelZh||n.label||n.id); }
function dataKey(f){ return lang==='en' ? (f.keyEn||f.key) : f.key; }
function labelFontPx(n){ return (n.fontSize||14)*labelScale; }
function fieldFontPx(n){ return (n.fontSize||14)*0.92*fieldScale; }

function nsz(typeOrNode){
  const type=typeof typeOrNode==='string'?typeOrNode:typeOrNode.type;
  const scale=typeof typeOrNode==='string'?1:(typeOrNode.scale||1);
  const base=Math.min(canvas.width,canvas.height)/zoom;
  const s={grid:80,pcs:66,bms:66,meter:56,meter2:60,load:66,solar:74,transformer:64,switch:60,generator:68,cabinet:64,highvolt:60,ems:64,aircon:60,fire:58,sensor:58,busbar:70,charger:60,h2_storage:64,
    // 开关元件：默认偏大，统一缩小为更紧凑的尺寸
    cb_closed:44,switch_open:44,disconnector:44,contactor:44,fuse:44,iso_g:44,lbs_g:44,disc_v_g:44,
    trunk_ac:70,trunk_dc:70,tie_line:66,
    anchor:26}[type]||62;
  return s*(base/600)*scale*nodeScale;
}
function nodeAt(wx,wy){for(let i=nodes.length-1;i>=0;i--){const n=nodes[i];if(n.type==='text'){const b=n._textBox;if(b&&wx>=b.x&&wx<=b.x+b.w&&wy>=b.y&&wy<=b.y+b.h)return n;continue;}const s=nsz(n);if(n.type==='anchor'){const vcy=n.y-s*0.22, hit=Math.max(s*0.5, 11/zoom);if(Math.abs(wx-n.x)<hit&&Math.abs(wy-vcy)<hit)return n;continue;}if(Math.abs(wx-n.x)<s*.55&&Math.abs(wy-n.y)<s*.5)return n;}return null;}
// 返回节点边界上的锚点（从中心朝目标方向，落在图标外缘）
// 节点的视觉包围盒（图标实际绘制区域，中心略偏上）
function nodeBox(n){
  const s=nsz(n);
  // 图标绘制 y 从 n.y - s*0.72 到 n.y + s*0.28，视觉中心在 n.y - s*0.22
  const cx=n.x, cy=n.y - s*0.22;
  const hw=s*0.50, hh=s*0.50;
  return {cx,cy,hw,hh,left:cx-hw,right:cx+hw,top:cy-hh,bottom:cy+hh};
}
// 从节点视觉中心朝目标方向，求与包围盒边界的交点（连线起止贴边，不进图标内部）
function anchorPoint(n, tx, ty){
  const bx=nodeBox(n);
  const dx=tx-bx.cx, dy=ty-bx.cy;
  if(dx===0&&dy===0) return [bx.cx,bx.cy];
  const sx=dx===0?Infinity:bx.hw/Math.abs(dx);
  const sy=dy===0?Infinity:bx.hh/Math.abs(dy);
  const t=Math.min(sx,sy);
  return [bx.cx+dx*t, bx.cy+dy*t];
}
// 矩形与线段是否相交（用于碰撞检测，基于视觉盒）
function segRectHit(x1,y1,x2,y2,n,pad){
  const bx=nodeBox(n);
  const minX=bx.left-pad, maxX=bx.right+pad, minY=bx.top-pad, maxY=bx.bottom+pad;
  function inside(x,y){return x>=minX&&x<=maxX&&y>=minY&&y<=maxY;}
  if(inside(x1,y1)||inside(x2,y2)) return true;
  function segSeg(ax,ay,bx2,by,cx,cy,dx,dy){
    const d=(bx2-ax)*(dy-cy)-(by-ay)*(dx-cx);if(Math.abs(d)<1e-9)return false;
    const t=((cx-ax)*(dy-cy)-(cy-ay)*(dx-cx))/d;
    const u=((cx-ax)*(by-ay)-(cy-ay)*(bx2-ax))/d;
    return t>=0&&t<=1&&u>=0&&u<=1;
  }
  return segSeg(x1,y1,x2,y2,minX,minY,maxX,minY)||segSeg(x1,y1,x2,y2,maxX,minY,maxX,maxY)||
         segSeg(x1,y1,x2,y2,maxX,maxY,minX,maxY)||segSeg(x1,y1,x2,y2,minX,maxY,minX,minY);
}
// 路径是否穿过其他节点
function pathHitsNodes(pts, fromId, toId){
  for(const n of nodes){
    if(n.id===fromId||n.id===toId) continue;
    for(let i=0;i<pts.length-1;i++)
      if(segRectHit(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],n,6)) return true;
  }
  return false;
}
// 线段与轴对齐矩形求交（返回离 p1 最近的交点参数 t，无交返回 null）
function segBoxClip(p1,p2,box){
  const x1=p1[0],y1=p1[1],x2=p2[0],y2=p2[1];
  const dx=x2-x1,dy=y2-y1;
  let tmin=0,tmax=1;
  const edges=[[-dx,x1-box.left],[dx,box.right-x1],[-dy,y1-box.top],[dy,box.bottom-y1]];
  for(const[p,q]of edges){
    if(Math.abs(p)<1e-9){ if(q<0)return null; }
    else{ const t=q/p; if(p<0){ if(t>tmax)return null; if(t>tmin)tmin=t; } else { if(t<tmin)return null; if(t<tmax)tmax=t; } }
  }
  return {tmin,tmax};
}
function ptInBox(p,box){ return p[0]>=box.left&&p[0]<=box.right&&p[1]>=box.top&&p[1]<=box.bottom; }
// 把折线两端裁剪到节点视觉盒边界（彻底移除盒内点，连线只到设备边缘）
function clipEnds(pts,a,b,e){
  const ba=nodeBox(a), bb=nodeBox(b);
  pts=pts.map(p=>p.slice());
  // ── 头部：找路径离开 a 盒的那一段，在盒边界处截断（沿该段方向，保持轴对齐）──
  let hi=0;
  while(hi<pts.length-1 && ptInBox(pts[hi+1],ba)) hi++;
  // pts[hi] 在盒内或盒上, pts[hi+1] 在盒外
  if(hi<pts.length-1){
    const p=pts[hi],q=pts[hi+1];
    const r=segBoxClip(p,q,ba);
    let cp=p;
    if(r){ const t=r.tmax; cp=[p[0]+(q[0]-p[0])*t, p[1]+(q[1]-p[1])*t]; }
    pts=pts.slice(hi); pts[0]=cp;
  }
  // ── 尾部：同理 ──
  let ti=pts.length-1;
  while(ti>0 && ptInBox(pts[ti-1],bb)) ti--;
  if(ti>0){
    const p=pts[ti],q=pts[ti-1];
    const r=segBoxClip(p,q,bb);
    let cp=p;
    if(r){ const t=r.tmax; cp=[p[0]+(q[0]-p[0])*t, p[1]+(q[1]-p[1])*t]; }
    pts=pts.slice(0,ti+1); pts[pts.length-1]=cp;
  }
  if(pts.length>=2){
    pts[0]=edgeAnchorPoint(a,pts[1][0],pts[1][1],e&&e.fromPort);
    pts[pts.length-1]=edgeAnchorPoint(b,pts[pts.length-2][0],pts[pts.length-2][1],e&&e.toPort);
  }
  // ── 兜底：若首/尾段仍是斜的，插入拐点矫正为 L ──
  if(pts.length>=2){
    const p0=pts[0],p1=pts[1];
    if(Math.abs(p0[0]-p1[0])>0.5&&Math.abs(p0[1]-p1[1])>0.5)
      pts.splice(1,0,[p1[0],p0[1]]);
  }
  if(pts.length>=2){
    const i=pts.length-1,q0=pts[i],q1=pts[i-1];
    if(Math.abs(q0[0]-q1[0])>0.5&&Math.abs(q0[1]-q1[1])>0.5)
      pts.splice(i,0,[q1[0],q0[1]]);
  }
  return pts;
}
// ───── 正交网格 A* 路由：绕开节点障碍 + 惩罚与已有连线交叉 ─────
let _pathCache={}, _pathCacheSig='', _dragging=false, _dragIds=new Set(), _busTrunks=[];
function topoSig(){
  // 拓扑签名：节点位置 + 边连接，变化时缓存失效
  return nodes.map(n=>n.id+':'+Math.round(n.x)+','+Math.round(n.y)+':'+n.type).join('|')+'##'+
         edges.map(e=>e.from+'>'+e.to+':'+(e.route||'')+':'+(e.fromPort||'')+'>'+(e.toPort||'')).join('|');
}
function invalidatePathCache(){ _pathCache={}; }
let _routeCache=null, _routeCacheKey='';
function buildObstacleGrid(){
  // 收集所有节点视觉盒作为障碍；底部延伸覆盖图标底边下方的标签区域
  return nodes.map(n=>{
    const b=nodeBox(n);
    const s=nsz(n);
    const lfs=labelFontPx(n)/zoom;
    // 标签位于图标底边(n.y+0.28s)之下，覆盖到标签底部
    const labelBottom=(n.y + s*0.28) + lfs*1.4;
    return {id:n.id,l:b.left-14,r:b.right+14,t:b.top-14,b:Math.max(b.bottom+14,labelBottom)};
  });
}
function ptInObstacle(x,y,obs,exFrom,exTo){
  for(const o of obs){ if(o.id===exFrom||o.id===exTo)continue; if(x>=o.l&&x<=o.r&&y>=o.t&&y<=o.b)return true; }
  return false;
}
function segInObstacle(x1,y1,x2,y2,obs,exFrom,exTo){
  const steps=Math.max(2,Math.ceil(Math.hypot(x2-x1,y2-y1)/10));
  for(let i=0;i<=steps;i++){const x=x1+(x2-x1)*i/steps,y=y1+(y2-y1)*i/steps;if(ptInObstacle(x,y,obs,exFrom,exTo))return true;}
  return false;
}
// 已占用线段集合（用于让后续连线避开已有连线，减少重叠/交叉）
let _occupied=new Set();
function occKey(x1,y1,x2,y2){
  const ax=Math.round(x1/4),ay=Math.round(y1/4),bx=Math.round(x2/4),by=Math.round(y2/4);
  return ax<bx||(ax===bx&&ay<=by)?`${ax},${ay},${bx},${by}`:`${bx},${by},${ax},${ay}`;
}
let _occPts=new Set();
function ptKey(x,y){return Math.round(x/6)+','+Math.round(y/6);}
function markOccupied(pts){
  for(let i=0;i<pts.length-1;i++){
    const[x1,y1]=pts[i],[x2,y2]=pts[i+1];
    const steps=Math.max(1,Math.ceil(Math.hypot(x2-x1,y2-y1)/6));
    for(let s=0;s<=steps;s++){const x=x1+(x2-x1)*s/steps,y=y1+(y2-y1)*s/steps;_occPts.add(ptKey(x,y));}
  }
}
function segOverlapPenalty(x1,y1,x2,y2){
  const steps=Math.max(1,Math.ceil(Math.hypot(x2-x1,y2-y1)/6));
  let hits=0;
  for(let s=0;s<=steps;s++){const x=x1+(x2-x1)*s/steps,y=y1+(y2-y1)*s/steps;if(_occPts.has(ptKey(x,y)))hits++;}
  return hits*400; // 与已有连线交叉/重叠的强惩罚
}
// 正交路由：加密网格（节点边界 + 多条中间车道）+ A*，强避让
function routeOrtho(a,b,e){
  const ba=nodeBox(a), bb=nodeBox(b);
  const sp=edgeAnchorPoint(a,bb.cx,bb.cy,e.fromPort), tp=edgeAnchorPoint(b,ba.cx,ba.cy,e.toPort);
  const obs=buildObstacleGrid();
  const GAP=20;
  const xsSet=new Set(),ysSet=new Set();
  xsSet.add(sp[0]);xsSet.add(tp[0]);ysSet.add(sp[1]);ysSet.add(tp[1]);
  obs.forEach(o=>{xsSet.add(o.l-GAP);xsSet.add(o.r+GAP);ysSet.add(o.t-GAP);ysSet.add(o.b+GAP);});
  // 在起止之间加入多条中间车道，给并行连线更多分流空间
  const lo_x=Math.min(sp[0],tp[0]),hi_x=Math.max(sp[0],tp[0]);
  const lo_y=Math.min(sp[1],tp[1]),hi_y=Math.max(sp[1],tp[1]);
  for(let k=1;k<=3;k++){
    xsSet.add(lo_x+(hi_x-lo_x)*k/4);
    ysSet.add(lo_y+(hi_y-lo_y)*k/4);
  }
  // 额外的全局车道线（基于所有节点的间隙中点）
  const allX=nodes.map(n=>nodeBox(n).cx).sort((p,q)=>p-q);
  const allY=nodes.map(n=>nodeBox(n).cy).sort((p,q)=>p-q);
  for(let i=0;i<allX.length-1;i++)xsSet.add((allX[i]+allX[i+1])/2);
  for(let i=0;i<allY.length-1;i++)ysSet.add((allY[i]+allY[i+1])/2);
  const xs=[...xsSet].sort((p,q)=>p-q), ys=[...ysSet].sort((p,q)=>p-q);
  const xi=new Map(xs.map((v,i)=>[v,i])), yi=new Map(ys.map((v,i)=>[v,i]));
  const W=xs.length,H=ys.length;
  const sx=xi.get(sp[0]),sy=yi.get(sp[1]),tx=xi.get(tp[0]),ty=yi.get(tp[1]);
  function key(ix,iy){return ix*2000+iy;}
  const open=[{ix:sx,iy:sy,g:0,f:0,dir:-1,prev:null}];
  const seen=new Map();
  let goal=null,iter=0;
  while(open.length&&iter++<12000){
    open.sort((p,q)=>p.f-q.f);
    const cur=open.shift();
    if(cur.ix===tx&&cur.iy===ty){goal=cur;break;}
    const k=key(cur.ix,cur.iy);
    if(seen.has(k)&&seen.get(k)<=cur.g)continue;
    seen.set(k,cur.g);
    const moves=[[1,0,0],[-1,0,0],[0,1,1],[0,-1,1]];
    for(const[dx,dy,axis]of moves){
      const nx=cur.ix+dx,ny=cur.iy+dy;
      if(nx<0||nx>=W||ny<0||ny>=H)continue;
      const x1=xs[cur.ix],y1=ys[cur.iy],x2=xs[nx],y2=ys[ny];
      if(segInObstacle(x1,y1,x2,y2,obs,e.from,e.to))continue;
      const segLen=Math.abs(x2-x1)+Math.abs(y2-y1);
      const turn=(cur.dir!==-1&&cur.dir!==axis)?30:0;
      const overlap=segOverlapPenalty(x1,y1,x2,y2);
      const ng=cur.g+segLen+turn+overlap;
      const h=Math.abs(xs[tx]-x2)+Math.abs(ys[ty]-y2);
      open.push({ix:nx,iy:ny,g:ng,f:ng+h,dir:axis,prev:cur});
    }
  }
  if(!goal){
    const mx=(sp[0]+tp[0])/2;
    return [sp,[mx,sp[1]],[mx,tp[1]],tp];
  }
  const path=[];let c=goal;while(c){path.unshift([xs[c.ix],ys[c.iy]]);c=c.prev;}
  const merged=[path[0]];
  for(let i=1;i<path.length-1;i++){
    const[px,py]=merged[merged.length-1],[cx,cy]=path[i],[nx,ny]=path[i+1];
    const col=(px===cx&&cx===nx)||(py===cy&&cy===ny);
    if(!col)merged.push(path[i]);
  }
  merged.push(path[path.length-1]);
  return merged;
}
// 把折线强制为正交（横平竖直）：相邻两点若是斜线，插入一个直角拐点
function orthogonalize(pts){
  if(pts.length<2)return pts;
  const out=[pts[0].slice()];
  for(let i=1;i<pts.length;i++){
    const prev=out[out.length-1], cur=pts[i].slice();
    const dx=Math.abs(cur[0]-prev[0]), dy=Math.abs(cur[1]-prev[1]);
    if(dx>0.5&&dy>0.5){
      // 斜线 → 插入直角拐点。最后一段优先竖直进入（更自然），其余水平优先
      const last=(i===pts.length-1);
      if(last) out.push([cur[0],prev[1]]);   // 先水平再竖直到终点
      else     out.push([cur[0],prev[1]]);   // 先水平再竖直
    }
    out.push(cur);
  }
  // 合并共线冗余点
  const merged=[out[0]];
  for(let i=1;i<out.length-1;i++){
    const p=merged[merged.length-1],c=out[i],n=out[i+1];
    const col=(p[0]===c[0]&&c[0]===n[0])||(p[1]===c[1]&&c[1]===n[1]);
    if(!col)merged.push(c);
  }
  merged.push(out[out.length-1]);
  return merged;
}
function edgePathRaw(e){
  const a=nodes.find(n=>n.id===e.from),b=nodes.find(n=>n.id===e.to);if(!a||!b)return null;
  const ba=nodeBox(a), bb=nodeBox(b);
  const route=e.route||'straight';
  if(route==='manual' && e.waypoints && e.waypoints.length>0){
    // 手动拐点：起点→各拐点→终点，端点裁剪到设备边缘
    let pts=[[a.x,ba.cy], ...e.waypoints.map(p=>p.slice()), [b.x,bb.cy]];
    pts[0]=edgeAnchorPoint(a, pts[1][0], pts[1][1], e.fromPort);
    pts[pts.length-1]=edgeAnchorPoint(b, pts[pts.length-2][0], pts[pts.length-2][1], e.toPort);
    // 强制正交：在非横平竖直的段之间插入直角拐点
    if(e.orthoSnap!==false){ pts=orthogonalize(pts); }
    return pts;
  }
  if(route==='arc'){
    const p0=edgeAnchorPoint(a, bb.cx, bb.cy, e.fromPort);
    const p1=edgeAnchorPoint(b, ba.cx, ba.cy, e.toPort);
    const mx=(p0[0]+p1[0])/2, my=(p0[1]+p1[1])/2;
    const dx=p1[0]-p0[0], dy=p1[1]-p0[1], len=Math.hypot(dx,dy)||1;
    const sib=edges.filter(x=>x.from===e.from); const idx=sib.indexOf(e);
    const bow=(40+idx*18)*((idx%2)?-1:1);
    const cx=mx-dy/len*bow, cy=my+dx/len*bow;
    const pts=[];
    for(let t=0;t<=1.001;t+=0.1){
      const x=(1-t)*(1-t)*p0[0]+2*(1-t)*t*cx+t*t*p1[0];
      const y=(1-t)*(1-t)*p0[1]+2*(1-t)*t*cy+t*t*p1[1];
      pts.push([x,y]);
    }
    return pts;
  }
  if(route==='ortho'){
    let pts;
    try{ pts=routeOrtho(a,b,e); }catch(err){ pts=null; }
    let cl = pts?clipEnds(pts,a,b,e):null;
    if(!cl || pathHitsNodes(cl,e.from,e.to)) cl=detourRoute(a,b,e);
    return cl;
  }
  if(route==='lshape'){
    // 简单 L 型：按 orthoDir 选择先横后竖或先竖后横（用于消除交叉，方向可切换）
    const p0=edgeAnchorPoint(a, bb.cx, bb.cy, e.fromPort);
    const p1=edgeAnchorPoint(b, ba.cx, ba.cy, e.toPort);
    let pts;
    if(e.orthoDir==='vh') pts=[p0,[p0[0],p1[1]],p1];
    else pts=[p0,[p1[0],p0[1]],p1];
    // 若该 L 穿设备，退回保底避障路由
    if(pathHitsNodes(pts,e.from,e.to)){
      pts=detourRoute(a,b,e);
      return pts;
    }
    return clipEnds(pts,a,b,e);
  }
  if(route==='line'){
    // 纯直线：起止锚点直连，始终保持为一条直线（不横平竖直、不自动避障、不汇流）
    return [edgeAnchorPoint(a, bb.cx, bb.cy, e.fromPort), edgeAnchorPoint(b, ba.cx, ba.cy, e.toPort)];
  }
  // 直线：动态锚点（随节点位置自适应）
  const p0=edgeAnchorPoint(a, bb.cx, bb.cy, e.fromPort);
  const p1=edgeAnchorPoint(b, ba.cx, ba.cy, e.toPort);
  // 若直线穿过其他设备，自动改用避障路由（默认直线·遇障碍转L）
  if(pathHitsNodes([p0,p1], e.from, e.to)){
    let pts;
    try{ pts=routeOrtho(a,b,e); }catch(err){ pts=null; }
    let cl = pts?clipEnds(pts,a,b,e):null;
    if(!cl || pathHitsNodes(cl,e.from,e.to)) cl=detourRoute(a,b,e);
    return cl;
  }
  return [p0,p1];
}
// ═══════════════════════════════════════════════════════════════
// 确定性通道布线引擎（v67）
// 一次性计算所有连线路径：同侧必汇合、横平竖直、不穿设备、不交叉、无断线、最少拐点
// ═══════════════════════════════════════════════════════════════
function sideOf(node, other){
  // 对端相对本节点的主方位
  const dx=other.x-node.x, dy=other.y-node.y;
  return (Math.abs(dx)>=Math.abs(dy)) ? (dx<0?'L':'R') : (dy<0?'T':'B');
}
function channelRoute(){
  _pathCache={};
  // 1) 每个节点：按侧分组其所有连线
  const sideMap={}; // nodeId -> {L:[edge..],R:[],T:[],B:[]}
  nodes.forEach(n=>sideMap[n.id]={L:[],R:[],T:[],B:[]});
  edges.forEach(e=>{
    const a=nodes.find(n=>n.id===e.from), b=nodes.find(n=>n.id===e.to);
    if(!a||!b)return;
    e._sideFrom=portSide(e.fromPort)||sideOf(a,b);
    e._sideTo=portSide(e.toPort)||sideOf(b,a);
    sideMap[a.id][e._sideFrom].push(e);
    sideMap[b.id][e._sideTo].push(e);
  });
  // 2) 每个节点每侧分配一条主干通道（trunk）+ 统一汇流接入点（join）
  //    join 固定在该侧边缘中点；trunk 在该侧外延 gap 处
  const trunkInfo={}; // key node|side -> {trunkC, horiz, join}
  nodes.forEach(n=>{
    const box=nodeBox(n);
    ['L','R','T','B'].forEach(side=>{
      const arr=sideMap[n.id][side];
      if(arr.length===0)return;
      const gap=busMergeGap+Math.max(box.hw,box.hh);
      let trunkC, horiz, join;
      if(side==='L'){trunkC=box.left-gap;horiz=false;join=[box.left,box.cy];}
      else if(side==='R'){trunkC=box.right+gap;horiz=false;join=[box.right,box.cy];}
      else if(side==='T'){trunkC=box.top-gap;horiz=true;join=[box.cx,box.top];}
      else {trunkC=box.bottom+gap;horiz=true;join=[box.cx,box.bottom];}
      trunkInfo[n.id+'|'+side]={trunkC,horiz,join,box};
    });
  });
  // 3) 逐条连线生成路径（默认用「合并版」：强制经过共享主干点，使同侧完全合并成一条主干）
  const edgeCands={}; // cacheKey -> {merged, natural, variants:[...]}
  edges.forEach((e,i)=>{
    const a=nodes.find(n=>n.id===e.from), b=nodes.find(n=>n.id===e.to);
    e._cacheKey=e.from+'>'+e.to+':'+i;
    if(!a||!b){_pathCache[e._cacheKey]=null;return;}
    const ba=nodeBox(a), bb=nodeBox(b);
    // 手动/弧线：按各自规则直接出图，不进入布线优化。
    if(e.route==='manual' || e.route==='arc' || e.route==='line'){ _pathCache[e._cacheKey]=edgePathRaw(e); return; }
    // 默认「智能最短」：能直连就直连，否则最短 L/Z（避开设备），再做交叉消除。
    if(!busAggregation){
      const vs=straightVariants(a,b,e);
      _pathCache[e._cacheKey]=vs[0]||edgePathRaw(e);
      edgeCands[e._cacheKey]={straight:true, variants:vs};
      return;
    }
    // 「母线汇流」模式：同侧多条连线合并到共享主干（竖直/水平母干）再接入对端。

    const tf=trunkInfo[a.id+'|'+e._sideFrom];
    const tt=trunkInfo[b.id+'|'+e._sideTo];
    const fJoin=isLinearBusNode(a)?edgeAnchorPoint(a,bb.cx,bb.cy,e.fromPort):tf.join.slice();
    const tJoin=isLinearBusNode(b)?edgeAnchorPoint(b,ba.cx,ba.cy,e.toPort):tt.join.slice();
    // 直连快速通道
    const aligned = Math.abs(ba.cx-bb.cx)<14 || Math.abs(ba.cy-bb.cy)<14;
    if(routeStyle!==1 && aligned){
      const p0=edgeAnchorPoint(a,bb.cx,bb.cy,e.fromPort), p1=edgeAnchorPoint(b,ba.cx,ba.cy,e.toPort);
      if(!pathHitsNodes([p0,p1],e.from,e.to)){ _pathCache[e._cacheKey]=[p0,p1]; edgeCands[e._cacheKey]=null; return; }
    }
    const fTrunkPt = tf.horiz ? [fJoin[0], tf.trunkC] : [tf.trunkC, fJoin[1]];
    const tTrunkPt = tt.horiz ? [tJoin[0], tt.trunkC] : [tt.trunkC, tJoin[1]];
    const safe=(p)=>{ if(!pathHitsNodes(p,e.from,e.to))return simplifyPath(p,e.from,e.to);
      let pts; try{ pts=routeOrtho(a,b,e); }catch(err){ pts=null; }
      let cl=pts?clipEnds(pts,a,b,e):null; if(!cl||pathHitsNodes(cl,e.from,e.to)) cl=detourRoute(a,b,e); return cl; };
    // 合并版：fJoin → fTrunkPt →(沿 to 主干法线收拢)→ tTrunkPt(共享) → tJoin
    let mPath=[fJoin, fTrunkPt];
    if(Math.abs(fTrunkPt[0]-tTrunkPt[0])>1 && Math.abs(fTrunkPt[1]-tTrunkPt[1])>1){
      const midX = tt.horiz ? fTrunkPt[0] : tTrunkPt[0];
      const midY = tt.horiz ? tTrunkPt[1] : fTrunkPt[1];
      mPath.push([midX,midY]);
    }
    mPath.push(tTrunkPt, tJoin);
    const merged=safe(dedupe(mPath));
    // 自然版：v67 走廊（交叉更少，但末段不一定重叠）
    let nPath=[fJoin, fTrunkPt];
    if(Math.abs(fTrunkPt[0]-tTrunkPt[0])>1 && Math.abs(fTrunkPt[1]-tTrunkPt[1])>1){
      const midX = tf.horiz ? tTrunkPt[0] : fTrunkPt[0];
      const midY = tf.horiz ? fTrunkPt[1] : tTrunkPt[1];
      nPath.push([midX,midY]);
    }
    nPath.push(tTrunkPt, tJoin);
    const natural=safe(dedupe(nPath));
    edgeCands[e._cacheKey]={merged, natural, fJoin, tJoin, tTrunkPt};
    _pathCache[e._cacheKey]=merged; // 默认优先合并
  });
  // 4) 合并优先 + 交叉消除：对造成交叉的边，依次尝试 自然版/走廊变体，取交叉最少
  optimizeChannel(edgeCands);
  // 5) 拐点汇合对齐：把相近的拐点(竖直/水平方向)对齐到同一通道并合并为共享节点，减少多余拐点、更整齐
  alignJunctions();
}
// 拐点汇合：把所有正交连线的拐点按"竖直段同列、水平段同行"约束聚类，
// 相近的通道(阈值内)对齐到同一坐标 → 平行段并入同一条线、相近拐点合并为一个汇合点；
// 端点(贴节点的锚点)与斜线不动，保证不破坏正交与连接。
function alignJunctions(){
  const T=40; // 汇合/对齐阈值（世界坐标）——足够大以便"对齐后微小偏差也自动汇合为同一通道/拐点，两条近平行线并为一条"；
              // 不同设备的主干间距(≈节点间距 sRef*2.5 ≈ 280)远大于此值，故不会误并相邻独立主干
  const verts=[]; const paths=[];
  edges.forEach(e=>{ const p=_pathCache[e._cacheKey];
    if(!p||p.length<3||e.route==='arc'||e.route==='manual'||e.route==='line') return; // 仅自动正交路径
    const base=verts.length;
    p.forEach((pt,i)=>verts.push({x:pt[0],y:pt[1],anchored:(i===0||i===p.length-1)}));
    paths.push({key:e._cacheKey,base,len:p.length});
  });
  if(verts.length<2)return;
  const px=verts.map((_,i)=>i), py=verts.map((_,i)=>i);
  const fx=a=>{while(px[a]!==a)a=px[a]=px[px[a]];return a;};
  const fy=a=>{while(py[a]!==a)a=py[a]=py[py[a]];return a;};
  // 段方向约束：竖直段两端必须同 X；水平段两端必须同 Y；斜线段两端锚定不动
  paths.forEach(pa=>{ for(let i=0;i<pa.len-1;i++){ const a=pa.base+i,b=pa.base+i+1;
    const dx=Math.abs(verts[a].x-verts[b].x), dy=Math.abs(verts[a].y-verts[b].y);
    if(dx<1 && dy>=1){ px[fx(a)]=fx(b); }
    else if(dy<1 && dx>=1){ py[fy(a)]=fy(b); }
    else { verts[a].anchored=true; verts[b].anchored=true; } // 斜线：固定
  }});
  function snapAxis(find,getC,setC){
    const groups={}; verts.forEach((v,i)=>{const r=find(i);(groups[r]=groups[r]||[]).push(i);});
    let cl=Object.values(groups).map(mem=>{ let anc=null,sum=0; mem.forEach(i=>{ if(verts[i].anchored&&anc==null)anc=getC(verts[i]); sum+=getC(verts[i]); }); return {mem,n:mem.length,anchored:anc!=null,val:anc!=null?anc:sum/mem.length}; });
    cl.sort((a,b)=>a.val-b.val);
    const out=[];
    for(const c of cl){ const last=out[out.length-1];
      if(last && Math.abs(c.val-last.val)<=T && !(last.anchored&&c.anchored)){
        if(last.anchored){ last.mem=last.mem.concat(c.mem); last.n+=c.n; }
        else if(c.anchored){ last.val=c.val; last.anchored=true; last.mem=last.mem.concat(c.mem); last.n+=c.n; }
        else { last.val=(last.val*last.n+c.val*c.n)/(last.n+c.n); last.mem=last.mem.concat(c.mem); last.n+=c.n; }
      } else out.push(c);
    }
    out.forEach(c=>c.mem.forEach(i=>setC(verts[i],c.val)));
  }
  snapAxis(fx, v=>v.x, (v,x)=>v.x=x);
  snapAxis(fy, v=>v.y, (v,y)=>v.y=y);
  // 写回并清理重复/共线点（去掉冗余拐点）
  paths.forEach(pa=>{
    let pts=[]; for(let i=0;i<pa.len;i++){const v=verts[pa.base+i]; pts.push([v.x,v.y]);}
    _pathCache[pa.key]=_dedupCollinear(pts);
  });
}
function _dedupCollinear(pts){
  if(pts.length<2)return pts;
  const out=[];
  for(const p of pts){ const l=out[out.length-1]; if(l && Math.abs(l[0]-p[0])<0.5 && Math.abs(l[1]-p[1])<0.5) continue; out.push(p.slice()); }
  if(out.length<3)return out;
  const res=[out[0]];
  for(let i=1;i<out.length-1;i++){ const a=res[res.length-1],b=out[i],c=out[i+1];
    const cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
    const dot=(b[0]-a[0])*(c[0]-b[0])+(b[1]-a[1])*(c[1]-b[1]);
    if(Math.abs(cross)<0.5 && dot>=0) continue; // 共线同向 → 去掉中间点
    res.push(b);
  }
  res.push(out[out.length-1]);
  return res;
}
function _allPaths(){ return edges.map(e=>_pathCache[e._cacheKey]).filter(Boolean); }
function _countCross(){ const ps=_allPaths(); let n=0; for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)if(pathsCross(ps[i],ps[j]))n++; return n; }
function _pathLen(p){ if(!p||p.length<2)return 0; let d=0; for(let i=0;i<p.length-1;i++)d+=Math.abs(p[i+1][0]-p[i][0])+Math.abs(p[i+1][1]-p[i][1]); return d; }
// 直线模式候选：直连优先，其次最短 L，再 Z 中线，最后 A* 兜底；全部已避开设备。
// 顺序即「偏好度」，优化器在交叉数相同的情况下取更靠前/更短者。
function straightVariants(a,b,e){
  const ba=nodeBox(a), bb=nodeBox(b);
  const p0=edgeAnchorPoint(a,bb.cx,bb.cy,e.fromPort), p1=edgeAnchorPoint(b,ba.cx,ba.cy,e.toPort);
  const out=[];
  const seen=new Set();
  const push=(pts)=>{ if(!pts||pts.length<2)return; const k=pts.map(p=>Math.round(p[0])+','+Math.round(p[1])).join(';'); if(seen.has(k))return; seen.add(k); out.push(pts); };
  const add=(raw)=>{ const cl=clipEnds(raw.map(p=>p.slice()),a,b,e); if(cl&&!pathHitsNodes(cl,e.from,e.to)) push(simplifyPath(cl,e.from,e.to)); };
  // 0) 直线（端点直连）
  if(!pathHitsNodes([p0,p1],e.from,e.to)) push([p0.slice(),p1.slice()]);
  // 1) 两种 L 型
  add([p0,[p1[0],p0[1]],p1]);  // 先横后竖
  add([p0,[p0[0],p1[1]],p1]);  // 先竖后横
  // 2) Z 型中线（横/竖各取若干分割比例）
  for(const f of [0.5,0.35,0.65,0.25,0.75]){
    const mx=p0[0]+(p1[0]-p0[0])*f, my=p0[1]+(p1[1]-p0[1])*f;
    add([p0,[mx,p0[1]],[mx,p1[1]],p1]);
    add([p0,[p0[0],my],[p1[0],my],p1]);
  }
  // 3) A* 正交避障兜底
  try{ const o=routeOrtho(a,b,e); add(o); }catch(_){}
  if(out.length===0) out.push(detourRoute(a,b,e)||[p0.slice(),p1.slice()]);
  // 按长度排序，但直连（含 2 点的真直线）永远排第一
  const straightFirst = out[0] && out[0].length===2 ? out.shift() : null;
  out.sort((u,v)=>_pathScore(u,a,b)-_pathScore(v,a,b));
  if(straightFirst) out.unshift(straightFirst);
  return out;
}
function optimizeChannel(edgeCands){
  let best=_countCross();
  if(best===0)return;
  for(let iter=0; iter<20 && best>0; iter++){
    let improved=false;
    const ranked=edges.map(e=>{const p=_pathCache[e._cacheKey];let c=0;if(p)edges.forEach(o=>{if(o!==e){const op=_pathCache[o._cacheKey];if(op&&pathsCross(p,op))c++;}});return{e,c};}).filter(x=>x.c>0).sort((p,q)=>q.c-p.c);
    for(const {e} of ranked){
      const ck=e._cacheKey; const cand=edgeCands[ck]; if(!cand)continue;
      const orig=_pathCache[ck];
      // 候选列表：直线模式用其 L/Z 候选；通道模式用 合并/自然/走廊变体。
      const tries = cand.straight ? cand.variants.slice() : (()=>{const t=[];if(cand.merged)t.push(cand.merged);if(cand.natural)t.push(cand.natural);t.push(...buildCorridorVariants(e));return t;})();
      // 选交叉最少；并列时取更短；再并列时取更靠前（偏好度更高）的候选。
      const a=nodes.find(n=>n.id===e.from),b=nodes.find(n=>n.id===e.to);
      let bc=best, bestV=null, bestScore=Infinity, bestTi=Infinity;
      for(let ti=0;ti<tries.length;ti++){ const v=tries[ti]; if(!v)continue; _pathCache[ck]=v; const now=_countCross(); const score=_pathScore(v,a,b);
        if(now<bc || (now===bc && (score<bestScore-0.5 || (Math.abs(score-bestScore)<=0.5 && ti<bestTi)))){bc=now;bestV=v;bestScore=score;bestTi=ti;} }
      if(bestV && bc<=best){_pathCache[ck]=bestV; if(bc<best)improved=true; best=bc;}
      else _pathCache[ck]=orig;
      if(best===0)break;
    }
    if(!improved)break;
  }
}
function buildCorridorVariants(e){
  // 为一条边生成走廊变体，但保留最后两点（共享主干接入段）不变，避免破坏同侧合并
  const a=nodes.find(n=>n.id===e.from), b=nodes.find(n=>n.id===e.to);
  if(!a||!b)return [];
  const cur=_pathCache[e._cacheKey];
  if(!cur||cur.length<3)return [];
  // 锁定尾段：共享主干点 + join（最后两点）
  const tail=cur.slice(-2);          // [sharedTrunkPt, tJoin]
  const head=cur[0];                  // fJoin
  const entry=tail[0];                // 共享主干点（必须到达此点）
  const variants=[];
  // 在 head→entry 之间尝试不同的 L / Z 走法
  const Hx=head[0],Hy=head[1],Ex=entry[0],Ey=entry[1];
  const mids=[
    [[Ex,Hy]],                        // 先横后竖
    [[Hx,Ey]],                        // 先竖后横
  ];
  for(const f of [0.35,0.5,0.65]){
    const mx=Hx+(Ex-Hx)*f, my=Hy+(Ey-Hy)*f;
    mids.push([[mx,Hy],[mx,Ey]]);     // 竖直中线
    mids.push([[Hx,my],[Ex,my]]);     // 水平中线
  }
  for(const mid of mids){
    const cand=dedupe([head, ...mid, entry, tail[1]]);
    variants.push(cand);
  }
  return variants.map(v=>simplifyPath(v,e.from,e.to)).filter(v=>!pathHitsNodes(v,e.from,e.to));
}
function recomputeAllPaths(){
  // 清除悬空连线
  const nodeIds=new Set(nodes.map(n=>n.id));
  edges=edges.filter(e=>nodeIds.has(e.from)&&nodeIds.has(e.to));
  _occPts=new Set();
  channelRoute();
}
// 汇流合并：把共享同一端点、且从同方向接入的多条连线，在临近节点处合并到一条主干通道
function approachSide(pt, box){
  // 判断 pt 相对节点盒在哪一侧
  const dx=pt[0]-box.cx, dy=pt[1]-box.cy;
  if(Math.abs(dx)>Math.abs(dy)) return dx<0?'L':'R';
  return dy<0?'T':'B';
}
// 保底避障路由：尝试多条正交折线，返回第一条不穿任何设备的；都不行则返回穿越最少的
function detourRoute(a,b,e){
  const ba=nodeBox(a), bb=nodeBox(b);
  const p0=edgeAnchorPoint(a,bb.cx,bb.cy,e.fromPort), p1=edgeAnchorPoint(b,ba.cx,ba.cy,e.toPort);
  // 收集所有障碍（排除 a、b）的边界，作为候选绕行通道
  const obs=nodes.filter(n=>n.id!==a.id&&n.id!==b.id).map(n=>nodeBox(n));
  const cands=[];
  // 基本 L 型两种
  cands.push([p0,[p1[0],p0[1]],p1]);
  cands.push([p0,[p0[0],p1[1]],p1]);
  // Z 型：在中间某 x 或 y 处转折（尝试障碍上下/左右边缘外侧）
  const xsMid=[(p0[0]+p1[0])/2];
  const ysMid=[(p0[1]+p1[1])/2];
  obs.forEach(o=>{ xsMid.push(o.left-22,o.right+22); ysMid.push(o.top-22,o.bottom+22); });
  xsMid.forEach(mx=>cands.push([p0,[mx,p0[1]],[mx,p1[1]],p1]));
  ysMid.forEach(my=>cands.push([p0,[p0[0],my],[p1[0],my],p1]));
  // 选第一条完全不穿设备的；否则穿越最少的
  let best=null, bestHits=Infinity;
  for(const c of cands){
    const cl=clipEnds(c,a,b,e);
    let hits=0;
    for(const n of nodes){ if(n.id===a.id||n.id===b.id)continue;
      for(let i=0;i<cl.length-1;i++) if(segRectHit(cl[i][0],cl[i][1],cl[i+1][0],cl[i+1][1],n,6)){hits++;break;}
    }
    if(hits===0) return cl;
    if(hits<bestHits){bestHits=hits;best=cl;}
  }
  return best||clipEnds([p0,p1],a,b,e);
}
function applyBusMerge(){
  _busTrunks=[];
  nodes.forEach(node=>{
    ['to','from'].forEach(role=>{
      // 仅合并已是正交折线（≥3 点）的连线
      const grp=edges.filter(e=>e[role]===node.id && _pathCache[e._cacheKey] && _pathCache[e._cacheKey].length>=3);
      if(grp.length<2)return;
      const box=nodeBox(node);
      const bySide={};
      grp.forEach(e=>{
        const otherId=(role==='to')?e.from:e.to;
        const other=nodes.find(n=>n.id===otherId);
        let side;
        if(other){
          const dx=other.x-node.x, dy=other.y-node.y;
          side=(Math.abs(dx)>=Math.abs(dy))?(dx<0?'L':'R'):(dy<0?'T':'B');
        }else{
          const pts=_pathCache[e._cacheKey];const endPt=(role==='to')?pts[pts.length-1]:pts[0];
          side=approachSide(endPt, box);
        }
        (bySide[side]=bySide[side]||[]).push(e);
      });
      Object.entries(bySide).forEach(([side,es])=>{
        if(es.length<2)return;
        const bkey=node.id+'|'+role+'|'+side;
        const userOff=busOffsets[bkey]||0;
        const TRUNK=Math.max(box.hw,box.hh)+busMergeGap+userOff;
        let horiz, trunkC, joinPt;
        if(side==='L'){trunkC=box.left-TRUNK;horiz=false;joinPt=[box.left,box.cy];}
        else if(side==='R'){trunkC=box.right+TRUNK;horiz=false;joinPt=[box.right,box.cy];}
        else if(side==='T'){trunkC=box.top-TRUNK;horiz=true;joinPt=[box.cx,box.top];}
        else {trunkC=box.bottom+TRUNK;horiz=true;joinPt=[box.cx,box.bottom];}
        // 重建每条线的完整路径（从对端到本节点），保证几何干净、无残段：
        //   对端锚点 →(L型)→ 主干车道点 → 主干交点 → 沿主干到汇流点 → 节点汇流点
        //   若重建路径穿过其它设备，则该线退出合并、改用 A* 正交避障路由
        es.forEach(e=>{
          const otherId=(role==='to')?e.from:e.to;
          const other=nodes.find(n=>n.id===otherId);
          if(!other)return;
          const ob=nodeBox(other);
          const laneC = horiz ? ob.cx : ob.cy;
          const trunkPtLane = horiz?[laneC,trunkC]:[trunkC,laneC];
          const trunkPtJoin = horiz?[joinPt[0],trunkC]:[trunkC,joinPt[1]];
          const oAnchor = anchorPoint(other, trunkPtLane[0], trunkPtLane[1]);
          let pre;
          if(horiz){ pre=[oAnchor,[oAnchor[0],trunkC],trunkPtLane]; }
          else{ pre=[oAnchor,[trunkC,oAnchor[1]],trunkPtLane]; }
          const full=[...pre, trunkPtJoin, joinPt.slice()];
          const merged = role==='to' ? dedupe(full) : dedupe(full.slice().reverse());
          // 障碍物避让检测：合并后的路径不得穿过任何其它设备
          if(pathHitsNodes(merged, e.from, e.to)){
            // 退出合并：用避障正交路由重算这条线
            const a=nodes.find(n=>n.id===e.from), b=nodes.find(n=>n.id===e.to);
            let pts; try{ pts=routeOrtho(a,b,e); }catch(err){ pts=null; }
            let clipped = pts? clipEnds(pts,a,b,e) : null;
            // 若 A* 仍穿设备（或失败），用「绕到障碍上/下方」的保底正交折线
            if(!clipped || pathHitsNodes(clipped, e.from, e.to)){
              clipped = detourRoute(a,b,e);
            }
            _pathCache[e._cacheKey]=clipped;
            e._mergeSkipped=true;
          }else{
            _pathCache[e._cacheKey]=merged;
            e._mergeSkipped=false;
          }
        });
        // 记录主干用于（可选）加粗母线绘制：跨度取所有车道交点 + 汇流点
        const laneVals=es.map(e=>{const pts=_pathCache[e._cacheKey];
          // 找主干线上的点（坐标≈trunkC 的那些点的另一轴值）
          const onTrunk=pts.filter(p=>Math.abs((horiz?p[1]:p[0])-trunkC)<0.5);
          return onTrunk.map(p=>horiz?p[0]:p[1]);
        }).flat();
        const allVals=[...laneVals, horiz?joinPt[0]:joinPt[1]];
        const etColor=(ET[es[0].et]||ET.ac_power).color;
        if(horiz) _busTrunks.push({horiz:true, y:trunkC, a:Math.min(...allVals), b:Math.max(...allVals), color:etColor, joinPt, bkey, side});
        else _busTrunks.push({horiz:false, x:trunkC, a:Math.min(...allVals), b:Math.max(...allVals), color:etColor, joinPt, bkey, side});
      });
    });
  });
  if(busShareTrunk) shareNearbyTrunks();
}
// 跨设备共享主干：把坐标接近、同朝向的主干通道对齐到同一条线，并把相关连线改走该共享线
function shareNearbyTrunks(){
  const THRESH=42; // 主干间距小于此值视为可共享
  // 分别处理竖直主干（按 x 聚类）和水平主干（按 y 聚类）
  ['v','h'].forEach(orient=>{
    const group=_busTrunks.filter(t=>orient==='v'?!t.horiz:t.horiz);
    if(group.length<2)return;
    // 按坐标排序聚类
    const coordOf=t=>orient==='v'?t.x:t.y;
    const sorted=[...group].sort((p,q)=>coordOf(p)-coordOf(q));
    let cluster=[sorted[0]];
    const flush=cl=>{
      if(cl.length<2)return;
      // 仅当这些主干属于不同设备且同侧朝向时才共享
      const shared=cl.reduce((s,t)=>s+coordOf(t),0)/cl.length;
      // 收集所有相关连线在该共享线上的实际坐标点，用于确定母线真实跨度
      const along=[]; // 沿主干方向的坐标值
      cl.forEach(t=>{
        const old=coordOf(t);
        if(orient==='v')t.x=shared; else t.y=shared;
        t._shared=true;
        edges.forEach(e=>{
          const pts=_pathCache[e._cacheKey];if(!pts)return;
          let touched=false;
          pts.forEach(p=>{
            if(orient==='v'&&Math.abs(p[0]-old)<0.5){p[0]=shared;touched=true;}
            if(orient==='h'&&Math.abs(p[1]-old)<0.5){p[1]=shared;touched=true;}
          });
          if(touched){
            _pathCache[e._cacheKey]=dedupe(pts);
            // 记录这条线落在共享主干上的点（沿主干方向坐标）
            pts.forEach(p=>{
              if(orient==='v'&&Math.abs(p[0]-shared)<0.5)along.push(p[1]);
              if(orient==='h'&&Math.abs(p[1]-shared)<0.5)along.push(p[0]);
            });
          }
        });
      });
      // 母线跨度按实际连线落点确定，避免画出没有连线的游离段
      if(along.length){
        const lo=Math.min(...along), hi=Math.max(...along);
        cl.forEach(t=>{t.a=lo;t.b=hi;});
      }
    };
    for(let i=1;i<sorted.length;i++){
      if(Math.abs(coordOf(sorted[i])-coordOf(cluster[cluster.length-1]))<THRESH)cluster.push(sorted[i]);
      else{flush(cluster);cluster=[sorted[i]];}
    }
    flush(cluster);
  });
}
function dedupe(pts){
  const out=[pts[0]];
  for(let i=1;i<pts.length;i++){const p=out[out.length-1],c=pts[i];if(Math.abs(p[0]-c[0])>0.5||Math.abs(p[1]-c[1])>0.5)out.push(c);}
  return out;
}
// 路径简化：去掉共线的中间点（把能拉直的拐点拉直），减少多余台阶
function simplifyPath(pts, fromId, toId){
  if(!pts||pts.length<3)return pts;
  let p=dedupe(pts);
  // 1) 移除共线点：若 a-b-c 三点共线，去掉 b
  let changed=true;
  while(changed){
    changed=false;
    const out=[p[0]];
    for(let i=1;i<p.length-1;i++){
      const a=out[out.length-1], b=p[i], c=p[i+1];
      const cross=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
      if(Math.abs(cross)<1){ changed=true; continue; } // 共线，跳过 b
      out.push(b);
    }
    out.push(p[p.length-1]);
    p=out;
  }
  // 2) 捷径化：去掉单个拐点（直连不穿设备且保持正交）
  changed=true;
  while(changed && p.length>2){
    changed=false;
    for(let i=1;i<p.length-1;i++){
      const a=p[i-1], c=p[i+1];
      if(!pathHitsNodes([a,c], fromId, toId)){
        const isOrtho=Math.abs(a[0]-c[0])<1||Math.abs(a[1]-c[1])<1;
        if(isOrtho){ p=p.slice(0,i).concat(p.slice(i+1)); changed=true; break; }
      }
    }
  }
  return dedupe(p);
}
// 单条连线的智能路径（最短·避障；手动/弧线按各自规则），并写入缓存
function computeSmartEdge(e){
  const a=nodes.find(n=>n.id===e.from), b=nodes.find(n=>n.id===e.to);
  if(!a||!b) return null;
  if(!e._cacheKey) e._cacheKey=e.from+'>'+e.to+':'+edges.indexOf(e);
  let p;
  if(e.route==='manual' || e.route==='arc' || e.route==='line') p=edgePathRaw(e);
  else { const vs=straightVariants(a,b,e); p=vs[0]||edgePathRaw(e); }
  _pathCache[e._cacheKey]=p;
  return p;
}
function edgePath(e){
  // 拖动中：只对「与被拖动节点相连」的连线做实时重算，其余连线复用缓存（其几何未变），大幅提速
  if(_dragging && _dragIds.size){
    if(_dragIds.has(e.from) || _dragIds.has(e.to)) return computeSmartEdge(e);
    if(e._cacheKey && _pathCache[e._cacheKey]) return _pathCache[e._cacheKey];
    return computeSmartEdge(e);
  }
  // 非拖动：拓扑变化时整体重算（含交叉消除优化）
  const sig=topoSig();
  if(sig!==_pathCacheSig){ _pathCacheSig=sig; recomputeAllPaths(); }
  if(e._cacheKey && _pathCache[e._cacheKey]) return _pathCache[e._cacheKey];
  // 回退
  const ek=e.from+'>'+e.to+':'+edges.indexOf(e);
  if(_pathCache[ek]) return _pathCache[ek];
  const p=edgePathRaw(e); return p;
}
function edgeAt(wx,wy){
  for(const e of edges){const pts=edgePath(e);if(!pts)continue;
    for(let i=0;i<pts.length-1;i++){
      const[x1,y1]=pts[i],[x2,y2]=pts[i+1];const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy);if(len<1)continue;
      const t=((wx-x1)*dx+(wy-y1)*dy)/(len*len);if(t<0||t>1)continue;
      if(Math.sqrt((wx-x1-t*dx)**2+(wy-y1-t*dy)**2)<9/zoom)return e;
    }}return null;
}

  // ===== END 逐字抽取 =====

  // ===== BEGIN 逐字抽取：线段相交判定 segsCross/pathsCross（topo.html 3223-3234）=====
function segsCross(a,b,c,d){
  function ccw(p,q,r){return (r[1]-p[1])*(q[0]-p[0]) - (q[1]-p[1])*(r[0]-p[0]);}
  const d1=ccw(c,d,a),d2=ccw(c,d,b),d3=ccw(a,b,c),d4=ccw(a,b,d);
  if(((d1>0&&d2<0)||(d1<0&&d2>0))&&((d3>0&&d4<0)||(d3<0&&d4>0)))return true;
  return false;
}
function pathsCross(p1,p2){
  for(let i=0;i<p1.length-1;i++)for(let j=0;j<p2.length-1;j++){
    if(segsCross(p1[i],p1[i+1],p2[j],p2[j+1]))return true;
  }
  return false;
}
  // ===== END 逐字抽取 =====

  // ===== BEGIN 逐字抽取：绘制工具 hexRgb/rgba/drawJunctionDots（topo.html 2163-2190）=====
function hexRgb(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
function rgba(h,a){const[r,g,b]=hexRgb(h);return`rgba(${r},${g},${b},${a})`;}

// 汇合/分支「电气节点」：在多条连线交汇于同一点、或某连线端点接入另一条连线处，画一个实心点，
// 让"两线并为一处""线路在此分支/接入"一目了然（拖动对齐到同一通道、自动汇合后即出现该节点点）。
function drawJunctionDots(){
  const paths=[]; edges.forEach(e=>{ const p=_pathCache[e._cacheKey]||e._drawPts; if(p&&p.length>=2) paths.push({e,p,col:(ET[e.et]||ET.ac_power).color}); });
  if(paths.length<2)return;
  const EPS=4/zoom, dots=[];
  const add=(x,y,col)=>{ for(const d of dots){ if(Math.abs(d.x-x)<EPS&&Math.abs(d.y-y)<EPS)return; } dots.push({x,y,col}); };
  const onSeg=(p,a,b)=>{ const minx=Math.min(a[0],b[0])-EPS,maxx=Math.max(a[0],b[0])+EPS,miny=Math.min(a[1],b[1])-EPS,maxy=Math.max(a[1],b[1])+EPS;
    if(p[0]<minx||p[0]>maxx||p[1]<miny||p[1]>maxy)return false;
    const dx=b[0]-a[0],dy=b[1]-a[1],len2=dx*dx+dy*dy||1; let t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/len2; t=Math.max(0,Math.min(1,t));
    return Math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy))<EPS; };
  // 1) 不同连线共享的顶点 → 汇合/分支节点
  for(let i=0;i<paths.length;i++)for(let j=i+1;j<paths.length;j++){
    for(const a of paths[i].p)for(const b of paths[j].p){ if(Math.abs(a[0]-b[0])<EPS&&Math.abs(a[1]-b[1])<EPS) add(a[0],a[1],paths[i].col); }
  }
  // 2) T 形接入：一条线的端点落在另一条线的中间段上 → 接入节点
  paths.forEach(({e,p})=>{ [p[0],p[p.length-1]].forEach(ep=>{ for(const o of paths){ if(o.e===e)continue;
    let hit=false; for(let k=0;k<o.p.length-1;k++){ if(onSeg(ep,o.p[k],o.p[k+1])){hit=true;break;} }
    if(hit){ add(ep[0],ep[1],o.col); break; } } }); });
  if(!dots.length)return;
  ctx.save();ctx.shadowBlur=0;
  dots.forEach(d=>{ ctx.beginPath();ctx.arc(d.x,d.y,4.5/zoom,0,Math.PI*2);
    ctx.fillStyle=d.col;ctx.fill();ctx.lineWidth=1.6/zoom;ctx.strokeStyle=bgColor;ctx.stroke(); });
  ctx.restore();
}
  // ===== END 逐字抽取 =====

  // ===== BEGIN 逐字抽取：跨线弧 + 连线/节点/字段绘制（topo.html 2304-2674）=====
// ───── 跨线弧（cross-over hop）─────
// 计算所有连线之间无法消除的交叉点，给「后绘制的那条线」在交点处画一个半圆跳过，区分上下层。
let _crossHops=new Map(); // edgeIndex -> [{x,y,segIndex}]
function segIntersectPt(a,b,c,d){
  const r=[b[0]-a[0],b[1]-a[1]], s=[d[0]-c[0],d[1]-c[1]];
  const den=r[0]*s[1]-r[1]*s[0];
  if(Math.abs(den)<1e-9)return null; // 平行/共线
  const t=((c[0]-a[0])*s[1]-(c[1]-a[1])*s[0])/den;
  const u=((c[0]-a[0])*r[1]-(c[1]-a[1])*r[0])/den;
  if(t<0.02||t>0.98||u<0.02||u>0.98)return null; // 端点附近不算（汇合点不画弧）
  return [a[0]+r[0]*t, a[1]+r[1]*t];
}
function computeCrossHops(){
  _crossHops=new Map();
  const paths=edges.map(e=>edgePath(e));
  for(let i=0;i<paths.length;i++){
    for(let j=i+1;j<paths.length;j++){
      const p1=paths[i],p2=paths[j];if(!p1||!p2)continue;
      // 不同线型/颜色的交叉才画弧；同色汇合重叠不画
      for(let a=0;a<p1.length-1;a++){
        for(let b=0;b<p2.length-1;b++){
          const ip=segIntersectPt(p1[a],p1[a+1],p2[b],p2[b+1]);
          if(ip){
            // 让后绘制的线（索引大的 j）跳过
            if(!_crossHops.has(j))_crossHops.set(j,[]);
            _crossHops.get(j).push({x:ip[0],y:ip[1],seg:b});
          }
        }
      }
    }
  }
}
function strokePolyline(pts,dashArr,offset){
  ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
  if(dashArr)ctx.setLineDash(dashArr);ctx.lineDashOffset=offset||0;ctx.stroke();ctx.setLineDash([]);
}
// 带跨线弧的折线绘制：在 hops 指定的交点处画半圆跳过
function strokePolylineHop(pts,hops){
  if(!hops||!hops.length){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.stroke();return;}
  const R=7/zoom; // 弧半径
  ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
  for(let i=0;i<pts.length-1;i++){
    const A=pts[i],B=pts[i+1];
    const segLen=Math.hypot(B[0]-A[0],B[1]-A[1]);if(segLen<1){ctx.lineTo(B[0],B[1]);continue;}
    const ux=(B[0]-A[0])/segLen, uy=(B[1]-A[1])/segLen;
    // 该段上的跨点，按到 A 的距离排序
    const segHops=hops.filter(h=>h.seg===i).map(h=>({h,d:(h.x-A[0])*ux+(h.y-A[1])*uy})).filter(o=>o.d>R&&o.d<segLen-R).sort((p,q)=>p.d-q.d);
    let cursor=A;
    for(const {h,d} of segHops){
      const cx=A[0]+ux*d, cy=A[1]+uy*d;
      const e1=[cx-ux*R, cy-uy*R], e2=[cx+ux*R, cy+uy*R];
      ctx.lineTo(e1[0],e1[1]);
      // 半圆（垂直于线方向凸起）
      const ang=Math.atan2(uy,ux);
      ctx.arc(cx,cy,R,ang-Math.PI,ang,false);
      cursor=e2;
      ctx.moveTo(e2[0],e2[1]);
    }
    ctx.lineTo(B[0],B[1]);
  }
  ctx.stroke();
}
function polyLen(pts){let l=0;for(let i=0;i<pts.length-1;i++)l+=Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]);return l;}
function pointAt(pts,dist){
  for(let i=0;i<pts.length-1;i++){const seg=Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]);
    if(dist<=seg){const t=dist/seg;return[pts[i][0]+(pts[i+1][0]-pts[i][0])*t,pts[i][1]+(pts[i+1][1]-pts[i][1])*t];}dist-=seg;}
  return pts[pts.length-1];
}

function drawEdge(e){
  const pts=edgePath(e);if(!pts)return;
  const baseCfg=ET[e.et]||ET.ac_power,isSel=selEdge===e;
  // 应用粗细倍率（每条边 e.w × 全局 globalWidth）
  const wmul=(e.w||1)*globalWidth;
  const cfg=Object.assign({},baseCfg,{w:baseCfg.w*wmul});
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  if(isSel){ctx.strokeStyle='rgba(255,255,255,0.18)';ctx.lineWidth=(cfg.w+8)/zoom;strokePolyline(pts);}

  // base glow
  if(cfg.anim!=='none'){
    ctx.strokeStyle=cfg.color;ctx.globalAlpha=.13;ctx.lineWidth=(cfg.w+5)/zoom;
    ctx.shadowColor=cfg.color;ctx.shadowBlur=10/zoom;strokePolyline(pts);ctx.globalAlpha=1;ctx.shadowBlur=0;
  }

  if(cfg.anim==='pipe'){
    // pipe base: dark track
    ctx.strokeStyle=rgba(cfg.color,.25);ctx.lineWidth=cfg.w/zoom;strokePolyline(pts);
    // flowing glow dots
    const total=polyLen(pts),gapW=22,off=(animT*cfg.spd*40)%gapW;
    for(let d=-off;d<total;d+=gapW){
      if(d<0)continue;const dd=(e.dir==='reverse')?(total-d):d;
      const[px,py]=pointAt(pts,dd);
      ctx.beginPath();ctx.fillStyle=cfg.color;ctx.shadowColor=cfg.color;ctx.shadowBlur=8/zoom;
      ctx.arc(px,py,(cfg.w*0.6)/zoom,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    }
  } else if(cfg.anim==='busbar'){
    ctx.strokeStyle=cfg.color;ctx.lineWidth=cfg.w/zoom;ctx.shadowColor=cfg.color;ctx.shadowBlur=6/zoom;
    strokePolyline(pts);ctx.shadowBlur=0;
    ctx.strokeStyle=rgba('#ffffff',.4);ctx.lineWidth=(cfg.w*.3)/zoom;strokePolyline(pts);
  } else if(cfg.anim==='glow'){
    ctx.strokeStyle=cfg.color;ctx.lineWidth=cfg.w/zoom;ctx.shadowColor=cfg.color;ctx.shadowBlur=6/zoom;strokePolyline(pts);ctx.shadowBlur=0;
  } else {
    ctx.strokeStyle=cfg.color;ctx.lineWidth=cfg.w/zoom;
    ctx.shadowColor=cfg.color;ctx.shadowBlur=cfg.anim!=='none'?4/zoom:0;
    if(cfg.anim==='alarm')ctx.globalAlpha=.5+.5*Math.sin(animT*cfg.spd*Math.PI*2);
    if(cfg.anim==='pulse')ctx.globalAlpha=.35+.45*Math.sin(animT*cfg.spd*Math.PI*2);
    strokePolyline(pts,cfg.dash.map(d=>d/zoom));ctx.globalAlpha=1;ctx.shadowBlur=0;
    if(cfg.anim==='flow'||cfg.anim==='dash'){
      const pl=cfg.anim==='dash'?3:8,gap=cfg.anim==='dash'?8:16,off=(animT*cfg.spd*55)%(pl+gap);
      ctx.strokeStyle=rgba(cfg.color,.92);ctx.lineWidth=(cfg.w+.5)/zoom;
      if(e.dir==='both'){strokePolyline(pts,[pl/zoom,gap/zoom],-off/zoom);strokePolyline(pts,[pl/zoom,gap/zoom],off/zoom);}
      else strokePolyline(pts,[pl/zoom,gap/zoom],(e.dir==='reverse'?off:-off)/zoom);
    }
  }
  ctx.shadowBlur=0;
  // 跨线弧（cross-over hop）：在无法消除的交叉点画半圆跳过，区分上下层
  const myIdx=edges.indexOf(e);
  const hops=_crossHops.get(myIdx);
  if(hops&&hops.length){
    hops.forEach(h=>{
      const R=7/zoom;
      // 先用背景色抹掉交点处一小段，制造"断开"
      ctx.strokeStyle=bgColor; ctx.lineWidth=(cfg.w+2.5)/zoom; ctx.lineCap='round';
      ctx.beginPath();ctx.arc(h.x,h.y,R,0,Math.PI*2);ctx.stroke();
      // 再画线色半圆拱桥
      ctx.strokeStyle=cfg.color; ctx.lineWidth=cfg.w/zoom;
      ctx.beginPath();ctx.arc(h.x,h.y,R,Math.PI,0,false);ctx.stroke();
    });
  }
  // arrow at end
  const dir=e.dir||'forward';
  const p2=pts[pts.length-1],p1=pts[pts.length-2];
  const pa=pts[0],pb=pts[1];
  if((dir==='forward'||dir==='both')&&cfg.anim!=='busbar'&&cfg.anim!=='pipe')drawArrowSeg(p1,p2,cfg.color,cfg.w);
  if((dir==='reverse'||dir==='both')&&cfg.anim!=='busbar'&&cfg.anim!=='pipe')drawArrowSeg(pb,pa,cfg.color,cfg.w);
  // label
  if((e.lbl||isSel) && showEdgeLabels && !e.hideLabel){
    const lbl=e.lbl||(isSel?cfg.label:'');
    if(lbl){const mid=pointAt(pts,polyLen(pts)/2);const fs=13/zoom;ctx.font=fs+"px -apple-system,'Microsoft YaHei',sans-serif";ctx.textAlign='center';
      const tw=ctx.measureText(lbl).width;ctx.fillStyle=bgPlate();ctx.fillRect(mid[0]-tw/2-4/zoom,mid[1]-fs*0.8,tw+8/zoom,fs+5/zoom);
      ctx.fillStyle=cfg.color;ctx.fillText(lbl,mid[0],mid[1]+fs*.18);}
  }
  // 选中连线时，仅在「线上的真实节点」显示可拖动方块手柄：每个方向变更处(拐点) + 已存拐点 + 起止端。
  // 不显示"段中点新增拐点"标记，也不显示其他线的浮动手柄——避免越拖越乱、或线被拖走后留下孤立节点。
  if(isSel&&!_dragging&&!rubber){
    ctx.shadowBlur=0;
    const sqr=(x,y)=>{ const sz=5/zoom; ctx.fillStyle='#4dd0ff';ctx.strokeStyle='#fff';ctx.lineWidth=1.4/zoom;
      ctx.fillRect(x-sz,y-sz,sz*2,sz*2);ctx.strokeRect(x-sz,y-sz,sz*2,sz*2); };
    const handlePts=[];
    const addHP=(x,y)=>{ for(const h of handlePts){ if(Math.abs(h[0]-x)<0.5&&Math.abs(h[1]-y)<0.5)return; } handlePts.push([x,y]); };
    if(e.route!=='arc'){   // 弧线是连续曲线，无离散拐点，不画拐点手柄
      for(let i=1;i<pts.length-1;i++){ const a=pts[i-1],c=pts[i],d=pts[i+1];   // 仅取「实际渲染线」上的方向变更处
        if(Math.abs((c[0]-a[0])*(d[1]-a[1])-(c[1]-a[1])*(d[0]-a[0]))>1) addHP(c[0],c[1]); }
    }
    handlePts.forEach(p=>sqr(p[0],p[1]));   // 手柄只画在线上的真实拐点，绝不残留偏离线条的旧存储点
    // 起止端节点：放在端点稍内侧(避开设备图标)；与拐点同为方块，用于拖动这一端(重连/移动)，不新增线段
    const inset=(p0,p1)=>{ const dx=p1[0]-p0[0],dy=p1[1]-p0[1],len=Math.hypot(dx,dy)||1,t=Math.min(15/zoom,len*0.45); return [p0[0]+dx/len*t,p0[1]+dy/len*t]; };
    e._endHandles=[ inset(pts[0],pts[1]), inset(pts[pts.length-1],pts[pts.length-2]) ];
    e._endHandles.forEach(p=>sqr(p[0],p[1]));
    e._drawPts=pts;
  } else { e._endHandles=null; }
  ctx.restore();
}
function drawArrowSeg(p1,p2,color,w){
  const ang=Math.atan2(p2[1]-p1[1],p2[0]-p1[0]);
  const t=.6,ax=p1[0]+(p2[0]-p1[0])*t,ay=p1[1]+(p2[1]-p1[1])*t,as=Math.max(4,w*2.6)/zoom;
  ctx.save();ctx.translate(ax,ay);ctx.rotate(ang);ctx.strokeStyle=color;ctx.lineWidth=Math.max(.8,w*.6)/zoom;
  ctx.setLineDash([]);ctx.shadowColor=color;ctx.shadowBlur=3/zoom;
  ctx.beginPath();ctx.moveTo(-as,-as*.5);ctx.lineTo(0,0);ctx.lineTo(-as,as*.5);ctx.stroke();ctx.restore();
}

function rotatePt(px,py,cx,cy,rad){if(!rad)return [px,py];const c=Math.cos(rad),s=Math.sin(rad);const dx=px-cx,dy=py-cy;return [cx+dx*c-dy*s, cy+dx*s+dy*c];}
function drawNode(n){
  // 文本框元素：只渲染文字，无图标
  if(n.type==='text'){ drawTextNode(n); return; }
  const img=CUSTOM_ICONS[n.type]||IMGS[n.type];const s=nsz(n);
  const isSel=selNode===n.id,isESrc=edgeMode&&edgeFrom===n.id;
  ctx.save();
  if(isSel||isESrc){
    ctx.strokeStyle=isESrc?'#2ecc71':'#4dd0ff';ctx.lineWidth=2/zoom;ctx.setLineDash([4/zoom,4/zoom]);ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=12/zoom;
    const bx=n.x-s/2-6/zoom, by=n.y-s*.72-6/zoom, bw=s+12/zoom, bh=s+12/zoom;
    ctx.strokeRect(bx,by,bw,bh);ctx.setLineDash([]);ctx.shadowBlur=0;
    // 四角缩放手柄
    if(isSel&&selSet.size<=1){
      const hs=5/zoom;
      n._resizeHandles=[[bx,by],[bx+bw,by],[bx,by+bh],[bx+bw,by+bh]];
      n._resizeHandle=[bx+bw,by+bh]; // 兼容旧引用
      ctx.fillStyle='#fff';ctx.strokeStyle='#4dd0ff';ctx.lineWidth=2/zoom;
      n._resizeHandles.forEach(h=>{ctx.fillRect(h[0]-hs,h[1]-hs,hs*2,hs*2);ctx.strokeRect(h[0]-hs,h[1]-hs,hs*2,hs*2);});
      // 顶部旋转手柄（圆点 + 连杆）
      const rcx=n.x, rcy=by-16/zoom;
      n._rotHandle=[rcx,rcy];
      ctx.strokeStyle='#4dd0ff';ctx.lineWidth=1.5/zoom;
      ctx.beginPath();ctx.moveTo(n.x,by);ctx.lineTo(rcx,rcy);ctx.stroke();
      ctx.fillStyle='#4dd0ff';ctx.beginPath();ctx.arc(rcx,rcy,5/zoom,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(rcx,rcy,2/zoom,0,Math.PI*2);ctx.fill();
    }
  }
  // 图标（带旋转）：绕视觉中心旋转
  const rot=(n.rotation||0)*Math.PI/180;
  const vcx=n.x, vcy=n.y-s*0.22;
  ctx.save();
  if(rot){ctx.translate(vcx,vcy);ctx.rotate(rot);ctx.translate(-vcx,-vcy);}
  if(n.type==='anchor'){
    // 占位点：可配置填充色 + 不透明度。把填充设为画布同色或不透明度调 0 即可对用户「隐形」。
    const r=s*0.36, op=(n.opacity!=null?n.opacity:1);
    if(n.fill && n.fill!=='none' && op>0){
      ctx.globalAlpha=op;ctx.fillStyle=n.fill;
      ctx.beginPath();ctx.arc(vcx,vcy,r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    }
    // 研发辅助标记：仅当「📍 占位点标记」开启或该点被选中时显示淡虚线环，方便研发定位/点选；
    // 关闭后即便填充透明也不会被用户看到。
    if(showAnchors || isSel){
      ctx.save();
      ctx.globalAlpha=0.7;ctx.strokeStyle='#4dd0ff';ctx.lineWidth=1.2/zoom;ctx.setLineDash([3/zoom,3/zoom]);
      ctx.beginPath();ctx.arc(vcx,vcy,r,0,Math.PI*2);ctx.stroke();
      ctx.setLineDash([]);ctx.lineWidth=1/zoom;ctx.beginPath();
      ctx.moveTo(vcx-3/zoom,vcy);ctx.lineTo(vcx+3/zoom,vcy);ctx.moveTo(vcx,vcy-3/zoom);ctx.lineTo(vcx,vcy+3/zoom);ctx.stroke();
      ctx.restore();
    }
  }
  else if(img)ctx.drawImage(img,n.x-s/2,n.y-s*.72,s,s);
  else{ctx.fillStyle='#1a3a5c';ctx.fillRect(n.x-s/2,n.y-s*.72,s,s);const fs=10/zoom;ctx.fillStyle='#4dd0ff';ctx.font=fs+'px Courier New';ctx.textAlign='center';ctx.fillText(n.type,n.x,n.y+fs*.5);}
  ctx.restore();
  if(!n.hideLabel){
  const lfs=labelFontPx(n)/zoom;
  ctx.font='bold '+lfs+"px -apple-system,'Microsoft YaHei',sans-serif";ctx.textAlign='center';
  const lblTxt=nodeLabel(n);
  // 标签放在图标实际绘制区域的底边之下，确保不遮挡图标任何部分（含台座光晕）
  // 图标绘制范围 y: [n.y - s*0.72, n.y + s*0.28]，底边 = n.y + s*0.28
  const imgBottom=n.y + s*0.28;
  const lblY=imgBottom + lfs*0.85;  // 图标底边下方留固定小间距
  const tw=ctx.measureText(lblTxt).width;
  // 标签背景板：用背景色近不透明 + 圆角，彻底遮住下方连线
  const padX=(6*labelScale)/zoom, plateY=lblY-lfs*0.82, plateH=lfs*1.25, plateX=n.x-tw/2-padX, plateW=tw+padX*2, rr=(4*labelScale)/zoom;
  ctx.fillStyle=bgPlate();
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(plateX,plateY,plateW,plateH,rr); else ctx.rect(plateX,plateY,plateW,plateH);
  ctx.fill();
  ctx.fillStyle=isSel?'#ffffff':(n.fontColor||'#e8f4ff');
  ctx.shadowColor=isSel?'#4dd0ff':'rgba(0,0,0,0.5)';ctx.shadowBlur=isSel?6/zoom:1/zoom;
  ctx.fillText(lblTxt,n.x,lblY);ctx.shadowBlur=0;
  }
  if(edgeMode&&!edgeFrom){ctx.fillStyle='rgba(46,204,113,.1)';ctx.beginPath();ctx.arc(n.x,n.y,s*.5,0,Math.PI*2);ctx.fill();}
  // 数据字段浮动标签（每个独立、可拖动），显示「字段名: 值/--」
  drawFieldChips(n,s);
  ctx.restore();
}
// 文本框元素渲染
function drawTextNode(n){
  const isSel=selNode===n.id;
  const fs=(n.fontSize||18)*(n.scale||1);
  const txt=nodeLabel(n);
  ctx.save();
  const rot=(n.rotation||0)*Math.PI/180;
  if(rot){ctx.translate(n.x,n.y);ctx.rotate(rot);ctx.translate(-n.x,-n.y);}
  ctx.font='bold '+fs+"px -apple-system,'Microsoft YaHei',sans-serif";ctx.textAlign='center';ctx.textBaseline='middle';
  const lines=txt.split('\n');
  let maxW=0;lines.forEach(l=>{maxW=Math.max(maxW,ctx.measureText(l).width);});
  const padX=(n.padX!=null?n.padX:10), padY=(n.padY!=null?n.padY:6);
  const lh=fs*1.3, totalH=lines.length*lh;
  n._textBox={x:n.x-maxW/2-padX,y:n.y-totalH/2-padY,w:maxW+padX*2,h:totalH+padY*2};
  const b=n._textBox, rr=(n.radius!=null?n.radius:6);
  // 背景填充
  if(n.bg && n.bg!=='none'){
    ctx.fillStyle=n.bg;ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(b.x,b.y,b.w,b.h,rr);else ctx.rect(b.x,b.y,b.w,b.h);
    ctx.fill();
  }
  // 边框
  if(n.border && n.border!=='none'){
    ctx.strokeStyle=n.borderColor||'#4dd0ff';ctx.lineWidth=(n.borderWidth||1.5)/zoom;
    if(n.border==='dashed')ctx.setLineDash([6/zoom,4/zoom]);
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(b.x,b.y,b.w,b.h,rr);else ctx.rect(b.x,b.y,b.w,b.h);
    ctx.stroke();ctx.setLineDash([]);
  }
  // 选中虚线框
  if(isSel){
    ctx.strokeStyle='#4dd0ff';ctx.lineWidth=1.5/zoom;ctx.setLineDash([4/zoom,4/zoom]);
    ctx.strokeRect(b.x-3/zoom,b.y-3/zoom,b.w+6/zoom,b.h+6/zoom);ctx.setLineDash([]);
    if(selSet.size<=1){
      const hs=5/zoom;
      const corners=[[b.x-3/zoom,b.y-3/zoom],[b.x+b.w+3/zoom,b.y-3/zoom],[b.x-3/zoom,b.y+b.h+3/zoom],[b.x+b.w+3/zoom,b.y+b.h+3/zoom]];
      n._resizeHandles=corners.map(c=>rotatePt(c[0],c[1],n.x,n.y,rot));
      n._resizeHandle=n._resizeHandles[3];
      ctx.fillStyle='#fff';ctx.strokeStyle='#4dd0ff';ctx.lineWidth=2/zoom;
      corners.forEach(c=>{ctx.fillRect(c[0]-hs,c[1]-hs,hs*2,hs*2);ctx.strokeRect(c[0]-hs,c[1]-hs,hs*2,hs*2);});
      // 旋转手柄
      const rcx=n.x, rcy=b.y-3/zoom-16/zoom;
      n._rotHandle=rotatePt(rcx,rcy,n.x,n.y,rot);
      ctx.strokeStyle='#4dd0ff';ctx.lineWidth=1.5/zoom;
      ctx.beginPath();ctx.moveTo(n.x,b.y-3/zoom);ctx.lineTo(rcx,rcy);ctx.stroke();
      ctx.fillStyle='#4dd0ff';ctx.beginPath();ctx.arc(rcx,rcy,5/zoom,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(rcx,rcy,2/zoom,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.fillStyle=n.fontColor||'#ffffff';
  if(!n.bg||n.bg==='none'){ctx.shadowColor='rgba(0,0,0,0.6)';ctx.shadowBlur=3/zoom;}
  lines.forEach((l,i)=>{ctx.fillText(l,n.x,n.y-totalH/2+lh*(i+0.5));});
  ctx.shadowBlur=0;ctx.restore();
}
// 计算某字段 chip 的默认位置（节点右侧堆叠）。全部用世界坐标常量，缩放稳定
function fieldChipPos(n,i){
  const s=nsz(n);
  const cfs=fieldFontPx(n)/zoom;              // 字号随 1/zoom，屏幕字号恒定（与图标一致）
  const baseX=n.x+s*0.5+(14*fieldScale)/zoom; // 节点右侧（屏幕固定间距，不随缩放漂移）
  const step=(fieldFontPx(n)+18*fieldScale)/zoom; // 卡片高度(字号+上下padding) + 间距（屏幕固定）
  const baseY=n.y-s*0.40+i*step;              // 自上而下堆叠（含舒适间距）
  const f=n.data[i];
  const ox=(f.ox!=null?f.ox:0), oy=(f.oy!=null?f.oy:0);   // ox/oy 以屏幕像素存储
  return {x:baseX+ox/zoom, y:baseY+oy/zoom, h:cfs*1.5, cfs};
}
function fieldChipText(f){
  const k=dataKey(f);
  const v=(f.dv!=null&&f.dv!==0&&f.dv!=='')?f.dv:'--';
  return k+': '+v;
}
function drawFieldChips(n,s){
  if(n.hideFields||!showFieldChips||!n.data||n.data.length===0)return;
  ctx.shadowBlur=0;
  const isSel=selNode===n.id;
  n.data.forEach((f,i)=>{
    if(f.hidden)return;
    const pos=fieldChipPos(n,i);
    const txt=fieldChipText(f);
    ctx.font=pos.cfs+"px -apple-system,'Microsoft YaHei',sans-serif";ctx.textAlign='left';
    const tw=ctx.measureText(txt).width;
    const padX=(7*fieldScale)/zoom, padY=(4*fieldScale)/zoom, rr=(5*fieldScale)/zoom;   // 屏幕固定（随 1/zoom）
    const bx=pos.x, by=pos.y-pos.cfs, bw=tw+padX*2, bh=pos.cfs+padY*2;
    // 引导线：当 chip 被拖离默认位置较远时，用细线连回节点视觉中心，避免不知归属
    const off=Math.hypot(f.ox||0,f.oy||0);
    if(off>40){
      const nb=nodeBox(n);
      // chip 中心
      const ccx=bx+bw/2, ccy=by+bh/2;
      ctx.save();
      ctx.strokeStyle=isSel?'rgba(77,208,255,0.5)':'rgba(120,150,180,0.32)';
      ctx.lineWidth=1/zoom;ctx.setLineDash([4/zoom,3/zoom]);
      ctx.beginPath();ctx.moveTo(nb.cx,nb.cy);ctx.lineTo(ccx,ccy);ctx.stroke();
      ctx.setLineDash([]);ctx.restore();
    }
    // 背景板
    const chipSel=selChips.has(n.id+'#'+i);
    ctx.fillStyle=chipSel?'rgba(40,70,110,0.92)':'rgba(10,22,40,0.82)';
    ctx.strokeStyle=chipSel?'#ffcc44':(isSel?'rgba(77,208,255,0.7)':'rgba(120,150,180,0.3)');ctx.lineWidth=(chipSel?1.8:1.2)/zoom;
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(bx,by,bw,bh,rr);else ctx.rect(bx,by,bw,bh);
    ctx.fill();ctx.stroke();
    // 文字：字段名浅色，值强调色
    const k=dataKey(f), kw=ctx.measureText(k+': ').width;
    ctx.fillStyle='#9fc0dd';ctx.fillText(k+': ',bx+padX,pos.y);
    const v=(f.dv!=null&&f.dv!==0&&f.dv!=='')?f.dv:'--';
    ctx.fillStyle=(f.dv!=null&&f.dv!==0&&f.dv!=='')?'#4dd0ff':'#6b8299';
    ctx.fillText(''+v,bx+padX+kw,pos.y);
    f._chipBox={x:bx,y:by,w:bw,h:bh};
  });
}
// 命中测试：返回 {node, fieldIndex} 若点中某 chip
function fieldChipAt(wx,wy){
  if(!showFieldChips)return null;
  for(let i=nodes.length-1;i>=0;i--){
    const n=nodes[i];if(!n.data)continue;
    for(let j=0;j<n.data.length;j++){
      const b=n.data[j]._chipBox;if(!b)continue;
      if(wx>=b.x&&wx<=b.x+b.w&&wy>=b.y&&wy<=b.y+b.h)return {node:n,fi:j};
    }
  }
  return null;
}
  // ===== END 逐字抽取 =====

  // ── 只读 drawAll（重写：去掉编辑态可视化与 DOM 依赖；其余与 topo.html 一致）──
  function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (paintBg) { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height) }
    ctx.save(); ctx.translate(panX, panY); ctx.scale(zoom, zoom)
    if (showGrid) {
      const step = 40
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.strokeStyle = gridColor(); ctx.lineWidth = 1
      const ox = ((panX % step) + step) % step, oy = ((panY % step) + step) % step
      ctx.beginPath()
      for (let x = ox; x <= canvas.width; x += step) { const px = Math.round(x) + 0.5; ctx.moveTo(px, 0); ctx.lineTo(px, canvas.height) }
      for (let y = oy; y <= canvas.height; y += step) { const py = Math.round(y) + 0.5; ctx.moveTo(0, py); ctx.lineTo(canvas.width, py) }
      ctx.stroke(); ctx.restore()
    }
    computeCrossHops()
    edges.forEach(drawEdge); drawJunctionDots(); nodes.forEach(drawNode)
    ctx.restore()
  }

  // ── fitView（topo.html 3356，去掉 DOM）──
  function measureTextWidth(font, text) {
    ctx.save(); ctx.font = font; const width = ctx.measureText(text || "").width; ctx.restore(); return width
  }
  function nodeVisualBounds(n) {
    const s = nsz(n)
    let minX = n.x - s / 2, minY = n.y - s * 0.72, maxX = n.x + s / 2, maxY = n.y + s * 0.28
    if (n.type === "text") {
      const fs = (n.fontSize || 18) * (n.scale || 1)
      const lines = nodeLabel(n).split("\n")
      const maxW = Math.max(...lines.map(line => measureTextWidth('bold '+fs+"px -apple-system,'Microsoft YaHei',sans-serif", line)), 1)
      const padX = (n.padX != null ? n.padX : 10), padY = (n.padY != null ? n.padY : 6)
      const h = lines.length * fs * 1.3 + padY * 2
      return { minX: n.x - maxW / 2 - padX, minY: n.y - h / 2, maxX: n.x + maxW / 2 + padX, maxY: n.y + h / 2 }
    }
    if (!n.hideLabel) {
      const lfs = labelFontPx(n) / zoom
      const lblTxt = nodeLabel(n)
      const tw = measureTextWidth('bold '+lfs+"px -apple-system,'Microsoft YaHei',sans-serif", lblTxt)
      const padX = (6 * labelScale) / zoom
      const imgBottom = n.y + s * 0.28
      const lblY = imgBottom + lfs * 0.85
      minX = Math.min(minX, n.x - tw / 2 - padX)
      maxX = Math.max(maxX, n.x + tw / 2 + padX)
      maxY = Math.max(maxY, lblY + lfs * 0.45)
    }
    if (!n.hideFields && showFieldChips && n.data && n.data.length) {
      n.data.forEach((f, i) => {
        if (f.hidden) return
        const pos = fieldChipPos(n, i)
        const txt = fieldChipText(f)
        const tw = measureTextWidth(pos.cfs+"px -apple-system,'Microsoft YaHei',sans-serif", txt)
        const padX = (7 * fieldScale) / zoom, padY = (4 * fieldScale) / zoom
        const bx = pos.x, by = pos.y - pos.cfs, bw = tw + padX * 2, bh = pos.cfs + padY * 2
        minX = Math.min(minX, bx)
        minY = Math.min(minY, by)
        maxX = Math.max(maxX, bx + bw)
        maxY = Math.max(maxY, by + bh)
      })
    }
    return { minX, minY, maxX, maxY }
  }
  function fitViewInner(capZoom) {
    if (nodes.length === 0) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    nodes.forEach(n => {
      const b = nodeVisualBounds(n)
      minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY)
      maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY)
    })
    const w = maxX - minX, h = maxY - minY, pad = 34
    if (!(w > 0) || !(h > 0)) return
    const zx = (canvas.width - pad * 2) / w, zy = (canvas.height - pad * 2) / h
    zoom = Math.max(0.2, Math.min(capZoom || 2, Math.min(zx, zy)))
    panX = pad - minX * zoom + (canvas.width - pad * 2 - w * zoom) / 2
    panY = pad - minY * zoom + (canvas.height - pad * 2 - h * zoom) / 2
  }

  // ── 动画循环 ──
  let rafId = null, running = false
  function frame(ts) { animT = (ts || 0) * 0.001; drawAll(); rafId = requestAnimationFrame(frame) }

  // ── 公共 API ──
  return {
    setData(n, e) { nodes = n || []; edges = e || []; _pathCache = {}; _pathCacheSig = "" },
    setEdgeTypes(map) { if (map) ET = Object.assign({}, ET, map) },
    setIcons(map) { if (map) Object.assign(IMGS, map) },
    setBg(c) { if (c) bgColor = c },
    setLang(l) { lang = (l === "en") ? "en" : "zh" },
    setOptions(o) {
      o = o || {}
      if ("showGrid" in o) showGrid = !!o.showGrid
      if ("showEdgeLabels" in o) showEdgeLabels = !!o.showEdgeLabels
      if ("showFieldChips" in o) showFieldChips = !!o.showFieldChips
      if ("busMerge" in o) busMerge = !!o.busMerge
      if ("nodeScale" in o && typeof o.nodeScale === "number") nodeScale = o.nodeScale
      if ("labelScale" in o && typeof o.labelScale === "number") labelScale = o.labelScale
      if ("fieldScale" in o && typeof o.fieldScale === "number") fieldScale = o.fieldScale
      _pathCacheSig = ""
    },
    fitView(cap) { fitViewInner(cap); fitViewInner(cap) }, // 跑两次让 nsz 随新 zoom 收敛
    resize() { _pathCacheSig = ""; drawAll() },
    redraw() { _pathCacheSig = ""; drawAll() },
    hitTestNode(sx, sy) { const [wx, wy] = toWorld(sx, sy); return nodeAt(wx, wy) },
    getView() { return { zoom, panX, panY } },
    setView(v) { v = v || {}; if (typeof v.zoom === "number") zoom = v.zoom; if (typeof v.panX === "number") panX = v.panX; if (typeof v.panY === "number") panY = v.panY },
    start() { if (running) return; running = true; rafId = requestAnimationFrame(frame) },
    stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null },
    destroy() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; nodes = []; edges = [] },
  }
}
