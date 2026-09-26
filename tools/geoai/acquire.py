import math, json, os, subprocess, time, sys
import numpy as np
from PIL import Image, ImageDraw

R = 6378137.0
def ll2m(lat, lon):
    return R*math.radians(lon), R*math.log(math.tan(math.pi/4 + math.radians(lat)/2))

AOIS = [
    ("sanjuan",   18.4505, -66.0630),  # dense urban Santurce
    ("bayamon",   18.3989, -66.1614),  # suburban
    ("caguas",    18.2341, -66.0356),
    ("ponce",     18.0111, -66.6141),
    ("mayaguez",  18.2013, -67.1397),
    ("carolina",  18.3950, -65.9600),
    ("arecibo",   18.4655, -66.7285),
    ("guaynabo",  18.3580, -66.1110),
]
HALF = 600        # metres -> 1200 m box
PX   = 1536       # -> 0.78 m/px
os.makedirs("data", exist_ok=True)

def fetch_img(name, bbox):
    out = f"data/{name}_img.jpg"
    if os.path.exists(out) and os.path.getsize(out) > 5000: return out
    url = ("https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/export"
           f"?bbox={bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}&bboxSR=3857&imageSR=3857"
           f"&size={PX},{PX}&format=jpg&f=image")
    subprocess.run(["curl","-s","-m","120",url,"-o",out], check=True)
    return out

def fetch_osm(name, lat, lon, dlat, dlon):
    out = f"data/{name}_osm.json"
    if os.path.exists(out) and os.path.getsize(out) > 100: return out
    q = (f'[out:json][timeout:60];('
         f'way["building"]({lat-dlat},{lon-dlon},{lat+dlat},{lon+dlon});'
         f'relation["building"]({lat-dlat},{lon-dlon},{lat+dlat},{lon+dlon});'
         f');out geom;')
    mirrors=["https://overpass-api.de/api/interpreter",
             "https://overpass.kumi.systems/api/interpreter",
             "https://overpass.osm.jp/api/interpreter"]
    import json as _j
    for attempt in range(6):
        url=mirrors[attempt % len(mirrors)]
        subprocess.run(["curl","-s","-m","180","-A","geoai-portfolio/1.0",
                        "-X","POST",url,
                        "--data-urlencode",f"data={q}","-o",out])
        try:
            _j.load(open(out)); return out
        except Exception:
            wait=8*(attempt+1)
            print(f"    overpass retry {attempt+1} for {name} (wait {wait}s)", flush=True)
            time.sleep(wait)
    raise RuntimeError("overpass failed for "+name)
    return out

def rasterize(name, bbox, osm_path):
    d = json.load(open(osm_path))
    x0,y0,x1,y1 = bbox
    mask = Image.new("L",(PX,PX),0); drw = ImageDraw.Draw(mask)
    n=0
    for el in d.get("elements",[]):
        rings=[]
        if el.get("type")=="way" and el.get("geometry"):
            rings=[el["geometry"]]
        elif el.get("type")=="relation":
            for m in el.get("members",[]):
                if m.get("role")=="outer" and m.get("geometry"): rings.append(m["geometry"])
        for g in rings:
            pts=[]
            for p in g:
                mx,my = ll2m(p["lat"], p["lon"])
                px = (mx-x0)/(x1-x0)*PX
                py = (y1-my)/(y1-y0)*PX
                pts.append((px,py))
            if len(pts)>=3:
                drw.polygon(pts, fill=255); n+=1
    mask.save(f"data/{name}_mask.png")
    return n

meta={}
for name, lat, lon in AOIS:
    cx,cy = ll2m(lat,lon)
    bbox=(cx-HALF, cy-HALF, cx+HALF, cy+HALF)
    dlat = HALF/111320.0 * 1.15
    dlon = HALF/(111320.0*math.cos(math.radians(lat))) * 1.15
    fetch_img(name,bbox)
    fetch_osm(name,lat,lon,dlat,dlon)
    nb = rasterize(name,bbox,f"data/{name}_osm.json")
    im=np.asarray(Image.open(f"data/{name}_img.jpg").convert("RGB"))
    mk=np.asarray(Image.open(f"data/{name}_mask.png"))
    cov = (mk>127).mean()*100
    meta[name]=dict(bbox=bbox, buildings=nb, coverage=round(float(cov),2), lat=lat, lon=lon)
    print(f"  {name:10s} buildings={nb:5d}  mask_cov={cov:5.2f}%  img_std={im.std():.1f}")
    time.sleep(2)
json.dump(meta, open("data/meta.json","w"), indent=1)
print("saved", len(meta), "AOIs")
