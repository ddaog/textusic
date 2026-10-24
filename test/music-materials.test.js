import test from 'node:test';
import assert from 'node:assert/strict';
import { MUSIC_MATERIAL_COUNTS, GROOVES, MELODY_CONTOURS } from '../src/music-materials.js';
import { createRhythm } from '../src/rhythm.js';
import { createStanzaScore } from '../src/stanzas.js';
import { createArrangement } from '../src/music-engine.js';
import { createModularPatch } from '../src/modular-patch.js';
import { MUSIC_TIPS } from '../src/ui-guidance.js';

test('catalog counts match unique selectable materials and the tip',()=>{
  assert.deepEqual(MUSIC_MATERIAL_COUNTS,{harmony:4,melody:12,rhythm:12,pad:4});
  assert.equal(new Set(MELODY_CONTOURS.map(JSON.stringify)).size,12);
  assert.equal(new Set(GROOVES.map(JSON.stringify)).size,12);
  assert.match(MUSIC_TIPS.find(t=>t.topic==='몇 곡이나 나올까요').text,/2,304/);
});
test('all twelve sparse grooves are distinct and retain a grounded first beat',()=>{
  const patterns=[];
  for(let seed=0;seed<12;seed++) {
    const r=createRhythm({seed,text:'나는 바다를 바라본다'},0);
    patterns.push(JSON.stringify([r.kick,r.snare,r.hat]));
    assert.equal(r.kick[0].split(' ')[0],'c1');
    for(const voice of ['kick','snare','hat']) for(const bar of r[voice]) assert.equal(bar.split(' ').length,16);
  }
  assert.equal(new Set(patterns).size,12);
});
test('different stanzas share the root, groove family and melodic material',()=>{
  const score=createStanzaScore('바다가 기쁘게 춤춘다. 바다가 반짝인다.\n\n어두운 밤이 무섭다. 바람이 분다.',2,{});
  const [a,b]=score.sections;
  assert.equal(a.analysis.root,b.analysis.root);
  assert.equal(a.analysis.seed,b.analysis.seed);
  assert.equal(createArrangement(a.foundation).rhythm.family,createArrangement(b.foundation).rhythm.family);
  assert.deepEqual(createModularPatch(a.foundation).modules[0].pitch,createModularPatch(b.foundation).modules[0].pitch);
  assert.equal((score.code.match(/setcpm/g)||[]).length,1);
});
