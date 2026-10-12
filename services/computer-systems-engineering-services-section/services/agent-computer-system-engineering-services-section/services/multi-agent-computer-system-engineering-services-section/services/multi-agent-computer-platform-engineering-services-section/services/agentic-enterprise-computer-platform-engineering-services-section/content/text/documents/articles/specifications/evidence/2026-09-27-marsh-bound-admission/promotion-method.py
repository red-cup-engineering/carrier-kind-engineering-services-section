from pathlib import Path
import json,hashlib,shutil,os,difflib
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();g=Path(Path('/tmp/muse-marsh-generation-run').read_text());m=json.loads((g/'candidate-manifest.json').read_text());packet=json.loads((g/'public-input.json').read_text());paths=json.loads((g/'source-paths.json').read_text());sp=Path(Path('/tmp/muse-spec-path').read_text());order=sp/'2026-09-27-marsh-bound-admission-fabrication.md';assert sha(order)==m['workOrderSha256'];n='protected/catalog/catalog.mjs';current=sha(Path(paths[n]));stale=[n for n,h in m['inputs'].items() if sha(Path(paths[n]))!=h];assert stale==[n]
# Reviewed concurrent change only supplies a Claude hook command; MARSH import and registration remain byte-identical.
diff=''.join(difflib.unified_diff(packet['inputs'][n]['text'].splitlines(True),Path(paths[n]).read_text().splitlines(True)));assert len(diff)<2200 and 'hookCommand' in diff
for line in packet['inputs'][n]['text'].splitlines():
 if 'marsh' in line.lower():assert line in Path(paths[n]).read_text().splitlines()
e=sp/'evidence/2026-09-27-marsh-bound-admission';assert not e.exists();e.mkdir(parents=True);shutil.copytree(g,e/'original-generation');shutil.copy2(order,e/'original-work-order.md');(e/'concurrent-catalog.diff').write_text(diff)
text=order.read_text().replace(m['inputs'][n],current);text+='\nPromotion recapture: a concurrent Claude harness hook-command addition changed the protected catalog after generation. Its MARSH and Hive Engine registration bytes remain unchanged. The same generated contract/test bytes and assessed behavior are retained; no new model derivation or source adaptation is claimed. The original order, stale-input refusal and current protected input are retained in the receiving evidence.\n';order.write_text(text);inputs={**m['inputs'],n:current}
for label,directory in [('original-assay','/tmp/muse-marsh-assay-20260927-01'),('assessment','/tmp/muse-marsh-assessment-20260927-01'),('identity-refinement','/tmp/muse-marsh-assessment-20260927-02')]:
 source=Path(directory);dest=e/label;dest.mkdir()
 # Keep source, observations and exact invocation records; omit compiled outputs, dependency copies and executable binaries.
 for p in source.rglob('*'):
  rel=p.relative_to(source)
  if not p.is_file() or any(part in ['node_modules','out','cache','home','tmp','consumer'] for part in rel.parts) or p.name=='runtime-node':continue
  if p.stat().st_size>2_000_000:continue
  q=dest/rel;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q)
assert sha(Path('/tmp/muse-marsh-assessment-20260927-01/assay-commitment.json'))==m['assayCommitment']['manifestSha256'];assert sha(Path('/tmp/muse-marsh-assessment-20260927-02/src/MARSH.sol'))==m['outputs']['src/MARSH.sol']
log=Path('/tmp/muse-marsh-assessment-20260927-02/identity-assay-attempt-2.stdout.log').read_text();assert '1 passed' in log and '0 failed' in log
assert all(sha(Path(paths[n]))==h for n,h in inputs.items());assert all(sha(g/'candidate'/n)==h for n,h in m['outputs'].items())
for n in m['outputs']:
 dst=Path(paths[n]);old=e/'before-promotion'/n;old.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(dst,old)
for n in m['outputs']:
 dst=Path(paths[n]);tmp=dst.with_suffix(dst.suffix+'.muse-promotion');shutil.copy2(g/'candidate'/n,tmp);os.replace(tmp,dst)
assert all(sha(Path(paths[n]))==h for n,h in m['outputs'].items());assert all(sha(Path(paths[n]))==h for n,h in inputs.items() if n not in m['outputs'])
receipt={'method':'same exact generated candidate, protected consumer recapture after preflight refusal','inputDigests':inputs,'outputDigests':m['outputs'],'originalGenerationOrder':m['workOrderSha256'],'promotionOrder':sha(order),'staleInputRefusal':stale,'privateAssayRefinement':'identity namespace assertion strengthened after generation; original precommitment preserved','scope':'local compiled bound-admission behavior and existing reader compatibility; no chain deployment, signer, resolver or assistant acceptance'};(e/'promotion.json').write_text(json.dumps(receipt,indent=2));(g/'promotion.json').write_text(json.dumps(receipt,indent=2));shutil.copy2('/tmp/promote-muse-marsh.py',e/'promotion-method.py');print(json.dumps({'promoted':list(m['outputs']),'protectedConcurrentChangePreserved':True,'evidence':str(e)}))
