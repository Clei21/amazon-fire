import numpy as np, pandas as pd, glob, time, sys
R="data_brazil/"; W="brazil/work/"
T0=time.time()
def keys(stream, lat, lon, day):
    ci=(np.floor(lat/0.01).astype(np.int64)+3500); cj=(np.floor(lon/0.01).astype(np.int64)+7500)
    return (np.int64(stream)<<50)|(ci<<37)|(cj<<24)|day.astype(np.int64)
fixed={}  # (ci,cj)->count of non-veg typed detections
acc={0:[],1:[],2:[],3:[]}
def handle(path, kind, nrt, mask=None):
    n=0
    for ch in pd.read_csv(path, usecols=["latitude","longitude","acq_date","satellite","confidence"]+([] if nrt else ["type"]),
                          dtype={"satellite":"string","confidence":"string"}, chunksize=3_000_000):
        n+=len(ch)
        lat=ch.latitude.to_numpy(float); lon=ch.longitude.to_numpy(float)
        day=((pd.to_datetime(ch.acq_date, format="%Y-%m-%d", cache=True)-pd.Timestamp("2000-01-01")).dt.days).to_numpy()
        conf=ch.confidence.str.strip().str.lower()
        if kind=="M": ok=(pd.to_numeric(conf,errors="coerce")>=30).to_numpy().copy()
        else: ok=conf.isin(["n","h","nominal","high"]).to_numpy().copy()
        if not nrt:
            t=ch["type"].to_numpy()
            nv=np.isin(t,[1,2,3])
            if nv.any():
                ci=np.floor(lat[nv]/0.01).astype(np.int64); cj=np.floor(lon[nv]/0.01).astype(np.int64)
                u,c=np.unique(ci*100000+cj, return_counts=True)
                for a,b in zip(u.tolist(),c.tolist()): fixed[a]=fixed.get(a,0)+b
            ok&=(t==0)
        else:
            ci=np.floor(lat/0.01).astype(np.int64); cj=np.floor(lon/0.01).astype(np.int64)
            ok&=~np.isin(ci*100000+cj, mask)
        sat=ch.satellite.str.strip().str.upper().to_numpy()
        if kind=="M":
            k=keys(0,lat[ok],lon[ok],day[ok]); acc[0].append(np.unique(k))
            tr=ok&np.isin(sat,["TERRA","T"]); acc[1].append(np.unique(keys(1,lat[tr],lon[tr],day[tr])))
        else:
            s=3 if kind=="J" else 2
            acc[s].append(np.unique(keys(s,lat[ok],lon[ok],day[ok])))
        print(f"  {path.split('/')[-1]} {n:,} rows  {time.time()-T0:.0f}s", flush=True)
for kind,pat in [("M","M-C61"),("S","SV-C2"),("J","J1V-C2")]:
    handle(glob.glob(R+f"fire_archive_{pat}_*.csv")[0], kind, False)
base=np.array([k for k,v in fixed.items() if v>=3],dtype=np.int64)
mask=np.unique(np.concatenate([base+da*100000+db for da in (-1,0,1) for db in (-1,0,1)])) if len(base) else np.array([],np.int64)
print("fixed sources", len(base))
for kind,pat in [("M","M-C61"),("S","SV-C2"),("J","J1V-C2")]:
    handle(glob.glob(R+f"fire_nrt_{pat}_*.csv")[0], kind, True, mask)
for s in acc:
    u=np.unique(np.concatenate(acc[s])); np.save(W+f"k{s}.npy",u); print("stream",s,len(u))
print("done", time.time()-T0)
