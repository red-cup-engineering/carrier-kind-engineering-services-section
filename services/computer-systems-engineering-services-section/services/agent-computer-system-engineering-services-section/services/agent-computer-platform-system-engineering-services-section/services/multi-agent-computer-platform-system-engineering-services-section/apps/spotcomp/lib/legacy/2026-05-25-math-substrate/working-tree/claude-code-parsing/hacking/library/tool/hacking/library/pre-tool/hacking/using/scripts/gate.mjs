// gate — the PreToolUse gatekeeper closure-rule.
//
// Fires on every Claude Code PreToolUse hook firing. The shim at
// .claude/hooks/pre-tool-use-gate-shim.mjs passes the hook event together
// with env.MODE ('strict' | 'soft') and env.AGENT_ID (a persona-slug like
// 'in-dir-claude' / 'top-level-claude') supplied by that .claude/'s
// settings.json. The morphism:
//
//   1. Loads the persona via the persona-loader morphism.
//   2. Derives the rule list from the persona's capability-signature via
//      the rule-set-from-capability-signature morphism (data-driven —
//      hardcoded rule tables are gone).
//   3. Walks rules in order; first matching predicate wins.
//   4. For deny-with-retry (soft mode only): hashes the canonical
//      tool_input, scans pending-approval.jsonl for an unconsumed row
//      matching (agent-id, tool_name, input-hash); on match, consumes it
//      and emits an allow with the justification embedded.
//   5. Appends one decision cell to the audit log regardless of outcome.
//   6. Returns the hook-output object the shim JSON-stringifies to stdout.
//
// Backwards compat: the env var AGENT_ID may carry either the old short
// names ('in-dir' / 'top-level') or the new persona-slugs ('in-dir-claude'
// / 'top-level-claude'). Short names are mapped to their canonical persona-
// slugs at load time.
//
// Input:  per claude-code-hook-event/library/pre-tool-use/pre-tool-use.schema.json
// Output: per claude-code-hook-output/library/pre-tool-use-output/pre-tool-use-output.schema.json

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import deriveRules from '../../../../../../../../../../../../../../hacking/library/persona/hacking/library/capability-signature/hacking/deriving/scripts/derive-rules.mjs';

const INPUT_SCHEMA    = JSON.parse(readFileSync(new URL('../../../../../../../claude-code-hook-event/hacking/library/pre-tool-use/pre-tool-use.schema.json', import.meta.url), 'utf8'));
const OUTPUT_SCHEMA   = JSON.parse(readFileSync(new URL('../../../../../../../claude-code-hook-output/hacking/library/pre-tool-use-output/pre-tool-use-output.schema.json', import.meta.url), 'utf8'));
const DECISION_SCHEMA = JSON.parse(readFileSync(new URL('../hacking/library/decision/decision.schema.json', import.meta.url), 'utf8'));

const ajv = new Ajv2020({ strict: false, allowUnionTypes: true });
(addFormats.default ?? addFormats)(ajv);
const validateInput    = ajv.compile(INPUT_SCHEMA);
const validateOutput   = ajv.compile(OUTPUT_SCHEMA);
const validateDecision = ajv.compile(DECISION_SCHEMA);

const AUDIT_LOG                   = new URL('../hacking/library/decision/decision.jsonl', import.meta.url);
const PENDING_APPROVAL_LOG        = new URL('../../../../../../../../logging-justification/hacking/library/pending-approval/pending-approval.jsonl', import.meta.url);
const CAPABILITY_SIGNATURES_JSONL = new URL('../../../../../../../../../../../../../../hacking/library/persona/hacking/library/capability-signature/capability-signature.jsonl', import.meta.url);

function loadCapabilitySignature(mode) {
  const text = readFileSync(CAPABILITY_SIGNATURES_JSONL, 'utf8');
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    if (row.mode === mode) return row;
  }
  throw new Error(`gate: no capability-signature row found for mode '${mode}' in ${CAPABILITY_SIGNATURES_JSONL}`);
}

// Pre-approval freshness: a justification authorizes at most one matching
// retry within this many milliseconds.
const PRE_APPROVAL_TTL_MS = 10 * 60 * 1000;

// sha256('') — the hash stored when log-justification is called without a tool_input_hash.
// Rows carrying this hash match by tool_input_summary (path) instead of content hash,
// so log-justification can approve a write before the first attempt (no retry dance needed).
const EMPTY_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

function emitDecision(row) {
  try {
    mkdirSync(new URL('.',AUDIT_LOG), { recursive: true });
    appendFileSync(AUDIT_LOG, JSON.stringify(row) + '\n');
  } catch {}
}

function readPendingApprovals() {
  if (!existsSync(PENDING_APPROVAL_LOG)) return [];
  const rows = [];
  for (const line of readFileSync(PENDING_APPROVAL_LOG, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch {}
  }
  return rows;
}

function rewritePendingApprovals(rows) {
  mkdirSync(new URL('.',PENDING_APPROVAL_LOG), { recursive: true });
  const body = rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '');
  writeFileSync(PENDING_APPROVAL_LOG, body);
}

function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJson(value[k])).join(',') + '}';
}

function hashInput(toolInput) {
  return createHash('sha256').update(canonicalJson(toolInput ?? {})).digest('hex');
}

function summarizeInput(toolName, toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return String(toolInput ?? '');
  if (typeof toolInput.file_path === 'string') return toolInput.file_path;
  if (typeof toolInput.command === 'string') return toolInput.command.slice(0, 200);
  if (Array.isArray(toolInput.edits)) {
    return toolInput.edits.map((e) => e?.file_path).filter(Boolean).join(', ');
  }
  return JSON.stringify(toolInput).slice(0, 200);
}

function tryConsumePendingApproval({ agentId, toolName, inputHash, ruleSlug, toolInput }) {
  const rows = readPendingApprovals();
  const now = Date.now();
  const currentSummary = summarizeInput(toolName, toolInput);
  let matched = null;
  const out = rows.map((row) => {
    if (matched) return row;
    if (row.v?.['consumed-at']) return row;
    if (row.e !== agentId) return row;
    if (row.v?.tool_name !== toolName) return row;
    const rowHash = row.v?.['input-hash'];
    if (rowHash !== inputHash) {
      // Path-only fallback: rows logged without a hash (EMPTY_HASH) match by tool_input_summary.
      // This lets log-justification approve a write before the first attempt — no retry dance.
      if (rowHash !== EMPTY_HASH) return row;
      if ((row.v?.tool_input_summary ?? '') !== currentSummary) return row;
    }
    if (ruleSlug && row.v?.rule && row.v.rule !== ruleSlug) return row;
    const tWhen = Date.parse(row.t);
    if (Number.isFinite(tWhen) && now - tWhen > PRE_APPROVAL_TTL_MS) return row;
    matched = row;
    return { ...row, v: { ...row.v, 'consumed-at': new Date().toISOString() } };
  });
  if (matched) {
    rewritePendingApprovals(out);
    return matched;
  }
  return null;
}

export default function gate(input) {
  if (!validateInput(input)) {
    throw new TypeError(`gate: input is not a pre-tool-use hook event: ${ajv.errorsText(validateInput.errors)}`);
  }
  const mode = process.env.MODE;
  const agentId = process.env.AGENT_ID;
  if (mode !== 'strict' && mode !== 'soft') {
    throw new Error(`gate: env.MODE must be 'strict' or 'soft'; got ${JSON.stringify(mode)}`);
  }
  if (!agentId) {
    throw new Error(`gate: env.AGENT_ID must be set`);
  }

  // Load capability-signature for this mode from the canonical jsonl, then derive rules
  const capabilitySignature = loadCapabilitySignature(mode);
  const { rules, fallback } = deriveRules({
    'capability-signature': capabilitySignature,
    mode,
    'agent-id': agentId
  });

  const t = new Date().toISOString();

  // Walk rules; first non-null wins.
  let hit = null;
  for (const rule of rules) {
    const decision = rule.decide(input);
    if (decision) { hit = { ...decision, rule: rule.slug }; break; }
  }
  if (!hit) hit = { decision: fallback, reason: `${fallback} by default (${agentId} fallback)`, rule: null };

  let finalDecision = hit.decision;
  let finalReason = hit.reason;
  let justification = null;
  const inputHash = hashInput(input.tool_input);

  if (finalDecision === 'deny-with-retry') {
    const consumed = tryConsumePendingApproval({
      agentId, toolName: input.tool_name, inputHash, ruleSlug: hit.rule, toolInput: input.tool_input
    });
    if (consumed) {
      finalDecision = 'allow';
      justification = consumed.v?.justification ?? null;
      finalReason = `Allowed via pre-approval (rule: ${hit.rule}). Justification: ${justification}`;
    } else {
      finalDecision = 'deny';
      // Keep the rule's reason (already instructs the agent how to retry).
    }
  }

  // Emit the decision cell.
  const vPayload = {
    tool_name: input.tool_name,
    tool_input_summary: summarizeInput(input.tool_name, input.tool_input),
    decision: finalDecision,
    reason: finalReason,
    'input-hash': inputHash
  };
  if (hit.rule) vPayload.rule = hit.rule;
  if (justification) vPayload.justification = justification;

  const decisionRow = {
    e: agentId,
    a: 'gating',
    v: vPayload,
    t,
    'derived-via': 'gating'
  };
  if (validateDecision(decisionRow)) {
    emitDecision(decisionRow);
  } else {
    emitDecision({ ...decisionRow, _validation_errors: ajv.errorsText(validateDecision.errors) });
  }

  const output = Object.freeze({
    hookSpecificOutput: Object.freeze({
      hookEventName: 'PreToolUse',
      permissionDecision: finalDecision,
      permissionDecisionReason: finalReason
    })
  });
  if (!validateOutput(output)) {
    throw new TypeError(`gate: output failed validation: ${ajv.errorsText(validateOutput.errors)}`);
  }
  return output;
}
