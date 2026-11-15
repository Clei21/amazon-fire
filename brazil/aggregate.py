import numpy as np, pandas as pd, json, gzip, sys
sys.path.insert(0,"."); import harmonize as H
W="brazil/work/"; D0=pd.Timestamp("2000-01-01"); END=pd.Timestamp("2026-11-14"); ENDD=(END-D0).days
K={s:np.load(W+f"k{s}.npy") for s in range(4)}
def dec(k): return ((k>>37)&8191), ((k>>24)&8191), (k&16777215)   # ci+3500, cj+7500, day
dates=pd.date_range(D0, END); yr=dates.year.to_numpy(); mo=dates.month.to_numpy(); dom=dates.day.to_numpy()
MI=(yr-2000)*12+mo-1          # month index from Jan 2000
NM=int(MI[-1])+1
out={}; daily={}; month_tot={}
for s in range(4):
    ci,cj,d=dec(K[s]); keep=d<=ENDD; ci,cj,d=ci[keep],cj[keep],d[keep]
    daily[s]=np.bincount(d, minlength=ENDD+1)
    cell=(ci//50)*100+(cj//50)                       # 0.5 deg cell id: Y*100+X
    mi=MI[d]
    key=cell.astype(np.int64)*1000+mi
    u,c=np.unique(key, return_counts=True)
    out[s]=(u//1000).astype(np.uint16),(u%1000).astype(np.uint16),np.minimum(c,65535).astype(np.uint16)
    month_tot[s]=np.bincount(mi, minlength=NM)
    # month-to-date: Nov 1-14 of each year per cell
    sel=(mo[d]==11)&(dom[d]<=14)
    ky=cell[sel].astype(np.int64)*100+(yr[d][sel]-2000)
    u2,c2=np.unique(ky, return_counts=True)
    out[f"mtd{s}"]=((u2//100).astype(np.uint16),(u2%100).astype(np.uint16),c2.astype(np.uint16))
    print("stream",s,"entries",len(u),"mtd",len(u2))
# ---- national monthly table, harmonized with the same method
per=pd.period_range("2000-01","2026-11",freq="M")
tab=pd.DataFrame(index=per)
tab["terra_cell_days"]=month_tot[1]; tab["modis_cell_days"]=month_tot[0]; tab["snpp_cell_days"]=month_tot[2]; tab["n20_cell_days"]=month_tot[3]
tab["modis_covered"]=per>=pd.Period("2000-11","M")
tab["snpp_covered"]=(per>=pd.Period("2012-02","M"))&(per<=pd.Period("2026-10","M"))
tab["n20_covered"]=per>=pd.Period("2018-04","M")
tab=tab[tab.modis_covered]
tab["year"]=tab.index.year; tab["month"]=tab.index.month
rt_all,rt=H.terra_ratios(tab); vT=H.validate_terra(tab)
tab=H.correct_terra_only(tab,rt)
r_all,rm,_=H.monthly_ratios(tab); rn_all,rn,_=H.monthly_ratios(tab,source="n20")
tab=H.harmonize(tab,rm,rn); v=H.validate(tab); vN=H.validate(tab,source="n20")
tab,clim,complete=H.climatology(tab)
print("ratios",r_all,rn_all,rt_all); print("val",v["mean_annual_error_pct"],v["r_annual"],"n20",vN["mean_annual_error_pct"],vN["r_annual"],"terra",vT.get("mean_annual_error_pct"))
tab.to_csv(W+"brazil_monthly.csv")
# national daily harmonized
Hd=np.full(ENDD+1,np.nan)
for p,row in tab.iterrows():
    i0=(p.start_time-D0).days; i1=min((p.end_time.normalize()-D0).days,ENDD); m=p.month; sl=slice(i0,i1+1)
    if row.source=="Suomi NPP": Hd[sl]=daily[2][sl]
    elif row.source.startswith("NOAA-20"): Hd[sl]=daily[3][sl]*rn[m]
    elif p<H.AQUA_MONTH: Hd[sl]=daily[1][sl]*rt[m]*rm[m]
    else: Hd[sl]=daily[0][sl]*rm[m]
np.save(W+"brazil_daily_h.npy",Hd)
# recurrence 0.1 deg, MODIS (Terra+Aqua) 2003-2025
ci,cj,d=dec(K[0]); y=yr[np.minimum(d,ENDD)]; keep=(y>=2003)&(y<=2025)&(d<=ENDD)
gy=(ci[keep]//10); gx=(cj[keep]//10)                      # 0.1 deg: Y=(lat+35)/0.1
u=np.unique((gy.astype(np.int64)*1000+gx)*100+(y[keep]-2000))
cellid=u//100; uc,cnt=np.unique(cellid,return_counts=True)
GY0,GY1=int((uc//1000).min()),int((uc//1000).max()); GX0,GX1=int((uc%1000).min()),int((uc%1000).max())
grid=np.zeros((GY1-GY0+1,GX1-GX0+1),np.uint8); grid[(uc//1000)-GY0,(uc%1000)-GX0]=cnt
print("recurrence grid",grid.shape,"cells>=15y",int((grid>=15).sum()),"cells any",int((grid>0).sum()))
json.dump({"ratios":{"modis":r_all,"n20":rn_all,"terra":rt_all,"rm":rm,"rn":rn,"rt":rt},"val":v,"valN":vN,"valT":vT,
           "complete":complete,"grid":{"y0":GY0,"x0":GX0,"h":grid.shape[0],"w":grid.shape[1]},
           "n_det":{s:int(len(K[s])) for s in range(4)}}, open(W+"brazil_summary.json","w"), indent=1, default=float)
# ---- binary for the browser (gzip)
parts=[]; header={"nm":NM,"endDay":ENDD,"grid":{"y0":GY0,"x0":GX0,"h":grid.shape[0],"w":grid.shape[1]}}
lens={}
for s in range(4):
    c,m,n=out[s]; lens[f"m{s}"]=len(c); parts+= [c.tobytes(),m.tobytes(),n.tobytes()]
for s in range(4):
    c,yy,n=out[f"mtd{s}"]; lens[f"t{s}"]=len(c); parts+=[c.tobytes(),yy.tobytes(),n.tobytes()]
parts.append(grid.tobytes())
for s in range(4): parts.append(daily[s].astype(np.uint32).tobytes())
header["lens"]=lens
raw=b"".join(parts); gz=gzip.compress(raw,9)
open(W+"brazil.bin.gz","wb").write(gz); json.dump(header,open(W+"brazil_header.json","w"))
print("raw MB",len(raw)/1e6,"gz MB",len(gz)/1e6)
an=tab[tab.year.isin(range(2001,2027))].groupby("year").harmonized.sum()
ao=tab[tab.month.isin([8,9,10])].groupby("year").harmonized.sum()
print(pd.DataFrame({"year_total":an,"aug_oct":ao,"rank":ao.rank(ascending=False)}).round(0).to_string())
