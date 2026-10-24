import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutVideoWords, updateVideoEmphasis, drawVideoWords } from '../src/video-poem.js';
import { drawVideoFrame } from '../src/video-recorder.js';

function context() {
  const calls = [];
  const ctx = { calls, globalAlpha: 1, font: '',
    measureText(t) { return { width: t.length * 10 }; },
    fillText(t) { calls.push({ text: t, alpha: this.globalAlpha, color: this.fillStyle }); },
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
  assert.ok(parts.every(p => p.alpha > .38 && p.alpha < 1));
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
  assert.ok(ctx.calls.some(c => c.stroke === '#789b8b'));
  assert.ok(ctx.calls.some(c => c.stroke === '#abcdef'));
  assert.ok(!ctx.calls.some(c => c.text?.includes('마디')));
});

test('missing relation endpoints are safe when text is edited', () => {
  drawVideoWords(context(), [], 20, [{ fromStart: 0, toStart: 90, dash: [] }]);
});
