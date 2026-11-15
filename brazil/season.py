import numpy as np, pandas as pd, json
W="brazil/work/"; D0=pd.Timestamp("2000-01-01")
Hd=np.load(W+"brazil_daily_h.npy"); dates=pd.date_range(D0,periods=len(Hd))
s=pd.Series(Hd,index=dates)
def year_curve(y):
    v=np.full(365,np.nan); x=s[str(y)]
    for d,val in x.items():
        if d.dayofyear<=365: v[d.dayofyear-1]=val
    return pd.Series(v).rolling(15,center=True,min_periods=4).mean().values
base=list(range(2003,2026)); A=np.array([year_curve(y) for y in base]); med=np.nanmedian(A,0)
pk=int(np.nanargmax(med[120:]))+120; thr=.25*med[pk]
st=next(k for k in range(0,365) if med[k]>=thr); en=max(k for k in range(pk,365) if med[k]>=thr)
f=lambda k:(pd.Timestamp(2001,1,1)+pd.Timedelta(days=int(k))).strftime("%d %b")
print("typical", f(st), f(pk), f(en), "thr",thr, "peak", med[pk])
c=year_curve(2026); s26=next((k for k in range(0,365) if c[k]>=thr),None); print("2026 start", f(s26) if s26 is not None else None, "max day", s["2026"].idxmax(), s["2026"].max())
print("worst day ever", s.idxmax(), s.max())
t=pd.read_csv(W+"brazil_monthly.csv",index_col=0)
t.index=pd.PeriodIndex(t.index,freq="M")
# Jan-Oct per year
jo=t[t.month<=10].groupby("year").harmonized.sum().loc[2001:2026]
print("Jan-Oct 2026 rank", int(jo.rank(ascending=False)[2026]), "of", len(jo), "ratio to median 2003-2025", jo[2026]/jo.loc[2003:2025].median())
print("Sep 2026 vs median Sep", t.loc["2026-09","harmonized"]/t[(t.month==9)&(t.year.between(2003,2025))].harmonized.median())
nov=t.loc["2026-11"]; print(nov[["n20_cell_days","harmonized"]])
