import test from 'node:test';
import assert from 'node:assert/strict';
import {semanticId} from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';
import {constructionReviewRequest,admitConstructionReview,CONSTRUCTION_CHECKS,CONSTRUCTION_ROLES}
 from '../../../src/becoming/doing/working/software-change/mission/construction-admission.mjs';

const stamp=(kind,value)=>({kind,value,id:semanticId({kind,value})});
function fixture(){
 const source=stamp('software-development.source',{path:'src/example.mjs',content:'ni:///sha-256;'+'A'.repeat(43)});
 const need=stamp('software-development.need',{source});
 let preceding=need.id;
 const products=[need],stages=[];
 for(const role of CONSTRUCTION_ROLES){
  const value={role,text:'Qualified '+role,inputs:[need.id,preceding],basis:[need.id,preceding],
   unresolved:[],admission:'machine-grounded-contribution',derivation:{kind:'supplied-contribution'}};
  const artifact=stamp('software-development.artifact',value);
  products.push(artifact);
  stages.push({role,artifact:value.text,artifactId:artifact.id,unresolved:[]});
  preceding=artifact.id;
 }
 return {design:{type:'StandardsDrivenEngineeringDesign',question:need.id,source,stages},
  products};
}
const review=request=>({kind:'software-development.construction-review',request:request.id,
 actor:'actor:reviewer',office:'engineering#qualified-architecture-review',
 decision:'admitted',evidence:request.checks.map(check=>({check,source:request.stages.at(-1).artifact}))});

test('all seven immutable stages and every contract yield one source-bound office review request',()=>{
 const f=fixture(),request=constructionReviewRequest(f.design,f.products);
 assert.deepEqual(request.stages.map(stage=>stage.role),CONSTRUCTION_ROLES);
 assert.deepEqual(request.checks,CONSTRUCTION_CHECKS);
 assert.equal(request.question,f.design.question);
 assert.deepEqual(constructionReviewRequest(f.design,f.products),request);
 const received=admitConstructionReview(request,review(request),{producerActor:'actor:author'});
 assert.equal(received.office,'engineering#qualified-architecture-review');
 assert.equal(received.evidence.length,6);
});
test('reordering, missing, contradicted and unsettled designs cannot reach construction',()=>{
 const f=fixture();
 const changed=[
  {...f.design,stages:f.design.stages.slice(1)},
  {...f.design,stages:[...f.design.stages].reverse()},
  {...f.design,source:{id:semanticId({alien:true})}},
 ];
 for(const input of changed)assert.throws(()=>constructionReviewRequest(input,f.products));
 const missing=f.products.filter(p=>p.id!==f.design.stages[2].artifactId);
 assert.throws(()=>constructionReviewRequest(f.design,missing),/invalid/);
 const changedRole=structuredClone(f.products);
 const stage=changedRole.find(p=>p.kind==='software-development.artifact'&&p.value.role==='high-level-design');
 stage.value.unresolved=['unproven state migration'];
 stage.id=semanticId({kind:stage.kind,value:stage.value});
 const replaced=structuredClone(f.design);const target=replaced.stages.find(s=>s.role==='high-level-design');
 target.unresolved=['unproven state migration'];target.artifactId=stage.id;
 assert.throws(()=>constructionReviewRequest(replaced,changedRole),/unsettled/);
});
test('inferred evidence must demonstrate reading its predecessor',()=>{
 const f=fixture(),product=f.products[1];product.value.derivation={kind:'inference-delivery'};
 product.id=semanticId({kind:product.kind,value:product.value});
 f.design.stages[0].artifactId=product.id;
 assert.throws(()=>constructionReviewRequest(f.design,f.products),/did not receive/);
});
test('a fake or incomplete reviewer does not authorize fabrication',()=>{
 const f=fixture(),request=constructionReviewRequest(f.design,f.products),good=review(request);
 assert.throws(()=>admitConstructionReview(request,good,{producerActor:'actor:reviewer'}),/independent/);
 assert.throws(()=>admitConstructionReview(request,good,{}),/independent/);
 assert.throws(()=>admitConstructionReview(request,{...good,request:'ni:///sha-256;'+'A'.repeat(43)},{producerActor:'actor:author'}),/source-bound/);
 assert.throws(()=>admitConstructionReview(request,{...good,evidence:good.evidence.slice(1)},{producerActor:'actor:author'}),/review/);
 assert.throws(()=>admitConstructionReview(request,{...good,evidence:[...good.evidence.slice(1),good.evidence[1]]},{producerActor:'actor:author'}),/unique/);
});
test('source-bound review carries no execution authority of its own',()=>{
 const f=fixture(),request=constructionReviewRequest(f.design,f.products);
 assert.equal(Object.hasOwn(request,'permission'),false);
 assert.equal(Object.hasOwn(request,'execution'),false);
 assert.equal(Object.hasOwn(request,'runner'),false);
});
