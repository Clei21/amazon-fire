#!/usr/bin/env python3
# AI disclosure: developed with the help of an AI assistant (Claude, Anthropic); reviewed and tested by team Amazonia Fire.
"""
Baixa focos do NASA FIRMS pela API "area" para uma caixa e um período,
em blocos de poucos dias, juntando tudo num único CSV.

  python3 baixar_firms.py --chave SUA_MAP_KEY --fonte VIIRS_SNPP_SP \
      --bbox=-61.0,-4.2,-58.5,-2.4 --inicio 2012-01-20 --fim 2025-12-31 \
      --saida dados/viirs_snpp_sp.csv

Fontes úteis: MODIS_SP, MODIS_NRT, VIIRS_SNPP_SP, VIIRS_SNPP_NRT.
  *_SP  = processamento padrão (arquivo histórico, consistente)
  *_NRT = quase tempo real (últimos meses, ainda sem versão SP)

A chave (MAP_KEY) é gratuita: https://firms.modaps.eosdis.nasa.gov/api/map_key/
Limite da API: 5000 transações a cada 10 min, e cada dia pedido conta como
transação. Por isso o script faz pausas. Para séries muito longas, o caminho
mais rápido é a página "Archive Download" do FIRMS, que entrega o histórico
completo da área por e-mail; depois use harmonizar.py nos arquivos recebidos.

Para ver até que data cada fonte está disponível:
  python3 baixar_firms.py --chave SUA_MAP_KEY --disponibilidade
"""
import argparse
import csv
import io
import sys
import time
import urllib.request
from datetime import date, timedelta
from pathlib import Path

BASE = "https://firms.modaps.eosdis.nasa.gov/api"


def pedir(url: str, tentativas=4) -> str:
    for i in range(tentativas):
        try:
            with urllib.request.urlopen(url, timeout=90) as r:
                return r.read().decode("utf-8")
        except Exception as e:  # noqa: BLE001
            espera = 15 * (i + 1)
            print(f"  erro ({e}); nova tentativa em {espera}s", file=sys.stderr)
            time.sleep(espera)
    raise RuntimeError(f"falhou: {url}")


def principal():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chave", required=True, help="MAP_KEY do FIRMS")
    ap.add_argument("--fonte", default="VIIRS_SNPP_SP")
    ap.add_argument("--bbox", help="oeste,sul,leste,norte")
    ap.add_argument("--inicio", help="AAAA-MM-DD")
    ap.add_argument("--fim", help="AAAA-MM-DD")
    ap.add_argument("--dias", type=int, default=5, help="dias por requisição (a API aceita poucos dias por vez)")
    ap.add_argument("--pausa", type=float, default=1.0, help="segundos entre requisições")
    ap.add_argument("--saida", default="firms.csv")
    ap.add_argument("--disponibilidade", action="store_true")
    a = ap.parse_args()

    if a.disponibilidade:
        print(pedir(f"{BASE}/data_availability/csv/{a.chave}/ALL"))
        return
    if not (a.bbox and a.inicio and a.fim):
        ap.error("informe --bbox, --inicio e --fim")

    ini, fim = date.fromisoformat(a.inicio), date.fromisoformat(a.fim)
    saida = Path(a.saida)
    saida.parent.mkdir(parents=True, exist_ok=True)
    cabecalho, n_linhas, n_req = None, 0, 0
    dia_feito = None
    if saida.exists():  # retomar de onde parou
        with saida.open() as f:
            linhas = list(csv.DictReader(f))
        if linhas:
            dia_feito = max(date.fromisoformat(l["acq_date"]) for l in linhas)
            print(f"Retomando: arquivo já tem dados até {dia_feito}")
            ini = max(ini, dia_feito + timedelta(days=1))

    modo = "a" if saida.exists() and dia_feito else "w"
    with saida.open(modo, newline="") as f:
        escritor = None
        d = ini
        while d <= fim:
            n = min(a.dias, (fim - d).days + 1)
            url = f"{BASE}/area/csv/{a.chave}/{a.fonte}/{a.bbox}/{n}/{d.isoformat()}"
            texto = pedir(url)
            n_req += 1
            if texto.lower().startswith(("invalid", "error")):
                sys.exit(f"A API respondeu: {texto.strip()[:200]}")
            leitor = csv.reader(io.StringIO(texto))
            cab = next(leitor, None)
            if cab:
                if escritor is None:
                    escritor = csv.writer(f)
                    if modo == "w":
                        escritor.writerow(cab)
                    cabecalho = cab
                for linha in leitor:
                    if linha:
                        escritor.writerow(linha)
                        n_linhas += 1
            print(f"{d} +{n}d  total {n_linhas} focos", end="\r")
            d += timedelta(days=n)
            time.sleep(a.pausa)
            if n_req % 400 == 0:  # respeitar o limite de 5000 transações/10 min
                print("\n  pausa de 10 min para respeitar o limite da API...")
                time.sleep(600)
    print(f"\nPronto: {n_linhas} focos em {saida} ({n_req} requisições)")


if __name__ == "__main__":
    principal()
