import { createHash } from "node:crypto";
import { isAbsolute, resolve, sep } from "node:path";
import { readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";

const servicesRoot = "lib/emsenn/services/561-group/services";

/** Resolve publication selectors from the authoritative book offer and accepted edition. */
export async function catalogDeclarations({ records, read, sourceRoot } = {}) {
  if (!Array.isArray(records)) throw new TypeError("catalog records must be an explicit array");
  if (read !== undefined && typeof read !== "function") throw new TypeError("catalog source reader must be a function");
  if (sourceRoot !== undefined && (typeof sourceRoot !== "string" || !isAbsolute(sourceRoot))) {
    throw new TypeError("catalog source root must be an explicit absolute path");
  }
  const repositoryRoot = sourceRoot === undefined ? undefined : resolve(sourceRoot);
  async function readRecord(path) {
    if (typeof path !== "string" || path.includes("\\") || path.includes("\0") ||
        isAbsolute(path) || path.split("/").some(part => part === "" || part === "." || part === "..")) {
      throw new TypeError("catalog evidence must name a relative source-record path without traversal");
    }
    if (read) return read(path);
    if (repositoryRoot === undefined) {
      throw new TypeError("catalog evidence requires an injected source reader or explicit --source-root");
    }
    const absolute = resolve(repositoryRoot, path);
    if (!absolute.startsWith(repositoryRoot === sep ? sep : `${repositoryRoot}${sep}`)) throw new TypeError("catalog evidence must be inside the source root");
    return readFileText(absolute);
  }
  const loaded = new Map();
  async function record(path) {
    if (!loaded.has(path)) loaded.set(path, readRecord(path).then(text => JSON.parse(text)));
    return loaded.get(path);
  }
  return Promise.all(records.map(async declaration => {
    if (declaration.seller) {
      const reference = declaration.seller.record;
      const bytes = await readRecord(reference.path), seller = JSON.parse(bytes);
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

