/**
 * actions — animating's registered operations, each a cocone leg over the relating
 * boundary.
 *
 * Every verb is registered once here as a relating `action` — a boundary morphism
 * with a declared domain/codomain. `induceSurface` over this list (in the scripts)
 * assembles the discovery apex from which CLI/OpenAPI/MCP/web are projected by the
 * one relating dispatcher; this package invents no second transport. None of the
 * domain modules binds stdin or argv — the dispatcher owns that.
 *
 * The surface is the agency descent, made callable:
 *   - `animate` — the spine: a seed → the interior agent (the perceive→act loop).
 *   - `becoming`/`doing`/`working`/`governing` — the four READINGS of the one
 *     descent at its four closure regimes, over the same seed.
 *   - `perceive`/`act` — the inbound/outbound legs of the loop.
 *   - `reseed` — the spiral re-entry (the settled individual re-posed as the next
 *     seed; the cycle is closed by the sibling `playing` faculty).
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { admitSeed, descend } from "./becoming/descending.mjs";
import {
  prehendTerm,
} from "./becoming/prehending/index.mjs";
import { animate as readBecoming } from "./becoming/animate.mjs";
import { enact as readDoing } from "./becoming/doing/enact.mjs";
import { factor } from "./becoming/doing/factoring.mjs";
import { labor as readWorking } from "./becoming/doing/working/labor.mjs";
import { individuate as readGoverning } from "./becoming/doing/working/governing/individuate.mjs";
import {
  agent,
  perceive,
  act,
  reseed,

} from "./becoming/doing/working/governing/agent.mjs";
import { glue, face, project } from "./gluing.mjs";
import { skill as buildSkill } from "./becoming/doing/working/governing/skill.mjs";

// The carrier OBJECTS (value imports): wiring them as action domain/codomain both
// supplies the `$ref` and registers the single-source carrier in relating's category
// (the relation-model-notation form; no codegen, no bare `$ref` strings).
import { faceCarrier, boundaryProjectionCarrier } from "./carriers.mjs";
import { becomingCarrier } from "./becoming/carriers.mjs";
import { doingCarrier, factorizationCarrier } from "./becoming/doing/carriers.mjs";
import { workingCarrier } from "./becoming/doing/working/carriers.mjs";
import { governingCarrier, agentCarrier, skillCarrier } from "./becoming/doing/working/governing/carriers.mjs";
import { prehensionRequestCarrier, prehensionCarrier } from "./becoming/prehending/carriers.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

/** The agency seed admission boundary (raw wire → membrane log): not a carrier, a
 *  transport schema the dispatcher decodes. */
const SEED_SCHEMA = {
  $id: "animating/agency-seed",
  title: "AgencySeed",
  description: "the membrane log the descent settles: newline-separated `token|claim` lines (string wire), or a JSON array of `[token, claim]` / `{ token, claim }` / `{ subject, predicate }` items.",
  type: ["string", "array"],
};
const seedCarrier = schemaFrom(SEED_SCHEMA);

const facultySeedCarrier = schemaFrom({
  $id: "animating/request/faculty-seed",
  title: "FacultySeedRequest",
  type: "object",
  required: ["faculty", "seed"],
  properties: {
    faculty: { enum: ["communicating", "knowing", "playing"] },
    seed: SEED_SCHEMA,
  },
});

const skillRequestCarrier = schemaFrom({
  $id: "animating/request/skill",
  title: "SkillRequest",
  type: "object",
  required: ["name", "closureKind", "codomain"],
  properties: {
    name: { type: "string" },
    closureKind: { enum: ["inquiry", "procedure", "derivation", "process"] },
    codomain: { type: "string" },
  },
});

const perceptionCarrier = schemaFrom({
  $id: "animating/request/perception",
  title: "Perception",
  type: "object",
  required: ["input"],
  properties: {
    input: SEED_SCHEMA,
    memory: SEED_SCHEMA,
  },
});

/** prehend - constitute a subject's grasp of a datum under a subjective form. */
export const prehendAction = operation({
  verb: "prehend",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Constitute a prehension: a subject grasps a datum under a subjective form.",
  description: "Domain: an animating.agent.prehension-request carrying Mark payloads for subject, datum, and subjectiveForm. Codomain: an animating.agent.prehension whose relating cell, utterance, and articulation admit the grasp into the descent.",
  domain: prehensionRequestCarrier,
  codomain: prehensionCarrier,
  runTerm: prehendTerm,
});

/** Build agent options from argv flags: `--identity`, `--goal` (predicate), `--reading`. */
function optionsFromArgs(args) {
  const identity = typeof args["identity"] === "string" && args["identity"].trim() !== "" ? args["identity"].trim() : undefined;
  const goalPredicate = typeof args["goal"] === "string" && args["goal"].trim() !== "" ? args["goal"].trim() : undefined;
  const goalReading = args["reading"];
  const goal =
    goalPredicate === undefined && goalReading === undefined
      ? undefined
      : {
          ...(goalPredicate === undefined ? {} : { predicate: goalPredicate }),
          ...(goalReading === "absurd" || goalReading === "potential" || goalReading === "active" || goalReading === "stable"
            ? { reading: goalReading }
            : {}),
        };
  return {
    ...(identity === undefined ? {} : { identity }),
    ...(goal === undefined ? {} : { goal }),
  };
}

/** A descent-reading action: a seed → one stage carrier of the single descent. */
function stageAction(verb, codomain, summary, read, label) {
  return operation({
    verb,
    inputFormat: "string",
    outputFormat: "json",
    summary,
    description: `Domain: an agency seed (string wire \`token|claim\` lines, or a JSON array of seed items). Codomain: the ${label} carrier — one reading of the single relating descent articulate→predicate→posit→settle, at its regime. Derived over @red-cup-engineering/relating.`,
    domain: seedCarrier,
    codomain,
    run: (input) => jsonResource(read(descend(admitSeed(input))), label),
  });
}

/** animate — the spine: a seed → the interior agent (a perceive→act loop). */
export const animateAction = operation({
  verb: "animate",
  inputFormat: "string",
  outputFormat: "json",
  options: ["identity", "goal", "reading"],
  summary: "Animate a seed into the interior agent: run the agency descent to its glued-individual codomain.",
  description: "Domain: an agency seed (string wire `token|claim` lines, or a JSON array of seed items); --identity names the agent, --goal/--reading set its bilattice-valued target. Codomain: the interior agent — the glued individual sheaf (H¹=0) read as a perceive(input)→act(output) loop made of perception, action, and goal. Derived over @red-cup-engineering/relating.",
  domain: seedCarrier,
  codomain: agentCarrier,
  run: (input, args) => jsonResource(agent(input, optionsFromArgs(args)), "agent"),
});

/** becoming — the aperiodic / animate reading of the descent. */
export const becomingAction = stageAction(
  "becoming",
  becomingCarrier,
  "Read a seed's becoming: the aperiodic/animate reading — the agency seed in pure potential.",
  (state) => readBecoming(state),
  "becoming",
);

/** doing — the transfinite / agential reading of the descent. */
export const doingAction = stageAction(
  "doing",
  doingCarrier,
  "Read a seed's doing: the transfinite/agential reading — the bounded deed (predication base Φ).",
  (state) => readDoing(state),
  "doing",
);

/** working — the Scott-continuous / agentic reading of the descent. */
export const workingAction = stageAction(
  "working",
  workingCarrier,
  "Read a seed's working: the Scott-continuous/agentic reading — the valued presheaf over a shared field.",
  (state) => readWorking(state),
  "working",
);

/** governing — the finite / individual reading of the descent. */
export const governingAction = stageAction(
  "governing",
  governingCarrier,
  "Read a seed's governing: the finite/individual reading — the glued sheaf (H¹=0) the agent is.",
  (state) => readGoverning(state),
  "governing",
);

/** factor — the agentive-triad act-factorization: a face's act read as locution/illocution/perlocution. */
export const factorAction = operation({
  verb: "factor",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Factor a face's act into locution/illocution/perlocution (the third reading of the descent) with its Belnap profile.",
  description: "Domain: `{ faculty, seed }` where faculty is communicating/knowing/playing and seed is its membrane. Codomain: the act-factorization — locution (cell-selection / articulate), illocution (the positing / posit), perlocution (the closure / settle), and the four-fold Belnap reading classification; `axis` is the (provisional) agentive-triad bilattice axis the faculty works.",
  domain: facultySeedCarrier,
  codomain: factorizationCarrier,
  run: (input) => {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("factor: expected a { faculty, seed } object");
    }
    const record = input;
    const faculty = record["faculty"];
    if (faculty !== "communicating" && faculty !== "knowing" && faculty !== "playing") {
      throw new TypeError("factor: faculty must be communicating, knowing, or playing");
    }
    return jsonResource(factor(faculty, descend(admitSeed(record["seed"]))), "factorization");
  },
});

/** skill — type a named unit of skillful work by its (σ, Δ) nuclear-quartet kind. */
export const skillAction = operation({
  verb: "skill",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Type a named unit of skillful work: declare its nuclear-quartet kind and read back its (σ, Δ) closures and ≤_k determination.",
  description: "Domain: `{ name, closureKind, codomain }` where closureKind is inquiry/procedure/derivation/process and codomain names the output it produces. Codomain: the typed Skill — its declared kind plus the derived meaning/execution closures and the bilattice determination reading (inquiry ⊥ absurd → process ⊤ stable). A Process is deterministic, a Procedure dispatches, a Derivation applies fixed rules to a judgment, an Inquiry explores.",
  domain: skillRequestCarrier,
  codomain: skillCarrier,
  run: (input) => {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("skill: expected a { name, closureKind, codomain } object");
    }
    const record = input;
    const closureKind = record["closureKind"];
    if (closureKind !== "inquiry" && closureKind !== "procedure" && closureKind !== "derivation" && closureKind !== "process") {
      throw new TypeError("skill: closureKind must be inquiry, procedure, derivation, or process");
    }
    const name = typeof record["name"] === "string" ? record["name"] : "skill";
    const codomain = typeof record["codomain"] === "string" ? record["codomain"] : "Output";
    return jsonResource(buildSkill(name, closureKind, codomain), "skill");
  },
});

/** perceive — the inbound loop leg: fold an input membrane into a memory and re-individuate. */
export const perceiveAction = operation({
  verb: "perceive",
  inputFormat: "json",
  outputFormat: "json",
  options: ["identity", "goal", "reading"],
  summary: "Perceive: fold an input membrane into prior memory and re-individuate the agent (the inbound leg).",
  description: "Domain: `{ input, memory? }` where each is an agency seed (a `token|claim` string or array of seed items); memory threads the append-only prior membrane. Codomain: the re-individuated interior agent. With empty memory it is `animate` over the input.",
  domain: perceptionCarrier,
  codomain: agentCarrier,
  run: (input, args) => {
    const options = optionsFromArgs(args);
    if (input !== null && typeof input === "object" && !Array.isArray(input) && "input" in input) {
      const record = input;
      return jsonResource(perceive(record["input"], record["memory"], options), "agent");
    }
    return jsonResource(perceive(input, undefined, options), "agent");
  },
});

/** act — the outbound loop leg: the open cells at the agent's membrane it commits to act on. */
export const actAction = operation({
  verb: "act",
  inputFormat: "string",
  outputFormat: "json",
  options: ["identity", "goal", "reading"],
  summary: "Act: the open cells at the agent's outbound membrane it commits to act on (the outbound leg).",
  description: "Domain: an agency seed (string wire `token|claim` lines, or a JSON array of seed items). Codomain: the act output — the agent's identity, its Player-side polarity (send/actuate), and the open (stable or absurd) cells it commits to, rendered.",
  domain: seedCarrier,
  codomain: agentCarrier,
  run: (input, args) => jsonResource(act(input, optionsFromArgs(args)), "act"),
});

/** reseed — the spiral re-entry: the settled individual re-posed as the next-scale seed. */
export const reseedAction = operation({
  verb: "reseed",
  inputFormat: "string",
  outputFormat: "json",
  options: ["identity", "goal", "reading"],
  summary: "Reseed: re-pose the settled individual ('settled below, open above') as the next-scale becoming seed.",
  description: "Domain: an agency seed (string wire `token|claim` lines, or a JSON array of seed items). Codomain: a fresh becoming carrier whose seed is the settled individual re-posed (individual → relating → community). The spiral is closed by the sibling `playing` faculty; this provides the re-seed it closes over.",
  domain: seedCarrier,
  codomain: becomingCarrier,
  run: (input, args) => jsonResource(reseed(input, optionsFromArgs(args)), "becoming"),
});

/** A three-faced boundary schema: a membrane seed per face (any face may be empty). */
const GLUING_SCHEMA = {
  $id: "animating/boundary",
  title: "Boundary",
  type: "object",
  description: "the three boundary faces of animating: a membrane seed per faculty (communicating across, knowing inside, playing outside); any face may be omitted.",
  properties: { communicating: SEED_SCHEMA, knowing: SEED_SCHEMA, playing: SEED_SCHEMA },
};
const gluingCarrier = schemaFrom(GLUING_SCHEMA);

/** glue — the holographic gluing node: three boundary faces → the interior agent. */
export const glueAction = operation({
  verb: "glue",
  inputFormat: "json",
  outputFormat: "json",
  options: ["identity", "goal", "reading"],
  summary: "Glue the three boundary faces (communicating/knowing/playing) into the interior agent (the global section).",
  description: "Domain: `{ communicating?, knowing?, playing? }`, a membrane seed per face. Codomain: the interior agent — the global section glued from the three local sections, its `glued` field the sheaf condition (H¹=0: the three faces agree on overlaps). animating is this gluing node, not a descent chain; the agent is the hidden bulk seen only through its three faces.",
  domain: gluingCarrier,
  codomain: agentCarrier,
  run: (input, args) => {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("glue: expected a { communicating?, knowing?, playing? } boundary object");
    }
    const record = input;
    const boundary = {
      ...(record["communicating"] === undefined ? {} : { communicating: record["communicating"] }),
      ...(record["knowing"] === undefined ? {} : { knowing: record["knowing"] }),
      ...(record["playing"] === undefined ? {} : { playing: record["playing"] }),
    };
    return jsonResource(glue(boundary, optionsFromArgs(args)), "agent");
  },
});

/** face — settle one faculty's membrane into its boundary face (a local section). */
export const faceAction = operation({
  verb: "face",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Settle one faculty's membrane into its boundary face (the local section over its cover).",
  description: "Domain: `{ faculty, seed }` where faculty is communicating/knowing/playing and seed is its membrane (a `token|claim` string or array of seed items). Codomain: the boundary face — the local section over that faculty's cover.",
  domain: facultySeedCarrier,
  codomain: faceCarrier,
  run: (input) => {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("face: expected a { faculty, seed } object");
    }
    const record = input;
    const faculty = record["faculty"];
    if (faculty !== "communicating" && faculty !== "knowing" && faculty !== "playing") {
      throw new TypeError("face: faculty must be communicating, knowing, or playing");
    }
    return jsonResource(face(faculty, record["seed"]), "face");
  },
});

/** project — restrict the agent (the bulk) to its three boundary views (holographic encoding). */
export const projectAction = operation({
  verb: "project",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Project an agent to its three boundary faces — the holographic encoding (you see the bulk only through its boundary).",
  description: "Domain: an agent carrier (the JSON `glue`/`animate` emit). Codomain: the boundary projection — the agent's communicating/knowing/playing faces, keyed; the interior bulk is never returned directly.",
  domain: agentCarrier,
  codomain: boundaryProjectionCarrier,
  run: (input) => {
    if (input === null || typeof input !== "object" || Array.isArray(input) || (input)["kind"] !== "animating.agent") {
      throw new TypeError("project: expected an agent carrier");
    }
    return jsonResource(project(input), "projection");
  },
});

/** The package's actions — the source `induceSurface` reads. The holographic gluing
 *  node (glue/face/project) is the apex; animate is the degenerate single-cover
 *  spine; the four stage readings and the loop legs are the substrate surface. */
export const actions = Object.freeze([
  prehendAction,
  glueAction,
  faceAction,
  projectAction,
  animateAction,
  skillAction,
  perceiveAction,
  actAction,
  reseedAction,
  becomingAction,
  doingAction,
  workingAction,
  governingAction,
  factorAction,
]);
