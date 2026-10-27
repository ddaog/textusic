import test from 'node:test';
import assert from 'node:assert/strict';
import { TypingSound, typingNote, typingAccent } from '../src/typing-sound.js';
import { degreeSemitone } from '../src/tonal-transition.js';

function context() {
  const nodes = [];
  const node = () => {
    const value = { gain: { cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime(v) { this.peak = v; }, exponentialRampToValueAtTime() {} }, frequency: {},
      connect() {}, disconnect() { this.disconnected = true; }, start() {}, stop() {} };
    nodes.push(value); return value;
  };
  return { nodes, state: 'running', currentTime: 0, sampleRate: 48000,
    createBuffer: (channels, length) => ({ getChannelData: () => new Float32Array(length) }),
    createGain: node, createBufferSource: node, createOscillator: node };
}
test('typing toggle silences input and bounds paste, duplicate IME events and voices', () => {
  const sound = new TypingSound(), ctx = context(); sound.connect(ctx, {});
  sound.input('가', 'C', false); assert.equal(sound.voices.size, 0);
  sound.input('가나', 'C', true); assert.equal(sound.voices.size, 1);
  ctx.currentTime += .2;
  sound.input('가나', 'C', true); assert.equal(sound.voices.size, 1);
  sound.input('가'.repeat(2000), 'C', true); assert.equal(sound.voices.size, 2);
  sound.input('다', 'C', true); assert.equal(sound.voices.size, 3);
  for (let i = 0; i < 10; i++) { ctx.currentTime += .2; sound.input(String(i), 'G', true); }
  assert.equal(sound.voices.size, 6);
  sound.stop(); assert.equal(sound.voices.size, 0);
  assert.ok(ctx.nodes.every(n => n.disconnected));
});
test('rapid changed inputs all create a response while total live voices stay bounded', () => {
  const sound = new TypingSound(), ctx = context(); sound.connect(ctx, {});
  for (let i = 0; i < 100; i++) {
    ctx.currentTime += .015;
    sound.input(String(i), { playing:true, cycle:i / 100, bpm:84 }, true);
    assert.ok(sound.voices.size <= 6);
    assert.equal(ctx.nodes.filter(n => !n.disconnected).length, Math.min(i + 1, 7) * 4);
  }
  assert.equal(ctx.nodes.length, 100 * 4);
  sound.stop(); assert.ok(ctx.nodes.every(n => n.disconnected));
});
test('accent follows transport quarter notes, not gaps between keys', () => {
  assert.equal(typingAccent({ playing:true, cycle:2.25, bpm:84 }), 1);
  assert.equal(typingAccent({ playing:true, cycle:2.125, bpm:84 }), 0);
  assert.equal(typingAccent({ playing:false, cycle:0 }), 0);
  assert.ok(typingAccent({ playing:true, cycle:.999, bpm:84 }) > .8);
  const peaks = [];
  for (const cycle of [.25, .125]) {
    const sound = new TypingSound(), ctx = context(); sound.connect(ctx, {});
    sound.input('가', { playing:true, cycle, bpm:84 }, true);
    peaks.push([...sound.voices][0].gain.gain.peak); sound.stop();
  }
  assert.ok(peaks[0] > peaks[1] * 2);
});
test('new context resets throttle and tone follows its chord', () => {
  const sound = new TypingSound(), ctx = context(); sound.connect(ctx, {});
  ctx.currentTime = 100; sound.input('a', 'A', true);
  assert.equal([...sound.voices][0].tone.frequency.value, 440 * 2 ** ((typingNote({ root:'A' }) - 69) / 12));
  const next = context(); sound.connect(next, {}); sound.input('ab', 'A', true);
  assert.equal(sound.voices.size, 1);
  sound.stop();
});
test('typing melody follows changing major/minor chords with bounded voice leading', () => {
  for (const scale of ['major', 'minor']) {
    let previous;
    for (let i = 0; i < 40; i++) {
      const chord = [0, 5, 3, 4][Math.floor(i / 4) % 4];
      const note = typingNote({ root:'C', scale, chord }, previous, i);
      assert.ok([0, 2, 4].map(n => degreeSemitone(chord + n, scale) % 12).includes(note % 12));
      if (previous != null) assert.ok(Math.abs(note - previous) <= 5);
      previous = note;
    }
  }
  assert.equal(typingNote({ scale:'major' }, 64), 64);
  assert.equal(typingNote({ scale:'minor' }, 64), 63);
});
