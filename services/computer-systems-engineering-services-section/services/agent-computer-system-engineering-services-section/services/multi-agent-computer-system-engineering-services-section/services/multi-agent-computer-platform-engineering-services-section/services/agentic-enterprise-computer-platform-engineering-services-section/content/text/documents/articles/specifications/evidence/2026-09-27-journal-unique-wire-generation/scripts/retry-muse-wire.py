from pathlib import Path
import json,tempfile,hashlib,subprocess,shutil
old=Path(Path('/tmp/muse-wire-generation-run').read_text());r=Path(tempfile.mkdtemp(prefix='muse-wire-generation-'))
for name in ['protected-inputs.json','source-paths.json','output-schema.json','resolution-environment.json','assessment-profile.json']:
 shutil.copy2(old/name,r/name)
p=json.loads((old/'public-input.json').read_text())
p['apiFacts']['eavtKey']='Named export eavtKey from @red-cup-engineering/eavt-services-section/row. This exact specifier resolves from the writable module; @red-cup-engineering/eavt-services-section/row does not exist.'
p['publicSourceReview']={'previousCandidate':json.loads((old/'candidate.json').read_text()),'findings':['The generated eavtKey import uses a nonexistent package. Use the existing exact export in apiFacts.eavtKey.','F-U01 bounds the command, and F-U02/F-U03 bound the retained record. Applying snapshot resource admission again to return wrappers adds duplicate command/record containers and can reject an otherwise valid bounded value near the limits. Freeze result wrappers over already frozen admitted snapshots instead of imposing an extra undocumented aggregate bound.'],'scope':'Public source review against the unchanged order only; no private assay content or results supplied. Return codemods against the ORIGINAL inputs, not against the previous candidate.'}
(r/'public-input.json').write_text(json.dumps(p,indent=2))
(r/'public-feedback.json').write_text(json.dumps({'previousRun':str(old),'basis':'Public import/export evidence and source-level review of specified resource scope.'},indent=2))
profile=[x.replace(str(old),str(r)) for x in json.loads((old/'profile.json').read_text())];(r/'profile.json').write_text(json.dumps(profile))
probe=subprocess.run(profile+['/bin/sh','-c','test ! -e /home/emsenn/info && test ! -e /assays && test -r /input/output-schema.json && printf boundary-ok'],capture_output=True,text=True)
(r/'boundary-probe.json').write_text(json.dumps({'exitCode':probe.returncode,'stdout':probe.stdout,'stderr':probe.stderr,'profileSha256':hashlib.sha256((r/'profile.json').read_bytes()).hexdigest()}));assert probe.returncode==0
Path('/tmp/muse-wire-generation-run').write_text(str(r));print(r)
