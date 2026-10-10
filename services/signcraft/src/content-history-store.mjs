import {semanticId} from '@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address';
import {checkpointHistory,bindHistoryArchive,historyHeads,historySize,historySubjectCells,restoreHistory,validateHistory} from './history.mjs';

const STRUCTURED='signcraft.structured-content.v1',LITERAL_CHARACTERS=512;
const REVISION_SUBJECT='signcraft.history',REVISION_PREDICATE='revision';
const LEAF='signcraft.index-leaf.v1',BRANCH='signcraft.index-branch.v1',FRONTIER='signcraft.history-frontier.v2',LEGACY_FRONTIER='signcraft.history-frontier.v1';
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

/** Immutable content and one atomic compare-and-publish frontier. Storage is a data port:
 * read(id), putAbsent(id,text), root(), publish(expected,next). All operations are synchronous.
 * No SQL schema, compaction policy or filesystem layout participates in history semantics. */
export function createContentHistoryStore(storage){
 for(const name of ['read','putAbsent','root','publish'])if(typeof storage?.[name]!=='function')fail('history storage needs '+name);
 let heldRoot,heldSubjects=new Map(),heldSubjectOrder=[];
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
 function node(id,read=content){
  const value=read(id);
  if(value.kind===LEAF){
   if(!named(value.key))fail('invalid SignCraft index key');
  }else if(value.kind===BRANCH){
   if(typeof value.prefix!=='string'||!Array.isArray(value.children)||value.children.length<2)fail('invalid SignCraft index branch');
   const labels=value.children.map(([label,child])=>{if(typeof label!=='string'||label.length!==1||!named(child))fail('invalid SignCraft index edge');return label;});
   if(new Set(labels).size!==labels.length||JSON.stringify([...labels].sort())!==JSON.stringify(labels))fail('invalid SignCraft index ordering');
  }else fail('invalid SignCraft index node');
  return value;
 }
 function lookup(root,key){
  while(root!==null){
   const n=node(root);
   if(n.kind===LEAF)return n.key===key?n.value:null;
   if(!key.startsWith(n.prefix))return null;
   root=n.children.find(([label])=>label===key[n.prefix.length])?.[1]??null;
  }return null;
 }
 function update(root,key,value){
  if(root===null)return value===null?null:retain({kind:LEAF,key,value});
  const n=node(root);
  if(n.kind===LEAF){
   if(n.key===key)return value===null?null:retain({kind:LEAF,key,value});
   if(value===null)return root;
   let at=0;while(key[at]===n.key[at])at++;
   const added=retain({kind:LEAF,key,value});
   return retain({kind:BRANCH,prefix:key.slice(0,at),children:sorted([[key[at],added],[n.key[at],root]])});
  }
  let at=0;while(at<n.prefix.length&&key[at]===n.prefix[at])at++;
  if(at<n.prefix.length){
   if(value===null)return root;
   return retain({kind:BRANCH,prefix:key.slice(0,at),children:sorted([[key[at],retain({kind:LEAF,key,value})],[n.prefix[at],root]])});
  }
  const label=key[at],children=new Map(n.children),prior=children.get(label)??null,next=update(prior,key,value);
  if(next===prior)return root;
  if(next===null)children.delete(label);else children.set(label,next);
  if(children.size===0)return null;
  if(children.size===1)return [...children.values()][0];
  return retain({kind:BRANCH,prefix:n.prefix,children:sorted([...children])});
 }
 function leaves(root,read=content){
  const result=[],pending=root===null?[]:[root],seen=new Set();
  while(pending.length){
   const id=pending.pop();if(seen.has(id))fail('SignCraft index repeats a node');seen.add(id);
   const n=node(id,read);if(n.kind===LEAF)result.push(n);else for(const [,child] of n.children)pending.push(child);
  }return result;
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
 function revision(id){
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
  if(![FRONTIER,LEGACY_FRONTIER].includes(f.kind)||!Array.isArray(f.heads)||!f.heads.every(named)||!Array.isArray(f.functionalPredicates)||!Number.isSafeInteger(f.size)||f.size<0||!named(f.checkpoint)||!named(f.control)||(f.reading!==null&&!named(f.reading)))fail('invalid SignCraft frontier');
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
 function load(){
  const root=storage.root(),f=frontier(root);heldSubjects=new Map();heldSubjectOrder=[];heldRoot=root;
  if(f===null)return null;
  const order=orderedSubjects(f),records=new Map(leaves(f.reading).map(({key,value})=>[key,value]));
  if(records.size!==order.length||order.some(key=>!records.has(key)))fail('SignCraft subject index differs from its frontier');
  const cells=[];
  for(const key of order){
   const value=records.get(key),reading=subjectReading(value);
   if(reading.values.some(cell=>semanticId(cell.subject)!==key))fail('SignCraft subject reading names another subject');
   heldSubjects.set(key,{value,entries:reading.entries});cells.push(...reading.values);
  }
  heldSubjectOrder=order;
  const history=restoreHistory({kind:'signcraft.history',functionalPredicates:f.functionalPredicates,checkpoint:{id:f.checkpoint,heads:f.heads,size:f.size,functionalPredicates:f.functionalPredicates,cells},revisions:[]});
  return Object.freeze({history:bindHistoryArchive(history,()=>archive(f.heads)),control:content(f.control)});
 }
 function commit(history,control){
  validateHistory(history);const validated=restoreHistory(history),cut=checkpointHistory(validated);
  const expected=storage.root();if(expected!==heldRoot)load();
  const previous=frontier(expected);
  if(previous){
   if(history.checkpoint){if(history.checkpoint.id!==previous.checkpoint)fail("SignCraft history does not extend this store's persisted checkpoint");}
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
  const touched=history.checkpoint?new Set(validated.revisions.flatMap(r=>r.cells.map(c=>semanticId(c.subject)))):new Set([...subjects.keys(),...heldSubjects.keys()]);
  if(previous&&JSON.stringify(previous.functionalPredicates)!==JSON.stringify(cut.functionalPredicates))for(const key of subjects.keys())touched.add(key);
  const nextSubjects=new Map(heldSubjects);
  for(const key of touched){
   if(!subjects.has(key)){reading=update(reading,key,null);nextSubjects.delete(key);continue;}
   const cells=historySubjectCells(cut,subjects.get(key)),old=heldSubjects.get(key),counts=new Map();
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
   const value={cells:cellRoot,nextOrdinal};reading=update(reading,key,value);nextSubjects.set(key,{value,entries});
  }
  const controlId=retainControl(control,previous?.control??null);
  if(previous?.kind===FRONTIER&&previous.checkpoint===cut.checkpoint.id&&previous.control===controlId)return bindHistoryArchive(cut,()=>archive(previous.heads));
  const order=[...subjects.keys()];let subjectOrder=previous?.kind===FRONTIER?previous.subjectOrder:null;
  // Order is part of the native checkpoint, but its growing prefix is immutable data.
  // Reuse it; a changed position alone receives a new addressed path.
  for(let ordinal=0;ordinal<Math.max(heldSubjectOrder.length,order.length);ordinal++){
   if(previous?.kind===FRONTIER&&heldSubjectOrder[ordinal]===order[ordinal])continue;
   subjectOrder=update(subjectOrder,semanticId({subjectOrdinal:ordinal}),ordinal<order.length?{ordinal,subject:order[ordinal]}:null);
  }
  const f={kind:FRONTIER,previous:expected,checkpoint:cut.checkpoint.id,heads:historyHeads(cut),size:historySize(cut),functionalPredicates:cut.functionalPredicates,reading,subjectOrder,subjectCount:order.length,control:controlId};
  const next=retain(f);storage.publish(expected,next);heldRoot=next;heldSubjects=nextSubjects;heldSubjectOrder=order;
  return bindHistoryArchive(cut,()=>archive(f.heads));
 }
 return Object.freeze({load,commit,retain,content});
}
