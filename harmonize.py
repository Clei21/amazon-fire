#!/usr/bin/env python3
# AI disclosure: developed with the help of an AI assistant (Claude, Anthropic); reviewed and tested by team Amazon Fire Calendar.
"""
Harmonize NASA FIRMS active fire detections (MODIS + VIIRS) into one monthly series.

MODIS (Terra and Aqua, 1 km, since November 2000) and VIIRS (375 m; Suomi NPP from
January 2012 to 2 November 2026, NOAA-20 since April 2018) see fire differently.
This script puts every year on the same scale, Suomi NPP fire cell-days.

Method
  1. Quality filter
       MODIS confidence >= 30; VIIRS confidence nominal or high.
       Vegetation fires only (type 0). Near real-time files have no type field,
       so cells that the archive marks as fixed heat sources are removed too.
  2. Common unit: fire cell-days
       Each detection goes to a 0.01 degree grid (about 1.1 km) and is counted
       at most once per cell, per day, per stream.
  3. Calibration on overlapping years, month by month
            R_m = (sum ref_m + k * R) / (sum src_m + k)
       R is the overall ratio and k (default 30) pulls months with few fires
       toward it (shrinkage). Three hand-offs are calibrated:
         Terra only    -> Terra + Aqua   (months before August 2002)
         MODIS         -> Suomi NPP      (before January 2012)
         NOAA-20       -> Suomi NPP      (after Suomi NPP stopped)
  4. Harmonized series (Suomi NPP cell-days)
            H = Suomi NPP              when Suomi NPP observes
            H = NOAA-20 * R_m          after Suomi NPP
            H = MODIS * R_m            before Suomi NPP
  5. Leave-one-year-out validation: each overlapping year is removed, the ratios
     are recalibrated without it, and the year is predicted from the other sensor.
  6. Climatology: monthly median and 25th/75th percentiles over complete years
     from 2003 on, and the anomaly of every month.

Usage
  python3 harmonize.py --modis "data/firms/*M-C61*.csv" \
                       --viirs "data/firms/*SV-C2*.csv" "data/firms/*J1V-C2*.csv" \
                       --bbox=-60.95,-3.95,-58.9,-2.55 --out results/manaus

Requirements: Python 3.9+, pandas, numpy.
"""
from __future__ import annotations

import argparse
import glob
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# ------------------------------------------------------------------ parameters
CELL_DEGREES = 0.01          # common grid cell (about 1.1 km)
MODIS_MIN_CONFIDENCE = 30    # MODIS confidence, 0-100
VIIRS_OK_CONFIDENCE = {"n", "h", "nominal", "high"}
SHRINKAGE_K = 30.0           # weight of the overall ratio in months with few fires
MODIS_START = pd.Timestamp("2000-11-01")
SNPP_START = pd.Timestamp("2012-01-20")
N20_START = pd.Timestamp("2018-04-01")
# Streams used in the series. SNPP is the reference scale.
STREAMS = (("MODIS", MODIS_START), ("SNPP", SNPP_START), ("N20", N20_START))
# Aqua started on 4 July 2002. Before August 2002 only Terra (morning pass) observed,
# and it sees much less fire in the Amazon. Those months are scaled to Terra + Aqua
# with a ratio calibrated while Terra's orbit was stable (until December 2019).
AQUA_MONTH = pd.Period("2002-08", "M")
TERRA_CALIBRATION_END = pd.Period("2019-12", "M")

SNPP_SATELLITES = {"N", "SNPP", "SUOMI NPP", "SUOMI-NPP", "NPP", ""}
N20_SATELLITES = {"N20", "1", "J1", "NOAA-20", "NOAA20", "NOAA 20"}
N21_SATELLITES = {"N21", "2", "J2", "NOAA-21", "NOAA21", "NOAA 21"}
VIIRS_SATELLITES = {"N", "SNPP", "NPP", "N20", "N21", "J1", "J2", "1", "2", "NOAA-20", "NOAA-21"}
MODIS_SATELLITES = {"T", "A", "TERRA", "AQUA"}

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# ------------------------------------------------------------- reading FIRMS
def read_firms(paths: list[str], expected_sensor: str | None = None) -> pd.DataFrame:
    """Read one or more FIRMS CSV files (wildcards allowed) into one table."""
    files: list[str] = []
    for p in paths:
        found = sorted(glob.glob(p))
        files.extend(found if found else [p])
    parts = []
    for f in files:
        df = pd.read_csv(f, low_memory=False)
        df.columns = [c.strip().lower() for c in df.columns]
        parts.append(normalize(df, expected_sensor, source_file=Path(f).name))
    if not parts:
        return pd.DataFrame(columns=["stream", "satellite", "lat", "lon", "date", "time",
                                     "conf", "conf_ok", "type", "frp", "source_file"])
    return pd.concat(parts, ignore_index=True)


def detect_sensor(df: pd.DataFrame) -> str:
    # Check the satellite first: Suomi NPP files write "SNPP" in the instrument
    # column and use MODIS-like brightness column names.
    for col in ("satellite", "instrument"):
        if col in df.columns and df[col].notna().any():
            v = str(df[col].dropna().iloc[0]).strip().upper()
            if "VIIRS" in v or v in VIIRS_SATELLITES:
                return "VIIRS"
            if "MODIS" in v or v in MODIS_SATELLITES:
                return "MODIS"
    if "bright_ti4" in df.columns:
        return "VIIRS"
    if "brightness" in df.columns:
        return "MODIS"
    raise ValueError("Could not tell whether the file is MODIS or VIIRS.")


def normalize(df: pd.DataFrame, expected_sensor: str | None, source_file: str) -> pd.DataFrame:
    sensor = detect_sensor(df)
    if expected_sensor and sensor != expected_sensor:
        print(f"  warning: {source_file} looks like {sensor}, not {expected_sensor}", file=sys.stderr)
    raw_conf = df.get("confidence", pd.Series([np.nan] * len(df)))
    if sensor == "MODIS":
        conf = pd.to_numeric(raw_conf, errors="coerce")
        conf_ok = conf >= MODIS_MIN_CONFIDENCE
        conf = conf.astype("string")
    else:
        conf = raw_conf.astype("string").str.strip().str.lower()
        conf_ok = conf.isin(VIIRS_OK_CONFIDENCE)
    ftype = pd.to_numeric(df["type"], errors="coerce") if "type" in df.columns else pd.Series(np.nan, index=df.index)
    sat = df.get("satellite", pd.Series([""] * len(df))).astype("string").fillna("").str.strip().str.upper()
    if sensor == "VIIRS":
        stream = np.where(sat.isin(N20_SATELLITES), "N20", np.where(sat.isin(N21_SATELLITES), "N21",
                          np.where(sat.isin(SNPP_SATELLITES), "SNPP", "OTHER")))
    else:
        stream = "MODIS"
    return pd.DataFrame({
        "stream": stream,
        "satellite": sat,
        "lat": pd.to_numeric(df["latitude"], errors="coerce"),
        "lon": pd.to_numeric(df["longitude"], errors="coerce"),
        "date": pd.to_datetime(df["acq_date"], errors="coerce"),
        "time": df.get("acq_time", pd.Series([np.nan] * len(df))),
        "conf": conf,
        "conf_ok": conf_ok.fillna(False).astype(bool),
        "type": ftype,
        "frp": pd.to_numeric(df.get("frp", np.nan), errors="coerce"),
        "source_file": source_file,
    }).dropna(subset=["lat", "lon", "date"])


# ------------------------------------------------------- fixed heat sources
def mask_static_sources(df: pd.DataFrame, cell=CELL_DEGREES, minimum=3) -> pd.DataFrame:
    """Near real-time files have no type field. Grid cells with at least `minimum`
    archive detections marked as non-vegetation (type 1, 2 or 3), plus their 8
    neighbours, are treated as fixed sources; untyped detections there get type 2."""
    ci = np.floor(df["lat"] / cell).astype(int)
    cj = np.floor(df["lon"] / cell).astype(int)
    fixed = df["type"].isin([1, 2, 3])
    counts = pd.Series(1, index=df.index[fixed]).groupby([ci[fixed], cj[fixed]]).sum()
    base = [k for k, v in counts.items() if v >= minimum]
    cells = {(a + da, b + db) for a, b in base for da in (-1, 0, 1) for db in (-1, 0, 1)}
    target = df["type"].isna() & pd.Series([(a, b) in cells for a, b in zip(ci, cj)], index=df.index)
    df = df.copy()
    df.loc[target, "type"] = 2
    if target.any():
        print(f"  removed {int(target.sum())} untyped detections at {len(base)} known fixed heat sources")
    return df


def apply_filters(df: pd.DataFrame, bbox=None) -> pd.DataFrame:
    m = df["conf_ok"]
    m &= df["type"].isna() | (df["type"] == 0)
    m &= df["stream"].isin(["MODIS", "SNPP", "N20"])
    if bbox is not None:
        w, s, e, n = bbox
        m &= df["lon"].between(w, e) & df["lat"].between(s, n)
    return df[m].copy()


# --------------------------------------------------------- unit: cell-days
def cell_days(df: pd.DataFrame, cell=CELL_DEGREES) -> pd.DataFrame:
    """One row per (stream, cell, day) with fire. Adds a "TERRA" stream (MODIS Terra
    detections only), used to correct the months before Aqua."""
    terra = df[(df["stream"] == "MODIS") & (df["satellite"].isin(["TERRA", "T"]))].assign(stream="TERRA")
    df = pd.concat([df, terra], ignore_index=True)
    out = df.assign(ci=np.floor(df["lat"] / cell).astype(int), cj=np.floor(df["lon"] / cell).astype(int))
    return out.groupby(["stream", "ci", "cj", "date"], as_index=False).agg(
        detections=("lat", "size"), frp=("frp", "sum"))


def coverage(raw: pd.DataFrame) -> dict:
    """Months covered by each stream. A partial first month (Suomi NPP on 20 Jan 2012)
    is left out. A stream that stopped before the end of the data (Suomi NPP on
    2 Nov 2026) ends at its last complete month; a stream still running goes to the
    month of its last detection."""
    data_end = raw["date"].max()
    cov = {}
    for stream, start in STREAMS:
        d = raw.loc[raw["stream"] == stream, "date"]
        if d.empty:
            cov[stream] = None
            continue
        first = max(start, d.min())
        first_month = first.to_period("M") if first.day == 1 else first.to_period("M") + 1
        last = d.max()
        if last >= data_end - pd.Timedelta(days=3) or last.is_month_end:
            last_month = last.to_period("M")
        else:
            last_month = last.to_period("M") - 1
        cov[stream] = (first_month, last_month, last) if last_month >= first_month else None
    return cov


# ------------------------------------------------------------- calibration
def monthly_table(cd: pd.DataFrame, points: pd.DataFrame, cov: dict) -> pd.DataFrame:
    bounds = []
    for s, _ in STREAMS:
        if cov.get(s):
            bounds += [cov[s][0], cov[s][1]]
    months = pd.period_range(min(bounds), max(bounds), freq="M")
    tab = pd.DataFrame(index=months)
    sub = cd[cd["stream"] == "TERRA"]
    tab["terra_cell_days"] = sub.groupby(sub["date"].dt.to_period("M")).size().reindex(months, fill_value=0)
    for s, _ in STREAMS:
        key = s.lower()
        sub = cd[cd["stream"] == s]
        tab[f"{key}_cell_days"] = sub.groupby(sub["date"].dt.to_period("M")).size().reindex(months, fill_value=0)
        p = points[points["stream"] == s]
        g = p.groupby(p["date"].dt.to_period("M"))
        tab[f"{key}_detections"] = g.size().reindex(months, fill_value=0)
        tab[f"{key}_frp_mw"] = g["frp"].sum().reindex(months, fill_value=0.0).round(1)
        c = cov.get(s)
        tab[f"{key}_covered"] = [(c is not None and c[0] <= per <= c[1]) for per in months]
    tab["year"] = tab.index.year
    tab["month"] = tab.index.month
    return tab


def monthly_ratios(tab: pd.DataFrame, exclude_year=None, k=SHRINKAGE_K, default=None, source="modis"):
    """Suomi NPP / source ratio for each calendar month, over the months when both
    streams observe. source is "modis" or "n20"."""
    col = f"{source}_cell_days"
    if f"{source}_covered" not in tab:
        return float("nan"), {m: float("nan") for m in range(1, 13)}, tab.iloc[0:0]
    overlap = tab[tab[f"{source}_covered"] & tab["snpp_covered"]]
    if exclude_year is not None:
        overlap = overlap[overlap["year"] != exclude_year]
    ref, src = overlap["snpp_cell_days"].sum(), overlap[col].sum()
    overall = ref / src if src > 0 else (default or float("nan"))
    by_month = {}
    for m in range(1, 13):
        s = overlap[overlap["month"] == m]
        by_month[m] = (s["snpp_cell_days"].sum() + k * overall) / (s[col].sum() + k)
    return overall, by_month, overlap


def terra_ratios(tab: pd.DataFrame, exclude_year=None, k=SHRINKAGE_K):
    """(Terra + Aqua) / Terra for each calendar month, from AQUA_MONTH to TERRA_CALIBRATION_END."""
    overlap = tab[tab["modis_covered"] & (tab.index >= AQUA_MONTH) & (tab.index <= TERRA_CALIBRATION_END)]
    if exclude_year is not None:
        overlap = overlap[overlap["year"] != exclude_year]
    both, terra = overlap["modis_cell_days"].sum(), overlap["terra_cell_days"].sum()
    overall = both / terra if terra > 0 else float("nan")
    by_month = {m: (overlap.loc[overlap["month"] == m, "modis_cell_days"].sum() + k * overall) /
                   (overlap.loc[overlap["month"] == m, "terra_cell_days"].sum() + k) for m in range(1, 13)}
    return overall, by_month


def correct_terra_only(tab: pd.DataFrame, rt: dict) -> pd.DataFrame:
    """Before Aqua, scale Terra cell-days to the Terra + Aqua level."""
    tab = tab.copy()
    tab["modis_raw_cell_days"] = tab["modis_cell_days"]
    tab["modis_cell_days"] = tab["modis_cell_days"].astype(float)
    before = tab.index < AQUA_MONTH
    tab.loc[before, "modis_cell_days"] = (tab.loc[before, "terra_cell_days"] * tab.loc[before, "month"].map(rt)).round(2)
    tab["terra_ratio"] = np.where(before, tab["month"].map(rt).round(4), np.nan)
    return tab


def validate_terra(tab: pd.DataFrame, k=SHRINKAGE_K) -> dict:
    overlap = tab[tab["modis_covered"] & (tab.index >= AQUA_MONTH) & (tab.index <= TERRA_CALIBRATION_END)]
    years = [y for y, g in overlap.groupby("year") if len(g) == 12]
    obs, pred = [], []
    for y in years:
        _, rt = terra_ratios(tab, exclude_year=y, k=k)
        g = overlap[overlap["year"] == y]
        obs.append(g["modis_cell_days"].sum())
        pred.append((g["terra_cell_days"] * g["month"].map(rt)).sum())
    if len(years) < 3:
        return {"years": years, "note": "too few years"}
    obs, pred = np.array(obs, float), np.array(pred, float)
    return {"years": years, "r_annual": round(float(np.corrcoef(obs, pred)[0, 1]), 3),
            "mean_annual_error_pct": round(float(np.mean(np.abs(pred - obs) / obs) * 100), 1)}


def harmonize(tab: pd.DataFrame, rm: dict, rn: dict | None = None) -> pd.DataFrame:
    """Suomi NPP when it observes; afterwards NOAA-20 x ratio; before, MODIS x ratio."""
    tab = tab.copy()
    tab["modis_ratio"] = tab["month"].map(rm).round(4)
    n20_ok = tab["n20_covered"] if "n20_covered" in tab else pd.Series(False, index=tab.index)
    tab["n20_ratio"] = tab["month"].map(rn).round(4) if rn else np.nan
    h = np.where(tab["snpp_covered"], tab["snpp_cell_days"],
                 np.where(n20_ok, tab.get("n20_cell_days", 0) * tab["n20_ratio"],
                          np.where(tab["modis_covered"], tab["modis_cell_days"] * tab["modis_ratio"], np.nan)))
    tab["harmonized"] = np.round(h, 1)
    tab["confidence"] = np.where(tab.index < AQUA_MONTH, "low (Terra only)", "normal")
    tab["source"] = np.where(tab["snpp_covered"], "Suomi NPP",
                             np.where(n20_ok, "NOAA-20 x ratio",
                                      np.where(tab["modis_covered"], "MODIS x ratio", "")))
    return tab


def validate(tab: pd.DataFrame, k=SHRINKAGE_K, source="modis") -> dict:
    """Leave-one-year-out test over complete overlapping years."""
    if f"{source}_covered" not in tab:
        return {"years": [], "note": "stream missing"}
    overlap = tab[tab[f"{source}_covered"] & tab["snpp_covered"]]
    years = [y for y, g in overlap.groupby("year") if len(g) == 12]
    obs_y, pred_y, obs_m, pred_m = [], [], [], []
    for y in years:
        _, rm, _ = monthly_ratios(tab, exclude_year=y, k=k, source=source)
        g = overlap[overlap["year"] == y]
        p = g[f"{source}_cell_days"] * g["month"].map(rm)
        obs_y.append(g["snpp_cell_days"].sum()); pred_y.append(p.sum())
        obs_m += list(g["snpp_cell_days"]); pred_m += list(p)
    if len(years) < 3:
        return {"years": years, "note": "too few overlapping years to validate"}
    obs_y, pred_y = np.array(obs_y, float), np.array(pred_y, float)
    ok = obs_y > 0
    return {
        "years": years,
        "r_annual": round(float(np.corrcoef(obs_y, pred_y)[0, 1]), 3),
        "r_monthly": round(float(np.corrcoef(obs_m, pred_m)[0, 1]), 3),
        "mean_annual_error_pct": round(float(np.mean(np.abs(pred_y[ok] - obs_y[ok]) / obs_y[ok]) * 100), 1),
        "by_year": [{"year": int(y), "observed_snpp": int(o), "predicted": round(float(p), 1)}
                    for y, o, p in zip(years, obs_y, pred_y)],
    }


# ------------------------------------------------- climatology and anomalies
def climatology(tab: pd.DataFrame):
    covered = tab["modis_covered"] | tab["snpp_covered"] | (tab["n20_covered"] if "n20_covered" in tab else False)
    data_end = max(tab.index[covered])
    # baseline: complete years with no Terra-only months (from 2003 on)
    complete = [y for y, g in tab[covered].groupby("year")
                if len(g) == 12 and pd.Period(f"{y}-12", "M") < data_end and pd.Period(f"{y}-01", "M") >= AQUA_MONTH]
    base = tab[tab["year"].isin(complete)]
    clim = base.groupby("month")["harmonized"].agg(
        median="median", p25=lambda x: x.quantile(.25), p75=lambda x: x.quantile(.75))
    tab = tab.copy()
    med = tab["month"].map(clim["median"])
    tab["typical_median"] = med.round(1)
    tab["anomaly"] = (tab["harmonized"] - med).round(1)
    tab["ratio_to_median"] = ((tab["harmonized"] + 1) / (med + 1)).round(3)
    return tab, clim.round(1), complete


def current_month_vs_history(cd: pd.DataFrame, cov: dict, rm: dict, base_years: list[int],
                             rn: dict | None = None, rt: dict | None = None):
    """Compare the latest (partial) month with the median of the SAME days
    (day 1 to the last day with data) in earlier years."""
    end = max(c[2] for c in cov.values() if c)
    day, month, year = end.day, end.month, end.year

    def total(y):
        first, last = pd.Timestamp(y, month, 1), pd.Timestamp(y, month, day)
        sel = cd[(cd["date"] >= first) & (cd["date"] <= last)]
        per = pd.Period(f"{y}-{month:02d}", "M")
        covers = lambda s: cov.get(s) and cov[s][0] <= per <= cov[s][1]
        if covers("SNPP"):
            return float((sel["stream"] == "SNPP").sum())
        if covers("N20") and rn:
            return float((sel["stream"] == "N20").sum()) * rn[month]
        if rt and per < AQUA_MONTH:
            return float((sel["stream"] == "TERRA").sum()) * rt[month] * rm[month]
        return float((sel["stream"] == "MODIS").sum()) * rm[month]

    history = [total(y) for y in base_years if y < year]
    now = total(year)
    med = float(np.median(history)) if history else float("nan")
    return {"year": year, "month": month, "through_day": day, "current": round(now, 1),
            "median_same_days": round(med, 1),
            "ratio": round((now + 1) / (med + 1), 2) if history else None}


# ----------------------------------------------------------------- pipeline
def run(modis: list[str], viirs: list[str], bbox=None, cell=CELL_DEGREES, k=SHRINKAGE_K) -> dict:
    """Run the whole method and return every intermediate result."""
    raw = pd.concat([read_firms(modis, "MODIS"), read_firms(viirs, "VIIRS")], ignore_index=True)
    raw = mask_static_sources(raw)
    cov = coverage(raw)
    points = apply_filters(raw, bbox)
    cd = cell_days(points, cell)
    tab = monthly_table(cd, points, cov)
    rt_all, rt = terra_ratios(tab, k=k)
    val_terra = validate_terra(tab, k=k)
    if np.isfinite(rt_all):
        tab = correct_terra_only(tab, rt)
    r_all, rm, _ = monthly_ratios(tab, k=k)
    rn_all, rn, _ = monthly_ratios(tab, k=k, source="n20")
    rn_use = rn if np.isfinite(rn_all) else None
    tab = harmonize(tab, rm, rn_use)
    val = validate(tab, k=k)
    val_n20 = validate(tab, k=k, source="n20")
    tab, clim, complete = climatology(tab)
    now = current_month_vs_history(cd, cov, rm, complete, rn_use, rt if np.isfinite(rt_all) else None)
    return dict(raw=raw, points=points, cell_days=cd, coverage=cov, table=tab, climatology=clim,
                complete_years=complete, modis_ratio=r_all, modis_ratios=rm, n20_ratio=rn_all, n20_ratios=rn,
                terra_ratio=rt_all, terra_ratios=rt, validation=val, validation_n20=val_n20,
                validation_terra=val_terra, current_month=now)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Harmonize NASA FIRMS MODIS + VIIRS active fire detections.")
    ap.add_argument("--modis", nargs="*", default=[], help="MODIS FIRMS CSV files (wildcards allowed)")
    ap.add_argument("--viirs", nargs="*", default=[], help="VIIRS FIRMS CSV files (wildcards allowed)")
    ap.add_argument("--bbox", help="west,south,east,north in decimal degrees, e.g. --bbox=-60.95,-3.95,-58.9,-2.55")
    ap.add_argument("--cell", type=float, default=CELL_DEGREES, help="grid cell size in degrees (default 0.01)")
    ap.add_argument("--k", type=float, default=SHRINKAGE_K, help="shrinkage weight of the monthly ratios")
    ap.add_argument("--out", default="results", help="output folder")
    a = ap.parse_args(argv)
    if not a.modis and not a.viirs:
        ap.error("give --modis and/or --viirs")

    bbox = tuple(float(x) for x in a.bbox.split(",")) if a.bbox else None
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    R = run(a.modis, a.viirs, bbox, a.cell, a.k)
    raw, tab, clim = R["raw"], R["table"], R["climatology"]
    print(f"Read {len(raw):,} detections ({(raw.stream == 'MODIS').sum():,} MODIS, "
          f"{(raw.stream == 'SNPP').sum():,} Suomi NPP, {(raw.stream == 'N20').sum():,} NOAA-20); "
          f"{len(R['points']):,} after quality and area filters")

    series = tab.reset_index(drop=True)
    series.insert(0, "period", [str(p) for p in tab.index])
    series.to_csv(out / "harmonized_monthly_series.csv", index=False)
    rm, rn = R["modis_ratios"], R["n20_ratios"]
    pd.DataFrame({"month": range(1, 13), "name": MONTHS,
                  "snpp_per_modis": [round(rm[m], 3) for m in range(1, 13)],
                  "snpp_per_noaa20": [round(rn[m], 3) for m in range(1, 13)]}).to_csv(out / "calibration_ratios.csv", index=False)
    clim.assign(name=MONTHS).to_csv(out / "climatology.csv")
    summary = {
        "bbox": bbox, "cell_degrees": a.cell, "shrinkage_k": a.k,
        "snpp_per_modis": round(float(R["modis_ratio"]), 3),
        "snpp_per_noaa20": round(float(R["n20_ratio"]), 3) if np.isfinite(R["n20_ratio"]) else None,
        "terra_aqua_per_terra": round(float(R["terra_ratio"]), 3) if np.isfinite(R["terra_ratio"]) else None,
        "validation_modis": R["validation"], "validation_noaa20": R["validation_n20"],
        "validation_terra_only": R["validation_terra"],
        "baseline_years": R["complete_years"], "current_month": R["current_month"],
        "coverage": {s: (None if c is None else [str(c[0]), str(c[1]), str(c[2].date())]) for s, c in R["coverage"].items()},
    }
    (out / "summary.json").write_text(json.dumps(summary, indent=2))

    v, vn, vt = R["validation"], R["validation_n20"], R["validation_terra"]
    print(f"Suomi NPP / MODIS overall ratio: {R['modis_ratio']:.2f}")
    if "r_annual" in v:
        print(f"Leave-one-year-out, MODIS -> Suomi NPP ({v['years'][0]}-{v['years'][-1]}): "
              f"r = {v['r_annual']}, mean annual error = {v['mean_annual_error_pct']}%")
    if "r_annual" in vn:
        print(f"Leave-one-year-out, NOAA-20 -> Suomi NPP ({vn['years'][0]}-{vn['years'][-1]}): "
              f"ratio {R['n20_ratio']:.3f}, r = {vn['r_annual']}, mean annual error = {vn['mean_annual_error_pct']}%")
    if "r_annual" in vt:
        print(f"Terra only -> Terra + Aqua ({vt['years'][0]}-{vt['years'][-1]}): mean annual error = "
              f"{vt['mean_annual_error_pct']}% (months before Aug 2002 flagged as low confidence)")
    c = R["current_month"]
    if c["ratio"] is not None:
        print(f"{MONTHS[c['month'] - 1]} {c['year']}, days 1-{c['through_day']}: {c['current']:.0f} cell-days "
              f"vs median {c['median_same_days']:.0f} ({c['ratio']}x)")
    print(f"Files written to {out}/")


if __name__ == "__main__":
    main()
