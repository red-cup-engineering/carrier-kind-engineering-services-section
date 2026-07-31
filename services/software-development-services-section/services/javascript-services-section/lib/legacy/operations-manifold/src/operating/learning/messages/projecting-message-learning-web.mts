import {
  htmlRepr,
  jsonRepr,
  type App,
  type Context,
} from "@red-cup-engineering/http-server";

import { carrierFormScript, carrierFormStyles, codeList, functionPanel, htmlEscape, queryParamsFromContext, row } from "../../projecting/web-ui.mts";
import { deriveMessageLearning, type MessageLearningCandidate, type MessageLearningParams } from "./derive-message-learning.mts";

function paramsFromContext(ctx: Context): MessageLearningParams {
  return queryParamsFromContext(ctx, ["channel", "focus", "q", "limit", "status"]);
}

function candidateRows(candidates: readonly MessageLearningCandidate[]): string {
  return candidates.map((candidate) => row([
    `<code>${htmlEscape(candidate.kind)}</code>`,
    `<code>${htmlEscape(candidate.review)}</code>`,
    `<code>${htmlEscape(candidate.channel)}</code>`,
    htmlEscape(candidate.speaker),
    htmlEscape(candidate.summary),
    codeList([candidate.id, candidate.messageId]),
  ])).join("");
}

function messageLearningForms(query: MessageLearningParams): string {
  const channel = query.channel ?? query.focus ?? query.q ?? "agent-messages";
  return [
    functionPanel("derive-message-learning", { channel, limit: query.limit ?? "24" }),
    functionPanel("read-messages", { channel, limit: query.limit ?? "24" }),
    functionPanel("read-recognition", { intent: "message learning", focus: "sites/ops.561.group" }),
    functionPanel("consolidate-memory", { intent: "message learning review" }),
  ].join("");
}

function messageLearningDocument(result: Awaited<ReturnType<typeof deriveMessageLearning>>): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>561 Group Operations Manifold Message Learning</title>
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
<h1>Message Learning</h1>
<p>Reviewable learning candidates derived from human, agent, tool, and endpoint messages.</p>
</div>
<div class="summary">
<span><strong>${htmlEscape(result.candidates.length)}</strong> candidates</span>
<span><strong>${htmlEscape(result.lessons.length)}</strong> lessons</span>
<span><strong>${htmlEscape(result.settlement.value)}</strong> settlement</span>
</div>
</header>
<main>
<section>
<h2>Candidates</h2>
<table>
<thead><tr><th>kind</th><th>review</th><th>channel</th><th>speaker</th><th>summary</th><th>evidence</th></tr></thead>
<tbody>${candidateRows(result.candidates)}</tbody>
</table>
</section>
<section>
<h2>Interfaces</h2>
${codeList(result.interfaces.map((item) => item.bin))}
</section>
<section>
<h2>Functions</h2>
${messageLearningForms(result.query)}
</section>
</main>
${carrierFormScript()}
</body>
</html>`;
}

export function createMessageLearningWebApp(repoRoot: string): App {
  return Object.freeze({
    resources: Object.freeze([
      {
        id: "operations-manifold.message-learning",
        match: "/message-learning",
        route: "/message-learning",
        methods: ["GET"],
        produces: ["text/html", "application/json"],
        handler: async (ctx: Context) => {
          const result = await deriveMessageLearning(repoRoot, paramsFromContext(ctx));
          if (ctx.negotiatedType === "application/json") return jsonRepr(result, { pretty: true });
          return htmlRepr(messageLearningDocument(result));
        },
      },
      {
        id: "operations-manifold.message-learning-json",
        match: "/message-learning.json",
        route: "/message-learning.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx: Context) => jsonRepr(await deriveMessageLearning(repoRoot, paramsFromContext(ctx)), { pretty: true }),
      },
    ]),
  });
}
