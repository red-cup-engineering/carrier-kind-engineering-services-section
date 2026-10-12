#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { parseArgs } from "node:util";
import { resolve, sep } from "node:path";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";

import { bindingSpecifier, defaultArguments, resolveBinding } from "../../../src/compute-binding.mjs";

import { deriveCapabilityOutbox } from "../../../src/capability-outbox.mjs";
import { declareCatalog } from "../../../src/offer.mjs";
import source from "../../../data/market-561-group/records/catalog.json" with { type: "json" };

const repositoryRoot = import.meta.filename.split("/lib/emsenn/services/")[0];
const servicesRoot = "lib/emsenn/services/561-group/services";
// The rails market-561-group's deployment settles on (marketEnvironment's default network and its
// Circle-issued USDC), which the capability Offers quote their price in.
const MARKET_RAILS = Object.freeze({ network: "eip155:8453", asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" });

/** Resolve publication selectors from the authoritative book offer and accepted edition. */
export async function catalogDeclarations({ records = source, read = path => readFileText(resolve(repositoryRoot, path)) } = {}) {
  const loaded = new Map();
  async function record(path) {
    const absolute = resolve(repositoryRoot, path);
    if (!absolute.startsWith(`${repositoryRoot}${sep}`)) throw new TypeError("publication evidence must be inside the repository");
    if (!loaded.has(path)) loaded.set(path, Promise.resolve(read(path)).then(text => JSON.parse(text)));
    return loaded.get(path);
  }
  return Promise.all(records.map(async declaration => {
    if (declaration.seller) {
      const reference = declaration.seller.record;
      const absolute = resolve(repositoryRoot, reference.path);
      if (!absolute.startsWith(`${repositoryRoot}${sep}`)) throw new TypeError("seller evidence must be inside the repository");
      const bytes = await read(reference.path), seller = JSON.parse(bytes);
      const seat = reference.path.split("/lib/agency/enterprises/")[0];
      if (createHash("sha256").update(bytes).digest("hex") !== reference.sha256 || seller.id !== declaration.seller.enterprise ||
          seller.entity !== declaration.seller.entity || !(declaration.section === seat || declaration.section.startsWith(`${seat}/`))) {
        throw new TypeError(`${declaration.name}: seller record digest, identity, entity and production scope must match the declared enterprise`);
      }
    }
    if (!declaration.publication) return declaration;
    const { publication: reference, ...operationDeclaration } = declaration;
    const catalog = await record(reference.catalog);
    const rows = (catalog.offerings ?? []).filter(row => row.id === reference.id);
    if (rows.length !== 1) throw new TypeError(`${reference.id}: publication selector must name exactly one catalog book`);
    const row = rows[0];
    if (!row.release || !row.book?.acceptance || row.currency !== "usd" || !Number.isInteger(row.priceCents) || row.priceCents <= 0) throw new TypeError(`${row.id}: publication requires a release, accepted edition and USD price`);
    const manifest = await record(`${servicesRoot}/${row.book.manuscript}/ebook.json`);
    const acceptance = await record(`${servicesRoot}/${row.book.acceptance}`);
    if (acceptance.type !== "EbookEditionAcceptance" || acceptance.status !== "accepted" || !/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(acceptance.editionInputDigest ?? "")) throw new TypeError(`${row.id}: publication names no accepted edition`);
    const hex = value => {
      if (!/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u.test(value ?? "")) throw new TypeError(`${row.id}: acceptance artifact has no content address`);
      return Buffer.from(value.slice("ni:///sha-256;".length), "base64url").toString("hex");
    };
    const publication = { release: acceptance.editionInputDigest, artifacts: { epub: hex(acceptance.artifacts?.epub?.sha256), screenPdf: hex(acceptance.artifacts?.screenPdf?.sha256) }, available: row.status === "live" };
    const binding = name => ({ package: "@red-cup-engineering/digital-goods-storefront-services-section", subpath: "./paid-release", export: name, args: ["offer.operation", "env", "offer.compute.configuration"], configuration: publication });
    return { ...operationDeclaration, name: row.title ?? manifest.title, operation: row.release, price: `$${(row.priceCents / 100).toFixed(2)}`, listed: publication.available,
      output: { schema: { type: "string", description: "A ZIP binary containing the accepted EPUB and PDF edition." }, example: `${row.release}.zip` },
      framings: [{ key: "default", title: row.title ?? manifest.title, description: (manifest.description ?? manifest.title).slice(0, 500), tags: (manifest.keywords ?? ["ebook"]).filter(tag => /^[\x20-\x7e]{1,32}$/u.test(tag)).slice(0, 5), serviceName: row.id.slice(0, 32) }],
      resources: [`one immutable EPUB-and-PDF bundle of accepted edition ${publication.release}`],
      compute: binding("readPaidRelease"), validate: binding("admitPaidRelease") };
  }));
}

/**
 * An offer is sold with a request example a buyer can send as written, so the
 * offer's own validate binding must admit that example; an offer whose example
 * its own admission refuses is one no buyer completes. A validation that reads
 * the deployment's environment, a path parameter or the offer itself is
 * admitted where those exist, not here.
 */
export async function admitOfferExamples(declarations, { load } = {}) {
  const refused = [];
  for (const declaration of declarations) {
    if (!declaration.validate) continue;
    const paths = declaration.validate.args ?? defaultArguments(declaration);
    if (paths.some((path) => /^(env|params|offer)\b/u.test(path))) continue;
    try {
      await resolveBinding(declaration.validate, declaration, load ? { load } : {})({ body: declaration.bodyExample, query: declaration.queryExample ?? {} });
    } catch (error) {
      refused.push(`${declaration.method} ${declaration.route}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (refused.length > 0) throw new TypeError(`offer examples refused by their own validation:\n${refused.join("\n")}`);
}

/**
 * Compile the edge module map from the one market declaration. A fetch-handler
 * bundle resolves no specifier at runtime, so it needs static imports for the
 * bindings it can serve. It also compiles every offer's content identities
 * (sku, cell, law) and Bazaar discovery extension from the admitted
 * declaration, because hashing and schema inference cost more CPU than an
 * edge request is allowed; the market's tests check the compiled offers
 * against freshly derived ones.
 * Usage: compile-catalog
 */
await runMain(async () => {
  const { values } = parseArgs({ options: { "previous-catalog": { type: "string" } } });
  const previous = await import("../src/compiled-offers.mjs");
  const candidates = [...(previous.HISTORICAL_DECLARATIONS ?? [])];
  if (values["previous-catalog"]) candidates.push(...JSON.parse(await readFileText(resolve(values["previous-catalog"]))));
  const declarations = await catalogDeclarations();
  await admitOfferExamples(declarations);
  const offers = declareCatalog(declarations);
  const currentSkus = new Set(offers.map(offer => offer.sku));
  const historical = new Map();
  for (const declaration of candidates) {
    const offer = declareCatalog([declaration])[0];
    if (!currentSkus.has(offer.sku)) historical.set(offer.sku, declaration);
  }
  const edgeOffers = offers.filter(offer => offer.declaration.runtime !== "node");
  // The edge face's module map: a fetch-handler bundle resolves no specifier
  // at runtime, so every binding of every edge offer is imported statically
  // here and the face loads from this map instead of importing by name.
  const bindings = new URL("../src/edge-bindings.mjs", import.meta.url).pathname;
  const specifiers = [...new Set(edgeOffers.flatMap((offer) => [offer.declaration.compute, offer.declaration.validate].filter(Boolean).map(bindingSpecifier)))].sort();
  const lines = [
    "// Generated by compile-x402-market-catalog from market selectors and their authoritative publication records; do not hand-edit.",
    "// The edge face's static module map: every compute and validate binding of every",
    "// offer the edge serves, imported by name here because a fetch-handler bundle",
    "// resolves no specifier at runtime.",
    ...specifiers.map((specifier, index) => `import * as binding${index} from ${JSON.stringify(specifier)};`),
    "",
    "const EDGE_BINDINGS = new Map([",
    ...specifiers.map((specifier, index) => `  [${JSON.stringify(specifier)}, binding${index}],`),
    "]);",
    "",
    "/** Resolve one binding specifier from the compiled map; a specifier outside the edge catalog is refused. */",
    "export async function loadEdgeBinding(specifier) {",
    "  const module = EDGE_BINDINGS.get(specifier);",
    "  if (module === undefined) throw new TypeError(`edge face carries no module for ${specifier}; recompile the catalog`);",
    "  return module;",
    "}",
    "",
    "export const EDGE_BINDING_SPECIFIERS = Object.freeze([...EDGE_BINDINGS.keys()]);",
    "",
  ];
  await writeFileText(bindings, lines.join("\n"));
  const identitiesPath = new URL("../src/compiled-offers.mjs", import.meta.url).pathname;
  const identities = Object.fromEntries(offers.map((offer) => [offer.routeKey, { sku: offer.sku, cell: offer.cell, law: offer.law, discovery: offer.discovery }]));
  await writeFileText(identitiesPath, [
    "// Generated by compile-x402-market-catalog from market selectors and their authoritative publication records; do not hand-edit.",
    "// Every offer's content identities and Bazaar discovery extension, derived from the admitted declaration, keyed by method and route.",
    `export const HISTORICAL_DECLARATIONS = Object.freeze(${JSON.stringify([...historical.values()], null, 2)});`,
    `export const COMPILED_DECLARATIONS = Object.freeze(${JSON.stringify(declarations, null, 2)});`,
    `export const COMPILED_OFFERS = Object.freeze(${JSON.stringify(identities, null, 2)});`,
    "",
  ].join("\n"));
  // The house capability market's public Offers, SEN-identified here for the same CPU reason;
  // an offer whose sku is unchanged keeps its earlier activity.
  const outboxPath = new URL("../src/compiled-capability-outbox.mjs", import.meta.url).pathname;
  const earlier = await import("../src/compiled-capability-outbox.mjs").then((module) => module.CAPABILITY_OUTBOX, () => []);
  const outbox = deriveCapabilityOutbox(offers, { rails: MARKET_RAILS, origin: offers[0].declaration.origin, now: new Date().toISOString(), previous: earlier });
  await writeFileText(outboxPath, [
    "// Generated by compile-x402-market-catalog from the market declarations; do not hand-edit.",
    "// The public ActivityPub Offers (org.emsenn.capability-offer.v3 in SEN) of every offer published to the house capability market.",
    `export const CAPABILITY_OUTBOX = Object.freeze(${JSON.stringify(outbox, null, 2)});`,
    "",
  ].join("\n"));
  return { bindings, identities: identitiesPath, outbox: outboxPath, offers: Object.keys(identities).length, edgeOffers: edgeOffers.length, edgeBindings: specifiers.length, capabilityOffers: outbox.length };
}, { moduleUrl: import.meta.url, formatResult: (result) => `${JSON.stringify(result)}\n` });
