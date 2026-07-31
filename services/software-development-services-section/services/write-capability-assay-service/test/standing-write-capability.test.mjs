import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { assayStandingWriteCapability } from "../src/assay-write-capability.mjs";
function canonical(value) { if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`; if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`; return JSON.stringify(value); }
const digest = (value) => `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
const dispatch = { id: "dispatch-one", task: "task-one", office: "developer" };
const office = { id: "developer", kind: "office" };
const authorization = { authorityRoot: "/territory", targetSettlementRoot: "/territory/target", dispatch: dispatch.id, task: dispatch.task, office: office.id, dispatchDigest: digest(dispatch), writeRoots: ["/territory/target/src"] };
const scope = (subject, authorityRoot = "/territory/target") => ({ authorityRoot, subject, inside: true, boundaries: [], deepestOwner: null, snapshot: { components: [], markers: [] } });
const material = { invocationAgent: "developer", authorization, targetScope: scope("/territory/target", "/territory"), rootScopes: [scope("/territory/target/src")], dispatch, office };
test("assays finite material without filesystem authority", () => { const result = assayStandingWriteCapability(material); assert.equal(result.dispatchDigest, authorization.dispatchDigest); assert.equal(result.office, "developer"); });
test("refuses scope and dispatch drift", () => { assert.throws(() => assayStandingWriteCapability({ ...material, targetScope: { ...material.targetScope, boundaries: ["/territory/target/foreign"] } }), /boundary/u); assert.throws(() => assayStandingWriteCapability({ ...material, dispatch: { ...dispatch, office: "other" } }), /dispatch/u); });
