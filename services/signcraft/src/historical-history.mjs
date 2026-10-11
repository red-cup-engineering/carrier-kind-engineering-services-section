import {semanticId} from '@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address';
import {bindHistoryArchive,checkpointHistory,materializeHistory,restoreHistory} from './history.mjs';

/** One-time receiving of the earlier relational representation of SignCraft history.
 *
 * Nothing here opens a database or runs a query. scripts/read-historical-history.py reads the old file
 * read-only and bounded, and streams its rows as JSON lines; this module reads those rows (grouped by
 * table, as `{tableName: [row, ...]}`), checks that they substantiate the history they record, and
 * writes that history into any content-history store. Receiving is offline and never runs at startup. */

const TABLE=/^signcraft_history_[a-z_]+$/u;
const byNumber=(...keys)=>(a,b)=>{for(const key of keys)if(a[key]!==b[key])return a[key]-b[key];return 0;};

function decodeChunks(rows,expected,label){
 if(!Number.isSafeInteger(expected)||expected<1||rows.length!==expected)throw new TypeError(`${label} has incomplete chunk data`);
 let result='';
 for(let index=0;index<rows.length;index+=1){
  if(rows[index].part!==index)throw new TypeError(`${label} chunks are not contiguous`);
  result+=rows[index].payload;
 }
 return result;
}

/** The rows of `table` whose `column` equals `value`, in part order. */
const partsOf=(rows,column,value)=>rows.filter(row=>row[column]===value).sort(byNumber('part'));

function revisionRows(held){
 return [...held('signcraft_history_revisions')].sort(byNumber('sequence')).map(header=>
  JSON.parse(decodeChunks(partsOf(held('signcraft_history_revision_chunks'),'revision_id',header.revision_id),header.parts,`revision ${header.revision_id}`)));
}

// Each log entry is the revisions one commit admitted, in order, as one chunked value.
function logEntries(held,from){
 const entries=new Map();
 for(const row of [...held('signcraft_history_log')].filter(row=>row.sequence>=from).sort(byNumber('sequence','part'))){
  if(!entries.has(row.sequence))entries.set(row.sequence,{sequence:row.sequence,parts:row.parts,rows:[]});
  entries.get(row.sequence).rows.push(row);
 }
 return [...entries.values()].map(entry=>({sequence:entry.sequence,revisions:JSON.parse(decodeChunks(entry.rows,entry.parts,`log entry ${entry.sequence}`))}));
}

function readTip(held,frontier){
 const last=[...held('signcraft_history_log')].filter(row=>row.part===0).sort(byNumber('sequence')).at(-1);
 if(last&&last.sequence>=frontier.log_from)return last;
 return {checkpoint_id:frontier.checkpoint_id};
}

function readingCells(held){
 return [...held('signcraft_history_reading')].sort(byNumber('sequence')).flatMap(subject=>
  JSON.parse(decodeChunks(partsOf(held('signcraft_history_reading_chunks'),'subject_key',subject.subject_key),subject.parts,`reading of ${subject.subject_key}`)));
}

/** The history, control state, retained contents and retained revisions the rows record, or null when they hold no SignCraft history. */
export function readHistoricalHistory(tables){
 const names=Object.keys(tables).filter(name=>TABLE.test(name));
 if(Object.keys(tables).some(name=>!TABLE.test(name)))throw new TypeError('Unexpected historical SignCraft table name');
 if(!names.length)return null;
 const present=new Set(names),held=name=>present.has(name)?tables[name]:[];
 let frontier=held('signcraft_history_frontier').find(row=>row.id===1)??null;
 if(frontier)frontier={...frontier,log_from:frontier.log_from??0};
 let checkpoint,functionalPredicates,controlText,history=null;
 if(frontier){
  functionalPredicates=JSON.parse(frontier.functional_predicates);
  checkpoint={id:frontier.checkpoint_id,heads:JSON.parse(frontier.heads),cells:readingCells(held),size:frontier.size,functionalPredicates};
  controlText=decodeChunks(partsOf(held('signcraft_history_control_chunks'),'id',1),frontier.control_parts,'control state');
  const entries=present.has('signcraft_history_log')?logEntries(held,frontier.log_from):[];
  history=restoreHistory({kind:'signcraft.history',functionalPredicates,checkpoint,revisions:entries.flatMap(entry=>entry.revisions)});
  if(entries.length){
   history=checkpointHistory(history);
   if(history.checkpoint.id!==readTip(held,frontier).checkpoint_id)throw new TypeError('Historical SignCraft log does not reach its recorded checkpoint');
  }
 }else if(present.has('signcraft_history_state')){
  const state=held('signcraft_history_state').find(row=>row.id===1);
  if(state){
   ({checkpoint}=JSON.parse(decodeChunks(partsOf(held('signcraft_history_checkpoint_chunks'),'id',1),state.checkpoint_parts,'checkpoint')));
   if(checkpoint?.id!==state.checkpoint_id)throw new TypeError('Historical SignCraft checkpoint identity disagrees with its header');
   functionalPredicates=checkpoint.functionalPredicates;
   history=restoreHistory({kind:'signcraft.history',functionalPredicates,checkpoint,revisions:[]});
   controlText=decodeChunks(partsOf(held('signcraft_history_control_chunks'),'id',1),state.control_parts,'control state');
  }
 }
 const revisions=[...revisionRows(held),...logEntries(held,0).flatMap(entry=>entry.revisions)];
 let full=null;
 if(history!==null){
  history=bindHistoryArchive(history,()=>revisions);
  // Native materialization verifies that the archive substantiates its current reading.
  full=materializeHistory(history);
 }else{
  if(revisions.length)throw new TypeError('Historical SignCraft archive has no recorded frontier');
  for(const name of names)
   if(!['signcraft_history_content','signcraft_history_content_chunks'].includes(name)&&held(name).length)throw new TypeError('Historical SignCraft material has no recorded frontier');
 }
 const contents=held('signcraft_history_content').map(header=>{
  const value=JSON.parse(decodeChunks(partsOf(held('signcraft_history_content_chunks'),'id',header.id),header.parts,'content '+header.id));
  if(semanticId(value)!==header.id)throw new TypeError('Historical SignCraft content does not match its address');
  return {id:header.id,value};
 });
 return {history:full,control:history===null?null:JSON.parse(controlText),contents,revisions,tables:names};
}

/** Write received historical rows into `store` (any content-history store) and prove the store now reads the same history. */
export function receiveHistoricalHistory({tables,store}){
 const source=readHistoricalHistory(tables);if(!source)return null;
 for(const {id,value} of source.contents)if(store.retain(value)!==id)throw new TypeError('Received SignCraft content changed identity');
 // Preserve even retained revisions outside the current frontier, as historical material.
 for(const r of source.revisions){
  const id=store.retain({subject:'signcraft.history',predicate:'revision',object:{parents:r.parents,source:r.source,cells:r.cells}});
  if(id!==r.id)throw new TypeError('Received SignCraft revision changed identity');
 }
 let loaded=null;
 if(source.history!==null){
  store.commit(source.history,source.control);
  loaded=store.load();
  if(loaded.history.checkpoint.id!==checkpointHistory(source.history).checkpoint.id||semanticId(loaded.control)!==semanticId(source.control))throw new TypeError('Receiving did not preserve the current SignCraft state');
  materializeHistory(loaded.history);
 }
 return loaded;
}

const MAX_ROWS=200000;

/** Group the reader's JSON lines by table, checking the source header, the per-table counts and the terminal line. */
export function collectHistoricalLines(lines){
 let header=null,end=null;const tables=Object.create(null);let rows=0;
 for(const line of lines){
  if(!line)continue;
  const entry=JSON.parse(line);
  if(end!==null)throw new TypeError('Historical input continues after its terminal line');
  if(entry.kind==='source'){
   if(header!==null)throw new TypeError('Historical input has two source headers');
   header=entry;for(const name of Object.keys(entry.tables)){if(!TABLE.test(name))throw new TypeError('Unexpected historical SignCraft table name');tables[name]=[];}
  }else if(entry.kind==='row'){
   if(header===null||!Object.hasOwn(tables,entry.table)||!entry.row||typeof entry.row!=='object')throw new TypeError('Historical row is outside the declared source');
   if(++rows>MAX_ROWS)throw new TypeError('Historical row count exceeds the receiving bound');
   tables[entry.table].push(entry.row);
  }else if(entry.kind==='end')end=entry;
  else throw new TypeError('Unknown historical input line');
 }
 if(header===null||end===null)throw new TypeError('Historical input is incomplete');
 if(end.sha256!==header.sha256)throw new TypeError('Historical source changed while it was read');
 for(const [name,count] of Object.entries(header.tables))if(tables[name].length!==count||end.tables?.[name]!==count)throw new TypeError(`Historical table ${name} row count differs`);
 return {sha256:header.sha256,tables};
}
