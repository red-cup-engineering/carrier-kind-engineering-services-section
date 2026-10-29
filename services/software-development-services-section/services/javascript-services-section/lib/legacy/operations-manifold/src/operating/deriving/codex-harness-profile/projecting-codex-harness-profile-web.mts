import {
  htmlRepr,
  jsonRepr,
  type App,
  type Context,
} from "@red-cup-engineering/http-server";

import { carrierFormScript, codeList, densePageStyles, functionInterfaceRows, functionPanel, htmlEscape, queryParamsFromContext, row, summaryMetaItems } from "../../projecting/web-ui.mts";
import { deriveCodexHarnessProfile, type CodexHarnessProfile, type CodexHarnessProfileParams } from "./derive-codex-harness-profile.mts";

function paramsFromContext(ctx: Context): CodexHarnessProfileParams {
  return queryParamsFromContext(ctx, ["focus", "intent", "q", "session", "session_id", "trace", "limit"]);
}

function capabilityRows(profile: CodexHarnessProfile): string {
  return profile.capabilities.slice(0, 36).map((capability) => row([
    `<code>${htmlEscape(capability.id)}</code>`,
    htmlEscape(capability.status),
    htmlEscape(capability.title),
    htmlEscape(capability.next),
    codeList(capability.evidence.slice(0, 4)),
  ])).join("");
}

function gateRows(profile: CodexHarnessProfile): string {
  return profile.gates.map((gate) => row([
    `<code>${htmlEscape(gate.id)}</code>`,
    htmlEscape(gate.severity),
    htmlEscape(gate.summary),
    htmlEscape(gate.next),
    codeList(gate.evidence),
  ])).join("");
}

function harnessTopologyRows(profile: CodexHarnessProfile): string {
  return [
    row(["<strong>Source</strong>", `<code>${htmlEscape(profile.harnessTopology.source)}</code>`]),
    row(["<strong>Carrier</strong>", `<code>${htmlEscape(profile.harnessTopology.carrier.kind)}</code> ${htmlEscape(profile.harnessTopology.carrier.term)}`]),
    row(["<strong>Agent</strong>", `<code>${htmlEscape(profile.harnessTopology.carrier.agent)}</code>`]),
    row(["<strong>Channels</strong>", codeList(profile.harnessTopology.carrier.channels)]),
    row(["<strong>Predicates</strong>", codeList(profile.harnessTopology.carrier.predicates)]),
    row(["<strong>Utterances</strong>", htmlEscape(String(profile.harnessTopology.carrier.utterances))]),
    row(["<strong>Topology</strong>", `<code>${htmlEscape(profile.harnessTopology.topology.kind)}</code>`]),
    row(["<strong>Settlement</strong>", codeList(profile.harnessTopology.topology.settlementKeys)]),
    row(["<strong>Fixed Points</strong>", codeList(profile.harnessTopology.topology.fixedPointReadingKeys)]),
  ].join("");
}

function workRows(profile: CodexHarnessProfile): string {
  return profile.currentWork.map((work) => row([
    `<code>${htmlEscape(work.workKind)}</code>`,
    htmlEscape(work.title),
    htmlEscape(work.workStatus),
    htmlEscape(work.gate),
    codeList(work.evidence.slice(0, 4)),
  ])).join("");
}

function sessionRows(profile: CodexHarnessProfile): string {
  const checkpoint = profile.session.checkpoint;
  const inferenceRows = [
    row(["<strong>Source</strong>", htmlEscape(profile.session.inference.source)]),
    row(["<strong>Session</strong>", profile.session.inference.session === null ? "<code>unresolved</code>" : `<code>${htmlEscape(profile.session.inference.session)}</code>`]),
    row(["<strong>Trace</strong>", profile.session.inference.trace === null ? "<code>unresolved</code>" : `<code>${htmlEscape(profile.session.inference.trace)}</code>`]),
    row(["<strong>Message channels</strong>", htmlEscape(String(profile.session.messageChannels))]),
    row(["<strong>Messages matched</strong>", htmlEscape(String(profile.session.messagesMatched))]),
    row(["<strong>Findings matched</strong>", htmlEscape(String(profile.session.findingsMatched))]),
    row(["<strong>Recall subjects</strong>", htmlEscape(String(profile.session.recallSubjects))]),
    row(["<strong>Evidence</strong>", codeList(profile.session.inference.evidence)]),
  ].join("");
  const bindingRows = profile.session.bindings.map((binding) => row([
    `<code>${htmlEscape(binding.name)}</code>`,
    htmlEscape(String(binding.ready)),
    codeList(binding.evidence.slice(0, 4)),
  ])).join("");
  const pressureRows = profile.session.pressures.length === 0
    ? row(["<code>none</code>", "No session pressures.", ""])
    : profile.session.pressures.map((pressure) => row([
      `<code>${htmlEscape(pressure.id)}</code>`,
      htmlEscape(pressure.severity),
      htmlEscape(pressure.summary),
    ])).join("");
  const checkpointRows = [
    row(["<strong>Status</strong>", htmlEscape(checkpoint.status)]),
    row(["<strong>Ready</strong>", htmlEscape(String(checkpoint.ready))]),
    row(["<strong>Age</strong>", checkpoint.ageMinutes === null ? "<code>unknown</code>" : `${htmlEscape(String(checkpoint.ageMinutes))} minute(s)`]),
    row(["<strong>Count</strong>", htmlEscape(String(checkpoint.count))]),
    row(["<strong>Latest</strong>", checkpoint.latest === null ? "<code>none</code>" : `<code>${htmlEscape(checkpoint.latest.id)}</code><br>${htmlEscape(checkpoint.latest.at)}`]),
    row(["<strong>Missing files</strong>", codeList(checkpoint.missingFiles)]),
    row(["<strong>Next</strong>", htmlEscape(checkpoint.next)]),
  ].join("");
  return `<div class="grid">
<section><h2>Session Inference</h2><table><tbody>${inferenceRows}</tbody></table></section>
<section><h2>Session Bindings</h2><table><thead><tr><th>Binding</th><th>Ready</th><th>Evidence</th></tr></thead><tbody>${bindingRows}</tbody></table></section>
<section><h2>Checkpoint Freshness</h2><table><tbody>${checkpointRows}</tbody></table></section>
<section><h2>Session Pressures</h2><table><thead><tr><th>Pressure</th><th>Severity</th><th>Summary</th></tr></thead><tbody>${pressureRows}</tbody></table></section>
</div>`;
}

function researchRows(profile: CodexHarnessProfile): string {
  return profile.researchBasis.map((source) => row([
    `<code>${htmlEscape(source.id)}</code>`,
    htmlEscape(source.claim),
    `<code>${htmlEscape(source.path)}</code>`,
  ])).join("");
}

function webuxPageRows(profile: CodexHarnessProfile): string {
  return profile.surfaces.webuxPageCatalog.map((page) => row([
    `<a href="${htmlEscape(page.path)}"><code>${htmlEscape(page.path)}</code></a>`,
    htmlEscape(page.kind),
    htmlEscape(page.title),
    `<code>${htmlEscape(page.source)}</code>`,
  ])).join("");
}

function profileForms(profile: CodexHarnessProfile): string {
  const params = {
    focus: profile.domain.focus,
    intent: profile.domain.intent,
    ...(profile.domain.session === null ? {} : { session: profile.domain.session }),
    ...(profile.domain.trace === null ? {} : { trace: profile.domain.trace }),
  };
  return [
    functionPanel("derive-codex-harness-profile", params),
    functionPanel("read-session", params),
    functionPanel("record-finding", { ...params, subject: "operations-manifold/codex-session", predicate: "has-durable-finding", charge: "potential" }),
    functionPanel("project-context-suit", { focus: profile.domain.focus, intent: profile.domain.intent }),
    functionPanel("handoff-agent", { focus: profile.domain.focus, intent: profile.domain.intent }),
  ].join("");
}

export function codexHarnessProfileWebDocument(profile: CodexHarnessProfile): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Codex Harness Profile | 561 Group Operations Manifold</title>
<style>
${densePageStyles()}
</style>
</head>
<body>
<main>
<header>
<h1>561 Group Operations Manifold Codex Harness Profile</h1>
<p>${htmlEscape(profile.agent.name)}: ${htmlEscape(profile.agent.role)}</p>
<nav>
<a href="/">Operation Surface</a>
<a href="/topology">Work Topology</a>
<a href="/codebase-profile">Codebase Profile</a>
<a href="/codex-harness-profile.json">Profile JSON</a>
<a href="/derive-codex-harness-profile">derive-codex-harness-profile</a>
<a href="/read-agent-platform">read-agent-platform</a>
</nav>
<div class="meta">${summaryMetaItems(profile.summary)}</div>
</header>
<div class="grid">
<section>
<h2>Surfaces</h2>
<table><tbody>
${row(["<strong>WebUX</strong>", `<code>${htmlEscape(profile.surfaces.webux)}</code> ${codeList(profile.surfaces.webuxPages)}`])}
${row(["<strong>OpenAPI</strong>", `<code>${htmlEscape(profile.surfaces.openapi)}</code>`])}
${row(["<strong>MCP</strong>", `<code>${htmlEscape(profile.surfaces.mcp)}</code>`])}
${row(["<strong>HTTP POST</strong>", `<code>${htmlEscape(profile.surfaces.httpPost)}</code>`])}
</tbody></table>
</section>
<section>
<h2>WebUX Pages</h2>
<table><thead><tr><th>Path</th><th>Kind</th><th>Title</th><th>Source</th></tr></thead><tbody>${webuxPageRows(profile)}</tbody></table>
</section>
<section>
<h2>Next Interfaces</h2>
<table><thead><tr><th>Function</th><th>Purpose</th><th>Params</th></tr></thead><tbody>${functionInterfaceRows(profile.nextInterfaces)}</tbody></table>
</section>
</div>
<section>
<h2>Harness Gates</h2>
<table><thead><tr><th>Gate</th><th>Severity</th><th>Summary</th><th>Next</th><th>Evidence</th></tr></thead><tbody>${gateRows(profile)}</tbody></table>
</section>
<section>
<h2>Upstream Harness Topology</h2>
<table><tbody>${harnessTopologyRows(profile)}</tbody></table>
</section>
${sessionRows(profile)}
<section>
<h2>Capabilities</h2>
<table><thead><tr><th>Capability</th><th>Status</th><th>Title</th><th>Next</th><th>Evidence</th></tr></thead><tbody>${capabilityRows(profile)}</tbody></table>
</section>
<section>
<h2>Current Work</h2>
<table><thead><tr><th>Kind</th><th>Title</th><th>Status</th><th>Gate</th><th>Evidence</th></tr></thead><tbody>${workRows(profile)}</tbody></table>
</section>
<section>
<h2>Research Basis</h2>
<table><thead><tr><th>Source</th><th>Claim</th><th>Path</th></tr></thead><tbody>${researchRows(profile)}</tbody></table>
</section>
<section>
<h2>Applicable Functions</h2>
<div class="grid">${profileForms(profile)}</div>
</section>
</main>
${carrierFormScript()}
</body>
</html>`;
}

export function createCodexHarnessProfileWebApp(repoRoot: string): App {
  return Object.freeze({
    resources: Object.freeze([
      {
        id: "operations-manifold.codex-harness-profile",
        match: "/codex-harness-profile",
        route: "/codex-harness-profile",
        methods: ["GET"],
        produces: ["text/html", "application/json"],
        handler: async (ctx: Context) => {
          const profile = await deriveCodexHarnessProfile(repoRoot, paramsFromContext(ctx));
          if (ctx.negotiatedType === "application/json") return jsonRepr(profile, { pretty: true });
          return htmlRepr(codexHarnessProfileWebDocument(profile));
        },
      },
      {
        id: "operations-manifold.codex-harness-profile-json",
        match: "/codex-harness-profile.json",
        route: "/codex-harness-profile.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx: Context) => jsonRepr(await deriveCodexHarnessProfile(repoRoot, paramsFromContext(ctx)), { pretty: true }),
      },
    ]),
  });
}
