/**
 * stores/path-term — typed term addressing: the artifact address grammar as CHL terms.
 *
 * The quarry law this re-earns: "POSIX filepath as the Curry-Howard
 * coordinate"; "paths are proof terms." An artifact address
 * (`data/<tier>/YYYY/MM/DD/${date}-${act}-${token}`) IS a product of marks —
 *
 *   pathTerm(a) = ⟨mark(tier), ⟨mark(date), ⟨mark(act), mark(token)⟩⟩⟩
 *   PATH_TY     = base × (base × (base × base))
 *
 * — and `checkTy([], pathTerm(a), PATH_TY)` is the decidable proof that the
 * address composes. The string form stays the boundary encoding (parsed by
 * `parseArtifactStem`/regex at the host edge, per the placement law's codec
 * rule); the term form is the coordinate the mathematics addresses by. The
 * act vocabulary is finite and checked at decode: a boundary string never
 * casts directly into the vocabulary.
 */
import { tm, ty } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation";
import { checkTy } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation/typing";

/** The four artifact acts, one per tier crossing: log admit, state settle, record commit, content realize. */

const ACT_TIER = Object.freeze({
  admit: "log",
  settle: "state",
  commit: "record",
  realize: "content",
});

/** Whether a string names an artifact act (the finite-vocabulary check). */
export function isArtifactAct(value) {
  return Object.prototype.hasOwnProperty.call(ACT_TIER, value);
}

/** The tier an act crosses into. */
export function artifactActTier(act) {
  return ACT_TIER[act];
}

/** The address coordinates a path term carries. */

/** The type of an artifact address term: tier × (date × (act × token)), all marks at base. */
export const PATH_TY = ty.prod(ty.base(), ty.prod(ty.base(), ty.prod(ty.base(), ty.base())));

/** Project address coordinates to their CHL term. */
export function pathTerm(parts) {
  return tm.pair(
    tm.mark(parts.tier),
    tm.pair(tm.mark(parts.date), tm.pair(tm.mark(parts.act), tm.mark(parts.token))),
  );
}

const markSurface = (term) => (term[0] === "mark" && typeof term[1] === "string" ? term[1] : null);

/**
 * Eliminate a path term back to its address coordinates, or null when the
 * term is not a well-formed address: the spine must be the PATH_TY product of
 * marks, the date must be a calendar mark, and the act must pass the
 * finite-vocabulary check. `checkTy` guards the typing side; the content
 * checks are the boundary's membership proof.
 */
export function termPath(term) {
  if (!checkTy([], term, PATH_TY)) return null;
  if (term[0] !== "pair" || term[2][0] !== "pair" || term[2][2][0] !== "pair") return null;
  const tier = markSurface(term[1]);
  const date = markSurface(term[2][1]);
  const act = markSurface(term[2][2][1]);
  const token = markSurface(term[2][2][2]);
  if (tier === null || date === null || act === null || token === null) return null;
  if (!isArtifactAct(act) || artifactActTier(act) !== tier) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) return null;
  if (token.length === 0) return null;
  return Object.freeze({ tier: ACT_TIER[act], date, act, token });
}

/** The proofed path: the term, its type, and the decidable HasTy verdict. */

/** Type address coordinates as a proofed path. */
export function artifactAddressTyping(parts) {
  const term = pathTerm(parts);
  return Object.freeze({
    kind: "metroplat.stores.path-term",
    term,
    ty: PATH_TY,
    hasTy: checkTy([], term, PATH_TY),
    parts,
  });
}
