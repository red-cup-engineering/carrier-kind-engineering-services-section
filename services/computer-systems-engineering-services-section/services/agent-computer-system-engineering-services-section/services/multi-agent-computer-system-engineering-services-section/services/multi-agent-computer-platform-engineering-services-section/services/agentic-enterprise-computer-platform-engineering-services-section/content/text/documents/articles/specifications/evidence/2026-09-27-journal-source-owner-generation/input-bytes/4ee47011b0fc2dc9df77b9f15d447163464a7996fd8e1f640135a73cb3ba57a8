/**
 * @packageDocumentation
 *
 * Holography — the data projection kernel: how a *type* scopes to a resource.
 *
 * A holographic projector reads a boundary resource (a path + its content) into
 * carried items of some type `T`, and writes them back. A type is DEFINED BY
 * these morphisms (Yoneda), not by a folder or a spec. The codecs specialize
 * this kernel; each supplies its own `T` and its own recognize/read/write.
 *
 * Restriction is done HERE, in code — no `restricting/` directory.
 * `restrict(parent, …)` composes a child whose recognition ENTAILS the
 * parent's (`recognize_child = recognize_parent ∧ local`): a Curry–Howard
 * entailment edge. read/write inherit from the parent unless overridden, so
 * carrier-bearing behavior appears exactly at the node that owns it.
 *
 * Generic over the carried type `T`: this module imports nothing.
 *
 * This package has no action-face module: there is no `src/running` here,
 * and this kernel does not implement an action boundary. CLI/HTTP/OpenAPI/MCP/
 * form/witness faces live elsewhere, in the (unrelated) `relating` package.
 * This module stays purely representation-facing — how a type scopes to a
 * resource — not the process loop users run.
 */
/** ⟨addressability, assertivity⟩ bits of each corner. */
export const CORNER_BITS = {
  bottom: [0, 0],
  data: [1, 0],
  prose: [0, 1],
  assertion: [1, 1],
};
/** The bilattice knowledge order ≤_k: `a` commits to no more than `b` iff `b` has
 *  at least as much of BOTH features. The two incomparable middles (`data`,
 *  `prose`) are the feature-swap diagonal. */
export function leqK(a, b) {
  const [aa, asA] = CORNER_BITS[a];
  const [ba, bsB] = CORNER_BITS[b];
  return aa <= ba && asA <= bsB;
}
/** The rungs whose completion is decidable — the only rungs a `read` may require. */
export const DECIDABLE_RUNGS = new Set(["identity", "scott"]);
/** Whether a rung's completion is decidable (settles in bounded or ω steps). */
export function isDecidable(rung) {
  return DECIDABLE_RUNGS.has(rung);
}
/** Define a root projector (no parent). */
export function define(spec) {
  return {
    type: spec.type,
    parent: null,
    recognize: spec.recognize,
    read: spec.read,
    write: spec.write,
    corner: spec.corner,
    rung: spec.rung,
  };
}
/** Restrict a parent into a child: recognition is conjoined (child ⊢ parent);
 *  read/write and the corner/rung gradings inherit unless overridden. */
export function restrict(parent, spec) {
  const local = spec.recognize;
  return {
    type: spec.type,
    parent,
    recognize: (resource) => parent.recognize(resource) && (local ? local(resource) : true),
    read: spec.read ?? parent.read,
    write: spec.write ?? parent.write,
    corner: spec.corner ?? parent.corner,
    rung: spec.rung ?? parent.rung,
  };
}
/** The entailment chain of a projector: itself, then everything it restricts, root last. */
export function entails(projector) {
  const chain = [];
  let p = projector;
  while (p) {
    chain.push(p);
    p = p.parent;
  }
  return chain;
}
/** A resource's most specific type: the deepest projector in the catalog that
 *  recognizes it (null if none). */
export function classify(resource, catalog) {
  let best = null;
  let bestDepth = -1;
  for (const projector of catalog) {
    if (!projector.recognize(resource))
      continue;
    const depth = entails(projector).length;
    if (depth > bestDepth) {
      best = projector;
      bestDepth = depth;
    }
  }
  return best;
}
/** The most specific projector serving a read of this resource at a requested
 *  corner. With a corner: the deepest recognizer reading at exactly that corner.
 *  Without one: the deepest recognizer COMPARABLE (by restriction) with every
 *  other recognizer — the meet of the maximal recognizers — so a resource whose
 *  derived views sit on incomparable sibling restrictions dispatches to the node
 *  that owns the recognition, never arbitrarily to one sibling view. */
export function classifyAt(resource, catalog, corner) {
  const recognizers = catalog.filter((projector) => projector.recognize(resource));
  if (recognizers.length === 0)
    return null;
  if (corner !== undefined) {
    let best = null;
    let bestDepth = -1;
    for (const projector of recognizers) {
      if (cornerOf(projector) !== corner)
        continue;
      const depth = entails(projector).length;
      if (depth > bestDepth) {
        best = projector;
        bestDepth = depth;
      }
    }
    return best;
  }
  // Group recognizers by their ROOT: recognizers from unrelated roots (e.g. the
  // universal string root beside a jsonl restriction chain) are incomparable and
  // must not vote on each other's dispatch.
  const families = new Map();
  for (const projector of recognizers) {
    const chain = entails(projector);
    const root = chain[chain.length - 1];
    const members = families.get(root);
    if (members === undefined)
      families.set(root, [projector]);
    else
      members.push(projector);
  }
  // The winning family: the one carrying the deepest recognizer; on depth ties,
  // the root LATER in the catalog wins (the catalog orders roots from generic to
  // specific, so `string` yields to `jsonl` yields to `json`).
  let winner = null;
  let winnerDepth = -1;
  let winnerIndex = -1;
  for (const [root, members] of families) {
    const depth = Math.max(...members.map((member) => entails(member).length));
    const index = catalog.indexOf(root);
    if (depth > winnerDepth || (depth === winnerDepth && index > winnerIndex)) {
      winner = members;
      winnerDepth = depth;
      winnerIndex = index;
    }
  }
  if (winner === null)
    return null;
  // Within the family: sibling views under one node (e.g. work-claims and
  // continuation restricting one transcript type) dispatch to their deepest
  // common recognizing ancestor — the node that owns the recognition — never
  // arbitrarily to one view.
  const chains = winner.map((projector) => new Set(entails(projector)));
  const maximals = winner.filter((projector, index) => !chains.some((chain, otherIndex) => otherIndex !== index && chain.has(projector)));
  const maximalChains = maximals.map((projector) => new Set(entails(projector)));
  let best = null;
  let bestDepth = -1;
  for (const projector of winner) {
    if (!maximalChains.every((chain) => chain.has(projector)))
      continue;
    const depth = entails(projector).length;
    if (depth > bestDepth) {
      best = projector;
      bestDepth = depth;
    }
  }
  return best;
}
/** The content-commitment corner of a projector (defaults `bottom`). */
export function cornerOf(projector) {
  return projector.corner ?? "bottom";
}
/** The completion rung of a projector (defaults `identity`). */
export function rungOf(projector) {
  return projector.rung ?? "identity";
}
/** The decidability invariant: a projector that READS (settles surface into
 *  carried items) must do so at a decidable rung — never non-monotone or Turing.
 *  Write-only projectors (e.g. presentational HTML/SVG) are exempt: emitting a
 *  Turing-rung form is sound; depending on its *completed* state is not. */
export function readIsDecidable(projector) {
  return projector.read === undefined || isDecidable(rungOf(projector));
}
/** Whether a transcode between two corners is admissible: only along the
 *  bilattice knowledge order. Comparable corners are the monotone edges —
 *  enriching upward (may require outside information) or settling downward (always
 *  sound, lossy). The incomparable middles `data`↔`prose` are the feature-swap
 *  diagonal, which has no lossless transcoding. */
export function admitsTranscode(from, to) {
  return leqK(from, to) || leqK(to, from);
}
/** Transcode a resource from one representation to another — the only sanctioned
 *  conversion entry point. It reads with `from` and writes with `to`, but first
 *  enforces {@link admitsTranscode}: the two corners must be ≤_k-comparable.
 *  Enriching up may need outside information; settling down is lossy but sound;
 *  the `data`↔`prose` feature-swap diagonal throws, because it has no lossless
 *  form. Both projectors must carry the same item type `T`. */
export function transcode(from, to, resource) {
  if (!admitsTranscode(cornerOf(from), cornerOf(to))) {
    throw new TypeError(`inadmissible transcode ${from.type}(${cornerOf(from)}) → ${to.type}(${cornerOf(to)}): ` +
      `corners are not ≤_k-comparable (the feature-swap diagonal has no lossless form)`);
  }
  if (!from.read)
    throw new TypeError(`transcode source ${from.type} has no read`);
  if (!to.write)
    throw new TypeError(`transcode target ${to.type} has no write`);
  return to.write(from.read(resource));
}
