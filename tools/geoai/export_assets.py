import json, math, os
import numpy as np, cv2
from PIL import Image

TEST = ["ponce", "guaynabo"]
OUT  = os.environ.get("GEOAI_OUT", "assets/geoai")
os.makedirs(OUT, exist_ok=True)

def infer(name):
    """SAM 3.1 probability map written by sam_infer.py."""
    return np.load(f"data/{name}_prob.npy")

SHIP=1024
summary={}
for name in TEST:
    truth=(np.asarray(Image.open(f"data/{name}_mask.png"))>127)
    prob=infer(name)
    # ship at 1024
    Image.open(f"data/{name}_img.jpg").convert("RGB").resize((SHIP,SHIP),Image.LANCZOS)\
         .save(f"{OUT}/{name}_img.jpg",quality=82,optimize=True)
    Image.fromarray((prob*255).astype(np.uint8)).resize((SHIP,SHIP),Image.BILINEAR)\
         .save(f"{OUT}/{name}_prob.png",optimize=True)
    Image.fromarray((truth*255).astype(np.uint8)).resize((SHIP,SHIP),Image.NEAREST)\
         .save(f"{OUT}/{name}_truth.png",optimize=True)
    # metrics at full res
    rows=[]
    for t in np.arange(0.05,0.96,0.05):
        pr=prob>=t; tp=int((pr&truth).sum()); fp=int((pr&~truth).sum()); fn=int((~pr&truth).sum())
        prec=tp/max(tp+fp,1); rec=tp/max(tp+fn,1); iou=tp/max(tp+fp+fn,1)
        rows.append(dict(t=round(float(t),2),precision=round(prec,4),recall=round(rec,4),iou=round(iou,4)))
    best=max(rows,key=lambda r:r["iou"])
    summary[name]=dict(rows=rows,best=best)
    print(f"  {name:9s} best IoU {best['iou']:.3f} @ t={best['t']:.2f}  P={best['precision']:.3f} R={best['recall']:.3f}")

# ---- hero footprints: Guaynabo, the tile hero_terrain.py is registered to ----
name="guaynabo"
prob=infer(name); thr=summary[name]["best"]["t"]
binm=((prob>=thr)*255).astype(np.uint8)
binm=cv2.morphologyEx(binm,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
# crop to the hero's 650x720 aspect
H,W=binm.shape; cw=int(H*650/720); x0=(W-cw)//2
crop=binm[:,x0:x0+cw]
cnts,_=cv2.findContours(crop,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
paths=[]
for c in cnts:
    if cv2.contourArea(c) < 90: continue
    ap=cv2.approxPolyDP(c, 1.6, True)
    if len(ap) < 3: continue
    pts=[(p[0][0]*650.0/cw, p[0][1]*720.0/H) for p in ap]
    paths.append("M"+" L".join(f"{x:.1f},{y:.1f}" for x,y in pts)+" Z")
paths=sorted(paths,key=len,reverse=True)[:900]
PROMPT=open("data/prompt.txt").read().strip() if os.path.exists("data/prompt.txt") else "building"
json.dump(dict(count=len(paths),source=name,threshold=thr,model="SAM 3.1",prompt=PROMPT),
          open(f"{OUT}/hero-meta.json","w"))
json.dump(dict(count=len(paths),paths=paths), open(f"{OUT}/hero-footprints.json","w"))
print(f"  hero: {len(paths)} footprints from {name}")
json.dump(summary, open(f"{OUT}/metrics.json","w"), indent=1)
for f in sorted(os.listdir(OUT)):
    print(f"   {f:26s} {os.path.getsize(os.path.join(OUT,f))/1024:8.1f} KB")
