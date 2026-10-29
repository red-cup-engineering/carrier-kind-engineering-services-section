import {
  htmlRepr,
  jsonRepr,
  type App,
  type Context,
} from "@red-cup-engineering/http-server";

import { carrierFormScript, carrierFormStyles, codeList, functionPanel, htmlEscape, queryParamsFromContext, row } from "../../projecting/web-ui.mts";
import { readMessages, type ChannelMessageRecord, type ChannelSnapshot, type ReadMessagesParams } from "./channel-message.mts";

function paramsFromContext(ctx: Context): ReadMessagesParams {
  return queryParamsFromContext(ctx, ["channel", "focus", "q", "limit"]);
}

function channelRows(channels: readonly ChannelSnapshot[]): string {
  return channels.map((channel) => row([
    `<a href="/messages/channel?channel=${encodeURIComponent(channel.id)}"><code>${htmlEscape(channel.id)}</code></a>`,
    htmlEscape(channel.messageCount),
    htmlEscape(channel.replyCount),
    htmlEscape(channel.endpointReplyCount),
    htmlEscape(channel.errorCount),
    htmlEscape(channel.estimatedTokens),
    htmlEscape(channel.updatedAt),
  ])).join("");
}

function messageRows(messages: readonly ChannelMessageRecord[]): string {
  return messages.slice(-96).reverse().map((message) => row([
    `<code>${htmlEscape(message.channel)}</code>`,
    `<code>${htmlEscape(message.role)}</code>`,
    htmlEscape(message.speaker),
    `<code>${htmlEscape(message.status)}</code>`,
    codeList([
      ...(message.endpointCondition === undefined ? [] : [`condition:${message.endpointCondition}`]),
      ...(message.endpointCharge === undefined ? [] : [`charge:${message.endpointCharge}`]),
      ...(message.apiKeyPresent === undefined ? [] : [`key:${message.apiKeyPresent ? "present" : "absent"}`]),
    ]),
    htmlEscape(message.text.length > 220 ? `${message.text.slice(0, 220)}...` : message.text),
    codeList([message.messageId, ...(message.replyTo === undefined ? [] : [`reply-to:${message.replyTo}`])]),
  ])).join("");
}

function messageForms(query: ReadMessagesParams): string {
  const channel = query.channel ?? query.focus ?? "agent-messages";
  return [
    functionPanel("send-nvidia-message", {
      channel,
      speaker: "agent:codex",
      message: "Name the next most useful Operations Manifold capability in one sentence.",
      budgetLimitTokens: "12000",
      procedure: "operations-manifold.agent-messaging",
      evidence: "messages-webux",
    }),
    functionPanel("read-messages", { channel, limit: "24" }),
    functionPanel("derive-message-learning", { channel, limit: "24" }),
    functionPanel("read-operations-ledger", { focus: "nvidia", limit: "12" }),
    functionPanel("update-work", { id: "work:bind-cloud-nvidia-endpoint-as-a-governed-character:a8a035880911", evidence: "messages-channel" }),
  ].join("");
}

function messagesDocument(result: Awaited<ReturnType<typeof readMessages>>): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>561 Group Operations Manifold Messages</title>
<style>
:root { --line: #2c3732; --surface2: #141918; --field-bg: #0b0e0d; --text: #e7eee9; --muted: #aeb9b2; --button-border: #7ea98f; --button-bg: #a7d9b9; --button-text: #0b0e0d; --pre-text: #b7c7bd; }
body { margin: 0; font: 14px/1.45 system-ui, sans-serif; color: #e7eee9; background: #101312; }
header, main { max-width: 1180px; margin: 0 auto; padding: 24px; }
header { display: flex; justify-content: space-between; gap: 16px; align-items: end; border-bottom: 1px solid #2b3430; }
h1, h2 { margin: 0 0 12px; font-weight: 650; letter-spacing: 0; }
p { color: #aeb9b2; margin: 0; }
section { margin: 24px 0; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { border-bottom: 1px solid #29312e; padding: 8px; vertical-align: top; overflow-wrap: anywhere; }
th { text-align: left; color: #b9c4bd; font-size: 12px; text-transform: uppercase; }
code { color: #aad8c2; background: #1a211e; padding: 1px 4px; border-radius: 4px; }
a { color: #9cc8ff; text-decoration: none; }
.summary { display: flex; gap: 18px; flex-wrap: wrap; color: #c8d2cc; }
${carrierFormStyles()}
</style>
</head>
<body>
<header>
<div>
<h1>Messages</h1>
<p>Agent, human, tool, and endpoint messages as one Operations Manifold carrier.</p>
</div>
<div class="summary">
<span><strong>${htmlEscape(result.snapshot.messageCount)}</strong> messages</span>
<span><strong>${htmlEscape(result.snapshot.replyCount)}</strong> replies</span>
<span><strong>${htmlEscape(result.snapshot.channels.length)}</strong> channels</span>
</div>
</header>
<main>
<section>
<h2>Channels</h2>
<table>
<thead><tr><th>channel</th><th>messages</th><th>replies</th><th>endpoint replies</th><th>errors</th><th>estimated tokens</th><th>updated</th></tr></thead>
<tbody>${channelRows(result.channels)}</tbody>
</table>
</section>
<section>
<h2>Recent Messages</h2>
<table>
<thead><tr><th>channel</th><th>role</th><th>speaker</th><th>status</th><th>endpoint</th><th>text</th><th>ids</th></tr></thead>
<tbody>${messageRows(result.messages)}</tbody>
</table>
</section>
<section>
<h2>Functions</h2>
${messageForms(result.query)}
</section>
</main>
${carrierFormScript()}
</body>
</html>`;
}

export function createChannelMessagesWebApp(repoRoot: string): App {
  return Object.freeze({
    resources: Object.freeze([
      {
        id: "operations-manifold.messages",
        match: "/messages",
        route: "/messages",
        methods: ["GET"],
        produces: ["text/html", "application/json"],
        handler: async (ctx: Context) => {
          const result = await readMessages(repoRoot, paramsFromContext(ctx));
          if (ctx.negotiatedType === "application/json") return jsonRepr(result, { pretty: true });
          return htmlRepr(messagesDocument(result));
        },
      },
      {
        id: "operations-manifold.messages-json",
        match: "/messages.json",
        route: "/messages.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx: Context) => jsonRepr(await readMessages(repoRoot, paramsFromContext(ctx)), { pretty: true }),
      },
      {
        id: "operations-manifold.messages-channel",
        match: "/messages/channel",
        route: "/messages/channel",
        methods: ["GET"],
        produces: ["text/html", "application/json"],
        handler: async (ctx: Context) => {
          const result = await readMessages(repoRoot, paramsFromContext(ctx));
          if (ctx.negotiatedType === "application/json") return jsonRepr(result, { pretty: true });
          return htmlRepr(messagesDocument(result));
        },
      },
    ]),
  });
}
