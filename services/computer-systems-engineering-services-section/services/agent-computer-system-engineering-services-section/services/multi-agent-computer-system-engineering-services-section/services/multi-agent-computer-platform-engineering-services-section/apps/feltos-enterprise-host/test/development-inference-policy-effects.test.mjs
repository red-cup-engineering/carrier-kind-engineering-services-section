import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,readFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {runProgram,readDevelopmentProducts} from '../../../../../../../apps/agent-organization-engine/lib/animating/src/becoming/doing/working/software-change/mission/development.mjs';
const require=createRequire(new URL('../../../../../../../apps/agent-organization-engine/lib/animating/package.json',import.meta.url));
const {loadDirectEndpointProviderDescriptors}=await import(pathToFileURL(require.resolve('@red-cup-engineering/computer-inference-engine/dispatch/direct-endpoint-provider')));
const {executeOpenAiCompatibleToolAgent}=await import(pathToFileURL(require.resolve('@red-cup-engineering/computer-inference-engine/openai/tool-agent')));

test('host-owned inference policy permits the real native agent loop to consume more than six views while enforcing its request ceiling',async()=>{
 const root=mkdtempSync(join(tmpdir(),'development-policy-'));
 try{
  const text='Exact Unicode 😀 research windows.\n'.repeat(4000);writeFileSync(join(root,'theory.md'),text);
  const descriptor=loadDirectEndpointProviderDescriptors({API_KEY_OPENROUTER:'fixture-only'}).find(value=>value.provider==='urn:ame:openrouter-inference-team'&&value.zeroCashEligible&&value.capabilities.includes('tool-calling'));
  assert(descriptor,'the fixture uses the native zero-cash descriptor and admission');
  const bounds={maximumRequests:10,maximumToolCalls:10,maximumToolRounds:9,maximumOutputTokens:4096,maximumTokensPerRequest:256,maximumDepth:0};
  async function execute(label,workPlacement){
   let exchanges=0;
   const input={workType:'inquiry',objective:'Consume exact source views with '+label,territory:root,writablePaths:[],readablePaths:['theory.md'],authority:['receiver:policy']};
   const options={dataRoot:join(root,label),inferenceOptions:{environment:{},agentBounds:bounds,...(workPlacement?{workPlacement}:{}),directDescriptors:[descriptor],directTransport:async call=>{
    const context=JSON.parse(call.messages[1].content.split('Context:\n')[1].split('\n\n')[0]);
    let step=0;
    return executeOpenAiCompatibleToolAgent({...call,fetchImpl:async(url,init)=>{
     if(String(url)==='https://openrouter.ai/api/v1/key')return Response.json({data:{is_free_tier:true,usage:0}});
     if(String(url)==='https://openrouter.ai/api/v1/models')return Response.json({data:[{id:call.model,pricing:{prompt:'0',completion:'0',request:'0'}}]});
     exchanges++;const body=JSON.parse(init.body);let message;
     if(step<8){
      const name=step===0?'read_product':'read_source';
      const args=step===0?{id:context.prior.id,limit:16384}:{id:context.sources[0].id,offset:66000+(step-1)*8,limit:8};
      message={role:'assistant',content:null,tool_calls:[{id:'call-'+step,type:'function',function:{name,arguments:JSON.stringify(args)}}]};
     }else{
      const source=body.messages.filter(message=>message.role==='tool').map(message=>JSON.parse(message.content)).filter(value=>value.kind==='software-development.source-view');
      message={role:'assistant',content:JSON.stringify({role:'prior-art-synthesis',text:source.map(value=>value.value.text).join(''),unresolved:[]})};
     }
     step++;return new Response(JSON.stringify({model:call.model,choices:[{finish_reason:message.tool_calls?'tool_calls':'stop',message}],usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15}}),{status:200,headers:{'content-type':'application/json'}});
    }});
   }}};
   return {promise:runProgram(input,options),count:()=>exchanges};
  }
  const admitted=await execute('admitted');let result;try{result=await admitted.promise;}catch(error){
   const history=join(root,'admitted','software-development');const file=readdirSync(history).find(name=>name.endsWith('.json'));
   const delivery=readDevelopmentProducts(join(root,'admitted'),'ni:///sha-256;'+file.slice(0,-5)).findLast(product=>product.kind==='software-development.delivery').value.delivery;
   throw new Error(JSON.stringify({original:error.message,exchanges:admitted.count(),refusals:delivery.directLaneRefusals?.map(value=>({reason:value.reason,cause:value.cause})),outcome:delivery.outcome}));
  }
  assert.equal(result.status,'answered');assert.equal(admitted.count(),9);
  assert.equal(result.outcome.inquiryResult,Array.from(text).slice(66000,66056).join(''));
  const ceiling={resourceCeilings:[{resource:'requests',unit:'request',amount:{numerator:'3',denominator:'1'}}]};
  const limited=await execute('limited',ceiling);
  await assert.rejects(limited.promise,/no consumable engineering artifact/);
  assert.equal(limited.count(),3,'the native request ceiling stops further exchanges even under a larger round grant');
  assert.equal(readFileSync(join(root,'theory.md'),'utf8'),text);
 }finally{rmSync(root,{recursive:true,force:true});}
});

