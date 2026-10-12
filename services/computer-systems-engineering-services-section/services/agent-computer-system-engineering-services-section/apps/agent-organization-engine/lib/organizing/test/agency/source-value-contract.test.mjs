import assert from 'node:assert/strict';
import test from 'node:test';
import {schemaFrom} from '@red-cup-engineering/json-schema-services-section/contracts';
import {gitSourceWorkingCopyRequestSchema,gitSourceWorkingCopyBindingSchema,gitSourceClosureSchema,gitSourceResultSchema,readGitSourceWorkingCopyRequest} from '@red-cup-engineering/git-services-section/git-command-codec';
const request={sourceRepository:'https://github.com/fixture/source.git',ref:'refs/heads/main',commit:'a'.repeat(40)};
const copy={kind:'metroplat.git.source-working-copy',id:'fixture:legacy-copy',...request,repository:'/fixture/copy',commonDirectory:'/fixture/copy/.git',copyIdentity:{repository:{device:'1',inode:'2'},commonDirectory:{device:'1',inode:'3'}},custody:{id:'fixture:custody',revision:'1',evidence:['fixture:admission'],...request,workspaceRoot:'/fixture'}};
const requestContract=schemaFrom({$id:'fixture/source-request',...gitSourceWorkingCopyRequestSchema});
const bindingContract=schemaFrom({$id:'fixture/source-copy',...gitSourceWorkingCopyBindingSchema});
const closureContract=schemaFrom(gitSourceClosureSchema);
const closure=()=>({kind:'metroplat.git.source-closure',id:'fixture:closure',exactIdentity:'fixture:exact-bytes',copy,composed:[]});

test('legacy and raw-exact copy shapes share one contract without granting admission',()=>{
 assert.equal(bindingContract.validate(copy),true);
 assert.equal(bindingContract.validate({...copy,exactIdentity:'ni:///sha-256;fixture'}),true);
 assert.equal(bindingContract.validate({...copy,grant:'caller-assertion'}),false);
 assert.equal(bindingContract.validate({...copy,custody:{...copy.custody,credentialValue:'not-a-credential'}}),false);
});

test('genuine schemaFrom validates the recursive closure and rejects nested unknown fields',()=>{
 const nested={...closure(),composed:[{path:'nested',source:closure()}]};
 assert.equal(closureContract.validate(nested),true);
 assert.equal(closureContract.validate({...nested,composed:[{path:'nested',source:{...closure(),authority:'not-a-grant'}}]}),false);
 assert.equal(closureContract.validate({...closure(),exactIdentity:undefined}),false);
});

test('unknown request fields and invalid source commit/ref values fail both declared shape and runtime admission',()=>{
 assert.equal(requestContract.validate(request),true);
 for(const bad of [{...request,destination:'/caller/path'},{...request,commit:'HEAD'},{...request,ref:'main'},{...request,ref:'refs/heads/../escape'},{...request,ref:'refs/heads/name.lock'},{...request,ref:'refs/heads/a\nb'}]){
  assert.equal(requestContract.validate(bad),false,JSON.stringify(bad));assert.throws(()=>readGitSourceWorkingCopyRequest(bad));
 }
});

test('source-result shape retains bounded readback facts, never raw provider diagnostics',()=>{
 const contract=schemaFrom(gitSourceResultSchema),value={kind:'metroplat.git.source-result',id:'fixture:trace',exactIdentity:'fixture:raw',sourceBinding:'fixture:closure',phase:'named',entries:[{path:'',sourceRepository:request.sourceRepository,sourceBase:request.commit,commit:request.commit,branch:'codex/task',state:'unchanged'}]};
 assert.equal(contract.validate(value),true);
 assert.equal(contract.validate({...value,stderr:'raw transport output'}),false);
 assert.equal(contract.validate({...value,entries:[{...value.entries[0],credential:'untrusted'}]}),false);
});
