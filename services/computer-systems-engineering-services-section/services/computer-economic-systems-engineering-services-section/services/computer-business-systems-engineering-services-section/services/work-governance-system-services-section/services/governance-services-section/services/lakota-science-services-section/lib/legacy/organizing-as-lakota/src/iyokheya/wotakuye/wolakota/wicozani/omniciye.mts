/**
 * omniciye — the council, settling by consensus-by-withdrawal (Omníčhiye), wičhózani tier.
 *
 * Corpus: content/_archive/existence/lakota/.../consensus-by-withdrawal-yields-quiescence.
 * The omníčiye does NOT decide by vote. There is no tally, no majority, no side that wins
 * and a side that loses — to read it that way is to overwrite a relational form with a
 * Western-procedural one. The council holds ONE shared settling: each member's settling
 * under 𝒮_wolak carries a position (a truth-class — t, f, or ⊥-not-yet-formed), and the
 * council's settling is the ≤ₖ-join of the engaged members' positions. Consensus is not
 * "the most-held position" — it is the position the engaged hold IN COMMON.
 *
 * When the engaged do not hold one settling in common, the join stands at ⊤ (contested),
 * and the council does NOT override anyone. Instead, a member who cannot align in good
 * conscience may WITHDRAW — iyúhášni. Withdrawal is the load-bearing act and its character
 * is the whole point: it is NOT a loss, NOT a penalty, NOT standing-erosive; it touches no
 * relation-cell; it is freely reversible. The member steps back so the rest may proceed,
 * and keeps every kinship intact. The remainder then holds its own settling in common, or
 * the question rises to a wider council, or it rests unsettled — all three are honorable.
 *
 * So `withdraw` is the council's real act, and `settling` only reads where the council now
 * stands. The corpus's contrast: Western parliamentary procedure reaches rest by coercion
 * (the majority overrides the minority); the omníčiye reaches rest by withdrawal (those who
 * cannot align step back with their relations whole). Both come to rest; only the omníčiye
 * keeps the kinship. lakotaTerm: "Omníčhiye".
 */
import { joinKnowledgeValue, chargeValue, type ChargeValueName } from "@emsenn/relating";

/** How the council comes to rest — none of these overrides anyone. */
export type Quiescence =
  | "in-common" // the engaged hold one settling in common
  | "contested" // the engaged do not yet hold one in common — withdrawal or a wider council is open
  | "resting"; // none has yet formed a position — the question rests for now

/** Where the council stands: the settling the engaged hold, read (never imposed). */
export interface Omniciye {
  readonly kind: "organizing-as-lakota.omniciye";
  /** The settling the engaged hold in common (potential=t, active=f) or ⊥ if none-yet/contested. */
  readonly settling: ChargeValueName;
  /** How the council has come to rest. */
  readonly quiescence: Quiescence;
  /** How many members are engaged — carrying a formed position and not withdrawn. */
  readonly engaged: number;
  /** How many have withdrawn (iyúhášni) — honored, not defeated. */
  readonly withdrawn: number;
  /** Withdrawal touches no relation-cell — the withdrawn keep every kinship. */
  readonly kinPreserving: true;
  /** Withdrawal is freely reversible — a member may re-engage. */
  readonly reversible: true;
  /** No member is ever overridden. */
  readonly coercive: false;
}

const isFormed = (c: ChargeValueName): boolean => c === "potential" || c === "active";

/** The ≤ₖ-join (the one shared settling) of the engaged members' formed positions. */
function held(positions: readonly ChargeValueName[]): ChargeValueName {
  const formed = positions.filter(isFormed);
  if (formed.length === 0) return "absurd";
  let acc = chargeValue(formed[0]!);
  for (let i = 1; i < formed.length; i += 1) acc = joinKnowledgeValue(acc, chargeValue(formed[i]!));
  return acc.name;
}

function read(positions: readonly ChargeValueName[], withdrawn: number): Omniciye {
  const engaged = positions.filter(isFormed).length;
  const settling = held(positions);
  // ⊤ (stable) = the engaged do not hold one settling in common (no override is taken);
  // a determinate join = the one they share; ⊥ (absurd) with no engaged = none formed yet.
  const quiescence: Quiescence =
    engaged === 0 ? "resting" : settling === "stable" ? "contested" : "in-common";
  return Object.freeze({
    kind: "organizing-as-lakota.omniciye",
    settling: settling === "stable" ? "absurd" : settling,
    quiescence,
    engaged,
    withdrawn,
    kinPreserving: true,
    reversible: true,
    coercive: false,
  });
}

/**
 * Read where the council stands on its members' positions (potential = t, active = f,
 * absurd = ⊥ not-yet-formed). This imposes nothing: it reports whether the engaged hold one
 * settling in common, hold none in common (contested — open to withdrawal or a wider
 * council), or have not yet formed positions (resting).
 */
export function deliberate(positions: readonly ChargeValueName[]): Omniciye {
  return read(positions, 0);
}

/**
 * iyúhášni at council scope: the members at `withdrawing` indices step back — freely, with
 * their kinship whole and their re-engagement open — so the council may proceed. The
 * remainder's settling is read; if those who could not align have stepped back, what
 * remains is held in common. No one was overridden to get there.
 */
export function withdraw(
  positions: readonly ChargeValueName[],
  withdrawing: readonly number[],
): Omniciye {
  const stepping = new Set(withdrawing);
  const remainder = positions.filter((_, i) => !stepping.has(i));
  const withdrawnFormed = positions.filter((c, i) => stepping.has(i) && isFormed(c)).length;
  return read(remainder, withdrawnFormed);
}
