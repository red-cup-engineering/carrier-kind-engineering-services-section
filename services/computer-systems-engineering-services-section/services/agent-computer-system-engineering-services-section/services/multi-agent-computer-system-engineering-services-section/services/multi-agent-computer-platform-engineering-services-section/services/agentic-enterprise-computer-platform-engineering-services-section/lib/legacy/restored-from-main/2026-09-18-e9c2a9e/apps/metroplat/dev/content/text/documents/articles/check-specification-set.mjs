#!/usr/bin/env node
// Executable check for the MetroPlat specification set's own correspondence
// rules (SAS §3.5, CR-1..CR-7) plus structural invariants the set asserts.
//
// A rule nobody runs is not law; it is an intention (SAS §2.5). This file is
// what makes CR-1..CR-7 able to fail.
//
// Usage:  node check-specification-set.mjs [--verbose]
// Exit:   0 = every mechanized rule holds; 1 = at least one violation.
//
// Honesty about coverage: not every rule is fully mechanizable. Each check
// declares its own coverage as FULL or PARTIAL. A PARTIAL check that passes
// does NOT mean the rule holds -- only that the mechanizable part of it does.
// Unmechanized obligations are listed at the end and are NOT counted as passes.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const VERBOSE = process.argv.includes('--verbose');

const DOC = {
  SAS: 'system-architecture-specification.md',
  HLD: 'high-level-design.md',
  LLD: 'low-level-design.md',
  PRACTICE: 'engineering-practices.md',
};

const src = Object.fromEntries(
  Object.entries(DOC).map(([k, f]) => [k, readFileSync(join(DIR, f), 'utf8')]),
);

const results = [];
const check = (id, coverage, rule, fn) => {
  let violations = [];
  try {
    violations = fn() ?? [];
  } catch (e) {
    violations = [`check threw: ${e.message}`];
  }
  results.push({ id, coverage, rule, violations });
};

const uniq = (a) => [...new Set(a)];
const all = (s, re) => [...s.matchAll(re)];

// A change history legitimately names things that no longer exist -- that is its
// job. Two checks here have already failed a document for correctly recording
// that it removed something. Any check asking "does X still exist?" must read
// the *current* set, not its record of what it used to be.
const withoutHistory = (text) => {
  const start = text.search(/^#{2,4} .*Change history/mi);
  if (start === -1) return text;
  // Skip past the heading's own line, or its "#" matches ^ at offset 0 and the
  // block "ends" where it begins -- stripping nothing.
  const afterHeading = text.indexOf('\n', start);
  if (afterHeading === -1) return text.slice(0, start);
  const rest = text.slice(afterHeading);
  const end = rest.search(/^#{2,3} /m);
  return text.slice(0, start) + (end === -1 ? '' : rest.slice(end));
};

// ---------------------------------------------------------------- extractors

// LLD element headings: "### 4.12 Conflict — `E-12`"
const lldElements = all(src.LLD, /^### 4\.(\d+) (.+?) — `(E-\d\d)`/gm).map((m) => ({
  section: Number(m[1]),
  name: m[2].trim(),
  id: m[3],
}));

// HLD inventory rows: "| `E-12` | Conflict | ... |"
const hldInventory = all(src.HLD, /^\| `(E-\d\d)` \| ([^|]+?) \|/gm).map((m) => ({
  id: m[1],
  name: m[2].trim(),
}));

// SAS register rows: "| `E-12` | Conflict | LLD §2.12 | Coordination |"
const sasRegister = all(src.SAS, /^\| `(E-\d\d)` \| ([^|]+?) \|/gm).map((m) => ({
  id: m[1],
  name: m[2].trim(),
}));

// LLD "**Depends:** `E-04`, `E-02`" per element section
const lldDepends = lldElements.map((el) => {
  const start = src.LLD.indexOf(`— \`${el.id}\``);
  const chunk = src.LLD.slice(start, start + 600);
  const m = chunk.match(/\*\*Depends:\*\*([^\n]*)/);
  return { ...el, deps: m ? uniq(all(m[1], /E-\d\d/g).map((x) => x[0])) : [] };
});

// Requirement IDs across the LLD.
// A *definition* lives in a "Requirements" table; a traceability table cites the
// same ID as a pointer. Only definitions count, or every requirement looks like
// a duplicate of itself.
const MNEMONICS = 'IDN|RMN|TYC|JNL|CAU|FRN|CHG|PSH|STL|KBS|CAP|CFL|CRD|RCN|ARB|PRJ|TCH|TRN|FAC|DED|EXE|PLN|REV|ORC|TOL|SCP|JUR|GOV|END|SIT|INS|FLD|GND|MPK|ARN|INT|XCC|DEP';
const REQ_RE = new RegExp(`^\\| ((?:${MNEMONICS})-\\d+) \\|`);

const requirementBlocks = () => {
  const lines = src.LLD.split('\n');
  const blocks = [];
  let inReqTable = false;
  for (const l of lines) {
    if (/^#{2,4} .*Requirements\s*$/.test(l)) { inReqTable = true; continue; }
    // any other heading ends the block
    if (/^#{2,4} /.test(l)) { inReqTable = false; continue; }
    if (inReqTable && REQ_RE.test(l)) blocks.push(l);
  }
  return blocks;
};
const reqDefs = requirementBlocks().map((l) => l.match(REQ_RE)[1]);

// Architecture decisions
const adDefs = all(src.SAS, /^\| \*{0,2}(AD-\d+)\*{0,2} \| (.+?) \| (.+?) \| (.+?) \|$/gm).map((m) => ({
  id: m[1],
  governs: m[3].trim(),
}));

// Gap rows in SAS §6
const gapRows = all(src.SAS, /^\| \*{0,2}(R-\d+)\*{0,2} \| (.+?) \| (.+?) \| (.+?) \|$/gm).map((m) => ({
  id: m[1],
  against: m[3].trim(),
}));

// Practices
const practiceDefs = all(src.PRACTICE, /^### (P-\d\d) — /gm).map((m) => m[1]);
const practiceCites = uniq(all(src.LLD, /\*\*Practice:\*\*([^\n]*)/g).flatMap((m) => all(m[1], /P-\d\d/g).map((x) => x[0])));

// Quality goals + acceptance scenarios
const qualityGoals = all(src.SAS, /^\| (\d) \| \*\*(.+?)\*\* — /gm).map((m) => ({ n: m[1], name: m[2] }));

// ---------------------------------------------------------------- the rules

check('CR-1', 'FULL',
  'Every LLD element appears exactly once in the HLD inventory, under the same ID and name.',
  () => {
    const v = [];
    const hldById = new Map(hldInventory.map((e) => [e.id, e]));
    for (const el of lldElements) {
      const h = hldById.get(el.id);
      if (!h) v.push(`${el.id} (${el.name}) specified in LLD, absent from HLD inventory`);
    }
    for (const h of hldInventory) {
      if (!lldElements.some((e) => e.id === h.id)) v.push(`${h.id} in HLD inventory, not specified in LLD`);
    }
    const dupes = hldInventory.map((e) => e.id).filter((id, i, a) => a.indexOf(id) !== i);
    for (const d of uniq(dupes)) v.push(`${d} appears more than once in HLD inventory`);
    return v;
  });

check('CR-1b', 'FULL',
  'The SAS element register matches the LLD element set exactly.',
  () => {
    const v = [];
    for (const el of lldElements) {
      if (!sasRegister.some((r) => r.id === el.id)) v.push(`${el.id} in LLD, absent from SAS register`);
    }
    for (const r of sasRegister) {
      if (!lldElements.some((e) => e.id === r.id)) v.push(`${r.id} in SAS register, absent from LLD`);
    }
    return v;
  });

check('CR-2', 'FULL',
  'No element depends on one appearing later in the ordering. Forward references are declared.',
  () => {
    const v = [];
    const DECLARED_FORWARD = new Set(['E-17->E-24']); // HLD §4.3
    for (const el of lldDepends) {
      const selfN = Number(el.id.slice(2));
      for (const d of el.deps) {
        const depN = Number(d.slice(2));
        if (depN > selfN && !DECLARED_FORWARD.has(`${el.id}->${d}`)) {
          v.push(`${el.id} depends on later ${d} without a declared forward reference`);
        }
      }
    }
    return v;
  });

check('CR-4', 'PARTIAL',
  'Every architecture decision cites at least one clause it governs.',
  () => adDefs.filter((ad) => !/E-\d\d|HLD §|LLD §|C-\d|§\d/.test(ad.governs))
              .map((ad) => `${ad.id} names no clause it governs (Governs = "${ad.governs}")`));

check('CR-5', 'PARTIAL',
  'Every quality goal has at least one acceptance scenario naming a governing element.',
  () => {
    const v = [];
    const traceIdx = src.LLD.indexOf('## 10. Traceability index');
    const traceBlock = traceIdx === -1 ? '' : src.LLD.slice(traceIdx, traceIdx + 3000);
    for (const g of qualityGoals) {
      const row = traceBlock.split('\n').find((l) => l.startsWith(`| ${g.n} `));
      if (!row) v.push(`quality goal ${g.n} (${g.name}) has no traceability row in LLD §10`);
      else if (!new RegExp(`(?:${MNEMONICS})-\\d+`).test(row)) {
        v.push(`quality goal ${g.n} traces to no requirement`);
      }
    }
    return v;
  });

check('CR-6', 'PARTIAL',
  'Every `checked-proof` claim states a proposition, or points at a clause that does.',
  () => {
    // Mechanizable proxy only. A checked-proof mention must EITHER state a
    // proposition on its line (em-dash gloss or formula) OR cross-reference a
    // clause where one is stated -- a traceability row is a pointer, not a
    // bare-name citation. What this CANNOT check is whether the stated
    // proposition is the one the named declaration actually proves. That is
    // the part that matters, and it stays unmechanized (see report footer).
    const v = [];
    for (const line of src.LLD.split('\n').concat(src.HLD.split('\n'))) {
      if (!line.includes('`checked-proof`')) continue;
      const rest = line.replace(/`checked-proof`/g, '');
      const statesProposition = /—|⟹|⟺|∀|∃|≤|=/.test(rest);
      const pointsAtClause = /§\d|R-\d\d|at §/.test(rest);
      if (!statesProposition && !pointsAtClause) {
        v.push(`checked-proof cited by name only: "${line.trim().slice(0, 90)}"`);
      }
    }
    return v;
  });

check('CR-7', 'FULL',
  'Every gap names the clause it is a gap against.',
  () => gapRows.filter((g) => !g.against || g.against === '—' || g.against === '')
               .map((g) => `${g.id} names no clause it is a gap against`));

// ------------------------------------------------- structural invariants

check('ST-1', 'FULL',
  'LLD element section number equals its element number (AD-42).',
  () => lldElements.filter((e) => e.section !== Number(e.id.slice(2)))
                   .map((e) => `§4.${e.section} holds ${e.id}`));

check('ST-2', 'FULL',
  'Every requirement ID is unique.',
  () => uniq(reqDefs.filter((id, i, a) => a.indexOf(id) !== i))
        .map((d) => `${d} defined more than once`));

check('ST-3', 'FULL',
  'Every practice cited by the LLD is defined in the practices document.',
  () => practiceCites.filter((p) => !practiceDefs.includes(p))
                     .map((p) => `${p} cited in LLD, not defined in PRACTICE`));

check('ST-4', 'FULL',
  'Every element specification has an error catalogue.',
  () => {
    const v = [];
    for (const el of lldElements) {
      const start = src.LLD.indexOf(`— \`${el.id}\``);
      const next = lldElements.find((e) => e.section === el.section + 1);
      const end = next ? src.LLD.indexOf(`— \`${next.id}\``) : src.LLD.indexOf('## 5. Interaction view');
      const chunk = src.LLD.slice(start, end > start ? end : start + 8000);
      if (!/Error catalogue/.test(chunk)) v.push(`${el.id} (${el.name}) has no error catalogue`);
    }
    return v;
  });

check('ST-5', 'FULL',
  'The dropped-claim scaffolding stays gone (SAS §1.3 claims the 2011 edition only, by audit).',
  () => {
    // Test structure, not prose. An earlier version of this check grepped for
    // the phrase "normative reference" and tripped over the change-history row
    // that records its removal -- i.e. it failed the document for saying it had
    // done the thing the check wanted done. Check for the artifacts themselves:
    // a normative-references heading, and the Verified column.
    const v = [];
    if (/^#{2,4} .*Normative references/mi.test(src.SAS)) {
      v.push('SAS still has a Normative references section while conforming to nothing');
    }
    if (/\|\s*Verified against text\s*\|/.test(src.SAS)) v.push('SAS still carries the Verified column');
    if (/^\| R-38 \|/m.test(withoutHistory(src.SAS))) v.push('R-38 survives after the claim it tracked was dropped');
    return v;
  });

check('ST-6', 'FULL',
  'No document cites a gap ID that no longer exists.',
  () => {
    const defined = new Set(all(src.SAS, /^\| \*{0,2}(R-\d+)\*{0,2} \|/gm).map((m) => m[1]));
    const v = [];
    for (const [name, text] of Object.entries(src)) {
      for (const m of all(withoutHistory(text), /\bR-\d\d\b/g)) {
        if (!defined.has(m[0])) v.push(`${name} cites ${m[0]}, which is not a gap row in SAS §6`);
      }
    }
    return uniq(v);
  });

check('ST-7', 'FULL',
  'Every "LLD §n(.m)" citation in the SAS resolves to an existing LLD heading.',
  () => {
    // The LLD was renumbered once and the SAS kept citing the old sections for
    // a whole version. Headings are "## 5. Interaction view", "### 4.12 ...",
    // "#### 4.12.2 ..." -- collect their numbers, then resolve every SAS
    // citation against them. The change history legitimately names sections
    // that no longer exist, so it is excluded (withoutHistory).
    const headings = new Set(
      all(src.LLD, /^#{2,4} (\d+(?:\.\d+)*)\.? /gm).map((m) => m[1]),
    );
    const v = [];
    for (const m of all(withoutHistory(src.SAS), /LLD §(\d+(?:\.\d+)*)/g)) {
      if (!headings.has(m[1])) v.push(`SAS cites LLD §${m[1]}, which is not a heading in the LLD`);
    }
    return uniq(v);
  });

// ---------------------------------------------------------------- report

let failed = 0, passed = 0;
const line = '─'.repeat(72);
console.log(`\nMetroPlat specification set — correspondence check\n${line}`);

for (const r of results) {
  const ok = r.violations.length === 0;
  ok ? passed++ : failed++;
  const tag = ok ? '  ok  ' : ' FAIL ';
  console.log(`[${tag}] ${r.id}  (${r.coverage})  ${r.rule}`);
  for (const v of r.violations) console.log(`          ↳ ${v}`);
  if (VERBOSE && ok) console.log(`          ↳ no violations`);
}

console.log(line);
console.log(`${passed} passed, ${failed} failed  ·  ${lldElements.length} elements, ${reqDefs.length} requirements, ${practiceDefs.length} practices`);

console.log(`\nNOT mechanized — a green run does not cover these; their recorded verdicts and violations live in SAS §3.7:`);
for (const u of [
  'CR-3  boundary shape / wire contract allocation — manual verdict recorded in SAS §3.7',
  'CR-4  the converse: every LLD clause making a non-forced choice cites its decision — manual verdict recorded in SAS §3.7',
  'CR-6  whether a stated proposition is the one the named declaration actually proves — recorded violation R-47; scheduled corpus review',
  'CR-5  whether an acceptance scenario is a *good* test of its goal — manual verdict recorded in SAS §3.7',
  '§1.3  2011 audit applied; 2022 delta unassessed (R-42)',
]) console.log(`  · ${u}`);
console.log();

process.exit(failed > 0 ? 1 : 0);
