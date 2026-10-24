import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioSpectrum } from '../src/audio-spectrum.js';

function fixture() {
  let reads = 0, nodes = 0, amplitude = 255;
  const analyser = {frequencyBinCount:512, getByteFrequencyData(bins) { reads++; bins.fill(amplitude); }};
  const context = {sampleRate:48000, state:'running', createAnalyser() { nodes++; return analyser; }};
  const connections = new Set();
  const output = {context, connect(node) { connections.add(node); }, disconnect(node) { connections.delete(node); }};
  const spectrum = new AudioSpectrum(); spectrum.connect(output);
  return {spectrum, output, context, connections, analyser, get reads(){return reads;}, get nodes(){return nodes;}, silence(){amplitude=0;}};
}

test('passive spectrum uses one analyser and caps reads to 15 Hz', () => {
  const f = fixture(); f.spectrum.setActive(true);
  f.spectrum.connect(f.output);
  for(let t=0;t<1000;t++) f.spectrum.read(t);
  assert.equal(f.nodes,1); assert.equal(f.reads,15);
  assert.equal(f.connections.size,1);
  assert.equal(f.analyser.fftSize,1024);
  assert.equal(f.spectrum.levels.length,12);
  assert.ok(f.spectrum.edges.every((v,i,a)=>!i || v>a[i-1]));
});
test('stop/hidden detaches only analysis and resume reuses its buffers', () => {
  const f = fixture(); const recording = {}; f.output.connect(recording);
  f.spectrum.setActive(true); const levels=f.spectrum.read(0);
  assert.ok(levels[0]>0);
  f.spectrum.setActive(false); f.spectrum.read(100);
  assert.equal(f.reads,1); assert.deepEqual([...levels],Array(12).fill(0));
  assert.deepEqual([...f.connections],[recording]);
  f.spectrum.setActive(true); assert.equal(f.spectrum.read(200),levels);
  assert.equal(f.nodes,1);
  f.context.state='suspended'; f.spectrum.read(300); assert.equal(f.reads,2);
});
test('actual input controls levels with slower decay and replaced output detaches', () => {
  const f=fixture(); f.spectrum.setActive(true);
  const high=f.spectrum.read(0)[0]; f.silence();
  const low=f.spectrum.read(100)[0]; assert.ok(low>0 && low<high);
  const other={...f.output,connect(){}}; f.spectrum.connect(other);
  assert.equal(f.connections.size,0); assert.equal(f.nodes,1);
});
