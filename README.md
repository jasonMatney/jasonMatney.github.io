# Jason Matney — personal website

Applied geospatial AI portfolio with an independent building-footprint segmentation demonstration. Hosted at https://jasonmatney.github.io/ through GitHub Pages from `main`.

## Run locally

Open `index.html` directly or serve the repository with any static HTTP server, for example `python3 -m http.server 8000`. The checked-in classic script bundle makes the interactive demo work from a local file as well as GitHub Pages.

## Contents

- `index.html`: positioning, selected work, rapid-prototype record, public reporting, the segmentation demonstration, and contact.
- `styles.css`: responsive editorial design, reduced-motion support, and typography fallbacks.
- `app.js`: hero terrain and footprint overlay, and lazy loading of the demonstration.
- `app.bundle.js`: single classic-script build of `app.js`, `geoai.js`, and their dependencies for direct-file compatibility.
- `geoai.js`: the interactive viewer — thresholding, overlay compositing, and live precision/recall/IoU.
- `assets/geoai/`: held-out imagery, model probability rasters, label rasters, and the metric sweep.
- `assets/*dashboard.jpg`: September 2026 captures of the public Military OneSource and SAMHSA dashboards, each linked to its source and labeled with the scope of Jason's role.
- `tools/geoai/`: the acquisition, training, export, and hero-terrain scripts that produced the demonstration assets.

After changing `app.js`, `geoai.js`, or their dependencies, rebuild `app.bundle.js` with:

```sh
npx --yes esbuild@0.25.12 app.js --bundle --format=iife --platform=browser --target=es2020 --minify --outfile=app.bundle.js
```

Bump the `?v=` token on the `styles.css` and `app.bundle.js` tags in `index.html` whenever either file changes, or returning visitors will be served a stale copy against new markup.

## The segmentation demonstration

Meta's SAM 3.1, run zero-shot with a text prompt, segmenting building footprints from aerial imagery. Nothing is trained on this imagery.

- **Imagery** — USGS The National Map orthoimagery, public domain, at roughly 0.78 m/px, in areas of about 1.2 km across Puerto Rico.
- **Labels** — OpenStreetMap building footprints (© OpenStreetMap contributors, ODbL), rasterised to the imagery grid.
- **Prompt selection** — "building", "roof" and "house" were compared on Bayamón only. "house" won (0.58 IoU vs 0.55 and 0.48). Ponce and Guaynabo were not used for any choice, and every reported number comes from them.
- **Inference** — each tile is cut into overlapping 384 px windows (about 300 m), and each pixel keeps the highest mask probability × instance confidence of any detection over it. Windows are blended with a cosine feather.
- **Result** — best IoU 0.538 in Ponce and 0.552 in Guaynabo. The compact U-Net the demo previously used, trained from scratch on six other municipalities, scored 0.50 and 0.59 on the same two areas.
- **In the browser** — probability rasters are precomputed and shipped as 8-bit PNGs. Thresholding and every metric in the panel are computed client-side from the model's actual output against the held-out labels. Nothing in the readout is hard-coded.

SAM 3.1 needs a GPU with more memory than a typical laptop has, so inference runs in Colab: open `tools/geoai/sam31_colab.ipynb` and run all. It downloads a zip to unpack over `assets/geoai/`. `hero_terrain.py` fetches USGS 3DEP elevation for the same extent as the hero footprints and writes real 2.5 m contours, so the terrain and the predicted buildings share one coordinate frame. `make_og.py` builds the social card from those same layers.

### Honest limits

The labels are OpenStreetMap, not ground truth. Where the map is incomplete a correct detection scores as a false positive, so the "model only" areas mix genuine error with buildings nobody has mapped. SAM's confidence also runs low on overhead imagery (best thresholds 0.15–0.25), so the slider opens at 0.20. A production system would need higher-resolution and multi-season imagery plus human verification of the labels before informing any real decision.

## Content boundaries

The demonstration is original independent work on public data. It uses no client source code, no client data, and no federal deliverable, and it is not a model or result from any program Jason has worked on.

Professional experience is described at the level stated in the public résumé included in this repository, which the site links for download — including program scale, named rapid prototypes, and the flood-risk pipeline improvement. Nothing on the site asserts a performance figure or contract value that the résumé does not already state.

The Military OneSource and 988 images are captures of public dashboards; the page links to the source sites and separates current public content from past roles.
