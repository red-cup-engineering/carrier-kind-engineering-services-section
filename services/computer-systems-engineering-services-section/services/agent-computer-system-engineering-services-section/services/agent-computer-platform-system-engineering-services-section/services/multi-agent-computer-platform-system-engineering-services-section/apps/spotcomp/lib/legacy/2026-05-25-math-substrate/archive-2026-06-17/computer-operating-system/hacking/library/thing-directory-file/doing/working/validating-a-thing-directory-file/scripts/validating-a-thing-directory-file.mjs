#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, basename } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const SURFACE_FILES = new Set([
  'README.md', 'AGENTS.md', 'SOUL.md', 'HEARTBEAT.md',
  'CLAUDE.md', 'MEMORY.md', 'DREAMS.md', 'TOOLS.md', 'USER.md',
  'SKILL.md'
]);

// Diátaxis mode directories: introducing (tutorials), explaining (explanations),
// guiding (how-to guides), referencing (reference). Each is a collection
// directory holding individual mode-records as kebab-case .md files, rather
// than a single identity-file pair. Inside these directories the basename
// rule relaxes to allow any kebab-case .md file as a record.
const DIATAXIS_MODES = new Set([
  'introducing', 'explaining', 'guiding', 'referencing'
]);

const KNOWN_SUBDIRS = new Set([
  'library', 'scripts', 'examples', 'templates', 'references',
  'teaching', 'doing', 'learning',
  '.git', '.claude', '.github', '.agents', '.codex', '.openclaw',
  'node_modules', 'old-archive'
]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const GERUND_REQUIREMENT = /ing/;

export function buildAuditObject(dirPath) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  const subdirs = [];
  for (const entry of entries) {
    if (entry.isDirectory()) subdirs.push(entry.name);
    else if (entry.isFile()) files.push(entry.name);
  }
  return {
    name: basename(resolve(dirPath)),
    files: files.sort(),
    subdirs: subdirs.sort(),
    path: resolve(dirPath)
  };
}

export function validateThingDirectoryFile(dirPath) {
  const audit = buildAuditObject(dirPath);
  return validateAuditObject(audit);
}

export function validateAuditObject(audit) {
  const errors = [];

  if (!SLUG_PATTERN.test(audit.name)) {
    errors.push({
      stage: 'schema',
      rule: 'name-slug',
      message: `Directory basename "${audit.name}" is not a slug (pattern ${SLUG_PATTERN}).`
    });
  }

  const shapeOk = validate(audit);
  if (!shapeOk) {
    for (const e of validate.errors) {
      errors.push({ stage: 'schema', rule: e.keyword, message: `${e.instancePath} ${e.message}` });
    }
  }

  const { name, files, subdirs } = audit;
  const requiredIdentityFiles = [
    '_index.md',
    `${name}.md`,
    `${name}.schema.json`,
    `${name}.jsonl`
  ];
  const presentIdentityFiles = requiredIdentityFiles.filter(f => files.includes(f));

  if (presentIdentityFiles.length > 0 && presentIdentityFiles.length < requiredIdentityFiles.length) {
    const missing = requiredIdentityFiles.filter(f => !files.includes(f));
    errors.push({
      stage: 'identity',
      rule: 'all-identity-files-or-none',
      message: `Directory has ${presentIdentityFiles.length}/4 identity files; missing: ${missing.join(', ')}. A thing-directory-file must contain all four identity files (_index.md, ${name}.md, ${name}.schema.json, ${name}.jsonl) once any one of them appears.`
    });
  }

  for (const f of files) {
    if (f.endsWith('.schema.json')) {
      if (f !== `${name}.schema.json`) {
        errors.push({
          stage: 'basename',
          rule: 'schema-json-basename',
          message: `File "${f}" violates the basename rule: a .schema.json file in a thing-directory must be named ${name}.schema.json (matching the directory basename).`
        });
      }
    } else if (f.endsWith('.jsonl')) {
      if (f !== `${name}.jsonl`) {
        errors.push({
          stage: 'basename',
          rule: 'jsonl-basename',
          message: `File "${f}" violates the basename rule: a .jsonl file in a thing-directory must be named ${name}.jsonl (matching the directory basename).`
        });
      }
    } else if (f.endsWith('.md')) {
      if (f === '_index.md' || f === `${name}.md`) continue;
      if (SURFACE_FILES.has(f)) continue;
      // Diátaxis mode directories hold individual mode-records as kebab-case
      // .md files (one per explanation, tutorial, guide, reference).
      if (DIATAXIS_MODES.has(name)) {
        const fileSlug = f.replace(/\.md$/, '');
        if (SLUG_PATTERN.test(fileSlug)) continue;
      }
      errors.push({
        stage: 'basename',
        rule: 'md-basename',
        message: `File "${f}" violates the basename rule: a .md file must be ${name}.md, _index.md, or a known surface file (${[...SURFACE_FILES].join(', ')}).`
      });
    }
  }

  const isLibraryDir = name === 'library';
  for (const sub of subdirs) {
    if (KNOWN_SUBDIRS.has(sub)) continue;
    if (!SLUG_PATTERN.test(sub)) {
      errors.push({
        stage: 'subdir',
        rule: 'subdir-slug',
        message: `Subdirectory "${sub}" is not a slug (pattern ${SLUG_PATTERN}).`
      });
      continue;
    }
    if (isLibraryDir) continue;
    if (!GERUND_REQUIREMENT.test(sub)) {
      errors.push({
        stage: 'subdir',
        rule: 'subdir-gerund',
        message: `Subdirectory "${sub}" violates the subdir-naming rule: outside library/, subdirs must be one of (${[...KNOWN_SUBDIRS].join(', ')}) or a gerund-noun slug (containing 'ing') naming a transformer.`
      });
    }
  }

  return { ok: errors.length === 0, errors, audit };
}

export function projectAuditForWrite(parentDirPath, fileBasename, toolName) {
  const audit = buildAuditObject(parentDirPath);
  if (toolName === 'Write' && !audit.files.includes(fileBasename) && !audit.subdirs.includes(fileBasename)) {
    audit.files = [...audit.files, fileBasename].sort();
  }
  return audit;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dirPath = process.argv[2];
  if (!dirPath) {
    console.error('usage: validating-a-thing-directory-file.mjs <directory-path>');
    process.exit(2);
  }
  let result;
  try {
    result = validateThingDirectoryFile(dirPath);
  } catch (e) {
    console.error(`ERROR reading ${dirPath}: ${e.message}`);
    process.exit(2);
  }
  if (result.ok) {
    console.log(`OK: ${resolve(dirPath)} conforms to thing-directory-file schema`);
    process.exit(0);
  } else {
    console.error(`FAIL: ${resolve(dirPath)} violates thing-directory-file schema (${result.errors.length} error(s))`);
    for (const err of result.errors) {
      console.error(`  [${err.stage}/${err.rule}] ${err.message}`);
    }
    process.exit(1);
  }
}
