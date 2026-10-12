/**
 * social-field — socializing as the off-diagonal multi-observer system.
 *
 * The Social Field is a sheaf of agent stalks (observers). Socializing is
 * endomorphic on this field: every morphism Field → Field. The communicating
 * morphisms are lifted stalkwise (liftStalkwise) to act on each agent in the field.
 * converge computes H¹ cohomology: zero = coordination-free, non-zero = consensus required.
 */
import {
  admitAction,
  mergeAction,
  convergeAction,
  broadcastAction,
  attendAction,
  translateAction,
  communicateLiftedAction,
  negateLiftedAction,
  illocuteLiftedAction,
  emptyField,
  isField,
} from "@red-cup-engineering/socializing";
import { cell } from "@red-cup-engineering/signcell/cell";
import { evidenced } from "@red-cup-engineering/signcell/cell";
import { evidence } from "@red-cup-engineering/signcell/cell";

// ── build memes ───────────────────────────────────────────────────────────────────
const makeMeme = (label) => {
  const c = cell(label, `predicate:${label}`, "topic");
  return evidenced(c, evidence({ for: [`${label}-w`] }));
};
const m1 = makeMeme("sky-is-blue");
const m2 = makeMeme("sky-is-vast");

// ── the empty field: the initial object ──────────────────────────────────────────
const empty = emptyField();
console.log("is field:", isField(empty)); // true
console.log("empty members:", empty.members.length); // 0

// ── admit: grow the field by one agent ───────────────────────────────────────────
const f1 = admitAction.execute(empty, { agent: "alice|sees-blue" });
const f2 = admitAction.execute(f1,   { agent: "bob|sees-vast" });
console.log("f2 members:", f2.members.length); // 2
console.log("is field after admit:", isField(f2)); // true

// ── merge: union two fields ───────────────────────────────────────────────────────
const f3 = admitAction.execute(empty, { agent: "carol|sees-green" });
const merged = mergeAction.execute(f2, { from: 0, to: 1 });
console.log("merged kind:", merged.kind); // "socializing.field"

// ── broadcast: send a meme to all agents in the field ────────────────────────────
const broadcasted = broadcastAction.execute(f2, { from: 0, to: 1, meme: m1 });
console.log("broadcast kind:", broadcasted.kind); // "socializing.field"

// ── stalkwise lifts of communicating morphisms ────────────────────────────────────
// communicate: identity lift (the diagonal embedding)
const communicated = communicateLiftedAction.execute(f2, {});
console.log("communicate lifted:", isField(communicated)); // true

// negate: bilattice negation lifted to the whole field
const negated = negateLiftedAction.execute(f2, {});
console.log("negate lifted:", isField(negated)); // true

// illocute with assertive force, lifted to all stalks
const asserted = illocuteLiftedAction.execute(f2, { force: "assertive" });
console.log("illocute lifted:", isField(asserted)); // true

// ── converge: the H¹ cohomology measurement ──────────────────────────────────────
const agreed = convergeAction.execute(f2, {});
console.log("converge kind:", agreed.kind); // "socializing.social-field"
// section.coordinationFree = true when agents agree (H¹=0)
// section.obstruction > 0 when agents conflict (held as contested — not exploded)
console.log("coordination-free:", agreed.section.coordinationFree);
console.log("obstruction:", agreed.section.obstruction); // 0 when no contested cells
