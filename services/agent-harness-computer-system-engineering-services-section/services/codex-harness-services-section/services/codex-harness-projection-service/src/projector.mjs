import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";

/** Project source-authored office methods as context, never as operational authority. */
export function projectOfficeContext({ agencyRoot, office, target }) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(office ?? "")) throw new TypeError("a canonical office id is required");
  agencyRoot = resolve(agencyRoot);
  target = resolve(target);
  const sources = [];
  const read = file => {
    const bytes = readFileSync(join(agencyRoot, file));
    if (bytes.length > 131072) throw new Error(`office context source exceeds bound: ${file}`);
    sources.push({ path: file, sha256: createHash("sha256").update(bytes).digest("hex") });
    return bytes.toString("utf8");
  };
  const record = (pool, id) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`invalid ${pool} reference`);
    const value = JSON.parse(read(`${pool}/${id}.json`));
    if (value.id !== id) throw new Error(`mismatched ${pool} source identity`);
    return value;
  };
  const definition = record("offices", office);
  const duties = (definition["bears-duty"] ?? []).map(ref => record("duties", ref.split("/").at(-1)));
  const skills = [...new Set([...(definition["provides-skill"] ?? []), ...duties.flatMap(d => d.skills ?? [])])];
  const methods = skills.map(id => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error("invalid skill reference");
    const candidates = [`skills/${id}/SKILL.md`, `skills/${id}.md`, `skills/${id}.json`].filter(file => existsSync(join(agencyRoot, file)));
    if (candidates.length !== 1) throw new Error(`skill needs one source: ${id}`);
    return { id, text: read(candidates[0]) };
  });
  const text = [
    `# Projected office context: ${definition.name ?? office}`,
    "Generated from source records. Edit the owning office, duty or skill and project again; do not edit this output. These records describe the office and its methods. They do not grant this process runtime authority, incumbency, delegation or permission to override the current human request.",
    "## Office", JSON.stringify(definition, null, 2),
    ...duties.flatMap(d => [`## Duty: ${d.id}`, JSON.stringify(d, null, 2)]),
    ...methods.flatMap(m => [`## Skill: ${m.id}`, m.text]),
    "## Source custody", JSON.stringify({ agencyRoot, sources }, null, 2), "",
  ].join("\n\n");
  if (Buffer.byteLength(text) > 524288) throw new Error("office context exceeds bound");
  // A briefing that is already current is not rewritten: a sandboxed session may run the projector to confirm it.
  if (existsSync(target) && readFileSync(target, "utf8") === text) return Object.freeze({ office, target, duties: duties.length, skills: skills.length, sources, written: false });
  // Prepare the whole closure before replacing output; a missing method never yields a partial briefing.
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(temporary, text, { mode: 0o600 });
    renameSync(temporary, target);
  } catch (error) {
    if (!["EROFS", "EACCES", "EPERM"].includes(error?.code)) throw error;
    throw Object.assign(new Error(`office context is stale and this process cannot write ${target} (${error.code}); project it before the session starts, or bind a target the session may write`), { code: "OFFICE_CONTEXT_STALE", cause: error });
  } finally { rmSync(temporary, { force: true }); }
  return Object.freeze({ office, target, duties: duties.length, skills: skills.length, sources, written: true });
}
