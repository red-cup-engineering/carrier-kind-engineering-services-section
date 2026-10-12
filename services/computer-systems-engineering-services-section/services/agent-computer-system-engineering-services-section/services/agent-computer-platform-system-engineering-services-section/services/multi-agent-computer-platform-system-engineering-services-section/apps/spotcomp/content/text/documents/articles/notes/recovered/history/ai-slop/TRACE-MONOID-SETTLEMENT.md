# Trace Monoid Settlement

Status: source-backed declaration surface. This file records the missing bridge
between trace-monoid histories and settlement valuations. It is not a row-order
rule and it is not a replacement for the richer trace axes in
[TRACE-AXES.md](./TRACE-AXES.md).

Lab theorem claims are treated as proven even when older files still mark a
placement or formalization as provisional. Active-tree `hacking/` placement is
read here as a placement warning: the resource must declare the bridge rather
than smuggle it in through row interleaving.

## 1. History Object

The active tree defines a trace monoid:

`M(Sigma, I) = Sigma* / ~_I`

where `Sigma` is a finite step set and `I` is a symmetric irreflexive
commutation relation. The congruence identifies:

`u . s . s' . v ~_I u . s' . s . v`

when `(s, s') in I`.

This object is the free partially commutative monoid, also called the history
monoid or Mazurkiewicz trace monoid. It is initial in the category of abstract
history systems over `(Sigma, I)`.

For SPOTCOMP, a step is not an arbitrary row. A step is a typed positing,
closure-firing, or declared batch positing position whose stage and cell
coordinates are known. The EAVT row is a finite event presentation of such a
step when a row is present.

## 2. Independence Relation

Independence is not "arrived from different peers" and not "appeared on
different lines." Two steps are independent only when the declaration proves at
least:

- both steps are known members of `Sigma`;
- the pair is irreflexive and appears in the symmetric closure of `I`;
- neither step is causally before the other;
- their closure-rule premises and conclusions do not overlap;
- predicate-category reindexing does not couple the two steps;
- shared recognition, governance, or observation gates do not impose an order.

The active trace-monoid source gives the short form: independent positings are
steps at cells unrelated by any closure-rule premise or conclusion. The
predicate-naturality and realizability sources make the caveat explicit:
non-discrete predicate categories can couple firing patterns through
specialization, converse, subject projection, and object projection.

## 3. Valuation Action

The settlement bridge needs an action of history steps on predication
valuations. For an atomic positing step at cell `phi` with datum `q`, the action
is:

`posit_(phi,q)(v) = v join_k delta_(phi,q)`

Batch positings act by finite knowledge joins of their atomic components.
Positing naturality says reindexing a positing gives the same result as
positing at the reindexed cell with the same datum. That is why the action must
name the predicate generator class and cannot treat `e`, `a`, `v`, `t` rows as
untyped opaque writes.

A conforming history-action declaration must state that each step is
knowledge-monotone, non-unit unless explicitly an abstention identity, and
stage-typed as articulating, predicating, positing, or settling.

## 4. Same Trace Class, Same Valuation

The core settlement requirement is:

If two finite step sequences are equal in `M(Sigma, I)`, their valuation
actions produce the same valuation after the declared closure policy is
applied.

For raw independent positings this follows from pointwise `join_k`
commutativity, associativity, and idempotence. For closure-driven distributed
settling, the Lean-backed CRDT theorem gives the stronger condition: starting
from a closed initial state, applying a list of writes with closure after each
merge equals one final closure of the folded `join_k`, and therefore is
invariant under permutation of the same multiset of writes.

This is the mathematical reason G-Set row merge is only a carrier-level
witness. Row merge can preserve all writes, but it does not prove that two
write orders are the same history unless the independence relation and
valuation action are declared.

## 5. Foata And Prefix Evidence

A trace-monoid profile should expose a canonical history summary:

- Foata normal form or equivalent block normal form;
- block depth;
- pairwise independence inside each block;
- dependency order between blocks;
- prefix-order relation for partial histories.

The prefix order gives the history category used by the older
history-and-fiber-algebra notes: histories form the scaffold, and valuation
fibers sit over history positions. In SPOTCOMP terms, a prefix is a partial
settling trajectory, not a final settlement claim.

## 6. Merge, Modeling, And Preorder Boundaries

The distributed-settling merge is pointwise knowledge-order join. The lab
settling-merge theorem proves it is commutative, associative, and idempotent.
This supports distributed convergence once the closure conditions are met.

That does not collapse every order on settlings. The modeling relation
`models` is truth-order pointwise comparison; the preorder morphism relation is
knowledge-order pointwise comparison. The lab independence theorem proves
neither implies the other. A history-equivalence or CRDT-convergence claim must
therefore stay in the knowledge-order settlement lane unless it separately
declares a truth-order modeling result.

## 7. Federation Consequence

Federation payloads may carry trace increments, trajectory prefixes, endpoint
states, projection artifacts, or cohomology audits. A trace-monoid settlement
claim attaches only to the history-bearing payloads: trace increments and
trajectory prefixes with declared step identity, independence, and valuation
action.

Endpoint state alone does not carry the history needed to verify trace-class
equality. Projection artifacts do not carry it either unless they cite the
source frontier and the projection explicitly preserves the history summary.

## 8. Declaration Probe

[schema/trace-monoid-settlement-profile.schema.json](./schema/trace-monoid-settlement-profile.schema.json)
and [src/trace-monoid-settlement-profile.mjs](./src/trace-monoid-settlement-profile.mjs)
validate declaration shape for:

- trace monoid construction and abstract-history initiality;
- independence relation evidence;
- typed valuation action from steps to positings or batch positings;
- same-trace-class same-valuation claims;
- CRDT closure-merge convergence conditions;
- Foata/prefix history summaries;
- merge, modeling, and preorder boundaries;
- federation boundary and downgrade behavior.

The checker does not compute Foata normal forms, prove independence from raw
rows, execute closure, or prove live swarm convergence. It blocks profiles that
would confuse row ordering with mathematical history equivalence.
