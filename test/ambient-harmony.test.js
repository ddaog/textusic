import test from 'node:test';
import assert from 'node:assert/strict';
import { ambientHarmony } from '../src/ambient-harmony.js';
import { createStrudelCode } from '../src/music-engine.js';
import { analyzeText } from '../src/text-analyzer.js';

test('ambient colors vary deterministically while voices and registers stay bounded',()=>{
  const colors=new Set();
  for(let seed=0;seed<128;seed++) {
    const a=ambientHarmony([0,5,3,4],seed);
    colors.add(a.color);
    assert.deepEqual(a,ambientHarmony([0,5,3,4],seed));
    for(const notes of a.voicings) {
      assert.equal(notes.length,4);
      assert.ok(notes.every(n=>Number.isInteger(n)&&n>=-3&&n<=16));
    }
  }
  assert.equal(colors.size,4);
});
test('voice leading reduces upper-voice movement relative to root-position sevenths',()=>{
  const roots=[0,5,3,4];
  const distance=bars=>bars.slice(1).reduce((sum,b,i)=>sum+b.reduce((s,n,j)=>s+Math.abs(n-bars[i][j]),0),0);
  assert.ok(distance(ambientHarmony(roots,0).voicings)<distance(roots.map(r=>[0,2,4,6].map(n=>n+r))));
  assert.equal(ambientHarmony(roots,96,.7).color,0);
});
test('ambient pad stays in the existing stack without external samples or extra layers',()=>{
  const code=createStrudelCode(analyzeText('고요한 달빛이 바다 위로 흐른다'));
  assert.match(code,/\.hpf\(180\)\.lpf\(sine\.slow\(/);
  assert.match(code,/\.pan\(sine\.slow\(/);
  assert.doesNotMatch(code,/samples\(|supersaw|chop\(/);
});
