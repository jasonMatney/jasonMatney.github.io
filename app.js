const $ = s => document.querySelector(s);
const ns = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, text) {
  const n = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text) n.textContent = text;
  return n;
}

// Survey-style contour rings; purely decorative cover cartography.
function contours(svg, cx, cy, sx, sy, count, color, opacity) {
  const g = el('g', {fill: 'none', stroke: color, 'stroke-width': .75, opacity});
  for (let ring = 1; ring <= count; ring++) {
    let d = '';
    for (let step = 0; step <= 100; step++) {
      const t = step / 100 * Math.PI * 2;
      const radius = ring / count;
      const wobble = 1 + .14 * Math.sin(3 * t + radius * 3) + .09 * Math.cos(7 * t - radius * 4) + .04 * Math.sin(13 * t);
      const x = cx + Math.cos(t) * sx * radius * wobble, y = cy + Math.sin(t) * sy * radius * wobble;
      d += `${step ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)} `;
    }
    g.append(el('path', {d: d + 'Z'}));
  }
  svg.append(g);
}

const hero = $('#hero-map');
if (hero) {
  const grid = el('g', {stroke: '#a6b29a', 'stroke-width': .6, opacity: .3});
  for (let x = 20; x < 650; x += 90) grid.append(el('path', {d: `M${x} 0V720`}));
  for (let y = 25; y < 720; y += 90) grid.append(el('path', {d: `M0 ${y}H650`}));
  hero.append(grid);
  contours(hero, 435, 200, 290, 250, 29, '#8b9b7f', .6);
  contours(hero, 200, 550, 210, 210, 22, '#8b9b7f', .6);
  contours(hero, 660, 690, 220, 235, 20, '#8b9b7f', .45);
  hero.append(el('path', {d: 'M115 -20 Q420 160 310 330 T400 760', stroke: '#a9b9a2', 'stroke-width': 35, fill: 'none', opacity: .3}));

  // Real building footprints predicted by the U-Net on held-out imagery.
  fetch('assets/geoai/hero-footprints.json')
    .then(r => r.ok ? r.json() : Promise.reject(new Error('no footprints')))
    .then(fp => {
      const layer = el('g', {fill: 'none', stroke: '#b76138', 'stroke-width': 1.1, opacity: .85});
      for (const d of fp.paths) layer.append(el('path', {d}));
      hero.append(layer);
      const note = $('#hero-footprint-note');
      if (note) note.textContent = `${fp.count} building footprints, predicted`;
    })
    .catch(() => {});
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
