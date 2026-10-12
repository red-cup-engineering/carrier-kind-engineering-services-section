import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const root='/home/emsenn/info';
const journal=path.resolve(path.dirname(fs.readFileSync('/tmp/muse-segment-path','utf8').trim()),'..');
const eventFile=path.join(journal,'event.mjs');
const substrateFile=path.join(journal,'substrate.mjs');
const notationFile=path.resolve(journal,'../../semiotic-expression-notation/notation.mjs');
const {journalWitness}=await import(pathToFileURL(eventFile));
const {rebuildCausalSubstrate}=await import(pathToFileURL(substrateFile));
const {tm}=await import(pathToFileURL(notationFile));
const make=(label,causes)=>journalWitness({kind:'metroplat.journal.observation',seat:'fixture:operator',claim:tm.mark('fixture.record'),address:tm.mark(label),time:'2026-09-27T12:00:00.000Z',causes});
const first=make('first',[]),second=make('second',[first.id]);
const sources=[...new Map([...first.sources,...second.sources].map(x=>[x.ref,x])).values()];
const historical={kind:'metroplat.journal.retained-obstruction',version:1,event:first.id,obstruction:null};
const restored=rebuildCausalSubstrate(sources);
assert.equal(restored.kind,'metroplat.causal:witness');
assert.equal(restored.value.witnessState(first.id),'admitted');
assert.equal(restored.value.witnessState(second.id),'admitted');
assert.equal(restored.value.obstruction(first.id),undefined);
console.log(JSON.stringify({
  method:'Actual existing journalWitness and sources-only rebuildCausalSubstrate on a synthetic cause and descendant. The historical decision is a separate retained record; the current API has no input for it. No runtime store read or modified.',
  sources:[eventFile,substrateFile,notationFile].map(p=>({path:path.relative(root,p),sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')})),
  observations:{retainedDecision:historical,reconstructedCauseState:restored.value.witnessState(first.id),reconstructedDescendantState:restored.value.witnessState(second.id),retainedDecisionAbsentFromReconstruction:true},
  limitations:['Demonstrates why sources-only reconstruction cannot implement L-S01; not a claim that the old API promised a fourth argument.','No replacement implementation, host binding, persistence or production incident demonstrated.']
},null,2));
