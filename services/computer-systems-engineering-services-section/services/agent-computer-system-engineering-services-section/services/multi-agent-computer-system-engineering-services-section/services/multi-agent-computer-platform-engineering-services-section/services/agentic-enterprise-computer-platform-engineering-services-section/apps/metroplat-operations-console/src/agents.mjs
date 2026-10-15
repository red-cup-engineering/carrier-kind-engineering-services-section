import { htmlRepr } from '@red-cup-engineering/http-services-section/representation';
import { subjectOf } from '@red-cup-engineering/computer-networking-engineering-services-section/identity/subject';
import { workspaceDocument, evidenceTile, contentTile } from './workspace-document.mjs';

const href = params => `/agents?${new URLSearchParams(params)}`;
const name = value => typeof value === 'string' && value ? value : 'Not supplied';
const words = value => typeof value === 'string' ? value : JSON.stringify(value ?? 'Not supplied');
const officeLink = office => ({ text: name(office.name ?? office.office), href: href({ office: office.office }) });
const write = recipient => ({ href: `/conversations?${new URLSearchParams({ channel: 'character', recipient })}`, label: 'Write to this character or office' });
const table = (title, columns, rows, span = 12) => ({ title, span, table: { caption: title, columns,
  rows: rows.map(row => row.map(cell => typeof cell === 'number' ? String(cell) : cell)), empty: 'This native reading contains no entries.' } });

async function reading(runAs, subject, verb, input, kind) {
  const result = await runAs(subject, verb, input);
  if (result?.kind !== kind) throw new TypeError(`The native ${verb} reading is unavailable.`);
  return result;
}

/** Discovery and inspection consume the agency's existing records and lived bodies.
 * No browser registry, fabricated network address, session control or staffing act. */
export function agentsApp({ runAs, navigation, navigationTitle }) {
  return { resources: [{ id: 'ops-agents', match: '/agents', methods: ['GET'], produces: ['text/html'], handler: async ctx => {
    if (!ctx.locals?.principal) return { status: 303, headers: { location: `/sign-in?return_to=${encodeURIComponent(ctx.url.pathname + ctx.url.search)}` }, cacheControl: { noStore: true } };
    const subject = subjectOf(ctx.locals.principal), params = ctx.url.searchParams;
    let status = 200;
    const tiles = [{ title: 'Find someone to work with', span: 12, form: { action: '/agents', method: 'get', fields: [
      { name: 'q', label: 'Name, office, section or operation', value: params.get('q') ?? '' },
      { name: 'view', kind: 'select', label: 'Show', value: params.get('view') ?? '', options: [{ value: '', label: 'Characters and offices' }, { value: 'characters', label: 'Characters' }, { value: 'offices', label: 'Offices' }] },
    ], submitters: [{ label: 'Find agents and offices' }] } }];
    const unavailable = (title, error) => tiles.push({ title, span: 12, content: error.message });
    const page = title => htmlRepr(workspaceDocument({ title: status >= 400 ? `Error: ${title}` : title,
      subtitle: 'Discover native characters, inspect their work and sessions, and start a conversation', tiles, navigation, navigationTitle }), { status, cacheControl: { noStore: true } });
    if (params.has('office')) {
      try {
        const office = await reading(runAs, subject, 'office', { office: params.get('office') }, 'organizing.agency.office');
        tiles.push(contentTile(office.name, office.normativeStructure ?? office.charter ?? office.office),
          { title: 'Work and conversations', span: 12, links: [write(`office:${office.office}`), { href: `/work?${new URLSearchParams({ view: 'board', owes: office.office })}`, label: 'Read work owed by this office' }, { href: '/agents?view=offices', label: 'All offices' }] },
          table('Seats and their readings', [{ label: 'Holder', rowHeader: true }, 'Standing'], (office.serviceStanding?.seats ?? office.seats ?? []).map(seat => [{ text: name(seat.holder), href: href({ character: seat.holder }) }, name(seat.state)])),
          table('Responsibilities', [{ label: 'Duty', rowHeader: true }, 'Claim', 'Work'], (office.duties ?? []).map(duty => [name(duty.name ?? duty.id), words(duty.claim), name(duty.work)])),
          table('Operations and your permissions', [{ label: 'Operation', rowHeader: true }, 'Installed here', 'Available to you', 'Purpose'], (office.resources ?? []).map(resource => [resource.verb, resource.installed ? 'Yes' : 'No', resource.available ? 'Yes' : 'No', (resource.operations ?? []).map(operation => operation.summary).join('\n')])),
          table('Related offices', ['Relation', { label: 'Office', rowHeader: true }], Object.entries(office.organization ?? {}).flatMap(([relation, offices]) => offices.map(related => [relation, related.unresolved ? `${related.id} · unresolved` : officeLink(related)]))),
          contentTile('Unresolved references', office.unresolved?.join('\n') || 'None reported by this reading.'), evidenceTile('Complete office, authority and resource evidence', office));
        return page(office.name);
      } catch (error) { if (ctx.signal?.aborted) throw error; status = 502; unavailable('Office reading unavailable', error); return page('Office unavailable'); }
    }
    if (params.has('character')) {
      const character = params.get('character');
      tiles.push({ title: 'Work and conversations', span: 12, links: [{ href: '/conversations?channel=character', label: 'Read your character mail' }, { href: '/agents', label: 'All characters and offices' }] });
      const recordReading = reading(runAs, subject, 'agency-record', { pool: 'characters', id: character }, 'metroplat.agency-record');
      const reads = await Promise.allSettled([
        recordReading,
        recordReading.then(result => result.record?.id ?? character, () => character)
          .then(account => reading(runAs, subject, 'account', { account }, 'metroplat.account')),
        reading(runAs, subject, 'body', { character }, 'organizing.agency.lived-body'),
      ]);
      const record = reads[0].status === 'fulfilled' ? reads[0].value.record : undefined;
      if (record === null) { status = 404; tiles.push({ title: 'Character not found', span: 12, content: 'The agency has no unambiguous character with this reference.' }); }
      else if (record) {
        tiles.push({ title: 'Start a conversation', span: 12, links: [write(record.key)] }, contentTile(record.name ?? character, record.authored?.body ?? record.body ?? record.description ?? character),
          { title: 'Character carrier', span: 12, content: `Harness: ${name(record.harness)}. Host: ${name(record.host)}. Source: ${name(record.source)}. Revision: ${name(record.revision)}.` }, evidenceTile('Complete character record', record));
      }
      if (reads[1].status === 'fulfilled') {
        const account = reads[1].value;
        tiles.push(table('Offices served', [{ label: 'Office', rowHeader: true }, 'Section', 'Via'], account.offices.map(office => [officeLink(office), name(office.section), name(office.via)])),
          table('Responsibilities', [{ label: 'Duty', rowHeader: true }, 'Claim', 'Office'], account.duties.map(duty => [name(duty.name ?? duty.id), words(duty.claim), officeLink({ office: duty.office })])),
          contentTile('Office powers', account.verbs.join('\n') || 'None reported.'), contentTile('Powers without an installed operation', account.unservedVerbs.join('\n') || 'None reported.'), evidenceTile('Account, masks, grants and work evidence', account));
      }
      if (reads[2].status === 'fulfilled') {
        const body = reads[2].value;
        tiles.push(table('Sessions', [{ label: 'Session', rowHeader: true }, 'Carrier reading', 'Harness', 'Model', 'Effort', 'First told', 'Last told'], body.sessions.map(session => [session.session, session.held === true ? 'Held' : session.held === false ? 'Ended' : 'Unknown', name(session.harness), name(session.model), name(session.reasoningEffort), name(session.since), name(session.last)])),
          table('Measured token use by model', [{ label: 'Model', rowHeader: true }, 'Input', 'Cached', 'Output'], Object.entries(body.spend.byModel).map(([model, tokens]) => [model, tokens.input, tokens.cached, tokens.output])),
          table('Judged work outcomes', [{ label: 'Office', rowHeader: true }, 'Accepted', 'Rejected', 'Voided'], Object.entries(body.standing.byOffice).map(([office, outcomes]) => [officeLink({ office }), outcomes.accepted, outcomes.rejected, outcomes.voided])),
          table('Organs and admitted capabilities', [{ label: 'Organ', rowHeader: true }, 'Platform', 'Account', 'Capabilities', 'Handedness'], body.organs.map(organ => [organ.key, name(organ.platform), name(organ.account), organ.capabilities === undefined ? 'No admission supplied' : organ.capabilities.join('\n'), words(organ.handedness)])),
          contentTile('How to read this evidence', 'A held session records participation; it does not prove a process is running. Token observations cover the native reporting window; they are not money costs. Office powers and provider-admitted capabilities are distinct.'), evidenceTile('Complete lived body, mail and memory', body));
      }
      reads.forEach((result, index) => { if (result.status === 'rejected') unavailable(['Character record unavailable', 'Account standing unavailable', 'Session and body evidence unavailable'][index], result.reason); });
      if (reads.every(result => result.status === 'rejected')) status = 502;
      return page(record?.name ?? character);
    }
    const pageNumber = Number(params.get('page') ?? '1');
    if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) { status = 400; unavailable('Invalid page', new TypeError('Choose a positive whole page number.')); return page('Agents and offices'); }
    const query = (params.get('q') ?? '').toLowerCase(), view = params.get('view') ?? '';
    if (!['', 'characters', 'offices'].includes(view)) { status = 400; unavailable('Invalid view', new TypeError('Choose characters, offices or both.')); return page('Agents and offices'); }
    const reads = await Promise.allSettled([
      ...(view !== 'offices' ? [reading(runAs, subject, 'agency', { pool: 'characters' }, 'metroplat.agency').then(result => {
        if (!Array.isArray(result.records)) throw new TypeError('The agency did not return character records.');
        return { kind: 'characters', items: result.records, evidence: result.problems };
      })] : []),
      ...(view !== 'characters' ? [reading(runAs, subject, 'offices', {}, 'metroplat.offices').then(result => {
        if (!Array.isArray(result.offices)) throw new TypeError('The agency did not return offices.');
        return { kind: 'offices', items: result.offices };
      })] : []),
    ]);
    for (const result of reads) {
      if (result.status === 'rejected') { unavailable('A directory reading is unavailable', result.reason); continue; }
      const { kind, items, evidence } = result.value;
      const matches = items.filter(item => JSON.stringify(item).toLowerCase().includes(query));
      const slice = matches.slice((pageNumber - 1) * 50, pageNumber * 50);
      tiles.push({ title: kind === 'characters' ? 'Characters' : 'Offices', span: 12, content: `${matches.length} matching ${kind} in this native reading. Page ${pageNumber}; up to 50 entries per directory.`, links: [
        ...(pageNumber > 1 ? [{ href: href({ ...Object.fromEntries(params), page: String(pageNumber - 1) }), label: 'Previous page' }] : []),
        ...(pageNumber * 50 < matches.length ? [{ href: href({ ...Object.fromEntries(params), page: String(pageNumber + 1) }), label: 'Next page' }] : []),
      ] });
      tiles.push(kind === 'characters'
        ? table('Characters in the agency', [{ label: 'Character', rowHeader: true }, 'Source', 'Revision'], slice.map(record => [{ text: record.name ?? record.id, href: href({ character: record.key }) }, record.source, record.revision]))
        : table('Offices in the agency', [{ label: 'Office', rowHeader: true }, 'Section', 'Operations', 'Duties', 'Seats and readings'], slice.map(office => [officeLink(office), name(office.section), office.verbs.join(', '), office.duties, office.seats.map(seat => `${seat.holder}: ${seat.state}`).join('\n') || 'No seats reported'])));
      if (evidence?.length) tiles.push(evidenceTile('Agency source problems', evidence));
    }
    if (reads.every(result => result.status === 'rejected')) status = 502;
    return page('Agents and offices');
  } }] };
}
