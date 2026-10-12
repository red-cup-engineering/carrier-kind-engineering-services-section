/**
 * The metroplex in space: where each room stands, and the city a graphical client draws.
 *
 * A section is a settlement: bounded, holding its own interior, meeting others only at its
 * boundary (the 2026-07-05 monograph on what MetroPlat is). So each room is a FeltOS place with
 * extent, an enclosed prism, and the city is the house's section tree laid out as a nested,
 * squarified treemap terraced by depth: a section stands on the section that holds it, its area
 * the share of the tree it holds, one storey higher. The plaza is the ground the top-level
 * sections stand on. Nothing about the layout is chosen per instance: the same tree gives the
 * same city on every node.
 *
 * A client draws from FeltOS's own perception frame (what the character perceives, the same
 * frame every FeltOS game sends) and the atlas (the room tree, scenery any client may hold, from
 * which it lays out the extent of every place with qwzspace's place-tree), through the qwzspace
 * engine's fiber projection, so the three-dimensional, two-dimensional and text tiers all read one
 * scene.
 */
import { PerceptionClockType, buildPerceptionFrame, createPerceptionFrameType } from "@red-cup-engineering/feltos/perception-frame";
import { phaseAt, seasonAt, tideAt } from "@red-cup-engineering/feltos/calendar";
import { packPlaceTree, terracedTreemap } from "@red-cup-engineering/qwzspace/place-tree";
import { subjects, certainValue, values, exitsOf } from "@red-cup-engineering/feltos/world";

const KINDS = Object.freeze(["office", "package", "skill", "book"]);
/**
 * The house's jurisdictions in dependency order, primitive to composed: knowledge is made in
 * science, applied in engineering, run in operations, and offered to the public. A section's
 * jurisdiction is the deepest of these its path passes through; a section under none is the
 * house's own.
 */
export const JURISDICTIONS = Object.freeze(["house", "science", "engineering", "operations", "public"]);
/** Each jurisdiction's colour, the one every tier tints its sections with. */
export const JURISDICTION_TINTS = Object.freeze({ house: "#cfc6b0", science: "#5b8def", engineering: "#e0a43a", operations: "#4fb286", public: "#c75b7a" });

/** The city's dimensions, in metres: the plaza's side and slab, one storey, and the margins. */
export const CITY = Object.freeze({ side: 720, ground: [0, 2], storey: 3, margin: 0.06, gap: 0.04 });

export function jurisdictionOf(sectionPath) {
  let found = "house";
  for (const part of String(sectionPath ?? "").split("/")) {
    for (const word of part.toLowerCase().split("-")) if (word !== "house" && JURISDICTIONS.includes(word)) found = word;
  }
  return found;
}

/** Where every room stands: `up` maps each room but the root to the room that holds it, in the
 *  order the atlas lists them. The city is qwzspace's terraced treemap of the section tree, so a
 *  client that holds the tree draws the same city without being sent it. */
export const cityLayout = (up, root, city = CITY) => terracedTreemap(up, root, city);

/** The time a world at `tick` reports, on FeltOS's own calendar; the metroplex keeps no weather. */
export const clockAt = (tick) => Object.freeze({ time: tick, phase: phaseAt(tick), season: seasonAt(tick), tide: tideAt(tick), weather: "clear", dryStreak: 0 });

const FrameType = createPerceptionFrameType("metroplat.metroplex", PerceptionClockType);

/** What `actor` perceives, as FeltOS's perception frame: the one a client draws every tier from. */
export function metroplexFrame(engine, actor, situation) {
  return buildPerceptionFrame({
    engine, situation, frameType: FrameType, kind: "metroplat.metroplex", world: engine.world, actor, tick: engine.tick,
    clock: clockAt(engine.tick), affordancesFor: () => [],
  });
}

/** The whole city: each place's extent, and each room's jurisdiction, holdings and seats. */
/** How the atlas tells the room tree: a room's id and path extend its holder's by these separators. */
export const ATLAS_TAILS = Object.freeze({ id: ".", path: "/" });

export function metroplexAtlas(game, world) {
  const ids = subjects(world);
  const roomIds = ids.filter(id => certainValue(world, id, "kind") === "room");
  const pathOf = new Map(roomIds.map(id => [id, certainValue(world, id, "section-path")]));
  const counts = new Map(roomIds.map(id => [id, {}]));
  const seated = new Map();
  for (const id of ids) {
    const room = certainValue(world, id, "located-in"), tally = counts.get(room);
    for (const kind of KINDS.filter(kind => values(world, id, "tag").includes(kind))) {
      if (tally !== undefined) tally[kind] = (tally[kind] ?? 0) + 1;
    }
    if (tally !== undefined && values(world, id, "tag").includes("office")) {
      const actors = values(world, id, "seated");
      if (actors.length) seated.set(room, [...new Set([...(seated.get(room) ?? []), ...actors])]);
    }
  }
  // The rooms in the world's order, which is the city's sibling order: whoever holds the atlas lays
  // the city out (cityLayout) and tints it (tints by jurisdiction) as the world did. Nothing derivable
  // travels: no footprint, no tint, no zero count, no id or path a holder already spells.
  const rooms = roomIds.map(id => {
    const told = { id, name: certainValue(world, id, "name") ?? id, path: pathOf.get(id) ?? null, up: exitsOf(world, id).find(exit => exit.direction === "up")?.destination ?? null, jurisdiction: jurisdictionOf(pathOf.get(id)) };
    if (Object.keys(counts.get(id)).length > 0) told.things = counts.get(id);
    if (seated.has(id)) told.seated = seated.get(id);
    return told;
  });
  return Object.freeze({
    kind: "metroplat.metroplex.atlas", game: game.id, start: game.start, jurisdictions: JURISDICTIONS, tints: JURISDICTION_TINTS,
    city: CITY, tails: ATLAS_TAILS, rooms: packPlaceTree(rooms, ATLAS_TAILS),
  });
}

export const atlasSchema = Object.freeze({
  $id: "metroplat/metroplex/atlas", title: "MetroplexAtlas", type: "object", required: ["kind", "start", "city", "tails", "rooms"],
  properties: {
    kind: { const: "metroplat.metroplex.atlas" }, game: { type: "string" }, start: { type: "string" },
    jurisdictions: { type: "array", items: { type: "string" } }, tints: { type: "object" },
    city: { type: "object", required: ["side", "ground", "storey", "margin", "gap"] },
    tails: { type: "object", additionalProperties: { type: "string" } },
    rooms: { type: "array", items: { type: "object", required: ["name", "up", "jurisdiction"], properties: {
      id: { type: "string" }, idTail: { type: "string" }, name: { type: "string" }, path: { type: ["string", "null"] }, pathTail: { type: "string" },
      up: { type: ["integer", "null"] }, jurisdiction: { enum: JURISDICTIONS }, things: { type: "object" }, seated: { type: "array", items: { type: "string" } },
    } } },
  },
});
