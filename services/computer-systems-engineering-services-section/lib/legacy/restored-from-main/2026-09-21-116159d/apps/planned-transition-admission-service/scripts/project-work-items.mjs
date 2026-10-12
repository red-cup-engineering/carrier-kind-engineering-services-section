#!/usr/bin/env node
import{readFileSync}from"node:fs";import{projectWorkItems}from"../src/work-items.mjs";export{projectWorkItems};if(import.meta.main){const i=JSON.parse(readFileSync(0,"utf8"));process.stdout.write(`${JSON.stringify(projectWorkItems(i.sources,i.params,i.options))}\n`);}
