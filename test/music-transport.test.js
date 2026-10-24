import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicEngine } from '../src/music-engine.js';

function fixture(evaluate = async () => {}) {
  const repl = {
    scheduler: { started: false }, state: {}, evaluate,
    async start() { this.scheduler.started = true; },
    stop() { this.scheduler.started = false; },
  };
  return { repl, engine: new MusicEngine(async () => ({ initStrudel: async () => repl })) };
}
test('stop controls the owned transport, not the overwritten global hush', async () => {
  const { engine, repl } = fixture();
  await engine.play('test');
  assert.equal(repl.scheduler.started, true);
  engine.stop();
  assert.equal(repl.scheduler.started, false);
  assert.equal(engine.playing, false);
  await engine.play('restart');
  assert.equal(repl.scheduler.started, true);
});
test('stop during code evaluation cannot restart audio', async () => {
  let resolve;
  const { engine, repl } = fixture(() => new Promise((done) => { resolve = done; }));
  await engine.init();
  const pending = engine.play('pending');
  await new Promise((done) => setImmediate(done));
  engine.stop();
  resolve();
  await pending;
  assert.equal(repl.scheduler.started, false);
  assert.equal(engine.playing, false);
});
test('stop during initialization cancels playback', async () => {
  let resolve;
  const { repl } = fixture();
  const engine = new MusicEngine(async () => ({ initStrudel: () => new Promise((done) => { resolve = done; }) }));
  const pending = engine.play('pending');
  await new Promise((done) => setImmediate(done));
  engine.stop();
  resolve(repl);
  await pending;
  assert.equal(repl.scheduler.started, false);
});

test('music import is lazy and a failed import can be retried', async () => {
  const { repl } = fixture();
  let attempts = 0;
  const engine = new MusicEngine(async () => {
    if (++attempts === 1) throw new Error('network unavailable');
    return { initStrudel: async () => repl };
  });
  assert.equal(attempts, 0);
  await assert.rejects(engine.play('first'), /network unavailable/);
  await engine.play('retry');
  assert.equal(attempts, 2);
  assert.equal(engine.playing, true);
});

test('failed Strudel initialization does not poison subsequent playback', async () => {
  const { repl } = fixture();
  let attempts = 0;
  const engine = new MusicEngine(async () => ({ initStrudel: async () => {
    if (++attempts === 1) throw new Error('audio unavailable');
    return repl;
  } }));
  await assert.rejects(engine.play('first'), /audio unavailable/);
  await engine.play('retry');
  assert.equal(engine.playing, true);
});
