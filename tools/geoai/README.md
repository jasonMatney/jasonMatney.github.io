# Building-footprint pipeline

Reproduces the assets behind the demonstration on the site.

## SAM 3.1, fine-tuned (what the site shows)

SAM 3.1 is an 840M-parameter model, too big for an 8 GB laptop, so it runs in Colab. Both notebooks need a GPU runtime and a Hugging Face token with access to the gated `facebook/sam3.1` repo, stored as the Colab secret `HF_TOKEN`.

`sam31_finetune_colab.ipynb` (A100 or L4; about 15 minutes on an A100) produces the published assets:

1. fetches all eight areas (`acquire.py`),
2. loads the SAM 3.1 detector into transformers' `Sam3Model` (`sam_infer.py`, using the key mapping in `convert_sam3_to_hf.py` from transformers),
3. trains the heads on five towns and keeps the checkpoint that does best on Bayamón (`ft_sam.py`),
4. scores Ponce and Guaynabo, and
5. writes the site assets (`export_assets.py`) and downloads them as `geoai_assets_ft.zip`.

`sam31_colab.ipynb` is the zero-shot run that chose the prompt "house" on Bayamón. It scored 0.538 and 0.552 on the held-out pair, against 0.581 and 0.616 fine-tuned.

Unzip the result over `assets/geoai/`, then locally:

```sh
python3 hero_terrain.py   # real 3DEP contours for the hero, co-registered
python3 make_og.py        # social card from the same layers
```

The notebooks embed copies of the scripts, so regenerate them if you change the scripts.

## U-Net baseline

`train.py` trains the compact U-Net the site used before (six municipalities train, Ponce and Guaynabo held out). It scored 0.50 and 0.59 IoU on the held-out pair and is kept as the comparison quoted on the site. `python3 acquire.py` with no arguments fetches all eight areas it needs.

## Sources

Imagery comes from USGS The National Map (public domain); footprints come from the Overpass API (© OpenStreetMap contributors, ODbL). Both are fetched at run time and are not committed.

`hero_terrain.py` requests USGS 3DEP elevation for exactly the sub-extent the hero shows (the centre crop of the Guaynabo tile) so contours and predicted footprints are in one frame. `export_assets.py` always draws the hero from Guaynabo for that reason.
