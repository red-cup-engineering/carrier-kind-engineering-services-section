import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
const [snapshotArg,workArg,serviceArg]=process.argv.slice(2);
const snapshot=resolve(snapshotArg),work=resolve(workArg),service=resolve(serviceArg);
const run=(cmd,args,cwd=snapshot)=>{const r=spawnSync(cmd,args,{cwd,encoding:'utf8',maxBuffer:64*1024*1024});if(r.error||r.status!==0)throw r.error??new Error(`${cmd} failed: ${r.stderr.slice(-2000)}`);return r.stdout.trim()};
const api=path=>JSON.parse(run('gh',['api',path]));
const spec=JSON.parse(await readFile(join(snapshot,'sources.json'),'utf8'));const updates=[];
for(const source of spec.repositories){
 const ref=source.ref??'main';
 const head=api(`repos/${source.repository}/branches/${encodeURIComponent(ref)}`).commit.sha;
 if(head===source.commit)continue;
 const prs=api(`repos/${source.repository}/commits/${head}/pulls`);
 let pr=prs.find(pr=>pr.merged_at&&pr.base.ref===ref&&pr.merge_commit_sha===head);
 // Publication data may advance after the approved software merge. Receive
 // that merge from its ancestry rather than losing it behind a raw data pin.
 if(!pr){
  const candidates=api(`repos/${source.repository}/pulls?state=closed&base=${encodeURIComponent(ref)}&sort=updated&direction=desc&per_page=50`)
   .filter(p=>p.merged_at&&p.merge_commit_sha&&p.merge_commit_sha!==source.commit)
   .sort((a,b)=>b.merged_at.localeCompare(a.merged_at));
  for(const candidate of candidates){
   const forward=api(`repos/${source.repository}/compare/${source.commit}...${candidate.merge_commit_sha}`).status;
   if(forward!=='ahead')continue;
   const ancestry=api(`repos/${source.repository}/compare/${candidate.merge_commit_sha}...${head}`).status;
   if(['ahead','identical'].includes(ancestry)){pr=candidate;break}
  }
 }
 const admitted=pr?.merge_commit_sha;
 // A raw push is not an admitted source release. Owning-repository merge
 // permissions and its review rules remain the authority.
 if(!pr){process.stderr.write(`Awaiting owning PR merge: ${source.repository}@${head}\n`);continue}
 updates.push({repository:source.repository,before:source.commit,commit:admitted,pullRequest:pr.html_url,mergedAt:pr.merged_at,mergedBy:pr.merged_by?.login??null});
 source.commit=admitted;source.admission={pullRequest:pr.html_url,mergedAt:pr.merged_at};
}
if(!updates.length){process.stdout.write('No newly merged source releases.\n');process.exit(0)}
await writeFile(join(snapshot,'sources.json'),JSON.stringify(spec,null,2)+'\n');
// Resolve first; commit the exact machine inputs before any build or promotion.
run('guix',['repl','--',join(service,'scripts/github-machine-release.scm'),snapshot,work,'resolve']);
run('git',['add','sources.json','dependencies.lock.yaml']);
run('git',['-c','user.name=561 Group source admission','-c','user.email=emsenn@users.noreply.github.com','commit','-m',`Admit reviewed source merges (${updates.length})`,'-m',JSON.stringify(updates,null,2)]);
// Use the existing supported gh credential helper, avoiding an Actions token
// whose own pushes suppress subsequent workflow runs.
run('git',['-c','credential.helper=!gh auth git-credential','-c','http.https://github.com/.extraheader=','push','origin','HEAD:main']);
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,updates.map(x=>`- [Merged source](${x.pullRequest}): \`${x.repository}@${x.commit}\``).join('\n')+'\n');
