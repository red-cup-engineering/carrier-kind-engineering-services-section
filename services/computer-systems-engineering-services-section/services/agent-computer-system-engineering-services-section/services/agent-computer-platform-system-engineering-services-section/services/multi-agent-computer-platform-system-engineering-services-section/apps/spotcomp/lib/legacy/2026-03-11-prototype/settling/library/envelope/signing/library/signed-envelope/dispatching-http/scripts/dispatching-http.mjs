// dispatching-http — signed-envelope × inbox-url → http-response.
// Side-effecting morphism: actual HTTP POST using node:http/node:https.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/dispatching-http');
const RESPONSE_SCHEMA = loadSchema('#schema/http-response');
const SIGNED_SCHEMA = loadSchema('#schema/signed-envelope');
const ENVELOPE_SCHEMA = loadSchema('#schema/envelope');
const ENTRY_SCHEMA = loadSchema('#schema/positing-entry');
const ASSERTION_SCHEMA = loadSchema('#schema/assertion');
const DENIAL_SCHEMA = loadSchema('#schema/denial');
const CONTESTATION_SCHEMA = loadSchema('#schema/contestation');
const ABSTENTION_SCHEMA = loadSchema('#schema/abstention');
const CELL_SCHEMA = loadSchema('#schema/cell');
const VALUE_SCHEMA = loadSchema('#schema/bilattice-value');
const ENTITY_SCHEMA = loadSchema('#schema/entity');
const PREDICATE_SCHEMA = loadSchema('#schema/predicate');
const TID_SCHEMA = loadSchema('#schema/transaction-id');
const CELLID_SCHEMA = loadSchema('#schema/cell-id');

const ajv = new Ajv2020({ strict: false });
(addFormats.default ?? addFormats)(ajv);
for (const s of [ENTITY_SCHEMA, PREDICATE_SCHEMA, TID_SCHEMA, CELLID_SCHEMA, VALUE_SCHEMA, CELL_SCHEMA, ENTRY_SCHEMA, ASSERTION_SCHEMA, DENIAL_SCHEMA, CONTESTATION_SCHEMA, ABSTENTION_SCHEMA, ENVELOPE_SCHEMA, SIGNED_SCHEMA, RESPONSE_SCHEMA]) {
  ajv.addSchema(s);
}
const validateInput = ajv.compile(INPUT_SCHEMA);
const validateResponse = ajv.getSchema(RESPONSE_SCHEMA.$id);

function canonicalize(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
  const keys = Object.keys(v).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(v[k])).join(',') + '}';
}

export default async function dispatchingHttp(input) {
  if (!validateInput(input)) {
    throw new TypeError(`dispatching-http: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { 'signed-envelope': signed, 'inbox-url': inboxUrl } = input;
  const timeout = input['timeout-ms'] ?? 10000;
  const url = new URL(inboxUrl);
  const isHttps = url.protocol === 'https:';
  const requester = isHttps ? httpsRequest : httpRequest;
  const payload = canonicalize(signed);

  const responseBody = await new Promise((resolve, reject) => {
    const req = requester(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload, 'utf8'),
        },
        timeout,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy(new Error(`dispatching-http: timed out after ${timeout}ms`));
    });
    req.write(payload);
    req.end();
  });

  const response = {
    status: responseBody.status,
    body: responseBody.body,
    'delivered-at': new Date().toISOString(),
    recipient: inboxUrl,
  };
  if (!validateResponse(response)) {
    throw new TypeError(`dispatching-http: output invalid: ${ajv.errorsText(validateResponse.errors)}`);
  }
  return Object.freeze(response);
}

export const schema = INPUT_SCHEMA;
