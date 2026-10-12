/**
 * default-jupyter-views - the organizing-owned Jupyter/data-science projections.
 *
 * This is not a bespoke dashboard. It is the default notebook set over an
 * organizing instance's carriers: RWIL witnesses, MASH/session events, camps,
 * graded federation reports, accountable records, and an optional JS/Node package
 * mesh supplied by a downstream workspace reader.
 */
import path from "node:path";

import { processIsoNow } from "@red-cup-engineering/node-process-services-section/clock";
import { writeTextFileSync } from "@red-cup-engineering/computing/admission";
import { codecs } from "@red-cup-engineering/relating";
import { charge, chargeValue } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { valueOf } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";

import { readWitnessLog } from "@red-cup-engineering/relating/services/filesystem-store";

import {
  encodeIpynb,
  organizingNotebook,

} from "./jupyter.mjs";

const { eavtId, eavtRecord } = codecs.text.json.jsonl.eavt;

const VIEW_DATA_DIR = "data";
const VIEW_NOTEBOOK_DIR = "notebooks";

const CHARGE_COORDINATES = Object.freeze({
  absurd: ["absent", "absent"],
  potential: ["present", "absent"],
  active: ["absent", "present"],
  stable: ["present", "present"],
});

const K_RANK = Object.freeze({
  absurd: 0,
  potential: 1,
  active: 1,
  stable: 2,
});

const T_RANK = Object.freeze({
  active: 0,
  absurd: 1,
  stable: 1,
  potential: 2,
});

export function organizingDefaultJupyterViewArtifacts(input) {
  const data = normalizeDefaultViewData(input);
  const dataFiles = defaultDataFiles(data);
  const notebooks = defaultNotebookDocuments(input.instance, input.exportedAt ?? processIsoNow());
  return Object.freeze({
    data: dataFiles,
    notebooks,
  });
}

export function writeOrganizingDefaultJupyterViews(options) {
  const artifacts = organizingDefaultJupyterViewArtifacts(options);
  const root = path.resolve(options.outDir);
  const dataPaths = [];
  const notebookPaths = [];
  for (const file of artifacts.data) {
    const target = path.join(root, file.path);
    writeTextFileSync(target, file.content);
    dataPaths.push(target);
  }
  for (const document of artifacts.notebooks) {
    const target = path.join(root, document.path);
    writeTextFileSync(target, document.content);
    notebookPaths.push(target);
  }
  return Object.freeze({
    root,
    data: Object.freeze(dataPaths),
    notebooks: Object.freeze(notebookPaths),
  });
}

export function organizingDefaultNotebookDocuments(instance, exportedAt = processIsoNow()) {
  return defaultNotebookDocuments(instance, exportedAt);
}

export function organizingDefaultViewSessionEventsFromWitnessRows(
  rows,
) {
  return Object.freeze(rows
    .map((row, index) => sessionEventFromWitnessRow(eavtRecord(row), index))
    .filter((event) => event !== null));
}

function normalizeDefaultViewData(input) {
  const witnessRows = normalizeWitnessRows(input);
  return Object.freeze({
    witnessRows,
    infotileRows: normalizeInfotileRows(witnessRows),
    packageRows: normalizePackages(input.packageMesh),
    packageEdges: normalizePackageEdges(input.packageMesh),
    sessionEvents: normalizeSessionEvents(input.sessionEvents ?? []),
    camps: normalizeCamps(input.camps ?? []),
    federationAdmissionRows: normalizeFederationAdmissionRows(input.federationReports ?? [], input.exportedAt ?? null),
    accountableRows: normalizeAccountableRows(input),
  });
}

function normalizeInfotileRows(rows) {
  return Object.freeze(rows.map((row, index) => Object.freeze({
    id: `tile:${row.id}`,
    title: `${row.source}:${row.charge}:${index + 1}`,
    role: "witness-row",
    source: row.source,
    charge: row.charge,
    truth_side: row.truth_side,
    falsity_side: row.falsity_side,
    leq_k: row.leq_k,
    leq_t: row.leq_t,
    x: index % 16,
    y: Math.floor(index / 16),
    evidence: row.id,
    time: row.time,
    entity: row.entity,
    attribute: row.attribute,
    value: row.value,
  })));
}

function normalizeWitnessRows(input) {
  const rows = [];
  for (const row of input.witnessRows ?? []) rows.push({ row: eavtRecord(row), source: "input" });
  if (input.witnessLedger !== undefined) {
    for (const feed of input.witnessLedger.feeds) {
      for (const row of readWitnessLog(input.witnessLedger.store, feed)) rows.push({ row, source: feed });
    }
  }
  return Object.freeze(rows.map(({ row, source }) => {
    const chargeName = chargeNameOf(row);
    const [truth, falsity] = CHARGE_COORDINATES[chargeName];
    return Object.freeze({
      id: eavtId(row),
      entity: row.e,
      attribute: row.a,
      value: row.v,
      time: row.t,
      source,
      charge: chargeName,
      truth_side: truth,
      falsity_side: falsity,
      leq_k: K_RANK[chargeName],
      leq_t: T_RANK[chargeName],
    });
  }));
}

function chargeNameOf(row) {
  const direct = chargeNameFromUnknown(row.v);
  if (direct !== null) return direct;
  return valueOf(charge(chargeValue("potential"))).name;
}

function chargeNameFromUnknown(value) {
  if (typeof value === "string" && isChargeName(value)) return value;
  if (value !== null && typeof value === "object") {
    const record = value;
    const named = record.charge ?? record.chargeName ?? record.standing;
    if (typeof named === "string" && isChargeName(named)) return named;
    if (record.kind === "bilattice-charge.carrier" && Array.isArray(record.value)) {
      return valueOf(record).name;
    }
  }
  return null;
}

function isChargeName(value) {
  return value === "absurd" || value === "potential" || value === "active" || value === "stable";
}

function normalizePackages(mesh) {
  const packages = mesh?.packages ?? mesh?.nodes ?? [];
  return Object.freeze(packages.map((pkg) => {
    const deps = dependencyNames(pkg);
    const scripts = listValue(pkg.scripts ?? pkg.manifest?.scripts ?? []);
    const bins = listValue(pkg.bins ?? pkg.manifest?.bins ?? []);
    const tests = scripts.filter((script) => script.includes("test") || script.includes("check"));
    return Object.freeze({
      package: pkg.name,
      version: pkg.version ?? null,
      layer: pkg.layer ?? null,
      lifecycle: pkg.lifecycle ?? null,
      maturity: pkg.maturity ?? null,
      dependency_count: deps.length,
      dependencies: deps.join(", "),
      exports: listValue(pkg.exports ?? []).join(", "),
      bins: bins.join(", "),
      tests: tests.join(", "),
      scripts: scripts.join(", "),
    });
  }).sort((left, right) => left.package.localeCompare(right.package)));
}

function normalizePackageEdges(mesh) {
  const edges = [];
  for (const edge of mesh?.edges ?? []) {
    edges.push(Object.freeze({ from: edge.from, to: edge.to, kind: edge.kind ?? "dependency" }));
  }
  if (edges.length === 0) {
    for (const pkg of mesh?.packages ?? mesh?.nodes ?? []) {
      for (const dependency of dependencyNames(pkg)) edges.push(Object.freeze({ from: pkg.name, to: dependency, kind: "dependency" }));
    }
  }
  return Object.freeze(edges.sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to)));
}

function dependencyNames(pkg) {
  const names = pkg.deps?.map((dep) => dep.name) ?? pkg.dependencies ?? [];
  return Object.freeze([...new Set(names)].sort());
}

function listValue(values) {
  return Object.freeze([...new Set(values)].sort());
}

function normalizeSessionEvents(events) {
  return Object.freeze(events.map((event, index) => Object.freeze({
    id: event.id ?? event.event ?? `session-event-${index + 1}`,
    session: event.session ?? "unknown-session",
    harness: event.harness ?? "unknown-harness",
    camp: event.camp ?? null,
    kind: event.kind ?? activityType(event.activity) ?? "session-event",
    source: event.source ?? null,
    at: event.at ?? null,
  })));
}

function sessionEventFromWitnessRow(row, index) {
  const attribute = recordOf(row.a);
  const value = recordOf(row.v);
  if (attribute === null || value === null) return null;
  const verb = stringField(attribute, "verb");
  if (verb === "admit-hook-event" && value.kind === "information-coherence-kernel.hook.admission") {
    return Object.freeze({
      id: `ick-hook:${String(row.t ?? "unknown")}:${index + 1}`,
      session: stringField(value, "session") ?? "unknown-session",
      harness: stringField(value, "harness") ?? "unknown-harness",
      kind: stringField(value, "hookEventName") ?? "HookEvent",
      source: "information-coherence-kernel.admit-hook-event",
      at: typeof row.t === "string" ? row.t : null,
    });
  }
  if (verb === "record-dev-event" && value.kind === "dev.bare-cedar-fog.emsenn.net.agent-event") {
    return Object.freeze({
      id: stringField(value, "id") ?? `dev-event:${String(row.t ?? "unknown")}:${index + 1}`,
      session: stringField(value, "session") ?? "unknown-session",
      harness: stringField(value, "harness") ?? "unknown-harness",
      kind: stringField(value, "hookEventName") ?? stringField(value, "source") ?? "record-dev-event",
      source: stringField(value, "source") ?? "dev.bare-cedar-fog.emsenn.net.record-dev-event",
      at: stringField(value, "at") ?? (typeof row.t === "string" ? row.t : null),
      activity: value.activity,
    });
  }
  return null;
}

function recordOf(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function stringField(record, key) {
  const value = record[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function activityType(activity) {
  if (activity !== null && typeof activity === "object" && !Array.isArray(activity)) {
    const type = (activity).type;
    if (typeof type === "string" && type !== "") return type;
  }
  return null;
}

function normalizeCamps(camps) {
  return Object.freeze(camps.map((camp) => Object.freeze({
    camp: camp.id,
    members: camp.members.length,
    shared_inbox: camp.sharedInbox ?? null,
  })));
}

function normalizeFederationAdmissionRows(reports, exportedAt) {
  return Object.freeze(reports.map((report, index) => Object.freeze({
    report: `federation-${index + 1}`,
    camp: report.sources.join(", "),
    at: exportedAt,
    admission_count: report.requiresAdmission.length,
    cells: report.requiresAdmission.map((entry) => entry.cell).join(", "),
    shared: report.decomposition.shared,
    contested: report.decomposition.contested,
    requires_admission: report.decomposition.requiresAdmission,
    admission_status: report.requiresAdmission.length === 0 ? "none" : "required",
  })));
}

function normalizeAccountableRows(input) {
  const rows = [];
  for (const transaction of input.accountableTransactions ?? []) {
    rows.push(Object.freeze({
      id: transaction.id,
      kind: transaction.kind,
      at: transaction.witnessedAt,
      accountable: null,
      authorized: null,
      paid: null,
      attested: transaction.provenance?.attestation !== undefined,
      standing: null,
    }));
  }
  for (const report of input.accountabilityReports ?? []) {
    rows.push(Object.freeze({
      id: String(report.witness.e),
      kind: report.kind,
      at: typeof report.witness.t === "string" ? report.witness.t : null,
      accountable: report.accountable,
      authorized: report.authorized,
      paid: report.paid,
      attested: report.attested,
      standing: null,
    }));
  }
  for (const claim of input.accountableClaims ?? []) {
    rows.push(Object.freeze({
      id: claim.path,
      kind: claim.kind,
      at: null,
      accountable: claim.accountable,
      authorized: claim.authorized,
      paid: null,
      attested: null,
      standing: claim.standing,
    }));
  }
  return Object.freeze(rows.sort((left, right) => left.id.localeCompare(right.id)));
}

function defaultDataFiles(data) {
  return Object.freeze([
    dataFile("witness-ledger.jsonl", data.witnessRows),
    dataFile("infotile-field.jsonl", data.infotileRows),
    dataFile("packages.jsonl", data.packageRows),
    dataFile("package-edges.jsonl", data.packageEdges),
    dataFile("session-events.jsonl", data.sessionEvents),
    dataFile("camps.jsonl", data.camps),
    dataFile("federation-admission.jsonl", data.federationAdmissionRows),
    dataFile("accountable-records.jsonl", data.accountableRows),
  ]);
}

function dataFile(name, rows) {
  return Object.freeze({
    path: `${VIEW_DATA_DIR}/${name}`,
    content: rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length === 0 ? "" : "\n"),
  });
}

function defaultNotebookDocuments(instance, exportedAt) {
  const definitions

 = Object.freeze([
    {
      id: "witness-ledger",
      title: "Organizing Witness Ledger",
      summary: "RWIL EAVT rows with bilattice charge, knowledge-order, and truth-order columns.",
      cells: witnessLedgerCells(),
    },
    {
      id: "infotile-field",
      title: "Organizing InfoTile Field",
      summary: "RWIL witness rows as a finite FOUR-coloured tile field.",
      cells: infotileFieldCells(),
    },
    {
      id: "package-mesh",
      title: "Organizing Package Mesh",
      summary: "Workspace package dependencies, exports, bins, and verification scripts.",
      cells: packageMeshCells(),
    },
    {
      id: "activity-timeseries",
      title: "Organizing Session Activity",
      summary: "MASH session events and witness-ledger activity over time.",
      cells: activityTimeseriesCells(),
    },
    {
      id: "four-charge-bilattice",
      title: "Organizing FOUR-Charge Bilattice",
      summary: "Distribution of the four bilattice charges and the leq_k by leq_t heatmap.",
      cells: fourChargeCells(),
    },
    {
      id: "federation-admission",
      title: "Federation Admission",
      summary: "Incompatible federation assertions requiring an explicit admission decision.",
      cells: federationAdmissionCells(),
    },
  ]);
  return Object.freeze(definitions.map((definition) => {
    const notebook = organizingNotebook({
      id: `organizing.default-view.${definition.id}`,
      title: definition.title,
      summary: definition.summary,
      metadata: {
        organizingDefaultView: {
          instance,
          exportedAt,
          view: definition.id,
        },
        kernelspec: {
          name: "python3",
          display_name: "Python 3",
          language: "python",
        },
        language_info: {
          name: "python",
          mimetype: "text/x-python",
          file_extension: ".py",
        },
      },
      cells: definition.cells,
    });
    return Object.freeze({
      id: definition.id,
      path: `${VIEW_NOTEBOOK_DIR}/${definition.id}.ipynb`,
      title: definition.title,
      notebook,
      content: encodeIpynb(notebook),
    });
  }));
}

function markdown(source) {
  return Object.freeze({ kind: "markdown", source });
}

function code(source) {
  return Object.freeze({ kind: "code", source });
}

function setupCell() {
  return code(`from pathlib import Path
import pandas as pd
import altair as alt
import plotly.graph_objects as go
import networkx as nx

def data_dir():
    candidates = [Path.cwd() / "data", Path.cwd().parent / "data", Path("data")]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]

DATA_DIR = data_dir()

def load_jsonl(name, columns):
    path = DATA_DIR / name
    if not path.exists() or path.stat().st_size == 0:
        return pd.DataFrame(columns=columns)
    return pd.read_json(path, lines=True)
`);
}

function witnessLedgerCells() {
  return Object.freeze([
    markdown("# Witness Ledger\n\nRWIL EAVT rows projected with charge, leq_k, and leq_t columns."),
    setupCell(),
    code(`ledger = load_jsonl("witness-ledger.jsonl", ["id", "entity", "attribute", "value", "time", "source", "charge", "truth_side", "falsity_side", "leq_k", "leq_t"])
ledger[["id", "source", "time", "attribute", "charge", "leq_k", "leq_t", "entity", "value"]]`),
    code(`charge_counts = ledger.groupby(["source", "charge"], dropna=False).size().reset_index(name="rows")
alt.Chart(charge_counts).mark_bar().encode(
    x=alt.X("charge:N", sort=["absurd", "potential", "active", "stable"]),
    y="rows:Q",
    color="source:N",
    column="source:N",
) if len(charge_counts) else charge_counts`),
  ]);
}

function infotileFieldCells() {
  return Object.freeze([
    markdown("# InfoTile Field\n\nRWIL witness rows read as a finite FOUR-coloured tile field. This is an operational projection over the canonical witness ledger, not a separate display ledger."),
    setupCell(),
    code(`tiles = load_jsonl("infotile-field.jsonl", ["id", "title", "role", "source", "charge", "truth_side", "falsity_side", "leq_k", "leq_t", "x", "y", "evidence", "time", "entity", "attribute", "value"])
tiles[["id", "source", "charge", "leq_k", "leq_t", "x", "y", "evidence", "time"]]`),
    code(`charge_order = ["absurd", "potential", "active", "stable"]
alt.Chart(tiles).mark_rect(stroke="white").encode(
    x=alt.X("x:O", title="tile x"),
    y=alt.Y("y:O", title="tile y"),
    color=alt.Color("charge:N", sort=charge_order),
    tooltip=["id", "source", "charge", "leq_k", "leq_t", "evidence", "time"],
) if len(tiles) else tiles`),
    code(`summary = tiles.groupby(["source", "charge", "truth_side", "falsity_side"], dropna=False).size().reset_index(name="tiles") if len(tiles) else pd.DataFrame(columns=["source", "charge", "truth_side", "falsity_side", "tiles"])
alt.Chart(summary).mark_bar().encode(
    x=alt.X("charge:N", sort=charge_order),
    y="tiles:Q",
    color=alt.Color("charge:N", sort=charge_order),
    column="source:N",
    tooltip=["source", "charge", "truth_side", "falsity_side", "tiles"],
) if len(summary) else summary`),
  ]);
}

function packageMeshCells() {
  return Object.freeze([
    markdown("# Package Mesh\n\nDependency graph plus per-package deps, exports, bins, and test/check scripts."),
    setupCell(),
    code(`packages = load_jsonl("packages.jsonl", ["package", "version", "layer", "lifecycle", "maturity", "dependency_count", "dependencies", "exports", "bins", "tests", "scripts"])
edges = load_jsonl("package-edges.jsonl", ["from", "to", "kind"])
packages.sort_values(["dependency_count", "package"], ascending=[False, True])`),
    code(`G = nx.DiGraph()
for _, row in packages.iterrows():
    G.add_node(row["package"], layer=row.get("layer"))
for _, row in edges.iterrows():
    G.add_edge(row["from"], row["to"])

if G.number_of_nodes() == 0:
    fig = go.Figure()
else:
    pos = nx.spring_layout(G, seed=561)
    edge_x, edge_y = [], []
    for src, dst in G.edges():
        x0, y0 = pos[src]
        x1, y1 = pos[dst]
        edge_x.extend([x0, x1, None])
        edge_y.extend([y0, y1, None])
    node_x = [pos[node][0] for node in G.nodes()]
    node_y = [pos[node][1] for node in G.nodes()]
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=edge_x, y=edge_y, mode="lines", line=dict(width=0.8, color="#888"), hoverinfo="none"))
    fig.add_trace(go.Scatter(x=node_x, y=node_y, mode="markers+text", text=list(G.nodes()), textposition="top center", marker=dict(size=10)))
    fig.update_layout(showlegend=False, margin=dict(l=10, r=10, t=30, b=10))
fig`),
  ]);
}

function activityTimeseriesCells() {
  return Object.freeze([
    markdown("# Session And Ledger Activity\n\nMASH session/event activity and witness-ledger row arrival over time."),
    setupCell(),
    code(`events = load_jsonl("session-events.jsonl", ["id", "session", "harness", "camp", "kind", "source", "at"])
ledger = load_jsonl("witness-ledger.jsonl", ["id", "entity", "attribute", "value", "time", "source", "charge", "truth_side", "falsity_side", "leq_k", "leq_t"])

event_series = events.copy()
if len(event_series):
    event_series["at"] = pd.to_datetime(event_series["at"], errors="coerce")
    event_series = event_series.dropna(subset=["at"]).assign(series="session-event")

ledger_series = ledger.copy()
if len(ledger_series):
    ledger_series["at"] = pd.to_datetime(ledger_series["time"], errors="coerce")
    ledger_series = ledger_series.dropna(subset=["at"]).assign(series="witness-row", session="witness-ledger", harness=ledger_series["source"])

activity = pd.concat([event_series[["at", "series", "session", "harness"]], ledger_series[["at", "series", "session", "harness"]]], ignore_index=True)
if len(activity):
    activity["bucket"] = activity["at"].dt.floor("h")
activity.head()`),
    code(`activity_counts = activity.groupby(["bucket", "series"], dropna=False).size().reset_index(name="count") if len(activity) else pd.DataFrame(columns=["bucket", "series", "count"])
alt.Chart(activity_counts).mark_line(point=True).encode(
    x="bucket:T",
    y="count:Q",
    color="series:N",
) if len(activity_counts) else activity_counts`),
  ]);
}

function fourChargeCells() {
  return Object.freeze([
    markdown("# FOUR-Charge Bilattice\n\nCharge distribution and the leq_k by leq_t poly-informational heatmap."),
    setupCell(),
    code(`ledger = load_jsonl("witness-ledger.jsonl", ["id", "entity", "attribute", "value", "time", "source", "charge", "truth_side", "falsity_side", "leq_k", "leq_t"])
charge_order = ["absurd", "potential", "active", "stable"]
distribution = ledger.groupby(["source", "charge"], dropna=False).size().reset_index(name="rows") if len(ledger) else pd.DataFrame(columns=["source", "charge", "rows"])
distribution`),
    code(`alt.Chart(distribution).mark_bar().encode(
    x=alt.X("charge:N", sort=charge_order),
    y="rows:Q",
    color=alt.Color("charge:N", sort=charge_order),
    facet="source:N",
) if len(distribution) else distribution`),
    code(`heatmap = ledger.groupby(["source", "leq_k", "leq_t", "charge"], dropna=False).size().reset_index(name="rows") if len(ledger) else pd.DataFrame(columns=["source", "leq_k", "leq_t", "charge", "rows"])
alt.Chart(heatmap).mark_rect().encode(
    x=alt.X("leq_k:O", title="knowledge order rank"),
    y=alt.Y("leq_t:O", title="truth order rank"),
    color="rows:Q",
    tooltip=["source", "charge", "rows", "leq_k", "leq_t"],
    facet="source:N",
) if len(heatmap) else heatmap`),
  ]);
}

function federationAdmissionCells() {
  return Object.freeze([
    markdown("# Federation Admission\n\nDistinct assertions and denials over a shared cell require an explicit admission decision. This view records that observable condition without inferring a cohomology class or consensus protocol."),
    setupCell(),
    code(`admission = load_jsonl("federation-admission.jsonl", ["report", "camp", "at", "admission_count", "cells", "shared", "contested", "requires_admission", "admission_status"])
if len(admission):
    admission["at"] = pd.to_datetime(admission["at"], errors="coerce")
admission`),
    code(`alt.Chart(admission).mark_bar().encode(
    x="report:N",
    y="admission_count:Q",
    color="admission_status:N",
    tooltip=["report", "camp", "admission_count", "cells", "requires_admission", "admission_status"],
) if len(admission) else admission`),
    code(`long = admission.melt(id_vars=["report", "camp"], value_vars=["shared", "contested", "requires_admission"], var_name="decomposition", value_name="count") if len(admission) else pd.DataFrame(columns=["report", "camp", "decomposition", "count"])
alt.Chart(long).mark_bar().encode(
    x="report:N",
    y="count:Q",
    color="decomposition:N",
) if len(long) else long`),
  ]);
}
