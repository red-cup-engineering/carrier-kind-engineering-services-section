import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalSeatBriefBearer as bearer } from '../src/seat-brief-principal.mjs';

const characters = new Map([
  ['chatgpt-web', { id: 'chatgpt-web', key: '561#chatgpt-web' }],
  ['561#chatgpt-web', { id: 'chatgpt-web', key: '561#chatgpt-web' }],
  ['another', { id: 'another', key: '561#another' }],
]);
const resolveCharacter = ref => characters.get(ref);
const account = 'https://cold-red-gate.561.group/actors/chatgpt-web';
const run = (providers, overrides={}) => bearer({account,providers,resolveCharacter,...overrides});

test('network actor resolves only through trusted provider binding',()=> {
  assert.equal(run([account,'chatgpt-web']),'chatgpt-web');
});
test('canonical character is its own authorized hand',()=> {
  assert.equal(run(['chatgpt-web'],{account:'chatgpt-web'}),'chatgpt-web');
});
test('a URI suffix does not confer a character or false zero seats',()=> {
  assert.throws(()=>run([account]),/no verified institutional character binding/);
});
test('two distinct verified characters cannot be chosen by array ordering',()=> {
  assert.throws(()=>run([account,'chatgpt-web','another']),/ambiguous/);
});
test('multiple aliases of one authored character are not spurious ambiguity',()=> {
  assert.equal(run([account,'chatgpt-web','561#chatgpt-web']),'chatgpt-web');
});
test('host provider projection must name the authenticated account first',()=> {
  assert.throws(()=>run(['chatgpt-web']),/host-derived provider set/);
});
test('malformed provider testimony is refused',()=> {
  assert.throws(()=>run([account,1]),/malformed/);
});
test('no provider can invent an unknown or unadmitted character',()=> {
  assert.throws(()=>run([account,'missing']),/no verified institutional character binding/);
});
test('misformed authored characters are not granted identities',()=> {
  assert.throws(()=>run([account,'bad'],{resolveCharacter:()=>({id:'chatgpt-web'})}),/record is malformed/);
});
test('empty or anonymous input is refused before projection',()=> {
  assert.throws(()=>run([account],{account:'   '}),/requires a named authenticated account/);
});
