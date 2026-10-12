import assert from 'node:assert/strict';
import test from 'node:test';
import {canonical} from '@red-cup-engineering/json-services-section';
import {senProjector} from '@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/projector';
import {regimeDecidable} from '@red-cup-engineering/computer-data-engineering-services-section/closure-regime';
import {define,readIsDecidable} from '@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification';
import {senCodec,jsonCodec,stringCodec,formCodec,eavtCodec,wireOf,wireCodec,wireByMediaType,WIRE_CODEC_NAMES} from '@red-cup-engineering/computer-system-engine/wire';
import {wireCodec as tupleWireCodec} from '@red-cup-engineering/computer-system-engine/wire-eavt-tuple';
import {operation,createOperationCatalog} from '@red-cup-engineering/computer-system-engine/rpc/operation';
import {dispatchWire} from '@red-cup-engineering/computer-system-engine/rpc/wire-dispatch';
import {authorizationFromStanding} from '@red-cup-engineering/computer-system-engine/rpc/dispatch';
import {artifactId} from '@red-cup-engineering/semiotic-eavt-services-section/identity';
const redex=['app',['lam',['var',0]],['mark','fixture']];
const terms=[['star'],['mark','fixture'],['mark','é\nquoted"'],['pair',['mark','left'],['star']],redex,['fst',['pair',['mark','left'],['star']]]];
const invalid=['{','{"not":"a term"}','null','[]','["var",0]','["mark"]','["app",["mark","a"],["mark","b"]]'];
test('actual wire registry imports with complete vocabulary',()=>{
 assert.deepEqual(WIRE_CODEC_NAMES,['eavt','form','json','mermaid','plantuml','sen','string','svg','xmi']);
 assert.equal(wireCodec('sen'),senCodec);assert.equal(tupleWireCodec('sen'),senCodec);assert.equal(wireByMediaType('application/sen+json; charset=utf-8'),senCodec);
 assert.equal(senCodec.name,'sen');assert.equal(senCodec.corner,'assertion');assert.equal(senCodec.rung,'strict');assert.equal(senCodec.mediaType,'application/sen+json; charset=utf-8');
});
test('SEN parser projector and wire retain canonical exact unreduced valid syntax',()=>{
 for(const term of terms){const source=JSON.stringify(term,null,2),document=canonical(term)+'\n',resource={path:'fixture.sen',content:source};
 assert.equal(senProjector.recognize(resource),true);assert.deepEqual(senProjector.read(resource),[term]);assert.deepEqual(senCodec.decode(source),term);
 assert.equal(senCodec.encode(term),document);assert.equal(senProjector.write([term]),document);assert.deepEqual(senCodec.decode(senCodec.encode(term)),term);}
 assert.deepEqual(senCodec.decode(JSON.stringify(redex)),redex);assert.equal(senProjector.write([]),'');
});
test('actual SEN reads and writes refuse plain JSON, open and ill-typed syntax',()=>{
 for(const source of invalid){const resource={path:'fixture',content:source};assert.equal(senProjector.recognize(resource),false);assert.throws(()=>senProjector.read(resource));assert.throws(()=>senCodec.decode(source));if(source!=='{')assert.throws(()=>senCodec.encode(JSON.parse(source)));}
 const cyclic=['pair',['star'],null];cyclic[2]=cyclic;assert.throws(()=>senCodec.encode(cyclic));
});
test('wire admission still follows supplier regime law with no Scott exception',()=>{
 if(process.env.STRICT_DATA_FIXTURE==='1')assert.equal(regimeDecidable('scott'),false);
 for(const rung of ['strict','scott','transfinite-bounded','aperiodic']){const projector=define({type:'fixture',rung,read:()=>[['star']],recognize:()=>true});assert.equal(readIsDecidable(projector),regimeDecidable(rung));if(regimeDecidable(rung))assert.deepEqual(wireOf(projector).decode(''),['star']);else assert.throws(()=>wireOf(projector,{decode:()=>['star']}),/not decidable/);}
});
test('unrelated JSON/string/form and record versus tuple EAVT retain valid bytes',()=>{
 const data={z:1,a:'plain'};assert.equal(jsonCodec.encode(data),'{"a":"plain","z":1}\n');assert.deepEqual(jsonCodec.decode('{"not":"a term"}'),{not:'a term'});
 assert.equal(stringCodec.decode('opaque'),'opaque');assert.equal(stringCodec.encode(data),'{"a":"plain","z":1}');
 assert.deepEqual(formCodec.decode('a=one&a=two&z=3'),{a:'two',z:'3'});assert.equal(formCodec.encode({a:'two',z:'3'}),'a=two&z=3\n');
 const row=['entity','attribute','value','time'],source=JSON.stringify(row)+'\n';assert.deepEqual(eavtCodec.decode(source),[{e:'entity',a:'attribute',v:'value',t:'time'}]);assert.deepEqual(tupleWireCodec('eavt').decode(source),[row]);
});
function rpc(run){const records=[];let calls=0,authorizations=0;const op=operation({verb:'syntax-fixture',inputFormat:'sen',outputFormat:'sen',run:(...args)=>{calls++;return run(...args);}});const authorize=authorizationFromStanding(new Map([[op.ref,'held']]));
 return{records,counters:()=>({calls,authorizations}),invoke:source=>dispatchWire(createOperationCatalog([op]),[op.verb],source,{subject:'fixture:reader',now:()=> '2026-10-12T00:00:00Z',witness:{admit(value){records.push(value);const id=artifactId(value);return{id,eventIds:[id]};},causalHead:()=>records.map(artifactId)}},(...args)=>{authorizations++;return authorize(...args);})};}
test('actual RPC wire dispatcher carries admitted syntax without evaluating it',async()=>{const f=rpc(input=>input),result=await f.invoke(JSON.stringify(redex));assert.equal(result.code,0,result.stderr);assert.equal(result.stdout,canonical(redex)+'\n');assert.deepEqual(f.counters(),{calls:1,authorizations:1});assert.deepEqual(f.records,[],'unchanged successful derivation needs no event witness');});
test('actual RPC rejects invalid SEN before invocation, authority, handler or witnesses',async()=>{
 for(const source of invalid){const f=rpc(input=>input),result=await f.invoke(source);assert.equal(result.code,1);assert.equal(result.receipt,undefined);assert.equal(result.stdout,'');assert.match(result.stderr,/input could not be decoded/);assert.deepEqual(f.counters(),{calls:0,authorizations:0});assert.deepEqual(f.records,[]);}
});
test('actual RPC selected SEN output refuses plain data; this does not promise rollback',async()=>{const f=rpc(()=>({plain:true})),result=await f.invoke('["star"]');assert.equal(result.code,1);assert.equal(result.stdout,'');assert.match(result.stderr,/not a well-typed closed term/);assert.equal(f.counters().calls,1);});
