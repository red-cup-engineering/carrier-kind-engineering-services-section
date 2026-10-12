// twistor — the KZ comparison 2-cell of mu |- eta. residue = the unsaturated concept (the claim) the
// object-monad never touches; it descends to predicating. Always non-empty (that is Fregean-ness).
import saturate from "../../saturating/scripts/saturate.mjs";
import transfer from "../../transferring/scripts/transfer.mjs";

export default function twistor(cell) {
  const saturated = saturate(cell);
  const reopened = transfer(saturated);
  const [carrier] = cell;
  return { saturated, reopened, residue: [carrier[1]] };
}
