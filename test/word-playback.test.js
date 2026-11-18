import test from 'node:test';
import assert from 'node:assert/strict';
import { mapWordCues, soundingWords } from '../src/word-playback.js';

const words = Array.from({length:7},(_,i)=>({start:i*2,end:i*2+1,text:String(i),color:`hsl(${i*45} 50% 50%)`}));
test('role sources stay fixed across bars and loops, but activity follows actual notes', () => {
  const cue = { start:0,duration:3.8,sources:words,layer:'melody' };
  const sections = [[cue],[{...cue,sources:[{...words[0],start:20}]}]];
  assert.equal(soundingWords(sections,.2)[0].start,0);
  assert.equal(soundingWords(sections,2.2)[0].start,0);
  assert.equal(soundingWords(sections,3.2)[0].start,0);
  assert.ok(soundingWords(sections,3.99).every(w=>w.activity===0));
  assert.equal(soundingWords(sections,4.01)[0].start,20);
  assert.equal(soundingWords(sections,8.2)[0].start,0);
  assert.deepEqual(soundingWords(sections,NaN),[]);
});
test('pending edits only map actual source tokens and unchanged stanzas can move', () => {
  const score={sections:[{text:'sun sea',cues:[{start:0,duration:1,layer:'melody',sources:[{start:0,end:3,token:'sun'},{start:4,end:7,token:'sea'}]}]}]};
  const mapped=mapWordCues(score,'new\n\nsun sea',[{start:0,end:3,text:'new'},{start:5,end:8,text:'sun'},{start:9,end:12,text:'sea'}]);
  assert.deepEqual(mapped[0][0].sources.map(w=>w.start),[5,9]);
  const edited=mapWordCues(score,'ice sea',[{start:0,end:3,text:'ice'},{start:4,end:7,text:'sea'}]);
  assert.deepEqual(edited[0][0].sources.map(w=>w.text),['sea']);
});

test('names and order stay fixed through onsets and rests for the entire stanza',()=>{
  const cues=[{start:0,duration:.1,sources:words,layer:'melody'},
    {start:.5,duration:.1,sources:words,layer:'melody'},
    {start:.75,duration:.1,sources:words.slice(3),layer:'relation'}];
  const sections=[cues];
  const selected=soundingWords(sections,.01).map(w=>w.start);
  assert.equal(selected.length,1);
  for(const phase of [.1,.3,.49,.51,.7,.9,.99,2.5,3.99]) {
    assert.deepEqual(soundingWords(sections,phase).map(w=>w.start),selected);
  }
  assert.ok(soundingWords(sections,.3).every(w=>w.activity===0));
  assert.ok(soundingWords(sections,.51).some(w=>w.activity>.5));
  assert.ok(soundingWords(sections,2.5).every(word=>word.activity===0));
});

test('low and high slots require actual bass and melody voices; absent harmony is omitted',()=>{
  const cues=[{start:0,duration:1,sources:[words[2]],layer:'melody'},
    {start:.5,duration:.1,sources:[words[3]],layer:'bass'},
    {start:.2,duration:.1,sources:[words[4]],layer:'relation'}];
  assert.deepEqual(soundingWords([cues],.1).map(w=>[w.start,w.layer,w.band,w.activity>0]),[
    [words[3].start,'bass','low',false],[words[2].start,'melody','high',true]]);
  const single=soundingWords([[{start:0,duration:1,sources:[words[2]],layer:'melody'}]],.1);
  assert.equal(single.length,1);
  assert.equal(single[0].start,words[2].start);
  assert.equal(single[0].band,'high');
});

test('semantic source traits choose distinct stable bass, harmony, and melody identities',()=>{
  const sources=[
    {...words[0],sourceLayer:'far',traits:{space:.9,motion:-.3}},
    {...words[1],sourceLayer:'far',traits:{softness:.9,space:.3,warmth:.4}},
    {...words[2],sourceLayer:'near',traits:{light:.9,motion:.8}},
  ];
  const cues=['bass','harmony','melody'].map(layer=>({start:0,duration:4,sources,layer}));
  for(const cycle of [.1,1.9,3.99,8.25]) {
    assert.deepEqual(soundingWords([cues],cycle).map(word=>[word.band,word.start]),[['low',0],['mid',2],['high',4]]);
  }
});

test('pending source metadata survives mapping and does not invent another source for a role',()=>{
  const source={start:0,end:3,token:'sea',sourceLayer:'far',traits:{space:.8}};
  const score={sections:[{text:'sea',cues:[{start:0,duration:1,layer:'bass',sources:[source]}]}]};
  const mapped=mapWordCues(score,'sea',[{start:0,end:3,text:'sea',color:'#00ccff'}]);
  assert.equal(mapped[0][0].sources[0].sourceLayer,'far');
  assert.equal(mapped[0][0].sources[0].traits.space,.8);
  assert.deepEqual(soundingWords(mapped,.2).map(word=>[word.band,word.text]),[['low','sea']]);
});
