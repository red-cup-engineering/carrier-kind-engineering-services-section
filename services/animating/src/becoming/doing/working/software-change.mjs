import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createTypedMark, referenceOf } from "@red-cup-engineering/signcell/typed-mark";
import { createSignGraph } from "@red-cup-engineering/signcell/semantic-graph";
import { projectSignGraphTopology } from "@red-cup-engineering/signgraph/graph";
import { KnowledgeBase } from "@red-cup-engineering/signcraft/knowledge-base";
import { planJsnodeModuleSpecifierRewrite, applyJsnodeSourceEditPlan, readJsnodeSourceRecord } from "@red-cup-engineering/javascript-node-services-section/syntax";
import { concludeSoftwareWork, proposeSoftwareWork, readSoftwareWorkProposal } from "./software-change/work-journal.mjs";
import { admitSoftwareOwner, nearestSoftwareOwner } from "./software-change/owner-declaration.mjs";
export { admitSoftwareOwner } from "./software-change/owner-declaration.mjs";
import { artifactType as sourceType, locationType, workType, placementType, ownerType, consumerType } from "./software-change/carriers.mjs";

function cell(type, content) {
  const result = createTypedMark(type, content);
  if (!result.ok) throw new TypeError(result.refusal.message);
  return result.value;
}

export const softwareWorkIdentity = (intent) => cell(workType, intent).id;
export function admitSoftwarePlacement(placement) {
  const admitted = cell(placementType, placement);
  if (placement.ownerAfterKind === "instance") {
    throw new TypeError("an instance supplies configuration and state; it cannot own executable capability");
  }
  return admitted;
}

/** One evidence form for code work: admitted artifacts, their work relation,
 * ordered tellings, and a settled reading. A projected edge never says a
 * filesystem effect has happened. */
export function witnessSoftwareWork({ intent, inputs, outputs, placement, owner, discoveredConsumers = [], applied = false, observed = false }) {
  if (applied && observed) throw new TypeError("software work cannot both apply and merely observe an output");
  const work = cell(workType, intent);
  const positioned = (item) => ({
    artifact: cell(sourceType, { digest: item.digest, kind: item.kind, ...(item.length === undefined ? {} : { length: item.length }) }),
    location: cell(locationType, { path: item.path }),
  });
  const before = inputs.map(positioned);
  const after = outputs.map(positioned);
  const placed = placement === undefined ? null : admitSoftwarePlacement(placement);
  const targetOwner = owner === undefined ? null : admitSoftwareOwner(owner);
  const ownerBefore = placed ? cell(ownerType, { name: placement.ownerBefore, kind: placement.ownerBeforeKind }) : null;
  const ownerAfter = placed ? cell(ownerType, { name: placement.ownerAfter, kind: placement.ownerAfterKind }) : null;
  const consumers = placed ? placement.consumers.map((name) => cell(consumerType, { name })) : [];
  const sourceConsumers = discoveredConsumers.map(({ path, digest }) => ({
    consumer: cell(consumerType, { name: path }),
    source: cell(sourceType, { digest, kind: "source-file" }),
  }));
  const relations = [
    { id: "aoe.software.consumes", subjectTypes: [workType.id], objectTypes: [sourceType.id], witnessTypes: [workType.id] },
    { id: applied ? "aoe.software.produced" : observed ? "aoe.software.observed" : "aoe.software.projects", subjectTypes: [workType.id], objectTypes: [sourceType.id], witnessTypes: [workType.id] },
    { id: "aoe.software.located-before", subjectTypes: [sourceType.id], objectTypes: [locationType.id], witnessTypes: [workType.id] },
    { id: "aoe.software.located-after", subjectTypes: [sourceType.id], objectTypes: [locationType.id], witnessTypes: [workType.id] },
    { id: "aoe.software.consumer-source", subjectTypes: [consumerType.id], objectTypes: [sourceType.id], witnessTypes: [workType.id] },
    ...(targetOwner ? [{ id: "aoe.software.targets-owner", subjectTypes: [workType.id], objectTypes: [ownerType.id], witnessTypes: [workType.id] }] : []),
    ...(placed ? [
      { id: "aoe.software.places", subjectTypes: [workType.id], objectTypes: [placementType.id], witnessTypes: [workType.id] },
      { id: "aoe.software.owner-before", subjectTypes: [placementType.id], objectTypes: [ownerType.id], witnessTypes: [workType.id] },
      { id: "aoe.software.owner-after", subjectTypes: [placementType.id], objectTypes: [ownerType.id], witnessTypes: [workType.id] },
      { id: "aoe.software.affects-consumer", subjectTypes: [placementType.id], objectTypes: [consumerType.id], witnessTypes: [workType.id] },
    ] : []),
  ];
  const edges = [
    ...before.map(({ artifact }) => ({ subject: referenceOf(work), predicate: relations[0].id, object: referenceOf(artifact), witness: referenceOf(work) })),
    ...after.map(({ artifact }) => ({ subject: referenceOf(work), predicate: relations[1].id, object: referenceOf(artifact), witness: referenceOf(work) })),
    ...before.map(({ artifact, location }) => ({ subject: referenceOf(artifact), predicate: relations[2].id, object: referenceOf(location), witness: referenceOf(work) })),
    ...after.map(({ artifact, location }) => ({ subject: referenceOf(artifact), predicate: relations[3].id, object: referenceOf(location), witness: referenceOf(work) })),
    ...sourceConsumers.map(({ consumer, source }) => ({ subject: referenceOf(consumer), predicate: "aoe.software.consumer-source", object: referenceOf(source), witness: referenceOf(work) })),
    ...(targetOwner ? [{ subject: referenceOf(work), predicate: "aoe.software.targets-owner", object: referenceOf(targetOwner), witness: referenceOf(work) }] : []),
    ...(placed ? [
      { subject: referenceOf(work), predicate: "aoe.software.places", object: referenceOf(placed), witness: referenceOf(work) },
      { subject: referenceOf(placed), predicate: "aoe.software.owner-before", object: referenceOf(ownerBefore), witness: referenceOf(work) },
      { subject: referenceOf(placed), predicate: "aoe.software.owner-after", object: referenceOf(ownerAfter), witness: referenceOf(work) },
      ...consumers.map((consumer) => ({ subject: referenceOf(placed), predicate: "aoe.software.affects-consumer", object: referenceOf(consumer), witness: referenceOf(work) })),
    ] : []),
  ];
  const cells = [work, ...before.flatMap(({ artifact, location }) => [artifact, location]), ...after.flatMap(({ artifact, location }) => [artifact, location]),
    ...(placed ? [placed, ownerBefore, ownerAfter, ...consumers] : []),
    ...(targetOwner ? [targetOwner] : []),
    ...sourceConsumers.flatMap(({ consumer, source }) => [consumer, source])];
  const admitted = createSignGraph({ cells: [...new Map(cells.map((item) => [item.id, item])).values()], relations, edges });
  if (!admitted.ok) throw new TypeError(admitted.refusal.message);
  const graph = admitted.value;
  const topology = projectSignGraphTopology(graph);
  const knowledge = new KnowledgeBase();
  for (const edge of edges) knowledge.tell({ subject: edge.subject.id, predicate: edge.predicate, object: edge.object.id }, work.id);
  const settlement = knowledge.settle();
  return Object.freeze({
    cells: graph.cells, graph,
    orderedEvidence: knowledge.log.rows,
    settlement: { kind: settlement.kind, stages: settlement.stages.length, outputReadings: after.map(({ artifact }) => knowledge.readingAt(work.id, relations[1].id, artifact.id)) },
    affected: { nodes: topology.nodes().length, edges: graph.edges.length },
  });
}

/**
 * AOE work over an exact source carrier. The syntax package only plans and
 * applies parser-admitted edits; this component owns the filesystem effect and
 * witnesses the source, intent, projected or observed output, and relations.
 */
export async function rewriteModuleSpecifierWork({ file, from, to, actor, write = false, journalPath }) {
  if (typeof actor !== "string" || actor.trim() === "") throw new TypeError("software-change work needs an actor");
  if (!journalPath) throw new TypeError("software-change work needs a journalPath for its before/after witness");
  const absoluteFile = resolve(file);
  const stat = await lstat(absoluteFile);
  if (!stat.isFile() || stat.isSymbolicLink() || await realpath(absoluteFile) !== absoluteFile) {
    throw new TypeError("codemod source must be a real file under its declared owner");
  }
  const owner = await nearestSoftwareOwner(dirname(absoluteFile));
  const ownerArtifact = { path: owner.path, kind: "software-owner-declaration", digest: owner.digest, length: owner.length };
  const ownerIdentity = { name: owner.name, kind: owner.kind, digest: owner.digest };
  const intent = { operation: "module-specifier-rewrite", actor, request: { file, from, to, owner: ownerIdentity } };
  const work = softwareWorkIdentity(intent);
  const admitted = write ? (await readSoftwareWorkProposal(journalPath, work)).proposal : null;
  if (write && (admitted.actor !== actor || admitted.file !== file || admitted.from !== from || admitted.to !== to)) {
    throw new Error("journal does not admit this work");
  }
  const source = await readFile(file, "utf8");
  if (write) {
    const current = readJsnodeSourceRecord(source, file);
    const inputs = [ownerArtifact, { path: file, kind: "source-file", digest: admitted.source.digest, length: admitted.source.length }];
    const outputs = [{ path: file, kind: "source-file", digest: admitted.output.digest, length: admitted.output.length }];
    if (current.digest === admitted.output.digest && admitted.source.digest !== admitted.output.digest) {
      const history = await concludeSoftwareWork(journalPath, work, "observed", current);
      return Object.freeze({ kind: "aoe.software.module-rewrite.receipt", version: 1, actor,
        status: "observed", editCount: admitted.editCount, source: admitted.source, output: current,
        journalPath, history,
        evidence: witnessSoftwareWork({ intent, inputs, outputs, owner: { name: owner.name, kind: owner.kind }, observed: true }) });
    }
    if (current.digest !== admitted.source.digest) throw new Error("source changed since the admitted proposal");
  }
  const plan = planJsnodeModuleSpecifierRewrite(source, file, from, to);
  const projected = applyJsnodeSourceEditPlan(source, file, plan);
  const inputs = [ownerArtifact, { path: file, kind: "source-file", digest: projected.source.digest, length: projected.source.length }];
  const outputs = [{ path: file, kind: "source-file", digest: projected.output.digest, length: projected.output.length }];
  const evidence = witnessSoftwareWork({ intent, inputs, outputs, owner: { name: owner.name, kind: owner.kind } });
  if (!write) {
    const history = await proposeSoftwareWork(journalPath, work, {
      actor, file, from, to, owner: ownerIdentity, source: projected.source, output: projected.output, editCount: projected.editCount,
    });
    return Object.freeze({ kind: "aoe.software.module-rewrite.receipt", version: 1, actor,
      status: "planned", editCount: projected.editCount, source: projected.source, output: projected.output,
      journalPath, history, evidence });
  }
  if (admitted.source.digest !== projected.source.digest || admitted.output.digest !== projected.output.digest ||
      admitted.editCount !== projected.editCount) throw new Error("journal does not admit this exact source transformation");
  const current = await readFile(file, "utf8");
  applyJsnodeSourceEditPlan(current, file, plan);
  if (projected.editCount > 0) await writeFile(file, projected.text, { encoding: "utf8", flush: true });
  const observed = readJsnodeSourceRecord(await readFile(file, "utf8"), file);
  if (observed.digest !== projected.output.digest) throw new Error("written source differs from admitted projection");
  const applied = projected.editCount > 0;
  const history = await concludeSoftwareWork(journalPath, work, applied ? "applied" : "observed", observed);
  return Object.freeze({
    kind: "aoe.software.module-rewrite.receipt", version: 1, actor,
    status: applied ? "applied" : "observed", editCount: projected.editCount,
    source: projected.source, output: projected.output,
    journalPath, history,
    evidence: witnessSoftwareWork({
      intent, inputs, outputs, owner: { name: owner.name, kind: owner.kind },
      applied,
    }),
  });
}
