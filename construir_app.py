#!/usr/bin/env python3
# AI disclosure: developed with the help of an AI assistant (Claude, Anthropic); reviewed and tested by team Amazon Fire Calendar.
"""
Monta o index.html: junta app/site.html + app/motor.js e embute os focos do FIRMS.

  python3 construir_app.py                     # dados de demonstração (sintéticos)
  python3 construir_app.py --modis "dados/*M-C61*.csv" --viirs "dados/*SV-C2*.csv" "dados/*J1V-C2*.csv" \
      --real --rotulo "NASA FIRMS archive + NRT, Central Amazon (W -62, S -5, E -57.5, N -1.5), Nov 2000 to 7 Nov 2026"
"""
import argparse, base64, json, sys
from pathlib import Path
import numpy as np, pandas as pd

aqui = Path(__file__).parent
sys.path.insert(0, str(aqui))
import harmonizar as H  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--modis", nargs="*", default=[str(aqui / "dados_demo/demo_MODIS_fire_archive.csv")])
ap.add_argument("--viirs", nargs="*", default=[str(aqui / "dados_demo/demo_VIIRS_fire_archive.csv")])
ap.add_argument("--real", action="store_true", help="marca os dados como reais (não sintéticos)")
ap.add_argument("--rotulo", default=None, help="descrição curta dos dados mostrada na página")
ap.add_argument("--cobertura", default=None, help="limites da consulta FIRMS como oeste,sul,leste,norte (ex.: -62,-5,-57.5,-1.5)")
ap.add_argument("--saida", default=str(aqui / "index.html"))
a = ap.parse_args()

df = pd.concat([H.ler_firms(a.modis, "MODIS"), H.ler_firms(a.viirs, "VIIRS")], ignore_index=True)
df = H.mascarar_fontes_estaticas(df)
n = len(df)
sensor = (df["sensor"] != "MODIS").astype(int).to_numpy()
sat = np.select([df["satelite"].isin(["TERRA", "T"]), df["satelite"].isin(["AQUA", "A"]), df["sensor"] == "VIIRS",
                 df["sensor"] == "N20", df["sensor"] == "N21"], [0, 1, 2, 3, 4], 6)
dia = ((df["data"] - pd.Timestamp("2000-01-01")).dt.days).astype(int)
# coordenadas com 5 casas decimais (precisão dos arquivos VIIRS), como inteiros de 32 bits
lat = np.rint(df["lat"] * 1e5).astype("<i4"); lon = np.rint(df["lon"] * 1e5).astype("<i4")
assert dia.between(0, 65535).all()
tipo = (df["tipo"].fillna(-1).astype(int) + 1).to_numpy()
flags = (sensor | (sat << 1) | (tipo << 4)).astype(np.uint8)
conf_s = df["conf"].astype("string").fillna("").str.strip().str.lower()
conf_num = pd.to_numeric(conf_s, errors="coerce")
cf = np.where(sensor == 0, conf_num.fillna(255).clip(0, 255),
              conf_s.map({"l": 101, "low": 101, "n": 102, "nominal": 102, "h": 103, "high": 103}).fillna(255)).astype(np.uint8)
frp = np.clip(np.rint(df["frp"].fillna(0) * 10), 0, 65535)
hora = pd.to_numeric(df["hora"], errors="coerce").fillna(0)
buf = (lat.to_numpy().tobytes() + lon.to_numpy().tobytes()
       + b"".join(np.asarray(x).astype("<u2").tobytes() for x in (dia, frp, hora)) + flags.tobytes() + cf.tobytes())
assert len(buf) == 16 * n
rotulo = a.rotulo or ("Synthetic demonstration data · Central Amazon" if not a.real else "NASA FIRMS archive")
meta = {"n": n, "layout": 2, "label": rotulo, "synthetic": not a.real}
if a.cobertura:
    bounds = [float(x) for x in a.cobertura.split(",")]
    if len(bounds) != 4 or not (-180<=bounds[0]<bounds[2]<=180 and -90<=bounds[1]<bounds[3]<=90):
        ap.error("--cobertura: use oeste,sul,leste,norte dentro de latitudes/longitudes válidas")
    meta["coverageBBox"] = bounds
site = (aqui / "app/site.html").read_text()
motor = (aqui / "app/motor.js").read_text()
# imagens de satélite (opcionais): app/imagens/<id>.jpg  ->  IMGS[id] = data URI
imgs = {}
pasta_img = aqui / "app/imagens"
if pasta_img.exists():
    for f in sorted(pasta_img.glob("*.jpg")):
        imgs[f.stem] = "data:image/jpeg;base64," + base64.b64encode(f.read_bytes()).decode()
site = site.replace("/*__IMGS__*/{}", json.dumps(imgs))
import re as _re
def _fonte(m):
    f = aqui / "app/fonts" / (m.group(1) + ".woff")
    return "data:font/woff;base64," + base64.b64encode(f.read_bytes()).decode() if f.exists() else ""
site = _re.sub(r"/\*__FONT:([A-Za-z0-9-]+)__\*/", _fonte, site)
sec_br = aqui / "app/brasil_section.html"; js_br = aqui / "app/brasil_script.js"
if sec_br.exists() and js_br.exists():
    site = site.replace("<!--__BRASIL__-->", sec_br.read_text())
    i = site.rfind("</body>")
    site = site[:i] + "<script>\n" + js_br.read_text() + "\n</script>\n" + site[i:]
html = site.replace("/*__ENGINE__*/", motor).replace("/*__META__*/", json.dumps(meta)).replace("/*__BIN__*/", base64.b64encode(buf).decode())
Path(a.saida).write_text(html)
print(f"{a.saida}: {n} focos embutidos ({'reais' if a.real else 'sintéticos'}), {len(html)/1e6:.2f} MB")
