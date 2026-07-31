/** Test-only resolver for the already-installed workspace codec; production uses package exports. */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

let root = dirname(fileURLToPath(import.meta.url));
while (!existsSync(join(root, "AGENTS.md")) && dirname(root) !== root) root = dirname(root);
const codec = pathToFileURL(join(root, "node_modules/.pnpm/node_modules/@red-cup-engineering/json-file-codec-service/dist/json/index.mjs")).href;
const projection = `data:text/javascript,${encodeURIComponent('export const define=(x)=>({...x,parent:null});export const restrict=(p,x)=>({...x,parent:p,recognize:(r)=>p.recognize(r)&&(x.recognize?x.recognize(r):true),read:x.read??p.read,write:x.write??p.write,corner:x.corner??p.corner,rung:x.rung??p.rung});')}`;
const integrity = `data:text/javascript,${encodeURIComponent('import{createHash}from"node:crypto";export const sha256Hex=(v)=>createHash("sha256").update(v,"utf8").digest("hex");')}`;
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@red-cup-engineering/json-file-codec-service") return { url: codec, shortCircuit: true };
  if (specifier === "@red-cup-engineering/file-projection-kernel-service") return { url: projection, shortCircuit: true };
  if (specifier === "@red-cup-engineering/file-cryptographic-integrity-service") return { url: integrity, shortCircuit: true };
  return nextResolve(specifier, context);
}
