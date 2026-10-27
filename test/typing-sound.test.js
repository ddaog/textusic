import test from 'node:test';
import assert from 'node:assert/strict';
import { TypingSound } from '../src/typing-sound.js';

function context() {
  const nodes = [];
  const node = () => {
    const value = { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, frequency: {},
      connect() {}, disconnect() { this.disconnected = true; }, start() {}, stop() {} };
    nodes.push(value); return value;
  };
  return { nodes, state: 'running', currentTime: 0, sampleRate: 48000,
    createBuffer: (channels, length) => ({ getChannelData: () => new Float32Array(length) }),
    createGain: node, createBufferSource: node, createOscillator: node };
}
test('typing stays silent outside capture and bounds paste, duplicate IME events and voices', () => {
  const sound = new TypingSound(), ctx = context(); sound.connect(ctx, {});
  sound.input('가', 'C', false); assert.equal(sound.voices.size, 0);
  sound.input('가나', 'C', true); assert.equal(sound.voices.size, 1);
  ctx.currentTime += .06;
  sound.input('가나', 'C', true); assert.equal(sound.voices.size, 1);
  sound.input('가'.repeat(2000), 'C', true); assert.equal(sound.voices.size, 2);
  sound.input('다', 'C', true); assert.equal(sound.voices.size, 2);
  for (let i = 0; i < 10; i++) { ctx.currentTime += .06; sound.input(String(i), 'G', true); }
  assert.equal(sound.voices.size, 4);
  sound.stop(); assert.equal(sound.voices.size, 0);
  assert.ok(ctx.nodes.every(n => n.disconnected));
});
test('new context resets throttle and tone uses root or fifth', () => {
  const sound = new TypingSound(), ctx = context(); sound.connect(ctx, {});
  ctx.currentTime = 100; sound.input('a', 'A', true);
  assert.equal([...sound.voices][0].tone.frequency.value, 440);
  const next = context(); sound.connect(next, {}); sound.input('ab', 'A', true);
  assert.equal(sound.voices.size, 1);
  sound.stop();
});
