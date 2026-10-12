from pathlib import Path
import hashlib,json,tempfile,shutil,os
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
r=Path(Path('/tmp/muse-generation-run').read_text().strip()); m=json.loads((r/'candidate-manifest.json').read_text()); packet=json.loads((r/'composition-input.json').read_text())
root=Path('lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-knowledge-systems-services-section/apps/static-site-publisher').resolve()
def preflight(root,stage,inputs,outputs):
 for n,h in inputs.items():
  if sha(root/n)!=h: raise ValueError('stale-input:'+n)
 for n,h in outputs.items():
  if sha(stage/n)!=h: raise ValueError('changed-candidate:'+n)
def promote(root,stage,inputs,outputs,backup):
 preflight(root,stage,inputs,outputs)
 names=[n for n in inputs if inputs[n]!=outputs[n]]
 for n in names:
  (backup/n).parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/n,backup/n)
 for n in names:
  p=root/n;temporary=p.with_name(p.name+'.muse-promotion');shutil.copy2(stage/n,temporary);os.replace(temporary,p)
 return names
with tempfile.TemporaryDirectory(prefix='muse-stale-input-') as t:
 t=Path(t);a=t/'shared';b=t/'candidate';a.mkdir();b.mkdir()
 for n in ['a','b']:(a/n).write_text('old');(b/n).write_text('new')
 old={n:sha(a/n) for n in ['a','b']};out={n:sha(b/n) for n in old};(a/'b').write_text('concurrent')
 try:promote(a,b,old,out,t/'backup');raise AssertionError('failed to refuse')
 except ValueError as e:assert str(e)=='stale-input:b'
 assert (a/'a').read_text()=='old' and (a/'b').read_text()=='concurrent' and not (t/'backup').exists()
 stale={'result':'refused-before-any-write','concurrentInputPreserved':True,'precedingInputPreserved':True}
assert json.loads((r/'assessment-execution.json').read_text())['exitCode']==0
assert sha(r/'candidate.json')==m['candidateJsonSha256']
sp=Path(Path('/tmp/muse-spec-path').read_text().strip())
assert sha(sp/'2026-09-27-victor-authored-home-fabrication.md')==m['workOrderSha256']
assert not (r/'promotion.json').exists()
names=promote(root,r/'candidate',m['inputManifest'],m['outputs'],r/'pre-promotion')
assert all(sha(root/n)==h for n,h in m['outputs'].items())
receipt={'method':'exact generated replacement after whole-batch input and output digest preflight','sourceRoot':str(root),'changedFiles':names,'outputs':m['outputs'],'staleInputDemonstration':stale,'assessment':json.loads((r/'assessment-execution.json').read_text()),'limitations':['No public deployment or full assistant acceptance.','Assay XML predicates corrected after original source derivation; see realization-lineage.json.','No cash-cost data available.']}
(r/'promotion.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'promotedFiles':len(names),'staleInputDemonstration':stale}))
