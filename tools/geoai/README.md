# Building-footprint pipeline

Reproduces the assets behind the demonstration on the site. Requires `torch`, `numpy`, `pillow`, `opencv-python`, and `scipy`.

```sh
python3 acquire.py        # USGS imagery + OSM footprints for 8 Puerto Rico AOIs
python3 train.py          # trains the U-Net, holds out Ponce and Guaynabo
GEOAI_OUT=../../assets/geoai python3 export_assets.py
python3 hero_terrain.py   # real 3DEP contours for the hero, co-registered
python3 make_og.py        # social card from the same layers
```

`acquire.py` writes into `data/`. Imagery comes from USGS The National Map (public domain); footprints come from the Overpass API (© OpenStreetMap contributors, ODbL). Both are fetched at run time and are not committed.

The split is fixed in `train.py`: six municipalities train, Ponce and Guaynabo are held out and never seen. Every figure reported on the site comes from that held-out pair.

`hero_terrain.py` requests USGS 3DEP elevation for exactly the sub-extent the hero shows (the centre crop of the Guaynabo tile) so contours and predicted footprints are in one frame. Alignment was checked empirically: mean slope under predicted buildings is 5.1 deg against 6.1 deg for the tile overall, and that fit is best at zero offset.
