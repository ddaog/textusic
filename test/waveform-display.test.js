import test from 'node:test';
import assert from 'node:assert/strict';
import { WaveformDisplay, WAVEFORM_DISPLAY_GAIN } from '../src/waveform-display.js';

test('quiet measured waveforms are more visible without automatic normalization',()=>{
  const display=new WaveformDisplay();
  const quiet=display.sample(new Uint8Array(1024).fill(132),0)[0];
  assert.equal(WAVEFORM_DISPLAY_GAIN,3);
  assert.ok(quiet>2.8*4/128 && quiet<3*4/128);
  const quieter=display.sample(new Uint8Array(1024).fill(129),100,true)[0];
  assert.ok(quieter<quiet/3.8); // a one-step signal remains small
});

test('peaks remain bounded, signed and finite without flat clipping',()=>{
  const display=new WaveformDisplay();
  const positive=display.sample(new Uint8Array(1024).fill(255),0,true)[0];
  const negative=display.sample(new Uint8Array(1024).fill(0),100,true)[0];
  assert.ok(positive>0 && positive<1);
  assert.ok(negative<0 && negative>-1);
  assert.ok(display.sample(Uint8Array.from({length:1024},(_,i)=>i%256),200).every(v=>Number.isFinite(v) && Math.abs(v)<1));
});

test('silence and reset clear the trace, with one reusable bounded buffer',()=>{
  const display=new WaveformDisplay();
  const buffer=display.sample(new Uint8Array(1024).fill(145),0);
  assert.equal(buffer.length,512);
  assert.equal(display.sample(new Uint8Array(1024).fill(128),20),buffer);
  assert.ok(buffer.every(v=>v===0));
  assert.equal(display.sample(undefined,40),buffer);
  display.sample(new Uint8Array([0,255]),60);
  assert.equal(display.reset(),buffer);
  assert.ok(buffer.every(v=>v===0));
});

test('visual smoothing settles toward new measured samples, reduced motion switches directly',()=>{
  const display=new WaveformDisplay();
  display.sample(new Uint8Array([132]),0);
  const before=display.values[0];
  const after=display.sample(new Uint8Array([140]),16)[0];
  const target=Math.tanh(12/128*3);
  assert.ok(after>before && after<target);
  assert.ok(Math.abs(display.sample(new Uint8Array([140]),32,true)[0]-target)<1e-6);
});
