import {readFile as readNativeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {address,utteranceCell} from '@red-cup-engineering/signcell/cell';
import {selectOciProfile} from '../scripts/oci-always-free-admission.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.length > 0;
const unavailable = reason => ({status:'unavailable',reason});
const observed = reading => reading?.status === 'observed';
function collection(reading, valid) {
  if (!observed(reading)) return reading;
  return object(reading.value) && Array.isArray(reading.value.data) && reading.value.data.every(valid)
    ? reading : unavailable('invalid-native-list');
}
function field(source, profile, key) {
  const sections = source.split(/^\[([^\]]+)\]\s*$/gmu), index = sections.indexOf(profile);
  return index < 0 ? undefined : sections[index+1].match(new RegExp(`^${key}\\s*=\\s*(.+)$`,'mu'))?.[1]?.trim();
}

/** Read-only OCI inventory, reusing the established native-principal selector.
 * This module never imports the effectful launch CLI or produces launch authority.
 */
export async function observeOciComputeResources(configuration = {}, {
  jsonCommand, environment = process.env, readFile = readNativeFile,
} = {}) {
  if (!object(configuration) || typeof jsonCommand !== 'function')
    throw new TypeError('OCI observation needs configuration and a command boundary');
  const configFile = configuration.configFile ?? environment.OCI_CONFIG_FILE
    ?? (environment.HOME ? join(environment.HOME,'.oci/config') : null);
  if (!nonempty(configFile)) return {status:'credential-unavailable',profiles:[]};
  let source;
  try { source = await readFile(configFile,'utf8'); }
  catch { return {status:'credential-unavailable',profiles:[]}; }
  if (typeof source !== 'string') return {...unavailable('invalid-native-profile-source'),profiles:[]};
  const profiles = [...source.matchAll(/^\[([^\]]+)\]\s*$/gmu)].map(match=>match[1]);
  // A key-file locator is retained as metadata; its contents are never read.
  const credentialProfiles = profiles.map(name=>({name,keyFile:field(source,name,'key_file')}));
  let profile;
  try { profile = selectOciProfile(source, {...environment,
    ...(configuration.profile === undefined ? {} : {OCI_PROFILE:configuration.profile})}); }
  catch { return {...unavailable('ambiguous-or-invalid-profile'),profiles,credentialProfiles}; }
  const tenancy = field(source,profile,'tenancy'), region = field(source,profile,'region');
  if (!nonempty(tenancy)) return {...unavailable('tenancy-not-configured'),profiles,credentialProfiles,selectedProfile:profile};
  const oci = args => jsonCommand(environment.OCI_CLI ?? 'oci', [...args,
    '--profile',profile,'--config-file',configFile,'--output','json'],
    {OCI_CLI_AUTH:'api_key',SUPPRESS_LABEL_WARNING:'True'});
  let tenancyReading = await oci(['iam','tenancy','get','--tenancy-id',tenancy]);
  if (observed(tenancyReading) && (!object(tenancyReading.value?.data)
      || !nonempty(tenancyReading.value.data.name)
      || (tenancyReading.value.data.id !== undefined && tenancyReading.value.data.id !== tenancy)))
    tenancyReading = unavailable('invalid-native-tenancy');
  const regions = collection(await oci(['iam','region-subscription','list','--tenancy-id',tenancy]),
    row=>object(row)&&nonempty(row['region-name']));
  const compartments = collection(await oci(['iam','compartment','list','--compartment-id',tenancy,
    '--compartment-id-in-subtree','true','--access-level','ANY','--all']),row=>object(row)&&nonempty(row.id));
  const ids = [tenancy,...(observed(compartments)?compartments.value.data
    .filter(row=>row['lifecycle-state']===undefined||row['lifecycle-state']==='ACTIVE').map(row=>row.id):[])];
  if (new Set(ids).size !== ids.length)
    return {...unavailable('ambiguous-compartment-identity'),profiles,credentialProfiles,selectedProfile:profile};
  const namespaceReading = await oci(['os','ns','get','--compartment-id',tenancy]);
  const namespace = observed(namespaceReading)&&nonempty(namespaceReading.value?.data)
    ? namespaceReading.value.data : null;
  const buckets=[],instances=[];
  for (const id of ids) {
    const bucketReading = namespace ? collection(await oci(['os','bucket','list','--compartment-id',id,
      '--namespace-name',namespace,'--all']),row=>object(row)&&nonempty(row.name))
      : unavailable('namespace-unavailable');
    buckets.push({compartmentId:id,status:bucketReading.status,...(observed(bucketReading)
      ? {items:bucketReading.value.data.map(item=>({name:item.name,namespace:item.namespace??namespace,
        storageTier:item['storage-tier']??null}))} : {reason:bucketReading.reason})});
    const instanceReading = collection(await oci(['compute','instance','list','--compartment-id',id,'--all']),
      row=>object(row)&&nonempty(row.id)&&nonempty(row['display-name']));
    instances.push({compartmentId:id,status:instanceReading.status,...(observed(instanceReading)
      ? {items:instanceReading.value.data.map(item=>({nativeIdentity:item.id,name:item['display-name'],
        state:item['lifecycle-state'],shape:item.shape,availabilityDomain:item['availability-domain']}))}
      : {reason:instanceReading.reason})});
  }
  const complete = observed(compartments)&&instances.every(row=>observed(row));
  return {status:tenancyReading.status,...(!observed(tenancyReading)?{reason:tenancyReading.reason}:{}),
    tenancyIdentity:address(utteranceCell('oci-native-tenancy-coordinate',{tenancy})),
    tenancyName:observed(tenancyReading)?tenancyReading.value.data.name:undefined,
    configuredRegion:region,profiles,credentialProfiles,selectedProfile:profile,
    subscribedRegions:observed(regions)?regions.value.data.map(row=>row['region-name']):[],
    subscribedRegionsStatus:regions.status,
    compartmentCoverage:observed(compartments)?'complete':'incomplete',
    compartments:observed(compartments)?compartments.value.data.map(row=>({name:row.name,id:row.id})):[],
    inventoryCoverage:complete?'complete':'incomplete',instances,
    objectStorage:{status:namespace?'observed':'unavailable',namespaceObserved:Boolean(namespace),
      coverage:namespace&&observed(compartments)&&buckets.every(row=>observed(row))?'complete':'incomplete',buckets},
  };
}
