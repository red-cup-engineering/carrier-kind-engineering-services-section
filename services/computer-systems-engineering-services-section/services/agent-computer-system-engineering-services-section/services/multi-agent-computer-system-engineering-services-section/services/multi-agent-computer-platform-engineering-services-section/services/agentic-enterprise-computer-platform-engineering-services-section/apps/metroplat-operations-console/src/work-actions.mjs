import { htmlRepr } from '@red-cup-engineering/http-services-section/representation';
import { readFormBody } from '@red-cup-engineering/http-services-section/body';
import { subjectOf } from '@red-cup-engineering/computer-networking-engineering-services-section/identity/subject';
import { RESPONSE_MOVES } from '@red-cup-engineering/organizing/enterprise/work-arena';
import { workOpenDomain, workMoveDomain, workInputSchemaOf } from '@red-cup-engineering/organizing/enterprise/work-input';
import { endpointSchemaFormControls, decodeSchemaFormEntries, schemaFields } from '@red-cup-engineering/web-page-tiling-engine/schema-form';
import { workspaceDocument, evidenceTile } from './workspace-document.mjs';
import { sameOriginRequest } from './conversations.mjs';

const openingMoves = workOpenDomain.schema.oneOf.map(schema => schema.properties.move.const);
const selectedSchema = (kind, move) => workInputSchemaOf(kind, move, { human: true });
const formFields = (schema, params, fixed) => [
  ...Object.entries(fixed).map(([name, value]) => ({ name, value, kind: 'hidden' })),
  ...schemaFields(endpointSchemaFormControls(schema)).filter(field => !Object.hasOwn(fixed, field.name))
    .map(field => ({ ...field, value: params.get(field.name) ?? '' })),
];

function openingForm(params) {
  const move = openingMoves.includes(params.get('move')) ? params.get('move') : 'request';
  return { title: `Open ${move}`, span: 12, form: {
    id: 'work-opening', action: '/work/new', method: 'post', enhance: false,
    fields: formFields(selectedSchema('open', move), params, { move }),
    submitters: [{ label: `Open ${move}` }],
  } };
}

const openingChoice = params => ({ title: 'What you want to say about work', span: 12, form: {
  id: 'work-kind', action: '/work/new', method: 'get', fields: [{ name: 'move', kind: 'select', label: 'Kind',
    value: params.get('move') ?? 'request', options: openingMoves.map(value => ({ value, label: value })) }],
  submitters: [{ label: 'Prepare this kind' }],
} });

export function workMoveTile(thread, params = new URLSearchParams()) {
  const moves = RESPONSE_MOVES[thread.opening.move] ?? [];
  const move = params.get('move');
  if (!moves.includes(move)) return { title: 'Play a move on this work', span: 12,
    links: moves.map(value => ({ label: value, href: `/work?${new URLSearchParams({ thread: thread.id, move: value })}` })) };
  return { title: 'Play a move on this work', span: 12, form: {
    id: 'work-move', action: '/work/move', method: 'post', enhance: false,
    fields: formFields(selectedSchema('move', move), params, { thread: thread.id, move }),
    submitters: [{ label: `Play ${move}` }],
  } };
}

/** Human forms call the existing governed board. No workflow state is held here. */
export function workActionsApp({ runAs, navigation, navigationTitle }) {
  const page = (title, tiles, status = 200) => htmlRepr(workspaceDocument({ title, tiles, navigation, navigationTitle }), { status, cacheControl: { noStore: true } });
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
      if (ctx.req.method === 'GET') return page('New work', [openingChoice(params), openingForm(params)]);
      let admitted = false;
      try {
        const input = decodeSchemaFormEntries(selectedSchema('open', params.get('move')), params);
        workOpenDomain.assert(input, 'work opening');
        admitted = true;
        return returned(await runAs(subjectOf(ctx.locals.principal), 'work-open', input));
      } catch (error) { return page('Work opening not confirmed', [{ title: 'The opening was not confirmed', span: 12, content: error.message }, openingChoice(params), openingForm(params)], admitted ? 502 : 422); }
    } },
    { id: 'ops-work-move', match: '/work/move', methods: ['POST'], produces: ['text/html'], handler: async ctx => {
      const refused = auth(ctx); if (refused) return refused;
      const params = await readFormBody(ctx.req, { maxBytes: 64 * 1024 });
      const subject = subjectOf(ctx.locals.principal);
      let admitted = false;
      try {
        const input = decodeSchemaFormEntries(selectedSchema('move', params.get('move')), params);
        workMoveDomain.assert(input, 'work move');
        admitted = true;
        return returned(await runAs(subject, 'work-move', input));
      } catch (error) {
        let thread;
        try { const board = await runAs(subject, 'work-board', { thread: params.get('thread') }); thread = board.threads.find(item => item.id === params.get('thread')); } catch { /* A failed read cannot establish a current thread. */ }
        return page('Error: Work move unavailable', [{ title: 'The move was not confirmed played', span: 12, content: error.message },
          ...(thread ? [workMoveTile(thread, params)] : [evidenceTile('Retained move input', Object.fromEntries(params))]),
        ], admitted ? 502 : 422);
      }
    } },
  ] };
}
