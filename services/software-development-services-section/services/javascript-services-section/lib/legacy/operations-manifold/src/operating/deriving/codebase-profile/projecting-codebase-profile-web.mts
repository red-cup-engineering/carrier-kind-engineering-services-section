import {
  htmlRepr,
  jsonRepr,
  type App,
  type Context,
} from "@red-cup-engineering/http-server";

import {
  adjacentObjectRelations,
  carrierFormScript,
  codeList,
  densePageStyles,
  functionInterfaceRows,
  functionPanel,
  htmlEscape,
  neighborObjectCarriers,
  objectPageHref,
  queryParamsFromContext,
  radialGraphPositions,
  row,
  routeQueryHref,
  selectedObjectCarrier,
  summaryMetaItems,
  svgRelationLines,
  svgShortLabel,
} from "../../projecting/web-ui.mts";
import {
  deriveCodebaseProfile,
  type CodebaseProfile,
  type CodebaseProfileCarrier,
  type CodebaseProfileParams,
  type CodebaseProfileRelation,
} from "./derive-codebase-profile.mts";

function paramsFromContext(ctx: Context): CodebaseProfileParams {
  return queryParamsFromContext(ctx, ["focus", "package", "pkg", "q", "intent", "paths", "limit", "budget"]);
}

function carrierRows(profile: CodebaseProfile): string {
  return profile.carriers.slice(0, 80).map((carrier) => row([
    `<code>${htmlEscape(carrier.kind)}</code>`,
    `<a href="${htmlEscape(codebaseObjectHref(profile, carrier.id))}">${htmlEscape(carrier.label)}</a>`,
    htmlEscape(carrier.detail),
    attentionCell(carrier),
    codeList(carrier.evidence.slice(0, 4)),
  ])).join("");
}

function relationRows(profile: CodebaseProfile): string {
  return profile.relations.slice(0, 96).map((relation) => row([
    `<a href="${htmlEscape(codebaseObjectHref(profile, relation.from))}"><code>${htmlEscape(relation.from)}</code></a>`,
    `<code>${htmlEscape(relation.kind)}</code>`,
    `<a href="${htmlEscape(codebaseObjectHref(profile, relation.to))}"><code>${htmlEscape(relation.to)}</code></a>`,
    codeList(relation.evidence.slice(0, 4)),
  ])).join("");
}

function upstreamRows(profile: CodebaseProfile): string {
  return profile.reuse.upstreams.map((upstream) => row([
    `<code>${htmlEscape(upstream.name)}</code>`,
    codeList(upstream.witnessedBy),
  ])).join("");
}

function typeFlowSummaryRows(profile: CodebaseProfile): string {
  const summary = profile.typeFlow.summary;
  return [
    row(["<strong>source</strong>", `<code>${htmlEscape(profile.typeFlow.source)}</code>`]),
    row(["<strong>order / size</strong>", `${htmlEscape(summary.order)} type(s), ${htmlEscape(summary.size)} composition edge(s)`]),
    row(["<strong>packages</strong>", `${htmlEscape(summary.packages)} package(s), ${htmlEscape(summary.crossPackageEdges)} cross-package edge(s)`]),
    row(["<strong>addressability</strong>", `${htmlEscape(summary.addressable)} addressable, ${htmlEscape(summary.ambiguous)} ambiguous`]),
    row(["<strong>sources / sinks</strong>", `${htmlEscape(summary.sources)} source type(s), ${htmlEscape(summary.sinks)} sink type(s)`]),
  ].join("");
}

function typeFlowHubRows(profile: CodebaseProfile): string {
  if (profile.typeFlow.hubs.length === 0) return row(["<code>none</code>", "", "", "No type-flow hubs in this profile."]);
  return profile.typeFlow.hubs.slice(0, 8).map((hub) => row([
    `<code>${htmlEscape(hub.name)}</code>`,
    htmlEscape(hub.pkg),
    htmlEscape(hub.kind),
    `${htmlEscape(hub.producers)} producer(s), ${htmlEscape(hub.consumers)} consumer(s)`,
  ])).join("");
}

function typeFlowNeighbourhoodRows(profile: CodebaseProfile): string {
  if (profile.typeFlow.selectedNeighbourhoods.length === 0) return row(["<code>none</code>", "", "", "No selected symbol has an addressable type-flow neighbourhood."]);
  return profile.typeFlow.selectedNeighbourhoods.map((item) => row([
    `<code>${htmlEscape(item.name)}</code>`,
    htmlEscape(item.pkg),
    `${htmlEscape(item.producedBy)} producer(s), ${htmlEscape(item.consumedBy)} consumer(s)`,
    `${item.upstream.length === 0 ? "" : `up ${codeList(item.upstream.map((ref) => `${ref.pkg}:${ref.name}`))}`}${item.downstream.length === 0 ? "" : `<br>down ${codeList(item.downstream.map((ref) => `${ref.pkg}:${ref.name}`))}`}<br>reaches ${htmlEscape(item.reaches)}, reachable from ${htmlEscape(item.reachableFrom)}`,
  ])).join("");
}

function anomalyRows(profile: CodebaseProfile): string {
  if (profile.anomalies.length === 0) return row(["<code>none</code>", "No derived codebase-profile anomalies for this domain.", "", ""]);
  return profile.anomalies.map((anomaly) => row([
    `<code>${htmlEscape(anomaly.id)}</code>`,
    htmlEscape(anomaly.severity),
    htmlEscape(anomaly.summary),
    htmlEscape(anomaly.next),
  ])).join("");
}

function auditRows(profile: CodebaseProfile): string {
  if (profile.audit.length === 0) return row(["<code>none</code>", "", "No derived codebase audit findings for this domain.", ""]);
  return profile.audit.map((finding) => row([
    `<code>${htmlEscape(finding.id)}</code>`,
    `<code>${htmlEscape(finding.classification)}</code> ${htmlEscape(finding.severity)}`,
    htmlEscape(finding.summary),
    `${htmlEscape(finding.next)}${finding.upstreamCandidates.length === 0 ? "" : `<br>${codeList(finding.upstreamCandidates)}`}${finding.typeWitnesses.length === 0 ? "" : `<br>${codeList(finding.typeWitnesses)}`}${finding.domainWitnesses.length === 0 ? "" : `<br>${codeList(finding.domainWitnesses)}`}`,
  ])).join("");
}

function carrierGraphSvg(profile: CodebaseProfile): string {
  const center = profile.carriers.find((carrier) => carrier.kind === "package") ?? profile.carriers[0];
  const satellites = profile.carriers.filter((carrier) => carrier.id !== center?.id).slice(0, 18);
  const width = 1180;
  const height = 520;
  const cx = 590;
  const cy = 260;
  const rx = 440;
  const ry = 180;
  const positions = radialGraphPositions(center?.id, satellites.map((carrier) => carrier.id), { centerX: cx, centerY: cy, radiusX: rx, radiusY: ry });
  const relationLines = svgRelationLines(profile.relations.slice(0, 48), positions);
  const nodes = [...positions.entries()].map(([id, point]) => {
    const carrier = profile.carriers.find((item) => item.id === id);
    const fill = carrier?.kind === "package" ? "#6aa57d" : carrier?.kind === "processor" ? "#d9a441" : carrier?.kind === "upstream" ? "#8fd3ff" : "#33413a";
    const label = carrier?.label ?? id;
    const detail = carrier?.kind ?? "carrier";
    return `<g>
<circle cx="${point.x}" cy="${point.y}" r="${carrier?.kind === "package" ? 44 : 31}" fill="${fill}" stroke="#eef4ed" stroke-width="1"><title>${htmlEscape(id)}</title></circle>
<text x="${point.x}" y="${point.y + 4}" text-anchor="middle" font-size="11" fill="#0f1211">${htmlEscape(svgShortLabel(label, { max: 18, pathTail: true }))}</text>
<text x="${point.x}" y="${point.y + 48}" text-anchor="middle" font-size="10" fill="#aab7ad">${htmlEscape(detail)}</text>
</g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="codebase-profile-title">
<title id="codebase-profile-title">Codebase profile carrier graph</title>
<rect width="${width}" height="${height}" fill="#0f1211"/>
${relationLines}
${nodes}
</svg>`;
}

function profileForms(profile: CodebaseProfile): string {
  const query = {
    focus: profile.domain.focus,
    intent: profile.domain.intent,
    limit: "8",
  };
  return [
    functionPanel("derive-codebase-profile", query),
    functionPanel("read-codebase", query),
    functionPanel("read-jsnode-package", { package: profile.domain.package, detail: "surface", limit: "24" }),
  ].join("");
}

function objectQuery(profile: CodebaseProfile): Readonly<Record<string, string>> {
  return {
    focus: profile.domain.focus,
    intent: profile.domain.intent,
    limit: "8",
  };
}

function codebaseObjectHref(profile: CodebaseProfile, id: string): string {
  return objectPageHref("/codebase-profile/object", objectQuery(profile), id);
}

function selectedCarrier(profile: CodebaseProfile, ctx: Context): CodebaseProfileCarrier {
  return selectedObjectCarrier(ctx, profile.carriers, "package");
}

function adjacentRelations(profile: CodebaseProfile, carrier: CodebaseProfileCarrier): readonly CodebaseProfileRelation[] {
  return adjacentObjectRelations(profile.relations, carrier.id);
}

function neighborCarriers(profile: CodebaseProfile, carrier: CodebaseProfileCarrier, relations: readonly CodebaseProfileRelation[]): readonly CodebaseProfileCarrier[] {
  return neighborObjectCarriers(profile.carriers, carrier.id, relations);
}

function objectRelationRows(profile: CodebaseProfile, relations: readonly CodebaseProfileRelation[]): string {
  if (relations.length === 0) return row(["", "<code>isolated</code>", "", "No local relations in this profile slice."]);
  return relations.map((relation) => row([
    `<a href="${htmlEscape(codebaseObjectHref(profile, relation.from))}"><code>${htmlEscape(relation.from)}</code></a>`,
    `<code>${htmlEscape(relation.kind)}</code>`,
    `<a href="${htmlEscape(codebaseObjectHref(profile, relation.to))}"><code>${htmlEscape(relation.to)}</code></a>`,
    codeList(relation.evidence.slice(0, 6)),
  ])).join("");
}

function objectCarrierRows(profile: CodebaseProfile, carriers: readonly CodebaseProfileCarrier[]): string {
  return carriers.map((carrier) => row([
    `<code>${htmlEscape(carrier.kind)}</code>`,
    `<a href="${htmlEscape(codebaseObjectHref(profile, carrier.id))}">${htmlEscape(carrier.label)}</a>`,
    htmlEscape(carrier.detail),
    attentionCell(carrier),
    `<a href="${htmlEscape(carrier.href)}">source</a>`,
  ])).join("");
}

function attentionCell(carrier: CodebaseProfileCarrier): string {
  const attention = carrier.attention;
  if (attention === null) return "";
  return `<code>${htmlEscape(attention.regime)}</code> ${htmlEscape(attention.attention)} attention, ${htmlEscape(attention.touches)} touch(es), ${htmlEscape(attention.writes)} write(s)`;
}

function attentionRows(carrier: CodebaseProfileCarrier): string {
  const attention = carrier.attention;
  if (attention === null) return row(["<strong>attention</strong>", "No file-touch market asset matched this carrier."]);
  return [
    row(["<strong>attention path</strong>", `<code>${htmlEscape(attention.path)}</code>`]),
    row(["<strong>regime</strong>", `<code>${htmlEscape(attention.regime)}</code>`]),
    row(["<strong>touches</strong>", `${htmlEscape(attention.touches)} touch(es), ${htmlEscape(attention.reads)} read(s), ${htmlEscape(attention.writes)} write(s)`]),
    row(["<strong>demand/pressure</strong>", `read demand ${htmlEscape(attention.readDemand)}, write pressure ${htmlEscape(attention.writePressure)}, churn ${htmlEscape(attention.churn)}`]),
    row(["<strong>quote</strong>", `midpoint ${htmlEscape(attention.midpointValue)}, spread ${htmlEscape(attention.spreadValue)}`]),
    row(["<strong>attention evidence</strong>", codeList(attention.evidence)]),
  ].join("");
}

function objectForms(profile: CodebaseProfile, carrier: CodebaseProfileCarrier): string {
  const base = {
    focus: profile.domain.focus,
    intent: profile.domain.intent,
    limit: "8",
  };
  if (carrier.kind === "package") {
    return [
      functionPanel("derive-codebase-profile", base),
      functionPanel("read-codebase", base),
      functionPanel("read-jsnode-package", { package: profile.domain.package, detail: "full", limit: "24" }),
    ].join("");
  }
  if (carrier.kind === "module") {
    return [
      functionPanel("read-jsnode-module", { package: profile.domain.package, module: carrier.id.replace(/^module:/u, "") }),
      functionPanel("project-context-suit", { focus: carrier.detail, intent: profile.domain.intent }),
      functionPanel("market-file-touch", { focus: carrier.detail, limit: "12" }),
    ].join("");
  }
  if (carrier.kind === "symbol") {
    return [
      functionPanel("read-jsnode-symbol", { package: profile.domain.package, name: carrier.label }),
      functionPanel("read-jsnode-functions", { q: carrier.label, package: profile.domain.package, limit: "12" }),
      functionPanel("project-context-suit", { focus: carrier.detail, intent: profile.domain.intent }),
    ].join("");
  }
  if (carrier.kind === "processor") {
    return [
      functionPanel(carrier.label, base),
      functionPanel("derive-codebase-profile", base),
      functionPanel("read-operations-ledger", { focus: carrier.label, limit: "12" }),
    ].join("");
  }
  if (carrier.kind === "work") {
    return [
      functionPanel("select-work-interface", { focus: profile.domain.focus, intent: carrier.label, limit: "8" }),
      functionPanel("update-work", { id: carrier.id, note: "Add evidence or dependency for this carrier.", evidence: carrier.evidence.slice(0, 4) }),
      functionPanel("project-context-suit", { focus: profile.domain.focus, intent: carrier.label }),
    ].join("");
  }
  if (carrier.kind === "goal") {
    return [
      functionPanel("project-context-suit", { focus: profile.domain.focus, intent: carrier.label }),
      functionPanel("start-work", { title: `Advance ${carrier.label}`, intent: carrier.detail, success: "Create a witnessed work item connected to this goal.", contributesTo: carrier.id, focus: profile.domain.focus, gate: "record" }),
      functionPanel("derive-organizational-profile", { focus: profile.domain.focus, intent: carrier.label }),
    ].join("");
  }
  return [
    functionPanel("derive-codebase-profile", base),
    functionPanel("read-codebase", base),
    functionPanel("project-context-suit", { focus: profile.domain.focus, intent: carrier.label }),
  ].join("");
}

function localCarrierGraphSvg(profile: CodebaseProfile, carrier: CodebaseProfileCarrier, carriers: readonly CodebaseProfileCarrier[], relations: readonly CodebaseProfileRelation[]): string {
  const width = 980;
  const height = 420;
  const cx = 490;
  const cy = 210;
  const rx = 330;
  const ry = 140;
  const satellites = carriers.filter((item) => item.id !== carrier.id).slice(0, 14);
  const positions = radialGraphPositions(carrier.id, satellites.map((item) => item.id), { centerX: cx, centerY: cy, radiusX: rx, radiusY: ry });
  const lines = svgRelationLines(relations, positions, "1.4");
  const nodes = [...positions.entries()].map(([id, point]) => {
    const item = carriers.find((candidate) => candidate.id === id) ?? carrier;
    const fill = item.id === carrier.id ? "#6aa57d" : item.kind === "processor" ? "#d9a441" : item.kind === "upstream" ? "#8fd3ff" : "#33413a";
    return `<a href="${htmlEscape(codebaseObjectHref(profile, item.id))}"><g>
<circle cx="${point.x}" cy="${point.y}" r="${item.id === carrier.id ? 42 : 29}" fill="${fill}" stroke="#eef4ed" stroke-width="1"><title>${htmlEscape(item.id)}</title></circle>
<text x="${point.x}" y="${point.y + 4}" text-anchor="middle" font-size="11" fill="#0f1211">${htmlEscape(svgShortLabel(item.label, { max: 18, pathTail: true }))}</text>
<text x="${point.x}" y="${point.y + 46}" text-anchor="middle" font-size="10" fill="#aab7ad">${htmlEscape(item.kind)}</text>
</g></a>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="codebase-object-title">
<title id="codebase-object-title">Local carrier graph for ${htmlEscape(carrier.id)}</title>
<rect width="${width}" height="${height}" fill="#0f1211"/>
${lines}
${nodes}
</svg>`;
}

export function codebaseProfileWebDocument(profile: CodebaseProfile): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Codebase Profile | 561 Group Operations Manifold</title>
<style>
${densePageStyles({ extraRootVars: ";--gold:#d9a441;--green:#6aa57d" })}
</style>
</head>
<body>
<main>
<header>
<h1>561 Group Operations Manifold Codebase Profile</h1>
<p>${htmlEscape(profile.reuse.claim)}</p>
<nav>
<a href="/">Operation Surface</a>
<a href="/topology">Work Topology</a>
<a href="/codex-harness-profile">Codex Harness</a>
<a href="/category.json">Carrier Category</a>
<a href="/codebase-profile.json">Profile JSON</a>
<a href="/derive-codebase-profile">derive-codebase-profile</a>
<a href="/read-codebase">read-codebase</a>
</nav>
<div class="meta">${summaryMetaItems(profile.summary)}</div>
</header>
<section>
<h2>Carrier Graph</h2>
<div class="diagram">${carrierGraphSvg(profile)}</div>
</section>
<div class="grid">
<section>
<h2>Upstream Reuse</h2>
<table><thead><tr><th>Upstream</th><th>Witnesses</th></tr></thead><tbody>${upstreamRows(profile)}</tbody></table>
</section>
<section>
<h2>Anomalies</h2>
<table><thead><tr><th>Anomaly</th><th>Severity</th><th>Summary</th><th>Next</th></tr></thead><tbody>${anomalyRows(profile)}</tbody></table>
</section>
</div>
<section>
<h2>Audit Findings</h2>
<table><thead><tr><th>Finding</th><th>Severity</th><th>Summary</th><th>Next</th></tr></thead><tbody>${auditRows(profile)}</tbody></table>
</section>
<section>
<h2>Type-Flow Category</h2>
<div class="grid">
<table><tbody>${typeFlowSummaryRows(profile)}</tbody></table>
<table><thead><tr><th>Hub</th><th>Package</th><th>Kind</th><th>Arrows</th></tr></thead><tbody>${typeFlowHubRows(profile)}</tbody></table>
</div>
<table><thead><tr><th>Selected Type</th><th>Package</th><th>Functions</th><th>Neighbourhood</th></tr></thead><tbody>${typeFlowNeighbourhoodRows(profile)}</tbody></table>
</section>
<section>
<h2>Carriers</h2>
<table><thead><tr><th>Kind</th><th>Carrier</th><th>Detail</th><th>Attention</th><th>Evidence</th></tr></thead><tbody>${carrierRows(profile)}</tbody></table>
</section>
<section>
<h2>Relations</h2>
<table><thead><tr><th>From</th><th>Predicate</th><th>To</th><th>Evidence</th></tr></thead><tbody>${relationRows(profile)}</tbody></table>
</section>
<div class="grid">
<section>
<h2>Categorical Reading</h2>
<table><tbody>
${row(["<strong>arena</strong>", `${htmlEscape(profile.categorical.arena.eventCount)} events, ${htmlEscape(profile.categorical.arena.causality)} causal edges`])}
${row(["<strong>strategy</strong>", `${htmlEscape(profile.categorical.strategy.plays)} plays; well formed=${htmlEscape(String(profile.categorical.strategy.wellFormed))}; valid=${htmlEscape(String(profile.categorical.strategy.validPlays))}`])}
${row(["<strong>flow</strong>", `${htmlEscape(profile.categorical.flow.reading)} challenge=${htmlEscape(profile.categorical.flow.challenge)} skill=${htmlEscape(profile.categorical.flow.skill)}`])}
</tbody></table>
</section>
<section>
<h2>Next Interfaces</h2>
<table><thead><tr><th>Function</th><th>Purpose</th><th>Params</th></tr></thead><tbody>${functionInterfaceRows(profile.nextInterfaces)}</tbody></table>
</section>
</div>
<div class="grid">${profileForms(profile)}</div>
</main>
${carrierFormScript()}
</body>
</html>`;
}

export function codebaseProfileObjectWebDocument(
  profile: CodebaseProfile,
  carrier: CodebaseProfileCarrier,
  relations: readonly CodebaseProfileRelation[],
): string {
  const neighbors = neighborCarriers(profile, carrier, relations);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${htmlEscape(carrier.label)} | Codebase Carrier | 561 Group Operations Manifold</title>
<style>
${densePageStyles({ extraRootVars: ";--gold:#d9a441;--green:#6aa57d", diagramMobileWidth: 900 })}
</style>
</head>
<body>
<main>
<header>
<h1>${htmlEscape(carrier.label)}</h1>
<p>${htmlEscape(carrier.detail)}</p>
<nav>
<a href="${htmlEscape(routeQueryHref("/codebase-profile", objectQuery(profile)))}">Codebase Profile</a>
<a href="${htmlEscape(routeQueryHref("/codebase-profile.json", objectQuery(profile)))}">Profile JSON</a>
<a href="${htmlEscape(carrier.href)}">Source View</a>
<a href="/topology">Work Topology</a>
<a href="/codex-harness-profile">Codex Harness</a>
</nav>
<div class="meta">
<span><strong>kind</strong>${htmlEscape(carrier.kind)}</span>
<span><strong>id</strong>${htmlEscape(carrier.id)}</span>
<span><strong>relations</strong>${htmlEscape(relations.length)}</span>
<span><strong>neighbors</strong>${htmlEscape(Math.max(0, neighbors.length - 1))}</span>
</div>
</header>
<section>
<h2>Local Relations</h2>
<div class="diagram">${localCarrierGraphSvg(profile, carrier, neighbors, relations)}</div>
</section>
<div class="grid">
<section>
<h2>Carrier Evidence</h2>
<table><tbody>
${row(["<strong>id</strong>", `<code>${htmlEscape(carrier.id)}</code>`])}
${row(["<strong>kind</strong>", `<code>${htmlEscape(carrier.kind)}</code>`])}
${row(["<strong>source</strong>", `<a href="${htmlEscape(carrier.href)}">${htmlEscape(carrier.href)}</a>`])}
${row(["<strong>evidence</strong>", codeList(carrier.evidence)])}
${attentionRows(carrier)}
</tbody></table>
</section>
<section>
<h2>Neighbor Carriers</h2>
<table><thead><tr><th>Kind</th><th>Carrier</th><th>Detail</th><th>Attention</th><th>Source</th></tr></thead><tbody>${objectCarrierRows(profile, neighbors)}</tbody></table>
</section>
</div>
<section>
<h2>Relations</h2>
<table><thead><tr><th>From</th><th>Predicate</th><th>To</th><th>Evidence</th></tr></thead><tbody>${objectRelationRows(profile, relations)}</tbody></table>
</section>
<section>
<h2>Applicable Functions</h2>
<div class="grid">${objectForms(profile, carrier)}</div>
</section>
</main>
${carrierFormScript()}
</body>
</html>`;
}

export function createCodebaseProfileWebApp(repoRoot: string): App {
  return Object.freeze({
    resources: Object.freeze([
      {
        id: "operations-manifold.codebase-profile",
        match: "/codebase-profile",
        route: "/codebase-profile",
        methods: ["GET"],
        produces: ["text/html", "application/json"],
        handler: async (ctx: Context) => {
          const profile = await deriveCodebaseProfile(repoRoot, paramsFromContext(ctx));
          if (ctx.negotiatedType === "application/json") return jsonRepr(profile, { pretty: true });
          return htmlRepr(codebaseProfileWebDocument(profile));
        },
      },
      {
        id: "operations-manifold.codebase-profile-json",
        match: "/codebase-profile.json",
        route: "/codebase-profile.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx: Context) => jsonRepr(await deriveCodebaseProfile(repoRoot, paramsFromContext(ctx)), { pretty: true }),
      },
      {
        id: "operations-manifold.codebase-profile-object",
        match: "/codebase-profile/object",
        route: "/codebase-profile/object",
        methods: ["GET"],
        produces: ["text/html", "application/json"],
        handler: async (ctx: Context) => {
          const profile = await deriveCodebaseProfile(repoRoot, paramsFromContext(ctx));
          const carrier = selectedCarrier(profile, ctx);
          const relations = adjacentRelations(profile, carrier);
          const body = Object.freeze({
            kind: "operations-manifold.derive-codebase-profile.object" as const,
            generatedAt: profile.generatedAt,
            domain: profile.domain,
            carrier,
            relations,
            neighbors: neighborCarriers(profile, carrier, relations),
            nextInterfaces: profile.nextInterfaces,
          });
          if (ctx.negotiatedType === "application/json") return jsonRepr(body, { pretty: true });
          return htmlRepr(codebaseProfileObjectWebDocument(profile, carrier, relations));
        },
      },
      {
        id: "operations-manifold.codebase-profile-object-json",
        match: "/codebase-profile/object.json",
        route: "/codebase-profile/object.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx: Context) => {
          const profile = await deriveCodebaseProfile(repoRoot, paramsFromContext(ctx));
          const carrier = selectedCarrier(profile, ctx);
          const relations = adjacentRelations(profile, carrier);
          return jsonRepr(Object.freeze({
            kind: "operations-manifold.derive-codebase-profile.object" as const,
            generatedAt: profile.generatedAt,
            domain: profile.domain,
            carrier,
            relations,
            neighbors: neighborCarriers(profile, carrier, relations),
            nextInterfaces: profile.nextInterfaces,
          }), { pretty: true });
        },
      },
    ]),
  });
}
