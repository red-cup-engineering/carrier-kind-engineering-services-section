import assert from 'node:assert/strict';
import test from 'node:test';
import { createToolPlatform } from '../src/agents.mjs';
import { encodeOperationRequest, decodeOperationOutcome, jsonWireCodec, wireCodecCatalog } from '../src/wire.mjs';

const tools = [{ type: 'function', function: { name: 'increment', parameters: {
  type: 'object', required: ['n'], properties: { n: { type: 'integer' } }, additionalProperties: false,
} } }];

test('a model tool is the same typed operation over local and wire entry paths', async () => {
  let invoked = 0;
  const platform = createToolPlatform({ tools, toolHandlers: { increment: ({ n }) => { invoked++; return n + 1; } }, toolResultSchemas: { increment: { type: 'integer' } } });
  const codecs = wireCodecCatalog([jsonWireCodec]);
  const wire = async (input, allowedEffects = ['increment']) => decodeOperationOutcome(await platform.dispatch(encodeOperationRequest({ actorResourceCatalog: {},
    requestId: 'test', operationId: 'increment', inputCodec: 'json', input: JSON.stringify(input), outputCodec: 'json',
  }), { codecs, allowedEffects }), codecs).result;
  try {
    assert.equal((await wire({ n: 2 }, [])).refusal.code, 'EffectRefused');
    assert.equal((await wire({ n: '2' })).refusal.code, 'InvalidInput');
    assert.equal(invoked, 0);
    assert.deepEqual(await platform.execute('increment', { n: 2 }, { allowedEffects: ['increment'] }), { ok: true, value: 3 });
    assert.deepEqual(await wire({ n: 2 }), { ok: true, value: 3 });
    assert.equal(invoked, 2);
  } finally { await platform.close(); }
});

test('the core owns model tool output refusal and waits for a pending tool at shutdown', async () => {
  let finish;
  const platform = createToolPlatform({ tools, toolHandlers: { increment: () => new Promise(resolve => { finish = resolve; }) }, toolResultSchemas: { increment: { type: 'integer' } } });
  const pending = platform.execute('increment', { n: 1 }, { allowedEffects: ['increment'] });
  await platform.start();
  const closing = platform.close();
  let closed = false;
  closing.then(() => { closed = true; });
  await Promise.resolve();
  assert.equal(closed, false);
  finish('wrong');
  assert.equal((await pending).refusal.code, 'InvalidOutput');
  await closing;
  assert.equal(closed, true);
});
