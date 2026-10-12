/**
 * hunkapi — huŋkápi, the making-of-relatives, the most-formal wótakuye.
 *
 * lakotaTerm: huŋkápi — "the making of relatives", the most-formal form of wótakuye. The
 * ceremony INSTALLS new kin-cells in the substrate: after huŋkápi the parties ARE kin in
 * the same structural way descent-kin are. Ceremony is constitutive, not decorative. The
 * two installed tȟakúye cells (a kin-of b, b kin-of a) enter at t (Wí, "potential") —
 * bound.
 *
 * The corpus node is content/_archive/existence/lakota/discharging/library/predicating/.
 * huŋkápi builds tȟakúye cells, so it imports takuye/TakuyeCell from ./takuye.mjs. The
 * charge convention is the LIVE @emsenn/relating one: absurd=⊥, potential=t, active=f,
 * stable=⊤.
 */
import { takuye } from "./takuye.mjs";

// ── huŋkápi: the making-of-relatives ────────────────────────────────────────────────

/**
 * A huŋkápi reading — the making-of-relatives, the most-formal wótakuye. The ceremony
 * INSTALLS new kin-cells in the substrate: after huŋkápi the parties ARE kin in the same
 * structural way descent-kin are. Ceremony is constitutive, not decorative. The two
 * installed tȟakúye cells (a kin-of b, b kin-of a) enter at t (Wí, "potential") — bound.
 */

  

/** Enact huŋkápi between two parties — install the reciprocal kin-cells. */
export function hunkapi(a, b) {
  return Object.freeze({
    kind: "organizing-as-lakota.hunkapi",
    installed: Object.freeze([
      takuye(a, "kin-of", b, "potential"),
      takuye(b, "kin-of", a, "potential"),
    ]),
    mostFormalWotakuye: true,
  });
}
