

/**
 * Description of how one observation enters recorded source material.
 *
 * Callers provide the domain-specific part: a stable feed name, a cellizer that
 * turns one observation into EAVT rows, and the attributes whose projected state
 * should be latest-statement-wins. Filesystem persistence and state writes live in
 * `services/filesystem-store`.
 */

