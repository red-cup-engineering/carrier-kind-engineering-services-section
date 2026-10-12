/**
 * skill-induction -- fold an agent's own WitnessJournal light cone back into invocable skills.
 *
 * The ledger is the memory medium: each successful play is witnessed as an EAVT
 * invocation row (E = agent, A = skill+locus+input, V = result, T = time). Folding
 * those records yields candidate skills. A candidate becomes acquired only when
 * its object-capability names a move the agent can actually play (`canInvoke`).
 */
import { canonical } from "@red-cup-engineering/json-services-section";
import {
  eavtRow as entry,

} from "@red-cup-engineering/eavt-services-section/row";
import { appendEavtEntries } from "@red-cup-engineering/eavt-services-section/append-eavt-entries";
import { readEavtJournal } from "@red-cup-engineering/eavt-services-section/read-eavt-journal";
import { grant, canInvoke } from "@red-cup-engineering/animating/capability";

import { act, perceive } from "./agent.mjs";
import { skill } from "./skill.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

export const SKILL_PLAY_ATTRIBUTE_KIND = "animating.skill.play";
export const SKILL_PLAY_FEED = "animating-skill-plays";

export function skillPlayWitness(observation, at) {
  const attribute = Object.freeze({
    kind: SKILL_PLAY_ATTRIBUTE_KIND,
    name: observation.name,
    locus: observation.locus,
    input: observation.input,
    ...(observation.closureKind === undefined ? {} : { closureKind: observation.closureKind }),
    ...(observation.codomain === undefined ? {} : { codomain: observation.codomain }),
  });
  const value = Object.freeze({
    ok: observation.result.ok,
    result: observation.result,
  });
  return entry({ e: observation.agent, a: jsonResource(attribute, "skill-play attribute"), v: jsonResource(value, "skill-play value"), t: at });
}

export function witnessSkillPlay(
  journalRoot,
  observation,
  at,
) {
  return appendEavtEntries({root: journalRoot, feed: SKILL_PLAY_FEED, entries: [skillPlayWitness(observation, at)], at});
}

export function readSkillPlayWitnesses(journalRoot, at) {
  return Object.freeze(readEavtJournal({root: journalRoot, feed: SKILL_PLAY_FEED, at}).map(({ entry: witnessed }) => witnessed));
}

export function candidateSkillsFromWitnessLog(
  witnessLog,
  opts = {},
) {
  const minEvidence = opts.minEvidence ?? 1;
  const groups = new Map();

  for (const row of witnessLog) {
    const play = playFromWitness(row);
    if (play === null || !play.value.ok || !play.value.result.ok) continue;
    const key = canonical({
      agent: row.e,
      name: play.attribute.name,
      locus: play.attribute.locus,
      closureKind: play.attribute.closureKind ?? "procedure",
      codomain: play.attribute.codomain ?? "SkillResult",
    });
    const present = groups.get(key);
    if (present === undefined) {
      groups.set(key, {
        attr: play.attribute,
        agent: String(row.e),
        witnessKeys: [canonical(row)],
      });
    } else {
      present.witnessKeys.push(canonical(row));
    }
  }

  const out = [];
  for (const group of groups.values()) {
    if (group.witnessKeys.length < minEvidence) continue;
    const closureKind = group.attr.closureKind ?? "procedure";
    const codomain = group.attr.codomain ?? "SkillResult";
    out.push(Object.freeze({
      kind: "animating.skill.candidate",
      skill: skill(group.attr.name, closureKind, codomain),
      agent: group.agent,
      locus: group.attr.locus,
      evidence: group.witnessKeys.length,
      capability: grant(group.agent, group.attr.locus, capabilityId(group.agent, group.attr.name, group.attr.locus)),
      witnessKeys: Object.freeze([...group.witnessKeys]),
    }));
  }
  return Object.freeze(out.sort((left, right) => left.skill.name.localeCompare(right.skill.name)));
}

export function skillEcologyTraceFromWitnessLog(
  witnessLog,
  opts,
) {
  return Object.freeze({
    kind: "animating.skill.ecology-trace",
    witnessLog: Object.freeze([...witnessLog]),
    induction: induceSkillsFromWitnessLog(witnessLog, opts),
  });
}

export function skillPracticeFromWitnessLog(witnessLog) {
  const groups = new Map();
  for (const row of witnessLog) {
    const play = playFromWitness(row);
    if (play === null) continue;
    const key = practiceKey(row, play.attribute);
    let profile = groups.get(key);
    if (profile === undefined) {
      profile = {
        agent: String(row.e),
        name: play.attribute.name,
        locus: play.attribute.locus,
        attempts: 0,
        successes: 0,
        failures: 0,
        inputs: new Set(),
      };
      groups.set(key, profile);
    }
    profile.attempts += 1;
    profile.inputs.add(canonical(play.attribute.input));
    if (play.value.ok && play.value.result.ok) profile.successes += 1;
    else profile.failures += 1;
  }

  return Object.freeze([...groups.values()].map((entry) => {
    const successRate = entry.attempts === 0 ? 0 : entry.successes / entry.attempts;
    const inputDiversity = entry.inputs.size;
    const reinforcement = entry.successes - entry.failures;
    const empowerment = Math.log2(1 + entry.successes + inputDiversity);
    const freeEnergyPressure = entry.attempts === 0 ? 0 : entry.failures / entry.attempts;
    const habitStrength = entry.attempts === 0 ? 0 : successRate * (1 - 1 / (1 + entry.attempts));
    return Object.freeze({
      kind: "animating.skill.practice",
      agent: entry.agent,
      name: entry.name,
      locus: entry.locus,
      attempts: entry.attempts,
      successes: entry.successes,
      failures: entry.failures,
      inputDiversity,
      successRate,
      reinforcement,
      empowerment,
      freeEnergyPressure,
      habitStrength,
      regime: learningRegime(entry.attempts, entry.successes, entry.failures, inputDiversity),
      option: optionPolicyOf(entry.locus, entry.successes, entry.failures),
      meadAct: meadActOf(entry.successes, entry.failures),
      semioticAxes: semioticAxesOf(inputDiversity, entry.successes, entry.failures),
      theories: practiceTheories(entry.successes, entry.failures, inputDiversity),
    });
  }).sort((left, right) => left.name.localeCompare(right.name)));
}

export function skillObstructionsFromWitnessLog(
  witnessLog,
  opts = {},
) {
  const minEvidence = opts.minEvidence ?? 1;
  const groups = new Map();
  for (const row of witnessLog) {
    const play = playFromWitness(row);
    if (play === null || (play.value.ok && play.value.result.ok)) continue;
    const errorClass = play.value.result.error?.errorClass ?? "UnexpectedState";
    const key = canonical({
      agent: row.e,
      name: play.attribute.name,
      locus: play.attribute.locus,
      errorClass,
    });
    let obstruction = groups.get(key);
    if (obstruction === undefined) {
      obstruction = {
        agent: String(row.e),
        name: play.attribute.name,
        locus: play.attribute.locus,
        errorClass,
        evidence: 0,
      };
      groups.set(key, obstruction);
    }
    obstruction.evidence += 1;
  }
  return Object.freeze([...groups.values()]
    .filter((entry) => entry.evidence >= minEvidence)
    .map((entry) => {
      const repairSkill = skill(`repair:${entry.name}:${entry.errorClass}`, "derivation", "SkillRepair");
      return Object.freeze({
        kind: "animating.skill.obstruction",
        agent: entry.agent,
        name: entry.name,
        locus: entry.locus,
        errorClass: entry.errorClass,
        evidence: entry.evidence,
        repairSkill,
        capability: grant(entry.agent, entry.locus, capabilityId(entry.agent, repairSkill.name, entry.locus)),
      });
    })
    .sort((left, right) => left.repairSkill.name.localeCompare(right.repairSkill.name)));
}

export function induceSkillsFromWitnessLog(
  witnessLog,
  opts,
) {
  const candidates = candidateSkillsFromWitnessLog(
    witnessLog,
    opts.minEvidence === undefined ? {} : { minEvidence: opts.minEvidence },
  );
  const practice = skillPracticeFromWitnessLog(witnessLog);
  const obstructions = skillObstructionsFromWitnessLog(
    witnessLog,
    opts.minObstructionEvidence === undefined ? {} : { minEvidence: opts.minObstructionEvidence },
  );
  const existing = new Set((opts.existingSkills ?? []).map((entry) => entry.name));
  const admitted = candidates.filter((candidate) => canInvoke(opts.affordances, candidate.capability));
  const rejected = candidates.filter((candidate) => !canInvoke(opts.affordances, candidate.capability));
  const acquired = admitted.filter((candidate) => !existing.has(candidate.skill.name)).map((candidate) => candidate.skill);
  const capabilities = candidates.map((candidate) => Object.freeze({
    kind: "animating.skill.capability-projection",
    skill: candidate.skill,
    capability: candidate.capability,
    invocable: canInvoke(opts.affordances, candidate.capability),
    locus: candidate.locus,
  }));
  return Object.freeze({
    kind: "animating.skill.induction",
    candidates,
    admitted: Object.freeze(admitted),
    rejected: Object.freeze(rejected),
    acquired: Object.freeze(acquired),
    practice,
    obstructions,
    capabilities: Object.freeze(capabilities),
  });
}

export function publishSkillEcology(report, opts) {
  const capabilities = report.capabilities;
  const a2aSkills = capabilities.map((entry) => Object.freeze({
    id: slug(entry.skill.name),
    name: entry.skill.name,
    description: `${entry.skill.closureKind} skill at ${entry.locus}; ${entry.invocable ? "invocable" : "blocked by capability gate"}.`,
    tags: ["animating", "skill-ecology", entry.skill.closureKind, entry.invocable ? "invocable" : "blocked"],
    examples: [entry.locus],
    inputModes: ["text/plain", "application/json"],
    outputModes: ["application/json"],
    metadata: { locus: entry.locus, skill: entry.skill },
  }));
  const openAiTools = capabilities.map((entry) => Object.freeze({
    type: "function",
    function: {
      name: openAiToolName(entry.skill.name),
      description: `${entry.skill.name}: ${entry.skill.closureKind} skill over ${entry.locus}; capability gate ${entry.invocable ? "admits" : "blocks"} invocation.`,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          input: { description: "skill input witnessed into the animating WitnessJournal play log" },
          capability: { const: entry.capability.id },
          locus: { const: entry.locus },
        },
      },
    },
  }));
  return Object.freeze({
    kind: "animating.skill.publication-surface",
    agent: opts.agent,
    capabilities,
    a2aSkills: Object.freeze(a2aSkills),
    openAiTools: Object.freeze(openAiTools),
  });
}

export function closeWitnessedSkillLoop(input) {
  const agentOptions = input.agent ?? {};
  const perceived = perceive(input.input, input.memory, agentOptions);
  const acted = act(input.input, agentOptions);
  const affordances = input.affordances.length === 0 ? acted.commitments : input.affordances;
  const inductionOptions = {
    affordances,
    ...(input.existingSkills === undefined ? {} : { existingSkills: input.existingSkills }),
    ...(input.minEvidence === undefined ? {} : { minEvidence: input.minEvidence }),
    ...(input.minObstructionEvidence === undefined ? {} : { minObstructionEvidence: input.minObstructionEvidence }),
  };
  const induction = induceSkillsFromWitnessLog(input.witnessLog, inductionOptions);
  return Object.freeze({
    kind: "animating.skill.loop",
    perceived,
    acted,
    induction,
  });
}

function playFromWitness(row) {
  if (!isSkillPlayAttribute(row.a) || !isSkillPlayValue(row.v)) return null;
  return { attribute: row.a, value: row.v };
}

function practiceKey(row, attribute) {
  return canonical({
    agent: row.e,
    name: attribute.name,
    locus: attribute.locus,
    closureKind: attribute.closureKind ?? "procedure",
    codomain: attribute.codomain ?? "SkillResult",
  });
}

function learningRegime(attempts, successes, failures, inputDiversity) {
  if (failures > successes) return "obstructed";
  if (successes >= 3 && failures === 0) return "stabilized";
  if (inputDiversity > 1 || attempts < 3) return "exploring";
  return "practicing";
}

function optionPolicyOf(locus, successes, failures) {
  return Object.freeze({
    kind: "animating.skill.option-policy",
    initiation: locus,
    termination: failures > successes ? "obstruction" : successes > 0 ? "success" : "open",
  });
}

function meadActOf(successes, failures) {
  const phases = ["impulse", "perception"];
  if (successes + failures > 0) phases.push("manipulation");
  if (successes > 0) phases.push("consummation");
  return Object.freeze(phases);
}

function semioticAxesOf(inputDiversity, successes, failures) {
  const axes = ["syntactic"];
  if (inputDiversity > 0) axes.push("semantic");
  if (successes > 0 || failures > 0) axes.push("pragmatic");
  return Object.freeze(axes);
}

function practiceTheories(successes, failures, inputDiversity) {
  const theories = [
    "sutton.options",
    "dewey.inquiry",
    "mead.act",
    "morris.semiotic",
  ];
  if (inputDiversity > 1) theories.push("diayn.diversity", "tolman.cognitive-map");
  if (successes > 0) theories.push("skinner.reinforcement", "klyubin.empowerment");
  if (failures > 0) theories.push("friston.active-inference", "cannon.homeostasis");
  return Object.freeze(theories);
}

function isSkillPlayAttribute(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value;
  const closureKind = record["closureKind"];
  return record["kind"] === SKILL_PLAY_ATTRIBUTE_KIND
    && typeof record["name"] === "string"
    && record["name"].trim() !== ""
    && typeof record["locus"] === "string"
    && record["locus"].trim() !== ""
    && (closureKind === undefined || isSkillfulWorkKind(closureKind));
}

function isSkillPlayValue(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value;
  return typeof record["ok"] === "boolean" && isSkillResult(record["result"]);
}

function isSkillResult(value) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && (value).kind === "animating.skill-result"
    && typeof (value).ok === "boolean";
}

function isSkillfulWorkKind(value) {
  return value === "inquiry" || value === "procedure" || value === "derivation" || value === "process";
}

function capabilityId(agentId, skillName, locus) {
  return `urn:cap:induced:${encodeURIComponent(agentId)}:${encodeURIComponent(skillName)}:${encodeURIComponent(locus)}`;
}

function slug(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "skill";
}

function openAiToolName(value) {
  const name = slug(value).replace(/-/g, "_");
  return /^[a-zA-Z_]/.test(name) ? name : `skill_${name}`;
}
