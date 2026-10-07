import {readFile,writeFile,mkdir,cp,rename,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {catalogNodePackageSources} from '../../typed-resource-catalog-service/src/node-package-source-catalog.mjs';
import {materializeNodeRuntimeRelease} from '../../node-runtime-release-materialization-service/src/materialize-release.mjs';

const [workspaceArg,snapshotArg,outputArg]=process.argv.slice(2);
const workspace=resolve(workspaceArg),snapshot=resolve(snapshotArg),output=resolve(outputArg);
const sources=JSON.parse(await readFile(join(workspace,'sources.json'),'utf8'));
const spec=JSON.parse(await readFile(join(snapshot,'sources.json'),'utf8'));
const providers=Object.fromEntries(sources.packages.map(p=>[p.name,join(workspace,'packages',p.name.replaceAll('/','__'))]));
const entry=providers['@red-cup-engineering/feltos-enterprise-host'];
const manifest=JSON.parse(await readFile(join(entry,'package.json'),'utf8'));
// The machine's declared dynamic providers are part of its runtime closure.
for(const name of spec.entries.filter(n=>n!==manifest.name)){
 const p=sources.packages.find(p=>p.name===name);
 if(!p)throw new Error(`machine provider has no pinned source: ${name}`);
 manifest.dependencies[name]=p.version;
}
await writeFile(join(entry,'package.json'),JSON.stringify(manifest,null,2)+'\n');
const checks=['work-forwarding.test.mjs','work-replication.test.mjs','work-peer-schedule.test.mjs','receiver-independence.test.mjs','serve-instance-lifecycle.test.mjs'];
const test=spawnSync(process.execPath,['--test',...checks.map(f=>join(entry,'test',f))],{stdio:'inherit',env:{...process.env,NODE_OPTIONS:'--max-old-space-size=384'}});
if(test.error||test.status!==0)throw test.error??new Error('host work and lifecycle checks failed');
const catalog=await catalogNodePackageSources({entryPackageDirectory:entry,providerSources:Object.fromEntries(Object.entries(providers).filter(([n])=>n!==manifest.name))});
const runtime=await materializeNodeRuntimeRelease({entryPackageDirectory:entry,sourceCatalog:catalog,outputRoot:output});
const closure=runtime.releaseDirectory;
await cp(join(snapshot,'deployment'),join(closure,'deployment'),{recursive:true});
await writeFile(join(closure,'pnpm-workspace.yaml'),"packages: []\n");
const lock=await readFile(join(workspace,'pnpm-lock.yaml'));
await mkdir(join(closure,'.metadata'),{recursive:true});
await writeFile(join(closure,'.metadata','dependencies.lock.yaml'),lock);
await writeFile(join(closure,'.metadata','sources.json'),JSON.stringify(sources,null,2)+'\n');
await writeFile(join(closure,'.metadata','release.json'),JSON.stringify({machineCommit:process.env.GITHUB_SHA??null,machineRepository:process.env.GITHUB_REPOSITORY??null,dependencyLockSha256:createHash('sha256').update(lock).digest('hex'),runtimeDigest:runtime.artifactDigest},null,2)+'\n');
// Producer paths are observations, not inputs to the immutable Guix artifact.
const receipt={...runtime};delete receipt.releaseDirectory;
await writeFile(join(closure,'release-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify({closure})+'\n');
