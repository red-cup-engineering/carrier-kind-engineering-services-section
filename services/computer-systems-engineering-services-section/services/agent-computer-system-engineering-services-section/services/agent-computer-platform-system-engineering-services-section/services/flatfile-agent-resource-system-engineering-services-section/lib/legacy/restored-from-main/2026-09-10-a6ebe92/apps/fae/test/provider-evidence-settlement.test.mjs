import assert from "node:assert/strict";
import test from "node:test";

import { FOUR } from "../src/kernel/four.mjs";
import { cellsAt, holds, value } from "../src/kernel/store.mjs";
import { composeProviders, queryDesignatedRelations, queryRelations, serializeComposition } from "../src/provider/compositor.mjs";
import { defineProvider } from "../src/provider/provider.mjs";
import {
  createProviderRelationWeb,
  evidenceProjection,
  observeProviderResource,
  relationKey,
  settledStoreProjection,
} from "../src/provider/relation-web.mjs";

const observedAt = "2026-08-30T00:00:00.000Z";
const claim = (object) => ({ subject: "urn:claim", predicate: "urn:has-reading", object });

function observe(web, provider, relation) {
  return observeProviderResource(web, {
    provider,
    resource: `urn:resource:${provider}`,
    focus: `urn:resource:${provider}`,
    observedAt,
    relations: [relation],
  });
}

test("Computer settlement gives provider relations the four golden readings", () => {
  const web = createProviderRelationWeb();
  observe(web, "urn:provider:true", { ...claim("true"), polarity: "for" });
  observe(web, "urn:provider:false", { ...claim("false"), polarity: "against" });
  observe(web, "urn:provider:top-for", { ...claim("top"), polarity: "positive" });
  observe(web, "urn:provider:top-against", { ...claim("top"), polarity: "negative" });

  const store = settledStoreProjection(web, { claims: [claim("bottom")] });
  assert.deepEqual(value(store, "urn:claim", "urn:has-reading", "bottom"), FOUR.neither);
  assert.deepEqual(value(store, "urn:claim", "urn:has-reading", "true"), FOUR.true);
  assert.deepEqual(value(store, "urn:claim", "urn:has-reading", "false"), FOUR.false);
  assert.deepEqual(value(store, "urn:claim", "urn:has-reading", "top"), FOUR.both);

  assert.deepEqual(store.sections.get("urn:claim"), {
    affirmed: [{ predicate: "urn:has-reading", object: "true" }],
    denied: [{ predicate: "urn:has-reading", object: "false" }],
    contradicted: [{ predicate: "urn:has-reading", object: "top" }],
  });
});

test("TOP is designated and stays visible in FAE graph queries", () => {
  const web = createProviderRelationWeb();
  observe(web, "urn:provider:for", { ...claim("top"), polarity: "for" });
  observe(web, "urn:provider:against", { ...claim("top"), polarity: "against" });
  const store = settledStoreProjection(web);

  assert.equal(holds(store, "urn:claim", "urn:has-reading", "top"), true);
  assert.deepEqual(cellsAt(store, "urn:claim"), [claim("top")]);
});

test("a duplicate DREW witness contributes one exact EAVT row", () => {
  const web = createProviderRelationWeb();
  const input = {
    provider: "urn:provider:one",
    resource: "urn:resource:one",
    focus: "urn:resource:one",
    observedAt,
    relations: [{ ...claim("true"), polarity: "for", evidence: { digest: "ni:one" } }],
  };
  assert.equal(observeProviderResource(web, input).duplicate, false);
  assert.equal(observeProviderResource(web, input).duplicate, true);

  const store = settledStoreProjection(web);
  assert.equal(web.query().length, 1);
  assert.equal(store.evidence.length, 1);
  assert.equal(store.rows.length, 1);
  assert.equal(store.sections.get("urn:claim").affirmed.length, 1);
});

test("settlement isolates each subject from unrelated evidence rows", () => {
  const targetOnly = createProviderRelationWeb();
  observe(targetOnly, "urn:provider:target", { ...claim("target"), polarity: "for" });

  const withUnrelated = createProviderRelationWeb();
  observe(withUnrelated, "urn:provider:target", { ...claim("target"), polarity: "for" });
  for (let index = 0; index < 100; index += 1) {
    observe(withUnrelated, `urn:provider:unrelated:${index}`, {
      subject: `urn:unrelated:${index}`,
      predicate: "urn:has-reading",
      object: index,
      polarity: index % 2 === 0 ? "for" : "against",
    });
  }

  const isolated = settledStoreProjection(targetOnly);
  const crowded = settledStoreProjection(withUnrelated);
  assert.deepEqual(crowded.sections.get("urn:claim"), isolated.sections.get("urn:claim"));
  assert.deepEqual(
    crowded.values.get(relationKey(claim("target"))),
    isolated.values.get(relationKey(claim("target"))),
  );
  assert.deepEqual(
    crowded.rows.filter(({ e }) => e === "urn:claim"),
    isolated.rows,
    "the public evidence trace keeps the target subject's original row order",
  );
});

test("provider validation preserves DREW polarity and evidence through settlement", async () => {
  const evidence = { witnessIdentifiers: ["ni:manifest"], sourceSpan: { line: 7 } };
  const composition = await composeProviders([defineProvider({
    id: "urn:provider:manifest",
    observe: async () => ({
      resources: [{
        resource: "urn:resource:manifest",
        focus: "urn:resource:manifest",
        observedAt,
        cells: [{ ...claim("false"), polarity: "against", evidence }],
      }],
    }),
  })]);

  const [occurrence] = composition.relationWeb.query(claim("false"));
  const [projection] = composition.store.evidence.filter(({ semanticIdentity }) =>
    semanticIdentity === relationKey(claim("false")));
  assert.equal(occurrence.polarity, "against");
  assert.deepEqual(occurrence.evidence, evidence);
  assert.deepEqual(projection.row.t.witness.evidence, evidence);
  assert.deepEqual(value(composition.store, "urn:claim", "urn:has-reading", "false"), FOUR.false);
  assert.equal(queryRelations(composition, claim("false")).length, 1, "negative occurrence remains observable");
  assert.deepEqual(queryDesignatedRelations(composition, claim("false")), [], "negative evidence is not a held edge");
  const serialized = serializeComposition(composition).cells.find((cell) =>
    cell.subject === "urn:claim" && cell.object === "false");
  assert.equal(serialized.reading, "F");
  assert.equal(serialized.designated, false);
});

test("EAVT row identity does not replace semantic, occurrence, or custody identity", () => {
  const web = createProviderRelationWeb();
  observe(web, "urn:provider:identity", { ...claim("true"), polarity: "for" });
  const [projection] = evidenceProjection(web);

  assert.equal(projection.semanticIdentity, relationKey(claim("true")));
  assert.match(projection.occurrenceIdentity, /^urn:drew:observation:sha256:.+#relation=0$/u);
  assert.deepEqual(projection.custody, {
    provider: "urn:provider:identity",
    resource: "urn:resource:urn:provider:identity",
  });
  assert.match(projection.rowId, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  assert.notEqual(projection.rowId, projection.semanticIdentity);
  assert.notEqual(projection.rowId, projection.occurrenceIdentity);
  assert.notEqual(projection.rowId, projection.custody.resource);
});

test("provider evidence retains two independent scientific evidence identifiers", async () => {
  const { foldIndependentEvidence } = await import("@lenticule-science/articulating/predicating");
  const { rowId } = await import("@red-cup-engineering/eavt");
  const web = createProviderRelationWeb();
  observe(web, "urn:provider:positive", { ...claim("held"), polarity: "for" });
  observe(web, "urn:provider:negative", { ...claim("held"), polarity: "against" });
  const projected = evidenceProjection(web);
  const folded = foldIndependentEvidence("urn:claim", [claim("held")], projected.map(({ row }) => row));
  assert.equal(folded.fiber[0].value.evidence.flat().length, 2);
  assert.ok(folded.fiber[0].value.evidence.flat().every((id) => /^[a-f0-9]{64}$/u.test(id)));
  for (const entry of projected) {
    assert.equal(entry.rowId, rowId(entry.row));
    assert.deepEqual(entry.row.t.witness.custody, entry.custody);
    assert.equal(entry.row.t.witness.occurrence, entry.occurrenceIdentity);
  }
  assert.equal(web.events()[0].source.observedAt, observedAt);
});
