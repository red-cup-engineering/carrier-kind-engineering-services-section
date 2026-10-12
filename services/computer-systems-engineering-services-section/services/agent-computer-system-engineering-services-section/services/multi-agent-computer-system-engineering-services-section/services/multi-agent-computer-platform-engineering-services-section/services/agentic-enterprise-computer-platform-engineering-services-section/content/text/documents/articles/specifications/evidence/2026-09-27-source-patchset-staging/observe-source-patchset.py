from pathlib import Path
import tempfile,json,hashlib,subprocess,sys,copy,os
base=Path(tempfile.mkdtemp(prefix='muse-patchset-observations-'));script=Path('/tmp/materialize-muse-source-patchset.py')
sha=lambda b:hashlib.sha256(b).hexdigest();checks=[]
def fixture(name):
 d=base/name;d.mkdir();root=d/'source';root.mkdir();(root/'edit.mjs').write_text('const value = 1;\n');(root/'retire.mjs').write_text('export const retired = true;\n');(root/'unchanged.mjs').write_text('export const kept = true;\n');(root/'unchanged.mjs').chmod(0o755)
 files={n:{'state':'present','sha256':sha((root/n).read_bytes())} for n in ['edit.mjs','retire.mjs','unchanged.mjs']};files['new/module.mjs']={'state':'absent'}
 inventory={'kind':'source-patchset-input','version':1,'sourceRoot':str(root),'files':files,'clauses':['F-X01']}
 candidate={'kind':'source-patchset','version':1,'disposition':'candidate','reason':'controlled mechanical fixture','changes':[
 {'operation':'edit','path':'edit.mjs','inputSha256':files['edit.mjs']['sha256'],'replacements':[{'before':'value = 1','after':'value = 2'}],'clauses':['F-X01']},
 {'operation':'create','path':'new/module.mjs','text':'export const created = true;\n','clauses':['F-X01']},
 {'operation':'delete','path':'retire.mjs','inputSha256':files['retire.mjs']['sha256'],'clauses':['F-X01']}]}
 return d,root,inventory,candidate

def fingerprint(root):
 return {str(p.relative_to(root)):(p.lstat().st_mode,os.readlink(p) if p.is_symlink() else sha(p.read_bytes())) for p in root.rglob('*') if p.is_file() or p.is_symlink()}

def run(name,modify=None,success=False):
 d,root,inv,cand=fixture(name);stage=d/'stage'
 if modify:modify(d,root,inv,cand)
 original=fingerprint(root);(d/'input.json').write_text(json.dumps(inv));(d/'candidate.json').write_text(json.dumps(cand))
 result=subprocess.run([sys.executable,str(script),str(d/'input.json'),str(d/'candidate.json'),str(stage)],capture_output=True,text=True)
 same=fingerprint(root)==original;ok=False
 if success:
  receipt=json.loads((d/'stage.receipt.json').read_text()) if (d/'stage.receipt.json').exists() else {}
  ok=result.returncode==0 and same and (stage/'edit.mjs').read_text()=='const value = 2;\n' and (stage/'new/module.mjs').read_text()=='export const created = true;\n' and not (stage/'retire.mjs').exists() and (stage/'unchanged.mjs').read_bytes()==(root/'unchanged.mjs').read_bytes() and (stage/'unchanged.mjs').stat().st_mode&0o777==0o755 and (stage/'new/module.mjs').stat().st_mode&0o777==0o644 and receipt.get('disposition')=='staged-unaccepted'
 else:
  preexisting=name in ['existing-stage','existing-receipt']
  ok=result.returncode!=0 and same and (preexisting or (not stage.exists() and not (d/'stage.receipt.json').exists()))
 checks.append({'name':name,'ok':ok,'exitCode':result.returncode,'sourceUnchanged':same,'diagnostic':result.stderr.strip()[:500]})
run('create-edit-retire-carry',success=True)
run('stale-source',lambda d,r,i,c:(r/'edit.mjs').write_text('concurrent change\n'))
run('stale-unchanged-input',lambda d,r,i,c:(r/'unchanged.mjs').write_text('concurrent untouched change\n'))
run('creation-target-present',lambda d,r,i,c:((r/'new').mkdir(),(r/'new/module.mjs').write_text('someone else created this\n')))
run('ambiguous-replacement',lambda d,r,i,c:c['changes'][0]['replacements'][0].update(before=' '))
run('extra-candidate-field',lambda d,r,i,c:c.update(shell='must never run'))
run('extra-change-field',lambda d,r,i,c:c['changes'][0].update(shell='must never run'))
run('repeated-change',lambda d,r,i,c:c['changes'].append(copy.deepcopy(c['changes'][0])))
run('unknown-clause',lambda d,r,i,c:c['changes'][0].update(clauses=['UNDECLARED']))
run('undeclared-path',lambda d,r,i,c:c['changes'][1].update(path='undeclared.mjs'))
run('path-traversal',lambda d,r,i,c:(i['files'].update({'../outside.mjs':{'state':'absent'}}),c['changes'][1].update(path='../outside.mjs')))
run('ancestor-collision',lambda d,r,i,c:i['files'].update({'new':{'state':'absent'}}))
run('symlink-input',lambda d,r,i,c:((r/'edit.mjs').unlink(),(r/'edit.mjs').symlink_to(r/'unchanged.mjs')))
run('symlink-ancestor',lambda d,r,i,c:((d/'outside').mkdir(),(r/'new').symlink_to(d/'outside',target_is_directory=True)))
run('boolean-version',lambda d,r,i,c:c.update(version=True))
run('invalid-input-utf8',lambda d,r,i,c:((r/'unchanged.mjs').write_bytes(b'\xff'),i['files']['unchanged.mjs'].update(sha256=sha(b'\xff'))))
run('invalid-output-utf8',lambda d,r,i,c:c['changes'][1].update(text='\ud800'))
run('existing-stage',lambda d,r,i,c:(d/'stage').mkdir())
run('existing-receipt',lambda d,r,i,c:(d/'stage.receipt.json').write_text('preexisting\n'))
run('false-refusal',lambda d,r,i,c:c.update(disposition='refused'))
report={'checks':checks,'passed':sum(x['ok'] for x in checks),'total':len(checks),'materializerSha256':sha(script.read_bytes()),'assessorSha256':sha(Path(__file__).read_bytes()),'limits':['Disposable local staging only; no product source generation, promotion, deployment or journal acceptance.','No atomic multi-file promotion or hostile concurrent directory replacement guarantee is claimed.']}
(base/'observation.json').write_text(json.dumps(report,indent=2)+'\n');Path('/tmp/muse-patchset-observations').write_text(str(base));print(json.dumps({'passed':report['passed'],'total':report['total'],'failed':[x for x in checks if not x['ok']],'evidence':str(base)},indent=2));sys.exit(0 if report['passed']==report['total'] else 1)
