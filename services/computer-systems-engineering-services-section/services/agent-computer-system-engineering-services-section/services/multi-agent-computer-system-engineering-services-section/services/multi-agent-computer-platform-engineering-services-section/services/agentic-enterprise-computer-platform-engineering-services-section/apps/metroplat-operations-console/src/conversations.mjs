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

/** Read one addressed native reply; never send, replay or scan inbox pages. */
export async function readCorrelatedReply(runAs, subject, request, responder) {
  if (typeof request !== 'string' || !request || /\s/u.test(request) || request.length > 4096) throw new TypeError('Supply one request address.');
  if (typeof responder !== 'string' || !responder || /\s/u.test(responder) || responder.length > 2048) throw new TypeError('Supply the expected responder’s actor URL.');
  const result = packageData(await runAs(subject, 'world-command', { line: `messages result ${request} ${responder}` }), 'Comm.Result');
  if (result?.request !== request || result.recipient !== responder || !['awaiting-reply', 'reply-received'].includes(result.stage)) throw new TypeError('The native reply reading does not match this request and responder.');
  if (result.stage === 'reply-received' && (typeof result.reply !== 'string' || !result.result || typeof result.result !== 'object' || Array.isArray(result.result))) throw new TypeError('The native reply did not retain its envelope and result.');
  return result;
}

export async function sendPrivateMessage(runAs, subject, recipient, text) {
  if (typeof recipient !== 'string' || !recipient || /\s/u.test(recipient) || recipient.length > 2048) throw new TypeError('Supply one actor address.');
  if (!text?.trim() || Buffer.byteLength(text) > 16384) throw new TypeError('Supply a message of at most 16384 bytes.');
  const receipt = packageData(await runAs(subject, 'world-command', { line: `message ${recipient} ${text}` }), 'Comm.Submission');
  if (typeof receipt?.request !== 'string' || typeof receipt?.recipient !== 'string') throw new TypeError('The native sender did not return an addressed request receipt.');
  return receipt;
}

/** Durable character/office mail uses the body's existing carrier, not a network address. */
export async function sendCharacterMail(runAs, subject, recipient, text) {
  if (typeof recipient !== 'string' || !recipient.trim() || recipient.length > 2048) throw new TypeError('Choose a character or office.');
  if (typeof text !== 'string' || !text.trim() || text.length > 2000) throw new TypeError('Supply a message of at most 2000 characters.');
  const receipt = await runAs(subject, 'mail', { to: recipient, words: text });
  if (receipt?.kind !== 'metroplat.mail-sent' || typeof receipt.id !== 'string' || !Array.isArray(receipt.to)) throw new TypeError('The native mail carrier did not confirm the addressed message.');
  return receipt;
}

export async function readCharacterMail(runAs, subject) {
  const body = await runAs(subject, 'body', {});
  if (body?.kind !== 'organizing.agency.lived-body' || !Array.isArray(body.mail?.messages) || !Array.isArray(body.mail?.unread)) throw new TypeError('The native body did not return its mail history.');
  return body;
}

export function sameOriginRequest(req) {
  try { return new URL(req.headers.origin ?? '').host === req.headers.host; } catch { return false; }
}

export const submissionTiles = receipt => [
  { title: 'Submitted · awaiting a returned result', span: 12, content: `Request ${receipt.request} was submitted to ${receipt.recipient}.`,
    links: [{ href: link({ request: receipt.request, responder: receipt.recipient, view: 'result' }), label: 'Read the addressed reply' }] },
  evidenceTile('Submission receipt', receipt),
];

export function operationResultTiles(result, request) {
  return [{ title: 'Returned operation result', span: 12,
    content: `Request: ${request ?? 'Not supplied'}. Operation: ${result?.verb ?? 'Not supplied'}. State: ${result?.state ?? 'Not supplied'}. Exit code: ${result?.code ?? 'Not supplied'}. Exit code alone does not establish that the requested business outcome was accepted.` },
    ...(typeof result?.stdout === 'string' ? [contentTile('Output', result.stdout)] : []),
    ...(typeof result?.stderr === 'string' && result.stderr ? [contentTile('Error output', result.stderr)] : []),
    ...(result?.obstructions?.length ? [contentTile('Obstructions', result.obstructions.join('\n'))] : []),
  ];
}

export function correlatedReplyTiles(receipt) {
  return [{ title: receipt.stage === 'reply-received' ? 'Addressed reply received' : 'Awaiting an addressed reply', span: 12,
    content: `Request ${receipt.request}. Expected responder ${receipt.recipient}. ${receipt.stage === 'awaiting-reply' ? 'No matching reply is held in this reading.' : `Original reply ${receipt.reply}.`}` },
    ...(receipt.stage === 'reply-received' ? [...operationResultTiles(receipt.result, receipt.request), { title: 'Continue the work', span: 12, links: [
      { href: `/resources?${new URLSearchParams({ request: receipt.request, responder: receipt.recipient })}`, label: 'Open returned resource' },
      { href: link({ recipient: receipt.recipient }), label: 'Write to the responder' },
    ] }] : []), evidenceTile('Native addressed reply reading', receipt),
  ];
}

export function conversationTiles(entry, cursor) {
  const tiles = [{ title: 'Conversation', span: 12, content: `From ${entry.sender ?? 'Sender unavailable'}. Kind: ${entry.kind}.`,
    links: typeof entry.sender === 'string' ? [{ href: link({ recipient: entry.sender }), label: 'Write to this actor' }] : [] }];
  if (entry.kind === 'feltos.actor.message' && typeof entry.value?.text === 'string') tiles.push(contentTile('Message', entry.value.text));
  else if (entry.kind === 'metroplat.dispatch.result') {
    const result = entry.value?.result;
    tiles.push(...operationResultTiles(result, entry.value?.request));
    tiles.push({ title: 'Resource views', span: 12, links: [
      { href: `/resources?${new URLSearchParams({ message: entry.id, ...(cursor === undefined ? {} : { cursor }) })}`, label: 'Open returned resource' },
    ] });
  } else tiles.push(contentTile('Received activity', entry.text ?? `Activity ${entry.kind}`));
  tiles.push(evidenceTile('Full received message and evidence', entry));
  return tiles;
}

export function conversationsApp({ runAs, navigation, navigationTitle }) {
  const page = (title, tiles, status = 200) => htmlRepr(workspaceDocument({ title, tiles, navigation, navigationTitle,
    subtitle: 'Character mail, federated actor conversations and returned operations' }), { status, cacheControl: { noStore: true } });
  const compose = params => ({ title: 'Write to an agent or person', span: 6, form: {
    action: '/conversations', method: 'post', enhance: false, fields: [
      { name: 'channel', kind: 'select', label: 'Delivery', value: params.get('channel') ?? 'actor', options: [
        { value: 'character', label: 'Character or office mail' }, { value: 'actor', label: 'Federated actor message' },
      ] },
      { name: 'recipient', label: params.get('channel') === 'character' ? 'Character or office' : 'Actor address', value: params.get('recipient') ?? '', required: true,
        description: 'Find a recipient in Agents and offices. Network actors use their actual actor address.' },
      { name: 'text', kind: 'textarea', label: 'Message', value: params.get('text') ?? '', required: true,
        description: 'Character mail allows 2000 characters and waits for a session to read it. Federated messages allow 16384 bytes.' },
    ], submitters: [{ label: 'Send message' }],
  }, links: [{ href: '/agents', label: 'Find an agent or office' }] });
  const filter = params => ({ title: 'Find a conversation', span: 6, form: { action: '/conversations', method: 'get', fields: [
    { name: 'channel', kind: 'select', label: 'Inbox', value: params.get('channel') ?? 'actor', options: [{ value: 'character', label: 'Your character mail' }, { value: 'actor', label: 'Your federated messages' }] },
    { name: 'sender', label: 'Exact sender', value: params.get('sender') ?? '' },
    ...(params.get('channel') === 'character' ? [] : [
      { name: 'request', label: 'Request address', value: params.get('request') ?? '' },
      { name: 'task', label: 'Task identifier', value: params.get('task') ?? '' },
    ]),
    { name: 'q', label: params.get('channel') === 'character' ? 'Words in your mail history' : 'Words in this inbox page', value: params.get('q') ?? '' },
  ], submitters: [{ label: 'Find replies' }] } });
  const follow = params => ({ title: 'Follow an operation request', span: 12, form: { action: '/conversations', method: 'get', fields: [
    { name: 'view', kind: 'hidden', value: 'result' }, { name: 'channel', kind: 'hidden', value: 'actor' },
    { name: 'request', label: 'Request address from submission', value: params.get('request') ?? '', required: true },
    { name: 'responder', label: 'Expected responder’s actor URL', value: params.get('responder') ?? '', required: true },
  ], submitters: [{ label: 'Read addressed reply' }] } });
  return { resources: [{ id: 'ops-conversations', match: '/conversations', methods: ['GET', 'POST'], produces: ['text/html'], handler: async ctx => {
    const principal = ctx.locals?.principal;
    if (!principal) return ctx.req.method === 'GET'
      ? { status: 303, headers: { location: `/sign-in?return_to=${encodeURIComponent(ctx.url.pathname + ctx.url.search)}` } } : { status: 401 };
    if (ctx.req.method === 'POST' && !sameOriginRequest(ctx.req)) return { status: 403 };
    const subject = subjectOf(principal), params = ctx.req.method === 'POST' ? await readFormBody(ctx.req, { maxBytes: 64 * 1024 }) : ctx.url.searchParams;
    const channel = params.get('channel') ?? 'actor';
    if (!['character', 'actor'].includes(channel)) return page('Error: Invalid delivery', [compose(params), { title: 'Choose a delivery', span: 12, content: 'Choose character mail or federated actor messages.' }], 400);
    let receipt, sendError;
    if (ctx.req.method === 'POST') {
      try { receipt = await (channel === 'character' ? sendCharacterMail : sendPrivateMessage)(runAs, subject, params.get('recipient'), params.get('text')); }
      catch (error) { sendError = error; }
    }
    const inboxParams = new URLSearchParams(ctx.url.searchParams); inboxParams.set('channel', channel);
    const tiles = [filter(inboxParams), compose(receipt ? new URLSearchParams({ recipient: params.get('recipient'), channel }) : params),
      ...(receipt ? channel === 'character' ? [{ title: 'Mail recorded · awaiting a session to read it', span: 12, content: `Message ${receipt.id} is addressed to ${receipt.to.join(', ')}.`, links: [{ href: '/conversations?channel=character', label: 'Read your character mail' }] }, evidenceTile('Native mail receipt', receipt)] : submissionTiles(receipt) : []),
      ...(sendError ? [{ title: 'The message was not confirmed submitted', span: 12, content: sendError.message }] : [])];
    if (channel === 'character') {
      try {
        const body = await readCharacterMail(runAs, subject), unread = new Set(body.mail.unread.map(message => message.id));
        const query = ctx.url.searchParams;
        const pageNumber = Number(query.get('page') ?? '1');
        if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) return page('Error: Check the mail page', [...tiles, { title: 'Invalid page', span: 12, content: 'Choose a positive whole page number.' }], 400);
        const messages = body.mail.messages.filter(message => (!query.get('sender') || message.from === query.get('sender'))
          && (!query.get('q') || message.words.toLowerCase().includes(query.get('q').toLowerCase())));
        tiles.push({ title: 'Your character mail', span: 12, content: `${body.character.name ?? body.character.id}: ${body.mail.total} received messages; ${body.mail.unread.length} unread. Reading this page does not mark mail read.`,
          links: [{ href: `/agents?${new URLSearchParams({ character: body.character.key })}`, label: 'Inspect your character and sessions' }] });
        tiles.push({ title: 'Mail history', span: 12, table: { caption: 'Durable messages to your character and its offices', columns: [{ label: 'Message', rowHeader: true }, 'From', 'Addressed to', 'Sent', 'Reading'],
          rows: [...messages].reverse().slice((pageNumber - 1) * 50, pageNumber * 50).map(message => [{ text: message.id, href: link({ ...Object.fromEntries(query), channel, message: message.id }) }, message.from, [message.to].flat().join(', '), message.at, unread.has(message.id) ? 'Unread' : 'Read by a session']), empty: 'No matching mail on this page.' },
          content: `${messages.length} matching messages; page ${pageNumber}, up to 50 messages.`, links: [
            ...(pageNumber > 1 ? [{ href: link({ ...Object.fromEntries(query), channel, page: String(pageNumber - 1) }), label: 'Newer mail' }] : []),
            ...(pageNumber * 50 < messages.length ? [{ href: link({ ...Object.fromEntries(query), channel, page: String(pageNumber + 1) }), label: 'Older mail' }] : []),
          ] });
        if (query.has('message')) {
          const selected = body.mail.messages.find(message => message.id === query.get('message'));
          tiles.push(...(selected ? [contentTile('Message', selected.words), { title: 'Reply', span: 12, links: [{ href: link({ channel, recipient: selected.from }), label: 'Write to the sender' }] }, evidenceTile('Mail and original address', selected)] : [{ title: 'Message unavailable', span: 12, content: 'This body reading does not contain the selected message.' }]));
        }
        return page(sendError ? 'Error: Message submission unconfirmed' : 'Character conversations', tiles, sendError ? 502 : 200);
      } catch (error) {
        if (ctx.signal?.aborted) throw error;
        return page('Error: Character mail unavailable', [...tiles, { title: 'Your mail history could not be read', span: 12, content: error.message }], 502);
      }
    }
    tiles.push(follow(inboxParams));
    if (ctx.req.method === 'GET' && ctx.url.searchParams.get('view') === 'result') {
      try {
        const receipt = await readCorrelatedReply(runAs, subject, ctx.url.searchParams.get('request'), ctx.url.searchParams.get('responder'));
        return page('Operation reply', [...tiles, ...correlatedReplyTiles(receipt)]);
      } catch (error) {
        if (ctx.signal?.aborted) throw error;
        return page('Error: Reply unavailable', [...tiles, { title: 'The addressed reply could not be read', span: 12, content: error.message }], 502);
      }
    }
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
