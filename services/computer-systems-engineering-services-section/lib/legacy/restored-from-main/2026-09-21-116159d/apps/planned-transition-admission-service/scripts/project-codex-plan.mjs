#!/usr/bin/env node
import{readFileSync}from"node:fs";import{projectCodexPlan}from"../src/codex-plan.mjs";export{projectCodexPlan};if(import.meta.main){const i=JSON.parse(readFileSync(0,"utf8"));process.stdout.write(`${JSON.stringify(projectCodexPlan(i.sources,i.params,i.options))}\n`);}
