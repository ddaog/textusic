import test from 'node:test';
import assert from 'node:assert/strict';
import { quietConnections, MUSIC_TIPS, nextTipIndex } from '../src/ui-guidance.js';

test('visual connections are bounded, deduplicated and preserve the source graph', () => {
  const edges=Array.from({length:30},(_,i)=>({from:i%10,to:(i+1)%10,type:'modifier'}));
  edges.push({from:1,to:0,type:'patch'});
  const original=structuredClone(edges);
  const result=quietConnections(edges,10,true);
  assert.ok(result.length<=6);
  assert.equal(result[0].type,'patch');
  assert.equal(new Set(result.map(e=>[e.from,e.to].sort((a,b)=>a-b).join(':'))).size,result.length);
  assert.deepEqual(edges,original);
});

test('fan-out remains possible but cannot overwhelm one word', () => {
  const result=quietConnections(Array.from({length:9},(_,i)=>({from:0,to:i+1,type:'shared-subject'})),10);
  assert.equal(result.length,3);
  assert.deepEqual(quietConnections([{from:0,to:0},{from:0,to:10}],2),[]);
});

test('random tip changes on demand without immediately repeating', () => {
  for(let i=0;i<MUSIC_TIPS.length;i++) for(const random of [()=>0,()=>.9999]) {
    const next=nextTipIndex(i,random);
    assert.notEqual(next,i);
    assert.ok(next>=0&&next<MUSIC_TIPS.length);
  }
  assert.equal(nextTipIndex(-1,()=>0),0);
});
