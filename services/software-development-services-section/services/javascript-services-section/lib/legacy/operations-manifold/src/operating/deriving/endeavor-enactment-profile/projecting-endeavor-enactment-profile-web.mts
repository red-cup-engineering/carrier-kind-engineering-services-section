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
  selectedObjectCarrier,
  summaryMetaItems,
  svgRelationLines,
  svgShortLabel,
} from "../../projecting/web-ui.mts";
import {
  deriveEndeavorEnactmentProfile,
  type EndeavorCarrier,
  type EndeavorEnactmentProfile,
  type EndeavorEnactmentProfileParams,
  type EndeavorRelation,
} from "./derive-endeavor-enactment-profile.mts";

function paramsFromContext(ctx: Context): EndeavorEnactmentProfileParams {
  return queryParamsFromContext(ctx, ["focus", "intent", "q", "limit"]);
}

function carrierRows(profile: EndeavorEnactmentProfile): string {
  return profile.carriers.slice(0, 96).map((carrier) => row([
    `<code>${htmlEscape(carrier.kind)}</code>`,
    `<a href="${htmlEscape(endeavorObjectHref(profile, carrier.id))}">${htmlEscape(carrier.title)}</a>`,
    htmlEscape(carrier.status),
    htmlEscape(carrier.summary),
    codeList(carrier.evidence.slice(0, 4)),
  ])).join("");
}

function relationRows(profile: EndeavorEnactmentProfile): string {
  return profile.relations.slice(0, 128).map((relation) => row([
    `<a href="${htmlEscape(endeavorObjectHref(profile, relation.from))}"><code>${htmlEscape(relation.from)}</code></a>`,
    `<code>${htmlEscape(relation.kind)}</code>`,
    `<a href="${htmlEscape(endeavorObjectHref(profile, relation.to))}"><code>${htmlEscape(relation.to)}</code></a>`,
    codeList(relation.evidence.slice(0, 4)),
  ])).join("");
}

function assignmentRows(profile: EndeavorEnactmentProfile): string {
  return profile.assignments.map((assignment) => row([
    `<code>${htmlEscape(assignment.readiness)}</code>`,
    `<a href="${htmlEscape(endeavorObjectHref(profile, assignment.id))}">${htmlEscape(assignment.work)}</a>`,
    htmlEscape(assignment.costBand),
    codeList(assignment.capabilities),
    codeList(assignment.skills),
    codeList(assignment.risks),
    codeList(assignment.evidence.slice(0, 4)),
  ])).join("");
}

function governanceRows(profile: EndeavorEnactmentProfile): string {
  return profile.governance.map((gate) => row([
    `<code>${htmlEscape(gate.id)}</code>`,
    htmlEscape(gate.readiness),
    htmlEscape(gate.summary),
    codeList(gate.requiredWitnesses),
    codeList(gate.evidence.slice(0, 4)),
  ])).join("");
}

function researchRows(profile: EndeavorEnactmentProfile): string {
  return profile.researchBasis.map((source) => row([
    `<code>${htmlEscape(source.id)}</code>`,
    htmlEscape(source.claim),
    `<code>${htmlEscape(source.path)}</code>`,
  ])).join("");
}

function carrierGraphSvg(profile: EndeavorEnactmentProfile): string {
  const center = profile.carriers.find((carrier) => carrier.kind === "endeavor") ?? profile.carriers[0];
  const satellites = profile.carriers.filter((carrier) => carrier.id !== center?.id).slice(0, 24);
  const width = 1180;
  const height = 560;
  const cx = 590;
  const cy = 280;
  const rx = 450;
  const ry = 205;
  const positions = radialGraphPositions(center?.id, satellites.map((carrier) => carrier.id), { centerX: cx, centerY: cy, radiusX: rx, radiusY: ry });
  const relationLines = svgRelationLines(profile.relations.slice(0, 72), positions);
  const nodes = [...positions.entries()].map(([id, point]) => {
    const carrier = profile.carriers.find((item) => item.id === id);
    const fill = colorForCarrier(carrier?.kind ?? "work");
    const radius = carrier?.kind === "endeavor" ? 48 : carrier?.kind === "assignment" ? 35 : 30;
    return `<g>
<circle cx="${point.x}" cy="${point.y}" r="${radius}" fill="${fill}" stroke="#eef4ed" stroke-width="1"><title>${htmlEscape(id)}</title></circle>
<text x="${point.x}" y="${point.y + 4}" text-anchor="middle" font-size="10" fill="#0f1211">${htmlEscape(svgShortLabel(carrier?.title ?? id, { max: 20 }))}</text>
<text x="${point.x}" y="${point.y + radius + 16}" text-anchor="middle" font-size="10" fill="#aab7ad">${htmlEscape(carrier?.kind ?? "carrier")}</text>
</g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="endeavor-profile-title">
<title id="endeavor-profile-title">Endeavor enactment carrier graph</title>
<rect width="${width}" height="${height}" fill="#0f1211"/>
${relationLines}
${nodes}
</svg>`;
}

function profileForms(profile: EndeavorEnactmentProfile): string {
  const base = {
    focus: profile.domain.focus,
    intent: profile.domain.intent,
    limit: "12",
  };
  return [
    functionPanel("derive-endeavor-enactment-profile", base),
    functionPanel("topologize-future-work", base),
    functionPanel("select-work-interface", base),
    functionPanel("derive-codex-harness-profile", base),
    functionPanel("project-context-suit", base),
    functionPanel("update-work", { session: "codex.current-session", evidence: "endeavor-enactment-profile" }),
  ].join("");
}

function objectQuery(profile: EndeavorEnactmentProfile): Readonly<Record<string, string>> {
  return {
    focus: profile.domain.focus,
    intent: profile.domain.intent,
    limit: "12",
  };
}

function endeavorObjectHref(profile: EndeavorEnactmentProfile, id: string): string {
  return objectPageHref("/endeavor-enactment-profile/object", objectQuery(profile), id);
}

function selectedCarrier(profile: EndeavorEnactmentProfile, ctx: Context): EndeavorCarrier {
  return selectedObjectCarrier(ctx, profile.carriers, "endeavor");
}

function adjacentRelations(profile: EndeavorEnactmentProfile, carrier: EndeavorCarrier): readonly EndeavorRelation[] {
  return adjacentObjectRelations(profile.relations, carrier.id);
}

function neighborCarriers(profile: EndeavorEnactmentProfile, carrier: EndeavorCarrier, relations: readonly EndeavorRelation[]): readonly EndeavorCarrier[] {
  return neighborObjectCarriers(profile.carriers, carrier.id, relations);
}

function objectRelationRows(profile: EndeavorEnactmentProfile, relations: readonly EndeavorRelation[]): string {
  if (relations.length === 0) return row(["", "<code>isolated</code>", "", "No local relations in this profile slice."]);
  return relations.map((relation) => row([
    `<a href="${htmlEscape(endeavorObjectHref(profile, relation.from))}"><code>${htmlEscape(relation.from)}</code></a>`,
    `<code>${htmlEscape(relation.kind)}</code>`,
    `<a href="${htmlEscape(endeavorObjectHref(profile, relation.to))}"><code>${htmlEscape(relation.to)}</code></a>`,
    codeList(relation.evidence.slice(0, 6)),
  ])).join("");
}

function objectCarrierRows(profile: EndeavorEnactmentProfile, carriers: readonly EndeavorCarrier[]): string {
  return carriers.map((carrier) => row([
    `<code>${htmlEscape(carrier.kind)}</code>`,
    `<a href="${htmlEscape(endeavorObjectHref(profile, carrier.id))}">${htmlEscape(carrier.title)}</a>`,
    htmlEscape(carrier.status),
    htmlEscape(carrier.summary),
    codeList(carrier.evidence.slice(0, 4)),
  ])).join("");
}

function objectForms(profile: EndeavorEnactmentProfile, carrier: EndeavorCarrier): string {
  const base = {
    focus: profile.domain.focus,
    intent: carrier.title,
    limit: "12",
  };
  if (carrier.kind === "assignment") {
    return [
      functionPanel("project-context-suit", base),
      functionPanel("update-work", { session: "codex.current-session", evidence: carrier.id }),
      functionPanel("derive-codex-harness-profile", base),
    ].join("");
  }
  if (carrier.kind === "work" || carrier.kind === "project" || carrier.kind === "milestone" || carrier.kind === "campaign" || carrier.kind === "mission") {
    return [
      functionPanel("select-work-interface", base),
      functionPanel("update-work", { id: carrier.id, session: "codex.current-session", evidence: "object-page" }),
      functionPanel("project-context-suit", base),
    ].join("");
  }
  if (carrier.kind === "processor") {
    return [
      functionPanel(carrier.title, { focus: profile.domain.focus, intent: profile.domain.intent }),
      functionPanel("read-operations-ledger", { focus: carrier.title, limit: "12" }),
      functionPanel("market-file-touch", { focus: carrier.title, limit: "12" }),
    ].join("");
  }
  return [
    functionPanel("derive-endeavor-enactment-profile", base),
    functionPanel("topologize-future-work", base),
    functionPanel("project-context-suit", base),
  ].join("");
}

function objectGraphSvg(profile: EndeavorEnactmentProfile, center: EndeavorCarrier, relations: readonly EndeavorRelation[], carriers: readonly EndeavorCarrier[]): string {
  const width = 1180;
  const height = 430;
  const cx = 590;
  const cy = 215;
  const satellites = carriers.filter((carrier) => carrier.id !== center.id).slice(0, 18);
  const positions = radialGraphPositions(center.id, satellites.map((carrier) => carrier.id), { centerX: cx, centerY: cy, radiusX: 410, radiusY: 145 });
  const lines = svgRelationLines(relations, positions);
  const nodes = [...positions.entries()].map(([id, point]) => {
    const carrier = profile.carriers.find((item) => item.id === id) ?? center;
    const radius = id === center.id ? 46 : 30;
    return `<g>
<circle cx="${point.x}" cy="${point.y}" r="${radius}" fill="${colorForCarrier(carrier.kind)}" stroke="#eef4ed" stroke-width="1"><title>${htmlEscape(id)}</title></circle>
<text x="${point.x}" y="${point.y + 4}" text-anchor="middle" font-size="10" fill="#0f1211">${htmlEscape(svgShortLabel(carrier.title, { max: 20 }))}</text>
<text x="${point.x}" y="${point.y + radius + 15}" text-anchor="middle" font-size="10" fill="#aab7ad">${htmlEscape(carrier.kind)}</text>
</g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="endeavor-object-title">
<title id="endeavor-object-title">Endeavor object relation graph</title>
<rect width="${width}" height="${height}" fill="#0f1211"/>
${lines}
${nodes}
</svg>`;
}

function colorForCarrier(kind: string): string {
  if (kind === "endeavor") return "#6aa57d";
  if (kind === "assignment") return "#d9a441";
  if (kind === "agent" || kind === "processor") return "#8fd3ff";
  if (kind === "governance") return "#c48bd8";
  if (kind === "cost") return "#c77d54";
  if (kind === "skill" || kind === "capability") return "#b8c071";
  return "#7e9a8c";
}

function commonStyle(): string {
  return `<style>
${densePageStyles()}
.graph{overflow:auto;border:1px solid var(--line)}
</style>`;
}

export function endeavorEnactmentProfileWebDocument(profile: EndeavorEnactmentProfile): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Endeavor Enactment Profile | 561 Group Operations Manifold</title>
${commonStyle()}
</head>
<body>
<main>
<header>
<h1>561 Group Operations Manifold Endeavor Enactment Profile</h1>
<p>${htmlEscape(profile.domain.intent)} over ${htmlEscape(profile.domain.focus)}</p>
<nav>
<a href="/">Operation Surface</a>
<a href="/topology">Work Topology</a>
<a href="/codex-harness-profile">Codex Harness Profile</a>
<a href="/codebase-profile">Codebase Profile</a>
<a href="/endeavor-enactment-profile.json">Profile JSON</a>
<a href="/derive-endeavor-enactment-profile">derive-endeavor-enactment-profile</a>
</nav>
<div class="meta">${summaryMetaItems(profile.summary)}</div>
</header>
<section>
<h2>Carrier Graph</h2>
<div class="graph">${carrierGraphSvg(profile)}</div>
</section>
<div class="grid">
<section>
<h2>Next Interfaces</h2>
<table><thead><tr><th>Function</th><th>Purpose</th><th>Params</th></tr></thead><tbody>${functionInterfaceRows(profile.nextInterfaces)}</tbody></table>
</section>
<section>
<h2>Governance Gates</h2>
<table><thead><tr><th>Gate</th><th>Readiness</th><th>Summary</th><th>Witnesses</th><th>Evidence</th></tr></thead><tbody>${governanceRows(profile)}</tbody></table>
</section>
</div>
<section>
<h2>Assignments</h2>
<table><thead><tr><th>Readiness</th><th>Work</th><th>Cost</th><th>Capabilities</th><th>Skills</th><th>Risks</th><th>Evidence</th></tr></thead><tbody>${assignmentRows(profile)}</tbody></table>
</section>
<section>
<h2>Carriers</h2>
<table><thead><tr><th>Kind</th><th>Carrier</th><th>Status</th><th>Summary</th><th>Evidence</th></tr></thead><tbody>${carrierRows(profile)}</tbody></table>
</section>
<section>
<h2>Relations</h2>
<table><thead><tr><th>From</th><th>Relation</th><th>To</th><th>Evidence</th></tr></thead><tbody>${relationRows(profile)}</tbody></table>
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

export function endeavorEnactmentObjectWebDocument(profile: EndeavorEnactmentProfile, carrier: EndeavorCarrier, relations: readonly EndeavorRelation[], carriers: readonly EndeavorCarrier[]): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${htmlEscape(carrier.title)} | Endeavor Enactment Profile</title>
${commonStyle()}
</head>
<body>
<main>
<header>
<h1>${htmlEscape(carrier.title)}</h1>
<p><code>${htmlEscape(carrier.kind)}</code> ${htmlEscape(carrier.status)}: ${htmlEscape(carrier.summary)}</p>
<nav>
<a href="/endeavor-enactment-profile">Endeavor Profile</a>
<a href="/topology">Work Topology</a>
<a href="/codex-harness-profile">Codex Harness Profile</a>
<a href="/derive-endeavor-enactment-profile">derive-endeavor-enactment-profile</a>
</nav>
<div class="meta">${summaryMetaItems(profile.summary)}</div>
</header>
<section>
<h2>Local Graph</h2>
<div class="graph">${objectGraphSvg(profile, carrier, relations, carriers)}</div>
</section>
<div class="grid">
<section>
<h2>Carrier</h2>
<table><tbody>
${row(["<strong>ID</strong>", `<code>${htmlEscape(carrier.id)}</code>`])}
${row(["<strong>Kind</strong>", `<code>${htmlEscape(carrier.kind)}</code>`])}
${row(["<strong>Status</strong>", htmlEscape(carrier.status)])}
${row(["<strong>Evidence</strong>", codeList(carrier.evidence)])}
</tbody></table>
</section>
<section>
<h2>Neighbor Carriers</h2>
<table><thead><tr><th>Kind</th><th>Carrier</th><th>Status</th><th>Summary</th><th>Evidence</th></tr></thead><tbody>${objectCarrierRows(profile, carriers)}</tbody></table>
</section>
</div>
<section>
<h2>Relations</h2>
<table><thead><tr><th>From</th><th>Relation</th><th>To</th><th>Evidence</th></tr></thead><tbody>${objectRelationRows(profile, relations)}</tbody></table>
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

export function createEndeavorEnactmentProfileWebApp(repoRoot: string): App {
  return Object.freeze({
    resources: Object.freeze([
      {
        id: "operations-manifold.endeavor-enactment-profile",
        match: "/endeavor-enactment-profile",
        route: "/endeavor-enactment-profile",
        methods: ["GET"],
        produces: ["text/html", "application/json"],
        handler: async (ctx: Context) => {
          const profile = await deriveEndeavorEnactmentProfile(repoRoot, paramsFromContext(ctx));
          if (ctx.negotiatedType === "application/json") return jsonRepr(profile, { pretty: true });
          return htmlRepr(endeavorEnactmentProfileWebDocument(profile));
        },
      },
      {
        id: "operations-manifold.endeavor-enactment-profile-json",
        match: "/endeavor-enactment-profile.json",
        route: "/endeavor-enactment-profile.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx: Context) => jsonRepr(await deriveEndeavorEnactmentProfile(repoRoot, paramsFromContext(ctx)), { pretty: true }),
      },
      {
        id: "operations-manifold.endeavor-enactment-object",
        match: "/endeavor-enactment-profile/object",
        route: "/endeavor-enactment-profile/object",
        methods: ["GET"],
        produces: ["text/html", "application/json"],
        handler: async (ctx: Context) => {
          const profile = await deriveEndeavorEnactmentProfile(repoRoot, paramsFromContext(ctx));
          const carrier = selectedCarrier(profile, ctx);
          const relations = adjacentRelations(profile, carrier);
          const carriers = neighborCarriers(profile, carrier, relations);
          const object = Object.freeze({ profile, carrier, relations, carriers });
          if (ctx.negotiatedType === "application/json") return jsonRepr(object, { pretty: true });
          return htmlRepr(endeavorEnactmentObjectWebDocument(profile, carrier, relations, carriers));
        },
      },
    ]),
  });
}
