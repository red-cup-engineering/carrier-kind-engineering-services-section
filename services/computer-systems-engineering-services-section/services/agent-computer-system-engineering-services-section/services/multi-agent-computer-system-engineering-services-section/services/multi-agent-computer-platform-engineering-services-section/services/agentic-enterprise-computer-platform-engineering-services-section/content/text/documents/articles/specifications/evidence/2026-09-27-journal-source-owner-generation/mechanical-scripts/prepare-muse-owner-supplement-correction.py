from pathlib import Path
import json
r=Path(Path('/tmp/muse-owner-run').read_text());old=r/'supplement';out=r/'supplement-corrected';out.mkdir(exist_ok=False)
t=(old/'assay.mjs').read_text();prefix=t[:t.index("await test('root replacement")];prefix=prefix.replace("canonicalJson(x).text+'\\n'","canonicalJson(x)+'\\n'")
names=['initialization directory-sync failure preserves host for identical retry','line capacity refuses before creating custody','batch capacity refuses before creating custody','aggregate source capacity refuses next publication without alteration']
blocks=[]
for name in names:
 start=t.index('await test('+repr(name));end=t.index('\n});',start)+4;blocks.append(t[start:end])
t=prefix+'\n'.join(blocks)+'\n'+t[t.index("process.stdout.write(JSON.stringify({kind:"):]
t=t.replace("canonicalJson(config()).text+'\\n'","canonicalJson(config())+'\\n'")
t=t.replace("const entry=artifact('line-bound');", "const entry=artifact('line-bound');assert(lineBytes(entry)>100);const positive=provision({maxLineBytes:lineBytes(entry)});assert.equal(openSourceOwner(positive).withOperation(s=>s.publishRetained([entry])).disposition,'created');")
t=t.replace("n=Math.max(...entries.map(lineBytes));const r=", "n=Math.max(...entries.map(lineBytes));assert(n>100);const positive=provision({maxLineBytes:n,maxBatchBytes:n});assert.equal(openSourceOwner(positive).withOperation(s=>s.publishRetained([entries[0]])).disposition,'created');const r=")
t=t.replace("n=lineBytes(one);const r=", "n=lineBytes(one);assert(n>1000);const r=")
(out/'assay.mjs').write_text(t)
p=json.loads((old/'profile.json').read_text());assert p[-3:]==['--ro-bind',str(old),'/supplement'];p[-2]=str(out);(out/'profile.json').write_text(json.dumps(p,indent=2)+'\n')
(out/'plan.md').write_text('''# Supplement fixture correction, frozen product\n\nThe original post-generation supplement recorded 18/20 passing observations. Four observations are not acceptance evidence: initialization comparison, line capacity, batch capacity, and aggregate source capacity. They used canonicalJson(value).text even though the existing shared API returns a string. The invalid byte helper measured the literal undefined plus LF, causing misleading passing line/batch refusals and preventing initial aggregate publication; the initialization assertion compared against that same literal.\n\nCorrect only the fixture API call by removing .text at those two uses, add independent positive single-entry controls and byte-length sanity assertions, and execute only those four affected checks against exactly the unchanged candidate. Preserve the original failing and misleading results. This is assessment-tool correction, not product behavioral repair or source-provider feedback. No generation is invoked. Original pre-generation fixtures remain untouched.\n\nCommit corrected fixtures and execution profile before execution. The live checkout package drift remains excluded by its immutable staged mount and recorded explicitly. No total is represented as a new blind pre-generation result.\n''')
runner=Path('/tmp/receive-muse-owner-supplement.py').read_text().replace("s=r/'supplement'","s=r/'supplement-corrected'")
Path('/tmp/receive-muse-owner-supplement-corrected.py').write_text(runner)
