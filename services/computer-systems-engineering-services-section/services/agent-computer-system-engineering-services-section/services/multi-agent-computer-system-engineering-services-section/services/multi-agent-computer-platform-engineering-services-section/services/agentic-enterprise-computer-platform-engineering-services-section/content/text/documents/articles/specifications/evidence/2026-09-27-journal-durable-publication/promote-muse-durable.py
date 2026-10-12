from pathlib import Path
import json,hashlib,shutil,os,re,subprocess
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
r=Path(Path('/tmp/muse-durable-generation-run').read_text());sp=Path(Path('/tmp/muse-spec-path').read_text());packet=json.loads((r/'public-input.json').read_text());paths=json.loads((r/'source-paths.json').read_text());a=json.loads((r/'assessment.json').read_text());report=json.loads(a['stdout']);order=sp/'2026-09-27-journal-durable-publication-fabrication.md';contract=sp/'2026-09-27-muse-assist-fabrication-lld.md';lld=sp/'2026-09-27-muse-assist-shared-effect-lld.md';assay=Path(Path('/tmp/muse-durable-assay').read_text());name='system/src/filesystem.mjs';src=r/'candidate'/name;dst=Path(paths[name])
assert not (r/'promotion.json').exists()
assert a['exitCode']==0 and report['passed']==report['total']==19
assert sha(src)==a['candidateSha256']
assert sha(order)==packet['workOrder']['sha256'] and sha(contract)==packet['realizationContract']['sha256']
assert sha(lld)==re.search(r'derived-from-sha256: ([a-f0-9]+)',order.read_text()).group(1)
assert sha(assay/'manifest.json')==packet['assayCommitment']['manifestSha256']
assert sha(assay/'assay.mjs')==json.loads((assay/'manifest.json').read_text())['assaySha256']
assert all(sha(Path(paths[n]))==v['sha256'] for n,v in packet['inputs'].items()),'stale original input; no mutation'
# Promotion is source materialization only; all behavioral source came from the isolated provider.
shutil.copy2(dst,r/'before-filesystem.mjs');temp=dst.with_name(dst.name+'.muse-promotion');assert not temp.exists();shutil.copy2(src,temp);os.chmod(temp,dst.stat().st_mode);os.replace(temp,dst)
receipt={'workOrderSha256':sha(order),'outputSha256':sha(dst),'inputSha256':packet['inputs'][name]['sha256'],'assessmentSha256':sha(r/'assessment.json'),'assayManifestSha256':sha(assay/'manifest.json'),'limits':report['limits'],'journalIntegration':'Outstanding; this option is not yet an effect reservation or enabled assistant capability'};(r/'promotion.json').write_text(json.dumps(receipt,indent=2)+'\n')
e=sp/'evidence/2026-09-27-journal-durable-publication';e.mkdir(parents=True,exist_ok=False)
shutil.copytree(assay,e/'private-assay');shutil.copytree(r,e/'accepted-generation')
prior=r;i=0
while (prior/'predecessor.json').exists():
 prior=Path(json.loads((prior/'predecessor.json').read_text())['run']);i+=1;shutil.copytree(prior,e/f'rejected-generation-{i}')
for f in ['/tmp/prepare-muse-durable-order.py','/tmp/prepare-muse-durable.py','/tmp/invoke-muse-durable.py','/tmp/materialize-assess-muse-durable.py','/tmp/promote-muse-durable.py']:
 shutil.copy2(f,e/Path(f).name)
profile=json.loads((r/'profile.json').read_text());binary=Path(profile[profile.index('/generator')-1]);env={'generatorSha256':sha(binary),'generatorVersion':subprocess.check_output([str(binary),'--version'],text=True).strip(),'nodeVersion':subprocess.check_output(['/home/emsenn/.local/lib/nodejs/node-v24.19.0-linux-x64/bin/node','--version'],text=True).strip(),'bubblewrapVersion':subprocess.check_output(['bwrap','--version'],text=True).strip(),'cashCost':'unavailable'};(e/'environment.json').write_text(json.dumps(env,indent=2))
print(json.dumps({'promoted':str(dst),'outputSha256':sha(dst),'evidence':str(e),'rejectedGenerationsPreserved':i},indent=2))
