import {createVerifiedContentReader} from '@red-cup-engineering/immutable-content-custody-service';
import {createFileContentCustody} from '@red-cup-engineering/immutable-content-custody-service/file-content';
import {sourceReadRequestSchema,sourceReadRequestType} from './source-read-contract.mjs';
import {fabricationRefusalType} from './fabrication-refusal.mjs';
import {admit} from '@red-cup-engineering/computer-data-engineering-services-section/type-system';
import {engineeringArtifactSchema,engineeringContributionSchema,developmentRequestSchema,developmentProductRequestSchema} from '../carriers.mjs';
/** Development consumes its products: design -> fabrication -> receiving -> consumer effects. */
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { githubApi } from '@red-cup-engineering/github-services-section';
import { mkdtempSync, rmSync, readFileSync, statSync, lstatSync, realpathSync, existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { resolve, relative, sep, join, dirname, isAbsolute } from 'node:path';
import { operation } from '@red-cup-engineering/computer-system-engine/rpc/operation';
import { schemaFrom } from '@red-cup-engineering/json-schema-services-section/contracts';
import { cell } from '@red-cup-engineering/signcell/cell';
import { createHistory, restoreHistory, observeHistory, materializeHistory } from '@red-cup-engineering/signcraft/history';
import { canonicalCarrier, semanticId } from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';
import { dispatchInferenceAsConfiguredCustomer, INFERENCE_WORK_CUSTOMER } from '@red-cup-engineering/computer-inference-engine/dispatch/inference-dispatch';
import { fabricationOperations } from '@red-cup-engineering/computer-code-development-engine/fabrication/operations';
import { captureSoftwareChangeSource, projectFabricatedSoftwareChanges, induceVerifiedSoftwareMissionProposal } from './agent-tools.mjs';
import { validateAcceptanceCapsule, materializeAcceptanceCapsule, loadAcceptanceCapsule } from './acceptance-capsule.mjs';

export const ACTOR = 'urn:aoe:software-mission';
export const DEVELOPMENT_STAGES = Object.freeze(engineeringArtifactSchema.properties.role.enum);
const LIMIT = 2 * 1024 * 1024;
const nonempty = (value, name) => {
 if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be nonempty text`);
 return value;
};
const schemaFor = role => ({...engineeringContributionSchema,$id:engineeringContributionSchema.$id+"/"+role,properties:{...engineeringContributionSchema.properties,role:{const:role}}});
const stamp = (kind, value) => canonicalCarrier({kind,value,id:semanticId({kind,value})});
function reviseFabrication(journal, source, specification, phase, cause, product) {
 const fingerprint=semanticId({source:source.id,phase,code:cause.code??cause.name??'INVALID_HANDOFF',product});
 const prior=journal.products().findLast(value=>value.kind==='software-development.fabrication-refusal'&&value.value.fingerprint===fingerprint);
 if(prior){const error=new Error('fabrication repeated a specification already refuted: '+prior.value.reason);error.developmentObligation=prior.id;throw error;}
 const value={source:source.id,specification,phase,fingerprint,
  reason:String(cause.message??cause.question??cause.evidence??cause),code:cause.code??cause.name??'INVALID_HANDOFF',product};
 const admitted=admit(fabricationRefusalType,value);
 if(!admitted.ok)throw new TypeError('native fabrication counterexample does not satisfy its generated contract');
 return journal.tell(stamp('software-development.fabrication-refusal',value),[specification]);
}


/** Correctness by Construction is a contract transition, never an automatic
 * model/build retry. Record the refuted design in the same SignCraft work
 * history, then return it to an independently authorized specification owner.
 * A subsequent request must carry a different admitted requirement/specification
 * identity. No fabricated candidate or acceptance command runs on this path. */
function requireDesignRevision(journal, source, specification, phase, cause, product) {
 const refusal=reviseFabrication(journal,source,specification,phase,cause,product);
 const error=new Error('fabrication contradicts the admitted design; independent specification revision required',{cause});
 error.code='AOE_DESIGN_REVISION_REQUIRED';
 error.developmentObligation=refusal.id;
 error.specification=specification;
 return error;
}

function admittedPath(root, requested) {
 nonempty(requested, 'source path');
 const absolute = resolve(root, requested);
 const local = relative(root, absolute);
 if (!local || local==='..' || local.startsWith('..'+sep) || isAbsolute(local)) throw new TypeError('source path escapes the territory');
 let inspected=root;
 for(const segment of local.split(sep)){
  inspected=resolve(inspected,segment);
  try{if(lstatSync(inspected).isSymbolicLink())throw new TypeError('source path contains an unadmitted link');}
  catch(error){if(error.code!=='ENOENT')throw error;}
 }
 let present = absolute;
 while (!existsSync(present)) present = dirname(present);
 const actual = realpathSync(present);
 if (actual !== root && !actual.startsWith(root+sep)) throw new TypeError('source path crosses an unadmitted link');
 if (existsSync(absolute) && lstatSync(absolute).isSymbolicLink()) throw new TypeError('source path is a link');
 return absolute;
}
const sourceNi=digest=>'ni:///sha-256;'+Buffer.from(digest.slice(7),'hex').toString('base64url');
const sourceDescriptor=(path,content)=>stamp('software-development.source',{path,content,encoding:'utf-8'});
function sourceReferences(snapshot){return (snapshot?.targets??[]).map(target=>sourceDescriptor(target.path,sourceNi(target.beforeDigest)));}
function toolsFor(root, readablePaths, observations, authorizeEffect, onRead, custody, admittedSource) {
 const allowed = path => readablePaths.some(lane => path === lane || path.startsWith(lane+'/'));
 return {
  tools:[{type:'function',function:{name:'read_source',description:'Read an admitted resource by its exact id from context.sources. The host resolves its filename and verifies its current admitted version. Legacy path reads also work; pass the returned id for continuation. Windows use Unicode codepoints; each response is bounded.',parameters:sourceReadRequestSchema}}],
  handlers:{read_source:async request=>{
   const admitted=admit(sourceReadRequestType,request);
   if(!admitted.ok)throw new TypeError('source request is not admitted: '+JSON.stringify(admitted.refusal));
   const {offset=0,limit=8192,id}=request;
   let path=request.path;
   await authorizeEffect?.({phase:"source-read",path,id});
   if(path===undefined){
    const source=[...sourceReferences(admittedSource),...[...observations.values()].filter(value=>value.kind==='software-development.source')].find(value=>value.id===id);
    if(!source)throw new TypeError('source identity is outside the admitted reading lane');
    path=source.value.path;
   }
   if (!allowed(path)) throw new TypeError('source is outside the admitted reading lane');
   const absolute = admittedPath(root,path);
   if(relative(root,absolute).split(sep).join('/')!==path)throw new TypeError('source path must be canonical');
   const original=admittedSource?.targets.find(target=>target.path===path);
   const previous=[...observations.values()].find(value=>value.kind==='software-development.source'&&value.value.path===path);
   const expectedNi=original?sourceNi(original.beforeDigest):previous?.value.content;
   const held=custody.retainFile(absolute,{...(expectedNi===undefined?{}:{expectedNi}),mediaType:'text/plain; charset=utf-8'});
   const value=sourceDescriptor(path,held.ni);
   if(id!==undefined&&id!==value.id)throw new TypeError('source window belongs to another version');
   const window=custody.window(held.ni,{offset,limit});
   if(window.containsNul)throw new TypeError('source is not a text carrier');
   await authorizeEffect?.({phase:"source-read",path});
   observations.set(value.id,value);
   onRead?.({id:value.id,kind:'source-view',offset,length:Array.from(window.text).length,total:window.total});
   return {id:value.id,kind:'software-development.source-view',value:{path,text:window.text},
    content:held.ni,byteLength:held.byteLength,projection:{encoding:window.encoding,offset,total:window.total,complete:offset===0&&Array.from(window.text).length===window.total}};
  }},

 };
}
/** Products have their own exact content address. The native history records their
 * causal references, rather than embedding each large source/proposal in several cells. */
const heldMaterial=createVerifiedContentReader({
 read:file=>{
  if(!lstatSync(file).isFile()||statSync(file).size>LIMIT)throw new TypeError('development material exceeds its admitted carrier');
  return readFileSync(file);
 },
 verify:bytes=>{
  const held=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(semanticId({kind:held.kind,value:held.value})!==held.id)throw new TypeError('development product differs from its announced content address');
  return held;
 },
});
function publishMaterial(file,value){
 const encoded=JSON.stringify(value);
 if(Buffer.byteLength(encoded)>LIMIT)throw new TypeError('development material requires a bounded continuation');
 if(existsSync(file)){const held=heldMaterial(file);if(held.id!==value.id)throw new TypeError('held development material differs');return;}
 const pending=file+'.'+process.pid+'.pending';writeFileSync(pending,encoded,{flag:'wx',mode:0o600});renameSync(pending,file);
}
const contentName=id=>{
 if(!/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(id))throw new TypeError('development material requires its exact content address');
 return id.slice(id.lastIndexOf(';')+1)+'.json';
};
const CHUNK_BYTES=256*1024;
function productAt(dataRoot,reference){
 const directory=join(dataRoot,'software-development','products');
 const material=heldMaterial(join(directory,contentName(reference)));
 if(material.kind!=='software-development.product-manifest'){
  if(material.id!==reference)throw new TypeError('development product differs from its announced content address');
  return material;
 }
 const manifest=material.value;
 if(manifest.product!==reference||!Number.isSafeInteger(manifest.totalBytes)||manifest.totalBytes<=LIMIT||!Array.isArray(manifest.chunks)||!manifest.chunks.length)throw new TypeError('invalid development product manifest');
 const chunks=manifest.chunks.map((id,index)=>{
  const chunk=heldMaterial(join(directory,'chunks',contentName(id)));
  if(chunk.id!==id||chunk.kind!=='software-development.product-chunk'||chunk.value.encoding!=='json-utf8'||typeof chunk.value.bytesBase64!=='string')throw new TypeError('invalid development product chunk');
  const bytes=Buffer.from(chunk.value.bytesBase64,'base64');
  if(bytes.toString('base64')!==chunk.value.bytesBase64||bytes.length<1||bytes.length>CHUNK_BYTES||index<manifest.chunks.length-1&&bytes.length!==CHUNK_BYTES)throw new TypeError('noncanonical development product chunk');
  return bytes;
 });
 const bytes=Buffer.concat(chunks);
 if(bytes.length!==manifest.totalBytes)throw new TypeError('development product manifest differs from its bytes');
 const product=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(product.id!==reference||semanticId({kind:product.kind,value:product.value})!==reference)throw new TypeError('development product differs from its announced content address');
 return product;
}
function holdProduct(dataRoot,value){
 if(semanticId({kind:value.kind,value:value.value})!==value.id)throw new TypeError('cannot hold a development product with a substituted identity');
 const directory=join(dataRoot,'software-development','products');mkdirSync(directory,{recursive:true});
 const file=join(directory,contentName(value.id));
 if(existsSync(file)){productAt(dataRoot,value.id);return;}
 const bytes=Buffer.from(JSON.stringify(value));
 if(bytes.length<=LIMIT){publishMaterial(file,value);return;}
 mkdirSync(join(directory,'chunks'),{recursive:true});
 const chunks=[];
 for(let offset=0;offset<bytes.length;offset+=CHUNK_BYTES){
  const chunk=stamp('software-development.product-chunk',{encoding:'json-utf8',bytesBase64:bytes.subarray(offset,offset+CHUNK_BYTES).toString('base64')});
  publishMaterial(join(directory,'chunks',contentName(chunk.id)),chunk);chunks.push(chunk.id);
 }
 publishMaterial(file,stamp('software-development.product-manifest',{product:value.id,totalBytes:bytes.length,chunks}));
}
function historyAt(dataRoot, id) {
 if (typeof dataRoot !== 'string' || !isAbsolute(dataRoot)) throw new TypeError('development requires an absolute caller-owned dataRoot');
 const directory = join(dataRoot,'software-development');
 mkdirSync(directory,{recursive:true});
 const file = join(directory, id.slice(id.lastIndexOf(';')+1)+'.json');
 let history = createHistory();
 if (existsSync(file)) {
  if (!lstatSync(file).isFile() || statSync(file).size > LIMIT) throw new TypeError('development state exceeds its admitted carrier');
  history = restoreHistory(JSON.parse(readFileSync(file,'utf8')));
 }
 return { get history(){return history;},
  tell(value, grounds=[]) {
   holdProduct(dataRoot,value);
   const next=observeHistory(history,[cell(id,value.kind,{kind:'software-development.product-reference',id:value.id},{for:grounds})],{source:ACTOR});
   const encoded = JSON.stringify(next);
   if (Buffer.byteLength(encoded)>LIMIT) throw new TypeError('development history requires a bounded continuation');
   const pending=file+'.'+process.pid+'.pending';
   writeFileSync(pending,encoded,{flag:'w',mode:0o600});renameSync(pending,file);history=next;
   return value;
  },
  products:()=>materializeHistory(history).revisions.flatMap(revision=>revision.cells).map(value=>{
   const held=value.object;
   // Existing histories remain readable; their inline products have the same identities.
   if(held.kind!=='software-development.product-reference')return held;
   return productAt(dataRoot,held.id);
  }),
 };
}
export const readDevelopmentProducts=(dataRoot,question)=>historyAt(dataRoot,question).products();
function artifactFrom(result) {
 if (result?.role && typeof result.text === 'string') return result;
 if (result?.candidate !== undefined) return typeof result.candidate === 'string' ? JSON.parse(result.candidate) : result.candidate;
 if (typeof result?.outcome?.inquiryResult === 'string') return JSON.parse(result.outcome.inquiryResult);
 throw new TypeError('inference returned no consumable engineering artifact');
}
async function defaultInquiry(request, {tools,handlers,signal,customerActor,pricingRoot,inferenceOptions,dataRoot}={}) {
 const environment={...(inferenceOptions?.environment??process.env),INFERENCE_WORK_LOT_DATA_ROOT:join(dataRoot,"inference-work")};
 return dispatchInferenceAsConfiguredCustomer({
  workLotId:request.id,customer:customerActor??INFERENCE_WORK_CUSTOMER,objective:request.objective,
  context:JSON.stringify(request.context),desiredUse:'Use the admitted source tools and return the engineering product consumed by the next transformation.',
  workType:request.role==='prior-art-synthesis'?'research':'software-engineering',taskClass:'software-development/'+request.role,
  outputSchema:schemaFor(request.role),enforceProviderSchema:true,
  ...(inferenceOptions?.agentBounds===undefined?{}:{agentBounds:inferenceOptions.agentBounds}),
  ...(inferenceOptions?.workPlacement===undefined?{}:{workPlacement:inferenceOptions.workPlacement}),
 },{...inferenceOptions,zeroCashOnly:inferenceOptions?.zeroCashOnly??true,environment,customerActor,pricingRoot:pricingRoot??join(dataRoot,"inference"),signal,directTools:tools,directToolHandlers:handlers});
}

/** Each artifact depends on the preceding product and the admitted demand; no officer-academy scaffolding. */
export async function compileEngineeringDesign(input, options={}) {
 await options.authorizeEffect?.({phase:"source-snapshot"});
 const root=realpathSync(resolve(nonempty(input.territory,'territory')));
 const paths=input.writablePaths??input.requiredFocusPaths??[];
 const source=input.workType==='inquiry'?null:captureSoftwareChangeSource({root,writablePaths:paths});
 const readablePaths=input.readablePaths??input.engineeringReadablePaths??paths;
 if(!Array.isArray(readablePaths)||readablePaths.length>128)throw new TypeError('development reading lanes require a bounded source declaration');
 const readableFiles=readablePaths.filter(path=>{
  const absolute=admittedPath(root,path);
  if(!existsSync(absolute))return false;
  const metadata=lstatSync(absolute);
  return metadata.isFile();
 });
 const readableSource=readableFiles.length?captureSoftwareChangeSource({root,writablePaths:readableFiles}):null;
 const fabrication=fabricationOperations({repositoryRoot:root},options.fabricationOptions);
 const projection=fabrication.find(operation=>operation.verb==='fabrication-project-json-schema-module').domain.schema;
 const sourceEntry={type:'object',additionalProperties:false,required:['schemaSource'],properties:{
  schemaSource:{type:'object',additionalProperties:false,required:['path','content'],properties:{
   path:{type:'string',enum:readableFiles},content:{type:'string',pattern:'^ni:///sha-256;[A-Za-z0-9_-]{43}$'}}}}};
 const schemaModule={...projection,required:['path',...projection.required],properties:{...projection.properties,
  path:{type:'string',enum:paths},specificationPath:{type:'string',enum:paths},
  entries:{...projection.properties.entries,items:{anyOf:[projection.properties.entries.items,sourceEntry]}}}};
 delete schemaModule.$id;
 schemaModule.$id=semanticId(schemaModule);
 const fabricationContract=stamp('software-development.fabrication-contract',{
  operations:fabrication.filter(operation=>['fabrication-project-json-schema-module','fabrication-plan-jsnode-modules','fabrication-translate-work-order'].includes(operation.verb))
   .map(operation=>({verb:operation.verb,description:operation.description,input:operation.domain.schema,output:operation.codomain.schema})),
  schemaModule,
  handoff:'For schema projection, the final contribution product contains schemaModules, an array of schemaModule specifications. Choose javascript for a JavaScript consumer. The native fabricator derives source. An entry may use schemaSource {path,content} from an admitted read_source result; its exact captured JSON schema supplies x-codegen names without inferential retranscription. Otherwise inference supplies schemas. Choose exact output paths. Work orders and Markdown specifications use their named native operations.',
  ...(options.fabricationOptions?.schemaProjection?.program?{projectionProgram:options.fabricationOptions.schemaProjection.program}:{}),
 });
 const need=stamp('software-development.need',{objective:nonempty(input.objective,'objective'),constraints:input.constraints??[],source,readableSource,receivingFeedback:options.receivingFeedback??null,
  authority:input.authority??[],workType:input.workType??'software-change',submittedArtifacts:semanticId(input.artifacts??null),contributionContract:semanticId(engineeringContributionSchema),fabricationContract:fabricationContract.id,readablePaths:input.readablePaths??input.engineeringReadablePaths??paths,acceptance:input.acceptanceCommand??input.verifyCommand??null});
 const journal=historyAt(options.dataRoot??input.missionExecutionDataRoot,need.id);
 if (!journal.products().some(product=>product.id===fabricationContract.id)) journal.tell(fabricationContract,[]);
 if (!journal.products().some(product=>product.id===need.id)) journal.tell(need,source===null?[]:[source.id]);
 const sourceCustody=createFileContentCustody({root:join(options.dataRoot??input.missionExecutionDataRoot,'software-development','sources')});
 const observations=new Map([[need.id,need],[fabricationContract.id,fabricationContract]]);
 if(options.receivingFeedback){
  const feedback=options.receivingFeedback;
  if(semanticId({kind:feedback.kind,value:feedback.value})!==feedback.id)throw new TypeError('receiving feedback changed its content');
  observations.set(feedback.id,feedback);
  journal.tell(feedback,[need.id]);
 }
 const resolveSchemaEntries=async(module,onRead)=>{
  schemaFrom(schemaModule).assert(module);
  const entries=[];
  for(const entry of module.entries){
   if(!entry.schemaSource){entries.push(entry);continue;}
   const {path,content}=entry.schemaSource;
   const target=readableSource?.targets.find(target=>target.path===path);
   if(!target?.beforeExisted||sourceNi(target.beforeDigest)!==content)throw new TypeError('schema source differs from its captured reading lane');
   const absolute=admittedPath(root,path);
   await options.authorizeEffect?.({phase:'source-read',path});
   const held=sourceCustody.retainFile(absolute,{expectedNi:content,mediaType:'application/schema+json'});
   if(held.byteLength>LIMIT)throw new TypeError('schema source exceeds its admitted carrier');
   const parts=[];let offset=0,total;
   do{
    const window=sourceCustody.window(content,{offset,limit:16384});
    if(window.containsNul)throw new TypeError('schema source needs a text carrier');
    const length=Array.from(window.text).length;total=window.total;
    if(!length&&offset<total)throw new TypeError('schema source needs a complete carrier');
    parts.push(window.text);offset+=length;
   }while(offset<total);
   const schema=JSON.parse(parts.join('')),names=schema['x-codegen'];
   const resolved={schema,...names};schemaFrom(projection.properties.entries.items).assert(resolved);
   const descriptor=sourceDescriptor(path,content);observations.set(descriptor.id,descriptor);
   onRead?.({id:descriptor.id,kind:'source-view',offset:0,length:total,total});
   entries.push(resolved);
  }
  return {...module,entries};
 };
 const consumableFinal = async value => {
  if (input.workType==='inquiry' || options.fabricate || value.product?.schemaModules || value.product?.workOrder || value.product?.proposal) return true;
  const translated=await fabrication.find(operation=>operation.verb==='fabrication-translate-work-order').execute({
   source:{type:'MarkdownDocumentSource',path:'artifact-specifications',text:value.text}});
  return Boolean(translated.artifactSpecificationCandidate);
 };
 const stages=[];let prior=need;let inferenceAttempts=0;
 let fabricationFeedback=options.fabricationFeedback??journal.products().findLast(value=>value.kind==='software-development.fabrication-refusal'&&value.value.source===source?.id);
 if(fabricationFeedback){
  if(semanticId({kind:fabricationFeedback.kind,value:fabricationFeedback.value})!==fabricationFeedback.id)throw new TypeError('specification counterexample changed its content');
  observations.set(fabricationFeedback.id,fabricationFeedback);
  if(!journal.products().some(product=>product.id===fabricationFeedback.id))journal.tell(fabricationFeedback,[need.id]);
 }
 const productTool={type:'function',function:{name:'read_product',description:'Read the bound preceding engineering product by omitting id, or another admitted requirement/product by its exact content address, in bounded Unicode-codepoint windows.',
  parameters:{type:'object',additionalProperties:false,properties:{id:{type:'string'},offset:{type:'integer',minimum:0},limit:{type:'integer',minimum:1,maximum:16384}}}}};
 const readProduct=async({id,offset=0,limit=8192},onRead)=>{
  await options.authorizeEffect?.({phase:'product-read',id});
  if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>16384)throw new TypeError('product window must be bounded');
  if(id!==need.id&&id!==fabricationContract.id&&id!==fabricationFeedback?.id&&!stages.some(stage=>stage.artifactId===id))throw new TypeError('product is not in this derivation');
  const product=journal.products().find(product=>product.id===id);
  if(!product||semanticId({kind:product.kind,value:product.value})!==id)throw new TypeError('product content differs from its announced identity');
  const characters=Array.from(JSON.stringify(product));
  const text=characters.slice(offset,offset+limit).join('');
  onRead?.({id,kind:'product-view',offset,length:Array.from(text).length,total:characters.length});
  return {id,encoding:'unicode-codepoints',offset,total:characters.length,text};
 };

 const sourceCurrent = async reference => {
  const observed=journal.products().find(product=>product.id===reference&&product.kind==='software-development.source');
  if(!observed)return false;
  try{return (await toolsFor(root,readablePaths,observations,options.authorizeEffect,undefined,sourceCustody).handlers.read_source({path:observed.value.path})).id===reference;}catch{return false;}
 };
 const inquiry=options.inquire??options.hireInquiry??defaultInquiry;
 for (const role of input.workType==='inquiry' ? DEVELOPMENT_STAGES.slice(0,1) : DEVELOPMENT_STAGES) {
  options.signal?.throwIfAborted();
  await options.authorizeEffect?.({phase:"derive",role});
  const basis=[need.id,prior.id,...(role==='artifact-specifications'&&fabricationFeedback?[fabricationFeedback.id]:[])];
  let stage=journal.products().findLast(product=>product.kind==='software-development.artifact'
   &&product.value.role===role&&JSON.stringify(product.value.basis)===JSON.stringify(basis));
  if(stage&&role==='artifact-specifications'&&!(await consumableFinal(stage.value)))stage=undefined;
  if(stage){
   const historical=new Map(journal.products().map(product=>[product.id,product]));
   for(const reference of stage.value.inputs){
    if(historical.get(reference)?.kind==='software-development.source'&&!(await sourceCurrent(reference))){stage=undefined;break;}
   }
  }
  if (!stage) {
   const supplied=input.artifacts?.[role];
   const request={id:semanticId({need:need.id,role,basis}),role,
    objective:`${input.objective}\nProduce ${role} from the admitted demand and preceding artifact. Preserve source references and unresolved obligations. Architecture uses arc42 viewpoints. HLD derives from architecture; LLD from HLD. Artifact specifications must contain the source-free Modules work order or deterministic schemaModules projection required by the admitted demand, consumed by the native fabricator. Read the preceding product with read_product({limit:16384}); its exact identity is bound by the receiver. Read relevant source windows with read_source using the exact identities from context.sources. Products are available by the announced content addresses. Return only the requested artifact JSON, with role, text and unresolved, and product when needed. The engine records provenance and authority; do not author input identities or proof claims.`,
    context:{need:{id:need.id,projection:'named-demand-fields',value:{objective:need.value.objective,acceptance:need.value.acceptance,
     constraintCount:need.value.constraints.length,receivingFeedback:need.value.receivingFeedback}},
    prior:{id:prior.id,role:prior.value.role},products:stages.map(stage=>({id:stage.artifactId,role:stage.role})),
    sources:sourceReferences(readableSource).map(source=>({id:source.id,label:source.value.path.split('/').slice(-3).join('/')})),requiredPaths:paths,acceptance:need.value.acceptance,
    ...(role==='artifact-specifications'&&fabricationFeedback?{fabricationFeedback:{id:fabricationFeedback.id,readWith:'read_product',purpose:'Revise the executable specification against this native transformation refusal.'}}:{}),
    fabrication:{id:fabricationContract.id,readWith:'read_product',purpose:'Read the actual native fabrication contracts before specifying executable products. Do not infer their shapes from names.'}}};
   const readings=[],onRead=reading=>readings.push(reading);
   const tools=toolsFor(root,readablePaths,observations,options.authorizeEffect,onRead,sourceCustody,readableSource);
   const precedingProduct = prior.id;
   const admittedProducts = [need.id, fabricationContract.id, ...(fabricationFeedback?[fabricationFeedback.id]:[]), ...stages.map(stage=>stage.artifactId)];
   const readingTool = {...productTool,function:{...productTool.function,parameters:{...productTool.function.parameters,
    properties:{...productTool.function.parameters.properties,id:{type:'string',enum:admittedProducts}}}}};
   tools.tools.push(readingTool);
   tools.handlers.read_product=args=>readProduct({...args,id:args.id??precedingProduct},onRead);
   const delivery=supplied===undefined ? await inquiry(request,{...options,dataRoot:options.dataRoot??input.missionExecutionDataRoot,tools:tools.tools,handlers:tools.handlers}) : null;
   if(delivery!==null){
    inferenceAttempts+=1;
    journal.tell(stamp('software-development.delivery',{request:request.id,role,delivery}),basis);
   }
   const raw=supplied??artifactFrom(delivery);
   schemaFrom(schemaFor(role)).assert(raw);
   if(!raw.text.trim())throw new TypeError(`invalid ${role} contribution`);

   let resolvedProduct=raw.product;
   if(role==='artifact-specifications'){
    try {
     if(!(await consumableFinal(raw)))throw new TypeError('artifact specification must supply an executable native fabrication handoff');
     if(raw.product?.schemaModules){
      if(!Array.isArray(raw.product.schemaModules)||!raw.product.schemaModules.length)throw new TypeError('schema modules need exact output specifications');
      const modules=[];for(const module of raw.product.schemaModules)modules.push(await resolveSchemaEntries(module,onRead));
      resolvedProduct={...raw.product,schemaModules:modules};
     }
     if(raw.product?.proposal)projectFabricatedSoftwareChanges(source,raw.product.proposal);
    }catch(error){
     const contribution=journal.tell(stamp('software-development.contribution',raw),basis);
     // Returning to an automatic inference loop would treat failing execution
     // as the specification. The author must qualify a distinct new request.
     throw requireDesignRevision(journal,source,contribution.id,'native-handoff',error,raw.product??raw.text);
    }
   }

   if(delivery!==null&&!readings.some(reading=>reading.kind==='product-view'&&reading.id===prior.id&&reading.length>0))
    throw new TypeError(`${role} did not read its preceding product`);
   for(const observation of observations.values())if(observation.kind==='software-development.source'
    &&readings.some(reading=>reading.id===observation.id)
    &&!journal.products().some(product=>product.id===observation.id))journal.tell(observation,[need.id]);
   if(delivery!==null&&role==='artifact-specifications'&&fabricationFeedback&&!readings.some(reading=>reading.kind==='product-view'&&reading.id===fabricationFeedback.id&&reading.length>0))
    throw new TypeError('executable specification did not read its native fabrication counterexample');
   const contribution=journal.tell(stamp('software-development.contribution',raw),basis);
   const inputs=[...new Set([...basis,contribution.id,...readings.map(reading=>reading.id)])];
   const value={...raw,...(resolvedProduct===undefined?{}:{product:resolvedProduct}),inputs,basis,authority:need.value.authority,readings,
    derivation:delivery===null?{kind:'supplied-contribution',contribution:contribution.id}:{kind:'inference-delivery',contribution:contribution.id,request:request.id,provider:delivery.provider??null,model:delivery.model??null,consideration:delivery.consideration??null},
    admission:'machine-grounded-contribution',semanticProof:'unestablished'};
   schemaFrom(engineeringArtifactSchema).assert(value);
   stage=journal.tell(stamp('software-development.artifact',value),inputs);
  }
  observations.set(stage.id,stage);
  stages.push({role,artifact:stage.value.text,artifactId:stage.id,unresolved:stage.value.unresolved,...(stage.value.product===undefined?{}:{product:stage.value.product})});prior=stage;
 }
 return {type:'StandardsDrivenEngineeringDesign',question:need.id,source,stages,history:journal.history,territory:root,inferenceAttempts};
}

/** The source-free order is the actual input to the existing module compiler. */
export async function compileProgram(input, options={}) {
 const design=await compileEngineeringDesign(input,options);
 if(input.workType==='inquiry')return {engineeringDesign:design,source:design.source};
 await options.authorizeEffect?.({phase:"compile"});
 const root=design.territory;
 const operations=fabricationOperations({repositoryRoot:root},{dependencyProjectRoot:root,...options.fabricationOptions});
 const invoke=(verb,args)=>operations.find(operation=>operation.verb===verb).execute(args);
 const specified=design.stages.at(-1).product?.workOrder;
 if(input.workOrder&&semanticId(input.workOrder)!==semanticId(specified))throw new TypeError('work order does not derive from the final artifact specification');
 let workOrder=specified;
 if (!workOrder && !design.stages.at(-1).product?.schemaModules && !design.stages.at(-1).product?.proposal && !options.fabricate) {
  const specification=design.stages.at(-1);
  const translated=await invoke('fabrication-translate-work-order',{source:{type:'MarkdownDocumentSource',path:specification.artifactId,text:specification.artifact}});
  workOrder=translated.artifactSpecificationCandidate;
  if (!workOrder) throw new TypeError(`artifact specification translation refused: ${translated.code??translated.type}`);
 }
 let plan;
 if(workOrder){
  plan=await invoke('fabrication-plan-jsnode-modules',{workOrder});
  if(plan.type!=='JsnodeModuleFabricationPlan'){
   const journal=historyAt(options.dataRoot??input.missionExecutionDataRoot,design.question);
   throw requireDesignRevision(journal,design.source,design.stages.at(-1).artifactId,'module-plan',plan,workOrder);
  }
 }
 return {engineeringDesign:design,source:design.source,workOrder,plan};
}

/** Receiving is a host-granted effect port. Success requires the consumer condition to hold. */
export async function runProgram(input, options={}) {
 if(!input.territory && input.source?.kind==='github-repository'){
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(input.source.repository??'')||!/^[0-9a-f]{40}$/u.test(input.source.commit??''))
   throw new TypeError('remote source requires one immutable repository commit');
  const custody=mkdtempSync(join(tmpdir(),'software-development-source-'));const territory=join(custody,'territory');mkdirSync(territory);
  try{
   const archive=join(custody,'source.tar.gz');
   await (options.github??githubApi()).downloadRepositoryTarball(input.source.repository,input.source.commit,archive);
   if(statSync(archive).size>128*1024*1024)throw new TypeError('repository archive exceeds the admitted source carrier');
   execFileSync('tar',['-xzf',archive,'-C',territory,'--strip-components=1'],{timeout:60000,maxBuffer:1024*1024});
   return await runProgram({...input,territory},options);
  }finally{rmSync(custody,{recursive:true,force:true});}
 }
 if(input.acceptanceCapsule&&input.acceptanceCapsulePath)throw new TypeError('use one protected acceptance source');
 const capsule=input.acceptanceCapsule ? validateAcceptanceCapsule(input.acceptanceCapsule,{territory:input.territory})
  : input.acceptanceCapsulePath ? loadAcceptanceCapsule(input.acceptanceCapsulePath,{territory:input.territory}) : undefined;
 if(capsule){
  if(input.acceptanceCommand&&input.acceptanceCommand!==capsule.command)throw new TypeError('acceptance conflicts with the protected condition');
  input={...input,acceptanceCommand:capsule.command};
  if((input.writablePaths??input.requiredFocusPaths??[]).some(path=>capsule.artifacts.some(artifact=>artifact.path===path)))
   throw new TypeError('the producer cannot overwrite its protected acceptance');
 }
 const compilation=await compileProgram(input,options);
 const design=compilation.engineeringDesign;
 if(input.workType==='inquiry')return {id:input.id??design.question,engineeringDesign:design,
  outcome:{answered:true,verified:false,inquiryResult:design.stages.at(-1).artifact},status:'answered'};
 options.signal?.throwIfAborted();
 await options.authorizeEffect?.({phase:"fabricate"});
 const finalProduct=design.stages.at(-1).product;
 if(input.artifactProposal&&semanticId(input.artifactProposal)!==semanticId(finalProduct?.proposal))throw new TypeError('proposal is not bound to the final artifact specification');
 const schemaModules=finalProduct?.schemaModules;
 let derived;
 if(schemaModules){
  if(!Array.isArray(schemaModules)||!schemaModules.length)throw new TypeError('schema modules need exact output specifications');
  const projection=fabricationOperations({repositoryRoot:design.territory},options.fabricationOptions)
   .find(operation=>operation.verb==='fabrication-project-json-schema-module');
  const operations=[];
  for(const specification of schemaModules){
   const {path,specificationPath,entries,...parameters}=specification;
   const projectedEntries=specificationPath===undefined?entries:entries.map(entry=>({...entry,schema:{...entry.schema,'x-codegen':{exportName:entry.exportName,typeName:entry.typeName,runtimeName:entry.runtimeName}}}));
   const result=await projection.execute({entries:projectedEntries,...parameters});
   operations.push({kind:'replace-text',path,text:result.source});
   if(specificationPath!==undefined){
    if(entries.length!==1)throw new TypeError('one specification file carries one schema');
    const schema=projectedEntries[0].schema;
    operations.push({kind:'replace-text',path:specificationPath,text:JSON.stringify(schema,null,2)+'\n'});
   }
  }
  for(const path of finalProduct.retire??[])operations.push({kind:'remove',path});
  derived={type:'SoftwareSourceTransformation',version:1,operations};
 }
 const artifact=derived??(options.fabricate ? await options.fabricate({specification:design.stages.at(-1),source:compilation.source,design})
  : finalProduct?.proposal??await fabricationOperations({repositoryRoot:design.territory},
  {dependencyProjectRoot:design.territory,...options.fabricationOptions})
  .find(operation=>operation.verb==='fabrication-derive-jsnode-modules').execute({workOrder:compilation.workOrder}));
 if(artifact?.type==='JsnodeModuleDerivationRefusal'){
  // Missing compute or unavailable installed dependencies cannot be repaired by rewriting the order.
  if(['NO_DERIVATION_CARRIER','ASSAY_CONTEXT_UNAVAILABLE'].includes(artifact.code))throw new TypeError(artifact.message??artifact.code);
  const journal=historyAt(options.dataRoot??input.missionExecutionDataRoot,design.question);
  throw requireDesignRevision(journal,compilation.source,design.stages.at(-1).artifactId,'module-derivation',artifact,compilation.workOrder);
 }
 const proposal=projectFabricatedSoftwareChanges(compilation.source,artifact);
 const receiver=options.receiver;
 if(compilation.plan){
  const actual=proposal.changes.map(change=>change.path).sort();
  const planned=compilation.plan.outputPaths?.slice().sort();
  if(planned&&JSON.stringify(actual)!==JSON.stringify(planned))throw new TypeError('fabrication output differs from its admitted realization plan');
 }
 const journal=historyAt(options.dataRoot??input.missionExecutionDataRoot,design.question);
 const product=stamp('software-development.proposal',{design:design.stages.at(-1).artifactId,proposal});
 if(!journal.products().some(value=>value.id===product.id))journal.tell(product,[design.stages.at(-1).artifactId]);
 if(receiver===undefined)return {id:input.id??design.question,engineeringDesign:design,history:journal.history,
  status:'awaiting-receiving',outcome:{verified:false,candidateVerified:false,proposal},obstruction:{reason:'receiver-effect-port-not-granted',proposal:product.id}};
 const expected=input.acceptanceCommand??input.verifyCommand;
 nonempty(expected,'consumer acceptance command');
 if(receiver.acceptanceCommand!==expected || receiver.verifyCommand!==input.verifyCommand)throw new TypeError('receiver checks differ from the admitted demand');
 await options.authorizeEffect?.({phase:"receiving"});
 if(capsule){
  validateAcceptanceCapsule(capsule,{territory:receiver.root});
  materializeAcceptanceCapsule(receiver.root,capsule);
 }
 // Cross-session refusal uses durable SignCraft custody, not an ephemeral Map.
 // Repeating the same previously rejected proposal would run the test as a
 // speculative design search. Only a newly reviewed design identity proceeds.
 const previousRefusal=journal.products().findLast(value=>
  value.kind==='software-development.receiving-refusal'
  &&value.value.proposal===product.id&&value.value.source===compilation.source.id);
 if(previousRefusal){
  const error=new Error('development proposal already refuted; independent specification revision required');
  error.code='AOE_RECEIVING_DESIGN_REVIEW_REQUIRED';
  error.receiving=previousRefusal.value.receiving;
  error.developmentObligation=previousRefusal.id;
  throw error;
 }
 let receiving,delivery;
 try{
  delivery=await receiver.prepareDelivery?.({proposal,proposalId:product.id,question:design.question});
  receiving=await (options.receive??induceVerifiedSoftwareMissionProposal)({...receiver,proposal});
 }
 catch(error){
  const refusal=journal.tell(stamp('software-development.receiving-refusal',{proposal:product.id,
   source:compilation.source.id,reason:error.message,receiving:error.receiving??null,activates:'independently-reviewed-specification-revision'}),[product.id]);
  options.signal?.throwIfAborted();
  // Failed V&V contradicts the specification; it is not authority to ask
  // inference for another patch or to rerun the same received source.
  const review=new Error('consumer verification contradicted the design; independent specification review required',{cause:error});
  review.code='AOE_RECEIVING_DESIGN_REVIEW_REQUIRED';
  review.developmentObligation=refusal.id;
  review.receiving=error.receiving??null;
  throw review;
 }
 if(!receiving.verification?.passed||!receiving.acceptance?.passed)throw new TypeError('receiver did not establish the admitted consumer effect');
 const effect=journal.tell(stamp('software-development.effect',{proposal:product.id,receiving,
  condition:expected,semanticProof:'unestablished',fulfillment:'declared-consumer-condition',
  ...(delivery===undefined?{}:{delivery:delivery.summary})}),[product.id]);
 const submitted=delivery===undefined?{}:await activateDevelopmentDelivery({delivery,journal,effect,options,question:design.question});
 return {id:input.id??design.question,engineeringDesign:design,history:journal.history,status:delivery===undefined?'applied':submitted.status,effect:effect.id,
  ...submitted,outcome:{verified:true,candidateVerified:true,proposal,receiving},metrics:{inferenceAttempts:design.inferenceAttempts}};
}
async function activateDevelopmentDelivery({delivery,journal,effect,options,question}){
 try{
  await options.authorizeEffect?.({phase:'publication'});
  const candidate=await delivery.activate();
  const value={effect:effect.id,sourceBase:candidate.transformation.sourceBase,commit:candidate.commit,
   ref:candidate.ref,transformation:candidate.transformation.id,
   ...(candidate.pullRequest===undefined?{}:{pullRequest:candidate.pullRequest,repository:candidate.repository})};
  journal.tell(stamp('software-development.delivery',value),[effect.id]);
  return {status:'submitted',delivery:value};
 }catch(error){
  const obstruction=journal.tell(stamp('software-development.delivery-obstruction',{effect:effect.id,
   reason:error.message,activates:'resume-delivery'}),[effect.id]);
  return {status:'awaiting-delivery',obstruction:{id:obstruction.id,reason:error.message,
   resume:{question,effect:effect.id}}};
 }
}
/** Resume the accepted immutable transformation; never re-run inference or mutate source a second time. */
async function resumeDevelopmentDelivery({question,effect:reference},demand,options){
 const journal=historyAt(options.dataRoot,question),products=journal.products();
 const need=products.find(product=>product.id===question&&product.kind==='software-development.need');
 if(!need||need.value.objective!==demand.objective||JSON.stringify(need.value.authority)!==JSON.stringify(demand.authority))
  throw new TypeError('delivery belongs to another operative requirement');
 const effect=products.find(product=>product.id===reference&&product.kind==='software-development.effect');
 if(!effect||effect.value.condition!==demand.acceptanceCommand||!effect.value.receiving.verification?.passed||!effect.value.receiving.acceptance?.passed)
  throw new TypeError('delivery has no accepted consumer effect');
 const product=products.find(product=>product.id===effect.value.proposal&&product.kind==='software-development.proposal');
 if(!product||!effect.value.delivery||typeof options.receiver?.prepareDelivery!=='function')
  throw new TypeError('that effect has no receiving delivery capability');
 const projected=projectFabricatedSoftwareChanges(product.value.proposal.sourceSnapshot,product.value.proposal.artifactProposal);
 if(JSON.stringify(projected.changes)!==JSON.stringify(product.value.proposal.changes))throw new TypeError('delivery differs from its bound fabrication');
 const delivery=await options.receiver.prepareDelivery({proposal:product.value.proposal,proposalId:product.id,question});
 if(JSON.stringify(delivery.summary)!==JSON.stringify(effect.value.delivery))throw new TypeError('resumed delivery differs from its accepted source');
 return {id:question,engineeringDesign:{question,stages:[]},effect:effect.id,
  ...await activateDevelopmentDelivery({delivery,journal,effect,options,question}),outcome:{verified:true,candidateVerified:true}};
}
export const runMission=runProgram;
export const runMissionPipeline=runProgram;
export const executeSoftwareMission=runProgram;
export const proposeSoftwareMission=runProgram;
export { captureSoftwareChangeSource, projectFabricatedSoftwareChanges, induceVerifiedSoftwareMissionProposal } from './agent-tools.mjs';

/** One installed family; native RPC binds the principal and coordinates host effects.
 * A remote request supplies intent. The receiving host supplies its territory,
 * checks, reading/writing lanes and authority from the operative work contract.
 */
export function developmentOperations(binding, options={}) {
 const admitted=options.softwareDevelopment;
 const receiveDemand=admitted?.receiveDemand;
 const dataRoot=binding?.dataRoot;
 if(!dataRoot)throw new TypeError('development actor requires persistent host custody');
 return Object.freeze([operation({
  verb:'aoe-develop-software',relation:'boundary',locus:'owner',inputFormat:'json',outputFormat:'json',
  summary:'Derive and receive software from an admitted development request',
  description:'Consumes requirements through research, architecture, HLD, LLD and artifact specifications. The host admits the operative work contract and effect ports. Products activate fabrication and receiving. A receiver observes the consumer condition. Where the host grants source delivery, acceptance submits the exact original-source transformation to independent receiving; submitted source is not a deployed effect. An exact question/effect resume retries accepted delivery without inference or rewriting source.',
  domain:schemaFrom(developmentRequestSchema),
  codomain:schemaFrom({$id:'aoe/software/development/result',type:'object'}),
  effects:{class:'external',replay:'coordinated',coordination:'coordination-required',deterministic:false,totality:'partial'},
  run:async (request,_args,context)=>{
   const subject=context?.invocation?.subject;
   nonempty(subject,'development invoking subject');
   if(typeof receiveDemand!=='function')throw new TypeError('development has no host admission for this work');
   const granted=await receiveDemand({request,subject,invocation:context.invocation});
   if(!granted?.demand||!granted?.authority?.length)throw new TypeError('development work lacks receiver-owned authority');
   const demand={...granted.demand,authority:granted.authority};
   if(demand.objective!==request.objective)throw new TypeError('development request differs from the admitted operative contract');
   const execution={...admitted,...granted.execution,dataRoot};
   if(request.resume)await admitted?.receiveProduct?.({question:request.resume.question,history:historyAt(dataRoot,request.resume.question).products(),subject});
   const result=request.resume?await resumeDevelopmentDelivery(request.resume,demand,execution):await runProgram(demand,execution);
   // The mesh exchanges references. Large source and history remain in native custody.
   return {id:result.id,status:result.status,question:result.engineeringDesign.question,
    artifacts:result.engineeringDesign.stages.map(stage=>({role:stage.role,id:stage.artifactId})),
    ...(result.effect===undefined?{}:{effect:result.effect}),
    ...(result.delivery===undefined?{}:{delivery:result.delivery}),
    outcome:{verified:result.outcome.verified,answered:result.outcome.answered===true},
    ...(result.obstruction===undefined?{}:{obstruction:result.obstruction})};
  },
 }),operation({
  verb:'aoe-development-product',relation:'boundary',locus:'question',inputFormat:'json',outputFormat:'json',
  summary:'Read an exact development product by its content address',
  domain:schemaFrom(developmentProductRequestSchema),
  codomain:schemaFrom({$id:'aoe/software/development/product',type:'object'}),
  effects:{class:'host-read',replay:'safe',coordination:'coordination-free',deterministic:true,totality:'partial'},
  run:async ({question,artifact,offset=0,limit,projection='product'},_args,context)=>{
   limit??=projection==='source-text'?8192:65536;
   nonempty(context?.invocation?.subject,'product invoking subject');
   if(!/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(question))throw new TypeError('product custody needs an exact question identity');
   const products=historyAt(dataRoot,question).products();
   await admitted?.receiveProduct?.({question,history:products,subject:context.invocation.subject});
   const product=products.find(value=>value.id===artifact);
   if(product===undefined)throw new TypeError('that development product is not held');
   if(semanticId({kind:product.kind,value:product.value})!==product.id)throw new TypeError('development product identity differs from its content');
   if(projection==='source-text'){
    if(product.kind!=='software-development.source'||!product.value.content)throw new TypeError('that product is not an addressed source body');
    const custody=createFileContentCustody({root:join(dataRoot,'software-development','sources')});
    const window=custody.window(product.value.content,{offset,limit});
    if(window.containsNul)throw new TypeError('source is not a text carrier');
    await admitted?.receiveProduct?.({question,history:products,subject:context.invocation.subject});
    return {id:product.id,content:product.value.content,encoding:window.encoding,offset,total:window.total,text:window.text};
   }
   const bytes=Buffer.from(JSON.stringify(product));
   if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>131072)throw new TypeError('product window must be bounded');
   return {id:product.id,question,encoding:'json-utf8',offset,totalBytes:bytes.length,
    bytesBase64:bytes.subarray(offset,offset+limit).toString('base64')};
  },
 })]);
}
