import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createProviderCommandBoundary} from '../src/provider-command.mjs';
import {observeComputeResources} from '../src/observe-compute-resources.mjs';
test('real Code asynchronous executor accepts exact request and only returns parsed provider data',async()=>{
  const boundary=createProviderCommandBoundary({environment:{PATH:'',PRIVATE_TEST_SECRET:'DUMMY_NATIVE_SECRET'},exists:()=>false});
  let responsive=false;
  const pending=boundary.jsonCommand(process.execPath,['--input-type=module','--eval',
    'await new Promise(resolve=>setTimeout(resolve,20));process.stdout.write(JSON.stringify({fixture:true}));']);
  setImmediate(()=>{responsive=true;});
  assert.deepEqual(await pending,{status:'observed',value:{fixture:true}});assert.equal(responsive,true);
});

test('Engineering module composes public dependency and never owns a new process engine',async()=>{
  const provider=await readFile(new URL('../src/provider-command.mjs',import.meta.url),'utf8');
  assert.match(provider,/@red-cup-engineering\/execute-javascript-node-command-service\/asynchronously/u);
  for(const file of ['provider-command','observe-compute-resources','observe-oci-compute-resources']){
    const source=await readFile(new URL(`../src/${file}.mjs`,import.meta.url),'utf8');
    assert.doesNotMatch(source,/node:child_process|promisify|bare-cedar-fog|cold-red-gate/u);
  }
});

test('native executor exceptions do not escape as provider output',async()=>{
 const boundary=createProviderCommandBoundary({environment:{},executeCommand:async()=>{throw Error('DUMMY_THROW_SECRET');}});
 assert.deepEqual(await boundary.command('fixture',[]),{status:'unavailable',reason:'provider-command-failed'});
});
