import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {requestJsonRpc} from '@red-cup-engineering/json-rpc-transport-service';
const server=createServer(async(req,res)=>{let body='';for await(const bytes of req)body+=bytes;const call=JSON.parse(body);assert.equal(call.method,'fixture.read');res.setHeader('content-type','application/json');res.end(JSON.stringify(req.url==='/refuse'?{jsonrpc:'2.0',id:call.id,error:{code:-32000,message:'refused'}}:{jsonrpc:'2.0',id:call.id,result:'retained knowledge'}));});
server.listen(0,'localhost');await once(server,'listening');const url='http://localhost:'+server.address().port;
try{assert.equal(await requestJsonRpc(url,'fixture.read',[]),'retained knowledge');await assert.rejects(()=>requestJsonRpc(url,'fixture.read',[],{maxBytes:8}),/exceeded/);await assert.rejects(()=>requestJsonRpc(url+'/refuse','fixture.read',[]),/RPC error/);console.log('Independent npm consumer demonstrated actual HTTP retrieval, byte-limit refusal and RPC error refusal.');}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
