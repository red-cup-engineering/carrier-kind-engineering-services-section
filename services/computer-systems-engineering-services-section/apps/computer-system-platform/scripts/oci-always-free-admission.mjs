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
  const seenInstances=new Set(),seenVolumes=new Set();
  // OCI A1 Container Instances share the Compute A1 quota. This VM launcher
  // cannot promise a zero-bill mixed resource pool while an A1 container
  // instance also consumes that allowance. Refuse rather than ignore it.
  for(const container of array(containerInstances,'container instances')){
    const id=getId(container,'container instance');
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
