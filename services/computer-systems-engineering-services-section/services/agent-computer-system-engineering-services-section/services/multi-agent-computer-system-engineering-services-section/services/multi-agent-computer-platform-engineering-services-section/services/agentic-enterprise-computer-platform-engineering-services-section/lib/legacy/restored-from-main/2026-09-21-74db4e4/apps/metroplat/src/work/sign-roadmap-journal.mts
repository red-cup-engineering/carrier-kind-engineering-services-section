/** The roadmap persistence adapter carries direct-RMN SEAVT through the
 * witness journal. A graph is a separately declared MetroPlat projection;
 * this adapter never turns general E/A/V coordinates into graph edges. */
import { createSignClaim } from "@red-cup-engineering/computer-data-engine/semantic-claim";
import { mergeSignGraphs, createSignGraph, type SignGraph } from "@red-cup-engineering/computer-data-engine/semantic-graph";
import { referenceOf } from "@red-cup-engineering/computer-data-engine/semantic-cell";
import { identifyContent } from "@red-cup-engineering/computer-data-engine";
import { termToJson, jsonToTerm } from "@red-cup-engineering/relation-model-notation-json-codec";
import { readSeavt, appendSeavt } from "@red-cup-engineering/eavt/journal";
import { seavt } from "@red-cup-engineering/eavt/row";
import type { JsonValue } from "../lib/codecs/json/core.mts";
import type { FilesystemBinding } from "../integrations/filesystem/services/read-write.mts";
import { type SignRoadmap } from "./sign-roadmap.mts";

export const SIGN_ROADMAP_SUBJECT = "561-group-roadmap";
export const SIGN_ROADMAP_FEED = "witness-journal-seavt";
export const SIGN_ROADMAP_RECORD_KIND = "metroplat.sign-roadmap@1";
export interface SignRoadmapJournalAdmission { readonly graph: string; readonly appended: number; readonly status: "admitted" | "already-admitted"; }
type RoadmapWitness = Readonly<{ readonly kind: typeof SIGN_ROADMAP_RECORD_KIND; readonly subject: string; readonly graph: SignGraph; readonly author: string; readonly witness: string; readonly claim: unknown }>;
type LegacyRoadmapWitness = Readonly<{ readonly kind: typeof SIGN_ROADMAP_RECORD_KIND; readonly subject: string; readonly graph: SignGraph; readonly event: Readonly<Record<string, unknown>> }>;


function roadmapOfGraph(graph: SignGraph): SignRoadmap {
  return Object.freeze({ graph, cells: new Map(graph.cells.map((cell) => [cell.id, cell])) });
}

function recordOf(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : undefined;
}

/** Re-admit a portable graph record before a read model can use it. */
export function readSignRoadmapGraph(input: unknown): SignRoadmap | undefined {
  const graph = recordOf(input) as SignGraph | undefined;
  if (graph === undefined) return undefined;
  if (graph.kind !== "sign.graph" || !Array.isArray(graph.cells) || !Array.isArray(graph.relations) || !Array.isArray(graph.edges) || typeof graph.id !== "string") return undefined;
  const admitted = createSignGraph({ cells: graph.cells, relations: graph.relations, edges: graph.edges.map((entry) => entry.edge) });
  return admitted.ok && admitted.value.id === graph.id ? roadmapOfGraph(admitted.value) : undefined;
}

function witnessedRoadmap(subject: string, roadmap: SignRoadmap): RoadmapWitness {
  const anchor = roadmap.graph.cells[0];
  if (anchor === undefined) throw new TypeError("a persisted roadmap requires at least one typed cell");
  const claim = createSignClaim({ subject: referenceOf(anchor), predicate: "metroplat.roadmap-admitted", object: referenceOf(anchor), charge: "potential" });
  if (!claim.ok) throw new TypeError(claim.refusal.message);
  // This feed has one witness per graph cut. A private sequence and ordinal did
  // not add an observable effect; author, witness, and the admitted claim do.
  return Object.freeze({ kind: SIGN_ROADMAP_RECORD_KIND, subject, graph: roadmap.graph, author: subject, witness: roadmap.graph.id, claim: claim.value });
}

function reAdmitWitness(value: unknown): SignRoadmap | undefined {
  const record = recordOf(value);
  if (record === undefined || record.kind !== SIGN_ROADMAP_RECORD_KIND || typeof record.subject !== "string") return undefined;
  const roadmap = readSignRoadmapGraph(record.graph);
  if (roadmap === undefined) return undefined;
  // New direct carrier: keeps the actual author, graph witness, and claim.
  if (typeof record.author === "string" && typeof record.witness === "string") {
    const claim = createSignClaim(record.claim as Parameters<typeof createSignClaim>[0]);
    return claim.ok && record.author === record.subject && record.witness === roadmap.graph.id ? roadmap : undefined;
  }
  // Read already-issued v1 rows without retaining SignChain. They were always
  // a one-event empty-chain witness; its address preimage is checked exactly.
  const legacy = record as LegacyRoadmapWitness;
  const event = recordOf(legacy.event);
  if (event === undefined) return undefined;
  const claim = createSignClaim(event.claim as Parameters<typeof createSignClaim>[0]);
  if (!claim.ok || event.kind !== "sign.chain.event" || event.ordinal !== 0 || event.witness !== roadmap.graph.id || event.author !== record.subject || !Array.isArray(event.parents) || event.parents.length !== 0 || typeof event.id !== "string") return undefined;
  const content = Object.freeze({ kind: "sign.chain.event", ordinal: 0, author: event.author, witness: event.witness, parents: Object.freeze([]), claim: claim.value });
  return event.id === identifyContent(Object.freeze({ kind: "sign.cell", type: "sign.chain.event@1", content })) ? roadmap : undefined;
}

/** Append one direct-RMN witness. The graph is domain-owned payload, not an
 * inferred EAVT graph encoding; exact canonical SEAVT equality makes replay idempotent. */
export function admitSignRoadmap(
  binding: FilesystemBinding,
  roadmap: SignRoadmap,
  options: Readonly<{ readonly at: string; readonly subject?: string }>,
): SignRoadmapJournalAdmission {
  const subject = options.subject ?? SIGN_ROADMAP_SUBJECT;
  const witness = witnessedRoadmap(subject, roadmap);
  const row = seavt(jsonToTerm(roadmap.graph.id), jsonToTerm(SIGN_ROADMAP_RECORD_KIND), jsonToTerm(witness as unknown as JsonValue), options.at);
  const result = appendSeavt(binding.dataRoot, SIGN_ROADMAP_FEED, [row], options.at);
  return Object.freeze({ graph: roadmap.graph.id, appended: result.appended, status: result.appended === 0 ? "already-admitted" : "admitted" });
}

/** One shared roadmap readout from strict direct-RMN source rows. Generic EAVT
 * rows are refused by the witness journal before any application projection. */
export function readSignRoadmap(binding: FilesystemBinding, date: string, subject = SIGN_ROADMAP_SUBJECT): SignRoadmap | undefined {
  const graphs: SignGraph[] = [];
  for (const { entry } of readSeavt(binding.dataRoot, SIGN_ROADMAP_FEED, date)) {
    const entity = termToJson(entry.e), attribute = termToJson(entry.a), value = termToJson(entry.v);
    if (attribute !== SIGN_ROADMAP_RECORD_KIND) continue;
    const witness = recordOf(value);
    if (witness === undefined || witness.subject !== subject || witness.kind !== SIGN_ROADMAP_RECORD_KIND || entity !== (recordOf(witness.graph) ?? {}).id) throw new TypeError("invalid direct-RMN MetroPlat roadmap witness");
    const roadmap = reAdmitWitness(witness);
    if (roadmap === undefined) throw new TypeError("invalid direct-RMN MetroPlat roadmap witness");
    graphs.push(roadmap.graph);
  }
  if (graphs.length === 0) return undefined;
  const merged = mergeSignGraphs(...graphs);
  return merged.ok ? roadmapOfGraph(merged.value) : undefined;
}
