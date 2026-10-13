import { htmlRepr } from '@red-cup-engineering/http-services-section/representation';
import { readFormBody } from '@red-cup-engineering/http-services-section/body';
import { subjectOf } from '@red-cup-engineering/computer-networking-engineering-services-section/identity/subject';
import { RESPONSE_MOVES } from '@red-cup-engineering/organizing/enterprise/work-arena';
import { workspaceDocument, evidenceTile } from './workspace-document.mjs';
import { sameOriginRequest } from './conversations.mjs';

const lines = value => String(value ?? '').split('\n').map(line => line.trim()).filter(Boolean);
const optional = (params, names) => Object.fromEntries(names.filter(name => params.get(name)?.trim()).map(name => [name, params.get(name).trim()]));

export function workMoveTile(thread, params = new URLSearchParams()) {
  return { title: 'Play a move on this work', span: 12, form: {
    id: 'work-move', action: '/work/move', method: 'post', enhance: false,
    fields: [{ name: 'thread', kind: 'hidden', value: thread.id },
      { name: 'move', kind: 'select', label: 'Move', value: params.get('move') ?? '', options: [
        { value: '', label: 'Choose a move' }, ...(RESPONSE_MOVES[thread.opening.move] ?? []).map(value => ({ value, label: value })),
      ], required: true },
      { name: 'as', label: 'Act as office (optional)', value: params.get('as') ?? '', description: 'The board derives your office when unambiguous and rechecks your current standing.' },
      ...['reason', 'says', 'of', 'subject'].map(name => ({ name, label: { reason: 'Reason', says: 'Statement or answer', of: 'Player whose delivery or answer you judge', subject: 'Work subject' }[name], value: params.get(name) ?? '' })),
      { name: 'stance', kind: 'select', label: 'Argument stance', value: params.get('stance') ?? '', options: [{ value: '', label: 'Not an argument' }, { value: 'for', label: 'For' }, { value: 'against', label: 'Against' }] },
      { name: 'evidence', kind: 'textarea', label: 'Evidence addresses (one per line)', value: params.get('evidence') ?? '' },
      { name: 'unmet', label: 'Unmet condition identifiers (one per line)', kind: 'textarea', value: params.get('unmet') ?? '' },
    ], submitters: [{ label: 'Play move' }],
  } };
}

/** Human forms call the existing governed board. No workflow state is held here. */
export function workActionsApp({ runAs, navigation, navigationTitle }) {
  const page = (title, tiles, status = 200) => htmlRepr(workspaceDocument({ title, tiles, navigation, navigationTitle }), { status, cacheControl: { noStore: true } });
  const openingForm = params => ({ title: 'State the outcome you need', span: 12, form: {
    id: 'work-request', action: '/work/new', method: 'post', enhance: false, fields: [
      { name: 'need', label: 'Needed state of affairs', kind: 'textarea', value: params.get('need') ?? '', required: true, maxLength: 400, description: 'Describe the outcome, rather than choosing the worker or implementation.' },
      { name: 'requirement', label: 'Requirement', kind: 'textarea', value: params.get('requirement') ?? '', required: true, maxLength: 400, description: 'One statement with its subject followed by “shall”.' },
      { name: 'condition', label: 'Condition of satisfaction', kind: 'textarea', value: params.get('condition') ?? '', required: true, description: 'What an independent receiver will demonstrate to judge this requirement.' },
      { name: 'scope', label: 'Scope subjects (one per line)', kind: 'textarea', value: params.get('scope') ?? '' },
      { name: 'serves', label: 'Work this request serves (thread identifiers, one per line)', kind: 'textarea', value: params.get('serves') ?? '' },
      { name: 'after', label: 'Preceding work (thread identifiers, one per line)', kind: 'textarea', value: params.get('after') ?? '' },
      { name: 'as', label: 'Act as office (optional)', value: params.get('as') ?? '' },
    ], submitters: [{ label: 'Open request' }],
  } });
  const auth = ctx => !ctx.locals?.principal ? ctx.req.method === 'GET'
    ? { status: 303, headers: { location: '/sign-in?return_to=%2Fwork%2Fnew' } } : { status: 401 }
    : ctx.req.method === 'POST' && !sameOriginRequest(ctx.req) ? { status: 403 } : undefined;
  const returned = result => page('Work move returned', [
    { title: 'Board receipt', span: 12, content: 'The native board returned this move. Delivery, verification and acceptance remain separate readings.',
      links: [{ href: '/work', label: 'Read your agenda' }, { href: '/work?view=board', label: 'Read the work board' },
        ...(typeof (result?.thread ?? result?.id) === 'string' ? [{ href: `/work?${new URLSearchParams({ thread: result.thread ?? result.id })}`, label: 'Read this thread' }] : [])] },
    evidenceTile('Exact returned board move', result),
  ]);
  return { resources: [
    { id: 'ops-work-new', match: '/work/new', methods: ['GET', 'POST'], produces: ['text/html'], handler: async ctx => {
      const refused = auth(ctx); if (refused) return refused;
      const params = ctx.req.method === 'POST' ? await readFormBody(ctx.req, { maxBytes: 64 * 1024 }) : ctx.url.searchParams;
      if (ctx.req.method === 'GET') return page('New work request', [openingForm(params)]);
      try {
        const input = { move: 'request', need: params.get('need'), ...optional(params, ['as']),
          requirements: [{ id: 'requirement', says: params.get('requirement') }],
          conditions: [{ id: 'condition', says: params.get('condition'), verifies: ['requirement'], method: 'demonstration' }],
          ...Object.fromEntries(['scope', 'serves', 'after'].filter(name => lines(params.get(name)).length).map(name => [name, lines(params.get(name))])),
        };
        return returned(await runAs(subjectOf(ctx.locals.principal), 'work-open', input));
      } catch (error) { return page('Error: Request unavailable', [{ title: 'The request was not confirmed opened', span: 12, content: error.message }, openingForm(params)], 502); }
    } },
    { id: 'ops-work-move', match: '/work/move', methods: ['POST'], produces: ['text/html'], handler: async ctx => {
      const refused = auth(ctx); if (refused) return refused;
      const params = await readFormBody(ctx.req, { maxBytes: 64 * 1024 });
      const subject = subjectOf(ctx.locals.principal);
      try {
        const input = { move: params.get('move'), thread: params.get('thread'), ...optional(params, ['as', 'reason', 'says', 'of', 'subject', 'stance']),
          ...Object.fromEntries(['evidence', 'unmet'].filter(name => lines(params.get(name)).length).map(name => [name, lines(params.get(name))])),
        };
        return returned(await runAs(subject, 'work-move', input));
      } catch (error) {
        let thread;
        try { const board = await runAs(subject, 'work-board', { thread: params.get('thread') }); thread = board.threads.find(item => item.id === params.get('thread')); } catch { /* A failed read cannot establish a current thread. */ }
        return page('Error: Work move unavailable', [{ title: 'The move was not confirmed played', span: 12, content: error.message },
          ...(thread ? [workMoveTile(thread, params)] : [evidenceTile('Retained move input', Object.fromEntries(params))]),
        ], 502);
      }
    } },
  ] };
}
