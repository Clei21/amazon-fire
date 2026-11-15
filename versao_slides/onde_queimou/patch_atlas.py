"""Aplica a nova apresentação da seção "Onde queimou" a um index.html já montado.
Só troca a marcação da seção e pontos de apresentação do script; os cálculos não mudam."""
from pathlib import Path

AQUI = Path(__file__).resolve().parent

def _troca(s, a, b, nome):
    n = s.count(a)
    assert n == 1, f"[{nome}] trecho encontrado {n} vezes"
    return s.replace(a, b)

def aplicar(s: str) -> str:
    # 1. marcação da seção
    a = s.index('<section class="sec atlas-section" id="atlas">'); b = s.index('</section>', a) + len('</section>')
    s = s[:a] + (AQUI / "atlas.html").read_text(encoding="utf-8") + s[b:]

    T = [
      # mapa abre em 2D (Concentração)
      ("padrao-2d", 'function bindAtlas(){\n  MAP.layer="3d";', 'function bindAtlas(){\n  MAP.layer="density";'),
      # 2D: quadrados coloridos por anos com fogo + marcadores do ranking
      ("2d-camada", '    if(MAP.layer!=="points"){\n      // Binned screen-space concentrations of actual detections.',
                    '    if(MAP.layer==="density" && typeof atlasCells==="function"){ atlasCells(ctx,sc,ox,oy,w,h); }\n    else if(MAP.layer!=="points"){\n      // Binned screen-space concentrations of actual detections.'),
      ("2d-marcadores", '  // área selecionada\n  const b=S.bbox;', '  if(typeof atlasMarkers==="function") atlasMarkers(ctx);\n  // área selecionada\n  const b=S.bbox;'),
      # 3D: enquadra a área selecionada e centraliza (o ranking saiu de cima do mapa)
      ("3d-centro", 'const lat0=G.s+G.ny*M3_CELL/2, lon0=G.w+G.nx*M3_CELL/2, kx=', 'const FR=m3Frame(G), lat0=FR.lat0, lon0=FR.lon0, kx='),
      ("3d-ext", 'const ext=Math.max(G.nx*M3_CELL*kx, G.ny*M3_CELL*ky);', 'const ext=Math.max(FR.w*kx, FR.h*ky);'),
      ("3d-escala", 'const sc=Math.min(W,H)/ext*(W>900?1.08:1.25)*M3.zoom', 'const sc=Math.min(W,H)/ext*1.12*M3.zoom'),
      ("3d-cx", 'const cx=W>900?W/2+95:W/2, cy=H*0.58;', 'const cx=W/2, cy=H*0.56;'),
      ("3d-fundo", 'g.addColorStop(0, dark?"#06101b":"#dbe5f0"); g.addColorStop(1, dark?"#0e1d2f":"#f5f8fb");',
                   'g.addColorStop(0, dark?"#1a0905":"#efe7e1"); g.addColorStop(1, dark?"#241009":"#faf7f5");'),
      ("3d-plano", 'ctx.fillStyle=dark?"#12253a":"#ffffff"; ctx.fill(); ctx.strokeStyle=dark?"#2a4a6b":"#c4d1df";',
                   'ctx.fillStyle=dark?"#2a0f0a":"#ffffff"; ctx.fill(); ctx.strokeStyle=dark?"#5a3022":"#e0cfc4";'),
      # 3D: marcadores numerados e rótulos de cidade sem colisão (Manaus e cidades do ranking primeiro)
      ("3d-rotulos", '  M3.drawn=drawn;\n  ctx.textBaseline="middle";\n  for(const [nm,lo,la,big] of CIDADES){ if(lo<w||lo>e||la<so||la>n) continue; const p=P(lo,la,0), q=P(lo,la,Hmax*(big?0.55:0.38));',
                     '  M3.drawn=drawn;\n  ctx.textBaseline="middle";\n  const taken=m3DrawMarkers(ctx,P,cnt,mx,Hmax,dark,font);\n  for(const [nm,lo,la,big] of m3CityOrder()){ if(lo<w||lo>e||la<so||la>n) continue; const p=P(lo,la,0), q=P(lo,la,Hmax*(big?0.55:0.38));\n    ctx.font=`${big?600:500} ${big?13.5:11.5}px ${font}`; { const tw=ctx.measureText(nm).width, bx=[q[0]-3,q[1]-10,q[0]+9+tw,q[1]+10]; if(bx[0]<4||bx[2]>W-4||bx[1]<4||bx[3]>H-4||taken.some(r=>bx[0]<r[2]&&bx[2]>r[0]&&bx[1]<r[3]&&bx[3]>r[1])) continue; taken.push(bx); }'),
      # 3D: norte no canto inferior esquerdo
      ("3d-norte-seta", 'ctx.save(); ctx.translate(W-46,H-70);', 'ctx.save(); ctx.translate(30,H-30);'),
      ("3d-norte-N", 'ctx.fillText("N", W-46, H-96);', 'ctx.fillText("N", 30, H-56);'),
      # 3D: painel flutuante sai do mapa; dica só na primeira vez
      ("3d-painel", '$("map3d").hidden=!on; $("m3Card").hidden=!on; $("m3Hint").hidden=!on;', '$("map3d").hidden=!on; $("m3Card").hidden=true; $("m3Hint").hidden=!(on&&atlHintShow());'),
      ("3d-enquadrar", 'else { M3.zoom=1; M3.th=-28*Math.PI/180;', 'else { M3.focus=null; M3.zoom=1; M3.th=-28*Math.PI/180;'),
      # bloco novo antes da inicialização + atlInit()
      ("init", '/* ---------------------------------------------------------------- início */\napplyStatic(); mapInit(); bind(); bindAtlas(); m3Bind();',
               (AQUI / "atlas.js").read_text(encoding="utf-8") + '\n/* ---------------------------------------------------------------- início */\napplyStatic(); mapInit(); bind(); bindAtlas(); m3Bind(); atlInit();'),
    ]
    for nome, a, b in T:
        s = _troca(s, a, b, nome)
    return s
