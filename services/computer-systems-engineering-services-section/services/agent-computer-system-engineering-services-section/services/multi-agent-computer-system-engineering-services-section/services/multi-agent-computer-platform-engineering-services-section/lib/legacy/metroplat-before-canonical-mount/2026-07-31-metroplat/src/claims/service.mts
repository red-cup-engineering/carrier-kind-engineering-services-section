import { operation, type Operation } from "../rpc/index.mts";
import { type JsonValue } from "../lib/codecs/json/core.mts";
import type { FilesystemBinding } from "../integrations/filesystem/services/read-write.mts";
import {
  quoteParityReconciliation,
  type ParityReconciliationRequest,
} from "../lib/math/physics/models/quantum-contextuality/index.mts";
import {
  parityReconciliationReadoutContract,
  parityReconciliationRequestContract,
} from "./schema.mts";
import { contentAddress } from "../lib/identity/index.mts";

export function claimSessionOperations(binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "request-consensus",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Quote exact finite parity reconciliations.",
      description: "Domain: a finite Boolean parity model with distinct pair contexts and an optional menuOffset/menuLimit page. Computes [target] + B¹, exact decimal cardinality, an addressably pageable ranked menu of concrete gauge moves, the least degree-weighted idempotent ⊤ price, the counting ground-state energy, and their erased-multiplicity spread. Disconnected graph components are solved independently and composed; only an irreducible connected component can exceed the exact-search envelope. It does not implicitly coerce arbitrary FOUR-valued claim covers into the theorem's domain.",
      domain: parityReconciliationRequestContract,
      codomain: parityReconciliationReadoutContract,
      effects: {
        class: "pure",
        replay: "safe",
        coordination: "coordination-free",
        deterministic: true,
        totality: "schema-bounded",
      },
      run: (input: unknown): unknown => {
        const request = parityReconciliationRequestContract.assert(input, "request-consensus input") as ParityReconciliationRequest;
        const judgment = quoteParityReconciliation(request);
        const material = Object.freeze({
          kind: "metroplat.claim-session.reconciliation-quote" as const,
          judgment,
        });
        return parityReconciliationReadoutContract.assert(Object.freeze({
          ...material,
          id: contentAddress(material as unknown as JsonValue),
        }), "request-consensus output");
      },
    }),
  ]);
}
