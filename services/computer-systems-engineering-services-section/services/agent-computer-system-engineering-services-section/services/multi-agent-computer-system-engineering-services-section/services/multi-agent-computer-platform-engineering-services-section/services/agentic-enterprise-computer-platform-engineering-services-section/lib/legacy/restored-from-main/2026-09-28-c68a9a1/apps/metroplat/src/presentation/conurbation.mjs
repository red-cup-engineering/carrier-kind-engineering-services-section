/**
 * running/conurbation — settlement-qualified schema-node addressing.
 *
 * `schemaNodeTree`/`aggregateNodeApex`/`routeRequest` (`./mounting.mjs`) are
 * already generic over an arbitrary `SchemaMount[]` — they pool whatever
 * mounts share a node id into one coproduct apex, regardless of which
 * package or process produced them. The one thing missing for "N
 * settlements, one served mesh" is that `mountNodeOf` derives a node id
 * purely from a mount's own action-schema `$id`s, with no settlement
 * identity in it: two settlements running the same package version would
 * mount equivalently-shaped operations at the SAME node id, and
 * `aggregateNodeApex` would silently coproduct them — indistinguishable from
 * a deliberate cross-settlement pool. This module is the fix: qualify each
 * settlement's own mounts under its own token before they are ever
 * concatenated, so a conurbation's per-settlement view stays properly
 * separated by default. `conurbationMounts` always qualifies — it never
 * silently pools. A deliberate federated view (several settlements'
 * equivalent operations read as one) is a separate, explicit mount the caller
 * builds with its own bare node id and `aggregateNodeApex`, then adds
 * alongside the qualified mesh — the same `aggregateNodeApex` already
 * proven for pooling several modules within one settlement's own mesh, used
 * on purpose rather than by accident.
 */
import { mountNodeOf } from "./mounting.mjs";

/** One settlement's own mounted mesh, named by the token it is known by in a
 *  conurbation. The token is caller-supplied, never derived from the
 *  dataRoot path — a settlement's name is earned by what it settles, not
 *  guessed from its filesystem location. */

/** Re-address one mount under its settlement's own token. */
export function dataRootQualifiedMount(mount, token) {
  if (token.trim().length === 0) throw new TypeError("dataRootQualifiedMount: token must be nonempty");
  return Object.freeze({
    ...mount,
    name: `${token}:${mount.name}`,
    nodeId: `${token}/${mountNodeOf(mount)}`,
  });
}

/**
 * The coproduct mesh of N settlements' own mounts, each settlement-qualified
 * so its operations stay addressed under its own token. Feed the result into
 * the same `schemaNodeTree`/`serveSchemaNamespace` already proven for
 * one settlement's mesh — nothing downstream needs to know this is more
 * than one settlement; a conurbation is a mesh like any other, just built
 * from more than one settlement's mounts.
 */
export function conurbationMounts(settlements) {
  return Object.freeze(settlements.flatMap((settlement) =>
    settlement.mounts.map((mount) => dataRootQualifiedMount(mount, settlement.token))));
}
