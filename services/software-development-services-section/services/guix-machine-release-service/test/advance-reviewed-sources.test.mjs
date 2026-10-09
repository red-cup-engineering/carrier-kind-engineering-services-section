import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const script=fileURLToPath(new URL('../scripts/advance-reviewed-sources.mjs',import.meta.url));
const run=(cmd,args,options={})=>{const r=spawnSync(cmd,args,{encoding:'utf8',...options});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
const git=(directory,...args)=>run('git',['-C',directory,...args]);
test('source admission rebuilds after a real push race and preserves caller work',()=>{
 const root=mkdtempSync(join(tmpdir(),'source-admission-race-'));
 try{
  const seed=join(root,'seed'),provider=join(root,'provider'),remote=join(root,'remote.git'),checkout=join(root,'checkout'),concurrent=join(root,'concurrent'),bin=join(root,'bin');
  mkdirSync(bin);
  for(const directory of [seed,provider]){
   run('git',['init','--initial-branch=main',directory]);
   git(directory,'config','user.name','Fixture');git(directory,'config','user.email','fixture@example.invalid');git(directory,'config','commit.gpgsign','false');
  }
  writeFileSync(join(provider,'code'),'before');git(provider,'add','code');git(provider,'commit','-m','before');const before=git(provider,'rev-parse','HEAD');
  writeFileSync(join(provider,'code'),'reviewed');git(provider,'commit','-am','reviewed');const after=git(provider,'rev-parse','HEAD');
  writeFileSync(join(seed,'sources.json'),JSON.stringify({repositories:[{repository:'owner/provider',ref:'main',commit:before}]}));writeFileSync(join(seed,'dependencies.lock.yaml'),'old lock');git(seed,'add','.');git(seed,'commit','-m','machine baseline');
  run('git',['clone','--bare',seed,remote]);run('git',['clone',remote,checkout]);run('git',['clone',remote,concurrent]);
  for(const directory of [checkout,concurrent]){git(directory,'config','user.name','Fixture');git(directory,'config','user.email','fixture@example.invalid');git(directory,'config','commit.gpgsign','false');}
  const original=git(checkout,'rev-parse','HEAD');writeFileSync(join(checkout,'unrelated-draft'),'preserve this draft');
  const fixture=join(root,'fixture.json');writeFileSync(fixture,JSON.stringify({root,concurrent,after}));
  writeFileSync(join(bin,'gh'),`#!/usr/bin/env node
const fs=require('node:fs');const f=JSON.parse(fs.readFileSync(process.env.FLEET_ADMISSION_FIXTURE,'utf8'));const endpoint=process.argv.at(-1);
console.log(JSON.stringify(endpoint.includes('/branches/')?{commit:{sha:f.after}}:[{merged_at:'2026-10-07T00:00:00Z',base:{ref:'main'},merge_commit_sha:f.after,html_url:'https://example.invalid/reviewed-source'}]));
`,{mode:0o755});
  writeFileSync(join(bin,'guix'),`#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');const f=JSON.parse(fs.readFileSync(process.env.FLEET_ADMISSION_FIXTURE,'utf8'));const snapshot=process.argv.at(-3);const spec=JSON.parse(fs.readFileSync(path.join(snapshot,'sources.json'),'utf8'));fs.writeFileSync(path.join(snapshot,'dependencies.lock.yaml'),JSON.stringify(spec));
const marker=path.join(f.root,'raced');if(!fs.existsSync(marker)){fs.writeFileSync(marker,'yes');fs.writeFileSync(path.join(f.concurrent,'hosted-content.txt'),'concurrent machine change');for(const args of [['add','hosted-content.txt'],['commit','-m','concurrent machine change'],['push','origin','main']]){const r=spawnSync('git',['-C',f.concurrent,...args]);if(r.status!==0)process.exit(r.status);}}
`,{mode:0o755});
  const result=run(process.execPath,[script,checkout,join(root,'work'),join(root,'service')],{env:{...process.env,PATH:bin+':'+process.env.PATH,FLEET_ADMISSION_FIXTURE:fixture},timeout:30000});
  assert.ok(result!==undefined);
  const spec=JSON.parse(git(remote,'show','main:sources.json'));
  assert.equal(spec.repositories[0].commit,after);
  assert.equal(git(remote,'show','main:hosted-content.txt'),'concurrent machine change');
  assert.deepEqual(JSON.parse(git(remote,'show','main:dependencies.lock.yaml')),spec);
  assert.equal(git(checkout,'rev-parse','HEAD'),original);
  assert.equal(readFileSync(join(checkout,'unrelated-draft'),'utf8'),'preserve this draft');
  assert.deepEqual(readdirSync(join(root,'work')).filter(name=>name.startsWith('source-admission-')),[]);
 }finally{rmSync(root,{recursive:true,force:true});}
});
