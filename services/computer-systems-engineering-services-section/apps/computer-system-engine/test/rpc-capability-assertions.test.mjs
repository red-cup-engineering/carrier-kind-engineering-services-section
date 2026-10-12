import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { grantAssertion, revokeAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { each, extend } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { recordFile } from "@red-cup-engineering/semiotic-eavt-services-section/layout";
import { admitCapabilityAssertions, capabilityAssertionFeed, readCapabilityAssertions } from "../src/rpc/capability-assertions.mjs";
import { authorizationFromCapabilityAssertions, authorizationFromStanding, dispatch } from "../src/rpc/dispatch.mjs";
import { invocation } from "../src/rpc/invocation.mjs";
import { createOperationCatalog, operation } from "../src/rpc/operation.mjs";

const AT = "2026-09-04T12:00:00.000Z";

function fixture() {
  return mkdtempSync(path.join(tmpdir(), "capability-assertions-"));
}

/** Actual addressed capability records in the current store. */
function assertionRecordFiles(dataRoot) {
  return [...each(dataRoot, capabilityAssertionFeed, { strict: true })]
    .map(({ address }) => recordFile(dataRoot, capabilityAssertionFeed, address));
}

function admitInAnotherProcess(dataRoot, assertion) {
  const source = `import { admitCapabilityAssertions } from './src/rpc/capability-assertions.mjs';\n`
    + `admitCapabilityAssertions(${JSON.stringify({ dataRoot, date: AT.slice(0, 10), assertions: [assertion] })});`;
  execFileSync(process.execPath, [...process.execArgv.filter((flag) => !flag.startsWith("--test")), "--input-type=module", "--eval", source], {
    cwd: new URL("..", import.meta.url),
    stdio: "pipe",
  });
}

function rpcWitness() {
  let count = 0;
  return Object.freeze({
    causalHead: () => Object.freeze([]),
    admit(evidence) {
      count += 1;
      return Object.freeze({
        kind: "metroplat.rpc.evidence-receipt",
        id: `test-evidence:${count}`,
        evidence: evidence.kind,
        eventIds: Object.freeze([`test-event:${count}`]),
      });
    },
  });
}

function rpcInvocation(action, subject) {
  return invocation({
    request: `request:${subject}`,
    subject,
    operation: action.ref,
    verb: action.verb,
    resource: "infograph",
    input: null,
    caller: { transport: "test" },
    observedAt: AT,
  });
}

test("readCapabilityAssertions refreshes the dedicated feed for every authorization decision", () => {
  const dataRoot = fixture();
  try {
    const first = readCapabilityAssertions(dataRoot);
    const second = readCapabilityAssertions(dataRoot);
    assert.notEqual(first, second, "authorization must not retain an unbounded process-local standing cache");
    assert.deepEqual(first, second);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("a capability assertion admitted in this process takes effect on the very next read", () => {
  const dataRoot = fixture();
  try {
    assert.deepEqual(readCapabilityAssertions(dataRoot), [], "priming the cache before the grant must not hide the grant afterward");

    admitCapabilityAssertions({
      dataRoot,
      date: AT.slice(0, 10),
      assertions: [grantAssertion("test", "urn:test:holder", "infograph#orientation", AT)],
    });

    const settled = readCapabilityAssertions(dataRoot);
    assert.equal(settled.length, 1);
    assert.equal(settled[0].holder, "urn:test:holder");
    assert.equal(settled[0].grants, "infograph#orientation");

    assert.deepEqual(readCapabilityAssertions(dataRoot), settled);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("an external revocation is visible to a process that previously read the grant", () => {
  const dataRootA = fixture();
  const dataRootB = fixture();
  try {
    const grant = grantAssertion("test", "urn:test:holder", "infograph#orientation", AT);
    admitCapabilityAssertions({
      dataRoot: dataRootA,
      date: AT.slice(0, 10),
      assertions: [grant],
    });
    assert.equal(readCapabilityAssertions(dataRootA).length, 1);
    admitInAnotherProcess(dataRootA, revokeAssertion("test", "urn:test:holder", "infograph#orientation", "2026-09-05T12:00:00.000Z"));
    assert.equal(readCapabilityAssertions(dataRootA).length, 2);
    assert.deepEqual(readCapabilityAssertions(dataRootB), []);
  } finally {
    rmSync(dataRootA, { recursive: true, force: true });
    rmSync(dataRootB, { recursive: true, force: true });
  }
});

test("a real RPC authorization denies an externally revoked subject while an independent group stays held", async () => {
  const dataRoot = fixture();
  try {
    let runs = 0;
    const action = operation({ verb: "orientation", run: () => { runs += 1; return null; } });
    const authorize = authorizationFromCapabilityAssertions(
      authorizationFromStanding(new Map([[action.ref, "held"]])),
      () => readCapabilityAssertions(dataRoot),
    );
    admitCapabilityAssertions({
      dataRoot,
      date: AT.slice(0, 10),
      assertions: [
        grantAssertion("issuer:test", "actor:fixture", "infograph#orientation", AT),
        grantAssertion("issuer:test", "group:independent", "infograph#orientation", AT),
      ],
    });
    const allowed = await dispatch({ catalog: createOperationCatalog([action]), witness: rpcWitness(), authorize, now: () => AT }, rpcInvocation(action, "actor:fixture"));
    assert.equal(allowed.ok, true);
    assert.equal(runs, 1);

    admitInAnotherProcess(dataRoot, revokeAssertion("issuer:test", "actor:fixture", "infograph#orientation", "2026-09-05T12:00:00.000Z"));
    const denied = await dispatch({ catalog: createOperationCatalog([action]), witness: rpcWitness(), authorize, now: () => AT }, rpcInvocation(action, "actor:fixture"));
    assert.equal(denied.ok, false);
    assert.equal(denied.phase, "authorization");
    assert.equal(denied.decision.reading, "contested");
    const independent = await dispatch({ catalog: createOperationCatalog([action]), witness: rpcWitness(), authorize, now: () => AT }, rpcInvocation(action, "group:independent"));
    assert.equal(independent.ok, true);
    assert.equal(runs, 2);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("the reader follows later admitted records and fails closed on malformed named-thread rows", () => {
  const dataRoot = fixture();
  try {
    admitCapabilityAssertions({
      dataRoot,
      date: "2026-09-04",
      assertions: [grantAssertion("test", "urn:test:holder", "infograph#orientation", AT)],
    });
    admitCapabilityAssertions({
      dataRoot,
      date: "2026-09-05",
      assertions: [revokeAssertion("test", "urn:test:holder", "infograph#orientation", "2026-09-05T12:00:00.000Z")],
    });
    assert.equal(readCapabilityAssertions(dataRoot).length, 2);
    extend(dataRoot, capabilityAssertionFeed, capabilityAssertionFeed, {
      e: "urn:test:bad-row", a: { kind: "capability.assertion" }, v: { kind: "not-capability-assertion" }, t: "2026-09-06T12:00:00.000Z",
    });
    assert.deepEqual(readCapabilityAssertions(dataRoot), [], "a malformed asserted feed must deny every standing rather than ignore a possible revocation");
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("an overwritten capability record denies standing instead of reading as empty", () => {
  const dataRoot = fixture();
  try {
    admitCapabilityAssertions({ dataRoot, date: AT.slice(0, 10), assertions: [grantAssertion("test", "urn:test:holder", "infograph#orientation", AT)] });
    const [segment] = assertionRecordFiles(dataRoot);
    assert.notEqual(segment, undefined);
    writeFileSync(segment, "{not valid JSON", "utf8");
    assert.deepEqual(readCapabilityAssertions(dataRoot), []);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("a deleted revocation record denies standing instead of reviving its preceding grant", () => {
  const dataRoot = fixture();
  try {
    admitCapabilityAssertions({ dataRoot, date: AT.slice(0, 10), assertions: [grantAssertion("test", "urn:test:holder", "infograph#orientation", AT)] });
    const beforeRevocation = new Set(assertionRecordFiles(dataRoot));
    admitCapabilityAssertions({
      dataRoot,
      date: "2026-09-05",
      assertions: [revokeAssertion("test", "urn:test:holder", "infograph#orientation", "2026-09-05T12:00:00.000Z")],
    });
    const revocationSegment = assertionRecordFiles(dataRoot).find((filePath) => !beforeRevocation.has(filePath));
    assert.notEqual(revocationSegment, undefined);
    rmSync(revocationSegment);
    assert.deepEqual(readCapabilityAssertions(dataRoot), []);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("unrelated record types do not enter the authorization read", () => {
  const dataRoot = fixture();
  try {
    admitCapabilityAssertions({ dataRoot, date: AT.slice(0, 10), assertions: [grantAssertion("test", "urn:test:holder", "infograph#orientation", AT)] });
    for (let index = 0; index < 512; index += 1) extend(dataRoot, "unrelated-audit-feed", "unrelated-audit-feed", {
      e: `urn:test:unrelated:${index}`, a: { kind: "unrelated" }, v: { index }, t: AT,
    });
    assert.equal(readCapabilityAssertions(dataRoot).length, 1);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});
