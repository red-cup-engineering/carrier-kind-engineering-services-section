import {createContentHistoryStore} from './content-history-store.mjs';
import {importSqlHistory} from './import-sql-history.mjs';
const CHUNK_CHARACTERS=180000;

/** A synchronous SQL data port for hosts whose persistence medium is SQL.
 * History, readings, ancestry and content identities belong to the shared kernel. */
export function createSqlHistoryStore({sql,transactionSync}){
 if(typeof sql?.exec!=='function'||typeof transactionSync!=='function')throw new TypeError('SQL custody requires atomic synchronous transactions');
 sql.exec('CREATE TABLE IF NOT EXISTS signcraft_content (id TEXT NOT NULL,part INTEGER NOT NULL,parts INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(id,part)) WITHOUT ROWID');
 sql.exec('CREATE TABLE IF NOT EXISTS signcraft_frontier (singleton INTEGER PRIMARY KEY CHECK(singleton=1),content_id TEXT NOT NULL)');
 let inside=false;
 const atomic=action=>{
  if(inside)return action();
  return transactionSync(()=>{inside=true;try{return action();}finally{inside=false;}});
 };
 const root=()=>[...sql.exec('SELECT content_id FROM signcraft_frontier WHERE singleton=1')][0]?.content_id??null;
 const storage={
  root,
  read(id){
   const rows=[...sql.exec('SELECT part,parts,payload FROM signcraft_content WHERE id=? ORDER BY part',id)];
   if(!rows.length)return null;
   if(!Number.isSafeInteger(rows[0].parts)||rows[0].parts<1||rows.length!==rows[0].parts||rows.some((r,i)=>r.part!==i||r.parts!==rows.length))throw new TypeError('SignCraft content has incomplete chunk data');
   return rows.map(r=>r.payload).join('');
  },
  putAbsent(id,text){
   atomic(()=>{
    if([...sql.exec('SELECT part FROM signcraft_content WHERE id=? LIMIT 1',id)].length)return;
    const chunks=[];
    for(let start=0;start<text.length;){
     let end=Math.min(text.length,start+CHUNK_CHARACTERS);
     if(end<text.length&&text.charCodeAt(end-1)>=0xd800&&text.charCodeAt(end-1)<=0xdbff)end--;
     chunks.push(text.slice(start,end));start=end;
    }
    if(!chunks.length)chunks.push('');
    chunks.forEach((payload,part)=>sql.exec('INSERT INTO signcraft_content(id,part,parts,payload) VALUES(?,?,?,?)',id,part,chunks.length,payload));
   });
  },
  publish(expected,next){
   atomic(()=>{
    if(root()!==expected)throw new TypeError('SignCraft persisted frontier changed before publication');
    sql.exec('INSERT INTO signcraft_frontier(singleton,content_id) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET content_id=excluded.content_id',next);
   });
  },
 };
 const store=createContentHistoryStore(storage);
 if(root()===null)atomic(()=>importSqlHistory({sql,store,retire:true}));
 return store;
}

