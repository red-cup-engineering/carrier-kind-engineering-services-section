/**
 * A program contract is derived from an operation's minimal generators and
 * measured evidence. It is never authored as a second description of the
 * operation.
 *
 * The domain and codomain schemas supply the executable pre/post predicates;
 * the term body and read/write terms supply the move and effects; settlement
 * classification supplies the convergence and coordination regime; Lean
 * declarations name the governing laws; replayable behavioral receipts carry
 * evidence about whether this operation presently preserves its postcondition.
 */
import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { evaluateRunTerm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/eval";
import { inhabitants } from "@red-cup-engineering/json-schema-services-section/inhabit";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

import { operationConvergenceSignature } from "./convergence.mjs";
import { knowledgeJoinReading, readingAs, readingFamilies } from "@red-cup-engineering/computer-data-services-section/four";

function lawCitation(input) {
  return Object.freeze({
    kind: "metroplat.lean.formalization-claim",
    ...input,
    obligations: Object.freeze([...input.obligations]),
    mediaType: "application/vnd.metroplat.lean.formalization-claim+json",
  });
}

export const programContractEvidenceSchema = {
  $id: "metroplat/program-contract/evidence",
  title: "ProgramContractEvidence",
  description: "One replayable measurement contributing FOUR evidence to a derived program contract.",
  type: "object",
  required: ["kind", "contract", "source", "reading", "seed", "requestedSamples", "samples", "rejectedProposals", "conformant", "obstructions"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.program.contract.evidence" },
    contract: { type: "string", minLength: 1 },
    source: { enum: ["behavioral-oracle", "unmeasured-boundary"] },
    reading: { enum: readingFamilies.extremal },
    seed: { type: "integer" },
    requestedSamples: { type: "integer", minimum: 1 },
    samples: { type: "integer", minimum: 0 },
    rejectedProposals: { type: "integer", minimum: 0 },
    conformant: { type: "integer", minimum: 0 },
    obstructions: { type: "array", items: { type: "string" } },
  },
};

export const programContractEvidenceContract = schemaFrom(programContractEvidenceSchema);

export function isProgramContractStanding(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && (value).kind === "metroplat.program.contract.standing";
}

function boundary(operation, side) {
  const schema = side === "domain" ? operation.domain : operation.codomain;
  const wire = side === "domain" ? operation.inputFormat : operation.outputFormat;
  return Object.freeze(schema === undefined
    ? {
        kind: "wire",
        id: `wire:${wire}`,
        predicate: side === "domain" ? "decode-input" : "encode-output",
      }
    : {
        kind: "schema",
        id: schema.id,
        predicate: side === "domain" ? "validate-input" : "validate-output",
      });
}

function laws(settlement) {
  const result = [
    lawCitation({
      theorem: "Obsmetrologia.Computing.keratinousHoareProgram_derives_hoare_program",
      source: "ObsmetrologiaComputing/HoareProgram.lean",
      theoremMaturity: "proved",
      obligations: ["contract-shape"],
    }),
    lawCitation({
      theorem: "Obsmetrologia.Computing.keratinousHoareProgram_least_compatible_state",
      source: "ObsmetrologiaComputing/HoareProgram.lean",
      theoremMaturity: "proved",
      obligations: ["least-compatible-state"],
    }),
    lawCitation({
      theorem: "Obsmetrologia.CRDT.calm_monotone_coordination_free",
      source: "Obsmetrologia/Cohomology/CRDTCohomologicalCALM.lean",
      theoremMaturity: "proved",
      obligations: ["coordination"],
    }),
  ];
  if (settlement.finality === "normal-form") {
    result.push(lawCitation({
      theorem: "Obsmetrologia.Reading.strict_finite",
      source: "Obsmetrologia/Closure/Ordinal/Finite.lean",
      theoremMaturity: "proved",
      obligations: ["finite-settlement"],
    }));
  }
  return Object.freeze(result);
}

/** Derive the stable contract from the operation; no contract fields are accepted as input. */
export function deriveProgramContract(operation) {
  const precondition = boundary(operation, "domain");
  const postcondition = boundary(operation, "codomain");
  const settlement = operationConvergenceSignature(operation);
  const h1Vanishes = operation.effects.coordination === "coordination-free";
  const body = operation.runTerm === undefined ? undefined : operation.runTerm;
  const generator = Object.freeze({
    operation: operation.verb,
    precondition,
    postcondition,
    move: Object.freeze({
      kind: body === undefined ? "host-boundary" : "sen-term",
      ...(body === undefined ? {} : { digest: artifactId(body) }),
      deterministic: operation.effects.deterministic,
      totality: operation.effects.totality,
      reads: Object.freeze(operation.reads.map((term) => term)),
      writes: Object.freeze(operation.writes.map((term) => term)),
    }),
    settlement,
    coordination: Object.freeze({
      h1Vanishes,
      mode: operation.effects.coordination,
    }),
    laws: laws(settlement),
  });
  return Object.freeze({
    kind: "metroplat.program.contract",
    id: artifactId(generator),
    ...generator,
  });
}

/** Measure one operation without invoking host effects. */
export function measureProgramContract(
  operation,
  options = {},
) {
  const contract = deriveProgramContract(operation);
  const requestedSamples = options.samples === undefined ? 3 : Math.max(1, Math.min(32, Math.floor(options.samples)));
  const seed = options.seed ?? 1;
  if (operation.runTerm === undefined || operation.domain === undefined || operation.codomain === undefined) {
    return programContractEvidenceContract.assert(Object.freeze({
      kind: "metroplat.program.contract.evidence",
      contract: contract.id,
      source: "unmeasured-boundary",
      reading: "unknown",
      seed,
      requestedSamples,
      samples: 0,
      rejectedProposals: 0,
      conformant: 0,
      obstructions: Object.freeze([]),
    }), "unmeasured program contract evidence");
  }

  const generated = inhabitants(operation.domain.schema, operation.domain.validate, requestedSamples, { seed });
  const obstructions = [...generated.obstructions];
  let conformant = 0;
  let behavioralFailure = false;
  for (const input of generated.values) {
    try {
      const output = evaluateRunTerm(operation.runTerm, input);
      if (operation.codomain.validate(output)) conformant += 1;
      else {
        behavioralFailure = true;
        obstructions.push(`codomain refused output: ${operation.codomain.errors(output).slice(0, 2).join("; ")}`);
      }
    } catch (error) {
      behavioralFailure = true;
      obstructions.push(`move failed on admitted input: ${error instanceof Error ? error.message.slice(0, 200) : String(error)}`);
    }
  }
  const reading = behavioralFailure ? "denied"
    : generated.values.length === 0 ? "unknown"
      : conformant === generated.values.length ? "held" : "denied";
  return programContractEvidenceContract.assert(Object.freeze({
    kind: "metroplat.program.contract.evidence",
    contract: contract.id,
    source: "behavioral-oracle",
    reading,
    seed,
    requestedSamples,
    samples: generated.values.length,
    rejectedProposals: generated.rejected,
    conformant,
    obstructions: Object.freeze(obstructions.slice(0, 8)),
  }), `program contract evidence for ${operation.verb}`);
}

/** Fold independently produced evidence through FOUR's knowledge join. */
export function readProgramContractStanding(
  operation,
  evidence = [measureProgramContract(operation)],
) {
  const contract = deriveProgramContract(operation);
  const relevant = evidence.filter((receipt) => receipt.contract === contract.id);
  let reading = "unknown";
  for (const receipt of relevant) {
    reading = readingAs("extremal", knowledgeJoinReading(
      (readingAs("knowledge", reading)),
      (readingAs("knowledge", receipt.reading)),
    ));
  }
  return Object.freeze({
    kind: "metroplat.program.contract.standing",
    contract,
    reading,
    price: relevant.reduce((sum, receipt) => sum + receipt.obstructions.length, 0),
    evidence: Object.freeze([...relevant]),
  });
}
