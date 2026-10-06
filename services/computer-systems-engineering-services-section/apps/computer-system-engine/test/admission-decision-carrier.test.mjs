import assert from 'node:assert/strict';
import {dispatch} from '../src/rpc/dispatch.mjs';
const invocation={id:'invocation:fixture',operation:'operation:fixture',verb:'fixture',subject:'fixture-hand',resource:'resource:fixture',input:{},arguments:{}};
const decision=Object.freeze({invocation:invocation.id,operation:invocation.operation,subject:invocation.subject,ok:true,reading:'held',evidence:['admitted-by:office:fixture'],decidedAt:'2026-10-06T00:00:00.000Z'});
const records=[];let context;
const operation={ref:invocation.operation,verb:invocation.verb,effects:{coordination:'coordination-free',replay:'safe'},execute:async (_input,_args,received)=>{context=received;return {receivedIssuer:received.decision.evidence[0]}}};
const runtime={now:()=>decision.decidedAt,catalog:{byReference:new Map([[operation.ref,operation]])},authorize:()=>decision,witness:{admit:record=>{records.push(record);return {id:`evidence:${records.length}`,eventIds:[]}},causalHead:()=>[]}};
const receipt=await dispatch(runtime,invocation);assert.equal(context.decision,decision);assert.equal(records.find(r=>r.kind==='metroplat.rpc.decision').decision,context.decision);assert.equal(receipt.ok,true);assert.equal(receipt.value.receivedIssuer,'admitted-by:office:fixture');
context=undefined;runtime.authorize=()=>({...decision,ok:false,reading:'denied',reasons:['withdrawn']});const denied=await dispatch(runtime,invocation);assert.equal(context,undefined);assert.equal(denied.ok,false);

