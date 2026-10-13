/**
 * The world drawn: the city as a game, over the page that plays it without a script.
 *
 * The game is qwzspace's one game client (game-client.mjs): the window, its panels, the camera,
 * the labels and the keys are its. What is the world's is here: the city an atlas tells, what a
 * line said to it means, and where a click goes.
 *
 * Two modes. On the street (a visitor who has not signed in) the client watches: the city turns
 * slowly under its title card, any building one sees named can be flown to and looked over, and
 * nothing is said to the world. At play (a signed-in person) each line goes to `world-command`
 * asking for the character's FeltOS perception frame too; the qwzspace fiber projects that frame
 * over the city (every room's extent, laid out from the atlas's room tree) into the scene drawn.
 *
 * Either way the city is alive with the house's work (world-jianghu.mjs): the pulse is polled,
 * and the routines and accounts acting in it are figures leaping roof to roof to the halls their
 * work is in, the buildings flare with what is done in them, and word of each act passes beside the
 * map. On the street the figures are nobody in particular and the word says only where. At play
 * the word of the work itself is heard too: the tellings (metroplat's world-tellings) are
 * polled beside the pulse, and each move on the work board passes beside the map as what was said,
 * in place of the pulse's word that someone took a task from the board.
 *
 * At play the journal is followed as an MMO's quest tracker is, under the menu: the threads on the
 * work board awaiting one's own move, nearest first (metroplat's world-journal, read again a
 * while after, at once after one's own move, and from any turn that showed it). A thread's handle
 * reads it (quest <handle>); a move owed puts its line in the chat to finish and say, so the
 * tracker teaches the commands an agent speaks, and nothing is played by a stray click.
 *
 * Keys beyond the client's: U or Backspace goes up at play; Esc or Home returns to the whole city
 * on the street.
 * @module
 */
import { projectFiber } from "@red-cup-engineering/qwzspace/fiber";
import { createGameClient, element } from "@red-cup-engineering/qwzspace/game-client";
import { terracedTreemap, unpackPlaceTree } from "@red-cup-engineering/qwzspace/place-tree";
import { boundsOf, poseOver } from "@red-cup-engineering/qwzspace/scene-view";
import { EPITHETS, createJianghu, spotOn } from "./world-jianghu.mjs";

const LABELS = 48;
const PLACEHOLDER = "Enter to speak: look, go <exit>, locate <words>, powers…";
/** How often the pulse is read, and how often a still city is drawn again for its cooling halls. */
const POLL_MS = 2500;
/** How many tellings pass beside the map from one reading; the rest are in `tellings`. */
const HEARD = 6;
/** The acts whose word a telling says better: moves on the work board. */
const TOLD_VERBS = /^work-(?:move|open)$/u;
/** How often the journal is read again, and how many of its threads the tracker shows. */
const JOURNAL_MS = 15000;
const TRACKED = 6;
const COOL_MS = 1000;
/** How many figures are named at once, and a figure's height before it is scaled to what is looked over. */
const NAMED = 8;
const FIGURE = 1.9;
/** A disciple carries its own lantern: a routine jade, an account gold; brighter on the wing. */
const LANTERNS = Object.freeze({ routine: "#7ff0c8", account: "#ffd27a" });
/** How much of a hall's warmth the building holding it shows, a storey up. */
const WARMTH_UP = 0.55;

const title = (text) => String(text).split(/[-_\s]+/u).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
// What an act is, told as a deed: the first pattern its verb matches.
const DEEDS = [
  [/^enterprise-loop-run$/u, "walks the sect's rounds"],
  [/^enterprise-work-run$/u, "takes up the sect's labour"],
  [/^run-due$/u, "strikes the hour"],
  [/^work-/u, "takes a task from the board"],
  [/^world-/u, "speaks in the city"],
  [/(read|list|search|get|query|fetch|status|inspect|observe)/u, "consults the scrolls"],
  [/(admit|write|record|publish|commit|append|sync)/u, "inscribes a record"],
];
const deedOf = (verb) => DEEDS.find(([pattern]) => pattern.test(verb))?.[1] ?? "sets a working in motion";
const clip = (text, most) => {
  const flat = String(text ?? "").replace(/\s+/gu, " ").trim();
  return flat.length > most ? `${flat.slice(0, most - 1)}…` : flat;
};
const listOf = (names) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);
const RUMOURS = ["A figure crosses the rooftops to", "Lanterns stir at", "Someone is at work at", "Word comes from"];

/** The city an atlas tells: its room tree whole again, each room in its jurisdiction's tint, and
 *  every room's extent laid out by qwzspace's place tree in the atlas's order, as the world laid it out. */
const cityOf = (atlas) => {
  const rooms = unpackPlaceTree(atlas.rooms, atlas.tails).map((room) => ({ ...room, tint: atlas.tints[room.jurisdiction] }));
  const regions = terracedTreemap(new Map(rooms.filter((room) => room.up !== null).map((room) => [room.id, room.up])), atlas.start, atlas.city);
  const places = Object.fromEntries(rooms.filter((room) => regions.has(room.id)).map((room) => [room.id, { name: room.name, tint: room.tint, region: regions.get(room.id) }]));
  return { ...atlas, rooms, places };
};
const centreOf = (body) => {
  const [x0, y0, x1, y1] = boundsOf(body.footprint);
  return [(x0 + x1) / 2, (y0 + y1) / 2];
};

const linesOf = (turn) => [
  ...(turn.messages ?? []),
  ...(turn.results ?? []).map((result) => `${result.ok ? "✓" : "✗"} ${result.verb}: ${JSON.stringify(result.ok ? result.value : result.error, null, 2)}`),
];

async function start(mount) {
  const street = mount.dataset.mode === "street";
  const hearing = !street && Boolean(mount.dataset.tellings);
  const atlas = cityOf(await fetch(mount.dataset.atlas, { credentials: "same-origin" }).then((response) => {
    if (!response.ok) throw new Error(`atlas: ${response.status}`);
    return response.json();
  }));
  const rooms = new Map(atlas.rooms.map((room) => [room.id, room]));
  const childrenOf = new Map();
  for (const room of atlas.rooms) if (room.up) childrenOf.set(room.up, [...(childrenOf.get(room.up) ?? []), room.id]);
  const held = (room) => Object.entries(room.things ?? {}).filter(([, count]) => count > 0).map(([kind, count]) => `${count} ${kind}${count === 1 ? "" : "s"}`);
  const nameOf = (id) => rooms.get(id)?.name || `${rooms.get(id)?.jurisdiction ?? "a"} building`;
  // A hall by what it is in the jianghu: the plaza, or a temple, forge, court, market or palace,
  // named for the nearest building holding it that has a name.
  const hallOf = (id) => {
    if (id === atlas.start) return "the plaza";
    let named = id;
    while (named && !rooms.get(named)?.name) named = rooms.get(named)?.up;
    return `the ${EPITHETS[rooms.get(id)?.jurisdiction] ?? "hall"} of ${named ? rooms.get(named).name : "the city"}`;
  };

  // The house at work. `base` is the city as projected; what is drawn is it with the halls aglow
  // and the figures standing where the jianghu has them.
  const jianghu = createJianghu({
    spotOf: (room, who) => {
      const body = atlas.places[room]?.region.body;
      return body && spotOn(body, who, { open: room === atlas.start });
    },
  });
  let base = null, city = null, composedAt = -Infinity, figureScale = 1, roomLabels = [], namedKey = null;

  // What is looked over: at play the room one is in, on the street the building one flew to.
  let focus = atlas.start, busy = false;
  const roomNow = () => (street ? focus : client.scene?.place?.id ?? atlas.start);
  // On the street the title card stands over the window's left: the city is looked at from beside it.
  const card = street ? mount.querySelector(".qz-card") : null;

  const client = await createGameClient(mount, {
    title: mount.dataset.title ?? "MetroPlat",
    navigation: JSON.parse(mount.dataset.navigation ?? "[]"),
    watching: street,
    idle: street,
    placeholder: PLACEHOLDER,
    aside: () => (card && innerWidth > 900 ? 0.3 : 0),
    say: (line) => speak(line),
    choose: (id) => travelTo(id),
    // A click goes to the building one sees named there, not the innermost room under the pointer:
    // the deepest labelled room holding what was hit, else the one opening off where one is or off
    // a room one is within (a child, a sibling, an uncle). On the map, on the street, the innermost
    // named building holding it.
    meant(ids, from) {
      const hit = ids.find((id) => id !== roomNow() && rooms.has(id) && !(from === "map" && id === atlas.start));
      if (!hit) return null;
      if (from === "map") {
        let id = hit;
        if (street) while (id && !rooms.get(id)?.name) id = rooms.get(id)?.up;
        return id;
      }
      const labelled = client.labelled();
      for (let id = hit; id; id = rooms.get(id)?.up) if (labelled.has(id)) return id;
      const around = new Set();
      for (let id = roomNow(); id && !around.has(id); id = rooms.get(id)?.up) around.add(id);
      for (let id = hit; id; id = rooms.get(id)?.up) if (around.has(rooms.get(id)?.up) && !around.has(id)) return id;
      return hit;
    },
    tip: (id) => {
      const who = city?.walkers.find((shown) => `walker:${shown.id}` === id);
      if (who) return street ? `someone at ${hallOf(who.goal)}` : [who.walker.name, who.walker.verb, hallOf(who.goal)].filter(Boolean).join(" · ");
      const room = rooms.get(id);
      return room && [room.name || null, room.jurisdiction, ...held(room)].filter(Boolean).join(" · ");
    },
    keys(event, down) {
      if (!down) return false;
      if (street) {
        if (event.key !== "Escape" && event.key !== "Home") return false;
        travelTo(atlas.start);
        return true;
      }
      if (event.key !== "u" && event.key !== "Backspace") return false;
      speak("go up");
      return true;
    },
  });
  client.legend(atlas.jurisdictions.map((name) => ({ label: `${name} · ${EPITHETS[name] ?? "hall"}s`, colour: atlas.tints[name] })));
  mount.dataset.tier = client.tier;

  const placeEntry = (id) => client.scene?.entries.find((entry) => entry.id === id && Array.isArray(entry.footprint));
  // Labels name the buildings standing in the room one looks over; a room holding only a few is
  // labelled a storey deeper too, so the plaza names more than one.
  function labelsFor(room) {
    let shown = childrenOf.get(room) ?? [];
    for (let level = shown; shown.length < 6 && level.length > 0;) {
      level = level.flatMap((id) => childrenOf.get(id) ?? []);
      shown = [...shown, ...level];
    }
    return shown.filter((id) => atlas.places[id]?.name).slice(0, LABELS).map((id) => {
      const body = atlas.places[id].region.body;
      return { id, name: atlas.places[id].name, at: [...centreOf(body), body.z[1]] };
    });
  }
  // The figures acting now are named at play, after the buildings; on the street they are nobody.
  function label() {
    const acting = street || !city ? [] : city.walkers.filter((shown) => shown.walker.name && shown.goal !== shown.walker.rest).slice(0, NAMED);
    const key = acting.map((shown) => shown.id).join("\u0000");
    if (key === namedKey) return;
    namedKey = key;
    client.labels([...roomLabels, ...acting.map((shown) => ({
      id: `walker:${shown.id}`, name: shown.walker.name, figure: true,
      at: () => {
        const now = city?.walkers.find((other) => other.id === shown.id)?.at ?? shown.at;
        return [now[0], now[1], now[2] + FIGURE * figureScale * 1.15];
      },
    }))]);
  }
  function lookOver(id) {
    const entry = placeEntry(id);
    if (!entry) return;
    client.look(poseOver(entry.footprint, { top: entry.span[1] }));
    // A figure stands taller the more is looked over, so a whole city still shows its people.
    const [x0, y0, x1, y1] = boundsOf(entry.footprint);
    figureScale = Math.min(16, Math.max(2, Math.max(x1 - x0, y1 - y0) / 30));
    roomLabels = labelsFor(id);
    namedKey = null;
    label();
    const body = atlas.places[id]?.region.body;
    client.mark(body ? centreOf(body) : null);
  }
  function drawMap() {
    const city = placeEntry(atlas.start);
    if (city) client.map(client.scene, { pose: poseOver(city.footprint, { top: city.span[1] }) });
  }

  // The city as drawn now: the projection with its halls aglow and its figures in place. Each
  // act's word is passed on once its instant is shown.
  function compose(now = Date.now()) {
    if (!base) return;
    composedAt = now;
    city = jianghu.at(now);
    // A hall's warmth shows on the buildings holding it too, less each storey up, so a busy hall
    // deep in a terrace still lights the building one sees.
    const warmth = new Map();
    for (const [room, glow] of city.glows) {
      for (let id = room, v = glow; id && v > 0.02; id = rooms.get(id)?.up, v *= WARMTH_UP) warmth.set(id, Math.max(warmth.get(id) ?? 0, v));
    }
    warmth.delete(atlas.start);
    const entries = base.entries.map((entry) => (Array.isArray(entry.footprint) && warmth.has(entry.id) ? { ...entry, glow: warmth.get(entry.id) } : entry));
    for (const shown of city.walkers) {
      entries.push({
        id: `walker:${shown.id}`, kind: "npc", role: shown.walker.kind === "routine" ? "npc" : "actor", label: shown.walker.name ?? "",
        drawable: "figure", tint: LANTERNS[shown.walker.kind] ?? null, glow: shown.moving ? 1 : 0.5,
        placed: true, x: shown.at[0], y: shown.at[1], z: shown.at[2], yaw: shown.heading, scale: figureScale,
      });
    }
    client.show({ ...base, entries });
    label();
    const who = new Map(city.walkers.map((shown) => [shown.id, shown.walker]));
    for (const act of city.told) {
      if (street) client.rumour(`${RUMOURS[act.seq % RUMOURS.length]} ${hallOf(act.room)}.`);
      else if (!(hearing && TOLD_VERBS.test(act.verb ?? ""))) {
        const walker = who.get(act.walker);
        client.rumour(`${walker?.name ?? "Someone"} ${deedOf(act.verb ?? "")} at ${hallOf(act.room)}${act.verb ? ` · ${act.verb}` : ""}`);
      }
    }
  }
  client.onFrame(() => {
    const now = Date.now();
    if (city?.moving || now - composedAt >= COOL_MS) compose(now);
  });
  async function listen() {
    let since = 0;
    for (;;) {
      if (!document.hidden) {
        try {
          const response = await fetch(street ? mount.dataset.pulse : `${mount.dataset.pulse}?since=${since}`, { credentials: "same-origin", headers: { accept: "application/json" } });
          if (response.ok) {
            const reading = await response.json();
            jianghu.take(reading);
            since = reading.seq;
          }
        } catch (error) {
          console.warn("world pulse:", error);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  }
  if (mount.dataset.pulse) listen();
  // The first reading only marks where the word stands: arriving, a character is told what was
  // said lately in its first turn.
  async function hear() {
    let since;
    for (;;) {
      if (!document.hidden) {
        try {
          const response = await fetch(`${mount.dataset.tellings}?since=${since ?? 0}${since === undefined ? "&limit=1" : ""}`, { credentials: "same-origin", headers: { accept: "application/json" } });
          if (response.ok) {
            const reading = await response.json();
            if (since !== undefined) for (const telling of reading.tellings.slice(-HEARD)) client.rumour(`${telling.prose} · ${hallOf(telling.room)}`);
            since = reading.seq;
          }
        } catch (error) {
          console.warn("world tellings:", error);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  }
  if (hearing) hear();

  // The quest tracker: the journal's nearest threads, each read by its handle and each move owed
  // drafted in the chat; the rest, and the houses' threads, are the journal's to list.
  function track(journal) {
    const nameOf = (player) => journal.names?.[player] ?? player;
    const shown = journal.own.slice(0, TRACKED);
    const more = journal.total - shown.length;
    client.track(`Journal · ${journal.total} await${journal.total === 1 ? "s" : ""} you`,
      shown.length === 0 ? element("p", { className: "qz-meta" }, "Nothing on the work board awaits your move.") : null,
      shown.map((entry) => element("div", { className: "qz-track" },
        element("p", {},
          element("button", { type: "button", className: "qz-handle", title: `quest ${entry.handle}`, onclick: () => speak(`quest ${entry.handle}`) }, entry.handle),
          clip(entry.gist, 96)),
        element("p", { className: "qz-meta" }, [entry.move, entry.step ?? entry.standing, entry.horizon, `as ${nameOf(entry.as)}`].filter(Boolean).join(" · ")),
        entry.moves.length ? element("div", { className: "qz-acts" }, entry.moves.map((move) => element("button", {
          type: "button", title: `${move} ${entry.handle} …`, onclick: () => client.draft(`${move} ${entry.handle} `),
        }, move))) : null)),
      more > 0 ? element("button", { type: "button", onclick: () => speak("journal") }, `${more} more · journal`) : null,
      journal.houseTotal > 0 ? element("button", { type: "button", onclick: () => speak("journal all") },
        `${journal.houseTotal} await ${listOf(journal.houses.map(nameOf))}`) : null);
  }
  async function readJournal() {
    try {
      const response = await fetch(mount.dataset.journal, { credentials: "same-origin", headers: { accept: "application/json" } });
      if (response.ok) track(await response.json());
    } catch (error) {
      console.warn("world journal:", error);
    }
  }
  async function followJournal() {
    for (;;) {
      if (!document.hidden) await readJournal();
      await new Promise((resolve) => setTimeout(resolve, JOURNAL_MS));
    }
  }

  function show(frame) {
    base = projectFiber(frame, { places: atlas.places });
    compose();
    drawMap();
    if (street) return lookOver(focus);
    const scene = client.scene, room = rooms.get(scene.place?.id);
    lookOver(scene.place?.id);
    const crumbs = [];
    for (let id = room?.up; id && crumbs.length < 12; id = rooms.get(id)?.up) crumbs.unshift(id);
    client.here(
      crumbs.length ? element("nav", { className: "qz-crumbs", ariaLabel: "Up" }, crumbs.flatMap((id, index) => [
        index ? element("span", { ariaHidden: "true" }, "›") : null,
        element("button", { type: "button", onclick: () => travelTo(id) }, nameOf(id)),
      ])) : null,
      element("h1", {}, scene.place?.name ?? "Nowhere"),
      room ? element("p", { className: "qz-meta" }, element("i", { className: "qz-chip", style: `background:${room.tint ?? "#999"}` }), [
        room.id === atlas.start ? "the plaza" : `${room.jurisdiction} ${EPITHETS[room.jurisdiction] ?? "hall"}`,
        jianghu.sectOf(room.id) ? `hall of the ${title(jianghu.sectOf(room.id))} sect` : null,
        ...held(room), room.seated?.length ? `${room.seated.length} seated` : null,
      ].filter(Boolean).join(" · ")) : null,
    );
    client.exits(scene.entries.filter((entry) => entry.kind === "exit" && entry.destination !== null).map((exit) => ({
      label: exit.label === "up" ? `↑ ${nameOf(exit.destination) || "up"}` : nameOf(exit.destination) || exit.label,
      title: `go ${exit.label}`,
      act: () => speak(`go ${exit.label}`),
    })));
  }

  async function speak(line) {
    if (street || busy || line.trim() === "") return;
    busy = true;
    client.busy(`> ${line}…`);
    try {
      const response = await fetch(mount.dataset.turn, {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ line }),
      });
      const turn = await response.json();
      if (!response.ok) throw new Error(turn?.error ?? `turn: ${response.status}`);
      client.write([`> ${line}`, ...linesOf(turn)]);
      if (turn.frame) show(turn.frame);
      const journal = (turn.packages ?? []).find((shown) => shown.name === "Work.Journal" && shown.data?.page === 1);
      if (journal) track(journal.data);
      else if ((turn.results ?? []).some((result) => result.ok && TOLD_VERBS.test(result.verb))) readJournal();
      client.status(null);
    } catch (error) {
      client.write([`> ${line}`, `✗ ${error.message}`]);
      client.status(error.message);
    } finally {
      busy = false;
      client.busy(null);
    }
  }

  function travelTo(id) {
    if (street) {
      focus = id;
      return lookOver(id);
    }
    if (id === atlas.start) return speak("travel plaza");
    const room = rooms.get(id);
    if (room?.path) return speak(`travel ${room.path}`);
  }

  if (street) return show(null);
  // The city stands at once over the plaza; the room one is in fills in when the first turn lands.
  base = projectFiber(null, { places: atlas.places });
  compose();
  drawMap();
  lookOver(atlas.start);
  client.here(element("h1", {}, "Arriving…"));
  const transcript = document.querySelector(".world-transcript")?.textContent ?? "";
  client.write(transcript.split("\n").filter(Boolean).slice(-60));
  if (mount.dataset.journal) followJournal();
  await speak("look");
}

const mount = document.getElementById("world-view");
if (mount) {
  start(mount).catch((error) => {
    console.error("world:", error);
    mount.dataset.failed = String(error?.message ?? error);
    document.documentElement.classList.remove("qz-playing");
    document.querySelector(".qz-game:not(#world-view)")?.remove();
  });
}
