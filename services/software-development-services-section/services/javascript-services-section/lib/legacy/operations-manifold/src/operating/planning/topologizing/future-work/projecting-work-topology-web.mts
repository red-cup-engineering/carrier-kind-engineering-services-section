import {
  htmlRepr,
  jsonRepr,
  type App,
  type Context,
} from "@emsenn/http-server";

import { carrierFormScript, codeList, densePageStyles, functionInterfaceRows, functionPanel, htmlEscape, queryParamsFromContext, row, summaryMetaItems } from "../../../projecting/web-ui.mts";
import { futureWorkTopology, type FutureWorkTopology, type FutureWorkTopologyParams } from "./library/future-work-topology.mts";

function paramsFromContext(ctx: Context): FutureWorkTopologyParams {
  return queryParamsFromContext(ctx, ["focus", "q", "intent", "limit"]);
}

function strataRows(topology: FutureWorkTopology): string {
  return Object.entries(topology.strata).map(([name, stratum]) => row([
    `<strong>${htmlEscape(name)}</strong>`,
    htmlEscape(stratum.description),
    codeList(stratum.nodes.slice(0, 16)),
  ])).join("");
}

function workKindRows(topology: FutureWorkTopology): string {
  const nodeById = new Map(topology.nodes.map((node) => [node.id, node]));
  return topology.work.kinds.map((kind) => row([
    `<code>${htmlEscape(kind.kind)}</code>`,
    htmlEscape(kind.count),
    kind.nodes.slice(0, 8).map((id) => {
      const node = nodeById.get(id);
      return node === undefined ? `<code>${htmlEscape(id)}</code>` : `<code title="${htmlEscape(node.summary)}">${htmlEscape(node.title)}</code>`;
    }).join(" "),
  ])).join("");
}

function workItemRows(topology: FutureWorkTopology): string {
  return topology.nodes
    .filter((node) => node.kind === "read-work")
    .slice(0, 16)
    .map((node) => row([
      `<code>${htmlEscape(node.workKind ?? "work")}</code>`,
      htmlEscape(node.title),
      htmlEscape(node.workStatus ?? node.status),
      htmlEscape(node.priority),
      htmlEscape(node.success ?? node.summary),
    ])).join("");
}

function flowSvg(topology: FutureWorkTopology): string {
  const x: Record<string, number> = {
    future: 120,
    processor: 350,
    present: 580,
    past: 810,
    guidance: 1040,
  };
  const y = 88;
  const labels = Object.entries(x).map(([name, cx]) => (
    `<g><rect x="${cx - 78}" y="${y - 28}" width="156" height="56" rx="6" fill="#151a18" stroke="#6aa57d"/>` +
    `<text x="${cx}" y="${y + 4}" text-anchor="middle" font-size="13" fill="#eef4ed">${htmlEscape(name)}</text></g>`
  )).join("");
  const arcs = topology.flow.steps.map((step, index) => {
    const from = x[step.from] ?? 120;
    const to = x[step.to] ?? 120;
    const lift = 44 + (index % 3) * 38;
    const y1 = y + 34;
    const y2 = y + 34;
    const mid = y1 + lift;
    const labelX = (from + to) / 2;
    const labelY = mid - 8;
    return `<path d="M${from},${y1} C${from},${mid} ${to},${mid} ${to},${y2}" fill="none" stroke="#d9a441" stroke-width="1.4" marker-end="url(#arrow)"><title>${htmlEscape(step.id)}</title></path>` +
      `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="11" fill="#d8c99b">${htmlEscape(step.predicate)}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1160 280" role="img" aria-labelledby="flow-title">
<title id="flow-title">Future, processor, present, and past work flow</title>
<rect width="1160" height="280" fill="#0f1211"/>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#d9a441"/></marker></defs>
${labels}
${arcs}
</svg>`;
}

function guideRows(topology: FutureWorkTopology): string {
  return topology.guides.slice(0, 12).map((guide) => row([
    `<code>${htmlEscape(guide.id)}</code>`,
    htmlEscape(guide.title),
    htmlEscape(guide.claim),
    `<code>${htmlEscape(guide.path)}</code>`,
  ])).join("");
}

function predicationRows(topology: FutureWorkTopology): string {
  const valuationByCell = new Map(topology.predication.valuations.map((valuation) => [valuation.cell, valuation]));
  return topology.predication.cells.slice(0, 32).map((cell) => {
    const valuation = valuationByCell.get(cell.id);
    return row([
      `<code>${htmlEscape(cell.subject)}</code>`,
      `<code>${htmlEscape(cell.predicate)}</code>`,
      `<code>${htmlEscape(cell.object)}</code>`,
      htmlEscape(valuation?.value.reading ?? "unsettled"),
      codeList(cell.evidence.slice(0, 4)),
    ]);
  }).join("");
}

function governanceRows(topology: FutureWorkTopology): string {
  return topology.governance.proposals.map((proposal) => row([
    `<code>${htmlEscape(proposal.id)}</code>`,
    htmlEscape(proposal.action),
    `<code>${htmlEscape(proposal.target)}</code>`,
    htmlEscape(proposal.decisionRule),
    codeList(proposal.requiredWitnesses),
  ])).join("");
}

export function workTopologyWebDocument(topology: FutureWorkTopology): string {
  const query = {
    focus: topology.focus ?? "operations manifold work topology",
    intent: topology.intent,
    limit: "12",
  };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Work Topology | 561 Group Operations Manifold</title>
<style>
${densePageStyles({ extraRootVars: ";--gold:#d9a441;--rose:#d18aa8;--green:#6aa57d" })}
</style>
</head>
<body>
<main>
<header>
<h1>561 Group Operations Manifold Work Topology</h1>
<p>${htmlEscape(topology.flow.claim)}</p>
<nav>
<a href="/">Operation Surface</a>
<a href="/diagram">Carrier Diagram</a>
<a href="/category.json">Carrier Category</a>
<a href="/topology.json">Topology JSON</a>
<a href="/codebase-profile">Codebase Profile</a>
<a href="/codex-harness-profile">Codex Harness</a>
<a href="/topologize-future-work">topologize-future-work</a>
<a href="/work-interface">Work Interface</a>
<a href="/select-work-interface">select-work-interface</a>
</nav>
<div class="meta">${summaryMetaItems(topology.summary)}</div>
</header>
<section>
<h2>Spatiotemporal Flow</h2>
<div class="diagram">${flowSvg(topology)}</div>
</section>
<section>
<h2>Temporal Strata</h2>
<table><thead><tr><th>Stratum</th><th>Description</th><th>Carriers</th></tr></thead><tbody>${strataRows(topology)}</tbody></table>
</section>
<section>
<h2>Work Kinds</h2>
<p>${htmlEscape(topology.work.claim)}</p>
<table><thead><tr><th>Kind</th><th>Count</th><th>Work Items</th></tr></thead><tbody>${workKindRows(topology)}</tbody></table>
</section>
<section>
<h2>Work Items</h2>
<table><thead><tr><th>Kind</th><th>Title</th><th>Status</th><th>Priority</th><th>Success</th></tr></thead><tbody>${workItemRows(topology)}</tbody></table>
</section>
<section>
<h2>Predication</h2>
<p>${htmlEscape(topology.predication.claim)}</p>
<table><thead><tr><th>Subject</th><th>Predicate</th><th>Object</th><th>Reading</th><th>Evidence</th></tr></thead><tbody>${predicationRows(topology)}</tbody></table>
</section>
<div class="grid">
<section>
<h2>Governance Proposals</h2>
<p>${htmlEscape(topology.governance.claim)}</p>
<table><thead><tr><th>Proposal</th><th>Action</th><th>Target</th><th>Rule</th><th>Witnesses</th></tr></thead><tbody>${governanceRows(topology)}</tbody></table>
</section>
<section>
<h2>Next Interfaces</h2>
<table><thead><tr><th>Function</th><th>Purpose</th><th>Params</th></tr></thead><tbody>${functionInterfaceRows(topology.nextInterfaces)}</tbody></table>
</section>
</div>
<section>
<h2>Research Guides</h2>
<table><thead><tr><th>Guide</th><th>Title</th><th>Claim</th><th>Path</th></tr></thead><tbody>${guideRows(topology)}</tbody></table>
</section>
<div class="grid">
${functionPanel("topologize-future-work", query)}
${functionPanel("select-work-interface", query)}
</div>
</main>
${carrierFormScript()}
</body>
</html>`;
}

export function createWorkTopologyWebApp(repoRoot: string): App {
  return Object.freeze({
    resources: Object.freeze([
      {
        id: "operations-manifold.work-topology",
        match: "/topology",
        route: "/topology",
        methods: ["GET"],
        produces: ["text/html", "application/json"],
        handler: async (ctx: Context) => {
          const topology = await futureWorkTopology(repoRoot, paramsFromContext(ctx));
          if (ctx.negotiatedType === "application/json") return jsonRepr(topology, { pretty: true });
          return htmlRepr(workTopologyWebDocument(topology));
        },
      },
      {
        id: "operations-manifold.work-topology-json",
        match: "/topology.json",
        route: "/topology.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: async (ctx: Context) => jsonRepr(await futureWorkTopology(repoRoot, paramsFromContext(ctx)), { pretty: true }),
      },
    ]),
  });
}
