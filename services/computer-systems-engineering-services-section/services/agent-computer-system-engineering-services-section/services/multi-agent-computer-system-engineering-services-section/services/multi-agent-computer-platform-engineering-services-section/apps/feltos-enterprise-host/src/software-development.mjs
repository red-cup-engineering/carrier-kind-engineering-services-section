import {prepareSourceDeliverySync} from '@red-cup-engineering/computer-code-development-engine/git/source-delivery';
import {realpathSync} from 'node:fs';
import {isAbsolute,resolve,sep} from 'node:path';
import {developmentOperations} from '@red-cup-engineering/animating/software-change/mission/development';
import {agencyAt,coordinatingOffice} from '@red-cup-engineering/metroplat/offices';
import {resolve as agencyRecord} from '@red-cup-engineering/organizing/agency';
import {schemaFrom} from '@red-cup-engineering/json-schema-services-section/contracts';
import {developmentReceivingSchema} from './development-contract.mjs';
const developmentReceivingType=schemaFrom(developmentReceivingSchema);

/** Requests name requirements; this host owns the territory, lanes and receiving conditions. */
function developmentAuthority({binding,config,workBinding=binding}) {
 const scoped=Object.freeze({...binding,agencyRoot:config.agencyRoot,repositoryRoot:config.repositoryRoot});
 const requirementAt=reference=>{
  if(typeof reference!=='string'||!reference.trim())throw new TypeError('development requires an authored requirement reference');
  const agency=agencyAt(config.agencyRoot),record=agencyRecord(agency,'requirements',reference);
  if(!record)throw new TypeError('development requirement is absent or ambiguous');
  const contract=developmentReceivingType.assert(record.authored.asks?.development,'development receiving contract');
  return {record,contract};
 };
 const authorize=(record,contract,subject,verb)=>{
  const current=requirementAt(record.key);
  if(current.record.revision!==record.revision)throw new TypeError('development requirement changed before the effect');
  const office=coordinatingOffice(scoped,subject,contract.office,verb,workBinding);
  if(office.allocation!==undefined&&office.scope!==contract.scope)throw new TypeError('development allocation does not cover this requirement scope');
  return office;
 };
 return {scoped,requirementAt,authorize};
}

/** An actuator asks the operative requirement for its request; findings grant no effect rights. */
export function hostedDevelopmentRequestAt(options) {
 const {requirementAt,authorize}=developmentAuthority(options);
 const requestAt=(reference,subject)=>{
  const {record,contract}=requirementAt(reference);
  const admit=()=>authorize(record,contract,subject,'aoe-develop-software');
  admit();
  return Object.freeze({request:Object.freeze({work:record.key,objective:contract.objective,revision:record.revision}),admit});
 };
 requestAt.pending=subject=>{
  const offered=[];
  for(const record of agencyAt(options.config.agencyRoot).requirements.values()){
   if(record.authored.asks?.development===undefined)continue;
   const {contract}=requirementAt(record.key);
   try{authorize(record,contract,subject,'aoe-develop-software');}catch{continue;}
   offered.push(record.key);
  }
  return Object.freeze(offered);
 };
 return requestAt;
}

export function hostedDevelopmentOperations({binding,config,compute={}}) {
 const {scoped,requirementAt,authorize}=developmentAuthority({binding,config});
 return developmentOperations(scoped,{softwareDevelopment:{
  ...compute,
  receiveDemand:async({request,subject})=>{
   const {record,contract}=requirementAt(request.work);
   if(request.revision!==undefined&&request.revision!==record.revision)throw new TypeError('development request names a superseded requirement');
   if(request.objective!==contract.objective)throw new TypeError('development objective differs from the authored requirement');
   if(request.workType!==undefined&&request.workType!==(contract.workType??'software-change'))throw new TypeError('development closure differs from its requirement');
   if(request.constraints!==undefined&&JSON.stringify(request.constraints)!==JSON.stringify(contract.constraints??[]))throw new TypeError('request constraints differ from the authored requirement');
   const office=authorize(record,contract,subject,'aoe-develop-software');
   if(isAbsolute(contract.territory)||contract.territory.split(/[\\/]/u).some(part=>part==='..'))throw new TypeError('development territory must lie in the host repository');
   const repository=realpathSync(config.repositoryRoot),territory=realpathSync(resolve(repository,contract.territory));
   if(territory!==repository&&!territory.startsWith(repository+sep))throw new TypeError('development territory crosses the host boundary');
   return {demand:{objective:contract.objective,territory,workType:contract.workType??'software-change',
    constraints:contract.constraints??[],writablePaths:contract.writablePaths,readablePaths:contract.readablePaths,
    verifyCommand:contract.verifyCommand,acceptanceCommand:contract.acceptanceCommand,
    ...(request.artifacts===undefined?{}:{artifacts:request.artifacts})},
    authority:[record.key,record.revision,office.officeKey],
    execution:{authorizeEffect:()=>authorize(record,contract,subject,'aoe-develop-software'),
     receiver:{root:territory,writablePaths:contract.writablePaths,verifyCommand:contract.verifyCommand,acceptanceCommand:contract.acceptanceCommand,
      ...(contract.workType==='inquiry'?{}:{prepareDelivery:({proposal,proposalId})=>prepareSourceDeliverySync({
       repository,territory,sourceBase:contract.sourceBase,baseRef:contract.sourceRef,proposal,proposalId})})}}};
  },
  receiveProduct:async({question,history,subject})=>{
   const needs=history.filter(product=>product.kind==='software-development.need'&&product.id===question);
   if(needs.length!==1)throw new TypeError('development product has no unique operative requirement');
   const [reference,revision]=needs[0].value.authority??[],{record,contract}=requirementAt(reference);
   if(record.revision!==revision)throw new TypeError('development product belongs to a superseded requirement');
   authorize(record,contract,subject,'aoe-development-product');
  },
 }});
}

