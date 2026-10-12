// conflate — the bilattice's second involution (the Klein-four gauge's other unary, sibling of negate):
// reflect the knowledge axis. On the twist product [pos, neg] -> [¬neg, ¬pos] (complement both, then swap):
// swaps ⊥<->⊤, FIXES t and f, antitone in knowledge, monotone in truth, self-inverse at the value level.
// Complementing an absent slot to present reuses any mark the charge already carries, so a fixed value keeps
// its witness; only ⊥ (no witness anywhere) falls back to the canonical MARK. Conflating through ⊥ therefore
// canonicalizes the mark — there is no witness of "no evidence" to preserve — so −² = id holds by value, not
// byte. (negate, by contrast, only swaps existing slots and never invents a mark.)
const MARK = { const: true };

export default function conflate(charge) {
  const mark = charge[0][0] ?? charge[1][0] ?? MARK;
  const complement = (slot) => (slot.length === 1 ? [] : [mark]);
  return [complement(charge[1]), complement(charge[0])];
}
