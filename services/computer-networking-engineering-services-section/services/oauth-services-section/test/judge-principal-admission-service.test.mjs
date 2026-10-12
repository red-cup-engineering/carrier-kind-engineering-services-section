import assert from "node:assert/strict";
import test from "node:test";

import { judgePrincipalAdmission, parseAllowedEmails, resolveAdmissionPolicy } from "../scripts/judge-principal-admission-service.mjs";

test("resolveAdmissionPolicy: an explicit admitEmail predicate wins over everything else", () => {
  const admit = resolveAdmissionPolicy({ admitEmail: (email) => email === "explicit@example.com", allowedEmail: "other@example.com" });
  assert.equal(admit("explicit@example.com"), true);
  assert.equal(admit("other@example.com"), false);
});

test("resolveAdmissionPolicy: falls back to a case-insensitive single allowedEmail", () => {
  const admit = resolveAdmissionPolicy({ allowedEmail: "Person@Example.com" });
  assert.equal(admit("person@example.com"), true);
  assert.equal(admit("PERSON@EXAMPLE.COM"), true);
  assert.equal(admit("someone-else@example.com"), false);
});

test("resolveAdmissionPolicy: admits everyone when neither is given (open multi-user policy)", () => {
  const admit = resolveAdmissionPolicy({});
  assert.equal(admit("anyone@example.com"), true);
});

test("resolveAdmissionPolicy: admitEmail wins over allowedEmails too", () => {
  const admit = resolveAdmissionPolicy({
    admitEmail: (email) => email === "explicit@example.com",
    allowedEmails: ["other@example.com"],
  });
  assert.equal(admit("explicit@example.com"), true);
  assert.equal(admit("other@example.com"), false);
});

test("resolveAdmissionPolicy: allowedEmails as an array admits only listed addresses, case-insensitively", () => {
  const admit = resolveAdmissionPolicy({ allowedEmails: ["Person@Example.com", "other@example.com"] });
  assert.equal(admit("person@example.com"), true);
  assert.equal(admit("PERSON@EXAMPLE.COM"), true);
  assert.equal(admit("other@example.com"), true);
  assert.equal(admit("someone-else@example.com"), false);
});

test("resolveAdmissionPolicy: allowedEmails as a comma-separated string, with whitespace, works the same", () => {
  const admit = resolveAdmissionPolicy({ allowedEmails: " Person@Example.com ,other@example.com,, " });
  assert.equal(admit("person@example.com"), true);
  assert.equal(admit("other@example.com"), true);
  assert.equal(admit("someone-else@example.com"), false);
});

test("resolveAdmissionPolicy: an empty allowedEmails array admits nobody", () => {
  const admit = resolveAdmissionPolicy({ allowedEmails: [] });
  assert.equal(admit("anyone@example.com"), false);
});

test("resolveAdmissionPolicy: an empty allowedEmails string admits nobody", () => {
  const admit = resolveAdmissionPolicy({ allowedEmails: "" });
  assert.equal(admit("anyone@example.com"), false);
  const admitCommasOnly = resolveAdmissionPolicy({ allowedEmails: " , , " });
  assert.equal(admitCommasOnly("anyone@example.com"), false);
});

test("resolveAdmissionPolicy: allowedEmails takes precedence over the legacy single allowedEmail", () => {
  const admit = resolveAdmissionPolicy({ allowedEmails: ["a@example.com"], allowedEmail: "b@example.com" });
  assert.equal(admit("a@example.com"), true);
  assert.equal(admit("b@example.com"), false);
});

test("parseAllowedEmails: normalizes, lowercases, and dedupes an array", () => {
  assert.deepEqual(parseAllowedEmails(["A@Example.com", "a@example.com", " b@example.com "]), ["a@example.com", "b@example.com"]);
});

test("parseAllowedEmails: normalizes a comma-separated string and drops empty entries", () => {
  assert.deepEqual(parseAllowedEmails("A@Example.com, ,b@example.com,"), ["a@example.com", "b@example.com"]);
});

test("parseAllowedEmails: an absent value normalizes to an empty list", () => {
  assert.deepEqual(parseAllowedEmails(undefined), []);
});

test("judgePrincipalAdmission: refuses an unverified email before consulting the policy", () => {
  const result = judgePrincipalAdmission({ email: "person@example.com", emailVerified: false }, () => true);
  assert.deepEqual(result, { admitted: false, reason: "email not verified" });
});

test("judgePrincipalAdmission: refuses a verified email the policy does not admit", () => {
  const result = judgePrincipalAdmission({ email: "person@example.com", emailVerified: true }, () => false);
  assert.deepEqual(result, { admitted: false, reason: "account not authorized" });
});

test("judgePrincipalAdmission: admits a verified email the policy admits", () => {
  const result = judgePrincipalAdmission({ email: "person@example.com", emailVerified: true }, () => true);
  assert.deepEqual(result, { admitted: true, email: "person@example.com" });
});
