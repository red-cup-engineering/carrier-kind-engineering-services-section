import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { conformProofPathAddressingLaw, FORMAL_FRONTIER, REQUIREMENT_IDS } from "../lib/law.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESIGN = join(ROOT, "content/designs/proof-path-addressing");
const read = (name) => readFileSync(join(DESIGN, name), "utf8");

const canonical = () => ({
  requirementsRml: read("requirements-baseline.rml"),
  architectureRml: read("software-architecture-specification.rml"),
  highLevelDesignRml: read("high-level-design.rml"),
  lowLevelDesignRml: read("low-level-design.rml"),
  verificationRml: read("verification-and-validation-specification.rml"),
  traceRml: read("traceability-matrix.rml"),
  formalFrontier: FORMAL_FRONTIER,
});

test("the complete specification chain allocates and traces every requirement", () => {
  const receipt = conformProofPathAddressingLaw(canonical());
  assert.deepEqual(Object.keys(receipt.allocations), [...REQUIREMENT_IDS]);
  for (const id of Object.values(receipt.ids)) assert.match(id, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
});

test("an unallocated requirement cannot fall out of the design chain", () => {
  const input = canonical();
  input.architectureRml = input.architectureRml.replace('"PPA-R009"', '');
  assert.throws(() => conformProofPathAddressingLaw(input), /PPA-R009 must be allocated exactly once/u);
});

test("the open formal frontier cannot be silently relabeled complete", () => {
  const input = canonical();
  input.formalFrontier = FORMAL_FRONTIER.slice(0, 4);
  assert.throws(() => conformProofPathAddressingLaw(input), /section formal frontier must be exactly/u);
});
