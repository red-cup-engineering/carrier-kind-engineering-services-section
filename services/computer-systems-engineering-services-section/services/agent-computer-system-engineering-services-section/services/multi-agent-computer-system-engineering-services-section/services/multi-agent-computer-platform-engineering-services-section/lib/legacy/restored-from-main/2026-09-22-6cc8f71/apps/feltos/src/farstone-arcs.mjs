/**
 * Farstone's standing story arcs: player choices with an irreversible consequence, held open
 * by the world as a genuine contradiction until a player resolves them at the civic office.
 *
 * The dredging-permit dispute (`petition`) and the Hydrant-23 water-quality dispute
 * (`inspect`/`audit`/`recheck`/`reinspect`) are both instances of the same shape: a decision
 * held `"contested"` until a player, standing in a `civic`-tagged room, settles it — and the
 * settlement changes the world for good.
 */
import { defineCapability } from "./capabilities.mjs";
import { declareFunctional, placeOf, subjects, tell, value, values } from "./world.mjs";

const PERMIT = "the-dredging-permit";

function rooms(world) {
  return subjects(world).filter((id) => value(world, id, "kind") === "room");
}

function hasTag(world, id, tag) {
  return values(world, id, "tag").includes(tag);
}

/** A stable roll in `[0, 1)` from a joined key — replay-exact chance, no engine RNG needed. */
function rollFor(...parts) {
  const text = parts.join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 0x1_0000_0000;
}

function atCivicOffice(world, actor) {
  const room = placeOf(world, actor);
  return room !== null && hasTag(world, room, "civic");
}

/**
 * The dredging-permit dispute (Application 23): held contested between Coilin Vey, who wants a
 * deep-water channel dredged, and Brannaugh Ross, whose clam ground the dredge would silt. A
 * petition filed at the civic office settles it for good, one side wronged either way.
 */
function petition(ctx) {
  const side = ctx.argument.trim().toLowerCase();
  const status = value(ctx.world, PERMIT, "decision-status");
  if (status !== "contested") {
    return { world: ctx.world, events: [ctx.message(ctx.actor, status === null
      ? "There is no live petition to file."
      : `Application 23 is already settled (${status}); the clerk waves you off.`)] };
  }
  if (!atCivicOffice(ctx.world, ctx.actor)) {
    return { world: ctx.world, events: [ctx.message(ctx.actor, "You can only file a petition at the records clerk's office — downtown, in the civic blocks.")] };
  }
  let world = ctx.world;
  if (/coilin|dredge|grant|channel/.test(side)) {
    world = tell(declareFunctional(world, ["decision-status"]), { subject: PERMIT, predicate: "decision-status", object: "granted" }, { source: "feltos.farstone-arcs" });
    for (const room of rooms(world)) {
      if (!hasTag(world, room, "shellfish")) continue;
      world = tell(declareFunctional(world, ["pollution", "shellfish-closed"]), [
        { subject: room, predicate: "pollution", object: Number(value(world, room, "pollution") ?? 0) + 8 },
        { subject: room, predicate: "shellfish-closed", object: "true" },
      ], { source: "feltos.farstone-arcs" });
    }
    if (subjects(world).includes("brannaugh-ross")) {
      world = tell(declareFunctional(world, ["embittered"]), { subject: "brannaugh-ross", predicate: "embittered", object: "true" }, { source: "feltos.farstone-arcs" });
    }
    return { world, events: [ctx.message(ctx.actor, "You file in favour of the dredge. The channel will be cut — and the silt will choke the marsh clam bed. Coilin's cause carries; Brannaugh's ground is lost, and she will not forget it.")] };
  }
  if (/brannaugh|clam|deny|marsh|refuse/.test(side)) {
    world = tell(declareFunctional(world, ["decision-status"]), { subject: PERMIT, predicate: "decision-status", object: "denied" }, { source: "feltos.farstone-arcs" });
    if (subjects(world).includes("coilin-vey")) {
      world = tell(declareFunctional(world, ["embittered"]), { subject: "coilin-vey", predicate: "embittered", object: "true" }, { source: "feltos.farstone-arcs" });
    }
    return { world, events: [ctx.message(ctx.actor, "You file against the dredge. The clam bed is spared and the deep-water channel stays a dream. Brannaugh's cause carries; Coilin seethes, and the feud takes that shape.")] };
  }
  return { world: ctx.world, events: [ctx.message(ctx.actor, "Petition for whom? 'petition coilin' (grant the dredge) or 'petition brannaugh' (spare the clam bed). Choose, and the world will hold to it.")] };
}

/**
 * The Hydrant-23 arc: two inspectors filed conflicting water-quality status, so the world holds
 * a contested top the council cannot resolve away. Under the precautionary principle it is
 * treated as fail — a standing boil-water advisory — until a re-inspection settles it. The true
 * state is seeded off the world's own seed, so a replay always resolves it the same way.
 */
function inspect(ctx) {
  const target = ctx.argument.trim().toLowerCase().replace(/\s+/g, "-") || "hydrant-23";
  const status = value(ctx.world, target, "water-quality");
  if (status !== "contested") {
    return { world: ctx.world, events: [ctx.message(ctx.actor, status === null
      ? `There is no contested inspection at "${target}". (try 'inspect hydrant-23')`
      : `${target.replace(/-/g, " ")} is settled (${status}); no re-inspection is needed.`)] };
  }
  if (!atCivicOffice(ctx.world, ctx.actor)) {
    return { world: ctx.world, events: [ctx.message(ctx.actor, "Re-inspections are dispatched from the records clerk's office — downtown, in the civic blocks.")] };
  }
  const seed = value(ctx.world, "the-world", "world-seed") ?? 1;
  const pass = rollFor(seed, target) > 0.4;
  const world = tell(declareFunctional(ctx.world, ["water-quality", "advisory"]), [
    { subject: target, predicate: "water-quality", object: pass ? "pass" : "fail" },
    { subject: target, predicate: "advisory", object: pass ? "clear" : "boil-water" },
  ], { source: "feltos.farstone-arcs" });
  const text = pass
    ? `You dispatch a re-inspection of ${target.replace(/-/g, " ")}. The re-test comes back clean — the contradiction resolves to a pass, and the boil-water advisory lifts.`
    : `You dispatch a re-inspection of ${target.replace(/-/g, " ")}. The re-test confirms the fail — the advisory stands, and the source of the contamination must be found.`;
  return { world, events: [ctx.message(ctx.actor, text)] };
}

export const farstoneArcsCapability = defineCapability({
  id: "feltos.farstone-arcs",
  commands: { petition, inspect, audit: inspect, recheck: inspect, reinspect: inspect },
});
