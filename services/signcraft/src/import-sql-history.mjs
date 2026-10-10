import {semanticId} from '@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address';
import {bindHistoryArchive,checkpointHistory,materializeHistory,restoreHistory} from './history.mjs';

function decodeChunks(rows, expected, label) {
  if (!Number.isSafeInteger(expected) || expected < 1 || rows.length !== expected) {
    throw new TypeError(`${label} has incomplete chunk data`);
  }
  let result = "";
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.part !== index) throw new TypeError(`${label} chunks are not contiguous`);
    result += row.payload;
  }
  return result;
}


function readChunked(sql, table, keyColumn, keyValue, count, label) {
  const rows = [...sql.exec(`SELECT part,payload FROM ${table} WHERE ${keyColumn} = ? ORDER BY part`, keyValue)];
  return JSON.parse(decodeChunks(rows, count, label));
}


function revisionRows(sql) {
  const headers = [...sql.exec(
    "SELECT revision_id,sequence,parts FROM signcraft_history_revisions ORDER BY sequence",
  )];
  return headers.map((header) => {
    const rows = [...sql.exec(
      "SELECT part,payload FROM signcraft_history_revision_chunks WHERE revision_id = ? ORDER BY part",
      header.revision_id,
    )];
    return JSON.parse(decodeChunks(rows, header.parts, `revision ${header.revision_id}`));
  });
}

// Each log entry is the revisions one commit admitted, in order, as one chunked value.
function logEntries(sql, from) {
  const entries = [];
  let current = null;
  for (const row of sql.exec("SELECT sequence,part,parts,payload FROM signcraft_history_log WHERE sequence >= ? ORDER BY sequence,part", from)) {
    if (current?.sequence !== row.sequence) {
      if (current) entries.push(current);
      current = { sequence: row.sequence, parts: row.parts, rows: [] };
    }
    current.rows.push(row);
  }
  if (current) entries.push(current);
  return entries.map((entry) => ({ sequence: entry.sequence, revisions: JSON.parse(decodeChunks(entry.rows, entry.parts, `log entry ${entry.sequence}`)) }));
}

function archiveRows(sql) {
  return [...revisionRows(sql), ...logEntries(sql, 0).flatMap((entry) => entry.revisions)];
}

function readFrontier(sql) {
  return [...sql.exec(
    "SELECT * FROM signcraft_history_frontier WHERE id = 1",
  )].map(row=>({...row,log_from:row.log_from??0}))[0] ?? null;
}

// The newest reading the store holds: the last log entry past the compacted base, else the base.
function readTip(sql, frontier) {
  const last = [...sql.exec(
    "SELECT sequence,checkpoint_id,heads,since_base,weight FROM signcraft_history_log WHERE part = 0 ORDER BY sequence DESC LIMIT 1",
  )][0];
  const next = last ? last.sequence + 1 : 0;
  if (last && last.sequence >= frontier.log_from) return { ...last, next };
  return { checkpoint_id: frontier.checkpoint_id, heads: frontier.heads, since_base: 0, weight: 0, next };
}


function readingCells(sql) {
  const subjects = [...sql.exec("SELECT subject_key,parts FROM signcraft_history_reading ORDER BY sequence")];
  return subjects.flatMap((subject) => readChunked(
    sql, "signcraft_history_reading_chunks", "subject_key", subject.subject_key, subject.parts, `reading of ${subject.subject_key}`,
  ));
}


/** Read-only admission of prior SQL representations; no legacy writer survives. */
export function readSqlHistory(sql){
 const tables=[...sql.exec("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'signcraft_history_%'")].map(row=>row.name);
 if(!tables.length)return null;
 const held=new Set(tables);let frontier=held.has('signcraft_history_frontier')?readFrontier(sql):null;
 let checkpoint,functionalPredicates,controlText,history=null;
 if(frontier){
  functionalPredicates=JSON.parse(frontier.functional_predicates);
  checkpoint={id:frontier.checkpoint_id,heads:JSON.parse(frontier.heads),cells:readingCells(sql),size:frontier.size,functionalPredicates};
  controlText=decodeChunks([...sql.exec('SELECT part,payload FROM signcraft_history_control_chunks WHERE id=1 ORDER BY part')],frontier.control_parts,'control state');
  const entries=held.has('signcraft_history_log')?logEntries(sql,frontier.log_from??0):[];
  history=restoreHistory({kind:'signcraft.history',functionalPredicates,checkpoint,revisions:entries.flatMap(entry=>entry.revisions)});
  if(entries.length){
   history=checkpointHistory(history);
   if(history.checkpoint.id!==readTip(sql,frontier).checkpoint_id)throw new TypeError('Legacy SignCraft log does not reach its recorded checkpoint');
  }
 }else if(held.has('signcraft_history_state')){
  const state=[...sql.exec('SELECT checkpoint_id,checkpoint_parts,control_parts,next_sequence FROM signcraft_history_state WHERE id=1')][0];
  if(state){
  ({checkpoint}=readChunked(sql,'signcraft_history_checkpoint_chunks','id',1,state.checkpoint_parts,'checkpoint'));
  if(checkpoint?.id!==state.checkpoint_id)throw new TypeError('Legacy SignCraft checkpoint identity disagrees with its header');
  functionalPredicates=checkpoint.functionalPredicates;
  history=restoreHistory({kind:'signcraft.history',functionalPredicates,checkpoint,revisions:[]});
  controlText=decodeChunks([...sql.exec('SELECT part,payload FROM signcraft_history_control_chunks WHERE id=1 ORDER BY part')],state.control_parts,'control state');
  }
 }
 const revisions=[...(held.has('signcraft_history_revisions')?revisionRows(sql):[]),...(held.has('signcraft_history_log')?logEntries(sql,0).flatMap(e=>e.revisions):[])];
 let full=null;
 if(history!==null){
  history=bindHistoryArchive(history,()=>revisions);
  // Native materialization verifies that the admitted archive substantiates its current reading.
  full=materializeHistory(history);
 }else{
  if(revisions.length)throw new TypeError('Legacy SignCraft archive has no recorded frontier');
  for(const table of tables){
   if(!/^signcraft_history_[a-z_]+$/u.test(table))throw new TypeError('Unexpected legacy SignCraft table name');
   if(!['signcraft_history_content','signcraft_history_content_chunks'].includes(table)&&[...sql.exec('SELECT 1 FROM '+table+' LIMIT 1')].length)throw new TypeError('Legacy SignCraft material has no recorded frontier');
  }
 }
 const contents=held.has('signcraft_history_content')?[...sql.exec('SELECT id,parts FROM signcraft_history_content')].map(header=>{
  const value=readChunked(sql,'signcraft_history_content_chunks','id',header.id,header.parts,'content '+header.id);
  if(semanticId(value)!==header.id)throw new TypeError('Legacy SignCraft content does not match its address');
  return {id:header.id,value};
 }):[];
 return {history:full,control:history===null?null:JSON.parse(controlText),contents,revisions,tables};
}

export function importSqlHistory({sql,store,retire=false}){
 const source=readSqlHistory(sql);if(!source)return null;
 for(const {id,value} of source.contents)if(store.retain(value)!==id)throw new TypeError('Imported SignCraft content changed identity');
 // Preserve even retained revisions outside the current frontier, as historical material.
 for(const r of source.revisions){
  const id=store.retain({subject:'signcraft.history',predicate:'revision',object:{parents:r.parents,source:r.source,cells:r.cells}});
  if(id!==r.id)throw new TypeError('Imported SignCraft revision changed identity');
 }
 let loaded=null;
 if(source.history!==null){
 store.commit(source.history,source.control);
 loaded=store.load();
 if(loaded.history.checkpoint.id!==checkpointHistory(source.history).checkpoint.id||semanticId(loaded.control)!==semanticId(source.control))throw new TypeError('SQL history admission did not preserve its current state');
 materializeHistory(loaded.history);
 }
 if(retire)for(const table of source.tables){
  if(!/^signcraft_history_[a-z_]+$/u.test(table))throw new TypeError('Unexpected legacy SignCraft table name');
  sql.exec('DROP TABLE '+table);
 }
 return loaded;
}
