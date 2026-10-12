import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { tmpdir } from "node:os";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { journal, openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { headPath } from "@red-cup-engineering/computer-system-engine/journal/filesystem/heads";
import { journalDateStatus, journalAdmissionSpan, listDailyFeedsInternal, readPacketText, writePacketText,
  subjectLogPathsInternal, territoryLogPathsInternal } from "@red-cup-engineering/computer-system-engine/journal/filesystem/write-journal-store";
import { journalAppendAddress } from "@red-cup-engineering/computer-system-engine/journal/filesystem/operations";
import { mergeSettlementTransfer, settlementHoldings, settlementTransfer } from "@red-cup-engineering/computer-system-engine/journal/exchange";
import { artifactStoreRoot, journalDirectoryOf, journalFeedPath, journalIndexDirectory, journalPacketDirectory } from "@red-cup-engineering/semiotic-eavt-services-section/journal/store-root";
import { causalAdmissionIndexRoot } from "@red-cup-engineering/semiotic-eavt-services-section/journal/filesystem/events";
import { segmentPath } from "@red-cup-engineering/semiotic-eavt-services-section/journal/filesystem/segment-store";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

const DATE = "2026-10-01";
const AT = `${DATE}T01:02:03Z`;
const ROOT_NAME = "@red-cup-engineering/computer-system-engine";
const put = (file, text = "") => { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, text); };
function fixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), "journal-kind-layout-"));
  try { return run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}
function append(root, subject, date = DATE, value = subject) {
  return openJournal(root).appendRows(subject, [[subject, "value", value, `${date}T00:00:00Z`]], { at: date, subject, rootName: ROOT_NAME });
}

test("heads require a physical index binding and follow the legitimate store link", () => fixture((root) => {
  const physical = path.join(root, "physical"), logical = path.join(root, "logical");
  mkdirSync(journalDirectoryOf(physical), { recursive: true });
  mkdirSync(path.join(logical, "data"), { recursive: true });
  symlinkSync(journalDirectoryOf(physical), journalDirectoryOf(logical));
  assert.throws(() => headPath(logical, DATE, "sessions", "key"), /indexDirectory/);
  const store = openJournal(logical);
  for (const [date, key, value] of [[DATE, "a", 1], [DATE, "b", 2], ["2026-10-02", "a", 3]]) {
    store.writeHead(date, "sessions", key, { value });
    assert.deepEqual(openJournal(logical).readHead(date, "sessions", key), { value });
    const file = headPath({ indexDirectory: journalIndexDirectory(journalDirectoryOf(physical)) }, date, "sessions", key);
    assert.deepEqual(JSON.parse(readFileSync(file)), { value });
  }
  assert.equal(existsSync(path.join(logical, "data", "state")), false);
  assert.equal(store.readHead(DATE, "other", "a"), undefined);
  const missing = path.join(root, "missing");
  assert.equal(openJournal(missing).readHead(DATE, "sessions", "a"), undefined);
  assert.equal(existsSync(missing), false);
  const dangling = path.join(root, "dangling");
  mkdirSync(path.join(dangling, "data"), { recursive: true });
  symlinkSync(path.join(root, "absent-target"), journalDirectoryOf(dangling));
  assert.throws(() => openJournal(dangling).writeHead(DATE, "sessions", "a", {}));
  assert.throws(() => openJournal(dangling).readHead(DATE, "sessions", "a"));
  assert.equal(existsSync(path.join(dangling, "data", "state")), false);
}));

test("daily and legacy discovery retain each canonical representation and deduplicate", () => fixture((root) => {
  const plain = journalFeedPath(root, "plain", DATE), segment = journalFeedPath(root, "segment", DATE);
  const statements = journalFeedPath(root, "statements", DATE);
  put(plain); put(`${plain}.witnesses`); put(`${segment}.witnesses`);
  mkdirSync(`${statements}.statements`, { recursive: true });
  mkdirSync(causalAdmissionIndexRoot(plain), { recursive: true });
  put(`${plain}.identities`, "retained");
  put(path.join(path.dirname(plain), `${DATE}-admit-other.jsonl`));
  put(journalFeedPath(root, "plain", "2026-10-02"));
  const expected = [plain, segment, statements].sort();
  assert.deepEqual(listDailyFeedsInternal(root, DATE), expected);
  assert.deepEqual(journalDateStatus(root, DATE), { exists: true, legacyIdentitySidecars: 1 });
  assert.deepEqual(journalDateStatus(root, "2026-10-03"), { exists: false, legacyIdentitySidecars: 0 });
  assert.deepEqual(territoryLogPathsInternal(root, DATE), expected);
  assert.deepEqual(territoryLogPathsInternal(path.relative(process.cwd(), root), DATE), expected);
  assert.deepEqual(subjectLogPathsInternal(root, "@statements", DATE), [statements]);
  assert.deepEqual(subjectLogPathsInternal(path.relative(process.cwd(), root), "@statements", DATE), [statements]);
  assert.deepEqual(journalAdmissionSpan(root), { first: DATE, last: "2026-10-02", feeds: 4 });
}));

test("admission span inventories unindexed representations without inventing membership", () => fixture((root) => {
  const plain = journalFeedPath(root, "plain", DATE), segment = journalFeedPath(root, "segment", DATE);
  const statements = journalFeedPath(root, "statements", "2026-10-02");
  put(plain); put(`${segment}.witnesses`); mkdirSync(`${statements}.statements`, { recursive: true });
  assert.equal(existsSync(causalAdmissionIndexRoot(plain)), false);
  assert.deepEqual(journalAdmissionSpan(root), { first: DATE, last: "2026-10-02", feeds: 3 });
  assert.deepEqual(journalAdmissionSpan(path.relative(process.cwd(), root)), journalAdmissionSpan(root));
  assert.equal(existsSync(causalAdmissionIndexRoot(plain)), false);
}));

test("admitted feeds remain discoverable when their actual segment disappears", () => fixture((root) => {
  append(root, "alpha"); append(root, "alpha", "2026-10-02"); append(root, "beta");
  const log = journalFeedPath(root, "alpha", DATE);
  mkdirSync(causalAdmissionIndexRoot(log), { recursive: true });
  assert.deepEqual(territoryLogPathsInternal(path.relative(process.cwd(), root)), territoryLogPathsInternal(root));
  assert.deepEqual(subjectLogPathsInternal(path.relative(process.cwd(), root), "alpha"), subjectLogPathsInternal(root, "alpha"));
  assert.equal(journal.scanCausalTerritory(root, 0, n => n + 1).result, 3);
  assert.deepEqual(subjectLogPathsInternal(root, "alpha", DATE), [log]);
  assert.deepEqual(journalAdmissionSpan(root), { first: DATE, last: "2026-10-02", feeds: 3 });
  assert.deepEqual(journalAdmissionSpan(path.relative(process.cwd(), root)), journalAdmissionSpan(root));
  rmSync(segmentPath(log));
  assert.ok(territoryLogPathsInternal(root).includes(log));
  assert.ok(subjectLogPathsInternal(root, "alpha").includes(log));
  assert.throws(() => journal.scanCausalTerritory(root, 0, n => n + 1), /missing|absent|ENOENT|segment/i);
}));

test("shared packets preserve exact input bytes plus one LF across actual feeds", () => fixture((root) => {
  const a = journalFeedPath(root, "alpha", DATE), b = journalFeedPath(root, "beta", "2026-10-02");
  const text = ' { "unicode": "λ", "n": 1 } \n';
  const one = openJournal(root).storePacket(a, text), two = openJournal(root).storePacket(b, text);
  assert.equal(one.path, two.path);
  const relativeRoot = path.relative(process.cwd(), root);
  const relativeFeed = journalFeedPath(relativeRoot, "alpha", DATE);
  assert.equal(openJournal(relativeRoot).storePacket(relativeFeed, text).path, one.path);
  assert.equal(one.sha256, sha256Hex(text));
  assert.equal(one.bytes, Buffer.byteLength(text));
  assert.equal(readFileSync(one.path, "utf8"), `${text}\n`);
  assert.equal(one.path, path.join(journalPacketDirectory(journalDirectoryOf(root)), "sha256", `${one.sha256}.json`));
  assert.ok(one.relativePath.startsWith("../"));
  assert.equal(path.resolve(path.dirname(a), one.relativePath), one.path);
  assert.equal(readPacketText(a, one.relativePath), text);
  assert.deepEqual(journal.readPacket(b, two.relativePath), { unicode: "λ", n: 1 });
  assert.throws(() => openJournal(root).storePacket(DATE, text), /feed/);
  assert.throws(() => openJournal(root).storePacket(path.join(journalDirectoryOf(root), "alpha-logs", `${DATE}-admit-beta.jsonl`), text), /feed/);
}));

test("unchanged historical references receive moved bytes and refuse conflicting copies", () => fixture((root) => {
  const log = journalFeedPath(root, "alpha", DATE), text = '{"retained":true}';
  const packet = writePacketText(log, text), old = `packets/sha256/${packet.sha256}.json`;
  assert.equal(readPacketText(log, old), text);
  const local = path.join(path.dirname(log), old);
  put(local, `${text}\n`);
  assert.equal(readPacketText(log, old), text);
  put(local, '{"different":true}\n');
  assert.throws(() => readPacketText(log, old), /conflict/);
  assert.throws(() => readPacketText(log, packet.relativePath), /conflict/);
  assert.throws(() => writePacketText(log, text), /conflict/);
  assert.equal(readFileSync(packet.path, "utf8"), `${text}\n`);
  rmSync(local); put(packet.path, '{"different":true}\n');
  assert.throws(() => writePacketText(log, text), /conflict/);
  assert.throws(() => readPacketText(log, old), /digest/);
}));

test("packet admission rejects noncanonical targets before consulting byte reader", () => fixture((root) => {
  const log = journalFeedPath(root, "alpha", DATE), packet = writePacketText(log, '{}');
  let reads = 0;
  const options = { readFileUtf8(file) { reads++; return readFileSync(file, "utf8"); } };
  for (const reference of [packet.path, `../../outside/${packet.sha256}.json`, `./${packet.relativePath}`,
    `${packet.relativePath}/../${packet.sha256}.json`, `packets/sha256/${packet.sha256.toUpperCase()}.json`,
    `packets/sha256/${packet.sha256}.json?query`, `packets/sha256/short.json`, "", null]) {
    assert.throws(() => readPacketText(log, reference, options));
  }
  assert.equal(reads, 0);
  put(packet.path, '{}');
  assert.throws(() => readPacketText(log, packet.relativePath), /digest/);
  put(packet.path, '{} \n');
  assert.throws(() => readPacketText(log, packet.relativePath), /digest/);
}));

test("replacement-decoded malformed UTF-8 never satisfies a text packet digest", () => fixture((root) => {
  const log = journalFeedPath(root, "alpha", DATE), packet = writePacketText(log, '"�"');
  put(packet.path, Buffer.from([0x22, 0x80, 0x22, 0x0a]));
  assert.throws(() => journal.readPacket(log, packet.relativePath), /digest/);
}));

test("foreign packet leaf and ancestor links refuse without reading outside bytes", () => fixture((root) => {
  const log = journalFeedPath(root, "alpha", DATE), packet = writePacketText(log, '{}');
  const outside = path.join(root, "outside"); put(outside, '{}\n');
  rmSync(packet.path); symlinkSync(outside, packet.path);
  let reads = 0;
  const options = { readFileUtf8() { reads++; throw new Error("outside bytes reached"); } };
  assert.throws(() => readPacketText(log, packet.relativePath, options), /symbolic link/);
  assert.throws(() => writePacketText(log, '{}'), /symbolic link/);
  rmSync(path.dirname(packet.path), { recursive: true });
  const foreign = path.join(root, "foreign"); mkdirSync(foreign);
  symlinkSync(foreign, path.dirname(packet.path));
  assert.throws(() => readPacketText(log, packet.relativePath, options), /symbolic link/);
  assert.equal(reads, 0);
  assert.equal(readFileSync(outside, "utf8"), '{}\n');
}));

test("packet custody follows the selected store link and retains standalone storage", () => fixture((root) => {
  const physical = path.join(root, "physical"), logical = path.join(root, "logical");
  mkdirSync(journalDirectoryOf(physical), { recursive: true }); mkdirSync(path.join(logical, "data"), { recursive: true });
  symlinkSync(journalDirectoryOf(physical), journalDirectoryOf(logical));
  const log = journalFeedPath(logical, "alpha", DATE), packet = openJournal(logical).storePacket(log, '{}');
  assert.ok(packet.path.startsWith(journalDirectoryOf(physical) + path.sep));
  assert.deepEqual(journal.readPacket(log, packet.relativePath), {});
  const standalone = path.join(root, "standalone", "feed.jsonl"), lone = writePacketText(standalone, ' [1] ');
  assert.equal(lone.path, path.join(journalPacketDirectory(artifactStoreRoot(standalone)), "sha256", `${lone.sha256}.json`));
  assert.deepEqual(journal.readPacket(standalone, lone.relativePath), [1]);
  assert.equal(readPacketText(standalone, `packets/sha256/${lone.sha256}.json`), ' [1] ');
  assert.throws(() => writePacketText(path.join(root, "data", "journals", "2026", "10", "01", "feed.jsonl"), '{}'), /superseded/);
}));

test("oversized source rows resolve their packet through their actual feed", () => fixture((root) => {
  const value = { text: "x".repeat(70_000) };
  const receipt = append(root, "oversized", DATE, value);
  const log = receipt.artifact.path;
  const row = journal.scan(log, [], (rows, row) => { rows.push(row); return rows; }).result[0];
  assert.equal(row[2].kind, "metroplat.witness-packet-reference");
  assert.deepEqual(journal.readPacket(log, row[2].path), value);
}));

test("canonical settlement transfer converges and preflights every invalid feed before writes", () => fixture((root) => {
  const source = path.join(root, "source"), target = path.join(root, "target");
  append(source, "alpha");
  const held = settlementHoldings(source, DATE), transfer = settlementTransfer(source, DATE, { feeds: {} });
  mergeSettlementTransfer(target, transfer);
  assert.deepEqual(settlementHoldings(target, DATE), held);
  assert.equal(Object.keys(settlementTransfer(source, DATE, held).feeds).length, 0);
  const [valid, material] = Object.entries(transfer.feeds)[0];
  for (const invalid of [`data/logs/2026/10/01/${DATE}-admit-alpha.jsonl`, valid.replace("alpha-logs", "beta-logs"),
    valid.replace(DATE, "2026-10-02"), `./${valid}`, `../${valid}`, `/${valid}`, valid.replace(".jsonl", ".json")]) {
    const refused = path.join(root, "refused");
    assert.throws(() => mergeSettlementTransfer(refused, { ...transfer, feeds: { [valid]: material, [invalid]: material } }), /journal feed|relative journal path/);
    assert.equal(existsSync(refused), false);
  }
  assert.throws(() => mergeSettlementTransfer(path.join(root, "ungranted"), transfer, { feedLabels: ["beta"] }), /not granted/);
  assert.equal(existsSync(path.join(root, "ungranted")), false);
}));
