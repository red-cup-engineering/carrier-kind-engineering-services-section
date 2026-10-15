import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {retainActorOutcome,actorOutcomeHead} from '../src/rpc/actor-outcomes.mjs';
import {ARRIVAL_FEED} from '../src/rpc/arrival.mjs';
import {headFile} from '@red-cup-engineering/semiotic-eavt-services-section/layout';
const [file,name]=process.argv.slice(2),{root,entry}=JSON.parse(fs.readFileSync(file,'utf8'));
const expected=headFile(root,ARRIVAL_FEED,actorOutcomeHead({request:entry.request,sender:entry.authenticatedActor,recipient:entry.recipient}));
const old=fs.readFileSync;let intercepted=false;
fs.readFileSync=(...args)=>{
 const result=old(...args);
 if(!intercepted&&String(args[0])===expected){
  intercepted=true;fs.writeFileSync(root+'/'+name+'.ready','read original head');
  const until=Date.now()+15000,wait=new Int32Array(new SharedArrayBuffer(4));
  while(!fs.existsSync(root+'/join.go')){if(Date.now()>until)throw new Error('join barrier timed out');Atomics.wait(wait,0,0,5);}
 }
 return result;
};syncBuiltinESMExports();
try{retainActorOutcome(root,entry);fs.writeFileSync(root+'/'+name+'.result','held');}
catch(error){if(!/conflicting immutable/.test(error.message))throw error;fs.writeFileSync(root+'/'+name+'.result','conflict');}
