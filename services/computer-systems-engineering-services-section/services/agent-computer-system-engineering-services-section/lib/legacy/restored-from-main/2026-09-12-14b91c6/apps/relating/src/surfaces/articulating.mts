/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/relating/articulating` — relating's composed face on the
 * articulation surface owned by `@lenticule-science/articulating`.
 *
 * relating is an app: it composes this package downward and offers the composed
 * surface to its own consumers. It owns none of this science. Nothing but a
 * re-export belongs in this file — a name that needs different behavior here is a
 * change to the owning package, never a local variant.
 */
export * from "@lenticule-science/articulating";
export * as predicating from "@lenticule-science/articulating/predicating";
