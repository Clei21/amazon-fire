#!/usr/bin/env python3
"""Monta a seção Brasil (HTML + script) a partir de brasil_fonte/ e dos dados em <projeto>/brazil/work.
Mesma lógica de brazil/build_embed.py, mas lendo as partes desta pasta. Devolve (secao_html, script_js)."""
import json, base64
from pathlib import Path

def montar(proj: Path, partes: Path):
    W = proj / "brazil" / "work"
    S = json.load(open(W / "brazil_summary.json")); Hd = json.load(open(W / "brazil_header.json"))
    v, vn, vt = S["val"], S["valN"], S["valT"]
    summ = {"rm": S["ratios"]["rm"], "rn": S["ratios"]["rn"], "rt": S["ratios"]["rt"], "national": {"start": "27-7", "peak": "15-9", "end": "2-12"},
            "valtable": [["MODIS → Suomi NPP", S["ratios"]["modis"], f"{v['years'][0]}–{v['years'][-1]}", v["r_annual"], v["mean_annual_error_pct"]],
                         ["NOAA-20 → Suomi NPP", S["ratios"]["n20"], f"{vn['years'][0]}–{vn['years'][-1]}", vn["r_annual"], vn["mean_annual_error_pct"]],
                         ["Terra → Terra + Aqua", S["ratios"]["terra"], f"{vt['years'][0]}–{vt['years'][-1]}", vt.get("r_annual"), vt["mean_annual_error_pct"]]]}
    js = ((partes / "parts_js.js").read_text(encoding="utf-8").replace("/*__BR_HDR__*/{}", json.dumps(Hd))
          .replace("/*__BR_SUM__*/{}", json.dumps(summ)).replace("/*__BR_BIN__*/", base64.b64encode((W / "brazil.bin.gz").read_bytes()).decode()))
    sec = "<style>\n" + (partes / "parts_css.css").read_text(encoding="utf-8") + "\n</style>\n" + (partes / "parts_sec.html").read_text(encoding="utf-8")
    return sec, js
