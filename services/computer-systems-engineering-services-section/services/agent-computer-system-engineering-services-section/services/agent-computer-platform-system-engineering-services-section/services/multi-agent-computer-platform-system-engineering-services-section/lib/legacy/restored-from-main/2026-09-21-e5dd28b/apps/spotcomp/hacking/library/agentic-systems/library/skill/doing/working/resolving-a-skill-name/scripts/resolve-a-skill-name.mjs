import { existsSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, resolve as resolvePath, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNameRecords, resolveSkillSlug } from './lib/names.mjs';

const SKILLS_PREFIX = 'doing/working/skills';

function slugFromPath(absPath) {
  if (!existsSync(absPath)) return null;
  const st = statSync(absPath);
  if (st.isDirectory()) return basename(absPath);
  if (st.isFile()) return basename(dirname(absPath));
  return null;
}

export default async function resolveASkillName(args = {}) {
  const { slug: slugArg, path: pathArg, check_script = true, repo_root } = args;
  const root = resolvePath(repo_root ?? process.cwd());

  let slug = slugArg;
  if (!slug && pathArg) {
    const abs = isAbsolute(pathArg) ? pathArg : resolvePath(root, pathArg);
    slug = slugFromPath(abs);
  }
  if (typeof slug !== 'string' || slug.length === 0) {
    throw new Error('slug or path: one is required');
  }

  const names = loadNameRecords(root);
  const parsed = resolveSkillSlug(slug, names);
  if (!parsed.ok) {
    return { ok: false, slug, reason: parsed.reason };
  }

  const modifierTail = slug.slice(parsed.gerund.length + 1); // includes article if any
  const result = {
    ok: true,
    slug,
    gerund: parsed.gerund,
    transformer: parsed.transformer,
    structure: parsed.structure,
    modifier_tail: modifierTail,
  };

  if (check_script) {
    const imperative = names.imperatives.get(parsed.transformer);
    if (!imperative) {
      return { ...result, ok: false, reason: `transformer ${parsed.transformer} is missing imperative for script naming` };
    }
    const expectedScript = `${imperative}-${modifierTail}.mjs`;
    const scriptPath = join(root, SKILLS_PREFIX, slug, 'scripts', expectedScript);
    const exists = existsSync(scriptPath);
    result.expected_script = `scripts/${expectedScript}`;
    result.script_exists = exists;
    if (!exists) {
      return { ...result, ok: false, reason: `expected skill script is missing: scripts/${expectedScript}` };
    }
  }

  return result;
}

if (resolvePath(fileURLToPath(import.meta.url)) === resolvePath(process.argv[1] ?? '')) {
  const args = {};
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1].replace(/-/g, '_')] = m[2];
  }
  try {
    const r = await resolveASkillName(args);
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.ok ? 0 : 1);
  } catch (err) {
    console.error(`[resolve-a-skill-name] ${err.message}`);
    process.exit(2);
  }
}
