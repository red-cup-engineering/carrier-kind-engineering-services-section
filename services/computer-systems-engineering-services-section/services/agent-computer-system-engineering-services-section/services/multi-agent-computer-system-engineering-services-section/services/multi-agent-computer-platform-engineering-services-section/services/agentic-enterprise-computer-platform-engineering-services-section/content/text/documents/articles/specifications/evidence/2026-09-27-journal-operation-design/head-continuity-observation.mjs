import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const root = '/home/emsenn/info';
const system = fs.readFileSync('/tmp/muse-system-path','utf8').trim();
const calls = JSON.parse(fs.readFileSync('/tmp/muse-journal-packet-head-calls.json','utf8'));
const hookFile = path.join(root,calls.find(c=>c.path.includes('/hooks/')).path);
const encounterFile = path.join(root,calls.find(c=>c.path.includes('/encounter/')).path);
const writerFile = path.join(system,'src/journal/filesystem/write-journal-store.mjs');
const headsFile = path.join(system,'src/journal/filesystem/heads.mjs');
const {headPath} = await import(pathToFileURL(headsFile));
const hook = fs.readFileSync(hookFile,'utf8');
const writer = fs.readFileSync(writerFile,'utf8');
const encounter = fs.readFileSync(encounterFile,'utf8');
const hookFunctions = hook.slice(hook.indexOf('function hookSessionIndex('),hook.indexOf('function boundedHookPayload('));
const api = vm.runInNewContext(hookFunctions+'\n({hookStatementCauses,updateHookSessionIndex})');
const heads = new Map();
const store = {
 readHead(at,namespace,key) { return heads.get(headPath('/fixture',at,namespace,key)); },
 writeHead(at,namespace,key,value) { heads.set(headPath('/fixture',at,namespace,key),value); }
};
const first = {harness:'codex',sessionId:'session',turnId:'turn-1'};
api.updateHookSessionIndex(store,'2026-09-27T23:59:59.000Z',first,'statement-1');
const next = {...first,turnId:'turn-2'};
const sameDay = Array.from(api.hookStatementCauses(store,'2026-09-27T23:59:59.900Z',next));
const nextDay = Array.from(api.hookStatementCauses(store,'2026-09-28T00:00:00.000Z',next));
const otherHarness = Array.from(api.hookStatementCauses(store,'2026-09-27T23:59:59.900Z',{...next,harness:'claude-code'}));
assert.deepEqual(sameDay,['statement-1']);
assert.deepEqual(nextDay,[]);
assert.deepEqual(otherHarness,['statement-1']);
const readFunction = writer.slice(writer.indexOf('export function readJournalHead('),writer.indexOf('export function writeJournalHead(')).replace('export function','function');
const denied = Object.assign(new Error('fixture denied'),{code:'EACCES'});
const readDenied = vm.runInNewContext(readFunction+'\nreadJournalHead',{
 parse:JSON.parse,headPath,readFileUtf8(){throw denied;}
});
assert.equal(readDenied('/fixture','2026-09-27','hook-sessions','session'),undefined);
const readMalformed = vm.runInNewContext(readFunction+'\nreadJournalHead',{
 parse:JSON.parse,headPath,readFileUtf8(){return '{broken';}
});
assert.equal(readMalformed('/fixture','2026-09-27','hook-sessions','session'),undefined);

const feedFunction = encounter.slice(encounter.indexOf('function feedFor('),encounter.indexOf('function evidenceFromEvent('));
const constructor = encounter.slice(encounter.indexOf('export function journalEncounterStore(')).replace('export function','function');
let inspectedFeed,appendOptions;
const originalAt='2026-09-27T12:00:00.000Z';
const laterAt='2026-09-28T12:00:00.000Z';
const encounterApi=vm.runInNewContext(feedFunction+'\n'+constructor+'\njournalEncounterStore',{
 ENCOUNTER_RUN_LOCATOR_AT:'0000-00-00',ENCOUNTER_RUN_LOCATOR_NAMESPACE:'encounter-run',
 openJournal(){return {readHead(){return {openedAt:originalAt};},appendRows(_action,_rows,options){appendOptions=options;return {statements:[]};}};},
 journal:{feed(_root,_action,at){return {at};}},
 validateEvidence(){}, existingAdmission(feed){inspectedFeed=feed;}, evidenceCauses(){return [];},
 requireJsonValue:v=>v,toEavt:v=>v,artifactId:()=> 'fixture-admission'
});
encounterApi('/fixture').admit({id:'run',openedAt:laterAt},{kind:'metroplat.encounter.contribution',at:laterAt});
assert.equal(inspectedFeed.at,originalAt);
assert.equal(appendOptions.at,laterAt);

const sources=[hookFile,encounterFile,writerFile,headsFile].map(file=>({
 path:path.relative(root,file),sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}));
console.log(JSON.stringify({
 method:'Exact current functions in isolated VM contexts with controlled ports; actual headPath and its repository address dependency imported. No operating journal read or modified.',
 sources,
 observations:{sameDayHookCauses:sameDay,nextDayHookCauses:nextDay,otherHarnessSameSessionCauses:otherHarness,unreadableHeadBecomesAbsent:true,malformedHeadBecomesAbsent:true,encounterLookupAt:inspectedFeed.at,encounterAppendAt:appendOptions.at},
 limitations:['Fixture observations of current source, not production incidents or replacement acceptance.','Encounter append observation controls validation/evidence ports to isolate feed selection.']
},null,2));
