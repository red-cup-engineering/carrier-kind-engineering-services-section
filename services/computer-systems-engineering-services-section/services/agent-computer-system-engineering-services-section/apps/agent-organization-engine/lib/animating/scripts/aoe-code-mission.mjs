#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {executeSoftwareMission} from '../src/becoming/doing/working/software-change/mission/development.mjs';
async function main(){
 const input=JSON.parse(readFileSync(0,'utf8'));
 if(input.receiver!==undefined&&input.execution?.receiver!==undefined)throw new TypeError('supply one receiver grant');
 const result=await executeSoftwareMission(input.mission,{...input.execution,
  dataRoot:input.execution?.dataRoot??input.missionExecutionDataRoot,
  ...(input.receiver===undefined?{}:{receiver:input.receiver})});
 process.stdout.write(JSON.stringify(result)+'\n');
 if(result.outcome?.verified!==true&&result.outcome?.answered!==true)process.exitCode=1;
}
main().catch(error=>{process.stderr.write(String(error?.message??error)+'\n');process.exitCode=1;});
