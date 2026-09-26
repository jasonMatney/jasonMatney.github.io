"""Real contours for the hero, co-registered with the predicted footprints.

The hero SVG is a 650x720 viewBox showing a centre crop of the 1536px Guaynabo
tile (see export_assets.py). We request USGS 3DEP elevation for exactly that
sub-extent, so contour lines and building footprints share one coordinate frame.
"""
import json, math, os, urllib.request
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
from skimage import measure

R = 6378137.0
def ll2m(lat, lon):
    return R*math.radians(lon), R*math.log(math.tan(math.pi/4 + math.radians(lat)/2))

LAT, LON, HALF = 18.3580, -66.1110, 600      # guaynabo AOI, matches acquire.py
SRC = 1536                                    # source tile px
VB_W, VB_H = 650, 720                         # hero viewBox
OUT = "../../assets/geoai"

cx, cy = ll2m(LAT, LON)
x0, y0, x1, y1 = cx-HALF, cy-HALF, cx+HALF, cy+HALF

# the centre crop export_assets.py used
cw = int(SRC*VB_W/VB_H); cxs = (SRC-cw)//2
u0, u1 = cxs/SRC, (cxs+cw)/SRC
sx0, sx1 = x0 + u0*(x1-x0), x0 + u1*(x1-x0)

W, H = 780, 864
url = ("https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage"
       f"?bbox={sx0},{y0},{sx1},{y1}&bboxSR=3857&imageSR=3857"
       f"&size={W},{H}&format=tiff&pixelType=F32"
       "&interpolation=RSP_BilinearInterpolation&f=image")
dem = np.array(Image.open(urllib.request.urlopen(url, timeout=120))).astype("float32")
dem[~np.isfinite(dem)] = np.nanmedian(dem[np.isfinite(dem)])
print(f"DEM {dem.shape} elev {dem.min():.1f}-{dem.max():.1f} m (relief {dem.max()-dem.min():.1f} m)")

sm = gaussian_filter(dem, 2.2)
INTERVAL = 2.5
lo = math.floor(sm.min()/INTERVAL)*INTERVAL + INTERVAL
hi = sm.max()
levels = np.arange(lo, hi, INTERVAL)

def simplify(pts, tol=0.7):
    """Ramer-Douglas-Peucker."""
    if len(pts) < 3: return pts
    a, b = np.array(pts[0]), np.array(pts[-1])
    ab = b-a; n = np.hypot(*ab)
    P = np.array(pts)
    if n < 1e-9:
        d = np.hypot(*(P-a).T)
    else:
        d = np.abs(np.cross(np.tile(ab,(len(P),1)), P-a))/n
    i = int(np.argmax(d))
    if d[i] > tol:
        return simplify(pts[:i+1], tol)[:-1] + simplify(pts[i:], tol)
    return [pts[0], pts[-1]]

out = []
for z in levels:
    for c in measure.find_contours(sm, float(z)):
        if len(c) < 12: continue
        pts = [(col/(W-1)*VB_W, row/(H-1)*VB_H) for row, col in c]
        pts = simplify(pts, 0.55)
        if len(pts) < 4: continue
        closed = math.hypot(pts[0][0]-pts[-1][0], pts[0][1]-pts[-1][1]) < 1.2
        d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + (" Z" if closed else "")
        # index contours every 10 m read heavier, as on a real topo sheet
        out.append({"d": d, "i": 1 if abs(z/10.0 - round(z/10.0)) < 1e-6 else 0})

out.sort(key=lambda p: -len(p["d"]))
out = out[:1400]
meta = dict(count=len(out), interval=INTERVAL,
            min=round(float(dem.min()),1), max=round(float(dem.max()),1),
            source="USGS 3DEP", aoi="guaynabo")
json.dump(dict(**meta, paths=out), open(f"{OUT}/hero-terrain.json","w"))
print(f"  {len(out)} contour paths, {INTERVAL} m interval, "
      f"{sum(1 for p in out if p['i'])} index lines")
print(f"  {os.path.getsize(f'{OUT}/hero-terrain.json')/1024:.1f} KB")
