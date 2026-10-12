from pathlib import Path
import json,hashlib,shutil,os,time,subprocess
r=Path(Path('/tmp/muse-http-identity-run').read_text());a=Path(Path('/tmp/muse-http-identity-assay').read_text());s=Path(Path('/tmp/muse-spec-path').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest=json.loads((r/'candidate-manifest.json').read_text());assessment=json.loads((r/'assessment.json').read_text());report=json.loads(assessment['stdout']);assert assessment['exitCode']==0 and report['passed']==report['total'];assert assessment['candidateManifestSha256']==sha(r/'candidate-manifest.json')
protected=json.loads((r/'protected-inputs.json').read_text());paths=json.loads((r/'source-paths.json').read_text());packet=json.loads((r/'public-input.json').read_text())
assert sha(a/'commitment.json')==packet['assayCommitment']['manifestSha256'];assert sha(a/'assay.mjs')==json.loads((a/'commitment.json').read_text())['assaySha256']
for p,digest in protected.items():assert sha(Path(p))==digest,'stale input '+p
for p,digest in manifest['outputs'].items():assert sha(r/'candidate'/p)==digest,'candidate changed '+p
review={'disposition':'accepted for specified shared HTTP identity component','basis':['L-A01 closed process/gateway/refused resolver and no invalid gateway fallback','L-A02 both constructors guard before body/resources/inference/routing and force gatewaySubjects false','L-A03 signed configured peer exchange remains on prior verification path','L-A04 constructor-installed upgrade resolver precedes 101/session/lifecycle/persistence and refuses thrown/promise identity','L-A05 gateway principal passed separately to append caller metadata; token not retained','L-A06 unchanged stdio gateway semantics and process capability activation','L-A07 precommitted isolated observations pass, candidate/provider had no assessor context'], 'limits':['No live gateway deployment or personal context authorization acceptance','Raw data resource scoping, MCP host/user channel separation, origin/session policy and credential deployment remain unfinished','No independent receiver acceptance of an assistant result','Generation provider-server confidentiality remains a trust assumption; no cash cost data available'], 'assaySha256':sha(a/'assay.mjs'),'candidateManifestSha256':sha(r/'candidate-manifest.json'),'reviewer':'root assessor; source generator gpt-6-luna in fresh isolated CLI invocation'}
(r/'source-review.json').write_text(json.dumps(review,indent=2)+'\n')
# Prepare the already accepted bytes before comparing every input again. No generated code runs here.
temps={}
for rel,target in paths.items():
 p=Path(target);q=p.with_name('.'+p.name+'.muse-identity-promotion');fd=os.open(q,os.O_WRONLY|os.O_CREAT|os.O_EXCL,p.stat().st_mode & 0o777)
 with os.fdopen(fd,'wb') as out:out.write((r/'candidate'/rel).read_bytes())
 temps[rel]=q
for p,digest in protected.items():assert sha(Path(p))==digest,'stale receiving input '+p
for rel,target in paths.items():os.replace(temps[rel],target)
for rel,target in paths.items():assert sha(Path(target))==manifest['outputs'][rel]
receipt={'status':'promoted','at':time.time(),'inputs':manifest['inputs'],'outputs':manifest['outputs'],'candidateManifestSha256':sha(r/'candidate-manifest.json'),'assessmentSha256':sha(r/'assessment.json'),'reviewSha256':sha(r/'source-review.json'),'promotionToolSha256':sha(Path(__file__)),'scope':'Shared HTTP identity component only; no deployed/private-assistant acceptance','atomicity':'All protected inputs checked before writes; per-file replacements, not an atomic multifile publication'}
(r/'promotion-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
e=s/'evidence/2026-09-27-http-identity-generation';e.mkdir();old=Path(json.loads((r/'predecessor-run.json').read_text())['path'])
for name in ['public-input.json','output-schema.json','invocation.json','events.jsonl','profile.json','protected-inputs.json','candidate.json','candidate-manifest.json','candidate.diff','candidate-assessment-profile.json','assessment-isolation.json','assessment.json','source-review.json','promotion-receipt.json','predecessor-run.json']:
 shutil.copy2(r/name,e/name)
for name in ['assay.mjs','commitment.json']:shutil.copy2(a/name,e/name)
for name in ['rejection.json','invocation.json','candidate.json','events.jsonl','boundary-probe.json','baseline.json']:
 shutil.copy2(old/name,e/('first-'+name))
for name in ['/tmp/materialize-assess-muse-http-identity.py','/tmp/promote-muse-http-identity.py']:shutil.copy2(name,e/Path(name).name)
usage=[]
for run in [old,r]:
 ev=[json.loads(l) for l in (run/'events.jsonl').read_text().splitlines() if l.strip()];v=json.loads((run/'invocation.json').read_text());usage.append({'run':run.name,'durationSeconds':v['durationSeconds'],'modelRequested':v['modelRequested'],'usage':[x.get('usage') for x in ev if 'usage' in x],'cashCost':'unavailable'})
profile=json.loads((r/'profile.json').read_text());version=subprocess.run(profile+['/generator','--version'],capture_output=True,text=True,timeout=20)
(e/'environment.json').write_text(json.dumps({'generatorVersion':version.stdout.strip(),'generatorVersionExit':version.returncode,'providerUsage':usage,'secondBoundary':'Same mount profile and identical output-schema bytes as the recorded first probe; fresh ephemeral provider session','assayEnvironmentCleared':True},indent=2)+'\n')
(e/'README.md').write_text('''# Shared HTTP identity component: generated and promoted

The source order derives from the personal-interaction LLD through HLD, SAS, arc42, requirements and customer demand; the public packet binds the complete predecessor chain by digest. The original modules passed 3 of 42 private observations. The first isolated Luna candidate was rejected before staging because its exact-match edits were ambiguous. A fresh isolated session received only that public materialization reproduction. The second candidate passed all 42 precommitted observations and source review, and its exact staged bytes were promoted after all protected input hashes matched.

The observed effect is request rejection before application ports when gateway identity is unavailable, or consistent authenticated identity across admitted HTTP branches and retained WebSocket append metadata. Both HTTP constructors, process mode and independent peer verification are covered. Actual module bytes ran with explicitly controlled external ports in a network-denied namespace with cleared environment and no operational credentials. These observations do not establish live HTTP/gateway deployment, real journal durability, context permission, receiver acceptance or a completed assistant.

The private assay was withheld from both provider invocations. Provider-server confidentiality is an assumption. Token usage and durations are in `environment.json`; monetary cost is unavailable. Read `promotion-receipt.json` for exact outputs and `source-review.json` for acceptance limits. The temporary absolute paths in archived profiles are historical invocation evidence, not a portable test runner.

Outstanding application obligations include scoped context/resource authorization, a separated MCP service/user channel, personal work admission and execution/recovery, the integrated journal replacement, and independent receiving acceptance. No package release or live-server change was performed by this promotion.
''')
(e/'bindings.json').write_text(json.dumps({str(p.relative_to(e)):sha(p) for p in sorted(e.iterdir()) if p.is_file() and p.name!='bindings.json'},indent=2)+'\n')
print(json.dumps({'promoted':list(paths),'evidence':str(e),'usage':usage},indent=2))
