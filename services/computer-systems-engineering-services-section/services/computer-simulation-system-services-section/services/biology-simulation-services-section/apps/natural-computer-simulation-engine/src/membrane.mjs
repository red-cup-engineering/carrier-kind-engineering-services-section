/**
 * membrane.mjs — intended contract, not yet implemented.
 *
 * This module names the one piece of infrastructure the natural-computer-simulation-engine
 * design (dev/design/2026-08-21-natural-computer-simulation-engine-design.md, §0.1) needs
 * that does not exist anywhere in the estate yet, at any stage: a service
 * that treats a cell's membrane as an evaluated admission predicate rather
 * than a passive boundary or a bare rule-triggered gate.
 *
 * Two existing, read-only sources fix the contract below; neither is a
 * service this module can import today, so nothing here calls out to
 * them — they are cited as the shape a real implementation must match.
 *
 *   - The mark doctrine (token/claim duality; nothing enters the system
 *     except as a mark carried by exactly one of those two dual roles):
 *     obsmetrologia/docs/verso/mark/mark.md
 *   - The executable A2A membrane pattern (content-addressed, atomic
 *     write-then-rename, per-provider-scoped admission), repeated near-
 *     identically across the estate, e.g.:
 *     @red-cup-engineering/a2a-services-section/filesystem-state-sources
 *
 * Intended contract, once implemented:
 *
 *   admit(mark, site) -> { admitted: true, cell }
 *                      | { admitted: false, reason }
 *
 *     - `mark` carries exactly one of the two dual roles named above
 *       (token: identity-carrying: claim: content-carrying); a mark with
 *       neither, or both, is not a valid input and must be rejected
 *       before any site-level check runs.
 *     - `site` is the predication site the mark is being admitted into.
 *       Admission is evaluated against the site's own existing cells and
 *       predicates — a mark is judged by what it is, epistemically,
 *       against that site, not merely matched against a rule that names
 *       its type. This is the design's stated departure from P-system
 *       membranes, whose rules fire on symbolic pattern match alone
 *       (design doc §1, Stage 2; synthesis note §3).
 *     - A successful admission is content-addressed: the resulting cell's
 *       identity is derived from the admitted mark's content, so a later
 *       audit can recover exactly what crossed the membrane and when,
 *       matching the filesystem-state-sources package's own discipline.
 *     - Rejection is not silent: it must carry a reason referring to
 *       which site predicate the mark failed, so a rejected admission is
 *       itself evidence, not merely an absence of one.
 *
 *   reject(mark, site, reason) -> void
 *
 *     - Records a rejected admission attempt without altering the site's
 *       state. What "recording" means (a log, a witness journal entry,
 *       nothing at all) is not yet decided; deciding it is part of
 *       implementing this module, not part of naming its contract.
 *
 * Nothing below is implemented. No function in this file performs
 * admission, evaluates a predicate, or produces a cell. This file exists
 * to state the contract precisely enough that a real implementation
 * either satisfies it or explicitly revises it — not to simulate having
 * one.
 */

export {};
