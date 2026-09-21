# Validation — September 21, 2026

- Preserved network tests: three passing checks cover known shortest paths, valid route edges, population coverage, and monotonic access.
- Desktop visual review: inspected perspective and top views; repaired coplanar road flicker and increased route contrast. Added terrain and settlement shadows.
- Mobile visual review at 390 × 844: compact cover, no document overflow, camera buttons and analysis controls usable. Adjusted top-view distance to keep the whole tile visible. Rotation starts disabled on narrow screens.
- Browser interaction: community selection, bridge closure, camera reset, top view, and zoom exercised. A closed bridge changes Willow Bend from D-E-H (13 min) to D-B-W (17 min), with 15-minute coverage falling from 57% to 41%.
- Approximate cover height: desktop 452 px versus the old 680 px minimum; mobile 489 px versus the old 780 px minimum.
- Browser rendering sample: roughly 191 render calls, 40,000 triangles, and a 16.7 ms average animation interval in the Codex browser during interaction. Pixel ratio capped at 1.5; shadows 1024 px. These are local browser observations, not a hardware GPU benchmark or a guarantee for mobile devices.
- WebGL initialization/context-loss fallback is implemented; actual GPU context loss was not induced during browser QA.

## Cinematic motion update

Added eased, interruptible camera transitions; damped zoom; three-shot flyover; route draw-on and crossfade; an arc-length route marker; and animated water normals. Fixed a visibility-observer issue that could leave an onscreen scene paused. Cached static shadows reduce the observed steady-state render count from about 191 to 119; local browser animation intervals measured 16.7 ms during the flyover (not a hardware/mobile benchmark).
