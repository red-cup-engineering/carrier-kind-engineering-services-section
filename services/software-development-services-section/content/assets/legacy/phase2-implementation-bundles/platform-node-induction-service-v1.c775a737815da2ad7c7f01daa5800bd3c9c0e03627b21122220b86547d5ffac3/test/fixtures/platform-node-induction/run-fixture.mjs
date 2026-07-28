import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { amend, attest, improve, operate, refuse, rollback, transact } from "./settlement.mjs";

const root = mkdtempSync(join(tmpdir(), "pni-absent-root-fixture-"));
writeFileSync(join(root, "fixture-state.json"), JSON.stringify({ version: 1, amendments: [] }));
const initial = operate(root);
const refusal = refuse({ effect: "foreign-write" });
const transaction = transact();
const attestation = attest(root);
const amendment = amend(root, { id: "fixture-amendment" });
const improvement = improve(root);
const restored = rollback(root, initial);
process.stdout.write(JSON.stringify({
  type: "AbsentRootFutureHandoverFixtureResult",
  rootRuntimeImported: false,
  leaderPresent: false,
  capabilities: ["operate", "refuse", "transact", "attest", "amend", "improve", "rollback"],
  evidence: { initial, refusal, transaction, attestation, amendment, improvement, restored },
  evidenceOnly: true,
  externalCustomerOutcomeClaimed: false,
  independentCertificationClaimed: false
}));
