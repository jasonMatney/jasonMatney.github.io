# Building-footprint pipeline

Reproduces the assets behind the demonstration on the site.

## SAM 3.1 (what the site shows)

SAM 3.1 is an 840M-parameter model, too big for an 8 GB laptop, so it runs in Colab. Open `sam31_colab.ipynb` on a GPU runtime, add a Hugging Face token with access to the gated `facebook/sam3.1` repo as the secret `HF_TOKEN`, and run all. It:

1. fetches imagery and labels for Bayamón, Ponce and Guaynabo (`acquire.py`),
2. loads the SAM 3.1 detector into transformers' `Sam3Model` (`sam_infer.py`, using the key mapping in `convert_sam3_to_hf.py` from transformers),
3. picks the text prompt on Bayamón only,
4. runs Ponce and Guaynabo with that prompt, and
5. writes the site assets (`export_assets.py`) and downloads them as `geoai_assets.zip`.

Unzip that over `assets/geoai/`, then locally:

```sh
python3 hero_terrain.py   # real 3DEP contours for the hero, co-registered
python3 make_og.py        # social card from the same layers
```

The notebook embeds copies of the scripts, so regenerate it if you change them.

## U-Net baseline

`train.py` trains the compact U-Net the site used before (six municipalities train, Ponce and Guaynabo held out). It scored 0.50 and 0.59 IoU on the held-out pair and is kept as the comparison quoted on the site. `python3 acquire.py` with no arguments fetches all eight areas it needs.

## Sources

Imagery comes from USGS The National Map (public domain); footprints come from the Overpass API (© OpenStreetMap contributors, ODbL). Both are fetched at run time and are not committed.

`hero_terrain.py` requests USGS 3DEP elevation for exactly the sub-extent the hero shows (the centre crop of the Guaynabo tile) so contours and predicted footprints are in one frame. `export_assets.py` always draws the hero from Guaynabo for that reason.
