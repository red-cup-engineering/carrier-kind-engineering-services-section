from pathlib import Path
import json,hashlib,tempfile,shutil,subprocess,re
s=Path(Path('/tmp/muse-spec-path').read_text().strip());old=Path(Path('/tmp/muse-owner-run').read_text().strip());olda=Path(Path('/tmp/muse-owner-assay').read_text().strip());h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert json.loads((old/'candidate.json').read_text())['disposition']=='refused'
order=s/'2026-09-27-journal-source-owner-fabrication.md'
for p,d in json.loads((old/'protected-inputs.json').read_text()).items():
 if p!=str(order):assert h(Path(p))==d,p
r=Path(tempfile.mkdtemp(prefix='muse-owner-generation-'));a=Path(tempfile.mkdtemp(prefix='muse-owner-assay-'))
for n in ['assay.mjs','resolve.mjs','dependencies.json']:shutil.copy2(olda/n,a/n)
dependencyMap=json.loads((a/'dependencies.json').read_text())
articulationPath=next(Path(x) for x in dependencyMap['files'] if x.endswith('/identity/primitive-articulation.mjs'))
articulationSpecifier='@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/identity/primitive-articulation'
codeRoot=articulationPath.parents[3]
assert json.loads((codeRoot/'package.json').read_text())['exports']['./semiotic-eavt/identity/primitive-articulation']=='./src/semiotic-eavt/identity/primitive-articulation.mjs'
assert articulationSpecifier not in dependencyMap['bareResolutions']
dependencyMap['bareResolutions'][articulationSpecifier]=articulationPath.as_uri()
(a/'dependencies.json').write_text(json.dumps(dependencyMap,indent=2)+'\n')
commit=json.loads((olda/'commitment.json').read_text());commit['orderSha256']=h(order);commit['dependencyMapSha256']=h(a/'dependencies.json');(a/'commitment.json').write_text(json.dumps(commit,indent=2)+'\n')
inv=json.loads((old/'inventory.json').read_text());inv['clauses']=[f'F-S{i:02d}' for i in range(1,21)];(r/'inventory.json').write_text(json.dumps(inv,indent=2)+'\n')
shutil.copy2(old/'promotion-inventory.json',r/'promotion-inventory.json');shutil.copytree(old/'original',r/'original')
p=json.loads((old/'public-input.json').read_text());p['inventory']=inv;p['assayCommitment']={'manifestSha256':h(a/'commitment.json'),'committedBeforeGeneration':True}
p['purpose']='Generate only B2b1 under F-S20: add the private requiredSourceClosure(state, requirement) semantic closure and custody-selection helper, using the exact specified immutable planning shape. Implement complete descriptor-safe admission, required original unique evidence, admitted causal closure, exact bounded counts and bytes, longest causal path, required artifact laws and deterministic sufficient source cover. This helper performs no filesystem mutation, fsync or acknowledgment. Preserve all host, reader, reconstruction and read functions and all three effect incompleteness boundaries; B2b2 composes the helper with physical durability and host corrections. Add only necessary existing imports and private helpers. Return an unaccepted exact source-patchset candidate. Use short unique before strings copied verbatim from transformationInputs. Do not claim complete-owner acceptance.'
selection={'2026-09-27-journal-source-owner-fabrication.md': ['F-S01', 'F-S07', 'F-S08', 'F-S09', 'F-S15', 'F-S19', 'F-S20'], '2026-09-27-muse-assist-journal-operation-lld.md': ['L-O01', 'L-O04', 'L-O23', 'L-O26', 'L-O27', 'L-O28'], '2026-09-27-source-patchset-fabrication.md': None}
contracts=[]
for n,ids in selection.items():
 f=s/n;t=f.read_text()
 if ids is None:chosen=t
 else:
  matches=list(re.finditer(r'(?m)^(?:\*\*|## )([FL]-[A-Z]\d+)\b',t));parts={m.group(1):t[m.start():matches[i+1].start() if i+1<len(matches) else len(t)] for i,m in enumerate(matches)}
  assert all(k in parts for k in ids);chosen='\n'.join(parts[k] for k in ids)
 contracts.append({'path':n,'fullFileSha256':h(f),'selectedClauses':ids,'selectedText':chosen})
p['contracts']=contracts
p.pop('existingFeedAddressAPI',None)
keep=['/scripts/canonical-json.mjs','/src/index.mjs','/journal/substrate.mjs','/journal/causal-graph.mjs','/journal/judgment.mjs','/identity/index.mjs','/identity/primitive-articulation.mjs','/identity/site.mjs']
p['readOnlySourceInputs']=[x for x in p['readOnlySourceInputs'] if any(x['path'].endswith(y) for y in keep)]
p['approvedBareImports'][articulationSpecifier]=articulationPath.as_uri()
p['publicSourceReview']={'stage':'B2a','status':'read scope public corrections addressed; proceed with F-S20 semantic custody stage','findings':[]}

(r/'public-input.json').write_text(json.dumps(p))
schema=json.loads((old/'output-schema.json').read_text());schema['properties']['changes']['items']['properties']['clauses']['items']['enum']=inv['clauses'];(r/'output-schema.json').write_text(json.dumps(schema))
profile=[str(r/'output-schema.json') if x==str(old/'output-schema.json') else x for x in json.loads((old/'profile.json').read_text())];(r/'profile.json').write_text(json.dumps(profile))
protected=json.loads((old/'protected-inputs.json').read_text());protected[str(order)]=h(order);(r/'protected-inputs.json').write_text(json.dumps(protected,indent=2)+'\n')
assessment=[str(a) if x==str(olda) else x.replace(str(old/'stage'),str(r/'stage')) for x in json.loads((old/'assessment-profile.json').read_text())];(r/'assessment-profile.json').write_text(json.dumps(assessment))
probe="import os,json; from pathlib import Path; print(json.dumps({'checkoutVisible':Path('/home/emsenn/info').exists(),'assayVisible':Path("+repr(str(a))+").exists(),'workEmpty':not any(Path('/work').iterdir()),'tmpEmpty':not any(Path('/tmp').iterdir()),'schemaVisible':Path('/input/output-schema.json').is_file(),'pid':os.getpid()}))"
env={'PATH':'/usr/bin:/bin','HOME':'/mnt/c/Users/emsen','CODEX_HOME':'/mnt/c/Users/emsen/.codex','LANG':'C.UTF-8'};x=subprocess.run(profile+['/usr/bin/python3','-c',probe],capture_output=True,text=True,env=env,check=True);obs=json.loads(x.stdout);assert not obs['checkoutVisible'] and not obs['assayVisible'] and obs['workEmpty'] and obs['tmpEmpty'] and obs['schemaVisible'] and obs['pid']<10
(r/'boundary-observation.json').write_text(json.dumps({'observations':obs,'profileSha256':h(r/'profile.json'),'beforeGeneration':True},indent=2)+'\n')
Path('/tmp/muse-owner-run').write_text(str(r));Path('/tmp/muse-owner-assay').write_text(str(a));print(json.dumps({'run':str(r),'assay':str(a),'publicBytes':(r/'public-input.json').stat().st_size,'previousPublicBytes':(old/'public-input.json').stat().st_size,'privateFixtureUnchanged':h(a/'assay.mjs')==h(olda/'assay.mjs'),'stage':'B2b1 semantic closure and custody selection'}))
