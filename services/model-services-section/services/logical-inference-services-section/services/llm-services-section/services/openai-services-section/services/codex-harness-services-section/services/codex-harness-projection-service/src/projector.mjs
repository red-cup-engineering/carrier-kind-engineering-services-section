import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export function loadActorConfiguration(path) {
  const configuration = JSON.parse(readFileSync(path, "utf8"));
  if (configuration?.type !== "BareCedarFogCodexInVsCodeConfiguration") throw new Error("expected a Bare Cedar Fog Codex-in-VS-Code configuration");
  if (configuration.actor !== "urn:ame:bare-cedar-fog-codex") throw new Error("configuration must belong to the stable Bare Cedar Fog Codex actor");
  if (configuration.surface !== "vscode-codex") throw new Error("configuration must describe the VS Code Codex surface");
  if (configuration.projection?.template !== "projection") throw new Error("configuration must name its colocated projection template");
  if (!Array.isArray(configuration.projection.skills) || configuration.projection.skills.length === 0) throw new Error("configuration must name its projected skills");
  for (const skill of configuration.projection.skills) {
    if (!skill || typeof skill.name !== "string" || !["codex-harness-services-section", "board-of-directors"].includes(skill.owner)) throw new Error("each projected skill must name one authorized owner");
  }
  return configuration;
}

function files(root, directory = root) {
  const result = [];
  for (const name of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, name.name);
    if (name.isDirectory()) result.push(...files(root, path)); else if (name.isFile()) result.push(relative(root, path));
  }
  return result.sort();
}

function repositoryRoot(path) {
  let current = dirname(resolve(path));
  while (dirname(current) !== current) {
    if (existsSync(join(current, "lib", "emsenn"))) return current;
    current = dirname(current);
  }
  throw new Error("cannot locate repository root for actor configuration");
}
function skillSource(root, skill) {
  const sources = {
    "codex-harness-services-section": join(root, "lib/emsenn/services/561-group/services/red-cup-engineering/services/software-services-section/model-services-section/services/llm-services-section/services/openai-services-section/services/codex-harness-services-section/skills", skill.name),
    "board-of-directors": join(root, "lib/emsenn/services/561-group/services/board-of-directors/services/executive-office/services/searching-union-notebook-service/skills", skill.name),
  };
  const source = sources[skill.owner];
  if (!source || !existsSync(join(source, "SKILL.md"))) throw new Error(`projected skill source is absent: ${skill.owner}/${skill.name}`);
  return source;
}

export function projectCodexHarness({ configurationPath, target }) {
  configurationPath = resolve(configurationPath);
  const configuration = loadActorConfiguration(configurationPath);
  const root = resolve(target);
  const codex = join(root, configuration.projection?.target ?? ".codex");
  const template = join(dirname(configurationPath), configuration.projection.template);
  if (!existsSync(template)) throw new Error(`projection template is absent: ${template}`);
  rmSync(codex, { recursive: true, force: true });
  mkdirSync(codex, { recursive: true });
  cpSync(template, codex, { recursive: true, force: true });
  const skills = join(codex, "skills"); mkdirSync(skills, { recursive: true });
  for (const skill of configuration.projection.skills) cpSync(skillSource(repositoryRoot(configurationPath), skill), join(skills, skill.name), { recursive: true, force: true });
  const projected = files(codex);
  return Object.freeze({ actor: configuration.actor, target: codex, files: projected, skills: configuration.projection.skills.map(({ name, owner }) => ({ name, owner })) });
}
