import test from 'node:test';
import assert from 'node:assert/strict';
import { mapWordCues, soundingWords } from '../src/word-playback.js';

const words = Array.from({length:7},(_,i)=>({start:i*2,end:i*2+1,text:String(i),color:'#668c86'}));
test('playing provenance advances beyond the opening three words, follows real rests, and stops at the stanza boundary', () => {
  const cue = { start:0,duration:3.8,sources:words,layer:'melody' };
  const sections = [[cue],[{...cue,sources:[{...words[0],start:20}]}]];
  assert.equal(soundingWords(sections,.2)[0].start,0);
  assert.equal(soundingWords(sections,2.2)[0].start,4);
  assert.equal(soundingWords(sections,3.2)[0].start,6);
  assert.ok(soundingWords(sections,3.99).every(w=>w.activity===0));
  assert.equal(soundingWords(sections,4.01)[0].start,20);
  assert.ok(soundingWords(sections,8.2).every(w=>w.start<14));
  assert.deepEqual(soundingWords(sections,NaN),[]);
});
test('pending edits only map actual source tokens and unchanged stanzas can move', () => {
  const score={sections:[{text:'sun sea',cues:[{start:0,duration:1,layer:'melody',sources:[{start:0,end:3,token:'sun'},{start:4,end:7,token:'sea'}]}]}]};
  const mapped=mapWordCues(score,'new\n\nsun sea',[{start:0,end:3,text:'new'},{start:5,end:8,text:'sun'},{start:9,end:12,text:'sea'}]);
  assert.deepEqual(mapped[0][0].sources.map(w=>w.start),[5,9]);
  const edited=mapWordCues(score,'ice sea',[{start:0,end:3,text:'ice'},{start:4,end:7,text:'sea'}]);
  assert.deepEqual(edited[0][0].sources.map(w=>w.text),['sea']);
});

test('later loops visit later contributors even with multiple stanzas',()=>{
  const sources=Array.from({length:16},(_,i)=>({start:i,text:String(i)}));
  const cue={start:0,duration:4,sources,layer:'melody'};
  assert.equal(soundingWords([[cue],[cue]],.2)[0].start,0);
  assert.equal(soundingWords([[cue],[cue]],8.2)[0].start,4);
});

test('names and order stay fixed through onsets and rests for the entire bar',()=>{
  const cues=[{start:0,duration:.1,sources:words,layer:'melody'},
    {start:.5,duration:.1,sources:words,layer:'melody'},
    {start:.75,duration:.1,sources:words.slice(3),layer:'relation'}];
  const sections=[cues];
  const selected=soundingWords(sections,.01).map(w=>w.start);
  assert.equal(selected.length,2);
  for(const phase of [.1,.3,.49,.51,.7,.9,.99]) {
    assert.deepEqual(soundingWords(sections,phase).map(w=>w.start),selected);
  }
  assert.ok(soundingWords(sections,.3).every(w=>w.activity===0));
  assert.ok(soundingWords(sections,.51).some(w=>w.activity>.5));
  assert.deepEqual(soundingWords(sections,2.5),[]);
});

test('melody leads and distinct bass or relation contributions support it, without unrelated words',()=>{
  const cues=[{start:0,duration:1,sources:[words[2]],layer:'melody'},
    {start:.5,duration:.1,sources:[words[3]],layer:'bass'},
    {start:.2,duration:.1,sources:[words[4]],layer:'relation'}];
  assert.deepEqual(soundingWords([cues],.1).map(w=>[w.start,w.layer,w.activity>0]),[
    [words[2].start,'melody',true],[words[3].start,'bass',false]]);
  const single=soundingWords([[{start:0,duration:1,sources:[words[2]],layer:'melody'}]],.1);
  assert.equal(single.length,1);
  assert.equal(single[0].start,words[2].start);
});
