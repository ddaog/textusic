import test from 'node:test';
import assert from 'node:assert/strict';
import { sequence, timecat, pure, silence } from '../node_modules/@strudel/core/pattern.mjs';
import { barEvents, createSourceCues } from '../src/source-cues.js';
import { createStanzaScore } from '../src/stanzas.js';
import { createStrudelCode } from '../src/music-engine.js';
import { analyzeText } from '../src/text-analyzer.js';
import { analyzeSyntax } from '../src/syntax.js';

test('cue timing agrees with Strudel weighted notes, nested beats and rests', () => {
  const patterns = [
    ['[0@4] [~ 2 4@2] [5@3 ~] [4 5 4 ~]',sequence(pure(0),timecat([1,silence],[1,pure(2)],[2,pure(4)]),timecat([3,pure(5)],[1,silence]),sequence(4,5,4,silence))],
    ['0 ~ ~ ~ 0 ~ 4 ~',sequence(0,silence,silence,silence,0,silence,4,silence)],
    ['[~@4] [~@2 ~@2]',silence],
  ];
  for (const [bar,pattern] of patterns) {
    const expected = pattern.queryArc(0,1).map(hap => ({start:Number(hap.whole.begin),duration:Number(hap.whole.end)-Number(hap.whole.begin)}));
    assert.deepEqual(barEvents(bar),expected);
  }
});

test('collecting provenance does not change generated sound, and absent bass has no cues', () => {
  for (const text of ['달빛','달빛 바다','달빛 바다 물결','달빛이 비친다. 바다가 흐른다.']) {
    const analysis = analyzeText(text); analysis.syntax = analyzeSyntax(text);
    const voices = [];
    assert.equal(createStrudelCode(analysis,{}, {onVoice:voice => voices.push(voice)}),createStrudelCode(analysis));
    const cues = createSourceCues(analysis,voices);
    assert.equal(cues.some(cue => cue.layer === 'bass'),analysis.tokens.length>=3);
    assert.ok(cues.length>0 && cues.length<=640);
    for (const cue of cues) {
      assert.ok(cue.start>=0 && cue.start+cue.duration<=4);
      for (const source of cue.sources) assert.equal(text.slice(source.start,source.end).toLowerCase(),source.token);
    }
  }
});

test('modular voice provenance follows its source sentence and relation notes follow endpoints', () => {
  const analysis = analyzeText('달빛이 비친다. 바다가 흐른다.');
  analysis.syntax = analyzeSyntax(analysis.text);
  analysis.syntax.edges = [{from:0,to:2,type:'semantic'}];
  const voices = [];
  createStrudelCode(analysis,{}, {onVoice:voice => voices.push(voice)});
  const cues = createSourceCues(analysis,voices);
  const melodies = cues.filter(cue => cue.layer==='melody');
  assert.ok(melodies.some(cue => cue.sources.every(source => source.start<9)));
  assert.ok(melodies.some(cue => cue.sources.every(source => source.start>=9)));
  const relation = cues.filter(cue => cue.layer==='relation');
  assert.equal(relation[0].start,0);
  assert.equal(relation[0].sources[0].token,'달빛이');
  assert.equal(relation[1].start,2/16);
  assert.equal(relation[1].sources[0].token,'바다가');
});

test('each stanza retains local source offsets and a complete four-cycle timeline', () => {
  const score = createStanzaScore('달빛이 비친다\n\n햇살과 바람이 춤춘다',0,{});
  for (const section of score.sections) {
    assert.ok(section.cues.length);
    assert.ok(section.cues.some(cue => cue.start>=3));
    for (const cue of section.cues) for (const source of cue.sources) {
      assert.equal(section.text.slice(source.start,source.end).toLowerCase(),source.token);
    }
  }
});
