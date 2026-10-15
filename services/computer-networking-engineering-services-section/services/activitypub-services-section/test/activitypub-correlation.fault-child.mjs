import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const native={openSync:fs.openSync,closeSync:fs.closeSync,fsyncSync:fs.fsyncSync,renameSync:fs.renameSync,linkSync:fs.linkSync,writeFileSync:fs.writeFileSync};
const files=new Map(),pause=new Int32Array(new SharedArrayBuffer(4));let fired=false,barrierUsed=false;
function die(boundary,file){
 if(fired)return;fired=true;
 native.writeFileSync(config.hit,JSON.stringify({boundary,file,pid:process.pid})+'\n');
 process.kill(process.pid,'SIGKILL');
}
fs.openSync=function(file,...args){
 const name=String(file);
 if(config.barrier&&name===config.barrier.file&&!barrierUsed){
  barrierUsed=true;native.writeFileSync(config.barrier.ready,'ready\n');
  const until=Date.now()+15000;
  while(!fs.existsSync(config.barrier.release)){
   if(Date.now()>until)throw new Error('fixture barrier release timed out');
   Atomics.wait(pause,0,0,5);
  }
 }
 const fd=native.openSync.call(fs,file,...args);files.set(fd,name);return fd;
};
fs.closeSync=function(fd){files.delete(fd);return native.closeSync.call(fs,fd);};
fs.fsyncSync=function(fd){
 const value=native.fsyncSync.call(fs,fd),file=files.get(fd);
 if(config.fault==='record'&&file?.includes('/data/records/'+config.type+'-records/'))die('record-fsync',file);
 return value;
};
fs.linkSync=function(from,to){
 const value=native.linkSync.call(fs,from,to);
 if(config.fault==='body-publish'&&String(to).includes('/custody/objects/')&&!String(to).endsWith('.media-type'))die('body-published-before-media-type',String(to));
 if(config.fault==='body'&&String(to).includes('/custody/objects/')&&String(to).endsWith('.media-type'))die('body-complete',String(to));
 return value;
};
fs.renameSync=function(from,to){
 const value=native.renameSync.call(fs,from,to);
 if(config.fault==='head'&&String(to)===config.file)die('head-rename',String(to));
 return value;
};
fs.writeFileSync=function(file,...args){
 const value=native.writeFileSync.call(fs,file,...args);
 if(config.fault==='body'&&String(file).includes('/custody/objects/')&&String(file).endsWith('.media-type'))die('body-complete',String(file));
 return value;
};
syncBuiltinESMExports();
const {createActivityPubJournalCustody}=await import('@red-cup-engineering/activitypub-services-section/journal-custody');
try{
 const custody=createActivityPubJournalCustody({stateDirectory:config.stateDirectory,now:()=>config.now});
 const value=config.mode==='request'?await custody.outbox.retainRequest(config.wire):await custody.inbox.retain({recipient:'world',jsonLd:config.wire});
 process.stdout.write(JSON.stringify({ok:true,value,barrierUsed})+'\n');
}catch(error){process.stdout.write(JSON.stringify({ok:false,message:error.message,code:error.code,stack:error.stack})+'\n');process.exitCode=1;}
