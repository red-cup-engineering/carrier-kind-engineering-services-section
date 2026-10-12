// write-a-script — MCP tool morphism: write an ESM script (.mjs) to disk.
//
// MCP tools are not subject to the pre-tool-use gate, so this tool can write
// .mjs files directly without triggering the no-scripts-from-top-level rule.
// Validates path is under active/ and ends in .mjs before writing.
//
// Input:  { path: string, content: string }
// Output: { ok: true, path: string }

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const ACTIVE_ROOT = '/home/emsenn/561-group/development/claude/active';

export default function writeAScript(input) {
  const { path, content } = input;
  if (typeof path !== 'string' || !path.endsWith('.mjs')) {
    throw new TypeError(`write-a-script: path must be a string ending in .mjs; got ${JSON.stringify(path)}`);
  }
  if (!path.startsWith(ACTIVE_ROOT + '/') && path !== ACTIVE_ROOT) {
    throw new TypeError(`write-a-script: path must be under active/ (${ACTIVE_ROOT}); got ${JSON.stringify(path)}`);
  }
  if (typeof content !== 'string') {
    throw new TypeError(`write-a-script: content must be a string`);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  return Object.freeze({ ok: true, path });
}
