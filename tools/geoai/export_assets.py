import json, math, os
import numpy as np, torch, torch.nn as nn, torch.nn.functional as F, cv2
from PIL import Image

DEV = "mps" if torch.backends.mps.is_available() else "cpu"
TILE = 256
TEST = ["ponce", "guaynabo"]
OUT  = os.environ.get("GEOAI_OUT", "assets/geoai")
os.makedirs(OUT, exist_ok=True)

def blk(i,o): return nn.Sequential(nn.Conv2d(i,o,3,padding=1), nn.BatchNorm2d(o), nn.ReLU(True),
                                   nn.Conv2d(o,o,3,padding=1), nn.BatchNorm2d(o), nn.ReLU(True))
class UNet(nn.Module):
    def __init__(s, b=32):
        super().__init__()
        s.d1=blk(3,b); s.d2=blk(b,b*2); s.d3=blk(b*2,b*4); s.d4=blk(b*4,b*8)
        s.u3=blk(b*8+b*4,b*4); s.u2=blk(b*4+b*2,b*2); s.u1=blk(b*2+b,b)
        s.out=nn.Conv2d(b,1,1); s.p=nn.MaxPool2d(2)
    def forward(s,x):
        c1=s.d1(x); c2=s.d2(s.p(c1)); c3=s.d3(s.p(c2)); c4=s.d4(s.p(c3))
        u=F.interpolate(c4,scale_factor=2,mode='bilinear',align_corners=False); u=s.u3(torch.cat([u,c3],1))
        u=F.interpolate(u,scale_factor=2,mode='bilinear',align_corners=False); u=s.u2(torch.cat([u,c2],1))
        u=F.interpolate(u,scale_factor=2,mode='bilinear',align_corners=False); u=s.u1(torch.cat([u,c1],1))
        return s.out(u)

net=UNet().to(DEV); net.load_state_dict(torch.load("unet.pt",map_location=DEV)); net.eval()

def infer(img):
    """Overlapping-tile inference with cosine feathering to avoid seams."""
    H,W,_=img.shape; acc=np.zeros((H,W),np.float32); wgt=np.zeros((H,W),np.float32)
    ramp=np.hanning(TILE)[:,None]*np.hanning(TILE)[None,:]; ramp=np.maximum(ramp,1e-3)
    step=TILE//2
    ys=list(range(0,H-TILE+1,step)) + ([H-TILE] if (H-TILE)%step else [])
    xs=list(range(0,W-TILE+1,step)) + ([W-TILE] if (W-TILE)%step else [])
    with torch.no_grad():
        for y in sorted(set(ys)):
            for x in sorted(set(xs)):
                t=img[y:y+TILE,x:x+TILE]
                X=torch.from_numpy(t.transpose(2,0,1)[None]).to(DEV)
                p=torch.sigmoid(net(X))[0,0].cpu().numpy()
                acc[y:y+TILE,x:x+TILE]+=p*ramp; wgt[y:y+TILE,x:x+TILE]+=ramp
    return acc/np.maximum(wgt,1e-6)

SHIP=1024
summary={}
for name in TEST:
    img=np.asarray(Image.open(f"data/{name}_img.jpg").convert("RGB"),np.float32)/255.
    truth=(np.asarray(Image.open(f"data/{name}_mask.png"))>127)
    prob=infer(img)
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

# ---- hero footprints from the strongest AOI ----
name=max(summary,key=lambda k:summary[k]["best"]["iou"])
img=np.asarray(Image.open(f"data/{name}_img.jpg").convert("RGB"),np.float32)/255.
prob=infer(img); thr=summary[name]["best"]["t"]
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
json.dump(dict(count=len(paths),source=name,threshold=thr),
          open(f"{OUT}/hero-meta.json","w"))
json.dump(dict(count=len(paths),paths=paths), open(f"{OUT}/hero-footprints.json","w"))
print(f"  hero: {len(paths)} footprints from {name}")
json.dump(summary, open(f"{OUT}/metrics.json","w"), indent=1)
for f in sorted(os.listdir(OUT)):
    print(f"   {f:26s} {os.path.getsize(os.path.join(OUT,f))/1024:8.1f} KB")
