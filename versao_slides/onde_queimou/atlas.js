/* ===================== "Onde queimou": camada de apresentação (versão slides) =====================
   Só apresentação: usa m3Grid/m3Counts/m3Top/R.H/R.clim já calculados; não muda os cálculos. */
const ATL = {hi:-1, fromMap:false, rank:[], rankCities:[], pos2:[], m3pos:[], hint:{done:false, timer:0}};
const ATL_CLASSES = ["1–2","3–5","6–9","10–14","15–19","20+"];   // mesmas faixas de m3Class, usadas também no mapa do Brasil
function atlY0(){ return 2001; }
function atlY1(){ return S.res ? ymd(S.res.A.endDay)[0] : 2026; }
function atlN(){ return atlY1()-atlY0()+1; }
function atlNearCity(lo,la){ let best="", bd=1e9; for(const [nm,clo,cla] of CIDADES){ const d=Math.hypot((lo-clo)*111.3*Math.cos(la*Math.PI/180),(la-cla)*111.3); if(d<bd){bd=d;best=nm;} } return best; }
function atlPer(mi){ return t("atlPer", MONTH(mi%12), 2000+Math.floor(mi/12)); }

/* ---------- enquadramento e rótulos do 3D ---------- */
function m3Frame(G){
  const b=S.bbox;
  const f = b ? {lon0:(b[0]+b[2])/2, lat0:(b[1]+b[3])/2, w:b[2]-b[0], h:b[3]-b[1]}
              : {lon0:G.w+G.nx*M3_CELL/2, lat0:G.s+G.ny*M3_CELL/2, w:G.nx*M3_CELL, h:G.ny*M3_CELL};
  return M3.focus ? {...f, lon0:M3.focus.lo, lat0:M3.focus.la} : f;
}
function m3CityOrder(){
  const pr=new Set(ATL.rankCities);
  return [...CIDADES].sort((a,b)=>(b[0]==="Manaus")-(a[0]==="Manaus") || pr.has(b[0])-pr.has(a[0]) || b[3]-a[3]);
}
function atlMarker(ctx,x,y,n,hi,dark,font){
  const r=hi?13:11, ink=dark?"#fbefe8":"#2a0f0a", paper=dark?"#2a0f0a":"#ffffff";
  ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fillStyle=hi?ink:paper; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle=ink; ctx.stroke();
  ctx.fillStyle=hi?paper:ink; ctx.font=`700 12px ${font}`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(String(n),x,y+.5); ctx.textAlign="left";
}
function m3DrawMarkers(ctx,P,cnt,mx,Hmax,dark,font){
  const taken=[]; ATL.m3pos=[];
  ATL.rank.forEach((o,i)=>{ const z=Math.pow((cnt[o.c]||0)/(mx||1),0.62)*Hmax+0.2, p=P(o.lo,o.la,z), x=p[0], y=p[1]-18;
    ctx.strokeStyle=dark?"#fbefe8":"#2a0f0a"; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x,y+10); ctx.lineTo(p[0],p[1]); ctx.stroke();
    atlMarker(ctx,x,y,i+1,ATL.hi===o.c,dark,font); ATL.m3pos.push([x,y,o.c]); taken.push([x-14,y-14,x+14,y+14]); });
  return taken;
}

/* ---------- 2D: quadrados com fogo no período, coloridos por anos com fogo ---------- */
function atlasCells(ctx,sc,ox,oy,w,h){
  const G=m3Grid(), cnt=m3Counts(), b=S.bbox, half=M3_CELL/2;
  for(let c=0;c<G.N;c++){ if(!cnt[c]) continue;
    const lo=G.w+(c%G.nx+.5)*M3_CELL, la=G.s+(Math.floor(c/G.nx)+.5)*M3_CELL;
    const p1=llToScreen(lo-half,la+half), p2=llToScreen(lo+half,la-half);
    if(p2[0]<0||p2[1]<0||p1[0]>w||p1[1]>h) continue;
    const inside=!b||(lo>=b[0]&&lo<=b[2]&&la>=b[1]&&la<=b[3]);
    ctx.globalAlpha=inside?.92:.28; ctx.fillStyle=M3_RAMP[m3Class(G.nyears[c])];
    ctx.fillRect(p1[0],p1[1],Math.max(1.5,p2[0]-p1[0]-.5),Math.max(1.5,p2[1]-p1[1]-.5)); }
  ctx.globalAlpha=1;
}
function atlasMarkers(ctx){
  ATL.pos2=[]; if(!S.data||MAP.layer==="3d") return; const font=css("--font-ui")||"system-ui", dark=isDark();
  ATL.rank.forEach((o,i)=>{ const [x,y]=llToScreen(o.lo,o.la); if(x<-20||y<-20||x>MAP.w+20||y>MAP.h+20) return; atlMarker(ctx,x,y,i+1,ATL.hi===o.c,dark,font); ATL.pos2.push([x,y,o.c]); });
}

/* ---------- ranking ---------- */
function atlRenderRank(){
  const el=$("atlRank"); if(!el||!S.data) return; const T=m3Top(), N=atlN();
  ATL.rank=T.top; ATL.rankCities=T.top.map(o=>atlNearCity(o.lo,o.la));
  el.innerHTML=`<h3>${t("m3TopT")}</h3><p class="atl-rank-sub">${t("atlRankSub")}</p>`+
    (T.top.length ? `<ol class="atl-rank-list">${T.top.map((o,i)=>{ const where=m3Near(o.lo,o.la);
      return `<li><button type="button" data-c="${o.c}" aria-label="${escapeHtml(t("atlRankAria",i+1,where,fmt(o.n),o.y,N))}"><span class="atl-rank-n" aria-hidden="true">${i+1}</span><span class="atl-rank-txt"><span class="atl-rank-where">${where}</span><strong>${t("m3Cnt",fmt(o.n))}</strong><span class="atl-rank-tag">${t("atlYearsTag",o.y,N)}</span></span></button></li>`; }).join("")}</ol>`
      : `<p class="atl-rank-sub">${t("atlRankNone")}</p>`);
  el.querySelectorAll("button[data-c]").forEach(b=>{ const c=+b.dataset.c, o=T.top.find(q=>q.c===c);
    b.classList.toggle("hi",c===ATL.hi);
    b.onmouseenter=b.onfocus=()=>{ATL.fromMap=false; atlHi(c);}; b.onmouseleave=b.onblur=()=>atlHi(-1); b.onclick=()=>atlFocus(o); });
}
function atlHi(c){
  if(ATL.hi===c) return; ATL.hi=c; M3.hi=c; if(c>=0) M3.auto=false;
  document.querySelectorAll("#atlRank button[data-c]").forEach(b=>b.classList.toggle("hi",+b.dataset.c===c));
  if(MAP.layer==="3d") render3d(); else mapDraw();
}
function atlFocus(o){
  if(MAP.layer==="3d"){ M3.focus={lo:o.lo,la:o.la}; M3.zoom=Math.max(M3.zoom,2.2); M3.auto=false; render3d(); }
  else { S.view.lon=o.lo; S.view.lat=o.la; S.view.z=Math.max(S.view.z,10); mapDraw(); }
}
function atlMapHover(e,pos){
  const r=e.currentTarget.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top; let f=-1;
  for(const p of pos) if(Math.hypot(p[0]-x,p[1]-y)<15){ f=p[2]; break; }
  if(f!==-1){ if(ATL.hi!==f){ ATL.fromMap=true; atlHi(f); } } else if(ATL.fromMap && ATL.hi!==-1){ ATL.fromMap=false; atlHi(-1); }
}

/* ---------- legenda, cobertura, frase de abertura ---------- */
function atlLegend(){
  const el=$("atlasLegend"); if(!el) return; const pts=MAP.layer==="points", is3=MAP.layer==="3d"; let h="";
  if(pts) h+=`<div class="atl-leg"><b>${t("atlLegPts")}</b><ol class="atl-keys"><li><i style="background:${css("--s-modis")}"></i><span>MODIS</span></li><li><i style="background:${css("--s-viirs")}"></i><span>VIIRS</span></li></ol></div>`;
  else h+=`<div class="atl-leg"><b>${t("atlLegC",atlY0(),atlY1())}</b><ol class="atl-keys">${M3_RAMP.map((c,i)=>`<li><i style="background:${c}"></i><span>${i===5?`20–${atlN()}`:ATL_CLASSES[i]}</span></li>`).join("")}</ol></div>`;
  if(is3) h+=`<div class="atl-leg"><b>${t("atlLegH")}</b><span class="atl-hbars" aria-hidden="true"><i style="height:6px"></i><i style="height:13px"></i><i style="height:22px"></i></span><span class="atl-legsmall">${t("atlLegHd")}</span></div>`;
  h+=`<p class="atl-legnote">${t("atlLegNote")}${pts?"":" "+t("atlScaleNote")}</p>`;
  el.innerHTML=h;
}
function atlCover(){
  const el=$("atlCover"), D=S.data; if(!el||!D) return;
  if(!(D.embedded&&D.coverageExplicit)){ el.textContent=t("coverageUploads"); return; }
  const b=D.coverageBBox, f=v=>nf(0,1).format(Math.abs(v));
  el.textContent=t("atlCover", f(b[0]), f(b[2]), f(b[1]), f(b[3]));
}
function atlFinding(){ const el=$("atlFinding"); if(!el||!S.data) return; const T=m3Top(); el.textContent=t("atlFinding",T.n15,atlN(),atlY0(),atlY1()); }

/* ---------- linha de status e números ---------- */
function atlStatus(){
  const R=S.res; if(!R) return; const det=fmt(countPoints());
  let per, harm=null, part=false;
  if(S.selMonth!=null && S.selDay==null && !S.range){ per=atlPer(S.selMonth); const v=R.H[S.selMonth]; harm=isFinite(v)?fmt(Math.max(0,v)):null; part=S.selMonth===R.partialMi; }
  else per=$("mapSub").textContent.split(",")[0];
  $("atlStatus").innerHTML=t("atlStatus",per,det,harm,part);
  $("atlStatMonthLbl").textContent=(S.selMonth!=null&&S.selDay==null&&!S.range)?t("atlStatDet",atlPer(S.selMonth)):t("atlStatDetP");
}

/* ---------- gráfico mensal: único seletor de mês ---------- */
function atlChart(){
  const R=S.res, el=$("atlasTimeline"); if(!R||!el) return;
  const y=S.atlasYear||atlY1(), area=areaName();
  $("atlChartTitle").textContent=t("atlChartTitle",y,area); $("atlChartSub").textContent=t("atlChartSub");
  $("atlChartKey").innerHTML=`<span><i class="k-bar"></i>${t("atlKeySel")}</span><span><i class="k-typ"></i>${t("atlKeyTyp")}</span>${R.partialMi>=0&&ymd(R.A.endDay)[0]===y?`<span><i class="k-part"></i>${t("atlKeyPartial")}</span>`:""}`;
  const mis=[...Array(12)].map((_,m)=>miOf(y,m+1)), val=mi=>(mi>R.endMi||!isFinite(R.H[mi]))?null:Math.max(0,R.H[mi]), med=m=>R.clim.med[m];
  const vals=mis.map(val), W=Math.max(280,Math.round(el.clientWidth||600)), H=176, L=40, Rt=4, Top=22, bot=24, ih=H-Top-bot, bw=(W-L-Rt)/12;
  const mx=Math.max(1,...vals.filter(v=>v!=null),...[...Array(12)].map((_,m)=>isFinite(med(m+1))?med(m+1):0));
  const nice=v=>{const p=10**Math.floor(Math.log10(Math.max(v,1))), f=v/p; return (f<=1?1:f<=2?2:f<=5?5:10)*p;}, step=nice(mx/2.4), ys=v=>Top+ih-v/mx*ih;
  const avail=mis.filter(mi=>val(mi)!=null); const focusMi=mis.includes(S.selMonth)&&val(S.selMonth)!=null?S.selMonth:avail.at(-1);
  let s=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  for(let g=step; g<=mx*1.001; g+=step) s+=`<line x1="${L}" x2="${W-Rt}" y1="${ys(g).toFixed(1)}" y2="${ys(g).toFixed(1)}" class="g"/><text x="${L-6}" y="${(ys(g)+4).toFixed(1)}" text-anchor="end" class="ax">${fmt(g)}</text>`;
  s+=`<line x1="${L}" x2="${W-Rt}" y1="${Top+ih+.5}" y2="${Top+ih+.5}" class="base"/>`;
  mis.forEach((mi,m)=>{ const x=L+m*bw, v=vals[m], md=med(m+1), sel=S.selMonth===mi, fut=v==null, part=mi===R.partialMi, bx=x+bw*.2, bwid=bw*.6;
    const lab=fut?t("atlBarFut",MONTH(m),y):t("atlBarAria",MONTH(m),y,fmt(v),isFinite(md)?fmt(md):"—",part);
    s+=`<g class="mo${sel?" sel":""}${fut?" fut":""}" data-mi="${mi}" role="radio" aria-checked="${sel}" aria-label="${escapeHtml(lab)}" tabindex="${!fut&&mi===focusMi?0:-1}"${fut?' aria-disabled="true"':""}>`;
    s+=`<rect class="hit" x="${x.toFixed(1)}" y="${Top-16}" width="${bw.toFixed(1)}" height="${ih+bot+16}"/>`;
    if(isFinite(md)&&md>0) s+=`<rect class="typ" x="${(x+bw*.1).toFixed(1)}" y="${ys(md).toFixed(1)}" width="${(bw*.8).toFixed(1)}" height="${(Top+ih-ys(md)).toFixed(1)}"/>`;
    if(!fut){ if(v>0) s+=`<rect class="bar${part?" part":""}" x="${bx.toFixed(1)}" y="${ys(v).toFixed(1)}" width="${bwid.toFixed(1)}" height="${Math.max(1.5,Top+ih-ys(v)).toFixed(1)}" rx="1.5"/>`;
      else s+=`<line class="zero" x1="${bx.toFixed(1)}" x2="${(bx+bwid).toFixed(1)}" y1="${Top+ih-1}" y2="${Top+ih-1}"/>`; }
    if(sel&&!fut) s+=`<text class="val" x="${(x+bw/2).toFixed(1)}" y="${((v>0?ys(v):Top+ih)-6).toFixed(1)}" text-anchor="middle">${fmt(v)}</text>`;
    else if(part&&bw>=44) s+=`<text class="pnote" x="${(x+bw/2).toFixed(1)}" y="${(Math.min(v>0?ys(v):Top+ih, isFinite(md)&&md>0?ys(md):Top+ih)-6).toFixed(1)}" text-anchor="middle">${t("atlKeyPartial")}</text>`;
    s+=`<text class="mon" x="${(x+bw/2).toFixed(1)}" y="${H-7}" text-anchor="middle">${MON(m)}</text></g>`; });
  el.innerHTML=s+"</svg>"; el.setAttribute("aria-label",t("atlChartTitle",y,area));
  const gs=[...el.querySelectorAll(".mo")];
  gs.forEach(g=>{ const mi=+g.dataset.mi; if(g.classList.contains("fut")) return;
    g.onclick=()=>atlSelect(mi,false);
    g.onkeydown=e=>{ const ok=gs.filter(q=>!q.classList.contains("fut")).map(q=>+q.dataset.mi), i=ok.indexOf(mi); let n=null;
      if(e.key==="ArrowRight"||e.key==="ArrowDown") n=ok[Math.min(ok.length-1,i+1)]; if(e.key==="ArrowLeft"||e.key==="ArrowUp") n=ok[Math.max(0,i-1)];
      if(e.key==="Home") n=ok[0]; if(e.key==="End") n=ok.at(-1); if(e.key==="Enter"||e.key===" ") n=mi;
      if(n!=null){ e.preventDefault(); atlSelect(n,true); } }; });
}
function atlSelect(mi,keyboard){
  stopAtlasPlay(); S.selMonth=mi; S.selDay=null; clearCustomRange(); mapDraw(); updateMapSub(); renderCalendar(); renderAtlas();
  const g=document.querySelector(`#atlasTimeline .mo[data-mi="${mi}"]`); if(g&&keyboard) g.focus({preventScroll:true});
}

/* ---------- dica do 3D: só na primeira vez, some sozinha ---------- */
function atlHintShow(){ if(ATL.hint.done) return false; if(!ATL.hint.timer) ATL.hint.timer=setTimeout(atlHintDone,4500); return true; }
function atlHintDone(){ ATL.hint.done=true; const h=$("m3Hint"); if(h) h.hidden=true; }

/* ---------- ligação com o restante ---------- */
function atlAfter(){ if(!S.res||!S.data) return; atlRenderRank(); atlLegend(); atlChart(); atlStatus(); atlFinding(); atlCover(); $("m3Card").hidden=true; }
(function(){
  const _ra=renderAtlas; renderAtlas=function(){ const r=_ra.apply(this,arguments); try{ atlAfter(); }catch(e){ console.error(e); } return r; };
  const _sa=setArea; setArea=function(){ M3.focus=null; M3.zoom=1; ATL.hi=-1; M3.hi=-1; return _sa.apply(this,arguments); };
})();
function atlInit(){
  $("mapCanvas").addEventListener("pointermove",e=>{ if(MAP.layer!=="3d") atlMapHover(e,ATL.pos2); });
  $("map3d").addEventListener("pointermove",e=>atlMapHover(e,ATL.m3pos));
  ["pointerdown","wheel"].forEach(ev=>$("map3d").addEventListener(ev,atlHintDone,{passive:true}));
  $("atlasYear").addEventListener("change",()=>{ const R=S.res; if(!R) return; const y=S.atlasYear, m=S.selMonth!=null?S.selMonth%12:9;
    let mi=miOf(y,m+1); if(mi>R.endMi) mi=R.endMi; if(2000+Math.floor(mi/12)!==y) mi=miOf(y,12); atlSelect(mi,false); });
  let rz; addEventListener("resize",()=>{ clearTimeout(rz); rz=setTimeout(()=>{ if(S.res) atlChart(); },150); });
}

Object.assign(I18N.pt,{
  atlasTitle:"Onde queimou",
  atlFinding:(n,N,y0,y1)=> n>0 ? `${fmt(n)} ${n===1?"área":"áreas"} de cerca de 4 km ${n===1?"queimou":"queimaram"} em 15 ou mais dos ${N} anos do registro (${y0} a ${y1}).`
                               : `Nenhuma área de cerca de 4 km queimou em 15 ou mais dos ${N} anos do registro (${y0} a ${y1}) nesta região.`,
  atlModesAria:"Visualização dos focos", atlBaseAria:"Tipo de mapa", atlToolsAria:"Ferramentas do mapa",
  fDraw:"Desenhar", fCoords:"Coordenadas",
  m3TopT:"Onde o fogo mais se repete", atlRankSub:"Áreas de cerca de 4 km com fogo em mais anos; no empate, mais focos.",
  atlRankNone:"Nenhuma área com fogo nesta seleção.",
  atlYearsTag:(y,N)=>`${y}/${N} anos`, atlRankAria:(i,w,n,y,N)=>`${i}º: ${w}, ${n} focos desde 2000, fogo em ${y} de ${N} anos. Centralizar o mapa.`,
  m3Cnt:(n)=>`${n} focos desde 2000`,
  atlasFilter:"Intervalo personalizado",
  atlPer:(m,y)=>`${capFirst(m)} de ${y}`,
  atlChartTitle:(y,a)=>`Focos por mês em ${y} · ${a}`,
  atlChartSub:"Focos harmonizados: quadrados de cerca de 1 km com fogo, contados uma vez por dia na escala do VIIRS. Escolha um mês para vê-lo no mapa.",
  atlKeySel:"mês escolhido", atlKeyTyp:"ano típico (mediana de 2003 a 2025)", atlKeyPartial:"parcial",
  atlBarAria:(m,y,v,md,p)=>`${capFirst(m)} de ${y}: ${v} focos harmonizados${p?" (mês parcial)":""}; ano típico: ${md}.`, atlBarFut:(m,y)=>`${capFirst(m)} de ${y}: sem dados ainda.`,
  atlStatus:(per,det,harm,part)=>`<b>${per}</b> · ${det} focos detectados${harm!=null?` · ${harm} focos harmonizados`:""}${part?" · mês parcial":""}`,
  atlStatDet:(p)=>`Focos detectados em ${p.charAt(0).toLowerCase()+p.slice(1)}`, atlStatDetP:"Focos detectados no período",
  atlasReadingAll:"Focos detectados desde 2000",
  atlTech:"Detalhes técnicos", atlasReadingFactor:"Fator MODIS → VIIRS",
  atlFactorD:"É quantas vezes o VIIRS registra mais fogo que o MODIS nesta área; com ele, os anos antigos entram na escala do VIIRS. “Focos detectados” somam todos os satélites (MODIS, VIIRS Suomi NPP e NOAA-20) e contam o mesmo fogo mais de uma vez. “Focos harmonizados” contam cada quadrado de cerca de 1 km uma vez por dia, na escala de um só satélite, e por isso são menores.",
  atlLegC:(a,b)=>`Cor: em quantos anos houve fogo (${a} a ${b})`, atlLegPts:"Cor: satélite que detectou o foco",
  atlLegH:"Altura (3D): focos no período", atlLegHd:"mais alto = mais focos",
  atlLegNote:"Mostra focos de calor detectados, não área queimada.",
  atlScaleNote:"A mesma escala vale para o mapa do Brasil, que usa só o MODIS de 2003 a 2025 (23 anos).",
  atlCover:(w,e,s,n)=>`Dados cobrem a Amazônia Central (aprox. ${w}° a ${e}° O e ${s}° a ${n}° S).`,
  atlasAccuracyTitle:"Entenda as cores e as limitações do mapa",
  atlasAcc:"Em Concentração e 3D, cada quadrado de cerca de 4 km teve fogo no período escolhido, e a cor diz em quantos anos ele queimou desde 2001. Em Pontos, cada ponto é uma detecção, colorida pelo satélite. Focos ativos mostram fogo na hora em que o satélite passa: não são área queimada nem fumaça, e nuvens podem esconder incêndios. A imagem de satélite e o mapa-base dependem de conexão; as detecções vêm da base carregada.",
  m3Hint:"Arraste para girar. Role para aproximar."
});
Object.assign(I18N.en,{
  atlasTitle:"Where it burned",
  atlFinding:(n,N,y0,y1)=> n>0 ? `${fmt(n)} ${n===1?"area":"areas"} of about 4 km burned in 15 or more of the ${N} years on record (${y0} to ${y1}).`
                               : `No area of about 4 km burned in 15 or more of the ${N} years on record (${y0} to ${y1}) in this region.`,
  atlModesAria:"Hotspot view", atlBaseAria:"Base map", atlToolsAria:"Map tools",
  fDraw:"Draw", fCoords:"Coordinates",
  m3TopT:"Where fire repeats most", atlRankSub:"Areas of about 4 km with fire in the most years; ties broken by detections.",
  atlRankNone:"No area with fire in this selection.",
  atlYearsTag:(y,N)=>`${y}/${N} years`, atlRankAria:(i,w,n,y,N)=>`${i}: ${w}, ${n} detections since 2000, fire in ${y} of ${N} years. Center the map.`,
  m3Cnt:(n)=>`${n} detections since 2000`,
  atlasFilter:"Custom range",
  atlPer:(m,y)=>`${m} ${y}`,
  atlChartTitle:(y,a)=>`Detections per month in ${y} · ${a}`,
  atlChartSub:"Harmonized detections: squares of about 1 km with fire, counted once per day on the VIIRS scale. Pick a month to see it on the map.",
  atlKeySel:"selected month", atlKeyTyp:"typical year (2003–2025 median)", atlKeyPartial:"partial",
  atlBarAria:(m,y,v,md,p)=>`${m} ${y}: ${v} harmonized detections${p?" (partial month)":""}; typical year: ${md}.`, atlBarFut:(m,y)=>`${m} ${y}: no data yet.`,
  atlStatus:(per,det,harm,part)=>`<b>${per}</b> · ${det} detections${harm!=null?` · ${harm} harmonized detections`:""}${part?" · partial month":""}`,
  atlStatDet:(p)=>`Detections in ${p}`, atlStatDetP:"Detections in the period",
  atlasReadingAll:"Detections since 2000",
  atlTech:"Technical details", atlasReadingFactor:"MODIS → VIIRS factor",
  atlFactorD:"How many times more fire VIIRS records than MODIS in this area; it puts the older years on the VIIRS scale. “Detections” add up every satellite (MODIS, VIIRS Suomi NPP and NOAA-20) and count the same fire more than once. “Harmonized detections” count each square of about 1 km once per day on a single satellite’s scale, so they are smaller.",
  atlLegC:(a,b)=>`Color: number of years with fire (${a} to ${b})`, atlLegPts:"Color: satellite that detected it",
  atlLegH:"Height (3D): detections in the period", atlLegHd:"taller = more detections",
  atlLegNote:"Shows detected hotspots, not burned area.",
  atlScaleNote:"The same scale is used on the Brazil map, which uses MODIS only, 2003 to 2025 (23 years).",
  atlCover:(w,e,s,n)=>`Data cover the Central Amazon (approx. ${w}° to ${e}° W and ${s}° to ${n}° S).`,
  atlasAccuracyTitle:"About map colors and limitations",
  atlasAcc:"In Concentration and 3D, each square of about 4 km had fire in the chosen period, and its color says in how many years it has burned since 2001. In Points, each point is one detection, colored by satellite. Active fire detections show fire when the satellite passes: they are not burned area or smoke, and clouds can hide fires. Satellite imagery and the base map need internet access; detections come from the loaded dataset.",
  m3Hint:"Drag to rotate. Scroll to zoom."
});
