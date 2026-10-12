/**
 * naca — the headman office (Naǧá / Naca), at the wičhózani (settling) tier.
 *
 * Corpus: content/_archive/existence/lakota/.../lakotaean-governance/.../naca-office.
 * A naca is an OFFICE-AS-DOUBLE-SETTLEMENT specialised by a FOUR-VIRTUE GATE: it
 * installs only when both a recognition-cell and a wakȟáŋ-bearing induction-cell settle
 * at t, AND all four virtue-cells over the incumbent stand at t. The naca's
 * qualification is a settled substrate-fact BEFORE the office is installed; installation
 * is the recognition of an already-settled qualification, never its source.
 *
 * The authority is MORAL and CONSULTATIVE, never coercive: there is no closure rule of
 * the form naca-says-X ⟹ X-binding. The naca speaks in council and represents the
 * polity, but the council's settling depends on the engaged-majority. And the office is
 * a RUNNING qualification, not an installation-time one: loss is substrate-automatic —
 * if conduct drops any virtue below t the recognition-cell can no longer settle at t and
 * the incumbent-cell falls (a naca who fails his relatives is no longer a naca).
 *
 * Derived, not asserted: the four-virtue gate IS wólakȟota's `nacaStanding` (the
 * truth-order meet over the four virtues, isNaca ⟺ standing at t). lakotaTerm: "Naca".
 */
import { nacaStanding } from "../wolakota.mjs";

/** The naca office over an incumbent — the double-settlement under the four-virtue gate. */

   

    

  

  

/**
 * Read the naca office over an incumbent's virtue-profile and induction. The four-virtue
 * gate is `nacaStanding` (isNaca ⟺ all four virtues at t); installation is the
 * double-settlement of that gate WITH a wakȟáŋ-bearing induction. Loss is automatic: if
 * the profile drops a virtue, isNaca falls and so does the office — pass the updated
 * profile to re-read.
 */
export function naca(
  incumbent,
  virtueProfile,
  inducted,
) {
  const standing = nacaStanding(virtueProfile);
  const installed = standing.isNaca && inducted;
  const reason = !standing.isNaca
    ? "the four-virtue gate is not met — a naca who fails a virtue is no longer a naca"
    : !inducted
      ? "qualified by the four virtues, but the wakȟáŋ-bearing induction has not settled"
      : "double-settlement met: four-virtue qualification recognized and induction borne";
  return Object.freeze({
    kind: "organizing-as-lakota.naca",
    incumbent,
    standing,
    inducted,
    installed,
    coercive: false,
    reason,
  });
}
