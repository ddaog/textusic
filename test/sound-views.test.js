import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundViews, SOUND_VIEWS, linkedWords, colorChannels } from '../src/sound-views.js';

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
test('word palette follows active stanza and the edited word, capped at two', () => {
  const words = Array.from({length:6},(_,i)=>({start:i*10,end:i*10+5,text:`word${i}`,color:`#${i}${i}${i}${i}${i}${i}`}));
  const selected = linkedWords(words,{start:20,end:60},{start:50});
  assert.equal(selected[0].start,50); assert.equal(selected.length,2);
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

const sourceWord = (text,color,start=0) => ({text,color,start,end:start+text.length,activity:1});
test('playback palette follows scheduled sources and smoothly retargets without restarting each tick', () => {
  const view = new SoundViews();
  view.setWords([sourceWord('처음','#ff0000')],null,null);
  view.setPlaybackWords([sourceWord('바다','hsl(240 100% 50%)',10)],0,1000);
  assert.equal(view.paletteAt(0)[0],'rgb(255 0 0)');
  assert.equal(view.paletteAt(500)[0],'rgb(128 0 128)');
  view.setPlaybackWords([sourceWord('바다','hsl(240 100% 50%)',10)],500,1000);
  assert.equal(view.playback.started,0);
  assert.equal(view.paletteAt(1000)[0],'rgb(0 0 255)');
  const before = view.paletteAt(600);
  view.setPlaybackWords([sourceWord('숲','#0f0',20)],600,1000);
  assert.deepEqual(view.paletteAt(600),before);
  assert.equal(view.playback.words[0].text,'숲');
  assert.equal(view.playback.outgoing[0].text,'바다');
});
test('rests fade to neutral, reduced motion switches immediately, and idle can resume', () => {
  const view=new SoundViews();
  view.setWords([sourceWord('첫','#ffffff')],null,null);
  view.setPlaybackWords([sourceWord('달','#0000ff')],0,1000,true);
  assert.equal(view.paletteAt(0)[0],'rgb(0 0 255)');
  view.setPlaybackWords([],1000,800);
  assert.equal(view.paletteAt(1800)[0],'rgb(97 123 118)');
  assert.deepEqual(view.playback.words,[]);
  view.setPlaybackWords(null,1900);
  assert.deepEqual(view.paletteAt(1900),['#ffffff']);
  assert.deepEqual(colorChannels('hsl(-120, 100%, 50%)'),[0,0,255]);
});
test('memory records the interpolated palette and preserves earlier colors', () => {
  const view=new SoundViews(), ctx=context(), spectrum={read:()=>new Float32Array(12).fill(.5)};
  view.setPlaybackWords([sourceWord('빛','#ff0000')],0,1000,true);
  view.draw(ctx,300,200,'memory',spectrum,0,true,false);
  view.setPlaybackWords([sourceWord('물','#0000ff')],100,1000);
  view.draw(ctx,300,200,'memory',spectrum,600,true,false);
  assert.equal(view.colors[0],'rgb(255 0 0)');
  assert.equal(view.colors[1],'rgb(128 0 128)');
  view.draw(ctx,300,200,'memory',spectrum,1100,true,false);
  assert.equal(view.colors[2],'rgb(0 0 255)');
  assert.equal(view.colors[0],'rgb(255 0 0)');
  assert.equal(view.playback.outgoing.length,0);
});

test('word captions fade through clear space instead of overlapping old and new text',()=>{
  const view=new SoundViews(), spectrum={read:()=>new Float32Array(12)};
  view.setPlaybackWords([sourceWord('바다','#00cccc')],0,0);
  view.setPlaybackWords([sourceWord('달빛','#bbbbff',10)],100,1000);
  for (const time of [200,400,600,800,1100]) {
    const ctx=context(); view.draw(ctx,300,200,'contour',spectrum,time,true,false);
    assert.ok(!(ctx.labels.includes('바다') && ctx.labels.includes('달빛')));
  }
  view.setPlaybackWords([sourceWord('숲','#00aa00',20)],1200,1000);
  view.setPlaybackWords([sourceWord('꽃','#ff88aa',30)],1300,1000);
  assert.equal(view.playback.outgoing[0].text,'달빛');
});
