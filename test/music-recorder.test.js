import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicRecorder } from '../src/music-recorder.js';

test('audio recording waits for encoder start and releases its own output tap', async () => {
  class Recorder {
    static isTypeSupported() { return true; }
    constructor() { this.mimeType = 'audio/mp4'; }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; }
  }
  let detached = false, stopped = false;
  const destination = { stream: { getTracks: () => [{ stop() { stopped = true; } }] } };
  const output = { connect() {}, disconnect(node) { assert.equal(node, destination); detached = true; } };
  const saved = [];
  const capture = new MusicRecorder((...args) => saved.push(args), () => {}, Recorder);
  capture.start({ createMediaStreamDestination: () => destination }, output);
  capture.recorder.onstart(); assert.equal(await capture.ready, true);
  capture.recorder.ondataavailable({ data: new Blob(['audio']) });
  capture.stop(); capture.recorder.onstop();
  assert.equal(saved[0][1], 'm4a'); assert.ok(detached && stopped);
  capture.start({ createMediaStreamDestination: () => destination }, output);
  capture.stop(); assert.equal(await capture.ready, false);
  capture.recorder.onstop();
});
