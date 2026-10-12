import { row as assertRow } from "@red-cup-engineering/eavt";
import { mark, token, claim } from "@lenticule-science/metrologic/articulation/predicating/positing/utterance";
import { chargeSideName, witnessedPotential } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { cell, predicateOfClaim } from "@lenticule-science/metrologic/articulation/predicating/positing/predication";
import { meme } from "./positing/fiber.mjs";
/**
 * Project one admitted positive EAVT assertion into its cell and witnessed charge.
 * @param row The canonical operational row.
 * @returns Cell terms and the unchanged transaction as positive evidence.
 * @throws {TypeError} When the row is not admitted by the EAVT owner.
 */
export function eavtToCell(row) {
    assertRow(row);
    return meme(cell(token(mark(row.e)), predicateOfClaim(claim(mark(row.a))), token(mark(row.v))), witnessedPotential(mark(row.t)));
}
/**
 * Project positive witnesses into canonical operational rows.
 * @param charged Operational terms and scientific charge.
 * @returns One row per positive witness, retaining its complete transaction.
 * @throws {TypeError} When negative evidence is present or a row is inadmissible.
 */
export function cellToEavt(charged) {
    if (chargeSideName(charged.charge.value[1]) === "present" || charged.charge.evidence[1].length > 0) {
        throw new TypeError("cellToEavt: negative evidence requires independentEvidenceRow");
    }
    const e = charged.cell.subject.mark.value;
    const a = charged.cell.predicate.claim.mark.value;
    const v = charged.cell.object.mark.value;
    return charged.charge.evidence[0].map((witness) => assertRow({ e, a, v, t: witness.value }));
}
