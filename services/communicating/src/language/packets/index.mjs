/**
 * Program-packet registry - portable program bodies as downloadable material.
 *
 * SEN-backed operations can be published as typed executable program packets:
 * schema boundary, codecs, contract id, executable SEN body, conformance
 * profile, vector slots, and a digest. Boundary-only host closures are not
 * packetized here; the packet surface is specifically for portable Hoare/SEN
 * programs.
 */
import { admitArtifact } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { executableProgramPacket } from "@red-cup-engineering/signchain/contracts/contract-operation";
import { jsonResource } from "@red-cup-engineering/json-services-section";


function digestPacket(value) {
  const canonicalBody = canonicalJson(jsonResource(value, "program packet digest"));
  return admitArtifact(canonicalBody).ref;
}

/** Build a typed executable program packet from an SEN-backed operation. */
export function programPacketFromOperation(operation, options = {}) {
  if (operation.runTerm === undefined) return undefined;
  const base = {
    id: `metroplat.program.packet.${operation.verb}`,
    version: options.version ?? "0.1.0",
    ...(operation.domain === undefined ? {} : { domain: operation.domain.id }),
    ...(operation.codomain === undefined ? {} : { codomain: operation.codomain.id }),
    inputCodecs: Object.freeze([operation.inputFormat]),
    outputCodecs: Object.freeze([operation.outputFormat]),
    bodyFormat: "sen-core-0.1",
    body: jsonResource(operation.runTerm, `program packet ${operation.verb} body`),
    purity: "pure",
    totality: operation.domain === undefined || operation.codomain === undefined ? ("partial") : ("structural"),
    contract: operation.contract,
    conformance: Object.freeze(["SEN-Syntax", "SEN-Eval", "SEN-SchemaContract", "SEN-Program"]),
    testVectors: Object.freeze([]),
    proofCore: Object.freeze(["typed-sen-term", "schema-boundary-admissibility"]),
  };
  return executableProgramPacket({ ...base, digest: digestPacket(base) });
}

/** All typed executable program packets derivable from a package operation family. */
export function programPacketsFromOperations(operations) {
  return Object.freeze(operations.flatMap((operation) => {
    const packet = programPacketFromOperation(operation);
    return packet === undefined ? [] : [packet];
  }));
}

/** URI for the program-packet catalog resource induced into the program surface. */
export function programPacketCatalogUri(packageName = "@red-cup-engineering/metroplat") {
  return `metroplat://${encodeURIComponent(packageName)}/program-packets`;
}

/** URI for one program-packet resource induced into the program surface. */
export function programPacketResourceUri(id, packageName = "@red-cup-engineering/metroplat") {
  return `metroplat://${encodeURIComponent(packageName)}/program-packet/${encodeURIComponent(id)}`;
}
