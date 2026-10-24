import test from 'node:test';
import assert from 'node:assert/strict';
import { constrainedDevice, semanticSessionOptions, embedAndRelease } from '../src/semantic-memory.js';
import { interruptedSemanticPreparation, markSemanticPreparation } from '../src/session-safety.js';

test('phones use sequential inference without weight prepacking or memory arenas', () => {
  for (const device of [{userAgent:'iPhone Safari'}, {userAgent:'Android'}, {platform:'MacIntel',maxTouchPoints:5}, {deviceMemory:4}]) {
    const options = semanticSessionOptions(constrainedDevice(device));
    assert.equal(options.extra.session.disable_prepacking, '1');
    assert.equal(options.enableCpuMemArena, false);
    assert.equal(options.executionMode, 'sequential');
  }
  assert.deepEqual(semanticSessionOptions(constrainedDevice({userAgent:'Macintosh',deviceMemory:16})), {});
});

test('embedding releases inputs, model outputs and pooled tensors once', async () => {
  const freed=[];
  const tensor=name=>({dispose(){freed.push(name);}});
  const normalized={...tensor('normalized'),tolist:()=>[[.1,.2]]};
  const pooled={...tensor('pooled'),normalize:()=>normalized};
  const extractor={tokenizer:(texts,options)=>{assert.equal(options.max_length,48);return {input_ids:tensor('input'),attention_mask:tensor('mask')};},model:async()=>({last_hidden_state:tensor('output')})};
  assert.deepEqual(await embedAndRelease(extractor,['안녕'],()=>pooled),[[.1,.2]]);
  assert.deepEqual(freed,['input','mask','output','pooled','normalized']);
});

test('failed inference also releases its input tensors', async () => {
  let freed=0;
  const extractor={tokenizer:()=>({input_ids:{dispose(){freed++;}}}),model:async()=>{throw Error('failed');}};
  await assert.rejects(embedAndRelease(extractor,['hello'],()=>{}),/failed/);
  assert.equal(freed,1);
});

test('abrupt AI preparation reload backs off but normal completion and navigation clear it', () => {
  const values=new Map();
  const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  markSemanticPreparation(storage,true,1000);
  assert.equal(interruptedSemanticPreparation(storage,2000),true);
  markSemanticPreparation(storage,true,1500);
  assert.equal(interruptedSemanticPreparation(storage,601001),false);
  markSemanticPreparation(storage,false);
  assert.equal(interruptedSemanticPreparation(storage,2000),false);
  assert.equal(interruptedSemanticPreparation(undefined),false);
});
