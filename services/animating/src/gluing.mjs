/**
 * gluing — the holographic gluing node: animating's apex.
 *
 * animating is not a morphism and not a descent chain. It is a HOLOGRAPHIC BULK
 * whose boundary is the disjoint union of three typed faces — communicating
 * (across), knowing (inside), playing (outside) — and whose hidden interior is the
 * agent. This module is that node:
 *
 *   - `face` settles one faculty's membrane log into a local section over its cover
 *     (a `Face`): how the agent is seen from one side.
 *   - `glue` glues the three local sections into the interior agent — the GLOBAL
 *     SECTION over the three-cover boundary U = communicating ∪ knowing ∪ playing.
 *     The sheaf condition is the agent's `glued`: the corpus's replica
 *     Mayer–Vietoris theorem (settling-cohomology) makes this exact — the
 *     connecting map δ⁰ : H⁰(overlap) → H¹(U) vanishes iff a local section extends
 *     to a global section, so `glued` (H¹ = 0) means the three faces agree on their
 *     overlaps and the global section (the agent) exists. This is the first
 *     concrete bilattice-network-sheaf.
 *   - `project` restricts the agent back to its three boundary views — the
 *     holographic encoding. By the holographic principle (the corpus reads it at
 *     the settling regime: the interior is a projection of boundary data), you only
 *     ever see the agent through its three faces, never the bulk directly.
 *
 * H¹(U) carries the corpus's two readings of the obstruction: as an OBSTRUCTION it
 * is what cannot glue (faces disagreeing on overlaps); as a COORDINATION COST it is
 * the consensus needed to synthesize the global section — zero H¹ is a
 * coordination-free merge, non-zero H¹ requires consensus.
 * Grounding: content/_archive holographic-principle (cosmological-settlement) and the
 * proved replica-mayer-vietoris / settling-cohomology theorem.
 *
 * The three faces are THREADED, not absorbed: animating provides the face carriers
 * and the gluing; the sibling packages communicating/knowing/playing supply the
 * content over each face when mounted. The single-cover descent (./becoming …) is
 * the per-face settling SUBSTRATE this node glues over, not the shape of animating.
 * See dev/docs/notes/2026-06-21-animating-as-holographic-bulk.md.
 */
import { knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { graphSpectrum } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/laplacian";
import { magnitude, toCount } from "@red-cup-engineering/exact-number-data-service/exact-number";

import { admitSeed, descend } from "./becoming/descending.mjs";
import {
  buildAgent,
  faceOf,

} from "./becoming/doing/working/governing/agent.mjs";

/** The faces of the boundary, in canonical order: across, inside, outside. */
const FACULTIES = ["communicating", "knowing", "playing"];

const FACE_DIRECTION = Object.freeze({
  communicating: "across",
  knowing: "inside",
  playing: "outside",
});

/** The agentive-triad bilattice axis each face faculty works (the three transverse
 *  Avron axes): communicating→TRUTH, knowing→KNOWLEDGE, playing→EVIDENCE. */
const FACE_AXIS = Object.freeze({
  communicating: "truth",
  knowing: "knowledge",
  playing: "evidence",
});

/** A three-faced boundary input: a membrane seed per face (any face may be empty). */

/** The empty face of a faculty: a cover with no local section yet — nothing told on any
 *  FOUR corner of its axis (the empty Belnap census). */
function emptyFace(faculty) {
  return { kind: "animating.face", faculty, direction: FACE_DIRECTION[faculty], axis: FACE_AXIS[faculty], cover: 0, held: 0, contested: 0, belnap: { absurd: 0, potential: 0, active: 0, stable: 0 }, aggregate: "absurd", bigrade: { truth: 0, contradiction: 0, collapsed: true } };
}

/** Whether a face seed carries any membrane content. */
function hasContent(seed) {
  if (seed === undefined) return false;
  if (typeof seed === "string") return seed.trim() !== "";
  if (Array.isArray(seed)) return seed.length > 0;
  return false;
}

/** Settle one faculty's membrane seed into its boundary face (its local section).
 *  An empty seed yields the empty face. */
export function face(faculty, seed) {
  if (!hasContent(seed)) return emptyFace(faculty);
  return faceOf(faculty, descend(admitSeed(seed)));
}

/**
 * glue — the holographic gluing. Settle each faculty's membrane into its boundary
 * face, then glue the three local sections into the interior agent: the global
 * section over the union of the three covers. The agent's `glued` (H¹ = 0) is the
 * sheaf condition — the three faces agree on overlaps. At least one face must carry
 * content; an empty boundary glues no agent.
 */
export function glue(input, options = {}) {
  const faces = [];
  const utterances = [];
  for (const faculty of FACULTIES) {
    const seed = input[faculty];
    if (hasContent(seed)) {
      const state = descend(admitSeed(seed));
      faces.push(faceOf(faculty, state));
      utterances.push(...state.utterances);
    } else {
      faces.push(emptyFace(faculty));
    }
  }
  if (utterances.length === 0) throw new TypeError("glue: an empty three-faced boundary glues no agent");
  return buildAgent(descend(utterances), faces, options);
}

/** The corpus's coordination-cost reading of H¹(U) over the three-cover: a
 *  coordination-free merge (H¹ = 0) or a merge that requires consensus (H¹ > 0). */

/** The von Neumann cardinality of a `Natural` (its member set's size IS the number). */
const cellKey = (cell) => `${String(cell.subject)}|${String(cell.predicate)}`;

/** A face seed's settled cells as cellKey → reading-name (its local section over the membrane). */
function faceReadings(seed) {
  const readings = new Map();
  if (!hasContent(seed)) return readings;
  const utterances = descend(admitSeed(seed)).utterances;
  if (utterances.length === 0) return readings;
  for (const told of descend(utterances).section) readings.set(cellKey(told), knowledgeReading(told));
  return readings;
}

/**
 * The AGENT's structural coherence robustness, read through the substrate graph Laplacian
 * (`@red-cup-engineering/relating` analysis.laplacian). This CONSOLIDATES onto the animating bulk the
 * consensus-robustness capability its faculties expose (knowing's `spectralBindingOf`, communicating's
 * `discourseCohesionOf`), lifted to the three-face cover U = communicating ∪ knowing ∪ playing: the
 * present faces are the vertices, and two are joined when they SHARE settled cells and COHERE on every
 * shared cell (no cross-face contradiction). Then `blocs` = the connected-component count H⁰ (how the
 * agent's faces cluster), and `agentTrees` = the Matrix-Tree spanning-tree count — the agent's COHERENCE
 * ROBUSTNESS: `0` the faces fragment (the agent is not glued), `1` a single fragile thread of shared
 * agreement, `> 1` redundant agreement across faces (a robustly-coherent agent). This is the scale-1
 * mirror of organizing's `collectiveRobustness`; the agent's `glued` (H¹ = 0) is unchanged.
 */

/** Read an agent boundary's coherence robustness: the three-face cover's component count (H⁰) and
 *  spanning-tree robustness, through the substrate graph Laplacian. */
export function agentRobustness(input) {
  const present = FACULTIES.filter((faculty) => hasContent(input[faculty]));
  const readings = present.map((faculty) => faceReadings(input[faculty]));
  const edges = [];
  for (let left = 0; left < present.length; left += 1) {
    for (let right = left + 1; right < present.length; right += 1) {
      const a = readings[left];
      const b = readings[right];
      let shares = false;
      let contradicts = false;
      for (const [key, name] of a) {
        if (b.has(key)) { shares = true; if (b.get(key) !== name) { contradicts = true; break; } }
      }
      if (shares && !contradicts) edges.push([left, right]);
    }
  }
  const spectrum = graphSpectrum(present.length, edges);
  const blocs = toCount(spectrum.components);
  const agentTrees = toCount(magnitude(spectrum.spanningTrees));
  return Object.freeze({
    kind: "animating.agent-robustness",
    faces: present.length,
    blocs,
    coherent: blocs === 1,
    agentTrees,
    robust: agentTrees > 1,
    fragile: agentTrees === 1,
  });
}

/** The agent's three boundary faces, keyed by faculty — the holographic boundary
 *  projection (the single-source TypeBox carrier `animating/boundary-projection` in
 *  `./carriers.mts`). You see the agent only through these; the interior bulk is never
 *  returned directly (the holographic principle: the interior is a projection of
 *  boundary data). `coordination` is the Mayer–Vietoris reading of the gluing. */

/** project — restrict the agent (the bulk) to its three boundary views. */
export function project(agent) {
  const byFaculty = (faculty) => {
    const found = (agent.faces).find((f) => f.faculty === faculty);
    return found ?? emptyFace(faculty);
  };
  return {
    kind: "animating.projection",
    identity: agent.identity,
    glued: agent.glued,
    coordination: agent.glued ? "coordination-free" : "consensus-required",
    communicating: byFaculty("communicating"),
    knowing: byFaculty("knowing"),
    playing: byFaculty("playing"),
  };
}

