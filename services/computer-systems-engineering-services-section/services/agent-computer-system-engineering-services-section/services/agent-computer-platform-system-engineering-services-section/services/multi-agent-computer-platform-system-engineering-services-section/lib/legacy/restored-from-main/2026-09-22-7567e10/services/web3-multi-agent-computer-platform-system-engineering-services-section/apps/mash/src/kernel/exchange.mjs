import { invokeFinalizedDemandInterval } from "@red-cup-engineering/ethereum-engineering-services-section/semiotic-exchange-events";

// The tick's Δ half (README, 2026-08-19 note "FARS and MASH: σ, Δ, and
// the tick"): fires the exchanges admitted member obligations license, by
// composing the Ethereum service's own invokeFinalizedDemandInterval.

function requireCell(cells, name) {
  const cell = cells?.[name];
  if (typeof cell !== "function") throw new TypeError(`cells.${name} must be a function`);
  return cell;
}

/**
 * Read one admitted member face as the committed obligation Δ fires an
 * exchange for: the member's own settled digest (kernel/face.mjs's
 * content identity) becomes the carrier of a synthetic DemandRaised-shaped
 * record, so no real chain interval is required to exercise the injected
 * hire cells.
 *
 * @param {{member: string, digest: string}} face one composeMembers member face
 * @returns {{member: string, demand: {demand: string, member: string, carrier: Buffer}}} one obligation
 */
export function obligationFromFace(face) {
  if (!face || typeof face.member !== "string" || typeof face.digest !== "string" || face.digest === "") {
    throw new TypeError("obligationFromFace requires a member face with member and digest");
  }
  return Object.freeze({
    member: face.member,
    demand: Object.freeze({
      demand: face.digest,
      member: face.member,
      carrier: Buffer.from(face.digest, "hex"),
    }),
  });
}

/**
 * Every admitted member face's committed obligation, in the composite's
 * own member order.
 *
 * @param {ReadonlyArray<{member: string, digest: string}>} admittedFaces composeMembers's `members`
 * @returns {ReadonlyArray<{member: string, demand: object}>} one obligation per admitted face
 */
export function deriveAdmittedObligations(admittedFaces) {
  if (!Array.isArray(admittedFaces)) throw new TypeError("admittedFaces must be an array");
  return Object.freeze(admittedFaces.map(obligationFromFace));
}

/**
 * Fire one exchange per admitted member obligation through
 * invokeFinalizedDemandInterval. Each obligation supplies its own
 * single-item `readDemandRaised` override closed over that member's own
 * carrier — no rpcUrl or deployed exchange address is read here, and no
 * chain-mutation authority is granted: `cells.submitHire` is the caller's.
 *
 * @param {ReadonlyArray<{member: string, digest: string}>} admittedFaces composeMembers's `members`
 * @param {{conformHireInput: Function, selectProvider: Function, submitHire: Function}} cells the caller's injected hire cells
 * @returns {Promise<ReadonlyArray<object>>} one invokeFinalizedDemandInterval result per obligation, member-tagged
 * @throws {TypeError} if a required cell is missing
 */
export async function fireAdmittedExchanges(admittedFaces, cells) {
  const conformHireInput = requireCell(cells, "conformHireInput");
  const selectProvider = requireCell(cells, "selectProvider");
  const submitHire = requireCell(cells, "submitHire");

  const obligations = deriveAdmittedObligations(admittedFaces);
  const exchanges = [];
  for (const obligation of obligations) {
    const result = await invokeFinalizedDemandInterval({
      finalized: true,
      fromBlock: 0n,
      toBlock: 0n,
      readDemandRaised: async () => [obligation.demand],
      conformHireInput,
      selectProvider,
      submitHire,
    });
    exchanges.push(Object.freeze({ member: obligation.member, ...result }));
  }
  return Object.freeze(exchanges);
}
