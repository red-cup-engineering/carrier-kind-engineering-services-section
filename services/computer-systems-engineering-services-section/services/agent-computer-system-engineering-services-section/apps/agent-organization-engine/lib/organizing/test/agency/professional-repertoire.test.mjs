import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { readProfessionalRepertoire, selectProfessionalOfficeForms, professionalRepertoireJsonLd } from '../../src/agency/professional-repertoire.mjs';

const sha = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const source = { repository: 'coesite-operations/operations-services-section', commit: 'a'.repeat(40), pathPrefix: 'services/agent-services-section' };
const path = (kind, id) => 'content/professional-repertoire/' + kind + '/' + id + '.json';
const office = (id, duties, skills = []) => ({
  id, name: id.replaceAll('-', ' '), kind: 'office', 'normative-structure': 'One recorded professional form.',
  'bears-duty': duties, 'provides-skill': skills, 'deontic-profile': { 'perform-named-duty': 'duty' },
});
const duty = id => ({ id, name: id.replaceAll('-', ' '), authority: 'recorded', claim: 'recorded',
  work: 'do-research', skills: ['read-sources'] });
const work = { id: 'do-research', name: 'do research', from: 'unqualified report', to: 'qualified evidence', cost: 'real reading' };
function corpus({ missingDuty = false, wrongPosition = false } = {}) {
  const values = { offices: [
    office('librarian', ['emsenn/duty/find-a-term'], ['write-terms']),
    office('registrar', ['emsenn/duty/keep-a-register'], ['file-records']),
  ], duties: [duty('find-a-term'), duty('keep-a-register')], works: [work] };
  if (missingDuty) values.offices[1]['bears-duty'] = ['emsenn/duty/unwritten-duty'];
  if (wrongPosition) values.offices[0]['deontic-profile']['perform-named-duty'] = 'authorization-by-assertion';
  const catalog = { id: 'union-professional-repertoire', owner: 'union-officer-academy',
    appointmentAuthority: false, counts: {}, offices: [], duties: [], works: [] };
  const files = new Map();
  for (const [kind, records] of Object.entries(values)) {
    catalog.counts[kind] = records.length;
    for (const record of records) {
      const rel = path(kind, record.id), bytes = Buffer.from(JSON.stringify(record));
      files.set('/original-academy/' + rel, bytes);
      catalog[kind].push({ id: record.id, canonicalPath: rel, digest: sha(bytes) });
    }
  }
  files.set('/original-academy/content/catalogs/professional-repertoire.json', Buffer.from(JSON.stringify(catalog)));
  const read = options => readProfessionalRepertoire({ root: '/original-academy', source,
    resolveReal: async p => p,
    listDirectory: async dir => [...files.keys()].filter(p => p.startsWith(dir + '/'))
      .map(p => p.slice(dir.length + 1)).filter(p => !p.includes('/')),
    load: async p => {
      if (!files.has(p)) throw new Error('absent original source: ' + p);
      return files.get(p);
    }, ...options });
  return { read, files, catalog };
}
test('complete original-content reading qualifies every office/duty/work and keeps observed NI provenance separate from declared Git URL', async () => {
  const { read } = corpus();
  const reading = await read();
  assert.equal(reading.type, 'ProfessionalRepertoireReading');
  assert.deepEqual(reading.counts, { offices: 2, duties: 2, works: 1, read: 6 });
  assert.deepEqual(reading.coverage, {
    basis:'physical-original-JSON-files-matched-to-digest-catalog',
    declared:5, enumerated:5, opened:5, missing:0, unlisted:0,
    otherExtensions:'outside-this-qualification',
  });
  assert.deepEqual(reading.unresolved, []);
  assert.equal(reading.appointmentAuthority, false);
  assert.deepEqual(reading.incumbencies, []);
  assert.ok(reading.offices[0].sourceIri.startsWith('ni:///sha-256;'));
  assert.equal(reading.offices[0].declaredGitSource,
    'https://github.com/coesite-operations/operations-services-section/blob/' + 'a'.repeat(40) + '/services/agent-services-section/content/professional-repertoire/offices/librarian.json');
  assert.deepEqual(reading.offices[0].duties, ['find-a-term']);
  assert.equal(reading.works[0].to, 'qualified evidence');
  assert.equal(reading.offices[0].deonticProfile['perform-named-duty'], 'duty');
  const chosen = selectProfessionalOfficeForms(reading, { requiredDuties: ['find-a-term'] });
  assert.equal(chosen.selection, 'unique');
  assert.deepEqual(chosen.candidates.map(x => x.id), ['librarian']);
  assert.equal(chosen.appointmentAuthority, false);
  assert.equal(chosen.incumbency, null);
  assert.equal(selectProfessionalOfficeForms(reading, { requiredSkills: ['read-sources'] }).selection, 'ambiguous');
  assert.equal(selectProfessionalOfficeForms(reading, { requiredSkills: ['absent-skill'] }).selection, 'unavailable');
});
test('existing Science ontology IRIs project a connected, independently attributable professional-form graph, not staffing records', async () => {
  const reading = await corpus().read();
  const graph = professionalRepertoireJsonLd(reading);
  assert.equal(graph['@graph'].length, 7, 'each authored deontic position has its own attributed node');
  const position = graph['@graph'].find(node => node['@type'] === 'agsv:RepertoireNormativePosition');
  assert.equal(position['agsv:positionKind'], 'duty');
  assert.equal(position['agsv:positionProposition'], 'perform-named-duty');
  assert.equal(graph['@context'].agsv, 'https://emsenn.net/mathematics/objects/universes/agential-semioverse#');
  const librarian = graph['@graph'].find(node => node['@id'].endsWith('/offices/librarian'));
  assert.equal(librarian['@type'], 'agsv:RepertoireOfficeForm');
  assert.deepEqual(librarian.agsv, undefined);
  assert.equal(librarian['agsv:officeFormReferencesDuty'][0]['@id'], 'https://561.group/knowledge/professional-repertoire/duties/find-a-term');
  assert.ok(librarian['prov:wasDerivedFrom']['@id'].startsWith('ni:///sha-256;'));
  assert.ok(!JSON.stringify(graph).includes('agsv:Incumbency'));
  assert.throws(() => professionalRepertoireJsonLd(reading, { base: 'http://insecure/' }), TypeError);
});
test('source mismatch, missing denominator, structural escape and duplicate catalog entry refuse before a whole reading', async () => {
  const { read, files, catalog } = corpus();
  let key = '/original-academy/content/professional-repertoire/offices/librarian.json';
  files.set(key, Buffer.from('{"id":"librarian","name":"changed"}'));
  await assert.rejects(read(), /source revision mismatch/);
  const x = corpus();
  x.catalog.counts.offices = 999;
  x.files.set('/original-academy/content/catalogs/professional-repertoire.json', Buffer.from(JSON.stringify(x.catalog)));
  await assert.rejects(x.read(), /count mismatches/);
  const unseen = corpus();
  unseen.files.set('/original-academy/content/professional-repertoire/offices/hidden-office.json',Buffer.from('{}'));
  await assert.rejects(unseen.read(), /physical offices source denominator differs/);
  const y = corpus();
  y.catalog.offices.push(y.catalog.offices[0]);y.catalog.counts.offices++;
  y.files.set('/original-academy/content/catalogs/professional-repertoire.json', Buffer.from(JSON.stringify(y.catalog)));
  await assert.rejects(y.read(), /duplicate offices source id/);
  await assert.rejects(corpus().read({ resolveReal: async p => p.includes('librarian.json') ? '/foreign/private' : p }), /outside the selected corpus/);
  await assert.rejects(corpus().read({ source: { repository: 'unverified', commit: 'main', pathPrefix: 'services/agent-services-section' } }), /source repository/);
});
test('unresolved linked duty is explicit missing knowledge, not an inferred obligation or a chosen candidate', async () => {
  const reading = await corpus({ missingDuty: true }).read();
  assert.deepEqual(reading.unresolved, [{ office: 'registrar', kind: 'duty', reference: 'unwritten-duty' }]);
  const selected = selectProfessionalOfficeForms(reading, { requiredDuties: ['unwritten-duty'] });
  assert.equal(selected.selection, 'unavailable');
  assert.deepEqual(selected.candidates, []);
  assert.throws(() => selectProfessionalOfficeForms(reading, { requiredDuties: ['../other'] }), TypeError);
  assert.throws(() => selectProfessionalOfficeForms(reading, {}), TypeError);
});

test('no invented deontic permission sort is accepted as an original professional position', async () => {
  await assert.rejects(() => corpus({ wrongPosition: true }).read(), /source-observed four sorts/);
});
