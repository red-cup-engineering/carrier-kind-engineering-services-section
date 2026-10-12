import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath,pathToFileURL } from 'node:url';
const code=path.resolve(path.dirname(fs.readFileSync('/tmp/muse-segment-path','utf8')),'../../../..');
const entry=path.join(code,'src/semiotic-eavt/journal/packet.mjs');
const files=new Set(), resolutions={};
function scan(file) {
 file=fs.realpathSync(file); if(files.has(file))return;files.add(file);
 if(!/\.(?:mjs|js|cjs)$/.test(file))return;
 const text=fs.readFileSync(file,'utf8');const require=createRequire(file);
 const specs=new Set([...text.matchAll(/(?:\b(?:import|export)\s+(?:[^;]*?\s+from\s*)?|\bimport\s*\()\s*["']([^"']+)["']/g)].map(x=>x[1]));
 for(const spec of specs) {
  if(spec.startsWith('node:'))continue;
  let resolved;
  try{resolved=require.resolve(spec)}catch(e){throw new Error(file+' -> '+spec+': '+e.message)}
  if(!path.isAbsolute(resolved))continue;
  resolved=fs.realpathSync(resolved);
  resolutions[pathToFileURL(file).href+'\n'+spec]=pathToFileURL(resolved).href;
  scan(resolved);
 }
}
scan(path.join(code,'src/semiotic-eavt/identity/index.mjs'));
const r=createRequire(entry);
for(const spec of ['@red-cup-engineering/json-services-section','@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity']){
 const f=fs.realpathSync(r.resolve(spec));resolutions[pathToFileURL(entry).href+'\n'+spec]=pathToFileURL(f).href;scan(f);
}
fs.writeFileSync('/tmp/muse-packet-dependencies.json',JSON.stringify({entry,code,files:[...files].sort(),resolutions},null,2));
console.log(JSON.stringify({files:files.size,bytes:[...files].reduce((n,f)=>n+fs.statSync(f).size,0),entry}));
