import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundViews, SOUND_VIEWS, colorChannels } from '../src/sound-views.js';

function context() {
  const points = [], labels = [], rects = [], strokes = [];
  const noop = () => {};
  return { points, labels, rects, strokes, save:noop, restore:noop, beginPath:noop, fill:noop, closePath:noop,
    stroke() { strokes.push({color:this.strokeStyle,width:this.lineWidth}); },
    fillRect(x,y,w,h) {rects.push({x,y,w,h,color:this.fillStyle,alpha:this.globalAlpha});},
    moveTo:(...p)=>points.push(p), lineTo:(...p)=>points.push(p), bezierCurveTo:(...p)=>points.push(p), arc:noop,
    fillText:t=>labels.push(t), createLinearGradient:()=>({addColorStop:noop}) };
}
const sourceWord = (band,text,color,start=0) => ({band,text,color,start,end:start+text.length,activity:1});
const red = sourceWord('low','바다','#ff0000');
const green = sourceWord('mid','숲','#00ff00',10);
const blue = sourceWord('high','빛','#0000ff',20);
const spectrum = {read:()=>new Float32Array(12).fill(.5),waveform:new Uint8Array(1024).fill(140)};
const neutral = ['#617b76','#617b76','#617b76'];
const rgb = ['rgb(255 0 0)','rgb(0 255 0)','rgb(0 0 255)'];

test('three role views render finite geometry at mobile and desktop sizes', () => {
  const view = new SoundViews();
  view.setPlaybackWords([red,green,blue],0,0);
  for (const mode of SOUND_VIEWS) for (const [w,h] of [[280,142],[650,266]]) {
    const ctx = context(); view.draw(ctx,w,h,mode,spectrum,100,true,false);
    assert.ok(ctx.points.flat().every(Number.isFinite));
    assert.ok(ctx.labels.includes('LIVE / OUTPUT'));
    assert.ok(['LOW','MID','HIGH'].every(label=>ctx.labels.includes(label)));
  }
});

test('history stays bounded at 64 by 3 colors and reads at most 15 rows a second', () => {
  const view = new SoundViews(), ctx = context();
  for(let now=0;now<1000;now++) view.draw(ctx,300,200,'memory',spectrum,now,true,false);
  assert.equal(view.cursor,15);
  assert.equal(view.history.length,64);
  assert.equal(view.colors.length,64);
  assert.ok(view.colors.every(colors=>colors.length===3));
  view.reset();
  assert.equal(view.cursor,0);
  assert.ok(view.history.every(row=>row.every(v=>v===0)));
  assert.ok(view.colors.every(colors=>colors.every(v=>v==='#617b76')));
});

test('idle text cannot invent instrument assignments, and missing roles remain neutral', () => {
  const view = new SoundViews();
  view.setWords([red,green,blue],null,{start:0});
  assert.deepEqual(view.paletteAt(0),neutral);
  const ctx=context(); view.draw(ctx,300,200,'contour',spectrum,0,false,false);
  assert.ok(!ctx.labels.includes('바다'));
  view.setPlaybackWords([blue],0,0);
  assert.deepEqual(view.paletteAt(0),['rgb(97 123 118)','rgb(97 123 118)',rgb[2]]);
  assert.deepEqual(view.playback.words.map(word=>word?.band??null),[null,null,'high']);
  view.setPlaybackWords(null,100);
  assert.deepEqual(view.paletteAt(100),neutral);
  assert.deepEqual(SOUND_VIEWS,['contour','scope','memory']);
});

test('role palette order is stable across input order and activity changes', () => {
  const view = new SoundViews();
  view.setPlaybackWords([blue,red,green],0,1000);
  view.setPlaybackWords([{...green,activity:0},blue,red],400,1000);
  assert.equal(view.playback.started,0);
  assert.deepEqual(view.playback.words.map(word=>word.band),['low','mid','high']);
  assert.equal(view.playback.words[1].activity,0);
  assert.deepEqual(view.paletteAt(1000),rgb);
});

test('role transitions start at displayed colors and reduced motion changes immediately', () => {
  const view=new SoundViews();
  view.setPlaybackWords([red],0,1000,true);
  view.setPlaybackWords([{...blue,band:'low'}],100,1000);
  assert.equal(view.paletteAt(600)[0],'rgb(128 0 128)');
  const before=view.paletteAt(700);
  view.setPlaybackWords([{...green,band:'low'}],700,1000);
  assert.deepEqual(view.paletteAt(700),before);
  view.setPlaybackWords([],1700,800,true);
  assert.ok(view.paletteAt(1700).every(color=>color==='rgb(97 123 118)'));
  assert.deepEqual(colorChannels('hsl(-120, 100%, 50%)'),[0,0,255]);
});

test('Memory uses distinct low, mid and high colors in the same historical column', () => {
  const view=new SoundViews(), ctx=context();
  view.setPlaybackWords([red,green,blue],0,0);
  view.draw(ctx,300,207,'memory',spectrum,0,true,false);
  assert.deepEqual(view.colors[0],rgb);
  const cellWidth=264/64-.6;
  const cells=ctx.rects.filter(rect=>Math.abs(rect.w-cellWidth)<1e-10);
  assert.equal(cells.length,12);
  for (let band=0;band<12;band++) {
    assert.equal(cells[band].color,rgb[Math.floor(band/4)]);
    assert.equal(cells[band].y,57+(11-band)*10);
  }
  view.setPlaybackWords([red,green,{...blue,color:'#ffffff'}],100,0);
  view.draw(context(),300,207,'memory',spectrum,100,true,false);
  assert.deepEqual(view.colors[0],rgb);
  assert.deepEqual(view.colors[1],[rgb[0],rgb[1],'rgb(255 255 255)']);
});

test('Memory records all three interpolated colors, with a fixed reduced-motion view', () => {
  const view=new SoundViews();
  view.setPlaybackWords([red,green,blue],0,0);
  view.draw(context(),300,207,'memory',spectrum,0,true,false);
  view.setPlaybackWords([{...red,color:'#0000ff'},green,{...blue,color:'#ff0000'}],100,1000);
  view.draw(context(),300,207,'memory',spectrum,600,true,false);
  assert.deepEqual(view.colors[1],['rgb(128 0 128)',rgb[1],'rgb(128 0 128)']);
  assert.deepEqual(view.colors[0],rgb);
  const ctx=context(); view.draw(ctx,300,207,'memory',spectrum,1100,true,true);
  const cells=ctx.rects.filter(rect=>Math.abs(rect.w-(264/64-.6))<1e-10);
  assert.equal(cells.length,64*12);
  assert.deepEqual(cells.slice(0,12).map(rect=>rect.color),[
    ...Array(4).fill(rgb[2]),...Array(4).fill(rgb[1]),...Array(4).fill(rgb[0])]);
});

test('Scope blends role ink uniformly because horizontal position is time, not pitch',()=>{
  const view=new SoundViews(), ctx=context();
  view.setPlaybackWords([red,green,blue],0,0);
  view.draw(ctx,300,200,'scope',spectrum,0,true,false);
  const waveformStrokes=ctx.strokes.filter(stroke=>stroke.width===5||stroke.width===1.4);
  assert.equal(waveformStrokes.length,2);
  assert.ok(waveformStrokes.every(stroke=>stroke.color==='rgb(85 85 85)'));
});

test('role captions fade through clear space instead of overlapping old and new text',()=>{
  const view=new SoundViews();
  view.setPlaybackWords([red],0,0);
  view.setPlaybackWords([{...blue,band:'low'}],100,1000);
  for (const time of [200,400,600,800,1100]) {
    const ctx=context(); view.draw(ctx,300,200,'contour',spectrum,time,true,false);
    assert.ok(!(ctx.labels.includes('바다') && ctx.labels.includes('빛')));
  }
  view.setPlaybackWords([{...green,band:'low'}],1200,1000);
  view.setPlaybackWords([sourceWord('low','꽃','#ff88aa',30)],1300,1000);
  assert.equal(view.playback.outgoing[0].text,'빛');
});
