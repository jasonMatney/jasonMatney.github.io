import json, os, subprocess, sys
SITE = "/Users/jasonmatney/Documents/ChatGPT/Personal Website"
OUT  = f"{SITE}/assets"
fp   = json.load(open(f"{SITE}/assets/geoai/hero-footprints.json"))
paths = fp["paths"][:700]

# real USGS 3DEP contours for the same extent as the footprints (650x720 frame)
terr = json.load(open(f"{SITE}/assets/geoai/hero-terrain.json"))
svg_base  = "".join(f'<path d="{p["d"]}"/>' for p in terr["paths"] if not p["i"])
svg_index = "".join(f'<path d="{p["d"]}"/>' for p in terr["paths"] if p["i"])
svg_fp    = "".join(f'<path d="{d}"/>' for d in paths)

html = f"""<!doctype html><html><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap');
*{{box-sizing:border-box;margin:0}}
body{{width:1200px;height:630px;background:#f3f1e9;color:#193b34;
  font-family:'DM Sans',Arial,sans-serif;display:flex;overflow:hidden}}
.left{{flex:1;padding:70px 0 64px 76px;display:flex;flex-direction:column;justify-content:space-between;z-index:2}}
.eyebrow{{font-size:13px;letter-spacing:2.6px;text-transform:uppercase;color:#b64e25;font-weight:500}}
h1{{font-family:'Source Serif 4',Georgia,serif;font-weight:400;font-size:62px;line-height:1.04;letter-spacing:-.5px;margin-top:22px}}
h1 em{{font-style:italic;color:#4a6555;display:block}}
.meta{{font-size:17px;line-height:1.65;color:#4f5c50}}
.rule{{width:74px;height:2px;background:#b64e25;margin:26px 0 20px}}
.name{{font-family:'Source Serif 4',Georgia,serif;font-size:21px}}
.name span{{color:#7d8a7c}}
.right{{position:absolute;right:0;top:0;width:560px;height:630px;overflow:hidden}}
svg{{position:absolute;right:-40px;top:-30px}}
.base{{fill:none;stroke:#9aab8d;stroke-width:.7;opacity:.6;stroke-linejoin:round}}.index{{fill:none;stroke:#8b9d80;stroke-width:1.1;opacity:.75;stroke-linejoin:round}}
.fps{{fill:none;stroke:#b76138;stroke-width:1.15;opacity:.9}}
.fade{{position:absolute;inset:0;background:linear-gradient(90deg,#f3f1e9 0%,rgba(243,241,233,.55) 34%,rgba(243,241,233,0) 72%)}}
</style></head><body>
<div class="left">
  <div>
    <p class="eyebrow">Geospatial AI / Computer vision</p>
    <h1>Geospatial computer vision,<em>research to production.</em></h1>
  </div>
  <div>
    <div class="rule"></div>
    <p class="name">Jason Matney<span>, Ph.D.</span></p>
    <p class="meta">Island-scale feature extraction · Production ML pipelines<br>Washington, DC · Active TS clearance</p>
  </div>
</div>
<div class="right">
  <svg width="700" height="700" viewBox="0 0 600 640">
    <g class="base">{svg_base}</g><g class="index">{svg_index}</g>
    <g class="fps">{svg_fp}</g>
  </svg>
  <div class="fade"></div>
</div>
</body></html>"""
open("og.html","w").write(html)

chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
subprocess.run([chrome,"--headless","--disable-gpu","--no-sandbox",
                "--force-device-scale-factor=1","--hide-scrollbars",
                "--window-size=1200,630",
                f"--screenshot={OUT}/og-card.png",
                "--virtual-time-budget=6000",
                f"file://{os.path.abspath('og.html')}"],
               capture_output=True)
from PIL import Image
im=Image.open(f"{OUT}/og-card.png"); print("og-card.png:",im.size, os.path.getsize(f'{OUT}/og-card.png')//1024,"KB")
im.convert("RGB").save(f"{OUT}/og-card.jpg",quality=88,optimize=True)
print("og-card.jpg:",os.path.getsize(f'{OUT}/og-card.jpg')//1024,"KB")
