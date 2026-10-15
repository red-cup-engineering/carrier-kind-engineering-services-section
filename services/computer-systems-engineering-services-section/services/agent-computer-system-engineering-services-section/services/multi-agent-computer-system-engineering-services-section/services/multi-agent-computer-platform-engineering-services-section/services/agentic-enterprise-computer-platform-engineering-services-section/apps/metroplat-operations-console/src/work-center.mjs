import { workBoardDomain, workBoardCodomain } from "@red-cup-engineering/feltos/work/work-board-contracts";
import { QUESTS, journalRequestDomain } from "@red-cup-engineering/metroplat/world-quests";
import { decodeSchemaFormEntries } from "@red-cup-engineering/web-page-tiling-engine/schema-form";
import { htmlRepr, jsonRepr } from '@red-cup-engineering/http-services-section/representation';
import { subjectOf } from '@red-cup-engineering/computer-networking-engineering-services-section/identity/subject';
import { workspaceDocument } from './workspace-document.mjs';
import { workMoveTile } from './work-actions.mjs';
import { escapeHtml } from '@red-cup-engineering/web-page-tiling-engine/browser';
import { threadSummary, duesOf } from '@red-cup-engineering/organizing/enterprise/work-arena';

const href = input => `/work?${new URLSearchParams(Object.entries(input).filter(([, value]) => value !== undefined)).toString()}`;
const threadLink = id => ({ href: href({ thread: id }), text: id });
const prepare = command => ({ href: `/play?command=${encodeURIComponent(command)}`, label: `Prepare ${command.split(' ')[0]}` });
const OPENING_MOVES = workBoardDomain.schema.properties.kind.enum;
const HORIZONS = workBoardDomain.schema.properties.horizon.enum;
const raw = (title, value) => ({ title, span: 12, html: `<details><summary>${escapeHtml(title)}</summary><pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre></details>` });

/** Read-only enterprise lenses of the native arena. No second workflow or move admission. */
export function workCenterApp({ runAs, navigation, navigationTitle = 'Group' }) {
  const page = (title, tiles, status = 200) => htmlRepr(workspaceDocument({ title, navigation, navigationTitle, tiles: [
    { title: 'Work views', span: 12, links: [
      { href: '/work', label: 'My agenda' }, { href: '/work?view=board', label: 'Work board' },
      { href: '/work?view=refine', label: 'Contracts to refine' },
      { href: '/work/new', label: 'Open work' },
      { href: '/tasks/view', label: 'Allocation and execution' },
      { href: '/conversations', label: 'Private agent conversations and returned operations' },
    ] }, ...tiles,
  ] }), { status, cacheControl: { noStore: true } });
  const filters = params => ({ title: 'Filter the work board', span: 12, form: {
    id: 'work-filters', action: '/work', method: 'get', fields: [
      { name: 'view', kind: 'hidden', value: 'board' },
      { name: 'kind', kind: 'select', label: 'Kind', value: params.get('kind') ?? '', options: [{ value: '', label: 'Every kind' }, ...OPENING_MOVES.map(value => ({ value, label: value }))] },
      { name: 'horizon', kind: 'select', label: 'Horizon', value: params.get('horizon') ?? '', options: [{ value: '', label: 'Every horizon' }, ...HORIZONS.map(value => ({ value, label: value }))] },
      ...['step', 'owes', 'home', 'tag', 'source'].map(name => ({ name, label: name === 'source' ? 'Exact source citation' : name === 'owes' ? 'Owed by this player or office' : name[0].toUpperCase() + name.slice(1), value: params.get(name) ?? '' })),
      { name: 'extent', kind: 'select', label: 'Standing extent', value: params.get('extent') ?? 'open', options: [{ value: 'open', label: 'Open threads' }, { value: 'all', label: 'All threads' }] },
      { name: 'limit', kind: 'number', label: 'Threads per page', min: '1', max: '200', step: '1', value: params.get('limit') ?? '50' },
    ], submitters: [{ label: 'Read work' }],
  } });
  const rows = entries => entries.map(entry => [
    { href: href({ thread: entry.id }), text: entry.gist ?? entry.id }, entry.move ?? 'Not supplied', entry.standing ?? 'Not supplied',
    entry.horizon ?? 'Not supplied', (entry.owes ?? []).join(', ') || 'Not supplied', (entry.awaits ?? []).join(', ') || 'Not supplied',
  ]);
  const summaryTable = (title, entries) => ({ title, span: 12, table: {
    caption: title, columns: [{ label: 'Thread', rowHeader: true }, 'Kind', 'Standing', 'Horizon', 'Owed by', 'Awaited moves'], rows: rows(entries), empty: 'This reading contains no threads.',
  } });
  const errorTile = (title, error) => ({ title, span: 12, content: error?.message ?? String(error) });
  const handle = async ctx => {
    const principal = ctx.locals?.principal;
    if (!principal) return { status: 303, headers: { location: `/sign-in?return_to=${encodeURIComponent(ctx.url.pathname + ctx.url.search)}` }, cacheControl: { noStore: true } };
    const subject = subjectOf(principal), params = ctx.url.searchParams;
    let input, admittedInput = false;

    try {
      const boardView = params.has('thread') || params.get('view') === 'board' || ctx.url.pathname === '/work/data';
      const domain = boardView ? workBoardDomain : journalRequestDomain;
      input = decodeSchemaFormEntries(domain.schema, params);
      if (boardView && !params.has('thread')) {
        if (params.get('extent') !== 'all' && input.open === undefined) input.open = true;
        input.limit ??= 50;
      }
      if (!boardView && params.get('view') === 'refine') input.focus = 'refine';
      domain.assert(input, 'work filters');
      if (params.has('thread') && !input.thread) throw new TypeError('A thread identifier is required.');
      admittedInput = true;
      if (params.has('thread')) {
        const board = workBoardCodomain.assert(await runAs(subject, 'work-board', { thread: input.thread }), 'work-board reading');
        const thread = board.threads?.find(thread => thread.id === input.thread);
        if (!thread) throw new TypeError('The native reading did not contain this thread.');
        if (ctx.url.pathname === '/work/data') return jsonRepr(board, { cacheControl: { noStore: true } });
        const summary = threadSummary(thread), dues = duesOf(thread);
        const relations = ['serves', 'after', 'relates', 'supersedes'].flatMap(kind => (thread.opening[kind] ?? []).map(id => [kind, threadLink(id)]));
        return page(summary.gist || summary.id, [
          summaryTable('Current thread standing', [summary]),
          workMoveTile(thread, params),
          ...['holders', 'promisers', 'adopters', 'answerers'].filter(role => summary[role]?.length).map(role => ({ title: role[0].toUpperCase() + role.slice(1), span: 12, table: { caption: role, columns: [{ label: 'Player', rowHeader: true }], rows: summary[role].map(player => [player]) } })),
          ...(thread.operative ? [
            { title: 'Operative requirements', span: 12, table: { caption: 'The current request contract', columns: [{ label: 'Requirement', rowHeader: true }, 'Statement', 'Priority'], rows: thread.operative.requirements.map(requirement => [requirement.id, requirement.says, requirement.priority ?? 'Not supplied']) } },
            { title: 'Verification readings', span: 12, table: { caption: 'Native verification distinguishes measured, presumed, denied and contested readings', columns: [{ label: 'Requirement', rowHeader: true }, 'Reading', 'Standing', 'Conditions', 'Methods'], rows: (thread.verification ?? []).map(reading => [reading.requirement, reading.reading, reading.standing, reading.conditions.join(', '), reading.methods.join(', ')]) } },
            raw('Conditions of satisfaction', thread.operative.conditions),
          ] : []),
          { title: 'Whose move the arena awaits', span: 12, table: { caption: 'Native protocol dues', columns: [{ label: 'Player', rowHeader: true }, 'Roles', 'Moves'], rows: dues.map(due => [due.player, due.roles.join(', '), due.turn.join(', ') || 'No move owed']) } },
          ...dues.filter(due => due.turn.length).map(due => ({ title: `Prepare a move for ${due.player}`, span: 12, content: 'The world rechecks who you may act as and admits the move when you send it.', links: due.turn.map(move => prepare(`${move} ${thread.id}`)) })),
          ...(relations.length ? [{ title: 'Related work', span: 12, table: { caption: 'Native thread relations', columns: ['Relation', { label: 'Thread', rowHeader: true }], rows: relations } }] : []),
          { title: 'Reading position', span: 12, content: `Read at ${board.at}. Position ${board.position}.` },
          raw('Contract, deliveries and witness readings', thread), raw('Moves refused by replay', board.refused),
        ]);
      }
      if (params.get('view') === 'board' || ctx.url.pathname === '/work/data') {
        const board = workBoardCodomain.assert(await runAs(subject, 'work-board', input), 'work-board reading');
        if (board.kind !== 'feltos.work.work-board' || !Array.isArray(board.threads)) throw new TypeError('The native work-board readout is unavailable.');
        if (ctx.url.pathname === '/work/data') return jsonRepr(board, { cacheControl: { noStore: true } });
        const next = board.next === undefined ? [] : [{ href: href({ ...Object.fromEntries(params), view: 'board', after: board.next }), label: 'Next page' }];
        return page('Work board', [filters(params),
          { title: 'This reading', span: 12, content: `${board.threads.length} threads on this page; ${board.matched} match the native filters. Read at ${board.at}. Position ${board.position}. ${board.refused} stored moves were refused by replay.`, links: next },
          summaryTable('Work threads', board.threads),
        ]);
      }
      const journal = await runAs(subject, 'world-journal', input);
      if (!Array.isArray(journal.own) || !Array.isArray(journal.house)) throw new TypeError('The native journal is unavailable.');
      const refining = input.focus === 'refine';
      const journalLinks = [
        ...(journal.page > 1 ? [{ href: href({ ...Object.fromEntries(params), page: journal.page - 1 }), label: 'Previous page' }] : []),
        ...(Math.max(journal.total, input.includeHouses ? journal.houseTotal : 0) > journal.page * QUESTS ? [{ href: href({ ...Object.fromEntries(params), page: journal.page + 1 }), label: 'Next page' }] : []),
      ];
      return page(refining ? 'Contracts to refine' : 'My work', [
        { title: refining ? 'Contracts awaiting your refinement' : 'Awaiting your move', span: 12,
          content: `${journal.total} threads await your account, character or offices; ${journal.houseTotal} await the houses you serve. This is journal page ${journal.page}.${refining ? ' These requests await requirements and receiving conditions before execution.' : ''}`, links: journalLinks },
        { title: 'Whose work to include', span: 12, links: [
          { href: href({ ...Object.fromEntries(params), includeHouses: !input.includeHouses, page: 1 }), label: input.includeHouses ? 'Show my own moves' : 'Include the houses I serve' },
        ] },
        ...journal.own.map(entry => ({ title: entry.gist, span: 12, content: `${journal.names?.[entry.as] ?? entry.as}: ${entry.standing}; horizon ${entry.horizon ?? 'not supplied'}.`, links: [
          { href: href({ thread: entry.id }), label: 'Read the thread and its evidence' }, ...entry.moves.map(move => prepare(`${move} ${entry.id}`)),
        ] })),
        ...(journal.house.length ? [summaryTable('Work owed by your houses', journal.house)] : []),
        { title: 'Broader work', span: 12, links: [{ href: '/work?view=board', label: 'Read the settlement work board' }, { href: '/play?command=journal%20all', label: 'Prepare reading the houses’ agenda' }] },
      ]);
    } catch (error) {
      if (ctx.signal?.aborted) throw error;
      if (ctx.url.pathname === '/work/data') return jsonRepr({ error: 'work_unavailable', reason: error.message }, { status: admittedInput ? 502 : 400, cacheControl: { noStore: true } });
      return page(admittedInput ? 'Error: Work is unavailable' : 'Error: Check the work filters', [filters(params), errorTile(admittedInput ? 'The native reading did not complete' : 'The filters were refused', error),
        { title: 'Read again', span: 12, links: [{ href: '/work?view=board', label: 'Read a fresh board position' }, { href: '/work', label: 'Read your agenda' }] },
      ], admittedInput ? 502 : 400);
    }
  };
  return { resources: ['/work', '/work/data'].map(match => ({ id: `ops-work-center${match.endsWith('/data') ? '.data' : ''}`, match, methods: ['GET'], produces: [match.endsWith('/data') ? 'application/json' : 'text/html'], handler: handle })) };
}
