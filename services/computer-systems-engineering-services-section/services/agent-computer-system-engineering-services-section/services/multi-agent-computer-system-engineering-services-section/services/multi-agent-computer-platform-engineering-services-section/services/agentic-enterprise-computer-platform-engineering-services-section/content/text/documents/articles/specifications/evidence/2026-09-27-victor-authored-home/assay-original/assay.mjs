import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const publisher = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('publisher directory argument required');
const baselineMode = process.argv.includes('--baseline');
const { build } = await import(pathToFileURL(join(publisher, 'src/build.mjs')));
const { normalizeProjectConfig } = await import(pathToFileURL(join(publisher, 'src/config.mjs')));
const scratch = await mkdtemp(join(tmpdir(), 'muse-home-assay-run-'));
const checks = [];
function check(group, fn) {
  try { fn(); checks.push({ group, ok: true }); } catch { checks.push({ group, ok: false }); }
}
async function asyncCheck(group, fn) {
  try { await fn(); checks.push({ group, ok: true }); } catch { checks.push({ group, ok: false }); }
}
function md({ title, body, type = 'page', status = 'stable', date = '2026-09-27', extra = '' }) {
  return `---\ntitle: ${title}\ndate-created: ${date}\ntype: ${type}\nstatus: ${status}\n${extra}---\n\n${body}\n`;
}
async function makeContent(entries) {
  const dir = await mkdtemp(join(scratch, 'content-'));
  for (const [name, content] of Object.entries(entries)) {
    const file = join(dir, name);
    await mkdir(join(file, '..'), { recursive: true });
    await writeFile(file, content, 'utf8');
  }
  return dir;
}
function artifactsEqual(left, right) {
  assert.deepEqual([...left.artifacts.keys()].sort(), [...right.artifacts.keys()].sort());
  for (const key of left.artifacts.keys()) assert.deepEqual(left.artifacts.get(key), right.artifacts.get(key));
}
function canonicalOf(html) { return /<link rel="canonical" href="([^"]+)"/u.exec(html)?.[1] ?? null; }
function socialUrlOf(html) { return /property="og:url" content="([^"]+)"/u.exec(html)?.[1] ?? null; }
function jsonLd(html) {
  const source = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/u.exec(html)?.[1];
  assert.ok(source);
  return JSON.parse(source);
}
function hrefs(html) { return [...html.matchAll(/href="([^"]+)"/gu)].map((match) => match[1]); }
function itemLink(html, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`<li><a href="([^"]+)">${escaped}<\\/a>`, 'u').exec(html)?.[1] ?? null;
}

try {
  const contentDir = await makeContent({
    'overview.md': md({ title: 'Product overview', body: '# Root body marker\n\nA readable introduction.', extra: 'summary: Root summary\nrenamed-from: old-overview\n' }),
    'index.md': md({ title: 'Existing index home', body: '# Existing selector marker\n\nExisting authored home.' }),
    'development.md': md({ title: 'Development', body: 'See [[overview]] and [[old-overview]].', extra: 'summary: Development summary\n' }),
    'comparison.md': md({ title: 'Comparison', body: 'Compare the available descriptions.', extra: 'summary: Comparison summary\n' }),
    'paper.md': md({ title: 'Evidence paper', type: 'paper', body: 'A paper with one chapter.', extra: 'summary: Evidence summary\n' }),
    'paper/chapter-one.md': md({ title: 'Chapter one', type: 'chapter', body: 'Chapter body.', extra: 'part-of: paper\norder: 1\n' }),
    'draft.md': md({ title: 'Potential item', status: 'potential', body: 'Preview-only body.' }),
  });
  const site = { name: 'Assay site', baseIri: 'https://assay.example/', language: 'en', license: 'Unreleased', menu: [{ label: 'home', href: '/' }] };
  const base = { contentDir, site };

  const omitted = await build(base);
  const explicitTrue = await build({ ...base, home: true });
  const customRoot = '<!doctype html><html lang="en"><head><title>Custom</title></head><body><nav>home</nav><main><h1>Custom root</h1></main></body></html>';
  const homeFalse = await build({ ...base, home: false, archives: false, tufte: false, search: false, release: false, projectors: [{ name: 'assay-root', priority: 200, project: () => ({ artifacts: [{ path: 'index.html', body: customRoot, source: 'assay' }] }) }] });
  check('legacy', () => assert.equal(normalizeProjectConfig({}).config.home, true));
  check('legacy', () => assert.equal(normalizeProjectConfig({ home: true }).config.home, true));
  check('legacy', () => assert.equal(normalizeProjectConfig({ home: false }).config.home, false));
  check('legacy', () => assert.ok(omitted.artifacts.get('index.html')?.includes('Product overview')));
  check('legacy', () => assert.equal(omitted.artifacts.get('index.html'), explicitTrue.artifacts.get('index.html')));
  const existingStringHome = await build({ ...base, home: 'index' });
  check('legacy', () => assert.ok(existingStringHome.artifacts.get('index.html')?.includes('Existing selector marker')));
  check('legacy', () => assert.equal(existingStringHome.report.refusals.length, 0));
  check('legacy', () => assert.equal(homeFalse.artifacts.get('index.html'), customRoot));
  check('legacy', () => assert.equal(homeFalse.report.refusals.length, 0));

  const noArchives = { ...base, archives: false, tufte: false, search: false };
  const selected = await build({ ...noArchives, home: 'overview' });
  const root = selected.artifacts.get('index.html') ?? '';
  const selectedRoute = selected.artifacts.get('overview/index.html') ?? '';
  const development = selected.artifacts.get('development/index.html') ?? '';
  check('authored-home', () => assert.equal(selected.report.refusals.length, 0));
  check('authored-home', () => assert.ok(root.includes('Root body marker')));
  check('authored-home', () => assert.equal(canonicalOf(root), site.baseIri));
  check('authored-home', () => assert.equal(socialUrlOf(root), site.baseIri));
  check('authored-home', () => assert.ok(JSON.stringify(jsonLd(root)).includes(site.baseIri)));
  check('authored-home', () => assert.ok(selectedRoute.includes('http-equiv="refresh"')));
  check('authored-home', () => assert.equal(canonicalOf(selectedRoute), site.baseIri));
  check('authored-home', () => assert.ok(hrefs(development).includes('/')));
  check('authored-home', () => assert.ok(!hrefs(development).includes('/overview/')));
  check('authored-home', () => assert.ok(!hrefs(development).includes('/old-overview/')));
  check('authored-home', () => assert.ok(JSON.stringify(jsonLd(root)).includes('"@type":"WebPage"')));

  const normalizedHome = normalizeProjectConfig({ home: 'overview' });
  check('authored-home', () => assert.equal(normalizedHome.refusals.length, 0));
  check('authored-home', () => assert.equal(normalizedHome.config.home, 'overview'));
  for (const invalid of [null, [], '', '  ', {}, { cell: 'overview' }, 4, 'missing']) {
    const invalidBuild = await build({ ...noArchives, home: invalid });
    check('authored-home', () => assert.ok(invalidBuild.report.refusals.length > 0));
    check('authored-home', () => assert.notEqual(invalidBuild.report.releasable, true));
  }
  const invalidNormalized = normalizeProjectConfig({ home: { cell: 'overview' } });
  check('authored-home', () => assert.ok(invalidNormalized.refusals.length > 0));
  const acceptedStringConfig = normalizeProjectConfig({ home: 'overview' });
  check('authored-home', () => assert.equal(acceptedStringConfig.config.home, 'overview'));

  const draftRefusal = await build({ ...noArchives, home: 'draft', drafts: false });
  check('authored-home', () => assert.ok(draftRefusal.report.refusals.length > 0));
  const draftPreview = await build({ ...noArchives, home: 'draft', drafts: true });
  check('authored-home', () => assert.ok(draftPreview.artifacts.get('index.html')?.includes('Preview-only body.')));

  const rich = await build({ ...base, home: 'overview', archives: { pageSize: 2 }, tufte: true });
  const sitemap = rich.artifacts.get('sitemap.xml') ?? '';
  const feedFiles = [...rich.artifacts].filter(([path]) => /^feed\./u.test(path));
  const feedText = feedFiles.map(([, content]) => String(content)).join('\n');
  const archiveRoot = rich.artifacts.get('index.html') ?? '';
  const archiveRoutes = [...rich.artifacts].filter(([path]) => /^(archive|sections|tags|types|statuses)\//u.test(path)).map(([, content]) => String(content)).join('\n');
  const atlas = String(rich.artifacts.get('atlas/index.html') ?? '');
  const neighborhood = String(rich.artifacts.get('development/neighborhood/index.html') ?? '');
  const paperPage = String(rich.artifacts.get('paper/index.html') ?? '');
  check('authored-home', () => assert.equal(rich.report.refusals.length, 0));
  check('authored-home', () => assert.ok(archiveRoot.includes('Root body marker')));
  check('authored-home', () => assert.ok(itemLink(archiveRoutes, 'Product overview') === '/' || !archiveRoutes.includes('Product overview')));
  check('authored-home', () => assert.ok(!hrefs(archiveRoutes).includes('/overview/')));
  check('authored-home', () => assert.ok(hrefs(atlas).includes('/') && !hrefs(atlas).includes('/overview/')));
  check('authored-home', () => assert.ok(hrefs(neighborhood).includes('/') && !hrefs(neighborhood).includes('/overview/')));
  check('authored-home', () => assert.ok(hrefs(paperPage).includes('/') && !hrefs(paperPage).includes('/overview/')));
  check('authored-home', () => assert.ok((sitemap.match(/https:\/\/assay\.example\//gu) ?? []).length === 1));
  check('authored-home', () => assert.ok(!sitemap.includes('https://assay.example/overview/')));
  check('authored-home', () => assert.ok(feedFiles.length >= 3));
  check('authored-home', () => assert.ok(feedText.includes('https://assay.example/')));
  check('authored-home', () => assert.ok(!feedText.includes('https://assay.example/overview/')));
  check('authored-home', () => assert.ok(feedText.includes('Product overview')));
  const repeat = await build({ ...base, home: 'overview', archives: { pageSize: 2 }, tufte: true });
  await asyncCheck('authored-home', async () => artifactsEqual(rich, repeat));

  const collision = await build({ ...noArchives, home: 'overview', projectors: [{ name: 'root-collision', priority: 200, project: () => ({ artifacts: [{ path: 'index.html', body: customRoot, source: 'assay' }] }) }] });
  check('authored-home', () => assert.ok(collision.report.refusals.length > 0));
  const publicDir = await mkdtemp(join(scratch, 'public-'));
  await writeFile(join(publicDir, 'index.html'), customRoot, 'utf8');
  const publicCollision = await build({ ...noArchives, publicDir, home: 'overview' });
  check('authored-home', () => assert.ok(publicCollision.report.refusals.length > 0));
  const duplicateDir = await makeContent({ 'overview.md': md({ title: 'First', body: 'first' }), 'OVERVIEW.MD': md({ title: 'Second', body: 'second' }) });
  const duplicate = await build({ ...noArchives, contentDir: duplicateDir, home: 'overview' });
  check('authored-home', () => assert.ok(duplicate.report.refusals.length > 0));

  const legacyFailures = checks.filter((entry) => entry.group === 'legacy' && !entry.ok).length;
  const homePasses = checks.filter((entry) => entry.group === 'authored-home' && entry.ok).length;
  const homeFailures = checks.filter((entry) => entry.group === 'authored-home' && !entry.ok).length;
  const summary = { mode: baselineMode ? 'baseline' : 'candidate', total: checks.length, legacyPasses: checks.length - checks.filter((entry) => !entry.ok).length, legacyFailures, authoredHomePasses: homePasses, authoredHomeFailures: homeFailures };
  if (baselineMode) {
    if (legacyFailures !== 0 || homeFailures === 0) process.exitCode = 1;
    summary.expectedMissing = homeFailures;
  } else if (legacyFailures || homeFailures) process.exitCode = 1;
  console.log(JSON.stringify(summary));
} finally {
  await rm(scratch, { recursive: true, force: true });
}
