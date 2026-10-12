import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'muse-journal-node-lock-'));
const lock=path.join(root,'maintenance.lock');
const checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok,detail});if(!ok)throw Error(name);};
const compete=()=>spawnSync('/usr/bin/flock',['--exclusive','--nonblock',lock,'/bin/true']).status;
const fd=fs.openSync(lock,'a+',0o600),inode=fs.fstatSync(fd).ino;
const acquired=spawnSync('/usr/bin/flock',['--exclusive','--nonblock','3'],{stdio:['ignore','pipe','pipe',fd]});
check('Node inherits descriptor as fd 3',acquired.status===0,{exitCode:acquired.status});
let c=compete();check('Node holds lock after helper exit',c===1,{competingExitCode:c});
fs.closeSync(fd);c=compete();check('Node close releases lock',c===0,{competingExitCode:c});
const source=`import fs from 'node:fs';import {spawnSync} from 'node:child_process';const fd=fs.openSync(process.argv[1],'r+');const r=spawnSync('/usr/bin/flock',['--exclusive','--nonblock','3'],{stdio:['ignore','pipe','pipe',fd]});if(r.status!==0)process.exit(2);process.stdout.write('held\\n');setInterval(()=>{},1000);`;
const owner=spawn(process.execPath,['--input-type=module','-e',source,lock],{stdio:['ignore','pipe','pipe']});
try {
 const ready=await new Promise((resolve,reject)=>{owner.stdout.once('data',x=>resolve(x.toString()));owner.once('error',reject);owner.once('exit',code=>reject(Error('premature exit '+code)));});
 check('Node owner ready after helper exit',ready==='held\n',{pid:owner.pid});
 c=compete();check('Node owner excludes competitor',c===1,{competingExitCode:c});
 const exit=new Promise(resolve=>owner.once('exit',(code,signal)=>resolve({code,signal})));owner.kill('SIGKILL');const ended=await exit;
 c=compete();check('Node owner death releases without reclamation',c===0,{ended,competingExitCode:c});
 check('stable lock inode retained',fs.statSync(lock).ino===inode,{inode});
}finally{if(owner.exitCode===null&&owner.signalCode===null)owner.kill('SIGKILL');}
const result={node:process.version,checks,limits:['Local controlled descriptor lifecycle only; no closure durability or journal integration demonstrated.']};
fs.writeFileSync(path.join(root,'observation.json'),JSON.stringify(result,null,2));fs.writeFileSync('/tmp/muse-journal-node-lock-observation',root);console.log(JSON.stringify(result,null,2));
