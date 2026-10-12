import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readEavtEntries} from 'file:///home/emsenn/info/lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/services/computer-content-engineering-services-section/services/computer-serialized-content-engineering-services-section/services/json-services-section/services/jsonl-services-section/services/eavt-services-section/scripts/read-eavt-entries.mjs';
const root=mkdtempSync(join(tmpdir(),'muse-legacy-read-'));
try {
 const path=join(root,'legacy.jsonl');
 const source='[1,2,3,"original-time"]\n{broken\n[1,2,3,"original-time"]\n';
 writeFileSync(path,source);
 const rows=readEavtEntries({path});
 const absent=readEavtEntries({path:join(root,'missing.jsonl')});
 console.log(JSON.stringify({fixtureOnly:true,physicalNonblankLines:3,recoveredRows:rows.length,malformedLineReported:false,missingPathResult:absent,duplicatesRetainedByReader:JSON.stringify(rows[0])===JSON.stringify(rows[1])}));
 if(rows.length!==2||absent.length!==0)process.exitCode=1;
} finally {rmSync(root,{recursive:true,force:true});}
