import assert from "node:assert/strict";
import test from "node:test";

import {
  agentWorkloadIdentityBinding,
  parseSpiffeId,
} from "../../src/cells/workload-identity.mjs";

test("parse canonical SPIFFE workload identity", () => {
  const id = parseSpiffeId("spiffe://prod.example.com/ns/staging/sa/default");
  assert.equal(id.trustDomain, "prod.example.com");
  assert.equal(id.path, "/ns/staging/sa/default");
  assert.equal(id.value, "spiffe://prod.example.com/ns/staging/sa/default");
});

test("trust domain identity remains separate across independently rooted domains", () => {
  const left = parseSpiffeId("spiffe://ant-a.561.group/agent/worker");
  const right = parseSpiffeId("spiffe://ant-b.561.group/agent/worker");

  assert.notEqual(left.trustDomain, right.trustDomain);
  assert.equal(left.path, right.path);
  assert.notEqual(left.value, right.value);
});

test("reject noncanonical or forbidden SPIFFE ID forms", () => {
  for (const value of [
    "SPIFFE://prod.example.com/workload",
    "spiffe://Prod.Example.com/workload",
    "spiffe://prod.example.com/",
    "spiffe://prod.example.com/a/",
    "spiffe://prod.example.com/a//b",
    "spiffe://prod.example.com/a/../b",
    "spiffe://prod.example.com/a/%2E%2E/b",
    "spiffe://user@prod.example.com/workload",
    "spiffe://prod.example.com:8443/workload",
    "spiffe://prod.example.com/workload?role=admin",
    "spiffe://prod.example.com/workload#admin",
  ]) {
    assert.throws(() => parseSpiffeId(value), /SPIFFE ID/u, value);
  }
});

test("identifier alone carries zero organizational authority", () => {
  const binding = agentWorkloadIdentityBinding({
    spiffeId: "spiffe://prod.example.com/agent/receiver",
    evidence: ["transport:peer"],
  });

  assert.equal(binding.authentication, "identifier-only");
  assert.equal(binding.verificationRef, undefined);
  assert.equal(binding.representedPrincipalAuthority, "none");
  assert.equal(binding.officeAuthority, "none");
  assert.equal(binding.custodyAuthority, "none");
  assert.equal(binding.effectAuthority, "none");
  assert.equal("representedPrincipal" in binding, false);
  assert.equal("office" in binding, false);
});

test("external SVID verification reference still does not grant local office/effect authority", () => {
  const binding = agentWorkloadIdentityBinding({
    spiffeId: "spiffe://prod.example.com/agent/receiver",
    verificationRef: "receipt:spiffe-svid-verification:1",
    evidence: ["tls:peer"],
  });

  assert.equal(binding.authentication, "verification-referenced");
  assert.equal(binding.verificationRef, "receipt:spiffe-svid-verification:1");
  assert.equal(binding.representedPrincipalAuthority, "none");
  assert.equal(binding.officeAuthority, "none");
  assert.equal(binding.custodyAuthority, "none");
  assert.equal(binding.effectAuthority, "none");
});

test("oversized SPIFFE IDs are refused at the interoperability boundary", () => {
  const huge = "spiffe://example.com/" + "a".repeat(2048);
  assert.throws(() => parseSpiffeId(huge), /2048-byte interoperability bound/u);
});
