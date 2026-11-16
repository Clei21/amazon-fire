#!/usr/bin/env python3
# AI disclosure: developed with the help of an AI assistant (Claude, Anthropic); reviewed and tested by team Amazon Fire.
"""
Amazon - harmonização de focos ativos MODIS + VIIRS (NASA FIRMS)
===========================================================================

Transforma os CSVs de focos do FIRMS (MODIS 1 km e VIIRS 375 m) numa série
mensal única e consistente desde 2001, pronta para o calendário de queimadas.

Método (o "motor de harmonização"):
  1. Filtragem de qualidade
       - MODIS: confiança >= 30 (padrão do FIRMS para "nominal" ou melhor)
       - VIIRS: confiança "n" (nominal) ou "h" (alta); "l" (baixa) é descartada
       - Só focos de vegetação (type = 0) quando a coluna existe; remove fontes
         estáticas/industriais (type 2) e vulcões (type 1)
       - VIIRS: só o Suomi-NPP por padrão (série contínua desde 2012). Somar
         NOAA-20/21 aumentaria a contagem a partir de 2018 e criaria um degrau.
  2. Unidade comum: "células-dia com fogo"
       Cada foco é colocado numa grade regular (0,01 grau, ~1,1 km) e contado
       no máximo uma vez por célula por dia, por sensor. Isso elimina a
       vantagem "bruta" do VIIRS de gerar vários pixels de 375 m para o mesmo
       incêndio, e torna a contagem menos sensível à resolução.
  3. Calibração no período de sobreposição (2012 -> hoje)
       Para cada mês do calendário m, calcula a razão
            R_m = (soma V_m + k * R) / (soma M_m + k)
       onde V e M são células-dia de VIIRS e MODIS nos meses em que os dois
       sensores operam, R é a razão geral e k (padrão 30) "puxa" meses com
       poucos dados para a razão geral (encolhimento / shrinkage).
  4. Série harmonizada (unidade: células-dia equivalentes VIIRS)
            H = V                    quando há VIIRS (2012 -> hoje)
            H = M * R_m              antes do VIIRS (2001 -> 2011)
  5. Validação "deixa-um-ano-fora": para cada ano da sobreposição, a razão é
     recalculada sem esse ano e usada para prever o VIIRS a partir do MODIS.
     Relata correlação (r) e erro percentual médio anual.
  6. Climatologia e anomalias: mediana, percentis 25/75 por mês (anos completos)
     e anomalia de cada mês em relação à mediana.

Uso:
  # 1) gerar dados de demonstração no formato FIRMS (sintéticos!)
  python3 harmonizar.py --demo dados_demo

  # 2) harmonizar arquivos reais baixados do FIRMS (Archive Download)
  python3 harmonizar.py --modis fire_archive_M-C61_*.csv fire_nrt_M-C61_*.csv \
                        --viirs fire_archive_SV-C2_*.csv fire_nrt_SV-C2_*.csv \
                        --bbox=-61.0,-4.2,-58.5,-2.4 --saida resultados --figura

Requisitos: Python 3.9+, pandas, numpy (matplotlib opcional para --figura).
"""
from __future__ import annotations

import argparse
import glob
import json
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------- parâmetros
CELULA_GRAUS = 0.01          # tamanho da célula da grade comum (~1,1 km)
MODIS_CONF_MIN = 30          # confiança mínima MODIS (0-100)
VIIRS_CONF_OK = {"n", "h", "nominal", "high"}
K_ENCOLHIMENTO = 30.0        # peso da razão geral nos meses com poucos dados
MODIS_INICIO = pd.Timestamp("2000-11-01")   # início da série MODIS Terra
VIIRS_INICIO = pd.Timestamp("2012-01-20")   # início da série VIIRS S-NPP
N20_INICIO = pd.Timestamp("2018-04-01")     # início da série VIIRS NOAA-20 no FIRMS
SATELITES_SNPP = {"N", "SNPP", "SUOMI NPP", "SUOMI-NPP", "NPP", ""}
SATELITES_N20 = {"N20", "1", "J1", "NOAA-20", "NOAA20", "NOAA 20"}
SATELITES_N21 = {"N21", "2", "J2", "NOAA-21", "NOAA21", "NOAA 21"}
# Fluxos usados: MODIS, VIIRS (= Suomi NPP, a referência) e N20 (NOAA-20, que
# continua a série depois que o Suomi NPP parou, em 2 de novembro de 2026).
FLUXOS = (("MODIS", MODIS_INICIO), ("VIIRS", VIIRS_INICIO), ("N20", N20_INICIO))
SNPP_FIM = pd.Timestamp("2026-11-01")
# O MODIS Aqua começou em 04/07/2002; antes disso só há o Terra (passagem da manhã),
# que vê bem menos fogo na Amazônia. Meses anteriores a AQUA_MES são corrigidos pela
# razão (Terra + Aqua) / Terra, calibrada enquanto a órbita do Terra era estável.
AQUA_MES = pd.Period("2002-08", "M")
TERRA_CAL_FIM = pd.Period("2019-12", "M")       # último dia completo do Suomi NPP (parou em 02/11/2026, 13h UTC)

MESES = ["jan", "fev", "mar", "abr", "mai", "jun",
         "jul", "ago", "set", "out", "nov", "dez"]


# ------------------------------------------------------------- leitura FIRMS
def ler_firms(caminhos: list[str], sensor_esperado: str | None = None) -> pd.DataFrame:
    """Lê um ou mais CSVs do FIRMS e devolve um DataFrame normalizado."""
    arquivos: list[str] = []
    for c in caminhos:
        achados = sorted(glob.glob(c))
        arquivos.extend(achados if achados else [c])
    partes = []
    for arq in arquivos:
        df = pd.read_csv(arq, low_memory=False)
        df.columns = [c.strip().lower() for c in df.columns]
        partes.append(normalizar(df, sensor_esperado, origem=Path(arq).name))
    if not partes:
        return pd.DataFrame(columns=["sensor", "satelite", "lat", "lon", "data",
                                     "hora", "conf", "conf_ok", "tipo", "frp", "origem"])
    return pd.concat(partes, ignore_index=True)


SAT_VIIRS = {"N", "SNPP", "NPP", "N20", "N21", "J1", "J2", "1", "2", "NOAA-20", "NOAA-21"}
SAT_MODIS = {"T", "A", "TERRA", "AQUA"}


def detectar_sensor(df: pd.DataFrame) -> str:
    # Atenção: nos arquivos do Suomi NPP o FIRMS escreve "SNPP" em instrument e
    # usa as colunas brightness/bright_t31 (como o MODIS); por isso o satélite vem primeiro.
    for col in ("satellite", "instrument"):
        if col in df.columns and df[col].notna().any():
            v = str(df[col].dropna().iloc[0]).strip().upper()
            if "VIIRS" in v or v in SAT_VIIRS:
                return "VIIRS"
            if "MODIS" in v or v in SAT_MODIS:
                return "MODIS"
    if "bright_ti4" in df.columns:
        return "VIIRS"
    if "brightness" in df.columns:
        return "MODIS"
    raise ValueError("Não consegui identificar se o arquivo é MODIS ou VIIRS.")


def normalizar(df: pd.DataFrame, sensor_esperado: str | None, origem: str) -> pd.DataFrame:
    sensor = detectar_sensor(df)
    if sensor_esperado and sensor != sensor_esperado:
        print(f"  aviso: {origem} parece ser {sensor}, não {sensor_esperado}", file=sys.stderr)
    conf_bruta = df.get("confidence", pd.Series([np.nan] * len(df)))
    if sensor == "MODIS":
        conf = pd.to_numeric(conf_bruta, errors="coerce")
        conf_ok = conf >= MODIS_CONF_MIN
        conf = conf.astype("string")
    else:
        conf = conf_bruta.astype("string").str.strip().str.lower()
        conf_ok = conf.isin(VIIRS_CONF_OK)
    tipo = pd.to_numeric(df["type"], errors="coerce") if "type" in df.columns else pd.Series(np.nan, index=df.index)
    sat = df.get("satellite", pd.Series([""] * len(df))).astype("string").fillna("").str.strip().str.upper()
    if sensor == "VIIRS":
        fluxo = np.where(sat.isin(SATELITES_N20), "N20", np.where(sat.isin(SATELITES_N21), "N21",
                         np.where(sat.isin(SATELITES_SNPP), "VIIRS", "OUTRO")))
    else:
        fluxo = "MODIS"
    return pd.DataFrame({
        "sensor": fluxo,
        "satelite": sat,
        "lat": pd.to_numeric(df["latitude"], errors="coerce"),
        "lon": pd.to_numeric(df["longitude"], errors="coerce"),
        "data": pd.to_datetime(df["acq_date"], errors="coerce"),
        "hora": df.get("acq_time", pd.Series([np.nan] * len(df))),
        "conf": conf,
        "conf_ok": conf_ok.fillna(False).astype(bool),
        "tipo": tipo,
        "frp": pd.to_numeric(df.get("frp", np.nan), errors="coerce"),
        "origem": origem,
    }).dropna(subset=["lat", "lon", "data"])


# ------------------------------------------------------ fontes de calor fixas
def mascarar_fontes_estaticas(df: pd.DataFrame, celula=CELULA_GRAUS, minimo=3) -> pd.DataFrame:
    """Os arquivos NRT (meses recentes) não trazem a coluna type. Células da grade
    com pelo menos `minimo` detecções marcadas como fonte não vegetal (type 1, 2 ou 3)
    no histórico, e suas 8 vizinhas, viram "fonte fixa"; focos sem type nessas
    células recebem type 2 e saem do cálculo."""
    ci = np.floor(df["lat"] / celula).astype(int)
    cj = np.floor(df["lon"] / celula).astype(int)
    fixa = df["tipo"].isin([1, 2, 3])
    cont = pd.Series(1, index=df.index[fixa]).groupby([ci[fixa], cj[fixa]]).sum()
    base = [k for k, v in cont.items() if v >= minimo]
    celulas = {(a + da, b + db) for a, b in base for da in (-1, 0, 1) for db in (-1, 0, 1)}
    sem_tipo = df["tipo"].isna()
    alvo = sem_tipo & pd.Series([(a, b) in celulas for a, b in zip(ci, cj)], index=df.index)
    df = df.copy()
    df.loc[alvo, "tipo"] = 2
    if alvo.any():
        print(f"  {int(alvo.sum())} focos sem 'type' em {len(base)} fontes fixas conhecidas foram removidos")
    return df


# ---------------------------------------------------------------- filtragem
def filtrar(df: pd.DataFrame, bbox=None) -> pd.DataFrame:
    m = df["conf_ok"]
    m &= df["tipo"].isna() | (df["tipo"] == 0)
    m &= df["sensor"].isin(["MODIS", "VIIRS", "N20"])
    if bbox is not None:
        w, s, e, n = bbox
        m &= df["lon"].between(w, e) & df["lat"].between(s, n)
    return df[m].copy()


# ------------------------------------------------------- unidade: célula-dia
def celulas_dia(df: pd.DataFrame, celula=CELULA_GRAUS) -> pd.DataFrame:
    """Uma linha por (sensor, célula, dia) com fogo. Inclui um fluxo extra "TERRA"
    (só os focos do MODIS Terra), usado para corrigir o período antes do Aqua."""
    terra = df[(df["sensor"] == "MODIS") & (df["satelite"].isin(["TERRA", "T"]))].assign(sensor="TERRA")
    df = pd.concat([df, terra], ignore_index=True)
    out = df.assign(
        ci=np.floor(df["lat"] / celula).astype(int),
        cj=np.floor(df["lon"] / celula).astype(int),
    )
    return out.groupby(["sensor", "ci", "cj", "data"], as_index=False).agg(
        focos=("lat", "size"), frp=("frp", "sum"))


def cobertura(df_bruto: pd.DataFrame) -> dict:
    """Período (mensal) coberto por cada fluxo, a partir das datas dos arquivos.
    Mês de início parcial (ex.: VIIRS em 20/01/2012) não entra. Um sensor que
    parou antes do fim dos dados (Suomi NPP em 02/11/2026) termina no último
    mês completo; um sensor ainda em operação vai até o mês do último dado."""
    fim_geral = df_bruto["data"].max()
    cob = {}
    for sensor, inicio in FLUXOS:
        d = df_bruto.loc[df_bruto["sensor"] == sensor, "data"]
        if d.empty:
            cob[sensor] = None
            continue
        ini = max(inicio, d.min())
        ini_mes = ini.to_period("M") if ini.day == 1 else ini.to_period("M") + 1
        fim = d.max()
        if fim >= fim_geral - pd.Timedelta(days=3) or fim.is_month_end:
            fim_mes = fim.to_period("M")
        else:
            fim_mes = fim.to_period("M") - 1
        cob[sensor] = (ini_mes, fim_mes, fim) if fim_mes >= ini_mes else None
    return cob


# ----------------------------------------------------------------- calibração
def tabela_mensal(cd: pd.DataFrame, pontos: pd.DataFrame, cob: dict) -> pd.DataFrame:
    meses = []
    for s, _ in FLUXOS:
        if cob.get(s):
            meses += [cob[s][0], cob[s][1]]
    todos = pd.period_range(min(meses), max(meses), freq="M")
    tab = pd.DataFrame(index=todos)
    sub = cd[cd["sensor"] == "TERRA"]
    tab["terra_celdias"] = sub.groupby(sub["data"].dt.to_period("M")).size().reindex(todos, fill_value=0)
    for s, _ in FLUXOS:
        sub = cd[cd["sensor"] == s]
        tab[f"{s.lower()}_celdias"] = sub.groupby(sub["data"].dt.to_period("M")).size().reindex(todos, fill_value=0)
        p = pontos[pontos["sensor"] == s]
        g = p.groupby(p["data"].dt.to_period("M"))
        tab[f"{s.lower()}_focos"] = g.size().reindex(todos, fill_value=0)
        tab[f"{s.lower()}_frp_mw"] = g["frp"].sum().reindex(todos, fill_value=0.0).round(1)
        c = cob.get(s)
        tab[f"{s.lower()}_cobre"] = [(c is not None and c[0] <= per <= c[1]) for per in todos]
    tab["ano"] = tab.index.year
    tab["mes"] = tab.index.month
    return tab


def razoes(tab: pd.DataFrame, excluir_ano=None, k=K_ENCOLHIMENTO, r_padrao=None, origem="modis"):
    """Razão VIIRS (Suomi NPP) / origem, por mês do ano, no período em que os
    dois fluxos observam juntos. origem = "modis" ou "n20"."""
    col = f"{origem}_celdias"
    if f"{origem}_cobre" not in tab:
        return float("nan"), {m: float("nan") for m in range(1, 13)}, tab.iloc[0:0]
    sob = tab[tab[f"{origem}_cobre"] & tab["viirs_cobre"]]
    if excluir_ano is not None:
        sob = sob[sob["ano"] != excluir_ano]
    sv, sm = sob["viirs_celdias"].sum(), sob[col].sum()
    r_geral = sv / sm if sm > 0 else (r_padrao or float("nan"))
    rm = {}
    for m in range(1, 13):
        s = sob[sob["mes"] == m]
        rm[m] = (s["viirs_celdias"].sum() + k * r_geral) / (s[col].sum() + k)
    return r_geral, rm, sob


def razoes_terra(tab: pd.DataFrame, excluir_ano=None, k=K_ENCOLHIMENTO):
    """Razão (Terra + Aqua) / Terra por mês do ano, de AQUA_MES a TERRA_CAL_FIM."""
    sob = tab[tab["modis_cobre"] & (tab.index >= AQUA_MES) & (tab.index <= TERRA_CAL_FIM)]
    if excluir_ano is not None:
        sob = sob[sob["ano"] != excluir_ano]
    sa, st = sob["modis_celdias"].sum(), sob["terra_celdias"].sum()
    rg = sa / st if st > 0 else float("nan")
    rt = {m: (sob.loc[sob["mes"] == m, "modis_celdias"].sum() + k * rg) /
             (sob.loc[sob["mes"] == m, "terra_celdias"].sum() + k) for m in range(1, 13)}
    return rg, rt


def corrigir_terra(tab: pd.DataFrame, rt: dict) -> pd.DataFrame:
    """Antes do Aqua, leva as células-dia do Terra à escala Terra + Aqua."""
    tab = tab.copy()
    tab["modis_bruto_celdias"] = tab["modis_celdias"]
    tab["modis_celdias"] = tab["modis_celdias"].astype(float)
    antes = tab.index < AQUA_MES
    tab.loc[antes, "modis_celdias"] = (tab.loc[antes, "terra_celdias"] * tab.loc[antes, "mes"].map(rt)).round(2)
    tab["razao_terra"] = np.where(antes, tab["mes"].map(rt).round(4), np.nan)
    return tab


def validar_terra(tab: pd.DataFrame, k=K_ENCOLHIMENTO) -> dict:
    sob = tab[tab["modis_cobre"] & (tab.index >= AQUA_MES) & (tab.index <= TERRA_CAL_FIM)]
    anos = [a for a, g in sob.groupby("ano") if len(g) == 12]
    obs, prev = [], []
    for a in anos:
        _, rt = razoes_terra(tab, excluir_ano=a, k=k)
        g = sob[sob["ano"] == a]
        obs.append(g["modis_celdias"].sum()); prev.append((g["terra_celdias"] * g["mes"].map(rt)).sum())
    if len(anos) < 3:
        return {"anos": anos, "aviso": "poucos anos"}
    obs, prev = np.array(obs, float), np.array(prev, float)
    return {"anos": anos, "r_anual": round(float(np.corrcoef(obs, prev)[0, 1]), 3),
            "erro_medio_anual_pct": round(float(np.mean(np.abs(prev - obs) / obs) * 100), 1)}


def harmonizar(tab: pd.DataFrame, rm: dict, rn: dict | None = None) -> pd.DataFrame:
    """VIIRS Suomi NPP quando existe; depois, NOAA-20 x razão; antes, MODIS x razão."""
    tab = tab.copy()
    tab["razao_mes"] = tab["mes"].map(rm).round(4)
    n20_ok = tab["n20_cobre"] if "n20_cobre" in tab else pd.Series(False, index=tab.index)
    tab["razao_n20"] = tab["mes"].map(rn).round(4) if rn else np.nan
    h = np.where(tab["viirs_cobre"], tab["viirs_celdias"],
                 np.where(n20_ok, tab.get("n20_celdias", 0) * tab["razao_n20"],
                          np.where(tab["modis_cobre"], tab["modis_celdias"] * tab["razao_mes"], np.nan)))
    tab["harmonizado"] = np.round(h, 1)
    tab["confianca"] = np.where(tab.index < AQUA_MES, "baixa (so Terra)", "normal")
    tab["fonte"] = np.where(tab["viirs_cobre"], "VIIRS S-NPP",
                            np.where(n20_ok, "NOAA-20 x razao",
                                     np.where(tab["modis_cobre"], "MODIS x razao", "")))
    return tab


def validar(tab: pd.DataFrame, k=K_ENCOLHIMENTO, origem="modis") -> dict:
    """Validação deixa-um-ano-fora no período de sobreposição (anos completos)."""
    if f"{origem}_cobre" not in tab:
        return {"anos": [], "aviso": "fluxo ausente"}
    sob = tab[tab[f"{origem}_cobre"] & tab["viirs_cobre"]]
    anos = [a for a, g in sob.groupby("ano") if len(g) == 12]
    obs_a, prev_a, obs_m, prev_m = [], [], [], []
    for a in anos:
        _, rm, _ = razoes(tab, excluir_ano=a, k=k, origem=origem)
        g = sob[sob["ano"] == a]
        p = g[f"{origem}_celdias"] * g["mes"].map(rm)
        obs_a.append(g["viirs_celdias"].sum()); prev_a.append(p.sum())
        obs_m += list(g["viirs_celdias"]); prev_m += list(p)
    if len(anos) < 3:
        return {"anos": anos, "aviso": "poucos anos de sobreposição para validar"}
    obs_a, prev_a = np.array(obs_a, float), np.array(prev_a, float)
    ok = obs_a > 0
    return {
        "anos": anos,
        "r_anual": round(float(np.corrcoef(obs_a, prev_a)[0, 1]), 3),
        "r_mensal": round(float(np.corrcoef(obs_m, prev_m)[0, 1]), 3),
        "erro_medio_anual_pct": round(float(np.mean(np.abs(prev_a[ok] - obs_a[ok]) / obs_a[ok]) * 100), 1),
        "por_ano": [{"ano": int(a), "viirs_obs": int(o), "previsto_modis": round(float(p), 1)}
                    for a, o, p in zip(anos, obs_a, prev_a)],
    }


# -------------------------------------------------------- climatologia/anomalia
def climatologia(tab: pd.DataFrame):
    cobre = tab["modis_cobre"] | tab["viirs_cobre"] | (tab["n20_cobre"] if "n20_cobre" in tab else False)
    fim_dados = max(tab.index[cobre])
    # anos-base: completos e sem meses "só Terra" (a partir de 2003)
    completos = [a for a, g in tab[cobre].groupby("ano")
                 if len(g) == 12 and pd.Period(f"{a}-12", "M") < fim_dados and pd.Period(f"{a}-01", "M") >= AQUA_MES]
    base = tab[tab["ano"].isin(completos)]
    clim = base.groupby("mes")["harmonizado"].agg(
        mediana="median", p25=lambda x: x.quantile(.25), p75=lambda x: x.quantile(.75))
    tab = tab.copy()
    med = tab["mes"].map(clim["mediana"])
    tab["mediana_hist"] = med.round(1)
    tab["anomalia"] = (tab["harmonizado"] - med).round(1)
    tab["razao_mediana"] = ((tab["harmonizado"] + 1) / (med + 1)).round(3)
    return tab, clim.round(1), completos


# --------------------------------------------------------------- comparação
def mes_atual_vs_historico(cd: pd.DataFrame, cob: dict, rm: dict, anos_base: list[int], rn: dict | None = None, rt: dict | None = None):
    """Compara o mês mais recente (parcial) com a mediana do MESMO período
    (dia 1 até o último dia com dados) dos anos anteriores."""
    fim = max(c[2] for c in cob.values() if c)
    dia = fim.day
    mes, ano = fim.month, fim.year

    def total(a):
        ini, ate = pd.Timestamp(a, mes, 1), pd.Timestamp(a, mes, dia)
        sel = cd[(cd["data"] >= ini) & (cd["data"] <= ate)]
        per = pd.Period(f"{a}-{mes:02d}", "M")
        cobre = lambda s: cob.get(s) and cob[s][0] <= per <= cob[s][1]
        if cobre("VIIRS"):
            return float((sel["sensor"] == "VIIRS").sum())
        if cobre("N20") and rn:
            return float((sel["sensor"] == "N20").sum()) * rn[mes]
        if rt and per < AQUA_MES:
            return float((sel["sensor"] == "TERRA").sum()) * rt[mes] * rm[mes]
        return float((sel["sensor"] == "MODIS").sum()) * rm[mes]

    hist = [total(a) for a in anos_base if a < ano]
    atual = total(ano)
    med = float(np.median(hist)) if hist else float("nan")
    return {"ano": ano, "mes": mes, "ate_dia": dia, "atual": round(atual, 1),
            "mediana_mesmo_periodo": round(med, 1),
            "razao": round((atual + 1) / (med + 1), 2) if hist else None}


# ------------------------------------------------------------------ figura
def figura_calendario(tab: pd.DataFrame, caminho: Path, titulo: str):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.colors import LinearSegmentedColormap

    piv = tab.pivot_table(index="ano", columns="mes", values="harmonizado")
    rampa = LinearSegmentedColormap.from_list(
        "fogo", ["#fdf3ec", "#f8c9a8", "#f09a67", "#e0662f", "#b8441a", "#7f2a0c", "#4a1806"])
    fig, ax = plt.subplots(figsize=(8, 9), dpi=160)
    vmax = np.nanpercentile(piv.values, 98)
    im = ax.imshow(piv.values, aspect="auto", cmap=rampa, vmin=0, vmax=vmax)
    ax.set_xticks(range(12), MESES)
    ax.set_yticks(range(len(piv.index)), piv.index)
    ax.tick_params(length=0, labelsize=8, colors="#52514e")
    for s in ax.spines.values():
        s.set_visible(False)
    ax.set_xticks(np.arange(-.5, 12, 1), minor=True)
    ax.set_yticks(np.arange(-.5, len(piv.index), 1), minor=True)
    ax.grid(which="minor", color="white", linewidth=2)
    ax.tick_params(which="minor", length=0)
    cb = fig.colorbar(im, ax=ax, fraction=.04, pad=.02)
    cb.set_label("células-dia com fogo (equivalente VIIRS)", color="#52514e", fontsize=8)
    cb.outline.set_visible(False)
    ax.set_title(titulo, loc="left", fontsize=11, color="#0b0b0b")
    fig.tight_layout()
    fig.savefig(caminho)
    plt.close(fig)


# ------------------------------------------------------------ dados de demo
def gerar_demo(pasta: Path, semente=2026, fim="2026-11-13"):
    """Gera CSVs SINTÉTICOS no formato FIRMS para a região de Manaus.
    Servem apenas para testar o fluxo: NÃO são observações reais."""
    rng = np.random.default_rng(semente)
    pasta.mkdir(parents=True, exist_ok=True)
    fim = pd.Timestamp(fim)
    caixa = (-62.0, -5.0, -57.5, -1.5)
    nucleos = [  # (lon, lat, peso, espalhamento em graus) - aproximados
        (-59.13, -3.58, .17, .22), (-60.37, -3.80, .12, .20), (-60.70, -4.40, .10, .30),
        (-60.40, -3.25, .10, .15), (-58.45, -3.12, .11, .22), (-60.47, -3.45, .07, .12),
        (-59.70, -2.70, .09, .20), (-58.70, -2.75, .07, .18), (-59.10, -3.90, .07, .15),
        (None, None, .10, None)]
    pesos = np.array([n[2] for n in nucleos]); pesos /= pesos.sum()
    sazon = np.array([.02, .01, .01, .01, .02, .03, .07, .17, .25, .24, .12, .05])
    fator_ano = {2001: .9, 2002: 1.1, 2003: 1.0, 2004: 1.1, 2005: 1.8, 2006: .9, 2007: 1.2,
                 2008: .7, 2009: .75, 2010: 1.7, 2011: .8, 2012: 1.0, 2013: .7, 2014: .8,
                 2015: 1.7, 2016: 1.2, 2017: 1.0, 2018: .9, 2019: 1.1, 2020: 1.2, 2021: 1.0,
                 2022: 1.3, 2023: 2.7, 2024: 2.2, 2025: 1.0, 2026: 1.6}
    secas_tardias = {2005, 2010, 2015, 2023, 2024}
    base_anual = 800
    modis, viirs = [], []

    def ponto(lon, lat, d, frp, sensor, conf, tipo, sat):
        hora = int(rng.choice([1340, 1730, 1755, 1820, 210, 545])) if sensor == "MODIS" else int(rng.choice([1715, 1800, 1845, 530, 610]))
        linha = {"latitude": round(lat, 4), "longitude": round(lon, 4), "acq_date": d.strftime("%Y-%m-%d"),
                 "acq_time": hora, "satellite": sat, "instrument": sensor, "confidence": conf,
                 "frp": round(frp, 2), "daynight": "D" if hora > 1200 else "N", "type": tipo}
        if sensor == "MODIS":
            linha.update(brightness=round(310 + frp * .8 + rng.normal(0, 4), 1), scan=1.0, track=1.0,
                         version="6.1", bright_t31=round(298 + rng.normal(0, 2), 1))
            modis.append(linha)
        else:
            linha.update(bright_ti4=round(320 + frp * 1.5 + rng.normal(0, 5), 1), scan=0.39, track=0.36,
                         version="2", bright_ti5=round(295 + rng.normal(0, 2), 1))
            viirs.append(linha)

    def conf_modis():
        return int(np.clip(rng.beta(4, 1.8) * 100, 0, 100))

    def conf_viirs():
        return rng.choice(["n", "h", "l"], p=[.80, .12, .08])

    for ano in range(2001, fim.year + 1):
        sz = sazon.copy()
        if ano in secas_tardias:   # secas extremas estendem a estação para out-nov
            sz = sz * np.array([1, 1, 1, 1, 1, 1, .9, .85, 1.0, 1.25, 1.6, 1.4])
        sz /= sz.sum()
        for mes in range(1, 13):
            ini = pd.Timestamp(ano, mes, 1)
            if ini > fim:
                break
            dias_mes = ini.days_in_month
            lam = base_anual * fator_ano[ano] * sz[mes - 1] * rng.lognormal(0, .25)
            for _ in range(rng.poisson(lam)):
                k = rng.choice(len(nucleos), p=pesos)
                lon0, lat0, _, esp = nucleos[k]
                if lon0 is None:
                    lon, lat = rng.uniform(caixa[0], caixa[2]), rng.uniform(caixa[1], caixa[3])
                else:
                    lon = float(np.clip(rng.normal(lon0, esp), caixa[0], caixa[2]))
                    lat = float(np.clip(rng.normal(lat0, esp), caixa[1], caixa[3]))
                # tamanho do incêndio: maior no pico da estação e em anos secos
                tam = rng.lognormal(np.log(.6) + .5 * (sz[mes - 1] > .1) + .25 * (fator_ano[ano] > 1.5), .6)
                p_modis = min(.85, .10 + .30 * tam)
                p_viirs = min(.97, .55 + .25 * tam)
                dur = int(min(6, 1 + rng.geometric(.55) - 1))
                d0 = ini + pd.Timedelta(days=int(rng.integers(0, dias_mes)))
                for dd in range(dur):
                    d = d0 + pd.Timedelta(days=dd)
                    if d > fim:
                        break
                    if rng.random() < p_modis:
                        for _ in range(1 + (rng.random() < .15 * tam)):
                            ponto(lon + rng.normal(0, .004), lat + rng.normal(0, .004), d,
                                  rng.lognormal(np.log(18 * (.6 + tam)), .8), "MODIS",
                                  conf_modis(), 0, rng.choice(["Terra", "Aqua"]))
                    # Suomi NPP: de 20/01/2012 até parar, em 02/11/2026
                    if VIIRS_INICIO <= d <= SNPP_FIM and rng.random() < p_viirs:
                        for _ in range(1 + rng.poisson(1.0 + 1.2 * tam)):
                            ponto(lon + rng.normal(0, .0025), lat + rng.normal(0, .0025), d,
                                  rng.lognormal(np.log(5 * (.6 + tam)), .8), "VIIRS",
                                  conf_viirs(), 0, "N")
                    # NOAA-20: mesmo sensor, passagem ~25 min depois; continua após o fim do Suomi NPP
                    if d >= N20_INICIO and rng.random() < p_viirs * .93:
                        for _ in range(1 + rng.poisson(0.9 + 1.2 * tam)):
                            ponto(lon + rng.normal(0, .0025), lat + rng.normal(0, .0025), d,
                                  rng.lognormal(np.log(5 * (.6 + tam)), .8), "VIIRS", conf_viirs(), 0, "N20")
        # fonte estática (indústria) - type 2, deve ser filtrada
    for d in pd.date_range("2001-01-01", fim, freq="9D"):
        ponto(-59.948 + rng.normal(0, .001), -3.141 + rng.normal(0, .001), d, rng.lognormal(3, .5),
              "MODIS", conf_modis(), 2, "Aqua")
        if VIIRS_INICIO <= d <= SNPP_FIM:
            ponto(-59.948 + rng.normal(0, .0005), -3.141 + rng.normal(0, .0005), d, rng.lognormal(2.2, .5),
                  "VIIRS", conf_viirs(), 2, "N")
        if d >= N20_INICIO:
            ponto(-59.948 + rng.normal(0, .0005), -3.141 + rng.normal(0, .0005), d, rng.lognormal(2.2, .5),
                  "VIIRS", conf_viirs(), 2, "N20")

    cols_m = ["latitude", "longitude", "brightness", "scan", "track", "acq_date", "acq_time", "satellite",
              "instrument", "confidence", "version", "bright_t31", "frp", "daynight", "type"]
    cols_v = ["latitude", "longitude", "bright_ti4", "scan", "track", "acq_date", "acq_time", "satellite",
              "instrument", "confidence", "version", "bright_ti5", "frp", "daynight", "type"]
    pm = pasta / "demo_MODIS_fire_archive.csv"
    pv = pasta / "demo_VIIRS_fire_archive.csv"
    pd.DataFrame(modis)[cols_m].sort_values("acq_date").to_csv(pm, index=False)
    pd.DataFrame(viirs)[cols_v].sort_values("acq_date").to_csv(pv, index=False)
    print(f"Dados SINTÉTICOS gerados: {pm} ({len(modis)} focos) e {pv} ({len(viirs)} focos)")
    return pm, pv


# ---------------------------------------------------------------------- CLI
def principal(argv=None):
    ap = argparse.ArgumentParser(description="Harmoniza focos MODIS + VIIRS do NASA FIRMS.")
    ap.add_argument("--modis", nargs="*", default=[], help="CSV(s) MODIS do FIRMS (aceita curinga *)")
    ap.add_argument("--viirs", nargs="*", default=[], help="CSV(s) VIIRS do FIRMS (aceita curinga *)")
    ap.add_argument("--bbox", help="oeste,sul,leste,norte em graus decimais (ex.: -61,-4.2,-58.5,-2.4)")
    ap.add_argument("--celula", type=float, default=CELULA_GRAUS, help="tamanho da célula em graus (padrão 0.01)")
    ap.add_argument("--k", type=float, default=K_ENCOLHIMENTO, help="peso do encolhimento das razões mensais")
    ap.add_argument("--saida", default="resultados", help="pasta de saída")
    ap.add_argument("--figura", action="store_true", help="salvar calendario.png (requer matplotlib)")
    ap.add_argument("--demo", metavar="PASTA", help="gerar dados SINTÉTICOS de demonstração e harmonizá-los")
    a = ap.parse_args(argv)

    if a.demo:
        pm, pv = gerar_demo(Path(a.demo))
        a.modis, a.viirs = [str(pm)], [str(pv)]
    if not a.modis and not a.viirs:
        ap.error("informe --modis e/ou --viirs (ou use --demo)")

    bbox = tuple(float(x) for x in a.bbox.split(",")) if a.bbox else None
    saida = Path(a.saida); saida.mkdir(parents=True, exist_ok=True)

    bruto = pd.concat([ler_firms(a.modis, "MODIS"), ler_firms(a.viirs, "VIIRS")], ignore_index=True)
    print(f"Lidos {len(bruto):,} focos ({(bruto.sensor == 'MODIS').sum():,} MODIS, "
          f"{(bruto.sensor == 'VIIRS').sum():,} VIIRS Suomi NPP, {(bruto.sensor == 'N20').sum():,} VIIRS NOAA-20)")
    bruto = mascarar_fontes_estaticas(bruto)
    cob = cobertura(bruto)
    pontos = filtrar(bruto, bbox)
    print(f"Após filtros de qualidade/área: {len(pontos):,} focos")
    cd = celulas_dia(pontos, a.celula)
    tab = tabela_mensal(cd, pontos, cob)
    rt_geral, rt = razoes_terra(tab, k=a.k)
    val_terra = validar_terra(tab, k=a.k)
    if np.isfinite(rt_geral):
        tab = corrigir_terra(tab, rt)
    r_geral, rm, _ = razoes(tab, k=a.k)
    rn_geral, rn, _ = razoes(tab, k=a.k, origem="n20")
    tab = harmonizar(tab, rm, rn if np.isfinite(rn_geral) else None)
    val = validar(tab, k=a.k)
    val_n20 = validar(tab, k=a.k, origem="n20")
    tab, clim, completos = climatologia(tab)
    atual = mes_atual_vs_historico(cd, cob, rm, completos, rn if np.isfinite(rn_geral) else None,
                                   rt if np.isfinite(rt_geral) else None)

    # ---- saídas
    serie = tab.reset_index(drop=True)
    serie.insert(0, "periodo", [str(p) for p in tab.index])
    serie.to_csv(saida / "serie_mensal_harmonizada.csv", index=False)
    pd.DataFrame({"mes": range(1, 13), "nome": MESES, "razao_viirs_modis": [round(rm[m], 3) for m in range(1, 13)],
                  "razao_snpp_noaa20": [round(rn[m], 3) for m in range(1, 13)]}
                 ).to_csv(saida / "calibracao_razoes.csv", index=False)
    clim.assign(nome=MESES).to_csv(saida / "climatologia.csv")
    pontos.drop(columns=["conf_ok"]).to_csv(saida / "focos_filtrados.csv", index=False)
    resumo = {"bbox": bbox, "celula_graus": a.celula, "razao_geral": round(float(r_geral), 3),
              "razoes_mensais": {MESES[m - 1]: round(rm[m], 3) for m in range(1, 13)},
              "razao_geral_snpp_noaa20": round(float(rn_geral), 3) if np.isfinite(rn_geral) else None,
              "razoes_mensais_snpp_noaa20": {MESES[m - 1]: round(rn[m], 3) for m in range(1, 13)} if np.isfinite(rn_geral) else None,
              "razao_geral_terra_aqua": round(float(rt_geral), 3) if np.isfinite(rt_geral) else None,
              "razoes_mensais_terra_aqua": {MESES[m - 1]: round(rt[m], 3) for m in range(1, 13)} if np.isfinite(rt_geral) else None,
              "validacao_terra": val_terra,
              "anos_climatologia": completos, "validacao": val, "validacao_noaa20": val_n20, "mes_atual": atual,
              "cobertura": {s: (None if c is None else [str(c[0]), str(c[1]), str(c[2].date())]) for s, c in cob.items()}}
    (saida / "resumo.json").write_text(json.dumps(resumo, ensure_ascii=False, indent=2))

    anual = tab[tab["ano"].isin(completos)].groupby("ano")["harmonizado"].sum()
    print(f"\nRazão geral VIIRS/MODIS (células-dia): {r_geral:.2f}")
    print("Razões mensais:", ", ".join(f"{MESES[m-1]} {rm[m]:.2f}" for m in range(1, 13)))
    if "r_anual" in val:
        print(f"Validação deixa-um-ano-fora ({val['anos'][0]}-{val['anos'][-1]}): "
              f"r anual = {val['r_anual']}, r mensal = {val['r_mensal']}, erro médio anual = {val['erro_medio_anual_pct']}%")
    if "r_anual" in val_terra:
        print(f"Correção só Terra -> Terra+Aqua (antes de 08/2002): razão geral {rt_geral:.2f}; validação "
              f"({val_terra['anos'][0]}-{val_terra['anos'][-1]}): r anual = {val_terra['r_anual']}, erro = {val_terra['erro_medio_anual_pct']}%")
    if "r_anual" in val_n20:
        print(f"Continuidade NOAA-20 -> Suomi NPP: razão geral {rn_geral:.2f}; validação ({val_n20['anos'][0]}-{val_n20['anos'][-1]}): "
              f"r anual = {val_n20['r_anual']}, erro médio anual = {val_n20['erro_medio_anual_pct']}%")
    if len(anual):
        print(f"Ano mais ativo: {anual.idxmax()} ({anual.max():,.0f} células-dia); "
              f"mês de pico típico: {MESES[int(clim['mediana'].idxmax()) - 1]}")
    if atual["razao"] is not None:
        print(f"{MESES[atual['mes']-1]}/{atual['ano']} até o dia {atual['ate_dia']}: {atual['atual']:.0f} células-dia "
              f"vs mediana {atual['mediana_mesmo_periodo']:.0f} no mesmo período ({atual['razao']}x)")
    if a.figura:
        figura_calendario(tab, saida / "calendario.png",
                          "Calendário de queimadas harmonizado (MODIS + VIIRS)" + (" - DADOS SINTÉTICOS" if a.demo else ""))
        print(f"Figura: {saida / 'calendario.png'}")
    print(f"\nArquivos em {saida}/: serie_mensal_harmonizada.csv, calibracao_razoes.csv, "
          f"climatologia.csv, focos_filtrados.csv, resumo.json")


if __name__ == "__main__":
    principal()
