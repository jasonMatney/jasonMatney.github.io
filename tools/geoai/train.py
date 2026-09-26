import json, math, os, time
import numpy as np, torch, torch.nn as nn, torch.nn.functional as F
from PIL import Image

torch.manual_seed(0); np.random.seed(0)
DEV = "mps" if torch.backends.mps.is_available() else "cpu"
TILE, STRIDE = 256, 128
TRAIN = ["sanjuan","bayamon","caguas","mayaguez","carolina","arecibo"]
TEST  = ["ponce","guaynabo"]

def load(name):
    img = np.asarray(Image.open(f"data/{name}_img.jpg").convert("RGB"), np.float32)/255.
    msk = (np.asarray(Image.open(f"data/{name}_mask.png"))>127).astype(np.float32)
    return img, msk

def tiles(img, msk, stride=STRIDE):
    H,W = msk.shape; out=[]
    for y in range(0,H-TILE+1,stride):
        for x in range(0,W-TILE+1,stride):
            out.append((img[y:y+TILE,x:x+TILE], msk[y:y+TILE,x:x+TILE]))
    return out

print("loading…", flush=True)
tr=[]; 
for n in TRAIN: 
    i,m = load(n); tr += tiles(i,m)
te=[]
for n in TEST:
    i,m = load(n); te += tiles(i,m,TILE)
print(f"train tiles {len(tr)}  test tiles {len(te)}  device {DEV}", flush=True)

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
        u=F.interpolate(c4,scale_factor=2,mode='bilinear',align_corners=False)
        u=s.u3(torch.cat([u,c3],1))
        u=F.interpolate(u,scale_factor=2,mode='bilinear',align_corners=False)
        u=s.u2(torch.cat([u,c2],1))
        u=F.interpolate(u,scale_factor=2,mode='bilinear',align_corners=False)
        u=s.u1(torch.cat([u,c1],1))
        return s.out(u)

net=UNet().to(DEV)
print("params:", sum(p.numel() for p in net.parameters())/1e6, "M", flush=True)
opt=torch.optim.AdamW(net.parameters(), lr=3e-4, weight_decay=1e-4)
EPOCHS=28; BS=8
sched=torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=1.2e-3, total_steps=EPOCHS*math.ceil(len(tr)/BS))

def dice_loss(logit,y,eps=1.):
    p=torch.sigmoid(logit)
    num=2*(p*y).sum((1,2,3))+eps; den=p.sum((1,2,3))+y.sum((1,2,3))+eps
    return (1-num/den).mean()

t0=time.time()
for ep in range(EPOCHS):
    net.train(); idx=np.random.permutation(len(tr)); tot=0
    for k in range(0,len(idx),BS):
        b=[tr[j] for j in idx[k:k+BS]]
        X=np.stack([q[0] for q in b]); Y=np.stack([q[1] for q in b])[:,None]
        # augment: flips + rot90
        if np.random.rand()<.5: X=X[:,:,::-1]; Y=Y[:,:,:,::-1]
        if np.random.rand()<.5: X=X[:,::-1]; Y=Y[:,:,::-1]
        r=np.random.randint(4)
        if r: X=np.rot90(X,r,(1,2)); Y=np.rot90(Y,r,(2,3))
        X=torch.from_numpy(np.ascontiguousarray(X.transpose(0,3,1,2))).to(DEV)
        Y=torch.from_numpy(np.ascontiguousarray(Y)).to(DEV)
        logit=net(X); loss=F.binary_cross_entropy_with_logits(logit,Y)+dice_loss(logit,Y)
        opt.zero_grad(); loss.backward(); opt.step(); sched.step(); tot+=loss.item()
    if ep%4==0 or ep==EPOCHS-1:
        print(f"  epoch {ep:3d}  loss {tot/max(1,len(idx)//BS):.4f}  {time.time()-t0:.0f}s", flush=True)

torch.save(net.state_dict(),"unet.pt")
# ---- evaluate on held-out AOIs ----
net.eval(); P=[];G=[]
with torch.no_grad():
    for img,msk in te:
        X=torch.from_numpy(img.transpose(2,0,1)[None]).to(DEV)
        p=torch.sigmoid(net(X))[0,0].cpu().numpy()
        P.append(p); G.append(msk)
P=np.concatenate([p.ravel() for p in P]); G=np.concatenate([g.ravel() for g in G])
rows=[]
for t in np.arange(0.05,0.96,0.05):
    pr=P>=t; tp=(pr&(G>0.5)).sum(); fp=(pr&(G<0.5)).sum(); fn=((~pr)&(G>0.5)).sum()
    prec=tp/max(tp+fp,1); rec=tp/max(tp+fn,1); iou=tp/max(tp+fp+fn,1)
    f1=2*prec*rec/max(prec+rec,1e-9)
    rows.append(dict(t=round(float(t),2),precision=round(float(prec),4),recall=round(float(rec),4),
                     iou=round(float(iou),4),f1=round(float(f1),4)))
best=max(rows,key=lambda r:r["iou"])
print("\n  thr   prec   rec    IoU    F1")
for r in rows[::2]: print(f"  {r['t']:.2f}  {r['precision']:.3f}  {r['recall']:.3f}  {r['iou']:.3f}  {r['f1']:.3f}")
print("\nBEST:",best)
json.dump(dict(rows=rows,best=best,train_aois=TRAIN,test_aois=TEST,
               tiles=dict(train=len(tr),test=len(te))), open("metrics.json","w"), indent=1)
