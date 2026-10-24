import test from 'node:test';
import assert from 'node:assert/strict';
import { bridgeDegrees, degreeSemitone } from '../src/tonal-transition.js';
import { ambientHarmony } from '../src/ambient-harmony.js';
import { createStanzaScore } from '../src/stanzas.js';

test('pickup shares an outgoing chord tone and previews the next motif across modes',()=>{
  for(const from of ['major','minor']) for(const to of ['major','minor']) for(const destination of [0,2,4,6]) {
    const [shared,landing]=bridgeDegrees(4,from,to,destination);
    const pc=n=>((n%12)+12)%12;
    assert.ok([4,6,8].map(n=>pc(degreeSemitone(n,from))).includes(pc(degreeSemitone(shared,to))));
    assert.equal(landing,destination);
  }
  assert.equal(degreeSemitone(-1,'major'),-1);
});
test('boundary-aware pads preserve opening and voice count while targeting the next mode',()=>{
  const roots=[0,5,3,4], target=[0,3,7,10];
  const a=ambientHarmony(roots,0), b=ambientHarmony(roots,0,0,{mode:'major',target});
  assert.deepEqual(a.voicings.slice(0,3),b.voicings.slice(0,3));
  const distance=notes=>notes.reduce((s,n,i)=>s+Math.abs(n-a.voicings[2][i])+.5*Math.abs(degreeSemitone(n,'major')-target[i]),0);
  assert.ok(distance(b.voicings[3])<=distance(a.voicings[3]));
  assert.ok(b.voicings.every(v=>v.length===4 && v.every(n=>n>=-3&&n<=16)));
});
test('all stanza seams including loop return keep bounded bridge and fill counts',()=>{
  const score=createStanzaScore('기쁨이 춤춘다. 햇살이 빛난다.\n\n무서운 밤\n\n고요한 바다',0,{mode:'on'});
  assert.equal((score.code.match(/BRIDGE/g)||[]).length,3);
  assert.equal((score.code.match(/FILL/g)||[]).length,3);
  assert.equal((score.code.match(/setcpm/g)||[]).length,1);
  assert.match(score.sections[2].code,/white ~ ~ white/);
});
