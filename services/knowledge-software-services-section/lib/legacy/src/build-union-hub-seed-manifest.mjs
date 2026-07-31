import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const repo = process.cwd();
const root = path.join(repo, "lib/emsenn/services/561-group");
const limit = 3 * 1024 * 1024;
const quotas = [
  ["board", 77], ["lenticule", 63], ["rsc", 40], ["academy", 36],
  ["red_cup", 23], ["executive", 17], ["leader", 13],
];
const excluded = /\/(?:legacy|journals|work\/tasks|fixtures|test|tests|node_modules|data|dist|coverage|\.git|\.claude|\.codex|\.github)\//;
const domains = [
  ["services/board-of-directors/", "board"],
  ["services/lenticule-science/", "lenticule"],
  ["services/rsc-quiescent/", "rsc"],
  ["services/union-officer-academy/", "academy"],
  ["services/red-cup-engineering/", "red_cup"],
  ["services/executive-office/", "executive"],
  ["services/leader-movement-team/", "leader"],
  ["content/glossary/", "core"], ["lib/management/", "core"], ["lib/characters/", "core"],
];
async function walk(dir, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!excluded.test(full + "/")) await walk(full, out); }
    else if (/\.(md|mdx)$/i.test(entry.name)) out.push(full);
  }
  return out;
}
// A service can be vendored/nested inside another service.  Attribute it to the
// deepest named domain, not the first parent encountered in its path.
function domain(rel) {
  return domains
    .map(([needle, bucket]) => [rel.lastIndexOf(needle), bucket])
    .filter(([index]) => index >= 0)
    .sort((a, b) => b[0] - a[0])[0]?.[1];
}
function title(text, rel) {
  const heading = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || path.basename(rel).replace(/\.(md|mdx)$/i, "").replace(/[-_]/g, " ");
}
function sourceDate(rel, text) {
  return rel.match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//)?.slice(1).join("-")
    || text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1]
    || null;
}
function score(rel, text) {
  let n = 0;
  if (/^#\s/m.test(text)) n += 8;
  if (/^##\s/m.test(text)) n += 4;
  if (/(charter|constitution|doctrine|theory|governance|architecture|concept of operations|glossary)/i.test(rel + "\n" + text.slice(0, 4000))) n += 18;
  if (/(README|_index)\.md$/i.test(rel)) n += 5;
  if (/\/skills\//.test(rel)) n += 4;
  if (/\/(generated|build|snapshot|migration)\//i.test(rel)) n -= 12;
  n += Math.min(12, Math.floor(text.length / 1800));
  n -= Math.floor(rel.length / 80);
  return n;
}
function csv(v) { return '"' + String(v).replaceAll('"', '""') + '"'; }

const all = [];
for (const full of await walk(root)) {
  const rel = path.relative(repo, full);
  const bucket = domain(rel);
  if (!bucket) continue;
  const stat = await fs.stat(full);
  if (stat.size === 0 || stat.size > limit) continue;
  const text = await fs.readFile(full, "utf8");
  if (text.trim().length < 240) continue;
  const sha256 = createHash("sha256").update(text).digest("hex");
  all.push({ rel, bucket, bytes: stat.size, sha256, title: title(text, rel), date: sourceDate(rel, text), score: score(rel, text) });
}
// Canonical duplicate winner: highest editorial score, then shortest stable path.
const unique = new Map();
for (const item of all.sort((a, b) => b.score - a.score || a.rel.length - b.rel.length || a.rel.localeCompare(b.rel))) {
  if (!unique.has(item.sha256)) unique.set(item.sha256, item);
}
const candidates = [...unique.values()].sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel));
const picked = [];
const used = new Set();
for (const [bucket, count] of quotas) {
  for (const item of candidates.filter(x => x.bucket === bucket && !used.has(x.sha256)).slice(0, count)) {
    picked.push(item); used.add(item.sha256);
  }
}
// Fill remaining capacity with organization-wide foundational sources, then any remaining active source.
for (const preferred of ["core", "academy", "board", "lenticule", "rsc", "red_cup", "executive", "leader"]) {
  for (const item of candidates) {
    if (picked.length >= 269) break;
    if (item.bucket === preferred && !used.has(item.sha256)) { picked.push(item); used.add(item.sha256); }
  }
}
if (picked.length < 269) throw new Error(`Only ${picked.length} admissible unique documents found`);
picked.sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel));
const teamData = path.join(root, "services/red-cup-engineering/services/software-services-section/services/model-services-section/services/logical-inference-services-section/services/notebooklm-inference-team/data/advisory-corpus");
const out = path.join(teamData, "union-self-conception-corpus-seed-269.json");
const manifest = {
  schema_version: 1,
  notebook: { id: "1a19fe72-e4d4-48ee-98f9-dad841ff272b", title: "Union Self-Conception Corpus", available_slots: 269 },
  selection_policy: "active markdown only; <=3MiB; exact-hash canonicalized; excludes legacy, journals, work tasks, fixtures, tests, data, generated/config directories",
  sources: picked.map((item, i) => ({
    rank: i + 1, domain: item.bucket, status: "active", date: item.date,
    display_title: `[${item.bucket.toUpperCase()} | ACTIVE | ${item.date || "UNDATED"}] ${item.title}`,
    source_path: item.rel, bytes: item.bytes, sha256: item.sha256, editorial_score: item.score,
  })),
};
await fs.mkdir(teamData, { recursive: true });
await fs.writeFile(out, JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ output: path.relative(repo, out), selected: picked.length, candidates: candidates.length, domains: Object.fromEntries([...new Set(picked.map(x => x.bucket))].map(k => [k, picked.filter(x => x.bucket === k).length])) }, null, 2));
