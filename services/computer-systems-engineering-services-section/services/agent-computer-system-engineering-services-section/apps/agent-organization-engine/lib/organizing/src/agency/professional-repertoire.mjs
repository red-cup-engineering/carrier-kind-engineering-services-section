/**
 * The Academy's professional repertoire AS OPERATIONS DATA, not a house
 * agency registry. These office forms are NOT incumbencies or grants.
 * This is a read-only, source-qualified consumer of the original authored
 * catalog and office/duty/work records; it never writes source or markets.
 *
 * The corpus root, DECLARED Git revision, and authorized reader are
 * supplied by the consuming instance. The content identity is derived from observed bytes, never inferred\n * from a caller's Git commit declaration. Never infer a checkout from cwd.
 */
import { createHash } from 'node:crypto';
import { readFile, realpath, readdir } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { makeNiUri } from '@red-cup-engineering/uri-services-section/ni-uri';

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SHA = /^sha256:[a-f0-9]{64}$/u;
const KINDS = Object.freeze(['offices', 'duties', 'works']);
// Witnessed across all 31 original Academy office forms, not inferred synonyms.
const POSITION_KINDS = new Set(['duty', 'deontic-power', 'deontic-immunity', 'liberty']);
const CATALOG = 'content/catalogs/professional-repertoire.json';
const fail = message => { throw new TypeError('professional repertoire: ' + message); };
const digest = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const checked = (condition, message) => { if (!condition) fail(message); };
const validStrings = (values, name) => {
  checked(Array.isArray(values), name + ' must be an array');
  checked(values.every(value => typeof value === 'string' && value.trim() !== ''), name + ' must contain nonempty strings');
  return values;
};
function exactReference(ref, label) {
  checked(typeof ref === 'string' && !ref.includes('\\') && !ref.includes('\0'), label + ' must be a relative source path');
  checked(!ref.startsWith('/') && ref.split('/').every(piece => piece && piece !== '.' && piece !== '..'), label + ' must be confined');
  return ref;
}
function idOf(reference) {
  checked(typeof reference === 'string', 'duty reference must be a string');
  const parts = reference.split('/');
  const id = parts.at(-1);
  checked(ID.test(id) && parts.every(part => ID.test(part)), 'duty reference must have canonical path segments');
  return id;
}
function normalizedEntry(kind, entry) {
  checked(entry && typeof entry === 'object' && !Array.isArray(entry), kind + ' catalog item must be an object');
  checked(ID.test(entry.id), kind + ' catalog id is not canonical');
  const expected = 'content/professional-repertoire/' + kind + '/' + entry.id + '.json';
  checked(entry.canonicalPath === expected, 'wrong authored ' + kind + ' path for ' + entry.id);
  checked(SHA.test(entry.digest), 'missing exact source hash for ' + entry.id);
  return Object.freeze({ id: entry.id, path: entry.canonicalPath, digest: entry.digest });
}
function sourceIri(owner, commit, path) {
  return 'https://github.com/' + owner + '/blob/' + commit + '/' + path.split('/').map(encodeURIComponent).join('/');
}
function sourceIdentity(source) {
  checked(source && typeof source === 'object', 'source selection is required');
  const { repository, commit, pathPrefix } = source;
  checked(typeof repository === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository), 'source repository must identify an owner/repository');
  checked(typeof commit === 'string' && /^[a-f0-9]{40}$/u.test(commit), 'immutable source commit is required');
  exactReference(pathPrefix, 'source section prefix');
  checked(pathPrefix.split('/').every(part => ID.test(part)), 'source section prefix must contain named source sections');
  return Object.freeze({ repository, commit, pathPrefix });
}
/**
 * Full source scan of all source-authoritative professional forms.
 * A catalog is not an inventory coverage certificate: all declared bytes
 * are read and digested, and all counts checked before returning a result.
 */
export async function readProfessionalRepertoire({ root, source, load = readFile, resolveReal = realpath, listDirectory = readdir } = {}) {
  checked(typeof root === 'string' && isAbsolute(root), 'installed absolute Operations corpus root is required');
  checked(typeof load === 'function' && typeof resolveReal === 'function' && typeof listDirectory === 'function', 'source reader functions are required');
  const owner = sourceIdentity(source);
  const absoluteRoot = await resolveReal(root);
  const read = async (path) => {
    exactReference(path, 'source');
    const absolute = resolve(root, path);
    const actual = await resolveReal(absolute);
    if (relative(absoluteRoot, actual).startsWith('..' + sep) || actual === absoluteRoot || relative(absoluteRoot, actual) === '..' || isAbsolute(relative(absoluteRoot, actual))) {
      fail('source path resolves outside the selected corpus');
    }
    const bytes = await load(actual);
    checked(bytes instanceof Uint8Array, 'complete source bytes required: ' + path);
    return { bytes, sha256: digest(bytes), path, iri: makeNiUri(bytes), declaredGitSource: sourceIri(owner.repository, owner.commit, owner.pathPrefix + '/' + path) };
  };
  const carrier = await read(CATALOG);
  let catalog;
  try { catalog = JSON.parse(Buffer.from(carrier.bytes).toString('utf8')); }
  catch { fail('catalog is not valid JSON'); }
  checked(catalog?.id === 'union-professional-repertoire' && catalog.owner === 'union-officer-academy' &&
    catalog.appointmentAuthority === false, 'repertoire is not a non-appointing Academy source');
  const index = {}, records = {}, seen = new Set();
  for (const kind of KINDS) {
    checked(Array.isArray(catalog[kind]) && catalog[kind].length > 0, kind + ' source denominator absent');
    checked(catalog.counts?.[kind] === catalog[kind].length, kind + ' catalog count mismatches source denominator');
    index[kind] = catalog[kind].map(row => normalizedEntry(kind, row));
    checked(new Set(index[kind].map(entry => entry.id)).size === index[kind].length,
      'duplicate ' + kind + ' source id');
    // A catalog's count alone can hide deleted or never-listed original files.
    // Qualify the physical source directory before declaring coverage.
    const directoryPath = 'content/professional-repertoire/' + kind;
    const actualDirectory = await resolveReal(resolve(root, directoryPath));
    const relativeDirectory = relative(absoluteRoot, actualDirectory);
    checked(relativeDirectory !== '..' && !relativeDirectory.startsWith('..' + sep) &&
      !isAbsolute(relativeDirectory) && actualDirectory !== absoluteRoot,
      'professional source directory escapes the original source root');
    const names = await listDirectory(actualDirectory);
    checked(Array.isArray(names) && names.every(name => typeof name === 'string'),
      'physical source directory must yield complete entry names');
    const observedJson = names.filter(name => name.endsWith('.json')).sort();
    const declaredJson = index[kind].map(entry => entry.id + '.json').sort();
    checked(JSON.stringify(observedJson) === JSON.stringify(declaredJson),
      'physical ' + kind + ' source denominator differs from digest-bearing catalog');
    const found = [];
    for (const entry of index[kind]) {
      checked(!seen.has(kind + ':' + entry.id), 'duplicate ' + kind + ' source id');
      seen.add(kind + ':' + entry.id);
      const observed = await read(entry.path);
      checked(observed.sha256 === entry.digest, kind + ' source revision mismatch: ' + entry.path);
      let value;
      try { value = JSON.parse(Buffer.from(observed.bytes).toString('utf8')); }
      catch { fail('invalid ' + kind + ' record JSON: ' + entry.path); }
      checked(value && !Array.isArray(value) && typeof value === 'object' &&
        value.id === entry.id && typeof value.name === 'string' && value.name.length > 0,
        'source record identity or name mismatches catalog: ' + entry.path);
      found.push(Object.freeze({ ...observed, id: entry.id, kind, value: Object.freeze(value) }));
    }
    records[kind] = Object.freeze(found);
  }
  const knownDuties = new Set(records.duties.map(x => x.id));
  const knownWorks = new Set(records.works.map(x => x.id));
  const unresolved = [];
  const offices = records.offices.map(record => {
    const direct = validStrings(record.value['bears-duty'] ?? [], 'office bears-duty').map(idOf);
    const skills = validStrings(record.value['provides-skill'] ?? [], 'office provides-skill');
    const profile = record.value['deontic-profile'] ?? {};
    checked(profile && typeof profile === 'object' && !Array.isArray(profile), 'office deontic-profile must be an authored map');
    const positions = Object.entries(profile).map(([proposition, kind]) => {
      checked(ID.test(proposition) && POSITION_KINDS.has(kind), 'deontic position must have a canonical proposition and one of the source-observed four sorts');
      return Object.freeze({ proposition, kind });
    }).sort((a,b)=>a.proposition.localeCompare(b.proposition));
    const unrealized = validStrings(record.value.unrealized ?? [], 'office unrealized conditions');
    const duties = [...new Set(direct)].sort();
    for (const id of duties) if (!knownDuties.has(id)) unresolved.push(Object.freeze({ office: record.id, kind: 'duty', reference: id }));
    return Object.freeze({
      id: record.id, name: record.value.name, sourcePath: record.path, sourceDigest: record.sha256, sourceIri: record.iri, declaredGitSource: record.declaredGitSource,
      duties: Object.freeze(duties), skills: Object.freeze([...new Set(skills)].sort()),
      normativeStructure: record.value['normative-structure'] ?? null,
      deonticProfile: Object.freeze({ ...profile }),
      positions: Object.freeze(positions), unrealized: Object.freeze([...unrealized]),
      jurisdiction: record.value.jurisdiction ?? null,
    });
  });
  const duties = records.duties.map(record => {
    const work = record.value.work;
    if (work !== undefined && !knownWorks.has(work)) unresolved.push(Object.freeze({ duty: record.id, kind: 'work', reference: work }));
    return Object.freeze({ id: record.id, name: record.value.name,
      sourcePath: record.path, sourceDigest: record.sha256, sourceIri: record.iri, declaredGitSource: record.declaredGitSource,
      work: work ?? null,
      authorityName: typeof record.value.authority === 'string' ? record.value.authority : null,
      claimName: typeof record.value.claim === 'string' ? record.value.claim : null,
      skills: Object.freeze([...new Set(validStrings(record.value.skills ?? [], 'duty skills'))].sort()) });
  });
  const works = records.works.map(record => Object.freeze({
    id: record.id, name: record.value.name,
    sourcePath: record.path, sourceDigest: record.sha256, sourceIri: record.iri, declaredGitSource: record.declaredGitSource,
    from: record.value.from ?? null, to: record.value.to ?? null,
    cost: record.value.cost ?? null, otherwise: record.value.otherwise ?? null,
  }));
  return Object.freeze({
    type: 'ProfessionalRepertoireReading',
    source: Object.freeze({ declaredRepository: owner.repository, declaredCommit: owner.commit, root, catalogPath: carrier.path, catalogDigest: carrier.sha256, catalogSource: carrier.iri }),
    appointmentAuthority: false, incumbencies: Object.freeze([]), // not an agency staffing registry
    counts: Object.freeze({ offices: offices.length, duties: duties.length, works: works.length, read: offices.length + duties.length + works.length + 1 }),
    coverage: Object.freeze({ basis: 'physical-original-JSON-files-matched-to-digest-catalog',
      declared: offices.length + duties.length + works.length,
      enumerated: offices.length + duties.length + works.length,
      opened: offices.length + duties.length + works.length,
      missing: 0, unlisted: 0, otherExtensions: 'outside-this-qualification' }),
    offices: Object.freeze(offices), duties: Object.freeze(duties), works: Object.freeze(works),
    unresolved: Object.freeze(unresolved),
  });
}
/** Select professional office FORMS by verified duties and skills, never appoint. */
export function selectProfessionalOfficeForms(reading, { requiredDuties = [], requiredSkills = [], excludedOffices = [] } = {}) {
  checked(reading?.type === 'ProfessionalRepertoireReading' && reading.appointmentAuthority === false, 'qualified repertoire reading required');
  const ids = value => Object.freeze([...new Set(validStrings(value, 'selection identifiers'))].sort());
  const duties = ids(requiredDuties), skills = ids(requiredSkills), excluded = ids(excludedOffices);
  checked(duties.length + skills.length > 0, 'a selection must require a named duty or skill');
  for (const id of [...duties, ...skills, ...excluded]) checked(ID.test(id), 'noncanonical selection identifier');
  const dutyIndex = new Map(reading.duties.map(duty => [duty.id, duty]));
  const candidates = reading.offices.filter(office =>
    !excluded.includes(office.id) &&
    duties.every(id => office.duties.includes(id) && dutyIndex.has(id)) &&
    skills.every(id => office.skills.includes(id) || office.duties.some(duty =>
      dutyIndex.get(duty)?.skills.includes(id)))).map(o => Object.freeze({
        id: o.id, sourceIri: o.sourceIri, sourceDigest: o.sourceDigest, duties: o.duties, skills: Object.freeze([...new Set([...o.skills, ...o.duties.flatMap(d => dutyIndex.get(d)?.skills ?? [])])].sort()),
      })).sort((a, b) => a.id.localeCompare(b.id));
  return Object.freeze({ type: 'ProfessionalOfficeFormSelection', appointmentAuthority: false,
    selection: candidates.length === 0 ? 'unavailable' : candidates.length === 1 ? 'unique' : 'ambiguous',
    source: reading.source, requiredDuties: duties, requiredSkills: skills, candidates: Object.freeze(candidates),
    unresolved: reading.unresolved, incumbency: null,
  });
}
/** JSON-LD statements of *repertoire forms*, never installed offices.
 * A conforming RDF processor expands these IRIs without scraping Markdown.
 * The source itself remains Operations-owned, with immutable Git locators.
 */
export function professionalRepertoireJsonLd(reading, { base = 'https://561.group/knowledge/professional-repertoire/' } = {}) {
  checked(reading?.type === 'ProfessionalRepertoireReading' && reading.appointmentAuthority === false, 'qualified repertoire required');
  checked(typeof base === 'string' && base.startsWith('https://') && base.endsWith('/'), 'absolute HTTPS repertoire base required');
  const term = (kind, id) => ({ '@id': base + kind + '/' + encodeURIComponent(id) });
  const provenance = record => ({ '@id': record.sourceIri });
  const graph = [
    ...reading.works.map(work => ({
      '@id': term('works', work.id)['@id'], '@type': 'agsv:RepertoireWorkForm',
      'rdfs:label': work.name, 'prov:wasDerivedFrom': provenance(work),
      ...(work.from === null ? {} : { 'agsv:workFormFrom': work.from }),
      ...(work.to === null ? {} : { 'agsv:workFormTo': work.to }),
      ...(work.cost === null ? {} : { 'agsv:workFormCost': work.cost }),
      ...(work.otherwise === null ? {} : { 'agsv:workFormOtherwise': work.otherwise }),
    })),
    ...reading.duties.map(duty => ({
      '@id': term('duties', duty.id)['@id'], '@type': 'agsv:RepertoireDutyForm',
      'rdfs:label': duty.name, 'prov:wasDerivedFrom': provenance(duty),
      ...(duty.authorityName === null ? {} : { 'agsv:dutyFormAuthorityName': duty.authorityName }),
      ...(duty.claimName === null ? {} : { 'agsv:dutyFormClaimName': duty.claimName }),
      'agsv:dutyFormRequiresSkill': duty.skills,
      ...(duty.work === null || !reading.works.some(w=>w.id===duty.work) ? {} :
        { 'agsv:dutyFormReferencesWork': term('works', duty.work) }),
    })),
    ...reading.offices.map(office => ({
      '@id': term('offices', office.id)['@id'], '@type': 'agsv:RepertoireOfficeForm',
      'rdfs:label': office.name, 'prov:wasDerivedFrom': provenance(office),
      ...(office.normativeStructure === null ? {} : { 'rdfs:comment': office.normativeStructure }),
      ...(office.jurisdiction === null ? {} : { 'agsv:officeFormJurisdictionName': office.jurisdiction }),
      'agsv:officeFormUnrealized': office.unrealized,
      'agsv:officeFormStatesPosition': office.positions.map(position =>
        ({ '@id': base + 'offices/' + encodeURIComponent(office.id) + '/positions/' + encodeURIComponent(position.proposition) })),
      'agsv:officeFormReferencesDuty': office.duties
        .filter(id => reading.duties.some(d => d.id === id))
        .map(id => term('duties', id)),
    })),
    ...reading.offices.flatMap(office => office.positions.map(position => ({
      '@id': base + 'offices/' + encodeURIComponent(office.id) + '/positions/' + encodeURIComponent(position.proposition),
      '@type': 'agsv:RepertoireNormativePosition',
      'rdfs:label': position.proposition,
      'agsv:positionKind': position.kind,
      'agsv:positionProposition': position.proposition,
      'prov:wasDerivedFrom': provenance(office),
    }))),
  ];
  return Object.freeze({
    '@context': { agsv: 'https://emsenn.net/mathematics/objects/universes/agential-semioverse#',
      prov: 'http://www.w3.org/ns/prov#', rdfs: 'http://www.w3.org/2000/01/rdf-schema#' },
    '@graph': Object.freeze(graph),
  });
}
