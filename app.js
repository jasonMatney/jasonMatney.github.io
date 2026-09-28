const $ = s => document.querySelector(s);
const ns = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, text) {
  const n = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text) n.textContent = text;
  return n;
}

const hero = $('#hero-map');
if (hero) {
  // Terrain and footprints are the same 1.1 x 1.2 km of Guaynabo, Puerto Rico,
  // so the contours and the predicted buildings sit in one coordinate frame.
  const grid = el('g', {stroke: '#a6b29a', 'stroke-width': .5, opacity: .22});
  for (let x = 20; x < 650; x += 90) grid.append(el('path', {d: `M${x} 0V720`}));
  for (let y = 25; y < 720; y += 90) grid.append(el('path', {d: `M0 ${y}H650`}));
  hero.append(grid);

  const load = p => fetch(p).then(r => r.ok ? r.json() : Promise.reject(new Error(p)));

  // Terrain first so footprints draw over it.
  load('assets/geoai/hero-terrain.json').then(t => {
    const base = el('g', {fill: 'none', stroke: '#9aab8d', 'stroke-linejoin': 'round', 'stroke-linecap': 'round'});
    const index = el('g', {fill: 'none', stroke: '#8b9d80', 'stroke-linejoin': 'round', 'stroke-linecap': 'round'});
    base.setAttribute('stroke-width', .65); base.setAttribute('opacity', .6);
    index.setAttribute('stroke-width', 1.05); index.setAttribute('opacity', .75);
    for (const p of t.paths) (p.i ? index : base).append(el('path', {d: p.d}));
    hero.append(base, index);
    const src = $('#hero-terrain-note');
    if (src) src.textContent = `USGS 3DEP · ${t.interval} m contours · ${Math.round(t.min)}–${Math.round(t.max)} m`;
  }).catch(() => {});

  // Real building footprints predicted by SAM 3.1 on held-out imagery.
  load('assets/geoai/hero-footprints.json').then(fp => {
    const layer = el('g', {fill: '#b76138', 'fill-opacity': .1, stroke: '#b76138', 'stroke-width': 1.1, 'stroke-linejoin': 'round', opacity: .92});
    for (const d of fp.paths) layer.append(el('path', {d}));
    hero.append(layer);
    const note = $('#hero-footprint-note');
    if (note) note.textContent = `${fp.count} building footprints, predicted`;
  }).catch(() => {});
}

// The demo is heavy; only fetch it once the section is near the viewport.
const explore = $('#geoai');
if (explore) {
  const observer = new IntersectionObserver(async entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    observer.disconnect();
    try {
      const {createGeoAI} = await import('./geoai.js');
      await createGeoAI({host: explore});
    } catch (error) {
      console.warn('Model viewer unavailable.', error);
      explore.dataset.loading = 'false';
      const note = $('#geoai-readout-note');
      if (note) note.textContent = 'The interactive viewer could not load. The method and results are described below.';
    }
  }, {rootMargin: '300px'});
  observer.observe(explore);
}

const year = $('#year');
if (year) year.textContent = new Date().getFullYear();
