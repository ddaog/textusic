import test from 'node:test';
import assert from 'node:assert/strict';
import { readDraft, saveDraft, semanticStartupDelay } from '../src/session-safety.js';

test('draft survives reload and clearing input removes it', () => {
  const values = new Map();
  const storage = { getItem:key => values.get(key), setItem:(key,value) => values.set(key,value), removeItem:key => values.delete(key) };
  saveDraft(storage, '바다가 흐른다');
  assert.equal(readDraft(storage), '바다가 흐른다');
  saveDraft(storage, 'a'.repeat(300));
  assert.equal(readDraft(storage).length, 180);
  saveDraft(storage, '');
  assert.equal(readDraft(storage), '');
  assert.doesNotThrow(() => saveDraft(undefined, 'hello'));
  assert.equal(readDraft(undefined), '');
});

test('mobile and constrained devices automatically prepare AI after a longer first-play grace period', () => {
  for (const device of [{ userAgent:'iPhone Safari' }, { userAgent:'Android Chrome' }, { platform:'MacIntel', maxTouchPoints:5 }, { deviceMemory:4 }]) {
    assert.equal(semanticStartupDelay(device), 5000);
  }
  assert.equal(semanticStartupDelay({ platform:'MacIntel', maxTouchPoints:0 }), 1200);
  assert.equal(semanticStartupDelay({ deviceMemory:8 }), 1200);
});
