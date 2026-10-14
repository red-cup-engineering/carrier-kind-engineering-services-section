import { htmlRepr } from '@red-cup-engineering/http-services-section/representation';
import { readFormBody } from '@red-cup-engineering/http-services-section/body';
import { subjectOf } from '@red-cup-engineering/computer-networking-engineering-services-section/identity/subject';
import { workspaceDocument, evidenceTile, contentTile } from './workspace-document.mjs';
import { readPrivateInbox, readCorrelatedReply, operationResultTiles, sendPrivateMessage, sameOriginRequest, submissionTiles } from './conversations.mjs';

const LENSES = { '/code': 'Code', '/knowledge': 'Knowledge', '/resources': 'Resources' };
const url = (route, params) => `${route}?${new URLSearchParams(params)}`;

/** Presentation of the existing host-admitted source operations. The host owns
 * source selection, capacity, actor authority and reading; the UI never opens files. */
async function sourceWorkspace(runAs, subject, route, query, signal) {
  const path = query.get('path') ?? '', duty = query.get('duty') ?? '';
  const mode = query.get('mode') ?? 'lines', words = query.get('q') ?? '';
  const tiles = [{ title: 'Open source', span: 12, form: {
    action: route, method: 'get', fields: [
      { name: 'view', kind: 'hidden', value: 'source' },
      { name: 'path', label: 'Exact file path in the admitted repository', value: path, required: true },
      { name: 'duty', label: 'Duty worktree (optional)', value: duty },
      { name: 'q', label: 'Find words in this file (optional)', value: words },
      { name: 'mode', kind: 'select', label: 'Read as', value: mode, options: [{ value: 'lines', label: 'Numbered source lines' }, { value: 'window', label: 'Byte window for large files' }] },
    ], submitters: [{ label: 'Read source' }],
  } }];
  if (!path) return { tiles, status: 200 };
  let admitted = false;
  try {
    if (path.length > 512 || path.includes('\0') || duty.length > 512 || duty.includes('\0') || words.length > 1024 || !['lines', 'window'].includes(mode)) throw new TypeError('Use a bounded file path, duty and search query.');
    const input = { scope: 'repository', path, ...(duty ? { duty } : {}) };
    const integer = (name, fallback) => {
      const value = query.has(name) ? Number(query.get(name)) : fallback;
      if (!Number.isSafeInteger(value) || value < (name === 'startLine' ? 1 : 0)) throw new TypeError(`Choose a valid ${name}.`);
      return value;
    };
    let verb;
    if (words.trim()) { verb = 'workspace-text-search'; input.query = words; input.limit = 50; }
    else if (mode === 'window') {
      verb = 'workspace-file-window'; input.byteOffset = integer('byteOffset', 0); input.byteCount = 32768;
      if (query.has('expected')) {
        if (!/^[a-f0-9]{64}$/.test(query.get('expected'))) throw new TypeError('The continuation revision is invalid.');
        input.expected = query.get('expected');
      }
    } else { verb = 'workspace-file-slice'; input.startLine = integer('startLine', 1); input.lineCount = 100; }
    admitted = true;
    const reading = await runAs(subject, verb, input);
    tiles.push(evidenceTile('Source reading and host evidence', reading));
    const link = (values, label) => ({ href: url(route, { view: 'source', path, ...(duty ? { duty } : {}), ...values }), label });
    if (reading?.kind === 'workspace.read:obstruction' || reading?.kind === 'workspace.source-snapshot:obstruction') {
      tiles.unshift({ title: 'Source unavailable', span: 12, content: reading.message ?? reading.reason,
        links: [link({}, 'Reselect this source'), link({ mode: 'window' }, 'Read a bounded byte window')] });
      return { tiles, status: 502 };
    }
    if (verb === 'workspace-text-search' && reading?.kind === 'metroplat.filesystem.workspace-text-search-readout' && Array.isArray(reading.matches)) {
      tiles.push({ title: 'Matches in this source', span: 12, content: `Source ${reading.contentAddress}. ${reading.truncated ? 'The result limit was reached.' : 'This bounded search is complete.'}`,
        table: { caption: `Words in ${reading.pathPrefix ?? path}`, columns: [{ label: 'Line', rowHeader: true }, 'Source'],
          rows: reading.matches.map(match => [{ text: String(match.line), href: url(route, { view: 'source', path: match.path, ...(duty ? { duty } : {}), startLine: Math.max(1, match.line - 5) }) + `#source-L${match.line}` }, match.text]), empty: 'No matching lines in this source snapshot.' } });
    } else if (verb === 'workspace-file-slice' && reading?.kind === 'metroplat.filesystem.workspace-file-slice-readout' && Array.isArray(reading.lines)) {
      tiles.push(contentTile(reading.path, '', { code: true, lines: reading.lines }), { title: 'Position in this source', span: 12, content: `Source ${reading.contentAddress}. Each page reports the source it read.`,
        links: [...(reading.truncatedBefore ? [link({ startLine: Math.max(1, reading.startLine - 100) }, 'Previous source lines')] : []),
          ...(reading.truncatedAfter ? [link({ startLine: reading.startLine + reading.lineCount }, 'Next source lines')] : [])] });
    } else if (verb === 'workspace-file-window' && reading?.kind === 'metroplat.filesystem.workspace-file-window-readout' && typeof reading.source === 'string') {
      tiles.push(contentTile(reading.path, reading.source), { title: 'Position in this file', span: 12,
        content: `Bytes ${reading.byteOffset}–${reading.byteOffset + reading.byteCount}. Window ${reading.contentAddress}. Revision ${reading.revision}.`,
        links: [...(reading.eof ? [] : [link({ mode: 'window', byteOffset: reading.nextByteOffset, expected: reading.revision }, 'Continue at the same file revision')]), link({ mode: 'window' }, 'Reselect from the beginning')] });
    } else throw new TypeError('The source owner did not return the requested reading.');
    return { tiles, status: 200 };
  } catch (error) { if (signal?.aborted) throw error; tiles.push({ title: admitted ? 'Source could not be read' : 'Check the source selection', span: 12, content: error.message }); return { tiles, status: admitted ? 502 : 400 }; }
}

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
    links: [{ href: outcomeHref, label: 'Read the full operation outcome' }, { href: url(route, { view: 'received', recipient: sender, path: reading.path, corner: reading.corner }), label: 'Prepare an updated reading' },
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
      tiles.push({ title: 'Resource views', span: 12, links: [
        { href: url(route, { view: 'source' }), label: 'Read admitted repository source' },
        { href: url(route, { view: 'received' }), label: 'Read resources returned by actors' },
      ] });
      if (ctx.req.method === 'GET' && (query.get('view') === 'source' || route === '/code' && query.get('view') !== 'received' && !query.has('recipient') && !query.has('request') && !query.has('responder') && !query.has('message') && !query.has('cursor'))) {
        const result = await sourceWorkspace(runAs, subject, route, query, ctx.signal); tiles.push(...result.tiles); status = result.status; return page();
      }
      tiles.push({ title: `Read ${label.toLowerCase()} from an actor`, span: 6, form: {
        action: route, method: 'post', enhance: false, fields: [
          { name: 'recipient', label: 'Actor holding the resource', value: params.get('recipient') ?? '', required: true },
          { name: 'path', label: 'Resource path at that actor', value: params.get('path') ?? '', required: true },
          { name: 'corner', kind: 'select', label: 'Reading corner', value: params.get('corner') ?? '', options: [
            { value: '', label: 'Native default' }, ...['bottom', 'data', 'prose', 'assertion'].map(value => ({ value, label: value })),
          ] },
        ], submitters: [{ label: 'Request resource reading' }],
      } }, { title: 'Find returned resources', span: 6, form: { action: route, method: 'get', fields: [
        { name: 'view', kind: 'hidden', value: 'received' },
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
