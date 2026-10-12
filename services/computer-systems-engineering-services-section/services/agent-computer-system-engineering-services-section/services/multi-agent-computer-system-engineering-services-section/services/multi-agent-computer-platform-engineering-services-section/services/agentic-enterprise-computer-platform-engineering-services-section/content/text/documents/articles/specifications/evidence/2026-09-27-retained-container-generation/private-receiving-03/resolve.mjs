import fs from 'node:fs';
const {resolutions}=JSON.parse(fs.readFileSync('/assays/dependencies.json','utf8'));
export async function resolve(specifier,context,nextResolve){const found=resolutions[context.parentURL+'\n'+specifier];return found?{url:found,shortCircuit:true}:nextResolve(specifier,context);}
