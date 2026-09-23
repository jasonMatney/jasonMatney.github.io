# Jason Matney — personal website

An editorial atlas portfolio with an independent, synthetic road-access demonstration. Hosted at https://jasonmatney.github.io/ through GitHub Pages from `main`.

## Run locally

Serve the repository with any static HTTP server, for example `python3 -m http.server 8000`. JavaScript modules require HTTP rather than opening the file directly.

Run the network checks with `node --test tests/network.test.mjs`.

## Contents

- `index.html`: public biography, experience, contact, and accessible demonstration controls.
- `styles.css`: responsive editorial design, reduced-motion support, and typography fallbacks.
- `app.js`: cover cartography, analysis controls, lazy scene loading, SVG fallback, and accessible result updates.
- `experience.js`: original Three.js landscape, camera controls, settlement selection, and live route rendering.
- `vendor/three/`: pinned Three.js 0.186.0, OrbitControls, and MIT license.
- `network.mjs`: synthetic graph and shortest-path analysis.
- `tests/network.test.mjs`: route validity, known results, and coverage invariants.

## Content boundaries

The map uses fictional places, populations, geometry, and fixed travel times. It is an original personal demonstration, not a federal deliverable or operational model. It does not use client source code or data. Professional experience is described at a high level. The Military OneSource link points to a public resource; its illustration is typographic, not an agency screenshot. No new performance or contract-value claims are introduced.

The local `design/` folder contains the ImageGen visual reference and prompt; it is not required to serve the site. The actual site uses editable SVG and HTML, not a raster mockup.

The 3D scene is loaded near the viewport and pauses rendering while offscreen. Its loading surface keeps the older SVG scene from flashing during the Three.js handoff. Rotation is opt-in on mobile; camera zoom, top view, and reset are explicit controls. The SVG map and travel-time table remain available when WebGL cannot initialize. Procedural terrain is illustrative and does not affect the fixed synthetic travel times. Portrait screens frame the active crossing more closely; the top-view control shows the wider network.

Cinematic controls: Rotate scene starts a slow continuous orbit; dragging the scene or using a camera control stops it. Watch the story plays a 22-second, four-chapter journey from Willow Bend: the normal route, bridge closure, westward detour, and change in population coverage. Playback can be paused, resumed, replayed, or entered at any chapter. Starting the story sets Willow Bend and a 15-minute access target; manual scenario controls stop playback. Camera changes ease from the current position; zoom is damped. Reroutes reveal over 1.25 seconds with a short fade of the previous route. The traveling light follows arc length at a consistent visual speed; it is not a travel-time simulation. Reduced-motion preference disables the automated story, moving highlights, and water motion; manual analysis and the table remain available.
