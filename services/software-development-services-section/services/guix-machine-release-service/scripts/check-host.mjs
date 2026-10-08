// Website admission belongs to its receiving process; media has its own admission.
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const [artifactArg,snapshotArg]=process.argv.slice(2),artifact=resolve(artifactArg);
const sources=JSON.parse(readFileSync(join(artifact,'.metadata/sources.json'),'utf8'));
const providers=Object.fromEntries(sources.packages.map(p=>[p.name,join(artifact,'packages',p.name.replaceAll('/','__'))]));
const entry=providers['@red-cup-engineering/feltos-enterprise-host'];
const exec=(program,args,options={})=>{const r=spawnSync(program,args,{stdio:'inherit',...options});if(r.error||r.status!==0)throw r.error??new Error(`${program} website admission failed (${r.status})`)};
const environment={...process.env,NODE_OPTIONS:'--max-old-space-size=384',GUIX_MACHINE_SNAPSHOT:snapshotArg??process.env.GUIX_MACHINE_SNAPSHOT};
exec('guile',['--no-auto-compile',fileURLToPath(new URL('../test/health-reading.scm',import.meta.url))],{env:environment});
const signchainChecks=['typed-theory.test.mjs','derivation-validity.test.mjs'];
const checks=['work-forwarding.test.mjs','work-replication.test.mjs','work-peer-schedule.test.mjs','serve-instance-lifecycle.test.mjs'];
exec(process.execPath,['--test',fileURLToPath(new URL('../test/release-admission.test.mjs',import.meta.url)),...checks.map(f=>join(entry,'test',f)),...signchainChecks.map(f=>join(providers['@red-cup-engineering/signchain'],'test',f)),join(providers['@red-cup-engineering/semantic-content-identify-service'],'test/semantic-content-identity.test.mjs')],{env:environment});
exec(process.execPath,['--test',join(providers['@red-cup-engineering/computer-inference-engine'],'test/zero-cash-account-admission.test.mjs')],{env:environment});
exec(process.execPath,['--test',join(providers['@red-cup-engineering/activitypub-services-section'],'test/sqlite-queue-responsiveness.test.mjs')],{env:environment});
const newsroom=providers['@causeway-services/koios-news'];
exec(process.execPath,['--input-type=module','-e',"await import('./src/news-line.mjs')"],{env:environment,cwd:newsroom});
exec(process.execPath,['--test',...['article-reporting.test.mjs','editorial-protocol.test.mjs','evidence-replay.test.mjs','inference-config.test.mjs','newsroom-transitions.test.mjs'].map(f=>join(newsroom,'test',f))],{env:environment,cwd:newsroom});

exec(process.execPath,['--input-type=module','-e',"await import('./app/src/serve-instance.mjs'); await import('./node_modules/@causeway-services/koios-news/src/news-line.mjs')"],{env:environment,cwd:artifact});
