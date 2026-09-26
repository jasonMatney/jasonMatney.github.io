import test from 'node:test';
import assert from 'node:assert/strict';
import {confusion} from '../geoai.js';

const hist = (pos, neg) => {
  const p = new Float64Array(256), n = new Float64Array(256);
  for (const [bin, count] of Object.entries(pos)) p[bin] = count;
  for (const [bin, count] of Object.entries(neg)) n[bin] = count;
  return {pos: p, neg: n};
};

test('confusion counts match a hand-computed case', () => {
  // 10 building pixels scored 200, 5 scored 100; 20 background scored 100, 30 scored 10.
  const h = hist({200: 10, 100: 5}, {100: 20, 10: 30});
  const m = confusion(h, 150);           // only the 200-bin clears the threshold
  assert.equal(m.tp, 10);
  assert.equal(m.fp, 0);
  assert.equal(m.fn, 5);
  assert.equal(m.tn, 50);
  assert.equal(m.precision, 1);
  assert.equal(m.recall, 10 / 15);
  assert.equal(m.iou, 10 / 15);
});

test('lowering the threshold trades precision for recall', () => {
  const h = hist({200: 10, 100: 5}, {100: 20, 10: 30});
  const strict = confusion(h, 150), loose = confusion(h, 50);
  assert.ok(loose.recall > strict.recall);
  assert.ok(loose.precision < strict.precision);
  assert.equal(loose.tp, 15);
  assert.equal(loose.fp, 20);
});

test('recall is monotonic as the threshold falls and totals are conserved', () => {
  const h = hist({240: 7, 180: 11, 90: 4}, {180: 3, 90: 25, 5: 60});
  const total = 7 + 11 + 4 + 3 + 25 + 60;
  let previous = -1;
  for (let t = 255; t >= 0; t -= 5) {
    const m = confusion(h, t);
    assert.ok(m.recall >= previous, `recall dropped at t=${t}`);
    previous = m.recall;
    assert.equal(m.tp + m.fp + m.fn + m.tn, total);
    assert.ok(m.iou <= m.recall + 1e-12);
  }
  assert.equal(confusion(h, 0).recall, 1);
});

test('an empty histogram degrades to zeros rather than NaN', () => {
  const m = confusion(hist({}, {}), 128);
  for (const k of ['precision', 'recall', 'iou', 'f1']) assert.equal(m[k], 0);
});
