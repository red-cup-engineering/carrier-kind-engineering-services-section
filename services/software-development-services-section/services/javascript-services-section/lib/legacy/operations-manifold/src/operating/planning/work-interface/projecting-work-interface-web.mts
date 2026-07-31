import {
  htmlRepr,
  jsonRepr,
  type App,
  type Context,
} from "@red-cup-engineering/http-server";

import { carrierFormScript, codeList, densePageStyles, functionPanel, htmlEscape, queryParamsFromContext, row } from "../../projecting/web-ui.mts";
import {
  selectWorkInterface,
  type SelectWorkInterfaceParams,
  type SelectWorkInterfaceReading,
} from "./select-work-interface.mts";

function paramsFromContext(ctx: Context): SelectWorkInterfaceParams {
  const params = queryParamsFromContext<Readonly<Record<"focus" | "q" | "intent" | "limit" | "budget" | "detail" | "office" | "agent" | "session" | "session_id", string | undefined>>>(ctx, ["focus", "q", "intent", "limit", "budget", "detail", "office", "agent", "session", "session_id"]);
  return Object.freeze({
    ...params,
    session: params.session ?? params.session_id,
  });
}

function selectedRows(reading: SelectWorkInterfaceReading): string {
  const selected = reading.selected;
  return [
    row(["<strong>action</strong>", htmlEscape(selected.action)]),
    row(["<strong>node</strong>", selected.node === null ? "" : `<code>${htmlEscape(selected.node.id)}</code><br>${htmlEscape(selected.node.title)}`]),
    row(["<strong>interface</strong>", selected.nextInterface === null ? "" : `<a href="/${htmlEscape(selected.nextInterface.bin)}">${htmlEscape(selected.nextInterface.bin)}</a><br>${htmlEscape(selected.nextInterface.purpose)}<br><code>${htmlEscape(JSON.stringify(selected.nextInterface.params))}</code>`]),
    row(["<strong>processor</strong>", selected.processor === null ? "" : `<code>${htmlEscape(selected.processor.id)}</code><br>${htmlEscape(selected.processor.summary)}`]),
    row(["<strong>evidence</strong>", codeList(selected.evidence)]),
  ].join("");
}

function rationaleRows(reading: SelectWorkInterfaceReading): string {
  return reading.selected.rationale.map((item) => row([htmlEscape(item)])).join("");
}

function contextRows(reading: SelectWorkInterfaceReading): string {
  return [
    row(["<strong>suit</strong>", `<code>${htmlEscape(reading.context.suit)}</code>`]),
    row(["<strong>office</strong>", htmlEscape(reading.context.office)]),
    row(["<strong>agent</strong>", htmlEscape(reading.context.agent)]),
    row(["<strong>session</strong>", reading.context.session === null ? "" : `<code>${htmlEscape(reading.context.session)}</code>`]),
    row(["<strong>budget</strong>", `${htmlEscape(reading.context.budget)} tokens<br>${htmlEscape(reading.context.tokenEstimate)} estimated`]),
    row(["<strong>constraints</strong>", codeList(reading.context.constraints)]),
    row(["<strong>perception</strong>", codeList(reading.context.perception)]),
    row(["<strong>memory</strong>", codeList(reading.context.memory)]),
  ].join("");
}

function nodeRows(reading: SelectWorkInterfaceReading): string {
  return reading.topology.selectedNodes.slice(0, 16).map((node) => row([
    `<code>${htmlEscape(node.kind)}</code>`,
    `<code>${htmlEscape(node.id)}</code><br>${htmlEscape(node.title)}`,
    htmlEscape(node.workKind ?? node.layer),
    htmlEscape(node.status),
    codeList(node.interfaces),
  ])).join("");
}

function interfaceRows(reading: SelectWorkInterfaceReading): string {
  return reading.decision.interfaces.slice(0, 16).map((item) => row([
    `<a href="/${htmlEscape(item.bin)}">${htmlEscape(item.bin)}</a>`,
    htmlEscape(item.source),
    htmlEscape(item.purpose),
    `<code>${htmlEscape(JSON.stringify(item.params))}</code>`,
  ])).join("");
}

export function workInterfaceWebDocument(reading: SelectWorkInterfaceReading): string {
  const query = {
    focus: reading.focus,
    intent: reading.intent,
    office: reading.context.office,
    agent: reading.context.agent,
    ...(reading.context.session === null ? {} : { session: reading.context.session }),
    limit: "8",
    detail: reading.projection.detail,
  };
  const jsonQuery = new URLSearchParams(query).toString();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Work Interface Selection | 561 Group Operations Manifold</title>
<style>
${densePageStyles({ maxWidth: 1180, extraRootVars: ";--gold:#d9a441" })}
.selected{border:1px solid #6aa57d;border-radius:8px;padding:14px;background:#121614}
</style>
</head>
<body>
<main>
<header>
<h1>Work Interface Selection</h1>
<p>${htmlEscape(reading.intent)}</p>
<nav>
<a href="/">Operation Surface</a>
<a href="/topology">Work Topology</a>
<a href="/codebase-profile">Codebase Profile</a>
<a href="/codex-harness-profile">Codex Harness</a>
<a href="/work-interface.json?${htmlEscape(jsonQuery)}">JSON</a>
</nav>
</header>
<section class="selected">
<h2>Selected Action</h2>
<table><tbody>${selectedRows(reading)}</tbody></table>
</section>
<div class="grid">
<section>
<h2>Rationale</h2>
<table><tbody>${rationaleRows(reading)}</tbody></table>
</section>
<section>
<h2>Context Suit</h2>
<table><tbody>${contextRows(reading)}</tbody></table>
</section>
</div>
<div class="grid">
<section>
<h2>Interfaces</h2>
<table><thead><tr><th>Function</th><th>Source</th><th>Purpose</th><th>Params</th></tr></thead><tbody>${interfaceRows(reading)}</tbody></table>
</section>
<section>
<h2>Next Interface</h2>
${reading.selected.nextInterface === null ? "<p>No selected interface.</p>" : functionPanel(reading.selected.nextInterface.bin, reading.selected.nextInterface.params)}
</section>
</div>
<section>
<h2>Selected Topology Nodes</h2>
<table><thead><tr><th>Kind</th><th>Node</th><th>Layer</th><th>Status</th><th>Interfaces</th></tr></thead><tbody>${nodeRows(reading)}</tbody></table>
</section>
<div class="grid">
${functionPanel("select-work-interface", query)}
</div>
</main>
${carrierFormScript()}
</body>
</html>`;
}

export function createWorkInterfaceWebApp(repoRoot: string): App {
  return Object.freeze({
    resources: Object.freeze([
      {
        id: "operations-manifold.work-interface-selection",
        match: "/work-interface",
        route: "/work-interface",
        methods: ["GET"],
        produces: ["text/html", "application/json"],
        handler: async (ctx: Context) => {
          const reading = await selectWorkInterface(repoRoot, paramsFromContext(ctx));
          if (ctx.negotiatedType === "application/json") return jsonRepr(reading, { pretty: true });
          return htmlRepr(workInterfaceWebDocument(reading));
        },
      },
      {
        id: "operations-manifold.work-interface-selection-json",
        match: "/work-interface.json",
        route: "/work-interface.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx: Context) => jsonRepr(await selectWorkInterface(repoRoot, paramsFromContext(ctx)), { pretty: true }),
      },
    ]),
  });
}
