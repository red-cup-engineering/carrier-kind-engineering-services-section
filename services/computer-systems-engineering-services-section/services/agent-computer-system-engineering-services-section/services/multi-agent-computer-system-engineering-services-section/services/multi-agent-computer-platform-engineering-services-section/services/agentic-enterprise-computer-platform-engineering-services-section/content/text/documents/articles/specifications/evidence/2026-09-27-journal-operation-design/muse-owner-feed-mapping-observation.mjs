import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const segment=fs.readFileSync('/tmp/muse-segment-path','utf8').trim();
const store=path.resolve(path.dirname(segment),'../store-root.mjs');
const m=await import(pathToFileURL(store));
const examples=['/fixture/data/journals/2026/09/27/2026-09-27-admit-person.jsonl','/fixture/report.jsonl','/other/report.jsonl','/fixture/data/logs/report.jsonl'].map(log=>{try{const root=m.artifactStoreRoot(log);return {log,root,settlement:m.settlementRootOf(log)??null,oldRelative:path.relative(root,log)}}catch(e){return {log,refused:true,name:e.name}}});
console.log(JSON.stringify({source:{path:store,sha256:createHash('sha256').update(fs.readFileSync(store)).digest('hex')},examples,ownerExercised:false},null,2));
