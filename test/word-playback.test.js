import test from 'node:test';
import assert from 'node:assert/strict';
import { mapWordCues, soundingWords } from '../src/word-playback.js';

const words = Array.from({length:7},(_,i)=>({start:i*2,end:i*2+1,text:String(i),color:'#668c86'}));
test('playing provenance advances beyond the opening three words, follows real rests, and stops at the stanza boundary', () => {
  const cue = { start:0,duration:3.8,sources:words,layer:'melody' };
  const sections = [[cue],[{...cue,sources:[{...words[0],start:20}]}]];
  assert.equal(soundingWords(sections,.2)[0].start,0);
  assert.equal(soundingWords(sections,2.2)[0].start,8);
  assert.deepEqual(soundingWords(sections,3.99),[]);
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
  assert.equal(soundingWords([[cue],[cue]],8.2)[0].start,8);
});
