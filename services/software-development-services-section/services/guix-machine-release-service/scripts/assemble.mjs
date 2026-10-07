import {readFile,writeFile,mkdir,cp,rm,mkdtemp,symlink,realpath} from 'node:fs/promises';
import {readFileSync as requireRead} from 'node:fs';
import {resolve,join,relative,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const [workspaceArg,snapshotArg,outputArg]=process.argv.slice(2);
const workspace=resolve(workspaceArg),snapshot=resolve(snapshotArg),output=resolve(outputArg);
const sources=JSON.parse(await readFile(join(workspace,'sources.json'),'utf8'));
const providers=Object.fromEntries(sources.packages.map(p=>[p.name,join(workspace,'packages',p.name.replaceAll('/','__'))]));
const entry=providers['@red-cup-engineering/feltos-enterprise-host'];
const exec=(program,args,options={})=>{const r=spawnSync(program,args,{stdio:'inherit',...options});if(r.error||r.status!==0)throw r.error??new Error(`${program} build check failed (${r.status})`)};
const environment={...process.env,NODE_OPTIONS:'--max-old-space-size=384',GUIX_MACHINE_SNAPSHOT:snapshot};
// Build the declared TypeScript runtime outputs in dependency order, with the
// exact compiler and Node types recorded in the reviewed dependency lock.
const compiled=new Set(),building=new Set();
function buildTypes(name){
  if(compiled.has(name))return;
  if(building.has(name))throw new Error(`TypeScript build cycle: ${name}`);
  const directory=providers[name];if(!directory)return;
  const manifest=JSON.parse(requireRead(join(directory,'package.json')));
  if(manifest.scripts?.build!=='tsc -p tsconfig.build.json')return;
  building.add(name);
  for(const dependency of Object.keys(manifest.dependencies??{}))buildTypes(dependency);
  exec(process.execPath,[join(workspace,'node_modules/typescript/bin/tsc'),'-p',join(directory,'tsconfig.build.json')],{env:environment,cwd:directory});
  building.delete(name);compiled.add(name);
}
for(const name of Object.keys(providers))buildTypes(name);
exec(process.execPath,[join(providers['@red-cup-engineering/metroplat'],'scripts/generate-operation-family-descriptors.mjs')],{env:environment});
const checks=['work-forwarding.test.mjs','work-replication.test.mjs','work-peer-schedule.test.mjs','serve-instance-lifecycle.test.mjs'];
exec(process.execPath,['--test',fileURLToPath(new URL('../test/release-admission.test.mjs',import.meta.url)),...checks.map(f=>join(entry,'test',f)),join(providers['@red-cup-engineering/semantic-content-identify-service'],'test/semantic-content-identity.test.mjs')],{env:environment});
await mkdir(output,{recursive:true});
const closure=await mkdtemp(join(output,'.closure-'));
exec('npm',['exec','--yes','--package=pnpm@11.9.0','--','pnpm','--dir',workspace,'--filter=@red-cup-engineering/feltos-enterprise-host','deploy','--prod','--legacy','--config.package-import-method=hardlink',join(closure,'app')],{env:{...environment,NODE_OPTIONS:'--max-old-space-size=1024'}});
// Deployment materializes workspace providers as local file packages. Require
// every external version and integrity to equal the reviewed lock before sealing.
const requireWorkspace=createRequire(join(workspace,'package.json'));
const {parse}=requireWorkspace('yaml');
const reviewed=parse(await readFile(join(workspace,'pnpm-lock.yaml'),'utf8'));
const deployed=parse(await readFile(join(closure,'app/node_modules/.pnpm/lock.yaml'),'utf8'));
const sourceDirectories=new Map(sources.packages.map(p=>['packages/'+p.name.replaceAll('/','__'),p]));
const dependencyEvidence=[];
for(const [key,value] of Object.entries(deployed.packages??{})){
  if(value.resolution?.type==='directory'){
    const provider=sourceDirectories.get(value.resolution.directory);
    if(!provider||key!==`${provider.name}@file:${value.resolution.directory}`)
      throw new Error(`Unadmitted deployed source provider: ${key}`);
    dependencyEvidence.push({package:provider.name,version:provider.version,repository:provider.repository,commit:provider.commit});
  }else{
    const admitted=reviewed.packages?.[key];
    if(!admitted||JSON.stringify(admitted.resolution)!==JSON.stringify(value.resolution))
      throw new Error(`Deployment changed a reviewed dependency: ${key}`);
    dependencyEvidence.push({package:key,resolution:value.resolution});
  }
}
// Legacy deploy leaves the cyclic entry package linked to its workspace.
// Bind that self-reference to the identical deployed entry before sealing.
const self=join(closure,'app/node_modules/.pnpm/node_modules/@red-cup-engineering/feltos-enterprise-host');
try {
  if(await realpath(self)===await realpath(entry)){
    await rm(self);await symlink(relative(dirname(self),join(closure,'app')),self);
  }
} catch(error){if(error.code!=='ENOENT')throw error}
// Config declarations resolve the composed providers from the artifact root.
await symlink('app/node_modules',join(closure,'node_modules'));
await cp(join(snapshot,'deployment'),join(closure,'deployment'),{recursive:true});
await cp(join(snapshot,'deployments'),join(closure,'deployments'),{recursive:true});
await writeFile(join(closure,'pnpm-workspace.yaml'),'packages: []\n');
// Installation metadata names producer locations, and is not a runtime input.
await rm(join(closure,'app/node_modules/.modules.yaml'),{force:true});
await rm(join(closure,'app/node_modules/.pnpm-workspace-state-v1.json'),{force:true});
const lock=await readFile(join(workspace,'pnpm-lock.yaml'));
await mkdir(join(closure,'.metadata'),{recursive:true});
await writeFile(join(closure,'.metadata','dependencies.lock.yaml'),lock);
await writeFile(join(closure,'.metadata','runtime-dependencies.json'),JSON.stringify(dependencyEvidence,null,2)+'\n');
await rm(join(closure,'app/node_modules/.pnpm/lock.yaml'));
await writeFile(join(closure,'.metadata','sources.json'),JSON.stringify(sources,null,2)+'\n');
const release={machineCommit:process.env.GITHUB_SHA??null,machineRepository:process.env.GITHUB_REPOSITORY??null,dependencyLockSha256:createHash('sha256').update(lock).digest('hex')};
await writeFile(join(closure,'.metadata','release.json'),JSON.stringify(release,null,2)+'\n');
process.stdout.write(JSON.stringify({closure})+'\n');
