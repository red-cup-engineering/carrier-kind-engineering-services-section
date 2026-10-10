import {createContentHistoryStore} from './content-history-store.mjs';
/** Synchronous host KV custody: immutable addressed values and one atomic frontier.
 * The host owns persistence, transaction isolation and outgoing-message durability. */
export function createKeyValueHistoryStore({kv,transactionSync}){
 if(typeof kv?.get!=='function'||typeof kv?.put!=='function'||typeof transactionSync!=='function')throw new TypeError('history custody requires synchronous KV and atomic transactions');
 const rootKey='signcraft.frontier',key=id=>'signcraft.content.'+id,root=()=>kv.get(rootKey)??null;
 return createContentHistoryStore({
  root,
  read:id=>kv.get(key(id))??null,
  putAbsent(id,text){transactionSync(()=>{const prior=kv.get(key(id));if(prior===undefined)kv.put(key(id),text);else if(prior!==text)throw new TypeError('immutable history content changed');});},
  publish(expected,next){transactionSync(()=>{if(root()!==expected)throw new TypeError('SignCraft persisted frontier changed before publication');kv.put(rootKey,next);});},
 });
}

