import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openMetroplatMcp} from '../src/mcp-host.mjs';
import {defaultFilesystemBinding} from '@red-cup-engineering/computer-system-engine/rpc/binding';

test('native MCP construction executes source methods against the owning bound resource and refuses a different configured data root',async()=>{
 const root=mkdtempSync(join(tmpdir(),'native-source-owner-'));
 try{
  const data=join(root,'data'),source=join(root,'source');mkdirSync(data);mkdirSync(source);writeFileSync(join(source,'value.mjs'),'source content');
  let received;
  const resource={read:async(verb,input,context)=>{received={verb,input,context};return {kind:'workspace.read:obstruction',reason:'source-admission-stale'};}};
  const resolver=subject=>'bound:'+subject;
  const binding=defaultFilesystemBinding(data,{repositoryRoot:source,packageRoot:source,sourceReadResource:resource,resolveActorSubject:resolver});
  await assert.rejects(openMetroplatMcp({dataRoot:join(root,'different'),binding,environment:{}}),/exact configured data root/);
  const host=await openMetroplatMcp({dataRoot:data,binding,environment:{METROPLAT_DATA_ROOT:data,METROPLAT_REPOSITORY_ROOT:source}});
  const surface=await host.operationSurface();
  const operation=surface.operations.find(op=>op.verb==='workspace-file-slice');assert(operation,'the source operation is installed');
  const result=await operation.execute({scope:'repository',path:'value.mjs'},{},{invocation:{id:'native-test',subject:'actor:office'}});
  assert.equal(result.reason,'source-admission-stale');assert.equal(received.context.workspaceBinding,binding);assert.equal(received.context.workspaceBinding.resolveActorSubject,resolver);assert.equal(received.context.workspaceBinding.packageRoot,source);
 }finally{rmSync(root,{recursive:true,force:true});}
});
