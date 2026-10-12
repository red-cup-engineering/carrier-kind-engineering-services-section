/**
 * Program-packet registry - portable program bodies as downloadable material.
 *
 * RMN-backed operations can be published as typed executable program packets:
 * schema boundary, codecs, contract id, executable RMN body, conformance
 * profile, vector slots, and a digest. Boundary-only host closures are not
 * packetized here; the packet surface is specifically for portable Hoare/RMN
 * programs.
 */
import { canonicalBytes, digest } from "../../identity/index.mts";
import {
  executableProgramPacket,
  type ContractValue,
  type ExecutableProgramPacket,
} from "../../contracts/index.mts";

import { jsonResource } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";

export interface ProgramPacketOperation {
  readonly verb: string;
  readonly inputFormat: string;
  readonly outputFormat: string;
  readonly runTerm?: unknown;
  readonly domain?: { readonly id: string };
  readonly codomain?: { readonly id: string };
  /** Content address of the derived program contract. */
  readonly contract: string;
}

function digestPacket(value: Omit<ExecutableProgramPacket, "kind" | "digest">): string {
  const canonicalBody = canonicalBytes(jsonResource(value, "program packet digest"));
  return digest(canonicalBody);
}

/** Build a typed executable program packet from an RMN-backed operation. */
export function programPacketFromOperation(operation: ProgramPacketOperation, options: { readonly version?: string } = {}): ExecutableProgramPacket | undefined {
  if (operation.runTerm === undefined) return undefined;
  const base = {
    id: `metroplat.program.packet.${operation.verb}`,
    version: options.version ?? "0.1.0",
    ...(operation.domain === undefined ? {} : { domain: operation.domain.id }),
    ...(operation.codomain === undefined ? {} : { codomain: operation.codomain.id }),
    inputCodecs: Object.freeze([operation.inputFormat]),
    outputCodecs: Object.freeze([operation.outputFormat]),
    bodyFormat: "rmn-core-0.1" as const,
    body: jsonResource(operation.runTerm, `program packet ${operation.verb} body`) as ContractValue,
    purity: "pure" as const,
    totality: operation.domain === undefined || operation.codomain === undefined ? ("partial" as const) : ("structural" as const),
    contract: operation.contract,
    conformance: Object.freeze(["RMN-Syntax", "RMN-Eval", "RMN-SchemaContract", "RMN-Program"]),
    testVectors: Object.freeze([]),
    proofCore: Object.freeze(["typed-rmn-term", "schema-boundary-admissibility"]),
  };
  return executableProgramPacket({ ...base, digest: digestPacket(base) });
}

/** All typed executable program packets derivable from a package operation family. */
export function programPacketsFromOperations(operations: readonly ProgramPacketOperation[]): readonly ExecutableProgramPacket[] {
  return Object.freeze(operations.flatMap((operation) => {
    const packet = programPacketFromOperation(operation);
    return packet === undefined ? [] : [packet];
  }));
}

/** URI for the program-packet catalog resource induced into the program surface. */
export function programPacketCatalogUri(packageName = "@red-cup-engineering/metroplat"): string {
  return `metroplat://${encodeURIComponent(packageName)}/program-packets`;
}

/** URI for one program-packet resource induced into the program surface. */
export function programPacketResourceUri(id: string, packageName = "@red-cup-engineering/metroplat"): string {
  return `metroplat://${encodeURIComponent(packageName)}/program-packet/${encodeURIComponent(id)}`;
}
