// log-justification — the morphism behind the spotcomp-schema-tools MCP
// tool of the same name. The top-level Claude Code session calls it when
// the gatekeeper has emitted a deny-with-retry for a rule violation and
// asked for an explanation before the retry will be admitted. The morphism
// appends one pending-approval row to the closure-rule-for-pre-tool-use's
// pending-approval log; the gatekeeper consumes a matching row on the
// agent's retry within the freshness window.
//
// Agent-id is read from env.AGENT_ID (the same env the gatekeeper reads,
// set by the harness shim's settings.json hook command). The morphism
// refuses to write a row if AGENT_ID is unset or equals 'in-dir' — the
// explanation-gated retry mechanism is top-level-only by construction.
//
// Input:  per logging-justification.schema.json properties.input
// Output: per logging-justification.schema.json properties.output

import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (p) => JSON.parse(readFileSync(resolve(__dirname, p), 'utf8'));

const SCHEMA = load('../logging-justification.schema.json');
const PENDING_APPROVAL_SCHEMA = load(
  '../hacking/library/pending-approval/pending-approval.schema.json'
);

const ajv = new Ajv2020({ strict: false, allowUnionTypes: true });
(addFormats.default ?? addFormats)(ajv);
const validateInput = ajv.compile(SCHEMA.properties.input);
const validateOutput = ajv.compile(SCHEMA.properties.output);
const validatePending = ajv.compile(PENDING_APPROVAL_SCHEMA);

const PENDING_APPROVAL_LOG = resolve(
  __dirname,
  '../hacking/library/pending-approval/pending-approval.jsonl'
);

function appendRow(row) {
  mkdirSync(dirname(PENDING_APPROVAL_LOG), { recursive: true });
  appendFileSync(PENDING_APPROVAL_LOG, JSON.stringify(row) + '\n');
}

export default function logJustification(input) {
  if (!validateInput(input)) {
    throw new TypeError(`log-justification: ${ajv.errorsText(validateInput.errors)}`);
  }
  const agentId = process.env.AGENT_ID;
  if (!agentId) {
    throw new Error('log-justification: AGENT_ID env var is not set; the MCP server is misconfigured.');
  }
  if (agentId === 'in-dir') {
    throw new Error('log-justification: in-dir agent cannot log justifications; the explanation-gated retry mechanism is top-level-only.');
  }

  const t = new Date().toISOString();
  const inputHash = input.tool_input_hash ??
    createHash('sha256').update('').digest('hex');

  const row = {
    e: agentId,
    a: 'justifying',
    v: {
      tool_name: input.tool_name,
      'input-hash': inputHash,
      tool_input_summary: input.tool_input_summary,
      rule: input.rule,
      justification: input.justification
    },
    t
  };

  if (!validatePending(row)) {
    throw new TypeError(`log-justification: built row does not match pending-approval schema: ${ajv.errorsText(validatePending.errors)}`);
  }

  appendRow(row);

  const output = Object.freeze({ ok: true, 'pending-approval-id': t });
  if (!validateOutput(output)) {
    throw new TypeError(`log-justification: output failed validation: ${ajv.errorsText(validateOutput.errors)}`);
  }
  return output;
}
