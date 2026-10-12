---
title: "MetroPlat invariant architecture: working note"
description: "An active analytical scratchpad working to discover the architecture the MetroPlat implementation ought to express — deliberately refusing to infer it from the current directory tree, the corpus's preferred nouns, or an earlier proposal that merely sounds coherent."
keywords:
  - structure
  - organizing
  - closure
  - kernel
  - projection
  - morphism
---

# Infography [renamed later to MetroPlat] invariant architecture: working note

Status: active analytical scratchpad, not a specification or design authority.

This note exists to discover the architecture that the implementation ought to
express. It must not infer that architecture from the current directory tree,
repeat the corpus's preferred nouns, or elevate an earlier proposal because it
sounds coherent. Existing code, mathematics, documentation, and historical
designs are evidence whose disagreements are particularly valuable.

## Governing question

What must remain true across radically different implementations for each of
them to be an implementation of MetroPlat rather than merely software with
similar features or vocabulary?

This requires an identity criterion for the system. Until that criterion is
known, statements about components, layers, boundaries, modernization, or
correct file placement are premature.

## Analytical discipline

Every substantial entry should be distinguishable as one or more of:

- **Observation**: directly supported by a live implementation, formal object,
  test, or independently attested behavior.
- **Deduction**: a claim argued from observations, including the argument.
- **Conjecture**: a possible invariant not yet sufficiently established.
- **Falsifier**: evidence or a substitution that would defeat a deduction or
  conjecture.
- **Decision needed**: a point where implementation evidence cannot determine
  the invention's intended identity without the inventor.

Repository terminology is never evidence merely because it is terminology.
Convergence among independent implementations is stronger evidence than a
single implementation. A structure is an architectural invariant only if
removing or changing it changes what the system *is*, not merely how this
version works.

## Initial decomposition of the question

The first investigation is semantic equivalence, not package topology:

1. What counts as the same MetroPlat computation when expressed as a typed
   term, a host-language function, an action declaration, or persisted
   material?
2. Which information is authoritative, and which information is a projection,
   cache, witness, index, presentation, or transport envelope?
3. Which transformations preserve identity, and which constitute new material?
4. What context is necessarily part of meaning: type, address, authority,
   causal history, observer, time, or something else?
5. Which effects are essential to the abstract machine, and which belong only
   to a particular realization or host?
6. What is the smallest structure capable of accounting for every genuine live
   behavior without encoding products, protocols, or deployment choices?

These questions are provisional investigative cuts, not proposed layers.

## Evidence ledger

No architectural conclusions recorded yet.

## Deductions and conjectures

No architectural conclusions recorded yet.

## Contradictions and falsifiers

None recorded yet.

## Open decisions

None recorded yet.
