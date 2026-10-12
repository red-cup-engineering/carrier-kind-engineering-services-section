import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
const d=JSON.parse(fs.readFileSync('/tmp/muse-blocking-dependencies.json','utf8'));
const system=fs.readFileSync('/tmp/muse-system-path','utf8').trim();
const req=createRequire(path.join(system,'package.json'));
const bare=['@red-cup-engineering/json-services-section','@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/identity','@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/journal/event','@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/journal/substrate','@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/journal/witness','@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/journal/judgment','@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/journal/causal-graph','@red-cup-engineering/computer-code-engineering-services-section/semiotic-eavt/journal/store-root'];
d.bareResolutions=Object.fromEntries(bare.map(x=>[x,pathToFileURL(req.resolve(x)).href]));
d.system=system;d.jsonEntry=req.resolve(bare[0]);d.senEntry=req.resolve('@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation');
const inputs=[...Object.values(d.bareResolutions).map(fileURLToPath),path.join(system,'src/filesystem.mjs'),path.join(system,'src/journal/filesystem/operations/index.mjs'),d.senEntry];
const queue=[...inputs];const seen=new Set();const files=new Set(d.files);
while(queue.length){const p=queue.pop();if(seen.has(p))continue;seen.add(p);files.add(p);if(!/\.[cm]?[jt]s$/.test(p))continue;const t=fs.readFileSync(p,'utf8');const r=createRequire(p);const re=/^(?:import\s+(?:[^;]*?\sfrom\s+)?|export\s+(?:\*|\{[^}]*\})\s*(?:as\s+\w+\s*)?from\s*)["']([^"'\n]+)["']/gm;for(const m of t.matchAll(re)){const spec=m[1];if(spec.startsWith('node:'))continue;let resolved;try{resolved=r.resolve(spec);}catch(e){throw new Error(p+' => '+spec+': '+e.message);}if(!resolved.startsWith('/'))continue;d.resolutions[pathToFileURL(p).href+'\n'+spec]=pathToFileURL(resolved).href;queue.push(resolved);}}
d.files=[...files].sort();d.publicInputs=[...new Set(inputs)];
fs.writeFileSync('/tmp/muse-owner-dependencies.json',JSON.stringify(d,null,2)+'\n');
console.log(JSON.stringify({files:d.files.length,publicInputs:d.publicInputs.length,resolutions:Object.keys(d.resolutions).length}));
