import test from 'node:test';
import assert from 'node:assert/strict';
import { Visualizer } from '../src/visualizer.js';
import { analyzeText } from '../src/text-analyzer.js';

function fixture() {
  const v=Object.create(Visualizer.prototype);
  Object.assign(v,{playing:true,reducedMotion:false,analysis:analyzeText('고요한 바다'),stanza:{count:2,index:0},width:400,height:266,transitionDuration:1200});
  v.context=new Proxy({}, {get:(target,key)=>target[key] ?? (()=>{}),set:(target,key,value)=>{target[key]=value;return true;}});
  return v;
}
test('stanza visuals retain one bounded outgoing snapshot, then release it',()=>{
  const v=fixture(), before=v.analysis;
  v.setAnalysis(analyzeText('무서운 밤'));
  assert.deepEqual(v.previousVisual.words,before.tokenMeanings.slice(0,12));
  assert.equal(v.previousVisual.stanza.index,0);
  v.stanza={count:2,index:1};
  const start=v.previousVisual.started;
  v.drawOrbit(start+600,.25);
  assert.ok(v.previousVisual);
  v.drawOrbit(start+1200,.5);
  assert.equal(v.previousVisual,null);
  v.setAnalysis(before); v.setPlaying(false);
  assert.equal(v.previousVisual,null);
});
test('reduced motion switches directly and rapid edits retain at most twelve old dots',()=>{
  const v=fixture();
  for(let i=0;i<5;i++) {v.setAnalysis(analyzeText(`바다 하늘 햇살 ${i}`));assert.ok(v.previousVisual.words.length<=12);}
  v.reducedMotion=true; v.setAnalysis(analyzeText('비'));
  assert.equal(v.previousVisual,null);
});
