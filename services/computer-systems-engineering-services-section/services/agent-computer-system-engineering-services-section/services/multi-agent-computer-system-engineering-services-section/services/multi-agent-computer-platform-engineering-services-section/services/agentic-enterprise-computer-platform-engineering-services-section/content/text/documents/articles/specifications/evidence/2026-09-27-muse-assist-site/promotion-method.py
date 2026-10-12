from pathlib import Path
import json,hashlib,shutil,tempfile,os
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();spec=Path(Path('/tmp/muse-spec-path').read_text());source=Path(Path('/tmp/muse-site-input-stage').read_text());candidate=Path(Path('/tmp/muse-public-candidate').read_text());bound=json.loads(Path('/tmp/muse-site-replacement-inputs.json').read_text());site=Path(bound['siteRoot']);accept=json.loads(Path('/tmp/muse-site-final-boundary-check.json').read_text())
def inventory(root):return {str(p.relative_to(root)):sha(p) for p in root.rglob('*') if p.is_file() and 'node_modules' not in p.relative_to(root).parts}
assert inventory(site)==bound['inputs'],'site changed';assert inventory(candidate)==accept['inventory'];assert not any((site/n).exists() for n in ['content','static-site-publisher.config.mjs']);evidence=spec/'evidence/2026-09-27-muse-assist-site';assert not evidence.exists();evidence.mkdir(parents=True)
for n in bound['inputs']:
 p=evidence/'prior-site'/n;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(site/n,p)
for name in ['muse-site-replacement-inputs.json','muse-site-final-boundary-check.json','muse-browser-final-observations.json','muse-final-zoom-observations.json']:
 shutil.copy2(Path('/tmp')/name,evidence/name)
shutil.copytree(source,evidence/'derived-inputs');shutil.copytree(candidate,evidence/'accepted-public')
assert inventory(site)==bound['inputs']
backup=Path(tempfile.mkdtemp(prefix='muse-replaced-public-'));os.replace(site/'public',backup/'public');shutil.copytree(candidate,site/'public');shutil.copytree(source/'content',site/'content');shutil.copy2(source/'static-site-publisher.config.mjs',site/'static-site-publisher.config.mjs');shutil.copy2(source/'README.md',site/'README.md')
assert inventory(site/'public')==accept['inventory'];assert sha(site/'package.json')==bound['inputs']['package.json'] and sha(site/'wrangler.jsonc')==bound['inputs']['wrangler.jsonc']
receipt={'method':'whole-site digest preflight, retain prior inventory outside serving tree, replace generated tree from accepted bytes','publicInventory':inventory(site/'public'),'retained':['package.json','wrangler.jsonc'],'retiredPublicFiles':sorted(n for n in bound['inputs'] if n.startswith('public/')),'authoredInputInventory':inventory(site/'content'),'configSha256':sha(site/'static-site-publisher.config.mjs'),'priorPublicBackup':str(backup),'deployment':'not performed','scope':'static public information only; no assistant or package release'};(evidence/'promotion.json').write_text(json.dumps(receipt,indent=2));print(json.dumps({'site':str(site),'evidence':str(evidence),'publicFiles':len(receipt['publicInventory']),'retiredHandwrittenFiles':len(receipt['retiredPublicFiles'])}))
for label,pointer in [('victor-public-provenance','/tmp/muse-provenance-generation-run'),('victor-shared-presentation','/tmp/muse-presentation-generation-run')]:
 r=Path(Path(pointer).read_text());dest=spec/'evidence'/('2026-09-27-'+label);shutil.copytree(r,dest/'accepted-generation');
 if label=='victor-public-provenance':shutil.copytree(Path(Path('/tmp/muse-provenance-assay').read_text()),dest/'private-assay');shutil.copy2('/tmp/prepare-muse-provenance.py',dest/'prepare.py');shutil.copy2('/tmp/promote-muse-provenance.py',dest/'promote.py')
 else:
  for name in ['muse-presentation-assay','muse-presentation-assay-corrected','muse-presentation-assay-http']:
   shutil.copytree(Path('/tmp')/name,dest/name)
  for prior in ['muse-presentation-generation-y7o6698h','muse-presentation-generation-ataah4b0']:shutil.copytree(Path('/tmp')/prior,dest/prior)
  shutil.copytree('/tmp/muse-presentation-assessment-g8t3z8fj',dest/'accepted-assessment')
shutil.copy2('/tmp/promote-muse-site.py',evidence/'promotion-method.py');shutil.copy2('/tmp/accept-muse-site.py',evidence/'boundary-assessment.py')
