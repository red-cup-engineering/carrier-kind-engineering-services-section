// delegation.mjs — the kyriarchical delegation chain as a composition of decision-morphisms, with
// accountability non-transfer (H⁰-invariance) as its law.
//
// The corpus states the structure exactly (kyriarchical-agentics-may-2026.md §1, quoting
// code/structures/rsc-quiescent.md):
//   "the formal structure is a military-command composite modal frame: captain → delegation chain,
//    where each link is a delegation morphism with scope-bounded, revocable authority. The captain's
//    accountability cells are H⁰-invariant under chain extension: emsenn answers for every outcome on
//    the ship."
// and §1.3: "Delegation transfers authority to act; it does not transfer answerability for the
// action's consequences."  §1.4: "Every action issued through the chain has a scope-bound ... Acting
// outside scope is structurally invalid."
//
// So a chain is a sequence of delegation MORPHISMS that COMPOSE (each link's delegatee is the next
// link's delegator — the same composability the Chu transforms require). Each morphism is a Hohfeldian
// POWER (jural.mjs: "may, by a voluntary act, change the passive-party's normative position" — exactly
// what a delegation does). Two quantities ride the chain in opposite ways, and their contrast IS the
// theorem:
//   • AUTHORITY-to-act moves to the delegatee — authorityHolder is the chain's terminal target, and it
//     changes when the chain is extended.
//   • ACCOUNTABILITY (answerability) does NOT move — accountabilityHolder is the apex captain, and it
//     is H⁰-INVARIANT under chain extension. Extending the chain never relocates it.
// The categorical home the corpus names is the predicated-governance theorem
// `military-command-chain-as-modal-composition`; this module makes that frame addressable data. It
// authors no new deontic theory — the deontic modality each link carries is kept as data (the corpus
// does not derive its composition table), and only the corpus-stated mechanics (scope narrowing,
// revocation propagation, accountability invariance) are computed.


import { juralRelation } from "./jural.mjs";

const TOP_SCOPE = "*"; // the captain's unbounded scope; every narrower scope is bounded under it.

function asScope(scope) {
  if (scope === TOP_SCOPE || scope == null) return [TOP_SCOPE];
  return [].concat(scope).filter(Boolean).map(String);
}

// does this scope cover an action? "*" covers all; otherwise exact match or a dotted-namespace prefix.
export function scopeCovers(scope, action) {
  const s = asScope(scope);
  if (s.includes(TOP_SCOPE)) return true;
  return s.some((entry) => entry === action || String(action).startsWith(entry + "."));
}

// the meet (narrowing) of two scopes — the bound a child inherits: only what BOTH cover. "*" is the
// identity. This is why scope is "bounded ... and traceable to the captain": the dispatch scope is the
// meet down the whole chain, so it can only ever shrink.
export function meetScope(a, b) {
  const A = asScope(a); const B = asScope(b);
  if (A.includes(TOP_SCOPE)) return [...B];
  if (B.includes(TOP_SCOPE)) return [...A];
  const out = [];
  for (const entry of new Set([...A, ...B])) {
    if (scopeCovers(A, entry) && scopeCovers(B, entry)) out.push(entry);
  }
  return out;
}

// A delegation morphism: `from` delegates to `to`, bounded to `scope`, carrying a deontic `modality`
// (data only) and a `revocable` flag. It IS the exercise of a Hohfeldian power (from over to).
export function delegationMorphism({ from, to, scope = TOP_SCOPE, modality = "permission", revocable = true } = {}) {
  if (!from || !to) throw new Error("delegationMorphism requires from and to");
  return Object.freeze({
    kind: "swarm.delegation.morphism",
    from: String(from),
    to: String(to),
    scope: Object.freeze(asScope(scope)),
    modality: String(modality),
    revocable: !!revocable,
    revoked: false,
    jural: juralRelation("power", { activeHolder: String(from), passiveParty: String(to), scopeAction: asScope(scope).join(",") }),
  });
}

// A delegation chain: the captain at the apex, then a composable sequence of morphisms. Composability
// (link[i].to === link[i+1].from) is checked here, exactly as Chu-transform composition checks its
// types — a chain whose links don't meet is not a chain.
export function delegationChain(captain, links = []) {
  if (!captain) throw new Error("delegationChain requires a captain");
  const seq = [...links];
  let expectedFrom = String(captain);
  for (let i = 0; i < seq.length; i++) {
    if (seq[i].from !== expectedFrom) {
      throw new Error(`delegation chain is not composable at link ${i}: expected from=${expectedFrom}, got ${seq[i].from}`);
    }
    expectedFrom = seq[i].to;
  }
  return Object.freeze({ kind: "swarm.delegation.chain", captain: String(captain), links: Object.freeze(seq) });
}

// extend the chain at its downstream end: the new link must depart from the current terminal authority.
export function extend(chain, link) {
  return delegationChain(chain.captain, [...chain.links, link]);
}

// ── the two quantities that ride the chain, in opposite directions ───────────────────────────────
// ACCOUNTABILITY: the apex. H⁰ — the global section invariant under extension. This is the captain,
// always, no matter how long the chain grows. "emsenn answers for every outcome on the ship."
export function accountabilityHolder(chain) {
  return chain.captain;
}
// AUTHORITY-to-act: the terminal delegatee (or the captain if no link has been issued). This DOES move
// when the chain is extended — authority is transferred, accountability is not.
export function authorityHolder(chain) {
  return chain.links.length ? chain.links[chain.links.length - 1].to : chain.captain;
}

// the dispatch scope-bound: the meet of every link's scope (top = the captain's "*"). Empty chain →
// the captain's unbounded scope.
export function chainScope(chain) {
  return chain.links.reduce((acc, link) => meetScope(acc, link.scope), [TOP_SCOPE]);
}

// ── the law: accountability non-transfer = H⁰-invariance under chain extension ───────────────────
// extending the chain by any link leaves the accountability holder fixed (the captain), while the
// authority holder moves to the new terminal. Returns the witness of both facts. This is the theorem
// `military-command-chain-as-modal-composition` made checkable.
export function accountabilityInvariantUnderExtension(chain, link) {
  const before = accountabilityHolder(chain);
  const extended = extend(chain, link);
  const after = accountabilityHolder(extended);
  return {
    kind: "swarm.delegation.h0_witness",
    invariant: before === after,            // H⁰ unchanged — accountability did NOT transfer
    accountabilityBefore: before,
    accountabilityAfter: after,
    authorityBefore: authorityHolder(chain), // for contrast: authority DID move
    authorityAfter: authorityHolder(extended),
    authorityMoved: authorityHolder(chain) !== authorityHolder(extended),
  };
}

// ── revocation propagates downward ───────────────────────────────────────────────────────────────
// revoking an authority severs its link and every link below it: "revocation propagates downward
// through the chain." Returns a new chain with the affected links marked revoked.
export function revoke(chain, authority) {
  const cut = chain.links.findIndex((link) => link.from === String(authority) || link.to === String(authority));
  if (cut < 0) return chain;
  const links = chain.links.map((link, i) => (i >= cut ? Object.freeze({ ...link, revoked: true }) : link));
  return Object.freeze({ kind: "swarm.delegation.chain", captain: chain.captain, links: Object.freeze(links) });
}

export function isLive(chain) {
  return !chain.links.some((link) => link.revoked);
}

// ── scope-bounded dispatch (the structural-validity gate of §1.4) ────────────────────────────────
// an action issued through the chain is admissible ("potential") iff the chain is live and the action lies
// within the chain's scope-bound; outside scope or on a revoked chain it is structurally invalid (F);
// an empty/undeclared scope leaves it unsettled (BOT). The decision is a jural POWER exercised by the
// authority holder under the captain's standing accountability.
export function dispatchAdmissible(chain, action) {
  if (!isLive(chain)) {
    return { value: "active", jural: "power", reason: "delegation revoked upstream; the chain carries no authority.", accountable: accountabilityHolder(chain) };
  }
  const scope = chainScope(chain);
  if (!action) {
    return { value: "absurd", jural: "power", reason: "no action supplied; scope-bound not yet settled.", accountable: accountabilityHolder(chain), scope };
  }
  if (scopeCovers(scope, action)) {
    return { value: "potential", jural: "power", reason: `${authorityHolder(chain)} may dispatch ${action} within scope; ${accountabilityHolder(chain)} answers for it.`, authority: authorityHolder(chain), accountable: accountabilityHolder(chain), scope };
  }
  return { value: "active", jural: "power", reason: `${action} lies outside the chain's scope-bound (${scope.join(", ")}); acting outside scope is structurally invalid.`, accountable: accountabilityHolder(chain), scope };
}
