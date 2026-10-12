import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { renderJsonSchemaModule } from "@red-cup-engineering/javascript-node-code-fabrication-services-section/transform-json-schema-to-typescript";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { softwareWorkIdentity, witnessSoftwareWork } from "../software-change.mjs";
import { nearestSoftwareOwner } from "./owner-declaration.mjs";
import { concludeSoftwareWork, proposeSoftwareWork, readSoftwareWorkProposal } from "./work-journal.mjs";

const digest = (bytes) => sha256Hex(bytes);
async function optionalRead(path) {
  try { return await readFile(path); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

async function generationOwner(specificationsDir, outFile) {
  const sourceOwner = await nearestSoftwareOwner(specificationsDir);
  const outputOwner = await nearestSoftwareOwner(dirname(resolve(outFile)));
  if (sourceOwner.path !== outputOwner.path) {
    throw new TypeError("generated source and its specifications must belong to the same declared software owner");
  }
  return sourceOwner;
}

async function projection(specificationsDir, outFile, schemaTypeImport) {
  const names = (await readdir(specificationsDir)).filter((name) => name.endsWith(".schema.json")).sort();
  const sources = await Promise.all(names.map(async (name) => {
    const path = join(specificationsDir, name);
    const bytes = await readFile(path);
    return { path, digest: digest(bytes), length: bytes.length, schema: JSON.parse(bytes.toString("utf8")) };
  }));
  const entries = sources.flatMap(({ path, schema }) => {
    const codegen = schema["x-codegen"];
    if (!codegen) return [];
    if (["exportName", "typeName", "runtimeName"].some((name) => typeof codegen[name] !== "string" || !codegen[name])) {
      throw new TypeError(`${path} needs x-codegen names`);
    }
    return [{ schema, ...codegen }];
  });
  if (!entries.length) throw new Error(`no schema with x-codegen in ${specificationsDir}`);
  const binding = { name: "defineSchemaType", from: schemaTypeImport, genericSchema: true };
  const output = Buffer.from(renderJsonSchemaModule(entries, { format: "javascript", runtimeBinding: binding }) + "\n");
  const existing = await optionalRead(outFile);
  return { sources: sources.map(({ path, digest: sourceDigest, length }) => ({ path, digest: sourceDigest, length })),
    output: { path: outFile, digest: digest(output), length: output.length },
    before: existing ? { path: outFile, digest: digest(existing), length: existing.length } : null,
    bytes: output, changed: !existing || !existing.equals(output) };
}

const intentOf = ({ specificationsDir, outFile, actor, schemaTypeImport, owner }) => ({
  operation: "semantic-carrier-generation", actor,
  request: { specificationsDir, outFile, schemaTypeImport,
    owner: { name: owner.name, kind: owner.kind, digest: owner.digest } },
});

function evidence(intent, projected, owner, status) {
  return witnessSoftwareWork({
    intent,
    inputs: [
      { path: owner.path, kind: "software-owner-declaration", digest: owner.digest, length: owner.length },
      ...projected.sources.map(({ path, digest: sourceDigest, length }) => ({ path, kind: "json-schema", digest: sourceDigest, length })),
      ...(projected.before ? [{ ...projected.before, kind: "generated-source-before" }] : []),
    ],
    outputs: [{ ...projected.output, kind: "generated-source" }],
    owner: { name: owner.name, kind: owner.kind },
    applied: status === "applied", observed: status === "observed" || status === "checked",
  });
}

/** AOE owns the witnessed source change; the code-layer renderer owns only projection. */
export async function generateSemanticCarriersWork({ specificationsDir, outFile, actor, schemaTypeImport, write = false, check = false, journalPath }) {
  if (typeof actor !== "string" || !actor.trim()) throw new TypeError("generation work needs an actor");
  if (typeof specificationsDir !== "string" || !specificationsDir || typeof outFile !== "string" || !outFile) {
    throw new TypeError("generation work needs specificationsDir and outFile");
  }
  if (write && check) throw new TypeError("write and check are distinct actions");
  const owner = await generationOwner(specificationsDir, outFile);
  const normalized = { specificationsDir, outFile, actor, owner,
    schemaTypeImport: schemaTypeImport ?? "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type" };
  const intent = intentOf(normalized);
  const work = softwareWorkIdentity(intent);
  const projected = await projection(normalized.specificationsDir, normalized.outFile, normalized.schemaTypeImport);
  if (check) {
    if (projected.changed) throw new Error(`${outFile} differs from admitted specifications`);
    return Object.freeze({ kind: "aoe.software.semantic-carrier-generation.receipt", version: 1,
      status: "checked", output: projected.output, evidence: evidence(intent, projected, owner, "checked") });
  }
  if (!write) {
    const history = await proposeSoftwareWork(journalPath, work, { intent, sources: projected.sources,
      before: projected.before, output: projected.output });
    return Object.freeze({ kind: "aoe.software.semantic-carrier-generation.receipt", version: 1,
      status: "planned", output: projected.output, work, journalPath, history, evidence: evidence(intent, projected, owner, "planned") });
  }
  const { proposal } = await readSoftwareWorkProposal(journalPath, work);
  if (JSON.stringify(proposal.intent) !== JSON.stringify(intent) ||
      JSON.stringify(proposal.sources) !== JSON.stringify(projected.sources) ||
      JSON.stringify(proposal.output) !== JSON.stringify(projected.output)) {
    throw new Error("journal does not admit this exact schema projection");
  }
  if (!projected.changed && proposal.before?.digest !== projected.output.digest) {
    const history = await concludeSoftwareWork(journalPath, work, "observed", projected.output);
    return Object.freeze({ kind: "aoe.software.semantic-carrier-generation.receipt", version: 1,
      status: "observed", output: projected.output, work, journalPath, history, evidence: evidence(intent, projected, owner, "observed") });
  }
  if (JSON.stringify(proposal.before) !== JSON.stringify(projected.before)) throw new Error("generated output changed since proposal");
  if (projected.changed) await writeFile(outFile, projected.bytes, { flush: true });
  const observed = await optionalRead(outFile);
  if (!observed || digest(observed) !== projected.output.digest) throw new Error("generated output differs from admitted projection");
  const status = projected.changed ? "applied" : "observed";
  const history = await concludeSoftwareWork(journalPath, work, status, projected.output);
  return Object.freeze({ kind: "aoe.software.semantic-carrier-generation.receipt", version: 1,
    status, output: projected.output, work, journalPath, history, evidence: evidence(intent, projected, owner, status) });
}
