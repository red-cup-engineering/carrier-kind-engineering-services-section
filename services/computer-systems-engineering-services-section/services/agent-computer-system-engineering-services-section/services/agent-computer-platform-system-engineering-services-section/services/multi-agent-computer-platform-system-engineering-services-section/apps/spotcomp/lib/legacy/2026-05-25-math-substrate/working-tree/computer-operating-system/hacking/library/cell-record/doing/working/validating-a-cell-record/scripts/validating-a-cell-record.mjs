#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

export function validateCellRecord(record) {
  const ok = validate(record);
  return ok ? { ok: true } : { ok: false, errors: validate.errors };
}

export function validateJsonlFile(path) {
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n');
  const lineResults = [];
  let allOk = true;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch (e) {
      lineResults.push({ line: i + 1, ok: false, errors: [{ message: `JSON parse error: ${e.message}` }] });
      allOk = false;
      continue;
    }
    const result = validateCellRecord(record);
    if (!result.ok) {
      lineResults.push({ line: i + 1, ok: false, errors: result.errors });
      allOk = false;
    }
  }
  return { ok: allOk, lineResults };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: validating-a-cell-record.mjs <path-to-jsonl>');
    process.exit(2);
  }
  const result = validateJsonlFile(file);
  if (result.ok) {
    console.log(`OK: all rows in ${file} valid against cell-record.schema.json`);
    process.exit(0);
  } else {
    console.error(`FAIL: ${result.lineResults.length} invalid row(s) in ${file}`);
    for (const r of result.lineResults) {
      console.error(`  line ${r.line}: ${JSON.stringify(r.errors)}`);
    }
    process.exit(1);
  }
}
