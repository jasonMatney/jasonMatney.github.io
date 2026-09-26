# Building-footprint pipeline

Reproduces the assets behind the demonstration on the site. Requires `torch`, `numpy`, `pillow`, `opencv-python`, and `scipy`.

```sh
python3 acquire.py        # USGS imagery + OSM footprints for 8 Puerto Rico AOIs
python3 train.py          # trains the U-Net, holds out Ponce and Guaynabo
GEOAI_OUT=../../assets/geoai python3 export_assets.py
```

`acquire.py` writes into `data/`. Imagery comes from USGS The National Map (public domain); footprints come from the Overpass API (© OpenStreetMap contributors, ODbL). Both are fetched at run time and are not committed.

The split is fixed in `train.py`: six municipalities train, Ponce and Guaynabo are held out and never seen. Every figure reported on the site comes from that held-out pair.
