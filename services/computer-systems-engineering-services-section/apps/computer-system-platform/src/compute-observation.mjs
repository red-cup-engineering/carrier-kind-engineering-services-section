/** Refresh and admit a native compute reading. The caller owns instance policy;
 * provider readers own collection, and SEAVT owns witness and frontier custody. */
import { mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, join, isAbsolute, resolve } from 'node:path';
import { put, withFileLock } from '@red-cup-engineering/semiotic-eavt-services-section/store';
import { compareAbsoluteSeavtClocks } from '@red-cup-engineering/semiotic-eavt-services-section/admit-seavt-row';
import { writeFileAtomic } from '@red-cup-engineering/computer-system-engine/filesystem';
import { createCausalResourceHead } from '@red-cup-engineering/semiotic-eavt-services-section/causal-resource-head';
import { semanticId } from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';
import { projectCloudResourceClaims } from './cloud-resource-claims.mjs';
import { observeComputeResources } from './observe-compute-resources.mjs';

export function validateComputeObservationPolicy(policy) {
  for (const key of ['recordKind', 'resourceRecordType', 'witnessType', 'event',
    'predicationsKind', 'currentKind', 'witnessKind', 'objectKind', 'valueType', 'recordFile']) {
    if (typeof policy?.[key] !== 'string' || !policy[key].trim())
      throw new TypeError(`compute observation requires explicit ${key}`);
  }
  if (isAbsolute(policy.recordFile) || policy.recordFile.split(/[\\/]/u).some(x => ['', '.', '..'].includes(x)))
    throw new TypeError('compute observation recordFile must be a confined relative file');
  if (!Number.isSafeInteger(policy.freshnessMs) || policy.freshnessMs <= 0)
    throw new TypeError('compute observation requires a positive freshnessMs');
  return policy;
}

/** Bind freshness to declared non-secret scope, never credential values.
 * Native account evidence still belongs to the observation, not this selector. */
export function computeObservationScope(observation, environment) {
  if (!observation || typeof observation !== 'object' || Array.isArray(observation))
    throw new TypeError('compute observation requires its declared provider scope');
  const accountKey = observation.cloudflare?.accountIdEnvironmentVariable;
  return semanticId({ observation, selectors: {
    home: environment.HOME ?? null,
    googleConfig: environment.CLOUDSDK_CONFIG ?? null,
    googleActiveConfiguration: environment.CLOUDSDK_ACTIVE_CONFIG_NAME ?? null,
    googleAccount: environment.CLOUDSDK_CORE_ACCOUNT ?? null,
    googleImpersonatedAccount: environment.CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT ?? null,
    googleCredentialFile: environment.CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE ?? null,
    googleAccessTokenFile: environment.CLOUDSDK_AUTH_ACCESS_TOKEN_FILE ?? null,
    oracleProfile: observation.oracleCloud?.profile ?? environment.OCI_PROFILE ?? environment.OCI_CLI_PROFILE ?? null,
    oracleConfigFile: observation.oracleCloud?.configFile ?? environment.OCI_CONFIG_FILE
      ?? (environment.HOME ? join(environment.HOME, '.oci/config') : null),
    cloudflareAccount: accountKey ? environment[accountKey] ?? null : null,
  } });
}

function readObservationFile(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { if (error?.code !== 'ENOENT') throw error; }
}

export async function refreshComputeResourceObservation({
  dataRoot, policy, observation, environment = process.env,
  now = () => new Date().toISOString(), observe = observeComputeResources,
}) {
  validateComputeObservationPolicy(policy);
  if (typeof dataRoot !== 'string' || !dataRoot) throw new TypeError('compute observation requires its data root');
  const observationScope = computeObservationScope(observation, environment);
  const declaredPath = resolve(dataRoot, policy.recordFile);
  mkdirSync(dirname(declaredPath), { recursive: true });
  // Canonical parent identity makes different root/path aliases take one lock.
  const path = join(realpathSync(dirname(declaredPath)), basename(declaredPath));
  const initial = readObservationFile(path);
  const initialIdentity = initial === undefined ? null : semanticId(initial);
  const age = Date.parse(now()) - Date.parse(initial?.observedAt);
  const refreshed = initial?.kind !== policy.recordKind || initial?.observationScope !== observationScope
    || !Number.isFinite(age) || age < 0 || age >= policy.freshnessMs;
  const record = refreshed
    ? { ...await observe(observation, { environment, clock: now }), kind: policy.recordKind, observationScope }
    : initial;
  // Provider collection is complete before taking the existing store lock.
  // This callback is deliberately synchronous and non-reentrant. Its distinct
  // publication lock never aliases the nested native resource-head locks.
  // The store's 15s wait / 30s stale-reclaim contract is inherited, not fencing.
  return withFileLock(`${path}.publication.lock`, () => {
    const current = readObservationFile(path);
    if (initial !== undefined && current === undefined)
      throw new TypeError('compute observation disappeared during collection');
    const facts = projectCloudResourceClaims(record, policy);
    const currentFacts = current === undefined ? null : projectCloudResourceClaims(current, policy);
    if (current && current.observationScope !== observationScope
        && semanticId(current) !== initialIdentity)
      throw new TypeError('compute observation scope changed during collection');
    const order = current === undefined ? 1 : compareAbsoluteSeavtClocks(record.observedAt, current.observedAt);
    if (current && current.observationScope !== observationScope && order <= 0)
      throw new TypeError('compute observation cannot replace a different scope without a newer observation');
    const head = createCausalResourceHead({ recordType: policy.resourceRecordType,
      witnessType: policy.witnessType, event: policy.event });
    function admit(record, facts) {
      const witness = put(dataRoot, policy.witnessType, facts.witnessRecord);
      if (witness !== facts.observationWitness)
        throw new TypeError('SCA witness record address differs from its SignCell address');
      return facts.rows.map(row => head.receive(dataRoot, row));
    }
    // Retain genuine older or simultaneous evidence under native head law.
    const accepted = admit(record, facts);
    if (order === 0 && semanticId(record) !== semanticId(current))
      throw new TypeError('compute observation is contested at the same source time');
    if (order < 0) return { record: current, facts: currentFacts,
      accepted: admit(current, currentFacts), refreshed: false };
    if (order === 0) return { record: current, facts: currentFacts, accepted, refreshed: false };
    writeFileAtomic(path, JSON.stringify(record) + '\n', { mode: 0o600 });
    return { record, facts, accepted, refreshed };
  });
}
