import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { createDigitalGoodsStorefrontWorker } from "@red-cup-engineering/digital-goods-storefront-services-section/worker-runtime";
import { createDurableFulfillment, DigitalGoodsFulfillment } from "@red-cup-engineering/digital-goods-storefront-services-section/durable-fulfillment";
import { referencedReviewCopyId } from "@red-cup-engineering/digital-goods-storefront-services-section/review-copy";
import { admitInvitation, grantReviewCopy, reviewCopyWindow, reviewInvitation, REVIEW_TERMS } from "../src/review-copy-grants.mjs";

const exec = promisify(execFile);
const edition = `ni:///sha-256;${"E".repeat(43)}`;
const xhtml = (body) => `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>t</title></head>${body}</html>\n`;

async function acceptedEpub(directory) {
  const root = join(directory, "src");
  const files = {
    mimetype: "application/epub+zip",
    "META-INF/container.xml": `<?xml version="1.0"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml" /></rootfiles></container>\n`,
    "EPUB/content.opf": `<?xml version="1.0" encoding="UTF-8"?>\n<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="epub-id-1">\n  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n    <dc:identifier id="epub-id-1">${edition}</dc:identifier>\n    <dc:title id="epub-title-1">Thaw</dc:title>\n    <dc:language>en-US</dc:language>\n    <meta property="dcterms:modified">2026-09-29T00:00:00Z</meta>\n  </metadata>\n  <manifest>\n    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />\n    <item id="title_page_xhtml" href="text/title_page.xhtml" media-type="application/xhtml+xml" />\n  </manifest>\n  <spine>\n    <itemref idref="title_page_xhtml" linear="yes" />\n    <itemref idref="nav" />\n  </spine>\n</package>\n`,
    "EPUB/nav.xhtml": xhtml(`<body><nav epub:type="toc"><ol><li><a href="text/title_page.xhtml">Thaw</a></li></ol></nav></body>`),
    "EPUB/text/title_page.xhtml": xhtml(`<body><section epub:type="titlepage"><h1>Thaw</h1></section></body>`),
  };
  for (const [name, text] of Object.entries(files)) { const path = join(root, name); await mkdir(dirname(path), { recursive: true }); await writeFile(path, text); await utimes(path, new Date("2026-09-29T00:00:00Z"), new Date("2026-09-29T00:00:00Z")); }
  const epub = join(directory, "accepted.epub"), env = { ...process.env, TZ: "UTC" };
  await exec("zip", ["-X", "-0", "-q", epub, "mimetype"], { cwd: root, env });
  await exec("zip", ["-X", "-r", "-q", epub, "META-INF", "EPUB"], { cwd: root, env });
  const artifactSha256 = createHash("sha256").update(await readFile(epub)).digest("hex");
  return { epub, releaseAcceptance: { id: `ni:///sha-256;${"R".repeat(43)}`, content: { type: "KindleReleaseAcceptance", status: "release-ready", book: "thaw", editionInputDigest: edition, rendition: { kind: "EPUB", artifactSha256 } } } };
}

const plan = { type: "PublicationLaunchPlan", version: 2, work: "thaw", onSale: { date: "2026-10-02" }, advanceReading: { opens: "2026-10-06", closes: "2026-11-01", teamSize: 25, rendition: "advance-reader-v1" }, byline: { author: "Ada North", publisher: "Causeway Services" } };

/** The shop as it runs: the storefront Worker over its durable fulfillment object and one goods bucket. */
function shop() {
  const objects = new Map(), rows = new Map();
  const storage = { async get(key) { return rows.get(key); }, async put(key, value) { rows.set(key, value); }, async transaction(work) { return work({ get: storage.get, put: storage.put }); } };
  const durable = new DigitalGoodsFulfillment({ storage });
  const fulfillment = createDurableFulfillment({ idFromName: () => "shop", get: () => ({ fetch: (input, init) => durable.fetch(input instanceof Request ? input : new Request(input, init)) }) }, "shop");
  const object = (bytes) => ({ size: bytes.byteLength, async text() { return new TextDecoder().decode(bytes); }, async arrayBuffer() { return new Uint8Array(bytes).slice().buffer; } });
  const goods = {
    async get(key) { return objects.has(key) ? object(objects.get(key)) : null; }, async head(key) { return objects.has(key) ? object(objects.get(key)) : null; },
    async putCurrent(key, { body }) { objects.set(key, new Uint8Array(body)); return { conflict: false }; },
  };
  const worker = createDigitalGoodsStorefrontWorker({ catalog: { merchant: { name: "Causeway Services", legalBody: "causeway" }, offerings: [{ id: "thaw", title: "Thaw", line: "fiction", status: "coming-soon", release: "thaw", book: { edition: { record: "fixture.json", digest: edition, files: [] } } }] }, origin: "https://shop.test", buyerActor: "urn:ame:test" });
  const env = { fulfillment, goods, tokenSecret: "token-secret", audit: { async record(entry) { return entry; } }, giftAgent: { key: "agent-key", as: "press@561.group" } };
  return { goods, rows, objects, fetch: (input, init) => worker.fetch(new Request(input, init), env) };
}

const validate = async () => ({ outcome: "pass", profile: { id: "fixture-validator" }, errors: 0, warnings: 0 });

test("the house invitation passes the rulings; one that conditions the copy, suggests a rating, pays or claims a human does not", () => {
  const text = reviewInvitation({ title: "Thaw", author: "Ada North", publisher: "Causeway Services", onSale: "2026-10-02", today: "2026-10-06", url: "https://shop.test/review-copies/x", readableThrough: "2026-11-01", contact: "press@561.group" });
  assert.match(text, /is out now/u);
  assert.match(text, /works through November 1, 2026/u);
  assert.ok(text.includes(REVIEW_TERMS));
  assert.equal(admitInvitation(text).admitted, true);
  const refused = (body) => admitInvitation(`${body} ${REVIEW_TERMS}`).findings.map(({ rule }) => rule);
  assert.deepEqual(refused("A free copy in exchange for an honest review."), ["no-review-obligation"]);
  assert.deepEqual(refused("No obligation beyond an honest review."), ["no-review-obligation"]);
  assert.deepEqual(refused("We hope for five stars."), ["no-rating-suggested"]);
  assert.deepEqual(refused("Reviewers get a $10 gift card."), ["nothing-beyond-the-copy"]);
  assert.deepEqual(refused("I'm a real person, not an AI."), ["never-claims-human"]);
  assert.deepEqual(admitInvitation("Here is a free copy.").findings.map(({ rule }) => rule), ["review-unconditioned", "mention-the-copy"]);
});

test("the plan's window decides expiry and the copy's notice; the team waits for it to open, outreach may go early, nothing goes after it closes", () => {
  assert.deepEqual({ ...reviewCopyWindow(plan, "2026-10-06", "advance-reader-team") }, { readableThrough: "2026-11-01", expiresAt: "2026-11-02T00:00:00.000Z", status: "review", onSale: "2026-10-02" });
  assert.throws(() => reviewCopyWindow(plan, "2026-10-03", "advance-reader-team"), /opens 2026-10-06/u);
  assert.equal(reviewCopyWindow({ ...plan, onSale: { date: "2026-12-01" } }, "2026-10-03", "outreach").status, "advance");
  assert.throws(() => reviewCopyWindow(plan, "2026-11-02", "outreach"), /closed 2026-11-01/u);
  assert.throws(() => reviewCopyWindow({ ...plan, advanceReading: null }, "2026-10-06", "outreach"), /no advance-reading window/u);
});

test("a grant renders the reader's stamped copy, stages it, records it at the shop and writes a material-connection record naming no reader; repeating it gives nothing twice", async () => {
  const directory = await mkdtemp(join(tmpdir(), "review-copy-grants-"));
  const { epub, releaseAcceptance } = await acceptedEpub(directory);
  const house = shop();
  const deps = { giver: "press@561.group", contact: "press@561.group", stateDir: join(directory, "state"), recordsDir: join(directory, "records"), shop: { origin: "https://shop.test", key: "agent-key", fetch: house.fetch }, goods: house.goods, validate };
  const input = { plan, releaseAcceptance, acceptedEpub: epub, offering: "thaw", title: "Thaw", reader: { name: "Rhea Reader", email: "Rhea@Example.test" }, reference: "team/0001", channel: "advance-reader-team", campaign: null, today: "2026-10-06" };

  const given = await grantReviewCopy(input, deps);
  assert.match(given.grant, /^review-[0-9a-f-]{36}$/u);
  assert.equal(given.disposition, "granted");
  assert.equal(given.url, `https://shop.test/review-copies/${given.grant}`);
  const record = given.record.content;
  assert.equal(record.type, "MaterialConnection");
  assert.equal(record.edition, edition);
  assert.equal(record.expiresAt, "2026-11-02T00:00:00.000Z");
  assert.equal(record.invitation.text, given.invitation);
  assert.doesNotMatch(await readFile(given.recordPath, "utf8"), /Rhea|example\.test/iu, "the record names the grant, never the reader");
  assert.equal((await stat(join(given.ledger, "reader.json"))).mode & 0o777, 0o600);

  const claim = await (await house.fetch(given.url)).text();
  assert.match(claim, /addressed to rhea@example\.test/u);
  const token = claim.match(/\/download\/([^"]+)/u)[1];
  const download = await house.fetch(`https://shop.test/download/${token}`);
  assert.equal(download.status, 200);
  const copy = Buffer.from(await download.arrayBuffer());
  assert.equal(createHash("sha256").update(copy).digest("hex"), record.stampedSha256);
  const unpacked = join(directory, "unpacked");
  await writeFile(join(directory, "delivered.epub"), copy);
  await exec("unzip", ["-q", join(directory, "delivered.epub"), "-d", unpacked]);
  assert.match(await readFile(join(unpacked, "EPUB/text/advance-reader.xhtml"), "utf8"), new RegExp(`Prepared for Rhea Reader · ${given.grant}`, "u"));

  const again = await grantReviewCopy(input, deps);
  assert.equal(again.grant, given.grant);
  assert.equal(again.disposition, "duplicate");
  assert.equal(again.record.id, given.record.id);
  assert.deepEqual(await readdir(deps.recordsDir), [`${given.grant}.json`]);
});

test("an outreach message is checked before anything is given, must carry the copy's link, and is kept out of the record when it names the reader", async () => {
  const directory = await mkdtemp(join(tmpdir(), "review-copy-outreach-"));
  const { epub, releaseAcceptance } = await acceptedEpub(directory);
  const house = shop();
  const deps = { giver: "press@561.group", contact: "press@561.group", stateDir: join(directory, "state"), recordsDir: join(directory, "records"), shop: { origin: "https://shop.test", key: "agent-key", fetch: house.fetch }, goods: house.goods, validate };
  const input = { plan, releaseAcceptance, acceptedEpub: epub, offering: "thaw", title: "Thaw", reader: { name: "Bo Blogger", email: "bo@example.test" }, reference: "bo", channel: "outreach", campaign: "thaw-launch", today: "2026-10-03" };
  await assert.rejects(grantReviewCopy({ ...input, invitation: "Dear Bo, a free copy for an honest review." }, deps), /rulings/u);
  assert.equal(house.objects.size, 0, "nothing is staged for a refused invitation");
  await assert.rejects(grantReviewCopy({ ...input, invitation: `Dear Bo, here is Thaw. ${REVIEW_TERMS}` }, deps), /carries the copy's link/u);
  const grant = await referencedReviewCopyId("press@561.group", "thaw/outreach/bo");
  const given = await grantReviewCopy({ ...input, invitation: `Dear Bo Blogger, Thaw comes out soon: https://shop.test/review-copies/${grant} ${REVIEW_TERMS}` }, deps);
  assert.equal(given.grant, grant);
  assert.equal(given.record.content.invitation.text, null);
  assert.equal(given.record.content.campaign, "thaw-launch");
  assert.match(await readFile(join(given.ledger, "reader.json"), "utf8"), /Dear Bo Blogger/u);
});
