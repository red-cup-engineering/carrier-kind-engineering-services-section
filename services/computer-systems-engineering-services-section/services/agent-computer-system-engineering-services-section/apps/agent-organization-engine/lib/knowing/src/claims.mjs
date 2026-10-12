/** Sourced enterprise knowledge in SignCells; assertions remain testimony, not work items. */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { cell, address, merge, knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { each, put } from "@red-cup-engineering/semiotic-eavt-services-section/store";

const named = { type: "string", minLength: 1 };
const triple = { subject: {}, predicate: named, object: {} };
const contract = (name, properties, required = []) => schemaFrom({ $id: `knowing/${name}`, type: "object", properties, required, additionalProperties: false });
const output = schemaFrom({ $id: "knowing/claims/output", type: "object", required: ["kind", "claims"], properties: {
  kind: { const: "knowing.claims" }, claims: { type: "array", items: { type: "object", required: ["address", "cell", "reading"], properties: {
    address: named, cell: { type: "object", required: ["subject", "predicate", "object", "for", "against"], properties: { ...triple, for: { type: "array" }, against: { type: "array" } } },
    reading: { enum: ["potential", "active", "stable", "absurd"] },
  } } }, receipt: { type: "object" },
} });

export function knowledgeClaims(binding) {
  const read = (query = {}) => {
    const cells = new Map();
    for (const { record } of each(binding.dataRoot, "claim")) {
      const value = record.cell;
      const id = address(value);
      cells.set(id, cells.has(id) ? merge(cells.get(id), value) : value);
    }
    return { kind: "knowing.claims", claims: [...cells].filter(([id, value]) =>
      (query.address === undefined || id === query.address)
      && (query.subject === undefined || JSON.stringify(value.subject) === JSON.stringify(query.subject))
      && (query.predicate === undefined || value.predicate === query.predicate))
      .map(([id, value]) => ({ address: id, cell: value, reading: knowledgeReading(value) })) };
  };
  return Object.freeze([
    operation({ verb: "knowledge-claims", summary: "Read sourced enterprise claims, preserving unknown, held, denied and contested evidence.",
      codomain: output,
      domain: contract("claims/query", { address: named, subject: {}, predicate: named }),
      effects: { class: "host-read", replay: "safe", coordination: "coordination-free", deterministic: true, totality: "schema-bounded" }, run: (input = {}) => read(input) }),
    operation({ verb: "knowledge-claim-admit", summary: "Assert or deny one sourced relation; join testimony without overwriting conflicting evidence.",
      codomain: output,
      description: "Evidence references identify the source of testimony. Admission does not certify their truth, appoint an officer, enact a rule, or create an execution obligation.",
      domain: contract("claims/admission", { ...triple, evidence: { type: "array", minItems: 1, items: named },
        told: { type: "object", required: ["for", "against"], properties: { for: { type: "boolean" }, against: { type: "boolean" } }, additionalProperties: false }, note: { type: "string" } },
        ["subject", "predicate", "object", "evidence", "told"]),
      effects: { class: "journal-write", replay: "idempotency-key", coordination: "coordination-free", deterministic: true, totality: "schema-bounded" },
      run: (input, _args, context) => {
        const actor = context?.invocation?.subject;
        if (!actor || actor === "anonymous") throw new TypeError("knowledge claim requires an attributed caller");
        const witness = { actor, evidence: input.evidence, ...(input.note === undefined ? {} : { note: input.note }) };
        const value = cell(input.subject, input.predicate, input.object, {
          for: input.told.for ? [witness] : [], against: input.told.against ? [witness] : [],
        });
        // A claim is a `claim` record of the store: the same testimony said again is the same record.
        const receipt = { id: put(binding.dataRoot, "claim", { cell: value, told: input.told }) };
        return { ...read({ address: address(value) }), receipt };
      } }),
  ]);
}
