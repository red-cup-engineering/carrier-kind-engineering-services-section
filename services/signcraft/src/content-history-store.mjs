import {semanticId} from '@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address';
import {coincides} from '@red-cup-engineering/signcell/cell';
import {checkpointHistory,bindHistoryArchive,historyHeads,historySectionOfCells,historySize,historySubjectCells,identifyHistoryCheckpoint,identifyRevision,restoreHistory,retainHistoryCell,validateHistory} from './history.mjs';

const STRUCTURED='signcraft.structured-content.v1',LITERAL_CHARACTERS=512;
const REVISION_SUBJECT='signcraft.history',REVISION_PREDICATE='revision';
const LEAF='signcraft.index-leaf.v1',BRANCH='signcraft.index-branch.v1',FRONTIER='signcraft.history-frontier.v2',LEGACY_FRONTIER='signcraft.history-frontier.v1';
const NAME_LEAF='signcraft.name-index-leaf.v1',NAME_BRANCH='signcraft.name-index-branch.v1';
const fail=message=>{throw new TypeError(message);};
const niPattern=/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u;
const named=value=>typeof value==='string'&&niPattern.test(value);
function encode(value){
 const text=JSON.stringify(value,(_key,item)=>{
  if(item===undefined||typeof item==='bigint'||typeof item==='function'||typeof item==='symbol'||(typeof item==='number'&&!Number.isFinite(item)))fail('SignCraft content requires finite JSON values');
  return item;
 });
 if(text===undefined)fail('SignCraft content requires a JSON value');return text;
}
const sorted=entries=>entries.sort(([a],[b])=>a<b?-1:a>b?1:0);
/** Two kinds of addressed trie: one keyed by content addresses (readings, subject order, the
 * predicate index), one keyed by subject names, whose in-order walk is the names' order. */
const ADDRESSED={leaf:LEAF,branch:BRANCH,key:named},NAMES={leaf:NAME_LEAF,branch:NAME_BRANCH,key:key=>typeof key==='string'&&key.endsWith('\u0000\u0000')};
/** A subject's name: a text subject is its text; any other term is its JSON after a NUL, so it sorts first. */
const subjectName=subject=>typeof subject==='string'?subject:'\u0000'+JSON.stringify(subject);
/** A name as a name-trie key: NUL escaped as NUL SOH and the key ended by NUL NUL, so no key is a
 * prefix of another and keys order exactly as their names do. */
const escapeName=name=>name.replaceAll('\u0000','\u0000\u0001');
const nameKey=subject=>escapeName(subjectName(subject))+'\u0000\u0000';

/** Immutable content and one atomic compare-and-publish frontier. Storage is a data port:
 * read(id), putAbsent(id,text), root(), publish(expected,next). All operations are synchronous.
 * No SQL schema, compaction policy or filesystem layout participates in history semantics. */
export function createContentHistoryStore(storage){
 for(const name of ['read','putAbsent','root','publish'])if(typeof storage?.[name]!=='function')fail('history storage needs '+name);
 let heldRoot,heldSubjects=new Map(),heldSubjectOrder=[],heldCheckpoint=null;
 function content(id){return decodeContent(id,new Set());}
 function decodeContent(id,active){
  if(!named(id))fail('SignCraft content address is invalid');
  if(active.has(id))fail('SignCraft structured content has a cycle');active.add(id);
  try{
   const text=storage.read(id);if(text===null)fail('SignCraft content '+id+' is not retained');
   const record=JSON.parse(text);if(semanticId(record)===id)return record;
   if(record?.kind!==STRUCTURED||!['array','object'].includes(record.form)||!Number.isSafeInteger(record.count)||record.count<0||(record.index!==null&&!named(record.index)))fail('SignCraft content '+id+' does not match its address');
   const read=child=>decodeContent(child,active),entries=leaves(record.index,read);
   if(entries.length!==record.count)fail('SignCraft structured content has incomplete entries');
   let value;
   if(record.form==='array'){
    entries.sort((a,b)=>a.value.ordinal-b.value.ordinal);
    value=entries.map(({key,value:entry},ordinal)=>{
     if(entry.ordinal!==ordinal||key!==semanticId({controlOrdinal:ordinal})||!named(entry.content))fail('SignCraft structured sequence has invalid order');
     return read(entry.content);
    });
   }else{
    const names=new Set();
    value=Object.fromEntries(entries.map(({key,value:entry})=>{
     if(typeof entry.property!=='string'||key!==semanticId({controlProperty:entry.property})||names.has(entry.property)||!named(entry.content))fail('SignCraft structured object has invalid properties');
     names.add(entry.property);return [entry.property,read(entry.content)];
    }));
   }
   if(semanticId(value)!==id)fail('SignCraft content '+id+' does not match its address');
   return value;
  }finally{active.delete(id);}
 }
 function retain(value){
  const id=semanticId(value),text=encode(value),held=storage.read(id);
  if(held!==null){content(id);return id;}
  storage.putAbsent(id,text);
  if(semanticId(content(id))!==id)fail('SignCraft content was not retained');
  return id;
 }
 function node(id,read=content,space=ADDRESSED){
  const value=read(id);
  if(value.kind===space.leaf){
   if(!space.key(value.key))fail('invalid SignCraft index key');
  }else if(value.kind===space.branch){
   if(typeof value.prefix!=='string'||!Array.isArray(value.children)||value.children.length<2)fail('invalid SignCraft index branch');
   const labels=value.children.map(([label,child])=>{if(typeof label!=='string'||label.length!==1||!named(child))fail('invalid SignCraft index edge');return label;});
   if(new Set(labels).size!==labels.length||JSON.stringify([...labels].sort())!==JSON.stringify(labels))fail('invalid SignCraft index ordering');
  }else fail('invalid SignCraft index node');
  return value;
 }
 function lookup(root,key,space=ADDRESSED){
  while(root!==null){
   const n=node(root,content,space);
   if(n.kind===space.leaf)return n.key===key?n.value:null;
   if(!key.startsWith(n.prefix))return null;
   root=n.children.find(([label])=>label===key[n.prefix.length])?.[1]??null;
  }return null;
 }
 function update(root,key,value,space=ADDRESSED){
  const leaf=()=>retain({kind:space.leaf,key,value}),branch=(prefix,children)=>retain({kind:space.branch,prefix,children:sorted(children)});
  if(root===null)return value===null?null:leaf();
  const n=node(root,content,space);
  if(n.kind===space.leaf){
   if(n.key===key)return value===null?null:leaf();
   if(value===null)return root;
   let at=0;while(key[at]===n.key[at])at++;
   return branch(key.slice(0,at),[[key[at],leaf()],[n.key[at],root]]);
  }
  let at=0;while(at<n.prefix.length&&key[at]===n.prefix[at])at++;
  if(at<n.prefix.length){
   if(value===null)return root;
   return branch(key.slice(0,at),[[key[at],leaf()],[n.prefix[at],root]]);
  }
  const label=key[at],children=new Map(n.children),prior=children.get(label)??null,next=update(prior,key,value,space);
  if(next===prior)return root;
  if(next===null)children.delete(label);else children.set(label,next);
  if(children.size===0)return null;
  if(children.size===1)return [...children.values()][0];
  return branch(n.prefix,[...children]);
 }
 function leaves(root,read=content,space=ADDRESSED){
  const result=[],pending=root===null?[]:[root],seen=new Set();
  while(pending.length){
   const id=pending.pop();if(seen.has(id))fail('SignCraft index repeats a node');seen.add(id);
   const n=node(id,read,space);if(n.kind===space.leaf)result.push(n);else for(const [,child] of n.children)pending.push(child);
  }return result;
 }
 /** The name-trie leaves under `prefix` whose keys come after `after`, in key order, reading
  * only the paths that can hold them. */
 function* inOrder(root,prefix,after){
  if(root===null)return;
  const n=node(root,content,NAMES);
  if(n.kind===NAME_LEAF){if(n.key.startsWith(prefix)&&(after===undefined||n.key>after))yield n;return;}
  const shared=Math.min(n.prefix.length,prefix.length);
  if(n.prefix.slice(0,shared)!==prefix.slice(0,shared))return;
  if(after!==undefined&&n.prefix<after.slice(0,n.prefix.length))return;
  for(const [label,child] of n.children){
   const path=n.prefix+label;
   if(prefix.length>n.prefix.length&&label!==prefix[n.prefix.length])continue;
   if(after!==undefined&&path<after.slice(0,path.length))continue;
   yield* inOrder(child,prefix,after);
  }
 }
 /** Control keeps its original semantic identity and JSON value. Large collections
  * retain members and changed index paths, rather than copying pending deliveries.
  * The stored representation is a codec: every read reconstructs and verifies the
  * complete value against its original SCA. Raw bytes use their separate NI custody. */
 function retainControl(value,priorId=null){
  const id=semanticId(value),text=encode(value),held=storage.read(id);
  if(held!==null){content(id);return id;}
  if(value===null||typeof value!=='object'||text.length<=LITERAL_CHARACTERS)return retain(value);
  const form=Array.isArray(value)?'array':'object';
  // Prior representation is an optimization hint. The new value's full identity
  // is verified below before its frontier can be published.
  const previous=priorId===null?null:JSON.parse(storage.read(priorId)??'null');
  let index=priorId!==null&&previous!==null&&semanticId(previous)!==priorId&&previous?.kind===STRUCTURED&&previous.form===form&&(previous.index===null||named(previous.index))?previous.index:null;
  const items=Array.isArray(value)?value.map((item,ordinal)=>({key:semanticId({controlOrdinal:ordinal}),member:ordinal,item})):Object.entries(value).map(([property,item])=>({key:semanticId({controlProperty:property}),member:property,item}));
  const keys=new Set(items.map(item=>item.key));
  for(const leaf of leaves(index))if(!keys.has(leaf.key))index=update(index,leaf.key,null);
  for(const {key,member,item} of items){
   const prior=lookup(index,key),child=retainControl(item,prior?.content??null);
   index=update(index,key,form==='array'?{ordinal:member,content:child}:{property:member,content:child});
  }
  storage.putAbsent(id,encode({kind:STRUCTURED,form,count:items.length,index}));
  content(id);return id;
 }
 // Revisions are immutable and verified when first read, so a store keeps the last few it decoded:
 // every subject a revision observed reads its cells from it.
 const decoded=new Map(),DECODED_REVISIONS=64;
 function revision(id){
  const held=decoded.get(id);if(held!==undefined)return held;
  const read=readRevision(id);
  decoded.set(id,read);if(decoded.size>DECODED_REVISIONS)decoded.delete(decoded.keys().next().value);
  return read;
 }
 function readRevision(id){
  const value=content(id);
  if(value.subject!==REVISION_SUBJECT||value.predicate!==REVISION_PREDICATE||!Array.isArray(value.object?.parents)||!Array.isArray(value.object?.cells))fail('invalid SignCraft revision content');
  return {id,...value.object};
 }
 function archive(heads){
  const pending=heads.map(id=>[id,false]),known=new Map(),visiting=new Set(),values=new Map();
  while(pending.length){
   const [id,exit]=pending.pop();if(known.has(id))continue;
   if(exit){visiting.delete(id);known.set(id,values.get(id));continue;}
   if(visiting.has(id))fail('SignCraft archive has a causal cycle');
   visiting.add(id);const value=revision(id);values.set(id,value);
   pending.push([id,true],...value.parents.map(parent=>[parent,false]));
  }
  // Native restoration checks revision names and parent closure, and supplies causal order.
  return restoreHistory({kind:'signcraft.history',functionalPredicates:[],revisions:[...known.values()]}).revisions;
 }
 function frontier(id){
  if(id===null)return null;
  const f=content(id);
  if(f.previous!==null&&!named(f.previous))fail('invalid SignCraft predecessor frontier');
  if(![FRONTIER,LEGACY_FRONTIER].includes(f.kind)||!Array.isArray(f.heads)||!f.heads.every(named)||!Array.isArray(f.functionalPredicates)||!Number.isSafeInteger(f.size)||f.size<0||!(named(f.checkpoint)||(f.kind===FRONTIER&&f.checkpoint===null))||!named(f.control)||(f.reading!==null&&!named(f.reading)))fail('invalid SignCraft frontier');
  for(const index of ['names','predicates'])if(f[index]!==undefined&&f[index]!==null&&!named(f[index]))fail('invalid SignCraft frontier index');
  if(f.kind===LEGACY_FRONTIER){if(!Array.isArray(f.subjects)||new Set(f.subjects).size!==f.subjects.length||!f.subjects.every(named))fail('invalid legacy SignCraft subject order');}
  else if(!Number.isSafeInteger(f.subjectCount)||f.subjectCount<0||(f.subjectOrder!==null&&!named(f.subjectOrder)))fail('invalid SignCraft subject order');
  return f;
 }
 function orderedSubjects(f){
  if(f.kind===LEGACY_FRONTIER)return f.subjects;
  const entries=leaves(f.subjectOrder).map(({key,value})=>({key,...value})).sort((a,b)=>a.ordinal-b.ordinal);
  if(entries.length!==f.subjectCount||entries.some((entry,i)=>entry.ordinal!==i||entry.key!==semanticId({subjectOrdinal:i})||!named(entry.subject))||new Set(entries.map(entry=>entry.subject)).size!==entries.length)fail('SignCraft subject order differs from its frontier');
  return entries.map(entry=>entry.subject);
 }
 function subjectReading(value){
  if(!Number.isSafeInteger(value?.nextOrdinal)||value.nextOrdinal<0||(value.cells!==null&&!named(value.cells)))fail('invalid SignCraft subject reading');
  const entries=leaves(value.cells).map(({key,value:entry})=>({key,...entry})).sort((a,b)=>a.ordinal-b.ordinal);
  const ordinals=new Set(),values=[],revisions=new Map();
  for(const entry of entries){
   if(!Number.isSafeInteger(entry.ordinal)||entry.ordinal<0||entry.ordinal>=value.nextOrdinal||ordinals.has(entry.ordinal)||!named(entry.revision)||!Number.isSafeInteger(entry.index)||entry.index<0)fail('invalid SignCraft cell reading');
   ordinals.add(entry.ordinal);let source=revisions.get(entry.revision);if(!source)revisions.set(entry.revision,source=revision(entry.revision));
   const cell=source.cells[entry.index];if(cell===undefined)fail('SignCraft cell reference is outside its revision');values.push(cell);
  }
  return {entries,values};
 }
 /** The cells of one subject as its reading holds them, in order. */
 const cellsOfReading=value=>value===null?[]:subjectReading(value).values;
 /** A checkpoint observe left unnamed is named over the cells it reads. */
 const checkpointOf=(f,cells)=>f.checkpoint??identifyHistoryCheckpoint({heads:f.heads,cells,size:f.size,functionalPredicates:f.functionalPredicates});
 function load(){
  const root=storage.root(),f=frontier(root);heldSubjects=new Map();heldSubjectOrder=[];heldRoot=root;heldCheckpoint=null;
  if(f===null)return null;
  const order=orderedSubjects(f),records=new Map(leaves(f.reading).map(({key,value})=>[key,value]));
  if(records.size!==order.length||order.some(key=>!records.has(key)))fail('SignCraft subject index differs from its frontier');
  const cells=[];
  for(const key of order){
   const value=records.get(key),reading=subjectReading(value);
   if(reading.values.some(cell=>semanticId(cell.subject)!==key))fail('SignCraft subject reading names another subject');
   heldSubjects.set(key,{value,entries:reading.entries});cells.push(...reading.values);
  }
  heldSubjectOrder=order;heldCheckpoint=checkpointOf(f,cells);
  const history=restoreHistory({kind:'signcraft.history',functionalPredicates:f.functionalPredicates,checkpoint:{id:heldCheckpoint,heads:f.heads,size:f.size,functionalPredicates:f.functionalPredicates,cells},revisions:[]});
  return Object.freeze({history:bindHistoryArchive(history,()=>archive(f.heads)),control:content(f.control)});
 }
 /** One subject's next reading: `cells` in order, reusing the entries `old` already holds and
  * naming each new cell by the revision and position `references` give it. */
 function subjectUpdate(old,cells,references){
  const counts=new Map();
  const desired=cells.map(cell=>{const id=semanticId(cell),occurrence=counts.get(id)??0;counts.set(id,occurrence+1);return {key:semanticId({cell:id,occurrence}),id};});
  const kept=new Map((old?.entries??[]).map(entry=>[entry.key,entry]));
  const desiredKeys=new Set(desired.map(entry=>entry.key));
  const previousKept=(old?.entries??[]).filter(entry=>desiredKeys.has(entry.key)).map(entry=>entry.key);
  const currentKept=desired.filter(entry=>kept.has(entry.key)).map(entry=>entry.key);
  // Ordinary observations append. Reordered or interposed carrier observations require
  // an exact new order; they never inherit an incidental storage order.
  let seenNew=false,reorder=JSON.stringify(previousKept)!==JSON.stringify(currentKept);
  for(const entry of desired){if(!kept.has(entry.key))seenNew=true;else if(seenNew)reorder=true;}
  let cellRoot=reorder?null:old?.value.cells??null,nextOrdinal=reorder?0:old?.value.nextOrdinal??0;
  if(!reorder)for(const entry of old?.entries??[])if(!desiredKeys.has(entry.key))cellRoot=update(cellRoot,entry.key,null);
  const entries=[];
  for(const entry of desired){
   let value=!reorder?kept.get(entry.key):null;
   if(!value){
    const reference=references.get(entry.id)??kept.get(entry.key);
    if(!reference)fail('SignCraft reading has no retained revision for its cell');
    value={key:entry.key,ordinal:nextOrdinal++,revision:reference.revision,index:reference.index};
    const {key:_key,...body}=value;cellRoot=update(cellRoot,entry.key,body);
   }
   entries.push(value);
  }
  return {value:{cells:cellRoot,nextOrdinal},entries};
 }
 /** The predicates a subject's cells hold, by address. */
 const predicatesOf=cells=>new Map(cells.map(cell=>[semanticId(cell.predicate),cell.predicate]));
 /** Carry one subject's change of cells into the name and predicate indexes. */
 function reindex(indexes,subject,before,after){
  let {names,predicates}=indexes;
  const subjectKey=semanticId(subject),was=predicatesOf(before),is=predicatesOf(after);
  if(!before.length&&after.length)names=update(names,nameKey(subject),{subject},NAMES);
  else if(before.length&&!after.length)names=update(names,nameKey(subject),null,NAMES);
  for(const [id,predicate] of was)if(!is.has(id)){
   const held=lookup(predicates,id),subjects=update(held?.subjects??null,subjectKey,null);
   predicates=update(predicates,id,subjects===null?null:{predicate,subjects});
  }
  for(const [id,predicate] of is)if(!was.has(id)){
   const held=lookup(predicates,id);
   predicates=update(predicates,id,{predicate,subjects:update(held?.subjects??null,subjectKey,{subject})});
  }
  return {names,predicates};
 }
 /** Name and predicate indexes over every subject a frontier holds: built once for a frontier
  * written before the indexes existed. */
 function indexAll(f){
  let indexes={names:null,predicates:null};
  for(const key of orderedSubjects(f)){
   const cells=cellsOfReading(lookup(f.reading,key));
   if(cells.length)indexes=reindex(indexes,cells[0].subject,[],cells);
  }
  return indexes;
 }
 /** The frontier as it stands, its indexes built and published first if it predates them. */
 function indexedFrontier(){
  const root=storage.root();let f=frontier(root);
  if(f===null||(f.kind===FRONTIER&&f.names!==undefined))return {root,f};
  if(f.kind===LEGACY_FRONTIER){const loaded=load();commit(loaded.history,content(f.control));return indexedFrontier();}
  const next=retain({...f,previous:root,...indexAll(f)});storage.publish(root,next);
  return {root:next,f:frontier(next)};
 }
 function commit(history,control){
  validateHistory(history);const validated=restoreHistory(history),cut=checkpointHistory(validated);
  const expected=storage.root();if(expected!==heldRoot)load();
  const previous=frontier(expected),previousCheckpoint=previous?previous.checkpoint??heldCheckpoint:null;
  if(previous){
   if(history.checkpoint){if(history.checkpoint.id!==previousCheckpoint)fail("SignCraft history does not extend this store's persisted checkpoint");}
   else {const ids=new Set(validated.revisions.map(r=>r.id));if(previous.heads.some(head=>!ids.has(head)))fail("SignCraft history does not extend this store's persisted checkpoint");}
  }else if(history.checkpoint)fail('Cannot import a foreign SignCraft checkpoint into an empty store');
  const references=new Map();
  for(const r of validated.revisions){
   const id=retain({subject:REVISION_SUBJECT,predicate:REVISION_PREDICATE,object:{parents:r.parents,source:r.source,cells:r.cells}});
   if(id!==r.id)fail('SignCraft revision content does not match its native address');
   r.cells.forEach((cell,index)=>references.set(semanticId(cell),{revision:id,index}));
  }
  const subjects=new Map();
  for(const cell of cut.checkpoint.cells){const key=semanticId(cell.subject);if(!subjects.has(key))subjects.set(key,cell.subject);}
  let reading=previous?.reading??null;
  // A frontier written before the name and predicate indexes is indexed whole, once.
  const indexed=previous===null||(previous.kind===FRONTIER&&previous.names!==undefined);
  let indexes=indexed&&previous!==null?{names:previous.names,predicates:previous.predicates}:{names:null,predicates:null};
  const touched=history.checkpoint?new Set(validated.revisions.flatMap(r=>r.cells.map(c=>semanticId(c.subject)))):new Set([...subjects.keys(),...heldSubjects.keys()]);
  if(previous&&JSON.stringify(previous.functionalPredicates)!==JSON.stringify(cut.functionalPredicates))for(const key of subjects.keys())touched.add(key);
  const nextSubjects=new Map(heldSubjects);
  for(const key of touched){
   const old=heldSubjects.get(key),before=old?cellsOfReading(old.value):[];
   if(!subjects.has(key)){
    reading=update(reading,key,null);nextSubjects.delete(key);
    if(indexed&&before.length)indexes=reindex(indexes,before[0].subject,before,[]);
    continue;
   }
   const cells=historySubjectCells(cut,subjects.get(key)),next=subjectUpdate(old,cells,references);
   reading=update(reading,key,next.value);nextSubjects.set(key,next);
   if(indexed)indexes=reindex(indexes,subjects.get(key),before,cells);
  }
  const controlId=retainControl(control,previous?.control??null);
  if(previous!==null&&indexed&&previous.kind===FRONTIER&&previousCheckpoint===cut.checkpoint.id&&previous.control===controlId)return bindHistoryArchive(cut,()=>archive(previous.heads));
  const order=[...subjects.keys()];let subjectOrder=previous?.kind===FRONTIER?previous.subjectOrder:null;
  // Order is part of the native checkpoint, but its growing prefix is immutable data.
  // Reuse it; a changed position alone receives a new addressed path.
  for(let ordinal=0;ordinal<Math.max(heldSubjectOrder.length,order.length);ordinal++){
   if(previous?.kind===FRONTIER&&heldSubjectOrder[ordinal]===order[ordinal])continue;
   subjectOrder=update(subjectOrder,semanticId({subjectOrdinal:ordinal}),ordinal<order.length?{ordinal,subject:order[ordinal]}:null);
  }
  const f={kind:FRONTIER,previous:expected,checkpoint:cut.checkpoint.id,heads:historyHeads(cut),size:historySize(cut),functionalPredicates:cut.functionalPredicates,reading,subjectOrder,subjectCount:order.length,control:controlId,names:null,predicates:null};
  if(!indexed)Object.assign(f,indexAll(f));else Object.assign(f,indexes);
  const next=retain(f);storage.publish(expected,next);heldRoot=next;heldSubjects=nextSubjects;heldSubjectOrder=order;heldCheckpoint=f.checkpoint;
  return bindHistoryArchive(cut,()=>archive(f.heads));
 }
 /**
  * Append one observation without reading the history: exactly the revision observeHistory
  * appends over this store's heads, after dropping the cells the reading already holds (a
  * functional group whose values and evidence are all held, an accumulating cell already held).
  * Only the subjects it touches are read and written. Returns the revision, or null when nothing
  * was left to observe. `functionalPredicates` may widen the schema, but not over held cells: a
  * predicate already observed as accumulating needs its archived history to become functional.
  */
 function observe(cells,{source='signcraft',functionalPredicates=[],control={}}={}){
  const incoming=cells.map(retainHistoryCell);
  if(!incoming.length)return null;
  const {root:expected,f}=indexedFrontier();
  const stored=f?.functionalPredicates??[],widened=[...new Set([...stored,...functionalPredicates])].sort();
  for(const predicate of widened)if(f&&!stored.includes(predicate)&&lookup(f.predicates,semanticId(predicate))!==null)fail('New functional readings require archived history');
  const functional=new Set(widened),held=new Map();
  const heldOf=subject=>{
   const key=semanticId(subject);
   if(!held.has(key)){const value=f?lookup(f.reading,key):null,reading=value===null?null:subjectReading(value);held.set(key,{subject,value,entries:reading?.entries??[],cells:reading?.values??[]});}
   return held.get(key);
  };
  const groups=new Map();
  for(const value of incoming){const at=semanticId(value.subject)+'|'+semanticId(value.predicate);if(!groups.has(at))groups.set(at,[]);groups.get(at).push(value);}
  const dropped=new Set();
  for(const group of groups.values()){
   const old=heldOf(group[0].subject).cells.filter(value=>coincides(value.predicate,group[0].predicate));
   if(functional.has(group[0].predicate)){
    if(old.length&&group.every(value=>old.some(prior=>coincides(prior,value)))&&old.every(prior=>group.some(value=>coincides(prior,value))))for(const value of group)dropped.add(value);
   }else for(const value of group)if(old.some(prior=>coincides(prior,value)))dropped.add(value);
  }
  const kept=incoming.filter(value=>!dropped.has(value));
  if(!kept.length)return null;
  const parents=f?f.heads:[],body={parents,source,cells:kept};
  const id=retain({subject:REVISION_SUBJECT,predicate:REVISION_PREDICATE,object:body});
  if(id!==identifyRevision(body))fail('SignCraft revision content does not match its native address');
  const references=new Map(kept.map((cell,index)=>[semanticId(cell),{revision:id,index}]));
  // The subject's cells as observeHistory leaves them: a functional predicate's earlier cells
  // give way to this revision's, every other cell accumulates.
  const next=new Map(),written=new Set();
  for(const value of kept){
   const key=semanticId(value.subject);
   if(!next.has(key))next.set(key,{subject:value.subject,cells:[...heldOf(value.subject).cells]});
   const entry=next.get(key),at=key+'|'+semanticId(value.predicate);
   if(functional.has(value.predicate)&&!written.has(at)){entry.cells=entry.cells.filter(prior=>!coincides(prior.predicate,value.predicate));written.add(at);}
   entry.cells.push(value);
  }
  let reading=f?.reading??null,subjectOrder=f?.subjectOrder??null,subjectCount=f?.subjectCount??0,indexes={names:f?.names??null,predicates:f?.predicates??null};
  for(const [key,{subject,cells:after}] of next){
   const old=held.get(key),change=subjectUpdate(old.value===null?null:{value:old.value,entries:old.entries},after,references);
   reading=update(reading,key,change.value);
   if(old.value===null){subjectOrder=update(subjectOrder,semanticId({subjectOrdinal:subjectCount}),{ordinal:subjectCount,subject:key});subjectCount++;}
   indexes=reindex(indexes,subject,old.cells,after);
  }
  const frontierValue={kind:FRONTIER,previous:expected,checkpoint:null,heads:[id],size:(f?.size??0)+kept.length,functionalPredicates:widened,reading,subjectOrder,subjectCount,control:f?f.control:retainControl(control),...indexes};
  storage.publish(expected,retain(frontierValue));
  return Object.freeze({id,parents:Object.freeze([...parents]),source,cells:Object.freeze(kept)});
 }
 /** One subject's reading, as historySection reads it; `raw` gives the cells the reading retains. */
 function readSubject(subject,{raw=false}={}){
  const f=frontier(storage.root());if(f===null)return Object.freeze([]);
  const cells=cellsOfReading(lookup(f.reading,semanticId(subject)));
  return raw?Object.freeze(cells):historySectionOfCells(f.functionalPredicates,subject,cells);
 }
 /** Each subject holding `predicate`, with each cell of that predicate its reading gives. */
 function* readPredicate(predicate){
  const {f}=indexedFrontier();if(f===null)return;
  const held=lookup(f.predicates,semanticId(predicate));if(held===null)return;
  for(const {value:{subject}} of leaves(held.subjects)){
   const cells=cellsOfReading(lookup(f.reading,semanticId(subject)));
   for(const cell of historySectionOfCells(f.functionalPredicates,subject,cells))if(coincides(cell.predicate,predicate))yield Object.freeze({subject,cell});
  }
 }
 /** The subjects the store holds, in name order: those whose names begin with `prefix`, after the
  * subject named `after`, at most `limit` of them. Reads only the name index paths it walks. */
 function* subjects({prefix='',after,limit=Infinity}={}){
  if(typeof prefix!=='string')fail('a subject prefix is text');
  if(!(limit>=0))fail('a subject limit is a count');
  if(limit===0)return;
  const {f}=indexedFrontier();if(f===null)return;
  let count=0;
  for(const leaf of inOrder(f.names,escapeName(prefix),after===undefined?undefined:nameKey(after))){
   yield leaf.value.subject;
   if(++count>=limit)return;
  }
 }
 return Object.freeze({load,commit,observe,readSubject,readPredicate,subjects,retain,content});
}

