/* AI disclosure: developed with the help of an AI assistant (Claude, Anthropic); reviewed and tested by team Amazon Fire. */
/* ======================================================= dados: estrutura */
/* Fluxos: 0 = MODIS, 1 = VIIRS Suomi NPP (referência), 2 = VIIRS NOAA-20 (continua após 02/11/2026) */
const N20_START = dayOf(2018,4,1);
const STREAMS = [["MODIS",MODIS_START],["VIIRS",VIIRS_START],["N20",N20_START]];
/* Antes de ago/2002 só existe o MODIS Terra (passagem da manhã): corrigido pela razão (Terra+Aqua)/Terra */
const AQUA_MI = miOf(2002,8), TERRA_CAL_END = miOf(2019,12);
function streamOf(D,i){ if(D.sensor[i]===0) return 0; const sat=D.sat[i]; return sat===3 ? 2 : (sat===2||sat===5) ? 1 : -1; }
function makeDataset(cols, label, synthetic, coverageBBox=null){
  const n = cols.day.length;
  let w=Infinity,s=Infinity,e=-Infinity,no=-Infinity, allMax=-Infinity;
  const mm = [[Infinity,-Infinity],[Infinity,-Infinity],[Infinity,-Infinity]];
  const tmp = {sensor:cols.sensor, sat:cols.sat};
  for(let i=0;i<n;i++){
    const lo=cols.lon[i], la=cols.lat[i];
    if(lo<w)w=lo; if(lo>e)e=lo; if(la<s)s=la; if(la>no)no=la;
    const d=cols.day[i]; if(d>allMax) allMax=d;
    const st=streamOf(tmp,i); if(st<0) continue;
    if(d<mm[st][0]) mm[st][0]=d; if(d>mm[st][1]) mm[st][1]=d;
  }
  const coverage = {};
  STREAMS.forEach(([k,launch],st)=>{
    const [mn,mx] = mm[st];
    if(!isFinite(mn)){ coverage[k]=null; return; }
    const ini = Math.max(launch, mn); const [y,m,d] = ymd(ini);
    const startMi = d===1 ? miOf(y,m) : miOf(y,m)+1;
    const [ey,em,ed] = ymd(mx); const lastDay = new Date(Date.UTC(ey,em,0)).getUTCDate();
    const endMi = (mx >= allMax-3 || ed===lastDay) ? miOf(ey,em) : miOf(ey,em)-1;
    coverage[k] = endMi>=startMi ? {startMi, endMi, endDay:mx} : null;
  });
  const wx = new Float32Array(n), wy = new Float32Array(n);
  for(let i=0;i<n;i++){ const p = merc(cols.lon[i], cols.lat[i]); wx[i]=p[0]; wy[i]=p[1]; }
  return {...cols, n, bbox:[w,s,e,no], coverage, coverageBBox:coverageBBox||[w,s,e,no], coverageExplicit:!!coverageBBox, label, synthetic, wx, wy};
}

function decodeDemo(){
  const meta = JSON.parse($("demo-meta").textContent);
  const bin = Uint8Array.from(atob($("demo-bin").textContent.trim()), c=>c.charCodeAt(0));
  const n = meta.n, buf = bin.buffer;
  // layout: lat i32, lon i32 (graus × 1e5), dia u16, frp u16 (× 10), hora u16, flags u8, confiança u8
  const lat = new Int32Array(buf, 0, n), lon = new Int32Array(buf, 4*n, n);
  const u16 = k => new Uint16Array(buf, 8*n + k*2*n, n);
  const day=u16(0), frp=u16(1), tim=u16(2);
  const flags = new Uint8Array(buf, 14*n, n), conf = new Uint8Array(buf, 15*n, n);
  const cols = {sensor:new Uint8Array(n), sat:new Uint8Array(n), lat:new Float64Array(n), lon:new Float64Array(n),
    day:new Int32Array(n), conf:new Uint8Array(n), type:new Int8Array(n), frp:new Float32Array(n), time:new Int16Array(n)};
  for(let i=0;i<n;i++){
    const f=flags[i];
    cols.sensor[i]=f&1; cols.sat[i]=(f>>1)&7; cols.type[i]=((f>>4)&7)-1;
    cols.lat[i]=lat[i]/1e5; cols.lon[i]=lon[i]/1e5;
    cols.day[i]=day[i]; cols.conf[i]=conf[i]; cols.frp[i]=frp[i]/10; cols.time[i]=tim[i];
  }
  const D = makeDataset(cols, meta.label, meta.synthetic!==false, meta.coverageBBox||null); D.embedded = true; return D;
}

/* ---------------------------------------------- leitura de CSVs do FIRMS */
function parseFirms(text, fname){
  const lines = text.split(/\r?\n/).filter(l=>l.trim().length);
  if(lines.length<2) return null;
  const head = lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/^﻿/,""));
  const ix = k => head.indexOf(k);
  const iLat=ix("latitude"), iLon=ix("longitude"), iDate=ix("acq_date");
  if(iLat<0||iLon<0||iDate<0) throw new Error(t("errNotFirms", fname));
  const iInst=ix("instrument"), iSat=ix("satellite"), iConf=ix("confidence"), iType=ix("type"), iFrp=ix("frp"), iTime=ix("acq_time");
  let sensorFile = null;
  if(ix("bright_ti4")>=0) sensorFile=1; else if(ix("brightness")>=0) sensorFile=0;
  const out = {sensor:[],sat:[],lat:[],lon:[],day:[],conf:[],type:[],frp:[],time:[]};
  for(let r=1;r<lines.length;r++){
    const c = lines[r].split(",");
    const la=parseFloat(c[iLat]), lo=parseFloat(c[iLon]); const ds=(c[iDate]||"").trim();
    if(!isFinite(la)||!isFinite(lo)||ds.length<10) continue;
    // satélite primeiro: nos arquivos do Suomi NPP o instrumento vem como "SNPP" e as colunas imitam as do MODIS
    const sv = iSat>=0 ? (c[iSat]||"").trim().toUpperCase() : "";
    const iv = iInst>=0 ? (c[iInst]||"").trim().toUpperCase() : "";
    let sen = ["T","A","TERRA","AQUA"].includes(sv) ? 0 : ["N","SNPP","NPP","N20","N21","J1","J2","1","2","NOAA-20","NOAA-21"].includes(sv) ? 1
      : iv.includes("VIIRS")||iv==="SNPP" ? 1 : iv.includes("MODIS") ? 0 : sensorFile;
    if(sen==null) continue;
    const satc = sv==="T"||sv==="TERRA"?0 : sv==="A"||sv==="AQUA"?1 : (sv==="N"||sv==="SNPP"||sv==="NPP"||sv==="SUOMI NPP"||sv==="SUOMI-NPP")?2 : (sv==="N20"||sv==="1"||sv==="J1"||sv==="NOAA-20"||sv==="NOAA20")?3 : (sv==="N21"||sv==="2"||sv==="J2"||sv==="NOAA-21"||sv==="NOAA21")?4 : (sv===""?5:6);
    let cf = 255; const cv=(iConf>=0?(c[iConf]||""):"").trim().toLowerCase();
    if(sen===0){ const v=parseFloat(cv); if(isFinite(v)) cf=Math.max(0,Math.min(100,Math.round(v))); }
    else cf = cv==="l"||cv==="low"?101 : cv==="n"||cv==="nominal"?102 : cv==="h"||cv==="high"?103 : 255;
    const tv = iType>=0 ? parseInt(c[iType],10) : NaN;
    out.sensor.push(sen); out.sat.push(satc); out.lat.push(la); out.lon.push(lo);
    out.day.push(dayOf(+ds.slice(0,4), +ds.slice(5,7), +ds.slice(8,10)));
    out.conf.push(cf); out.type.push(isFinite(tv)?tv:-1);
    out.frp.push(iFrp>=0?parseFloat(c[iFrp])||0:0); out.time.push(iTime>=0?parseInt(c[iTime],10)||0:0);
  }
  return out;
}
/* Arquivos NRT não têm "type": focos em células onde o histórico marca fonte fixa (type 1-3, 3+ vezes) e vizinhas viram type 2 */
function maskStatic(cols){
  const n=cols.day.length, cnt=new Map();
  for(let i=0;i<n;i++){ const t=cols.type[i]; if(t>=1&&t<=3){ const k=Math.floor(cols.lat[i]/CELULA)+","+Math.floor(cols.lon[i]/CELULA); cnt.set(k,(cnt.get(k)||0)+1); } }
  const cells=new Set();
  for(const [k,v] of cnt){ if(v<3) continue; const [a,b]=k.split(",").map(Number); for(let da=-1;da<=1;da++) for(let db=-1;db<=1;db++) cells.add((a+da)+","+(b+db)); }
  for(let i=0;i<n;i++) if(cols.type[i]<0 && cells.has(Math.floor(cols.lat[i]/CELULA)+","+Math.floor(cols.lon[i]/CELULA))) cols.type[i]=2;
  return cols;
}
function mergeParsed(parts){
  const n = parts.reduce((a,p)=>a+p.day.length,0);
  const cols = {sensor:new Uint8Array(n), sat:new Uint8Array(n), lat:new Float64Array(n), lon:new Float64Array(n),
    day:new Int32Array(n), conf:new Uint8Array(n), type:new Int8Array(n), frp:new Float32Array(n), time:new Int16Array(n)};
  let o=0; for(const p of parts){ for(const k in cols) cols[k].set(p[k], o); o+=p.day.length; }
  return cols;
}

/* ============================================== motor de harmonização */
function usable(D,i){
  const c=D.conf[i], t=D.type[i];
  if(t>0) return false;
  const st=streamOf(D,i); if(st<0) return false;
  if(st===0) return c>=MODIS_CONF_MIN && c<=100;
  return c===102||c===103;
}
function inBox(b, lo, la){ return !b || (lo>=b[0] && lo<=b[2] && la>=b[1] && la<=b[3]); }

function aggregate(D, bbox){
  const cov = D.coverage, list = STREAMS.map(x=>cov[x[0]]).filter(Boolean);
  const endMi = Math.max(...list.map(c=>c.endMi)), endDay = Math.max(...list.map(c=>c.endDay));
  const NM = endMi+1, ND = endDay+1;
  const C = [new Float64Array(NM), new Float64Array(NM), new Float64Array(NM)];
  const Dd = [new Uint32Array(ND), new Uint32Array(ND), new Uint32Array(ND)];
  const seen = [new Set(), new Set(), new Set()], seenT = new Set();
  const T = new Float64Array(NM), dT = new Uint32Array(ND);
  const idx = [];
  for(let i=0;i<D.n;i++){
    if(!usable(D,i) || !inBox(bbox, D.lon[i], D.lat[i])) continue;
    idx.push(i);
    const st = streamOf(D,i);
    const ci=Math.floor(D.lat[i]/CELULA), cj=Math.floor(D.lon[i]/CELULA);
    const key = D.day[i]*1e10 + (ci+50000)*1e5 + (cj+50000);
    const [y,m] = ymd(D.day[i]); const mi = miOf(y,m);
    if(st===0 && D.sat[i]===0 && !seenT.has(key)){ seenT.add(key); T[mi]++; dT[D.day[i]]++; }
    if(seen[st].has(key)) continue; seen[st].add(key);
    C[st][mi]++; Dd[st][D.day[i]]++;
  }
  const covFn = k => mi => !!cov[k] && mi>=cov[k].startMi && mi<=cov[k].endMi;
  let firstMi = Math.min(...list.map(c=>c.startMi));
  return {M:C[0], V:C[1], W:C[2], T, Mraw:Float64Array.from(C[0]), dM:Dd[0], dV:Dd[1], dW:Dd[2], dT, idx, covM:covFn("MODIS"), covV:covFn("VIIRS"), covW:covFn("N20"), NM, ND, endMi, endDay, firstMi};
}

/* Razão VIIRS Suomi NPP / origem ("M" = MODIS, "W" = NOAA-20), por mês, na sobreposição */
function ratios(A, excludeYear, o="M"){
  const X = A[o], covX = o==="M" ? A.covM : A.covW;
  let sv=0, sx=0; const vm=new Float64Array(13), xm=new Float64Array(13);
  for(let mi=A.firstMi; mi<A.NM; mi++){
    if(!(covX(mi)&&A.covV(mi))) continue;
    const y=2000+Math.floor(mi/12), m=mi%12+1;
    if(y===excludeYear) continue;
    sv+=A.V[mi]; sx+=X[mi]; vm[m]+=A.V[mi]; xm[m]+=X[mi];
  }
  const rg = sx>0 ? sv/sx : NaN; const rm = new Float64Array(13);
  for(let m=1;m<=12;m++) rm[m] = (vm[m]+K*rg)/(xm[m]+K);
  return {rg, rm, sm:sx, sv};
}

/* Razão (Terra + Aqua) / Terra por mês, de ago/2002 a dez/2019 */
function ratiosTerra(A, excludeYear){
  let sa=0, st=0; const am=new Float64Array(13), tm=new Float64Array(13);
  for(let mi=Math.max(AQUA_MI,A.firstMi); mi<=Math.min(TERRA_CAL_END,A.NM-1); mi++){
    if(!A.covM(mi)) continue;
    const y=2000+Math.floor(mi/12), m=mi%12+1; if(y===excludeYear) continue;
    sa+=A.Mraw[mi]; st+=A.T[mi]; am[m]+=A.Mraw[mi]; tm[m]+=A.T[mi];
  }
  const rg = st>0 ? sa/st : NaN, rm=new Float64Array(13);
  for(let m=1;m<=12;m++) rm[m]=(am[m]+K*rg)/(tm[m]+K);
  return {rg, rm, sm:st};
}
function validateTerra(A){
  const years=[]; for(let y=2002; y<=2019; y++){ let ok=true; for(let m=1;m<=12;m++){ const mi=miOf(y,m); if(mi<AQUA_MI||mi>TERRA_CAL_END||mi>=A.NM||!A.covM(mi)){ok=false;break;} } if(ok) years.push(y); }
  const rows=years.map(y=>{ const {rm}=ratiosTerra(A,y); let o=0,p=0; for(let m=1;m<=12;m++){ const mi=miOf(y,m); o+=A.Mraw[mi]; p+=A.T[mi]*rm[m]; } return {y,obs:o,pred:p}; });
  if(rows.length<3) return {ok:false, years, rows};
  const ok=rows.filter(r=>r.obs>0);
  return {ok:true, years, rows, mape: ok.reduce((s,r)=>s+Math.abs(r.pred-r.obs)/r.obs,0)/ok.length*100};
}

function quantile(sorted, q){
  if(!sorted.length) return NaN;
  const pos=(sorted.length-1)*q, lo=Math.floor(pos), hi=Math.ceil(pos);
  return sorted[lo] + (sorted[hi]-sorted[lo])*(pos-lo);
}

function analyse(D, bbox, globalA){
  const A = aggregate(D, bbox);
  let RT = ratiosTerra(A);
  if(!(RT.sm>=MIN_CAL) && globalA) RT = ratiosTerra(globalA);
  const valT = validateTerra(A);
  if(isFinite(RT.rg)) for(let mi=A.firstMi; mi<Math.min(AQUA_MI,A.NM); mi++) A.M[mi] = Math.round(A.T[mi]*RT.rm[mi%12+1]*100)/100;
  let R = ratios(A), calSrc = "area";
  if(!(R.sm>=MIN_CAL) && globalA){ R = ratios(globalA); calSrc = "global"; }
  let RN = ratios(A, undefined, "W"), calSrcN = "area";
  if(!(RN.sm>=MIN_CAL) && globalA){ RN = ratios(globalA, undefined, "W"); calSrcN = "global"; }
  const hasN = isFinite(RN.rg);
  const calA = calSrc==="area" ? A : globalA, calAN = calSrcN==="area" ? A : globalA;
  const H = new Float64Array(A.NM).fill(NaN), src = new Array(A.NM).fill("");
  for(let mi=A.firstMi; mi<A.NM; mi++){
    const m=mi%12+1;
    if(A.covV(mi)){ H[mi]=A.V[mi]; src[mi]="VIIRS"; }
    else if(hasN && A.covW(mi)){ H[mi]=A.W[mi]*RN.rm[m]; src[mi]="N20"; }
    else if(A.covM(mi)){ H[mi]=A.M[mi]*R.rm[m]; src[mi]="MODIS"; }
  }
  const anyCov = mi => A.covM(mi)||A.covV(mi)||A.covW(mi);
  const [ey] = ymd(A.endDay); const endYear = ey;
  const firstYear = 2000+Math.floor(A.firstMi/12);
  const complete = [];
  for(let y=firstYear; y<=endYear; y++){
    let ok=true; for(let m=1;m<=12;m++){ const mi=miOf(y,m); if(mi>=A.NM || !anyCov(mi)){ok=false;break;} }
    if(ok && miOf(y,12) < A.endMi && miOf(y,1) >= AQUA_MI) complete.push(y);
  }
  const clim = {med:new Float64Array(13), p25:new Float64Array(13), p75:new Float64Array(13)};
  for(let m=1;m<=12;m++){
    const v = complete.map(y=>H[miOf(y,m)]).sort((a,b)=>a-b);
    clim.med[m]=quantile(v,.5); clim.p25[m]=quantile(v,.25); clim.p75[m]=quantile(v,.75);
  }
  // mês corrente (parcial) vs o mesmo intervalo de dias nos anos anteriores
  const [cy,cm,cd] = ymd(A.endDay);
  const partialTotal = y => {
    const mi=miOf(y,cm), d0=dayOf(y,cm,1), d1=dayOf(y,cm,cd);
    const src = A.covV(mi) ? "V" : (hasN && A.covW(mi)) ? "W" : (mi<AQUA_MI && isFinite(RT.rg)) ? "T" : "M";
    const arr = src==="V" ? A.dV : src==="W" ? A.dW : src==="T" ? A.dT : A.dM;
    let s=0; for(let d=d0; d<=d1 && d<A.ND; d++) s += arr[d];
    return src==="V" ? s : src==="W" ? s*RN.rm[cm] : src==="T" ? s*RT.rm[cm]*R.rm[cm] : s*R.rm[cm];
  };
  const hist = complete.filter(y=>y<cy).map(partialTotal).sort((a,b)=>a-b);
  const nowVal = partialTotal(cy), nowMed = quantile(hist,.5);
  const monthEnd = new Date(Date.UTC(cy,cm,0)).getUTCDate();
  const isPartial = cd < monthEnd;
  const now = {y:cy, m:cm, d:cd, val:nowVal, med:nowMed, ratio:(nowVal+1)/(nowMed+1), partial:isPartial,
    p25:quantile(hist,.25), p75:quantile(hist,.75), rank: hist.filter(v=>v<nowVal).length, nHist:hist.length};
  const val = validate(calA, "M"), valN = hasN ? validate(calAN, "W") : {ok:false, years:[], rows:[]};
  return {A, R, RN, RT, valT, lowConf: mi => mi < AQUA_MI, hasN, calSrc, calSrcN, H, src, clim, complete, now, val, valN, endMi:A.endMi, partialMi: isPartial ? miOf(cy,cm) : -1};
}

function validate(A, o="M"){
  const X = A[o], covX = o==="M" ? A.covM : A.covW;
  const years=[];
  for(let y=2000; y<=2000+Math.floor((A.NM-1)/12); y++){
    let ok=true; for(let m=1;m<=12;m++){ const mi=miOf(y,m); if(mi>=A.NM||!(covX(mi)&&A.covV(mi))){ok=false;break;} }
    if(ok) years.push(y);
  }
  const rows=[]; const obsM=[], preM=[];
  for(const y of years){
    const {rm} = ratios(A, y, o); let ob=0,p=0;
    for(let m=1;m<=12;m++){ const mi=miOf(y,m); const pv=X[mi]*rm[m]; ob+=A.V[mi]; p+=pv; obsM.push(A.V[mi]); preM.push(pv); }
    rows.push({y,obs:ob,pred:p});
  }
  if(rows.length<3) return {years, rows, ok:false};
  const corr=(a,b)=>{const n=a.length,ma=a.reduce((s,x)=>s+x,0)/n,mb=b.reduce((s,x)=>s+x,0)/n;let sab=0,saa=0,sbb=0;for(let i=0;i<n;i++){sab+=(a[i]-ma)*(b[i]-mb);saa+=(a[i]-ma)**2;sbb+=(b[i]-mb)**2;}return sab/Math.sqrt(saa*sbb);};
  const okRows = rows.filter(r=>r.obs>0);
  return {years, rows, ok:true, rA:corr(rows.map(r=>r.obs),rows.map(r=>r.pred)), rM:corr(obsM,preM),
    mape: okRows.reduce((s,r)=>s+Math.abs(r.pred-r.obs)/r.obs,0)/okRows.length*100};
}

/* ================================================================ mapa */
function merc(lon, lat){
  const x=(lon+180)/360, s=Math.sin(lat*Math.PI/180);
  return [x, 0.5 - Math.log((1+s)/(1-s))/(4*Math.PI)];
}
function unmerc(x, y){
  const lon=x*360-180, n=Math.PI-2*Math.PI*y;
  return [lon, 180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n)))];
}
const MAP = {sat:false, cv:null, ctx:null, w:0, h:0, dpr:1, tiles:new Map(), tilesOk:0, tilesFail:0, drag:null, drawBox:null, raf:0};
function mapInit(){
  MAP.cv=$("mapCanvas"); MAP.ctx=MAP.cv.getContext("2d");
  const el=$("map");
  const ro=new ResizeObserver(()=>{ mapResize(); }); ro.observe(el);
  el.addEventListener("pointerdown", e=>{
    // Controls over the canvas must receive their clicks (do not capture the pointer).
    if(e.target.closest("button") || e.button!==0) return;
    el.setPointerCapture(e.pointerId);
    const p=mapPt(e);
    if(S.drawing){ MAP.drawBox={a:p,b:p}; }
    else MAP.drag={x:e.clientX,y:e.clientY, c:merc(S.view.lon,S.view.lat)};
    el.style.cursor = S.drawing ? "crosshair" : "grabbing";
  });
  el.addEventListener("pointermove", e=>{
    if(MAP.drawBox){ MAP.drawBox.b=mapPt(e); mapDraw(); return; }
    if(!MAP.drag) return;
    const sc=256*2**S.view.z;
    const nx=MAP.drag.c[0]-(e.clientX-MAP.drag.x)/sc, ny=MAP.drag.c[1]-(e.clientY-MAP.drag.y)/sc;
    const ll=unmerc(nx,ny); S.view.lon=ll[0]; S.view.lat=Math.max(-80,Math.min(80,ll[1])); mapDraw();
  });
  const end = e=>{
    el.style.cursor="";
    if(MAP.drawBox){
      const {a,b}=MAP.drawBox; MAP.drawBox=null;
      const A=screenToLL(a.x,a.y), B=screenToLL(b.x,b.y);
      if(Math.abs(a.x-b.x)>8 && Math.abs(a.y-b.y)>8){
        setArea("custom",[Math.min(A[0],B[0]),Math.min(A[1],B[1]),Math.max(A[0],B[0]),Math.max(A[1],B[1])]);
      }
      setDrawing(false); mapDraw(); return;
    }
    MAP.drag=null;
  };
  el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
  el.addEventListener("wheel", e=>{ e.preventDefault(); zoomAt(e.deltaY<0?1:-1, mapPt(e)); }, {passive:false});
  $("zIn").onclick=()=>zoomAt(1); $("zOut").onclick=()=>zoomAt(-1); $("zFit").onclick=()=>fitView(S.bbox||S.data.bbox);
}
function mapPt(e){ const r=MAP.cv.getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top}; }
function mapResize(){
  const r=MAP.cv.getBoundingClientRect(); MAP.dpr=window.devicePixelRatio||1;
  MAP.w=r.width; MAP.h=r.height; MAP.cv.width=Math.round(r.width*MAP.dpr); MAP.cv.height=Math.round(r.height*MAP.dpr);
  if(!MAP.fitted && S.data && MAP.w){ MAP.fitted=true; fitView(S.bbox||S.data.bbox); }
  mapDraw();
}
function zoomAt(dz, p){
  const z2=Math.max(4,Math.min(14,S.view.z+dz)); if(z2===S.view.z) return;
  p = p || {x:MAP.w/2,y:MAP.h/2};
  const ll=screenToLL(p.x,p.y); S.view.z=z2;
  const sc=256*2**z2, wpt=merc(ll[0],ll[1]);
  const c=[wpt[0]-(p.x-MAP.w/2)/sc, wpt[1]-(p.y-MAP.h/2)/sc]; const cl=unmerc(c[0],c[1]);
  S.view.lon=cl[0]; S.view.lat=cl[1]; mapDraw();
}
function screenToLL(x,y){ const sc=256*2**S.view.z, c=merc(S.view.lon,S.view.lat); return unmerc(c[0]+(x-MAP.w/2)/sc, c[1]+(y-MAP.h/2)/sc); }
function llToScreen(lon,lat){ const sc=256*2**S.view.z, c=merc(S.view.lon,S.view.lat), p=merc(lon,lat); return [(p[0]-c[0])*sc+MAP.w/2, (p[1]-c[1])*sc+MAP.h/2]; }
function fitView(b){
  if(!b||!MAP.w) return;
  const a=merc(b[0],b[3]), c=merc(b[2],b[1]);
  let z=14; while(z>4 && ((c[0]-a[0])*256*2**z > MAP.w*0.86 || (c[1]-a[1])*256*2**z > MAP.h*0.86)) z--;
  const m=unmerc((a[0]+c[0])/2,(a[1]+c[1])/2); S.view={lon:m[0],lat:m[1],z}; mapDraw();
}
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/";
function baseLayer(){ return MAP.sat ? "World_Imagery" : isDark() ? "Canvas/World_Dark_Gray_Base" : "Canvas/World_Light_Gray_Base"; }
function refLayer(){ return MAP.sat ? "Reference/World_Boundaries_and_Places" : isDark() ? "Canvas/World_Dark_Gray_Reference" : "Canvas/World_Light_Gray_Reference"; }
function tile(z,x,y,layer){
  const k=`${layer}/${z}/${x}/${y}`; let t=MAP.tiles.get(k);
  if(t) return t;
  const img=new Image(); t={img, ok:false};
  img.onload=()=>{t.ok=true; MAP.tilesOk++; mapDraw();};
  img.onerror=()=>{t.fail=true; MAP.tilesFail++; if(MAP.tilesFail===4 && !MAP.tilesOk) mapDraw();};
  img.src=`${ESRI}${layer}/MapServer/tile/${z}/${y}/${x}`;
  MAP.tiles.set(k,t); return t;
}
function drawTiles(ctx, layer, z, ox, oy, w, h){
  const n=2**z, x0=Math.floor(ox/256), x1=Math.floor((ox+w)/256), y0=Math.floor(oy/256), y1=Math.floor((oy+h)/256);
  for(let tx=x0;tx<=x1;tx++) for(let ty=y0;ty<=y1;ty++){
    if(ty<0||ty>=n) continue; const t=tile(z,((tx%n)+n)%n,ty,layer);
    if(t.ok) ctx.drawImage(t.img, Math.round(tx*256-ox), Math.round(ty*256-oy), 256, 256);
  }
}
function mapDraw(){
  if(MAP.raf) return;
  MAP.raf=requestAnimationFrame(()=>{ MAP.raf=0; mapRender(); });
}
function mapRender(){
  const {ctx,w,h,dpr}=MAP; if(!ctx||!w) return;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle=css("--map-bg"); ctx.fillRect(0,0,w,h);
  const z=S.view.z, sc=256*2**z, c=merc(S.view.lon,S.view.lat);
  const ox=c[0]*sc-w/2, oy=c[1]*sc-h/2;
  const baseFailed = MAP.tilesFail>=4 && !MAP.tilesOk;
  if(!baseFailed) drawTiles(ctx, baseLayer(), z, ox, oy, w, h);
  $("mapAttr").textContent = MAP.sat ? t("attrSat") : t("attrMap");
  $("mapNote").classList.toggle("hidden", !baseFailed);
  $("mapAttr").classList.toggle("hidden", baseFailed);
  if(baseFailed){
    $("mapNote").textContent=MAP.sat ? (LANG==="pt"?"Imagem de satélite indisponível sem conexão; exibindo mapa esquemático com detecções reais.":"Satellite imagery unavailable offline; showing a schematic map with real detections.") : t("mapFallback");
    ctx.fillStyle=css("--map-land"); ctx.fillRect(0,0,w,h);
    ctx.strokeStyle=css("--map-grat"); ctx.lineWidth=1; ctx.fillStyle=css("--muted"); ctx.font="11px Inter, system-ui, sans-serif";
    const tl=screenToLL(0,0), br=screenToLL(w,h); const step = z>=9?0.25:z>=7?0.5:2;
    for(let lo=Math.ceil(tl[0]/step)*step; lo<=br[0]; lo+=step){ const x=llToScreen(lo,0)[0]; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); ctx.fillText(`${Math.abs(lo).toFixed(2).replace(/\.?0+$/,"")}°${t("degW")}`, x+3, h-20); }
    for(let la=Math.ceil(br[1]/step)*step; la<=tl[1]; la+=step){ const y=llToScreen(0,la)[1]; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); ctx.fillText(`${Math.abs(la).toFixed(2).replace(/\.?0+$/,"")}°S`, 4, y-3); }
    ctx.strokeStyle=css("--map-river"); ctx.lineJoin="round"; ctx.lineCap="round";
    for(const r of RIOS){ ctx.lineWidth = r.n==="Rio Amazonas"||r.n==="Rio Solimões" ? 5 : 3.5; ctx.beginPath(); r.p.forEach((p,i)=>{const s=llToScreen(p[0],p[1]); i?ctx.lineTo(s[0],s[1]):ctx.moveTo(s[0],s[1]);}); ctx.stroke(); }
  }
  // Label reference layer is painted first; detections remain visible above it.
  if(!baseFailed) drawTiles(ctx, refLayer(), z, ox, oy, w, h);
  const D=S.data, R=S.res;
  if(D && R){
    const [lo,hi]=periodDays(), selected=R.A.idx, colM=css("--s-modis"), colV=css("--s-viirs");
    if(MAP.layer!=="points"){
      // Binned screen-space concentrations of actual detections.
      // This is a visual exploration layer, not a burned-area estimate.
      const bin=15,cols=Math.ceil(w/bin),rows=Math.ceil(h/bin),cells=new Uint32Array(cols*rows);
      let max=0;
      for(const i of selected){const d=D.day[i];if(d<lo||d>hi)continue;
        const x=D.wx[i]*sc-ox,y=D.wy[i]*sc-oy;
        if(x<0||y<0||x>=w||y>=h)continue;
        const ix=Math.floor(x/bin),iy=Math.floor(y/bin),ind=iy*cols+ix;
        cells[ind]++;if(cells[ind]>max)max=cells[ind];
      }
      const scale=Math.log1p(Math.max(1,max));
      for(let j=0;j<cells.length;j++){const n=cells[j];if(!n)continue;
        const v=Math.log1p(n)/scale;
        const hue=35-v*28,alpha=.22+.76*Math.sqrt(v);
        ctx.fillStyle=`hsla(${hue.toFixed(0)},97%,${(58-v*5).toFixed(0)}%,${alpha.toFixed(3)})`;
        ctx.fillRect((j%cols)*bin,(Math.floor(j/cols))*bin,bin-1,bin-1);
      }
    }else{
      // Draw each filtered observation with recognizable MODIS / VIIRS colors.
      // Two passes keep selected area clearly visible while preserving context.
      for(let pass=0;pass<2;pass++){
        ctx.globalAlpha=pass===0?.18:.90;
        for(const i of selected){const d=D.day[i];if(d<lo||d>hi)continue;
          const x=D.wx[i]*sc-ox,y=D.wy[i]*sc-oy;if(x<-4||y<-4||x>w+4||y>h+4)continue;
          const inside=R.selFlag[i]===1;if((pass===1)!==inside)continue;
          ctx.fillStyle=D.sensor[i]?colV:colM;
          const r=z>=10?4:z>=7?3:2.7;ctx.fillRect(x-r/2,y-r/2,r,r);
        }
      }
      ctx.globalAlpha=1;
    }
  }
  if(baseFailed){
    ctx.font="600 12px system-ui"; ctx.textBaseline="middle";
    for(const [n,lo,la,big] of CIDADES){
      const [x,y]=llToScreen(lo,la); if(x<0||y<0||x>w||y>h) continue;
      ctx.fillStyle=css("--surface"); ctx.beginPath(); ctx.arc(x,y,big?5:3.5,0,7); ctx.fill();
      ctx.fillStyle=css("--ink"); ctx.beginPath(); ctx.arc(x,y,big?3.5:2.2,0,7); ctx.fill();
      ctx.font = big ? "600 13px Inter, system-ui, sans-serif" : "500 11.5px Inter, system-ui, sans-serif";
      ctx.lineWidth=3; ctx.strokeStyle=css("--surface"); ctx.strokeText(n,x+7,y); ctx.fillStyle=css("--ink-2"); ctx.fillText(n,x+7,y);
    }
  }
  // área selecionada
  const b=S.bbox;
  if(b){
    const p1=llToScreen(b[0],b[3]), p2=llToScreen(b[2],b[1]);
    ctx.strokeStyle=css("--sel"); ctx.lineWidth=2; ctx.setLineDash([]);
    ctx.strokeRect(p1[0],p1[1],p2[0]-p1[0],p2[1]-p1[1]);
  }
  if(MAP.drawBox){
    const {a,b:bb}=MAP.drawBox; ctx.fillStyle="rgba(194,65,12,.10)"; ctx.strokeStyle=css("--sel"); ctx.lineWidth=2;
    ctx.fillRect(a.x,a.y,bb.x-a.x,bb.y-a.y); ctx.strokeRect(a.x,a.y,bb.x-a.x,bb.y-a.y);
  }
}
function periodDays(){
  if(S.selDay!=null) return [S.selDay, S.selDay];
  if(S.selMonth!=null){ const y=2000+Math.floor(S.selMonth/12), m=S.selMonth%12+1; return [dayOf(y,m,1), dayOf(y,m+1,1)-1]; }
  if(S.range) return S.range;
  return [dayOf(S.from,1,1), dayOf(S.to,12,31)];
}

