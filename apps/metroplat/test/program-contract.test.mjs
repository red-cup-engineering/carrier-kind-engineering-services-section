import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { operation, operationIrAudit, schemasOfOperations } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import {
  deriveProgramContract,
  measureProgramContract,
  readProgramContractStanding,
} from "@red-cup-engineering/computer-system-engine/rpc/contract";
import {
  admitProgramContractEvidence,
  readProgramContractEvidence,
} from "@red-cup-engineering/computer-system-engine/rpc/contract-evidence";
import { programMcpToolsWithEndpoints, programOpenApi } from "@red-cup-engineering/metroplat/presentation/program-surface";
import { projectLsp } from "@red-cup-engineering/metroplat/lsp/bind";
import { readSchemaConformance } from "@red-cup-engineering/computer-code-development-engine/monitoring/schema-conformance/service";

const integer = schemaFrom({ $id: "metroplat/test/program-contract/integer", type: "integer" });

test("operation audit preserves explicit projection roles on host-read boundaries", () => {
  const projection = operation({
    verb: "test-host-projection",
    relation: "projection",
    codomain: integer,
    run: () => 1,
  });
  assert.deepEqual(operationIrAudit([projection]), [{
    kind: "metroplat.action.ir-audit",
    verb: "test-host-projection",
    relation: "projection",
    hasRunTerm: false,
    codomain: integer.id,
    reason: "package projection",
  }]);
});

test("program contracts derive from generators and settle admitted contradictory evidence", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-program-contract-"));
  try {
    const identity = operation({
      verb: "test-derived-contract-identity",
      inputFormat: "json",
      outputFormat: "json",
      domain: integer,
      codomain: integer,
      runTerm: tm.lam(tm.var(0)),
    });
    const contract = deriveProgramContract(identity);
    assert.equal(contract.precondition.id, integer.id);
    assert.equal(contract.postcondition.id, integer.id);
    assert.equal(contract.move.kind, "sen-term");
    assert.equal(contract.coordination.mode, "coordination-free");
    assert.ok(contract.laws.every((law) => law.kind === "metroplat.lean.formalization-claim"));

    const held = measureProgramContract(identity, { samples: 3, seed: 11 });
    assert.equal(held.reading, "held");
    assert.equal(held.conformant, held.samples);
    admitProgramContractEvidence(root, held, "2026-07-11T00:00:00.000Z");

    const denied = Object.freeze({
      ...held,
      reading: "denied",
      conformant: 0,
      obstructions: Object.freeze(["independent counterexample"]),
    });
    admitProgramContractEvidence(root, denied, "2026-07-11T00:01:00.000Z");

    const evidence = readProgramContractEvidence(root);
    assert.equal(evidence.length, 2);
    const standing = readProgramContractStanding(identity, evidence);
    assert.equal(standing.contract.id, contract.id);
    assert.equal(standing.reading, "contested");
    assert.equal(standing.price, 1);

    const endpoint = Object.freeze({
      name: identity.verb,
      href: `/${identity.verb}`,
      method: "POST",
      input: "application/json",
      output: "application/json",
      domainSchema: { $ref: integer.id },
      codomainSchema: { $ref: integer.id },
      contract: standing,
      settlement: contract.settlement,
    });
    const induced = {
      operations: [identity],
      discovery: { package: "@emsenn/contract-test", programs: [endpoint] },
    };
    const openApiOperation = programOpenApi(induced).paths[`/${identity.verb}`].post;
    assert.equal(openApiOperation["x-metroplat-program-contract"].standing, "contested");
    assert.equal(openApiOperation["x-metroplat-program-packet"].contract, contract.id);
    assert.deepEqual(schemasOfOperations([identity]).map((schema) => schema.id), [integer.id]);
    assert.deepEqual(Object.keys(programOpenApi(induced).components.schemas), [integer.id]);

    const [mcpTool] = programMcpToolsWithEndpoints([identity], [endpoint], induced.discovery.package);
    assert.equal(mcpTool["x-metroplat-program-contract"].id, contract.id);

    const lsp = projectLsp({ operations: [identity], endpoints: [endpoint] });
    const actionDocument = lsp.documents.find((document) => document.kind === "action" && document.id === identity.verb);
    assert.equal(JSON.parse(actionDocument.text).endpoint.contract.reading, "contested");
    assert.deepEqual(lsp.documents.filter((document) => document.kind === "schema").map((document) => document.id), [integer.id]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("schema conformance reports only contracts with explicit runtime evidence sources", async () => {
  const readout = await readSchemaConformance(".", "2026-07-12");
  assert.equal(readout.monitoredSchemas, 2);
  assert.deepEqual(readout.verdicts.map((verdict) => verdict.schemaId), [
    "metroplat/executing/claim-session-observation",
    "metroplat/executing/glued-claim-sessions",
  ]);
  assert.ok(readout.evidence.includes("monitored:2"));
  assert.equal("stateArtifacts" in readout, false);
  assert.equal("ambiguousKinds" in readout, false);
});
