import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundViews } from '../src/sound-views.js';

function context() {
  const points = [], labels = [];
  const noop = () => {};
  return { points, labels, save:noop, restore:noop, fillRect:noop, beginPath:noop, stroke:noop, fill:noop, closePath:noop,
    moveTo:(...p)=>points.push(p), lineTo:(...p)=>points.push(p), bezierCurveTo:(...p)=>points.push(p), arc:noop,
    fillText:t=>labels.push(t), createLinearGradient:()=>({addColorStop:noop}) };
}
test('candidate views render at narrow and compact sizes without invalid coordinates', () => {
  const view = new SoundViews();
  const spectrum = { read:()=>Float32Array.from({length:12},(_,i)=>i/12), waveform:new Uint8Array(1024).fill(128) };
  for (const mode of ['contour','scope','memory']) for (const [w,h] of [[280,142],[650,266]]) {
    const ctx = context(); view.draw(ctx,w,h,mode,spectrum,100,true,false);
    assert.ok(ctx.points.flat().every(Number.isFinite));
    assert.ok(ctx.labels.includes('LIVE / OUTPUT'));
  }
});
test('history stays bounded and reads at most 15 rows a second', () => {
  const view = new SoundViews(), ctx = context();
  const spectrum = {read:()=>new Float32Array(12).fill(.5)};
  for(let now=0;now<1000;now++) view.draw(ctx,300,200,'memory',spectrum,now,true,false);
  assert.equal(view.cursor,15); assert.equal(view.history.length,64);
  view.reset(); assert.equal(view.cursor,0); assert.ok(view.history.every(row=>row.every(v=>v===0)));
});
