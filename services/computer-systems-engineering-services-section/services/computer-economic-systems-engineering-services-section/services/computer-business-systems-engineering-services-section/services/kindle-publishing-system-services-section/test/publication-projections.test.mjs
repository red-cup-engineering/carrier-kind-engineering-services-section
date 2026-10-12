import test from "node:test";
import assert from "node:assert/strict";
import { admitPublicationBundle, attachExternalIdentifier, projectOnix, projectOpdsEntry } from "../src/publication-projections.mjs";

const records = {
  work: { type: "Work", id: "harbor", title: "Harbor", contributors: [{ role: "A01", name: "561 Group" }], language: "eng" },
  edition: { type: "Edition", id: "harbor-edition-1", work: "harbor", description: "A fixture.", subjects: ["FIC027020"], publicationDate: "2026-09-29" },
  rendition: { type: "Rendition", id: "harbor-epub", edition: "harbor-edition-1", form: "EPUB", isbn: "9781234567897" },
  artifact: { type: "Artifact", id: "ni:///sha-256;fixture", rendition: "harbor-epub", href: "harbor.epub", mediaType: "application/epub+zip", sha256: "a".repeat(64), bytes: 10 },
  offer: { type: "Offer", id: "harbor-kdp", rendition: "harbor-epub", currency: "USD", price: 3.99, territories: "WORLD", availability: "20" },
};

test("ISBN stays on the marketed rendition and ONIX is a projection", () => {
  const bundle = admitPublicationBundle(records), onix = projectOnix(bundle, { accessibilityEvidence: { features: { navigation: ["toc"], mathml: true } } });
  assert.match(bundle.id, /^ni:\/\/\/sha-256;/u); assert.match(onix.xml, /<ProductIDType>15<\/ProductIDType>/u); assert.match(onix.xml, /<ProductFormFeatureValue>17<\/ProductFormFeatureValue>/u);
  const opds = projectOpdsEntry(bundle, { acquisitionUrl: "https://example.test/harbor" }); assert.equal(opds.links[0].properties.price.value, 3.99);
  assert.throws(() => admitPublicationBundle({ ...records, work: { ...records.work, isbn: records.rendition.isbn } }), /ISBN belongs/u);
});

test("retailer identifiers are separate post-submission records", () => {
  const initial = admitPublicationBundle(records);
  const bundle = attachExternalIdentifier(initial, { scheme: "ASIN", value: "B000000001", assignedAt: "2026-09-29T00:00:00Z", evidence: "ni:///sha-256;submission" });
  assert.equal(bundle.content.externalIdentifiers[0].scheme, "ASIN");
  assert.equal(bundle.content.externalIdentifiers[0].rendition, records.rendition.id);
  assert.equal(attachExternalIdentifier(bundle, bundle.content.externalIdentifiers).id, bundle.id);
});
