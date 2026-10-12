// resume — the closure-rule firing at SessionStart.
//
// Per save-load-as-stab-and-portal-inclusion, the session-start resume
// morphism is the fiber-functor reindexing portal: it takes the most recent
// settled state (the rows the prior session's checkpoint closure-rule
// emitted to the closure-rule-for-session-end positing-log) and reindexes
// them along the inclusion into the new session's fiber, returning the
// joined valuation as the agent's inherited starting umwelt.
//
// The morphism's job: read positing-entry rows from the closure-rule-for-
// session-end's per-morphism JSONL log, filter to the most recent session
// that has a `closes-at` row, format the rows about that session as an
// additionalContext string Claude Code injects at session start, and emit
// a typed hookSpecificOutput object the shim can JSON-stringify directly.
//
// Failure discipline: validation failures throw TypeError per morphism
// convention; runtime failures (positing-log unreadable, no prior session)
// produce a cold-start additionalContext and a failure positing-row in the
// resume morphism's own per-morphism log so failures live in the manifold.
//
// Input:  per claude-code-hook-event/library/session-start/session-start.schema.json
// Output: per claude-code-hook-output/library/session-start-output/session-start-output.schema.json
// Side-effects: appends one positing-entry row per resume firing to
//   spotcomp/hacking/library/closure-rule-for-session-start/closure-rule-for-session-start.jsonl

import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACTIVE = __dirname.match(/^.*\/active/)[0];
const load = (p) => JSON.parse(readFileSync(p, 'utf8'));
const path = (uri) => ACTIVE + uri.replace('https://voidmath.active.development.561.group', '');

const SELF = load(resolve(__dirname, '../starting.schema.json'));
const refs = SELF['x-runtime-refs'] ?? {};

const INPUT_SCHEMA = load(path(refs.input));
const OUTPUT_SCHEMA = load(path(refs.output));

const ajv = new Ajv2020({ strict: false });
const validateInput = ajv.compile(INPUT_SCHEMA);
const validateOutput = ajv.compile(OUTPUT_SCHEMA);

const PRIOR_SESSION_LOG = path(refs.priorSessionLog);
const OWN_LOG = path(refs.ownLog);

function readRows(path) {
  if (!existsSync(path)) return [];
  const rows = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch {}
  }
  return rows;
}

function emit(row) {
  try {
    mkdirSync(dirname(OWN_LOG), { recursive: true });
    appendFileSync(OWN_LOG, JSON.stringify(row) + '\n');
  } catch {}
}

function formatPriorSession(rows, sessionEntity) {
  const lines = [];
  const close = rows.find((r) => r.e === sessionEntity && r.a === 'closes-at');
  lines.push(`<harness-context source="prior-session-checkpoint" of-prior-session-entity="${sessionEntity}" closed-at="${close?.v ?? 'unknown'}">`);

  const head = rows.find((r) => r.e === sessionEntity && r.a === 'closes-at-git-head');
  if (head) lines.push(`  prior session closed at git head: ${head.v}`);
  const branch = rows.find((r) => r.e === sessionEntity && r.a === 'closes-on-git-branch');
  if (branch) lines.push(`  prior session closed on branch: ${branch.v}`);

  const commits = rows.filter((r) => r.e === sessionEntity && r.a === 'closes-near-commit');
  if (commits.length) {
    lines.push(`  recent commits at prior session close:`);
    for (const c of commits) lines.push(`    ${c.v.sha} ${c.v.subject}`);
  }

  const changes = rows.filter((r) => r.e === sessionEntity && r.a === 'closes-with-working-tree-change');
  if (changes.length) {
    lines.push(`  working-tree changes at prior session close:`);
    for (const c of changes) lines.push(`    ${c.v}`);
  }

  const note = rows.find((r) => r.e === sessionEntity && r.a === 'closes-with-wrap-up-note');
  if (note) {
    lines.push(`  wrap-up note left for next session:`);
    for (const ln of String(note.v).split('\n')) lines.push(`    ${ln}`);
  }

  lines.push(`  view: empty (manifold cell-charge accumulation is Phase 3; only out-of-manifold facts shown above)`);
  lines.push(`</harness-context>`);
  return lines.join('\n');
}

function coldStart(reason) {
  return `<harness-context source="cold-start" reason="${reason}">SPOTCOMP harness active. ${reason}</harness-context>`;
}

export default function resume(input) {
  if (!validateInput(input)) {
    throw new TypeError(`resume: input is not a session-start hook event: ${ajv.errorsText(validateInput.errors)}`);
  }
  const sessionEntity = `claude-code-session-${input.session_id}`;
  const t = new Date().toISOString();
  emit({ e: sessionEntity, a: 'opens-at', v: t, t });

  let additionalContext;
  try {
    const rows = readRows(PRIOR_SESSION_LOG);
    // Find the most recent session that has a `closes-at` row.
    const closeRows = rows.filter((r) => r.a === 'closes-at');
    closeRows.sort((a, b) => String(b.t ?? '').localeCompare(String(a.t ?? '')));
    if (closeRows.length === 0) {
      additionalContext = coldStart('No prior session has emitted a closes-at positing; this is the first wired session or the closure-rule-for-session-end log is empty.');
    } else {
      const priorSessionEntity = closeRows[0].e;
      additionalContext = formatPriorSession(rows, priorSessionEntity);
    }
  } catch (err) {
    emit({ e: 'closure-rule-for-session-start', a: 'fails-at',
      v: { stage: 'read-prior-session-log', message: String(err?.message ?? err) }, t });
    additionalContext = coldStart(`resume morphism failed (${err.message}); cold-starting.`);
  }

  const output = Object.freeze({
    hookSpecificOutput: Object.freeze({
      hookEventName: 'SessionStart',
      additionalContext
    })
  });
  if (!validateOutput(output)) {
    throw new TypeError(`resume: output failed validation: ${ajv.errorsText(validateOutput.errors)}`);
  }
  return output;
}
