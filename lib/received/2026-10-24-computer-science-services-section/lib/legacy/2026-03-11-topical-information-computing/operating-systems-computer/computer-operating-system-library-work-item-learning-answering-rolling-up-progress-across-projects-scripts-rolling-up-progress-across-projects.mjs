#!/usr/bin/env node
import { appendFileSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = process.cwd();
const WI_JSONL = resolve(REPO_ROOT, "library/object/library/thing/library/system/library/operating-system/library/computer-operating-system/library/work-item/work-item.jsonl");

const args = Object.fromEntries(process.argv.slice(2).map(a => a.match(/^--([a-z-]+)=(.*)$/)?.slice(1)).filter(Boolean));

const entity = args.target ? basename(args.target, ".md") : "anonymous";
appendFileSync(WI_JSONL, JSON.stringify({e:entity,a:"rolling-up-progress-across-projects",v:args,t:new Date().toISOString()}) + "\n");

console.log(JSON.stringify({status:"stub-invoked",transformer:"rolling-up-progress-across-projects",args,note:"Witness emitted; substantive logic not yet implemented."},null,2));
