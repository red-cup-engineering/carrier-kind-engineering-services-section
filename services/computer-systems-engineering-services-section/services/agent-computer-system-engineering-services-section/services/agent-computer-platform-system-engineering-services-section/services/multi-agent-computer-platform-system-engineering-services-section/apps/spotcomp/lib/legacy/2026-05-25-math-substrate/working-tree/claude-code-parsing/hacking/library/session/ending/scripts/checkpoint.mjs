// checkpoint — the closure-rule firing at SessionEnd.
//
// Per save-load-as-stab-and-portal-inclusion, the session-end checkpoint is
// the closure-operator's image restricted to settled cells. Per CLAUDE.md's
// EAVT discipline, the settled image is materialized as positing-entry rows
// in the closure-rule's per-morphism JSONL log: one row per settled fact,
// each EAVT-shaped {e, a, v, t}. The closure-rule itself is the morphism
// that produces these rows; the rows ARE the manifold's state in the cells
// each row targets.
//
// Phase 1 implementation: the closure-operator's iterate-to-LFP is not yet
// wired (Phase 3); checkpoint emits positing-entry rows about the session's
// terminal state at the granularity of facts the next session's resume
// morphism will find useful — git head, git branch, recent commits,
// working-tree changes, and any wrap-up note the operator left at
// .spotcomp/wrap-up-note.txt. Each fact becomes one row; the manifold
// (the .jsonl files) IS the state.
//
// Failure discipline: validation failures throw TypeError per the morphism
// convention. Runtime failures (git not available, write-permission denied
// on the positing-log) are logged as positing-entry rows under
// (closure-rule-for-session-end, fails-at, <stage>) so the harness's own
// failures live in the manifold and are observable from the next session's
// resume; the function then returns null rather than throwing, so the shim
// can exit 0 and the operator's session ends cleanly.
//
// Input:  per claude-code-hook-event/library/session-end/session-end.schema.json
// Output: null (SessionEnd does not emit additionalContext)
// Side-effects: appends positing-entry rows to
//   spotcomp/hacking/library/closure-rule-for-session-end/closure-rule-for-session-end.jsonl

import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACTIVE = __dirname.match(/^.*\/active/)[0];
const load = (p) => JSON.parse(readFileSync(p, 'utf8'));
const path = (uri) => ACTIVE + uri.replace('https://voidmath.active.development.561.group', '');

const SELF = load(resolve(__dirname, '../ending.schema.json'));
const refs = SELF['x-runtime-refs'] ?? {};

const INPUT_SCHEMA = load(path(refs.input));

const ajv = new Ajv2020({ strict: false });
const validateInput = ajv.compile(INPUT_SCHEMA);

const POSITING_LOG = path(refs.ownLog);
// Wrap-up sentinel: the operator can drop a one-shot note here that the
// next session's resume morphism will surface.
const WRAP_UP_PATH = '/home/emsenn/561-group/development/claude/active/.spotcomp/wrap-up-note.txt';

function gitOrEmpty(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function emit(rows) {
  try {
    mkdirSync(dirname(POSITING_LOG), { recursive: true });
    appendFileSync(POSITING_LOG, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  } catch (err) {
    // Last-resort: try to write the write-failure itself to a sibling
    // failures log. If that fails too, give up silently — the session must
    // still end cleanly.
    try {
      appendFileSync(resolve(__dirname, '../closure-rule-for-session-end.failures.jsonl'),
        JSON.stringify({ e: 'closure-rule-for-session-end', a: 'fails-at',
          v: { stage: 'append-positing-log', message: String(err?.message ?? err) },
          t: new Date().toISOString() }) + '\n');
    } catch {}
  }
}

export default function checkpoint(input) {
  if (!validateInput(input)) {
    throw new TypeError(`checkpoint: input is not a session-end hook event: ${ajv.errorsText(validateInput.errors)}`);
  }
  const sessionEntity = `claude-code-session-${input.session_id}`;
  const t = new Date().toISOString();
  const rows = [];

  // The session's terminating positing: this session ended at this moment.
  rows.push({ e: sessionEntity, a: 'closes-at', v: t, t });

  // Out-of-manifold context as one positing per fact. Each row is a cell
  // (sessionEntity, predicate, value); future sessions read these rows
  // to reconstruct what the prior session left behind.
  const gitHead = gitOrEmpty('git rev-parse --short HEAD');
  if (gitHead) rows.push({ e: sessionEntity, a: 'closes-at-git-head', v: gitHead, t });

  const gitBranch = gitOrEmpty('git rev-parse --abbrev-ref HEAD');
  if (gitBranch) rows.push({ e: sessionEntity, a: 'closes-on-git-branch', v: gitBranch, t });

  const recentCommits = gitOrEmpty('git log --oneline -10').split('\n').filter(Boolean);
  for (const commitLine of recentCommits) {
    const [sha, ...subjectParts] = commitLine.split(' ');
    rows.push({ e: sessionEntity, a: 'closes-near-commit', v: { sha, subject: subjectParts.join(' ') }, t });
  }

  const workingTreeChanges = gitOrEmpty('git status --short').split('\n').filter(Boolean);
  for (const change of workingTreeChanges) {
    rows.push({ e: sessionEntity, a: 'closes-with-working-tree-change', v: change, t });
  }

  if (existsSync(WRAP_UP_PATH)) {
    try {
      const note = readFileSync(WRAP_UP_PATH, 'utf8').trim();
      if (note) rows.push({ e: sessionEntity, a: 'closes-with-wrap-up-note', v: note, t });
    } catch (err) {
      rows.push({ e: 'closure-rule-for-session-end', a: 'fails-at',
        v: { stage: 'read-wrap-up-note', message: String(err?.message ?? err) }, t });
    }
  }

  emit(rows);
  return null;
}
