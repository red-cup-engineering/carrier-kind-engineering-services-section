import test from 'node:test';
import assert from 'node:assert/strict';
import {cell} from '@red-cup-engineering/signcell/cell';
import {createHistory,observeHistory,queryHistory,materializeHistory,historyHeads,historySize} from '../src/history.mjs';
import {createKeyValueHistoryStore} from '../src/key-value-history-store.mjs';

const at=(s,p,o,w='w')=>cell(s,p,o,{for:[w]});
function same(a,b){
 assert.deepEqual(queryHistory(a,{}),queryHistory(b,{}));assert.deepEqual(historyHeads(a),historyHeads(b));assert.equal(historySize(a),historySize(b));
}
/** A host KV with synchronous transactions that roll back on a throw, as a Durable Object's storage does. */
function hostKv(){
 const data=new Map();let staged=null;
 const kv={get:key=>(staged?.has(key)?staged.get(key):data.get(key)),put:(key,value)=>{(staged??data).set(key,value);}};
 const transactionSync=operation=>{
  if(staged)return operation();
  staged=new Map();
  try{const result=operation();for(const [key,value] of staged)data.set(key,value);return result;}
  finally{staged=null;}
 };
 return {data,kv,transactionSync};
}

test('the key-value carrier commits and reloads the same causal history',()=>{
 const host=hostKv(),store=createKeyValueHistoryStore(host);
 let full=observeHistory(createHistory(['location']),[at('alice','location','garden')]);
 let held=store.commit(full,{clock:0});
 for(let turn=1;turn<=5;turn+=1){
  const batch=[at('alice','location',turn%2?'kitchen':'garden'),at('bob','met','alice:'+turn)];
  full=observeHistory(full,batch);held=store.commit(observeHistory(held,batch),{clock:turn});
 }
 const loaded=store.load();
 same(loaded.history,full);same(materializeHistory(loaded.history),full);
 assert.deepEqual(loaded.control,{clock:5});
 same(createKeyValueHistoryStore(host).load().history,full);
});

test('the key-value carrier refuses custody without synchronous KV and atomic transactions',()=>{
 assert.throws(()=>createKeyValueHistoryStore({kv:new Map()}),/synchronous KV and atomic transactions/);
 assert.throws(()=>createKeyValueHistoryStore({kv:{get(){},put(){}}}),/synchronous KV and atomic transactions/);
});

test('a commit over a frontier another writer moved is refused and publishes nothing',()=>{
 const host=hostKv(),first=createKeyValueHistoryStore(host),second=createKeyValueHistoryStore(host);
 const base=observeHistory(createHistory([]),[at('alice','said','hello')]);
 first.commit(base,{clock:0});second.load();first.load();
 second.commit(observeHistory(base,[at('bob','said','hi')]),{clock:1});
 const frontier=host.data.get('signcraft.frontier');
 assert.throws(()=>first.commit(observeHistory(base,[at('carol','said','hey')]),{clock:1}));
 assert.equal(host.data.get('signcraft.frontier'),frontier);
});
