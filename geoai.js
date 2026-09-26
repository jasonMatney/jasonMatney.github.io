// Building-footprint demo: real U-Net outputs over public USGS imagery.
// Probability rasters are precomputed; thresholding and every metric shown
// are computed here in the browser from the model's actual output.
const AOIS = ['ponce', 'guaynabo'];
const LAYERS = ['imagery', 'prediction', 'agreement'];

const loadImage = src => new Promise((resolve, reject) => {
  const i = new Image();
  i.onload = () => resolve(i);
  i.onerror = () => reject(new Error('could not load ' + src));
  i.src = src;
});

function readGray(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d', {willReadFrequently: true});
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const out = new Uint8Array(c.width * c.height);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) out[p] = d[i];
  return {data: out, w: c.width, h: c.height};
}

// Exact confusion counts at a threshold, from 256-bin histograms split by truth class.
export function confusion(hist, t) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (let b = 0; b < 256; b++) {
    if (b >= t) { tp += hist.pos[b]; fp += hist.neg[b]; }
    else { fn += hist.pos[b]; tn += hist.neg[b]; }
  }
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const iou = tp + fp + fn ? tp / (tp + fp + fn) : 0;
  const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
  return {tp, fp, fn, tn, precision, recall, iou, f1};
}

export async function createGeoAI({host, onReady}) {
  const $ = s => host.querySelector(s);
  const canvas = $('#geoai-canvas'), ctx = canvas.getContext('2d');
  const state = {aoi: AOIS[0], threshold: 128, layer: 'agreement', data: {}};

  async function load(aoi) {
    if (state.data[aoi]) return state.data[aoi];
    const base = `assets/geoai/${aoi}`;
    const [img, prob, truth] = await Promise.all([
      loadImage(`${base}_img.jpg`), loadImage(`${base}_prob.png`), loadImage(`${base}_truth.png`)
    ]);
    const P = readGray(prob), T = readGray(truth);
    const scratch = document.createElement('canvas');
    scratch.width = P.w; scratch.height = P.h;
    scratch.getContext('2d').drawImage(img, 0, 0, P.w, P.h);
    const rgb = scratch.getContext('2d').getImageData(0, 0, P.w, P.h);
    // histograms of probability, split by ground-truth class
    const pos = new Float64Array(256), neg = new Float64Array(256);
    for (let i = 0; i < P.data.length; i++) (T.data[i] > 127 ? pos : neg)[P.data[i]]++;
    state.data[aoi] = {rgb, prob: P, truth: T, hist: {pos, neg}, w: P.w, h: P.h};
    return state.data[aoi];
  }

  function render() {
    const d = state.data[state.aoi];
    if (!d) return;
    canvas.width = d.w; canvas.height = d.h;
    const out = ctx.createImageData(d.w, d.h);
    const src = d.rgb.data, prob = d.prob.data, truth = d.truth.data, t = state.threshold;
    for (let i = 0, p = 0; p < prob.length; i += 4, p++) {
      const r = src[i], g = src[i + 1], b = src[i + 2];
      const predicted = prob[p] >= t, actual = truth[p] > 127;
      let R = r, G = g, B = b;
      if (state.layer === 'prediction' && predicted) {
        R = r * 0.35 + 255 * 0.65; G = g * 0.35 + 176 * 0.65; B = b * 0.35 + 118 * 0.65;
      } else if (state.layer === 'agreement') {
        if (predicted && actual) { R = r * 0.4 + 126 * 0.6; G = g * 0.4 + 214 * 0.6; B = b * 0.4 + 148 * 0.6; }
        else if (predicted && !actual) { R = r * 0.35 + 244 * 0.65; G = g * 0.35 + 150 * 0.65; B = b * 0.35 + 90 * 0.65; }
        else if (!predicted && actual) { R = r * 0.4 + 126 * 0.6; G = g * 0.4 + 160 * 0.6; B = b * 0.4 + 232 * 0.6; }
      }
      out.data[i] = R; out.data[i + 1] = G; out.data[i + 2] = B; out.data[i + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
    readout();
  }

  function readout() {
    const d = state.data[state.aoi];
    const m = confusion(d.hist, state.threshold);
    const pct = v => `${(v * 100).toFixed(1)}%`;
    $('#geoai-precision').textContent = pct(m.precision);
    $('#geoai-recall').textContent = pct(m.recall);
    $('#geoai-iou').textContent = pct(m.iou);
    $('#geoai-threshold-value').textContent = (state.threshold / 255).toFixed(2);
    $('#geoai-readout-note').textContent =
      `At this threshold the model calls ${pct(m.recall)} of mapped building pixels correctly, ` +
      `and ${pct(1 - m.precision)} of what it flags is not mapped as a building.`;
  }

  async function setAOI(aoi) {
    state.aoi = aoi;
    host.dataset.loading = 'true';
    await load(aoi);
    host.dataset.loading = 'false';
    for (const b of host.querySelectorAll('[data-aoi]'))
      b.setAttribute('aria-pressed', String(b.dataset.aoi === aoi));
    render();
  }

  for (const b of host.querySelectorAll('[data-aoi]'))
    b.addEventListener('click', () => setAOI(b.dataset.aoi));
  for (const b of host.querySelectorAll('[data-layer]'))
    b.addEventListener('click', () => {
      state.layer = b.dataset.layer;
      for (const o of host.querySelectorAll('[data-layer]'))
        o.setAttribute('aria-pressed', String(o.dataset.layer === state.layer));
      render();
    });
  $('#geoai-threshold').addEventListener('input', e => {
    state.threshold = Number(e.target.value);
    render();
  });

  await setAOI(AOIS[0]);
  onReady?.();
  return {setAOI};
}
