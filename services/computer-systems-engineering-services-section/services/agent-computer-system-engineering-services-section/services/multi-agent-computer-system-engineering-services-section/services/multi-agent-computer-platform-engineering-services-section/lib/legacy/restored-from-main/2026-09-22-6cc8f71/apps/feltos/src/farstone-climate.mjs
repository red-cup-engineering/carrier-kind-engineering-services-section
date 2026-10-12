/**
 * Farstone's climate, woven into the systems it already runs — not six new mechanisms but six
 * couplings of one climate spine into ecology, the market, needs, and civic life:
 *
 *   - **stormCascade** — a storm closes the harbor and cancels the ferry.
 *   - **seasonalEcology** — spring spawns fish; storms churn runoff into the sea.
 *   - **shellfishClosure** — a warm season on top of recent rainfall closes the clam bed.
 *   - **fireWatch** — a long dry streak in the warm season raises the fire-danger base-rate.
 *   - **seasonalMarket** — off-season scarcity lifts the fish price; the growing season eases it.
 *   - **weatherMood** — foul or cold weather presses on rest, and the sky speaks to everyone
 *     standing outdoors.
 *
 * Time and season are read off the shared clock (`./world-clock.mjs`'s `clockTime`/`seasonAt`) —
 * reused, not forked. Farstone's own weather is a richer five-state seeded Markov chain the
 * shared clock's simpler model can't express, so it settles as its own `farstone-weather` cell
 * on the clock's entity rather than overwriting the shared capability's own `weather` cell.
 */
import { defineCapability } from "./capabilities.mjs";
import { CLOCK, PHASE_LENGTH, SEASON_LENGTH, clockSeed, clockTime, phaseAt, seasonAt, tideAt } from "./world-clock.mjs";
import { declareFunctional, placeOf, subjects, tell, value, values } from "./world.mjs";

const round1 = (n) => Math.round(n * 10) / 10;

function things(world) {
  return subjects(world).filter((id) => value(world, id, "kind") === "thing");
}

function rooms(world) {
  return subjects(world).filter((id) => value(world, id, "kind") === "room");
}

function hasTag(world, id, tag) {
  return values(world, id, "tag").includes(tag);
}

function roomsTagged(world, tag) {
  return rooms(world).filter((room) => hasTag(world, room, tag));
}

function thingsTagged(world, tag) {
  return things(world).filter((thing) => hasTag(world, thing, tag));
}

function livingNpcs(world) {
  return thingsTagged(world, "npc").filter((npc) => value(world, npc, "condition") !== "dead");
}

function broadcast(world, actors, room, text, message) {
  return actors.filter((actor) => placeOf(world, actor) === room).map((actor) => message(actor, text));
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

const WEATHERS = Object.freeze(["clear", "cloudy", "rain", "storm", "fog"]);

/** Farstone's cool-Atlantic maritime climate: unnormalized transition weights per season. */
export const FARSTONE_WEATHER = Object.freeze({
  spring: {
    clear: { clear: 4, cloudy: 3, fog: 2 },
    cloudy: { clear: 3, cloudy: 3, rain: 3, fog: 2 },
    rain: { cloudy: 3, rain: 3, clear: 1 },
    storm: { rain: 3, cloudy: 2, storm: 1 },
    fog: { fog: 3, cloudy: 2, clear: 3 },
  },
  summer: {
    clear: { clear: 7, cloudy: 2, fog: 2 },
    cloudy: { clear: 4, cloudy: 3, rain: 1, fog: 1 },
    rain: { cloudy: 3, clear: 2, rain: 1, storm: 1 },
    storm: { rain: 2, cloudy: 3, clear: 1 },
    fog: { clear: 5, fog: 2, cloudy: 1 },
  },
  autumn: {
    clear: { clear: 3, cloudy: 4, fog: 1 },
    cloudy: { cloudy: 3, rain: 3, storm: 2, clear: 1 },
    rain: { rain: 3, storm: 3, cloudy: 2 },
    storm: { storm: 3, rain: 3, cloudy: 2 },
    fog: { fog: 2, cloudy: 3, rain: 1 },
  },
  winter: {
    clear: { clear: 2, cloudy: 5, fog: 1 },
    cloudy: { cloudy: 4, rain: 3, storm: 2, clear: 1 },
    rain: { rain: 3, cloudy: 3, storm: 2 },
    storm: { storm: 2, rain: 3, cloudy: 3 },
    fog: { fog: 1, cloudy: 4, rain: 1 },
  },
});

/** Sample the next weather from the model's row, using a uniform roll `r ∈ [0,1)`. */
function stepWeather(current, season, roll) {
  const row = FARSTONE_WEATHER[season][current] ?? {};
  let total = 0;
  for (const wx of WEATHERS) total += row[wx] ?? 0;
  if (total <= 0) return current;
  const target = roll * total;
  let acc = 0;
  for (const wx of WEATHERS) {
    acc += row[wx] ?? 0;
    if (target < acc) return wx;
  }
  return current;
}

const WEATHER_LINE = Object.freeze({
  clear: "The sky is clear over the granite; light lies clean on the water.",
  cloudy: "A low grey ceiling sits over the harbor, flat and close.",
  rain: "Rain comes down steady and cold, running black off the slate roofs.",
  storm: "The storm drives in off the Atlantic — spray over the breakwater, lines singing.",
  fog: "Fog stands thick on the water; the South Point light is only a smear.",
});

/** The single-valued cells the couplings settle — registered functional so their traces compact. */
export const FARSTONE_CLIMATE_FUNCTIONAL = Object.freeze([
  "farstone-weather", "harbor-closed", "shellfish-closed", "recent-rainfall", "fire-danger", "sailing",
]);

export const farstoneClimateCapability = defineCapability({
  id: "feltos.farstone-climate",

  commands: {
    /** The harbor almanac: season, sky, tide, and every standing advisory. */
    almanac(ctx) {
      const time = clockTime(ctx.world) + 1;
      const weather = value(ctx.world, CLOCK, "farstone-weather") ?? "clear";
      const season = seasonAt(time);
      const phase = phaseAt(time);
      const tide = tideAt(time);
      const growing = season === "spring" || season === "summer";
      const lines = [
        `Almanac of Farstone — ${season}, ${phase}.`,
        `The sky is ${weather}; the tide runs ${tide}. ${growing ? "The growing season is in." : "The growing season is past."}`,
      ];
      const fire = value(ctx.world, CLOCK, "fire-danger");
      if (fire !== null && fire !== "low") lines.push(`Fire-watch: danger ${fire}.`);
      if (value(ctx.world, CLOCK, "harbor-closed") === "true") lines.push("The harbor is CLOSED — no sailings until the storm lifts.");
      if (value(ctx.world, CLOCK, "shellfish-closed") === "true") lines.push("The clam bed is under a shellfish closure.");
      return { world: ctx.world, events: [ctx.message(ctx.actor, lines.join("\n"))] };
    },
  },

  onTick(ctx) {
    let world = ctx.world;
    const events = [];
    const time = clockTime(world) + 1;
    const season = seasonAt(time);
    const phase = phaseAt(time);
    const boundary = time % PHASE_LENGTH === 0;
    const seasonTurn = time % SEASON_LENGTH === 0;
    let weather = value(world, CLOCK, "farstone-weather") ?? "clear";

    // The weather rolls at each phase boundary, seeded on the clock's own seed and time —
    // replay-exact, and never `Math.random`.
    if (boundary) {
      weather = stepWeather(weather, season, rollFor(clockSeed(world), time));
      world = tell(declareFunctional(world, ["farstone-weather"]), { subject: CLOCK, predicate: "farstone-weather", object: weather }, { source: "feltos.farstone-climate" });
    }

    // stormCascade — the storm closes the working waterfront.
    const stormed = weather === "storm";
    const closed = value(world, CLOCK, "harbor-closed") === "true";
    if (stormed && !closed) {
      world = tell(declareFunctional(world, ["harbor-closed"]), { subject: CLOCK, predicate: "harbor-closed", object: "true" }, { source: "feltos.farstone-climate" });
      for (const f of thingsTagged(world, "ferry")) world = tell(declareFunctional(world, ["sailing"]), { subject: f, predicate: "sailing", object: "cancelled" }, { source: "feltos.farstone-climate" });
      for (const r of roomsTagged(world, "harbor")) events.push(...broadcast(world, ctx.actors, r, "Storm cones run up the signal mast — the harbormaster closes the harbor. No vessel sails until it lifts.", ctx.message));
      for (const r of roomsTagged(world, "ferry")) events.push(...broadcast(world, ctx.actors, r, "A chalked notice goes up: SAILING CANCELLED — FOUL WEATHER. Stranded passengers crowd the benches.", ctx.message));
    } else if (!stormed && closed) {
      world = tell(declareFunctional(world, ["harbor-closed"]), { subject: CLOCK, predicate: "harbor-closed", object: "false" }, { source: "feltos.farstone-climate" });
      for (const f of thingsTagged(world, "ferry")) world = tell(declareFunctional(world, ["sailing"]), { subject: f, predicate: "sailing", object: "scheduled" }, { source: "feltos.farstone-climate" });
      for (const r of roomsTagged(world, "harbor")) events.push(...broadcast(world, ctx.actors, r, "The storm cones come down. The harbor is open again, and the ferry makes ready for its run.", ctx.message));
    }

    // seasonalEcology — spring spawns, storms churn the runoff — at each phase boundary.
    if (boundary) {
      for (const cell of roomsTagged(world, "ocean")) {
        if (weather === "storm") {
          world = tell(declareFunctional(world, ["pollution"]), { subject: cell, predicate: "pollution", object: round1(Number(value(world, cell, "pollution") ?? 0) + 1.5) }, { source: "feltos.farstone-climate" });
        }
        if (season === "spring") {
          const cap = Number(value(world, cell, "capacity-fish") ?? 20);
          const stock = Number(value(world, cell, "fish-stock") ?? cap);
          if (stock < cap) world = tell(declareFunctional(world, ["fish-stock"]), { subject: cell, predicate: "fish-stock", object: round1(Math.min(cap, stock + cap * 0.05)) }, { source: "feltos.farstone-climate" });
        }
      }
    }

    // shellfishClosure — warm water plus recent rain shuts the clam bed — at each phase boundary.
    if (boundary) {
      const wet = weather === "rain" || weather === "storm";
      const rr = Math.min(10, Math.max(0, Number(value(world, CLOCK, "recent-rainfall") ?? 0) + (wet ? 2 : -1)));
      world = tell(declareFunctional(world, ["recent-rainfall"]), { subject: CLOCK, predicate: "recent-rainfall", object: rr }, { source: "feltos.farstone-climate" });
      const shouldClose = season === "summer" && rr >= 4;
      const was = value(world, CLOCK, "shellfish-closed") === "true";
      if (shouldClose !== was) {
        world = tell(declareFunctional(world, ["shellfish-closed"]), { subject: CLOCK, predicate: "shellfish-closed", object: String(shouldClose) }, { source: "feltos.farstone-climate" });
        for (const r of [...roomsTagged(world, "marsh"), ...roomsTagged(world, "shellfish")]) {
          world = tell(declareFunctional(world, ["shellfish-closed"]), { subject: r, predicate: "shellfish-closed", object: String(shouldClose) }, { source: "feltos.farstone-climate" });
        }
        const where = [...roomsTagged(world, "marsh"), ...roomsTagged(world, "shellfish"), ...roomsTagged(world, "harbor")];
        for (const r of where) events.push(...broadcast(world, ctx.actors, r, shouldClose ? "The records clerk posts a shellfish closure — the warm, freshened water has shut the clam bed." : "The shellfish closure lifts; the clam bed is open to harvest again.", ctx.message));
      }
    }

    // fireWatch — a dry warm spell raises the fire-danger base-rate — at each phase boundary.
    if (boundary) {
      const dry = Number(value(world, CLOCK, "dry-streak") ?? 0);
      const warm = season === "summer" || season === "spring";
      const danger = !warm ? "low" : dry >= 8 ? "high" : dry >= 4 ? "moderate" : "low";
      if (value(world, CLOCK, "fire-danger") !== danger) {
        world = tell(declareFunctional(world, ["fire-danger"]), { subject: CLOCK, predicate: "fire-danger", object: danger }, { source: "feltos.farstone-climate" });
        if (danger === "high") for (const r of [...roomsTagged(world, "forest"), ...roomsTagged(world, "outdoor")]) events.push(...broadcast(world, ctx.actors, r, "A fire-watch notice is posted: the woods are tinder-dry. No open flame above the watershed line.", ctx.message));
      }
    }

    // seasonalMarket — the off-season runs the fish price up — at each season turn.
    if (seasonTurn) {
      const off = season === "autumn" || season === "winter";
      const factor = off ? 1.3 : 0.8;
      for (const shop of thingsTagged(world, "shopkeeper")) {
        const price = value(world, shop, "price:fish");
        if (price === null) continue;
        world = tell(declareFunctional(world, ["price:fish", "stock:fish"]), [
          { subject: shop, predicate: "price:fish", object: round1(Number(price) * factor) },
          { subject: shop, predicate: "stock:fish", object: Math.max(0, Math.round(Number(value(world, shop, "stock:fish") ?? 0) * (off ? 0.6 : 1.2))) },
        ], { source: "feltos.farstone-climate" });
      }
    }

    // weatherMood — the sky presses on rest, and speaks to everyone standing outdoors.
    if (boundary) {
      const harsh = weather === "rain" || weather === "storm" || weather === "fog" || season === "winter";
      if (harsh) for (const npc of livingNpcs(world)) {
        world = tell(declareFunctional(world, ["need:rest"]), { subject: npc, predicate: "need:rest", object: Math.min(20, Number(value(world, npc, "need:rest") ?? 0) + 1) }, { source: "feltos.farstone-climate" });
      }
      if (phase === "dawn" || phase === "dusk" || harsh) for (const r of roomsTagged(world, "outdoor")) events.push(...broadcast(world, ctx.actors, r, WEATHER_LINE[weather], ctx.message));
    }

    return { world, events };
  },
});
