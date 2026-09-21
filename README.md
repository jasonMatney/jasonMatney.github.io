# Jason Matney — personal website

An editorial atlas portfolio with an independent, synthetic road-access demonstration. Hosted at https://jasonmatney.github.io/ through GitHub Pages from `main`.

## Run locally

Serve the repository with any static HTTP server, for example `python3 -m http.server 8000`. JavaScript modules require HTTP rather than opening the file directly.

Run the network checks with `node --test tests/network.test.mjs`.

## Contents

- `index.html`: public biography, experience, contact, and accessible demonstration controls.
- `styles.css`: responsive editorial design, reduced-motion support, and typography fallbacks.
- `app.js`: original SVG cartography, controls, and accessible result updates.
- `network.mjs`: synthetic graph and shortest-path analysis.
- `tests/network.test.mjs`: route validity, known results, and coverage invariants.

## Content boundaries

The map uses fictional places, populations, geometry, and fixed travel times. It is an original personal demonstration, not a federal deliverable or operational model. It does not use client source code or data. Professional experience is described at a high level. The Military OneSource link points to a public resource; its illustration is typographic, not an agency screenshot. No new performance or contract-value claims are introduced.

The local `design/` folder contains the ImageGen visual reference and prompt; it is not required to serve the site. The actual site uses editable SVG and HTML, not a raster mockup.
