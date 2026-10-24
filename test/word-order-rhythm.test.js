import test from 'node:test';
import assert from 'node:assert/strict';
import { wordOrderSyncopation } from '../src/word-order-rhythm.js';
import { phraseMelody } from '../src/melody-rhythm.js';
import { createStanzaScore } from '../src/stanzas.js';

test('ordinary Korean and English order is more grounded than inversion', () => {
  for (const [plain, inverted] of [['나는 바다를 바라본다','바라본다 나는 바다를'], ['the moon shines','shines the moon']]) {
    assert.ok(wordOrderSyncopation({text:plain}) < wordOrderSyncopation({text:inverted}));
  }
  assert.equal(wordOrderSyncopation({text:''}), .1);
});

test('grounded melody preserves beat starts without eliminating variation', () => {
  const notes=Array(4).fill('0 2 4 6 4 2 0 2');
  const plain=phraseMelody(notes,42,0).join(' ');
  const poetic=phraseMelody(notes,42,1).join(' ');
  assert.doesNotMatch(plain,/\[~ /);
  assert.match(poetic,/\[~ /);
  assert.notEqual(plain,poetic);
});

test('stanza pickups wrap around and respect beat off', () => {
  const text='기쁨 행복 사랑 춤\n\n무서움 두려움 어둠';
  const on=createStanzaScore(text,0,{mode:'on',intensity:.55});
  const off=createStanzaScore(text,0,{mode:'off'});
  assert.equal((on.code.match(/BRIDGE/g)||[]).length,2);
  assert.equal((on.code.match(/FILL/g)||[]).length,2);
  assert.doesNotMatch(off.code,/FILL/);
  assert.match(on.sections[1].code,new RegExp(`${on.sections[0].analysis.root}4:major`));
  assert.doesNotMatch(createStanzaScore('기쁨',0,{}).code,/BRIDGE/);
  assert.match(on.code,/<~ ~ ~ \[~ ~ ~ \[/);
});
