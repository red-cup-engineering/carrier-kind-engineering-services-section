import {existsSync} from 'node:fs';
import {createProviderCommandBoundary} from './provider-command.mjs';
import {observeOciComputeResources} from './observe-oci-compute-resources.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.length > 0;
const unavailable = reason => ({status:'unavailable',reason});
const envName = value => typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/u.test(value);

async function observeCloudflare(configuration, environment, loadCloudflare) {
  if (configuration === undefined) return {status:'credential-unavailable'};
  const fields = ['accountIdEnvironmentVariable','inventoryTokenEnvironmentVariable',
    'buildTokenEnvironmentVariable','r2TokenEnvironmentVariable'];
  if (!object(configuration) || fields.some(key=>!envName(configuration[key])))
    throw new TypeError('Cloudflare observation needs distinct explicit credential environment names');
  if (new Set(fields.slice(1).map(key=>configuration[key])).size !== 3)
    throw new TypeError('Cloudflare credential roles must be separately named');
  const accountId = environment[configuration.accountIdEnvironmentVariable];
  const available = key => text(environment[configuration[key]]);
  if (!text(accountId) || !fields.slice(1).some(available)) return {status:'credential-unavailable'};
  let provider;
  try { provider = await loadCloudflare(); }
  catch { return unavailable('reader-unavailable'); }
  let workersBuildMinutes = unavailable('user-scoped-ci-token-unavailable');
  if (available('buildTokenEnvironmentVariable')) {
    try {
      const reading = await provider.observeCloudflareBuildMinutes({accountId,
        tokenEnvironmentVariable:configuration.buildTokenEnvironmentVariable}, {environment});
      workersBuildMinutes = reading?.type === 'CloudflareWorkersBuildMinutesObservation'
        ? {status:reading.status,observedAt:reading.observedAt,refreshAt:reading.refreshAt}
        : unavailable('native-build-observation-refused');
    } catch { workersBuildMinutes = unavailable('native-build-observation-failed'); }
  }
  let r2Buckets = unavailable('R2-read-custody-unavailable');
  if (available('r2TokenEnvironmentVariable')) {
    try {
      const reading = await provider.observeCloudflareR2Buckets({accountId,
        tokenEnvironmentVariable:configuration.r2TokenEnvironmentVariable}, {environment});
      r2Buckets = reading?.type === 'CloudflareR2BucketObservation' && Array.isArray(reading.buckets)
        ? {status:'observed',observedAt:reading.observedAt,coverage:reading.coverage,
          buckets:reading.buckets.map(bucket=>({name:bucket.name,jurisdiction:bucket.jurisdiction??null,
            location:bucket.location??null,storageClass:bucket.storageClass??null})),
          objectInventory:'unobserved',rightsToResell:'unverified'}
        : unavailable('native-r2-read-refused');
    } catch { r2Buckets = unavailable('native-r2-read-failed'); }
  }
  const independent = {workersBuildMinutes,r2Buckets,
    ...(r2Buckets.status==='observed'?{accountId}:{})};
  if (!available('inventoryTokenEnvironmentVariable'))
    return {status:'inventory-credential-unavailable',...independent};
  try {
    const reading = await provider.deriveCloudflareAccountInventory({accountId,
      tokenEnvironmentVariable:configuration.inventoryTokenEnvironmentVariable}, {environment});
    return reading?.type === 'CloudflareAccountInventory' && Array.isArray(reading.workers)
      && Array.isArray(reading.customDomains) && Array.isArray(reading.zones)
      && reading.zones.every(zone=>object(zone)&&Array.isArray(zone.records))
      && object(reading.counts) && ['zones','records','workers','customDomains']
        .every(key=>Number.isSafeInteger(reading.counts[key])&&reading.counts[key]>=0)
      ? {status:'observed',accountId,...independent,
        counts:Object.fromEntries(['zones','records','workers','customDomains'].map(key=>[key,reading.counts[key]])),
        zones:reading.zones.map(zone=>({name:zone.name,status:zone.status,
          destinations:zone.records.filter(record=>['A','AAAA','CNAME'].includes(record?.type))
            .map(record=>({type:record.type,name:record.name,content:record.content,proxied:record.proxied}))})),
        workers:reading.workers.map(worker=>({name:worker.id,modifiedOn:worker.modifiedOn})),
        customDomains:reading.customDomains.map(domain=>({hostname:domain.hostname,service:domain.service,zoneName:domain.zoneName}))}
      : {...unavailable('native-inventory-refused'),...independent};
  } catch { return {...unavailable('native-inventory-failed'),...independent}; }
}

/** Compose established provider reads for one explicit instance configuration.
 * The caller owns envelope kind, instance policy, custody and publication.
 */
export async function observeComputeResources(configuration, seams = {}) {
  if (!object(configuration) || !object(configuration.googleCloud) || !object(configuration.oracleCloud)
      || !Array.isArray(configuration.machines) || !configuration.machines.every(object)
      || !text(configuration.coverage) || !text(configuration.placementRule))
    throw new TypeError('provider observation needs explicit instance configuration');
  if (configuration.ssh !== undefined && (!object(configuration.ssh)
      || !text(configuration.ssh.alias) || !object(configuration.ssh.machine)))
    throw new TypeError('SSH observation needs its explicit alias and machine description');
  if (typeof seams.observeGoogleCloud !== 'function')
    throw new TypeError('provider observation requires its Google Cloud provider capability');
  const environment = seams.environment ?? process.env, exists = seams.exists ?? existsSync;
  const boundary = createProviderCommandBoundary({...seams,environment,exists});
  const observedAt = new Date((seams.clock ?? (()=>new Date()))()).toISOString();
  const {accounts,accountStatus,...googleCloud} = await seams.observeGoogleCloud(
    configuration.googleCloud,boundary);
  const {credentialProfiles,...oracleCloud} = await observeOciComputeResources(configuration.oracleCloud,
    {...seams,environment,jsonCommand:boundary.jsonCommand});
  const cloudflare = await observeCloudflare(configuration.cloudflare,environment,
    seams.loadCloudflare ?? (()=>import('@red-cup-engineering/cloudflare-services-section/derive-cloudflare-account-inventory')));
  let hostname;
  if (configuration.ssh) {
    const ssh = await boundary.command('ssh',['-G',configuration.ssh.alias]);
    hostname = ssh.status==='observed' ? ssh.text.match(/^hostname (.+)$/mu)?.[1] : undefined;
  }
  const locators = configuration.credentials ?? {}, credentials = [];
  if (!object(locators)) throw new TypeError('credential locator descriptions must be data');
  if (locators.googleCloud) credentials.push({provider:'google-cloud',locator:locators.googleCloud.locator,
    configured:locators.googleCloud.credentialsFile ? exists(locators.googleCloud.credentialsFile) : accounts.length>0,
    accounts,accountStatus,secretValuesRecorded:false});
  if (locators.oracleCloud) credentials.push({provider:'oracle-cloud',locator:locators.oracleCloud.locator,
    profiles:credentialProfiles??(oracleCloud.profiles??[]).map(name=>({name})),
    configured:(oracleCloud.profiles?.length??0)>0,secretValuesRecorded:false});
  if (locators.cloudflare) credentials.push({provider:'cloudflare',locator:locators.cloudflare.locator,
    environmentKeys:configuration.cloudflare ? Object.values(configuration.cloudflare).filter(name=>envName(name)&&text(environment[name])).sort() : [],
    configured:configuration.cloudflare ? text(environment[configuration.cloudflare.accountIdEnvironmentVariable])
      && ['inventoryTokenEnvironmentVariable','buildTokenEnvironmentVariable','r2TokenEnvironmentVariable']
        .some(key=>text(environment[configuration.cloudflare[key]])) : false,secretValuesRecorded:false});
  if (locators.ssh) credentials.push({provider:'ssh',locator:locators.ssh.locator,
    configured:Boolean(hostname),secretValuesRecorded:false});
  return {observedAt,coverage:configuration.coverage,placement:configuration.placementRule,
    credentials,machines:[...configuration.machines,
      ...(hostname?[{...configuration.ssh.machine,hostname}]:[])],googleCloud,oracleCloud,cloudflare};
}
