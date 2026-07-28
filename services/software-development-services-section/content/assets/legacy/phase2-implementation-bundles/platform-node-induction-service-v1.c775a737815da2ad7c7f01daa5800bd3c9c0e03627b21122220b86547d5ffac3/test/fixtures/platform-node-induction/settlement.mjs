import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const hash = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const path = (root) => join(root, "fixture-state.json");
export function operate(root) { return JSON.parse(readFileSync(path(root), "utf8")); }
export function refuse(request) { return request?.effect === "foreign-write" ? { refused: true, reason: "foreign-write-refused" } : { refused: false }; }
export function transact() { return { type: "FixtureTransaction", amount: 1, currency: "USD", testOnly: true, externalSettlement: false }; }
export function attest(root) { const state = operate(root); return { type: "FixtureAttestation", digest: hash(state) }; }
export function amend(root, amendment) { const prior = operate(root); const next = { ...prior, amendments: [...prior.amendments, amendment] }; writeFileSync(path(root), JSON.stringify(next)); return { prior, next }; }
export function improve(root) { const prior = operate(root); const next = { ...prior, version: prior.version + 1, improved: true }; writeFileSync(path(root), JSON.stringify(next)); return { prior, next }; }
export function rollback(root, prior) { writeFileSync(path(root), JSON.stringify(prior)); return operate(root); }
