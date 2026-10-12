import fs from 'node:fs';
const {resolutions,bareResolutions}=JSON.parse(fs.readFileSync('/assays/dependencies.json','utf8'));
export async function resolve(specifier,context,nextResolve){const found=resolutions[context.parentURL+'\n'+specifier]??bareResolutions[specifier];return found?{url:found,shortCircuit:true}:nextResolve(specifier,context);}
