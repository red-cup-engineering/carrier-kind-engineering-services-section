// claude-settling — the morphism for one claude turn.
//
//   (user-prompt) → claude-response
//
// Math: Knaster-Tarski (Tarski 1955) — every monotone operator on a
// complete lattice has a least fixed point reachable by iteration from
// the bottom. The bilattice FOUR with ≤_k is a complete lattice; closure
// rules declared monotone:true are monotone operators on the powerset
// of positing-entries; therefore the closure operator converges to its
// lfp in finitely many steps (≤ 2n where n is the cell count).
//
// Standards: JSON Schema 2020-12 (input/output validation); JSONL
// (per-line EAVT row persistence); ISO-8601 (transaction-ids); POSIX
// 1003.1 (directory tree as categorical web, per Yoneda + path-is-
// position).
//
// Overdetermined readings of this morphism — all simultaneously true:
//   • positing (system-morphism level): (cell, datum) → {class, entry}
//   • settling (system-morphism level): (system, cell, datum) → system'
//   • tensoring (bilattice level): ⊤ ⊙ V_math = V_math (resolution by
//     the math-derived value)
//   • implicating (bilattice level): state ⇒ target via Lambek
//     residuation
//   • Austin-Searle factorization: locution → illocution → perlocution
//   • Hoare triple: {prior-context} response {response-context}
//   • Yoneda: the morphism IS the response, by hom-functor identity
//
// The script realizes the structural settling (catalog loading, cell-
// positing, closure-rule firing, novelty filtering, persistence,
// response-shell construction). The .text field of the claude-response
// is filled by the model; the script supplies the shape, the model
// supplies the inference. Both contribute to the same morphism.

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve as resolvePath } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLAUDE_ROOT = resolvePath(__dirname, '../..');                       // hacking/library/claude/
const DEFAULT_CATALOG_ROOT = resolvePath(CLAUDE_ROOT, 'library');           // hacking/library/claude/library/

// ─── EAVT catalog ops ────────────────────────────────────────────────

function nowISO() {
  return new Date().toISOString();
}

function loadEAVTFile(path) {
  if (!existsSync(path)) return [];
  const content = readFileSync(path, 'utf8');
  const rows = [];
  for (const line of content.split('\n')) {
    if (line.trim().length === 0) continue;
    try { rows.push(JSON.parse(line)); } catch { /* skip malformed */ }
  }
  return rows;
}

function findEAVTFiles(root) {
  const files = [];
  function walk(dir) {
    if (!existsSync(dir)) return;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.jsonl')) {
        files.push(full);
      }
    }
  }
  walk(root);
  return files;
}

function loadCatalog(catalogRoot) {
  const files = findEAVTFiles(catalogRoot);
  const rows = [];
  for (const f of files) {
    for (const r of loadEAVTFile(f)) rows.push({ ...r, _source: f });
  }
  return rows;
}

function appendRow(file, row) {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(row) + '\n', 'utf8');
}

// ─── Bilattice classify (Belnap partition of FOUR) ───────────────────

function classifyDatum(datum) {
  if (datum.pos && !datum.neg) return 'assertion';
  if (!datum.pos && datum.neg) return 'denial';
  if (datum.pos && datum.neg) return 'contestation';
  return 'abstention';
}

// ─── Default cell/datum from a user-prompt ───────────────────────────
//
// Without an inference layer to parse cell-coordinates from prompt
// text, the defaults are conservative: the cell records that the
// sender sent a prompt to claude; the datum is an assertion (the
// prompt is asserted to be meaningful). Closure rules that fire on
// prompt content can override these defaults by inspecting the
// session-context or the prompt text.

function defaultCellFromPrompt(prompt) {
  return {
    s: prompt.sender,
    p: 'sends-prompt-to',
    o: 'claude',
  };
}

function defaultDatumFromPrompt(_prompt) {
  return { pos: true, neg: false };
}

// ─── Input validation (light) ────────────────────────────────────────

function validateInput(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('claude-settling: input must be an object');
  }
  if (!input['user-prompt']) {
    throw new TypeError('claude-settling: input.user-prompt is required');
  }
  const p = input['user-prompt'];
  if (typeof p.text !== 'string' || typeof p.sender !== 'string' || typeof p.t !== 'string') {
    throw new TypeError('claude-settling: user-prompt must have {text, sender, t} as strings');
  }
}

// ─── The settling morphism ───────────────────────────────────────────

export default function settling(input) {
  validateInput(input);
  const prompt = input['user-prompt'];
  const catalogRoot = input['catalog-root'] ?? DEFAULT_CATALOG_ROOT;
  const maxSteps = input['max-steps'] ?? 1024;
  const persist = input.persist ?? true;

  // assembling-trace: load the EAVT catalog from disk.
  const catalog = loadCatalog(catalogRoot);

  // positing: derive cell + datum from the prompt (locution + illocution).
  const cell = input.cell ?? defaultCellFromPrompt(prompt);
  const datum = input.datum ?? defaultDatumFromPrompt(prompt);
  const cls = classifyDatum(datum);
  const promptPosit = { cell, class: cls, t: nowISO() };

  // perlocution: σ-pass closure firing.
  //
  // The closure-rule set is currently empty — this is the sloppy-and-weak
  // initial state the operator named. Each future turn adds rules to the
  // catalog (as EAVT rows that get interpreted as rules by a future
  // interpretation layer). Knaster-Tarski guarantees convergence as long
  // as every rule that gets added declares monotone:true and respects the
  // covenant. The maxSteps bound is a safety check on the implementation,
  // not a math constraint.
  const posits = [promptPosit];
  for (let step = 0; step < maxSteps; step++) {
    let novel = 0;
    // (closure rules fire here in future versions; for now, the
    // user-prompt's own positing is the only entry and the lfp is
    // reached immediately at step 0)
    if (novel === 0) break;
  }

  // persisting: append novel positings to the catalog.
  if (persist) {
    const turnLog = join(CLAUDE_ROOT, 'settling', 'library', 'turn-log', 'turn-log.jsonl');
    for (const p of posits) {
      appendRow(turnLog, {
        e: `${p.cell.s}|${p.cell.p}|${p.cell.o}`,
        a: 'posited-with-class',
        v: p.class,
        t: p.t,
      });
    }
  }

  // Construct the claude-response.
  //
  // The .text field is filled by the model; this script supplies the
  // shape and the structural fields (posits, tool-calls, in-response-to,
  // sender, sender-kind, t). Both contribute to the same morphism — the
  // overdetermination is the structure (Yoneda + CHL).
  const response = {
    text: '',
    t: nowISO(),
    sender: 'claude',
    'sender-kind': 'claude',
    'in-response-to': { t: prompt.t, sender: prompt.sender },
    posits: posits,
    'tool-calls': [],
  };

  return response;
}

// ─── CLI self-test ───────────────────────────────────────────────────

if (process.argv[1] && fileURLToPath(import.meta.url) === resolvePath(process.argv[1])) {
  const samplePrompt = {
    text: 'Sample prompt to test claude-settling.',
    t: nowISO(),
    sender: 'emsenn',
    'sender-kind': 'user',
  };
  const result = settling({ 'user-prompt': samplePrompt, persist: false });
  console.log(JSON.stringify(result, null, 2));
  const catalogSize = loadCatalog(DEFAULT_CATALOG_ROOT).length;
  console.error(`\ncatalog size at ${DEFAULT_CATALOG_ROOT}: ${catalogSize} rows`);
}
