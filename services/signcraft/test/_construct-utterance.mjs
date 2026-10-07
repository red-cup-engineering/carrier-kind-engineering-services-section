import { Mark } from "@red-cup-engineering/signcell/utterance";
import { evidence } from "@red-cup-engineering/signcell/cell";
// scratch, not math: random tokens/claims and the charges they build, so tests run on real witnessed evidence
// instead of fabricated atoms — and so a test never gets hung up on told-none / "empty" sets.
// Ported unchanged from @561/development.active.math-kernel's tests/_construct-utterance.mjs — this file has
// no dependency on the kernel's scripts/, only on node:crypto, so nothing needed to change when it moved.
import { randomBytes } from "node:crypto";

// an atom: a random hashed id — a token or a claim.
export const id = () => randomBytes(3).toString("hex");

// a witness term — itself an utterance (something on the left, something on the right), the only way to build a
// term from atoms at hand. Nest it for a deeper ast.
export const witness = () => [id(), id()];

// the default: a bare utterance [token, claim].
export default () => [id(), id()];

// a told slot carries one witness; told-none keeps NONE of a real telling — derived, never a typed [].
export const told = (w = witness()) => [new Mark(w)];
export const toldNone = () => witness().slice(0, 0);

// a charge at a chosen FOUR place: SignCell evidence (real witnesses, no fabricated marks, no typed
// empties) whose told sides read as that place — t held-for, f held-against, top held both ways, bot
// told-none. SignCell's evidence() admits only plain semiotic JSON witnesses (a Mark carrier's own
// class shape is not one), so a told() slot's Mark is unwrapped to the witness it marks.
const witnessesOf = (marks) => marks.map((m) => m.value);

export const charge = (place) => ({
  t:   evidence({ for: witnessesOf(told()), against: toldNone() }),
  f:   evidence({ for: toldNone(),          against: witnessesOf(told()) }),
  top: evidence({ for: witnessesOf(told()), against: witnessesOf(told()) }),
  bot: evidence({ for: toldNone(),          against: toldNone() }),
}[place]);
