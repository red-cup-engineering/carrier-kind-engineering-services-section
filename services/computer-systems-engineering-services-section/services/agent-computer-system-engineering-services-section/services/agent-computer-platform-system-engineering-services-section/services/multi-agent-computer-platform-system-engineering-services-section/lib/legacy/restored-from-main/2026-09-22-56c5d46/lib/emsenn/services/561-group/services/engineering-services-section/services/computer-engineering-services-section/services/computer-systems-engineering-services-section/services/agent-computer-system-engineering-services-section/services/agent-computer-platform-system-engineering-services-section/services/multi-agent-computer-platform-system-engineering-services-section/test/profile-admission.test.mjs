import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  validateShpDocumentBytes,
  validateShpProfile,
} from "@red-cup-engineering/html-structural-projection-service/shp-profile";
import { assertValid, checkEvidence, checkSection, createProfileAssertion, hasString, push } from "../hacking/src/profile-admission.mjs";

const shpProfile = JSON.parse(await readFile(new URL("../examples/shp-profile.json", import.meta.url), "utf8"));

test("profile primitives preserve non-empty string and validation-error contracts", () => {
  assert.equal(hasString({ value: "present" }, "value"), true);
  assert.equal(hasString({ value: "" }, "value"), false);
  assert.equal(hasString(null, "value"), false);

  const errors = [];
  push(errors, "PROFILE-001", "profile", "must be declared");
  assert.deepEqual(errors, [{ code: "PROFILE-001", path: "profile", message: "must be declared" }]);
});

test("assertValid preserves the validator's value and diagnostic error", () => {
  const profile = { profileId: "spotcomp" };
  assert.equal(assertValid(profile, () => []), profile);
  assert.throws(
    () => assertValid(profile, () => [{ code: "PROFILE-001", path: "profile", message: "must be declared" }]),
    { name: "TypeError", message: "PROFILE-001 profile: must be declared" },
  );
});

test("createProfileAssertion preserves the named profile assertion contract", () => {
  const profile = { profileId: "spotcomp" };
  const assertProfile = createProfileAssertion(() => []);
  assert.equal(assertProfile(profile), profile);
});

test("checkEvidence admits non-empty string citations only", () => {
  const errors = [];
  checkEvidence(errors, ["RFC 9458"], "profile", "PROFILE-001");
  assert.deepEqual(errors, []);
  checkEvidence(errors, [], "profile", "PROFILE-001");
  assert.deepEqual(errors, [{ code: "PROFILE-001", path: "profile", message: "must cite evidence" }]);
});

test("checkSection preserves missing, boolean, and evidence diagnostics", () => {
  const missing = [];
  checkSection(missing, {}, "system", ["declared"], "SYSTEM");
  assert.deepEqual(missing, [{ code: "SYSTEM-001", path: "system", message: "system must be declared" }]);

  const invalid = [];
  checkSection(invalid, { system: { declared: false, evidence: [] } }, "system", ["declared"], "SYSTEM");
  assert.deepEqual(invalid, [
    { code: "SYSTEM-002", path: "system.declared", message: "declared must be true" },
    { code: "SYSTEM-003", path: "system", message: "must cite evidence" },
  ]);
});

test("Spotcomp's SHP profile uses the shared structural projection validator", () => {
  assert.deepEqual(validateShpProfile(shpProfile), []);
});

test("Spotcomp refuses adversarial SHP document bytes through the shared validator", () => {
  const valid = '<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"></head><body class="packet" data-e="subject"></body></html>';
  const cases = [
    [valid.replace("<!DOCTYPE html>", "<html>"), "SHP-DOC-002"],
    [valid.replace('lang="en"', 'lang="fr"'), "SHP-DOC-003"],
    [valid.replace('charset="utf-8"', 'charset="utf-16"'), "SHP-DOC-004"],
    [valid.replace("</body>", "<script>run()</script></body>"), "SHP-DOC-005"],
    [valid.replace("</head>", '<link href="https://example.test/style.css"></head>'), "SHP-DOC-006"],
    [valid.replace('class="packet" ', ""), "SHP-DOC-007"],
    [valid.replace(' data-e="subject"', ""), "SHP-DOC-008"],
    [valid.replace("\n", "\r\n"), "SHP-DOC-009"],
  ];
  assert.deepEqual(validateShpDocumentBytes(valid), []);
  for (const [html, code] of cases) {
    assert.ok(validateShpDocumentBytes(html).some((violation) => violation.code === code), code);
  }
});
