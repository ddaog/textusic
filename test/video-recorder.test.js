import test from 'node:test';
import assert from 'node:assert/strict';
import { VideoRecorder, wrapPoem } from '../src/video-recorder.js';

function fixture() {
  const tracks = [];
  const track = (kind) => { const t = { kind, stopped: false, stop() { this.stopped = true; } }; tracks.push(t); return t; };
  class Stream {
    constructor(items) { this.items = items; }
    getTracks() { return this.items; }
    getVideoTracks() { return this.items.filter(t => t.kind === 'video'); }
    getAudioTracks() { return this.items.filter(t => t.kind === 'audio'); }
  }
  class Recorder {
    static isTypeSupported(type) { return type === 'video/mp4'; }
    constructor(stream, options) { this.stream = stream; this.options = options; this.mimeType = options.mimeType; this.state = 'inactive'; }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; }
    finish() { this.ondataavailable({ data: new Blob(['test']) }); this.onstop(); }
  }
  let draws = 0;
  const ctx = { fillRect() {}, fillText() {}, measureText: t => ({ width: t.length * 20 }), drawImage() { draws++; } };
  const canvas = { getContext: () => ctx, captureStream: fps => { assert.equal(fps, 15); return new Stream([track('video')]); } };
  const destination = { stream: new Stream([track('audio')]) };
  const output = { connected: [], disconnected: [], connect(n) { this.connected.push(n); }, disconnect(n) { this.disconnected.push(n); } };
  const saved = [], statuses = [];
  const recorder = new VideoRecorder((...args) => saved.push(args), s => statuses.push(s), { Recorder, Stream, createCanvas: () => canvas });
  return { recorder, output, saved, statuses, tracks, canvas, destination, draws: () => draws,
    start: () => recorder.start({ createMediaStreamDestination: () => destination }, output, { width: 600, height: 600 }, () => ({ text: '바람\n빛', label: '1연' })) };
}

test('video combines direct audio and canvas, selects MP4, bounds encoding and cleans only recording branch', () => {
  const f = fixture(); f.start(); const native = f.recorder.recorder;
  assert.equal(native.stream.getTracks().length, 2);
  assert.equal(native.options.mimeType, 'video/mp4');
  assert.equal(native.options.videoBitsPerSecond, 1500000);
  assert.equal(f.canvas.width, 540); assert.equal(f.canvas.height, 960);
  f.recorder.stop(); assert.equal(f.recorder.busy, true);
  native.finish(); assert.equal(f.saved[0][1], 'mp4');
  assert.equal(f.recorder.busy, false);
  assert.ok(f.tracks.every(t => t.stopped));
  assert.deepEqual(f.output.disconnected, [f.destination]);
});
test('drawing throttles at 15fps and pattern changes reconnect recording without touching speaker', () => {
  const f = fixture(); f.start();
  f.recorder.frame(100); f.recorder.frame(120); assert.equal(f.draws(), 2);
  f.recorder.frame(180); assert.equal(f.draws(), 3);
  const next = { connect(n) { assert.equal(n, f.destination); }, disconnect() {} };
  f.recorder.connect(next); assert.deepEqual(f.output.disconnected, [f.destination]);
  f.recorder.stop(); f.recorder.recorder.finish();
});
test('encoder error frees tracks and does not publish corrupt result', () => {
  const f = fixture(); f.start(); const native = f.recorder.recorder;
  native.onerror(); native.finish();
  assert.equal(f.saved.length, 0); assert.equal(f.recorder.busy, false);
  assert.ok(f.tracks.every(t => t.stopped));
});
test('unsupported recorder fails before allocating capture resources', () => {
  const f = fixture(); f.recorder.Recorder = undefined;
  assert.throws(() => f.start(), /지원하지/); assert.equal(f.recorder.busy, false);
});
test('poem wrapping preserves line breaks and Korean characters', () => {
  assert.deepEqual(wrapPoem({ measureText: s => ({ width: [...s].length }) }, '가나다\n라', 2), ['가나', '다', '라']);
});
