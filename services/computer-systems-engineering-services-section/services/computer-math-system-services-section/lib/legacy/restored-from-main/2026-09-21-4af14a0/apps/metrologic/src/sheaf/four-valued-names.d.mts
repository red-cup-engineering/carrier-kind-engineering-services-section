/**
 * The one shape every finite four-valued (bottom / positive-only / negative-only /
 * top) charge or claim vocabulary must supply to compose this section's generic
 * twist-product and d-frame-valued-sheaf checkers.
 *
 * `bottom` names the (false, false) point (no evidence either way), `positiveOnly`
 * names (true, false), `negativeOnly` names (false, true), and `top` names
 * (true, true) (both positive and negative evidence — the fusion unit / truth top
 * of the knowledge order). A caller's own charge module supplies its own strings
 * here (e.g. articulating's semiotic charge vocabulary is
 * `{ bottom: "absurd", positiveOnly: "potential", negativeOnly: "active", top: "stable" }`;
 * FeltOS's federation claim vocabulary is
 * `{ bottom: "unknown", positiveOnly: "held", negativeOnly: "denied", top: "contested" }`)
 * so the SAME finite verification math runs over either vocabulary without a
 * second hand-copied implementation per caller.
 */
export interface FourValuedNames<Name extends string> {
    readonly bottom: Name;
    readonly positiveOnly: Name;
    readonly negativeOnly: Name;
    readonly top: Name;
}
