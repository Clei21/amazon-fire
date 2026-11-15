import json, base64
from pathlib import Path
B=Path(__file__).parent; W=B/"work"; OUT=Path(__file__).parent.parent/"app"
S=json.load(open(W/"brazil_summary.json")); Hd=json.load(open(W/"brazil_header.json"))
v,vn,vt=S["val"],S["valN"],S["valT"]
summ={"rm":S["ratios"]["rm"],"rn":S["ratios"]["rn"],"rt":S["ratios"]["rt"],"national":{"start":"27-7","peak":"15-9","end":"2-12"},
 "valtable":[["MODIS → Suomi NPP",S["ratios"]["modis"],f"{v['years'][0]}–{v['years'][-1]}",v["r_annual"],v["mean_annual_error_pct"]],
             ["NOAA-20 → Suomi NPP",S["ratios"]["n20"],f"{vn['years'][0]}–{vn['years'][-1]}",vn["r_annual"],vn["mean_annual_error_pct"]],
             ["Terra → Terra + Aqua",S["ratios"]["terra"],f"{vt['years'][0]}–{vt['years'][-1]}",vt.get("r_annual"),vt["mean_annual_error_pct"]]]}
js=(B/"parts_js.js").read_text().replace("/*__BR_HDR__*/{}",json.dumps(Hd)).replace("/*__BR_SUM__*/{}",json.dumps(summ)).replace("/*__BR_BIN__*/",base64.b64encode((W/"brazil.bin.gz").read_bytes()).decode())
(OUT/"brasil_section.html").write_text("<style>\n"+(B/"parts_css.css").read_text()+"\n</style>\n"+(B/"parts_sec.html").read_text())
(OUT/"brasil_script.js").write_text(js)
print("ok", len(js)/1e6)
