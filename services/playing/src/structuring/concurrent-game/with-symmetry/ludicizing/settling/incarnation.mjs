/**
 * Incarnation â€” the material $|\mathbf{B}|$ of a behaviour (Girard 2001 Â§11).
 *
 * The design note (corpus, ludics/library/design) defines the *design order* â€”
 * "the poset of proper designs on $\xi_0$ ordered by set-inclusion of actions:
 * $\mathfrak{D} \le \mathfrak{D}'$ iff $\mathfrak{D} \subseteq \mathfrak{D}'$"
 * â€” and proves (same note, "Theorem: the design lattice realizes as a
 * sub-lattice of $A_p$") that this inclusion order IS the *knowledge order*
 * $\le_k$ on the predication-fiber: $\mathfrak{D} \le \mathfrak{D}'$ iff
 * $v_\mathfrak{D} \le_k v_{\mathfrak{D}'}$ pointwise.  We reuse meme-algebra's
 * `knowledgeLeqReading` verbatim for the comparison â€” the design order is not
 * reinvented, it is the apex knowledge order restricted to designs.
 *
 * Girard's **incarnation** $|\mathfrak{D}|_\mathbf{B}$ of a design in a
 * behaviour is the *material* part of $\mathfrak{D}$ â€” the sub-design actually
 * *visited* during plays of $\mathfrak{D}$ against the orthogonal
 * $\mathbf{B}^\perp$.  Loci $\mathfrak{D}$ commits at but that no counter-design
 * in $\mathbf{B}^\perp$ ever meets are inert ballast; the incarnation discards
 * them, keeping the smallest design $\le_k$-below $\mathfrak{D}$ that plays the
 * same against all of $\mathbf{B}^\perp$.  The behaviour note's interaction
 * relation supplies "visited": `interactionReport(d, E).meetings` ranges over
 * exactly the *shared* loci of a play (interaction note, `sharedAndUnionKeys`),
 * so the visited loci of $\mathfrak{D}$ are the union of meeting loci over all
 * $E \in \mathbf{B}^\perp$.
 *
 * The **incarnation of a behaviour** $|\mathbf{B}|$ is the set of incarnated
 * designs â€” the *skeleton*, the material core of the behaviour stripped of
 * ballast.  A design is **material** when it equals its own incarnation (no
 * ballast: every committed locus is visited by some counter-design).  This
 * realizes Girard's slogan that a behaviour is determined by its material
 * designs; the ballast-laden designs are recovered as the $\le_k$-upward closure.
 */
import { designReading, support, supportKeys } from "../design.mjs";
import { interactionReport } from "../../strategizing/interaction.mjs";
import { locusFromKey, locusKey } from "../locus.mjs";
import { biorthogonalClosure, orthogonalOf } from "./behaviour.mjs";
import { knowledgeLeqReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** Same membership key as `behaviour.mjs` (private there) â€” additive-safe local copy. */
const designKey = (d        )         =>
  d.entries.map((e) => `${e.locusKey}:${e.reading}`).join("|");

const inSet = (designs                   , d        )          => {
  const key = designKey(d);
  return designs.some((other) => designKey(other) === key);
};

const dedupe = (designs                   )                    => {
  const seen = new Map                ();
  for (const d of designs) seen.set(designKey(d), d);
  return Object.freeze([...seen.values()]);
};

/** Restrict a design to a chosen set of locus keys â€” its sub-design on those loci. */
const restrictTo = (d        , keepKeys                     )         =>
  Object.freeze({
    kind: "game.design"         ,
    entries: Object.freeze(d.entries.filter((e) => keepKeys.has(e.locusKey))),
  });

/**
 * The design order $\mathfrak{D} \le \mathfrak{D}'$ (design note, "The design
 * lattice") realized as the apex knowledge order (design note, "Theorem: the
 * design lattice realizes as a sub-lattice of $A_p$"): true iff at every locus
 * in either support, $v_\mathfrak{D}(\xi) \le_k v_{\mathfrak{D}'}(\xi)$.
 * Loci outside a support carry $\bot$ (`absurd`), the knowledge bottom, so the
 * check over the union of supports is exhaustive.
 */
export function designLeq(d1        , d2        )          {
  const keys = new Set        ([...supportKeys(d1), ...supportKeys(d2)]);
  for (const key of keys) {
    const xi = locusFromKey(key);
    if (!knowledgeLeqReading(designReading(d1, xi), designReading(d2, xi))) {
      return false;
    }
  }
  return true;
}

/** Witness/obstruction for the design order $\mathfrak{D} \le \mathfrak{D}'$. */
export function designLeqJudgment(d1        , d2        )                    {
  const keys = new Set        ([...supportKeys(d1), ...supportKeys(d2)]);
  for (const key of keys) {
    const xi = locusFromKey(key);
    if (!knowledgeLeqReading(designReading(d1, xi), designReading(d2, xi))) {
      return Object.freeze({
        kind: "game.design.leq-obstruction"         ,
        lesser: d1,
        greater: d2,
        locus: xi,
        reason: `reading at ${key} is not knowledge-below the greater design's`,
      });
    }
  }
  return Object.freeze({ kind: "game.design.leq:witness"         , lesser: d1, greater: d2 });
}

/**
 * The loci of `d` *visited* in plays against a set of counter-designs â€” the
 * union of meeting loci over the interactions (interaction note, the meetings
 * range over the shared/visited loci of each play).
 */
export function visitedLoci(d        , counters                   )                   {
  const seen = new Map               ();
  for (const e of counters) {
    for (const m of interactionReport(d, e).meetings) {
      seen.set(locusKey(m.locus), m.locus);
    }
  }
  return Object.freeze([...seen.values()]);
}

/**
 * The incarnation $|\mathfrak{D}|_\mathbf{B}$ of a design in the behaviour
 * generated by `set`: the sub-design of `d` on the loci visited by some
 * counter-design in $\mathbf{B}^\perp$ (Girard 2001 Â§11, the material part).
 * Ballast loci â€” committed but never met â€” are discarded.  The result is
 * $\le_k$-below `d` (it is a restriction) and plays identically against all of
 * $\mathbf{B}^\perp$.
 */
export function incarnationOf(d        , set                   , universe                   )         {
  const closure = biorthogonalClosure(set, universe);
  const dual = orthogonalOf(closure, universe);
  const visited = visitedLoci(d, dual);
  const keepKeys = new Set        (visited.map((xi) => locusKey(xi)));
  return restrictTo(d, keepKeys);
}

/**
 * The incarnation $|\mathbf{B}|$ of the behaviour generated by `set`: the set of
 * incarnated designs of the behaviour â€” its material *skeleton* (Girard 2001
 * Â§11).  Each design of $\mathbf{B} = \mathbf{B}^{\perp\perp}$ is stripped to
 * the loci its plays against $\mathbf{B}^\perp$ actually visit; duplicates after
 * stripping collapse, so $|\mathbf{B}|$ is in general smaller than $\mathbf{B}$.
 */
export function incarnation(set                   , universe                   )                    {
  const closure = biorthogonalClosure(set, universe);
  const dual = orthogonalOf(closure, universe);
  const incarnated = closure.map((d) => {
    const visited = visitedLoci(d, dual);
    const keepKeys = new Set        (visited.map((xi) => locusKey(xi)));
    return restrictTo(d, keepKeys);
  });
  return dedupe(incarnated);
}

/** The skeleton of a behaviour â€” its incarnation $|\mathbf{B}|$, the material core. */
export const skeleton = incarnation;

                         

/**
 * Witness/obstruction for "`d` is material in $\mathbf{B}$" â€” it equals its own
 * incarnation, carrying no ballast (Girard 2001 Â§11).  A material design is the
 * canonical $\le_k$-minimal representative of its play-behaviour.
 */
export function materialJudgment(d        , set                   , universe                   )                   {
  const inc = incarnationOf(d, set, universe);
  if (designKey(inc) === designKey(d)) {
    return Object.freeze({ kind: "game.incarnation.material:witness"         , design: d });
  }
  const incKeys = new Set        (inc.entries.map((e) => e.locusKey));
  const ballast = support(d).find((xi) => !incKeys.has(locusKey(xi))) ?? null;
  return Object.freeze({
    kind: "game.incarnation.material-obstruction"         ,
    design: d,
    incarnation: inc,
    ballast,
    reason: "the design commits at loci no counter-design visits (ballast)",
  });
}

/** Whether a design is material in the behaviour generated by `set` (carries no ballast). */
export const isMaterial = (d        , set                   , universe                   )          =>
  materialJudgment(d, set, universe).kind === "game.incarnation.material:witness";

/** Whether `d` belongs to the incarnation $|\mathbf{B}|$ â€” appears among the skeleton designs. */
export function inIncarnation(d        , set                   , universe                   )          {
  return inSet(incarnation(set, universe), d);
}
