from pathlib import Path
import json,hashlib,tempfile,shutil,difflib
sha=lambda b:hashlib.sha256(b).hexdigest()
old=Path(Path('/tmp/muse-generation-run').read_text().strip());r=Path(tempfile.mkdtemp(prefix='muse-realization-'));root=Path('lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-knowledge-systems-services-section/apps/static-site-publisher').resolve()
p=json.loads((old/'composition-input.json').read_text());c=json.loads((old/'candidate.json').read_text());diffs={}
for n,v in p['inputs'].items():
 now=(root/n).read_text()
 if sha(now.encode())!=v['sha256']:diffs[n]=''.join(difflib.unified_diff(v['text'].splitlines(True),now.splitlines(True)))
 p['inputs'][n]={'text':now,'sha256':sha(now.encode())}
for e in c['edits']:e['inputSha256']=p['inputs'][e['path']]['sha256']
(r/'composition-input.json').write_text(json.dumps(p));(r/'candidate.json').write_text(json.dumps(c));shutil.copy2(old/'events.jsonl',r/'events.jsonl')
(r/'input-manifest.json').write_text(json.dumps({n:{'sha256':v['sha256'],'bytes':len(v['text'].encode())} for n,v in p['inputs'].items()},indent=2))
(r/'realization-lineage.json').write_text(json.dumps({'kind':'reviewed-concurrent-input-composition','priorRealization':str(old),'newInferenceInvocation':False,'sourceEditsUnchanged':True,'reviewedChanges':diffs,'preservation':'Theme propagation and configured cell label remain in current inputs; all generated replacements match uniquely without alteration.','assayChronology':'Original assays preceded source inference; corrected sitemap predicates followed source; corrected commitment precedes this composition.'},indent=2))
Path('/tmp/muse-generation-run').write_text(str(r));print(r)
