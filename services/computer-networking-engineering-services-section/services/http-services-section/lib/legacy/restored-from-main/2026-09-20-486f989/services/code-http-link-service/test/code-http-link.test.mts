import assert from "node:assert/strict";
import test from "node:test";
import { linkHeader, parseLinkHeader } from "../src/code-http-link.mjs";

test("parses and forms Link fields", () => {
  const wire = linkHeader([{ href: "/next", rel: "next" }]);
  assert.equal(parseLinkHeader(wire)[0]?.href, "/next");
  assert.equal(parseLinkHeader(wire)[0]?.params.rel, "next");
});

test("round-trips escaped quoted parameter data", () => {
  const wire = linkHeader([{ href: "/report", rel: "alternate", title: 'A "quoted" report' }]);
  assert.equal(parseLinkHeader(wire)[0]?.params.title, 'A "quoted" report');
});

test("refuses unsafe href and parameter field syntax", () => {
  assert.throws(() => linkHeader([{ href: "/bad\nvalue", rel: "next" }]), /field-safe/);
  assert.throws(() => linkHeader([{ href: "/ok", "bad name": "value" }]), /parameter name/);
});
