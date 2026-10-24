import test from 'node:test';
import assert from 'node:assert/strict';
import { splitStanzas, createStanzaScore, stanzaPosition } from '../src/stanzas.js';
import { visiblePatternCode } from '../src/live-code.js';
import { createArrangement } from '../src/music-engine.js';
import { analyzeText } from '../src/text-analyzer.js';
import { arrange, pure } from '../node_modules/@strudel/core/pattern.mjs';
import { phraseMelody } from '../src/melody-rhythm.js';

test('blank lines separate stanzas but single line breaks do not', () => {
  const text='기쁨\n춤\n \n\n두려움\n밤\n\n';
  const sections=splitStanzas(text);
  assert.deepEqual(sections.map(s=>s.text), ['기쁨\n춤','두려움\n밤']);
  for (const s of sections) assert.equal(text.slice(s.start,s.end),s.text);
  assert.equal(splitStanzas('\n\n  \n').length,0);
  assert.equal(splitStanzas('a\r\n\r\nb').length,2);
  assert.equal(splitStanzas('a\nb').length,1);
});

test('contrasting stanzas have independent music and one shared transport tempo', () => {
  const score=createStanzaScore('기쁨 행복 사랑 춤\n\n무서움 두려움 어둠',0,{mode:'on'});
  assert.equal(score.sections.length,2);
  assert.equal(score.sections[0].analysis.scale,'major');
  assert.equal(score.sections[1].analysis.scale,'minor');
  assert.equal((score.code.match(/setcpm/g)||[]).length,1);
  assert.match(score.code,/arrange\(/);
  assert.match(score.sections[1].code,/sawtooth/);
  assert.equal(score.sections[0].analysis.root,score.sections[1].analysis.root);
  assert.equal(score.sections[0].analysis.seed,score.sections[1].analysis.seed);
  assert.ok(visiblePatternCode(score.code).some(line=>line.includes('STANZA 2')));
});

test('melody phrasing combines long/short values, offbeats and a closing rest', () => {
  const bars=phraseMelody(Array(4).fill('0 2 4 6 4 2 0 2'),42,1);
  assert.equal(bars.length,4);
  assert.match(bars.join(' '),/@3/);
  assert.match(bars.join(' '),/\[~ /);
  assert.match(bars[3],/\[0@3 ~\]$/);
  assert.notEqual(bars[0],bars[1]);
  assert.deepEqual(bars,phraseMelody(Array(4).fill('0 2 4 6 4 2 0 2'),42,1));
});

test('real Strudel arrangement plays 4 bars of each stanza and loops', () => {
  const pattern=arrange([4,pure('joy')],[4,pure('fear')]);
  for (let bar=0;bar<16;bar++) {
    assert.equal(pattern.queryArc(bar,bar+1)[0].value, Math.floor(bar/4)%2 ? 'fear':'joy');
    assert.equal(stanzaPosition(bar,2).index,Math.floor(bar/4)%2);
    assert.equal(stanzaPosition(bar,2).bar,bar%4+1);
  }
});

test('AI enrichment keeps each stanza foundation, while edits can create new sections', () => {
  const text='luma dances\n\nnori sleeps';
  const base=createStanzaScore(text,0,{});
  const enriched=createStanzaScore(text,0,{}, {meanings:{luma:{matches:[{id:'fear',weight:1}],axes:{light:-.5}}}},base);
  assert.deepEqual(enriched.sections.map(s=>s.analysis.scale),base.sections.map(s=>s.analysis.scale));
  assert.equal(enriched.bpm,base.bpm);
  assert.equal(createStanzaScore('luma',0,{}).code.includes('arrange('),false);
});

test('different anchors and variations produce a broad deterministic set of melodies and beats', () => {
  const melodies=new Set(), beats=new Set();
  for (const word of ['moon','sun','sea','wind','flower','river','city','dream']) {
    for (let variation=0;variation<4;variation++) {
      const a=createArrangement(analyzeText(`${word} dances above the waves`,variation));
      melodies.add(a.melody.join('|')); beats.add(a.rhythm.family);
      assert.deepEqual(a,createArrangement(analyzeText(`${word} dances above the waves`,variation)));
    }
  }
  assert.ok(melodies.size>=16);
  assert.ok(beats.size>=8);
});
