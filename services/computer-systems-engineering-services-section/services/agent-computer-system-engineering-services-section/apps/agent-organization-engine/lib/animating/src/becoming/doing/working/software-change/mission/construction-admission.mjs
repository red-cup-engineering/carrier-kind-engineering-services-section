/**
 * AOE Engineering preconstruction control. This is one operation of the
 * existing software-development work circuit, not another scheduler, office,
 * status database or Markdown approval. Native SignCraft history provides the
 * immutable products; a distinct authorized office must receive the review
 * through the host-owned review port before any fabrication operation begins.
 */
import { semanticId } from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';
import { engineeringArtifactSchema } from '../carriers.mjs';

const ROLES=Object.freeze([...engineeringArtifactSchema.properties.role.enum]);
const CHECKS=Object.freeze([
 'science-and-stakeholder-requirements',
 'architecture-and-ownership',
 'producer-consumer-contracts',
 'invariants-and-resource-bounds',
 'verification-and-recovery-design',
 'independent-receiving-conditions',
]);
const ni=value=>typeof value==='string'&&/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(value);
const own=(value)=>value!==null&&typeof value==='object'&&!Array.isArray(value);

/**
 * Compile the exact SignCraft product chain to a review request. This
 * qualifies structure, not scientific or semantic correctness. Unknown design
 * obligations prevent *construction*, rather than becoming a build failure.
 */
export function constructionReviewRequest(design,products) {
 if(design?.type!=='StandardsDrivenEngineeringDesign'||!ni(design.question)||!ni(design.source?.id)
   ||!Array.isArray(design.stages)||design.stages.length!==ROLES.length||!Array.isArray(products))
  throw new TypeError('complete source-owned Engineering design required before construction');
 const held=new Map();
 for(const product of products){
  if(!ni(product?.id)||!own(product.value)||typeof product.kind!=='string'
    ||semanticId({kind:product.kind,value:product.value})!==product.id)
   throw new TypeError('invalid source-owned engineering product identity');
  if(held.has(product.id)&&JSON.stringify(held.get(product.id))!==JSON.stringify(product))
   throw new TypeError('conflicting testimony under one engineering product identity');
  held.set(product.id,product);
 }
 const need=held.get(design.question);
 if(need?.kind!=='software-development.need'||need.value.source?.id!==design.source.id)
  throw new TypeError('engineering design does not descend from its immutable requirement and source');
 const stages=[],seen=new Set([design.question]);
 let predecessor=design.question;
 for(let i=0;i<ROLES.length;i++){
  const stage=design.stages[i],role=ROLES[i],product=held.get(stage?.artifactId),value=product?.value;
  if(stage?.role!==role||product?.kind!=='software-development.artifact'||seen.has(product.id)
    ||value?.role!==role||value.text!==stage.artifact
    ||JSON.stringify(value.basis)!==JSON.stringify([design.question,predecessor])
    ||!Array.isArray(value.inputs)||!value.inputs.includes(predecessor)
    ||!Array.isArray(value.unresolved)||!Array.isArray(stage.unresolved)
    ||JSON.stringify(stage.unresolved)!==JSON.stringify(value.unresolved)
    ||value.admission!=='machine-grounded-contribution')
   throw new TypeError('engineering design has an invalid '+role+' predecessor or typed contract');
  if(value.unresolved.length)throw new TypeError(role+' has unsettled requirements; qualify a revised design, not a build');
  if(value.derivation?.kind==='inference-delivery'
     &&!value.readings?.some(reading=>reading.kind==='product-view'
       &&reading.id===predecessor&&Number.isInteger(reading.length)&&reading.length>0))
   throw new TypeError('inference contribution did not receive its predecessor: '+role);
  stages.push(Object.freeze({role,artifact:product.id}));
  seen.add(product.id);predecessor=product.id;
 }
 const core={kind:'software-development.construction-review-request',version:1,
  question:design.question,source:design.source.id,stages,checks:[...CHECKS]};
 return Object.freeze({...core,id:semanticId(core)});
}

/**
 * Validate a trusted *host-supplied* review. Its authority and reviewer
 * qualification are proved by the host's existing office/agency boundary,
 * never by strings supplied by a development request or inference output.
 */
export function admitConstructionReview(request,review,{producerActor}={}) {
 if(!ni(request?.id)||semanticId(Object.fromEntries(Object.entries(request)
  .filter(([key])=>key!=='id')))!==request.id)
  throw new TypeError('construction review request identity differs from held source');
 if(!own(review)||review.kind!=='software-development.construction-review'
   ||review.request!==request.id||review.decision!=='admitted'
   ||typeof producerActor!=='string'||!producerActor.trim()
   ||typeof review.actor!=='string'||!review.actor.trim()||review.actor===producerActor
   ||typeof review.office!=='string'||!review.office.trim()
   ||!Array.isArray(review.evidence)||review.evidence.length!==CHECKS.length)
  throw new TypeError('independent, host-authorized Engineering review required');
 const received=new Map();
 for(const item of review.evidence){
  if(!own(item)||Object.keys(item).sort().join(',')!=='check,source'
    ||!CHECKS.includes(item.check)||!ni(item.source)||received.has(item.check))
   throw new TypeError('review lacks a unique source-identified verification obligation');
  received.set(item.check,item.source);
 }
 if(CHECKS.some(check=>!received.has(check)))throw new TypeError('review does not cover every admitted verification obligation');
 return Object.freeze({kind:review.kind,request:request.id,reviewer:review.actor,
  office:review.office,evidence:Object.freeze(CHECKS.map(check=>Object.freeze({check,source:received.get(check)})))});
}

export const CONSTRUCTION_ROLES=ROLES;
export const CONSTRUCTION_CHECKS=CHECKS;
