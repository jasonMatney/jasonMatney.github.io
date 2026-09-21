# Cedar Bay: interactive atlas

Preserve the warm-paper cover, forest-green explorer, original fictional road graph, all coverage calculations, disclosure of synthetic inputs, and accessible travel-time table.

The visual target is a small, explorable landscape model: sage terrain, teal river, cream settlements, dark roads, and an amber selected route. Perspective reveals relief and network crossings; the top view supports direct comparison. Labels remain HTML controls. The camera has bounded tilt and zoom. On touch devices, rotation is opt-in so the page remains scrollable.

Three.js 0.186.0 and OrbitControls are vendored with their MIT license. Terrain, roads, and settlements remain editable procedural source in experience.js. No agency assets or private data are included. The moving point indicates the route, not measured vehicle speed.

Rendering budget: one terrain tile, instanced trees, one shadow light at 1024 px, capped 1.5 device pixel ratio. Rendering pauses offscreen and in hidden tabs. Reduced motion disables route travel. A failed WebGL initialization retains the SVG map and analysis controls.

Cover: remove the 680 px desktop / 780 px mobile minimums, reduce header and section padding, and fold the mobile contour artwork into the cover background.
