#!/usr/bin/env python3
"""Gera cópias do site com o tema dos slides, sem alterar os arquivos originais.

  python aplicar_tema.py <pasta_do_projeto> <pasta_de_saida>

Lê <projeto>/index.html e <projeto>/app/site.html e grava as cópias em <saida>/:
  1. acrescenta o bloco <style id="tema-slides"> (tema_slides.css) antes de </head>;
  2. no index.html, troca a seção "E no Brasil inteiro?" (HTML, CSS e script) pela versão
     de brasil_fonte/, montada com os mesmos dados de <projeto>/brazil/work;
  3. no index.html, aplica a nova apresentação de "Onde queimou" (onde_queimou/).
"""
import sys
from pathlib import Path

aqui = Path(__file__).resolve().parent
sys.path.insert(0, str(aqui))
from montar_brasil import montar  # noqa: E402
sys.path.insert(0, str(aqui / "onde_queimou"))
from patch_atlas import aplicar as aplicar_atlas  # noqa: E402

proj, saida = Path(sys.argv[1]), Path(sys.argv[2])

css = (aqui / "tema_slides.css").read_text(encoding="utf-8") + "\n" + (aqui / "onde_queimou" / "atlas.css").read_text(encoding="utf-8")
bloco = '<style id="tema-slides">\n' + css + "\n</style>\n</head>"

# seção Brasil: a versão original (montada das partes do projeto) e a nova (brasil_fonte/)
sec_orig, js_orig = montar(proj, proj / "brazil")
sec_nova, js_nova = montar(proj, aqui / "brasil_fonte")

for rel in ["index.html", "app/site.html"]:
    src = (proj / rel).read_text(encoding="utf-8")
    assert src.count("</head>") == 1, rel
    if rel == "index.html":
        assert src.count(sec_orig) == 1 and src.count(js_orig) == 1, "a seção Brasil do index.html não bate com brazil/parts_*"
        src = src.replace(sec_orig, sec_nova).replace(js_orig, js_nova)
        src = aplicar_atlas(src)  # seção "Onde queimou"
    out = saida / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(src.replace("</head>", bloco), encoding="utf-8")
    print("ok", out)
