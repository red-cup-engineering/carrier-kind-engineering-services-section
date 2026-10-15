#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {executeSoftwareMission,sourceAuthorizedDevelopmentOperations} from '../src/becoming/doing/working/software-change/mission/development.mjs';
async function main(){
 const input=JSON.parse(readFileSync(0,'utf8'));
 if(input.receiver!==undefined&&input.execution?.receiver!==undefined)throw new TypeError('supply one receiver grant');
 if(input.source!==undefined){
  const operations=sourceAuthorizedDevelopmentOperations({dataRoot:input.execution?.dataRoot??input.missionExecutionDataRoot},
   {...input.execution,requirement:input.mission,source:input.source,...(input.receiver===undefined?{}:{receiver:input.receiver})});
  const request=input.request??{work:input.mission.work,revision:input.mission.revision,objective:input.mission.objective};
  const result=await operations.find(operation=>operation.verb==='aoe-develop-software').execute(request,[],{invocation:{subject:input.source.principal}});
  process.stdout.write(JSON.stringify(result)+'\n');
  if(result.status!=='submitted'&&result.outcome?.answered!==true)process.exitCode=1;
  return;
 }
 const result=await executeSoftwareMission(input.mission,{...input.execution,
  dataRoot:input.execution?.dataRoot??input.missionExecutionDataRoot,
  ...(input.receiver===undefined?{}:{receiver:input.receiver})});
 process.stdout.write(JSON.stringify(result)+'\n');
 if(result.outcome?.verified!==true&&result.outcome?.answered!==true)process.exitCode=1;
}
main().catch(error=>{process.stderr.write(String(error?.message??error)+'\n');process.exitCode=1;});
