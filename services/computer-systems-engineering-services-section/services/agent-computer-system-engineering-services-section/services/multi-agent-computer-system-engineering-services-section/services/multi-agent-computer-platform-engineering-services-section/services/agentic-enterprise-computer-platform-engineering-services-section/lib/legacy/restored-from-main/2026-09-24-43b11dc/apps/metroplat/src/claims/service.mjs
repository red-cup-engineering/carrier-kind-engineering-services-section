import { operation } from "../rpc/operation.mjs";
import { } from "@red-cup-engineering/json-services-section";

import { quoteParityReconciliation } from "@lenticule-science/metrologic/models/physics/models/quantum-contextuality/reconciliation-quote";
import { parityReconciliationReadoutContract, parityReconciliationRequestContract } from "./schema.mjs";
import { artifactId } from "@red-cup-engineering/computer-system-engine/identity";

export function claimSessionOperations(binding) {
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
      run: (input) => {
        const request = parityReconciliationRequestContract.assert(input, "request-consensus input");
        const judgment = quoteParityReconciliation(request);
        const material = Object.freeze({
          kind: "metroplat.claim-session.reconciliation-quote",
          judgment,
        });
        return parityReconciliationReadoutContract.assert(Object.freeze({
          ...material,
          id: artifactId(material),
        }), "request-consensus output");
      },
    }),
  ]);
}
