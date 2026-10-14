// Pure admission for the existing OCI launcher. No new cloud scheduler, state,
// credentials, or machine registry. Call with provider-native complete readings.
// These are conservative 561 Group Always Free bounds, NOT a billing guarantee.
const A1 = 'VM.Standard.A1.Flex';
const MICRO = 'VM.Standard.E2.1.Micro';
const whole = (n,min,max) => Number.isSafeInteger(n) && n>=min && n<=max;
const active = x => !['TERMINATED', 'DELETED'].includes(x?.['lifecycle-state']);
const array = (value,name) => {
  if (!Array.isArray(value)) throw new TypeError('incomplete OCI '+name+' reading');
  return value;
};
const getId = (x,name) => {
  if(typeof x?.id!=='string'||!x.id)throw new TypeError('missing '+name+' id');
  return x.id;
};

export function requireAlwaysFreeRequest({shape,ocpus,memoryGBs,bootGB}){
  if(shape!==A1 && shape!==MICRO)throw new TypeError('unsupported Always Free shape');
  if(!whole(bootGB,50,200))throw new TypeError('boot volume is outside conservative 50-200 GB Always Free boundary');
  if(shape===A1 && (!whole(ocpus,1,2)||!whole(memoryGBs,1,12)||memoryGBs<ocpus))
    throw new TypeError('A1 request exceeds conservative 2 OCPU / 12 GB Always Free boundary');
  if(shape===MICRO&&(ocpus!==undefined||memoryGBs!==undefined))
    throw new TypeError('E2 Micro does not accept an explicit flexible shape config');
  return Object.freeze({shape,ocpus:shape===A1?ocpus:undefined,
    memoryGBs:shape===A1?memoryGBs:undefined,bootGB});
}

/** No 'availability' label is inferred from the published Always Free terms.
 * The caller must enumerate all active instances, boot volumes and block
 * volumes across every accessible compartment of the home-region tenancy.
 */
export function requireAlwaysFreeHeadroom(request,{instances,bootVolumes,blockVolumes,containerInstances}){
  const r=requireAlwaysFreeRequest(request);
  const seenInstances=new Set(),seenVolumes=new Set(),seenContainers=new Set();
  // OCI A1 Container Instances share the Compute A1 quota. This VM launcher
  // cannot promise a zero-bill mixed resource pool while an A1 container
  // instance also consumes that allowance. Refuse rather than ignore it.
  for(const container of array(containerInstances,'container instances')){
    const id=getId(container,'container instance');
    if(seenContainers.has(id))throw new TypeError('duplicate OCI container instance in provider reading');
    seenContainers.add(id);
    if(!active(container))continue;
    if(typeof container.shape!=='string'||!container.shape)
      throw new TypeError('OCI container shape consumption is unavailable');
    if(container.shape==='CI.Standard.A1.Flex')
      throw new RangeError('A1 container usage requires a shared-pool capacity receiver');
  }
  let usedOcpus=0,usedMemoryGBs=0,usedMicro=0,usedStorageGB=0;
  for(const instance of array(instances,'instances')){
    const id=getId(instance,'instance');
    if(seenInstances.has(id))throw new TypeError('duplicate OCI instance in provider reading');
    seenInstances.add(id);
    if(!active(instance))continue;
    if(instance.shape===A1){
      const config=instance['shape-config'];
      const cpu=config?.ocpus, memory=config?.['memory-in-gbs'];
      if(typeof cpu!=='number'||!Number.isFinite(cpu)||cpu<=0
          ||typeof memory!=='number'||!Number.isFinite(memory)||memory<=0)
        throw new TypeError('A1 shape consumption is unavailable');
      usedOcpus+=cpu; usedMemoryGBs+=memory;
    }else if(instance.shape===MICRO)usedMicro++;
  }
  for(const [kind,volumes] of [['boot volumes',bootVolumes],['block volumes',blockVolumes]]){
    for(const volume of array(volumes,kind)){
      const id=getId(volume,'volume');
      if(seenVolumes.has(id))throw new TypeError('duplicate OCI volume in provider reading');
      seenVolumes.add(id);
      if(!active(volume))continue;
      const size=volume['size-in-gbs'];
      if(typeof size!=='number'||!Number.isFinite(size)||size<=0)
        throw new TypeError('OCI volume consumption is unavailable');
      usedStorageGB+=size;
    }
  }
  if(usedOcpus+(r.ocpus??0)>2 || usedMemoryGBs+(r.memoryGBs??0)>12
      || usedMicro+(r.shape===MICRO?1:0)>2 || usedStorageGB+r.bootGB>200)
    throw new RangeError('tenancy-wide Always Free allocation would be exceeded');
  return Object.freeze({qualified:'conservative-always-free-envelope',
    // Source-only snapshot; an OCI list result neither proves billing status nor
    // creates a reservation against another actor's future allocation.
    observedUsage:Object.freeze({
      ocpus:String(usedOcpus),memoryGBs:String(usedMemoryGBs),
      microInstances:String(usedMicro),bootAndBlockGB:String(usedStorageGB),
    }),
    requested:Object.freeze({
      ocpus:String(r.ocpus??0),memoryGBs:String(r.memoryGBs??0),
      microInstances:String(r.shape===MICRO?1:0),bootAndBlockGB:String(r.bootGB),
    }),
    remainingOcpus:2-usedOcpus-(r.ocpus??0),
    remainingMemoryGBs:12-usedMemoryGBs-(r.memoryGBs??0),
    remainingMicroInstances:2-usedMicro-(r.shape===MICRO?1:0),
    remainingBootAndBlockGB:200-usedStorageGB-r.bootGB,
    billingVerified:false});
}

/** The Oracle service limit can be stricter than the free envelope or report
 * no availability while physical host stock remains constrained.
 */
export function providerAvailabilityAllows(request,values){
  const r=requireAlwaysFreeRequest(request);
  const need=r.shape===A1
    ? {'standard-a1-core-count':r.ocpus,'standard-a1-memory-count':r.memoryGBs}
    : {'standard-e2-micro-core-count':1};
  return Object.entries(need).every(([key,demand])=>{
    const available=values?.[key];
    return typeof available==='number'&&Number.isFinite(available)&&available>=demand;
  });
}

/** Bind the native OCI credential *profile name*, never credential values.
 * An explicit principal wins, but it must actually exist on this author host.
 * Without one, exactly one machine-owned API_KEY profile may be selected;
 * conflicting principals refuse instead of falling back to stale host names.
 */
export function selectOciProfile(configSource, environment = {}) {
  if (typeof configSource !== 'string' || !configSource.trim())
    throw new TypeError('OCI configured principals are unavailable');
  const names = [...configSource.matchAll(/^\[([^\]]+)\]\s*$/gmu)].map(m=>m[1]);
  if (!names.length || new Set(names).size !== names.length)
    throw new TypeError('OCI profile declaration is absent or ambiguous');
  const selected = environment.OCI_PROFILE ?? environment.OCI_CLI_PROFILE;
  if (selected !== undefined) {
    if (typeof selected !== 'string' || !names.includes(selected))
      throw new TypeError('selected OCI profile does not exist in native credential custody');
    return selected;
  }
  const keys = names.filter(name=>name.endsWith('_API_KEY'));
  if (keys.length === 1) return keys[0];
  if (keys.length === 0 && names.length === 1) return names[0];
  throw new TypeError('more than one potential OCI principal; specify OCI_PROFILE');
}

/** OCI Container Instances list endpoints return a *collection object* with
 * an items array, unlike ordinary Compute list endpoints. The existing CLI's
 * --all requests all pages. Accept only complete supported payload forms; a
 * missing collection is never evidence that no containers are consuming A1.
 */
export function receiveOciContainerCollection(value) {
  const data = value?.data;
  const items = Array.isArray(data) ? data
    : (data && typeof data === 'object' && !Array.isArray(data) ? data.items : null);
  if (!Array.isArray(items)) throw new TypeError('OCI container instances inventory is incomplete');
  if (items.some(item => !item || typeof item !== 'object' || Array.isArray(item)))
    throw new TypeError('OCI container instances inventory contains invalid items');
  return items;
}

/** OCI CLI stderr is untrusted and can contain tenancy identifiers or other
 * private data. Classify known *provider error kinds* for external receiving,
 * never its full message. Quota headroom does not imply physical host stock.
 */
export function classifyOciLaunchRefusal(detail) {
  if (typeof detail !== "string") return "unclassified";
  if (/OutOfHostCapacity|NoHostCapacity|out of host capacity|insufficient host capacity/iu.test(detail))
    return "host-capacity-unavailable";
  if (/TooManyRequests|Throttl|RateLimit|rate.limit/iu.test(detail))
    return "provider-rate-limited";
  if (/LimitExceeded|ServiceLimitExceeded|QuotaExceeded/iu.test(detail))
    return "provider-limit-exceeded";
  if (/NotAuthenticated|NotAuthorizedOrNotFound|Forbidden|Unauthorized|AuthorizationFailed/iu.test(detail))
    return "provider-authorization-refused";
  if (/InvalidParameter|InvalidRequest|InvalidShape|MissingParameter|InvalidImage|ValidationError/iu.test(detail))
    return "invalid-provisioning-request";
  if (/InternalError|ServiceUnavailable|InternalServerError|ServiceError.*5[0-9][0-9]/iu.test(detail))
    return "provider-service-unavailable";
  return "unclassified";
}

/**
 * Interpret a qualified provider-native inventory in dimensioned, actor-safe
 * observations. Never create a tradable lot or assign an intrinsic price:
 * source attestation, recipient authority and billing remain separate.
 */
export function projectOciAlwaysFreeCapacity(request, headroom, {homeRegion, observedAt, qualifiedDomains, domainsObserved}={}){
  const r=requireAlwaysFreeRequest(request);
  if(typeof homeRegion!=='string'||!homeRegion||typeof observedAt!=='string'||!Number.isFinite(Date.parse(observedAt))||
     !Number.isSafeInteger(qualifiedDomains)||qualifiedDomains<0||
     !Number.isSafeInteger(domainsObserved)||domainsObserved<1||qualifiedDomains>domainsObserved||
     !headroom||headroom.qualified!=='conservative-always-free-envelope'||headroom.billingVerified!==false)
    throw new TypeError('complete source-qualified Oracle capacity observation required');
  const dimensions=[
    ['compute.oracle.a1','OCPU','ocpus',String(headroom.remainingOcpus)],
    ['compute.oracle.a1-memory','GB','memoryGBs',String(headroom.remainingMemoryGBs)],
    ['compute.oracle.e2-micro','instance','microInstances',String(headroom.remainingMicroInstances)],
    ['storage.oracle.boot-block','GB','bootAndBlockGB',String(headroom.remainingBootAndBlockGB)],
  ];
  return Object.freeze({
    type:'OciAlwaysFreeCapacityObservation',
    provider:'oracle-cloud-infrastructure',
    source:'OCI-CLI-enumerated-home-region-inventory-and-service-limits',
    observedAt,homeRegion,shape:r.shape,qualifiedDomains,domainsObserved,
    readings:Object.freeze(dimensions.map(([resourceClass,unit,key,remaining])=>Object.freeze({
      type:'ResourceCapacityReading',resourceClass,unit,
      observedConsumption:headroom.observedUsage?.[key]??null,
      proposedReservation:headroom.requested?.[key]??null,
      remainingAfterProposal:remaining,
      quantitySource:'provider-inventory-plus-conservative-local-envelope',
      pricedCost:null,availableForSale:false,independentlyReceived:false,
    }))),
    unknowns:Object.freeze({
      actualBilling:null,entitlementLegalOwner:null,physicalHostCapacity:null,
      rateLimitReset:null,competingAllocations:null,
    }),
  });
}
