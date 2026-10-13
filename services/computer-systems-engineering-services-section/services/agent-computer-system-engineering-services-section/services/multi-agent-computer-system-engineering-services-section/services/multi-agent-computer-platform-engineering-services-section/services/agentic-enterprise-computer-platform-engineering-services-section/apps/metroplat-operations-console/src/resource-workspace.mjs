import { htmlRepr } from '@red-cup-engineering/http-services-section/representation';
import { readFormBody } from '@red-cup-engineering/http-services-section/body';
import { subjectOf } from '@red-cup-engineering/computer-networking-engineering-services-section/identity/subject';
import { workspaceDocument, evidenceTile, contentTile } from './workspace-document.mjs';
import { readPrivateInbox, readCorrelatedReply, operationResultTiles, sendPrivateMessage, sameOriginRequest, submissionTiles } from './conversations.mjs';

const LENSES = { '/code': 'Code', '/knowledge': 'Knowledge', '/resources': 'Resources' };
const url = (route, params) => `${route}?${new URLSearchParams(params)}`;

/** A returned resource remains its sender's reading; this view supplies no host access. */
export function returnedResource(entry) {
  return entry.kind === 'metroplat.dispatch.result' ? returnedResourceResult(entry.value?.result) : undefined;
}

export function returnedResourceResult(result) {
  if (result?.code !== 0 || typeof result.stdout !== 'string') return undefined;
  let reading;
  try { reading = JSON.parse(result.stdout); } catch { return undefined; }
  return reading?.kind === 'metroplat.filesystem.read-result' && typeof reading.path === 'string' && typeof reading.content === 'string' ? reading : undefined;
}

function resourceTiles(reading, { route, query, sender, request, outcomeHref, evidence }) {
  const tiles = [{ title: 'Source of this reading', span: 12,
    content: `${reading.path} · ${reading.type} · ${reading.corner} · ${reading.rung}. Returned by ${sender}. Request ${request}.`,
    links: [{ href: outcomeHref, label: 'Read the full operation outcome' }, { href: url(route, { recipient: sender, path: reading.path, corner: reading.corner }), label: 'Prepare an updated reading' },
      ...Object.entries(LENSES).filter(([view]) => view !== route).map(([view, label]) => ({ href: url(view, Object.fromEntries(query)), label: `View as ${label.toLowerCase()}` }))] }];
  let status = 200, manifest;
  try { const parsed = JSON.parse(reading.content); if (parsed?.kind === 'metroplat.directory-manifest' && parsed.files && typeof parsed.files === 'object' && !Array.isArray(parsed.files)) manifest = parsed; } catch { /* A prose or code resource is not a JSON manifest. */ }
  if (manifest) {
    tiles.push({ title: 'Files', span: 4, table: { caption: 'Files carried by this returned directory', columns: [{ label: 'File', rowHeader: true }],
      rows: Object.keys(manifest.files).map(file => [{ text: file, href: url(route, { ...Object.fromEntries(query), file }) }]) } });
    const file = query.get('file');
    if (file !== null && Object.hasOwn(manifest.files, file) && typeof manifest.files[file] === 'string') tiles.push(contentTile(file, manifest.files[file], { code: route === '/code', span: 8 }));
    else if (file !== null) { status = 404; tiles.push({ title: 'File unavailable in this reading', span: 12, content: 'This directory reading does not carry the selected file.' }); }
  } else tiles.push(contentTile(reading.path, reading.content, { code: route === '/code' }));
  tiles.push(evidenceTile('Native projection and carried items', reading), evidenceTile('Native transport and returned witness', evidence));
  return { tiles, status };
}

export function resourceWorkspaceApp({ runAs, navigation, navigationTitle }) {
  return { resources: Object.entries(LENSES).map(([route, label]) => ({
    id: `ops-resource-workspace.${label.toLowerCase()}`, match: route, methods: ['GET', 'POST'], produces: ['text/html'],
    handler: async ctx => {
      const principal = ctx.locals?.principal;
      if (!principal) return ctx.req.method === 'GET' ? { status: 303, headers: { location: `/sign-in?return_to=${encodeURIComponent(ctx.url.pathname + ctx.url.search)}` } } : { status: 401 };
      if (ctx.req.method === 'POST' && !sameOriginRequest(ctx.req)) return { status: 403 };
      const subject = subjectOf(principal), query = ctx.url.searchParams;
      const params = ctx.req.method === 'POST' ? await readFormBody(ctx.req, { maxBytes: 64 * 1024 }) : query;
      const tiles = []; let status = 200;
      const page = () => htmlRepr(workspaceDocument({ title: status >= 400 ? `Error: ${label}` : label, tiles, navigation, navigationTitle,
        subtitle: 'Browse returned native resources, preserve their source, and request an updated reading' }), { status, cacheControl: { noStore: true } });
      tiles.push({ title: `Read ${label.toLowerCase()} from an actor`, span: 6, form: {
        action: route, method: 'post', enhance: false, fields: [
          { name: 'recipient', label: 'Actor holding the resource', value: params.get('recipient') ?? '', required: true },
          { name: 'path', label: 'Resource path at that actor', value: params.get('path') ?? '', required: true },
          { name: 'corner', kind: 'select', label: 'Reading corner', value: params.get('corner') ?? '', options: [
            { value: '', label: 'Native default' }, ...['bottom', 'data', 'prose', 'assertion'].map(value => ({ value, label: value })),
          ] },
        ], submitters: [{ label: 'Request resource reading' }],
      } }, { title: 'Find returned resources', span: 6, form: { action: route, method: 'get', fields: [
        { name: 'q', label: 'Words in resource paths on this page', value: query.get('q') ?? '' },
      ], submitters: [{ label: 'Find resources' }] } });
      if (ctx.req.method === 'POST') {
        try {
          const path = params.get('path'), corner = params.get('corner');
          if (!path?.trim() || path.length > 4096) throw new TypeError('Supply a bounded resource path.');
          if (corner && !['bottom', 'data', 'prose', 'assertion'].includes(corner)) throw new TypeError('Select a native reading corner.');
          const receipt = await sendPrivateMessage(runAs, subject, params.get('recipient'), JSON.stringify({ verb: 'read', input: { path, ...(corner ? { corner } : {}) } }));
          tiles.push(...submissionTiles(receipt));
        } catch (error) { status = 502; tiles.push({ title: 'The reading request was not confirmed submitted', span: 12, content: error.message }); }
      }
      if (ctx.req.method === 'GET' && (query.has('request') || query.has('responder'))) {
        try {
          const receipt = await readCorrelatedReply(runAs, subject, query.get('request'), query.get('responder'));
          tiles.push(evidenceTile('Native addressed resource reply', receipt));
          if (receipt.stage === 'awaiting-reply') tiles.push({ title: 'Awaiting a resource reply', span: 12, content: 'No matching reply is held in this reading.' });
          else {
            const reading = returnedResourceResult(receipt.result);
            if (!reading) tiles.push(...operationResultTiles(receipt.result, receipt.request), { title: 'No resource projection in this reply', span: 12, content: 'Inspect the returned operation outcome and evidence.' });
            else {
              const rendered = resourceTiles(reading, { route, query, sender: receipt.recipient, request: receipt.request,
                outcomeHref: url('/conversations', { view: 'result', request: receipt.request, responder: receipt.recipient }), evidence: receipt });
              status = rendered.status; tiles.push(...rendered.tiles);
            }
          }
        } catch (error) { if (ctx.signal?.aborted) throw error; status = 502; tiles.push({ title: 'The addressed resource reply could not be read', span: 12, content: error.message }); }
        return page();
      }
      try {
        const inbox = await readPrivateInbox(runAs, subject, query.get('cursor') ?? undefined);
        const readings = inbox.items.map(entry => ({ entry, reading: returnedResource(entry) })).filter(item => item.reading);
        const matches = readings.filter(({ reading }) => !query.get('q') || reading.path.toLowerCase().includes(query.get('q').toLowerCase()));
        tiles.push({ title: 'Returned resource library', span: 12, table: { caption: 'Resources received in your private inbox',
          columns: [{ label: 'Resource', rowHeader: true }, 'Sender', 'Projector', 'Corner', 'Request'],
          rows: matches.map(({ entry, reading }) => [{ text: reading.path, href: url(route, { ...Object.fromEntries(query), message: entry.id }) }, entry.sender, reading.type, reading.corner, entry.value.request]),
          empty: 'No matching resource readings on this inbox page. Request a reading above, or read older messages.' },
          links: [{ href: '/conversations', label: 'Read requests, failures and other replies' }, ...(inbox.nextCursor === undefined ? [] : [{ href: url(route, { ...Object.fromEntries(query), cursor: inbox.nextCursor }), label: 'Older returned resources' }])] });
        if (query.has('message')) {
          const found = readings.find(({ entry }) => entry.id === query.get('message'));
          if (!found) tiles.push({ title: 'Resource not available on this page', span: 12, content: 'The message may be on another inbox page or may carry a refused operation rather than a resource reading.' });
          else {
            const { entry, reading } = found;
            const rendered = resourceTiles(reading, { route, query, sender: entry.sender, request: entry.value.request,
              outcomeHref: url('/conversations', { message: entry.id, ...(query.has('cursor') ? { cursor: query.get('cursor') } : {}) }), evidence: entry });
            status = Math.max(status, rendered.status); tiles.push(...rendered.tiles);
          }
        }
      } catch (error) { status = 502; tiles.push({ title: 'Returned resources could not be read', span: 12, content: error.message }); }
      return page();
    },
  })) };
}
