import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundViews, SOUND_VIEWS, linkedWords } from '../src/sound-views.js';

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
test('word palette follows active stanza and the edited word, capped at three', () => {
  const words = Array.from({length:6},(_,i)=>({start:i*10,end:i*10+5,text:`word${i}`,color:`#${i}${i}${i}${i}${i}${i}`}));
  const selected = linkedWords(words,{start:20,end:60},{start:50});
  assert.equal(selected[0].start,50); assert.equal(selected.length,3);
  assert.ok(selected.every(w=>w.start>=20));
  assert.ok(!linkedWords(words,{start:20,end:60},{start:0}).some(w=>w.start===0));
  assert.deepEqual(SOUND_VIEWS,['contour','scope','memory']);
});
test('memory preserves historical word color rather than recoloring past sound', () => {
  const view = new SoundViews(), ctx=context(), spectrum={read:()=>new Float32Array(12).fill(.5)};
  view.setWords([{start:0,end:1,text:'빛',color:'#ffcc00'}],null,null);
  view.draw(ctx,300,200,'memory',spectrum,0,true,false);
  view.setWords([{start:0,end:1,text:'물',color:'#00cccc'}],null,null);
  view.draw(ctx,300,200,'memory',spectrum,100,true,false);
  assert.equal(view.colors[0],'#ffcc00'); assert.equal(view.colors[1],'#00cccc');
});
