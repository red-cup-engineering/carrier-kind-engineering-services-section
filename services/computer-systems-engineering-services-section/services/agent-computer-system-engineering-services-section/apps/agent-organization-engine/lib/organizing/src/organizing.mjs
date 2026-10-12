/**
 * organizing — the social gluing node: organizing's apex.
 *
 * organizing is the social-scale reading of `governing`: the settling of an open
 * plurality of agents into one bounded, law-bearing collective. It is the Gen-2
 * (inter-agent) lift of @red-cup-engineering/animating's holographic node — but NOT a mere
 * re-skin of it. The off-diagonal carries structure the diagonal cannot, and this
 * module realizes it:
 *
 *   - The gluing is a CROSS-ARENA Mayer–Vietoris over a cover of constituents
 *     (`crossArena`). On the diagonal the cover is one agent's three faces — they
 *     cannot contest, so they glue coordination-free. Off the diagonal the cover is
 *     MANY agents, so disagreement appears — but by the corpus's cross-arena MV
 *     (cross-arena-mayer-vietoris.md) disagreement-pairs live in ker(δ) and are
 *     TOLERATED (recorded ⊤, adjudicated locally), contributing NO obstruction; the
 *     genuine obstruction is `federationOnly` = coker(diff), content no single
 *     constituent can express. So a society can be glued yet deeply contested.
 *   - `adjudicate` is the gluing act — "the receiving dual of speaking" (the corpus's
 *     act of governing) — which RECEIVES many constituent sections and decomposes
 *     their merge. This is the genuinely off-diagonal act: one agent's own faces have
 *     no adjudication sibling. By Arrow/Gibbard–Satterthwaite (social-choice.md) the
 *     consensus cost it reports can be IRREDUCIBLE — the off-diagonal is the home of
 *     coordination impossibility, which the always-gluing diagonal never meets.
 *   - the four SOCIAL-DESCENT readings mirror animating's four regime readings —
 *     `socialBecoming` → `relating` → `community` → `institution` (the intrinsic
 *     settled order). The organization is the interior bulk; `socialFactor` is the
 *     per-face act-factorization.
 *   - `assemble` makes the spiral concrete: real @red-cup-engineering/animating agents re-enter as
 *     the literal constituents of the cross-arena cover.
 *   - `federate` realizes federation = PARALLEL COMPOSITION ‖ (federation-is-parallel-
 *     composition.md): it ‖-composes constituent societies, with shared members as
 *     nominal-set NAME-PASSING (FSym(𝔸)) overlap, and reads the cross-arena MV.
 *
 * The agent base and the descent substrate are reused wholesale from
 * @red-cup-engineering/animating; the three faces are threaded, not absorbed. See
 * dev/docs/notes/2026-06-21-animating-organizing-exact-mirror.md.
 */

import { claimValue, knowledgeReading, tokenValue } from "@red-cup-engineering/signcell/cell";
import { firstCohomology } from "@red-cup-engineering/signcraft/settle";
import { settlementSignature } from "@red-cup-engineering/signcraft/settlement-signature";
import { covers } from "@red-cup-engineering/metrologic/sheaf/topology/d-frame";
import { x } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/frobenius-tqft";
import { count, magnitude, toCount } from "@red-cup-engineering/computer-data-engineering-services-section/number/exact-number";
import { hodgeDecompositionOfWeights, weightsOfEdges, graphSpectrum } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/laplacian";

import { cell } from "@red-cup-engineering/eavt-services-section/ledger/cells";
import { admitSeed, descend } from "@red-cup-engineering/animating/becoming/descending";
import { socializingFace, aggregatePreferences } from "@red-cup-engineering/socializing";
import { computingFace } from "@red-cup-engineering/computing/face";
import { eventualConsistency } from "@red-cup-engineering/computing/consensus-convergence";
import { gamingFace, reachability } from "@red-cup-engineering/gaming";

import { organizationSymmetryCarrier, organizationStanceCarrier, governanceCarrier, cohesionCarrier } from "./carriers.mjs";
import { knowledgeJoinOfCensus } from "@red-cup-engineering/computer-data-engineering-services-section/four";
// value reference so the TypeBox carriers register their $id in relating's category on import.
void organizationSymmetryCarrier;
void organizationStanceCarrier;
void governanceCarrier;
void cohesionCarrier;

/** The faces of the social boundary, in canonical order: across, inside, outside. */
const FACULTIES = ["socializing", "computing", "gaming"]         ;

const FACE_DIRECTION                                               = Object.freeze({
  socializing: "across",
  computing: "inside",
  gaming: "outside",
});

/** The provisional agentive-triad axis each Gen-2 faculty works (mirrors Gen-1). */
const FACULTY_AXIS                                                         = Object.freeze({
  socializing: "truth",
  computing: "knowledge",
  gaming: "evidence",
});

/** A three-faced social boundary input: an inter-agent membrane seed per face. */

/** Options for building an organization: its identity. */

/** The empty FOUR census — nothing told on any adjudication corner of the axis. */
const EMPTY_BELNAP                 = Object.freeze({ absurd: 0, potential: 0, active: 0, stable: 0 });

const emptyFace = (faculty         )       =>
  ({ kind: "organizing.face", faculty, direction: FACE_DIRECTION[faculty], axis: FACULTY_AXIS[faculty], cover: 0, held: 0, contested: 0, belnap: EMPTY_BELNAP, obstruction: 0, aggregate: "absurd" });

function hasContent(seed                       )                    {
  if (seed === undefined) return false;
  if (typeof seed === "string") return seed.trim() !== "";
  if (Array.isArray(seed)) return seed.length > 0;
  return false;
}


const countNamed = (section                , name        )         =>
  section.filter((entry) => knowledgeReading(entry) === name).length;

/** The members of a settled social descent: distinct agent-entities in the base. */
const memberCount = (state              )         => state.site.entities.length;

// ── the cross-arena Mayer–Vietoris (the genuinely off-diagonal gluing) ──────────

/** One constituent arena of a social cover: a named agent/society and its membrane. */

/** A cell's `subject|predicate` key. */
const cellKey = (cell                      )         =>
  `${String(cell.subject)}|${String(cell.predicate)}`;

/** Settle a membrane alone and read its settled cells as cellKey → reading-name. */
function settledReadings(utterances                             )                      {
  const readings = new Map                ();
  if (utterances.length === 0) return readings;
  for (const entry of descend(utterances).section) {
    readings.set(cellKey(entry), knowledgeReading(entry));
  }
  return readings;
}

/** The cells carrying a degree-1 cohomology generator of a membrane's settlement —
 *  the non-Scott (limit-stage) firings, the genuine H¹ obstructions to Scott-continuity. */
function h1Cells(utterances                             )              {
  if (utterances.length === 0) return new Set();
  const cohomology = firstCohomology(descend(utterances).settlement);
  return new Set(cohomology.generators.map((generator) => cellKey(generator.cell)));
}

/** The cross-arena Mayer–Vietoris decomposition of a cover into the three corpus
 *  classes (cross-arena-mayer-vietoris.md): `shared` overlap-kernel (agreements that
 *  lift free), `contested` disagreement-pairs on overlaps (ker(δ) — tolerated, no
 *  obstruction), and `federationOnly` = coker(diff) (the H¹ obstructions the merge
 *  introduces that no single constituent carries — the genuine federation-level
 *  obstruction). `nameMobility` counts members shared across ≥2 constituents (the
 *  name-passing overlap).
 *
 *  `federationOnly` is computed EXACTLY from the proved settling-cohomology
 *  (SignCraft's `firstCohomology`): the merged settlement's H¹ generators
 *  (non-Scott / limit-stage firings) whose cell is not an H¹ generator of any
 *  constituent. This respects the corpus's reading that disagreement is NOT an
 *  obstruction: a finite ⊤-conflict settles at a FINITE stage (not a limit-stage
 *  firing) so it never appears as an H¹ generator (it lives in ker(δ)); only a
 *  genuinely non-Scott-continuous composition contributes federation-only H¹. */

export function crossArena(constituents                        )             {
  const owners = new Map                (); // cellKey → how many constituents settle it
  const readings = new Map                     (); // cellKey → distinct reading-names across constituents
  const tokenOwners = new Map                (); // member token → how many constituents it appears in
  const constituentH1 = new Set        (); // cells carrying a constituent's own H¹ generator
  for (const c of constituents) {
    const settled = settledReadings(c.utterances);
    const tokens = new Set        ();
    for (const [key, name] of settled) {
      owners.set(key, (owners.get(key) ?? 0) + 1);
      const seen = readings.get(key) ?? new Set        ();
      seen.add(name);
      readings.set(key, seen);
      tokens.add(key.slice(0, key.indexOf("|")));
    }
    for (const tok of tokens) tokenOwners.set(tok, (tokenOwners.get(tok) ?? 0) + 1);
    for (const key of h1Cells(c.utterances)) constituentH1.add(key);
  }
  let shared = 0;
  let contested = 0;
  for (const [key, count] of owners) {
    if (count >= 2) (readings.get(key) .size === 1 ? shared++ : contested++);
  }
  // coker(diff), exactly: H¹ obstructions the parallel composition introduces that no
  // constituent carries alone (limit-stage firings novel to the merge).
  let federationOnly = 0;
  for (const key of h1Cells(constituents.flatMap((c) => [...c.utterances]))) {
    if (!constituentH1.has(key)) federationOnly++;
  }
  let nameMobility = 0;
  for (const [, count] of tokenOwners) if (count >= 2) nameMobility++;
  return { shared, contested, federationOnly, nameMobility };
}

/** The von Neumann cardinality of a `Natural` (its member set's size IS the number). */

/**
 * The COLLECTIVE's structural robustness, read through the substrate graph Laplacian
 * (`@red-cup-engineering/relating` analysis.laplacian). This CONSOLIDATES onto the organizing bulk the
 * consensus-robustness capability its faces expose (socializing's `spectralConsensus`, computing's
 * `spectralSociety`), lifted to the off-diagonal CONSTITUENT cover: constituents are the vertices, and
 * two are joined when they SHARE settled cells and COHERE on every shared cell (no cross-arena
 * contradiction). Then `blocs` = the connected-component count H⁰ (independent collective blocs,
 * isolated constituents counted), and `collectiveTrees` = the Matrix-Tree spanning-tree count — the
 * collective's COHESION ROBUSTNESS: `0` the collective fragments, `1` a single fragile thread of shared
 * agreement, `> 1` redundant agreement paths (resilient to losing a constituent's overlaps). The
 * federation-only H¹ obstruction (`crossArena`) is unchanged; this reads the coordination-free skeleton
 * that survives it.
 */

                                                                                     
                            

                                                             
                                                   
                                                                        

                                                                                                    

                                                                        
                             

export function collectiveRobustness(constituents                        )                       {
  const readings = constituents.map((c) => settledReadings(c.utterances));
  const edges                     = [];
  for (let left = 0; left < constituents.length; left += 1) {
    for (let right = left + 1; right < constituents.length; right += 1) {
      const a = readings[left] ;
      const b = readings[right] ;
      let shares = false;
      let contradicts = false;
      for (const [key, name] of a) {
        if (b.has(key)) { shares = true; if (b.get(key) !== name) { contradicts = true; break; } }
      }
      if (shares && !contradicts) edges.push([left, right]);
    }
  }
  const spectrum = graphSpectrum(constituents.length, edges);
  const blocs = toCount(spectrum.components);
  const collectiveTrees = toCount(magnitude(spectrum.spanningTrees));
  // equilibrium = the merged collective's settlement is harmonic ⟺ its first settling-cohomology
  // H¹ vanishes (the proven `harmonic ⟺ H¹ = 0` bridge), read off the upstream cohomology directly.
  const atEquilibrium = h1Cells(constituents.flatMap((c) => [...c.utterances])).size === 0;
  const hodge = hodgeDecompositionOfWeights(weightsOfEdges(constituents.length, edges));
  return Object.freeze({
    kind: "organizing.collective-robustness"         ,
    constituents: constituents.length,
    blocs,
    cohesive: blocs === 1,
    collectiveTrees,
    robust: collectiveTrees > 1,
    atEquilibrium,
    fragile: collectiveTrees === 1,
    derivable: toCount(hodge.exact),
    irreducible: toCount(hodge.harmonic),
  });
}

/** The non-empty faces of a boundary, each as a constituent of the social cover. */
function boundaryConstituents(input                )                {
  return FACULTIES.flatMap((faculty) => {
    const seed = input[faculty];
    return hasContent(seed) ? [{ name: faculty, utterances: descend(admitSeed(seed)).utterances }] : [];
  });
}

/** All of a boundary's faces' membrane utterances, concatenated. */
function boundaryUtterances(input                )                     {
  return boundaryConstituents(input).flatMap((c) => [...c.utterances]);
}

/** The boundary's gaming (outside/evidence) membrane — the cover gaming's face reads its arena
 *  symmetry off, so the bulk can consolidate it. Empty when the boundary has no gaming face. */
function boundaryGamingMembrane(input                )                              {
  return hasContent(input.gaming) ? descend(admitSeed(input.gaming)).utterances : [];
}

// ── face readings (threaded, not absorbed) ───────────────────────────────────────

/** The local-section reading each sibling faculty's OWN face exposes on its agentive-triad
 *  axis: the thin trio { cover, held, contested } PLUS the thick `belnap` FOUR census it is
 *  read from — read as ADJUDICATION's disciplines (the receiving-dual; content/_archive
 *  adjudication.md): ⊥ held-open / t held-for / f held-against / ⊤ held-contested. The bulk
 *  consumes both and re-types them with the face's direction/axis — no generic
 *  descend-then-count, and no longer DISCARDING the four-valued census each face computed. */

                                                              
                                 
                                                  

/** The real face reading for each faculty: call the sibling's exported face on its
 *  inter-agent membrane (a readonly UtteranceCarrier[] log) and project its trio + the
 *  canonical adjudication census. socializing reads TRUTH (≤_t, the across face), computing
 *  reads KNOWLEDGE (≤_k, the inside face), gaming reads EVIDENCE (⟨a₊,a₋⟩, the outside
 *  face). All three now expose the canonical {absurd,potential,active,stable} census
 *  directly — computing's own belnap census reads bilattice-reading's names since the
 *  FOUR-reading consolidation into metrologic's bilattice-reading, so there is no longer a
 *  separate knowledge-axis vocabulary to map here. The bulk imports the three faces (bulk
 *  → faces); the faces never import the bulk. */
const computingTrio = (face               )           => ({
  cover: face.cover,
  held: face.held,
  contested: face.contested,
  belnap: {
    absurd: face.belnap.absurd,
    potential: face.belnap.potential,
    active: face.belnap.active,
    stable: face.belnap.stable,
  },
  // computing's within-face H¹: the contested concerns — where the society's members
  // disagree (relayed to ⊤) and the inside section fails to glue coordination-free.
  obstruction: face.contested,
});

const FACE_READING                                                                                 =
  Object.freeze({
    socializing: socializingFace,
    computing: (membrane) => computingTrio(computingFace(membrane)),
    gaming: gamingFace,
  });

/** The face's collective standing — PARAMETERIZED from relating's proof-tree ∨_k math
 *  (`knowledgeJoinOfCensus`, positing/bilattice-reading): the ≤_k join over the face's
 *  whole cover, which IS adjudication's ACCUMULATION discipline (the monotone converged record;
 *  content/_archive adjudication.md) ≡ "the fixed point settling reaches is a join". The
 *  aggregation LAW lives in relating; the bulk supplies its census. Equals computing's OWN
 *  member-join `aggregate` by associativity of ∨_k. */
const aggregateOf = (belnap                )                    => knowledgeJoinOfCensus(belnap);

/** Re-type a sibling face's reading as organizing's axis-typed local section, carrying
 *  through the thick `belnap` FOUR census (adjudication's disciplines) the face read on
 *  its axis — the bulk consolidates it rather than collapsing to the thin trio. */
const asFace = (faculty         , trio          )       => ({
  kind: "organizing.face",
  faculty,
  direction: FACE_DIRECTION[faculty],
  axis: FACULTY_AXIS[faculty],
  cover: trio.cover,
  held: trio.held,
  contested: trio.contested,
  belnap: { absurd: trio.belnap.absurd, potential: trio.belnap.potential, active: trio.belnap.active, stable: trio.belnap.stable },
  obstruction: trio.obstruction,
  aggregate: aggregateOf(trio.belnap),
});

/** Read one social face from its inter-agent membrane: the sibling faculty's OWN
 *  local-section reading on its axis, re-typed into organizing's Face. */
export function faceOfMembrane(faculty         , membrane                             )       {
  if (membrane.length === 0) return emptyFace(faculty);
  return asFace(faculty, FACE_READING[faculty](membrane));
}

/** Read one social face off a settled descent state: the sibling faculty's OWN
 *  local-section reading over that state's inter-agent membrane (no generic
 *  descend-then-count). */
export function faceOf(faculty         , state              )       {
  return faceOfMembrane(faculty, state.utterances);
}

/** Settle one faculty's inter-agent membrane seed into its boundary face by calling
 *  that faculty's real face reading. An empty seed yields the empty face. */
export function face(faculty         , seed                       )       {
  if (!hasContent(seed)) return emptyFace(faculty);
  return faceOfMembrane(faculty, descend(admitSeed(seed)).utterances);
}

/** Settle the union of all faces' inter-agent membranes into the SOCIAL descent —
 *  the one settled state the society's collective readings all project. At least one
 *  face must carry content. */
export function socialUnion(input                , verb        )               {
  const utterances = boundaryUtterances(input);
  if (utterances.length === 0) throw new TypeError(`${verb}: an empty social boundary has no society to settle`);
  return descend(utterances);
}

/** Render one inter-agent membrane utterance as a `member|predicate` label. */
const memberLabel = (carrier                  )         =>
  `${String(tokenValue(carrier))}|${String(claimValue(carrier))}`;

// ── the four social-descent stage readings (Gen-2 mirror of animating's regimes) ──

/** Read the social BECOMING (stage 1): the re-entered individuals posed as a
 *  plurality in pure social potential. Gen-2 mirror of animating's `animate`. */
export function socialBecomingOf(state              , scale                          = "social")                 {
  return {
    kind: "organizing.social-becoming",
    scale,
    stage: "becoming",
    face: "animate",
    epistemic: "question",
    seed: state.utterances.map(memberLabel),
    members: memberCount(state),
    openAbove: true,
  };
}

/** Read the social DOING (stage 2): relating — the directed bonds among agents. */
export function relatingOf(state              )           {
  return {
    kind: "organizing.relating",
    scale: "social",
    stage: "doing",
    face: "agential",
    epistemic: "judgement",
    bonds: state.site.cells.length,
    agents: memberCount(state),
  };
}

/** The transindividual field's recorded held-contradiction ⊤ substrate, by the
 *  cross-arena Mayer–Vietoris decomposition (cross-arena-mayer-vietoris.md): both the
 *  WITHIN-constituent ⊤ each face adjudicates "by its own machinery" (Σ face.belnap.stable,
 *  the involution-aware ⊤ the sibling face computes — NOT the all-positive descent, which
 *  never applies negation ~) AND the cross-arena OVERLAP ⊤ on the cover (`crossArena.contested`
 *  = ker δ). "Disagreement is recorded as substrate content via the bilattice's ⊤ value when
 *  both sides assert, made visible to both constituents and to the federation." The H⁰ field
 *  carries the FULL ⊤ substrate; the federation-level `adjudication` carries only the ker(δ)
 *  overlap term. */
function heldContradiction(faces                 , constituents                        )         {
  const withinConstituent = faces.reduce((sum, f) => sum + f.belnap.stable, 0);
  const overlap = crossArena(constituents).contested;
  return withinConstituent + overlap;
}

/** Read the social WORKING (stage 3): community — the shared field (transindividual). The
 *  held-contradiction `contested` is the FULL ⊤ substrate the transindividual field records
 *  (within-constituent ⊕ cross-arena overlap; cross-arena-mayer-vietoris.md), consolidated
 *  from the constituent faces' involution-aware census — not recomputed off the all-positive
 *  descent (which applies no negation, so reads every cell potential and never records ⊤). */
export function communityOf(state              , faces                 , constituents                        )            {
  const section = state.section;
  return {
    kind: "organizing.community",
    scale: "social",
    stage: "working",
    face: "agentic",
    epistemic: "belief",
    field: section.length,
    members: memberCount(state),
    contested: heldContradiction(faces, constituents),
    transindividual: true,
  };
}

/** Read the social GOVERNING (stage 4): the institution — the intrinsic settled
 *  order (single-filtration H¹). Gen-2 mirror of animating's `individuate`. */
export function instituteOf(state              )              {
  const cohomology = firstCohomology(state.settlement);
  const cohomologyRank = cohomology.generators.length;
  return {
    kind: "organizing.institution",
    scale: "social",
    stage: "governing",
    face: "individual",
    epistemic: "knowledge",
    settled: true,
    glued: cohomologyRank === 0,
    cohomologyRank,
    field: state.section.length,
  };
}

/** social-becoming — the stage-1 social-descent reading over a boundary. */
export function socialBecoming(input                )                 {
  return socialBecomingOf(socialUnion(input, "social-becoming"));
}

/** relating — the social doing reading over a boundary: the bonds among agents. */
export function relate(input                )           {
  return relatingOf(socialUnion(input, "relate"));
}

/** community — the social working reading over a boundary: the shared field. The
 *  held-contradiction ⊤ is consolidated from the boundary's own constituent faces (the
 *  involution-aware census), so a transindividual field that holds p and ¬p records it. */
export function community(input                )            {
  return communityOf(socialUnion(input, "community"), socialFaces(input), boundaryConstituents(input));
}

/** institute — the stage-4 social-governing reading over a boundary: the settled order. */
export function institute(input                )              {
  return instituteOf(socialUnion(input, "institute"));
}

/** A leading-negation prefix on a claim — the evidence-side split (the role's polarity). */
const SYMMETRY_NEGATION = /^\s*(?:!|¬|-|not\s+|no\s+|never\s+)/i;

/** A member's ROLE: the sorted set of for/against predicate commitments it asserts across the
 *  social field (negation-aware, so an asserter and a denier of one predicate are DIFFERENT
 *  roles). Two members with the same role are STRUCTURALLY EQUIVALENT — interchangeable under
 *  the social FSym(𝔸): permuting them is an automorphism of the social structure. */
function roleOf(predicates                     )         {
  return [...predicates].sort().join("");
}

/**
 * socialSymmetryOf — the organization's SYMMETRY reading: the FSym(𝔸) structure of its
 * membership (the social-scale lift of gaming's arena symmetry groupoid Ẽ). Members are
 * partitioned into ROLES by structural equivalence (same for/against predicate commitments);
 * `interchangeable`/`roles` are the symmetry GROUPOID (members one could permute), `mobile` is
 * the name-PASSING `nameMobility` (entity-mobility across constituents) — the two distinct
 * FSym(𝔸) phenomena (federation-is-parallel-composition.md). `arenaUniform` CONSOLIDATES the
 * gaming (outside/evidence) face's own arena symmetry, which the bulk otherwise discards.
 */
export function socialSymmetryOf(state              , constituents                        , gamingMembrane                             )                       {
  const roles = new Map                     (); // member → the for/against predicates it commits
  for (const carrier of state.utterances) {
    const member = String(tokenValue(carrier));
    const raw = claimValue(carrier);
    const text = raw === false ? "false" : typeof raw === "string" ? raw.trim() : String(raw);
    const against = raw === false || SYMMETRY_NEGATION.test(text);
    const bare = against ? text.replace(SYMMETRY_NEGATION, "").trim() || text : text;
    const commitment = `${against ? "-" : "+"}${bare}`;
    const prior = roles.get(member) ?? new Set        ();
    prior.add(commitment);
    roles.set(member, prior);
  }
  // partition members by role (structural equivalence) — the orbits 𝔸/Ẽ.
  const byRole = new Map                ();
  for (const predicates of roles.values()) {
    const key = roleOf(predicates);
    byRole.set(key, (byRole.get(key) ?? 0) + 1);
  }
  let interchangeable = 0;
  for (const count of byRole.values()) if (count >= 2) interchangeable += count;
  const mobile = crossArena(constituents).nameMobility;
  const arena = gamingMembrane.length === 0 ? undefined : gamingFace(gamingMembrane).symmetry;
  return {
    kind: "organizing.symmetry",
    members: roles.size,
    roles: byRole.size,
    interchangeable,
    mobile,
    uniform: interchangeable > 0,
    arenaUniform: arena !== undefined && arena.uniform,
  };
}

/** socialSymmetry — the organization's FSym(𝔸) membership symmetry over a boundary: which
 *  members are interchangeable (structural equivalence), which are mobile (name-passing), and
 *  the gaming face's arena symmetry it consolidates. */
export function socialSymmetry(input                )                       {
  return socialSymmetryOf(socialUnion(input, "social-symmetry"), boundaryConstituents(input), boundaryGamingMembrane(input));
}

/** The boundary's socializing (across/truth) membrane — the cover its truth lean is read off. */
function boundarySocializingMembrane(input                )                              {
  return hasContent(input.socializing) ? descend(admitSeed(input.socializing)).utterances : [];
}

/** socialStance — the organization's collective STANCE over a boundary: which way the society
 *  leans on the truth order ≤_t, CONSOLIDATED from the socializing (across/truth) face's `lean`
 *  (the ∨_t truth-aggregate, negation-antitone). The Gen-2 lift of the agent's `stance`; the bulk
 *  no longer discards the socializing face's lean direction. An empty across face is uncommitted. */
export function socialStance(input                )                     {
  const membrane = boundarySocializingMembrane(input);
  const face = socializingFace(membrane);
  return {
    kind: "organizing.stance",
    lean: membrane.length === 0 ? "absurd" : face.lean,
    coordinationFree: face.leans,
  };
}

const POSITIVE_SENTIMENT = /^(?:likes?|loves?|trusts?|befriends?|admires?|supports?|allies?(?:-with)?)\b/i;
const NEGATIVE_SENTIMENT = /^(?:dislikes?|hates?|distrusts?|opposes?|fears?|rejects?|betrays?)\b/i;

/**
 * cohesion — the organization's structural balance, read at TWO nested strengths off the society's
 * SENTIMENT network (likes/trusts = +, dislikes/distrusts = − ties off the socializing membrane):
 *
 *  - `balanced` — Cartwright–Harary 1956 structural balance, the SAME signed-graph Z₂/H¹ obstruction
 *    knowing's `contextuality` reads (union–find with PARITY): balanced ⟺ the society splits into ≤2
 *    antagonistic factions. This is the agent's `coherence` (Heider balance) lifted flat to scale-2.
 *  - `clusterable` — Davis 1967 CLUSTERABILITY, the proper scale-2 GENERALIZATION: the society
 *    partitions into k internally-positive COALITIONS (the connected components of the POSITIVE
 *    subgraph) with hostility only BETWEEN them — equivalently no negative tie falls inside a
 *    coalition (no cycle with exactly one negative edge). RICHER than balance: a TRIPOLAR polity
 *    (three mutually-hostile blocs) is clusterable yet NOT 2-balanced — the multipolar coalition
 *    structure a single agent's belief graph never needs (so `cohesion` is a genuine scale-2
 *    enrichment of `coherence`, per the bulk-over-faces RICHNESS principle, not a mirror).
 *
 * `balanced ⟹ clusterable`; `frustration ≤ dissonance` always. `factions` is the coalition count
 * (positive-subgraph components), ALWAYS computed — agreeing with the Cartwright–Harary camp count on
 * balanced networks and generalizing it on clusterable-but-unbalanced ones.
 */
export function cohesion(input                )                       {
  // signed graph with PARITY (Heider balance) — the strict ≤2-faction reading.
  const parent = new Map                ();
  const parity = new Map               ();
  const members = new Set        ();
  const ensure = (x        )       => { if (!parent.has(x)) { parent.set(x, x); parity.set(x, 0); members.add(x); } };
  const find = (x        )                               => {
    let n = x; let p        = 0;
    while (parent.get(n) !== n) { p = (p ^ (parity.get(n)         ))         ; n = parent.get(n) ; }
    return { root: n, par: p };
  };
  // POSITIVE-only union–find (no parity) — the coalitions Davis clusterability partitions into. A
  // coalition is a connected component of the likes/trusts subgraph; negative ties are checked
  // AFTER all coalitions are formed, so a − tie inside one coalition is the clusterability obstruction.
  const posParent = new Map                ();
  const ensurePos = (x        )       => { if (!posParent.has(x)) posParent.set(x, x); };
  const posFind = (x        )         => { let n = x; while (posParent.get(n) !== n) n = posParent.get(n) ; return n; };
  const negativeTies                          = [];

  let ties = 0;
  let dissonance = 0;
  for (const carrier of boundarySocializingMembrane(input)) {
    const subject = String(tokenValue(carrier)).trim();
    const claim = String(claimValue(carrier)).trim();
    const match = POSITIVE_SENTIMENT.exec(claim) ?? NEGATIVE_SENTIMENT.exec(claim);
    if (match === null) continue;
    const positive = POSITIVE_SENTIMENT.test(claim);
    const target = claim.slice(match[0].length).replace(/^[\s-]+/, "").trim();
    if (subject === "" || target === "" || subject === target) continue;
    ensure(subject); ensure(target);
    ensurePos(subject); ensurePos(target);
    ties += 1;
    // Heider (parity): + ⇒ same faction, − ⇒ opposite faction.
    const want        = positive ? 0 : 1;
    const fa = find(subject); const fb = find(target);
    if (fa.root === fb.root) { if (((fa.par ^ fb.par)         ) !== want) dissonance += 1; }
    else { parent.set(fb.root, fa.root); parity.set(fb.root, ((fa.par ^ fb.par ^ want)         )); }
    // Davis (coalitions): merge positive ties into coalitions now; defer negative ties.
    if (positive) { posParent.set(posFind(subject), posFind(target)); }
    else { negativeTies.push([subject, target]); }
  }

  // a − tie inside a single coalition is a clusterability violation (an internal enmity); count them.
  let frustration = 0;
  for (const [a, b] of negativeTies) if (posFind(a) === posFind(b)) frustration += 1;
  const clusterable = frustration === 0;
  const balanced = dissonance === 0;
  // factions = the coalitions (distinct positive-subgraph roots), ALWAYS — the Davis partition that
  // agrees with the Cartwright–Harary camp count when balanced and generalizes it when not.
  const coalitions = new Set        ();
  for (const m of members) coalitions.add(posFind(m));
  return {
    kind: "organizing.cohesion",
    members: members.size,
    ties,
    balanced,
    clusterable,
    factions: coalitions.size,
    dissonance,
    frustration,
  };
}

/** The three governance dimensions: a membrane seed per dimension (any omitted). `preferences`
 *  are `voter|X>Y` ballots (deciding), `knowledge` is an `agent|claim` log (knowing), `dominance`
 *  is `winner|loser` outcomes (competing). */

/**
 * governance — the CAPSTONE consolidation: organizing reads its three faculties' impossibility-
 * escapes at once. socializing's `aggregatePreferences` (Arrow/Condorcet), computing's
 * `eventualConsistency` (FLP/CALM), and gaming's `reachability` (best-response cycles) are the SAME
 * escape — the monotone ≤_k settling has no non-trivial periodic orbit, so it converges coordination-
 * free and cycle-free, holding conflict as ⊤. `governable` is the unified guarantee (acyclic ∧
 * coordination-free ∧ reachable); `irreducible` is the total ⊤-core the three classical theorems are
 * really about. An omitted dimension contributes its trivial (no-conflict) escape.
 */
export function governance(input                 )             {
  const preferenceSeed = hasContent(input.preferences) ? input.preferences : "";
  const knowledgeMembrane = hasContent(input.knowledge) ? descend(admitSeed(input.knowledge)).utterances : [];
  const choice = aggregatePreferences(hasContent(input.preferences) ? descend(admitSeed(preferenceSeed)).utterances : []);
  const consensus = eventualConsistency(knowledgeMembrane);
  const equilibrium = reachability(hasContent(input.dominance) ? input.dominance : "");
  const socialChoice = { acyclic: choice.acyclic, contested: choice.contested, majorityCyclic: choice.majorityCyclic };
  const consensusReading = { coordinationFree: consensus.coordinationFree, converges: consensus.converges, contested: consensus.contested, flpEscaped: consensus.flpEscaped };
  const equilibriumReading = { reachable: equilibrium.reachable, bestResponseCyclic: equilibrium.bestResponseCyclic, contested: equilibrium.contested };
  return {
    kind: "organizing.governance",
    socialChoice,
    consensus: consensusReading,
    equilibrium: equilibriumReading,
    governable: socialChoice.acyclic && consensusReading.coordinationFree && equilibriumReading.reachable,
    irreducible: socialChoice.contested + consensusReading.contested + equilibriumReading.contested,
  };
}

/**
 * socialFactor — the social-scale per-face act-factorization, the Gen-2 mirror of
 * animating's `factor` and the RECEIVING dual of it (adjudication, the receiving dual
 * of speaking; content/_archive adjudication.md). It factors ONE Gen-2 face's act into
 * locution/illocution/perlocution, CONSOLIDATED from the sibling faculty's OWN face
 * reading (socializing's field consensus / computing's society relay / gaming's arena),
 * no longer FAKED with a generic descend section. The Austin/Searle three layers read
 * dually (the receiving funnel): LOCUTION = the cover RECEIVED — the membrane's
 * contributions selected into the cover (receiving dual of cell-selection); ILLOCUTION =
 * the readings HELD — the distinct valued cells held across agents (the face's `cover`);
 * PERLOCUTION = the record CONVERGED — the cells that monotonically settled into the
 * standing record (the face's `held`, the uptake the collective converges on). `belnap`
 * is the face's OWN axis-typed FOUR census (adjudication's disciplines: held-open/for/
 * against/contested), computing's knowledge-names mapped to canonical by FACE_READING.
 * The genuinely RICHER off-diagonal content of "the receiving dual" still lives in
 * `crossArena`/`adjudicate` (the multi-constituent Mayer–Vietoris); this is the per-face
 * local reading. The axis map is PROVISIONAL (session synthesis; see the design note).
 */
export function socialFactor(faculty         , state              )                      {
  const reading = FACE_READING[faculty](state.utterances);
  return {
    kind: "organizing.social-factorization",
    faculty,
    axis: FACULTY_AXIS[faculty],
    dual: "receiving",
    locution: state.utterances.length,
    illocution: reading.cover,
    perlocution: reading.held,
    belnap: { absurd: reading.belnap.absurd, potential: reading.belnap.potential, active: reading.belnap.active, stable: reading.belnap.stable },
  };
}

// ── the gluing act and the interior bulk ──────────────────────────────────────────

/** The adjudication over a cover — the receiving dual of speaking read as the
 *  cross-arena Mayer–Vietoris: `contested` disagreement (ker(δ), tolerated), `open`
 *  absence, `monotone` accumulation, and `federationOnly` = coker(diff) (the genuine
 *  obstruction; `cohomologyRank` is its rank, possibly Arrow-irreducible). */
export function adjudicationOf(state              , constituents                        )               {
  const ca = crossArena(constituents);
  const section = state.section;
  return {
    kind: "organizing.adjudication",
    contested: ca.contested,
    open: countNamed(section, "absurd"),
    monotone: true,
    federationOnly: ca.federationOnly,
    cohomologyRank: ca.federationOnly,
  };
}

// ── the telos: the collective's aperiodic reason-for-running ──────────────────────

/** The collective's dominant standing concern: the most frequent predicate among
 *  social-field cells NOT yet settled to contradiction (`stable`) — what the society
 *  is still striving toward, not what it has already brought to a held verdict. The
 *  social-union lift of `buildGoal`'s "first claim" default. */
function dominantConcern(state              )         {
  const tally = new Map                ();
  for (const entry of state.section) {
    if (knowledgeReading(entry) === "stable") continue;
    const predicate = String(entry.predicate);
    tally.set(predicate, (tally.get(predicate) ?? 0) + 1);
  }
  let concern                    ;
  let best = 0;
  for (const [predicate, count] of tally) if (count > best) { concern = predicate; best = count; }
  if (concern !== undefined) return concern;
  return state.utterances[0] === undefined ? "persist" : String(claimValue(state.utterances[0]));
}

/** The settlement filtration of a telos: a limit stage fires a non-Scott limit that no countable chain
 *  reaches (an operations loop that never closes). The telos's regime is READ OFF this filtration's closure
 *  data, never declared; it reads `aperiodic` because the closure is uncountably cofinal and not Scott-continuous. */
const telosSettlement = settlementSignature(
  Object.freeze({ kind: "relating.codomain.settlement-filtration", limitStage: true, nonScottLimitFiring: true, cofinality: "uncountable" }),
  "organizing.organization.telos",
  "organizing.organization.telos.settlement-signature",
);

/** Options for declaring a telos: who declares it, the predicate it orients toward,
 *  the reading it strives for, and the operations-loop cycles already advanced over it. */

/**
 * buildTelos — the organization's telos: the Gen-2 lift of the animating agent's
 * `goal` as its APERIODIC DUAL, not a satisfiable target. Where `buildGoal` derives a
 * finite, satisfiable goal (reading defaulting to `potential`, with a `satisfied`
 * test that halts on arrival), a telos is pinned to the aperiodic regime (κ ≥ ω₁) and
 * is structurally never satisfied — its non-arrival is the only reason the operations
 * loop runs forever ("the means change; the function does not"). So it carries no
 * `satisfied` boolean (a category error here) but a monotone `advanced` count: the
 * Scott-continuous operations-loop cycles are fibers over this aperiodic base, each
 * advancing the settling one step without reaching it. `predicate` defaults to the
 * social union's dominant unsatisfied concern (the collective's standing concern);
 * `declaredBy` keeps it auditable (an undeclared telos is malformed).
 * `goal : telos :: finite : aperiodic :: arrival : direction`.
 */
export function buildTelos(state              , options               = {})        {
  const predicate = options.predicate !== undefined && options.predicate.trim() !== "" ? options.predicate.trim() : dominantConcern(state);
  const declaredBy = options.declaredBy !== undefined && options.declaredBy.trim() !== "" ? options.declaredBy.trim() : "organization";
  return {
    kind: "organizing.organization.telos",
    predicate,
    reading: options.reading ?? "potential",
    regime: telosSettlement.regime,
    satisfiable: telosSettlement.finality !== "unattained",
    declaredBy,
    advanced: options.advanced ?? 0,
  };
}

function identityOf(options                     )         {
  return options.identity !== undefined && options.identity.trim() !== "" ? options.identity.trim() : "organization";
}

function membraneWitness(identity        , line        , index        )              {
  return cell(
    Object.freeze({
      bridge: "organizing.reseed",
      organization: identity,
    })             ,
    index === 0 ? "institution-node" : "institution-boundary",
    line,
    Object.freeze({
      witness: `organizing:institution:${identity}:${index}`,
    })             ,
  );
}

function institutionMembraneOf(identity        , constituents                        )                      {
  const node = `${identity}|institution`;
  const boundary = constituents.flatMap((constituent) => constituent.utterances.map(memberLabel));
  const seed = Object.freeze([node, ...boundary]);
  return Object.freeze({
    kind: "organizing.institution.membrane"         ,
    identity,
    node,
    seed,
    witnesses: Object.freeze(seed.map((line, index) => membraneWitness(identity, line, index))),
  })                       ;
}

/** Build the interior organization: the global section glued from its constituents,
 *  read by the cross-arena Mayer–Vietoris. `glued` is federationOnly = 0 (the genuine
 *  obstruction), NOT broken by tolerated disagreement. Carries the intrinsic order
 *  (`institution`), the gluing act (`adjudication`), and the residual `milieu`. */
function buildOrganization(
  state              ,
  faces                 ,
  constituents                        ,
  options                     ,
)               {
  const identity = identityOf(options);
  const institution = instituteOf(state);
  const adjudication = adjudicationOf(state, constituents);
  const section = state.section;
  const glued = adjudication.federationOnly === 0;
  // the associated milieu (Simondon): social-field cells not yet at the knowledge-top.
  const milieu = section.filter((entry) => knowledgeReading(entry) !== "stable").length;
  return {
    kind: "organizing.organization",
    identity,
    members: memberCount(state),
    faces: [...faces],
    glued,
    coordination: glued ? "coordination-free" : "consensus-required",
    institution,
    membrane: institutionMembraneOf(identity, constituents),
    adjudication,
    settledBelow: true,
    openAbove: true,
    milieu,
    telos: buildTelos(state, options.identity === undefined ? {} : { declaredBy: options.identity }),
  };
}

/** Settle the three social faces: each face faculty's OWN local-section reading over
 *  that face's inter-agent membrane seed (threaded from the sibling, not absorbed). */
function socialFaces(input                )         {
  return FACULTIES.map((faculty) => {
    const seed = input[faculty];
    return hasContent(seed) ? faceOfMembrane(faculty, descend(admitSeed(seed)).utterances) : emptyFace(faculty);
  });
}

/**
 * organize — the social gluing over a three-faced boundary. The cross-arena cover is
 * the non-empty faces; the organization is glued from them (federationOnly = 0 ⟺
 * coherent), with disagreement on overlaps tolerated.
 */
export function organize(input                , options                      = {})               {
  return buildOrganization(socialUnion(input, "organize"), socialFaces(input), boundaryConstituents(input), options);
}

/** The social-membrane lines a settled animating agent contributes on re-entry: its
 *  re-posing (`id|individuated`, exactly animating's `reseed` emission) and its
 *  standing concern (`id|goalPredicate`), the shared potential that bonds it to
 *  others (Simondon's transindividual field). */
function agentLines(a       )           {
  const lines = [`${a.identity}|individuated`];
  const predicate = a.goal.predicate;
  if (typeof predicate === "string" && predicate.trim() !== "") lines.push(`${a.identity}|${predicate.trim()}`);
  return lines;
}

/**
 * assemble — the concrete spiral: a plurality of real @red-cup-engineering/animating agents glued
 * into one collective, each agent a LITERAL constituent of the cross-arena cover. So
 * an animating agent is a member of organizing's social base, and the gluing is the
 * genuine multi-constituent Mayer–Vietoris over the agents (not a single merge):
 * agents agreeing on a concern lift it coordination-free, disagreement is tolerated,
 * and the federation-only content (concerns that exist only collectively) is the
 * obstruction. The re-entry is the ACROSS leg — relating, "the act one self directs
 * toward another" (relating.md) — so it populates the socializing face; the interior
 * (computing) and exterior (gaming) Gen-2 faces are mounted by their own siblings.
 */
export function assemble(agents                  , options                      = {})               {
  if (agents.length === 0) throw new TypeError("assemble: no agents to organize into a collective");
  const constituents                = agents.map((a) => ({ name: a.identity, utterances: admitSeed(agentLines(a).join("\n")) }));
  const state = descend(constituents.flatMap((c) => [...c.utterances]));
  const faces = socialFaces({ socializing: agents.flatMap(agentLines).join("\n") });
  return buildOrganization(state, faces, constituents, options);
}

/**
 * reseed — the settled organization ("settled below, open above") re-poses its
 * institution as the next-scale relating node. Byte-for-byte with animating's
 * `identity|individuated`, this emits `identity|institution`; the full witnessed
 * membrane remains on `organization.membrane` for federation composition.
 */
export function reseed(organization              )                 {
  const membrane = organization.membrane                       ;
  return {
    kind: "organizing.social-becoming",
    scale: "federation",
    stage: "becoming",
    face: "animate",
    epistemic: "question",
    seed: [membrane.node],
    members: 1,
    openAbove: true,
  };
}

/** adjudicate — the gluing act over a boundary, standalone: the cross-arena
 *  Mayer–Vietoris decomposition (contested tolerated / federationOnly obstruction). */
export function adjudicate(input                )               {
  return adjudicationOf(socialUnion(input, "adjudicate"), boundaryConstituents(input));
}

/** The corpus's coordination-cost reading carried on the projection. */

/** project — restrict the organization (the bulk) to its three social boundary views. */
export function project(organization              )                   {
  const byFaculty = (faculty         )       => {
    const found = (organization.faces                   ).find((f) => f.faculty === faculty);
    return found ?? emptyFace(faculty);
  };
  return {
    kind: "organizing.projection",
    identity: organization.identity,
    glued: organization.glued,
    coordination: organization.coordination,
    socializing: byFaculty("socializing"),
    computing: byFaculty("computing"),
    gaming: byFaculty("gaming"),
  };
}

/**
 * federate — the next scale up, realized as the corpus's PARALLEL COMPOSITION ‖
 * (federation-is-parallel-composition.md): ‖-compose a plurality of constituent
 * societies (given as their social boundaries) into one federation. Entity-mobility
 * — a member belonging to more than one constituent — is nominal-set name-passing
 * (`nameMobility`). The federated cohomology decomposes by the cross-arena
 * Mayer–Vietoris: `shared` lifts free, `contested` is tolerated (ker δ), and
 * `federationOnly` (coker diff) is the genuine federation obligation; `glued` is
 * federationOnly = 0, possibly Arrow-irreducible when not. This is genuinely richer
 * than the diagonal — one agent has no ‖ and no name-permutation symmetry.
 */

function isOrganization(input                 )                        {
  return (input                ).kind === "organizing.organization";
}

function federationConstituent(input                 , index        )              {
  if (isOrganization(input)) {
    const membrane = input.membrane                       ;
    return {
      name: input.identity,
      utterances: admitSeed(membrane.seed.join("\n")),
    };
  }
  return {
    name: `polity-${index}`,
    utterances: boundaryUtterances(input),
  };
}

export function federate(covers                            )             {
  if (covers.length === 0) throw new TypeError("federate: no constituent societies to compose into a federation");
  const constituents                = covers.map(federationConstituent);
  const allUtterances = constituents.flatMap((c) => [...c.utterances]);
  if (allUtterances.length === 0) throw new TypeError("federate: the constituent societies are empty");
  const ca = crossArena(constituents);
  const glued = ca.federationOnly === 0;
  return {
    kind: "organizing.federation",
    monoidal: "parallel-composition",
    constituents: constituents.length,
    members: memberCount(descend(allUtterances)),
    nameMobility: ca.nameMobility,
    shared: ca.shared,
    contested: ca.contested,
    federationOnly: ca.federationOnly,
    glued,
    coordination: glued ? "coordination-free" : "consensus-required",
  };
}
