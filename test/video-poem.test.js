import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutVideoWords, updateVideoEmphasis, drawVideoWords } from '../src/video-poem.js';
import { drawVideoFrame } from '../src/video-recorder.js';
import { visiblePlayingSection, splitStanzas } from '../src/stanzas.js';

function context() {
  const calls = [];
  const ctx = { calls, globalAlpha: 1, font: '',
    measureText(t) { return { width: t.length * 10 }; },
    fillText(t) { calls.push({ text: t, alpha: this.globalAlpha, color: this.fillStyle, blur:this.shadowBlur }); },
    createLinearGradient() { const stops=[]; calls.push({stops}); return {addColorStop(offset,color) {stops.push({offset,color});}}; },
    save() {}, restore() { this.globalAlpha = 1; }, fillRect() {}, drawImage() {},
    setLineDash() {}, beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, bezierCurveTo() {},
    stroke() { calls.push({ stroke: this.strokeStyle }); }, arc() {}, fill() {},
  };
  return ctx;
}

test('word offsets survive soft wraps, blank stanza separators and emoji', () => {
  const ctx = context();
  const text = '바다🌊\n\n달빛';
  const parts = layoutVideoWords(ctx, text, ['바다', '🌊', '', '달빛'], 20, [
    { start: 0, end: 2 }, { start: 6, end: 8 },
  ]);
  assert.deepEqual(parts.map(p => [p.text, p.start]), [['바다', 0], ['🌊', 2], ['달빛', 6]]);
});

test('all stanzas stay visible and emphasis crossfades instead of jumping', () => {
  const parts = [{ start: 0, end: 2, alpha: null }, { start: 4, end: 6, alpha: null }];
  updateVideoEmphasis(parts, { start: 0, end: 2 }, 0);
  assert.deepEqual(parts.map(p => p.alpha), [1, .38]);
  updateVideoEmphasis(parts, { start: 4, end: 6 }, 67);
  assert.equal(parts[0].alpha, .38);
  assert.ok(parts[1].alpha > .38 && parts[1].alpha < 1);
  for (let i = 0; i < 20; i++) updateVideoEmphasis(parts, { start: 4, end: 6 }, 67);
  assert.ok(parts[1].alpha > .99);
  updateVideoEmphasis(parts, null, 67, true);
  assert.deepEqual(parts.map(p => p.alpha), [1, 1]);
});

test('recording uses word colors, decorations and relations but no stanza readout', () => {
  const ctx = context();
  const scene = { fontFamily: 'serif', words: [
    { start: 0, end: 2, color: '#123456', accent: '#abcdef', effect: 'wave' },
    { start: 4, end: 6, color: '#654321', accent: '#fedcba', effect: 'bloom' },
  ], edges: [{ fromStart: 0, toStart: 4, color: '#789b8b', dash: [], type: 'patch' }] };
  drawVideoFrame({ getContext: () => ctx }, {}, { text: '바다\n\n달빛', scene,
    active: { start: 0, end: 2 }, label: '지금 1연 / 2 · 1/4 마디', now: 0, energy: .5 });
  assert.equal(ctx.calls.find(c => c.text === '바다').color, '#123456');
  assert.equal(ctx.calls.find(c => c.text === '달빛').alpha, .38);
  assert.ok(ctx.calls.some(c => c.stops?.[0].color === 'rgba(120,155,139,1)'));
  assert.ok(ctx.calls.some(c => c.stroke === '#abcdef'));
  assert.ok(!ctx.calls.some(c => c.text?.includes('마디')));
});

test('cross-stanza cables fade at the inactive endpoint and glow radius shrinks', () => {
  const ctx=context();
  const parts = [0,4].map((start,i)=>({start,end:start+2,text:'빛',x:36+i*50,y:100,width:30,
    alpha:i ? .38 : 1,word:{start,color:'#123456',accent:'#abcdef',effect:'spark'}}));
  drawVideoWords(ctx,parts,30,[{fromStart:0,toStart:4,type:'patch',color:'#789b8b',dash:[]}],1);
  const stops=ctx.calls.find(c=>c.stops).stops;
  assert.equal(stops[0].color,'rgba(120,155,139,1)');
  assert.equal(stops[1].color,`rgba(120,155,139,${.38**2})`);
  const words=ctx.calls.filter(c=>c.text);
  assert.ok(words[1].blur < words[0].blur * .2);
});

test('editing a playing poem retains one visible active stanza including fallback frames', () => {
  const old='바다\n\n달빛'; const score={text:old,sections:splitStanzas(old)};
  for (const text of ['바다가\n\n달빛', '바다\n\n달빛이', '새 연\n\n바다\n\n달빛', '바다']) {
    const active=visiblePlayingSection(text,score,4);
    assert.ok(active && active.end <= text.length);
    const ctx=context();
    drawVideoFrame({getContext:()=>ctx},{},{text,active,now:0});
    const lines=ctx.calls.filter(c=>text.includes(c.text) && c.text.trim());
    assert.ok(lines.some(c=>c.alpha===1));
    if (splitStanzas(text).length > 1) assert.ok(lines.some(c=>c.alpha===.38));
  }
  assert.equal(visiblePlayingSection('새 연\n\n바다\n\n달빛',score,4).start,9);
});

test('missing relation endpoints are safe when text is edited', () => {
  drawVideoWords(context(), [], 20, [{ fromStart: 0, toStart: 90, dash: [] }]);
});

test('inactive text is identical neutral ink for every effect and repeated word', () => {
  for (const effect of ['spark','ray','prism','ember','jitter','wave','ripple','wind','rain','grid','leaf','bloom']) {
    const ctx=context();
    const words=[0,4].map(start=>({start,end:start+2,color:'#000000',accent:'#ff0000',effect,embedding:true}));
    const parts=layoutVideoWords(ctx,'빛빛\n\n빛빛',['빛빛','','빛빛'],30,words);
    updateVideoEmphasis(parts,{start:0,end:2},0);
    drawVideoWords(ctx,parts,30,[],1);
    const rendered=ctx.calls.filter(c=>c.text);
    assert.equal(rendered[1].color,'#7b827e',effect);
    assert.equal(rendered[1].alpha,.38,effect);
    assert.equal(rendered[1].blur,0,effect);
    // Advance to the next stanza even with a zero-time frame: old ink must dim.
    updateVideoEmphasis(parts,{start:4,end:6},0);
    assert.equal(parts[0].alpha,.38);
    assert.equal(parts[0].active,false);
  }
});
