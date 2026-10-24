import test from 'node:test';
import assert from 'node:assert/strict';
import { Pattern, pure } from '../node_modules/@strudel/core/pattern.mjs';
import { blendPatterns, transitionWindow, transitionProgress } from '../src/semantic-transition.js';
import { analyzeText } from '../src/text-analyzer.js';
import { createStrudelCode, MusicEngine } from '../src/music-engine.js';

test('transition waits for a safe bar boundary and lasts four bars', () => {
  assert.deepEqual(transitionWindow({ now:() => 2.8, lastEnd:3.05 }), { start:4, end:8 });
  assert.equal(transitionProgress(3,4,8), 0);
  assert.equal(transitionProgress(6,4,8), .5);
  assert.equal(transitionProgress(8,4,8), 1);
});

test('real Strudel patterns keep old events before boundary and crossfade without an empty bar', () => {
  const old = pure({ sound:'triangle', gain:.2 });
  const next = pure({ sound:'sine', gain:.2 });
  const blend = blendPatterns(Pattern, old, next, { start:2, end:6 });
  assert.deepEqual(blend.queryArc(1,2).map(h=>h.value), [{sound:'triangle',gain:.2}]);
  for (let bar=2; bar<6; bar++) {
    const events = blend.queryArc(bar,bar+1);
    assert.ok(events.length > 0);
    assert.ok(Math.abs(events.reduce((n,h)=>n+h.value.gain,0)-.2) < 1e-9);
  }
  assert.deepEqual(blend.queryArc(6,7).map(h=>h.value), [{sound:'sine',gain:.2}]);
});

test('AI enrichment preserves tempo, scale and note patterns of the foundation', () => {
  const base = analyzeText('고요한 바다가 빛난다');
  const target = structuredClone(base);
  target.root = 'F#'; target.axes.motion = 1; target.axes.light = 1;
  target.tokenMeanings[0].conceptIds = ['fear'];
  const original = createStrudelCode(base);
  const enriched = createStrudelCode(target, {}, {foundation:base});
  assert.equal(original.split('\n')[0], enriched.split('\n')[0]);
  assert.deepEqual(original.match(/\.scale\("[^"]+"\)/g), enriched.match(/\.scale\("[^"]+"\)/g));
  assert.deepEqual(original.match(/n\("[^"]+"\)/g), enriched.match(/n\("[^"]+"\)/g));
  assert.notEqual(original, enriched);
});

test('AI updates do not restart transport or apply a new tempo', async () => {
  let editPattern, starts=0, stops=0, source;
  const old = pure({gain:.2});
  const repl = {
    scheduler:{ started:false, now:()=>2.5, lastEnd:2.6, pattern:old }, state:{},
    async evaluate(code) { source=code; this.scheduler.pattern=editPattern(old); },
    async start() { starts++; this.scheduler.started=true; },
    stop() { stops++; this.scheduler.started=false; },
  };
  const engine = new MusicEngine(async () => ({ Pattern, initStrudel:async opts => { editPattern=opts.editPattern;return repl; } }));
  await engine.play('setcpm(20)\nstack()');
  await engine.play('setcpm(25)\nstack()', {semantic:true});
  assert.equal(source, 'stack()');
  assert.equal(starts,1); assert.equal(stops,0);
  assert.equal(engine.transitionEnd,7);
  assert.equal(engine.playing,true);
  engine.stop();
  assert.equal(stops,1);
});
