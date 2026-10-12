import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { grantAssertion } from "@red-cup-engineering/feltos/capability";
import { admitCapabilityAssertions } from "../src/integrations/filesystem/services/capability-assertions.mjs";
import { conurbationMcpApex, defaultMcpApex } from "../src/apps/infograph/mcp-surface.mjs";

const AT = "2026-07-14T12:00:00.000Z";
const NOW = "2026-07-14T12:00:01.000Z";

/** Inhabit `dataRoot` by admitting one grant into its own journal. A settlement
 *  is inhabited by what it has settled, so granting IS the deposit. */
function inhabit(dataRoot, holder) {
  mkdirSync(dataRoot, { recursive: true });
  admitCapabilityAssertions({
    dataRoot,
    rootName: `test:${path.basename(dataRoot)}`,
    date: AT.slice(0, 10),
    assertions: [grantAssertion("test:bootstrap", holder, "infograph#*", AT)],
  });
  return dataRoot;
}

function invocation(subject) {
  return { id: "test-invocation", subject, resource: "infograph" };
}

function decide(apex, subject, verb) {
  const operation = apex.catalog.byVerb.get(verb);
  assert.ok(operation !== undefined, `verb ${verb} is absent from the catalog`);
  return apex.authorize(invocation(subject), operation, NOW);
}

/** A conurbation of two settlements: the search root itself, inhabited and
 *  granting `claude`, alongside a constituent beneath it that has settled only
 *  a grant for someone else. */
function twoRootConurbation() {
  const search = mkdtempSync(path.join(tmpdir(), "metroplat-conurbation-"));
  inhabit(search, "claude");
  inhabit(path.join(search, "b"), "someone-else");
  return search;
}

test("a conurbation of two settlements assembles", () => {
  const search = twoRootConurbation();
  try {
    // Requalifying a verb without requalifying its address made the coproduct
    // non-disjoint: every constituent declares the same package's actions, so
    // every constituent addressed them at the same ref and the catalog refused
    // the second one with `duplicate declaration`.
    const apex = conurbationMcpApex(search);
    assert.ok(apex.catalog.byVerb.has("root:read"), "the search root's own read is mounted under its token");
    assert.ok(apex.catalog.byVerb.has("b:read"), "the constituent's read is mounted under its token");
    assert.equal(
      new Set(apex.operations.map((operation) => operation.ref)).size,
      apex.operations.length,
      "every mounted action is addressed distinctly",
    );
  } finally {
    rmSync(search, { recursive: true, force: true });
  }
});

test("a settlement authorizes its own verbs against its own admitted assertions", () => {
  const search = twoRootConurbation();
  try {
    const apex = conurbationMcpApex(search);
    const decision = decide(apex, "claude", "root:read");
    assert.equal(decision.ok, true, decision.reasons.join("; "));
    assert.equal(decision.charge, "held");
  } finally {
    rmSync(search, { recursive: true, force: true });
  }
});

test("a routed decision names the action the caller invoked", () => {
  const search = twoRootConurbation();
  try {
    // The constituent judges its OWN action, so an unrestated decision names the
    // constituent's address while `dispatch` is holding the qualified one —
    // which `dispatch` refuses ("authorization decision names a different
    // operation"). Authorizing correctly and dispatching are not the same test.
    const apex = conurbationMcpApex(search);
    for (const verb of ["root:read", "b:read"]) {
      const operation = apex.catalog.byVerb.get(verb);
      const decision = apex.authorize(invocation("claude"), operation, NOW);
      assert.equal(decision.operation, operation.ref, `${verb}: decision must name the invoked action`);
    }
  } finally {
    rmSync(search, { recursive: true, force: true });
  }
});

test("authority is not pooled across constituents (SAD §7.3)", () => {
  const search = twoRootConurbation();
  try {
    // `claude` holds infograph#* at the search root and nothing at `b`. A
    // conurbation is transport aggregation, not a merged managed element: it
    // creates no implicit causal edge between roots, so the grant admitted at
    // one settlement must confer nothing at the other.
    const apex = conurbationMcpApex(search);
    assert.equal(decide(apex, "claude", "root:read").ok, true, "holds where it was granted");

    const refused = decide(apex, "claude", "b:read");
    assert.equal(refused.ok, false, "a grant at one settlement must not reach another");
    assert.equal(refused.charge, "unknown");

    // ...and the neighbour is not simply inert: its own holder does hold it.
    assert.equal(decide(apex, "someone-else", "b:read").ok, true, "the constituent's own holder holds its verbs");
    assert.equal(decide(apex, "someone-else", "root:read").ok, false, "and holds nothing at its neighbour");
  } finally {
    rmSync(search, { recursive: true, force: true });
  }
});

test("a conurbation refuses a subject that holds nothing anywhere", () => {
  const search = twoRootConurbation();
  try {
    const apex = conurbationMcpApex(search);
    for (const verb of ["root:read", "b:read"]) {
      const decision = decide(apex, "anonymous", verb);
      assert.equal(decision.ok, false, `anonymous must not hold ${verb}`);
      assert.equal(decision.charge, "unknown");
    }
  } finally {
    rmSync(search, { recursive: true, force: true });
  }
});

test("one inhabited root is still its own apex, unqualified", () => {
  const search = mkdtempSync(path.join(tmpdir(), "metroplat-single-"));
  try {
    inhabit(search, "claude");
    // The short-circuit that hid both defects above: every session and every
    // test until now bound a root where the composition never happened.
    const apex = conurbationMcpApex(search);
    assert.ok(apex.catalog.byVerb.has("read"), "a lone settlement's verbs stay unqualified");
    assert.ok(!apex.catalog.byVerb.has("root:read"), "and are not qualified against themselves");
    assert.deepEqual(
      apex.operations.map((operation) => operation.verb).sort(),
      defaultMcpApex(search).operations.map((operation) => operation.verb).sort(),
    );
    assert.equal(decide(apex, "claude", "read").ok, true);
  } finally {
    rmSync(search, { recursive: true, force: true });
  }
});
