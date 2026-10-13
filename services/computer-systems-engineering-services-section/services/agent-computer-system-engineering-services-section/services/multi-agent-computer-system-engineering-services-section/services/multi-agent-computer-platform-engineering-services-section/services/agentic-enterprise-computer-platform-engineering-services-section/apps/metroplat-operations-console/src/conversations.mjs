import { htmlRepr } from '@red-cup-engineering/http-services-section/representation';
import { readFormBody } from '@red-cup-engineering/http-services-section/body';
import { subjectOf } from '@red-cup-engineering/computer-networking-engineering-services-section/identity/subject';
import { workspaceDocument, evidenceTile, contentTile } from './workspace-document.mjs';

const link = params => `/conversations?${new URLSearchParams(params)}`;
const packageData = (turn, name) => {
  const packets = (turn?.packages ?? []).filter(packet => packet.name === name);
  if (packets.length !== 1) throw new TypeError((turn?.messages ?? []).join('\n') || `The native ${name} reading is unavailable.`);
  return packets[0].data;
};

/** Same signed native carrier as the city's messages/message commands. */
export async function readPrivateInbox(runAs, subject, cursor) {
  if (cursor !== undefined && (!cursor || /\s/u.test(cursor) || cursor.length > 4096)) throw new TypeError('The inbox cursor is invalid.');
  const inbox = packageData(await runAs(subject, 'world-command', { line: `messages${cursor === undefined ? '' : ` ${cursor}`}` }), 'Comm.Inbox');
  if (!Array.isArray(inbox?.items)) throw new TypeError('The native inbox did not return its items.');
  return inbox;
}

export async function sendPrivateMessage(runAs, subject, recipient, text) {
  if (typeof recipient !== 'string' || !recipient || /\s/u.test(recipient) || recipient.length > 2048) throw new TypeError('Supply one actor address.');
  if (!text?.trim() || Buffer.byteLength(text) > 16384) throw new TypeError('Supply a message of at most 16384 bytes.');
  const receipt = packageData(await runAs(subject, 'world-command', { line: `message ${recipient} ${text}` }), 'Comm.Submission');
  if (typeof receipt?.request !== 'string' || typeof receipt?.recipient !== 'string') throw new TypeError('The native sender did not return an addressed request receipt.');
  return receipt;
}

export function sameOriginRequest(req) {
  try { return new URL(req.headers.origin ?? '').host === req.headers.host; } catch { return false; }
}

export const submissionTiles = receipt => [
  { title: 'Submitted · awaiting a returned result', span: 12, content: `Request ${receipt.request} was submitted to ${receipt.recipient}.`,
    links: [{ href: link({ request: receipt.request }), label: 'Find the correlated reply' }] },
  evidenceTile('Submission receipt', receipt),
];

export function conversationTiles(entry, cursor) {
  const tiles = [{ title: 'Conversation', span: 12, content: `From ${entry.sender ?? 'Sender unavailable'}. Kind: ${entry.kind}.`,
    links: typeof entry.sender === 'string' ? [{ href: link({ recipient: entry.sender }), label: 'Write to this actor' }] : [] }];
  if (entry.kind === 'feltos.actor.message' && typeof entry.value?.text === 'string') tiles.push(contentTile('Message', entry.value.text));
  else if (entry.kind === 'metroplat.dispatch.result') {
    const result = entry.value?.result;
    tiles.push({ title: 'Returned operation result', span: 12,
      content: `Request: ${entry.value?.request ?? 'Not supplied'}. Operation: ${result?.verb ?? 'Not supplied'}. State: ${result?.state ?? 'Not supplied'}. Exit code: ${result?.code ?? 'Not supplied'}. Exit code alone does not establish that the requested business outcome was accepted.` });
    if (typeof result?.stdout === 'string') tiles.push(contentTile('Output', result.stdout));
    if (typeof result?.stderr === 'string' && result.stderr) tiles.push(contentTile('Error output', result.stderr));
    if (result?.obstructions?.length) tiles.push(contentTile('Obstructions', result.obstructions.join('\n')));
    tiles.push({ title: 'Resource views', span: 12, links: [
      { href: `/resources?${new URLSearchParams({ message: entry.id, ...(cursor === undefined ? {} : { cursor }) })}`, label: 'Open returned resource' },
    ] });
  } else tiles.push(contentTile('Received activity', entry.text ?? `Activity ${entry.kind}`));
  tiles.push(evidenceTile('Full received message and evidence', entry));
  return tiles;
}

export function conversationsApp({ runAs, navigation, navigationTitle }) {
  const page = (title, tiles, status = 200) => htmlRepr(workspaceDocument({ title, tiles, navigation, navigationTitle,
    subtitle: 'Private actor conversations and returned operations' }), { status, cacheControl: { noStore: true } });
  const compose = params => ({ title: 'Write to an agent or person', span: 6, form: {
    action: '/conversations', method: 'post', enhance: false, fields: [
      { name: 'recipient', label: 'Actor address', value: params.get('recipient') ?? '', required: true, placeholder: 'actor@instance or an actor URL' },
      { name: 'text', kind: 'textarea', label: 'Message', value: params.get('text') ?? '', required: true,
        description: 'Your signed private message goes to this actor. Operation requests use the native {verb,input} JSON form.' },
    ], submitters: [{ label: 'Send private message' }],
  } });
  const filter = params => ({ title: 'Find a conversation', span: 6, form: { action: '/conversations', method: 'get', fields: [
    { name: 'sender', label: 'Exact sender', value: params.get('sender') ?? '' },
    { name: 'request', label: 'Request address', value: params.get('request') ?? '' },
    { name: 'task', label: 'Task identifier', value: params.get('task') ?? '' },
    { name: 'q', label: 'Words in this inbox page', value: params.get('q') ?? '' },
  ], submitters: [{ label: 'Find replies' }] } });
  return { resources: [{ id: 'ops-conversations', match: '/conversations', methods: ['GET', 'POST'], produces: ['text/html'], handler: async ctx => {
    const principal = ctx.locals?.principal;
    if (!principal) return ctx.req.method === 'GET'
      ? { status: 303, headers: { location: `/sign-in?return_to=${encodeURIComponent(ctx.url.pathname + ctx.url.search)}` } } : { status: 401 };
    if (ctx.req.method === 'POST' && !sameOriginRequest(ctx.req)) return { status: 403 };
    const subject = subjectOf(principal), params = ctx.req.method === 'POST' ? await readFormBody(ctx.req, { maxBytes: 64 * 1024 }) : ctx.url.searchParams;
    let receipt, sendError;
    if (ctx.req.method === 'POST') {
      try { receipt = await sendPrivateMessage(runAs, subject, params.get('recipient'), params.get('text')); }
      catch (error) { sendError = error; }
    }
    const tiles = [filter(ctx.url.searchParams), compose(receipt ? new URLSearchParams({ recipient: params.get('recipient') }) : params),
      ...(receipt ? submissionTiles(receipt) : []), ...(sendError ? [{ title: 'The message was not confirmed submitted', span: 12, content: sendError.message }] : [])];
    try {
      const inbox = await readPrivateInbox(runAs, subject, ctx.url.searchParams.get('cursor') ?? undefined);
      const query = ctx.url.searchParams;
      const entries = inbox.items.filter(entry => (!query.get('sender') || entry.sender === query.get('sender'))
        && (!query.get('request') || entry.value?.request === query.get('request'))
        && (!query.get('task') || entry.taskId === query.get('task'))
        && (!query.get('q') || JSON.stringify(entry).toLowerCase().includes(query.get('q').toLowerCase())));
      tiles.push({ title: 'Private inbox', span: 12, content: `${entries.length} matching messages on this page; ${inbox.totalItems ?? 'unknown'} messages held in the native inbox. Filters apply to this page.`,
        table: { caption: 'Received messages', columns: [{ label: 'Message', rowHeader: true }, 'Sender', 'Kind', 'Request', 'Task'],
          rows: entries.map(entry => [{ text: entry.id, href: link({ ...Object.fromEntries(query), message: entry.id }) }, entry.sender ?? 'Not supplied', entry.kind, entry.value?.request ?? 'Not supplied', entry.taskId ?? 'Not supplied']),
          empty: 'No matching messages on this page.' },
        links: [{ href: '/conversations', label: 'Read newest messages' }, ...(inbox.nextCursor === undefined ? [] : [{ href: link({ ...Object.fromEntries(query), cursor: inbox.nextCursor }), label: 'Older messages' }])] });
      if (query.has('message')) {
        const selected = inbox.items.find(entry => entry.id === query.get('message'));
        tiles.push(...(selected ? conversationTiles(selected, query.get('cursor') ?? undefined) : [{ title: 'Message unavailable on this page', span: 12, content: 'Read the page containing this message. Its absence here is not evidence that it was deleted.' }]));
      }
      return page(sendError ? 'Error: Message submission unconfirmed' : 'Conversations', tiles, sendError ? 502 : 200);
    } catch (error) {
      return page('Error: Inbox unavailable', [...tiles, { title: 'Private inbox could not be read', span: 12, content: error.message }], 502);
    }
  } }] };
}
