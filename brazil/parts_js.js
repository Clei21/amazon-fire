(function(){

const HDR = /*__BR_HDR__*/{};
const SUM = /*__BR_SUM__*/{};
const BIN = "/*__BR_BIN__*/";
const T = {
pt:{navManaus:"Manaus",navBrazil:"Brasil",navMap:"Mapa",navNational:"O país",navMethod:"Método",loading:"Carregando 41,6 milhões de detecções…",
 title:"E no Brasil inteiro?",
 lead:"Aplicamos ao país inteiro a mesma harmonização feita para Manaus: 41,6 milhões de detecções dos satélites MODIS e VIIRS da NASA numa escala única, de 2000 a 2026.",
 insBrT:"Brasil: a temporada mais fraca desde 2001", insBrD:"De agosto a outubro de 2026, o país teve a menor atividade de fogo dos 26 anos do registro.",
 insMaT:"Manaus: a 3ª mais forte", insMaD:"No mesmo período, a região metropolitana de Manaus teve a terceira temporada mais intensa desde 2001.",
 insNote:"A média nacional escondeu a crise do Amazonas. Por isso o calendário precisa ser feito por área.",
 mapT:"Escolha uma região ou desenhe uma área", mapD:"Escolha Norte, Nordeste, Centro-Oeste, Sudeste ou Sul, clique em um ponto do mapa ou desenhe um retângulo. O calendário ao lado é recalculado para a área escolhida.",
 lRec:"Onde o fogo volta", lAnom:"Ano vs normal", lAct:"Focos no ano", mPan:"Mover", mDraw:"Desenhar área",
 hint:"Arraste para mover, use a rolagem para aproximar. Um clique seleciona um quadrado de cerca de 165 km. As regiões e áreas prontas são aproximadas, montadas com quadrados de 55 km, e não seguem os limites oficiais dos estados.",
 legRec:"Anos com fogo de 2003 a 2025 (MODIS, quadrados de ~11 km)", legAnom:(y)=>`${y}, janeiro a outubro, comparado à mediana de 2003 a 2025`, legAct:(y)=>`Focos harmonizados, ${y}, janeiro a outubro`, legActM:(m)=>`Focos harmonizados, ${m}`,
 below:"abaixo", normal:"normal", above:"acima", few:"poucos", many:"muitos",
 sel:"Área selecionada", selDraw:"Área desenhada", cells:(n,km)=>`${n} quadrados de 0,5°, cerca de ${km} mil km²`,
 fWorst:(y,v)=>`Ano mais intenso: <b>${y}</b> (${v} focos de janeiro a outubro).`,
 fPeak:(m)=>`Mês de pico típico: <b>${m}</b>.`,
 f26:(r,n,x)=>`2026 (janeiro a outubro): <b>${r}º</b> de ${n} anos, <span class="${x>1.15?"b-hot":""}">${x.toFixed(1).replace(".",",")}× um ano típico</span>.`,
 fNov:(v,m,x)=>`1 a 14 de novembro de 2026: <b>${v}</b> focos, contra ${m} num ano típico (${x.toFixed(2).replace(".",",")}×).`,
 fVal:(e)=>`Teste do ajuste nesta área (ano escondido, 2013–2025): erro médio de <b>${e}%</b>.`,
 fNone:"Pouco fogo nesta área para calcular um calendário confiável. Escolha uma área maior.",
 calT:"Calendário mensal (focos harmonizados)", barsT:"Janeiro a outubro de cada ano", csv:"Baixar série (CSV)", openManaus:"Ver o estudo detalhado de Manaus", coT:"Ou digite uma coordenada:", coLat:"Latitude", coLon:"Longitude", coRad:"Raio", coGo:"Ver área", coErr:"Digite um ponto dentro do Brasil (latitude entre -34 e 6, longitude entre -74 e -34).", coName:(la,lo)=>`Ponto ${la}, ${lo}`, fDet:(v,n,m)=>`Focos detectados pelos satélites de janeiro a outubro de 2026, sem ajuste: <b>${v}</b> no Suomi NPP, ${n} no NOAA-20 e ${m} no MODIS.`, 
 tipYears:(n)=>`${n} de 23 anos com fogo`, tipVal:"Focos harmonizados", tipMed:"Típico (mediana)", tipRatio:"Em relação ao típico", tipLow:"Só Terra: confiança menor",
 natT:"O Brasil dia a dia", natD:"Cada linha é um ano e cada marca é um dia, para o país inteiro. A faixa da temporada aparece todo ano entre julho e dezembro.",
 dStart:"A temporada costuma começar", dPeak:"O pico costuma ser", dEnd:"Costuma terminar",
 d26s:"Em 2026: começou em 15 de agosto, 19 dias depois do normal", d26p:"Em 2026: o pior dia foi 9 de outubro, o mesmo de Manaus", d26e:"Em 2026: ainda em andamento",
 legDaily:"Focos harmonizados por dia",
 metT:"Mesmo método, escala nacional", metD:"Calibramos cada troca de satélite com os dados do Brasil inteiro e testamos escondendo um ano por vez. No país, o ajuste é ainda mais preciso do que em Manaus.",
 vH:["Troca de satélite","Razão geral","Anos testados","Correlação anual","Erro médio anual"],
 howT:"Como funciona", howL:["Filtro de qualidade e remoção de fontes de calor fixas, como em Manaus.","Contagem em células de 1 km por dia, depois somadas em quadrados de 0,5° (cerca de 55 km).","Para a área escolhida, as razões entre satélites são recalculadas mês a mês com os dados dela.","No mapa, cada quadrado usa as razões nacionais, para que todos fiquem na mesma escala."],
 limT:"Limites", limL:["As áreas são retângulos, não limites de estados ou municípios.","Focos ativos mostram fogo na hora da passagem do satélite, não área queimada.","Áreas pequenas têm poucos focos e o calendário fica mais incerto; o erro do teste aparece no painel.","Antes de agosto de 2002 só o satélite Terra observava: esses meses têm confiança menor."],
 footL:"Amazonia Fire, NASA Space Apps Challenge 2026. Dados: NASA FIRMS.", footR:"Voltar ao estudo de Manaus",
 mon:["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"], monL:["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"],
 near:(km,d,c)=>`${km} km a ${d} de ${c}`, inC:(c)=>`em ${c}`, dirs:["norte","nordeste","leste","sudeste","sul","sudoeste","oeste","noroeste"]},
en:{navManaus:"Manaus",navBrazil:"Brazil",navMap:"Map",navNational:"The country",navMethod:"Method",loading:"Loading 41.6 million detections…",
 title:"And across Brazil?",
 lead:"We applied the same harmonization built for Manaus to the whole country: 41.6 million NASA MODIS and VIIRS detections on one scale, from 2000 to 2026.",
 insBrT:"Brazil: the quietest season since 2001", insBrD:"From August to October 2026, the country had the lowest fire activity in the 26-year record.",
 insMaT:"Manaus: the 3rd most intense", insMaD:"In the same months, the Manaus metropolitan area had its third most intense season since 2001.",
 insNote:"The national average hid the crisis in Amazonas. That is why the calendar has to be built for each area.",
 mapT:"Pick a region or draw an area", mapD:"Choose North, Northeast, Center-West, Southeast or South, click a point on the map or draw a rectangle. The calendar beside it is recomputed for that area.",
 lRec:"Where fire returns", lAnom:"Year vs normal", lAct:"Fires in the year", mPan:"Move", mDraw:"Draw area",
 hint:"Drag to move, scroll to zoom. One click selects a square of about 165 km. Regions and ready-made areas are approximate, built from 55 km squares, and do not follow official state boundaries.",
 legRec:"Years with fire, 2003 to 2025 (MODIS, squares of ~11 km)", legAnom:(y)=>`${y}, January to October, against the 2003–2025 median`, legAct:(y)=>`Harmonized detections, ${y}, January to October`, legActM:(m)=>`Harmonized detections, ${m}`,
 below:"below", normal:"normal", above:"above", few:"few", many:"many",
 sel:"Selected area", selDraw:"Drawn area", cells:(n,km)=>`${n} squares of 0.5°, about ${km} thousand km²`,
 fWorst:(y,v)=>`Most intense year: <b>${y}</b> (${v} detections from January to October).`,
 fPeak:(m)=>`Typical peak month: <b>${m}</b>.`,
 f26:(r,n,x)=>`2026 (January to October): <b>${ord(r)}</b> of ${n} years, <span class="${x>1.15?"b-hot":""}">${x.toFixed(1)}× a typical year</span>.`,
 fNov:(v,m,x)=>`1 to 14 November 2026: <b>${v}</b> detections, against ${m} in a typical year (${x.toFixed(2)}×).`,
 fVal:(e)=>`Test of the adjustment in this area (held-out years, 2013–2025): mean error <b>${e}%</b>.`,
 fNone:"Too little fire in this area for a reliable calendar. Pick a larger area.",
 calT:"Monthly calendar (harmonized detections)", barsT:"January to October of each year", csv:"Download series (CSV)", openManaus:"See the detailed Manaus study", coT:"Or type a coordinate:", coLat:"Latitude", coLon:"Longitude", coRad:"Radius", coGo:"Show area", coErr:"Type a point inside Brazil (latitude between -34 and 6, longitude between -74 and -34).", coName:(la,lo)=>`Point ${la}, ${lo}`, fDet:(v,n,m)=>`Fires detected by the satellites from January to October 2026, before adjustment: <b>${v}</b> by Suomi NPP, ${n} by NOAA-20 and ${m} by MODIS.`, 
 tipYears:(n)=>`${n} of 23 years with fire`, tipVal:"Harmonized detections", tipMed:"Typical (median)", tipRatio:"Against typical", tipLow:"Terra only: lower confidence",
 natT:"Brazil day by day", natD:"Each row is a year and each mark is a day, for the whole country. The season band appears every year between July and December.",
 dStart:"The season usually starts", dPeak:"It usually peaks", dEnd:"It usually ends",
 d26s:"In 2026: started on 15 August, 19 days late", d26p:"In 2026: the worst day was 9 October, the same as in Manaus", d26e:"In 2026: still under way",
 legDaily:"Harmonized detections per day",
 metT:"Same method, national scale", metD:"We calibrated every satellite hand-off on the whole of Brazil and tested it by hiding one year at a time. Nationally, the adjustment is even more accurate than for Manaus.",
 vH:["Satellite hand-off","Overall ratio","Years tested","Annual correlation","Mean annual error"],
 howT:"How it works", howL:["Quality filter and removal of fixed heat sources, as for Manaus.","Counts on 1 km cells per day, then summed into 0.5° squares (about 55 km).","For the selected area, the ratios between satellites are recomputed month by month from its own data.","On the map, every square uses the national ratios so that all squares share one scale."],
 limT:"Limits", limL:["Areas are rectangles, not state or municipal boundaries.","Active fire detections show fire at the time of a satellite pass, not burned area.","Small areas have few detections and a less certain calendar; the test error is shown in the panel.","Before August 2002 only Terra observed: those months have lower confidence."],
 footL:"Amazonia Fire, NASA Space Apps Challenge 2026. Data: NASA FIRMS.", footR:"Back to the Manaus study",
 mon:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], monL:["January","February","March","April","May","June","July","August","September","October","November","December"],
 near:(km,d,c)=>`${km} km ${d} of ${c}`, inC:(c)=>`in ${c}`, dirs:["north","northeast","east","southeast","south","southwest","west","northwest"]}
};
function ord(n){return n+(n%10==1&&n!=11?"st":n%10==2&&n!=12?"nd":n%10==3&&n!=13?"rd":"th");}
const t=(k,...a)=>{const v=T[LANG][k]; return typeof v==="function"?v(...a):v;};
const $=id=>document.getElementById(id);
const nf=(d=0)=>new Intl.NumberFormat(LANG==="pt"?"pt-BR":"en-US",{maximumFractionDigits:d,minimumFractionDigits:0});
const fmt=v=>nf(0).format(Math.round(v));
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/* ---------------------------------------------------------------- places */
const PLACES=[["Manaus",-60.02,-3.10,1],["Belém",-48.50,-1.46,1],["Porto Velho",-63.90,-8.76,1],["Rio Branco",-67.81,-9.97,1],["Boa Vista",-60.67,2.82,1],["Macapá",-51.07,0.03,1],["Palmas",-48.33,-10.18,1],["Cuiabá",-56.10,-15.60,1],["Campo Grande",-54.62,-20.47,1],["Goiânia",-49.25,-16.68,1],["Brasília",-47.88,-15.79,1],["São Luís",-44.30,-2.53,1],["Teresina",-42.80,-5.09,1],["Fortaleza",-38.54,-3.73,1],["Natal",-35.21,-5.79,1],["João Pessoa",-34.86,-7.12,0],["Recife",-34.88,-8.05,1],["Maceió",-35.73,-9.67,0],["Aracaju",-37.07,-10.91,0],["Salvador",-38.50,-12.97,1],["Belo Horizonte",-43.94,-19.92,1],["Vitória",-40.31,-20.32,0],["Rio de Janeiro",-43.17,-22.91,1],["São Paulo",-46.63,-23.55,1],["Curitiba",-49.27,-25.43,1],["Florianópolis",-48.55,-27.60,0],["Porto Alegre",-51.23,-30.03,1],["Apuí",-59.89,-7.20,0],["Lábrea",-64.80,-7.26,0],["Altamira",-52.21,-3.20,0],["São Félix do Xingu",-51.99,-6.64,0],["Novo Progresso",-55.38,-7.04,0],["Corumbá",-57.65,-19.01,0],["Santarém",-54.71,-2.44,0],["Humaitá",-63.02,-7.51,0],["Barreiras",-45.00,-12.15,0],["Balsas",-46.04,-7.53,0]];
const PRESETS=[
 {id:"br",pt:"Brasil",en:"Brazil",b:null},
 {id:"N",pt:"Norte",en:"North",reg:1},{id:"NE",pt:"Nordeste",en:"Northeast",reg:2},{id:"CO",pt:"Centro-Oeste",en:"Center-West",reg:3},{id:"SE",pt:"Sudeste",en:"Southeast",reg:4},{id:"S",pt:"Sul",en:"South",reg:5},
 {id:"sam",pt:"Sul do Amazonas e BR-319",en:"Southern Amazonas and BR-319",b:[-66,-10,-58,-5]},
 {id:"pan",pt:"Pantanal",en:"Pantanal",b:[-58.5,-22,-55,-16]},
 {id:"mao",pt:"Região de Manaus",en:"Manaus region",b:[-61,-4,-58.5,-2.5]}];


/* approximate macro-regions (polygons lon,lat); cells outside all four are Centro-Oeste */
const REGPOLY={1:[[-75,6],[-45.5,6],[-46.1,-1.2],[-47.4,-5.2],[-47.0,-6.8],[-45.9,-8.0],[-45.8,-10.3],[-46.2,-13.0],[-50.3,-13.0],[-50.4,-9.85],[-56.8,-9.8],[-58.0,-9.0],[-61.5,-9.0],[-60.2,-13.5],[-75,-13.5]],
 2:[[-46.1,-1.2],[-30,0],[-30,-18.35],[-39.7,-18.35],[-40.3,-18.1],[-41.0,-16.0],[-42.0,-15.2],[-44.2,-14.3],[-46.0,-15.0],[-46.2,-13.0],[-45.8,-10.3],[-45.9,-8.0],[-47.0,-6.8],[-47.4,-5.2]],
 4:[[-46.0,-15.0],[-44.2,-14.3],[-42.0,-15.2],[-41.0,-16.0],[-40.3,-18.1],[-39.7,-18.35],[-30,-18.35],[-30,-26],[-48.0,-25.3],[-49.3,-24.5],[-49.7,-23.2],[-50.6,-22.9],[-52.1,-22.6],[-53.1,-22.6],[-51.0,-20.1],[-50.9,-19.4],[-49.3,-18.5],[-47.8,-17.6],[-47.3,-16.0],[-46.4,-15.3]],
 5:[[-48.0,-25.3],[-30,-26],[-30,-35],[-60,-35],[-60,-24.0],[-54.3,-24.0],[-53.1,-22.6],[-52.1,-22.6],[-50.6,-22.9],[-49.7,-23.2],[-49.3,-24.5]]};
function inPoly(x,y,P){ let c=false; for(let i=0,j=P.length-1;i<P.length;j=i++){ const [xi,yi]=P[i],[xj,yj]=P[j]; if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)) c=!c; } return c; }
function regionOf(lon,lat){ for(const k of [1,2,4,5]) if(inPoly(lon,lat,REGPOLY[k])) return k; return 3; }
/* ---------------------------------------------------------------- data */
const NM=HDR.nm, AQUA=31, TERRA_END=239, SNPP0=145, SNPP1=321, N20_0=219, CUR=NM-1;
const RM=SUM.rm, RN=SUM.rn, RT=SUM.rt;  // national monthly ratios, keys 1..12
let G=null;
async function load(){
  const bin=Uint8Array.from(atob(BIN),c=>c.charCodeAt(0));
  let buf;
  try{ buf=await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer(); }
  catch(e){ $("br_loading").textContent="This browser cannot decompress the data. Please use a recent Chrome, Edge, Firefox or Safari."; throw e; }
  let off=0; const take=(n,Ty)=>{const b=Ty.BYTES_PER_ELEMENT; const a=new Ty(buf.slice(off,off+n*b)); off+=n*b; return a;};
  const L=HDR.lens, ent=[], mtd=[];
  for(let s=0;s<4;s++){ const n=L["m"+s]; ent.push([take(n,Uint16Array),take(n,Uint16Array),take(n,Uint16Array)]); }
  for(let s=0;s<4;s++){ const n=L["t"+s]; mtd.push([take(n,Uint16Array),take(n,Uint16Array),take(n,Uint16Array)]); }
  const gr=HDR.grid, grid=take(gr.h*gr.w,Uint8Array);
  const daily=[]; for(let s=0;s<4;s++) daily.push(take(HDR.endDay+1,Uint32Array));
  // dense per-cell monthly arrays
  const ids=new Set(); for(const e of ent) for(const c of e[0]) ids.add(c);
  const cells=[...ids].sort((a,b)=>a-b), idx=new Map(cells.map((c,i)=>[c,i])), NC=cells.length;
  const M=[0,1,2,3].map(()=>new Float32Array(NC*NM));
  ent.forEach(([c,m,n],s)=>{ for(let i=0;i<c.length;i++) M[s][idx.get(c[i])*NM+m[i]]=n[i]; });
  const MT=[0,1,2,3].map(()=>new Float32Array(NC*27));
  mtd.forEach(([c,y,n],s)=>{ for(let i=0;i<c.length;i++){ const j=idx.get(c[i]); if(j!=null) MT[s][j*27+y[i]]=n[i]; } });
  const cy=new Int16Array(NC), cx=new Int16Array(NC); cells.forEach((c,i)=>{cy[i]=Math.floor(c/100); cx[i]=c%100;});
  G={cells,idx,NC,M,MT,cy,cx,grid,gr,daily};
  G.reg=new Uint8Array(NC); for(let j=0;j<NC;j++) G.reg[j]=regionOf(-75+cx[j]*0.5+0.25,-35+cy[j]*0.5+0.25);
  // per-cell harmonized monthly with national ratios, and Jan-Oct totals per year
  const HC=new Float32Array(NC*NM);
  for(let j=0;j<NC;j++) for(let mi=10;mi<NM;mi++) HC[j*NM+mi]=harmOne(mi, k=>M[k][j*NM+mi], RM,RN,RT);
  G.HC=HC;
  const JO=new Float32Array(NC*27);
  for(let j=0;j<NC;j++) for(let y=1;y<=26;y++){ let s=0; for(let m=0;m<10;m++){ const mi=y*12+m; if(mi>=10) s+=HC[j*NM+mi]; } JO[j*27+y]=s; }
  const MED=new Float32Array(NC);
  for(let j=0;j<NC;j++){ const v=[]; for(let y=3;y<=25;y++) v.push(JO[j*27+y]); v.sort((a,b)=>a-b); MED[j]=v[11]; }
  G.JO=JO; G.MED=MED;
}
function harmOne(mi, get, rm, rn, rt){
  const m=mi%12+1;
  if(mi>=SNPP0 && mi<=SNPP1) return get(2);
  if(mi>=N20_0 && mi>SNPP1) return get(3)*rn[m];
  if(mi<AQUA) return get(1)*rt[m]*rm[m];
  return get(0)*rm[m];
}
const yOf=mi=>2000+Math.floor(mi/12);

/* ----------------------------------------------- selection: harmonize area */
function cellsIn(b,reg){ if(reg) { const o=[]; for(let j=0;j<G.NC;j++) if(G.reg[j]===reg) o.push(j); return o; } const out=[]; for(let j=0;j<G.NC;j++){ const lon=-75+G.cx[j]*0.5+0.25, lat=-35+G.cy[j]*0.5+0.25; if(!b||(lon>=b[0]&&lon<=b[2]&&lat>=b[1]&&lat<=b[3])) out.push(j);} return out; }
function ratios(src, ref, okSrc, excl, k=30){
  let a=0,b=0; const sa=new Float64Array(13), sb=new Float64Array(13);
  for(let mi=0;mi<CUR;mi++){ if(!(okSrc(mi)&&mi>=SNPP0&&mi<=SNPP1)) continue; if(excl!=null&&yOf(mi)===excl) continue; const m=mi%12+1; a+=ref[mi]; b+=src[mi]; sa[m]+=ref[mi]; sb[m]+=src[mi]; }
  const R=b>0?a/b:NaN, r={}; for(let m=1;m<=12;m++) r[m]=(sa[m]+k*R)/(sb[m]+k); return {R,r};
}
function analyse(js){
  const S=[0,1,2,3].map(s=>{ const a=new Float64Array(NM); for(const j of js){ const base=j*NM; for(let mi=0;mi<NM;mi++) a[mi]+=G.M[s][base+mi]; } return a; });
  const [Mo,Te,Vi,No]=S;
  // Terra-only correction
  let ta=0,tb=0; const sa=new Float64Array(13), sb=new Float64Array(13);
  for(let mi=AQUA;mi<=TERRA_END;mi++){ const m=mi%12+1; ta+=Mo[mi]; tb+=Te[mi]; sa[m]+=Mo[mi]; sb[m]+=Te[mi]; }
  const RTg=tb>0?ta/tb:NaN, rt={}; for(let m=1;m<=12;m++) rt[m]=(sa[m]+30*RTg)/(sb[m]+30);
  const Mc=Float64Array.from(Mo); if(isFinite(RTg)) for(let mi=10;mi<AQUA;mi++) Mc[mi]=Te[mi]*rt[mi%12+1];
  const okM=mi=>mi>=10, okN=mi=>mi>=N20_0;
  const RMo=ratios(Mc,Vi,okM), RNo=ratios(No,Vi,okN);
  const rm=isFinite(RMo.R)?RMo.r:RM, rn=isFinite(RNo.R)?RNo.r:RN;
  const H=new Float64Array(NM).fill(NaN);
  for(let mi=10;mi<NM;mi++){ const m=mi%12+1;
    H[mi]= (mi>=SNPP0&&mi<=SNPP1) ? Vi[mi] : (mi>SNPP1) ? No[mi]*rn[m] : Mc[mi]*rm[m]; }
  // validation MODIS -> SNPP, 2013-2025
  let err=[], ok=true;
  for(let y=2013;y<=2025;y++){ const R2=ratios(Mc,Vi,okM,y); if(!isFinite(R2.R)){ok=false;break;} let o=0,p=0; for(let m=0;m<12;m++){ const mi=(y-2000)*12+m; o+=Vi[mi]; p+=Mc[mi]*R2.r[m+1]; } if(o>0) err.push(Math.abs(p-o)/o); }
  const valErr=ok&&err.length? 100*err.reduce((a,b)=>a+b,0)/err.length : NaN;
  // climatology 2003-2025
  const med={}; for(let m=1;m<=12;m++){ const v=[]; for(let y=2003;y<=2025;y++) v.push(H[(y-2000)*12+m-1]); v.sort((a,b)=>a-b); med[m]=v[11]; }
  const jo={}; for(let y=2001;y<=2026;y++){ let s=0; for(let m=0;m<10;m++) s+=H[(y-2000)*12+m]; jo[y]=s; }
  // Nov 1-14 comparison
  const mt=(y)=>{ const g=s=>{let a=0; for(const j of js) a+=G.MT[s][j*27+(y-2000)]; return a;};
    if(y>=2012&&y<=2025) return g(2); if(y===2026) return g(3)*rn[11]; if(y<2002) return g(1)*(isFinite(RTg)?rt[11]:1)*rm[11]; return g(0)*rm[11]; };
  const hist=[]; for(let y=2003;y<=2025;y++) hist.push(mt(y)); hist.sort((a,b)=>a-b);
  const raw=s=>{let v=0; for(let m=0;m<10;m++) v+=S[s][(2026-2000)*12+m]; return v;};
  return {H,med,jo,valErr,nov:mt(2026),novMed:hist[11],ratio:RMo.R,det:[raw(2),raw(3),raw(0)]};
}

/* ---------------------------------------------------------------- map */
const V={cx:-53,cy:-14,s:12}, K=Math.cos(14*Math.PI/180);
let LAYER="rec", YEAR=2026, MONTH=null, MODE="pan", SEL={id:"br",b:null};
const cv=$("br_map"); let ctx, W=0, Hh=0, DPR=1;
const toX=lon=>W/2+(lon-V.cx)*V.s*K, toY=lat=>Hh/2-(lat-V.cy)*V.s;
const toLon=x=>V.cx+(x-W/2)/(V.s*K), toLat=y=>V.cy-(y-Hh/2)/V.s;
function fit(b){ b=b||[-74,-34,-34.5,5.5]; const sw=W/((b[2]-b[0])*K), sh=Hh/(b[3]-b[1]); V.s=Math.min(sw,sh)*0.92; V.cx=(b[0]+b[2])/2; V.cy=(b[1]+b[3])/2; }
const RAMP_REC=["#fde29c","#f9ab4a","#f17c2c","#db5229","#b93733","#6e1a33"];
const recClass=n=>n>=21?5:n>=17?4:n>=12?3:n>=7?2:n>=3?1:0;
const DIV=["#2b5c9e","#6f98c9","#b7cde6","#d9dee5","#f2b49a","#e0704a","#a8282a"];
const divClass=r=>r<0.33?0:r<0.67?1:r<0.9?2:r<=1.1?3:r<=1.5?4:r<=3?5:6;
const SEQ=["#fde9c8","#fbcf94","#f7ad68","#ee8547","#d9603a","#b33f35","#842a37","#521d33"];
let IMG={};
function hex(h){const n=parseInt(h.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255];}
function buildRec(){
  const {h,w}=G.gr, c=document.createElement("canvas"); c.width=w; c.height=h; const x=c.getContext("2d"), im=x.createImageData(w,h);
  const cols=RAMP_REC.map(hex), land=hex(css("--land"));
  for(let r=0;r<h;r++) for(let q=0;q<w;q++){ const v=G.grid[r*w+q]; if(!v) continue; const o=((h-1-r)*w+q)*4; const col=v?cols[recClass(v)]:land; im.data[o]=col[0];im.data[o+1]=col[1];im.data[o+2]=col[2];im.data[o+3]=255; }
  x.putImageData(im,0,0); IMG.rec=c;
  const c2=document.createElement("canvas"); c2.width=w; c2.height=h; const x2=c2.getContext("2d"), im2=x2.createImageData(w,h);
  for(let r=0;r<h;r++) for(let q=0;q<w;q++){ if(!G.grid[r*w+q]) continue; const o=((h-1-r)*w+q)*4; im2.data[o]=land[0];im2.data[o+1]=land[1];im2.data[o+2]=land[2];im2.data[o+3]=255; }
  x2.putImageData(im2,0,0); IMG.land=c2;
}
let CELLVAL=null, ACTBR=null;
function buildCells(){
  let minX=999,maxX=0,minY=999,maxY=0; for(let j=0;j<G.NC;j++){ minX=Math.min(minX,G.cx[j]); maxX=Math.max(maxX,G.cx[j]); minY=Math.min(minY,G.cy[j]); maxY=Math.max(maxY,G.cy[j]); }
  const w=maxX-minX+1, h=maxY-minY+1, c=document.createElement("canvas"); c.width=w; c.height=h; const x=c.getContext("2d"), im=x.createImageData(w,h);
  CELLVAL=new Float32Array(G.NC).fill(NaN);
  if(LAYER==="anom"){
    for(let j=0;j<G.NC;j++){ const v=G.JO[j*27+(YEAR-2000)], m=G.MED[j]; if(v<3&&m<3) continue; const r=(v+1)/(m+1); CELLVAL[j]=r; const col=hex(DIV[divClass(r)]); const o=((maxY-G.cy[j])*w+(G.cx[j]-minX))*4; im.data.set([...col,255],o); }
  } else {
    const vals=[]; for(let j=0;j<G.NC;j++){ let v; if(MONTH!=null) v=G.HC[j*NM+MONTH]; else v=G.JO[j*27+(YEAR-2000)]; CELLVAL[j]=v; if(v>0) vals.push(v); }
    vals.sort((a,b)=>a-b); const q=p=>vals[Math.min(vals.length-1,Math.floor(p*vals.length))]||1;
    ACTBR=[q(.2),q(.4),q(.55),q(.7),q(.82),q(.91),q(.97)];
    for(let j=0;j<G.NC;j++){ const v=CELLVAL[j]; if(!(v>0)) continue; let k=0; while(k<ACTBR.length&&v>=ACTBR[k]) k++; const col=hex(SEQ[k]); const o=((maxY-G.cy[j])*w+(G.cx[j]-minX))*4; im.data.set([...col,255],o); }
  }
  x.putImageData(im,0,0); IMG.cells={c,minX,maxY,w,h};
}
function resize(){ DPR=Math.min(2,devicePixelRatio||1); W=cv.clientWidth; Hh=cv.clientHeight; cv.width=W*DPR; cv.height=Hh*DPR; ctx=cv.getContext("2d"); draw(); }
function draw(){
  if(!ctx||!G||!IMG.rec) return; ctx.setTransform(DPR,0,0,DPR,0,0); ctx.clearRect(0,0,W,Hh);
  ctx.fillStyle=css("--surface"); ctx.fillRect(0,0,W,Hh);
  ctx.imageSmoothingEnabled=false;
  const gr=G.gr, lon0=-35+0, gx0=-75+gr.x0*0.1, gy1=-35+(gr.y0+gr.h)*0.1;
  const place=(img,lonA,latTop,wDeg,hDeg)=>ctx.drawImage(img,toX(lonA),toY(latTop),wDeg*V.s*K,hDeg*V.s);
  if(LAYER==="rec") place(IMG.rec,gx0,gy1,gr.w*0.1,gr.h*0.1);
  else { place(IMG.land,gx0,gy1,gr.w*0.1,gr.h*0.1); const C=IMG.cells; place(C.c,-75+C.minX*0.5,-35+(C.maxY+1)*0.5,C.w*0.5,C.h*0.5); }
  // places
  ctx.font=`500 12px ${css("--ui")}`; ctx.textBaseline="middle";
  for(const [n,lo,la,big] of PLACES){ if(!big&&V.s<22) continue; const x=toX(lo), y=toY(la); if(x<-50||x>W+50||y<-20||y>Hh+20) continue;
    ctx.fillStyle=css("--ink"); ctx.beginPath(); ctx.arc(x,y,big?3:2.3,0,7); ctx.fill();
    ctx.font=`${big?600:500} ${big?12.5:11.5}px ${css("--ui")}`; ctx.lineWidth=3.5; ctx.strokeStyle=css("--surface"); ctx.strokeText(n,x+6,y); ctx.fillText(n,x+6,y); }
  // selection
  if(SEL.reg){ ctx.strokeStyle=css("--ink"); ctx.lineWidth=2; ctx.beginPath(); const S=SEL.reg, has=(y,x)=>{const j=G.idx.get(y*100+x); return j!=null&&G.reg[j]===S;};
    for(let j=0;j<G.NC;j++){ if(G.reg[j]!==S) continue; const y=G.cy[j], x=G.cx[j], lo=-75+x*0.5, la=-35+y*0.5, X0=toX(lo), X1=toX(lo+0.5), Y0=toY(la+0.5), Y1=toY(la);
      if(!has(y+1,x)){ctx.moveTo(X0,Y0);ctx.lineTo(X1,Y0);} if(!has(y-1,x)){ctx.moveTo(X0,Y1);ctx.lineTo(X1,Y1);} if(!has(y,x-1)){ctx.moveTo(X0,Y0);ctx.lineTo(X0,Y1);} if(!has(y,x+1)){ctx.moveTo(X1,Y0);ctx.lineTo(X1,Y1);} }
    ctx.stroke(); }
  const b=SEL.b; if(b){ ctx.setLineDash([6,4]); ctx.strokeStyle=css("--ink"); ctx.lineWidth=2; ctx.strokeRect(toX(b[0]),toY(b[3]),(b[2]-b[0])*V.s*K,(b[3]-b[1])*V.s); ctx.setLineDash([]); }
  if(DRAG&&DRAG.rect){ const r=DRAG.rect; ctx.fillStyle="rgba(10,79,158,.12)"; ctx.strokeStyle=css("--brand"); ctx.lineWidth=2; ctx.fillRect(r[0],r[1],r[2],r[3]); ctx.strokeRect(r[0],r[1],r[2],r[3]); }
}
function legend(){
  let h="";
  if(LAYER==="rec") h=`<b>${t("legRec")}</b><span class="b-sw">${RAMP_REC.map(c=>`<i style="background:${c}"></i>`).join("")}</span><span>1–2 · 3–6 · 7–11 · 12–16 · 17–20 · 21–23</span>`;
  else if(LAYER==="anom") h=`<b>${t("legAnom",YEAR)}</b><span>${t("below")}</span><span class="b-sw">${DIV.map(c=>`<i style="background:${c}"></i>`).join("")}</span><span>${t("above")}</span><span>(⅓× · ⅔× · 1× · 1,5× · 3×)</span>`;
  else h=`<b>${MONTH!=null?t("legActM",`${t("monL")[MONTH%12]} ${yOf(MONTH)}`):t("legAct",YEAR)}</b><span>${t("few")}</span><span class="b-sw">${SEQ.map(c=>`<i style="background:${c}"></i>`).join("")}</span><span>${t("many")}</span>`;
  $("br_legend").innerHTML=h;
}
function nearPlace(lon,lat){ let best=null,bd=1e9; for(const [n,lo,la] of PLACES){ const dx=(lon-lo)*111.3*Math.cos(lat*Math.PI/180), dy=(lat-la)*111.3, d=Math.hypot(dx,dy); if(d<bd){bd=d;best={n,dx,dy,d};} }
  if(best.d<15) return t("inC",best.n); const a=(Math.atan2(best.dx,best.dy)*180/Math.PI+360)%360; return t("near",Math.round(best.d/10)*10||best.d|0,t("dirs")[Math.round(a/45)%8],best.n); }
const tip=$("br_tip");
function showTip(e,h){ tip.innerHTML=h; tip.style.display="block"; const r=tip.getBoundingClientRect(); let x=e.clientX+14,y=e.clientY+14; if(x+r.width>innerWidth-8) x=e.clientX-r.width-14; if(y+r.height>innerHeight-8) y=e.clientY-r.height-14; tip.style.left=x+"px"; tip.style.top=y+"px"; }
const hideTip=()=>tip.style.display="none";
function hover(e){
  const r=cv.getBoundingClientRect(), lon=toLon(e.clientX-r.left), lat=toLat(e.clientY-r.top);
  if(LAYER==="rec"){ const gy=Math.floor((lat+35)/0.1)-G.gr.y0, gx=Math.floor((lon+75)/0.1)-G.gr.x0; if(gy<0||gx<0||gy>=G.gr.h||gx>=G.gr.w) return hideTip(); const v=G.grid[gy*G.gr.w+gx]; if(!v) return hideTip();
    return showTip(e,`<b>${nearPlace(lon,lat)}</b><br>${t("tipYears",v)}`); }
  const id=Math.floor((lat+35)/0.5)*100+Math.floor((lon+75)/0.5), j=G.idx.get(id); if(j==null||!isFinite(CELLVAL[j])) return hideTip();
  if(LAYER==="anom") showTip(e,`<b>${nearPlace(lon,lat)}</b><br><span class="b-k">${t("tipVal")}:</span> ${fmt(G.JO[j*27+YEAR-2000])}<br><span class="b-k">${t("tipMed")}:</span> ${fmt(G.MED[j])}<br><span class="b-k">${t("tipRatio")}:</span> ${nf(2).format(CELLVAL[j])}×`);
  else showTip(e,`<b>${nearPlace(lon,lat)}</b><br><span class="b-k">${t("tipVal")}:</span> ${fmt(CELLVAL[j])}`);
}
let DRAG=null;
cv.addEventListener("pointerdown",e=>{ cv.setPointerCapture(e.pointerId); const r=cv.getBoundingClientRect(); DRAG={x:e.clientX,y:e.clientY,x0:e.clientX-r.left,y0:e.clientY-r.top,cx:V.cx,cy:V.cy,moved:false}; hideTip(); });
cv.addEventListener("pointermove",e=>{
  if(!DRAG){ if(G) hover(e); return; }
  const dx=e.clientX-DRAG.x, dy=e.clientY-DRAG.y; if(Math.hypot(dx,dy)>4) DRAG.moved=true;
  if(MODE==="pan"){ V.cx=DRAG.cx-dx/(V.s*K); V.cy=DRAG.cy+dy/V.s; draw(); }
  else { const r=cv.getBoundingClientRect(), x1=e.clientX-r.left, y1=e.clientY-r.top; DRAG.rect=[Math.min(DRAG.x0,x1),Math.min(DRAG.y0,y1),Math.abs(x1-DRAG.x0),Math.abs(y1-DRAG.y0)]; draw(); }
});
cv.addEventListener("pointerup",e=>{
  if(!DRAG) return; const D=DRAG; DRAG=null;
  const snap=(v,f)=>f(v/0.5)*0.5;
  if(!D.moved){ const lon=toLon(D.x0), lat=toLat(D.y0); const x=Math.floor(lon/0.5)*0.5, y=Math.floor(lat/0.5)*0.5; select({id:"pt",b:[x-0.5,y-0.5,x+1,y+1]}); return; }
  if(MODE==="draw"&&D.rect){ const r=D.rect; const b=[snap(toLon(r[0]),Math.floor),snap(toLat(r[1]+r[3]),Math.floor),snap(toLon(r[0]+r[2]),Math.ceil),snap(toLat(r[1]),Math.ceil)]; select({id:"draw",b}); }
  draw();
});
cv.addEventListener("pointerleave",hideTip);
cv.addEventListener("wheel",e=>{ e.preventDefault(); const r=cv.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top, lon=toLon(x), lat=toLat(y); V.s=Math.max(6,Math.min(160,V.s*(e.deltaY<0?1.15:1/1.15))); V.cx=lon-(x-W/2)/(V.s*K); V.cy=lat+(y-Hh/2)/V.s; draw(); },{passive:false});
$("br_zin").onclick=()=>{V.s=Math.min(160,V.s*1.3);draw();}; $("br_zout").onclick=()=>{V.s=Math.max(6,V.s/1.3);draw();}; $("br_zfit").onclick=()=>{fit(boundsOf(SEL));draw();};

function boundsOf(sel){ if(sel.b||!sel.reg) return sel.b; let a=[180,90,-180,-90]; for(let j=0;j<G.NC;j++) if(G.reg[j]===sel.reg){ const lon=-75+G.cx[j]*0.5, lat=-35+G.cy[j]*0.5; a=[Math.min(a[0],lon),Math.min(a[1],lat),Math.max(a[2],lon+0.5),Math.max(a[3],lat+0.5)]; } return a; }
/* ---------------------------------------------------------------- side panel */
let LAST=null;
function select(sel){
  SEL=sel; document.querySelectorAll("#br_presets .b-chip").forEach(c=>c.setAttribute("aria-pressed",String(c.dataset.id===sel.id)));
  const js=cellsIn(sel.b,sel.reg); LAST={sel,js,A:js.length?analyse(js):null}; renderSide(); draw();
}
function renderSide(){
  const {sel,js,A}=LAST, P=PRESETS.find(p=>p.id===sel.id);
  const name=sel.id==="co"?t("coName",nf(2).format(sel.la),nf(2).format(sel.lo)):P?P[LANG]:(sel.id==="pt"?nearPlace((sel.b[0]+sel.b[2])/2,(sel.b[1]+sel.b[3])/2):t("selDraw"));
  const km=Math.round(js.reduce((a,j)=>a+55.6*55.6*Math.cos((-35+G.cy[j]*0.5)*Math.PI/180),0)/1000);
  let h=`<h3>${name}</h3><div class="b-sub">${sel.reg?(LANG==="pt"?"Região aproximada · ":"Approximate region · "):sel.b?`${sel.b.map(v=>nf(1).format(v)).join(", ")} · `:""}${t("cells",js.length,fmt(km))}</div>`;
  const tot=A?Object.values(A.jo).reduce((a,b)=>a+b,0):0;
  if(!A||tot<200){ $("br_side").innerHTML=h+`<p>${t("fNone")}</p>`; return; }
  const ys=Object.keys(A.jo).map(Number), worst=ys.reduce((a,b)=>A.jo[b]>A.jo[a]?b:a);
  let pk=1; for(let m=2;m<=12;m++) if(A.med[m]>A.med[pk]) pk=m;
  const rank=ys.filter(y=>A.jo[y]>A.jo[2026]).length+1, base=ys.filter(y=>y>=2003&&y<=2025).map(y=>A.jo[y]).sort((a,b)=>a-b), medJO=base[11];
  h+=`<ul class="b-facts"><li>${t("f26",rank,ys.length,(A.jo[2026]+1)/(medJO+1))}</li><li>${t("fWorst",worst,fmt(A.jo[worst]))}</li><li>${t("fPeak",t("monL")[pk-1])}</li>`;
  h+=`<li>${t("fDet",fmt(A.det[0]),fmt(A.det[1]),fmt(A.det[2]))}</li>`;
  if(isFinite(A.novMed)) h+=`<li>${t("fNov",fmt(A.nov),fmt(A.novMed),(A.nov+1)/(A.novMed+1))}</li>`;
  if(isFinite(A.valErr)) h+=`<li>${t("fVal",nf(1).format(A.valErr))}</li>`;
  h+=`</ul><h4>${t("calT")}</h4><div id="br_cal"></div><h4>${t("barsT")}</h4><div id="br_bars"></div><div class="b-row"><button class="b-btn" id="br_csv">${t("csv")}</button>${sel.id==="mao"?`<a class="b-btn" href="#atlas">${t("openManaus")}</a>`:""}</div>`;
  $("br_side").innerHTML=h; calendar(A); bars(A,rank); $("br_csv").onclick=()=>csv(A,name);
}
function calendar(A){
  const el=$("br_cal"), w=el.clientWidth||320, L=34, cw=(w-L)/12, ch=Math.max(9,Math.min(13,cw*.62)), y0=2001, y1=2026, H=16+(y1-y0+1)*ch+4;
  const vals=[]; for(let mi=12;mi<CUR;mi++) if(A.H[mi]>0) vals.push(A.H[mi]); vals.sort((a,b)=>a-b);
  const vmax=vals[Math.floor(vals.length*.98)]||1, dark=THEME==="dark", ramp=dark?[...SEQ].reverse():SEQ;
  let s=`<svg class="b-calsvg" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}">`;
  t("mon").forEach((m,i)=>s+=`<text x="${L+i*cw+cw/2}" y="11" text-anchor="middle">${m}</text>`);
  for(let y=y0;y<=y1;y++){ const yy=16+(y-y0)*ch; if(y%5===1||y===y1) s+=`<text x="${L-5}" y="${yy+ch*.75}" text-anchor="end">${y}</text>`;
    for(let m=0;m<12;m++){ const mi=(y-2000)*12+m; if(mi>=NM) continue; const v=A.H[mi]; let col=css("--zero");
      if(v>0){ const k=Math.min(7,Math.floor(Math.sqrt(v/vmax)*8)); col=ramp[k]; }
      s+=`<rect class="b-c" data-mi="${mi}" x="${L+m*cw+.5}" y="${yy+.5}" width="${cw-1}" height="${ch-1}" rx="1.5" fill="${col}"${mi<AQUA?' opacity=".55"':""}${mi===CUR?` stroke="${css("--ink")}" stroke-dasharray="2 1.5"`:""}/>`; } }
  el.innerHTML=s+"</svg>";
  el.querySelector("svg").addEventListener("mousemove",e=>{ const mi=e.target.dataset&&e.target.dataset.mi; if(mi==null) return hideTip(); const m=+mi%12;
    showTip(e,`<b>${t("monL")[m]} ${yOf(+mi)}</b><br><span class="b-k">${t("tipVal")}:</span> ${fmt(A.H[+mi])}<br><span class="b-k">${t("tipMed")}:</span> ${fmt(A.med[m+1])}${+mi<AQUA?`<br>${t("tipLow")}`:""}`); });
  el.querySelector("svg").addEventListener("mouseleave",hideTip);
  el.querySelector("svg").addEventListener("click",e=>{ const mi=e.target.dataset&&e.target.dataset.mi; if(mi==null) return; MONTH=+mi; YEAR=yOf(+mi); $("br_year").value=YEAR; setLayer("act"); });
}
function bars(A){
  const el=$("br_bars"), w=el.clientWidth||320, H=110, L=4, ys=Object.keys(A.jo).map(Number), bw=(w-L)/ys.length, mx=Math.max(...ys.map(y=>A.jo[y]))||1;
  let s=`<svg class="b-bars" width="${w}" height="${H+14}">`;
  ys.forEach((y,i)=>{ const v=A.jo[y], h=v/mx*H; s+=`<rect x="${L+i*bw+1}" y="${H-h}" width="${bw-2}" height="${h}" rx="1.5" fill="${y===2026?css("--fire"):css("--line-2")}"><title>${y}: ${fmt(v)}</title></rect>`; if(y%5===1||y===2026) s+=`<text x="${L+i*bw+bw/2}" y="${H+12}" text-anchor="middle">${y}</text>`; });
  el.innerHTML=s+"</svg>";
}
function csv(A,name){
  const rows=["year,month,harmonized_cell_days,typical_median"]; for(let mi=10;mi<NM;mi++) rows.push(`${yOf(mi)},${mi%12+1},${A.H[mi].toFixed(1)},${A.med[mi%12+1].toFixed(1)}`);
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([rows.join("\n")],{type:"text/csv"})); a.download=`amazonia_fire_${name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g,"_")}.csv`; document.body.appendChild(a); a.click(); a.remove();
}

/* ---------------------------------------------------------------- national daily calendar */
function dailyCal(){
  const c=$("br_daily"), w=c.clientWidth, narrow=w<620, L=narrow?30:40, TOP=22, rh=narrow?9:13, gap=2, y0=2001, y1=2026, H=TOP+(y1-y0+1)*(rh+gap)+4;
  c.width=w*DPR; c.height=H*DPR; c.style.height=H+"px"; const x=c.getContext("2d"); x.setTransform(DPR,0,0,DPR,0,0); x.clearRect(0,0,w,H);
  const D0=Date.UTC(2000,0,1), cw=(w-L-6)/366, dark=THEME==="dark", ramp=dark?[...SEQ].reverse():SEQ, br=[300,1000,2500,5000,8000,12000,17000];
  x.font=`11px ${css("--ui")}`; x.textBaseline="middle";
  t("mon").forEach((m,i)=>{ const k=(Date.UTC(2001,i,1)-Date.UTC(2001,0,1))/864e5; x.fillStyle=css("--muted"); x.fillText(m,L+k*cw+2,TOP-11); });
  for(let y=y0;y<=y1;y++){ const top=TOP+(y-y0)*(rh+gap); x.fillStyle=css("--ink-2"); x.textAlign="right"; x.fillText(narrow?String(y).slice(2):y,L-5,top+rh/2); x.textAlign="left";
    const d0=(Date.UTC(y,0,1)-D0)/864e5, n=(Date.UTC(y+1,0,1)-Date.UTC(y,0,1))/864e5;
    for(let k=0;k<n;k++){ const d=d0+k; if(d>HDR.endDay) break; const dt=new Date(D0+d*864e5), mi=(dt.getUTCFullYear()-2000)*12+dt.getUTCMonth(); if(mi<10) continue;
      const v=harmOne(mi,s=>G.daily[s][d],RM,RN,RT); let cc=css("--zero"); if(v>0){ let q=0; while(q<br.length&&v>=br[q]) q++; cc=ramp[q]; }
      x.fillStyle=cc; x.globalAlpha=mi<AQUA?.55:1; x.fillRect(L+k*cw,top,Math.max(1,cw+.3),rh); }
    x.globalAlpha=1; }
  $("br_dailyLegend").innerHTML=`<b>${t("legDaily")}</b><span class="b-sw">${ramp.map(c=>`<i style="background:${c}"></i>`).join("")}</span><span>&lt;300 · 1.000 · 2.500 · 5.000 · 8.000 · 12.000 · 17.000+</span>`.replace(/\./g,LANG==="pt"?".":",");
}

/* ---------------------------------------------------------------- static texts */
function applyStatic(){
  document.querySelectorAll("[data-t]").forEach(el=>{ const v=t(el.dataset.t); if(typeof v==="string") el.textContent=v; });
  $("br_presets").innerHTML=PRESETS.map(p=>`<button class="b-chip" data-id="${p.id}" aria-pressed="${SEL.id===p.id}">${p[LANG]}</button>`).join("");
  document.querySelectorAll("#br_presets .b-chip").forEach(b=>b.onclick=()=>{ const p=PRESETS.find(x=>x.id===b.dataset.id); const s={id:p.id,b:p.b,reg:p.reg}; select(s); fit(boundsOf(s)); draw(); });
  $("br_year").innerHTML=Array.from({length:26},(_,i)=>2026-i).map(y=>`<option${y===YEAR?" selected":""}>${y}</option>`).join("");
  const N=SUM.national, f=s=>{const [d,m]=s.split("-").map(Number); return LANG==="pt"?`${d} de ${t("monL")[m-1]}`:`${d} ${t("monL")[m-1]}`;};
  $("br_natDates").innerHTML=[["dStart",N.start,"d26s"],["dPeak",N.peak,"d26p"],["dEnd",N.end,"d26e"]].map(([l,v,c])=>`<article><div class="b-l">${t(l)}</div><div class="b-v">${f(v)}</div><p>${t(c)}</p></article>`).join("");
  const VT=SUM.valtable; $("br_valTable").innerHTML=`<tr>${t("vH").map(x=>`<th>${x}</th>`).join("")}</tr>`+VT.map(r=>`<tr><td>${r[0]}</td><td>${r[1]==null?"–":nf(2).format(r[1])+"×"}</td><td>${r[2]}</td><td>${r[3]==null?"–":nf(3).format(r[3])}</td><td>${nf(1).format(r[4])}%</td></tr>`).join("");
  $("br_howList").innerHTML=t("howL").map(x=>`<li>${x}</li>`).join(""); $("br_limList").innerHTML=t("limL").map(x=>`<li>${x}</li>`).join("");
}
function setLayer(l){ LAYER=l; if(l!=="act") MONTH=null; document.querySelectorAll("#br_layers button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.l===l))); $("br_year").style.display=l==="rec"?"none":""; if(l!=="rec") buildCells(); legend(); draw(); }
document.querySelectorAll("#br_layers button").forEach(b=>b.onclick=()=>{ MONTH=null; setLayer(b.dataset.l); });
document.querySelectorAll("#br_mode button").forEach(b=>b.onclick=()=>{ MODE=b.dataset.m; cv.classList.toggle("b-draw",MODE==="draw"); document.querySelectorAll("#br_mode button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); });
$("br_year").onchange=e=>{ YEAR=+e.target.value; MONTH=null; if(LAYER==="rec") setLayer("act"); else setLayer(LAYER); };
function rerender(){ applyStatic(); if(!G) return; buildRec(); if(LAYER!=="rec") buildCells(); legend(); draw(); if(LAST) renderSide(); dailyCal(); }
let rz; addEventListener("resize",()=>{clearTimeout(rz); rz=setTimeout(()=>{resize(); if(LAST) renderSide(); if(G) dailyCal();},150);});


$("br_coords").addEventListener("submit",e=>{ e.preventDefault(); if(!G) return;
  const la=parseFloat($("br_lat").value), lo=parseFloat($("br_lon").value), r=parseFloat($("br_rad").value);
  if(!(la>=-34&&la<=6&&lo>=-74&&lo<=-34)){ $("br_coerr").textContent=t("coErr"); return; }
  $("br_coerr").textContent=""; const b=[lo-r,la-r,lo+r,la+r], s={id:"co",b,la,lo}; select(s); const p=Math.max(1.5,r*2); fit([lo-p,la-p,lo+p,la+p]); draw(); });
function boot(){ applyStatic(); load().then(()=>{ $("br_loading").remove(); buildRec(); resize(); fit(); legend(); draw(); select({id:"br",b:null}); dailyCal(); $("br_year").style.display="none"; }).catch(e=>console.error(e)); }
let booted=false; const host=$("br_brasil")||document.getElementById("brasil");
const io=new IntersectionObserver(es=>{ if(!booted&&es.some(e=>e.isIntersecting)){ booted=true; io.disconnect(); boot(); } },{rootMargin:"800px 0px"});
io.observe(document.getElementById("brasil"));
new MutationObserver(()=>{ if(booted) rerender(); }).observe(document.documentElement,{attributes:true,attributeFilter:["lang","data-theme"]});
applyStatic();

})();
