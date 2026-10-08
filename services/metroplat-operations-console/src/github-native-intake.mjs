import {normalizeGitHubEvent} from '@red-cup-engineering/github-semioverse-settler-service';
import {prepareGitHubWork,receivePreparedGitHubWork,gitHubSourceDocument,readGitHubSourceDocument,readGitHubSourceThreads,retainedGitHubEvidence} from '@red-cup-engineering/github-semioverse-settler-service/native-work-receiving';

// This is the existing console's authenticated operation port. A configured
// receiving binding is not inferred from GitHub prose, owner names or labels.
export async function receivePublicGitHubItems({repository,repositoryRecord,binding,items,producer,office,runAs}) {
  if(repositoryRecord.full_name?.toLowerCase()!==repository.toLowerCase()||repositoryRecord.id!==binding.repositoryId)
    throw new TypeError('GitHub intake repository identity differs from verified receiving binding');
  if(repositoryRecord.private!==false||binding.visibility!=='public')
    throw new TypeError('GitHub intake has no verified private receiving audience');
  if(typeof producer!=='string'||!producer||typeof runAs!=='function')throw new TypeError('authenticated GitHub intake caller is required');
  const actingOffice=office??binding.as;
  const call=(verb,input)=>runAs(producer,verb,actingOffice!==undefined&&['work-open','work-move'].includes(verb)?{...input,as:actingOffice}:input);
  const plans=items.map(({issue,pull,comments=[],reviewComments=[],reviews=[]})=>{
    const material=pull??issue;
    if(!['open','closed'].includes(material.state))throw new TypeError('GitHub intake source state must be open or closed');
    const event={repository:repositoryRecord,action:'observed',...(pull?{pull_request:pull}:{issue}),sender:{login:producer}};
    const related=[...comments.map(comment=>({...event,pull_request:undefined,issue,comment})),...reviewComments.map(comment=>({...event,comment})),...reviews.map(review=>({...event,review}))];
    const documents=related.map(value=>gitHubSourceDocument(normalizeGitHubEvent(value)));
    const opening={move:'report',law:pull?'github-pull-request-open':'github-issue-open',subject:material.html_url,
      observation:pull?'The GitHub pull request stands open.':'The GitHub issue stands open.',
      context:'The complete provider observation is retained in its source documents; it grants no execution authority.',
      evidence:[material.html_url,...documents.flatMap(document=>[document.locator,document.commitment])],tags:[pull?'github-pull-request':'github-issue']};
    const prepared=prepareGitHubWork({event,opening,binding:{...binding,...(office===undefined?{}:{as:office})}});
    return {material,prepared,documents};
  });
  // All source documents and audience bindings are checked before a board write.
  const results=[];
  for(const {material,prepared,documents} of plans){
    if(material.state!=='open') {
      const matches=await readGitHubSourceThreads(call,material.html_url);
      const reports=matches.filter(thread=>thread.opening?.move==='report'&&thread.opening.law===prepared.input.law&&thread.opening.subject===material.html_url);
      if(reports.length>1)throw new Error('closed-source report identity is ambiguous');
      const report=reports[0], evidence=prepared.input.evidence;
      if(!report){results.push({source:material.html_url,state:'CLOSED_SOURCE_WITHOUT_REPORT',replay:true});continue;}
      const alreadyRetained=retainedGitHubEvidence(evidence,report.resolution?.evidence??[])!==undefined;
      if(JSON.stringify([...(report.opening.scope??[])].sort())!==JSON.stringify([...binding.scope].sort()))throw new Error('closed-source report scope differs from verified receiving binding');
      if(report.home!==binding.receiver)throw new Error('closed-source report is not routed to verified receiver');
      if(report.standing==='resolved'&&!alreadyRetained){results.push({source:material.html_url,state:'CLOSED_REPORT_WITHOUT_NEW_SOURCE_RECEIPT',thread:report.id,replay:true});continue;}
      if(['withdrawn','superseded'].includes(report.standing)){results.push({source:material.html_url,state:'CLOSED_SOURCE_WITHDRAWN_REPORT',thread:report.id,replay:true});continue;}
      const requiredEvidence=[...(alreadyRetained?report.resolution.evidence:evidence)];
      if(!alreadyRetained)await call('work-move',{thread:report.id,move:'resolve',evidence});
      const received=await call('work-board',{thread:report.id,full:true,limit:1});
      const actual=received?.threads?.find(thread=>thread.id===report.id);
      if(JSON.stringify([...new Set(requiredEvidence)].sort())!==JSON.stringify([...new Set(actual?.resolution?.evidence??[])].sort()))throw new Error('closed-source readback substituted exact selected evidence carriers');
      const retainedEvidence=retainedGitHubEvidence(evidence,actual?.resolution?.evidence??[]);
      if(actual?.standing!=='resolved'||retainedEvidence===undefined)throw new Error('closed-source readback did not retain exact evidence and resolution');
      const retainedDocument=retainedEvidence.find(value=>value.offered.commitment===prepared.document.commitment)?.retained;
      if(!retainedDocument)throw new Error('closed-source readback omitted its retained source document');
      results.push({source:material.html_url,state:'NATIVE_REPORT_RESOLVED',thread:report.id,replay:alreadyRetained,sourceDocument:retainedDocument.commitment,offeredSourceDocument:prepared.document.commitment,stages:{offeredSourceRetained:retainedDocument.locator===prepared.document.locator,sourceRetained:true,nativeAdmitted:true,routed:actual.home===binding.receiver,allocated:false,implemented:false,accepted:false}});
      continue;
    }
    const receipt=await receivePreparedGitHubWork({prepared,call});
    const readback=await call('work-board',{thread:receipt.thread,full:true,limit:1});
    const thread=readback?.threads?.find(value=>value.id===receipt.thread);
    const sayings=thread?[thread.opening,...(thread.corroborations??[]),...(thread.restatements??[])]:[];
    const retained=sayings.map(saying=>retainedGitHubEvidence(prepared.input.evidence,saying.evidence??[])).find(value=>value!==undefined);
    if(!retained)throw new Error('GitHub intake readback dropped related source documents');
    for(const document of [prepared.document,...documents]){
      const expected=receipt.sourceEvidence?.find(value=>value.offered===document.commitment)?.retained;
      const actual=retained.find(value=>value.offered.commitment===document.commitment)?.retained.commitment;
      if(!expected||actual!==expected)throw new Error('GitHub intake readback substituted a selected source carrier');
    }
    for(const document of documents)readGitHubSourceDocument(document);
    results.push({source:material.html_url,...receipt,relatedSources:documents.map(document=>{const received=retained.find(value=>value.offered.commitment===document.commitment)?.retained;return {offered:document.commitment,retained:received?.commitment,offeredSourceRetained:received?.locator===document.locator};})});
  }
  return {kind:'metroplat.github-native-intake',repository,observed:items.length,played:results.filter(value=>value.stages?.nativeAdmitted&&!value.replay).length,items:results};
}
